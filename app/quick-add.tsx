import type { Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, ScreenHeader, Text, colors, rowDirection } from '@/src/design-system';
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
        <ScreenHeader title={t('quickAdd.title')} action="close" />

        <View style={{ flexDirection: rowDirection, flexWrap: 'wrap', gap: spacing.sm }}>
          {QUICK_ADD_OPTIONS.map((option) => (
            <Pressable
              key={option.labelKey}
              accessibilityRole="button"
              accessibilityLabel={t(option.labelKey)}
              onPress={() => router.push(option.href)}
              style={({ pressed }) => [
                {
                  width: '30%',
                  aspectRatio: 1,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xxs,
                },
                pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
              ]}
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
