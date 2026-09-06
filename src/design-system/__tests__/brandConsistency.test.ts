import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { colors, palette } from '../colors';

/**
 * حارس الهوية البصرية.
 *
 * ألوان هِمّة الثلاثة الرسمية مأخوذة من ملف الهوية ولا تُعدَّل. أي لون
 * مكتوب يدويًا في شاشة يكسر الاتساق بصمت: يبدو صحيحًا اليوم، ثم يبقى
 * على حاله حين تتغيّر لوحة الألوان فيصبح الفرق ظاهرًا للمستخدم بلا
 * سبب مفهوم. هذا الاختبار يمنع ذلك آليًا بدل الاعتماد على المراجعة.
 */
/** نسبة تباين WCAG بين لونين. */
function contrast(a: string, b: string): number {
  const lum = (hex: string): number => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const contrastOnIvory = (color: string) => contrast(color, palette.ivory50);

describe('الهوية البصرية', () => {
  it('الألوان الثلاثة الرسمية كما في ملف الهوية بالضبط', () => {
    // assets/branding/brand-identity.png — أي اختلاف يعني أن التطبيق
    // خرج عن الهوية، لا أن الاختبار قديم.
    expect(palette.green900).toBe('#0F2D23'); // أخضر أساسي
    expect(palette.ivory50).toBe('#F7F3EE'); // أوف وايت
    expect(palette.sage400).toBe('#A7B8B1'); // رمادي ثانوي
  });

  it('الخلفية أوف وايت لا أبيض ناصع', () => {
    // نصّ المرجع صراحةً: "اللون الفاتح Ivory وليس أبيض ناصع".
    expect(colors.background).toBe(palette.ivory50);
    expect(colors.background).not.toBe('#FFFFFF');
    expect(colors.surface).not.toBe('#FFFFFF');
  });

  it('الأدوار كما يحدّدها ملف الهوية', () => {
    expect(colors.primary).toBe(palette.green900);
    expect(colors.secondary).toBe(palette.sage400);
    expect(colors.textPrimary).toBe(palette.green900);
  });

  it('الرمادي الثانوي لا يُستخدم نصًّا — تباينه 1.88:1', () => {
    // لون زخرفي للحدود. استخدامه نصًّا يجعل الكلام غير مقروء عمليًا،
    // فالنص الثانوي مشتق أغمق يجتاز AA.
    expect(colors.textSecondary).not.toBe(palette.sage400);
    expect(contrastOnIvory(colors.textSecondary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastOnIvory(colors.textPrimary)).toBeGreaterThanOrEqual(4.5);
  });

  it('لا أثر لأي هوية سابقة', () => {
    const values = Object.values(palette) as string[];
    for (const retired of ['#0F3D3E', '#2E7D64', '#D9C3A6', '#C8A15A', '#1A1A1A']) {
      expect(values).not.toContain(retired);
    }
  });

  it('لا لون مكتوب يدويًا في أي شاشة أو مكوّن', () => {
    // نستثني ملف الألوان نفسه وملف الشعار (SVG حرفي من ملف الهوية).
    const cmd =
      'grep -rnE "#[0-9A-Fa-f]{3,8}\\b|rgba?\\(" app src --include=*.tsx --include=*.ts ' +
      '| grep -v "design-system/colors.ts" | grep -v "logoSvg.ts" ' +
      '| grep -v "__tests__" || true';
    const found = execSync(cmd, { cwd: process.cwd(), encoding: 'utf8', shell: '/bin/bash' }).trim();
    expect(found).toBe('');
  });
});

/**
 * فحص شامل لكل الشاشات — لا الرئيسية وحدها.
 *
 * السؤال الذي يجيب عنه: هل الهوية مطبَّقة فعلًا في كل مكان، أم أن
 * شاشة نُسيت فبقيت بلون أو خط خارج الملف؟
 */
describe('تطبيق الهوية على كل الشاشات', () => {
  const screens = execSync(
    'find app -name "*.tsx" -not -name "_layout.tsx"',
    { cwd: process.cwd(), encoding: 'utf8', shell: '/bin/bash' }
  ).trim().split('\n').filter(Boolean);

  it('كل الشاشات موجودة للفحص', () => {
    expect(screens.length).toBeGreaterThanOrEqual(25);
  });

  it('لا شاشة تكتب لونًا بنفسها', () => {
    const offenders = screens.filter((f) =>
      /#[0-9A-Fa-f]{3,8}\b|rgba?\(/.test(readFileSync(f, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });

  it('لا شاشة تفرض عائلة خط بنفسها', () => {
    // الخط يأتي من typography.ts الذي يبدّل بين Tajawal وInter حسب
    // اللغة؛ شاشة تكتب fontFamily مباشرةً تكسر ذلك في الإنجليزية.
    const offenders = screens.filter((f) => /fontFamily\s*:/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('كل شاشة تبني واجهتها من نظام التصميم — مباشرةً أو بتفويض', () => {
    // شاشة تستدعي مكوّنًا مشتركًا (NumericLogForm مثلًا) لا تحتاج
    // استيراد نظام التصميم بنفسها: المكوّن المفوَّض إليه يفعل. المهم
    // ألا تبني واجهة خامًا بـ View/Text من react-native مباشرةً.
    const offenders = screens.filter((f) => {
      const src = readFileSync(f, 'utf8');
      if (/<Redirect\b/.test(src)) return false;
      if (src.includes('@/src/design-system')) return false;
      // تفويض مقبول: تستورد مكوّنًا من src/features وتُصيّره وحده.
      const delegates = /from '@\/src\/features\//.test(src);
      const rendersRawText = /from 'react-native'/.test(src) && /<Text\b/.test(src);
      return !delegates || rendersRawText;
    });
    expect(offenders).toEqual([]);
  });
});
