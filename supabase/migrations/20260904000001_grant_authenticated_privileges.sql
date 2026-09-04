-- ============================================================
-- صلاحيات دور authenticated على جداول التطبيق
-- ============================================================
-- سبب هذه الـ migration: خطأ 42501 "permission denied" لمستخدم مسجّل
-- دخوله بشكل صحيح، رغم أن سياسات RLS مكتوبة وصحيحة لكل الجداول.
--
-- في Postgres طبقتان مستقلتان تمامًا:
--   1) GRANT   — هل يملك الدور صلاحية لمس الجدول أصلًا؟
--   2) RLS     — أي صفوف يراها/يعدّلها بعد اجتياز الطبقة الأولى؟
-- سياسة RLS مثالية لا تنفع شيئًا إن لم يكن للدور GRANT على الجدول:
-- الطلب يُرفض قبل الوصول إلى السياسة أساسًا، بالخطأ 42501 نفسه.
--
-- مشاريع Supabase تمنح هذه الصلاحيات تلقائيًا عبر ALTER DEFAULT
-- PRIVILEGES، لكن ذلك يسري فقط على الجداول التي ينشئها الدور صاحب
-- تلك الإعدادات. جداول أُنشئت بمسار مختلف (تشغيل apply_all.sql أو
-- migrations بدور آخر) تخرج بلا أي GRANT لدور authenticated.
--
-- هذه الـ migration تمنح الصلاحيات صراحةً بأقل قدر ممكن لكل جدول،
-- ولا تعطّل RLS ولا تجعل أي جدول عامًا: RLS يبقى مفعّلًا ويستمر في
-- تصفية الصفوف تمامًا كما كان. GRANT عملية idempotent، فإعادة تشغيل
-- هذا الملف آمنة تمامًا.

-- الوصول إلى المخطّط نفسه شرط مسبق لأي وصول للجداول بداخله.
grant usage on schema public to authenticated;

-- ---------------------------------------------------------------
-- الملف الشخصي والأهداف
-- ---------------------------------------------------------------
-- لا insert على profiles: الصف يُنشأ حصرًا عبر handle_new_user
-- (SECURITY DEFINER) عند التسجيل، لا من العميل.
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.user_goals to authenticated;

-- ---------------------------------------------------------------
-- سجلات اليوم — بيانات صحية خاصة بصاحبها (RLS: owner فقط)
-- ---------------------------------------------------------------
grant select, insert, update on public.workouts to authenticated;
grant select, insert, update on public.nutrition_logs to authenticated;
grant select, insert, update on public.water_logs to authenticated;
grant select, insert, update on public.steps_logs to authenticated;
grant select, insert, update on public.sleep_logs to authenticated;
grant select, insert, update on public.weight_logs to authenticated;

-- ---------------------------------------------------------------
-- الوعد اليومي وتقدّم اليوم
-- ---------------------------------------------------------------
grant select, insert, update on public.daily_promises to authenticated;
grant select, insert, update on public.daily_progress to authenticated;

-- ---------------------------------------------------------------
-- الفرق والتحديات
-- ---------------------------------------------------------------
grant select, insert, update on public.teams to authenticated;
-- team_members: قراءة فقط عمدًا. كل إدراج يمر عبر handle_new_team و
-- join_team_by_code (SECURITY DEFINER) كما هو موثّق في migration الفرق.
grant select on public.team_members to authenticated;
grant select, insert on public.challenges to authenticated;
grant select, insert, update on public.challenge_progress to authenticated;

-- ---------------------------------------------------------------
-- رفيق المحاسبة
-- ---------------------------------------------------------------
grant select, insert, update on public.accountability_pairs to authenticated;
grant select, insert on public.accountability_pings to authenticated;

-- ---------------------------------------------------------------
-- جداول للقراءة فقط من جهة العميل
-- ---------------------------------------------------------------
-- points_ledger يكتب فيه الخادم/المحفّزات فقط.
grant select on public.points_ledger to authenticated;
-- subscriptions يكتبها webhook الخاص بـ RevenueCat بدور service_role.
grant select on public.subscriptions to authenticated;
-- notifications تُنشأ من الخادم؛ العميل يقرأ ويعلّم كمقروء فقط.
grant select, update on public.notifications to authenticated;

-- ---------------------------------------------------------------
-- الـ views المسموح بها للعميل
-- ---------------------------------------------------------------
grant select on public.team_roster to authenticated;
grant select on public.team_pulse_daily to authenticated;
grant select on public.team_leaderboard to authenticated;
-- ملاحظة: user_points_totals تبقى محجوبة عن authenticated عمدًا
-- (راجع revoke في 20260831000006) — لا تُمنح هنا.

-- ---------------------------------------------------------------
-- الدوال التي يستدعيها العميل
-- ---------------------------------------------------------------
grant execute on function public.join_team_by_code(text) to authenticated;
