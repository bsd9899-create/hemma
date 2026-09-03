import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Screen, Text, TextField, colors, rowDirection } from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

type NumericLogFormProps = {
  titleKey: string;
  emoji: string;
  unitKey: string;
  placeholderKey: string;
  /** أزرار قيم جاهزة (مثل 250/500/750 للماء) — اختيارية. */
  presets?: number[];
  /** يسمح بفواصل عشرية (الوزن/النوم) أم أعداد صحيحة فقط (الخطوات). */
  allowDecimal?: boolean;
  onSubmit: (value: number) => Promise<void>;
};

/**
 * نموذج إدخال رقمي موحّد — يغطي الماء والوزن والخطوات والنوم بنفس
 * الشكل، فرقها فقط الوحدة والقيم الجاهزة والسماح بالكسور.
 */
export function NumericLogForm({
  titleKey,
  emoji,
  unitKey,
  placeholderKey,
  presets,
  allowDecimal = false,
  onSubmit,
}: NumericLogFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(raw: number) {
    if (!Number.isFinite(raw) || raw <= 0) {
      setError(t('logCommon.invalidNumber'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(raw);
      router.back();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('common.genericSaveError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, gap: spacing.lg }}>
        <Text variant="displayMd">
          {emoji} {t(titleKey)}
        </Text>

        {presets && presets.length > 0 ? (
          <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
            {presets.map((preset) => (
              <Pressable
                key={preset}
                disabled={isSubmitting}
                onPress={() => submit(preset)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                }}
              >
                <Text variant="bodyStrong">{preset}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <TextField
          label={t('logCommon.customValueLabel', { unit: t(unitKey) })}
          placeholder={t(placeholderKey)}
          value={value}
          onChangeText={setValue}
          error={error ?? undefined}
          keyboardType={allowDecimal ? 'decimal-pad' : 'number-pad'}
          editable={!isSubmitting}
        />

        <Button
          label={isSubmitting ? t('common.saving') : t('common.save')}
          disabled={isSubmitting}
          onPress={() => submit(Number(value.replace(',', '.')))}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
