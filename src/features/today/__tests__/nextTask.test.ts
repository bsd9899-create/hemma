import { getNextTask } from '../nextTask';
import type { TodaySummary } from '../useTodayData';

function makeSummary(overrides: Partial<TodaySummary>): TodaySummary {
  return {
    completionPercent: 0,
    decisionTextKey: '',
    recoveryMode: false,
    steps: 8000,
    stepsTarget: 8000,
    workoutMinutes: 30,
    mealsLogged: 2,
    goals: {
      user_id: 'u1',
      target_water_ml: 2000,
      target_steps: 8000,
      target_sleep_hours: 7.5,
      target_workouts_per_week: 3,
      target_weight_kg: null,
      target_calories: 2000,
      target_protein_g: 120,
      target_carbs_g: 220,
      target_fat_g: 65,
      updated_at: '',
    },
    ...overrides,
  };
}

describe('getNextTask', () => {
  it('يقترح التمرين أولًا لو ما فيه تمرين اليوم — حتى لو باقي المؤشرات مكتملة', () => {
    const task = getNextTask(makeSummary({ workoutMinutes: 0 }));
    expect(task.titleKey).toBe('nextTask.workoutTitle');
    expect(task.ctaLabelKey).not.toBeNull();
  });

  it('يقترح تسجيل وجبة لو التمرين تم ولا توجد وجبات بعد', () => {
    const task = getNextTask(makeSummary({ workoutMinutes: 30, mealsLogged: 0 }));
    expect(task.titleKey).toBe('nextTask.nutritionTitle');
    expect(task.ctaLabelKey).not.toBeNull();
  });

  it('يقترح إكمال الخطوات لو التمرين والتغذية تمّا لكن الخطوات ناقصة', () => {
    const task = getNextTask(makeSummary({ workoutMinutes: 30, steps: 3000, stepsTarget: 8000 }));
    expect(task.titleKey).toBe('nextTask.stepsTitle');
  });

  it('يهنّئ المستخدم بدون CTA لو كل الأساسيات منجزة', () => {
    const task = getNextTask(makeSummary({}));
    expect(task.ctaLabelKey).toBeNull();
  });
});
