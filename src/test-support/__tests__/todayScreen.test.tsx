/**
 * تشغيل حقيقي لشاشة اليوم — تُركَّب بمكوّناتها وخطافاتها الفعلية.
 *
 * أهم حالة: قاعدة بيانات متأخرة عن الكود. هذا ما أنتج
 * `TypeError: Cannot read property 'toLocaleString' of undefined` على
 * جهازك، ولا يكشفه أي فحص أنواع لأن الأنواع لا تُفرض على بيانات الشبكة.
 */
import { act, screen } from '@testing-library/react-native';
import { completeGoals, goalsMissingNutritionColumns } from '../mocks';

const mockGetGoals = jest.fn();

jest.mock('@/src/data/repositories/goalsRepository', () => {
  const actual = jest.requireActual('@/src/data/repositories/goalsRepository');
  return {
    ...actual,
    goalsRepository: { ...actual.goalsRepository, getCurrent: (...a: unknown[]) => mockGetGoals(...a) },
  };
});

jest.mock('@/src/data/repositories/dailyLogsRepository', () => ({
  dailyLogsRepository: {
    getTodaySteps: jest.fn(async () => 4200),
    getTodayWorkoutMinutes: jest.fn(async () => 20),
    getTodayMeals: jest.fn(async () => []),
    getTodaySleepHours: jest.fn(async () => 7),
    getRecentProgress: jest.fn(async () => []),
  },
}));

jest.mock('@/src/data/repositories/dailyProgressRepository', () => ({
  dailyProgressRepository: { upsertToday: jest.fn(async () => undefined) },
}));

jest.mock('@/src/features/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ session: { user: { id: '11111111-1111-4111-8111-111111111111' } } }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canDismiss: () => false, dismissAll: jest.fn() }),
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(cb, [cb]); },
  Link: ({ children }: { children: unknown }) => children,
}));

// eslint-disable-next-line import/first
import TodayScreen from '@/app/(tabs)/index';
// eslint-disable-next-line import/first
import { renderScreen, findPressables, renderedText } from '../renderScreen';

async function renderAndSettle() {
  const view = renderScreen(<TodayScreen />);
  // ندع الجلب غير المتزامن ينتهي قبل الفحص، وإلا فحصنا هيكل التحميل فقط.
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return view;
}

beforeEach(() => {
  mockGetGoals.mockReset();
  mockPush.mockReset();
});

describe('شاشة اليوم — تشغيل فعلي', () => {
  it('تُعرَض بلا انهيار مع بيانات كاملة', async () => {
    mockGetGoals.mockResolvedValue(completeGoals);
    const view = await renderAndSettle();
    expect(view.toJSON()).toBeTruthy();
  });

  it('لا تنهار حين تنقص أعمدة التغذية من قاعدة البيانات (الانهيار الأصلي)', async () => {
    mockGetGoals.mockResolvedValue(goalsMissingNutritionColumns);
    const view = await renderAndSettle();
    expect(view.toJSON()).toBeTruthy();
  });

  it('لا تعرض صفرًا مكان هدف غائب', async () => {
    mockGetGoals.mockResolvedValue(goalsMissingNutritionColumns);
    await renderAndSettle();
    // "من ٠" أو "of 0" يعني أننا اخترعنا هدفًا لم يضبطه المستخدم.
    expect(screen.queryByText(/من ٠|of 0|من 0/)).toBeNull();
  });

  it('لا تُظهر NaN في أي نص معروض', async () => {
    mockGetGoals.mockResolvedValue(goalsMissingNutritionColumns);
    const view = await renderAndSettle();
    expect(renderedText(view)).not.toMatch(/NaN/);
  });

  it('كل عنصر تفاعلي يستجيب للضغط بلا استثناء غير مُمسَك', async () => {
    mockGetGoals.mockResolvedValue(completeGoals);
    const view = await renderAndSettle();
    const pressables = findPressables(view);
    expect(pressables.length).toBeGreaterThan(0);
    for (const node of pressables) {
      // زر ينهار عند الضغط أسوأ من زر لا يفعل شيئًا.
      await act(async () => { node.props.onPress(); });
    }
  });

  it('تعرض حالة خطأ قابلة للتعافي حين يفشل الجلب بدل شاشة فارغة', async () => {
    mockGetGoals.mockRejectedValue(Object.assign(new Error('network'), { code: 'PGRST301' }));
    const view = await renderAndSettle();
    // يجب أن يظهر شيء للمستخدم — لا شاشة بيضاء صامتة.
    expect(renderedText(view).trim().length).toBeGreaterThan(0);
  });
});
