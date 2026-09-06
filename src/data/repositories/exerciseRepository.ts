import { supabase } from '../supabase';
import type { Database, ExerciseEquipment, MuscleGroup } from '../database.types';

export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row'];
export type PersonalRecord = Database['public']['Views']['exercise_personal_records']['Row'];

export type ExerciseFilter = {
  search?: string;
  muscle?: MuscleGroup | null;
  equipment?: ExerciseEquipment | null;
  favouritesOnly?: boolean;
};

/** مجموعة جاهزة للحفظ — بلا user_id (يأتي من الجلسة) ولا id. */
export type NewSet = {
  exerciseId: string;
  setNumber: number;
  weightKg?: number | null;
  reps?: number | null;
  durationSeconds?: number | null;
  distanceM?: number | null;
  isWarmup?: boolean;
  rpe?: number | null;
};

export const exerciseRepository = {
  async list(filter: ExerciseFilter = {}): Promise<Exercise[]> {
    let query = supabase.from('exercises').select('*').eq('is_active', true).order('name_ar');

    if (filter.muscle) query = query.eq('primary_muscle', filter.muscle);
    if (filter.equipment) query = query.eq('equipment', filter.equipment);
    if (filter.search?.trim()) {
      // البحث بالعربية والإنجليزية معًا: المستخدم قد يكتب "سكوات" أو
      // "squat" لنفس التمرين. or() تبني شرط OR واحدًا على الخادم بدل
      // ثلاثة استعلامات ودمجها في العميل.
      const term = `%${filter.search.trim()}%`;
      query = query.or(`name_ar.ilike.${term},name_en.ilike.${term},slug.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getById(exerciseId: string): Promise<Exercise | null> {
    const { data, error } = await supabase.from('exercises').select('*').eq('id', exerciseId).maybeSingle();
    if (error) throw error;
    return data;
  },

  /** الأرقام القياسية لتمرين واحد — تُشتق لحظيًا، فلا تتقادم أبدًا. */
  async getPersonalRecord(userId: string, exerciseId: string): Promise<PersonalRecord | null> {
    const { data, error } = await supabase
      .from('exercise_personal_records')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * آخر جلسة أداء لهذا التمرين — أهم رقم في شاشة التسجيل: المستخدم
   * يحتاج أن يعرف ماذا رفع آخر مرة ليقرر ماذا يرفع الآن.
   */
  async getLastSession(userId: string, exerciseId: string): Promise<WorkoutSet[]> {
    const { data, error } = await supabase
      .from('workout_sets')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('performed_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    if (!data || data.length === 0) return [];

    // كل المجموعات ضمن نفس اليوم الذي تحمله أحدث مجموعة.
    const latestDay = data[0].performed_at.slice(0, 10);
    return data.filter((s) => s.performed_at.slice(0, 10) === latestDay).reverse();
  },

  async getHistory(userId: string, exerciseId: string, limit = 100): Promise<WorkoutSet[]> {
    const { data, error } = await supabase
      .from('workout_sets')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('performed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async logSets(userId: string, workoutId: string | null, sets: NewSet[]): Promise<void> {
    if (sets.length === 0) return;
    const { error } = await supabase.from('workout_sets').insert(
      sets.map((s) => ({
        user_id: userId,
        workout_id: workoutId,
        exercise_id: s.exerciseId,
        set_number: s.setNumber,
        weight_kg: s.weightKg ?? null,
        reps: s.reps ?? null,
        duration_seconds: s.durationSeconds ?? null,
        distance_m: s.distanceM ?? null,
        is_warmup: s.isWarmup ?? false,
        rpe: s.rpe ?? null,
      }))
    );
    if (error) throw error;
  },

  async listFavourites(userId: string): Promise<string[]> {
    const { data, error } = await supabase.from('exercise_favorites').select('exercise_id').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map((r) => r.exercise_id);
  },

  async toggleFavourite(userId: string, exerciseId: string, makeFavourite: boolean): Promise<void> {
    if (makeFavourite) {
      const { error } = await supabase
        .from('exercise_favorites')
        .insert({ user_id: userId, exercise_id: exerciseId });
      // 23505 = مفضّل مسبقًا. ضغطتان سريعتان تنتجان هذا، وهو ليس خطأ
      // يستحق رسالة حمراء — النتيجة المطلوبة محقّقة بالفعل.
      if (error && error.code !== '23505') throw error;
      return;
    }
    const { error } = await supabase
      .from('exercise_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId);
    if (error) throw error;
  },
};
