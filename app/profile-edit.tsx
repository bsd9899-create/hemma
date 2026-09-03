import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { GoalType } from '@/src/data/database.types';
import { profileRepository } from '@/src/data/repositories/profileRepository';
import { Button, Screen, Text, TextField } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { getFriendlyErrorMessage } from '@/src/lib/errors';
import { useProfileStore } from '@/src/features/auth/profileStore';
import { GoalPicker } from '@/src/features/profile/GoalPicker';

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const fetchProfile = useProfileStore((s) => s.fetch);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [goalType, setGoalType] = useState<GoalType | null>(profile?.goal_type ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!displayName.trim()) {
      setError(t('profileEdit.nameRequired'));
      return;
    }
    if (!goalType) {
      setError(t('profileEdit.goalRequired'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await profileRepository.updateCurrent({ display_name: displayName.trim(), goal_type: goalType });
      await fetchProfile();
      router.back();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('common.genericSaveError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.xl, paddingVertical: spacing.xl }}>
        <Text variant="displayMd">{t('profileEdit.title')}</Text>

        <TextField
          label={t('profileEdit.nameLabel')}
          placeholder={t('profileEdit.namePlaceholder')}
          value={displayName}
          onChangeText={setDisplayName}
        />

        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" color="textSecondary">
            {t('profileEdit.goalLabel')}
          </Text>
          <GoalPicker value={goalType} onChange={setGoalType} />
        </View>

        {error ? (
          <Text variant="caption" color="danger">
            {error}
          </Text>
        ) : null}

        <Button label={isSubmitting ? t('common.saving') : t('common.save')} onPress={handleSubmit} disabled={isSubmitting} />
      </ScrollView>
    </Screen>
  );
}
