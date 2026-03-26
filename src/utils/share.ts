import * as Clipboard from 'expo-clipboard';
import { Platform,Share } from 'react-native';

export const copyToClipboard = async (value: string): Promise<void> => {
  const text = String(value || '').trim();
  if (!text) {
    throw new Error('Nothing to copy.');
  }

  try {
    await Clipboard.setStringAsync(text);
  } catch {
    // Fallback for web
    if (Platform.OS === 'web') {
      const webNavigator = (globalThis as any)?.navigator;
      if (webNavigator?.clipboard?.writeText) {
        await webNavigator.clipboard.writeText(text);
        return;
      }
    }
    throw new Error('Clipboard is not available.');
  }
};

export const openNativeShareSheet = async (payload: {
  message: string;
  url?: string;
  title?: string;
}): Promise<boolean> => {
  const result = await Share.share({
    title: payload.title,
    message: payload.message,
    url: payload.url,
  });
  return result.action !== Share.dismissedAction;
};
