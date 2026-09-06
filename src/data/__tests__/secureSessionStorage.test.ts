/**
 * المحوّل يخزّن جلسة Supabase في Keychain. الحد ~2048 بايت لكل قيمة،
 * وجلسة حقيقية (JWT + refresh token + بيانات المستخدم) تتجاوزه، فالتقسيم
 * هو ما يجعل الميزة تعمل أصلًا. خطأ فيه يعني خروج كل المستخدمين من
 * حساباتهم بصمت، لذلك يُختبر بمخزن وهمي بدل الاعتماد على القراءة.
 */

const mockSecureStore = new Map<string, string>();
const mockAsyncStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecureStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    // نحاكي حد المنصة الحقيقي: تجاوزه يجب أن يكون مستحيلًا بحكم التقسيم.
    if (v.length > 2048) throw new Error('SecureStore value too large');
    mockSecureStore.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecureStore.delete(k);
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockAsyncStore.get(k) ?? null),
    removeItem: jest.fn(async (k: string) => {
      mockAsyncStore.delete(k);
    }),
  },
}));

// jest.mock يجب أن يسبق الاستيراد حتى يُرفَع قبل تحميل الوحدة، وإلا
// استوردت الوحدة الحقيقية أولًا وفشل المحاكاة.
// eslint-disable-next-line import/first
import { secureSessionStorage } from '../secureSessionStorage';

const KEY = 'sb-abcdefgh-auth-token';

beforeEach(() => {
  mockSecureStore.clear();
  mockAsyncStore.clear();
});

describe('secureSessionStorage', () => {
  it('يحفظ ويسترجع قيمة قصيرة كما هي', async () => {
    await secureSessionStorage.setItem(KEY, 'small');
    expect(await secureSessionStorage.getItem(KEY)).toBe('small');
  });

  it('يحفظ جلسة أكبر من حد المنصة عبر التقسيم', async () => {
    // ~8KB — أكبر بكثير من حد 2048 بايت.
    const session = JSON.stringify({ access_token: 'x'.repeat(4000), refresh_token: 'y'.repeat(4000) });
    await secureSessionStorage.setItem(KEY, session);
    expect(await secureSessionStorage.getItem(KEY)).toBe(session);
  });

  it('لا يترك أي جزء يتجاوز حد المنصة', async () => {
    await secureSessionStorage.setItem(KEY, 'z'.repeat(10000));
    for (const [, value] of mockSecureStore) {
      expect(value.length).toBeLessThanOrEqual(2048);
    }
  });

  it('يهاجر جلسة قائمة من AsyncStorage فلا يخرج المستخدم من حسابه', async () => {
    mockAsyncStore.set(KEY, 'existing-session');
    expect(await secureSessionStorage.getItem(KEY)).toBe('existing-session');
    // بعد الهجرة تُقرأ من Keychain وتُحذف من المخزن القديم.
    expect(mockAsyncStore.has(KEY)).toBe(false);
    expect(await secureSessionStorage.getItem(KEY)).toBe('existing-session');
  });

  it('يعيد null حين لا توجد جلسة في أي مخزن', async () => {
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('يمسح كل الأجزاء عند تسجيل الخروج بلا بقايا', async () => {
    await secureSessionStorage.setItem(KEY, 'w'.repeat(6000));
    await secureSessionStorage.removeItem(KEY);
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
    expect(mockSecureStore.size).toBe(0);
  });

  it('لا يُبقي أجزاء قديمة عند استبدال قيمة أطول بأقصر', async () => {
    await secureSessionStorage.setItem(KEY, 'a'.repeat(6000));
    await secureSessionStorage.setItem(KEY, 'short');
    expect(await secureSessionStorage.getItem(KEY)).toBe('short');
  });

  it('يعامل القيمة الناقصة (جزء مفقود) كغياب لا كجلسة نصفية', async () => {
    await secureSessionStorage.setItem(KEY, 'b'.repeat(6000));
    // احذف جزءًا وسطيًا لمحاكاة كتابة انقطعت.
    const chunkKey = [...mockSecureStore.keys()].find((k) => k.endsWith('__1'));
    mockSecureStore.delete(chunkKey!);
    // جلسة نصفية يرفضها Supabase برسالة غامضة — الغياب أنظف.
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });
});
