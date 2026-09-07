import { readFileSync } from 'fs';
import { join } from 'path';
import { palette } from '../colors';

/**
 * ‏app.json يقرّر ما يراه المستخدم قبل أن يفتح التطبيق: الاسم تحت
 * الأيقونة، لون خلفيتها، ونصوص الأذونات التي تظهر في نوافذ النظام. لا
 * شيء منه يمرّ على TypeScript ولا على أي اختبار شاشة، فخطأ فيه يظهر
 * أول مرة على جهاز أو في مراجعة App Store.
 */
const config = JSON.parse(readFileSync(join(__dirname, '../../../app.json'), 'utf8')).expo as {
  name: string;
  slug: string;
  version: string;
  scheme: string;
  ios: { bundleIdentifier: string; buildNumber?: string; infoPlist?: Record<string, unknown> };
  android: { package: string; versionCode?: number; adaptiveIcon: { backgroundColor: string } };
  plugins: (string | [string, Record<string, unknown>])[];
  userInterfaceStyle?: string;
};

function pluginProps(name: string): Record<string, unknown> | null {
  const entry = config.plugins.find((p) => (typeof p === 'string' ? p === name : p[0] === name));
  if (!entry) return null;
  return typeof entry === 'string' ? {} : entry[1];
}

describe('هوية التطبيق كما تظهر قبل فتحه', () => {
  /**
   * الاسم تحت الأيقونة هو أول ظهور للعلامة، وكان مكتوبًا "همة" بلا تشكيل
   * بينما الشعار المعتمد وكل نص في التطبيق «هِمّة».
   */
  it('الاسم يطابق العلامة بتشكيلها', () => {
    expect(config.name).toBe('هِمّة');
  });

  it('خلفية أيقونة أندرويد هي الأخضر الأساسي لا الآيفوري', () => {
    // الشعار المرسوم على الطبقة الأمامية فاتح، فخلفية فاتحة تُخفيه.
    expect(config.android.adaptiveIcon.backgroundColor).toBe(palette.green900);
  });

  it('الواجهة فاتحة دائمًا — الهوية لا تملك نسخة داكنة', () => {
    expect(config.userInterfaceStyle).toBe('light');
  });
});

describe('معرّفات لا يجوز أن تتغيّر', () => {
  /**
   * تغيير أيٍّ من هذه يكسر تسجيل الدخول أو يفصل التطبيق عن سجلّه في
   * المتجر. مثبّتة بقيمها لا بوجودها.
   */
  it.each([
    ['bundleIdentifier', () => config.ios.bundleIdentifier, 'com.hemma.himah'],
    ['android package', () => config.android.package, 'com.hemma.himah'],
    ['scheme', () => config.scheme, 'hemma'],
    ['slug', () => config.slug, 'hemma'],
  ])('%s ثابت', (_name, read, expected) => {
    expect(read()).toBe(expected);
  });
});

describe('جاهزية الرفع للمتجر', () => {
  it('رقم الإصدار بصيغة semver', () => {
    expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  /**
   * المتجر يرفض بناءً برقم مكرّر. وجودهما صراحةً يجعل الزيادة قرارًا
   * مرئيًا بدل أن تُنسى عند أول رفض.
   */
  it('رقم البناء معلن للمنصّتين', () => {
    expect(config.ios.buildNumber).toBeDefined();
    expect(config.android.versionCode).toBeDefined();
  });

  it('يعلن أنه لا يستخدم تشفيرًا غير معفى', () => {
    expect(config.ios.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
  });
});

describe('نصوص الأذونات', () => {
  const PERMISSION_PLUGINS: [string, string[]][] = [
    ['@kingstinct/react-native-healthkit', ['NSHealthShareUsageDescription']],
    ['expo-image-picker', ['photosPermission', 'cameraPermission']],
  ];

  it.each(PERMISSION_PLUGINS)('%s يشرح لماذا يطلب الإذن، بالعربية', (name, keys) => {
    const props = pluginProps(name);
    expect(props).not.toBeNull();
    for (const key of keys) {
      const text = props![key];
      expect(typeof text).toBe('string');
      // نافذة النظام تعرض هذا النص حرفيًا. جملة قصيرة أو إنجليزية تعني
      // مستخدمًا يرفض الإذن لأنه لا يفهم سببه — ومراجعة App Store ترفض
      // الوصف المبهم صراحةً.
      expect(String(text).length).toBeGreaterThan(40);
      expect(String(text)).toMatch(/[؀-ۿ]/);
    }
  });

  /**
   * الوسائط لا تحتاج أي إذن، والتشغيل في الخلفية أو صورة داخل صورة
   * يطلبان قدرات نظام لا يحتاجها مقطع أداء صامت.
   */
  it('مشغّل الفيديو لا يطلب تشغيلًا في الخلفية ولا PiP', () => {
    const props = pluginProps('expo-video');
    expect(props).not.toBeNull();
    expect(props!.supportsBackgroundPlayback).toBe(false);
    expect(props!.supportsPictureInPicture).toBe(false);
  });

  it('لا وضع خلفية مُعلَن في iOS', () => {
    expect(config.ios.infoPlist?.UIBackgroundModes).toEqual([]);
  });

  it('كل وحدة أصلية مثبَّتة ولها إضافة إعداد مُعلَنة في app.json', () => {
    const declared = config.plugins.map((p) => (typeof p === 'string' ? p : p[0]));
    const installed = ['expo-image', 'expo-video', 'expo-image-picker', 'expo-secure-store', 'expo-apple-authentication'];
    expect(installed.filter((name) => !declared.includes(name))).toEqual([]);
  });
});
