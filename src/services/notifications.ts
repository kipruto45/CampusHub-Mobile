// Push Notification Service for CampusHub
// Handles FCM push notifications
// Note: Requires development build for full functionality in SDK 53+
// This service gracefully skips push notifications when running in Expo Go

import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import api, { getAuthToken } from './api';
import { notificationsApi } from './notifications-api.service';

// Check if we're running in Expo Go (where push notifications are not supported)
const isRunningInExpoGo = (): boolean => {
  try {
    return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  } catch {
    return false;
  }
};

// Lazy load expo-notifications to avoid errors at module load time
// This is needed because expo-notifications was removed from Expo Go in SDK 53
let Notifications: any = null;
let Device: any = null;
let moduleLoadAttempted = false;

const loadNotificationsModule = async (): Promise<boolean> => {
  // Skip if already loaded or already attempted
  if (Notifications && Device) return true;
  if (moduleLoadAttempted) return false;
  moduleLoadAttempted = true;
  
  // Skip if running in Expo Go - push notifications not supported
  if (isRunningInExpoGo()) {
    console.log('Running in Expo Go - skipping push notifications');
    return false;
  }
  
  try {
    // Dynamically require the modules only when needed
    const notificationsModule = await import('expo-notifications');
    const deviceModule = await import('expo-device');
    Notifications = notificationsModule;
    Device = deviceModule;
    return true;
  } catch (e) {
    console.log('expo-notifications not available - using fallback mode');
    return false;
  }
};

// Configure notification behavior if available
const configureNotificationHandler = async (): Promise<void> => {
  // Skip configuration in Expo Go
  if (isRunningInExpoGo()) {
    return;
  }
  
  const loaded = await loadNotificationsModule();
  if (!loaded || !Notifications) return;
  
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.log('Could not set notification handler');
  }
};

// Call configuration at module load (will work in dev build)
configureNotificationHandler();

interface PushTokenData {
  expo_push_token: string;
  device_id: string;
  device_name: string;
  platform: string;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  // Initialize push notifications
  async initialize(): Promise<void> {
    // Skip initialization in Expo Go - push notifications not supported
    if (isRunningInExpoGo()) {
      console.log('Running in Expo Go - skipping push notification initialization');
      return;
    }
    
    // Try to load the notifications module first
    const loaded = await loadNotificationsModule();
    
    if (!loaded || !Notifications || !Device) {
      console.log('Notifications not available - skipping initialization');
      return;
    }

    try {
      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
        return;
      }

      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('important', {
          name: 'Important',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Get push token
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      this.expoPushToken = token;

      // Send token to backend
      await this.registerPushToken(token);

      // Set up notification listeners
      this.notificationListener = Notifications.addNotificationReceivedListener(
        (notification: any) => {
          console.log('Notification received:', notification);
        }
      );

      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        (response: any) => {
          console.log('Notification response:', response);
          const data = response.notification.request.content.data;
          if (data?.route) {
            // Handle deep linking from notification
            console.log('Navigate to:', data.route);
          }
        }
      );

      console.log('Push notifications initialized successfully');
    } catch (error) {
      console.log('Failed to initialize push notifications:', error);
    }
  }

  // Register push token with backend
  private async registerPushToken(token: string): Promise<void> {
    try {
      const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const deviceName = Device?.modelName || 'Unknown Device';
      
      const pushTokenData: PushTokenData = {
        expo_push_token: token,
        device_id: deviceId,
        device_name: deviceName,
        platform: Platform.OS,
      };

      const authToken = getAuthToken();
      if (authToken) {
        await api.post('/notifications/register-device/', pushTokenData, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Push token registered with backend');
      }
    } catch (error) {
      console.log('Failed to register push token:', error);
    }
  }

  // Schedule a local notification
  async scheduleNotification(
    title: string,
    body: string,
    triggerInSeconds: number = 0
  ): Promise<void> {
    if (!Notifications) {
      console.log('Notifications not available');
      return;
    }

    try {
      if (triggerInSeconds > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
          },
          trigger: {
            seconds: triggerInSeconds,
          },
        });
      } else {
        await Notifications.presentNotificationAsync({
          content: {
            title,
            body,
            sound: true,
          },
        });
      }
    } catch (error) {
      console.log('Failed to schedule notification:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllScheduledNotifications(): Promise<void> {
    if (!Notifications) return;
    
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.log('Failed to cancel notifications:', error);
    }
  }

  // Get scheduled notifications
  async getScheduledNotifications(): Promise<any[]> {
    if (!Notifications) return [];
    
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.log('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    if (!Notifications) return;
    
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.log('Failed to set badge count:', error);
    }
  }

  // Clean up listeners
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  // Set up notification listeners (public method for layout.tsx)
  setupNotificationListeners(): void {
    // Listeners are already set up in initialize()
    // This method exists for API compatibility
    console.log('Notification listeners are set up during initialization');
  }

  // Remove notification listeners (public method for layout.tsx)
  removeNotificationListeners(): void {
    this.cleanup();
    console.log('Notification listeners removed');
  }

  // Register for push notifications (public method for layout.tsx)
  async registerForPushNotificationsAsync(): Promise<void> {
    await this.initialize();
  }

  // Unregister push notifications (called on logout)
  async unregisterPushNotifications(): Promise<void> {
    try {
      // Notify backend to unregister the device
      if (this.expoPushToken) {
        const authToken = getAuthToken();
        if (authToken) {
          await notificationsApi.unregisterDevice(this.expoPushToken);
          console.log('Push token unregistered from backend');
        }
      }
    } catch (error) {
      console.log('Failed to unregister push token:', error);
    } finally {
      // Always clean up local state regardless of API success
      this.expoPushToken = null;
      this.cleanup();
    }
  }
}

export type { NotificationService };
export const notificationService = new NotificationService();
