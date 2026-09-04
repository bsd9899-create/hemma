import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { GoalType } from '@/src/data/database.types';
import { profileRepository } from '@/src/data/repositories/profileRepository';
import { Button, InlineMessage, Screen, Text, TextField, Wordmark } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { signOut } from '@/src/features/auth/api';
import { useAuthStore } from '@/src/features/auth/store';
import { useProfileStore } from '@/src/features/auth/profileStore';
import { GoalPicker } from '@/src/features/profile/GoalPicker';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const fetchProfile = useProfileStore((s) => s.fetch);
  const profileLoadError = useProfileStore((s) => s.loadError);

  const [displayName, setDisplayName] = useState('');
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const sessionEmail = useAuthStore((s) => s.session?.user.email);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  /**
   * مخرج من هذه الشاشة. بدونه يبقى المستخدم الذي لديه جلسة محفوظة ولم
   * يُكمل onboarding محبوسًا هنا للأبد: حارس التنقل يعيده إلى onboarding
   * في كل مرة، ولا توجد أي شاشة أخرى يصل إليها ليسجّل الخروج منها.
   */
  function confirmSignOut() {
    if (isSigningOut) return;
    Alert.alert(t('onboarding.signOutConfirmTitle'), t('onboarding.signOutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('onboarding.signOut'),
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            // إنهاء الجلسة فقط — لا تُحذف أي بيانات من قاعدة البيانات.
            // حارس التنقل يتولى العودة لشاشة الدخول فور اختفاء الجلسة.
            await signOut();
          } catch (e) {
            Alert.alert(t('onboarding.signOutError'), getFriendlyErrorMessage(e));
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
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
          <View style={{ gap: spacing.sm, alignItems: 'center' }}>
            <Wordmark size="md" />
            <Text variant="displayMd" style={{ textAlign: 'center' }}>
              {t('onboarding.welcome')}
            </Text>
            <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
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

          {profileLoadError ? (
            <View style={{ gap: spacing.sm }}>
              <InlineMessage tone="danger" message={profileLoadError} />
              <Button label={t('common.retry')} variant="secondary" onPress={() => void fetchProfile()} />
            </View>
          ) : null}

          {error ? <InlineMessage tone="danger" message={error} /> : null}

          <Button label={t('onboarding.start')} size="lg" loading={isSubmitting} onPress={handleSubmit} />

          <View style={{ gap: spacing.xxs, alignItems: 'center' }}>
            <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
              {sessionEmail
                ? t('onboarding.signedInAs') + ` · ${sessionEmail}`
                : t('onboarding.signedInAs')}
            </Text>
            <Button
              label={t('onboarding.signOut')}
              variant="ghost"
              loading={isSigningOut}
              disabled={isSubmitting}
              onPress={confirmSignOut}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
