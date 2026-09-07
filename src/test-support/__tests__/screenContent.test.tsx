/**
 * ما يجب أن يظل معروضًا على كل شاشة.
 *
 * الاختبارات الأخرى تسأل "هل انهارت؟" و"هل ظهر NaN؟" — ولا واحد منها
 * يلاحظ اختفاء قسم كامل. حذفتُ بالخطأ الأرقام القياسية وآخر أداء وحجم
 * التدريب من صفحة التمرين، ومرّت ٩٩٣ اختبارًا خضراء. هذه الفحوص تسمّي
 * المحتوى الذي وُجدت الشاشة من أجله.
 */
import { renderedText } from '../renderScreen';
import { mockScreenData, mount, resetScreenMocks } from '../screenMocks';
import {
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
    weeklyRaw: populatedWeeklyRaw,
    latestWeightKg: populatedWeightTrend.latestKg,
    todaySteps: 11420,
    todayWorkoutMinutes: 45,
    todayMeals: populatedMeals,
    todaySleepHours: 6.5,
    team: populatedTeam,
    roster: populatedRoster,
    leaderboard: populatedLeaderboard,
    pulseToday: 68,
    pair: populatedPair,
    pings: populatedPings,
    personalRecord: populatedPersonalRecord,
    recentSets: populatedSets,
  });
});

/**
 * كل صف: الشاشة، والأقسام التي لا يجوز أن تختفي منها. المفاتيح تُقارَن
 * بالنص المعروض بعد الترجمة، فالفحص يشمل الترجمة والعرض معًا.
 */
const REQUIRED: [string, () => { default: React.ComponentType }, string[]][] = [
  ['today', () => require('@/app/(tabs)/index'), ['أساسيات اليوم', 'التمرين', 'السعرات', 'الخطوات']],
  ['nutrition', () => require('@/app/(tabs)/nutrition'), ['الماكروز', 'بروتين', 'كربوهيدرات', 'دهون', 'وجبات اليوم']],
  ['progress', () => require('@/app/(tabs)/progress'), ['الوزن الحالي', 'متوسط الخطوات', 'التمارين', 'تقييم']],
  ['profile', () => require('@/app/(tabs)/profile'), ['خطتك', 'بياناتك', 'اللغة', 'تسجيل الخروج']],
  ['teams', () => require('@/app/teams/index'), ['نبض الفريق', 'الترتيب', 'الأعضاء', 'التحديات']],
  [
    'exercises/detail',
    () => require('@/app/exercises/[id]'),
    ['طريقة الأداء', 'أرقامك القياسية', 'آخر أداء', 'حجم التدريب', 'سجّل مجموعات'],
  ],
  ['goals', () => require('@/app/goals'), ['النشاط', 'التغذية']],
];

describe.each(REQUIRED)('محتوى شاشة %s', (_name, load, sections) => {
  it.each(sections.map((section) => [section] as const))('يعرض «%s»', async (section) => {
    expect(renderedText(await mount(load))).toContain(section);
  });
});

describe('صفحة التمرين تضع الإرشاد مكان الفيديو', () => {
  /**
   * من يفتح تمرينًا يسأل "كيف أؤدّيه؟" قبل "كم رفعت سابقًا؟". فخطوات
   * الأداء تسبق الأرقام القياسية — وهذا ترتيب مقصود لا صدفة.
   */
  it('طريقة الأداء تسبق الأرقام القياسية', async () => {
    const text = renderedText(await mount(() => require('@/app/exercises/[id]')));
    expect(text.indexOf('طريقة الأداء')).toBeGreaterThan(-1);
    expect(text.indexOf('طريقة الأداء')).toBeLessThan(text.indexOf('أرقامك القياسية'));
  });

  /**
   * غياب الفيديو مسألتنا نحن لا مسألة المستخدم. لا يُعتذر له عن تراخيص
   * لا تعنيه، ويُعطى بدلًا منها ما جاء يبحث عنه.
   */
  it('لا تعتذر عن غياب الوسائط', async () => {
    const text = renderedText(await mount(() => require('@/app/exercises/[id]')));
    expect(text).not.toContain('ترخيص');
    expect(text).not.toContain('لا يوجد فيديو');
  });

  it('تحمل تنبيه السلامة قبل زر التسجيل', async () => {
    const text = renderedText(await mount(() => require('@/app/exercises/[id]')));
    expect(text.indexOf('ابدأ بوزن خفيف')).toBeLessThan(text.indexOf('سجّل مجموعات'));
  });
});
