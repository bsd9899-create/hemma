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
--   20260906000003  مكتبة التمارين وتسجيل المجموعات والأرقام القياسية
--   20260906000004  بذرة ٢٠ تمرينًا أساسيًا
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

-- ============================================================
-- 20260906000003_exercise_library.sql
-- ============================================================
-- ============================================================
-- مكتبة التمارين وتسجيل الأداء
-- ============================================================
-- كان التمرين "عنوان + مدة" فقط، وعمود workouts.exercises (jsonb) لم
-- يُستخدم إطلاقًا. هذا الترحيل يبني الأساس الحقيقي: مكتبة تمارين
-- مشتركة، ومجموعات مسجَّلة بوزن وتكرارات، وأرقام قياسية محسوبة.
--
-- قرار تصميمي: المجموعات في جدول مستقل لا داخل jsonb. الأرقام القياسية
-- و"آخر أداء" و"التقدّم عبر الزمن" كلها استعلامات تجميعية على المجموعات،
-- وهي داخل jsonb تتطلب مسحًا كاملًا وفكًّا لكل صف — أي أن أهم ميزات
-- الشاشة تصبح أبطأ شيء فيها.

-- ---------------------------------------------------------------
-- التصنيفات
-- ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'muscle_group' and n.nspname = 'public') then
    create type public.muscle_group as enum (
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'quads', 'hamstrings', 'glutes', 'calves', 'core', 'full_body', 'cardio'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'exercise_equipment' and n.nspname = 'public') then
    create type public.exercise_equipment as enum (
      'bodyweight', 'barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'band', 'other'
    );
  end if;
end $$;

-- كيف يُقاس هذا التمرين؟ يحدّد أي حقول تظهر في شاشة التسجيل وكيف
-- يُحسب الرقم القياسي — تمرين جري لا "وزن" له، وتمرين بلانك لا تكرارات.
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'exercise_metric' and n.nspname = 'public') then
    create type public.exercise_metric as enum ('weight_reps', 'reps_only', 'duration', 'distance_duration');
  end if;
end $$;

-- ---------------------------------------------------------------
-- المكتبة — مشتركة بين كل المستخدمين
-- ---------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_en text not null,
  primary_muscle public.muscle_group not null,
  secondary_muscles public.muscle_group[] not null default '{}',
  equipment public.exercise_equipment not null default 'bodyweight',
  metric public.exercise_metric not null default 'weight_reps',
  instructions_ar text[] not null default '{}',
  instructions_en text[] not null default '{}',
  cues_ar text[] not null default '{}',
  media_url text,
  -- الترخيص مطلوب لا اختياري: أي وسائط تدخل هنا يجب أن يكون مصدرها
  -- وترخيصها معروفَين. حقل فارغ = لا نعرض الوسيط.
  media_license text,
  media_attribution text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.exercises is 'مكتبة التمارين المشتركة — للقراءة فقط من العميل، تُدار من SQL Editor.';
comment on column public.exercises.media_license is 'ترخيص الوسيط. بلا ترخيص معروف لا يُعرض الوسيط إطلاقًا.';

create index if not exists exercises_primary_muscle_idx on public.exercises (primary_muscle) where is_active;
create index if not exists exercises_equipment_idx on public.exercises (equipment) where is_active;

-- بحث نصي بالعربية والإنجليزية معًا على اسم واحد مدمج.
create index if not exists exercises_search_idx
  on public.exercises using gin (to_tsvector('simple', name_ar || ' ' || name_en || ' ' || slug));

-- ---------------------------------------------------------------
-- المجموعات المسجَّلة
-- ---------------------------------------------------------------
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workout_id uuid references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  set_number integer not null check (set_number > 0),
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg >= 0),
  reps integer check (reps is null or reps > 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  distance_m numeric(8, 1) check (distance_m is null or distance_m > 0),
  -- مجموعة الإحماء لا تدخل في الأرقام القياسية ولا في حجم التدريب.
  is_warmup boolean not null default false,
  rpe numeric(3, 1) check (rpe is null or (rpe >= 1 and rpe <= 10)),
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.workout_sets is 'مجموعة واحدة من تمرين واحد. الأرقام القياسية وتاريخ الأداء تُشتق منها.';
comment on column public.workout_sets.is_warmup is 'الإحماء يُستثنى من الأرقام القياسية وحجم التدريب.';

create index if not exists workout_sets_user_exercise_idx
  on public.workout_sets (user_id, exercise_id, performed_at desc);
create index if not exists workout_sets_workout_idx on public.workout_sets (workout_id);

create table if not exists public.exercise_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.exercise_favorites enable row level security;

-- المكتبة مرجع عام: يقرأها كل مستخدم مسجَّل، ولا يكتبها أحد من العميل
-- (لا سياسة insert/update/delete عمدًا) حتى لا يفسدها مستخدم واحد
-- على الجميع.
drop policy if exists "exercises_read_all" on public.exercises;
create policy "exercises_read_all" on public.exercises
  for select using (auth.uid() is not null and is_active);

drop policy if exists "workout_sets_owner_all" on public.workout_sets;
create policy "workout_sets_owner_all" on public.workout_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "exercise_favorites_owner_all" on public.exercise_favorites;
create policy "exercise_favorites_owner_all" on public.exercise_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.exercises to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;
grant select, insert, delete on public.exercise_favorites to authenticated;

-- ---------------------------------------------------------------
-- الأرقام القياسية — view لا جدول
-- ---------------------------------------------------------------
-- جدول مُخزَّن يحتاج مزامنة عند كل تعديل أو حذف مجموعة، وأي مسار
-- منسيّ يترك رقمًا قياسيًا كاذبًا إلى الأبد. الاشتقاق يجعل الرقم
-- صحيحًا دائمًا بحكم البناء.
--
-- security_invoker = on: هذه الـ view شخصية بحتة، فنريدها أن ترث RLS
-- الخاصة بـ workout_sets بدل تجاوزها (عكس team_roster التي تحتاج
-- التجاوز عمدًا لعرض بيانات الزملاء).
create or replace view public.exercise_personal_records
with (security_invoker = on)
as
select
  s.user_id,
  s.exercise_id,
  max(s.weight_kg) filter (where not s.is_warmup)                         as max_weight_kg,
  max(s.reps) filter (where not s.is_warmup)                              as max_reps,
  max(s.duration_seconds) filter (where not s.is_warmup)                  as max_duration_seconds,
  -- تقدير Epley لأقصى تكرار واحد: 1RM ≈ الوزن × (1 + التكرارات/30).
  -- المصدر: Epley B. "Poundage Chart", Boyd Epley Workout, 1985.
  -- تقدير لا قياس، ويُعرض في الواجهة موصوفًا بذلك.
  max(
    case when not s.is_warmup and s.weight_kg is not null and s.reps is not null
      then round(s.weight_kg * (1 + s.reps::numeric / 30), 1) end
  )                                                                        as estimated_1rm_kg,
  max(s.performed_at)                                                      as last_performed_at,
  count(*) filter (where not s.is_warmup)                                  as total_sets
from public.workout_sets s
group by s.user_id, s.exercise_id;

comment on view public.exercise_personal_records is
  'أرقام قياسية مشتقة لحظيًا من المجموعات. 1RM تقدير Epley (1985) وليس قياسًا.';

grant select on public.exercise_personal_records to authenticated;

-- ============================================================
-- 20260906000004_exercise_seed.sql
-- ============================================================
-- ============================================================
-- بذرة مكتبة التمارين — 30 تمرينًا أساسيًا
-- ============================================================
-- ⚠️ عن الوسائط (فيديو/صور): لا يوجد أي media_url هنا، وهذا مقصود.
-- التطبيق يعرض الوسيط فقط حين يكون معه ترخيص معروف، ولا نستطيع وضع
-- وسائط لا نملك حقوقها. الأسماء والعضلات المستهدفة ومبادئ الأداء
-- معرفة تشريحية عامة موصوفة في مراجع منشورة، وليست نصًا منقولًا.
--
-- المرجع للعضلات المستهدفة والأداء الأساسي:
--   NSCA, Essentials of Strength Training and Conditioning, 4th ed.
--   ACSM's Guidelines for Exercise Testing and Prescription, 11th ed.
--
-- لإضافة وسائط لاحقًا راجع docs/EXERCISE_MEDIA.md.
--
-- on conflict (slug) do update: إعادة التشغيل تُحدِّث الوصف بدل أن
-- تفشل أو تُنشئ تكرارًا — والمعرّف uuid يبقى ثابتًا فلا تنكسر أي
-- مجموعة مسجَّلة تشير إليه.

insert into public.exercises
  (slug, name_ar, name_en, primary_muscle, secondary_muscles, equipment, metric, instructions_ar, instructions_en, cues_ar)
values
  ('barbell-back-squat', 'السكوات بالبار', 'Barbell Back Squat', 'quads', '{glutes,hamstrings,core}', 'barbell', 'weight_reps',
   '{"ضع البار على أعلى الظهر لا على الرقبة.","باعد قدميك بعرض الكتفين مع توجيه أصابع القدم للخارج قليلًا.","انزل بدفع الوركين للخلف حتى يوازي الفخذ الأرض أو أقل.","ادفع من منتصف القدم للعودة."}',
   '{"Rest the bar on your upper back, not your neck.","Feet shoulder-width, toes slightly out.","Descend by pushing hips back until thighs are at least parallel.","Drive up through midfoot."}',
   '{"الركبة تتبع اتجاه أصابع القدم","الظهر محايد طوال الحركة"}'),

  ('barbell-deadlift', 'الرفعة الميتة', 'Barbell Deadlift', 'hamstrings', '{glutes,back,forearms,core}', 'barbell', 'weight_reps',
   '{"قف والبار فوق منتصف القدم.","انحنِ من الورك وامسك البار خارج الساقين.","اشدّ الظهر وارفع البار ملاصقًا للساق.","اقفل الوركين في الأعلى دون إمالة الظهر للخلف."}',
   '{"Stand with the bar over midfoot.","Hinge at the hips and grip just outside your legs.","Brace, then lift keeping the bar against your legs.","Lock out at the hips without leaning back."}',
   '{"الظهر مستقيم لا مقوّس","البار قريب من الجسم طوال الحركة"}'),

  ('barbell-bench-press', 'ضغط البار المسطح', 'Barbell Bench Press', 'chest', '{triceps,shoulders}', 'barbell', 'weight_reps',
   '{"استلقِ مع لمس الرأس والكتفين والوركين للمقعد.","امسك البار أوسع قليلًا من الكتفين.","أنزل البار إلى منتصف الصدر بتحكّم.","ادفع حتى امتداد الذراعين."}',
   '{"Lie with head, shoulders and hips on the bench.","Grip slightly wider than shoulders.","Lower to mid-chest under control.","Press to full extension."}',
   '{"لوحا الكتف مشدودان للخلف","القدمان ثابتتان على الأرض"}'),

  ('pull-up', 'العقلة', 'Pull-Up', 'back', '{biceps,forearms}', 'bodyweight', 'reps_only',
   '{"امسك البار بقبضة أوسع من الكتفين.","ابدأ من تعليق كامل.","اسحب حتى يتجاوز الذقن البار.","انزل بتحكّم إلى التعليق الكامل."}',
   '{"Grip the bar wider than shoulders.","Start from a full hang.","Pull until your chin clears the bar.","Lower under control to a full hang."}',
   '{"ابدأ بخفض لوحي الكتف","تجنّب التأرجح"}'),

  ('push-up', 'الضغط', 'Push-Up', 'chest', '{triceps,shoulders,core}', 'bodyweight', 'reps_only',
   '{"ضع اليدين أوسع قليلًا من الكتفين.","حافظ على خط مستقيم من الرأس إلى الكعب.","انزل حتى يقترب الصدر من الأرض.","ادفع للأعلى دون ترك الورك يهبط."}',
   '{"Hands slightly wider than shoulders.","Keep a straight line from head to heels.","Lower until your chest is near the floor.","Press up without letting the hips sag."}',
   '{"شدّ البطن والألية","المرفقان بزاوية ٤٥ درجة لا ٩٠"}'),

  ('overhead-press', 'الضغط العلوي', 'Overhead Press', 'shoulders', '{triceps,core}', 'barbell', 'weight_reps',
   '{"البار على أعلى الصدر والقبضة بعرض الكتفين.","اشدّ البطن والألية.","ادفع البار للأعلى مع إمالة الرأس للخلف قليلًا.","اقفل الذراعين والبار فوق منتصف القدم."}',
   '{"Bar on the upper chest, hands shoulder-width.","Brace your abs and glutes.","Press overhead, moving your head back slightly.","Lock out with the bar over midfoot."}',
   '{"لا تقوّس أسفل الظهر","البار ينتهي فوق منتصف القدم"}'),

  ('dumbbell-row', 'التجديف بالدمبل', 'Dumbbell Row', 'back', '{biceps,forearms}', 'dumbbell', 'weight_reps',
   '{"ضع ركبة ويدًا على مقعد.","دع الدمبل يتدلى بذراع ممدودة.","اسحب نحو الورك مع تقريب لوح الكتف.","أنزل بتحكّم."}',
   '{"Place one knee and hand on a bench.","Let the dumbbell hang with the arm extended.","Row toward your hip, retracting the shoulder blade.","Lower under control."}',
   '{"لا تلوِ الجذع أثناء السحب"}'),

  ('romanian-deadlift', 'الرفعة الرومانية', 'Romanian Deadlift', 'hamstrings', '{glutes,back}', 'barbell', 'weight_reps',
   '{"قف والبار أمام الفخذين وركبتاك مثنيتان قليلًا.","ادفع الوركين للخلف وأنزل البار على الفخذين.","توقّف عند شعورك بشدّ خلف الفخذ.","عد بدفع الوركين للأمام."}',
   '{"Stand with the bar at your thighs, knees softly bent.","Push your hips back, lowering the bar along your thighs.","Stop when you feel a hamstring stretch.","Return by driving the hips forward."}',
   '{"الحركة من الورك لا من أسفل الظهر"}'),

  ('lat-pulldown', 'سحب الحبل للصدر', 'Lat Pulldown', 'back', '{biceps}', 'cable', 'weight_reps',
   '{"اجلس وثبّت الفخذين تحت الوسادة.","امسك البار أوسع من الكتفين.","اسحب إلى أعلى الصدر.","عد ببطء إلى الامتداد الكامل."}',
   '{"Sit and secure your thighs under the pad.","Grip wider than shoulders.","Pull to the upper chest.","Return slowly to full extension."}',
   '{"لا ترجع الجذع كثيرًا للخلف"}'),

  ('leg-press', 'ضغط الأرجل', 'Leg Press', 'quads', '{glutes,hamstrings}', 'machine', 'weight_reps',
   '{"ضع القدمين بعرض الكتفين على المنصة.","أنزل الوزن حتى تصل الركبة لزاوية ٩٠ درجة.","ادفع دون قفل الركبتين بعنف."}',
   '{"Feet shoulder-width on the platform.","Lower until your knees reach about 90 degrees.","Press without slamming the knees into lockout."}',
   '{"لا ترفع أسفل الظهر عن المقعد"}'),

  ('dumbbell-bicep-curl', 'مرجحة الباي', 'Dumbbell Biceps Curl', 'biceps', '{forearms}', 'dumbbell', 'weight_reps',
   '{"قف والدمبلان بجانبيك.","ارفع مع تثبيت المرفقين بجانب الجذع.","أنزل بتحكّم كامل."}',
   '{"Stand with dumbbells at your sides.","Curl while keeping elbows pinned to your torso.","Lower under full control."}',
   '{"لا تؤرجح الجذع"}'),

  ('triceps-pushdown', 'دفع الترايسبس', 'Triceps Pushdown', 'triceps', '{}', 'cable', 'weight_reps',
   '{"امسك البار بقبضة علوية.","ثبّت المرفقين بجانبك.","مدّ الذراعين كاملًا ثم عد ببطء."}',
   '{"Grip the bar overhand.","Keep elbows at your sides.","Extend fully, then return slowly."}',
   '{"الحركة من المرفق فقط"}'),

  ('plank', 'البلانك', 'Plank', 'core', '{shoulders,glutes}', 'bodyweight', 'duration',
   '{"استند على الساعدين وأصابع القدم.","حافظ على خط مستقيم من الرأس للكعب.","شدّ البطن والألية طوال الوقت."}',
   '{"Support yourself on forearms and toes.","Keep a straight line from head to heels.","Brace abs and glutes throughout."}',
   '{"لا ترفع الورك ولا تدعه يهبط"}'),

  ('hanging-leg-raise', 'رفع الأرجل معلقًا', 'Hanging Leg Raise', 'core', '{forearms}', 'bodyweight', 'reps_only',
   '{"تعلّق من البار بذراعين ممدودتين.","ارفع الساقين حتى زاوية ٩٠ درجة أو أعلى.","أنزل ببطء دون تأرجح."}',
   '{"Hang from the bar with arms extended.","Raise your legs to 90 degrees or higher.","Lower slowly without swinging."}',
   '{"ابدأ الحركة من الحوض لا من الورك وحده"}'),

  ('walking-lunge', 'الطعن المشي', 'Walking Lunge', 'quads', '{glutes,hamstrings,core}', 'bodyweight', 'reps_only',
   '{"اخطُ خطوة واسعة للأمام.","أنزل حتى تقترب الركبة الخلفية من الأرض.","ادفع من كعب القدم الأمامية وبدّل."}',
   '{"Step forward into a long stride.","Lower until the back knee nearly touches the floor.","Drive through the front heel and switch."}',
   '{"الجذع منتصب"}'),

  ('hip-thrust', 'دفع الورك', 'Barbell Hip Thrust', 'glutes', '{hamstrings,core}', 'barbell', 'weight_reps',
   '{"استند بأعلى الظهر على مقعد والبار فوق الورك.","ادفع الوركين للأعلى حتى يستقيم الجسم.","اضغط الألية في الأعلى ثم أنزل بتحكّم."}',
   '{"Rest your upper back on a bench with the bar over your hips.","Drive your hips up until your body is straight.","Squeeze the glutes at the top, then lower under control."}',
   '{"اثنِ الذقن قليلًا وانظر للأمام"}'),

  ('lateral-raise', 'الرفرفة الجانبية', 'Lateral Raise', 'shoulders', '{}', 'dumbbell', 'weight_reps',
   '{"قف والدمبلان بجانبيك.","ارفع الذراعين جانبًا حتى مستوى الكتف.","أنزل ببطء."}',
   '{"Stand with dumbbells at your sides.","Raise your arms out to shoulder height.","Lower slowly."}',
   '{"لا ترفع فوق مستوى الكتف","لا تستخدم الزخم"}'),

  ('calf-raise', 'رفع السمانة', 'Standing Calf Raise', 'calves', '{}', 'machine', 'weight_reps',
   '{"قف بمشط القدم على الحافة.","ارفع الكعب لأقصى مدى.","أنزل حتى الشدّ الكامل."}',
   '{"Stand with the balls of your feet on the edge.","Rise onto your toes as high as possible.","Lower into a full stretch."}',
   '{"مدى حركة كامل أفضل من وزن أثقل"}'),

  ('face-pull', 'سحب الوجه', 'Face Pull', 'shoulders', '{back}', 'cable', 'weight_reps',
   '{"اضبط الحبل عند مستوى الوجه.","اسحب نحو الجبهة مع إبعاد اليدين.","اعصر لوحي الكتف ثم عد."}',
   '{"Set the rope at face height.","Pull toward your forehead, spreading your hands.","Squeeze the shoulder blades, then return."}',
   '{"ممتاز لصحة الكتف وموازنة تمارين الدفع"}'),

  ('running', 'الجري', 'Running', 'cardio', '{quads,hamstrings,calves}', 'bodyweight', 'distance_duration',
   '{"ابدأ بإحماء خفيف ٥ دقائق.","حافظ على إيقاع تنفس منتظم.","ابرد تدريجيًا في النهاية."}',
   '{"Start with a 5-minute easy warm-up.","Keep a steady breathing rhythm.","Cool down gradually."}',
   '{"زد المسافة الأسبوعية تدريجيًا لتفادي الإصابة"}')
on conflict (slug) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  primary_muscle = excluded.primary_muscle,
  secondary_muscles = excluded.secondary_muscles,
  equipment = excluded.equipment,
  metric = excluded.metric,
  instructions_ar = excluded.instructions_ar,
  instructions_en = excluded.instructions_en,
  cues_ar = excluded.cues_ar;


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
  'مكتبة التمارين + المجموعات',
  case when (select count(*) from information_schema.tables where table_schema='public'
             and table_name in ('exercises','workout_sets','exercise_favorites')) = 3
       then '✅' else '❌' end
union all
select
  'تمارين مزروعة (يجب ≥ 20)',
  case when (select count(*) from public.exercises) >= 20 then '✅' else '❌' end
union all
select
  'RLS مفعّلة على كل الجداول',
  case when not exists (
         select 1 from pg_tables t
         join pg_class c on c.relname = t.tablename
         where t.schemaname = 'public' and not c.relrowsecurity
       ) then '✅' else '❌' end;
