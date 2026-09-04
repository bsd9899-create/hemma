import { useState } from 'react';
import { Platform, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Button, Screen, Text, Wordmark } from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';
import { signInWithApple, signInWithGoogle } from '@/src/features/auth/oauth';
import { runHostnameDiagnostics, runNetworkDiagnostics } from '@/src/features/auth/networkDiagnostics';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

export default function SignInScreen() {
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
      setError(getFriendlyErrorMessage(e, 'تعذّر تسجيل الدخول عبر Google'));
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
      setError(getFriendlyErrorMessage(e, 'تعذّر تسجيل الدخول عبر Apple'));
    } finally {
      setIsAppleLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xl }}>
        <Wordmark />
        <View style={{ gap: spacing.xs }}>
          <Text variant="title" style={{ textAlign: 'center' }}>
            هلا فيك 👋
          </Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            سجّل دخولك بضغطة واحدة لتبدأ رحلتك مع هِمّة
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button
            label={isGoogleLoading ? 'جارِ تسجيل الدخول...' : 'المتابعة عبر Google'}
            variant="secondary"
            onPress={handleGoogle}
            disabled={isBusy}
          />

          {/* زر Apple الأصلي إلزامي على iOS فقط طالما نعرض بديلًا اجتماعيًا آخر (Google) —
              متطلب مباشر من إرشادات آبل 4.8، ولا معنى له على أندرويد. */}
          {Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.pill}
              style={{ height: 50, opacity: isBusy ? 0.5 : 1 }}
              onPress={handleApple}
            />
          ) : null}

          {error ? (
            <Text variant="caption" color="danger" style={{ textAlign: 'center' }}>
              {error}
            </Text>
          ) : null}

          {/* ⚠️ زر تشخيصي مؤقت فقط — احذفه مع src/features/auth/networkDiagnostics.ts
              بعد انتهاء تشخيص مشكلة الشبكة. النتائج تُطبع في Metro logs فقط. */}
          {__DEV__ ? (
            <>
              <Button label="فحص الشبكة (تشخيصي)" variant="ghost" onPress={() => void runNetworkDiagnostics()} />
              <Button label="فحص hostname (تشخيصي)" variant="ghost" onPress={() => void runHostnameDiagnostics()} />
            </>
          ) : null}
        </View>

        <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
          بالمتابعة، أنت توافق على سياسة الخصوصية وشروط استخدام هِمّة
        </Text>
      </View>
    </Screen>
  );
}
