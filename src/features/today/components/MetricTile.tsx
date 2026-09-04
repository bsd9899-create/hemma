import { Pressable, View } from 'react-native';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Card, ProgressBar, Text } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';

type MetricTileProps = {
  emoji: string;
  label: string;
  valueText: string;
  progress?: number;
  /**
   * شاشة التسجيل الخاصة بهذا المقياس. وجودها يحوّل البطاقة إلى اختصار
   * مباشر: كانت البطاقات عرضًا فقط، فيضطر المستخدم للمرور بنافذة
   * "إضافة سريعة" لتسجيل ما يراه أمامه.
   */
  href?: Href;
  /** نص وصفي لقارئ الشاشة يوضّح أن البطاقة قابلة للضغط. */
  actionHint?: string;
};

/** بطاقة صغيرة لعنصر واحد في صف (تمرين/تغذية/ماء/خطوات) في شاشة اليوم. */
export function MetricTile({ emoji, label, valueText, progress, href, actionHint }: MetricTileProps) {
  const router = useRouter();

  const content = (
    <>
      <Text variant="title">{emoji}</Text>
      <Text variant="captionStrong" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong">{valueText}</Text>
      {progress !== undefined ? (
        <View style={{ marginTop: spacing.xxs }}>
          <ProgressBar progress={progress} height={5} />
        </View>
      ) : null}
    </>
  );

  if (!href) {
    return (
      <Card variant="soft" style={{ flex: 1, gap: spacing.xs }}>
        {content}
      </Card>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={actionHint ?? `${label}: ${valueText}`}
      onPress={() => router.push(href)}
      style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}
    >
      <Card variant="soft" style={{ flex: 1, gap: spacing.xs }}>
        {content}
      </Card>
    </Pressable>
  );
}
