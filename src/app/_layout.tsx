// Root Layout for CampusHub
// Main app entry point with notification initialization

import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, AppState, AppStateStatus, Alert } from 'react-native';
import { useEffect, useRef } from 'react';
import { lightColors } from '../theme/colors';
import { mobileAutomationService } from '../services/mobileAutomation.service';
import { notificationService } from '../services/notifications';
import { ensureApiBaseUrl } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { ToastProvider, useToast } from '../components/ui/Toast';
import { OfflineBanner } from '../components/OfflineBanner';

function RootLayoutInner() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  const { isAuthenticated, initializeAuth, user, error, clearError } = useAuthStore();
  const { showToast } = useToast();
  const toastListenerRef = useRef<(() => void) | null>(null);
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
        if (!toastListenerRef.current) {
          toastListenerRef.current = notificationService.subscribeToRealtimeNotifications(
            (notif) => {
              if (notif.notification_type === 'resource_approved' || notif.notification_type === 'group_invite') {
                const link = notif.link || '';
                showToast('info', notif.message || notif.title || 'New update', {
                  actionLabel: 'Open',
                  onAction: () => {
                    if (link) router.push(link as any);
                  },
                });
              }
            }
          );
        }
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
      toastListenerRef.current?.();
    };
  }, []);

  // Handle deep links (invite links, shared resources)
  useEffect(() => {
    const handleDeepLink = (url?: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const path = (parsed.path || '').replace(/^\/+/, '');
      const segments = path.split('/').filter(Boolean);
      const qp = parsed.queryParams || {};

      const magicLinkToken =
        (segments[0] === 'magic-link' && typeof qp.token === 'string' && qp.token) ||
        (segments[0] === 'magic-link' && segments[1]) ||
        (typeof qp.magic_link === 'string' && qp.magic_link);
      if (magicLinkToken) {
        router.push(`/(auth)/magic-link?token=${magicLinkToken}`);
        return;
      }

      const roleInviteToken =
        (segments[0] === 'role-invite' && segments[1]) ||
        (segments[0] === 'role-invite' && typeof qp.token === 'string' && qp.token) ||
        (typeof qp.role_invite === 'string' && qp.role_invite);
      if (roleInviteToken) {
        router.push(`/role-invite?token=${roleInviteToken}`);
        return;
      }

      // Study group invites
      const inviteToken =
        (segments[0] === 'invite' && segments[1]) ||
        (segments[0] === 'group-invite' && segments[1]) ||
        (typeof qp.token === 'string' && qp.token) ||
        (typeof qp.invite === 'string' && qp.invite);
      if (inviteToken) {
        router.push(`/(student)/group-invite?token=${inviteToken}`);
        return;
      }

      // Shared resources (by id or slug)
      const resourceId =
        (segments[0] === 'resource' && segments[1]) ||
        (segments[0] === 'r' && segments[1]) ||
        (typeof qp.resource === 'string' && qp.resource) ||
        (typeof qp.resource_id === 'string' && qp.resource_id);
      if (resourceId) {
        router.push(`/(student)/resource/${resourceId}`);
        return;
      }
    };

    // initial URL
    Linking.getInitialURL().then(handleDeepLink).catch(() => {});
    // runtime URL events
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [router]);

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

  useEffect(() => {
    if (error) {
      showToast('error', error);
      clearError();
    }
  }, [error, showToast, clearError]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.secondary }]}>
      <StatusBar style="dark" />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: themeColors.background.secondary },
          animation: 'slide_from_right',
        }}
      >
        {/* Index redirect */}
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="role-invite" options={{ animation: 'fade_from_bottom' }} />
        
        {/* Auth Group - routes are auto-discovered from (auth)/ folder */}
        <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
        
        {/* Student Group - routes are auto-discovered from (student)/ folder */}
        <Stack.Screen name="(student)" options={{ gestureEnabled: false }} />
        
        {/* Admin Group - routes are auto-discovered from (admin)/ folder */}
        <Stack.Screen name="(admin)" options={{ gestureEnabled: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ToastProvider>
      <RootLayoutInner />
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
