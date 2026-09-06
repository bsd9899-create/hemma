import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, rowDirection } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';

export type SummaryRow = { label: string; value: string };

/**
 * بطاقة ملخّص مع رابط "تعديل" يقود إلى المحرّر المختص بمحتواها.
 *
 * البديل الذي حلّت محله كان كومة أزرار متطابقة: كلها بنفس الشكل، فلا
 * يعرف المستخدم ما وراء أيٍّ منها إلا بفتحه. البطاقة تعرض القيم نفسها،
 * فيقرّر بنظرة إن كان يحتاج التعديل — ومعظم الزيارات تنتهي هنا بلا
 * فتح شاشة أخرى إطلاقًا.
 */
export function SummaryCard({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: SummaryRow[];
  onEdit: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="bodyStrong">{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('common.edit')} — ${title}`}
          hitSlop={10}
          onPress={onEdit}
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
        >
          <Text variant="captionStrong" color="primary">
            {t('common.edit')} ›
          </Text>
        </Pressable>
      </View>

      {rows.map((row) => (
        <View
          key={row.label}
          style={{ flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text variant="caption" color="textSecondary">
            {row.label}
          </Text>
          <Text variant="body">{row.value}</Text>
        </View>
      ))}
    </Card>
  );
}
