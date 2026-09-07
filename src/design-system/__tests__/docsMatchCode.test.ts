import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { palette } from '../colors';

/**
 * الوثائق تتقادم بصمت، وهذه بالذات تُقرأ عند لحظة لا تحتمل الخطأ: رفع
 * التطبيق للمتجر. كانت قائمة المراجعة تقول "دمبل ذهبي" بعد تقاعد اللون
 * الذهبي بأسبوع، وتذكر باقة سنوية أُلغيت، وتصف الأسعار بأنها placeholder
 * في الكود وهي تأتي من المتجر.
 *
 * لا يمكن فحص نثر الوثيقة، لكن يمكن فحص الحقائق التي تدّعيها.
 */
const DOCS = join(__dirname, '../../../docs');
const docs = Object.fromEntries(
  readdirSync(DOCS)
    .filter((f) => f.endsWith('.md'))
    .map((f) => [f, readFileSync(join(DOCS, f), 'utf8')]),
);
/**
 * وثائق **تصف الحالة الحالية**، فيُقاس عليها. تُستثنى منها الوثائق التي
 * تحكي ما جرى: HANDOFF_AR.md مراجعة تسرد الألوان المتقاعدة بأسمائها لأن
 * تقاعدها هو موضوعها — ذكرها هناك توثيق لا وصفة.
 */
const HISTORICAL = ['HANDOFF_AR.md'];

const allDocs = Object.entries(docs).filter(([name]) => !HISTORICAL.includes(name));

describe('لا وثيقة تصف هوية متقاعدة', () => {
  /** كل لون خرج من الهوية. ذكره في وثيقة يوجّه القارئ إلى ماضٍ ملغى. */
  const RETIRED = ['#0F3D3E', '#2E7D64', '#D9C3A6', '#C8A15A', '#1A1A1A'];

  it.each(allDocs)('%s لا تذكر لونًا متقاعدًا', (_name, body) => {
    expect(RETIRED.filter((hex) => body.toUpperCase().includes(hex))).toEqual([]);
  });

  it.each(allDocs)('%s لا تصف الدمبل بأنه ذهبي', (_name, body) => {
    expect(body).not.toMatch(/دمبل ذهبي|الدمبل الذهبي/);
  });

  it('الألوان المذكورة في الوثائق هي ألوان الهوية الثلاثة', () => {
    const official = [palette.green900, palette.ivory50, palette.sage400].map((c) => c.toUpperCase());
    for (const [name, body] of allDocs) {
      const mentioned = (body.toUpperCase().match(/#[0-9A-F]{6}\b/g) ?? []).filter(
        (hex) => !official.includes(hex),
      );
      // ألوان مشتقّة موثّقة في colors.ts مسموحة؛ ما عداها انحراف.
      const derived = Object.values(palette).map((c) => c.toUpperCase());
      expect({ [name]: mentioned.filter((hex) => !derived.includes(hex)) }).toEqual({ [name]: [] });
    }
  });
});

describe('لا وثيقة تصف تسعيرًا ملغى', () => {
  /** الأسعار النهائية. أي ذكر لباقة سنوية أو لسعر قديم خطأ. */
  const CANCELLED = [/سنوي/, /سنويًا/, /\b99\.99\b/, /\b199\.99\b/];

  it.each(allDocs.filter(([name]) => /APP_STORE|HANDOFF|BACKEND/.test(name)))(
    '%s لا تذكر باقة سنوية ولا سعرًا ملغى',
    (_name, body) => {
      expect(CANCELLED.filter((pattern) => pattern.test(body)).map(String)).toEqual([]);
    },
  );

  it('وثيقة المتجر تحمل السعرين النهائيين', () => {
    const body = docs['APP_STORE_METADATA.md'];
    expect(body).toContain('19.99');
    expect(body).toContain('49.99');
  });

  /**
   * الكود يقرأ نوع الحزمة لا معرّف المنتج، فتسمية النوع خطأً تُخفي
   * الباقة من جدار الدفع بلا أي رسالة. الوثيقة يجب أن تقولها بالحرف.
   */
  it('وثيقة المتجر تسمّي نوعَي الحزمة والاستحقاق حرفيًا', () => {
    const body = docs['APP_STORE_METADATA.md'];
    expect(body).toContain('MONTHLY');
    expect(body).toContain('THREE_MONTH');
    expect(body).toContain('premium');
  });
});

describe('الروابط المعلنة موجودة فعلًا في الموقع', () => {
  const SITE = join(__dirname, '../../../website');
  const pages = readdirSync(SITE).filter((f) => f.endsWith('.html'));

  it('كل صفحة يشير إليها دليل المتجر منشورة في website/', () => {
    const body = docs['APP_STORE_METADATA.md'];
    const referenced = [...body.matchAll(/himmah\.online\/([\w.-]+\.html)/g)].map((m) => m[1]);
    expect(referenced.length).toBeGreaterThan(0);
    expect(referenced.filter((page) => !pages.includes(page))).toEqual([]);
  });
});
