/**
 * Theme Store - Dark Mode support for Admin Dashboard
 * Manages admin dashboard theme preferences
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage,persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Misc
  overlay: string;
  shadow: string;
}

const lightColors: ThemeColors = {
  background: '#F3F4F6',
  backgroundSecondary: '#E5E7EB',
  backgroundTertiary: '#D1D5DB',
  surface: '#FFFFFF',
  
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const darkColors: ThemeColors = {
  background: '#111827',
  backgroundSecondary: '#1F2937',
  backgroundTertiary: '#374151',
  surface: '#1F2937',
  
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  textInverse: '#1F2937',
  
  primary: '#60A5FA',
  primaryLight: '#93C5FD',
  primaryDark: '#3B82F6',
  
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  
  border: '#374151',
  borderLight: '#4B5563',
  
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useAdminThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      colors: lightColors,
      
      setMode: (mode: ThemeMode) => {
        const colors = mode === 'dark' ? darkColors : 
          mode === 'light' ? lightColors : 
          (window?.matchMedia('(prefers-color-scheme: dark)').matches ? darkColors : lightColors);
        
        set({ mode, colors });
      },
      
      toggleTheme: () => {
        const currentMode = get().mode;
        const newMode = currentMode === 'light' ? 'dark' : 
          currentMode === 'dark' ? 'light' : 'dark';
        
        const colors = newMode === 'dark' ? darkColors : lightColors;
        
        set({ mode: newMode, colors });
      },
    }),
    {
      name: 'admin-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Hook for getting theme colors
export const useAdminTheme = () => {
  const { colors, mode, setMode, toggleTheme } = useAdminThemeStore();
  
  return {
    colors,
    mode,
    isDark: mode === 'dark',
    setMode,
    toggleTheme,
  };
};

export { darkColors,lightColors };
export type { ThemeColors };
