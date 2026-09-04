import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProgressBar, Text, palette, rowDirection } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { formatNumber } from '@/src/lib/i18n/format';
import type { MacroKey } from '@/src/domain/nutrition';

/**
 * لون لكل ماكرو من لوحة الهوية نفسها — لا ألوان جديدة خارج النظام.
 * البروتين بالتيل الأساسي (الأهم لبناء العضل)، الكارب بالذهبي المميّز،
 * الدهون بدرجة تيل أفتح لتبقى الثلاثة عائلة واحدة بصريًا.
 */
const MACRO_COLORS: Record<MacroKey, string> = {
  protein: palette.teal700,
  carbs: palette.gold500,
  fat: palette.teal500,
};

type MacroRowProps = {
  macro: MacroKey;
  value: number;
  target: number;
};

/** سطر ماكرو واحد: الاسم، القيمة/الهدف، وشريط تقدّم بلونه. */
export function MacroRow({ macro, value, target }: MacroRowProps) {
  const { t } = useTranslation();
  const progress = target > 0 ? value / target : 0;

  return (
    <View style={{ gap: spacing.xxs }}>
      <View style={{ flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="captionStrong">{t(`nutrition.macro.${macro}`)}</Text>
        <Text variant="caption" color="textSecondary">
          {t('nutrition.gramsOfTarget', {
            value: formatNumber(Math.round(value)),
            target: formatNumber(target),
          })}
        </Text>
      </View>
      <ProgressBar progress={progress} height={6} fillColor={MACRO_COLORS[macro]} />
    </View>
  );
}
