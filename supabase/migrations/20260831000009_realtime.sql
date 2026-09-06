-- ============================================================
-- أساس Realtime — الجداول التي تحتاج تحديثًا فوريًا في الواجهة:
-- نبض الفريق (عبر daily_progress)، تقدم التحدي، تفاعلات رفيق هِمّة،
-- والإشعارات. RLS تبقى سارية على قنوات Realtime في Supabase تلقائيًا.
-- ============================================================

-- إضافة جدول موجود مسبقًا إلى publication ترفع 42710 وتُسقط الملف
-- كله. نفحص عضوية كل جدول أولًا (pg_publication_tables).
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'daily_progress', 'challenge_progress', 'accountability_pings', 'notifications', 'team_members'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', tbl);
    end if;
  end loop;
end $$;

alter table public.daily_progress replica identity full;
alter table public.challenge_progress replica identity full;
alter table public.accountability_pings replica identity full;
alter table public.notifications replica identity full;
