import { supabase } from '../supabase';
import i18n from '@/src/lib/i18n';
import type { Database } from '../database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Repository بسيط لملف المستخدم — يُبقي استعلامات Supabase بعيدة عن
 * مكوّنات الواجهة، ويسهّل استبدالها/اختبارها لاحقًا.
 */
export const profileRepository = {
  async getCurrent(): Promise<Profile | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    if (error) throw error;
    return data;
  },

  async updateCurrent(
    patch: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'goal_type' | 'onboarding_completed_at'>>
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error(i18n.t('common.notSignedIn'));

    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
