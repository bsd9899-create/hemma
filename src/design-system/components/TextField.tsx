import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../colors';
import { radius, spacing } from '../spacing';
import { fontFamily } from '../typography';
import { Text } from './Text';

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
};

/**
 * حقل إدخال نصي موحّد — RTL افتراضيًا، مع تسمية ورسالة خطأ اختياريتين.
 * يعكس حالة التركيز (حدّ بلون العلامة) والتعطيل (شفافية أقل) بصريًا —
 * وليس فقط منطقيًا — لأن هذا هو الفرق بين حقل "يبدو تفاعليًا فعلًا"
 * وحقل ثابت المظهر بغض النظر عن حالته.
 */
export function TextField({ label, error, style, editable = true, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error ? colors.danger : isFocused ? colors.primary : 'transparent';

  return (
    <View style={{ gap: spacing.xxs, opacity: editable ? 1 : 0.5 }}>
      {label ? (
        <Text variant="captionStrong" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        textAlign="right"
        editable={editable}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            fontFamily: fontFamily.regular,
            fontSize: 15,
            color: colors.textPrimary,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderWidth: error || isFocused ? 1.5 : 1,
            borderColor,
            writingDirection: 'rtl',
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
