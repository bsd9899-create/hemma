import { useCallback, useEffect, useState } from 'react';
import { dailyPromiseRepository, type DailyPromise, type PromiseType } from '@/src/data/repositories/dailyPromiseRepository';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

/** كل قيم PromiseType بترتيب ثابت — ترجمتها الفعلية في namespace "promises" بملفات i18n. */
export const PROMISE_TYPES: PromiseType[] = ['workout', 'steps', 'nutrition', 'water', 'sleep'];

export function useDailyPromise(userId: string | undefined) {
  const [promise, setPromise] = useState<DailyPromise | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      setPromise(await dailyPromiseRepository.getToday(userId));
      setError(null);
    } catch (e) {
      setError(getFriendlyErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // جلب أولي عند التركيب (يستدعي setIsLoading داخل load) — نمط قياسي
    // ومختبَر في هذا المشروع، وليس اشتقاق حالة من props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function choose(promiseType: PromiseType) {
    if (!userId) return;
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
    if (!userId) return;
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
