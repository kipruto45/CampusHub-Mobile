// CampusResources Brand Colors
// Premium green-based theme with elegant modern feel

// Light Mode Colors
export const lightColors = {
  // Primary Brand Colors
  primary: {
    50: '#E6F7F7',
    100: '#B3E8E9',
    200: '#80D9DB',
    300: '#4DCACD',
    400: '#26BEBF',
    500: '#0D7377', // Main brand color
    600: '#0B5F62',
    700: '#084B4D',
    800: '#063738',
    900: '#032324',
  },

  // Secondary / Accent
  accent: {
    50: '#FFF5E6',
    100: '#FFE0B3',
    200: '#FFCC80',
    300: '#FFB84D',
    400: '#FFA31A',
    500: '#FF8F00', // Amber accent
    600: '#CC7200',
    700: '#995400',
    800: '#663700',
    900: '#331900',
  },

  // Neutral Grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Semantic Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
  },

  // Text Colors
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    tertiary: '#9CA3AF',
    disabled: '#D1D5DB',
    inverse: '#FFFFFF',
  },

  // Border Colors
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },

  // Card Colors
  card: {
    light: '#FFFFFF',
  },

  // Shadow Colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.2)',
  },

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Transparent
  transparent: 'transparent',
};

// Dark Mode Colors
export const darkColors = {
  ...lightColors,
  // Primary Brand Colors - slightly brighter for dark mode
  primary: {
    50: '#E6F7F7',
    100: '#B3E8E9',
    200: '#80D9DB',
    300: '#4DCACD',
    400: '#26BEBF',
    500: '#14B8A6', // Brighter teal for dark mode
    600: '#0D7377',
    700: '#084B4D',
    800: '#063738',
    900: '#032324',
  },

  // Background Colors
  background: {
    primary: '#0F172A',
    secondary: '#1E293B',
    tertiary: '#334155',
  },

  // Text Colors
  text: {
    primary: '#F9FAFB',
    secondary: '#9CA3AF',
    tertiary: '#6B7280',
    disabled: '#4B5563',
    inverse: '#111827',
  },

  // Border Colors
  border: {
    light: '#334155',
    medium: '#475569',
    dark: '#64748B',
  },

  // Card Colors
  card: {
    light: '#1E293B',
  },

  // Shadow Colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.4)',
    dark: 'rgba(0, 0, 0, 0.5)',
  },

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
};

// Default export for backwards compatibility
export const colors = lightColors;

// Get colors based on dark mode
export const getColors = (isDark: boolean) => isDark ? darkColors : lightColors;

// Type for colors
export type ColorScheme = typeof lightColors;
