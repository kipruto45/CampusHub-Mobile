// Root Layout for CampusHub
// Main app entry point with notification initialization

import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, AppState, AppStateStatus, Alert } from 'react-native';
import { useEffect, useRef } from 'react';
import { lightColors } from '../theme/colors';
import { mobileAutomationService } from '../services/mobileAutomation.service';
import { notificationService } from '../services/notifications';
import { ensureApiBaseUrl } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { ToastProvider } from '../components/ui/Toast';
import { OfflineBanner } from '../components/OfflineBanner';

export default function RootLayout() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  const { isAuthenticated, initializeAuth, user } = useAuthStore();
  // Always use light mode - dark mode disabled
  const themeColors = lightColors;

  useEffect(() => {
    let isMounted = true;

    const initializeAppServices = async () => {
      try {
        await ensureApiBaseUrl();
      } catch (error) {
        console.warn('Failed to resolve API base URL:', error);
      }

      if (!isMounted) return;

      // Initialize auth on app start
      initializeAuth();

      try {
        await Promise.all([
          notificationService.initialize(),
          mobileAutomationService.initialize(),
        ]);
        notificationService.setupNotificationListeners();
      } catch (error) {
        console.error('Failed to initialize app services:', error);
      }
    };

    initializeAppServices();

    // Handle app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      notificationService.handleAppStateChange(nextAppState);

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        console.log('App has come to foreground');
        mobileAutomationService.onAppForeground();
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to background
        console.log('App has gone to background');
      }
      appState.current = nextAppState;
    });

    return () => {
      isMounted = false;
      subscription.remove();
      notificationService.removeNotificationListeners();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = notificationService.subscribeToRealtimeNotifications((notification) => {
      if (!isAuthenticated || appState.current !== 'active') {
        return;
      }

      if (notification.notification_type !== 'new_resource') {
        return;
      }

      const alertButtons =
        user?.role === 'student'
          ? [
              { text: 'Dismiss', style: 'cancel' as const },
              {
                text: 'View',
                onPress: () => router.push('/(student)/tabs/resources'),
              },
            ]
          : [{ text: 'OK' }];

      Alert.alert(
        notification.title || 'New Resource Available',
        notification.message || 'A new resource has been uploaded.',
        alertButtons
      );
    });

    return unsubscribe;
  }, [isAuthenticated, router, user?.role]);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      notificationService.registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.secondary }]}>
      <StatusBar style="dark" />
      <OfflineBanner />
      <ToastProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: themeColors.background.secondary },
            animation: 'slide_from_right',
          }}
        >
          {/* Index redirect */}
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          
          {/* Auth Group - routes are auto-discovered from (auth)/ folder */}
          <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
          
          {/* Student Group - routes are auto-discovered from (student)/ folder */}
          <Stack.Screen name="(student)" options={{ gestureEnabled: false }} />
          
          {/* Admin Group - routes are auto-discovered from (admin)/ folder */}
          <Stack.Screen name="(admin)" options={{ gestureEnabled: false }} />
        </Stack>
      </ToastProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
