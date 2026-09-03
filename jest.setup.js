// إعداد عام لكل الاختبارات — يموك الوحدات الأصلية (native) التي لا
// تعمل داخل بيئة Jest (لا يوجد جسر native حقيقي)، وأصبحت أوسع استخدامًا
// بعد إضافة i18n (يحتاجها src/lib/i18n/language.ts).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'ar' }],
}));

jest.mock('react-native-restart', () => ({ restart: jest.fn() }));
