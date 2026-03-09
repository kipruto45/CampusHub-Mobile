// Typography System for CampusResources
// Modern, clean, premium feel

import { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
  '6xl': 48,
};

export const fontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semiBold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
};

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

export const typography = {
  // Display styles
  displayLarge: {
    fontSize: fontSize['6xl'],
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['6xl'] * lineHeight.tight,
  } as TextStyle,

  displayMedium: {
    fontSize: fontSize['5xl'],
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['5xl'] * lineHeight.tight,
  } as TextStyle,

  displaySmall: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['4xl'] * lineHeight.tight,
  } as TextStyle,

  // Heading styles
  h1: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['3xl'] * lineHeight.tight,
  } as TextStyle,

  h2: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semiBold,
    lineHeight: fontSize['2xl'] * lineHeight.tight,
  } as TextStyle,

  h3: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semiBold,
    lineHeight: fontSize.xl * lineHeight.normal,
  } as TextStyle,

  h4: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semiBold,
    lineHeight: fontSize.lg * lineHeight.normal,
  } as TextStyle,

  // Body styles
  bodyLarge: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.lg * lineHeight.relaxed,
  } as TextStyle,

  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.base * lineHeight.relaxed,
  } as TextStyle,

  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.sm * lineHeight.normal,
  } as TextStyle,

  // Label styles
  labelLarge: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.base * lineHeight.normal,
  } as TextStyle,

  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.sm * lineHeight.normal,
  } as TextStyle,

  labelSmall: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.xs * lineHeight.normal,
  } as TextStyle,

  // Button text
  button: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semiBold,
    lineHeight: fontSize.base * lineHeight.normal,
  } as TextStyle,

  buttonSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    lineHeight: fontSize.sm * lineHeight.normal,
  } as TextStyle,

  // Caption
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.xs * lineHeight.normal,
  } as TextStyle,

  overline: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.xs * lineHeight.normal,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
};

export type Typography = typeof typography;
