/**
 * التحقق من شكل مفتاح RevenueCat قبل استعماله.
 *
 * لـRevenueCat نوعان من المفاتيح: مفتاح SDK عام يُشحن داخل التطبيق
 * (يبدأ بـ `appl_` لآبل)، ومفتاح REST سري (`sk_`) يُستعمل من الخادم
 * وحده ويمنح صلاحية القراءة والتعديل على حسابات كل المشتركين.
 *
 * لصق المفتاح الخطأ في `.env` لا يفشل: SDK يُهيَّأ، ثم يُستخرج المفتاح
 * السري من حزمة التطبيق — وهي أسهل عملية استخراج ممكنة. الفحص هنا
 * يجعل هذا الخطأ مستحيلًا بصمت بدل أن يكون كارثة صامتة.
 */

/** مفتاح SDK عام لمنصة آبل. */
const PUBLIC_APPLE_KEY = /^appl_[A-Za-z0-9]{10,}$/;

/** مفاتيح لا يجوز أن تصل جهاز مستخدم إطلاقًا. */
const SECRET_KEY_SHAPES = [
  { pattern: /^sk_/i, name: 'مفتاح REST سري' },
  { pattern: /^goog_/, name: 'مفتاح Google Play' },
  { pattern: /^amzn_/, name: 'مفتاح Amazon' },
];

export type KeyVerdict =
  | { kind: 'valid' }
  | { kind: 'missing' }
  | { kind: 'secret'; reason: string }
  | { kind: 'malformed'; reason: string };

export function inspectRevenueCatKey(key: string | undefined | null): KeyVerdict {
  if (!key) return { kind: 'missing' };

  const trimmed = key.trim();
  const secret = SECRET_KEY_SHAPES.find((shape) => shape.pattern.test(trimmed));
  if (secret) {
    return { kind: 'secret', reason: `${secret.name} — لا يوضع في التطبيق إطلاقًا` };
  }

  if (!PUBLIC_APPLE_KEY.test(trimmed)) {
    return { kind: 'malformed', reason: 'مفتاح SDK العام لآبل يبدأ بـ appl_' };
  }

  return { kind: 'valid' };
}
