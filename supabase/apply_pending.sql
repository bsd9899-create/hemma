-- ============================================================
-- هِمّة — الترحيلات المعلّقة فقط (آمنة للتشغيل على المشروع الحيّ)
-- ============================================================
-- شغّل هذا الملف كاملًا مرة واحدة في:
--   Supabase Dashboard → SQL Editor → New query → لصق → Run
--
-- يحتوي الترحيلات الثلاثة التي لم تُطبَّق بعد على المشروع الحيّ:
--   20260904000001  صلاحيات GRANT لدور authenticated  ← يصلح خطأ 42501
--   20260904000002  ماكروز الوجبات وأهداف التغذية
--   20260906000001  بيانات الجسم اللازمة لحساب أهداف علمية
--   20260906000002  صلاحية الإدارة وviews الإدارة المجمّعة
--
-- ⚠️ ما لا يفعله هذا الملف، عن قصد:
--   لا يحذف أي جدول ولا عمود ولا صف.
--   لا يعطّل RLS ولا يحذف أي سياسة قائمة.
--   لا يغيّر أي شيء في مخطط auth أو إعدادات المصادقة.
--   لا يلمس بيانات مستخدم واحدة.
-- كل ما فيه إضافي بحت: صلاحيات وأعمدة جديدة nullable أو بقيمة افتراضية.
--
-- ✅ آمن لإعادة التشغيل (idempotent): كل جملة إما IF NOT EXISTS أو
--    GRANT/COMMENT (تكرارهما بلا أثر) أو داخل حارس DO يفحص أولًا.
--    تشغيله مرتين لا يسبب خطأ ولا يغيّر شيئًا في المرة الثانية.
--
-- إن كان المشروع جديدًا تمامًا وفارغًا، استخدم supabase/apply_all.sql
-- بدل هذا الملف — ذاك ينشئ المخطط من الصفر.

begin;

-- ============================================================
-- 20260904000001_grant_authenticated_privileges.sql
-- ============================================================
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

-- ============================================================
-- 20260904000002_nutrition_macros_and_targets.sql
-- ============================================================
-- ============================================================
-- التغذية: الماكروز وأهداف السعرات
-- ============================================================
-- التغذية كانت تُسجَّل كوصف نصي + سعرات فقط، فلا يمكن بناء أي لوحة
-- تغذية حقيقية (بروتين/كارب/دهون) ولا مقارنة اليوم بهدف. هذه الـ
-- migration إضافية بالكامل: كل الأعمدة nullable أو لها قيمة افتراضية،
-- فلا تكسر أي صف قائم ولا أي استعلام حالي.

-- ---------------------------------------------------------------
-- ماكروز الوجبة — اختيارية: المستخدم قد يسجّل وجبة بسعراتها فقط.
-- ---------------------------------------------------------------
alter table public.nutrition_logs
  add column if not exists protein_g numeric(6, 1) check (protein_g >= 0),
  add column if not exists carbs_g   numeric(6, 1) check (carbs_g >= 0),
  add column if not exists fat_g     numeric(6, 1) check (fat_g >= 0);

comment on column public.nutrition_logs.protein_g is 'بروتين الوجبة بالجرام — اختياري.';
comment on column public.nutrition_logs.carbs_g is 'كربوهيدرات الوجبة بالجرام — اختياري.';
comment on column public.nutrition_logs.fat_g is 'دهون الوجبة بالجرام — اختياري.';

-- ---------------------------------------------------------------
-- أهداف التغذية اليومية.
--
-- القيم الافتراضية هي **القيم اليومية المرجعية (Daily Values)** التي
-- تفرضها FDA على ملصقات الأغذية: 2000 سعرة، 50 جم بروتين، 275 جم
-- كربوهيدرات، 78 جم دهون — المصدر 21 CFR 101.9(c)(9).
--
-- اخترناها تحديدًا لأنها **رقم مرجعي منشور**، لا تقدير داخلي. الأرقام
-- التي كانت هنا سابقًا (2000/120/220/65) لم يكن لها أي مصدر: بدت
-- معقولة فقط. وتطبيق يعرض رقمًا مخترعًا في خانة "هدفك" يكذب على
-- المستخدم بثقة، وهو ما يمنعه docs/SCIENTIFIC_FOUNDATION.md صراحةً.
--
-- القيمة المرجعية ليست هدفًا شخصيًا وليست المقصودة للاستخدام الدائم:
-- الهدف الحقيقي يُحسب من بيانات جسم المستخدم عبر
-- src/domain/nutritionTargets.ts. يميّز targets_source بين الحالتين
-- حتى لا تعرض الواجهة رقمًا مرجعيًا عامًا وكأنه محسوب له هو.
-- ---------------------------------------------------------------
alter table public.user_goals
  add column if not exists target_calories  integer     not null default 2000 check (target_calories > 0),
  add column if not exists target_protein_g integer     not null default 50   check (target_protein_g >= 0),
  add column if not exists target_carbs_g   integer     not null default 275  check (target_carbs_g >= 0),
  add column if not exists target_fat_g     integer     not null default 78   check (target_fat_g >= 0);

-- من أين جاء الرقم المعروض؟ reference = قيمة FDA المرجعية العامة (لم
-- يضبط المستخدم شيئًا بعد)، calculated = محسوب من بيانات جسمه،
-- manual = أدخله بنفسه. بدون هذا التمييز تبدو الثلاثة متطابقة في
-- الواجهة، فيظن المستخدم أن الرقم المرجعي العام هدف شخصي له.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'targets_source') then
    create type public.targets_source as enum ('reference', 'calculated', 'manual');
  end if;
end $$;

alter table public.user_goals
  add column if not exists targets_source public.targets_source not null default 'reference';

comment on column public.user_goals.target_calories is 'هدف السعرات اليومي. الافتراضي = القيمة المرجعية من FDA (21 CFR 101.9)، وليس هدفًا شخصيًا — راجع targets_source.';
comment on column public.user_goals.targets_source is 'مصدر أرقام الأهداف: reference (قيمة FDA عامة) / calculated (محسوبة من بيانات الجسم) / manual (أدخلها المستخدم).';

-- ---------------------------------------------------------------
-- فهرس لجلب وجبات يوم واحد بسرعة (شاشة التغذية تستعلم عن اليوم فقط).
-- الفهرس القائم (user_id, logged_at desc) يخدم هذا الاستعلام أصلًا،
-- ولا حاجة لفهرس إضافي — مذكور هنا للتوثيق فقط.
-- ---------------------------------------------------------------

-- الصلاحيات: الأعمدة الجديدة ترث صلاحيات الجدول نفسه، فلا حاجة لأي
-- GRANT إضافي. RLS كما هو: كل مستخدم يرى سجلاته فقط.

-- ============================================================
-- 20260906000001_body_profile_for_targets.sql
-- ============================================================
-- ============================================================
-- بيانات الجسم اللازمة لحساب أهداف علمية
-- ============================================================
-- أهداف السعرات والماكروز كانت أرقامًا افتراضية ثابتة لكل المستخدمين
-- (2000/120/220/65). لا يمكن حساب أي هدف حقيقي بدون الجنس والعمر والطول
-- والوزن ومستوى النشاط — معادلة Mifflin-St Jeor تتطلب الأربعة الأولى،
-- ومعامل PAL يتطلب الخامس (راجع docs/SCIENTIFIC_FOUNDATION.md).
--
-- كل الأعمدة nullable: المستخدمون الحاليون ليس لديهم هذه البيانات،
-- والتطبيق يتعامل مع غيابها بعرض الأهداف الافتراضية كما هي اليوم بدل
-- إجبار أحد على إدخالها. إضافية بالكامل ولا تكسر أي صف أو استعلام.

-- ---------------------------------------------------------------
-- الجنس: مطلوب في Mifflin-St Jeor (فرق ثابت 166 kcal بين المعادلتين).
-- نوع مقيّد بدل نص حر حتى لا تتسرّب قيم لا يفهمها الحساب.
-- ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'biological_sex') then
    create type public.biological_sex as enum ('male', 'female');
  end if;
end $$;

-- ---------------------------------------------------------------
-- مستوى النشاط: معاملات PAL من FAO/WHO/UNU (2004) جدول 5.5.
-- ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_level') then
    create type public.activity_level as enum ('sedentary', 'light', 'moderate', 'active', 'very_active');
  end if;
end $$;

alter table public.profiles
  add column if not exists sex            public.biological_sex,
  add column if not exists birth_date     date,
  add column if not exists height_cm      numeric(5, 1),
  add column if not exists activity_level public.activity_level;

-- حدود فيزيولوجية معقولة — تمنع القيم المستحيلة (طول 3 أمتار، تاريخ
-- ميلاد في المستقبل) من إفساد الحساب. تُضاف فقط إن لم تكن موجودة.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_height_cm_range') then
    alter table public.profiles
      add constraint profiles_height_cm_range check (height_cm is null or (height_cm >= 90 and height_cm <= 250));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_birth_date_range') then
    alter table public.profiles
      add constraint profiles_birth_date_range
      check (birth_date is null or (birth_date > date '1900-01-01' and birth_date < current_date));
  end if;
end $$;

comment on column public.profiles.sex is 'الجنس البيولوجي — مُدخَل في معادلة Mifflin-St Jeor لأيض الراحة، وليس تعبيرًا عن الهوية.';
comment on column public.profiles.birth_date is 'تاريخ الميلاد — يُشتق منه العمر بالسنوات لمعادلة أيض الراحة.';
comment on column public.profiles.height_cm is 'الطول بالسنتيمتر — مُدخَل في معادلة أيض الراحة.';
comment on column public.profiles.activity_level is 'مستوى النشاط — يحدّد معامل PAL لحساب إجمالي الصرف اليومي.';

-- الأعمدة الجديدة ترث صلاحيات وسياسات RLS الخاصة بجدول profiles
-- (كل مستخدم يقرأ ويعدّل صفّه فقط)، فلا حاجة لأي GRANT أو policy جديدة.

-- ============================================================
-- 20260906000002_admin_role.sql
-- ============================================================
-- ============================================================
-- صلاحية الإدارة — في قاعدة البيانات، لا في الواجهة
-- ============================================================
-- المبدأ: الواجهة تُخفي الأزرار، وقاعدة البيانات ترفض الطلب. لو بنينا
-- الحماية في الواجهة وحدها، لكفى أي شخص يعدّل الحزمة أو يستدعي الـ API
-- مباشرةً ليقرأ كل شيء. راجع docs/BACKEND_ARCHITECTURE.md §5.
--
-- ما لا يفعله هذا الملف عمدًا:
--   لا ينشئ أي حساب أدمن. الترقية يدوية من SQL Editor فقط (أسفل الملف).
--   لا يمنح الأدمن أي بيانات صحية شخصية — تجميعات فقط.
--   لا يستخدم service role في أي مسار.

-- ---------------------------------------------------------------
-- العَلَم نفسه
-- ---------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'صلاحية إدارة. تُمنح يدويًا من SQL Editor فقط — لا يوجد أي مسار في التطبيق أو الـ API يمنحها.';

-- ---------------------------------------------------------------
-- ⚠️ الثغرة التي يسدّها هذا القسم
-- ---------------------------------------------------------------
-- سياسة profiles_update_own تسمح للمستخدم بتعديل صفّه. بدون حارس،
-- هذا يعني أن أي مستخدم يستطيع تنفيذ:
--     update profiles set is_admin = true where id = auth.uid();
-- ويمنح نفسه صلاحية الإدارة بطلب HTTP واحد. الـ RLS تسمح بذلك لأن
-- الصف صفّه فعلًا — المشكلة في العمود لا في الصف.
--
-- الحل: trigger يمنع تغيير هذا العمود من أي جلسة مستخدم عادية. الترقية
-- تمر فقط عبر دور مرتفع (postgres / service_role) من SQL Editor.
-- ---------------------------------------------------------------
create or replace function public.guard_admin_flag()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    -- auth.uid() تكون null عند التنفيذ من SQL Editor أو service role،
    -- وهو المسار الوحيد المسموح به لمنح الصلاحية أو سحبها.
    if auth.uid() is not null then
      raise exception 'صلاحية الإدارة لا تُمنح من التطبيق' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_admin_flag_on_profiles on public.profiles;
create trigger guard_admin_flag_on_profiles
  before update on public.profiles
  for each row execute function public.guard_admin_flag();

-- ---------------------------------------------------------------
-- دالة الفحص — SECURITY DEFINER لتتجاوز RLS الخاصة بـ profiles
-- (المستخدم يقرأ صفّه فقط، وهذا يكفي هنا) بلا تكرار الاستعلام.
-- ---------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

comment on function public.is_admin is 'هل المستخدم الحالي أدمن؟ تُستخدم داخل سياسات RLS وviews الإدارة.';

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------
-- Views الإدارة — تجميعات فقط
-- ---------------------------------------------------------------
-- قاعدة صارمة: الأدمن يرى **صحة المنتج**، لا **صحة الناس**. لا وزن
-- شخص، لا وجباته، لا نومه، لا بريده. أي view هنا يجب أن تكون
-- تجميعية (count/avg) لا صفوفًا فردية.
--
-- كل view تفرض is_admin() في شرط where صراحةً: هذه الـ views تُنشأ
-- بدون security_invoker فتعمل بصلاحية مالكها وتتجاوز RLS الجداول
-- الأساسية، تمامًا كـ team_roster (راجع 20260831000004). الحماية هنا
-- مكتوبة باليد ولا تُورَّث.

create or replace view public.admin_user_stats
as
select
  count(*)                                                        as total_users,
  count(*) filter (where p.onboarding_completed_at is not null)    as onboarded_users,
  count(*) filter (where p.created_at >= now() - interval '7 days')  as new_last_7_days,
  count(*) filter (where p.created_at >= now() - interval '30 days') as new_last_30_days
from public.profiles p
where public.is_admin()
-- HAVING وليس WHERE وحده: استعلام تجميعي بلا GROUP BY يُرجع **صفًا
-- واحدًا دائمًا** حتى لو صفّى WHERE كل الصفوف — فكان غير الأدمن يحصل
-- على صف أصفار بدل لا شيء. لا تسريب بيانات (كلها أصفار)، لكن الشاشة
-- كانت ستعرض "0 مستخدم" بدل حالة "غير مصرَّح". HAVING كاذبة تُرجع
-- صفر صفوف فعلًا. اكتُشف باختبار فعلي على PostgreSQL 16، لا بالقراءة.
having public.is_admin();

comment on view public.admin_user_stats is 'أعداد مستخدمين مجمّعة للإدارة — بلا أي بيانات شخصية.';

create or replace view public.admin_subscription_stats
as
select
  count(*) filter (where s.is_premium)                     as active_premium,
  count(*) filter (where s.will_renew)                     as renewing,
  count(*) filter (where s.store = 'app_store')            as app_store,
  count(*) filter (where s.store = 'play_store')           as play_store,
  count(*) filter (where s.expires_at < now())             as expired
from public.subscriptions s
where public.is_admin()
having public.is_admin();  -- راجع التعليق في admin_user_stats أعلاه

comment on view public.admin_subscription_stats is 'حالة الاشتراكات مجمّعة — بلا ربط بأي مستخدم بعينه.';

-- نشاط يومي مجمّع: كم مستخدمًا سجّل شيئًا، ومتوسط الإنجاز. مفيد
-- لقياس الاحتفاظ (retention) بلا كشف سلوك فرد.
create or replace view public.admin_daily_activity
as
select
  dp.date,
  count(distinct dp.user_id)                as active_users,
  round(avg(dp.completion_percent), 1)      as avg_completion_percent
from public.daily_progress dp
where public.is_admin()
  and dp.date >= current_date - interval '30 days'
group by dp.date
order by dp.date desc;

comment on view public.admin_daily_activity is 'نشاط آخر 30 يومًا مجمّعًا — لا صفوف فردية.';

grant select on public.admin_user_stats to authenticated;
grant select on public.admin_subscription_stats to authenticated;
grant select on public.admin_daily_activity to authenticated;

-- ملاحظة على GRANT أعلاه: المنح لدور authenticated كامل مقصود وآمن —
-- شرط `where public.is_admin()` داخل كل view يُرجع صفرًا من الصفوف
-- لغير الأدمن. المستخدم العادي يستطيع الاستعلام، ولا يحصل على شيء.

-- ---------------------------------------------------------------
-- ترقية حساب إلى أدمن — يدويًا، من SQL Editor فقط
-- ---------------------------------------------------------------
-- انسخ السطر التالي وبدّل البريد، ثم شغّله وحده عند الحاجة:
--
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');
--
-- للسحب: نفس الجملة بـ false. لا تفعل هذا من أي كود في التطبيق.


commit;

-- ============================================================
-- تحقّق بعد التشغيل — شغّل هذا الاستعلام وحده وقارن النتيجة
-- ============================================================
-- المتوقّع: كل صف يعطي ✅. أي ❌ يعني أن ذلك الجزء لم يُطبَّق.

select
  'GRANT على profiles' as "الفحص",
  case when has_table_privilege('authenticated', 'public.profiles', 'select')
       then '✅' else '❌' end as "النتيجة"
union all
select
  'GRANT على nutrition_logs',
  case when has_table_privilege('authenticated', 'public.nutrition_logs', 'insert')
       then '✅' else '❌' end
union all
select
  'user_points_totals محجوبة (يجب ألا تُمنح)',
  case when not has_table_privilege('authenticated', 'public.user_points_totals', 'select')
       then '✅' else '❌' end
union all
select
  'أعمدة ماكروز nutrition_logs',
  case when (select count(*) from information_schema.columns
             where table_schema = 'public' and table_name = 'nutrition_logs'
               and column_name in ('protein_g', 'carbs_g', 'fat_g')) = 3
       then '✅' else '❌' end
union all
select
  'أهداف التغذية في user_goals',
  case when (select count(*) from information_schema.columns
             where table_schema = 'public' and table_name = 'user_goals'
               and column_name in ('target_calories','target_protein_g','target_carbs_g','target_fat_g','targets_source')) = 5
       then '✅' else '❌' end
union all
select
  'بيانات الجسم في profiles',
  case when (select count(*) from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles'
               and column_name in ('sex','birth_date','height_cm','activity_level')) = 4
       then '✅' else '❌' end
union all
select
  'عمود is_admin + دالة is_admin()',
  case when exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name='profiles' and column_name='is_admin')
        and exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                    where n.nspname='public' and p.proname='is_admin')
       then '✅' else '❌' end
union all
select
  'حارس منع الترقية الذاتية إلى أدمن',
  case when exists (select 1 from pg_trigger where tgname = 'guard_admin_flag_on_profiles')
       then '✅' else '❌' end
union all
select
  'RLS مفعّلة على كل الجداول',
  case when not exists (
         select 1 from pg_tables t
         join pg_class c on c.relname = t.tablename
         where t.schemaname = 'public' and not c.relrowsecurity
       ) then '✅' else '❌' end;
