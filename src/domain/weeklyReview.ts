/**
 * التقييم الأسبوعي — دالة صافية تحوّل متوسطات الأسبوع الخام إلى ملخص.
 * تعيد مفاتيح مؤشرات (مثل "steps") تُترجَم في طبقة الواجهة عبر
 * `t('weeklyMetrics.' + key)`، وليس تسميات جاهزة، حتى تبقى الدالة
 * بمعزل عن i18n وقابلة للاختبار مباشرة.
 */

export type WeeklyRawAverages = {
  avgWorkoutMinutes: number;
  avgSteps: number;
  avgSleepHours: number;
};

export type WeeklyGoals = {
  targetSteps: number;
  targetSleepHours: number;
};

export type WeeklyMetricKey = 'workout' | 'steps' | 'sleep';

export type WeeklyReview = {
  /** من 0 إلى 10 */
  score: number;
  /**
   * ‏`false` حين لا يوجد نشاط في الأسبوع أصلًا. أسبوع فارغ لا "أقوى نقطة"
   * فيه ولا "أضعف": المقارنة بين ثلاثة أصفار تُرجِع أولها بحكم ترتيب
   * الكائن، فيقرأ المستخدم الجديد "أقوى نقطة: التمارين" و"تحتاج اهتمامًا:
   * التمارين" معًا — حكمان متناقضان عن أسبوع لم يسجّل فيه شيئًا.
   */
  hasData: boolean;
  strongestKey: WeeklyMetricKey;
  weakestKey: WeeklyMetricKey;
  focusNextWeekKey: WeeklyMetricKey;
};

const REFERENCE_WORKOUT_MINUTES_PER_DAY = 30;

/**
 * نسبة الإنجاز إلى هدفها. الهدف صفر أو غير صالح يجعل القسمة Infinity أو
 * NaN، وكلاهما يفسد الترتيب والمجموع بصمت — فيُعامَل كـ "لا نسبة".
 */
function ratio(value: number, target: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, value / target);
}

export function computeWeeklyReview(raw: WeeklyRawAverages, goals: WeeklyGoals): WeeklyReview {
  const ratios: Record<WeeklyMetricKey, number> = {
    workout: ratio(raw.avgWorkoutMinutes, REFERENCE_WORKOUT_MINUTES_PER_DAY),
    steps: ratio(raw.avgSteps, goals.targetSteps),
    sleep: ratio(raw.avgSleepHours, goals.targetSleepHours),
  };

  const entries = Object.entries(ratios) as [WeeklyMetricKey, number][];
  const overallRatio = entries.reduce((sum, [, ratio]) => sum + Math.min(1, ratio), 0) / entries.length;

  const [strongestKey] = entries.reduce((best, curr) => (curr[1] > best[1] ? curr : best));
  const [weakestKey] = entries.reduce((worst, curr) => (curr[1] < worst[1] ? curr : worst));

  return {
    score: Math.round(overallRatio * 100) / 10,
    hasData: entries.some(([, value]) => value > 0),
    strongestKey,
    weakestKey,
    focusNextWeekKey: weakestKey,
  };
}
