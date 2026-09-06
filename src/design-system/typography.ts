/**
 * الخطوط كما يحدّدها ملف الهوية (assets/branding/brand-identity.png):
 *   العربي     Tajawal
 *   الإنجليزي  Inter
 *
 * Tajawal خط عربي عصري دافئ يناسب إحساس الشعار (بساطة + دفء) دون تقليد
 * الكاليغرافي الخاص بالعلامة نفسها (المحفوظ للشعار وحده). وInter خط
 * إنجليزي محايد عالي الوضوح على الشاشات الصغيرة.
 *
 * لماذا خط لكل لغة لا خط واحد: Tajawal يغطي اللاتينية، لكن أشكالها فيه
 * مصمَّمة لتُرافق العربية لا لتُقرأ وحدها — فتبدو الإنجليزية أضيق
 * وأقل اتزانًا في الفقرات الطويلة. الاختيار من ملف الهوية، ومطبَّق
 * تلقائيًا حسب اللغة النشطة.
 */
import i18n from '@/src/lib/i18n';

const ARABIC = {
  regular: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  bold: 'Tajawal_700Bold',
  extraBold: 'Tajawal_800ExtraBold',
} as const;

const ENGLISH = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

/**
 * تُقرأ مرة واحدة عند التحميل: تغيير اللغة يعيد تشغيل التطبيق بالكامل
 * (راجع src/lib/i18n)، فالقيمة مستقرة طوال الجلسة — نفس منطق
 * `isRTL` في direction.ts.
 */
export const fontFamily = i18n.language === 'en' ? ENGLISH : ARABIC;

type TypeStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
};

export const typography = {
  displayLg: { fontFamily: fontFamily.extraBold, fontSize: 32, lineHeight: 40 },
  displayMd: { fontFamily: fontFamily.bold, fontSize: 26, lineHeight: 34 },
  title: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 28 },
  subtitle: { fontFamily: fontFamily.medium, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 16 },
} satisfies Record<string, TypeStyle>;

export type TypographyToken = keyof typeof typography;
