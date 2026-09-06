-- ============================================================
-- علم onboarding — يمنع الاعتماد على قيمة display_name الافتراضية
-- لمعرفة هل أنهى المستخدم شاشات الترحيب أم لا.
-- ============================================================

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;
