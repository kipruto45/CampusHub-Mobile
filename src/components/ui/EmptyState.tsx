// Empty State Component for CampusHub
// Displayed when there's no data to show

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import Icon from './Icon';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name={icon as any} size={48} color={colors.text.tertiary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[16],
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  actionButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});

export default EmptyState;
