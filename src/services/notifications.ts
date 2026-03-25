// Push Notification Service for CampusHub
// Handles FCM push notifications
// Note: Requires development build for full functionality in SDK 53+
// This service gracefully skips push notifications when running in Expo Go

import { AppState, AppStateStatus, Platform } from 'react-native';
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

export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  link: string;
  created_at: string;
}

type RealtimeNotificationListener = (notification: RealtimeNotification) => void;

const buildRealtimeNotificationsUrl = (token: string): string | null => {
  const baseUrl = String(api.defaults.baseURL || '').trim().replace(/\/+$/, '');
  if (!baseUrl || !token) return null;

  const websocketBase = baseUrl
    .replace(/^http:\/\//i, 'ws://')
    .replace(/^https:\/\//i, 'wss://')
    .replace(/\/api(?:\/.*)?$/i, '/ws/notifications/');

  return `${websocketBase}?token=${encodeURIComponent(token)}`;
};

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private realtimeSocket: WebSocket | null = null;
  private realtimeReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private realtimeListeners = new Set<RealtimeNotificationListener>();
  private realtimeEnabled = false;
  private appState: AppStateStatus = AppState.currentState;

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
      if (!this.notificationListener) {
        this.notificationListener = Notifications.addNotificationReceivedListener(
          (notification: any) => {
            console.log('Notification received:', notification);
          }
        );
      }

      if (!this.responseListener) {
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
      }

      console.log('Push notifications initialized successfully');
    } catch (error) {
      console.log('Failed to initialize push notifications:', error);
    }
  }

  private clearRealtimeReconnectTimeout(): void {
    if (this.realtimeReconnectTimeout) {
      clearTimeout(this.realtimeReconnectTimeout);
      this.realtimeReconnectTimeout = null;
    }
  }

  private emitRealtimeNotification(notification: RealtimeNotification): void {
    this.realtimeListeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (error) {
        console.log('Realtime notification listener failed:', error);
      }
    });
  }

  private handleRealtimeMessage(rawData: any): void {
    try {
      const payload = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (payload?.type !== 'notification') {
        return;
      }

      this.emitRealtimeNotification({
        id: String(payload?.id || ''),
        title: String(payload?.title || 'Notification'),
        message: String(payload?.message || ''),
        notification_type: String(payload?.notification_type || 'system'),
        link: String(payload?.link || ''),
        created_at: String(payload?.timestamp || new Date().toISOString()),
      });
    } catch (error) {
      console.log('Failed to parse realtime notification payload:', error);
    }
  }

  private scheduleRealtimeReconnect(): void {
    if (!this.realtimeEnabled || this.appState !== 'active' || this.realtimeReconnectTimeout) {
      return;
    }

    this.realtimeReconnectTimeout = setTimeout(() => {
      this.realtimeReconnectTimeout = null;
      this.connectRealtimeNotifications();
    }, 5000);
  }

  private disconnectRealtimeNotifications(): void {
    this.clearRealtimeReconnectTimeout();

    const socket = this.realtimeSocket;
    this.realtimeSocket = null;

    if (!socket) {
      return;
    }

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }
  }

  private connectRealtimeNotifications(): void {
    if (!this.realtimeEnabled || this.appState !== 'active') {
      return;
    }

    const existingState = this.realtimeSocket?.readyState;
    if (existingState === WebSocket.OPEN || existingState === WebSocket.CONNECTING) {
      return;
    }

    const authToken = getAuthToken();
    if (!authToken) {
      return;
    }

    const socketUrl = buildRealtimeNotificationsUrl(authToken);
    if (!socketUrl) {
      return;
    }

    try {
      const socket = new WebSocket(socketUrl);
      this.realtimeSocket = socket;

      socket.onopen = () => {
        this.clearRealtimeReconnectTimeout();
      };

      socket.onmessage = (event) => {
        this.handleRealtimeMessage(event.data);
      };

      socket.onerror = (error) => {
        console.log('Realtime notifications socket error:', error);
      };

      socket.onclose = () => {
        if (this.realtimeSocket === socket) {
          this.realtimeSocket = null;
        }
        this.scheduleRealtimeReconnect();
      };
    } catch (error) {
      console.log('Failed to connect realtime notifications socket:', error);
      this.scheduleRealtimeReconnect();
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
    this.disconnectRealtimeNotifications();
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
    this.realtimeEnabled = true;
    this.connectRealtimeNotifications();
    await this.initialize();
  }

  subscribeToRealtimeNotifications(
    listener: RealtimeNotificationListener
  ): () => void {
    this.realtimeListeners.add(listener);
    // Immediately connect if not connected
    this.connectRealtimeNotifications();
    return () => {
      this.realtimeListeners.delete(listener);
    };
  }

  handleAppStateChange(nextAppState: AppStateStatus): void {
    this.appState = nextAppState;

    if (nextAppState === 'active') {
      this.connectRealtimeNotifications();
      return;
    }

    this.disconnectRealtimeNotifications();
  }

  // Unregister push notifications (called on logout)
  async unregisterPushNotifications(): Promise<void> {
    this.realtimeEnabled = false;
    this.disconnectRealtimeNotifications();
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

export type { NotificationService, RealtimeNotificationListener };
export const notificationService = new NotificationService();
