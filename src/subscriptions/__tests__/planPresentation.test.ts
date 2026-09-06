import type { PurchasesPackage } from 'react-native-purchases';

import {
  getTrialOffer,
  isBestValue,
  renewalPeriodKey,
  sortPackagesForDisplay,
  trialUnitKey,
} from '../planPresentation';

/** قيم PACKAGE_TYPE النصية — راجع التعليق في planPresentation.ts. */
const PACKAGE_TYPE = {
  ANNUAL: 'ANNUAL',
  MONTHLY: 'MONTHLY',
  WEEKLY: 'WEEKLY',
  LIFETIME: 'LIFETIME',
} as unknown as Record<string, PurchasesPackage['packageType']>;

/** باقة مبسّطة — الحقول التي يقرأها منطق العرض فقط. */
function makePackage(
  packageType: PurchasesPackage['packageType'],
  introPrice: { price: number; periodNumberOfUnits: number; periodUnit: string } | null = null
): PurchasesPackage {
  return {
    identifier: `pkg_${packageType}`,
    packageType,
    product: { priceString: '99.99 SAR', introPrice },
  } as unknown as PurchasesPackage;
}

describe('getTrialOffer', () => {
  it('يتعرّف على تجربة مجانية حقيقية (سعر صفر)', () => {
    const pkg = makePackage(PACKAGE_TYPE.ANNUAL, { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' });
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
    const pkg = makePackage(PACKAGE_TYPE.ANNUAL, { price: 0, periodNumberOfUnits: 0, periodUnit: 'DAY' });
    expect(getTrialOffer(pkg)).toBeNull();
  });
});

describe('sortPackagesForDisplay', () => {
  it('يضع السنوي أولًا مهما كان ترتيب RevenueCat', () => {
    const sorted = sortPackagesForDisplay([
      makePackage(PACKAGE_TYPE.MONTHLY),
      makePackage(PACKAGE_TYPE.ANNUAL),
    ]);
    expect(sorted[0].packageType).toBe(PACKAGE_TYPE.ANNUAL);
  });

  it('لا يغيّر المصفوفة الأصلية', () => {
    const original = [makePackage(PACKAGE_TYPE.MONTHLY), makePackage(PACKAGE_TYPE.ANNUAL)];
    sortPackagesForDisplay(original);
    expect(original[0].packageType).toBe(PACKAGE_TYPE.MONTHLY);
  });

  it('يبقي الباقات غير المعروفة في النهاية بدل إسقاطها', () => {
    const weekly = makePackage(PACKAGE_TYPE.WEEKLY);
    const sorted = sortPackagesForDisplay([weekly, makePackage(PACKAGE_TYPE.ANNUAL)]);
    expect(sorted).toHaveLength(2);
    expect(sorted[1]).toBe(weekly);
  });
});

describe('isBestValue', () => {
  it('يميّز السنوي وحده', () => {
    expect(isBestValue(makePackage(PACKAGE_TYPE.ANNUAL))).toBe(true);
    expect(isBestValue(makePackage(PACKAGE_TYPE.MONTHLY))).toBe(false);
  });
});

describe('renewalPeriodKey', () => {
  it('يعطي مفتاح المدة الصحيح لكل باقة', () => {
    expect(renewalPeriodKey(makePackage(PACKAGE_TYPE.ANNUAL))).toBe('paywall.perYear');
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
