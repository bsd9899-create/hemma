import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * المنطق المُختبَر يعيش في `_shared`، والدوال المنشورة هي التي تعمل
 * فعلًا. الاختبار لا يساوي شيئًا إن بقيت نسخة قديمة من نفس المنطق داخل
 * الدالة تُنفَّذ بدلًا منه — فهذه الفحوص تربط الاثنين.
 *
 * ‏Deno لا يعمل في هذه البيئة، فما يمكن التحقق منه هنا هو ما يمكن قراءته
 * بثقة: الاستيراد يشير إلى ملف موجود، وبالامتداد الذي يشترطه Deno، ولا
 * تعريف مكرّر بقي خلفه.
 */

const FUNCTIONS = join(__dirname, '../functions');
const SHARED = join(FUNCTIONS, '_shared');

const functionDirs = readdirSync(FUNCTIONS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name);

const sharedExports = new Map(
  readdirSync(SHARED).map((file) => {
    const source = readFileSync(join(SHARED, file), 'utf8');
    const names = [...source.matchAll(/^export (?:async )?(?:function|const|type) (\w+)/gm)].map((m) => m[1]);
    return [file, names];
  }),
);

describe('دوال الحافة موصولة بالمنطق المُختبَر', () => {
  it('الدوال الثلاث موجودة', () => {
    expect(functionDirs.sort()).toEqual(['analyze-food', 'delete-account', 'revenuecat-webhook']);
  });

  it.each(functionDirs.map((d) => [d] as const))('%s — كل استيراد من _shared يشير إلى تصدير موجود', (dir) => {
    const source = readFileSync(join(FUNCTIONS, dir, 'index.ts'), 'utf8');
    const missing: string[] = [];

    for (const match of source.matchAll(/import\s+\{([^}]+)\}\s+from\s+'\.\.\/_shared\/([\w.]+)'/g)) {
      const file = match[2];
      const exported = sharedExports.get(file);
      if (!exported) {
        missing.push(`ملف غير موجود: ${file}`);
        continue;
      }
      const names = match[1]
        .split(',')
        .map((n) => n.replace(/^\s*type\s+/, '').trim())
        .filter(Boolean);
      missing.push(...names.filter((n) => !exported.includes(n)).map((n) => `${file}: ${n}`));
    }
    expect(missing).toEqual([]);
  });

  /**
   * ‏Deno يستورد بالمسار الحرفي، فاستيراد بلا امتداد .ts يفشل وقت النشر —
   * وهو فشل لا يظهر في أي اختبار هنا، بل عند `supabase functions deploy`.
   */
  it.each(functionDirs.map((d) => [d] as const))('%s — كل استيراد محلي يحمل امتداد .ts', (dir) => {
    const source = readFileSync(join(FUNCTIONS, dir, 'index.ts'), 'utf8');
    const bad = [...source.matchAll(/from\s+'(\.\.?\/[^']+)'/g)]
      .map((m) => m[1])
      .filter((path) => !path.endsWith('.ts'));
    expect(bad).toEqual([]);
  });

  it.each(functionDirs.map((d) => [d] as const))('%s — لا تعريف مكرّر لمنطق انتقل إلى _shared', (dir) => {
    const source = readFileSync(join(FUNCTIONS, dir, 'index.ts'), 'utf8');
    const allShared = [...sharedExports.values()].flat();
    const redefined = allShared.filter((name) =>
      new RegExp(`^(?:export )?(?:function|const|type) ${name}\\b`, 'm').test(source),
    );
    expect(redefined).toEqual([]);
  });

  it('لا يستورد أي ملف في _shared من Deno أو من شبكة', () => {
    for (const [file] of sharedExports) {
      const source = readFileSync(join(SHARED, file), 'utf8');
      expect(source).not.toMatch(/\bDeno\./);
      expect(source).not.toMatch(/from\s+'(?:npm:|https?:)/);
    }
  });

  it('لا مفتاح ولا سر مكتوب داخل أي دالة', () => {
    for (const dir of functionDirs) {
      const source = readFileSync(join(FUNCTIONS, dir, 'index.ts'), 'utf8');
      expect(source).not.toMatch(/sk-[A-Za-z0-9_-]{10,}/);
      expect(source).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    }
  });

  /**
   * أي دالة تلمس service_role تتجاوز RLS تمامًا، فيجب أن تشتقّ الهوية من
   * توكن المستخدم نفسه — لا من حقل يرسله العميل. الدالتان اللتان تفعلان
   * ذلك تستدعيان getUser صراحةً؛ webhook مستثناة لأن مصدرها RevenueCat
   * لا مستخدم، وحراستها السر المشترك.
   */
  it.each([['analyze-food'], ['delete-account']] as const)(
    '%s تشتقّ الهوية من التوكن قبل استخدام service_role',
    (dir) => {
      const source = readFileSync(join(FUNCTIONS, dir, 'index.ts'), 'utf8');
      // نبحث عن إنشاء عميل الإدارة نفسه، لا عن اسم المتغيّر: الاسم يرد
      // أيضًا في تعريف الثابت أعلى الملف، فالمقارنة به تقيس موضعًا خاطئًا.
      const adminClient = /createClient\([^)]*SERVICE_ROLE_KEY/.exec(source);
      expect(source).toContain('auth.getUser()');
      expect(adminClient).not.toBeNull();
      expect(source.indexOf('auth.getUser()')).toBeLessThan(adminClient!.index);
    },
  );
});
