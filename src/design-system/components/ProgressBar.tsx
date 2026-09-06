import { StyleSheet, View } from 'react-native';
import { colors } from '../colors';
import { radius } from '../spacing';

type ProgressBarProps = {
  /** نسبة من 0 إلى 1 */
  progress: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
};

/** شريط تقدّم بسيط — يُستخدم لإنجاز اليوم ونبض الفريق وغيرها. */
export function ProgressBar({
  progress,
  height = 8,
  trackColor = colors.divider,
  fillColor = colors.primary,
}: ProgressBarProps) {
  // NaN لا يُقصّ: Math.max(0, Math.min(1, NaN)) يساوي NaN، فيصل إلى SVG
  // فتتوقف الحلقة/الشريط عن الرسم **بلا أي رسالة خطأ**. القسمة على
  // هدف غائب (عمود ناقص في قاعدة البيانات) تنتج NaN بالضبط، لذلك
  // التعقيم هنا لا في كل موضع استدعاء.
  const safe = Number.isFinite(progress) ? progress : 0;
  const clamped = Math.max(0, Math.min(1, safe));
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: fillColor, height },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
  },
});
