// Spacing System for CampusResources
// Clean, consistent spacing scale

export const spacing = {
  // Base spacing units
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  DEFAULT: 8,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

export const aspectRatio = {
  square: 1,
  video: 16 / 9,
  photo: 4 / 3,
  portrait: 3 / 4,
  wide: 2 / 1,
};

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
