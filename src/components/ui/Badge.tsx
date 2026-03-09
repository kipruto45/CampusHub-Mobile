// Badge Component for CampusHub
// Status chips and labels

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'sm',
  style,
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary[100];
      case 'success':
        return '#D1FAE5';
      case 'warning':
        return '#FEF3C7';
      case 'error':
        return '#FEE2E2';
      case 'info':
        return '#DBEAFE';
      case 'gray':
        return colors.gray[100];
      default:
        return colors.primary[100];
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary[700];
      case 'success':
        return '#065F46';
      case 'warning':
        return '#92400E';
      case 'error':
        return '#991B1B';
      case 'info':
        return '#1E40AF';
      case 'gray':
        return colors.gray[700];
      default:
        return colors.primary[700];
    }
  };

  return (
    <View
      style={[
        styles.badge,
        size === 'md' && styles.badgeMd,
        { backgroundColor: getBackgroundColor() },
        style,
      ]}
    >
      <Text style={[styles.text, { color: getTextColor() }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Badge;
