import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * زر يفتح مسارًا غير موجود لا يفشل عند البناء: expo-router يحاول التنقل
 * وقت الضغط، فيهبط المستخدم على "الصفحة غير موجودة" — أو لا يحدث شيء
 * إطلاقًا. الفحص هنا يطابق كل وجهة يطلبها الكود بملف موجود فعلًا.
 */
const APP = join(__dirname, '../../../app');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path);
    return /\.tsx$/.test(name) ? [path] : [];
  });
}

const screens = files(APP);

/** المسار الذي يمثّله ملف، بقواعد expo-router. */
function routeOf(file: string): string {
  const relative = file.replace(APP, '').replace(/\.tsx$/, '');
  return relative
    .replace(/\/index$/, '') // index يمثّل مجلده
    .replace(/\/\([^)]+\)/g, '') // المجموعات لا تظهر في المسار
    .replace(/^$/, '/');
}

const routes = new Set(screens.filter((f) => !/_layout/.test(f)).map(routeOf));

/** الوجهات المطلوبة في الكود: router.push/replace وhref. */
function requestedDestinations(): { file: string; destination: string }[] {
  const found: { file: string; destination: string }[] = [];
  for (const file of [...screens, ...files(join(APP, '../src'))]) {
    const body = readFileSync(file, 'utf8');
    /*
     * الوجهة تُكتب بأربع صيغ في هذا المشروع، وإغفال أيٍّ منها يجعل
     * شاشات سليمة تبدو يتيمة:
     *   router.push('/x')            نص مباشر
     *   router.push(`/x/${id}`)      قالب — الجزء المتغيّر يصير [id]
     *   router.push({ pathname: '/x' })  كائن بمعطيات
     *   href="/x"                    رابط
     */
    const patterns = [
      /router\.(?:push|replace|navigate)\(\s*'([^']+)'/g,
      /router\.(?:push|replace|navigate)\(\s*`([^`]+)`/g,
      /pathname:\s*'([^']+)'/g,
      /href=\{?\s*'([^']+)'/g,
      /href:\s*'([^']+)'/g,
    ];
    const normalise = (raw: string) => raw.replace(/\$\{[^}]*\}/g, '[id]');
    for (const pattern of patterns) {
      for (const match of body.matchAll(pattern)) {
        const destination = normalise(match[1]);
        if (destination.startsWith('/')) found.push({ file, destination });
      }
    }
  }
  return found;
}

/** يطابق المسار الديناميكي: /exercises/abc يطابق /exercises/[id]. */
function resolves(destination: string): boolean {
  // المجموعات لا تظهر في المسار النهائي، لكن expo-router يقبلها كوجهة.
  const wanted = destination.split('?')[0].replace(/\/\([^)]+\)/g, '').replace(/\/$/, '') || '/';
  if (routes.has(wanted)) return true;
  const parts = wanted.split('/');
  return [...routes].some((route) => {
    const candidate = route.split('/');
    if (candidate.length !== parts.length) return false;
    return candidate.every((segment, i) => segment === parts[i] || /^\[.+\]$/.test(segment));
  });
}

describe('كل وجهة تنقّل موجودة', () => {
  const destinations = requestedDestinations();

  it('عُثر على وجهات فعلًا (حارس ضد اختبار لا يفحص شيئًا)', () => {
    expect(destinations.length).toBeGreaterThan(10);
    expect(routes.size).toBeGreaterThan(15);
  });

  it('لا زر يفتح مسارًا غير موجود', () => {
    const broken = destinations
      .filter(({ destination }) => !resolves(destination))
      .map(({ file, destination }) => `${file.replace(APP, 'app')} → ${destination}`);
    expect(broken).toEqual([]);
  });
});

describe('كل شاشة يمكن الوصول إليها', () => {
  /**
   * شاشة لا يشير إليها شيء ولا هي تبويب هي كود ميت — أو زر نُسي.
   * كلاهما يستحق أن يُرى.
   */
  const TABS = ['/', '/nutrition', '/progress', '/profile', '/add'];
  const ENTRY_POINTS = ['/sign-in', '/onboarding', '/+not-found'];

  it('لا شاشة يتيمة بلا أي طريق إليها', () => {
    const reachable = new Set([
      ...requestedDestinations().map((d) => d.destination.split('?')[0]),
      ...TABS,
      ...ENTRY_POINTS,
    ]);
    const orphans = [...routes].filter((route) => {
      if (reachable.has(route)) return false;
      // المسار الديناميكي يُطلَب بقيمة لا بقالبه.
      if (/\[.+\]/.test(route)) {
        const prefix = route.replace(/\/\[.+\]$/, '');
        return ![...reachable].some((r) => r.startsWith(`${prefix}/`));
      }
      return true;
    });
    expect(orphans).toEqual([]);
  });
});
