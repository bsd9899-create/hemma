import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, colors, rowDirection } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';

export type Option<T extends string> = {
  value: T;
  emoji: string;
  labelKey: string;
  /** سطر ثانٍ صغير — نطاق رقمي أو توضيح ("٣-٥ مرات"). */
  hintKey?: string;
};

/**
 * مجموعة اختيار واحد ببطاقات.
 *
 * السطر الثاني (hint) ليس زينة: خيار مثل "رياضي منتظم" يعني أشياء
 * مختلفة لكل شخص، والنطاق الرقمي تحته يحوّله من انطباع إلى تعريف —
 * وهو ما يجعل معامل النشاط المحسوب صحيحًا فعلًا.
 */
export function OptionCards<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={{ gap: spacing.sm }}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={t(option.labelKey)}
            accessibilityHint={option.hintKey ? t(option.hintKey) : undefined}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <Card
              variant={selected ? 'surface' : 'soft'}
              style={selected ? { borderColor: colors.primary, borderWidth: 2 } : undefined}
            >
              <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing.sm }}>
                <Text variant="title">{option.emoji}</Text>
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <Text variant="bodyStrong">{t(option.labelKey)}</Text>
                  {option.hintKey ? (
                    <Text variant="caption" color="textSecondary">
                      {t(option.hintKey)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}
