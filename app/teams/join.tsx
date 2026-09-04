import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { teamsRepository } from '@/src/data/repositories/teamsRepository';
import { Button, InlineMessage, Screen, ScreenHeader, TextField } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

export default function JoinTeamScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code.trim()) {
      setError(t('teamJoin.codeRequired'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await teamsRepository.joinByCode(code.trim());
      router.back();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('teamJoin.error')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, gap: spacing.lg }}>
        <ScreenHeader title={t('teamJoin.title')} action="close" />
        <TextField
          label={t('teamJoin.codeLabel')}
          placeholder={t('teamJoin.codePlaceholder')}
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          editable={!isSubmitting}
        />
        {error ? <InlineMessage tone="danger" message={error} /> : null}

        <Button label={t('teamJoin.join')} size="lg" loading={isSubmitting} onPress={handleSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
