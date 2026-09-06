import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, colors, rowDirection } from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';
import { formatLongDate } from '@/src/lib/i18n/format';
import { buildTrialTimeline } from './trialTimeline';

/**
 * محطات التجربة المجانية بخط رأسي متصل.
 *
 * الشكل مقصود: قائمة نقطية تُقرأ كمزايا، أما الخط الزمني فيُقرأ
 * كتسلسل أحداث — وهذا بالضبط ما يريد المستخدم معرفته قبل أن يعطي
 * بطاقته. محطة الخصم تحمل تاريخها الفعلي لا "بعد ٣ أيام".
 */
export function TrialTimeline({ trialDays }: { trialDays: number }) {
  const { t } = useTranslation();
  const stages = buildTrialTimeline(trialDays);

  return (
    <View style={{ gap: spacing.xs }}>
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;
        return (
          <View key={stage.titleKey} style={{ flexDirection: rowDirection, gap: spacing.sm }}>
            {/* العمود البصري: نقطة + خط واصل، والخط يتوقف عند آخر محطة */}
            <View style={{ alignItems: 'center', width: 28 }}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: radius.pill,
                  // محطة الخصم داكنة (نهائية)، وما قبلها خافت — التمييز
                  // بالدرجة لأن الهوية بثلاثة ألوان بلا accent مستقل.
                  backgroundColor: stage.isCharge ? colors.primary : colors.secondary,
                }}
              />
              {!isLast ? (
                <View style={{ flex: 1, width: 2, backgroundColor: colors.divider, marginVertical: 2 }} />
              ) : null}
            </View>

            <View style={{ flex: 1, paddingBottom: isLast ? 0 : spacing.md, gap: spacing.xxs }}>
              <Text variant="bodyStrong">
                {t(stage.titleKey)}
                {stage.isCharge ? null : (
                  <Text variant="caption" color="textSecondary">
                    {'  '}
                    {formatLongDate(stage.date)}
                  </Text>
                )}
              </Text>
              <Text variant="caption" color="textSecondary">
                {stage.isCharge
                  ? t(stage.bodyKey, { date: formatLongDate(stage.date) })
                  : t(stage.bodyKey)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
