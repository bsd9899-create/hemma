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
  it('الألوان الرسمية الثلاثة كما في ملف الهوية بالضبط', () => {
    expect(palette.teal700).toBe('#0F3D3E');
    expect(palette.gold500).toBe('#C8A15A');
    expect(palette.cream50).toBe('#F7F3EE');
  });

  it('اللون الأساسي هو التيل الداكن، والذهبي accent لا خلفية', () => {
    expect(colors.primary).toBe(palette.teal700);
    expect(colors.accent).toBe(palette.gold500);
    expect(colors.background).toBe(palette.cream50);
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
