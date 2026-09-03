import { Link } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen, Text } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
        <Text variant="title">{t('notFound.title')}</Text>
        <Link href="/">
          <Text variant="bodyStrong" color="primary">
            {t('notFound.backHome')}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
