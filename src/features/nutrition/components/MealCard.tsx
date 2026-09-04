import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Text, rowDirection } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { formatNumber, formatTime } from '@/src/lib/i18n/format';
import type { Meal, MealType } from '@/src/data/repositories/dailyLogsRepository';

/** رمز لكل نوع وجبة — يمنح القائمة إيقاعًا بصريًا بدل صفوف نصية متطابقة. */
export const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '🍽️',
  dinner: '🌙',
  snack: '🥗',
};

type MealCardProps = {
  meal: Meal;
};

/** بطاقة وجبة واحدة: الوصف، الوقت، السعرات، والماكروز إن وُجدت. */
export function MealCard({ meal }: MealCardProps) {
  const { t } = useTranslation();
  const macros = [
    meal.protein_g !== null ? t('nutrition.macroShort.protein', { value: formatNumber(Math.round(meal.protein_g)) }) : null,
    meal.carbs_g !== null ? t('nutrition.macroShort.carbs', { value: formatNumber(Math.round(meal.carbs_g)) }) : null,
    meal.fat_g !== null ? t('nutrition.macroShort.fat', { value: formatNumber(Math.round(meal.fat_g)) }) : null,
  ].filter(Boolean);

  return (
    <Card variant="soft" style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: rowDirection, alignItems: 'flex-start', gap: spacing.sm }}>
        <Text variant="title">{MEAL_EMOJI[meal.meal_type]}</Text>

        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="bodyStrong">{meal.description}</Text>
          <Text variant="caption" color="textSecondary">
            {formatTime(meal.logged_at)}
          </Text>
        </View>

        {meal.calories !== null ? (
          <Badge label={t('nutrition.kcalValue', { value: formatNumber(meal.calories) })} tone="accent" />
        ) : null}
      </View>

      {macros.length > 0 ? (
        <Text variant="caption" color="textSecondary">
          {macros.join('  ·  ')}
        </Text>
      ) : null}
    </Card>
  );
}
