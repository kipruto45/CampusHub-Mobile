// Auth Layout for CampusHub

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/auth.store';
import { resolveHomeRouteByRole } from '../../lib/auth-routing';

export default function AuthLayout() {
  const router = useRouter();
  const { isAuthenticated, accessToken, isLoading, user, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && accessToken) {
      router.replace(resolveHomeRouteByRole(user?.role) as any);
    }
  }, [isLoading, isAuthenticated, accessToken, user?.role, router]);

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
