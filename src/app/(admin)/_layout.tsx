// Admin Layout for CampusHub
// Protected layout with role-based access control

import { Stack,usePathname,useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,StyleSheet,View } from 'react-native';
import { ADMIN_ACCESS_ROUTE,ADMIN_HOME_ROUTE,isAdminRole,STUDENT_HOME_ROUTE } from '../../lib/auth-routing';
import { paymentsAPI } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { colors } from '../../theme/colors';

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, initializeAuth, accessToken, user } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [checkingEntitlement, setCheckingEntitlement] = useState(false);

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
        router.replace('/(auth)/login');
      } else if (user && !isAdminRole(user.role)) {
        router.replace(STUDENT_HOME_ROUTE);
      }
    }
  }, [initialized, isLoading, isAuthenticated, accessToken, user, router]);

  useEffect(() => {
    let cancelled = false;

    const checkEntitlement = async () => {
      if (!initialized || isLoading || !isAuthenticated || !accessToken || !user || !isAdminRole(user.role)) {
        return;
      }

      try {
        setCheckingEntitlement(true);
        const response = await paymentsAPI.getFeatureAccessSummary();
        const payload = response?.data?.data ?? response?.data ?? {};
        const hasAdminAccess = payload?.admin_access_granted !== false;

        if (cancelled) return;

        if (!hasAdminAccess && pathname !== ADMIN_ACCESS_ROUTE) {
          router.replace(ADMIN_ACCESS_ROUTE as any);
          return;
        }

        if (hasAdminAccess && pathname === ADMIN_ACCESS_ROUTE) {
          router.replace(ADMIN_HOME_ROUTE as any);
        }
      } catch (error) {
        if (!cancelled) {
          console.log('Admin entitlement check failed:', error);
        }
      } finally {
        if (!cancelled) {
          setCheckingEntitlement(false);
        }
      }
    };

    void checkEntitlement();

    return () => {
      cancelled = true;
    };
  }, [initialized, isLoading, isAuthenticated, accessToken, user, pathname, router]);

  // Show loading while initializing
  if (!initialized || isLoading || checkingEntitlement) {
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
