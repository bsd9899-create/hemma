/**
 * حساب أهداف الطاقة والماكروز — مبني على مراجع علمية منشورة، لا أرقام
 * مخترعة. كل ثابت هنا مرجعه موثّق في docs/SCIENTIFIC_FOUNDATION.md.
 *
 * دالة صافية بالكامل: لا قاعدة بيانات، لا i18n، لا تأثيرات جانبية —
 * قابلة للاختبار مباشرة مثل بقية وحدات src/domain.
 *
 * ⚠️ هذه تقديرات لشخص بالغ سليم، وليست وصفة طبية. الحمل والرضاعة
 * والحالات المرضية والأدوية تغيّر الاحتياج جوهريًا، ولا يغطيها هذا
 * الحساب — راجع docs/SCIENTIFIC_FOUNDATION.md قسم "حدود الاستخدام".
 */

export type Sex = 'male' | 'female';

/**
 * مستوى النشاط بمعامل PAL. القيم من تقرير
 * FAO/WHO/UNU (2004) "Human energy requirements"، الجدول 5.5.
 */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.4,
  light: 1.55,
  moderate: 1.7,
  active: 1.85,
  very_active: 2.1,
};

/** هدف المستخدم — نفس قيم public.goal_type في قاعدة البيانات. */
export type GoalType = 'lose_weight' | 'gain_muscle' | 'increase_activity' | 'general_health';

export type BodyProfile = {
  sex: Sex;
  /** بالسنوات الكاملة. */
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goalType: GoalType;
};

export type EnergyTargets = {
  /** أيض الراحة (kcal/يوم). */
  bmr: number;
  /** إجمالي الصرف اليومي = BMR × PAL. */
  tdee: number;
  /** هدف السعرات بعد تعديل الهدف، مع احترام حد الأمان السفلي. */
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** true إذا اصطدم العجز بحد الأمان فقُلِّص — تعرضه الواجهة كتنبيه. */
  deficitLimitedBySafetyFloor: boolean;
};

/**
 * عجز 500 kcal/يوم ≈ 0.45 كجم/أسبوع، وهو داخل النطاق الآمن (0.5–1 كجم
 * أسبوعيًا) في إرشادات CDC وNIH لفقد الوزن.
 */
const WEIGHT_LOSS_DEFICIT_KCAL = 500;

/**
 * فائض معتدل لبناء العضل. الفائض الكبير يزيد الشحم أكثر من العضل —
 * مراجعة Slater & Phillips (2011) وموقف ISSN حول التضخيم.
 */
const MUSCLE_GAIN_SURPLUS_KCAL = 350;

/**
 * حد أمان سفلي للسعرات: لا ننزل تحت هذه القيم مهما كان العجز. الأرقام
 * الشائعة في الإرشادات السريرية للحميات غير الخاضعة لإشراف طبي.
 */
const MIN_CALORIES: Record<Sex, number> = { male: 1500, female: 1200 };

/**
 * البروتين بالجرام لكل كجم من وزن الجسم.
 * ISSN position stand (Jäger et al., JISSN 2017): 1.4–2.0 g/kg للأشخاص
 * النشطين؛ الطرف الأعلى أنسب أثناء العجز الحراري للحفاظ على الكتلة.
 */
const PROTEIN_G_PER_KG: Record<GoalType, number> = {
  lose_weight: 1.8,
  gain_muscle: 1.8,
  increase_activity: 1.4,
  general_health: 1.2,
};

/**
 * نسبة الدهون من إجمالي الطاقة. AMDR في Dietary Reference Intakes
 * (IOM 2005): 20–35% للبالغين. نستخدم 27% كنقطة وسط.
 */
const FAT_ENERGY_FRACTION = 0.27;

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

/** حد أدنى للكارب حفاظًا على وظائف الدماغ — RDA = 130 جم/يوم (IOM 2005). */
const MIN_CARBS_G = 130;

/**
 * معادلة Mifflin-St Jeor (1990) لأيض الراحة.
 * اعتمدتها Academy of Nutrition and Dietetics كأدق معادلة تنبؤية
 * للبالغين الأصحاء (Frankenfield et al., JADA 2005).
 */
export function calculateBMR(profile: Pick<BodyProfile, 'sex' | 'ageYears' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.ageYears;
  return profile.sex === 'male' ? base + 5 : base - 161;
}

/** إجمالي الصرف اليومي = BMR × معامل النشاط. */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activityLevel];
}

function goalAdjustedCalories(tdee: number, goalType: GoalType): number {
  switch (goalType) {
    case 'lose_weight':
      return tdee - WEIGHT_LOSS_DEFICIT_KCAL;
    case 'gain_muscle':
      return tdee + MUSCLE_GAIN_SURPLUS_KCAL;
    // زيادة النشاط والصحة العامة: الحفاظ على الوزن الحالي.
    default:
      return tdee;
  }
}

/**
 * يحسب أهداف الطاقة والماكروز الكاملة.
 *
 * ترتيب التوزيع مقصود: البروتين أولًا (مرتبط بوزن الجسم لا بنسبة من
 * الطاقة)، ثم الدهون كنسبة من الطاقة، والكارب هو الباقي — هذا هو
 * الترتيب المعتمد في إرشادات ISSN وACSM، لأن حاجة البروتين مطلقة
 * بينما الكارب هو وقود قابل للتعديل.
 */
export function calculateTargets(profile: BodyProfile): EnergyTargets {
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activityLevel);

  const requested = goalAdjustedCalories(tdee, profile.goalType);
  const floor = MIN_CALORIES[profile.sex];
  const calories = Math.max(requested, floor);

  const proteinG = profile.weightKg * PROTEIN_G_PER_KG[profile.goalType];
  const fatG = (calories * FAT_ENERGY_FRACTION) / KCAL_PER_G.fat;

  const remainingKcal = calories - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat;
  const carbsG = Math.max(MIN_CARBS_G, remainingKcal / KCAL_PER_G.carbs);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(calories),
    proteinG: Math.round(proteinG),
    carbsG: Math.round(carbsG),
    fatG: Math.round(fatG),
    deficitLimitedBySafetyFloor: requested < floor,
  };
}

/** العمر بالسنوات الكاملة من تاريخ الميلاد. */
export function ageFromBirthDate(birthDate: string, today: Date = new Date()): number | null {
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;

  let age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age -= 1;
  return age >= 0 ? age : null;
}
