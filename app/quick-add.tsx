import type { Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Text, colors, rowDirection } from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';

const QUICK_ADD_OPTIONS: { emoji: string; labelKey: string; href: Href }[] = [
  { emoji: '💧', labelKey: 'quickAdd.water', href: '/log/water' },
  { emoji: '⚖️', labelKey: 'quickAdd.weight', href: '/log/weight' },
  { emoji: '👟', labelKey: 'quickAdd.steps', href: '/log/steps' },
  { emoji: '🍽️', labelKey: 'quickAdd.nutrition', href: '/log/nutrition' },
  { emoji: '🏋️', labelKey: 'quickAdd.workout', href: '/log/workout' },
  { emoji: '💤', labelKey: 'quickAdd.sleep', href: '/log/sleep' },
];

export default function QuickAddModal() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <Text variant="title">{t('quickAdd.title')}</Text>

        <View style={{ flexDirection: rowDirection, flexWrap: 'wrap', gap: spacing.sm }}>
          {QUICK_ADD_OPTIONS.map((option) => (
            <Pressable
              key={option.labelKey}
              onPress={() => router.push(option.href)}
              style={{
                width: '30%',
                aspectRatio: 1,
                borderRadius: radius.lg,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xxs,
              }}
            >
              <Text variant="displayMd">{option.emoji}</Text>
              <Text variant="captionStrong">{t(option.labelKey)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
