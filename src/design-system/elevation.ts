import type { ViewStyle } from 'react-native';
import { palette } from './colors';

/**
 * مستويات الارتفاع (الظل) — موحّدة بدل قيم ظل متفرقة داخل كل مكوّن.
 * الظلال هنا هادئة ودافئة عمدًا (بلون التيل الداكن لا الأسود) لتناسب
 * الإحساس الفاخر الهادئ للهوية، لا الظلال الحادة الرمادية.
 */
export const elevation = {
  /** بلا ظل — للأسطح الملتصقة بالخلفية. */
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  /** بطاقات المحتوى العادية. */
  card: {
    shadowColor: palette.teal900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  /** عناصر بارزة: البطاقة الرئيسية، الأزرار العائمة. */
  raised: {
    shadowColor: palette.teal900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  /** الأشرطة الثابتة (شريط التبويبات) — ظل لأعلى. */
  bar: {
    shadowColor: palette.teal900,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
} satisfies Record<string, ViewStyle>;

export type ElevationToken = keyof typeof elevation;
