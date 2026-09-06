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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

/** أكبر صورة مقبولة. الأكبر يُرفض بدل أن يُستهلك رصيد بلا فائدة. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * حد الاستخدام لكل مستخدم يوميًا.
 *
 * ليس تقييدًا للمستخدم بل حماية للتكلفة: بلا حدّ، حساب واحد مخترق أو
 * حلقة خاطئة في العميل تستنزف الرصيد كاملًا خلال ساعات.
 */
const DAILY_LIMIT = 25;

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

  if (!body.imageBase64 || !ALLOWED_MEDIA_TYPES.has(body.mediaType)) {
    return json({ error: 'invalid_image' }, 400);
  }

  // طول base64 ≈ 4/3 من حجم البايتات — نفحص قبل أي عمل مكلف.
  if ((body.imageBase64.length * 3) / 4 > MAX_IMAGE_BYTES) {
    return json({ error: 'image_too_large' }, 413);
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

  const userText = body.hint?.trim()
    ? `حلّل هذه الوجبة. ملاحظة من المستخدم: ${body.hint.trim().slice(0, 200)}`
    : 'حلّل هذه الوجبة.';

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
    // النموذج قد يلفّ JSON بأسوار markdown رغم التعليمات.
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
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

/**
 * تطهير مخرجات النموذج قبل تصديقها.
 *
 * مخرجات النموذج **مدخلات غير موثوقة** حتى لو كان النموذج ملكنا: أي
 * رقم سالب أو ضخم أو نص مكان رقم سيتسرّب إلى قاعدة البيانات ثم إلى
 * حسابات المستخدم. نقصّ هنا لا لاحقًا.
 */
function sanitizeResult(raw: unknown): {
  items: {
    name_ar: string; name_en: string; grams: number;
    calories: number; protein_g: number; carbs_g: number; fat_g: number;
  }[];
  confidence: 'high' | 'medium' | 'low';
  note_ar: string;
} | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return null;

  const num = (v: unknown, max: number): number => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(Math.round(n * 10) / 10, max);
  };
  const str = (v: unknown): string => (typeof v === 'string' ? v.slice(0, 120) : '');

  const items = obj.items.slice(0, 12).map((it) => {
    const i = (it ?? {}) as Record<string, unknown>;
    return {
      name_ar: str(i.name_ar),
      name_en: str(i.name_en),
      grams: num(i.grams, 5000),
      calories: num(i.calories, 5000),
      protein_g: num(i.protein_g, 500),
      carbs_g: num(i.carbs_g, 1000),
      fat_g: num(i.fat_g, 500),
    };
  });

  const confidence = obj.confidence === 'high' || obj.confidence === 'medium' ? obj.confidence : 'low';
  return { items, confidence, note_ar: str(obj.note_ar) };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
