import { formatNumber } from '../format';

/**
 * اختبار انحدار لانهيار حقيقي في شاشة اليوم:
 * "TypeError: Cannot read property 'toLocaleString' of undefined".
 *
 * السبب الجذري كان ترحيلًا لم يُطبَّق (user_goals بلا target_calories)،
 * فوصلت undefined إلى formatNumber رغم أن النوع يقول number — الأنواع
 * لا تُفرض على بيانات الشبكة. أُصلح الجذر في الترحيلات، وهذه الاختبارات
 * تضمن ألا يعود العرض نفسه سببًا لانهيار الشاشة مهما وصلته.
 */
describe('formatNumber — لا ينهار على البيانات الناقصة', () => {
  it('لا يرمي على undefined (الانهيار الأصلي)', () => {
    expect(() => formatNumber(undefined)).not.toThrow();
    expect(formatNumber(undefined)).toBe('—');
  });

  it('لا يرمي على null', () => {
    expect(formatNumber(null)).toBe('—');
  });

  it('يعرض شرطة لا صفرًا للقيمة المفقودة', () => {
    // الصفر رقم يعني "لا شيء"؛ الغياب يعني "لا نعرف". عرض 0 مكان
    // قيمة مفقودة اختراع بيانات.
    expect(formatNumber(undefined)).not.toBe('0');
    expect(formatNumber(undefined)).not.toBe('٠');
  });

  it('يتعامل مع NaN وInfinity كقيم مفقودة', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
  });

  it('ما زال يُنسّق الأرقام الحقيقية، والصفر رقم حقيقي', () => {
    expect(formatNumber(0)).not.toBe('—');
    expect(formatNumber(1500)).toMatch(/1|١/);
  });
});
