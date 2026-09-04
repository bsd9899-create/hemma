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
-- أهداف التغذية اليومية — قيم افتراضية معقولة لبالغ متوسط النشاط،
-- يعدّلها المستخدم من شاشة الأهداف. لا تُفرض على أحد ولا تُستخدم
-- كنصيحة طبية، فقط كمرجع لعرض التقدّم.
-- ---------------------------------------------------------------
alter table public.user_goals
  add column if not exists target_calories  integer     not null default 2000 check (target_calories > 0),
  add column if not exists target_protein_g integer     not null default 120  check (target_protein_g >= 0),
  add column if not exists target_carbs_g   integer     not null default 220  check (target_carbs_g >= 0),
  add column if not exists target_fat_g     integer     not null default 65   check (target_fat_g >= 0);

comment on column public.user_goals.target_calories is 'هدف السعرات اليومي — مرجع لعرض التقدّم وليس وصفة طبية.';

-- ---------------------------------------------------------------
-- فهرس لجلب وجبات يوم واحد بسرعة (شاشة التغذية تستعلم عن اليوم فقط).
-- الفهرس القائم (user_id, logged_at desc) يخدم هذا الاستعلام أصلًا،
-- ولا حاجة لفهرس إضافي — مذكور هنا للتوثيق فقط.
-- ---------------------------------------------------------------

-- الصلاحيات: الأعمدة الجديدة ترث صلاحيات الجدول نفسه، فلا حاجة لأي
-- GRANT إضافي. RLS كما هو: كل مستخدم يرى سجلاته فقط.
