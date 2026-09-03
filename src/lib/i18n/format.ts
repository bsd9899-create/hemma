import i18n from './index';

/** رقم مُنسَّق حسب اللغة الحالية (فواصل الآلاف بالشكل الصحيح لكل لغة). */
export function formatNumber(value: number): string {
  return value.toLocaleString(i18n.language === 'en' ? 'en' : 'ar');
}
