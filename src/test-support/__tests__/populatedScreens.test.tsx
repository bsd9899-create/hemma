/**
 * النصف الآخر من التشغيل الفعلي: كل شاشة على بيانات **مستخدم بعد أسبوع**.
 *
 * الحالة الفارغة تكشف القسمة على صفر والغياب المعروض كصفر. الممتلئة
 * تكشف صنفًا لا تراه الأولى إطلاقًا: رقم يفيض حدّه، اسم طويل يكسر
 * تخطيطه، تنسيق ينهار عند الآلاف، وحساب صحيح على صفر وخاطئ على 9350.
 */
import { act } from '@testing-library/react-native';
import { SCREENS, mockScreenData, mount, resetScreenMocks } from '../screenMocks';
import { findPressables, renderedText } from '../renderScreen';
import {
  populatedAdminOverview,
  populatedChallenges,
  populatedHistory,
  populatedLeaderboard,
  populatedMeals,
  populatedPair,
  populatedPersonalRecord,
  populatedPings,
  populatedRoster,
  populatedSets,
  populatedTeam,
  populatedWeeklyRaw,
  populatedWeightTrend,
} from '../mocks';

beforeEach(() => {
  resetScreenMocks();
  Object.assign(mockScreenData, {
    history: populatedHistory,
    weightTrend: populatedWeightTrend,
    workoutCount: 4,
    averageSteps: 9350,
    averageCompletion: 74,
    weeklyRaw: populatedWeeklyRaw,
    latestWeightKg: populatedWeightTrend.latestKg,
    todaySteps: 11420,
    todayWorkoutMinutes: 45,
    todayMeals: populatedMeals,
    todaySleepHours: 6.5,
    team: populatedTeam,
    roster: populatedRoster,
    leaderboard: populatedLeaderboard,
    challenges: populatedChallenges,
    pulseToday: 68,
    challengeProgress: 45,
    pair: populatedPair,
    pings: populatedPings,
    personalRecord: populatedPersonalRecord,
    recentSets: populatedSets,
    favorites: ['33333333-3333-4333-8333-333333333333'],
    adminOverview: populatedAdminOverview,
  });
});

describe.each(SCREENS)('شاشة $name — ببيانات مستخدم فعلي', ({ name, load }) => {
  it('تُعرَض بلا انهيار', async () => {
    expect((await mount(load)).toJSON()).not.toBeNull();
  });

  it('لا تعرض NaN ولا undefined ولا null ولا [object Object]', async () => {
    const text = renderedText(await mount(load));
    expect(text).not.toMatch(/NaN/);
    expect(text).not.toMatch(/\bundefined\b/);
    expect(text).not.toMatch(/\bnull\b/);
    expect(text).not.toMatch(/\[object Object\]/);
  });

  /**
   * الرقم غير المنسّق يظهر بفاصلة عشرية طويلة (9350.333333333334) أو
   * بترميز أسّي (1.2e+4). كلاهما يعني أن قيمة محسوبة عُرضت خامًا بدل
   * أن تمرّ على formatNumber.
   */
  it('لا تعرض رقمًا خامًا بكسور طويلة أو ترميز أسّي', async () => {
    const text = renderedText(await mount(load));
    expect(text).not.toMatch(/\d+\.\d{3,}/);
    expect(text).not.toMatch(/\d+e[+-]\d+/i);
  });

  it('كل زر يُضغَط بلا استثناء غير مُمسَك', async () => {
    const view = await mount(load);
    const seen = new Set<unknown>();
    for (let i = 0; i < 60; i += 1) {
      const next = findPressables(view).find((node) => !seen.has(node.props.onPress));
      if (!next) break;
      seen.add(next.props.onPress);
      await act(async () => {
        next.props.onPress();
      });
    }
    // شاشة بلا أي عنصر تفاعلي ليست خطأً بالضرورة، لكنها قرار يستحق أن
    // يُذكر بالاسم: فقدان شاشة لأزرارها بعد تعديل يجب أن يفشل هنا.
    if (!READ_ONLY_SCREENS.has(name)) expect(seen.size).toBeGreaterThan(0);
  });
});

/**
 * شاشات لا تحمل أي إجراء حين تمتلئ بالبيانات.
 *
 * التقدّم هي الوحيدة، وهي مرشّحة لإضافة إجراء (تبديل المدى، أو نقر على
 * بطاقة الوزن يفتح تسجيله) — مُدرَجة هنا بوعي لا بصمت.
 */
const READ_ONLY_SCREENS = new Set(['progress']);
