/**
 * جدار الدفع تحت الظروف التي تحدث فعلًا، لا الظرف المثالي وحده.
 *
 * هذه الشاشة هي مصدر الدخل الوحيد، وأخطاؤها لا تُرى: باقة تختفي بصمت
 * لأن نوعها كُتب خطأً، أو تجربة تُعرض وهي غير موجودة، أو إلغاء يُقرأ
 * كخطأ فيرى المستخدم رسالة فشل بعد أن قرّر هو التراجع.
 */
import { renderedText } from '../renderScreen';
import { mockScreenData, mount, resetScreenMocks } from '../screenMocks';

const monthly = {
  identifier: 'monthly',
  packageType: 'MONTHLY',
  product: { identifier: 'com.hemma.himah.monthly', priceString: '19.99 SAR', price: 19.99 },
};
const quarterly = {
  identifier: 'three_month',
  packageType: 'THREE_MONTH',
  product: { identifier: 'com.hemma.himah.quarterly', priceString: '49.99 SAR', price: 49.99 },
};

beforeEach(() => {
  resetScreenMocks();
  mockScreenData.revenueCatConfigured = true;
});

const paywall = () => mount(() => require('@/app/paywall'));

describe('ما يعرضه جدار الدفع', () => {
  it('يعرض الباقتين حين يرسلهما المتجر', async () => {
    mockScreenData.revenueCatPackages = [monthly, quarterly];
    const text = renderedText(await paywall());
    expect(text).toContain('19.99');
    expect(text).toContain('49.99');
  });

  /**
   * ‏RevenueCat لا يضمن ترتيبًا. الفصلية أولًا قرار: هي الأفضل قيمة،
   * وعرضها بعد الشهرية يجعل الأغلى ظاهريًا هو أول ما يُقرأ.
   */
  it('يرتّب الفصلية أولًا مهما وصلت من المتجر', async () => {
    mockScreenData.revenueCatPackages = [monthly, quarterly];
    const text = renderedText(await paywall());
    expect(text.indexOf('49.99')).toBeLessThan(text.indexOf('19.99'));
  });

  it('يعمل بباقة واحدة فقط', async () => {
    mockScreenData.revenueCatPackages = [monthly];
    const text = renderedText(await paywall());
    expect(text).toContain('19.99');
    expect(text).not.toContain('الأكثر توفيرًا');
  });

  /**
   * بلا تجربة مجانية لا يُعرض جدول زمني يعد بها. الوعد بتجربة غير موجودة
   * سبب شكوى ورفض معًا.
   */
  it('لا يعد بتجربة مجانية حين لا يرسلها المتجر', async () => {
    mockScreenData.revenueCatPackages = [monthly, quarterly];
    const text = renderedText(await paywall());
    expect(text).not.toContain('مجانًا');
    expect(text).not.toContain('التذكير');
  });

  it('يعرض الجدول الزمني حين توجد تجربة فعلية', async () => {
    mockScreenData.revenueCatPackages = [
      { ...monthly, product: { ...monthly.product, introPrice: { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' } } },
    ];
    const text = renderedText(await paywall());
    expect(text).toContain('التذكير');
  });

  /**
   * عرض مدفوع تمهيدي ليس تجربة مجانية. معاملته كذلك إخفاء لسعر يُدفع.
   */
  it('لا يعامل عرضًا تمهيديًا مدفوعًا كتجربة مجانية', async () => {
    mockScreenData.revenueCatPackages = [
      { ...monthly, product: { ...monthly.product, introPrice: { price: 4.99, periodNumberOfUnits: 7, periodUnit: 'DAY' } } },
    ];
    expect(renderedText(await paywall())).not.toContain('مجانًا');
  });

  it('يذكر شروط التجديد التلقائي دائمًا', async () => {
    mockScreenData.revenueCatPackages = [monthly, quarterly];
    // إرشاد آبل 3.1.2: مدة الاشتراك وسعره وتجديده التلقائي يجب أن تُعلَن
    // قبل الشراء، لا في المتجر وحده.
    expect(renderedText(await paywall())).toContain('يتجدد الاشتراك تلقائيًا');
  });

  it('يعرض استعادة المشتريات — مطلب مراجعة لا خيار', async () => {
    mockScreenData.revenueCatPackages = [monthly, quarterly];
    expect(renderedText(await paywall())).toContain('استعادة المشتريات');
  });
});

describe('حين لا يرسل المتجر شيئًا', () => {
  it('لا يعرض جدار دفع فارغًا بلا تفسير', async () => {
    mockScreenData.revenueCatPackages = [];
    const text = renderedText(await paywall());
    expect(text.length).toBeGreaterThan(80);
  });

  it('لا يعرض NaN ولا سعرًا مخترعًا', async () => {
    mockScreenData.revenueCatPackages = [];
    const text = renderedText(await paywall());
    expect(text).not.toMatch(/NaN|\bundefined\b/);
    expect(text).not.toContain('19.99');
  });

  /**
   * نوع حزمة لا يعرفه الكود (خطأ إعداد في RevenueCat) يجب ألا يُسقط
   * الشاشة ولا يعرض مكافئًا شهريًا محسوبًا على مدة مجهولة.
   */
  it('نوع حزمة مجهول لا يُسقط الشاشة ولا يخترع مكافئًا شهريًا', async () => {
    mockScreenData.revenueCatPackages = [{ ...monthly, packageType: 'WEEKLY' }];
    const text = renderedText(await paywall());
    expect(text).toContain('19.99');
    expect(text).not.toMatch(/NaN/);
  });
});
