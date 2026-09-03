import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GoalType } from '@/src/data/database.types';
import { Card, Text, colors, rowDirection } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';

export const GOAL_OPTIONS: { value: GoalType; labelKey: string; emoji: string }[] = [
  { value: 'lose_weight', labelKey: 'goals.loseWeight', emoji: '🔥' },
  { value: 'gain_muscle', labelKey: 'goals.gainMuscle', emoji: '💪' },
  { value: 'increase_activity', labelKey: 'goals.increaseActivity', emoji: '🏃' },
  { value: 'general_health', labelKey: 'goals.generalHealth', emoji: '🌿' },
];

type GoalPickerProps = {
  value: GoalType | null;
  onChange: (goal: GoalType) => void;
};

/** اختيار الهدف الأساسي — مكوّن مشترك بين onboarding وتعديل الملف الشخصي. */
export function GoalPicker({ value, onChange }: GoalPickerProps) {
  const { t } = useTranslation();

  return (
    <View style={{ gap: spacing.sm }}>
      {GOAL_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable key={option.value} onPress={() => onChange(option.value)}>
            <Card
              variant={selected ? 'surface' : 'soft'}
              style={selected ? { borderColor: colors.primary, borderWidth: 2 } : undefined}
            >
              <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing.sm }}>
                <Text variant="title">{option.emoji}</Text>
                <Text variant="bodyStrong">{t(option.labelKey)}</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}
