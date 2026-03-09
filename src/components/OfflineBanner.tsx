// Offline Banner Component - Shows connectivity status

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useNetworkStatus } from '../services/offline';

const { width } = Dimensions.get('window');

interface OfflineBannerProps {
  style?: 'fixed' | 'absolute';
  backgroundColor?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ 
  style = 'fixed',
  backgroundColor = '#F59E0B'
}) => {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const translateY = React.useRef(new Animated.Value(-50)).current;
  const isOffline = !isConnected || !isInternetReachable;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, translateY]);

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        style === 'fixed' ? styles.fixed : styles.absolute,
        { backgroundColor, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📡</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>You're offline</Text>
        <Text style={styles.subtitle}>
          Some features may be limited
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 9999,
  },
  fixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
});

export default OfflineBanner;
