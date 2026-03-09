// Root Layout for CampusHub
// Main app entry point with notification initialization

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors } from '../theme/colors';
import { mobileAutomationService } from '../services/mobileAutomation.service';
import { notificationService } from '../services/notifications';
import { useAuthStore } from '../store/auth.store';
import { ToastProvider } from '../components/ui/Toast';
import { OfflineBanner } from '../components/OfflineBanner';

export default function RootLayout() {
  const appState = useRef(AppState.currentState);
  const { isAuthenticated, initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialize notifications when app starts
    const initializeAppServices = async () => {
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
      subscription.remove();
      notificationService.removeNotificationListeners();
    };
  }, []);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      notificationService.registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      <ToastProvider>
        <OfflineBanner />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background.secondary },
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
    backgroundColor: colors.background.secondary,
  },
});
