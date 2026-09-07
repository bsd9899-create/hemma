// Supabase Edge Function — يستقبل RevenueCat Webhook ويحدّث حالة
// الاشتراك في جدول subscriptions باستخدام service role key (يتجاوز
// RLS عمدًا — هذا هو المسار الوحيد الموثوق لتعديل هذا الجدول، راجع
// supabase/migrations/20260831000008_subscriptions.sql).
//
// النشر لاحقًا (يحتاج مشروع RevenueCat فعلي):
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//   supabase secrets set REVENUECAT_WEBHOOK_AUTH_HEADER=<قيمة سرية تُضبط أيضًا في RevenueCat>
// ثم في RevenueCat Dashboard → Integrations → Webhooks: أضف رابط الدالة
// وضع نفس القيمة في Authorization header.
//
// ملاحظة: --no-verify-jwt ضرورية لأن RevenueCat ليس مستخدمًا في
// Supabase ولا يملك JWT؛ المصادقة هنا بالسر المشترك أدناه وحده.

import { createClient } from 'npm:@supabase/supabase-js@2';
// المنطق الذي يقرّر من يصبح مشتركًا يعيش في _shared لأنه يُختبر هناك
// فعليًا (jest)؛ هذا الملف يبقى للتوصيل: مصادقة، استعلام، ردّ HTTP.
import {
  buildSubscriptionPatch,
  isKnownUserId,
  safeEqual,
  staleGuardTimestamp,
  type RevenueCatEvent,
} from '../_shared/subscription.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_AUTH_HEADER = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_HEADER');

Deno.serve(async (req) => {
  // فشل مغلق (fail closed) عمدًا: لو REVENUECAT_WEBHOOK_AUTH_HEADER غير
  // مضبوط بعد (سيناريو متوقع قبل ربط RevenueCat فعليًا)، يجب رفض كل
  // الطلبات — وليس قبولها كلها. القبول الصامت هنا كان يسمح لأي طرف
  // يعرف رابط الدالة بتغيير is_premium لأي مستخدم بدون أي مصادقة.
  const provided = req.headers.get('Authorization');
  if (!WEBHOOK_AUTH_HEADER || !provided || !safeEqual(provided, WEBHOOK_AUTH_HEADER)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let event: RevenueCatEvent | undefined;
  try {
    const body = await req.json();
    event = body?.event;
  } catch {
    return new Response('Malformed JSON', { status: 400 });
  }

  if (!event?.app_user_id) {
    return new Response('Missing app_user_id', { status: 400 });
  }

  // RevenueCat يرسل معرّفات مجهولة بصيغة "$RCAnonymousID:..." لمستخدمين
  // لم يُعرَّفوا بعد، وهي ليست UUID. تمريرها إلى عمود uuid يرفع خطأ
  // 22P02 فنُرجع 500، فيعيد RevenueCat المحاولة إلى الأبد على حدث لن
  // ينجح أبدًا. 200 هنا تعني "استُلم وتقرر تجاهله"، وهو الصحيح.
  if (!isKnownUserId(event.app_user_id)) {
    console.log('revenuecat-webhook: ignoring non-UUID app_user_id', event.type);
    return new Response('Ignored: anonymous app_user_id', { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const patch = buildSubscriptionPatch(event);

  // app_user_id في RevenueCat = auth.users.id (نمرّره كـ appUserID عند
  // initPurchases في src/subscriptions/revenuecat.ts) — لذلك user_id
  // هو نفسه event.app_user_id مباشرة.
  //
  // الشرط الزمني حرج: webhooks تصل بلا ترتيب مضمون وتُعاد عند أي فشل.
  // بدونه يستطيع حدث EXPIRATION قديم يصل متأخرًا أن يلغي اشتراكًا
  // جُدِّد للتو، أو إعادة إرسال INITIAL_PURCHASE أن تُحيي اشتراكًا
  // منتهيًا. نرفض أي حدث أقدم من آخر مزامنة مسجّلة.
  let query = supabase.from('subscriptions').update(patch).eq('user_id', event.app_user_id);
  const notOlderThan = staleGuardTimestamp(event);
  if (notOlderThan) {
    query = query.lt('last_synced_at', notOlderThan);
  }

  const { data, error } = await query.select('user_id');

  if (error) {
    console.error('revenuecat-webhook update failed', error.code, error.message);
    return new Response('Internal error', { status: 500 });
  }

  // 0 صفوف ليست خطأ بالضرورة (حدث أقدم من حالتنا، أو حساب محذوف)، لكن
  // ابتلاعها بصمت كان يخفي الحالة المهمة: مستخدم دفع فعلًا ولم يُفعَّل
  // اشتراكه أبدًا. نسجّلها صراحةً ليظهر ذلك في سجلات الدالة.
  if (!data || data.length === 0) {
    console.log('revenuecat-webhook: no row updated', event.type, '— stale event or unknown user');
    return new Response('No matching subscription row', { status: 200 });
  }

  return new Response('OK', { status: 200 });
});
