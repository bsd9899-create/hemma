import type { Profile } from '@/src/data/repositories/profileRepository';
import { ageFromBirthDate, calculateTargets, type BodyProfile, type EnergyTargets } from '@/src/domain/nutritionTargets';

/**
 * يحوّل الملف الشخصي + آخر وزن مسجّل إلى أهداف محسوبة علميًا، أو null
 * إذا نقص أي مُدخَل تتطلبه المعادلة.
 *
 * نعيد null بدل تخمين القيم الناقصة عمدًا: هدف مبني على وزن مفترض هو
 * رقم مخترع بغلاف علمي، وهذا بالضبط ما نتجنّبه.
 */
export function getSuggestedTargets(profile: Profile | null, latestWeightKg: number | null): EnergyTargets | null {
  if (!profile?.sex || !profile.birth_date || !profile.height_cm || !profile.activity_level) return null;
  if (latestWeightKg === null || latestWeightKg <= 0) return null;

  const ageYears = ageFromBirthDate(profile.birth_date);
  if (ageYears === null) return null;

  const body: BodyProfile = {
    sex: profile.sex,
    ageYears,
    heightCm: profile.height_cm,
    weightKg: latestWeightKg,
    activityLevel: profile.activity_level,
    goalType: profile.goal_type,
  };
  return calculateTargets(body);
}
