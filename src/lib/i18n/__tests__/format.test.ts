import i18n from '../index';
import { formatBirthDate, formatLongDate, formatNumber, formatShortDate, formatTime, formattingLocale } from '../format';

/**
 * شكل الأرقام في التطبيق قرار، لا نتيجة لما تحمله المنصّة من بيانات ICU.
 *
 * ‏'ar' وحدها تُشتقّ منها أنظمة أرقام مختلفة باختلاف الجهاز — رأينا
 * ١٢٬٤٨٠ و12,480 من نفس السطر — فتظهر أرقام لاتينية وسط نصوص عربية
 * أرقامها هندية بلا سبب ظاهر. هذه الاختبارات تثبّت القرار.
 */
describe('نظام الأرقام محسوم لا متروك للجهاز', () => {
  afterEach(() => {
    i18n.changeLanguage('ar');
  });

  it('العربية تستعمل الأرقام العربية الهندية صراحةً', () => {
    expect(formattingLocale()).toBe('ar-u-nu-arab');
  });

  it('لا يعتمد التنسيق على النظام الافتراضي للجهاز', () => {
    // لو كان الاعتماد على 'ar' المجرّدة، لاختلفت النتيجة بين بيئة وأخرى.
    expect(formatNumber(12480)).toMatch(/^[٠-٩٬،.,\s]+$/);
    expect(formatNumber(12480)).toMatch(/[٠-٩]/);
  });

  it('الإنجليزية تستعمل الأرقام اللاتينية', async () => {
    await i18n.changeLanguage('en');
    expect(formattingLocale()).toBe('en');
    expect(formatNumber(12480)).toBe('12,480');
  });

  it('يفصل الآلاف في اللغتين', async () => {
    expect(formatNumber(12480)).not.toBe('١٢٤٨٠');
    await i18n.changeLanguage('en');
    expect(formatNumber(12480)).toBe('12,480');
  });
});

describe('الغياب يظهر كغياب لا كصفر', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['NaN', NaN],
    ['Infinity', Infinity],
  ])('%s يصبح شرطة', (_name, value) => {
    expect(formatNumber(value as number)).toBe('—');
  });

  it('الصفر رقم حقيقي ويُعرض', () => {
    expect(formatNumber(0)).not.toBe('—');
  });
});

describe('التواريخ تُعرض مقروءة لا خامًا', () => {
  it('التاريخ القصير لا يعيد صيغة ISO', () => {
    const shown = formatShortDate('2026-09-07');
    expect(shown).not.toBe('2026-09-07');
    expect(shown).toMatch(/[؀-ۿ]/);
  });

  it('تاريخ الميلاد يُعرض بالشهر مكتوبًا', () => {
    expect(formatBirthDate('1996-01-15')).toMatch(/[؀-ۿ]/);
    expect(formatBirthDate('1996-01-15')).not.toContain('1996-01-15');
  });

  it('تاريخ الميلاد الغائب شرطة لا فراغ', () => {
    expect(formatBirthDate(null)).toBe('—');
    expect(formatBirthDate(undefined)).toBe('—');
  });

  /**
   * تاريخ غير صالح يُعاد كما هو بدل أن يختفي: اختفاء الحقل يخفي المشكلة،
   * وعرض النص الأصلي يجعلها مرئية دون انهيار.
   */
  it('التاريخ غير الصالح يُعاد كما هو لا يختفي', () => {
    expect(formatShortDate('ليس تاريخًا')).toBe('ليس تاريخًا');
    expect(formatBirthDate('غير صالح')).toBe('غير صالح');
  });

  it('التاريخ الطويل لا ينهار على قيمة غير صالحة', () => {
    expect(formatLongDate(new Date('غير صالح'))).toBe('');
  });

  it('الوقت لا ينهار على نص غير صالح', () => {
    expect(formatTime('ليس وقتًا')).toBe('');
  });

  it('تاريخ قصير لا يزحف يومًا بسبب المنطقة الزمنية', () => {
    // "2026-09-07" بلا وقت يُفسَّر UTC فيصبح ٦ سبتمبر غرب غرينتش.
    // نضيف T00:00:00 عمدًا ليُفسَّر بالتوقيت المحلي.
    expect(formatShortDate('2026-09-07')).toContain('٧');
  });
});
