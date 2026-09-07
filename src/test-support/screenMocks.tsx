/**
 * تمويه طبقة البيانات لكل الشاشات، في مكان واحد.
 *
 * كان هذا كله داخل allScreens.test.tsx، فلم يكن أمام أي اختبار آخر إلا
 * نسخه — ونسختان من المموّهات تنحرفان، وقد انحرفت الأولى فعلًا إلى
 * أسماء دوال غير موجودة. الآن ملف واحد، وكل اختبار يبدّل البيانات عبر
 * المراجع المصدَّرة أدناه بدل إعادة تعريف الطبقة.
 *
 * يجب أن يُستورد **قبل** أي شاشة: jest.mock هنا تُسجَّل عند استيراد هذا
 * الملف، والشاشات تُحمَّل بـ require كسولة داخل الاختبارات.
 */
import { act } from '@testing-library/react-native';
import {
  completeGoals as mockCompleteGoals,
  testExercise as mockTestExercise,
  testProfile as mockTestProfile,
} from './mocks';

/**
 * البيانات التي تُرجعها المستودعات المموّهة. الاختبار يبدّلها قبل
 * التركيب، فتُشغَّل الشاشة نفسها على حالة فارغة أو ممتلئة بلا نسخ
 * طبقة التمويه مرتين. البادئة mock مطلوبة: jest.mock لا تسمح لمصنعها
 * بالإشارة إلى متغيّر خارجي بدونها.
 */
export const mockScreenData = {
  history: [] as unknown[],
  weightTrend: { latestKg: null as number | null, earliestKg: null as number | null },
  workoutCount: 0,
  averageSteps: 0,
  averageCompletion: 0,
  weeklyRaw: { avgWorkoutMinutes: 0, avgSteps: 0, avgSleepHours: 0 },
  latestWeightKg: null as number | null,
  todaySteps: 0,
  todayWorkoutMinutes: 0,
  todayMeals: [] as unknown[],
  todaySleepHours: null as number | null,
  team: null as unknown,
  roster: [] as unknown[],
  leaderboard: [] as unknown[],
  challenges: [] as unknown[],
  pulseToday: null as number | null,
  challengeProgress: 0,
  pair: null as unknown,
  pings: [] as unknown[],
  exercises: [] as unknown[],
  favorites: [] as string[],
  personalRecord: null as unknown,
  recentSets: [] as unknown[],
  adminOverview: { users: null as unknown, subscriptions: null as unknown, activity: [] as unknown[] },
  /** حالة RevenueCat: جدار الدفع يعرض شاشة بديلة كاملة ما لم تُضبط. */
  revenueCatConfigured: false,
  revenueCatPackages: [] as unknown[],
  isPremium: false,
  /**
   * حين يُضبط، يرمي **كل** استدعاء مستودع هذا الخطأ.
   *
   * كان لاختبار حالات الفشل نسخته الخاصة من طبقة التمويه بأربعة عشر
   * jest.mock — أي نسختان تنحرفان، وقد انحرفت الأولى فعلًا إلى أسماء
   * دوال مخترعة. وضع الفشل هنا يجعل النسخة واحدة.
   */
  failWith: null as Error | null,
  /** تمرين بديل لاختبار حالات الوسائط. */
  exerciseOverride: null as unknown,
};

/**
 * يلفّ مموّه مستودع بحيث يحترم وضع الفشل: يرمي حين يكون مضبوطًا،
 * ويعمل عاديًا حين لا يكون.
 */
function mockFailable<T extends Record<string, (...args: never[]) => unknown>>(repository: T): T {
  return new Proxy(repository, {
    get(target, key) {
      const original = Reflect.get(target, key);
      if (typeof original !== 'function') return original;
      return (...args: never[]) => {
        if (mockScreenData.failWith) return Promise.reject(mockScreenData.failWith);
        return (original as (...a: never[]) => unknown)(...args);
      };
    },
  });
}

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
  dailyLogsRepository: mockFailable({
    getTodaySteps: jest.fn(async () => mockScreenData.todaySteps),
    getTodayWorkoutMinutes: jest.fn(async () => mockScreenData.todayWorkoutMinutes),
    getTodayMeals: jest.fn(async () => mockScreenData.todayMeals),
    getTodaySleepHours: jest.fn(async () => mockScreenData.todaySleepHours),
    getRecentProgress: jest.fn(async () => mockScreenData.history),
    addNutritionLog: jest.fn(async () => undefined),
    addWorkout: jest.fn(async () => undefined),
    setStepsToday: jest.fn(async () => undefined),
    setSleepToday: jest.fn(async () => undefined),
    addWeight: jest.fn(async () => undefined),
  }),
}));

jest.mock('@/src/data/repositories/dailyProgressRepository', () => ({
  dailyProgressRepository: mockFailable({ upsertToday: jest.fn(async () => undefined) }),
}));

jest.mock('@/src/data/repositories/progressRepository', () => ({
  progressRepository: mockFailable({
    getCompletionHistory: jest.fn(async () => mockScreenData.history),
    getWeightTrend: jest.fn(async () => mockScreenData.weightTrend),
    getWorkoutCount: jest.fn(async () => mockScreenData.workoutCount),
    getAverageCompletionInRange: jest.fn(async () => mockScreenData.averageCompletion),
    getAverageSteps: jest.fn(async () => mockScreenData.averageSteps),
    getWeeklyRawAverages: jest.fn(async () => mockScreenData.weeklyRaw),
    getLatestWeightKg: jest.fn(async () => mockScreenData.latestWeightKg),
  }),
}));

jest.mock('@/src/data/repositories/teamsRepository', () => ({
  teamsRepository: mockFailable({
    getMyTeam: jest.fn(async () => mockScreenData.team),
    createTeam: jest.fn(async () => ({ id: 't1', name: 'فريق', invite_code: 'ABC123' })),
    joinByCode: jest.fn(async () => 't1'),
    getRoster: jest.fn(async () => mockScreenData.roster),
    getLeaderboard: jest.fn(async () => mockScreenData.leaderboard),
    getPulseToday: jest.fn(async () => mockScreenData.pulseToday),
    getChallenges: jest.fn(async () => mockScreenData.challenges),
    createChallenge: jest.fn(async () => undefined),
    getMyChallengeProgress: jest.fn(async () => mockScreenData.challengeProgress),
    upsertMyChallengeProgress: jest.fn(async () => undefined),
  }),
}));

jest.mock('@/src/data/repositories/accountabilityRepository', () => ({
  accountabilityRepository: mockFailable({
    getMyPair: jest.fn(async () => mockScreenData.pair),
    sendRequest: jest.fn(async () => undefined),
    respond: jest.fn(async () => undefined),
    endPair: jest.fn(async () => undefined),
    getPings: jest.fn(async () => mockScreenData.pings),
    sendPing: jest.fn(async () => undefined),
  }),
}));

jest.mock('@/src/data/repositories/profileRepository', () => ({
  profileRepository: mockFailable({
    getCurrent: jest.fn(async () => mockProfileRef.current),
    updateCurrent: jest.fn(async () => mockProfileRef.current),
  }),
}));

jest.mock('@/src/data/repositories/exerciseRepository', () => ({
  exerciseRepository: mockFailable({
    list: jest.fn(async () => [mockTestExercise]),
    getById: jest.fn(async () => mockScreenData.exerciseOverride ?? mockTestExercise),
    getPersonalRecord: jest.fn(async () => mockScreenData.personalRecord),
    getLastSession: jest.fn(async () => mockScreenData.recentSets),
    getHistory: jest.fn(async () => mockScreenData.recentSets),
    logSets: jest.fn(async () => undefined),
    listFavourites: jest.fn(async () => mockScreenData.favorites),
    toggleFavourite: jest.fn(async () => undefined),
  }),
}));

jest.mock('@/src/data/repositories/adminRepository', () => ({
  adminRepository: mockFailable({ getOverview: jest.fn(async () => mockScreenData.adminOverview) }),
}));

jest.mock('@/src/subscriptions/usePremiumStatus', () => ({
  usePremiumStatus: () => ({
    isPremium: mockScreenData.isPremium,
    isLoading: false,
    refresh: jest.fn(async () => undefined),
  }),
}));

jest.mock('@/src/subscriptions/revenuecat', () => ({
  // getter لا قيمة ثابتة: الوحدة تُقرأ عند التركيب، والاختبار يبدّلها قبله.
  get isRevenueCatConfigured() {
    return mockScreenData.revenueCatConfigured;
  },
  getCurrentOfferingPackages: jest.fn(async () => mockScreenData.revenueCatPackages),
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

jest.mock('expo-image', () => ({ Image: 'Image' }));

jest.mock('expo-video', () => ({
  VideoView: 'VideoView',
  useVideoPlayer: (_source: unknown, setup?: (p: unknown) => void) => {
    const player = { loop: false, muted: false, play: jest.fn(), pause: jest.fn() };
    setup?.(player);
    return player;
  },
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: false })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
}));

// eslint-disable-next-line import/first
import { renderScreen } from './renderScreen';

/** كل الشاشات التي يمكن للمستخدم الوصول إليها. */
export const SCREENS: { name: string; load: () => { default: React.ComponentType } }[] = [
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


export async function mount(load: () => { default: React.ComponentType }) {
  const Screen = load().default;
  const view = renderScreen(<Screen />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return view;
}

/** يُستدعى في beforeEach لإرجاع كل البيانات إلى حالتها الافتراضية. */
const EMPTY_SCREEN_DATA = JSON.parse(JSON.stringify(mockScreenData));

export function resetScreenMocks() {
  mockScreenData.failWith = null;
  Object.assign(mockScreenData, JSON.parse(JSON.stringify(EMPTY_SCREEN_DATA)));
  mockGoalsRef.current = mockCompleteGoals;
  mockProfileRef.current = mockTestProfile;
  Object.values(mockRouter).forEach((fn) => fn.mockClear?.());
}

export { mockGoalsRef, mockProfileRef, mockRouter, mockTestExercise };
