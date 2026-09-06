/**
 * ألوان هِمّة — من ملف الهوية الرسمي
 * (assets/branding/brand-identity.png). هذا الملف هو المرجع الوحيد.
 *
 * الألوان الثلاثة الرسمية (لا تُعدَّل):
 *   #0F2D23  أخضر أساسي   ثقة · صحة · توازن        → palette.green900
 *   #F7F3EE  أوف وايت     بساطة · وضوح · راحة      → palette.ivory50
 *   #A7B8B1  رمادي ثانوي  توازن · مرونة            → palette.sage400
 *
 * قاعدة الاستخدام: الأوف وايت هو **الخلفية الأساسية** للتطبيق والموقع
 * (لا أبيض ناصع)، والأخضر الداكن للنص والأيقونات والعناصر التفاعلية،
 * والرمادي الثانوي للحدود والعناصر الخافتة.
 *
 * ── عن المشتقات ──
 * ثلاثة ألوان لا تكفي وحدها لواجهة كاملة: نحتاج حالة ضغط، وخلفيات
 * ناعمة، ونصًّا ثانويًا مقروءًا. كل مشتق هنا من صبغة أحد الثلاثة، ومعه
 * نسبة تباينه على الأوف وايت.
 *
 * ⚠️ الرمادي الثانوي #A7B8B1 نسبته على الأوف وايت **1.88:1** — لون
 * زخرفي للحدود لا لون نص. استخدامه نصًّا يجعل الكلام غير مقروء عمليًا،
 * ولهذا النص الثانوي مشتق أغمق (5.14:1، يجتاز AA).
 */
export const palette = {
  // ── الأخضر الأساسي ودرجاته ──
  /** #0F2D23 — اللون الرسمي. تباينه على الأوف وايت 13.39:1. */
  green900: '#0F2D23',
  /** حالة الضغط — أغمق من الأساسي بدرجة واحدة. */
  green950: '#0A1F18',
  /** أفتح قليلًا للعناصر الثانوية على خلفية داكنة. */
  green700: '#1B4033',
  /** خلفية ناعمة بصبغة الأخضر — للبطاقات المميَّزة. */
  green50: '#E7EDEA',

  // ── الرمادي الثانوي ودرجاته ──
  /** #A7B8B1 — اللون الرسمي. زخرفي: حدود وفواصل وأيقونات خافتة. */
  sage400: '#A7B8B1',
  /** مشتق للنص الثانوي — 5.14:1 على الأوف وايت (AA). */
  sage600: '#5C6A64',
  /** فواصل ناعمة. */
  sage200: '#D3DBD7',
  sage100: '#E4E9E6',

  // ── الأوف وايت ودرجاته ──
  /** #F7F3EE — الخلفية الأساسية. ليس أبيض ناصع، وهذا مقصود. */
  ivory50: '#F7F3EE',
  /** سطح مرفوع قليلًا فوق الخلفية. */
  ivory100: '#EFEAE3',
  /** أبيض ناصع — للشعار على الخلفيات الداكنة فقط، لا للأسطح. */
  white: '#FFFFFF',

  // ── حالات ──
  // النجاح بصبغة الأخضر الأساسي نفسه لا أخضر غريب عنه.
  success: '#2E6B55',
  warning: '#B8763A',
  danger: '#A8483A',

  successSoft: '#E7EFEB',
  warningSoft: '#F7EBDF',
  dangerSoft: '#F5E3E0',
} as const;

export const colors = {
  /** الخلفية الأساسية — أوف وايت، ليس أبيض. */
  background: palette.ivory50,
  surface: palette.ivory50,
  surfaceAlt: palette.ivory100,

  primary: palette.green900,
  primaryPressed: palette.green950,
  onPrimary: palette.ivory50,

  /** الرمادي الثانوي — حدود وعناصر خافتة، لا نصوص. */
  secondary: palette.sage400,
  secondarySoft: palette.sage100,

  /**
   * لا يوجد accent ثالث في هذه الهوية: التمييز يتم بالأخضر الداكن
   * والتباين، لا بلون رابع. accent هنا نفس الأساسي عمدًا حتى تبقى
   * الشاشات القديمة صحيحة بلا لون خارج الملف.
   */
  accent: palette.green900,
  accentSoft: palette.green50,
  onAccent: palette.ivory50,

  textPrimary: palette.green900,
  textSecondary: palette.sage600,
  textOnDark: palette.ivory50,

  border: palette.sage200,
  divider: palette.sage100,

  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,

  successSoft: palette.successSoft,
  warningSoft: palette.warningSoft,
  dangerSoft: palette.dangerSoft,
} as const;

export type ColorToken = keyof typeof colors;
