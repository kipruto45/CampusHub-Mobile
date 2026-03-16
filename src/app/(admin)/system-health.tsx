// System Health Screen for Admin Dashboard
// Shows server status, storage metrics, and system performance

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';

interface SystemHealthData {
  database: {
    healthy: boolean;
    error: string | null;
  };
  storage: {
    total_files: number;
    total_size_bytes: number;
    total_size_mb: number;
    total_size_gb: number;
    average_size_mb: number;
    largest_resources: Array<{
      id: string;
      title: string;
      size_mb: number;
    }>;
    error?: string;
  };
  api: {
    status: string;
  };
  error_rates: {
    errors_last_24h: number;
  };
  active_users: {
    last_24h: number;
    last_7_days: number;
    last_30_days: number;
  };
  cache: {
    status: string;
    hit_rate?: number;
  };
  notifications: {
    unread_count: number;
    total_count: number;
  };
}

const SystemHealthScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = useCallback(async () => {
    try {
      const response = await adminAPI.getSystemHealth();
      const healthData = response.data?.data || response.data;
      setData(healthData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHealthData();
    setRefreshing(false);
  }, [fetchHealthData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading system health...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="warning" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchHealthData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderStatusBadge = (isHealthy: boolean) => (
    <View style={[styles.statusBadge, isHealthy ? styles.statusHealthy : styles.statusError]}>
      <Icon 
        name={isHealthy ? 'checkmark-circle' : 'alert-circle'} 
        size={16} 
        color={isHealthy ? colors.success : colors.error} 
      />
      <Text style={[styles.statusText, isHealthy ? styles.statusTextHealthy : styles.statusTextError]}>
        {isHealthy ? 'Healthy' : 'Error'}
      </Text>
    </View>
  );

  const renderMetricCard = (title: string, value: string | number, subtitle?: string, icon?: string, color?: string) => (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconContainer, { backgroundColor: (color || colors.primary[500]) + '20' }]}>
        <Icon name={(icon as any) || 'analytics'} size={20} color={color || colors.primary[500]} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const largestResources = data?.storage?.largest_resources ?? [];
  const errorsLast24h = data?.error_rates?.errors_last_24h ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary[500]]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Health</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Database Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Database</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Status</Text>
            {renderStatusBadge(data?.database?.healthy ?? false)}
          </View>
          {data?.database?.error && (
            <Text style={styles.errorMessage}>{data.database.error}</Text>
          )}
        </View>
      </View>

      {/* Storage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        <View style={styles.card}>
          {renderMetricCard(
            'Total Files', 
            data?.storage?.total_files?.toLocaleString() || '0',
            `${data?.storage?.total_size_gb?.toFixed(2) || 0} GB used`,
            'folder',
            colors.info
          )}
          <View style={styles.divider} />
          {renderMetricCard(
            'Average File Size', 
            `${data?.storage?.average_size_mb?.toFixed(2) || 0} MB`,
            'Per file',
            'document-text',
            colors.warning
          )}
        </View>

        {/* Largest Files */}
        {largestResources.length > 0 && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Largest Files</Text>
            {largestResources.map((resource, index) => (
              <View key={resource.id} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <Text style={styles.listItemIndex}>{index + 1}.</Text>
                  <Text style={styles.listItemTitle} numberOfLines={1}>
                    {resource.title}
                  </Text>
                </View>
                <Text style={styles.listItemValue}>{resource.size_mb} MB</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* API Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API & Server</Text>
        <View style={styles.card}>
          {renderMetricCard(
            'API Status', 
            data?.api?.status || 'Unknown',
            'Current status',
            'server',
            colors.success
          )}
          <View style={styles.divider} />
          {renderMetricCard(
            'Errors (24h)', 
            errorsLast24h.toLocaleString(),
            'Server errors',
            'warning',
            errorsLast24h > 0 ? colors.error : colors.success
          )}
        </View>
      </View>

      {/* Active Users */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Users</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data?.active_users?.last_24h?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>Last 24h</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data?.active_users?.last_7_days?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>Last 7 days</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data?.active_users?.last_30_days?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>Last 30 days</Text>
          </View>
        </View>
      </View>

      {/* Cache */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cache</Text>
        <View style={styles.card}>
          {renderMetricCard(
            'Cache Status', 
            data?.cache?.status || 'Unknown',
            data?.cache?.hit_rate ? `${(data.cache.hit_rate * 100).toFixed(1)}% hit rate` : 'Performance',
            'cube',
            colors.primary[500]
          )}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.info + '20' }]}>
            <Text style={[styles.statValue, { color: colors.info }]}>
              {data?.notifications?.unread_count?.toLocaleString() || 0}
            </Text>
            <Text style={styles.statLabel}>Unread Notifications</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success + '20' }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {data?.notifications?.total_count?.toLocaleString() || 0}
            </Text>
            <Text style={styles.statLabel}>Total Notifications</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: spacing[3],
    color: colors.text.secondary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing[6],
  },
  errorText: {
    marginTop: spacing[3],
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing[4],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[6],
    paddingHorizontal: spacing[2],
  },
  backButton: {
    padding: spacing[2],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  subSection: {
    marginTop: spacing[4],
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...shadows.sm,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statusHealthy: {
    backgroundColor: colors.success + '20',
  },
  statusError: {
    backgroundColor: colors.error + '20',
  },
  statusText: {
    marginLeft: spacing[1],
    fontSize: 14,
    fontWeight: '600',
  },
  statusTextHealthy: {
    color: colors.success,
  },
  statusTextError: {
    color: colors.error,
  },
  errorMessage: {
    marginTop: spacing[2],
    color: colors.error,
    fontSize: 14,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  metricSubtitle: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing[4],
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemIndex: {
    width: 24,
    color: colors.text.tertiary,
    fontSize: 14,
  },
  listItemTitle: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
  },
  listItemValue: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing[1],
    textAlign: 'center',
  },
});

export default SystemHealthScreen;
