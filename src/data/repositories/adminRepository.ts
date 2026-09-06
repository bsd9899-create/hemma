import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Views = Database['public']['Views'];

export type AdminUserStats = Views['admin_user_stats']['Row'];
export type AdminSubscriptionStats = Views['admin_subscription_stats']['Row'];
export type AdminDailyActivity = Views['admin_daily_activity']['Row'];

export type AdminOverview = {
  users: AdminUserStats | null;
  subscriptions: AdminSubscriptionStats | null;
  activity: AdminDailyActivity[];
};

/**
 * قراءات لوحة الإدارة.
 *
 * لا شيء هنا يمنح صلاحية أو يفحصها: الـ views نفسها تفرض
 * `where public.is_admin()` داخل قاعدة البيانات، فتُرجع صفرًا من
 * الصفوف لغير الأدمن مهما فعل العميل. أي فحص في هذا الملف سيكون
 * تجميليًا فقط — الحماية الحقيقية في الصفّ لا في الاستدعاء.
 *
 * راجع supabase/migrations/20260906000002_admin_role.sql.
 */
export const adminRepository = {
  async getOverview(): Promise<AdminOverview> {
    const [users, subscriptions, activity] = await Promise.all([
      // maybeSingle لا single: غير الأدمن يحصل على صفر صفوف، وهذه
      // نتيجة صحيحة متوقَّعة لا خطأ يستحق رمي استثناء.
      supabase.from('admin_user_stats').select('*').maybeSingle(),
      supabase.from('admin_subscription_stats').select('*').maybeSingle(),
      supabase.from('admin_daily_activity').select('*').limit(30),
    ]);

    if (users.error) throw users.error;
    if (subscriptions.error) throw subscriptions.error;
    if (activity.error) throw activity.error;

    return {
      users: users.data,
      subscriptions: subscriptions.data,
      activity: activity.data ?? [],
    };
  },
};
