import type { PurchasesPackage } from 'react-native-purchases';

import {
  getTrialOffer,
  isBestValue,
  monthlyEquivalent,
  renewalPeriodKey,
  sortPackagesForDisplay,
  trialUnitKey,
} from '../planPresentation';

/** قيم PACKAGE_TYPE النصية — راجع التعليق في planPresentation.ts. */
const PACKAGE_TYPE = {
  THREE_MONTH: 'THREE_MONTH',
  MONTHLY: 'MONTHLY',
  WEEKLY: 'WEEKLY',
  LIFETIME: 'LIFETIME',
} as unknown as Record<string, PurchasesPackage['packageType']>;

/** باقة مبسّطة — الحقول التي يقرأها منطق العرض فقط. */
function makePackage(
  packageType: PurchasesPackage['packageType'],
  introPrice: { price: number; periodNumberOfUnits: number; periodUnit: string } | null = null,
  price = 49.99
): PurchasesPackage {
  return {
    identifier: `pkg_${packageType}`,
    packageType,
    product: { priceString: `${price} SAR`, price, introPrice },
  } as unknown as PurchasesPackage;
}

describe('getTrialOffer', () => {
  it('يتعرّف على تجربة مجانية حقيقية (سعر صفر)', () => {
    const pkg = makePackage(PACKAGE_TYPE.THREE_MONTH, { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' });
    expect(getTrialOffer(pkg)).toEqual({ count: 3, unit: 'DAY' });
  });

  it('لا يعتبر العرض المخفَّض المدفوع تجربة مجانية', () => {
    // شهر أول بسعر مخفّض ليس مجانيًا — تسميته "تجربة مجانية" تضليل.
    const pkg = makePackage(PACKAGE_TYPE.MONTHLY, { price: 4.99, periodNumberOfUnits: 1, periodUnit: 'MONTH' });
    expect(getTrialOffer(pkg)).toBeNull();
  });

  it('يعيد null عندما لا يوجد عرض تمهيدي إطلاقًا', () => {
    expect(getTrialOffer(makePackage(PACKAGE_TYPE.MONTHLY))).toBeNull();
  });

  it('يعيد null لمدة غير منطقية بدل عرض "0 يوم"', () => {
    const pkg = makePackage(PACKAGE_TYPE.THREE_MONTH, { price: 0, periodNumberOfUnits: 0, periodUnit: 'DAY' });
    expect(getTrialOffer(pkg)).toBeNull();
  });
});

describe('sortPackagesForDisplay', () => {
  it('يضع باقة الثلاثة أشهر أولًا مهما كان ترتيب RevenueCat', () => {
    const sorted = sortPackagesForDisplay([
      makePackage(PACKAGE_TYPE.MONTHLY),
      makePackage(PACKAGE_TYPE.THREE_MONTH),
    ]);
    expect(sorted[0].packageType).toBe(PACKAGE_TYPE.THREE_MONTH);
  });

  it('لا يغيّر المصفوفة الأصلية', () => {
    const original = [makePackage(PACKAGE_TYPE.MONTHLY), makePackage(PACKAGE_TYPE.THREE_MONTH)];
    sortPackagesForDisplay(original);
    expect(original[0].packageType).toBe(PACKAGE_TYPE.MONTHLY);
  });

  it('يبقي الباقات غير المعروفة في النهاية بدل إسقاطها', () => {
    const weekly = makePackage(PACKAGE_TYPE.WEEKLY);
    const sorted = sortPackagesForDisplay([weekly, makePackage(PACKAGE_TYPE.THREE_MONTH)]);
    expect(sorted).toHaveLength(2);
    expect(sorted[1]).toBe(weekly);
  });
});

describe('isBestValue', () => {
  it('يميّز باقة الثلاثة أشهر وحدها', () => {
    expect(isBestValue(makePackage(PACKAGE_TYPE.THREE_MONTH))).toBe(true);
    expect(isBestValue(makePackage(PACKAGE_TYPE.MONTHLY))).toBe(false);
  });
});

describe('monthlyEquivalent', () => {
  it('يقسم سعر الثلاثة أشهر على ٣ ليصح التقارن', () => {
    // ٤٩٫٩٩ ÷ ٣ = ١٦٫٦٦ — أرخص من الشهري ١٩٫٩٩، وبلا هذه القسمة يبدو أغلى.
    expect(monthlyEquivalent(makePackage(PACKAGE_TYPE.THREE_MONTH, null, 49.99))).toBe(16.66);
  });

  it('لا يعرض مكافئًا شهريًا للباقة الشهرية نفسها', () => {
    expect(monthlyEquivalent(makePackage(PACKAGE_TYPE.MONTHLY, null, 19.99))).toBeNull();
  });

  it('يعيد null لسعر غير صالح بدل رقم مخترع', () => {
    expect(monthlyEquivalent(makePackage(PACKAGE_TYPE.THREE_MONTH, null, 0))).toBeNull();
    expect(monthlyEquivalent(makePackage(PACKAGE_TYPE.THREE_MONTH, null, NaN))).toBeNull();
  });
});

describe('renewalPeriodKey', () => {
  it('يعطي مفتاح المدة الصحيح لكل باقة', () => {
    expect(renewalPeriodKey(makePackage(PACKAGE_TYPE.THREE_MONTH))).toBe('paywall.perThreeMonths');
    expect(renewalPeriodKey(makePackage(PACKAGE_TYPE.MONTHLY))).toBe('paywall.perMonth');
  });

  it('يعيد null لباقة لا نعرف كيف نصف تجديدها بدل تخمين نص خاطئ', () => {
    expect(renewalPeriodKey(makePackage(PACKAGE_TYPE.LIFETIME))).toBeNull();
  });
});

describe('trialUnitKey', () => {
  it('يربط كل وحدة بمفتاحها', () => {
    expect(trialUnitKey({ count: 3, unit: 'DAY' })).toBe('paywall.trialUnit.day');
    expect(trialUnitKey({ count: 1, unit: 'week' })).toBe('paywall.trialUnit.week');
    expect(trialUnitKey({ count: 1, unit: 'MONTH' })).toBe('paywall.trialUnit.month');
  });
});
