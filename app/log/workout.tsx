import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { dailyLogsRepository } from '@/src/data/repositories/dailyLogsRepository';
import { Button, InlineMessage, Screen, ScreenHeader, TextField } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

export default function LogWorkoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) return;
    if (!userId) {
      setError(t('common.notSignedIn'));
      return;
    }
    if (!title.trim()) {
      setError(t('logWorkout.nameRequired'));
      return;
    }
    const minutes = Number(duration);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setError(t('logWorkout.durationRequired'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await dailyLogsRepository.addWorkout(userId, { title: title.trim(), durationMinutes: Math.round(minutes) });
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
        <ScreenHeader title={`🏋️ ${t('logWorkout.title')}`} action="close" />

        <TextField
          label={t('logWorkout.nameLabel')}
          placeholder={t('logWorkout.namePlaceholder')}
          value={title}
          onChangeText={(next) => {
            setTitle(next);
            if (error) setError(null);
          }}
          editable={!isSubmitting}
        />

        <TextField
          label={t('logWorkout.durationLabel')}
          placeholder={t('logWorkout.durationPlaceholder')}
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          editable={!isSubmitting}
          returnKeyType="done"
        />

        {error ? <InlineMessage tone="danger" message={error} /> : null}

        <Button label={t('common.save')} size="lg" loading={isSubmitting} onPress={handleSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
