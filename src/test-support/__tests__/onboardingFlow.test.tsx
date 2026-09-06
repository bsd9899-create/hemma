/**
 * تشغيل فعلي لتدفّق التسجيل من أول خطوة إلى الخطة المحسوبة.
 *
 * هذا هو الاختبار الذي يثبت أن الخطة المعروضة **رقم المستخدم** لا قيمة
 * مرجعية عامة: نُدخل جسمًا معروفًا، ونتحقق أن الرقم الظاهر يطابق ما
 * تحسبه معادلة Mifflin-St Jeor لذلك الجسم بالضبط.
 */
import { act, fireEvent } from '@testing-library/react-native';
import { calculateTargets } from '@/src/domain/nutritionTargets';

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
const mockUpdateProfile = jest.fn(async (..._args: unknown[]) => undefined);
const mockUpdateTargets = jest.fn(async (..._args: unknown[]) => undefined);
const mockAddWeight = jest.fn(async (..._args: unknown[]) => undefined);

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(cb, [cb]); },
  Stack: Object.assign(() => null, { Screen: () => null }),
}));
jest.mock('@/src/features/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ session: { user: { id: 'u1', email: 'a@t.com' } } }),
}));
jest.mock('@/src/features/auth/profileStore', () => ({
  useProfileStore: (sel: (s: unknown) => unknown) =>
    sel({ profile: null, loadError: null, fetch: jest.fn(async () => undefined) }),
}));
jest.mock('@/src/features/auth/api', () => ({ signOut: jest.fn(), deleteAccount: jest.fn() }));
jest.mock('@/src/data/repositories/profileRepository', () => ({
  profileRepository: { updateCurrent: (...a: unknown[]) => mockUpdateProfile(...a) },
}));
jest.mock('@/src/data/repositories/goalsRepository', () => {
  const actual = jest.requireActual('@/src/data/repositories/goalsRepository');
  return { ...actual, goalsRepository: { ...actual.goalsRepository, updateTargets: (...a: unknown[]) => mockUpdateTargets(...a) } };
});
jest.mock('@/src/data/repositories/dailyLogsRepository', () => ({
  dailyLogsRepository: { addWeight: (...a: unknown[]) => mockAddWeight(...a) },
}));

// eslint-disable-next-line import/first
import OnboardingScreen from '@/app/onboarding';
// eslint-disable-next-line import/first
import { renderScreen, renderedText } from '../renderScreen';

/** جسم مرجعي: ذكر ٣٠ سنة، ١٨٠ سم، ٨٠ كجم، نشاط متوسط، فقد وزن. */
const BODY = { sex: 'male' as const, ageYears: 30, heightCm: 180, weightKg: 80,
               activityLevel: 'moderate' as const, goalType: 'lose_weight' as const };

function birthDateForAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setMonth(0, 15);
  return d.toISOString().slice(0, 10);
}

async function press(view: ReturnType<typeof renderScreen>, label: string) {
  await act(async () => { fireEvent.press(view.getByText(label)); });
}

async function walkToPlan() {
  const view = renderScreen(<OnboardingScreen />);
  await act(async () => { await Promise.resolve(); });

  // ١ الاسم
  await act(async () => { fireEvent.changeText(view.getByPlaceholderText('اسمك الأول يكفي'), 'بدر'); });
  await press(view, 'التالي');
  // ٢ الهدف
  await press(view, 'أنقص وزني');
  await press(view, 'التالي');
  // ٣ الجنس
  await press(view, 'ذكر');
  await press(view, 'التالي');
  // ٤ الميلاد
  await act(async () => { fireEvent.changeText(view.getByPlaceholderText('1996-01-15'), birthDateForAge(30)); });
  await press(view, 'التالي');
  // ٥ الطول والوزن
  await act(async () => {
    fireEvent.changeText(view.getByPlaceholderText('175'), '180');
    fireEvent.changeText(view.getByPlaceholderText('75'), '80');
  });
  await press(view, 'التالي');
  // ٦ النشاط
  await press(view, 'رياضي منتظم');
  await press(view, 'التالي');
  return view;
}

beforeEach(() => {
  [mockRouter.replace, mockUpdateProfile, mockUpdateTargets, mockAddWeight].forEach((m) => m.mockClear());
});

describe('تدفّق التسجيل — تشغيل فعلي لكل الخطوات', () => {
  it('يمشي من الاسم إلى الخطة بلا انهيار', async () => {
    const view = await walkToPlan();
    expect(renderedText(view)).toContain('هذي خطتك');
  });

  it('الخطة المعروضة تطابق حساب المعادلة لهذا الجسم بالضبط', async () => {
    const view = await walkToPlan();
    const expected = calculateTargets(BODY);
    const text = renderedText(view);
    // الرقم يُعرَض منسّقًا (أرقام عربية وفواصل آلاف) — نوحّده قبل المقارنة.
    const normalized = text
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[,٬\s]/g, '');
    expect(normalized).toContain(String(expected.calories));
    expect(normalized).toContain(String(expected.proteinG));
  });

  it('لا يسمح بالمتابعة قبل الإجابة', async () => {
    const view = renderScreen(<OnboardingScreen />);
    await act(async () => { await Promise.resolve(); });
    // الاسم فارغ — زر التالي معطّل، والضغط لا ينقل الخطوة.
    await press(view, 'التالي');
    expect(renderedText(view)).toContain('وش نناديك؟');
  });

  it('يرفض عمرًا غير منطقي بدل حساب خطة عليه', async () => {
    const view = renderScreen(<OnboardingScreen />);
    await act(async () => { await Promise.resolve(); });
    await act(async () => { fireEvent.changeText(view.getByPlaceholderText('اسمك الأول يكفي'), 'بدر'); });
    await press(view, 'التالي');
    await press(view, 'أنقص وزني');
    await press(view, 'التالي');
    await press(view, 'ذكر');
    await press(view, 'التالي');
    await act(async () => { fireEvent.changeText(view.getByPlaceholderText('1996-01-15'), birthDateForAge(4)); });
    await press(view, 'التالي');
    // ما زلنا على خطوة الميلاد.
    expect(renderedText(view)).toContain('تاريخ ميلادك');
  });

  it('يحفظ الملف والأهداف المحسوبة والوزن، ثم ينتقل للتطبيق', async () => {
    const view = await walkToPlan();
    await press(view, 'ابدأ رحلتي');

    const expected = calculateTargets(BODY);
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'بدر', goal_type: 'lose_weight', sex: 'male', height_cm: 180 })
    );
    expect(mockUpdateTargets).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ target_calories: expected.calories, targets_source: 'calculated' })
    );
    expect(mockAddWeight).toHaveBeenCalledWith('u1', 80);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('يسجّل المصدر calculated لا reference — الرقم محسوب لا مرجعي', async () => {
    const view = await walkToPlan();
    await press(view, 'ابدأ رحلتي');
    const targets = mockUpdateTargets.mock.calls[0][1] as { targets_source: string };
    expect(targets.targets_source).toBe('calculated');
  });
});
