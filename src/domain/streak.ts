/**
 * سلسلة الأيام المتتالية التي حقّق فيها المستخدم حدًّا أدنى من الإنجاز.
 *
 * لماذا حدّ أدنى لا "أي نشاط": سلسلة تُحسب بمجرد فتح التطبيق تفقد
 * معناها بعد أسبوع — يصبح الرقم عادة لا إنجازًا. وحدّ مرتفع جدًا يكسر
 * السلسلة عند أول يوم مزدحم فيتوقف المستخدم عن المحاولة. ٥٠٪ وسط:
 * يوم فيه جهد حقيقي، بلا اشتراط الكمال.
 *
 * ⚠️ هذا **قرار منتج معلن**، لا نتيجة دراسة — مثل أوزان محرّك القرار،
 * وموثّق كذلك في docs/SCIENTIFIC_FOUNDATION.md.
 */

const STREAK_THRESHOLD_PERCENT = 50;

export type DayProgress = {
  /** YYYY-MM-DD */
  date: string;
  completion_percent: number;
};

/**
 * تحسب طول السلسلة المنتهية اليوم أو أمس.
 *
 * السماح بالبدء من أمس مقصود: من أنجز أمس ولم يفتح التطبيق بعد اليوم
 * لم يكسر سلسلته — كسرها يعني معاقبته على وقت من نهاره لم ينتهِ.
 */
export function calculateStreak(days: DayProgress[], today: string): number {
  if (days.length === 0) return 0;

  const achieved = new Map<string, boolean>();
  for (const day of days) {
    achieved.set(day.date, day.completion_percent >= STREAK_THRESHOLD_PERCENT);
  }

  // نبدأ من اليوم إن أنجزه، وإلا من أمس — ثم نعدّ للخلف.
  let cursor = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime())) return 0;

  if (!achieved.get(today)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!achieved.get(toKey(cursor))) return 0;
  }

  let streak = 0;
  // سقف صريح: الحلقة تقرأ خريطة محدودة، والسقف يمنع أي دوران لا ينتهي.
  for (let guard = 0; guard < 400; guard++) {
    if (!achieved.get(toKey(cursor))) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** هل يستحق هذا اليوم أن يُحتسب في السلسلة؟ */
export function countsTowardStreak(completionPercent: number): boolean {
  return completionPercent >= STREAK_THRESHOLD_PERCENT;
}

export { STREAK_THRESHOLD_PERCENT };
