// Storage Summary Card Component
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import Icon from '../ui/Icon';
import { StorageSummary, formatFileSize } from '../../services/library.service';
import { colors } from '../../theme/colors';

interface StorageSummaryCardProps {
  storage: StorageSummary;
  onPress?: () => void;
}

export const StorageSummaryCard: React.FC<StorageSummaryCardProps> = ({
  storage,
  onPress,
}) => {
  const getWarningColor = () => {
    switch (storage.warning_level) {
      case 'critical':
        return colors.error;
      case 'warning':
        return colors.warning;
      default:
        return colors.success;
    }
  };

  const getWarningText = () => {
    switch (storage.warning_level) {
      case 'critical':
        return 'Storage Critical';
      case 'warning':
        return 'Storage Low';
      default:
        return 'Storage OK';
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container as ViewStyle} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header as ViewStyle}>
        <View style={styles.iconContainer as ViewStyle}>
          <Icon name="cloud" size={24} color={colors.primary[500]} />
        </View>
        <View style={styles.headerText as ViewStyle}>
          <Text style={styles.title}>Storage</Text>
          <View style={styles.warningBadge as ViewStyle}>
            <View style={[styles.warningDot as ViewStyle, { backgroundColor: getWarningColor() }]} />
            <Text style={[styles.warningText, { color: getWarningColor() }]}>
              {getWarningText()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.progressContainer as ViewStyle}>
        <View style={styles.progressBackground as ViewStyle}>
          <View 
            style={[
              styles.progressBar as ViewStyle, 
              { 
                width: `${Math.min(storage.usage_percent, 100)}%`,
                backgroundColor: getWarningColor(),
              }
            ]} 
          />
        </View>
        <Text style={styles.percentText}>
          {storage.usage_percent.toFixed(1)}% used
        </Text>
      </View>

      <View style={styles.statsRow as ViewStyle}>
        <View style={styles.statItem as ViewStyle}>
          <Text style={styles.statValue}>{formatFileSize(storage.storage_used_bytes)}</Text>
          <Text style={styles.statLabel}>Used</Text>
        </View>
        <View style={styles.divider as ViewStyle} />
        <View style={styles.statItem as ViewStyle}>
          <Text style={styles.statValue}>{formatFileSize(storage.storage_remaining_bytes)}</Text>
          <Text style={styles.statLabel}>Free</Text>
        </View>
        <View style={styles.divider as ViewStyle} />
        <View style={styles.statItem as ViewStyle}>
          <Text style={styles.statValue}>{storage.total_files}</Text>
          <Text style={styles.statLabel}>Files</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card.light,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  warningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBackground: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  percentText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.light,
  },
});
