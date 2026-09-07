import i18n from './index';

/**
 * نظام الأرقام في العربية — قرار صريح، لا افتراض على المنصّة.
 *
 * ‏'ar' وحدها لا تحسم شيئًا: نظام الأرقام يُشتقّ من بيانات ICU الموجودة
 * على الجهاز، وقد رأينا الشيء نفسه يُنتج ١٢٬٤٨٠ في بيئة و12,480 في
 * أخرى. أي أن شكل كل رقم في التطبيق كان يعتمد على نسخة النظام لا على
 * قرارنا — فتظهر أرقام لاتينية وسط نصوص عربية أرقامها هندية، بلا سبب
 * ظاهر ولا طريقة لإعادة إنتاجه.
 *
 * ‏'-u-nu-arab' يحسمها: أرقام عربية هندية (٠١٢٣) على كل جهاز، متسقة مع
 * كل نصوص الواجهة العربية.
 *
 * لتبديلها إلى الأرقام اللاتينية (٠→0) في الواجهة العربية كلها، غيّر
 * هذا السطر وحده إلى 'ar-u-nu-latn' — ولا شيء غيره.
 */
const ARABIC_LOCALE = 'ar-u-nu-arab';
const ENGLISH_LOCALE = 'en';

/** لغة التنسيق الفعلية للّغة النشطة. */
export function formattingLocale(): string {
  return i18n.language === 'en' ? ENGLISH_LOCALE : ARABIC_LOCALE;
}

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
  return value.toLocaleString(formattingLocale());
}

/**
 * تاريخ مقروء بلغة المستخدم (٩ سبتمبر ٢٠٢٦ / 9 September 2026).
 *
 * يُستخدم في الإفصاح عن تاريخ بدء الخصم بعد التجربة المجانية: "بعد ٣
 * أيام" تترك المستخدم يحسب بنفسه، والتاريخ الصريح لا يترك مجالًا للشك.
 */
export function formatLongDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(formattingLocale(), {
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
  return date.toLocaleTimeString(formattingLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * تاريخ قصير من مفتاح ISO (٣ سبتمبر / 3 Sep).
 *
 * التواريخ التي تأتي من القاعدة نصوص "YYYY-MM-DD"، وعرضها كما هي يضع
 * أرقامًا لاتينية بترتيب لا يقرؤه المستخدم العربي طبيعيًا وسط واجهة
 * كل أرقامها عربية. يُرجع الأصل كما هو لو كان غير صالح، فلا يختفي
 * التاريخ لمجرد أنه غير متوقّع.
 */
export function formatShortDate(isoDateKey: string): string {
  const date = new Date(`${isoDateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDateKey;
  return date.toLocaleDateString(formattingLocale(), {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * تاريخ ميلاد مقروء. نستخدم الصيغة الطويلة لأنه يُقرأ مرة واحدة في
 * بطاقة بيانات لا في قائمة، والوضوح فيه أهم من الاختصار.
 */
export function formatBirthDate(isoDateKey: string | null | undefined): string {
  if (!isoDateKey) return '—';
  const date = new Date(`${isoDateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDateKey;
  return formatLongDate(date);
}
