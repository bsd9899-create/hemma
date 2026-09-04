import { supabase } from '../supabase';
import type { Database } from '../database.types';

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
>;

export const goalsRepository = {
  async getCurrent(userId: string): Promise<UserGoals> {
    const { data, error } = await supabase.from('user_goals').select('*').eq('user_id', userId).single();
    if (error) throw error;
    return data;
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
