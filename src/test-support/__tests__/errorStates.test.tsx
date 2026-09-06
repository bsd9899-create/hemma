/**
 * ماذا يرى المستخدم حين يفشل الجلب؟
 *
 * الحالة الفارغة تُختبر في allScreens؛ هذا يختبر **الفشل**: كل شاشة
 * تجلب بيانات يجب أن تعرض شيئًا مفهومًا وطريقًا للخروج، لا شاشة بيضاء
 * صامتة ولا رسالة Postgres خامًا بالإنجليزية.
 */
import { act } from '@testing-library/react-native';
import { testProfile as mockTestProfile } from '../mocks';

const mockRouter = {
  push: jest.fn(), replace: jest.fn(), back: jest.fn(),
  canDismiss: jest.fn(() => true), dismissAll: jest.fn(), canGoBack: jest.fn(() => true),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: '33333333-3333-4333-8333-333333333333' }),
  useSegments: () => ['(tabs)'],
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(cb, [cb]); },
  Link: ({ children }: { children: unknown }) => children,
  Redirect: () => null,
  Stack: Object.assign(() => null, { Screen: () => null }),
}));

jest.mock('@/src/features/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ session: { user: { id: '11111111-1111-4111-8111-111111111111', email: 'a@t.com' } } }),
}));

jest.mock('@/src/features/auth/profileStore', () => ({
  useProfileStore: (sel: (s: unknown) => unknown) =>
    sel({ profile: mockTestProfile, isLoading: false, hasLoaded: true, loadError: null,
          fetch: jest.fn(), clear: jest.fn() }),
}));

/** خطأ Postgres حقيقي — رسالته الخام يجب ألا تصل المستخدم أبدًا. */
const mockPgError = Object.assign(new Error('permission denied for table user_goals'), {
  code: '42501',
  details: null,
  hint: null,
});

jest.mock('@/src/data/repositories/goalsRepository', () => {
  const actual = jest.requireActual('@/src/data/repositories/goalsRepository');
  return { ...actual, goalsRepository: { ...actual.goalsRepository,
    getCurrent: jest.fn(async () => { throw mockPgError; }) } };
});
jest.mock('@/src/data/repositories/dailyLogsRepository', () => ({
  dailyLogsRepository: new Proxy({}, { get: () => async () => { throw mockPgError; } }),
}));
jest.mock('@/src/data/repositories/dailyProgressRepository', () => ({
  dailyProgressRepository: { upsertToday: async () => { throw mockPgError; } },
}));
jest.mock('@/src/data/repositories/progressRepository', () => ({
  progressRepository: new Proxy({}, { get: () => async () => { throw mockPgError; } }),
}));
jest.mock('@/src/data/repositories/teamsRepository', () => ({
  teamsRepository: new Proxy({}, { get: () => async () => { throw mockPgError; } }),
}));
jest.mock('@/src/data/repositories/accountabilityRepository', () => ({
  accountabilityRepository: new Proxy({}, { get: () => async () => { throw mockPgError; } }),
}));
jest.mock('@/src/data/repositories/exerciseRepository', () => ({
  exerciseRepository: new Proxy({}, { get: () => async () => { throw mockPgError; } }),
}));
jest.mock('@/src/data/repositories/adminRepository', () => ({
  adminRepository: { getOverview: async () => { throw mockPgError; } },
}));
jest.mock('@/src/subscriptions/usePremiumStatus', () => ({
  usePremiumStatus: () => ({ isPremium: false, isLoading: false, refresh: jest.fn() }),
}));
jest.mock('@/src/subscriptions/revenuecat', () => ({
  isRevenueCatConfigured: true,
  getCurrentOfferingPackages: async () => { throw mockPgError; },
  purchasePackage: jest.fn(), restorePurchases: jest.fn(),
  hasPremiumEntitlement: () => false, isPurchaseCancelledError: () => false,
  initPurchases: jest.fn(), getCustomerInfo: async () => null,
}));
jest.mock('@/src/integrations/health/useHealthSync', () => ({
  useHealthSync: () => ({ isAvailable: false, isSyncing: false, error: null, syncToday: jest.fn() }),
}));

// eslint-disable-next-line import/first
import { renderScreen, renderedText } from '../renderScreen';

const DATA_SCREENS = [
  { name: 'today', load: () => require('@/app/(tabs)/index') },
  { name: 'nutrition', load: () => require('@/app/(tabs)/nutrition') },
  { name: 'progress', load: () => require('@/app/(tabs)/progress') },
  { name: 'goals', load: () => require('@/app/goals') },
  { name: 'teams', load: () => require('@/app/teams/index') },
  { name: 'accountability', load: () => require('@/app/accountability/index') },
  { name: 'exercises', load: () => require('@/app/exercises/index') },
  { name: 'exercises/detail', load: () => require('@/app/exercises/[id]') },
  { name: 'paywall', load: () => require('@/app/paywall') },
  { name: 'admin', load: () => require('@/app/admin') },
];

async function mount(load: () => { default: React.ComponentType }) {
  const Screen = load().default;
  const view = renderScreen(<Screen />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return view;
}

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
