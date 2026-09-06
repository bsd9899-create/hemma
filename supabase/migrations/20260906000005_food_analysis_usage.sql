-- ============================================================
-- سجل استخدام تحليل الطعام — لحدّ يومي لكل مستخدم
-- ============================================================
-- الحدّ ليس تقييدًا للمستخدم بل حماية للتكلفة: نداء نموذج رؤية له سعر
-- لكل طلب، وبلا حدّ يستطيع حساب واحد (مخترق، أو حلقة خاطئة في العميل)
-- أن يستنزف الرصيد خلال ساعات. الدوال بلا حالة، فالعدّاد يجب أن يكون
-- في قاعدة البيانات لا في الذاكرة.

create table if not exists public.food_analysis_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists food_analysis_usage_user_time_idx
  on public.food_analysis_usage (user_id, created_at desc);

comment on table public.food_analysis_usage is
  'سطر لكل تحليل ناجح — أساس الحدّ اليومي. يُكتب من Edge Function فقط.';

alter table public.food_analysis_usage enable row level security;

-- المستخدم يرى استهلاكه (لعرض "بقي لك X محاولة") ولا يكتب فيه إطلاقًا:
-- لو استطاع الحذف لألغى الحدّ عن نفسه بطلب واحد.
drop policy if exists "food_analysis_usage_select_own" on public.food_analysis_usage;
create policy "food_analysis_usage_select_own" on public.food_analysis_usage
  for select using (auth.uid() = user_id);

grant select on public.food_analysis_usage to authenticated;
