/**
 * ألوان هِمّة — مأخوذة من ملف الهوية الرسمي.
 *
 * الألوان الرسمية الثلاثة (لا تُعدَّل):
 *   Deep Teal  #0F3D3E  اللون الأساسي  → palette.teal700
 *   Warm Gold  #C8A15A  اللون المميِّز → palette.gold500
 *   Ivory      #F7F3EE  لون الخلفية    → palette.cream50
 *
 * بقية الدرجات مشتقة منها بنفس الصبغة (Hue) وبنفس فروق الإضاءة المستخدمة
 * سابقًا في السلّم، حتى تبقى التباينات والحالات (pressed/soft/…) كما هي.
 *
 * القاعدة: التيل الداكن هو اللون الأساسي (نص، أيقونات، عناصر تفاعلية)،
 * والذهبي Accent محدود الاستخدام (تمييز/إنجاز/CTA رئيسي فقط) تمامًا
 * كما يظهر في الشعار (الذهبي فقط في أيقونة الدمبل، وليس كخلفية كبيرة).
 */
export const palette = {
  teal900: '#0A292A',
  teal700: '#0F3D3E',
  teal600: '#154C4E',
  teal500: '#246264',
  teal100: '#DCE9E9',

  gold500: '#C8A15A',
  gold300: '#E4C997',
  gold100: '#F4E8D2',

  cream50: '#F7F3EE',
  cream100: '#EFE7DE',
  white: '#FFFFFF',

  neutral700: '#4A4E4B',
  neutral500: '#6B6F6D',
  neutral300: '#DAD2C4',
  neutral200: '#EDE5D8',

  success: '#3F8F6B',
  warning: '#D98C3D',
  danger: '#C1503F',

  // خلفيات خفيفة لحالات الرسائل — نفس الصبغة بإضاءة عالية، حتى تبقى
  // الرسالة واضحة دون أن تصرخ في وجه المستخدم.
  successSoft: '#E7F1EC',
  warningSoft: '#FBEEDF',
  dangerSoft: '#F7E4E1',
} as const;

export const colors = {
  background: palette.cream50,
  surface: palette.white,
  surfaceAlt: palette.cream100,

  primary: palette.teal700,
  primaryPressed: palette.teal900,
  onPrimary: palette.cream50,

  accent: palette.gold500,
  accentSoft: palette.gold100,
  onAccent: palette.teal900,

  textPrimary: palette.teal900,
  textSecondary: palette.neutral500,
  textOnDark: palette.cream50,

  border: palette.neutral300,
  divider: palette.neutral200,

  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,

  successSoft: palette.successSoft,
  warningSoft: palette.warningSoft,
  dangerSoft: palette.dangerSoft,
} as const;

export type ColorToken = keyof typeof colors;
