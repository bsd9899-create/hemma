import i18n from './index';

/** رقم مُنسَّق حسب اللغة الحالية (فواصل الآلاف بالشكل الصحيح لكل لغة). */
export function formatNumber(value: number): string {
  return value.toLocaleString(i18n.language === 'en' ? 'en' : 'ar');
}

/**
 * وقت قصير حسب اللغة (٧:٣٠ م / 7:30 PM). نستخدم Intl مباشرة بدل
 * تنسيق يدوي حتى يتبع التطبيق تفضيلات المنطقة تلقائيًا.
 */
export function formatTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(i18n.language === 'en' ? 'en' : 'ar', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
