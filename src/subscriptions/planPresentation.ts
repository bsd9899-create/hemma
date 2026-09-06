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
const THREE_MONTH = 'THREE_MONTH';
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
 * ترتيب العرض: باقة الثلاثة أشهر أولًا لأنها الخيار المُوصى به (الأفضل
 * قيمة)، ثم الشهري، ثم أي باقة أخرى بترتيبها الأصلي. لا نعتمد على ترتيب
 * RevenueCat لأنه يتبع ترتيب اللوحة وقد يتغيّر بلا قصد.
 */
const PACKAGE_ORDER: Record<string, number> = {
  [THREE_MONTH]: 0,
  [MONTHLY]: 1,
};

export function sortPackagesForDisplay(packages: PurchasesPackage[]): PurchasesPackage[] {
  return [...packages].sort(
    (a, b) => (PACKAGE_ORDER[a.packageType] ?? 99) - (PACKAGE_ORDER[b.packageType] ?? 99)
  );
}

/** الباقة المميَّزة بشارة "الأفضل قيمة" — باقة الثلاثة أشهر. */
export function isBestValue(pkg: PurchasesPackage): boolean {
  return pkg.packageType === THREE_MONTH;
}

/**
 * السعر مقسومًا على عدد أشهر الباقة.
 *
 * باقة ٣ أشهر بسعر إجمالي لا تُقارَن ذهنيًا بباقة شهرية: المستخدم يرى
 * رقمًا أكبر فيبدو أغلى وهو أرخص. عرض المكافئ الشهري إلى جانب الإجمالي
 * يجعل المقارنة صحيحة بلا أي ادّعاء تسويقي.
 *
 * نُرجع الرقم فقط؛ التنسيق بعملة المستخدم مسؤولية الواجهة، لأن
 * `priceString` وحده يحمل رمز العملة الصحيح لبلده.
 */
export function monthlyEquivalent(pkg: PurchasesPackage): number | null {
  const months = MONTHS_IN_PACKAGE[pkg.packageType];
  if (!months || months <= 1) return null;
  const price = pkg.product.price;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  return Math.round((price / months) * 100) / 100;
}

const MONTHS_IN_PACKAGE: Record<string, number> = {
  [MONTHLY]: 1,
  [THREE_MONTH]: 3,
};

/**
 * مفتاح ترجمة مدة التجديد ("شهريًا" / "سنويًا"). نُرجع مفتاحًا لا نصًا
 * حتى تبقى الترجمة في ملفات i18n وحدها.
 */
export function renewalPeriodKey(pkg: PurchasesPackage): string | null {
  switch (pkg.packageType) {
    case THREE_MONTH:
      return 'paywall.perThreeMonths';
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
