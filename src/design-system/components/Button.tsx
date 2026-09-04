import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '../colors';
import { elevation } from '../elevation';
import { radius, spacing } from '../spacing';
import { rowDirection } from '../direction';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** يلوّن نص الزر بلون التحذير — لأفعال مدمِّرة لا تُراجَع (حذف الحساب...)، لتمييزها بصريًا عن أزرار ثانوية عادية بنفس variant. */
  danger?: boolean;
  /**
   * يعرض مؤشر تحميل داخل الزر ويعطّله — بدل تبديل النص يدويًا في كل شاشة.
   * النص يبقى ظاهرًا بجانب المؤشر حتى لا يقفز عرض الزر.
   */
  loading?: boolean;
  disabled?: boolean;
  /** رمز/إيموجي صغير قبل النص — للأفعال التي يوضّحها رمز بسرعة. */
  icon?: string;
  style?: ViewStyle;
};

/** زر أساسي بثلاث درجات: primary (تيل) للفعل الرئيسي، secondary (كريمي) وghost للثانوي. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  danger,
  loading = false,
  disabled,
  icon,
  style,
}: ButtonProps) {
  const isDisabled = Boolean(disabled) || loading;
  const labelColor = danger ? 'danger' : variant === 'primary' ? 'onPrimary' : 'textPrimary';
  const spinnerColor = variant === 'primary' ? colors.onPrimary : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        variant === 'primary' && !isDisabled && elevation.card,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
        <Text variant="bodyStrong" color={labelColor} style={styles.label}>
          {icon && !loading ? `${icon}  ${label}` : label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: rowDirection,
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});

/** ارتفاعات ثابتة تضمن هدف لمس مريح (≥ 48px) وإيقاعًا بصريًا موحّدًا. */
const sizeStyles: Record<ButtonSize, ViewStyle> = {
  md: { minHeight: 48, paddingVertical: spacing.sm },
  lg: { minHeight: 56, paddingVertical: spacing.md },
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
};
