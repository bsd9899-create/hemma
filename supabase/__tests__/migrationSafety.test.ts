import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * كل ملف SQL في هذا المشروع يُشغَّل يدويًا في Supabase SQL Editor على
 * قاعدة تحمل بيانات حقيقية. لا يوجد مُشغّل ترحيلات يتتبّع ما طُبِّق،
 * فالافتراض الوحيد الآمن هو أن أي ملف قد يُشغَّل على قاعدة نصفية أو
 * مكتملة أو يُعاد تشغيله بالكامل.
 *
 * جملة DDL واحدة بلا حارس تُنهي الملف كله بخطأ (42710 / 42P07) وتُلغي
 * المعاملة، فلا يصل التنفيذ إلى ما بعدها — وهذا بالضبط ما حدث سابقًا:
 * مات apply_all.sql عند السطر 19 ولم يبلغ الترحيلات التي كانت تصلح
 * خطأ 42501، فظهر للمستخدم انهيار في شاشة اليوم بلا علاقة ظاهرة.
 *
 * لذلك الحراسة هنا اختبار، لا مراجعة بصرية.
 */

const SQL_DIR = join(__dirname, '..');
const MIGRATIONS_DIR = join(SQL_DIR, 'migrations');

function sqlFiles(): { name: string; body: string }[] {
  const files = [
    ...readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => join('migrations', f)),
    'apply_all.sql',
    'apply_pending.sql',
  ];
  return files.map((rel) => ({
    name: rel,
    body: readFileSync(join(SQL_DIR, rel), 'utf8'),
  }));
}

/** أسطر فعلية فقط: بلا تعليقات وبلا فراغ. */
function statementLines(body: string): { line: number; text: string }[] {
  return body
    .split('\n')
    .map((text, i) => ({ line: i + 1, text: text.trim() }))
    .filter(({ text }) => text.length > 0 && !text.startsWith('--'));
}

/**
 * أسطر كتل do $$ ... $$ في الملف.
 *
 * العدّ البسيط لا ينفع: أجسام الدوال تُقتبس بـ $$ أيضًا، وبعضها ينتهي
 * بـ "$$;" تمامًا كما تنتهي كتلة do — فيُحسب إغلاقًا بلا فتح ويختلّ
 * العدّ لبقية الملف. لذلك يمسح هذا الماسح رموز $$ بالترتيب ويقرّر عند
 * كل فتحة إن كانت مسبوقة بكلمة do، ويهمل ما عداها.
 */
function doBlockRanges(body: string): [number, number][] {
  const lineOf = (index: number) => body.slice(0, index).split('\n').length;
  const ranges: [number, number][] = [];
  const token = /\$\$/g;
  let openIndex: number | null = null;
  let openIsDo = false;
  let match: RegExpExecArray | null;

  while ((match = token.exec(body)) !== null) {
    if (openIndex === null) {
      openIsDo = /\bdo\s*$/i.test(body.slice(0, match.index));
      openIndex = match.index;
    } else {
      if (openIsDo) ranges.push([lineOf(openIndex), lineOf(match.index)]);
      openIndex = null;
    }
  }
  return ranges;
}

function insideDoBlock(body: string, lineNumber: number): boolean {
  return doBlockRanges(body).some(([start, end]) => lineNumber >= start && lineNumber <= end);
}

const files = sqlFiles();

describe('كل ملف SQL ينجو من قاعدة قائمة', () => {
  it.each(files.map((f) => [f.name, f] as const))(
    '%s — كل create type داخل حارس يفحص وجوده',
    (_name, file) => {
      const offenders = statementLines(file.body)
        .filter(({ text }) => /^create\s+type\b/i.test(text))
        .filter(({ line }) => !insideDoBlock(file.body, line))
        .map(({ line, text }) => `${line}: ${text}`);
      expect(offenders).toEqual([]);
    },
  );

  it.each(files.map((f) => [f.name, f] as const))(
    '%s — كل create table و create index يحمل IF NOT EXISTS',
    (_name, file) => {
      const offenders = statementLines(file.body)
        .filter(({ text }) => /^create\s+(unique\s+)?(table|index)\b/i.test(text))
        .filter(({ text }) => !/if\s+not\s+exists/i.test(text))
        .map(({ line, text }) => `${line}: ${text}`);
      expect(offenders).toEqual([]);
    },
  );

  it.each(files.map((f) => [f.name, f] as const))(
    '%s — كل add column يحمل IF NOT EXISTS',
    (_name, file) => {
      const offenders = statementLines(file.body)
        .filter(({ text }) => /^add\s+column\b/i.test(text) || /\badd\s+column\s+(?!if\s+not\s+exists)/i.test(text))
        .filter(({ text }) => !/add\s+column\s+if\s+not\s+exists/i.test(text))
        .map(({ line, text }) => `${line}: ${text}`);
      expect(offenders).toEqual([]);
    },
  );

  it.each(files.map((f) => [f.name, f] as const))(
    '%s — كل add constraint داخل حارس يفحص pg_constraint',
    (_name, file) => {
      const offenders = statementLines(file.body)
        .filter(({ text }) => /\badd\s+constraint\b/i.test(text))
        .filter(({ line }) => !insideDoBlock(file.body, line))
        .map(({ line, text }) => `${line}: ${text}`);
      expect(offenders).toEqual([]);
    },
  );

  it.each(files.map((f) => [f.name, f] as const))(
    '%s — كل create policy مسبوق بـ drop policy if exists',
    (_name, file) => {
      const lines = statementLines(file.body);
      const dropped = new Set(
        lines
          .map(({ text }) => /^drop\s+policy\s+if\s+exists\s+("[^"]+"|\S+)/i.exec(text)?.[1])
          .filter((n): n is string => Boolean(n))
          .map((n) => n.replace(/"/g, '')),
      );
      const offenders = lines
        .filter(({ text }) => /^create\s+policy\b/i.test(text))
        .filter(({ text }) => {
          const name = /^create\s+policy\s+("[^"]+"|\S+)/i.exec(text)?.[1]?.replace(/"/g, '');
          return !name || !dropped.has(name);
        })
        .map(({ line, text }) => `${line}: ${text}`);
      expect(offenders).toEqual([]);
    },
  );

  it.each(files.map((f) => [f.name, f] as const))(
    '%s — كل create trigger مسبوق بـ drop trigger if exists',
    (_name, file) => {
      const lines = statementLines(file.body);
      const dropped = new Set(
        lines
          .map(({ text }) => /^drop\s+trigger\s+if\s+exists\s+(\S+)/i.exec(text)?.[1])
          .filter((n): n is string => Boolean(n)),
      );
      const offenders = lines
        .filter(({ text }) => /^create\s+trigger\b/i.test(text))
        .filter(({ text }) => {
          const name = /^create\s+trigger\s+(\S+)/i.exec(text)?.[1];
          return !name || !dropped.has(name);
        })
        .map(({ line, text }) => `${line}: ${text}`);
      expect(offenders).toEqual([]);
    },
  );

  it.each(files.map((f) => [f.name, f] as const))(
    '%s — كل create function و create view بصيغة OR REPLACE',
    (_name, file) => {
      const offenders = statementLines(file.body)
        .filter(({ text }) => /^create\s+(?!or\s+replace)/i.test(text))
        .filter(({ text }) => /^create\s+(\w+\s+)*?(function|view)\b/i.test(text))
        .map(({ line, text }) => `${line}: ${text}`);
      expect(offenders).toEqual([]);
    },
  );
});

describe('ما يعد به الملف يطابق ما يفعله', () => {
  it('لا يعد أي ملف بأنه يُشغَّل "مرة واحدة" وهو idempotent', () => {
    for (const file of files) {
      const header = file.body.split('begin;')[0] ?? file.body;
      expect(header).not.toMatch(/مرة\s+واحدة/);
    }
  });

  it('apply_pending يسرد بالضبط الترحيلات التي يحتويها', () => {
    const pending = files.find((f) => f.name === 'apply_pending.sql')!;
    const listed = [...pending.body.matchAll(/^--\s+(\d{14})\s/gm)].map((m) => m[1]);
    const included = [...pending.body.matchAll(/^--\s(\d{14})_[\w-]+\.sql$/gm)].map((m) => m[1]);
    expect(new Set(listed)).toEqual(new Set(included));
    expect(listed.length).toBeGreaterThan(0);
  });

  it('apply_pending و apply_all كلاهما داخل معاملة واحدة', () => {
    for (const name of ['apply_pending.sql', 'apply_all.sql']) {
      const body = files.find((f) => f.name === name)!.body;
      expect(body).toMatch(/^begin;$/m);
      expect(body).toMatch(/^commit;$/m);
    }
  });

  it('لا يحذف أي ملف SQL جدولًا أو عمودًا أو صفًا', () => {
    for (const file of files) {
      const destructive = statementLines(file.body)
        .filter(({ text }) =>
          /^(drop\s+(table|column|schema|database)|truncate|delete\s+from)\b/i.test(text) ||
          /\bdrop\s+column\b/i.test(text),
        )
        .map(({ line, text }) => `${file.name}:${line}: ${text}`);
      expect(destructive).toEqual([]);
    }
  });

  it('لا يعطّل أي ملف RLS', () => {
    for (const file of files) {
      expect(file.body).not.toMatch(/disable\s+row\s+level\s+security/i);
    }
  });

  /**
   * الاستثناء الوحيد المسموح في مخطط auth هو مُشغِّل إنشاء الملف
   * الشخصي على auth.users — وهو النمط الموثّق من Supabase نفسها،
   * وبدونه لا يحصل المستخدم الجديد على صف في profiles إطلاقًا.
   * ما عداه ممنوع: لا تعديل جدول، ولا حذف، ولا لمس بيانات.
   */
  const AUTH_TRIGGER = 'on_auth_user_created';

  it('لا يلمس أي ملف مخطط auth إلا بمُشغِّل إنشاء الملف الشخصي', () => {
    for (const file of files) {
      const touches = statementLines(file.body)
        .filter(({ text }) => /\bauth\.(users|sessions|identities|refresh_tokens)\b/i.test(text))
        .filter(({ text }) => /^(alter|drop|truncate|delete\s+from|update|create)\b/i.test(text))
        .filter(({ text }) => !text.includes(AUTH_TRIGGER))
        .map(({ line, text }) => `${file.name}:${line}: ${text}`);
      expect(touches).toEqual([]);
    }
  });

  it('لا يعدّل أي ملف جداول auth نفسها ولا بياناتها', () => {
    for (const file of files) {
      const mutations = statementLines(file.body)
        .filter(({ text }) =>
          /^(alter\s+table|drop\s+table|truncate|delete\s+from|update)\s+(only\s+)?auth\./i.test(text),
        )
        .map(({ line, text }) => `${file.name}:${line}: ${text}`);
      expect(mutations).toEqual([]);
    }
  });
});
