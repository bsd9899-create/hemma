import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { exerciseRepository, type Exercise, type ExerciseFilter } from '@/src/data/repositories/exerciseRepository';
import { getFriendlyErrorMessage } from '@/src/lib/errors';
import { useTranslation } from 'react-i18next';

/**
 * مكتبة التمارين مع بحث وتصفية.
 *
 * البحث يُنفَّذ على الخادم لا في العميل: المكتبة تكبر مع الوقت، وجلبها
 * كاملة لتصفيتها محليًا يعمل عند 20 تمرينًا ويفشل عند 500.
 */
export function useExerciseLibrary(userId: string | undefined) {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<ExerciseFilter>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: ExerciseFilter) => {
      setError(null);
      try {
        const rows = await exerciseRepository.list(active);
        setExercises(rows);
      } catch (e) {
        setError(getFriendlyErrorMessage(e, t('exercises.loadError')));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  // تأخير البحث: كل ضغطة مفتاح كانت ستطلق طلبًا، فتتسابق النتائج وقد
  // تصل نتيجة قديمة بعد الحديثة فتعرض بحثًا لم يعد قائمًا.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = filter.search ? 250 : 0;
    debounceRef.current = setTimeout(() => void load(filter), delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filter, load]);

  useEffect(() => {
    if (!userId) return;
    exerciseRepository
      .listFavourites(userId)
      .then((ids) => setFavourites(new Set(ids)))
      .catch(() => {
        // المفضّلة تحسين لا شرط لعرض المكتبة — فشلها لا يمنع التصفح.
      });
  }, [userId]);

  const toggleFavourite = useCallback(
    async (exerciseId: string) => {
      if (!userId) return;
      const makeFavourite = !favourites.has(exerciseId);
      // تحديث متفائل: الضغطة يجب أن تُحسّ فورًا، لا بعد ذهاب وإياب للشبكة.
      setFavourites((current) => {
        const next = new Set(current);
        if (makeFavourite) next.add(exerciseId);
        else next.delete(exerciseId);
        return next;
      });
      try {
        await exerciseRepository.toggleFavourite(userId, exerciseId, makeFavourite);
      } catch {
        // تراجع عن التحديث المتفائل حتى لا تكذب الواجهة على المستخدم.
        setFavourites((current) => {
          const next = new Set(current);
          if (makeFavourite) next.delete(exerciseId);
          else next.add(exerciseId);
          return next;
        });
      }
    },
    [userId, favourites]
  );

  const visible = useMemo(
    () => (filter.favouritesOnly ? exercises.filter((e) => favourites.has(e.id)) : exercises),
    [exercises, favourites, filter.favouritesOnly]
  );

  /** سحب للتحديث — حالة منفصلة عن التحميل الأول حتى لا يومض الهيكل. */
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await load(filter);
    setIsRefreshing(false);
  }, [load, filter]);

  return {
    exercises: visible, favourites, filter, setFilter, toggleFavourite,
    isLoading, isRefreshing, refresh, error,
  };
}
