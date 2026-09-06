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
where public.is_admin();

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
where public.is_admin();

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
