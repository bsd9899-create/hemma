import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * ‏`database.types.ts` مكتوب يدويًا ليطابق `supabase/migrations/`. لا شيء
 * يفرض هذا التطابق: TypeScript لا يصل إلى قاعدة البيانات، وPostgREST
 * يُرجع ما عنده لا ما يقوله النوع. عمود يعده النوع `number` وهو غير
 * موجود في القاعدة يصل `undefined`، ثم ينهار أول `.toLocaleString()`
 * يلمسه — وهذا حرفيًا ما حدث في شاشة اليوم.
 *
 * فالمقارنة هنا بين مصدرين مستقلين: المخطط كما تبنيه ملفات SQL،
 * والأنواع كما يصدّقها التطبيق. أي انحراف بينهما يفشل هنا بدل أن يفشل
 * على جهاز مستخدم.
 */

const SQL_DIR = join(__dirname, '../../../supabase/migrations');
const TYPES_FILE = join(__dirname, '../database.types.ts');

// ── المخطط الحقيقي، مبنيًّا من ملفات الترحيل بالترتيب ──────────────

/** يقصّ نصًّا متوازن الأقواس ابتداءً من أول قوس مفتوح. */
function balanced(text: string, from: number): string {
  let depth = 0;
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(from + 1, i);
    }
  }
  return '';
}

/** يقسّم على الفواصل العليا فقط — لا الفواصل داخل numeric(6, 1). */
function topLevelParts(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of body) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

const CONSTRAINT_KEYWORDS = /^(primary|foreign|unique|check|constraint|exclude)\b/i;

function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

function buildSchema(): Map<string, Set<string>> {
  const schema = new Map<string, Set<string>>();
  const files = readdirSync(SQL_DIR).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = stripComments(readFileSync(join(SQL_DIR, file), 'utf8'));

    // create table if not exists public.NAME ( ... )
    const tableRe = /create\s+table\s+if\s+not\s+exists\s+public\.(\w+)\s*\(/gi;
    let match: RegExpExecArray | null;
    while ((match = tableRe.exec(sql)) !== null) {
      const columns = new Set<string>();
      for (const part of topLevelParts(balanced(sql, match.index + match[0].length - 1))) {
        const first = part.trim().split(/\s+/)[0];
        if (first && !CONSTRAINT_KEYWORDS.test(part.trim())) columns.add(first);
      }
      schema.set(match[1], columns);
    }

    // alter table public.NAME add column if not exists COL ...
    const alterRe = /alter\s+table\s+public\.(\w+)\s*([\s\S]*?);/gi;
    while ((match = alterRe.exec(sql)) !== null) {
      const table = schema.get(match[1]);
      if (!table) continue;
      const addRe = /add\s+column\s+if\s+not\s+exists\s+(\w+)/gi;
      let add: RegExpExecArray | null;
      while ((add = addRe.exec(match[2])) !== null) table.add(add[1]);
    }
  }
  return schema;
}

/** أعمدة كل view، مأخوذة من أسماء الأعمدة المعلنة أو من أسماء المستعارة. */
function buildViews(): Map<string, Set<string>> {
  const views = new Map<string, Set<string>>();
  const files = readdirSync(SQL_DIR).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = stripComments(readFileSync(join(SQL_DIR, file), 'utf8'));
    const viewRe = /create\s+or\s+replace\s+view\s+public\.(\w+)([\s\S]*?)\bas\b([\s\S]*?);\s*(?=\n|$)/gi;
    let match: RegExpExecArray | null;
    while ((match = viewRe.exec(sql)) !== null) {
      const [, name, , body] = match;
      const selectStart = body.search(/\bselect\b/i);
      if (selectStart < 0) continue;
      const fromIndex = body.toLowerCase().indexOf('\nfrom', selectStart);
      const list = body.slice(selectStart + 6, fromIndex > 0 ? fromIndex : undefined);
      const columns = new Set<string>();
      for (const part of topLevelParts(list)) {
        const alias = /\bas\s+(\w+)\s*$/i.exec(part.trim());
        if (alias) {
          columns.add(alias[1]);
          continue;
        }
        const bare = /(?:^|\.)(\w+)\s*$/.exec(part.trim());
        if (bare) columns.add(bare[1]);
      }
      views.set(name, columns);
    }
  }
  return views;
}

// ── الأنواع كما يصدّقها التطبيق ─────────────────────────────────────

/**
 * يقرأ كتل Row من database.types.ts. الصياغتان كلتاهما مستعملتان في
 * الملف — سطر واحد لجدول صغير وعدة أسطر لجدول كبير — فالقارئ يوازن
 * الأقواس بدل أن يفترض شكلًا واحدًا. قارئ يفترض الأسطر المتعددة يتخطّى
 * الجداول أحادية السطر بصمت، فيمرّ الاختبار وهو لا يفحص شيئًا.
 */
function rowsIn(section: string): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const entryRe = /^ {6}(\w+): \{/gm;
  let match: RegExpExecArray | null;

  while ((match = entryRe.exec(section)) !== null) {
    const rowIndex = section.indexOf('Row:', match.index);
    if (rowIndex < 0) continue;
    const braceIndex = section.indexOf('{', rowIndex);
    if (braceIndex < 0) continue;

    let depth = 0;
    let close = -1;
    for (let i = braceIndex; i < section.length; i += 1) {
      if (section[i] === '{') depth += 1;
      else if (section[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close < 0) continue;

    const columns = new Set(
      section
        .slice(braceIndex + 1, close)
        .split(/[;\n]/)
        .map((piece) => /^\s*(\w+)\??\s*:/.exec(piece)?.[1])
        .filter((name): name is string => Boolean(name)),
    );
    if (columns.size > 0) result.set(match[1], columns);
  }
  return result;
}

const schema = buildSchema();
const views = buildViews();
const source = readFileSync(TYPES_FILE, 'utf8');

const tablesSection = source.slice(source.indexOf('Tables: {'), source.indexOf('Views: {'));
const viewsSection = source.slice(source.indexOf('Views: {'));

const declaredTables = rowsIn(tablesSection);
const declaredViews = rowsIn(viewsSection);

function appFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...appFiles(path));
    } else if (/\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

const ROOT = join(__dirname, '../../..');
const sources = [...appFiles(join(ROOT, 'src')), ...appFiles(join(ROOT, 'app'))];

describe('الأنواع تطابق المخطط الحقيقي', () => {
  it('الترحيلات تُقرأ فعلًا (حارس ضد اختبار يمرّ لأنه لم يجد شيئًا)', () => {
    expect(schema.size).toBeGreaterThan(15);
    expect(views.size).toBeGreaterThan(3);
    expect(declaredTables.size).toBeGreaterThan(15);
    expect(declaredViews.size).toBeGreaterThan(3);
  });

  it.each([...declaredTables.keys()].map((t) => [t] as const))(
    'الجدول %s موجود في الترحيلات',
    (table) => {
      expect([...schema.keys()]).toContain(table);
    },
  );

  it.each([...declaredTables.entries()].map(([t, c]) => [t, c] as const))(
    'كل عمود يعِد به النوع موجود فعلًا في الجدول %s',
    (table, columns) => {
      const actual = schema.get(table);
      expect(actual).toBeDefined();
      const missing = [...columns].filter((c) => !actual!.has(c));
      expect(missing).toEqual([]);
    },
  );

  it.each([...declaredTables.entries()].map(([t, c]) => [t, c] as const))(
    'كل عمود في الجدول %s معلَن في النوع (لا عمود منسيّ)',
    (table, columns) => {
      const actual = schema.get(table);
      expect(actual).toBeDefined();
      const undeclared = [...actual!].filter((c) => !columns.has(c));
      expect(undeclared).toEqual([]);
    },
  );

  /**
   * جدول موجود في القاعدة وغير معلَن في الأنواع لا يُكتشف بالمقارنة
   * أعلاه، لأنها تدور على المُعلَن لا على الموجود. فالجداول التي لا
   * يلمسها التطبيق تُسمّى هنا صراحةً بسببها: إسقاطها بالصمت يعني أن
   * جدولًا جديدًا نسي أحدهم كتابة نوعه يمرّ بلا اعتراض.
   */
  const SERVER_ONLY_TABLES: Record<string, string> = {
    food_analysis_usage:
      'تكتبه دالة analyze-food بدور service_role لعدّ الحدّ اليومي. التطبيق لا يقرأه ولا يكتبه، فلا نوع له.',
  };

  it('كل جدول في القاعدة إما معلَن في الأنواع أو مُبرَّر كجدول خادم', () => {
    const unexplained = [...schema.keys()].filter(
      (table) => !declaredTables.has(table) && !(table in SERVER_ONLY_TABLES),
    );
    expect(unexplained).toEqual([]);
  });

  it('كل جدول مستثنى ما زال موجودًا فعلًا (لا استثناء ميت)', () => {
    const stale = Object.keys(SERVER_ONLY_TABLES).filter((table) => !schema.has(table));
    expect(stale).toEqual([]);
  });

  it('لا يستعلم التطبيق عن أي جدول خادم', () => {
    const leaked: string[] = [];
    for (const file of sources) {
      const body = readFileSync(file, 'utf8');
      for (const match of body.matchAll(/\.from\('(\w+)'\)/g)) {
        if (match[1] in SERVER_ONLY_TABLES) leaked.push(`${file.replace(ROOT, '')}: ${match[1]}`);
      }
    }
    expect(leaked).toEqual([]);
  });

  it.each([...declaredViews.keys()].map((v) => [v] as const))(
    'الـview %s موجود في الترحيلات',
    (view) => {
      expect([...views.keys()]).toContain(view);
    },
  );
});

// ── ما يستعلمه الكود فعلًا ──────────────────────────────────────────

describe('كل استعلام في التطبيق يشير إلى شيء موجود', () => {
  it('كل .from() يسمّي جدولًا أو view موجودًا في الترحيلات', () => {
    const known = new Set([...schema.keys(), ...views.keys()]);
    const unknown: string[] = [];
    for (const file of sources) {
      const body = readFileSync(file, 'utf8');
      for (const match of body.matchAll(/\.from\('(\w+)'\)/g)) {
        if (!known.has(match[1])) unknown.push(`${file.replace(ROOT, '')}: ${match[1]}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it('كل .from() يسمّي جدولًا أو view معلَنًا في database.types.ts', () => {
    const declared = new Set([...declaredTables.keys(), ...declaredViews.keys()]);
    const undeclared: string[] = [];
    for (const file of sources) {
      const body = readFileSync(file, 'utf8');
      for (const match of body.matchAll(/\.from\('(\w+)'\)/g)) {
        if (!declared.has(match[1])) undeclared.push(`${file.replace(ROOT, '')}: ${match[1]}`);
      }
    }
    expect(undeclared).toEqual([]);
  });
});
