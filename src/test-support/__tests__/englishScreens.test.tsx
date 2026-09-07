/**
 * كل شاشة بالإنجليزية.
 *
 * التطبيق يشحن ترجمة إنجليزية كاملة لم تُعرَض ولا مرة واحدة. مفتاح
 * ناقص لا يرفع خطأ في i18next: يعرض المفتاح نفسه للمستخدم
 * ("today.streakLabel")، وهو ما حدث فعلًا في العربية وكشفه العرض لا
 * الفحص الساكن.
 */
import i18n from '@/src/lib/i18n';
import { renderedText } from '../renderScreen';
import { SCREENS, mockScreenData, mount, resetScreenMocks } from '../screenMocks';
import {
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
  testExercise,
  testProfile,
} from '../mocks';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterAll(async () => {
  await i18n.changeLanguage('ar');
});

beforeEach(() => {
  resetScreenMocks();
  Object.assign(mockScreenData, {
    history: populatedHistory,
    weightTrend: populatedWeightTrend,
    workoutCount: 4,
    averageSteps: 9350,
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
    pair: populatedPair,
    pings: populatedPings,
    personalRecord: populatedPersonalRecord,
    recentSets: populatedSets,
  });
});

/**
 * مفتاح ترجمة غير محلول يظهر كنص المفتاح نفسه: كلمتان أو أكثر تفصلهما
 * نقطة بلا مسافة، بحروف لاتينية فقط — "profileEdit.male".
 */
const UNRESOLVED_KEY = /\b[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*){1,4}\b/;

/** ما يُسمح بمروره رغم مطابقته الشكل أعلاه. */
const ALLOWED = [
  /himmah\.online/,
  /privacy\.html/,
  /terms\.html/,
  /support\.html/,
  /\w+@\w+\.\w+/,
];

function unresolvedKeysIn(text: string): string[] {
  return text
    .split(/\s+/)
    .filter((word) => UNRESOLVED_KEY.test(word))
    .filter((word) => !ALLOWED.some((pattern) => pattern.test(word)));
}

/**
 * كل كلمة عربية تأتي من بيانات الاختبار نفسها، لا من التطبيق. تُشتقّ من
 * المصادر مباشرة حتى لا تصبح قائمة يدوية تتقادم.
 */
const ARABIC_FROM_DATA = new Set(
  [
    ...populatedMeals.map((meal) => meal.description),
    ...populatedRoster.map((member) => member.display_name),
    ...populatedLeaderboard.map((row) => row.display_name),
    ...populatedChallenges.flatMap((challenge) => [challenge.title, challenge.description ?? '']),
    populatedTeam.name,
    testProfile.display_name,
    testExercise.name_ar,
    // اسم اللغة يُعرض بلغتها في مبدّل اللغة — وهذا هو الصواب.
    'العربية',
  ]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean),
);

describe.each(SCREENS)('شاشة $name بالإنجليزية', ({ load }) => {
  it('تُعرَض بلا انهيار', async () => {
    expect((await mount(load)).toJSON()).not.toBeNull();
  });

  it('لا تعرض مفتاح ترجمة غير محلول', async () => {
    expect(unresolvedKeysIn(renderedText(await mount(load)))).toEqual([]);
  });

  /**
   * بيانات المستخدم تبقى بلغتها: اسم "عبدالرحمن" ووجبة "كبسة دجاج" تظهران
   * عربيتين في واجهة إنجليزية وهذا هو الصحيح. المطلوب ألا يتسرّب نص
   * **من التطبيق نفسه** — تسمية أو عنوان أو رسالة — بالعربية.
   */
  it('لا يتسرّب نص عربي من التطبيق نفسه', async () => {
    const arabic = renderedText(await mount(load)).match(/[؀-ۿ]+/g) ?? [];
    const notUserData = arabic.filter((word) => !ARABIC_FROM_DATA.has(word));
    expect(notUserData).toEqual([]);
  });

  it('لا NaN ولا undefined ولا null', async () => {
    const text = renderedText(await mount(load));
    expect(text).not.toMatch(/NaN|\bundefined\b|\bnull\b/);
  });
});
