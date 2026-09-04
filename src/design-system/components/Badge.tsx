import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '../colors';
import { radius, spacing } from '../spacing';
import { Text } from './Text';

type BadgeTone = 'accent' | 'success' | 'neutral' | 'danger';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  style?: ViewStyle;
};

/** شارة صغيرة للحالات والوسوم (مميّز، مكتمل، متبقٍ...) — بديل موحّد للنصوص الملوّنة المتناثرة. */
export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  return (
    <View style={[styles.base, toneStyles[tone].container, style]}>
      <Text variant="overline" color={toneStyles[tone].text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
});

const toneStyles: Record<BadgeTone, { container: ViewStyle; text: 'accent' | 'success' | 'textSecondary' | 'danger' }> = {
  accent: { container: { backgroundColor: colors.accentSoft }, text: 'accent' },
  success: { container: { backgroundColor: colors.successSoft }, text: 'success' },
  neutral: { container: { backgroundColor: colors.surfaceAlt }, text: 'textSecondary' },
  danger: { container: { backgroundColor: colors.dangerSoft }, text: 'danger' },
};
