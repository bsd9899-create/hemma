import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { HEMMA_LOGO_ASPECT_RATIO, HEMMA_LOGO_SVG } from './logoSvg';

type WordmarkSize = 'sm' | 'md' | 'lg';

const WIDTHS: Record<WordmarkSize, number> = {
  sm: 96,
  md: 150,
  lg: 210,
};

type WordmarkProps = {
  size?: WordmarkSize;
};

/**
 * شعار هِمّة الرسمي — يُعرض من ملف SVG الأصلي كما هو تمامًا (نفس الشكل
 * والألوان والنسب). العرض فقط هو ما يتغيّر، والارتفاع يُحسب من نسبة
 * viewBox الأصلية حتى لا يتشوّه الشعار في أي مقاس.
 */
export function Wordmark({ size = 'md' }: WordmarkProps) {
  const width = WIDTHS[size];
  const height = width / HEMMA_LOGO_ASPECT_RATIO;

  return (
    <View accessibilityRole="image" accessibilityLabel="هِمّة" style={{ width, height, alignSelf: 'center' }}>
      <SvgXml xml={HEMMA_LOGO_SVG} width={width} height={height} />
    </View>
  );
}
