import {
  ALLOWED_MEDIA_TYPES,
  buildUserText,
  MAX_IMAGE_BYTES,
  rejectImage,
  sanitizeResult,
  stripCodeFence,
} from '../functions/_shared/foodAnalysis';

/** طول base64 يقابل حجمًا بالبايت تقريبًا: bytes ≈ length × 3/4. */
const base64OfBytes = (bytes: number) => 'A'.repeat(Math.ceil((bytes * 4) / 3));

describe('قبول الصورة', () => {
  it.each([...ALLOWED_MEDIA_TYPES].map((type) => [type] as const))('يقبل %s', (type) => {
    expect(rejectImage(base64OfBytes(1024), type)).toBeNull();
  });

  it.each([
    ['نوع غير مسموح', 'image/gif'],
    ['نوع غير صوري', 'application/pdf'],
    ['نوع فارغ', ''],
    ['حيلة الامتداد', 'image/jpeg;image/svg+xml'],
  ])('يرفض %s', (_name, mediaType) => {
    expect(rejectImage(base64OfBytes(1024), mediaType)).toBe('invalid_image');
  });

  it.each([
    ['غائبة', undefined],
    ['null', null],
    ['فارغة', ''],
    ['رقم', 12345],
  ])('يرفض صورة %s', (_name, image) => {
    expect(rejectImage(image, 'image/jpeg')).toBe('invalid_image');
  });

  it('يرفض ما يتجاوز الحدّ', () => {
    expect(rejectImage(base64OfBytes(MAX_IMAGE_BYTES + 1024), 'image/jpeg')).toBe('image_too_large');
  });

  it('يقبل ما دون الحدّ مباشرة', () => {
    expect(rejectImage(base64OfBytes(MAX_IMAGE_BYTES - 1024), 'image/jpeg')).toBeNull();
  });

  /**
   * الترتيب مهم: صورة ضخمة بنوع غير مسموح ترجع invalid_image لا
   * image_too_large — الرفض بالنوع أرخص، ورسالته أصدق عن سبب الرفض.
   */
  it('يفحص النوع قبل الحجم', () => {
    expect(rejectImage(base64OfBytes(MAX_IMAGE_BYTES * 2), 'image/gif')).toBe('invalid_image');
  });
});

describe('نص المستخدم', () => {
  it('بلا ملاحظة يرسل الطلب الأساسي', () => {
    expect(buildUserText(undefined)).toBe('حلّل هذه الوجبة.');
    expect(buildUserText('   ')).toBe('حلّل هذه الوجبة.');
  });

  it('يضمّ ملاحظة المستخدم', () => {
    expect(buildUserText('نص صحن')).toContain('نص صحن');
  });

  it('يقصّ الملاحظة الطويلة عند 200 حرف', () => {
    const text = buildUserText('ط'.repeat(500));
    expect(text.length).toBeLessThan(260);
    expect(text).toContain('ط'.repeat(200));
    expect(text).not.toContain('ط'.repeat(201));
  });

  it('يتجاهل ملاحظة ليست نصًا', () => {
    expect(buildUserText({ evil: true })).toBe('حلّل هذه الوجبة.');
  });
});

describe('أسوار markdown', () => {
  it.each([
    ['بلا سور', '{"a":1}'],
    ['سور json', '```json\n{"a":1}\n```'],
    ['سور بلا لغة', '```\n{"a":1}\n```'],
  ])('%s يُقشَّر إلى JSON صالح', (_name, text) => {
    expect(JSON.parse(stripCodeFence(text))).toEqual({ a: 1 });
  });
});

describe('تطهير مخرجات النموذج', () => {
  const valid = {
    items: [{ name_ar: 'أرز', name_en: 'Rice', grams: 200, calories: 260, protein_g: 5, carbs_g: 57, fat_g: 0.5 }],
    confidence: 'high',
    note_ar: 'تقدير تقريبي',
  };

  it('يمرّر نتيجة سليمة كما هي', () => {
    expect(sanitizeResult(valid)).toEqual(valid);
  });

  it.each([
    ['null', null],
    ['نص', 'not json'],
    ['رقم', 42],
    ['مصفوفة', [1, 2]],
    ['كائن بلا items', { confidence: 'high' }],
    ['items ليست مصفوفة', { items: 'كثير' }],
  ])('يرفض %s', (_name, raw) => {
    expect(sanitizeResult(raw)).toBeNull();
  });

  /**
   * مخرجات النموذج مُدخَل غير موثوق. رقم سالب أو ضخم يتسرّب إلى سعرات
   * المستخدم اليومية ويفسدها بلا أي خطأ ظاهر.
   */
  it.each([
    ['سالب', -500, 0],
    ['NaN', NaN, 0],
    ['لا نهائي', Infinity, 0],
    ['أكبر من الحدّ', 999999, 5000],
    ['نص رقمي', '260', 260],
    ['نص غير رقمي', 'كثير', 0],
    ['null', null, 0],
  ])('سعرات %s تُقصّ إلى %s', (_name, input, expected) => {
    const result = sanitizeResult({ items: [{ calories: input }], confidence: 'high' });
    expect(result!.items[0].calories).toBe(expected);
  });

  it('يقصّ كل ماكرو عند حدّه هو', () => {
    const result = sanitizeResult({
      items: [{ grams: 1e9, calories: 1e9, protein_g: 1e9, carbs_g: 1e9, fat_g: 1e9 }],
      confidence: 'high',
    })!;
    expect(result.items[0]).toMatchObject({
      grams: 5000,
      calories: 5000,
      protein_g: 500,
      carbs_g: 1000,
      fat_g: 500,
    });
  });

  it('يقرّب إلى منزلة عشرية واحدة', () => {
    const result = sanitizeResult({ items: [{ protein_g: 12.3456 }], confidence: 'low' })!;
    expect(result.items[0].protein_g).toBe(12.3);
  });

  it('يقصّ عدد الأصناف عند 12', () => {
    const many = Array.from({ length: 40 }, () => ({ name_ar: 'صنف', calories: 10 }));
    expect(sanitizeResult({ items: many, confidence: 'high' })!.items).toHaveLength(12);
  });

  it('يقصّ الأسماء الطويلة عند 120 حرفًا', () => {
    const result = sanitizeResult({ items: [{ name_ar: 'ط'.repeat(400) }], confidence: 'high' })!;
    expect(result.items[0].name_ar).toHaveLength(120);
  });

  it('يحوّل الاسم غير النصي إلى فراغ لا إلى "undefined"', () => {
    const result = sanitizeResult({ items: [{ name_ar: { evil: true } }], confidence: 'high' })!;
    expect(result.items[0].name_ar).toBe('');
  });

  it('عنصر null داخل القائمة لا يُسقط الدالة', () => {
    const result = sanitizeResult({ items: [null, undefined], confidence: 'high' })!;
    expect(result.items).toHaveLength(2);
    expect(result.items[0].calories).toBe(0);
  });

  it.each([
    ['high', 'high'],
    ['medium', 'medium'],
    ['low', 'low'],
    ['قيمة مخترعة', 'low'],
    ['غائبة', 'low'],
  ])('ثقة %s تصبح %s', (_name, expected) => {
    const raw = { items: [], confidence: _name === 'غائبة' ? undefined : _name };
    expect(sanitizeResult(raw)!.confidence).toBe(expected === _name ? expected : 'low');
  });

  it('الثقة العالية لا تُمنح لقيمة غير معروفة', () => {
    expect(sanitizeResult({ items: [], confidence: 'HIGH' })!.confidence).toBe('low');
    expect(sanitizeResult({ items: [], confidence: true })!.confidence).toBe('low');
  });
});
