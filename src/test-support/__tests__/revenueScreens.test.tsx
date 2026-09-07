/**
 * الشاشتان اللتان لا تُعرضان أبدًا في أي مرور آخر.
 *
 * جدار الدفع يعرض "الاشتراكات غير مفعّلة" ما دام RevenueCat غير مضبوط،
 * ولوحة الإدارة تعرض "للمشرفين فقط" ما دام الملف الشخصي ليس أدمن — فكل
 * اختبار حتى الآن كان يمرّ على الحالة **البديلة** لا على الشاشة نفسها.
 * وهما بالضبط الشاشة التي تجلب المال والشاشة التي تعرض أرقام المشروع.
 */
import { renderedText } from '../renderScreen';

const mockPackages = [
  {
    identifier: 'monthly',
    packageType: 'MONTHLY',
    product: {
      identifier: 'com.hemma.himah.monthly',
      priceString: '19.99 SAR',
      price: 19.99,
      introPrice: { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' },
    },
  },
  {
    identifier: 'three_month',
    packageType: 'THREE_MONTH',
    product: {
      identifier: 'com.hemma.himah.quarterly',
      priceString: '49.99 SAR',
      price: 49.99,
      introPrice: { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' },
    },
  },
];

import { mockProfileRef, mockScreenData, mount, resetScreenMocks } from '../screenMocks';
import { populatedAdminOverview, testProfile } from '../mocks';

beforeEach(resetScreenMocks);

describe('جدار الدفع بحزم حقيقية', () => {
  beforeEach(() => {
    mockScreenData.revenueCatConfigured = true;
    mockScreenData.revenueCatPackages = mockPackages;
  });

  it('يعرض السعرين النهائيين', async () => {
    const text = renderedText(await mount(() => require('@/app/paywall')));
    expect(text).toContain('19.99');
    expect(text).toContain('49.99');
  });

  /**
   * ‏49.99 بجانب 19.99 تُقرأ كأنها أغلى وهي أرخص. ما يمنع سوء الفهم هو
   * المكافئ الشهري، فغيابه ليس تفصيلًا تجميليًا.
   */
  it('يعرض المكافئ الشهري للباقة الفصلية بأرقام الواجهة العربية', async () => {
    const text = renderedText(await mount(() => require('@/app/paywall')));
    // ‏49.99 ÷ 3 = 16.66، معروضة بالأرقام العربية الهندية كبقية أرقام
    // الواجهة. الرقم اللاتيني هنا يعني أن نظام الأرقام عاد يعتمد على
    // إعداد الجهاز بدل قرارنا.
    expect(text).toMatch(/١٦[٫.,]٦/);
  });

  it('يسمّي الباقة الفصلية الأكثر توفيرًا', async () => {
    expect(renderedText(await mount(() => require('@/app/paywall')))).toContain('الأكثر توفيرًا');
  });

  it('يعرض تاريخ الخصم لا "بعد ٣ أيام" فقط', async () => {
    const text = renderedText(await mount(() => require('@/app/paywall')));
    // الجدول الزمني يحمل تاريخًا تقويميًا حقيقيًا: شهر مكتوب بالحروف.
    expect(text).toMatch(/يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر/);
  });

  it('لا يعرض رسالة "غير مفعّلة" حين تكون مفعّلة', async () => {
    expect(renderedText(await mount(() => require('@/app/paywall')))).not.toContain('غير مفعّلة');
  });

  it('لا NaN ولا undefined في شاشة الدفع', async () => {
    const text = renderedText(await mount(() => require('@/app/paywall')));
    expect(text).not.toMatch(/NaN|\bundefined\b/);
  });
});

describe('لوحة الإدارة لمشرف فعلي', () => {
  beforeEach(() => {
    mockProfileRef.current = { ...testProfile, is_admin: true };
    mockScreenData.adminOverview = populatedAdminOverview;
  });

  it('تعرض الأرقام بدل رسالة المنع', async () => {
    const text = renderedText(await mount(() => require('@/app/admin')));
    expect(text).not.toContain('للمشرفين فقط');
  });

  it('تنسّق الأعداد الكبيرة بفواصل الآلاف', async () => {
    const text = renderedText(await mount(() => require('@/app/admin')));
    // ‏12480 يجب أن تظهر مفصولة (١٢٬٤٨٠) لا كسلسلة أرقام متصلة.
    expect(text).not.toContain('12480');
    expect(text).not.toMatch(/[٠-٩]{5,}/);
  });

  it('لا NaN ولا undefined في لوحة الإدارة', async () => {
    const text = renderedText(await mount(() => require('@/app/admin')));
    expect(text).not.toMatch(/NaN|\bundefined\b/);
  });
});
