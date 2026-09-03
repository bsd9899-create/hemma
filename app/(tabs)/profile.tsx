import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Button, Card, Screen, Text, colors, rowDirection } from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';
import { deleteAccount, signOut } from '@/src/features/auth/api';
import { useAuthStore } from '@/src/features/auth/store';
import { useProfileStore } from '@/src/features/auth/profileStore';
import { useHealthSync } from '@/src/integrations/health/useHealthSync';
import { getFriendlyErrorMessage } from '@/src/lib/errors';
import { changeLanguage, type AppLanguage } from '@/src/lib/i18n';
import { GOAL_OPTIONS } from '@/src/features/profile/GoalPicker';

const PRIVACY_POLICY_URL = 'https://github.com/bsd9899-create/hemma/blob/main/docs/PRIVACY_POLICY.md';

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
];

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useProfileStore((s) => s.profile);
  const { isAvailable, isSyncing, error, syncToday } = useHealthSync(userId);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (e) {
      Alert.alert(t('profile.signOutError'), getFriendlyErrorMessage(e, t('common.retry')));
    } finally {
      setIsSigningOut(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(t('profile.deleteConfirmTitle'), t('profile.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteConfirmAction'),
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteAccount();
          } catch (e) {
            Alert.alert(t('profile.deleteError'), getFriendlyErrorMessage(e, t('profile.tryAgainLater')));
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  }

  async function handleLanguageChange(lang: AppLanguage) {
    if (lang === i18n.language || isSwitchingLanguage) return;
    setIsSwitchingLanguage(true);
    await changeLanguage(lang);
    // changeLanguage يعيد تشغيل التطبيق فعليًا — لا حاجة لإيقاف isSwitchingLanguage هنا.
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View>
          <Text variant="title">{profile?.display_name ?? t('profile.fallbackName')}</Text>
          <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xxs }}>
            {profile?.goal_type
              ? t('profile.goalLine', { goal: t(GOAL_OPTIONS.find((g) => g.value === profile.goal_type)?.labelKey ?? '') })
              : t('profile.completeGoal')}
          </Text>
        </View>

        <Button label={t('profile.editProfile')} variant="secondary" onPress={() => router.push('/profile-edit')} />
        <Button label={t('profile.accountabilityPartner')} variant="secondary" onPress={() => router.push('/accountability')} />
        <Button label={t('profile.premium')} variant="secondary" onPress={() => router.push('/paywall')} />

        <Card variant="soft">
          <Text variant="overline" color="textSecondary">
            {t('profile.appleHealthTitle')}
          </Text>
          {isAvailable ? (
            <>
              <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
                {t('profile.appleHealthDescription')}
              </Text>
              <Button
                label={isSyncing ? t('profile.syncing') : t('profile.syncNow')}
                variant="secondary"
                style={{ marginTop: spacing.sm }}
                disabled={isSyncing}
                onPress={syncToday}
              />
              {error ? (
                <Text variant="caption" color="danger" style={{ marginTop: spacing.xs }}>
                  {error}
                </Text>
              ) : null}
            </>
          ) : (
            <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
              {t('profile.healthUnavailable')}
            </Text>
          )}
        </Card>

        <Card variant="soft">
          <Text variant="overline" color="textSecondary">
            {t('profile.language')}
          </Text>
          <View style={{ flexDirection: rowDirection, gap: spacing.sm, marginTop: spacing.sm }}>
            {LANGUAGE_OPTIONS.map((option) => {
              const selected = option.value === i18n.language;
              return (
                <Pressable
                  key={option.value}
                  disabled={isSwitchingLanguage}
                  onPress={() => handleLanguageChange(option.value)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    backgroundColor: selected ? colors.primary : colors.surface,
                    opacity: isSwitchingLanguage ? 0.6 : 1,
                  }}
                >
                  <Text variant="bodyStrong" color={selected ? 'onPrimary' : 'textPrimary'}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Button label={t('profile.privacyPolicy')} variant="ghost" onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})} />
        <Button
          label={isSigningOut ? t('profile.signingOut') : t('profile.signOut')}
          variant="ghost"
          disabled={isSigningOut}
          onPress={handleSignOut}
        />
        <Button
          label={isDeleting ? t('profile.deleting') : t('profile.deleteAccount')}
          variant="ghost"
          danger
          disabled={isDeleting}
          onPress={confirmDeleteAccount}
        />

        <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
          {t('profile.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
        </Text>
      </ScrollView>
    </Screen>
  );
}
