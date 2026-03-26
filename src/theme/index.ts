// Theme exports for CampusResources
import { colors } from './colors';
import { shadows } from './shadows';
import { borderRadius,spacing } from './spacing';
import { typography } from './typography';

export * from './colors';
export * from './shadows';
export * from './spacing';
export * from './typography';

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export type Theme = typeof theme;
