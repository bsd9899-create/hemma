import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { progressRepository } from '@/src/data/repositories/progressRepository';
import { goalsRepository } from '@/src/data/repositories/goalsRepository';
import { computeWeeklyReview, type WeeklyReview } from '@/src/domain/weeklyReview';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

const HISTORY_DAYS = 7;

export type ProgressSummary = {
  history: { date: string; completion_percent: number }[];
  weightNowKg: number | null;
  weightDeltaKg: number | null;
  workoutsThisWeek: number;
  averageSteps: number;
  weeklyReview: WeeklyReview;
};

export function useProgressData(userId: string | undefined) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId) return;
    if (!options?.silent) setIsLoading(true);
    setError(null);
    try {
      const [history, weightTrend, workoutsThisWeek, averageSteps, weeklyRaw, goals] = await Promise.all([
        progressRepository.getCompletionHistory(userId, HISTORY_DAYS),
        progressRepository.getWeightTrend(userId, 30),
        progressRepository.getWorkoutCount(userId, HISTORY_DAYS),
        progressRepository.getAverageSteps(userId, HISTORY_DAYS),
        progressRepository.getWeeklyRawAverages(userId, HISTORY_DAYS),
        goalsRepository.getCurrent(userId),
      ]);

      /**
       * ‏`!== null` وحده لا يكفي: عمود ناقص أو شكل متغيّر يصل `undefined`،
       * فيمرّ الشرط ثم يعطي الطرح NaN — الذي يُعرض للمستخدم كـ
       * "NaN كجم آخر 30 يوم" بلا أي خطأ يُرفع. الرقم إما صالح للحساب أو
       * غائب، ولا حالة ثالثة.
       */
      const latestKg = Number.isFinite(weightTrend.latestKg) ? (weightTrend.latestKg as number) : null;
      const earliestKg = Number.isFinite(weightTrend.earliestKg) ? (weightTrend.earliestKg as number) : null;

      const weightDeltaKg =
        latestKg !== null && earliestKg !== null ? Math.round((latestKg - earliestKg) * 10) / 10 : null;

      const weeklyReview = computeWeeklyReview(weeklyRaw, {
        targetSteps: goals.target_steps,
        targetSleepHours: goals.target_sleep_hours,
      });

      setSummary({
        history,
        weightNowKg: latestKg,
        weightDeltaKg,
        workoutsThisWeek,
        averageSteps,
        weeklyReview,
      });
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('progress.loadError')));
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
