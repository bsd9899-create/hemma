import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * مموّه يخترع اسم دالة غير موجودة لا يفشل — الشاشة ترمي TypeError،
 * فتلتقطه بلوك الخطأ، فتُعرض حالة خطأ، فيرى الاختبار "شاشة عُرضت بنجاح".
 * ثلاث شاشات (التقدّم والفرق ورفيق هِمّة) كانت هكذا: تمرّ في كل اختبار
 * وهي لم تُعرَض ولا مرة واحدة، وحالتها الفارغة لم تُفحص قط.
 *
 * فالمقارنة هنا بين أسماء الدوال في المموّه وأسماء الدوال في المستودع
 * الحقيقي، في الاتجاهين: اسم مخترَع يفشل، ودالة حقيقية بلا مموّه تفشل
 * أيضًا — لأنها ستكون `undefined` عند أول استدعاء.
 */

const HARNESS = join(__dirname, 'allScreens.test.tsx');
const REPOSITORIES = join(__dirname, '../../data/repositories');

const harness = readFileSync(HARNESS, 'utf8');

/**
 * كتلة jest.mock كاملة لكل مستودع، بقصّ متوازن الأقواس.
 *
 * التعبير النمطي البسيط لا يكفي: بعض المموّهات تُكتب `() => ({...})`
 * وتنتهي بـ "}));"، وبعضها `() => { ... return {...}; }` وينتهي بـ "});"
 * — فقارئ يفترض نهاية واحدة يبتلع الكتلة التالية ويخلط دوالها بدوال
 * السابقة، ثم يبلّغ عن مخالفات لا وجود لها.
 */
function mockBlocks(): { module: string; body: string }[] {
  const blocks: { module: string; body: string }[] = [];
  const startRe = /jest\.mock\('@\/src\/data\/repositories\/(\w+)'/g;
  let match: RegExpExecArray | null;

  while ((match = startRe.exec(harness)) !== null) {
    const open = harness.indexOf('(', match.index);
    let depth = 0;
    for (let i = open; i < harness.length; i += 1) {
      if (harness[i] === '(') depth += 1;
      else if (harness[i] === ')') {
        depth -= 1;
        if (depth === 0) {
          blocks.push({ module: match[1], body: harness.slice(open, i) });
          break;
        }
      }
    }
  }
  return blocks;
}

/** أسماء الدوال المعرَّفة فعلًا في ملف المستودع. */
function realMethods(module: string): string[] {
  const source = readFileSync(join(REPOSITORIES, `${module}.ts`), 'utf8');
  return [...source.matchAll(/^ {2}(?:async )?(\w+)\s*(?:<[^>]*>)?\(/gm)]
    .map((m) => m[1])
    .filter((name) => name !== 'if' && name !== 'for' && name !== 'return' && name !== 'catch');
}

/**
 * مموّه يمدّد المستودع الحقيقي (`...jest.requireActual`) يستبدل بعض
 * الدوال ويترك البقية أصلية، فمطالبته بتغطية كل دالة خطأ — والاتجاه
 * الآخر (اسم مخترَع) يبقى مطلوبًا منه كغيره.
 */
const mocks = mockBlocks().map(({ module, body }) => ({
  module,
  // بلا تثبيت على بداية السطر: المموّه الصغير يُكتب في سطر واحد
  // (`{ upsertToday: jest.fn(...) }`) فلا تسبقه مسافة بادئة.
  methods: [...body.matchAll(/(\w+):\s*jest\.fn/g)].map((m) => m[1]),
  isPartial: body.includes('requireActual'),
}));

const complete = mocks.filter((m) => !m.isPartial && m.methods.length > 0);

describe('مموّهات المستودعات تطابق المستودعات الحقيقية', () => {
  it('عُثر على مموّهات فعلًا (حارس ضد اختبار لا يفحص شيئًا)', () => {
    expect(mocks.length).toBeGreaterThanOrEqual(5);
    expect(mocks.every((m) => m.methods.length > 0)).toBe(true);
  });

  it.each(mocks.map((m) => [m.module, m] as const))(
    '%s — كل دالة مموّهة موجودة في المستودع الحقيقي',
    (module, mock) => {
      const real = realMethods(module);
      const invented = mock.methods.filter((name) => !real.includes(name));
      expect(invented).toEqual([]);
    },
  );

  it.each(complete.map((m) => [m.module, m] as const))(
    '%s — كل دالة حقيقية لها مموّه (لا دالة بلا تغطية)',
    (module, mock) => {
      const real = realMethods(module);
      const unmocked = real.filter((name) => !mock.methods.includes(name));
      expect(unmocked).toEqual([]);
    },
  );
});
