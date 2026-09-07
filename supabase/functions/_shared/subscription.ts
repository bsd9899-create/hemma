/**
 * منطق قرار webhook الاشتراكات، مفصولًا عن Deno وعن الشبكة.
 *
 * هذا الملف يقرّر من يصبح مشتركًا ومن يتوقف اشتراكه — أي أنه الكود الذي
 * يكلّف خطؤه مالًا في الاتجاهين: مستخدم دفع ولم يُفعَّل، أو مستخدم توقّف
 * دفعه وبقي مفعّلًا. فصله هنا يجعله قابلًا للتشغيل في الاختبارات بدل
 * تصديقه بالقراءة.
 *
 * لا يستورد شيئًا ولا يلمس Deno، فيصلح للطرفين: الدالة تستورده وقت
 * التشغيل، وjest يستورده وقت الاختبار.
 */

export type RevenueCatEvent = {
  type: string;
  app_user_id: string;
  product_id?: string;
  store?: string;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number | null;
};

/** أحداث تعني "أصبح/بقي مشتركًا فعليًا". */
export const PREMIUM_ACTIVE_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION']);

/**
 * أحداث تعني انتهاء الاشتراك فعلًا.
 *
 * ‏CANCELLATION ليست منها عمدًا: إلغاء التجديد التلقائي لا ينهي اشتراكًا
 * مدفوعًا حتى تاريخه. إدراجها هنا يسلب المستخدم ما دفع ثمنه.
 */
export const PREMIUM_INACTIVE_EVENTS = new Set(['EXPIRATION', 'BILLING_ISSUE']);

/** ‏app_user_id لدينا هو auth.users.id دائمًا — أي UUID. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * هل هذا المعرّف مستخدمًا لدينا؟
 *
 * ‏RevenueCat يرسل معرّفات مجهولة بصيغة "$RCAnonymousID:..." لمن لم
 * يُعرَّف بعد. تمريرها إلى عمود uuid يرفع 22P02 فنُرجع 500، فيعيد
 * RevenueCat المحاولة إلى الأبد على حدث لن ينجح مهما تكرّر.
 */
export function isKnownUserId(appUserId: string): boolean {
  return UUID_RE.test(appUserId);
}

/**
 * مقارنة ثابتة الزمن للسر المشترك.
 *
 * المقارنة بـ !== تتوقف عند أول حرف مختلف، فيتسرّب طول البادئة الصحيحة
 * عبر زمن الاستجابة. الفارق ضئيل عبر الشبكة، وتصحيحه سطران، وهذه الدالة
 * تحرس الجدول الوحيد الذي يمنح Premium مجانًا لو اختُرق.
 */
export function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let mismatch = bufA.length ^ bufB.length;
  const max = Math.max(bufA.length, bufB.length);
  for (let i = 0; i < max; i += 1) {
    mismatch |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return mismatch === 0;
}

export type SubscriptionPatch = {
  revenuecat_app_user_id: string;
  product_id: string | null;
  store: 'app_store' | 'play_store';
  expires_at: string | null;
  will_renew: boolean;
  last_synced_at: string;
  is_premium?: boolean;
};

/**
 * التعديل الذي يُكتب على صف الاشتراك.
 *
 * ‏is_premium يُترك غائبًا عمدًا للأحداث التي لا تحسم الحالة (مثل
 * CANCELLATION وTRANSFER): الغائب يعني "لا تغيّره"، بينما false يعني
 * "أوقفه" — والخلط بينهما هو الفرق بين إلغاء تجديد واشتراك مسلوب.
 */
export function buildSubscriptionPatch(event: RevenueCatEvent, now: Date = new Date()): SubscriptionPatch {
  const patch: SubscriptionPatch = {
    revenuecat_app_user_id: event.app_user_id,
    product_id: event.product_id ?? null,
    store: event.store === 'PLAY_STORE' ? 'play_store' : 'app_store',
    expires_at: toISOOrNull(event.expiration_at_ms),
    will_renew: event.type === 'RENEWAL' || event.type === 'INITIAL_PURCHASE',
    last_synced_at: now.toISOString(),
  };

  if (PREMIUM_ACTIVE_EVENTS.has(event.type)) {
    patch.is_premium = true;
  } else if (PREMIUM_INACTIVE_EVENTS.has(event.type)) {
    patch.is_premium = false;
    patch.will_renew = false;
  }

  return patch;
}

/**
 * الحدّ الزمني الذي يمنع حدثًا قديمًا من نقض حالة أحدث منه.
 *
 * ‏webhooks تصل بلا ترتيب مضمون وتُعاد عند أي فشل، فبدون هذا الشرط يلغي
 * EXPIRATION متأخر اشتراكًا جُدِّد للتو. يُرجع null حين لا يرسل الحدث
 * ختمًا زمنيًا صالحًا — عندها لا شرط، لأن شرطًا مبنيًّا على NaN أسوأ من
 * لا شرط.
 */
export function staleGuardTimestamp(event: RevenueCatEvent): string | null {
  return toISOOrNull(event.event_timestamp_ms);
}

function toISOOrNull(ms: number | null | undefined): string | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
