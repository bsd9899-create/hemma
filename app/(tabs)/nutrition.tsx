import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ProgressRing,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
  colors,
  palette,
  rowDirection,
} from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import { useNutritionData } from '@/src/features/nutrition/useNutritionData';
import { MacroRow } from '@/src/features/nutrition/components/MacroRow';
import { MealCard } from '@/src/features/nutrition/components/MealCard';
import { MACRO_KEYS, MEAL_TYPES, getNutritionHintKey } from '@/src/domain/nutrition';
import { formatNumber } from '@/src/lib/i18n/format';

export default function NutritionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { summary, isLoading, error, refetch } = useNutritionData(userId);

  if (!summary && isLoading) {
    return (
      <Screen>
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Skeleton height={200} />
          <Skeleton height={140} />
          <Skeleton height={90} />
        </View>
      </Screen>
    );
  }

  if (!summary) {
    return (
      <Screen style={{ flex: 1, justifyContent: 'center' }}>
        <ErrorState message={error ?? t('nutrition.loadError')} onRetry={refetch} retryLabel={t('common.retry')} />
      </Screen>
    );
  }

  const { totals, targets, calorieRatio, caloriesRemaining } = summary;
  const isOverTarget = caloriesRemaining < 0;
  // الحلقة تُقصّ عند 100% بصريًا، بينما تبقى النسبة الخام في المنطق —
  // التجاوز يُبلَّغ عنه بالنص واللون بدل حلقة تلتفّ على نفسها.
  const ringColor = isOverTarget ? colors.warning : calorieRatio >= 0.9 ? palette.gold500 : colors.primary;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <Text variant="displayMd" style={{ marginTop: spacing.md }}>
          {t('nutrition.title')}
        </Text>

        {/* البطاقة الرئيسية: سؤال واحد يجيب عليه المستخدم بنظرة —
            كم أكلت اليوم مقابل هدفي؟ */}
        <Card>
          <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing.lg }}>
            <ProgressRing progress={Math.min(1, calorieRatio)} size={116} strokeWidth={11} fillColor={ringColor}>
              <Text variant="title">{formatNumber(totals.calories)}</Text>
              <Text variant="caption" color="textSecondary">
                {t('nutrition.ofTarget', { target: formatNumber(targets.calories) })}
              </Text>
            </ProgressRing>

            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="overline" color="textSecondary">
                {t('nutrition.todayCalories')}
              </Text>
              <Text variant="bodyStrong" color={isOverTarget ? 'warning' : 'textPrimary'}>
                {isOverTarget
                  ? t('nutrition.overBy', { value: formatNumber(Math.abs(caloriesRemaining)) })
                  : t('nutrition.remaining', { value: formatNumber(caloriesRemaining) })}
              </Text>
              <Text variant="caption" color="textSecondary">
                {t(getNutritionHintKey(summary))}
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="soft" style={{ gap: spacing.md }}>
          <SectionHeader title={t('nutrition.macrosTitle')} />
          {MACRO_KEYS.map((macro) => (
            <MacroRow key={macro} macro={macro} value={totals.macros[macro]} target={targets.macros[macro]} />
          ))}
        </Card>

        <SectionHeader title={t('nutrition.mealsTitle')} />

        {totals.mealCount === 0 ? (
          <EmptyState
            emoji="🍽️"
            title={t('nutrition.emptyTitle')}
            description={t('nutrition.emptyDescription')}
            actionLabel={t('nutrition.addMeal')}
            onAction={() => router.push('/log/nutrition')}
          />
        ) : (
          <>
            {MEAL_TYPES.filter((type) => summary.byMealType[type].length > 0).map((type) => (
              <View key={type} style={{ gap: spacing.xs }}>
                <Text variant="captionStrong" color="textSecondary">
                  {t(`nutrition.mealType.${type}`)}
                </Text>
                {summary.byMealType[type].map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </View>
            ))}

            <Button
              label={t('nutrition.addMeal')}
              variant="secondary"
              icon="＋"
              onPress={() => router.push('/log/nutrition')}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
