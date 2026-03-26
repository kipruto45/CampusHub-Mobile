import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

type FilterMode = 'all' | 'allowed' | 'restricted';

type FeaturePermissionItem = {
  id: string;
  label: string;
  description: string;
  route?: string;
  allowed: boolean;
};

const FEATURE_COPY: Record<
  string,
  { label: string; description: string; route?: string }
> = {
  manage_users: {
    label: 'Manage Users',
    description: 'Create, review, suspend, and support user accounts.',
    route: '/(admin)/users',
  },
  manage_faculties: {
    label: 'Manage Faculties',
    description: 'Maintain faculties and broader academic structure.',
    route: '/(admin)/faculties',
  },
  manage_departments: {
    label: 'Manage Departments',
    description: 'Keep departments aligned to the right faculty scopes.',
    route: '/(admin)/departments',
  },
  moderate_content: {
    label: 'Moderate Content',
    description: 'Review resources, reports, and flagged uploads.',
    route: '/(admin)/resources',
  },
  view_analytics: {
    label: 'View Analytics',
    description: 'Open platform analytics and predictive reporting.',
    route: '/(admin)/analytics',
  },
  export_data: {
    label: 'Export Data',
    description: 'Generate exports, reports, and downloadable snapshots.',
    route: '/(admin)/reports-export',
  },
  system_settings: {
    label: 'System Settings',
    description: 'Access system-level controls and configuration screens.',
    route: '/(admin)/settings',
  },
  manage_billing: {
    label: 'Manage Billing',
    description: 'Oversee plans, subscriptions, and commercial activity.',
    route: '/(admin)/subscriptions',
  },
  manage_referrals: {
    label: 'Manage Referrals',
    description: 'Review referrals and maintain reward tiers.',
    route: '/(admin)/referrals',
  },
  manage_payments: {
    label: 'Manage Payments',
    description: 'Inspect payment statuses, histories, and billing issues.',
    route: '/(admin)/payments',
  },
};

const unwrapEnvelopeData = <T,>(response: any, fallback: T): T => {
  if (response?.data?.data !== undefined) return response.data.data as T;
  if (response?.data !== undefined) return response.data as T;
  return fallback;
};

const FeatureAccessScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const fetchPermissions = useCallback(async () => {
    try {
      setError(null);
      const response = await adminAPI.getFeatureAccess();
      const payload = unwrapEnvelopeData<any>(response, {});
      setPermissions(payload?.permissions || {});
    } catch (fetchError: any) {
      console.error('Failed to fetch feature access:', fetchError);
      setError(
        fetchError?.response?.data?.message ||
          fetchError?.message ||
          'Failed to load feature access permissions.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchPermissions();
  }, [fetchPermissions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchPermissions();
  }, [fetchPermissions]);

  const items = useMemo<FeaturePermissionItem[]>(() => {
    const entries = Object.entries(permissions);
    return entries.map(([id, allowed]) => ({
      id,
      label: FEATURE_COPY[id]?.label || id.replace(/_/g, ' '),
      description: FEATURE_COPY[id]?.description || 'Permission returned by the backend.',
      route: FEATURE_COPY[id]?.route,
      allowed: Boolean(allowed),
    }));
  }, [permissions]);

  const visibleItems = useMemo(() => {
    if (filterMode === 'allowed') return items.filter((item) => item.allowed);
    if (filterMode === 'restricted') return items.filter((item) => !item.allowed);
    return items;
  }, [items, filterMode]);

  const allowedCount = items.filter((item) => item.allowed).length;
  const restrictedCount = items.filter((item) => !item.allowed).length;

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !items.length) {
    return (
      <ErrorState
        type="server"
        title="Unable to Load Feature Access"
        message={error}
        onRetry={() => {
          setLoading(true);
          void fetchPermissions();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <Icon name="arrow-back" size={22} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feature Access</Text>
        <View style={styles.headerIcon} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Icon name="key" size={24} color={colors.warning} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Permissions from backend</Text>
            <Text style={styles.heroSubtitle}>
              This screen reflects the current feature gates returned for your signed-in admin account.
            </Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{items.length}</Text>
            <Text style={styles.summaryLabel}>Checked Features</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{allowedCount}</Text>
            <Text style={styles.summaryLabel}>Allowed</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{restrictedCount}</Text>
            <Text style={styles.summaryLabel}>Restricted</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(['all', 'allowed', 'restricted'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, filterMode === filter && styles.filterChipActive]}
              onPress={() => setFilterMode(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterMode === filter && styles.filterChipTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Feature Permissions</Text>
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              disabled={!item.route || !item.allowed}
              onPress={() => item.route && item.allowed && router.push(item.route as any)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>{item.label}</Text>
                  <Text style={styles.cardSubtitle}>{item.description}</Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    item.allowed ? styles.badgeAllowed : styles.badgeRestricted,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      item.allowed ? styles.badgeAllowedText : styles.badgeRestrictedText,
                    ]}
                  >
                    {item.allowed ? 'Allowed' : 'Restricted'}
                  </Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.metaText}>{item.id}</Text>
                {item.route && item.allowed ? (
                  <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="lock-closed" size={40} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No permissions matched the current filter.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[9],
    paddingBottom: spacing[4],
    backgroundColor: colors.primary[500],
  },
  headerIcon: {
    width: 28,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  heroCard: {
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning + '18',
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
    marginTop: spacing[1],
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    ...shadows.sm,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[5],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary,
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  badgeAllowed: {
    backgroundColor: colors.success + '18',
  },
  badgeRestricted: {
    backgroundColor: colors.error + '18',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeAllowedText: {
    color: colors.success,
  },
  badgeRestrictedText: {
    color: colors.error,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
  },
  metaText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    ...shadows.sm,
  },
  emptyText: {
    marginTop: spacing[3],
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default FeatureAccessScreen;
