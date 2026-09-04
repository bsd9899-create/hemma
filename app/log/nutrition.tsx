import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { dailyLogsRepository } from '@/src/data/repositories/dailyLogsRepository';
import { Button, Screen, Text, TextField, colors, rowDirection } from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

const MEAL_TYPES: { value: 'breakfast' | 'lunch' | 'dinner' | 'snack'; labelKey: string }[] = [
  { value: 'breakfast', labelKey: 'logNutrition.breakfast' },
  { value: 'lunch', labelKey: 'logNutrition.lunch' },
  { value: 'dinner', labelKey: 'logNutrition.dinner' },
  { value: 'snack', labelKey: 'logNutrition.snack' },
];

export default function LogNutritionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]['value']>('lunch');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) return;
    // بدون هذا كان الزر لا يفعل شيئًا إطلاقًا ولا يعرض سببًا لو غابت الجلسة.
    if (!userId) {
      setError(t('common.notSignedIn'));
      return;
    }
    if (!description.trim()) {
      setError(t('logNutrition.descriptionRequired'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await dailyLogsRepository.addNutritionLog(userId, {
        mealType,
        description: description.trim(),
        calories: calories ? Number(calories) : undefined,
      });
      // نفس منطق NumericLogForm: أُغلق نافذة "إضافة سريعة" كاملة بعد الحفظ.
      if (router.canDismiss()) {
        router.dismissAll();
      } else {
        router.back();
      }
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('common.genericSaveError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, gap: spacing.lg }}>
        <Text variant="displayMd">{t('logNutrition.title')}</Text>

        <View style={{ flexDirection: rowDirection, flexWrap: 'wrap', gap: spacing.sm }}>
          {MEAL_TYPES.map((meal) => {
            const selected = mealType === meal.value;
            return (
              <Pressable
                key={meal.value}
                onPress={() => setMealType(meal.value)}
                style={{
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                }}
              >
                <Text variant="captionStrong" color={selected ? 'onPrimary' : 'textPrimary'}>
                  {t(meal.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField
          label={t('logNutrition.descriptionLabel')}
          placeholder={t('logNutrition.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          error={error ?? undefined}
          editable={!isSubmitting}
        />

        <TextField
          label={t('logNutrition.caloriesLabel')}
          placeholder={t('logNutrition.caloriesPlaceholder')}
          value={calories}
          onChangeText={setCalories}
          keyboardType="number-pad"
          editable={!isSubmitting}
        />

        <Button label={isSubmitting ? t('common.saving') : t('common.save')} disabled={isSubmitting} onPress={handleSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
