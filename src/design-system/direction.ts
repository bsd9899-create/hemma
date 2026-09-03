import { I18nManager } from 'react-native';

/**
 * اتجاه الواجهة الحالي (RTL للعربية، LTR للإنجليزية) — يُقرأ مرة واحدة
 * لأن تغيير اللغة يعيد تشغيل التطبيق بالكامل (راجع src/lib/i18n)،
 * فالقيمة مستقرة وصحيحة طوال الجلسة، ولا حاجة لإعادة حساب أو Context.
 */
export const isRTL = I18nManager.isRTL;

/** استبدال آمن لـ 'row-reverse' المكتوب يدويًا — يعطي نفس ترتيب البداية/النهاية البصري في كلا الاتجاهين. */
export const rowDirection: 'row-reverse' | 'row' = isRTL ? 'row-reverse' : 'row';

export const textAlignStart: 'right' | 'left' = isRTL ? 'right' : 'left';
export const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
