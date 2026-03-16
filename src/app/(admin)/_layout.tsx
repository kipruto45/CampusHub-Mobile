// Admin Layout for CampusHub
// Protected layout with role-based access control

import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/auth.store';
import { isAdminRole, ADMIN_HOME_ROUTE, STUDENT_HOME_ROUTE } from '../../lib/auth-routing';

export default function AdminLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initializeAuth, accessToken, user } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  const initAuth = useCallback(() => {
    initializeAuth();
    setInitialized(true);
  }, [initializeAuth]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Route protection - redirect to appropriate home based on role
  useEffect(() => {
    if (initialized && !isLoading) {
      if (!isAuthenticated || !accessToken) {
        // Not authenticated - go to login
        router.replace('/(auth)/login');
      } else if (user && !isAdminRole(user.role)) {
        // Authenticated but not admin - redirect to student home
        router.replace(STUDENT_HOME_ROUTE);
      } else if (user && isAdminRole(user.role)) {
        // Authenticated as admin - allow access to admin routes
      }
    }
  }, [initialized, isLoading, isAuthenticated, accessToken, user, router]);

  // Show loading while initializing
  if (!initialized || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Additional check after loading
  if (!isAuthenticated || !accessToken || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Redirect non-admin users
  if (!isAdminRole(user.role)) {
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
    />
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
