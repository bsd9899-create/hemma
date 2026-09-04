import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { teamsRepository } from '@/src/data/repositories/teamsRepository';
import { Button, Screen, Text, TextField } from '@/src/design-system';
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
        <Text variant="displayMd">{t('teamCreate.title')}</Text>
        <TextField
          label={t('teamCreate.nameLabel')}
          placeholder={t('teamCreate.namePlaceholder')}
          value={name}
          onChangeText={setName}
          error={error ?? undefined}
          editable={!isSubmitting}
        />
        <Button label={isSubmitting ? t('teamCreate.creating') : t('teamCreate.create')} disabled={isSubmitting} onPress={handleSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
