import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { dailyPromiseRepository, type DailyPromise, type PromiseType } from '@/src/data/repositories/dailyPromiseRepository';
import { getFriendlyErrorMessage } from '@/src/lib/errors';
import i18n from '@/src/lib/i18n';

/** كل قيم PromiseType بترتيب ثابت — ترجمتها الفعلية في namespace "promises" بملفات i18n. */
export const PROMISE_TYPES: PromiseType[] = ['workout', 'steps', 'nutrition', 'water', 'sleep'];

export function useDailyPromise(userId: string | undefined) {
  const [promise, setPromise] = useState<DailyPromise | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId) return;
    if (!options?.silent) setIsLoading(true);
    try {
      setPromise(await dailyPromiseRepository.getToday(userId));
      setError(null);
    } catch (e) {
      setError(getFriendlyErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // انظر التعليق نفسه في useTodayData: الجلب مرتبط بتركيز الشاشة، والعودات
  // بعد أول جلب تكون صامتة.
  const hasLoadedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      load({ silent: hasLoadedOnceRef.current });
      hasLoadedOnceRef.current = true;
    }, [load])
  );

  async function choose(promiseType: PromiseType) {
    if (isSaving) return;
    if (!userId) {
      setError(i18n.t('common.notSignedIn'));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await dailyPromiseRepository.setToday(userId, promiseType);
      await load();
    } catch (e) {
      setError(getFriendlyErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  }

  async function markFulfilled(fulfilled: boolean) {
    if (isSaving) return;
    if (!userId) {
      setError(i18n.t('common.notSignedIn'));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await dailyPromiseRepository.markFulfilled(userId, fulfilled);
      await load();
    } catch (e) {
      setError(getFriendlyErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  }

  return { promise, isLoading, isSaving, error, choose, markFulfilled, refetch: load };
}
