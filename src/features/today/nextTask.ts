import type { TodaySummary } from './useTodayData';

export type NextTask = {
  emoji: string;
  /** مفتاح ترجمة (namespace "nextTask")، وليس نصًا جاهزًا. */
  titleKey: string;
  subtitleKey: string;
  /** قيم للاستيفاء داخل نص العنوان الفرعي المترجَم (مثل {{amount}}). */
  subtitleParams?: Record<string, number>;
  ctaLabelKey: string | null;
};

/** أهم مهمة قادمة واحدة — أول عنصر أساسي لم يُنجز بعد، بترتيب أولوية ثابت. */
export function getNextTask(summary: TodaySummary): NextTask {
  if (summary.workoutMinutes === 0) {
    return {
      emoji: '🏋️',
      titleKey: 'nextTask.workoutTitle',
      subtitleKey: 'nextTask.workoutSubtitle',
      ctaLabelKey: 'nextTask.workoutCta',
    };
  }

  if (summary.mealsLogged === 0) {
    return {
      emoji: '🍽️',
      titleKey: 'nextTask.nutritionTitle',
      subtitleKey: 'nextTask.nutritionSubtitle',
      ctaLabelKey: 'nextTask.nutritionCta',
    };
  }

  if (summary.steps < summary.stepsTarget) {
    const remainingSteps = summary.stepsTarget - summary.steps;
    return {
      emoji: '👟',
      titleKey: 'nextTask.stepsTitle',
      subtitleKey: 'nextTask.stepsSubtitle',
      subtitleParams: { amount: remainingSteps },
      ctaLabelKey: 'nextTask.stepsCta',
    };
  }

  return {
    emoji: '🎉',
    titleKey: 'nextTask.doneTitle',
    subtitleKey: 'nextTask.doneSubtitle',
    ctaLabelKey: null,
  };
}
