// Splash Screen for CampusHub
// Premium minimal loading intro

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, darkColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAuthStore } from '../../store/auth.store';
import { resolveHomeRouteByRole } from '../../lib/auth-routing';

const SplashScreen: React.FC = () => {
  const router = useRouter();
  const { initializeAuth } = useAuthStore();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Initialize auth state from persisted storage
    initializeAuth();
    
    // Animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate based on auth state after delay
    const timer = setTimeout(() => {
      const { isAuthenticated, accessToken, user } = useAuthStore.getState();
      if (isAuthenticated && accessToken) {
        // User is logged in, go to role-specific home
        router.replace(resolveHomeRouteByRole(user?.role) as any);
      } else {
        // User is not logged in, go to login
        router.replace('/(auth)/login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[darkColors.background.primary, darkColors.background.secondary]}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* App Logo Icon */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* App Name */}
          <Text style={styles.appName}>CampusHub</Text>
          <Text style={styles.tagline}>
            Your Learning Hub
          </Text>

          {/* Loading Indicator */}
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBar}>
              <Animated.View style={styles.loadingProgress} />
            </View>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background.primary,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing[8],
    width: 160,
    height: 160,
  },
  logoImage: {
    width: 160,
    height: 160,
    borderRadius: 32,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 56,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: darkColors.text.primary,
    marginBottom: spacing[2],
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: darkColors.text.secondary,
    marginBottom: spacing[10],
  },
  loadingContainer: {
    width: 200,
    alignItems: 'center',
  },
  loadingBar: {
    width: 200,
    height: 3,
    backgroundColor: darkColors.background.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '60%',
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 2,
  },
});

export default SplashScreen;
