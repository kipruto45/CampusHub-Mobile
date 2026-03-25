// Student Layout for CampusHub
// Custom modern bottom navigation bar with 5 icons

import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, lightColors } from '../../theme/colors';
import { useAuthStore } from '../../store/auth.store';
import { isAdminRole, ADMIN_HOME_ROUTE } from '../../lib/auth-routing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/ui/Icon';

// Suppress warnings
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Layout children must be of type Screen']);

// Bottom tab configuration - exactly 5 icons
const TABS = [
  { name: 'home', label: 'Home', icon: 'home', route: '/(student)/tabs/home' },
  { name: 'resources', label: 'Resources', icon: 'book', route: '/(student)/tabs/resources' },
  { name: 'library', label: 'Library', icon: 'folder', route: '/(student)/tabs/library' },
  { name: 'saved', label: 'Saved', icon: 'bookmark', route: '/(student)/tabs/saved' },
  { name: 'more', label: 'More', icon: 'apps', route: '/(student)/tabs/more' },
];

// Custom Bottom Tab Bar Component
function CustomBottomBar({ activeTab, onTabPress }: { activeTab: string; onTabPress: (route: string) => void }) {
  const insets = useSafeAreaInsets();
  
  const router = useRouter();
  
  return (
    <View style={styles.wrapper}>
      {/* Floating AI Button */}
      <TouchableOpacity
        style={styles.floatingAIButton}
        onPress={() => router.push('/(student)/ai-chat')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Open AI assistant"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <View style={styles.floatingAIHalo}>
          <View style={styles.floatingAIInner}>
            <View style={styles.floatingAIAccent} />
            <Icon name="chatbubble-ellipses" size={24} color="#FFFFFF" />
            <Text style={styles.floatingAILabel}>AI</Text>
          </View>
        </View>
      </TouchableOpacity>
      
      <View style={[
        styles.bottomBar, 
        { paddingBottom: Math.max(insets.bottom, 10) }
      ]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => onTabPress(tab.route)}
              activeOpacity={0.7}
            >
              <Icon 
                name={tab.icon as any} 
                size={22} 
                color={isActive ? colors.primary[500] : colors.text.tertiary} 
              />
              <Text style={[
                styles.tabLabel,
                { color: isActive ? colors.primary[500] : colors.text.tertiary }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function StudentLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, initializeAuth, accessToken, user } = useAuthStore();
  // Always use light mode - dark mode disabled
  const themeColors = lightColors;
  const [initialized, setInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const initAuth = useCallback(() => {
    initializeAuth();
    setInitialized(true);
  }, [initializeAuth]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (initialized && !isLoading) {
      if (!isAuthenticated || !accessToken) {
        router.replace('/(auth)/login?reason=session_expired');
      } else if (user && isAdminRole(user.role)) {
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

  // Redirect if not authenticated
  if (!isAuthenticated || !accessToken) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Redirect admin users
  if (user && isAdminRole(user.role)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  const handleTabPress = (route: string) => {
    setActiveTab(route.split('/').pop() || 'home');
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: themeColors.background.secondary },
          }}
        />
      </View>
      <CustomBottomBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  wrapper: {
    position: 'relative',
  },
  floatingAIButton: {
    position: 'absolute',
    top: -40,
    left: '50%',
    marginLeft: -38,
    zIndex: 120,
  },
  floatingAIHalo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(13, 115, 119, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    shadowColor: colors.primary[700],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 12,
  },
  floatingAIInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    elevation: 10,
    shadowColor: colors.primary[800],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  floatingAIAccent: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent[400],
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  floatingAILabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#FFFFFF',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
