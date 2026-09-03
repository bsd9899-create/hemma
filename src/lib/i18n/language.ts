import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import RNRestart from 'react-native-restart';

export type AppLanguage = 'ar' | 'en';

const STORAGE_KEY = 'hemma:language';

export function isRTLLanguage(lang: AppLanguage): boolean {
  return lang === 'ar';
}

export async function getStoredLanguage(): Promise<AppLanguage | null> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value === 'ar' || value === 'en' ? value : null;
}

/** لغة الجهاز لو لم يختر المستخدم لغة من قبل — أي لغة غير الإنجليزية تُعامَل كعربي (لغة هِمّة الأصلية). */
export function resolveDeviceLanguage(): AppLanguage {
  const code = Localization.getLocales()[0]?.languageCode;
  return code === 'en' ? 'en' : 'ar';
}

/**
 * يغيّر اللغة المختارة يدويًا (من شاشة الحساب) ويعيد تشغيل التطبيق —
 * العربية والإنجليزية هنا RTL/LTR متبادلان دائمًا، وتغيير اتجاه
 * التخطيط في React Native يتطلب إعادة تشغيل فعلية (لا يوجد تحديث حي).
 */
export async function changeLanguage(lang: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  RNRestart.restart();
}
