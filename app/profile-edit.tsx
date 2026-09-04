import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { GoalType } from '@/src/data/database.types';
import { profileRepository } from '@/src/data/repositories/profileRepository';
import { Button, InlineMessage, Screen, ScreenHeader, Text, TextField } from '@/src/design-system';
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
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) return;

    // خطأ التحقق يُعرض عند الحقل نفسه بدل أسفل الشاشة.
    if (!displayName.trim()) {
      setError(null);
      setNameError(t('profileEdit.nameRequired'));
      return;
    }
    setNameError(null);
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ gap: spacing.xl, paddingVertical: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <ScreenHeader title={t('profileEdit.title')} action="close" />

          <TextField
            label={t('profileEdit.nameLabel')}
            placeholder={t('profileEdit.namePlaceholder')}
            value={displayName}
            onChangeText={(next) => {
              setDisplayName(next);
              if (nameError) setNameError(null);
            }}
            error={nameError ?? undefined}
            editable={!isSubmitting}
            returnKeyType="done"
          />

          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" color="textSecondary">
              {t('profileEdit.goalLabel')}
            </Text>
            <GoalPicker value={goalType} onChange={setGoalType} />
          </View>

          {error ? <InlineMessage tone="danger" message={error} /> : null}

          <Button label={t('common.save')} size="lg" loading={isSubmitting} onPress={handleSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
