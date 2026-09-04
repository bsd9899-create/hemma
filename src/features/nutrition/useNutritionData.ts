import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { dailyLogsRepository } from '@/src/data/repositories/dailyLogsRepository';
import { goalsRepository } from '@/src/data/repositories/goalsRepository';
import { summarizeNutrition, type NutritionSummary } from '@/src/domain/nutrition';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

/**
 * تغذية اليوم: الوجبات + الأهداف، مجمّعة في ملخّص واحد جاهز للعرض.
 * يتبع نفس نمط بقية hooks البيانات — جلب عند التركيز، وصامت بعد أول
 * تحميل حتى لا تومض الشاشة عند كل عودة إليها.
 */
export function useNutritionData(userId: string | undefined) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<NutritionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!userId) return;
      if (!options?.silent) setIsLoading(true);
      setError(null);
      try {
        const [meals, goals] = await Promise.all([
          dailyLogsRepository.getTodayMeals(userId),
          goalsRepository.getCurrent(userId),
        ]);

        setSummary(
          summarizeNutrition(meals, {
            calories: goals.target_calories,
            macros: {
              protein: goals.target_protein_g,
              carbs: goals.target_carbs_g,
              fat: goals.target_fat_g,
            },
          })
        );
      } catch (e) {
        setError(getFriendlyErrorMessage(e, t('nutrition.loadError')));
      } finally {
        setIsLoading(false);
      }
    },
    [userId, t]
  );

  const hasLoadedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      load({ silent: hasLoadedOnceRef.current });
      hasLoadedOnceRef.current = true;
    }, [load])
  );

  return { summary, isLoading, error, refetch: load };
}
