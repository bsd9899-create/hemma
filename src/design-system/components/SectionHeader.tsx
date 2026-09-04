import { Pressable, StyleSheet, View } from 'react-native';
import { rowDirection } from '../direction';
import { spacing } from '../spacing';
import { Text } from './Text';

type SectionHeaderProps = {
  title: string;
  /** نص إجراء اختياري في الطرف المقابل (مثل "عرض الكل"). */
  actionLabel?: string;
  onAction?: () => void;
};

/** عنوان قسم داخل الشاشة — يوحّد إيقاع العناوين الثانوية بين كل الشاشات. */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text variant="overline" color="textSecondary">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={spacing.xs}>
          <Text variant="captionStrong" color="primary">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: rowDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
