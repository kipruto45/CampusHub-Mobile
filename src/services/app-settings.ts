// App Settings helpers for CampusHub
// Handles lightweight client-only configuration (AsyncStorage + env defaults)

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_NOTIFICATION_UNDO_MS = 'campushub.notificationsUndoMs';

const DEFAULT_NOTIFICATION_UNDO_MS = 4000;
const MIN_NOTIFICATION_UNDO_MS = 1000;
const MAX_NOTIFICATION_UNDO_MS = 15000;

const getEnvNumber = (key: string): number | null => {
  const raw = String(process.env[key] || '').trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return value;
};

const clampNotificationUndoMs = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_NOTIFICATION_UNDO_MS;
  return Math.min(MAX_NOTIFICATION_UNDO_MS, Math.max(MIN_NOTIFICATION_UNDO_MS, Math.round(value)));
};

export const getDefaultNotificationUndoMs = (): number => {
  const fromEnv = getEnvNumber('EXPO_PUBLIC_NOTIFICATION_UNDO_MS');
  if (fromEnv === null) {
    return DEFAULT_NOTIFICATION_UNDO_MS;
  }
  return clampNotificationUndoMs(fromEnv);
};

export const getNotificationUndoMs = async (): Promise<number> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_NOTIFICATION_UNDO_MS);
    if (!stored) {
      return getDefaultNotificationUndoMs();
    }
    const parsed = Number(stored);
    if (!Number.isFinite(parsed)) {
      return getDefaultNotificationUndoMs();
    }
    return clampNotificationUndoMs(parsed);
  } catch (error) {
    console.error('Failed to load notification undo setting:', error);
    return getDefaultNotificationUndoMs();
  }
};

export const setNotificationUndoMs = async (value: number): Promise<number> => {
  const normalized = clampNotificationUndoMs(value);
  try {
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATION_UNDO_MS, String(normalized));
  } catch (error) {
    console.error('Failed to save notification undo setting:', error);
  }
  return normalized;
};

export const clearNotificationUndoMs = async (): Promise<number> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_NOTIFICATION_UNDO_MS);
  } catch (error) {
    console.error('Failed to reset notification undo setting:', error);
  }
  return getDefaultNotificationUndoMs();
};
