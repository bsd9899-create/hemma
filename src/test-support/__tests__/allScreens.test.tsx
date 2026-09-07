/**
 * تشغيل فعلي لكل شاشة في التطبيق.
 *
 * هذا ليس فحص أنواع: كل شاشة تُركَّب بمكوّناتها وخطافاتها الحقيقية، ثم
 * يُضغَط كل عنصر تفاعلي فيها. يكشف ما لا يكشفه tsc إطلاقًا:
 *   - شاشة تنهار عند بيانات ناقصة أو فارغة
 *   - زر يرمي استثناءً عند الضغط
 *   - NaN أو undefined أو null معروضة للمستخدم
 *   - عنصر تفاعلي بلا تسمية وصول
 *
 * الشاشات تعمل على بيانات فارغة عمدًا: الحالة الفارغة هي أول ما يراه
 * مستخدم جديد وأكثر ما يُنسى في الاختبار اليدوي.
 */
import { act } from '@testing-library/react-native';
import {
  completeGoals as mockCompleteGoals,
  testExercise as mockTestExercise,
  testProfile as mockTestProfile,
} from '../mocks';

const mockRouter = {
  push: jest.fn(), replace: jest.fn(), back: jest.fn(),
  canDismiss: jest.fn(() => true), dismissAll: jest.fn(), canGoBack: jest.fn(() => true),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: '33333333-3333-4333-8333-333333333333' }),
  useSegments: () => ['(tabs)'],
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
  Link: ({ children }: { children: unknown }) => children,
  Redirect: () => null,
  Stack: Object.assign(() => null, { Screen: () => null }),
  Tabs: Object.assign(() => null, { Screen: () => null }),
}));

jest.mock('@/src/features/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ session: { user: { id: '11111111-1111-4111-8111-111111111111', email: 'a@test.com' } } }),
  signOut: jest.fn(async () => undefined),
}));

jest.mock('@/src/features/auth/profileStore', () => ({
  useProfileStore: Object.assign(
    (sel: (s: unknown) => unknown) =>
      sel({ profile: mockProfileRef.current, isLoading: false, hasLoaded: true, loadError: null,
            fetch: jest.fn(), clear: jest.fn() }),
    { getState: () => ({ profile: mockProfileRef.current, fetch: jest.fn() }) }
  ),
}));

// مرجع قابل للتبديل حتى نختبر حالة الأدمن وغير الأدمن بنفس التمويه.
const mockProfileRef = { current: null as unknown };

jest.mock('@/src/data/repositories/goalsRepository', () => {
  const actual = jest.requireActual('@/src/data/repositories/goalsRepository');
  return {
    ...actual,
    goalsRepository: {
      ...actual.goalsRepository,
      getCurrent: jest.fn(async () => mockGoalsRef.current),
      updateTargets: jest.fn(async () => mockGoalsRef.current),
    },
  };
});
const mockGoalsRef = { current: null as unknown };

jest.mock('@/src/data/repositories/dailyLogsRepository', () => ({
  dailyLogsRepository: {
    getTodaySteps: jest.fn(async () => 0),
    getTodayWorkoutMinutes: jest.fn(async () => 0),
    getTodayMeals: jest.fn(async () => []),
    getTodaySleepHours: jest.fn(async () => null),
    getRecentProgress: jest.fn(async () => []),
    addNutritionLog: jest.fn(async () => undefined),
    addWorkout: jest.fn(async () => undefined),
    setStepsToday: jest.fn(async () => undefined),
    setSleepToday: jest.fn(async () => undefined),
    addWeight: jest.fn(async () => undefined),
  },
}));

jest.mock('@/src/data/repositories/dailyProgressRepository', () => ({
  dailyProgressRepository: { upsertToday: jest.fn(async () => undefined) },
}));

jest.mock('@/src/data/repositories/progressRepository', () => ({
  progressRepository: {
    getCompletionHistory: jest.fn(async () => []),
    getWeightTrend: jest.fn(async () => ({ latestKg: null, earliestKg: null })),
    getWorkoutCount: jest.fn(async () => 0),
    getAverageCompletionInRange: jest.fn(async () => 0),
    getAverageSteps: jest.fn(async () => 0),
    getWeeklyRawAverages: jest.fn(async () => ({ avgWorkoutMinutes: 0, avgSteps: 0, avgSleepHours: 0 })),
    getLatestWeightKg: jest.fn(async () => null),
  },
}));

jest.mock('@/src/data/repositories/teamsRepository', () => ({
  teamsRepository: {
    getMyTeam: jest.fn(async () => null),
    createTeam: jest.fn(async () => ({ id: 't1', name: 'فريق', invite_code: 'ABC123' })),
    joinByCode: jest.fn(async () => 't1'),
    getRoster: jest.fn(async () => []),
    getLeaderboard: jest.fn(async () => []),
    getPulseToday: jest.fn(async () => null),
    getChallenges: jest.fn(async () => []),
    createChallenge: jest.fn(async () => undefined),
    getMyChallengeProgress: jest.fn(async () => 0),
    upsertMyChallengeProgress: jest.fn(async () => undefined),
  },
}));

jest.mock('@/src/data/repositories/accountabilityRepository', () => ({
  accountabilityRepository: {
    getMyPair: jest.fn(async () => null),
    sendRequest: jest.fn(async () => undefined),
    respond: jest.fn(async () => undefined),
    endPair: jest.fn(async () => undefined),
    getPings: jest.fn(async () => []),
    sendPing: jest.fn(async () => undefined),
  },
}));

jest.mock('@/src/data/repositories/profileRepository', () => ({
  profileRepository: {
    getCurrent: jest.fn(async () => mockProfileRef.current),
    updateCurrent: jest.fn(async () => mockProfileRef.current),
  },
}));

jest.mock('@/src/data/repositories/exerciseRepository', () => ({
  exerciseRepository: {
    list: jest.fn(async () => [mockTestExercise]),
    getById: jest.fn(async () => mockTestExercise),
    getPersonalRecord: jest.fn(async () => null),
    getLastSession: jest.fn(async () => []),
    getHistory: jest.fn(async () => []),
    logSets: jest.fn(async () => undefined),
    listFavourites: jest.fn(async () => []),
    toggleFavourite: jest.fn(async () => undefined),
  },
}));

jest.mock('@/src/data/repositories/adminRepository', () => ({
  adminRepository: { getOverview: jest.fn(async () => ({ users: null, subscriptions: null, activity: [] })) },
}));

jest.mock('@/src/subscriptions/usePremiumStatus', () => ({
  usePremiumStatus: () => ({ isPremium: false, isLoading: false, refresh: jest.fn(async () => undefined) }),
}));

jest.mock('@/src/subscriptions/revenuecat', () => ({
  isRevenueCatConfigured: false,
  getCurrentOfferingPackages: jest.fn(async () => []),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  hasPremiumEntitlement: jest.fn(() => false),
  isPurchaseCancelledError: jest.fn(() => false),
  initPurchases: jest.fn(),
  getCustomerInfo: jest.fn(async () => null),
}));

jest.mock('@/src/integrations/health/useHealthSync', () => ({
  useHealthSync: () => ({ isAvailable: false, isSyncing: false, error: null, syncToday: jest.fn() }),
}));

jest.mock('@/src/features/auth/oauth', () => ({
  signInWithGoogle: jest.fn(async () => ({ cancelled: false })),
  signInWithApple: jest.fn(async () => ({ cancelled: false })),
  isAppleSignInAvailable: jest.fn(async () => true),
}));

jest.mock('@/src/features/auth/api', () => ({
  signOut: jest.fn(async () => undefined),
  deleteAccount: jest.fn(async () => undefined),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: false })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
}));

// eslint-disable-next-line import/first
import { findPressables, renderedText, renderScreen, INTERACTIVE_ROLES } from '../renderScreen';

/** كل الشاشات التي يمكن للمستخدم الوصول إليها. */
const SCREENS: { name: string; load: () => { default: React.ComponentType } }[] = [
  { name: 'sign-in', load: () => require('@/app/(auth)/sign-in') },
  { name: 'onboarding', load: () => require('@/app/onboarding') },
  { name: 'today', load: () => require('@/app/(tabs)/index') },
  { name: 'nutrition', load: () => require('@/app/(tabs)/nutrition') },
  { name: 'progress', load: () => require('@/app/(tabs)/progress') },
  { name: 'profile', load: () => require('@/app/(tabs)/profile') },
  { name: 'quick-add', load: () => require('@/app/quick-add') },
  { name: 'goals', load: () => require('@/app/goals') },
  { name: 'profile-edit', load: () => require('@/app/profile-edit') },
  { name: 'paywall', load: () => require('@/app/paywall') },
  { name: 'admin', load: () => require('@/app/admin') },
  { name: 'not-found', load: () => require('@/app/+not-found') },
  { name: 'teams', load: () => require('@/app/teams/index') },
  { name: 'teams/create', load: () => require('@/app/teams/create') },
  { name: 'teams/join', load: () => require('@/app/teams/join') },
  { name: 'teams/new-challenge', load: () => require('@/app/teams/new-challenge') },
  { name: 'accountability', load: () => require('@/app/accountability/index') },
  { name: 'exercises', load: () => require('@/app/exercises/index') },
  { name: 'exercises/detail', load: () => require('@/app/exercises/[id]') },
  { name: 'exercises/log', load: () => require('@/app/exercises/[id]/log') },
  { name: 'log/weight', load: () => require('@/app/log/weight') },
  { name: 'log/steps', load: () => require('@/app/log/steps') },
  { name: 'log/sleep', load: () => require('@/app/log/sleep') },
  { name: 'log/nutrition', load: () => require('@/app/log/nutrition') },
  { name: 'log/workout', load: () => require('@/app/log/workout') },
  { name: 'log/food-photo', load: () => require('@/app/log/food-photo') },
];

/** هل داخل هذه العقدة نص يقرؤه قارئ الشاشة؟ */
function hasVisibleText(node: { children?: unknown[] }): boolean {
  const stack: unknown[] = [...(node.children ?? [])];
  while (stack.length) {
    const item = stack.pop();
    if (typeof item === 'string' && /[؀-ۿa-zA-Z0-9]/.test(item)) return true;
    if (item && typeof item === 'object' && 'children' in item) {
      const kids = (item as { children?: unknown[] }).children;
      if (Array.isArray(kids)) stack.push(...kids);
    }
  }
  return false;
}

async function mount(load: () => { default: React.ComponentType }) {
  const Screen = load().default;
  const view = renderScreen(<Screen />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return view;
}

beforeEach(() => {
  mockGoalsRef.current = mockCompleteGoals;
  mockProfileRef.current = mockTestProfile;
  Object.values(mockRouter).forEach((fn) => fn.mockClear?.());
});

/**
 * تبويب "إضافة" شاشة إعادة توجيه بحتة (<Redirect/>): لا تعرض شيئًا
 * بحكم التصميم، فالضغطة عليه تُفتح quick-add كـ modal عبر tabPress.
 * تُختبر على حدة بدل إخضاعها لتوقّعات شاشة عادية.
 */
describe('تبويب الإضافة', () => {
  it('يعيد التوجيه بلا عرض محتوى', async () => {
    const view = await mount(() => require('@/app/(tabs)/add'));
    expect(view.toJSON()).toBeNull();
  });
});

describe.each(SCREENS)('شاشة $name', ({ load }) => {
  it('تُركَّب وتُعرَض بلا انهيار', async () => {
    const view = await mount(load);
    expect(view.toJSON()).not.toBeNull();
  });

  it('لا تعرض NaN ولا undefined ولا null كنص للمستخدم', async () => {
    const view = await mount(load);
    const text = renderedText(view);
    expect(text).not.toMatch(/NaN/);
    expect(text).not.toMatch(/\bundefined\b/);
    expect(text).not.toMatch(/\bnull\b/);
  });

  it('كل عنصر تفاعلي يُضغَط بلا استثناء غير مُمسَك', async () => {
    const view = await mount(load);
    // نعيد الاستعلام بعد كل ضغطة: ضغطة قد تغيّر الحالة فتُلغي تركيب
    // عقد كنا التقطناها، والضغط على عقدة مُلغاة خطأ في الاختبار لا في
    // التطبيق. نحدّ العدد لتفادي حلقة لا تنتهي عند إعادة العرض.
    const seen = new Set<() => void>();
    for (let round = 0; round < 40; round++) {
      const next = findPressables(view).find((n) => !seen.has(n.props.onPress));
      if (!next) break;
      const handler = next.props.onPress;
      seen.add(handler);
      await act(async () => {
        handler();
      });
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('كل عنصر بدور تفاعلي يحمل تسمية وصول', async () => {
    const view = await mount(load);
    const unlabelled = view.UNSAFE_root
      .findAll((n) => INTERACTIVE_ROLES.includes(n.props?.accessibilityRole))
      .filter((n) => {
        const label = n.props?.accessibilityLabel;
        if (typeof label === 'string' && label.trim()) return false;
        // نص ظاهر داخل العنصر يكفي كتسمية لقارئ الشاشة. نمشي على
        // الأبناء يدويًا: JSON.stringify يرمي على مراجع Fiber الدائرية.
        return !hasVisibleText(n);
      });
    expect(unlabelled.map((n) => n.props?.accessibilityRole)).toEqual([]);
  });
});
