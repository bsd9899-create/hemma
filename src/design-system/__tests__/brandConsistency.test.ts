import { execSync } from 'child_process';
import { colors, palette } from '../colors';

/**
 * حارس الهوية البصرية.
 *
 * ألوان هِمّة الثلاثة الرسمية مأخوذة من ملف الهوية ولا تُعدَّل. أي لون
 * مكتوب يدويًا في شاشة يكسر الاتساق بصمت: يبدو صحيحًا اليوم، ثم يبقى
 * على حاله حين تتغيّر لوحة الألوان فيصبح الفرق ظاهرًا للمستخدم بلا
 * سبب مفهوم. هذا الاختبار يمنع ذلك آليًا بدل الاعتماد على المراجعة.
 */
describe('الهوية البصرية', () => {
  it('الألوان الخمسة الرسمية كما في ملف الهوية بالضبط', () => {
    // assets/branding/brand-identity.png — أي اختلاف هنا يعني أن
    // التطبيق خرج عن الهوية، لا أن الاختبار قديم.
    expect(palette.green700).toBe('#0F3D3E'); // أخضر أساسي
    expect(palette.green500).toBe('#2E7D64'); // أخضر ثانوي
    expect(palette.beige400).toBe('#D9C3A6'); // بيج
    expect(palette.ivory50).toBe('#F7F3EE'); // أوف وايت
    expect(palette.ink900).toBe('#1A1A1A'); // نص أساسي
  });

  it('الأدوار كما يحدّدها ملف الهوية', () => {
    expect(colors.primary).toBe(palette.green700);
    expect(colors.secondary).toBe(palette.green500);
    expect(colors.accent).toBe(palette.beige400);
    expect(colors.background).toBe(palette.ivory50);
    expect(colors.textPrimary).toBe(palette.ink900);
  });

  it('لا أثر للوحة القديمة (الذهبي/التيل) في أي مكان', () => {
    // الهوية السابقة استُبدلت بالكامل؛ بقاء اسم واحد منها يعني ملفًا
    // لم يُرحَّل وسيظهر بلون خاطئ.
    const values = Object.values(palette) as string[];
    expect(values).not.toContain('#C8A15A'); // الذهبي القديم
    expect(values).not.toContain('#E4C997');
    expect(values).not.toContain('#F4E8D2');
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
