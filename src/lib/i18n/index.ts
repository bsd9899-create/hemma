import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import RNRestart from 'react-native-restart';
import ar from './locales/ar.json';
import en from './locales/en.json';
import { getStoredLanguage, isRTLLanguage, resolveDeviceLanguage, type AppLanguage } from './language';

export const resources = { ar: { translation: ar }, en: { translation: en } } as const;

export type { AppLanguage } from './language';
export { changeLanguage, isRTLLanguage } from './language';

// تهيئة i18next فورًا ومتزامنة بلغة افتراضية (عربي) — تضمن أن `t()`
// يعمل دائمًا وبأمان (بما في ذلك بيئة الاختبارات) بدل انتظار قراءة
// AsyncStorage غير المتزامنة أولًا. bootstrapI18n أدناه يبدّلها لاحقًا
// إلى اللغة الفعلية المحفوظة/المكتشفة عند إقلاع التطبيق الحقيقي.
if (!i18n.isInitialized) {
  // eslint-disable-next-line import/no-named-as-default-member -- i18next الافتراضي هو نفسه instance، وليس namespace يُلتبَس به
  i18n.use(initReactI18next).init({
    resources,
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
}

/**
 * يُستدعى مرة واحدة عند إقلاع التطبيق الفعلي: يحدّد اللغة (محفوظة سابقًا،
 * أو لغة الجهاز افتراضيًا)، يبدّل i18next إليها إن كانت مختلفة عن
 * الافتراضي، ثم يتأكد أن اتجاه النظام (RTL/LTR) يطابقها — تغيير اتجاه
 * التخطيط في React Native يتطلب إعادة تشغيل فعلية.
 *
 * @returns true لو أعاد التشغيل — الشاشة المستدعية يجب ألا تعرض شيئًا بعدها.
 */
export async function bootstrapI18n(): Promise<boolean> {
  const stored = await getStoredLanguage();
  const language: AppLanguage = stored ?? resolveDeviceLanguage();

  const shouldBeRTL = isRTLLanguage(language);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
    RNRestart.restart();
    return true;
  }

  if (i18n.language !== language) {
    // eslint-disable-next-line import/no-named-as-default-member -- i18next الافتراضي هو نفسه instance، وليس namespace يُلتبَس به
    await i18n.changeLanguage(language);
  }
  return false;
}

export default i18n;
