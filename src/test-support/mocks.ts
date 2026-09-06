/**
 * تمويه طبقة البيانات والتنقّل وحدها — منطق الشاشات يعمل حقيقيًا.
 *
 * قاعدة: لا نموّه أي شيء داخل src/features أو src/domain أو
 * src/design-system. تمويهها يعني اختبار المموّه لا التطبيق.
 */

/** جلسة مستخدم صالحة. */
export const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';

/** أهداف كاملة كما تبدو بعد تطبيق كل الترحيلات. */
export const completeGoals = {
  user_id: TEST_USER_ID,
  target_water_ml: 2000,
  target_steps: 8000,
  target_sleep_hours: 7.5,
  target_workouts_per_week: 3,
  target_weight_kg: 75,
  target_calories: 2200,
  target_protein_g: 140,
  target_carbs_g: 240,
  target_fat_g: 70,
  targets_source: 'calculated' as const,
  updated_at: new Date().toISOString(),
};

/**
 * أهداف كما تعود من قاعدة بيانات **متأخرة عن الكود** (ترحيل لم يُطبَّق).
 * الأعمدة غائبة تمامًا لا أصفار — هذا ما سبّب انهيار
 * `toLocaleString of undefined`، ويجب أن تصمد كل شاشة أمامه.
 */
export const goalsMissingNutritionColumns = {
  user_id: TEST_USER_ID,
  target_water_ml: 2000,
  target_steps: 8000,
  target_sleep_hours: 7.5,
  target_workouts_per_week: 3,
  target_weight_kg: null,
  updated_at: new Date().toISOString(),
} as unknown as typeof completeGoals;

export const testProfile = {
  id: TEST_USER_ID,
  display_name: 'مستخدم الاختبار',
  avatar_url: null,
  goal_type: 'lose_weight' as const,
  sex: 'male' as const,
  birth_date: '1996-01-15',
  height_cm: 180,
  activity_level: 'moderate' as const,
  onboarding_completed_at: new Date().toISOString(),
  is_admin: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const testExercise = {
  id: '33333333-3333-4333-8333-333333333333',
  slug: 'barbell-back-squat',
  name_ar: 'السكوات بالبار',
  name_en: 'Barbell Back Squat',
  primary_muscle: 'quads' as const,
  secondary_muscles: ['glutes'] as const,
  equipment: 'barbell' as const,
  metric: 'weight_reps' as const,
  instructions_ar: ['ضع البار على أعلى الظهر.', 'انزل حتى يوازي الفخذ الأرض.'],
  instructions_en: ['Rest the bar on your upper back.', 'Descend until thighs are parallel.'],
  cues_ar: ['الظهر محايد'],
  media_url: null,
  media_license: null,
  media_attribution: null,
  is_active: true,
  created_at: new Date().toISOString(),
};
