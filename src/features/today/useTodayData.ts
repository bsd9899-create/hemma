import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { dailyLogsRepository } from '@/src/data/repositories/dailyLogsRepository';
import { dailyProgressRepository } from '@/src/data/repositories/dailyProgressRepository';
import { goalsRepository, type UserGoals } from '@/src/data/repositories/goalsRepository';
import { computeTodayDecision, type TodayDecision } from '@/src/domain/decisionEngine';
import { calculateStreak } from '@/src/domain/streak';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

/** "يوم تمرين كامل" مرجعي لحساب نسبة إنجاز التمرين — لا يوجد هدف تمرين يومي بالدقائق في user_goals (الهدف أسبوعي بعدد الأيام). */
const REFERENCE_WORKOUT_MINUTES = 30;
const RECOVERY_LOOKBACK_DAYS = 7;
/** نافذة حساب السلسلة — ٩٠ يومًا تكفي لسلسلة طويلة بلا جلب مفرط. */
const STREAK_LOOKBACK_DAYS = 90;

/** تاريخ اليوم بصيغة YYYY-MM-DD. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export type TodaySummary = TodayDecision & {
  steps: number;
  stepsTarget: number;
  workoutMinutes: number;
  mealsLogged: number;
  calories: number;
  /** طول سلسلة الأيام المتتالية المنجزة. */
  streak: number;
  /** null حين لا يوجد هدف سعرات محفوظ — لا يُعرض كصفر. */
  caloriesTarget: number | null;
  goals: UserGoals;
};

export function useTodayData(userId: string | undefined) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId) return;
    if (!options?.silent) setIsLoading(true);
    setError(null);
    try {
      const [goals, steps, workoutMinutes, meals, sleepHours, recentProgress] = await Promise.all([
        goalsRepository.getCurrent(userId),
        dailyLogsRepository.getTodaySteps(userId),
        dailyLogsRepository.getTodayWorkoutMinutes(userId),
        dailyLogsRepository.getTodayMeals(userId),
        dailyLogsRepository.getTodaySleepHours(userId),
        dailyLogsRepository.getRecentProgress(userId, RECOVERY_LOOKBACK_DAYS),
      ]);

      // نافذة أطول من نافذة "وضع الإنقاذ": السلسلة تُقاس بالأسابيع لا
      // بالأيام، وقصرها على ٧ أيام يجعل أقصى سلسلة ممكنة ٧ مهما التزم.
      const streakDays = await dailyLogsRepository.getRecentProgress(userId, STREAK_LOOKBACK_DAYS);

      const decision = computeTodayDecision({
        stepsRatio: steps / goals.target_steps,
        workoutRatio: workoutMinutes / REFERENCE_WORKOUT_MINUTES,
        sleepRatio: sleepHours !== null ? sleepHours / goals.target_sleep_hours : null,
        recentCompletionPercents: recentProgress.map((p) => p.completion_percent),
      });

      await dailyProgressRepository.upsertToday(userId, {
        completion_percent: decision.completionPercent,
        decision_text: decision.decisionTextKey,
        recovery_mode: decision.recoveryMode,
      });

      setSummary({
        ...decision,
        steps,
        stepsTarget: goals.target_steps,
        workoutMinutes,
        mealsLogged: meals.length,
        calories: meals.reduce((total, meal) => total + (meal.calories ?? 0), 0),
        streak: calculateStreak(
          // نُدخل إنجاز اليوم المحسوب للتو: الصف في قاعدة البيانات قد
          // يكون أقدم من هذه اللحظة، فيُنقص السلسلة يومًا بلا سبب.
          [
            { date: todayKey(), completion_percent: decision.completionPercent },
            ...streakDays.filter((d) => d.date !== todayKey()),
          ],
          todayKey()
        ),
        caloriesTarget: goalsRepository.toNutritionTargets(goals).calories,
        goals,
      });
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('today.loadError')));
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  // يُعاد الجلب عند كل عودة للشاشة، وليس عند التركيب فقط: المستخدم قد
  // يسجّل ماءً/وزنًا أو ينضم لفريق من شاشة أخرى، وبدون هذا تبقى الشاشة
  // تعرض أرقامًا قديمة حتى يسحب لتحديثها يدويًا. أول جلب يعرض حالة
  // التحميل، والعودات التالية تُحدِّث بصمت حتى لا تومض الشاشة.
  const hasLoadedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      load({ silent: hasLoadedOnceRef.current });
      hasLoadedOnceRef.current = true;
    }, [load])
  );

  return { summary, isLoading, error, refetch: load };
}
