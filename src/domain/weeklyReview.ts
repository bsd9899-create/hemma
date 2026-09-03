/**
 * التقييم الأسبوعي — دالة صافية تحوّل متوسطات الأسبوع الخام إلى ملخص.
 * تعيد مفاتيح مؤشرات (مثل "steps") تُترجَم في طبقة الواجهة عبر
 * `t('weeklyMetrics.' + key)`، وليس تسميات جاهزة، حتى تبقى الدالة
 * بمعزل عن i18n وقابلة للاختبار مباشرة.
 */

export type WeeklyRawAverages = {
  avgWaterMl: number;
  avgWorkoutMinutes: number;
  avgSteps: number;
  avgSleepHours: number;
};

export type WeeklyGoals = {
  targetWaterMl: number;
  targetSteps: number;
  targetSleepHours: number;
};

export type WeeklyMetricKey = 'workout' | 'water' | 'steps' | 'sleep';

export type WeeklyReview = {
  /** من 0 إلى 10 */
  score: number;
  strongestKey: WeeklyMetricKey;
  weakestKey: WeeklyMetricKey;
  focusNextWeekKey: WeeklyMetricKey;
};

const REFERENCE_WORKOUT_MINUTES_PER_DAY = 30;

export function computeWeeklyReview(raw: WeeklyRawAverages, goals: WeeklyGoals): WeeklyReview {
  const ratios: Record<WeeklyMetricKey, number> = {
    workout: raw.avgWorkoutMinutes / REFERENCE_WORKOUT_MINUTES_PER_DAY,
    water: raw.avgWaterMl / goals.targetWaterMl,
    steps: raw.avgSteps / goals.targetSteps,
    sleep: raw.avgSleepHours / goals.targetSleepHours,
  };

  const entries = Object.entries(ratios) as [WeeklyMetricKey, number][];
  const overallRatio = entries.reduce((sum, [, ratio]) => sum + Math.min(1, ratio), 0) / entries.length;

  const [strongestKey] = entries.reduce((best, curr) => (curr[1] > best[1] ? curr : best));
  const [weakestKey] = entries.reduce((worst, curr) => (curr[1] < worst[1] ? curr : worst));

  return {
    score: Math.round(overallRatio * 100) / 10,
    strongestKey,
    weakestKey,
    focusNextWeekKey: weakestKey,
  };
}
