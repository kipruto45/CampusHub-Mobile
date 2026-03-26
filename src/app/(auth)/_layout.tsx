// Auth Layout for CampusHub

import { Stack,usePathname,useRouter } from 'expo-router';
import React,{ useEffect } from 'react';
import { ActivityIndicator,StyleSheet,View } from 'react-native';
import { resolveHomeRouteByRole } from '../../lib/auth-routing';
import { useAuthStore } from '../../store/auth.store';
import { colors } from '../../theme/colors';

// Public routes that should be accessible even when authenticated
const PUBLIC_ROUTES = ['/privacy', '/terms', '/splash'];

export default function AuthLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, accessToken, isLoading, user, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // Check if current route is a public route that should be accessible when authenticated
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === `/(auth)${route}` || pathname === route);
    
    // Only redirect if authenticated AND not on a public route
    if (!isLoading && isAuthenticated && accessToken && !isPublicRoute) {
      router.replace(resolveHomeRouteByRole(user?.role) as any);
    }
  }, [isLoading, isAuthenticated, accessToken, user?.role, router, pathname]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Routes are auto-discovered from the file system */}
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
});
