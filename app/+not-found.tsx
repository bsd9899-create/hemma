import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, Screen } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';

/**
 * الشاشة التي يصل إليها المستخدم من رابط عميق مكسور أو مسار محذوف.
 *
 * كانت نصًا داخل <Link>: بلا دور رابط لقارئ الشاشة، ومساحة لمس بحجم
 * النص وحده. صارت حالة فارغة كاملة بزر حقيقي — هذه آخر شاشة يجب أن
 * يعلق فيها أحد، فيجب أن يكون الخروج منها أوضح ما في التطبيق.
 */
export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
        <EmptyState emoji="🧭" title={t('notFound.title')} description={t('notFound.description')} />
        <Button label={t('notFound.backHome')} size="lg" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
