/**
 * تحويل بيانات RevenueCat الخام إلى ما يجب أن تعرضه شاشة الاشتراك.
 *
 * سبب وجود هذا الملف منفصلًا عن الشاشة: عرض شروط الاشتراك ليس تفصيلًا
 * تجميليًا — Apple ترفض التطبيق (App Store Review Guideline 3.1.2) إن
 * لم تُعرض مدة التجربة المجانية وما يحدث بعدها وسعر التجديد في نفس
 * الشاشة التي فيها زر الشراء. المنطق هنا صافٍ وقابل للاختبار بدل أن
 * يكون مبعثرًا داخل JSX.
 *
 * ⚠️ لا يوجد سعر مكتوب يدويًا في هذا الملف ولا في الشاشة. كل رقم يُقرأ
 * من StoreKit عبر RevenueCat، لأن السعر يختلف بالعملة والبلد والضريبة،
 * وأي رقم ثابت في الكود سيكذب على جزء من المستخدمين.
 */

import type { PurchasesPackage } from 'react-native-purchases';

/**
 * قيم PACKAGE_TYPE كسلاسل نصية بدل استيراد الـ enum نفسه.
 *
 * السبب تقني لا تجميلي: `react-native-purchases` يحمّل وحدة أصلية عند
 * الاستيراد، فأي import قيمي منه يجعل هذا الملف غير قابل للتشغيل داخل
 * Jest. الـ enum هنا enum نصي (ANNUAL = "ANNUAL")، فالمقارنة بالسلسلة
 * مطابقة تمامًا لمقارنة العضو، ويبقى `type` وحده مستوردًا (يُمحى عند
 * الترجمة) فتُحفظ سلامة الأنواع كاملة.
 */
const ANNUAL = 'ANNUAL';
const MONTHLY = 'MONTHLY';

/** فترة التجربة المجانية كما أعلنها المتجر فعليًا. */
export type TrialOffer = {
  /** عدد الوحدات — 3 في "3 أيام". */
  count: number;
  /** DAY | WEEK | MONTH | YEAR كما يرجعها المتجر. */
  unit: string;
};

/**
 * تُرجع التجربة المجانية إن كانت المنتج يقدّمها فعلًا.
 *
 * الشرط `price === 0` مقصود: introPrice قد يكون عرضًا مخفَّضًا مدفوعًا
 * (مثلًا شهر بسعر أقل) لا تجربة مجانية، وتسميته "تجربة مجانية" حينها
 * تضليل صريح للمستخدم ومخالفة لقواعد المتجر.
 */
export function getTrialOffer(pkg: PurchasesPackage): TrialOffer | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  if (!intro.periodNumberOfUnits || intro.periodNumberOfUnits <= 0) return null;
  return { count: intro.periodNumberOfUnits, unit: intro.periodUnit };
}

/**
 * ترتيب العرض: السنوي أولًا لأنه الخيار المُوصى به (الأفضل قيمة)، ثم
 * الشهري، ثم أي باقة أخرى بترتيبها الأصلي. لا نعتمد على ترتيب
 * RevenueCat لأنه يتبع ترتيب اللوحة وقد يتغيّر بلا قصد.
 */
const PACKAGE_ORDER: Record<string, number> = {
  [ANNUAL]: 0,
  [MONTHLY]: 1,
};

export function sortPackagesForDisplay(packages: PurchasesPackage[]): PurchasesPackage[] {
  return [...packages].sort(
    (a, b) => (PACKAGE_ORDER[a.packageType] ?? 99) - (PACKAGE_ORDER[b.packageType] ?? 99)
  );
}

/** الباقة المميَّزة بشارة "الأفضل قيمة" — السنوية، إن وُجدت. */
export function isBestValue(pkg: PurchasesPackage): boolean {
  return pkg.packageType === ANNUAL;
}

/**
 * مفتاح ترجمة مدة التجديد ("شهريًا" / "سنويًا"). نُرجع مفتاحًا لا نصًا
 * حتى تبقى الترجمة في ملفات i18n وحدها.
 */
export function renewalPeriodKey(pkg: PurchasesPackage): string | null {
  switch (pkg.packageType) {
    case ANNUAL:
      return 'paywall.perYear';
    case MONTHLY:
      return 'paywall.perMonth';
    default:
      return null;
  }
}

/** مفتاح ترجمة وحدة مدة التجربة، بصيغة الجمع العربي المناسبة للعدد. */
export function trialUnitKey(offer: TrialOffer): string {
  const unit = offer.unit.toUpperCase();
  if (unit === 'DAY') return 'paywall.trialUnit.day';
  if (unit === 'WEEK') return 'paywall.trialUnit.week';
  if (unit === 'MONTH') return 'paywall.trialUnit.month';
  if (unit === 'YEAR') return 'paywall.trialUnit.year';
  return 'paywall.trialUnit.day';
}
