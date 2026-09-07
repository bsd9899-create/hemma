// Supabase Edge Function — تحليل صورة طعام وتقدير سعراتها وماكروزها.
//
// لماذا دالة على الخادم ولا استدعاء مباشر من التطبيق: مفتاح مزوّد
// الذكاء الاصطناعي **لا يجوز أن ينزل إلى الجهاز إطلاقًا**. أي مفتاح في
// الحزمة يُستخرج منها، ثم يُستهلك رصيدك حتى ينفد. المفتاح هنا في
// `supabase secrets` ولا يغادر الخادم.
//
// النشر:
//   supabase secrets set ANTHROPIC_API_KEY=<المفتاح>
//   supabase functions deploy analyze-food
//
// التدفق:
//   صورة (base64) → هذه الدالة → النموذج → تقدير → تأكيد المستخدم → سجل

import { createClient } from 'npm:@supabase/supabase-js@2';
// التحقق والتطهير في _shared لأنهما يُختبران هناك فعليًا (jest)؛ هذا
// الملف يبقى للتوصيل: مصادقة، حدّ يومي، نداء النموذج، ردّ HTTP.
import {
  buildUserText,
  DAILY_LIMIT,
  rejectImage,
  sanitizeResult,
  stripCodeFence,
} from '../_shared/foodAnalysis.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

type AnalyzeRequest = {
  imageBase64: string;
  mediaType: string;
  /** وصف يكتبه المستخدم اختياريًا ("نص صحن") — يحسّن التقدير كثيرًا. */
  hint?: string;
};

const SYSTEM_PROMPT = `أنت مساعد تغذية يقدّر محتوى وجبة من صورتها.

قواعد صارمة:
- أرجع JSON فقط، بلا أي نص خارجه.
- الشكل: {"items":[{"name_ar":"","name_en":"","grams":0,"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}],"confidence":"high|medium|low","note_ar":""}
- قدّر الكمية بالجرام من الحجم الظاهر مقارنةً بالصحن وأدوات المائدة.
- إن كانت الصورة غير واضحة أو ليست طعامًا، أرجع items فارغة وconfidence "low".
- لا تُشخّص ولا تنصح طبيًا ولا تعلّق على وزن الشخص أو صحته إطلاقًا.
- التقديرات تقريبية بطبيعتها؛ اجعل confidence منخفضة عند الشك بدل تخمين واثق.`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  // فشل مغلق: بلا مفتاح لا نحاول ولا نتظاهر بالعمل.
  if (!ANTHROPIC_API_KEY) {
    return json({ error: 'not_configured' }, 503);
  }

  // الهوية من توكن المستخدم نفسه — لا معطى يرسله العميل.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: 'unauthorized' }, 401);

  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'malformed_json' }, 400);
  }

  const rejection = rejectImage(body.imageBase64, body.mediaType);
  if (rejection) {
    return json({ error: rejection }, rejection === 'image_too_large' ? 413 : 400);
  }

  // حدّ يومي: يُحسب من سجل الاستخدام لا من الذاكرة (الدوال بلا حالة).
  const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from('food_analysis_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since);

  if (countError) {
    console.error('analyze-food: usage check failed', countError.code);
    return json({ error: 'internal' }, 500);
  }
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({ error: 'daily_limit_reached', limit: DAILY_LIMIT }, 429);
  }

  const userText = buildUserText(body.hint);

  let modelResponse: Response;
  try {
    modelResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: body.mediaType, data: body.imageBase64 } },
              { type: 'text', text: userText },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    console.error('analyze-food: upstream unreachable', e);
    return json({ error: 'upstream_unavailable' }, 502);
  }

  if (!modelResponse.ok) {
    console.error('analyze-food: upstream status', modelResponse.status);
    // 429 من المزوّد تُمرَّر كما هي ليعرف العميل أنها مؤقتة.
    return json({ error: 'upstream_error' }, modelResponse.status === 429 ? 429 : 502);
  }

  const payload = await modelResponse.json();
  const text: string = payload?.content?.[0]?.text ?? '';

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text));
  } catch {
    console.error('analyze-food: model returned non-JSON');
    return json({ error: 'unparseable_result' }, 502);
  }

  const result = sanitizeResult(parsed);
  if (!result) return json({ error: 'unparseable_result' }, 502);

  // نسجّل الاستخدام بعد النجاح فقط — محاولة فاشلة لا تُحتسب على المستخدم.
  await admin.from('food_analysis_usage').insert({ user_id: user.id });

  return json(result, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
