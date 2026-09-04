import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../colors';
import { isRTL, rowDirection } from '../direction';
import { radius, spacing } from '../spacing';
import { Text } from './Text';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /**
   * شكل زر الخروج: "back" للشاشات المدفوعة (سهم)، و"close" للنوافذ (✕).
   * "none" للشاشات الجذرية (التبويبات) التي لا يُخرَج منها.
   */
  action?: 'back' | 'close' | 'none';
  /** يُستدعى بدل router.back() عند الحاجة لسلوك خروج مخصّص. */
  onAction?: () => void;
  /** عنصر اختياري في الطرف المقابل (زر إعدادات مثلاً). */
  trailing?: React.ReactNode;
};

/**
 * ترويسة موحّدة لكل الشاشات. سبب وجودها: مكدّس التنقل يعمل بـ
 * headerShown: false، فكانت كل شاشة تبني عنوانها وزر خروجها بنفسها —
 * أو تنساه تمامًا فيعلق المستخدم بلا مخرج ظاهر.
 */
export function ScreenHeader({ title, subtitle, action = 'none', onAction, trailing }: ScreenHeaderProps) {
  const router = useRouter();
  const hasAction = action !== 'none';

  function handleAction() {
    if (onAction) {
      onAction();
      return;
    }
    if (router.canGoBack()) router.back();
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {hasAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action === 'close' ? 'إغلاق' : 'رجوع'}
            onPress={handleAction}
            hitSlop={spacing.sm}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
          >
            <Text variant="bodyStrong" color="textSecondary">
              {action === 'close' ? '✕' : isRTL ? '›' : '‹'}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
        {trailing ?? <View />}
      </View>

      <View style={styles.titleBlock}>
        <Text variant="displayMd">{title}</Text>
        {subtitle ? (
          <Text variant="body" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: rowDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  titleBlock: {
    gap: spacing.xxs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.7,
  },
});
