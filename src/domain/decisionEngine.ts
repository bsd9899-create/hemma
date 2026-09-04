/**
 * محرّك "قرار اليوم" و"وضع الإنقاذ" — Rule Engine بسيط ومقصود، وليس AI،
 * تمامًا كما طُلب للنسخة الأولى. كل الدوال هنا صافية (pure) وقابلة
 * للاختبار بدون أي اتصال بقاعدة بيانات (راجع المرحلة 11).
 *
 * لا تعرف هذه الدوال أي لغة — تعيد مفاتيح ترجمة (راجع src/lib/i18n
 * locales، namespace "decision") تُترجَم في طبقة الواجهة عبر `t()`،
 * وليس نصوصًا جاهزة، حتى تبقى قابلة للاختبار بمعزل عن i18n.
 */

export type DailySignals = {
  /** نسبة (فعلي/هدف)، بدون سقف علوي — قد تتجاوز 1 لو تجاوز المستخدم هدفه. */
  stepsRatio: number;
  /** null = لا يوجد هدف تمرين محدد لهذا اليوم أساسًا (نادر، احتياطي فقط). */
  workoutRatio: number;
  /** null = لا توجد بيانات نوم مسجّلة اليوم بعد. */
  sleepRatio: number | null;
  /** نسب إنجاز آخر أيام سابقة (الأقدم أولًا)، بدون اليوم الحالي. */
  recentCompletionPercents: number[];
};

export type TodayDecision = {
  completionPercent: number;
  /** مفتاح ترجمة كامل (مثل "decision.greatText")، وليس نصًا جاهزًا. */
  decisionTextKey: string;
  recoveryMode: boolean;
};

// أوزان صريحة بعد إخراج تتبّع الماء من المنتج: التمرين هو المحرّك
// الأساسي، ثم الحركة اليومية، ثم النوم كعامل تعافٍ.
const WEIGHTS = { steps: 0.35, workout: 0.45, sleep: 0.2 } as const;

const RECOVERY_LOOKBACK_DAYS = 3;
const RECOVERY_THRESHOLD_PERCENT = 25;
const RECOVERY_DECISION_TEXT_KEY = 'decision.recoveryText';

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/** متوسط مرجَّح لنسبة الإنجاز — يعيد توزيع وزن النوم لو لم تتوفر بياناته بعد. */
function computeCompletionPercent(signals: DailySignals): number {
  const parts: { ratio: number; weight: number }[] = [
    { ratio: clamp01(signals.stepsRatio), weight: WEIGHTS.steps },
    { ratio: clamp01(signals.workoutRatio), weight: WEIGHTS.workout },
  ];
  if (signals.sleepRatio !== null) {
    parts.push({ ratio: clamp01(signals.sleepRatio), weight: WEIGHTS.sleep });
  }

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  const weightedSum = parts.reduce((sum, p) => sum + p.ratio * p.weight, 0);

  return Math.round((weightedSum / totalWeight) * 100);
}

/** انقطاع فعلي = آخر أيام متتالية بإنجاز منخفض جدًا (وليس مجرد يوم سيّئ واحد). */
function detectRecoveryMode(recentCompletionPercents: number[]): boolean {
  if (recentCompletionPercents.length < 2) return false;

  const lastDays = recentCompletionPercents.slice(-RECOVERY_LOOKBACK_DAYS);
  return lastDays.length >= 2 && lastDays.every((p) => p < RECOVERY_THRESHOLD_PERCENT);
}

function pickDecisionTextKey(signals: DailySignals, completionPercent: number): string {
  // "قريب جدًا" مقصودة تحديدًا لهذا الموقف (شبه منتهٍ والخطوات هي
  // الفجوة الوحيدة المتبقية) — لذلك تُفحص قبل تهنئة ≥90% العامة، وإلا
  // لن تظهر أبدًا في الأيام شبه المثالية التي تستحقها أكثر.
  if (signals.stepsRatio >= 0.8 && signals.stepsRatio < 1) {
    return 'decision.stepsCloseText';
  }
  if (completionPercent >= 90) {
    return 'decision.greatText';
  }
  if (signals.workoutRatio < 0.34) {
    return 'decision.focusWorkoutText';
  }
  if (completionPercent < 20) {
    return 'decision.lowText';
  }
  return 'decision.defaultText';
}

export function computeTodayDecision(signals: DailySignals): TodayDecision {
  const completionPercent = computeCompletionPercent(signals);
  const recoveryMode = detectRecoveryMode(signals.recentCompletionPercents);

  return {
    completionPercent,
    recoveryMode,
    decisionTextKey: recoveryMode ? RECOVERY_DECISION_TEXT_KEY : pickDecisionTextKey(signals, completionPercent),
  };
}
