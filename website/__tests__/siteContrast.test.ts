import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * نص بلون خلفيته = نص غير موجود.
 *
 * حدث هذا مرتين على هذا الملف بالذات: بعد تبديل اللوحة صارت الروابط
 * بلون الأرضية في الوضع الليلي، فأُصلحت — ثم تبيّن أن السعر ورقم الخطوة
 * ما زالا كذلك. لا خطأ يُرفع، ولا شيء يبدو مكسورًا في الفحص السريع:
 * النص ببساطة يختفي.
 *
 * فحص التباين هنا حسابي لا بصري.
 */
const CSS = readFileSync(join(__dirname, '../style.css'), 'utf8');

/** قيم المتغيّرات المعرَّفة في :root. */
function rootVariables(): Record<string, string> {
  const root = /:root\s*\{([\s\S]*?)\}/.exec(CSS)?.[1] ?? '';
  return Object.fromEntries(
    [...root.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2].toUpperCase()]),
  );
}

const vars = rootVariables();

function resolve(value: string): string | null {
  const direct = /#[0-9a-fA-F]{6}/.exec(value)?.[0];
  if (direct) return direct.toUpperCase();
  const variable = /var\((--[\w-]+)\)/.exec(value)?.[1];
  return variable ? (vars[variable] ?? null) : null;
}

function luminance(hex: string): number {
  const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** كتلة الوضع الليلي وحدها. */
function darkModeBlock(): string {
  const blocks = [...CSS.matchAll(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*?)\n\}/g)];
  return blocks.map((m) => m[1]).join('\n');
}

const DARK_BACKGROUND = vars['--green-900'];

describe('لا نص يختفي في الوضع الليلي', () => {
  it('عُثر على الألوان والكتلة (حارس ضد اختبار لا يفحص شيئًا)', () => {
    expect(Object.keys(vars).length).toBeGreaterThan(5);
    expect(DARK_BACKGROUND).toBeDefined();
    expect(darkModeBlock().length).toBeGreaterThan(100);
  });

  /**
   * كل `color:` داخل كتلة الوضع الليلي يُقاس على الأرضية الخضراء، ما لم
   * تعلن القاعدة نفسها خلفية أخرى.
   */
  it('كل لون نص في الوضع الليلي يبلغ 4.5:1 على الأرضية', () => {
    const failures: string[] = [];
    for (const rule of darkModeBlock().split('}')) {
      const ownBackground = /background:\s*([^;]+);/.exec(rule)?.[1] ?? '';
      const background = resolve(ownBackground) ?? DARK_BACKGROUND;
      for (const match of rule.matchAll(/(?<!-)color:\s*([^;]+);/g)) {
        const colour = resolve(match[1]);
        if (!colour) continue;
        const ratio = contrast(colour, background);
        if (ratio < 4.5) {
          const selector = rule.split('{')[0].trim().replace(/\s+/g, ' ').slice(0, 60);
          failures.push(`${selector} → ${colour} على ${background} = ${ratio.toFixed(2)}:1`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('لا قاعدة تجعل النص بلون خلفيته حرفيًا', () => {
    const identical: string[] = [];
    for (const rule of darkModeBlock().split('}')) {
      const colour = resolve(/(?<!-)color:\s*([^;]+);/.exec(rule)?.[1] ?? '');
      const background = resolve(/background:\s*([^;]+);/.exec(rule)?.[1] ?? '') ?? DARK_BACKGROUND;
      if (colour && background && colour === background) {
        identical.push(rule.split('{')[0].trim().replace(/\s+/g, ' ').slice(0, 60));
      }
    }
    expect(identical).toEqual([]);
  });
});

describe('كل لون في الموقع من الهوية', () => {
  it('لا كود لون خام خارج :root', () => {
    const withoutRoot = CSS.replace(/:root\s*\{[\s\S]*?\}/, '');
    const raw = [...withoutRoot.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0]);
    expect(raw).toEqual([]);
  });

  it('كل صفحة تستعمل الورقة نفسها', () => {
    const pages = readdirSync(join(__dirname, '..')).filter((f) => f.endsWith('.html'));
    expect(pages.length).toBeGreaterThan(3);
    for (const page of pages) {
      const body = readFileSync(join(__dirname, '..', page), 'utf8');
      expect(body).toContain('style.css');
      expect(body.match(/style="[^"]*#[0-9a-fA-F]{6}/g) ?? []).toEqual([]);
    }
  });
});
