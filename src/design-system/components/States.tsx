import { StyleSheet, View } from 'react-native';
import { colors } from '../colors';
import { radius, spacing } from '../spacing';
import { rowDirection } from '../direction';
import { Button } from './Button';
import { Text } from './Text';

type EmptyStateProps = {
  emoji: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * حالة "لا يوجد شيء بعد" — نفس الشكل في كل الشاشات بدل نص رمادي عائم،
 * ومعها دائمًا خطوة تالية واضحة إن وُجدت.
 */
export function EmptyState({ emoji, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.centered}>
      <View style={styles.emojiCircle}>
        <Text variant="displayMd">{emoji}</Text>
      </View>
      <Text variant="title" style={styles.centerText}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="textSecondary" style={styles.centerText}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retryLabel: string;
};

/** حالة فشل التحميل — رسالة واضحة + طريق واحد للخروج منها (إعادة المحاولة). */
export function ErrorState({ message, onRetry, retryLabel }: ErrorStateProps) {
  return (
    <View style={styles.centered}>
      <View style={[styles.emojiCircle, styles.errorCircle]}>
        <Text variant="displayMd">⚠️</Text>
      </View>
      <Text variant="body" color="textSecondary" style={styles.centerText}>
        {message}
      </Text>
      {onRetry ? <Button label={retryLabel} variant="secondary" onPress={onRetry} style={styles.action} /> : null}
    </View>
  );
}

type InlineMessageProps = {
  /** danger لأخطاء الحفظ، success لتأكيد نجاح العملية. */
  tone: 'danger' | 'success';
  message: string;
};

/** رسالة سطرية أسفل النماذج — بديل موحّد لنص أحمر عائم بلا سياق. */
export function InlineMessage({ tone, message }: InlineMessageProps) {
  const isDanger = tone === 'danger';
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.inline, { backgroundColor: isDanger ? colors.dangerSoft : colors.successSoft }]}
    >
      <Text variant="captionStrong" color={isDanger ? 'danger' : 'success'} style={styles.inlineText}>
        {isDanger ? '⚠️' : '✓'}  {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emojiCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  errorCircle: {
    backgroundColor: colors.dangerSoft,
  },
  centerText: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.xs,
    minWidth: 180,
  },
  inline: {
    flexDirection: rowDirection,
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  inlineText: {
    flex: 1,
  },
});
