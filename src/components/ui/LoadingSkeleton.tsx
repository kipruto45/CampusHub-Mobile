// Loading Skeleton Component for CampusHub
// Shimmer placeholders while content loads

import React,{ useEffect,useRef } from 'react';
import { Animated,Dimensions,StyleSheet,Text,View } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';

const { width: screenWidth } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius: radius = 8,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.background.tertiary || colors.border.light,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Card skeleton for list items
export const CardSkeleton: React.FC = () => (
  <View style={styles.cardSkeleton}>
    <Skeleton width={60} height={60} borderRadius={12} />
    <View style={styles.cardContent}>
      <Skeleton width="70%" height={16} />
      <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
    </View>
  </View>
);

// List skeleton for vertical lists
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: count }).map((_, index) => (
      <CardSkeleton key={index} />
    ))}
  </View>
);

// Profile skeleton
export const ProfileSkeleton: React.FC = () => (
  <View style={styles.profileContainer}>
    <Skeleton width={80} height={80} borderRadius={40} />
    <Skeleton width={120} height={20} style={{ marginTop: 16 }} />
    <Skeleton width={180} height={14} style={{ marginTop: 8 }} />
    <View style={styles.profileStats}>
      <Skeleton width={60} height={40} borderRadius={8} />
      <Skeleton width={60} height={40} borderRadius={8} />
      <Skeleton width={60} height={40} borderRadius={8} />
    </View>
  </View>
);

// Resource card skeleton
export const ResourceCardSkeleton: React.FC = () => (
  <View style={styles.resourceCard}>
    <Skeleton width="100%" height={120} borderRadius={12} />
    <View style={styles.resourceContent}>
      <Skeleton width="80%" height={16} />
      <Skeleton width="60%" height={12} style={{ marginTop: 8 }} />
      <View style={styles.resourceFooter}>
        <Skeleton width={80} height={24} borderRadius={12} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
    </View>
  </View>
);

// Grid skeleton for search results
export const GridSkeleton: React.FC<{ columns?: number; count?: number }> = ({
  columns = 2,
  count = 6,
}) => {
  const items = Array.from({ length: count });
  const itemWidth = (screenWidth - spacing[6] * 2 - spacing[4] * (columns - 1)) / columns;
  
  return (
    <View style={[styles.gridContainer, { gap: spacing[4] }]}>
      {items.map((_, index) => (
        <View key={index} style={[styles.gridItem, { width: itemWidth }]}>
          <Skeleton width="100%" height={itemWidth * 0.7} borderRadius={12} />
          <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
          <Skeleton width="60%" height={12} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
};

// Full screen loading
export const FullScreenLoader: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animate.start();
    return () => animate.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.fullScreen}>
      <View style={styles.loaderContainer}>
        <Animated.View style={[styles.loader, { transform: [{ rotate: spin }] }]}>
          <View style={styles.loaderInner} />
        </Animated.View>
        <Text style={styles.loaderText}>{message}</Text>
      </View>
    </View>
  );
};

// Inline loading
export const InlineLoader: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({ 
  size = 'medium' 
}) => {
  const sizes = {
    small: 16,
    medium: 24,
    large: 32,
  };
  
  return (
    <View style={[styles.inlineLoader, { width: sizes[size], height: sizes[size] }]}>
      <Skeleton width={sizes[size]} height={sizes[size]} borderRadius={sizes[size] / 2} />
    </View>
  );
};

const styles = StyleSheet.create({
  // Card skeleton styles
  cardSkeleton: {
    flexDirection: 'row',
    padding: spacing[4],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    marginBottom: spacing[3],
  },
  cardContent: {
    flex: 1,
    marginLeft: spacing[3],
    justifyContent: 'center',
  },
  
  // List skeleton styles
  listContainer: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
  },
  
  // Profile skeleton styles
  profileContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  profileStats: {
    flexDirection: 'row',
    marginTop: spacing[6],
    gap: spacing[4],
  },
  
  // Resource card skeleton styles
  resourceCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing[4],
  },
  resourceContent: {
    padding: spacing[4],
  },
  resourceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  
  // Grid skeleton styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[6],
  },
  gridItem: {
    marginBottom: spacing[4],
  },
  
  // Full screen loader styles
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  loaderContainer: {
    alignItems: 'center',
  },
  loader: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderTopColor: colors.primary[500],
    borderRightColor: colors.primary[200],
    borderBottomColor: colors.primary[200],
    borderLeftColor: colors.primary[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
  },
  loaderText: {
    marginTop: spacing[3],
    fontSize: 14,
    color: colors.text.secondary,
  },
  
  // Inline loader styles
  inlineLoader: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Skeleton;
