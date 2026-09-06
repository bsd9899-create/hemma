import { useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTranslation } from 'react-i18next';
import { Button, InlineMessage, Screen, Text, Wordmark, rowDirection } from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';
import { signInWithApple, signInWithGoogle } from '@/src/features/auth/oauth';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

const PRIVACY_URL = 'https://himmah.online/privacy.html';
const TERMS_URL = 'https://himmah.online/terms.html';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const isBusy = isGoogleLoading || isAppleLoading;

  async function handleGoogle() {
    if (isBusy) return;
    setError(null);
    setIsGoogleLoading(true);
    try {
      // نجاح تسجيل الدخول يحدّث الجلسة تلقائيًا عبر onAuthStateChange في
      // src/features/auth/store.ts، وحارس التنقل في useAuthGate يتولى
      // الانتقال للمكان الصحيح (onboarding أو الرئيسية) — إلغاء المستخدم
      // للمتصفح بنفسه ليس خطأ يستحق رسالة، فقط عودة صامتة لهذه الشاشة.
      await signInWithGoogle();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('signIn.googleError')));
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleApple() {
    if (isBusy) return;
    setError(null);
    setIsAppleLoading(true);
    try {
      await signInWithApple();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('signIn.appleError')));
    } finally {
      setIsAppleLoading(false);
    }
  }

  function openLink(url: string) {
    Linking.openURL(url).catch(() => setError(t('profile.linkError')));
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xl }}>
        <Wordmark size="lg" />
        <View style={{ gap: spacing.xs }}>
          <Text variant="title" style={{ textAlign: 'center' }}>
            {t('signIn.welcome')}
          </Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            {t('signIn.subtitle')}
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button
            label={t('signIn.continueWithGoogle')}
            variant="secondary"
            size="lg"
            loading={isGoogleLoading}
            disabled={isBusy}
            onPress={handleGoogle}
          />

          {/* زر Apple الأصلي إلزامي على iOS فقط طالما نعرض بديلًا اجتماعيًا آخر (Google) —
              متطلب مباشر من إرشادات آبل 4.8، ولا معنى له على أندرويد. */}
          {Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.pill}
              style={{ height: 56, opacity: isBusy ? 0.45 : 1 }}
              onPress={handleApple}
            />
          ) : null}

          {error ? <InlineMessage tone="danger" message={error} /> : null}
        </View>

        {/* كانت جملة ميتة: تُحيل إلى مستندين لا سبيل لفتحهما. الموافقة
            على شروط لا يستطيع المستخدم قراءتها ليست موافقة، والرابطان
            مطلوبان لمراجعة App Store أيضًا. */}
        <View style={{ alignItems: 'center', gap: spacing.xxs }}>
          <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
            {t('signIn.legalPrefix')}
          </Text>
          <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => openLink(PRIVACY_URL)}
            >
              <Text variant="captionStrong" color="primary">
                {t('profile.privacyPolicy')}
              </Text>
            </Pressable>
            <Text variant="caption" color="textSecondary">
              ·
            </Text>
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => openLink(TERMS_URL)}>
              <Text variant="captionStrong" color="primary">
                {t('profile.termsOfUse')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}
