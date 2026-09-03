/**
 * تحية مناسبة لوقت اليوم — تفاصيل صغيرة تجعل الشاشة تشعر أنها حيّة.
 * يأخذ دالة الترجمة `t` بدل نص مباشر حتى تُترجَم حسب اللغة الحالية.
 */
export function getTimeGreeting(t: (key: string) => string, date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return t('greeting.late');
  if (hour < 12) return t('greeting.morning');
  if (hour < 17) return t('greeting.afternoon');
  if (hour < 21) return t('greeting.evening');
  return t('greeting.night');
}
