import { supabase } from '../supabase';
import type { Database, TargetsSource } from '../database.types';

export type UserGoals = Database['public']['Tables']['user_goals']['Row'];

/** الحقول القابلة للتعديل من شاشة الأهداف — لا user_id ولا updated_at. */
export type GoalTargets = Pick<
  UserGoals,
  | 'target_steps'
  | 'target_sleep_hours'
  | 'target_workouts_per_week'
  | 'target_weight_kg'
  | 'target_calories'
  | 'target_protein_g'
  | 'target_carbs_g'
  | 'target_fat_g'
  | 'targets_source'
>;

/**
 * أهداف التغذية قد تكون غائبة فعليًا: عمود ناقص لأن ترحيلًا لم يُطبَّق
 * بعد. النوع يقول number، لكن قاعدة البيانات هي مَن يقرر وقت التشغيل.
 */
export type NutritionTargets = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  source: TargetsSource | null;
};

/** رقم موجب حقيقي، أو null لأي شيء آخر (غائب، nan، نص، سالب). */
function asPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export const goalsRepository = {
  async getCurrent(userId: string): Promise<UserGoals> {
    const { data, error } = await supabase.from('user_goals').select('*').eq('user_id', userId).single();
    if (error) throw error;
    return data;
  },

  /**
   * أهداف التغذية بشكل يجعل الغياب **قابلًا للتمثيل في النوع**.
   *
   * قراءة `goals.target_calories` مباشرة كانت تُرجع undefined حين لا
   * يوجد العمود، فتمر خلال التطبيق كأنها رقم حتى تنهار عند العرض
   * (`toLocaleString of undefined` في شاشة اليوم). النوع هنا يجبر كل
   * مستدعٍ على التعامل مع null بدل اكتشافه وقت التشغيل.
   */
  toNutritionTargets(goals: UserGoals): NutritionTargets {
    const row = goals as Record<string, unknown>;
    return {
      calories: asPositiveNumber(row.target_calories),
      proteinG: asPositiveNumber(row.target_protein_g),
      carbsG: asPositiveNumber(row.target_carbs_g),
      fatG: asPositiveNumber(row.target_fat_g),
      source: (row.targets_source as TargetsSource | undefined) ?? null,
    };
  },

  async updateTargets(userId: string, targets: Partial<GoalTargets>): Promise<UserGoals> {
    const { data, error } = await supabase
      .from('user_goals')
      .update(targets)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
