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
