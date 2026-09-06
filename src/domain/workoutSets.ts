/**
 * منطق عرض المجموعات وحساب حجم التدريب — دوال صافية، بلا شبكة ولا i18n.
 *
 * سبب الفصل: "هل هذه المجموعة رقم قياسي؟" و"ما حجم تدريب اليوم؟" أسئلة
 * تُختبر بأرقام، لا بلقطات شاشة.
 */

import type { ExerciseMetric } from '@/src/data/database.types';

export type SetLike = {
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  is_warmup: boolean;
};

/**
 * حجم التدريب (tonnage) = مجموع الوزن × التكرارات.
 *
 * مقياس شائع لمتابعة الحِمل عبر الأسابيع (NSCA, Essentials of Strength
 * Training and Conditioning). الإحماء مستثنى لأنه ليس حِملًا فعّالًا،
 * وإدخاله يجعل الرقم يرتفع بمجرد إضافة إحماء أطول.
 */
export function totalVolumeKg(sets: SetLike[]): number {
  return sets.reduce((total, s) => {
    if (s.is_warmup || s.weight_kg === null || s.reps === null) return total;
    return total + s.weight_kg * s.reps;
  }, 0);
}

/** عدد المجموعات الفعّالة (بلا إحماء). */
export function workingSetCount(sets: SetLike[]): number {
  return sets.filter((s) => !s.is_warmup).length;
}

/**
 * تقدير أقصى تكرار واحد بمعادلة Epley (1985):
 *   1RM ≈ الوزن × (1 + التكرارات ÷ 30)
 *
 * **تقدير لا قياس.** دقّته تنخفض كلما زادت التكرارات (تُعتبر معقولة
 * حتى ~10 تكرارات)، ولهذا نُرجع null فوق ذلك بدل رقم واثق وخاطئ.
 * المصدر: Epley B. "Poundage Chart", Boyd Epley Workout, 1985.
 */
export const EPLEY_MAX_REPS = 10;

export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return null;
  if (weightKg <= 0 || reps <= 0) return null;
  if (reps > EPLEY_MAX_REPS) return null;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * هل تتفوّق هذه المجموعة على الأفضل السابق؟
 *
 * المقارنة تتبع مقياس التمرين: تمرين وزن/تكرارات يُقارن بالـ1RM
 * المقدَّر (فمجموعة أخف بتكرارات أكثر قد تكون تقدّمًا حقيقيًا)، بينما
 * تمرين مدة يُقارن بالثواني. مقارنة الوزن وحده كانت ستعتبر
 * 100كجم×1 أفضل من 90كجم×8، وهذا خطأ.
 */
export function isPersonalRecord(
  metric: ExerciseMetric,
  candidate: SetLike,
  previousBest: { estimated1rmKg: number | null; maxReps: number | null; maxDurationSeconds: number | null }
): boolean {
  if (candidate.is_warmup) return false;

  switch (metric) {
    case 'weight_reps': {
      if (candidate.weight_kg === null || candidate.reps === null) return false;
      const estimate = estimateOneRepMax(candidate.weight_kg, candidate.reps);
      if (estimate === null) return false;
      return previousBest.estimated1rmKg === null || estimate > previousBest.estimated1rmKg;
    }
    case 'reps_only':
      if (candidate.reps === null) return false;
      return previousBest.maxReps === null || candidate.reps > previousBest.maxReps;
    case 'duration':
      if (candidate.duration_seconds === null) return false;
      return previousBest.maxDurationSeconds === null || candidate.duration_seconds > previousBest.maxDurationSeconds;
    // المسافة+الزمن معًا: تحسّن أحدهما وحده ليس رقمًا قياسيًا بالضرورة
    // (مسافة أطول بوتيرة أبطأ)، فلا ندّعي رقمًا قياسيًا هنا.
    default:
      return false;
  }
}

/** أي الحقول تظهر في شاشة التسجيل لهذا المقياس. */
export function fieldsForMetric(metric: ExerciseMetric): {
  weight: boolean;
  reps: boolean;
  duration: boolean;
  distance: boolean;
} {
  switch (metric) {
    case 'weight_reps':
      return { weight: true, reps: true, duration: false, distance: false };
    case 'reps_only':
      return { weight: false, reps: true, duration: false, distance: false };
    case 'duration':
      return { weight: false, reps: false, duration: true, distance: false };
    case 'distance_duration':
      return { weight: false, reps: false, duration: true, distance: true };
  }
}
