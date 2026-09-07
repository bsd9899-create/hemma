import { inspectRevenueCatKey } from '../apiKey';

/**
 * أسوأ خطأ ممكن في هذا الملف ليس تعطّل الاشتراكات، بل نجاحها بمفتاح
 * سري: SDK يُهيَّأ، والمفتاح يُشحن داخل الحزمة، ويُستخرج منها بأدوات
 * جاهزة. عندها يملك المستخرِج صلاحية القراءة والتعديل على اشتراكات كل
 * المستخدمين.
 */
describe('مفتاح RevenueCat', () => {
  it('يقبل مفتاح SDK العام لآبل', () => {
    expect(inspectRevenueCatKey('appl_AbCdEfGhIjKlMnOpQrSt')).toEqual({ kind: 'valid' });
  });

  it('يتجاهل المسافات حول المفتاح', () => {
    expect(inspectRevenueCatKey('  appl_AbCdEfGhIjKlMnOpQrSt \n').kind).toBe('valid');
  });

  it.each([
    ['مفتاح REST سري', 'sk_AbCdEfGhIjKlMnOpQrStUv'],
    ['بحروف كبيرة', 'SK_AbCdEfGhIjKlMnOpQrStUv'],
  ])('يرفض %s', (_name, key) => {
    expect(inspectRevenueCatKey(key).kind).toBe('secret');
  });

  it.each([
    ['مفتاح Google Play في تطبيق iOS', 'goog_AbCdEfGhIjKlMnOp'],
    ['مفتاح Amazon', 'amzn_AbCdEfGhIjKlMnOp'],
  ])('يرفض %s', (_name, key) => {
    expect(inspectRevenueCatKey(key).kind).toBe('secret');
  });

  it.each([
    ['نص عشوائي', 'my-api-key'],
    ['بادئة صحيحة ومفتاح قصير', 'appl_x'],
    ['بادئة ناقصة', 'AbCdEfGhIjKlMnOpQrSt'],
  ])('يرفض %s كمفتاح مشوّه', (_name, key) => {
    expect(inspectRevenueCatKey(key).kind).toBe('malformed');
  });

  it.each([
    ['غائب', undefined],
    ['null', null],
    ['فارغ', ''],
  ])('%s يعني "غير مضبوط" لا "خطأ"', (_name, key) => {
    expect(inspectRevenueCatKey(key as string).kind).toBe('missing');
  });

  /**
   * الرسالة تُطبع في سجل المطوّر. تسريب المفتاح نفسه فيها يهزم الغرض.
   */
  it('لا يذكر المفتاح نفسه في سبب الرفض', () => {
    const secret = 'sk_ThisIsTheActualSecretValue';
    const verdict = inspectRevenueCatKey(secret);
    expect(verdict.kind).toBe('secret');
    expect(JSON.stringify(verdict)).not.toContain('ThisIsTheActualSecretValue');
  });
});
