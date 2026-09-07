import type { Database } from '@/src/data/database.types';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type ViewRow<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];

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

export const testProfile: Row<'profiles'> = {
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

export const testExercise: Row<'exercises'> = {
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

/**
 * ─────────────────────────────────────────────────────────────────────
 * الحالة الممتلئة — مستخدم بعد أسبوع من الاستعمال الفعلي.
 *
 * الحالة الفارغة تكشف صنفًا من الأخطاء (قسمة على صفر، غياب يُعرض كصفر)،
 * والممتلئة تكشف صنفًا آخر لا تراه الأولى إطلاقًا: أرقام تفيض حدودها،
 * نصوص تكسر تخطيطها، جمع خاطئ، وتنسيق يفشل عند القيم الكبيرة.
 * ─────────────────────────────────────────────────────────────────────
 */

const daysAgo = (n: number) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
};
const dateKey = (n: number) => daysAgo(n).toISOString().slice(0, 10);

/** سبعة أيام متتالية بإنجاز متفاوت — أكثرها فوق العتبة فتوجد سلسلة. */
export const populatedHistory = [
  { date: dateKey(6), completion_percent: 40 },
  { date: dateKey(5), completion_percent: 75 },
  { date: dateKey(4), completion_percent: 100 },
  { date: dateKey(3), completion_percent: 92 },
  { date: dateKey(2), completion_percent: 68 },
  { date: dateKey(1), completion_percent: 88 },
  { date: dateKey(0), completion_percent: 55 },
];

export const populatedMeals: Row<'nutrition_logs'>[] = [
  { id: 'm1', user_id: TEST_USER_ID, meal_type: 'breakfast', description: 'شوفان بالحليب والموز',
    calories: 420, protein_g: 18, carbs_g: 62, fat_g: 11, logged_at: daysAgo(0).toISOString(),
    source: 'manual', created_at: daysAgo(0).toISOString() },
  { id: 'm2', user_id: TEST_USER_ID, meal_type: 'lunch', description: 'كبسة دجاج مع سلطة',
    calories: 980, protein_g: 52, carbs_g: 104, fat_g: 34, logged_at: daysAgo(0).toISOString(),
    source: 'manual', created_at: daysAgo(0).toISOString() },
  { id: 'm3', user_id: TEST_USER_ID, meal_type: 'snack', description: 'تمر وقهوة',
    calories: 180, protein_g: 2, carbs_g: 44, fat_g: 0, logged_at: daysAgo(0).toISOString(),
    source: 'manual', created_at: daysAgo(0).toISOString() },
];

/** وزن نازل — الحالة التي يُفترض أن تُعرض كتقدّم لا كتراجع. */
export const populatedWeightTrend = { latestKg: 82.4, earliestKg: 85.1 };

export const populatedWeeklyRaw = { avgWorkoutMinutes: 34, avgSteps: 9350, avgSleepHours: 6.4 };

export const populatedTeam: Row<'teams'> = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'فريق الفجر',
  invite_code: 'FAJR24',
  created_by: TEST_USER_ID,
  created_at: daysAgo(20).toISOString(),
};

export const populatedRoster: ViewRow<'team_roster'>[] = [
  { team_id: populatedTeam.id, user_id: TEST_USER_ID, display_name: 'مستخدم الاختبار', role: 'owner', avatar_url: null },
  { team_id: populatedTeam.id, user_id: '55555555-5555-4555-8555-555555555555', display_name: 'عبدالرحمن', role: 'member', avatar_url: null },
  { team_id: populatedTeam.id, user_id: '66666666-6666-4666-8666-666666666666',
    display_name: 'اسم طويل جدًا يختبر كسر التخطيط في البطاقة', role: 'member', avatar_url: null },
];

export const populatedLeaderboard: ViewRow<'team_leaderboard'>[] = [
  { team_id: populatedTeam.id, user_id: '55555555-5555-4555-8555-555555555555', display_name: 'عبدالرحمن', avatar_url: null, total_points: 1240 },
  { team_id: populatedTeam.id, user_id: TEST_USER_ID, display_name: 'مستخدم الاختبار', avatar_url: null, total_points: 980 },
  { team_id: populatedTeam.id, user_id: '66666666-6666-4666-8666-666666666666',
    display_name: 'اسم طويل جدًا يختبر كسر التخطيط في البطاقة', avatar_url: null, total_points: 15 },
];

export const populatedChallenges: Row<'challenges'>[] = [
  { id: '77777777-7777-4777-8777-777777777777', team_id: populatedTeam.id, title: 'تحدي العشرة آلاف خطوة',
    description: 'أسبوعان من المشي اليومي', start_date: dateKey(4), end_date: dateKey(-10),
    created_by: TEST_USER_ID, created_at: daysAgo(4).toISOString() },
];

export const populatedPair: Row<'accountability_pairs'> = {
  id: '88888888-8888-4888-8888-888888888888',
  requester_id: TEST_USER_ID,
  partner_id: '55555555-5555-4555-8555-555555555555',
  status: 'active',
  created_at: daysAgo(9).toISOString(),
  responded_at: daysAgo(8).toISOString(),
};

export const populatedPings: Row<'accountability_pings'>[] = [
  { id: 'p1', pair_id: populatedPair.id, sender_id: '55555555-5555-4555-8555-555555555555',
    kind: 'lets_go', created_at: daysAgo(0).toISOString() },
  { id: 'p2', pair_id: populatedPair.id, sender_id: TEST_USER_ID,
    kind: 'well_done', created_at: daysAgo(1).toISOString() },
];

/** أرقام قياسية بقيم كبيرة — تكشف الفيض والتنسيق عند الآلاف. */
export const populatedPersonalRecord: ViewRow<'exercise_personal_records'> = {
  user_id: TEST_USER_ID,
  exercise_id: testExercise.id,
  max_weight_kg: 142.5,
  max_reps: 12,
  max_duration_seconds: null,
  estimated_1rm_kg: 199.5,
  last_performed_at: daysAgo(2).toISOString(),
  total_sets: 148,
};

export const populatedSets: Row<'workout_sets'>[] = [
  { id: 's1', user_id: TEST_USER_ID, exercise_id: testExercise.id, workout_id: null, set_number: 1,
    weight_kg: 120, reps: 8, duration_seconds: null, distance_m: null, is_warmup: false, rpe: 8,
    performed_at: daysAgo(2).toISOString(), created_at: daysAgo(2).toISOString() },
  { id: 's2', user_id: TEST_USER_ID, exercise_id: testExercise.id, workout_id: null, set_number: 2,
    weight_kg: 130, reps: 6, duration_seconds: null, distance_m: null, is_warmup: false, rpe: 9,
    performed_at: daysAgo(2).toISOString(), created_at: daysAgo(2).toISOString() },
];

export const populatedAdminOverview: {
  users: ViewRow<'admin_user_stats'> | null;
  subscriptions: ViewRow<'admin_subscription_stats'> | null;
  activity: ViewRow<'admin_daily_activity'>[];
} = {
  users: { total_users: 12480, onboarded_users: 9310, new_last_7_days: 640, new_last_30_days: 2410 },
  subscriptions: { active_premium: 1875, renewing: 1540, app_store: 1720, play_store: 155, expired: 410 },
  activity: [
    { date: dateKey(2), active_users: 2980, avg_completion_percent: 63 },
    { date: dateKey(1), active_users: 3050, avg_completion_percent: 71 },
    { date: dateKey(0), active_users: 3120, avg_completion_percent: 58 },
  ],
};
