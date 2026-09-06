// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // سكربتات تُشغَّل بـ Node مباشرة (خارج حزمة التطبيق) — لها globals مختلفة
    // عن React Native، وإلا يعتبر ESLint كل واجهة Node غير معرَّفة.
    files: ['*.mjs', '*.js', 'scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        module: 'writable',
        require: 'readonly',
      },
    },
  },
  {
    // إعداد Jest: تعريفات الاختبار العامة متاحة وقت التشغيل عبر jest-expo.
    files: ['jest.setup.js', '**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    // ملفات الاختبار: jest.mock يُرفَع فوق الاستيرادات، فالوصول إلى
    // الوحدات داخل المصانع يجب أن يكون بـ require() لا import — وهذا
    // شرط تقني من Jest لا خيار أسلوبي.
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', 'src/test-support/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Supabase Edge Functions تعمل على Deno، لا على Metro/Node: مواصفة
    // `npm:@supabase/supabase-js@2` يحلّها Deno وقت النشر، ولا يستطيع
    // محلّل import الخاص بـ ESLint رؤيتها. تعطيل القاعدة هنا فقط.
    files: ['supabase/functions/**/*.ts'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
]);
