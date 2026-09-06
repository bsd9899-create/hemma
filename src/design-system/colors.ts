/**
 * ألوان هِمّة — مأخوذة من ملف الهوية الرسمي
 * (assets/branding/brand-identity.png). هذا الملف هو المرجع الوحيد،
 * وأي لون هنا يجب أن يعود إليه أو يكون مشتقًا منه بصبغة واحدة.
 *
 * الألوان الخمسة الرسمية (لا تُعدَّل):
 *   #0F3D3E  أخضر أساسي   ثقة · صحة · توازن      → palette.green700
 *   #2E7D64  أخضر ثانوي   نمو · حيوية            → palette.green500
 *   #D9C3A6  بيج          دفء · توازن            → palette.beige400
 *   #F7F3EE  أوف وايت     نظافة · بساطة          → palette.ivory50
 *   #1A1A1A  نص أساسي     وضوح · احترافية        → palette.ink900
 *
 * قاعدة الاستخدام كما في الشعار نفسه: الأخضر الداكن هو اللون الأساسي
 * (النص، الأيقونات، العناصر التفاعلية)، والبيج accent محدود الاستخدام
 * (تمييز، إنجاز، CTA واحد) — تمامًا كما يظهر البيج في الدمبل وحده لا
 * كخلفية كبيرة. الأخضر الثانوي للنمو والتقدّم (رسوم، حالات نجاح).
 */
export const palette = {
  // ── الأخضر الأساسي ودرجاته ──
  green900: '#0A292A',
  green700: '#0F3D3E',
  green600: '#154C4E',
  green100: '#DCE9E9',

  // ── الأخضر الثانوي ودرجاته ──
  green500: '#2E7D64',
  green300: '#6FA894',
  green50: '#E8F1ED',

  // ── البيج (accent) ودرجاته ──
  beige400: '#D9C3A6',
  beige200: '#EADCC8',
  beige100: '#F3EADC',

  // ── محايدات ──
  ivory50: '#F7F3EE',
  ivory100: '#EFE7DE',
  white: '#FFFFFF',

  ink900: '#1A1A1A',
  neutral700: '#4A4E4B',
  neutral500: '#6B6F6D',
  neutral300: '#DAD2C4',
  neutral200: '#EDE5D8',

  // ── حالات ──
  // النجاح هو الأخضر الثانوي نفسه: "النمو والحيوية" في ملف الهوية هي
  // بالضبط ما تعنيه حالة النجاح، ولون نجاح مستقل كان سيضيف أخضر ثالثًا
  // بلا سبب.
  success: '#2E7D64',
  warning: '#D98C3D',
  danger: '#C1503F',

  // خلفيات خفيفة لحالات الرسائل — نفس الصبغة بإضاءة عالية، حتى تبقى
  // الرسالة واضحة دون أن تصرخ في وجه المستخدم.
  successSoft: '#E8F1ED',
  warningSoft: '#FBEEDF',
  dangerSoft: '#F7E4E1',
} as const;

export const colors = {
  background: palette.ivory50,
  surface: palette.white,
  surfaceAlt: palette.ivory100,

  primary: palette.green700,
  primaryPressed: palette.green900,
  onPrimary: palette.ivory50,

  /** الأخضر الثانوي — للنمو والتقدّم (رسوم بيانية، مؤشرات تحسّن). */
  secondary: palette.green500,
  secondarySoft: palette.green50,

  accent: palette.beige400,
  accentSoft: palette.beige100,
  onAccent: palette.ink900,

  textPrimary: palette.ink900,
  textSecondary: palette.neutral500,
  textOnDark: palette.ivory50,

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
