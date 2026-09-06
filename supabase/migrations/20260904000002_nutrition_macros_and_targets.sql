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
