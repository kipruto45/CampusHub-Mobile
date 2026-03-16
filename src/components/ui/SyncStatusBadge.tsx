// Sync Status Badge Component - Shows sync status for offline actions

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import Icon from './Icon';

type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  showLabel?: boolean;
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

const statusConfig: Record<SyncStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  synced: {
    label: 'Synced',
    color: colors.success,
    bgColor: colors.success + '15',
    icon: 'checkmark-circle',
  },
  pending: {
    label: 'Pending',
    color: colors.warning,
    bgColor: colors.warning + '15',
    icon: 'time',
  },
  syncing: {
    label: 'Syncing',
    color: colors.info,
    bgColor: colors.info + '15',
    icon: 'sync',
  },
  failed: {
    label: 'Failed',
    color: colors.error,
    bgColor: colors.error + '15',
    icon: 'alert-circle',
  },
};

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  showLabel = true,
  size = 'small',
  style,
}) => {
  const config = statusConfig[status];
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bgColor },
        isSmall ? styles.containerSmall : styles.containerMedium,
        style,
      ]}
    >
      <Icon
        name={config.icon as any}
        size={isSmall ? 12 : 16}
        color={config.color}
      />
      {showLabel && (
        <Text
          style={[
            styles.label,
            { color: config.color },
            isSmall ? styles.labelSmall : styles.labelMedium,
          ]}
        >
          {config.label}
        </Text>
      )}
    </View>
  );
};

// Compact version for inline use
export const SyncStatusDot: React.FC<{ status: SyncStatus; size?: number }> = ({
  status,
  size = 8,
}) => {
  const config = statusConfig[status];

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config.color,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  containerSmall: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    gap: spacing[1],
  },
  containerMedium: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  icon: {
    fontWeight: '600',
  },
  iconSmall: {
    fontSize: 10,
  },
  iconMedium: {
    fontSize: 14,
  },
  label: {
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 10,
  },
  labelMedium: {
    fontSize: 13,
  },
  dot: {},
});

export default SyncStatusBadge;
