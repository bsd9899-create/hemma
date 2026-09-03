import { Component, type PropsWithChildren, type ReactNode } from 'react';
import RNRestart from 'react-native-restart';
import { Button, Screen, Text } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';

type ErrorBoundaryState = { error: Error | null };

/**
 * يمسك أي خطأ غير متوقع أثناء render في شجرة الشاشات (بدل تعطّل التطبيق
 * بالكامل بلا أي تفسير للمستخدم) ويعرض بديلاً بسيطًا مع خيار إعادة التشغيل.
 * لا يمسك أخطاء async/معالجات الأحداث — هذه تُعالَج محليًا بالفعل عبر
 * try/catch في كل شاشة ورسائل getFriendlyErrorMessage.
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
          حدث خطأ غير متوقع
        </Text>
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          نعتذر عن الإزعاج — جرّب إعادة تشغيل التطبيق.
        </Text>
        <Button label="إعادة التشغيل" onPress={() => RNRestart.restart()} />
      </Screen>
    );
  }
}
