import { Component, type PropsWithChildren, type ReactNode } from 'react';
import RNRestart from 'react-native-restart';
import { Button, Screen, Text } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import i18n from '@/src/lib/i18n';

type ErrorBoundaryState = { error: Error | null };

/**
 * يمسك أي خطأ غير متوقع أثناء render في شجرة الشاشات (بدل تعطّل التطبيق
 * بالكامل بلا أي تفسير للمستخدم) ويعرض بديلاً بسيطًا مع خيار إعادة التشغيل.
 * لا يمسك أخطاء async/معالجات الأحداث — هذه تُعالَج محليًا بالفعل عبر
 * try/catch في كل شاشة ورسائل getFriendlyErrorMessage.
 *
 * مكوّن class، فلا يمكنه استخدام useTranslation() — يقرأ من نسخة i18n
 * العامة مباشرة، وهذا آمن لأن تغيير اللغة يعيد تشغيل التطبيق بالكامل.
 */
export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
        <Text variant="displayMd">😕</Text>
        <Text variant="title" style={{ textAlign: 'center' }}>
          {i18n.t('errorBoundary.title')}
        </Text>
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          {i18n.t('errorBoundary.message')}
        </Text>
        <Button label={i18n.t('errorBoundary.restart')} onPress={() => RNRestart.restart()} />
      </Screen>
    );
  }
}
