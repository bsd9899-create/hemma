-- ============================================================
-- ترتيب الفريق: من تجميع كل النقاط في النظام إلى تجميع نقاط الفريق وحده
-- ============================================================
-- المشكلة كما كانت:
--
--   user_points_totals = select user_id, sum(delta) from points_ledger
--                        group by user_id;          ← بلا أي شرط
--
--   team_leaderboard   = team_roster LEFT JOIN user_points_totals
--
-- المُخطِّط لا يستطيع دفع شرط الفريق داخل تجميع مُجمَّع على هذا الشكل،
-- فيبني HashAggregate على **جدول النقاط كاملًا** ثم يربطه بالفريق. أي
-- أن فتح شاشة فريق من ٥ أعضاء يقرأ نقاط كل مستخدمي التطبيق.
--
-- الكلفة تنمو مع عدد المستخدمين لا مع حجم الفريق:
--   ١٠٬٠٠٠ مستخدم × ٣ صفوف/يوم × ٣٦٥ = ~١١ مليون صف تُقرأ في كل فتح.
--
-- الحل: تجميع جانبي (LATERAL) لكل عضو على حدة، فيستخدم الفهرس القائم
-- points_ledger (user_id, created_at desc). الكلفة تصير:
--   عدد أعضاء الفريق × بحث فهرسي — أي ثابتة عمليًا مهما كبر التطبيق.
--
-- لا تغيير في الأعمدة ولا في الصلاحيات ولا في النتيجة: نفس الأرقام
-- بالضبط، بخطة تنفيذ مختلفة.

begin;

create or replace view public.team_leaderboard
as
select
  r.team_id,
  r.user_id,
  r.display_name,
  r.avatar_url,
  coalesce(p.total_points, 0) as total_points
from public.team_roster r
left join lateral (
  select sum(l.delta) as total_points
  from public.points_ledger l
  where l.user_id = r.user_id
) p on true;

comment on view public.team_leaderboard is
  'ترتيب أعضاء الفريق. التجميع جانبي لكل عضو حتى لا يُقرأ سجل نقاط كل مستخدمي التطبيق عند فتح شاشة فريق واحد.';

grant select on public.team_leaderboard to authenticated;

commit;
