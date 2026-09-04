import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { teamsRepository } from '@/src/data/repositories/teamsRepository';
import { Button, InlineMessage, Screen, ScreenHeader, TextField } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

export default function CreateTeamScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) return;
    if (!userId) {
      setError(t('common.notSignedIn'));
      return;
    }
    if (!name.trim()) {
      setError(t('teamCreate.nameRequired'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await teamsRepository.createTeam(name.trim(), userId);
      router.back();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('teamCreate.error')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, gap: spacing.lg }}>
        <ScreenHeader title={t('teamCreate.title')} action="close" />
        <TextField
          label={t('teamCreate.nameLabel')}
          placeholder={t('teamCreate.namePlaceholder')}
          value={name}
          onChangeText={setName}
          editable={!isSubmitting}
        />
        {error ? <InlineMessage tone="danger" message={error} /> : null}

        <Button label={t('teamCreate.create')} size="lg" loading={isSubmitting} onPress={handleSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
