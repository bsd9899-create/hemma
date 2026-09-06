import i18n from './index';

/**
 * رقم مُنسَّق حسب اللغة الحالية (فواصل الآلاف بالشكل الصحيح لكل لغة).
 *
 * تقبل الدالة غياب القيمة عمدًا. السبب ليس دفاعًا زائدًا: البيانات تأتي
 * من الشبكة، وأنواع TypeScript **لا تُفرض وقت التشغيل**. عمود ناقص في
 * قاعدة البيانات (ترحيل لم يُطبَّق بعد) يصل إلى هنا كـ undefined بينما
 * النوع يقول number، فتنهار الشاشة كلها بـ
 * "Cannot read property 'toLocaleString' of undefined".
 *
 * وتُرجع شرطة لا صفرًا: الصفر رقم يعني "لا شيء"، والغياب يعني "لا نعرف".
 * عرض 0 مكان قيمة مفقودة اختراعُ بيانات، وهو ما يمنعه
 * docs/SCIENTIFIC_FOUNDATION.md صراحةً.
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString(i18n.language === 'en' ? 'en' : 'ar');
}

/**
 * تاريخ مقروء بلغة المستخدم (٩ سبتمبر ٢٠٢٦ / 9 September 2026).
 *
 * يُستخدم في الإفصاح عن تاريخ بدء الخصم بعد التجربة المجانية: "بعد ٣
 * أيام" تترك المستخدم يحسب بنفسه، والتاريخ الصريح لا يترك مجالًا للشك.
 */
export function formatLongDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(i18n.language === 'en' ? 'en' : 'ar', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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
