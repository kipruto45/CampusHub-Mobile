// Student Layout for CampusHub
// Authenticated layout with role-based access control

import React, { useEffect, useState, useCallback } from 'react';
import { Tabs, Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/auth.store';
import { isAdminRole, ADMIN_HOME_ROUTE } from '../../lib/auth-routing';
import Icon from '../../components/ui/Icon';

// Tab Icon Component
const TabIcon = ({ icon, focused }: { icon: string; focused: boolean }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={icon as any} size={22} color={focused ? colors.primary[500] : colors.text.tertiary} />
  </View>
);

// Header Right Component - Search and Notifications
function HeaderRight() {
  const router = useRouter();
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 16 }}>
      <TouchableOpacity 
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background.secondary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}
        onPress={() => router.push('/(student)/search')}
      >
        <Icon name="search" size={22} color={colors.text.primary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background.secondary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}
        onPress={() => router.push('/(student)/notifications')}
      >
        <Icon name="notifications" size={22} color={colors.text.primary} />
      </TouchableOpacity>
    </View>
  );
}

// Main Layout with Auth and Role Check
export default function StudentLayout() {
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

  // Redirect to login if not authenticated - useEffect to avoid setState during render
  useEffect(() => {
    if (initialized && !isLoading) {
      if (!isAuthenticated || !accessToken) {
        router.replace('/(auth)/login');
      } else if (user && isAdminRole(user.role)) {
        // User is admin - redirect to admin dashboard
        router.replace(ADMIN_HOME_ROUTE);
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

  // Additional check after loading - redirect if not authenticated
  if (!isAuthenticated || !accessToken) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Redirect admin users away from student routes
  if (user && isAdminRole(user.role)) {
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
      }}
    >
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary[500],
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarStyle: {
            backgroundColor: colors.background.primary,
            borderTopWidth: 1,
            borderTopColor: colors.border.light,
            height: 85,
            paddingTop: 8,
            paddingBottom: 25,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background.primary,
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.text.primary,
          },
          headerShadowVisible: false,
          headerRight: () => <HeaderRight />,
        }}
      >
        <Tabs.Screen
          name="tabs/home"
          options={{
            title: 'Home',
            headerTitle: 'CampusHub',
            tabBarIcon: ({ focused }) => <TabIcon icon="home" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="tabs/resources"
          options={{
            title: 'Resources',
            headerTitle: 'Browse Resources',
            tabBarIcon: ({ focused }) => <TabIcon icon="book" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="tabs/library"
          options={{
            title: 'Library',
            headerTitle: 'My Library',
            tabBarIcon: ({ focused }) => <TabIcon icon="folder" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="tabs/saved"
          options={{
            title: 'Saved',
            headerTitle: 'Saved Items',
            tabBarIcon: ({ focused }) => <TabIcon icon="bookmark" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="tabs/profile"
          options={{
            title: 'Profile',
            headerTitle: 'My Profile',
            tabBarIcon: ({ focused }) => <TabIcon icon="person" focused={focused} />,
          }}
        />
      </Tabs>
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
