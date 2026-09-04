/**
 * تشخيص redirect_uri_mismatch — يكشف ما يصل إلى Google فعليًا.
 *
 * تطبيقنا لا يبني رابط Google بنفسه: نحن نفتح رابط `/auth/v1/authorize`
 * الخاص بـ Supabase، وخادم Supabase هو من يبني رابط Google ويضع فيه
 * `client_id` و`redirect_uri` من إعدادات مزوّد Google في لوحته. لذلك لا
 * يمكن قراءة هاتين القيمتين من كود التطبيق إطلاقًا.
 *
 * الحيلة هنا: نطلب رابط `/authorize` بـ fetch (الذي يتبع التحويلات
 * تلقائيًا في React Native)، فينتهي بنا المطاف على رابط Google النهائي،
 * ويكون `response.url` هو الرابط الكامل بكل معاملاته. منه نقرأ القيمتين.
 *
 * ملاحظة أمان: `client_id` قيمة عامة تظهر في كل رابط OAuth ولا تُعدّ سرًا،
 * و`client_secret` لا يمر بالمتصفح إطلاقًا. لا نطبع أي توكن أو سر هنا.
 */
export async function inspectGoogleAuthorizeUrl(supabaseAuthorizeUrl: string): Promise<void> {
  try {
    const response = await fetch(supabaseAuthorizeUrl);
    const finalUrl = response.url;

    if (!finalUrl || finalUrl === supabaseAuthorizeUrl) {
      console.log('[OAUTH-DEBUG] لم يتم اتباع أي تحويل — الرابط النهائي هو نفسه رابط Supabase.');
      console.log('[OAUTH-DEBUG] status =', response.status);
      return;
    }

    const parsed = new URL(finalUrl);
    console.log('[OAUTH-DEBUG] المضيف النهائي الذي وصلنا إليه:', parsed.host);
    console.log('[OAUTH-DEBUG] client_id الذي أرسله Supabase إلى Google:', parsed.searchParams.get('client_id'));
    console.log('[OAUTH-DEBUG] redirect_uri الذي أرسله Supabase إلى Google:', parsed.searchParams.get('redirect_uri'));
    console.log('[OAUTH-DEBUG] response.status من Google:', response.status);
  } catch (e) {
    console.log('[OAUTH-DEBUG] تعذّر فحص رابط authorize:', e instanceof Error ? e.message : String(e));
  }
}
