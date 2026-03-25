// Protected Route Wrapper for CampusHub
// Ensures user is authenticated before accessing protected routes

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { colors } from '../../theme/colors';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, initializeAuth, accessToken } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on mount
    initializeAuth();
  }, []);

  useEffect(() => {
    // Check auth state after initialization
    if (!isLoading) {
      if (!isAuthenticated || !accessToken) {
        // Not authenticated, redirect to login with session flag
        router.replace('/(auth)/login?reason=session_expired');
      }
    }
  }, [isAuthenticated, isLoading, accessToken]);

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // If not authenticated, don't render children (will redirect)
  if (!isAuthenticated || !accessToken) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
});
