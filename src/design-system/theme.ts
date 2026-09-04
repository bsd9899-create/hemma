import { colors } from './colors';
import { elevation } from './elevation';
import { radius, spacing } from './spacing';
import { typography } from './typography';

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  elevation,
} as const;

export type Theme = typeof theme;

export { colors, spacing, radius, typography, elevation };
export { fontFamily } from './typography';
export { palette } from './colors';
