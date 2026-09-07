/**
 * ماذا يرى المستخدم حين يفشل الجلب؟
 *
 * الحالة الفارغة تُختبر في allScreens؛ هذا يختبر **الفشل**: كل شاشة
 * تجلب بيانات يجب أن تعرض شيئًا مفهومًا وطريقًا للخروج، لا شاشة بيضاء
 * صامتة ولا رسالة Postgres خامًا بالإنجليزية.
 */
import { renderedText } from '../renderScreen';
import { SCREENS, mockScreenData, mount, resetScreenMocks } from '../screenMocks';

/** خطأ Postgres حقيقي — رسالته الخام يجب ألا تصل المستخدم أبدًا. */
const pgError = Object.assign(new Error('permission denied for table user_goals'), {
  code: '42501',
  details: null,
  hint: null,
});

beforeEach(() => {
  resetScreenMocks();
  mockScreenData.failWith = pgError;
  mockScreenData.revenueCatConfigured = true;
});

/** الشاشات التي تجلب بيانات — تُشتقّ من القائمة المشتركة بأسمائها. */
const DATA_SCREEN_NAMES = [
  'today', 'nutrition', 'progress', 'goals', 'teams',
  'accountability', 'exercises', 'exercises/detail', 'paywall', 'admin',
];
const DATA_SCREENS = SCREENS.filter((screen) => DATA_SCREEN_NAMES.includes(screen.name));



/**
 * انقطاع الشبكة ليس خطأ خادم: رسالته يجب أن تقول للمستخدم إن الاتصال
 * مقطوع، لا «حدث خطأ ما» التي تدفعه لإعادة المحاولة بلا فائدة.
 */
describe('انقطاع الشبكة', () => {
  const offline = new TypeError('Network request failed');

  it('يُترجَم إلى رسالة اتصال لا رسالة خطأ عامة', () => {
    const { getFriendlyErrorMessage } = require('@/src/lib/errors');
    const message = getFriendlyErrorMessage(offline);
    const generic = require('@/src/lib/i18n').default.t('common.genericError');
    expect(message).not.toBe(generic);
    expect(message.length).toBeGreaterThan(0);
  });

  it('لا يخلط انقطاع الشبكة بخطأ صلاحيات', () => {
    const { getFriendlyErrorMessage, isOfflineError } = require('@/src/lib/errors');
    expect(isOfflineError(offline)).toBe(true);
    expect(isOfflineError(pgError)).toBe(false);
    expect(getFriendlyErrorMessage(offline)).not.toBe(getFriendlyErrorMessage(pgError));
  });
});

describe.each(DATA_SCREENS)('فشل الجلب في شاشة $name', ({ load }) => {
  it('لا تنهار الشاشة', async () => {
    const view = await mount(load);
    expect(view.toJSON()).toBeTruthy();
  });

  it('تعرض شيئًا للمستخدم — لا شاشة بيضاء صامتة', async () => {
    const view = await mount(load);
    expect(renderedText(view).trim().length).toBeGreaterThan(0);
  });

  it('لا تسرّب رسالة Postgres الخام ولا اسم جدول', async () => {
    const view = await mount(load);
    const text = renderedText(view);
    expect(text).not.toMatch(/permission denied/i);
    expect(text).not.toMatch(/user_goals/);
    expect(text).not.toMatch(/42501/);
  });
});
