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
