import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { dailyLogsRepository } from '@/src/data/repositories/dailyLogsRepository';
import { dailyProgressRepository } from '@/src/data/repositories/dailyProgressRepository';
import { goalsRepository, type UserGoals } from '@/src/data/repositories/goalsRepository';
import { computeTodayDecision, type TodayDecision } from '@/src/domain/decisionEngine';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

/** "يوم تمرين كامل" مرجعي لحساب نسبة إنجاز التمرين — لا يوجد هدف تمرين يومي بالدقائق في user_goals (الهدف أسبوعي بعدد الأيام). */
const REFERENCE_WORKOUT_MINUTES = 30;
const RECOVERY_LOOKBACK_DAYS = 7;

export type TodaySummary = TodayDecision & {
  waterMl: number;
  waterTargetMl: number;
  steps: number;
  stepsTarget: number;
  workoutMinutes: number;
  mealsLogged: number;
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
      const [goals, waterMl, steps, workoutMinutes, mealsLogged, sleepHours, recentProgress] = await Promise.all([
        goalsRepository.getCurrent(userId),
        dailyLogsRepository.getTodayWaterMl(userId),
        dailyLogsRepository.getTodaySteps(userId),
        dailyLogsRepository.getTodayWorkoutMinutes(userId),
        dailyLogsRepository.getTodayMealsCount(userId),
        dailyLogsRepository.getTodaySleepHours(userId),
        dailyLogsRepository.getRecentProgress(userId, RECOVERY_LOOKBACK_DAYS),
      ]);

      const decision = computeTodayDecision({
        waterRatio: waterMl / goals.target_water_ml,
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
        waterMl,
        waterTargetMl: goals.target_water_ml,
        steps,
        stepsTarget: goals.target_steps,
        workoutMinutes,
        mealsLogged,
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
