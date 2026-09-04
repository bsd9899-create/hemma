import type { Meal, MealType } from '@/src/data/repositories/dailyLogsRepository';

/**
 * حسابات التغذية اليومية — دوال صافية بلا اتصال بقاعدة البيانات ولا
 * معرفة باللغة، تمامًا كمحرّك قرار اليوم. تعيد مفاتيح ترجمة لا نصوصًا.
 */

export type MacroKey = 'protein' | 'carbs' | 'fat';

export type MacroTotals = Record<MacroKey, number>;

export type NutritionTotals = {
  calories: number;
  macros: MacroTotals;
  mealCount: number;
};

export type NutritionTargets = {
  calories: number;
  macros: MacroTotals;
};

export type NutritionSummary = {
  totals: NutritionTotals;
  targets: NutritionTargets;
  /** 0..1 بلا سقف — نعرضه محدودًا في الواجهة لكن نبقيه خامًا للمنطق. */
  calorieRatio: number;
  /** السعرات المتبقية للهدف؛ سالبة إن تجاوز المستخدم هدفه. */
  caloriesRemaining: number;
  /** ترتيب الوجبات حسب نوعها لعرضها في مجموعات. */
  byMealType: Record<MealType, Meal[]>;
};

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MACRO_KEYS: MacroKey[] = ['protein', 'carbs', 'fat'];

/** الترتيب الطبيعي لليوم — لا الترتيب الأبجدي ولا ترتيب قاعدة البيانات. */
const MEAL_TYPE_ORDER: Record<MealType, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };

function sum(meals: Meal[], pick: (meal: Meal) => number | null): number {
  return meals.reduce((total, meal) => total + (pick(meal) ?? 0), 0);
}

export function summarizeNutrition(meals: Meal[], targets: NutritionTargets): NutritionSummary {
  const totals: NutritionTotals = {
    calories: sum(meals, (m) => m.calories),
    macros: {
      protein: sum(meals, (m) => m.protein_g),
      carbs: sum(meals, (m) => m.carbs_g),
      fat: sum(meals, (m) => m.fat_g),
    },
    mealCount: meals.length,
  };

  const byMealType = MEAL_TYPES.reduce(
    (acc, type) => {
      acc[type] = meals.filter((meal) => meal.meal_type === type);
      return acc;
    },
    {} as Record<MealType, Meal[]>
  );

  return {
    totals,
    targets,
    calorieRatio: targets.calories > 0 ? totals.calories / targets.calories : 0,
    caloriesRemaining: targets.calories - totals.calories,
    byMealType,
  };
}

/** ترتيب أنواع الوجبات بترتيب اليوم الطبيعي. */
export function sortMealTypes(types: MealType[]): MealType[] {
  return [...types].sort((a, b) => MEAL_TYPE_ORDER[a] - MEAL_TYPE_ORDER[b]);
}

/**
 * رسالة سياقية واحدة عن حالة اليوم — تُغني عن عرض أرقام خام ثم ترك
 * المستخدم يفسّرها بنفسه. تعيد مفتاح ترجمة من namespace "nutrition".
 */
export function getNutritionHintKey(summary: NutritionSummary): string {
  if (summary.totals.mealCount === 0) return 'nutrition.hintNoMeals';
  if (summary.calorieRatio > 1.15) return 'nutrition.hintOverTarget';
  if (summary.calorieRatio >= 0.9) return 'nutrition.hintOnTarget';
  if (summary.calorieRatio >= 0.5) return 'nutrition.hintHalfway';
  return 'nutrition.hintEarly';
}
