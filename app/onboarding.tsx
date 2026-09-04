import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { GoalType } from '@/src/data/database.types';
import { profileRepository } from '@/src/data/repositories/profileRepository';
import { Button, Screen, Text, TextField } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useProfileStore } from '@/src/features/auth/profileStore';
import { GoalPicker } from '@/src/features/profile/GoalPicker';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const fetchProfile = useProfileStore((s) => s.fetch);

  const [displayName, setDisplayName] = useState('');
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) return;

    // أخطاء التحقق تُعرض عند الحقل نفسه (وليس أسفل الشاشة حيث قد تكون
    // خارج مجال الرؤية داخل ScrollView).
    if (!displayName.trim()) {
      setError(null);
      setNameError(t('onboarding.nameRequired'));
      return;
    }
    setNameError(null);
    if (!goalType) {
      setError(t('onboarding.goalRequired'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await profileRepository.updateCurrent({
        display_name: displayName.trim(),
        goal_type: goalType,
        onboarding_completed_at: new Date().toISOString(),
      });
      await fetchProfile();
      router.replace('/(tabs)');
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('common.genericSaveError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* keyboardShouldPersistTaps: بدونها يحتاج المستخدم ضغطتين على "ابدأ"
            بينما لوحة المفاتيح مفتوحة — الأولى تُغلق اللوحة فقط. */}
        <ScrollView
          contentContainerStyle={{ gap: spacing.xl, paddingVertical: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={{ gap: spacing.xs }}>
            <Text variant="displayMd">{t('onboarding.welcome')}</Text>
            <Text variant="body" color="textSecondary">
              {t('onboarding.intro')}
            </Text>
          </View>

          <TextField
            label={t('onboarding.nameLabel')}
            placeholder={t('onboarding.namePlaceholder')}
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
              {t('onboarding.goalLabel')}
            </Text>
            <GoalPicker value={goalType} onChange={setGoalType} />
          </View>

          {error ? (
            <Text variant="caption" color="danger">
              {error}
            </Text>
          ) : null}

          <Button
            label={isSubmitting ? t('common.saving') : t('onboarding.start')}
            onPress={handleSubmit}
            disabled={isSubmitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
