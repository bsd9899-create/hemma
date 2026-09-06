import type { ExerciseEquipment, MuscleGroup } from '@/src/data/database.types';

/** ترتيب العرض — مجموعات الجسم العلوي ثم السفلي ثم العام. */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves', 'core', 'full_body', 'cardio',
];

export const EQUIPMENT: ExerciseEquipment[] = [
  'bodyweight', 'barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'band', 'other',
];

/** مفتاح ترجمة لا نص — تبقى الترجمة في ملفات i18n وحدها. */
export function muscleLabelKey(muscle: MuscleGroup): string {
  return `exercises.muscle.${muscle}`;
}

export function equipmentLabelKey(equipment: ExerciseEquipment): string {
  return `exercises.equipment.${equipment}`;
}
