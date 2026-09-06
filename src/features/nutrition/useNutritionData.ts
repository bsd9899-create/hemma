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
  /**
   * true عندما تكون الأهداف المعروضة القيمة المرجعية العامة (FDA) ولم
   * يضبط المستخدم شيئًا بعد. الشاشة تقولها صراحةً بدل أن تعرض 2000
   * سعرة وكأنها هدفه هو.
   */
  const [isReferenceTargets, setIsReferenceTargets] = useState(false);
  /**
   * false حين لا يوجد هدف سعرات محفوظ إطلاقًا (قاعدة بيانات متأخرة عن
   * الكود). الشاشة تُخفي حلقة النسبة حينها بدل عرض نسبة إلى صفر.
   */
  const [hasTargets, setHasTargets] = useState(true);
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

        // نفس التطبيع المستخدم في شاشة اليوم: عمود ناقص (ترحيل لم
        // يُطبَّق) يصل كـ undefined فيتحوّل كل حساب بعده إلى NaN —
        // والحلقة تتلقى NaN فتتوقف عن الرسم بلا رسالة خطأ واحدة.
        const targets = goalsRepository.toNutritionTargets(goals);
        setHasTargets(targets.calories !== null);
        setIsReferenceTargets(targets.source === 'reference' || targets.calories === null);
        setSummary(
          summarizeNutrition(meals, {
            calories: targets.calories ?? 0,
            macros: {
              protein: targets.proteinG ?? 0,
              carbs: targets.carbsG ?? 0,
              fat: targets.fatG ?? 0,
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

  return { summary, isReferenceTargets, hasTargets, isLoading, error, refetch: load };
}
