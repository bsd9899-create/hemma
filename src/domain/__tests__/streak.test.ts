import { calculateStreak, countsTowardStreak, STREAK_THRESHOLD_PERCENT } from '../streak';

/** أيام متتالية تنتهي في `endDate`، كل يوم بنسبته. */
function daysEndingAt(endDate: string, percents: number[]) {
  const out: { date: string; completion_percent: number }[] = [];
  const cursor = new Date(`${endDate}T00:00:00Z`);
  for (const percent of percents) {
    out.push({ date: cursor.toISOString().slice(0, 10), completion_percent: percent });
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return out;
}

const TODAY = '2026-09-06';

describe('calculateStreak', () => {
  it('يعدّ الأيام المتتالية فوق الحد', () => {
    expect(calculateStreak(daysEndingAt(TODAY, [80, 70, 60]), TODAY)).toBe(3);
  });

  it('يتوقف عند أول يوم تحت الحد', () => {
    expect(calculateStreak(daysEndingAt(TODAY, [80, 70, 20, 90]), TODAY)).toBe(2);
  });

  it('لا يكسر السلسلة لأن اليوم لم ينتهِ بعد', () => {
    // اليوم ٠٪ (لم يبدأ)، لكن أمس وما قبله منجزان — السلسلة قائمة.
    expect(calculateStreak(daysEndingAt(TODAY, [0, 75, 65]), TODAY)).toBe(2);
  });

  it('يعيد صفرًا حين ينقطع اليوم وأمس معًا', () => {
    expect(calculateStreak(daysEndingAt(TODAY, [0, 10, 90, 90]), TODAY)).toBe(0);
  });

  it('يعيد صفرًا بلا بيانات إطلاقًا', () => {
    expect(calculateStreak([], TODAY)).toBe(0);
  });

  it('لا ينخدع بفجوة في التواريخ — يوم غائب يكسر السلسلة', () => {
    // ٦ سبتمبر منجز، ثم ٤ سبتمبر (٥ سبتمبر غائب تمامًا).
    const gapped = [
      { date: '2026-09-06', completion_percent: 90 },
      { date: '2026-09-04', completion_percent: 90 },
    ];
    expect(calculateStreak(gapped, TODAY)).toBe(1);
  });

  it('يتعامل مع تاريخ غير صالح بلا انهيار', () => {
    expect(calculateStreak(daysEndingAt(TODAY, [90]), 'ليس تاريخًا')).toBe(0);
  });

  it('لا يدور بلا نهاية على سلسلة طويلة جدًا', () => {
    const long = daysEndingAt(TODAY, Array(500).fill(90));
    expect(calculateStreak(long, TODAY)).toBeLessThanOrEqual(400);
  });
});

describe('countsTowardStreak', () => {
  it('الحد ٥٠٪ — تمامًا عنده يُحتسب', () => {
    expect(countsTowardStreak(STREAK_THRESHOLD_PERCENT)).toBe(true);
    expect(countsTowardStreak(STREAK_THRESHOLD_PERCENT - 1)).toBe(false);
  });
});
