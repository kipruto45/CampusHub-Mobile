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

interface ScopeInfo {
  role?: string;
  institution?: string;
  faculty?: string;
  department?: string;
  can_manage_users?: boolean;
  can_manage_content?: boolean;
  can_moderate?: boolean;
  can_view_analytics?: boolean;
  can_export?: boolean;
  can_manage_referrals?: boolean;
  can_manage_payments?: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  permission?: string;
}

const unwrapEnvelopeData = <T,>(response: any, fallback: T): T => {
  if (response?.data?.data !== undefined) return response.data.data as T;
  if (response?.data !== undefined) return response.data as T;
  return fallback;
};

const formatLabel = (value?: string): string => {
  const cleaned = String(value || '').trim();
  if (!cleaned) return 'Not set';
  return cleaned.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
};

const ADMIN_NAVIGATION_ROUTE_MAP: Record<string, string> = {
  dashboard: '/(admin)/dashboard',
  notifications: '/(admin)/admin-notifications',
  moderation: '/(admin)/resources',
  users: '/(admin)/users',
  referrals: '/(admin)/referrals',
  payments: '/(admin)/payments',
  faculties: '/(admin)/faculties',
  analytics: '/(admin)/analytics',
  predictive: '/(admin)/predictive-analytics',
  reports: '/(admin)/reports-export',
  settings: '/(admin)/settings',
};

const ScopeScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);
  const [navigationMenu, setNavigationMenu] = useState<NavigationItem[]>([]);

  const fetchScopeInfo = useCallback(async () => {
    try {
      setError(null);
      const response = await adminAPI.getScopeInfo();
      const payload = unwrapEnvelopeData<any>(response, {});
      setScopeInfo((payload?.scope || {}) as ScopeInfo);
      setNavigationMenu(Array.isArray(payload?.navigation_menu) ? payload.navigation_menu : []);
    } catch (fetchError: any) {
      console.error('Failed to fetch scope info:', fetchError);
      setError(
        fetchError?.response?.data?.message ||
          fetchError?.message ||
          'Failed to load scope information.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchScopeInfo();
  }, [fetchScopeInfo]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchScopeInfo();
  }, [fetchScopeInfo]);

  const capabilities = useMemo(
    () => [
      {
        id: 'manage-users',
        label: 'Manage Users',
        description: 'Invite, review, and update accounts across the platform.',
        enabled: Boolean(scopeInfo?.can_manage_users),
        route: '/(admin)/users',
      },
      {
        id: 'manage-content',
        label: 'Manage Content',
        description: 'Oversee resources, reports, and moderation queues.',
        enabled: Boolean(scopeInfo?.can_manage_content),
        route: '/(admin)/resources',
      },
      {
        id: 'moderate',
        label: 'Moderate',
        description: 'Review flagged items and keep the campus community safe.',
        enabled: Boolean(scopeInfo?.can_moderate),
        route: '/(admin)/reports',
      },
      {
        id: 'analytics',
        label: 'View Analytics',
        description: 'Open operational analytics and predictive dashboards.',
        enabled: Boolean(scopeInfo?.can_view_analytics),
        route: '/(admin)/analytics',
      },
      {
        id: 'export',
        label: 'Export Data',
        description: 'Generate reports and export operational snapshots.',
        enabled: Boolean(scopeInfo?.can_export),
        route: '/(admin)/reports-export',
      },
      {
        id: 'referrals',
        label: 'Manage Referrals',
        description: 'Oversee referral activity and reward tiers.',
        enabled: Boolean(scopeInfo?.can_manage_referrals),
        route: '/(admin)/referrals',
      },
      {
        id: 'payments',
        label: 'Manage Payments',
        description: 'Track subscriptions, revenue, and payment operations.',
        enabled: Boolean(scopeInfo?.can_manage_payments),
        route: '/(admin)/payments',
      },
    ],
    [scopeInfo]
  );

  const enabledCapabilities = capabilities.filter((capability) => capability.enabled).length;
  const scopeLabel =
    scopeInfo?.department ||
    scopeInfo?.faculty ||
    scopeInfo?.institution ||
    'Platform-wide access';

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !scopeInfo) {
    return (
      <ErrorState
        type="server"
        title="Unable to Load Scope"
        message={error}
        onRetry={() => {
          setLoading(true);
          void fetchScopeInfo();
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
        <Text style={styles.headerTitle}>Admin Scope</Text>
        <View style={styles.headerIcon} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Icon name="shield-checkmark" size={24} color={colors.primary[500]} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{formatLabel(scopeInfo?.role)}</Text>
            <Text style={styles.heroSubtitle}>{formatLabel(scopeLabel)}</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{enabledCapabilities}</Text>
            <Text style={styles.summaryLabel}>Enabled Capabilities</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{navigationMenu.length}</Text>
            <Text style={styles.summaryLabel}>Menu Items</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {scopeInfo?.department ? 'Dept' : scopeInfo?.faculty ? 'Faculty' : scopeInfo?.institution ? 'Institution' : 'Global'}
            </Text>
            <Text style={styles.summaryLabel}>Scope Level</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Capabilities</Text>
        {capabilities.map((capability) => (
          <TouchableOpacity
            key={capability.id}
            style={styles.card}
            disabled={!capability.enabled}
            onPress={() => capability.enabled && router.push(capability.route as any)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{capability.label}</Text>
                <Text style={styles.cardSubtitle}>{capability.description}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  capability.enabled ? styles.badgeAllowed : styles.badgeRestricted,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    capability.enabled ? styles.badgeAllowedText : styles.badgeRestrictedText,
                  ]}
                >
                  {capability.enabled ? 'Enabled' : 'Restricted'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Navigation Menu From Backend</Text>
        {navigationMenu.length ? (
          navigationMenu.map((item) => {
            const mobileRoute = item.id ? ADMIN_NAVIGATION_ROUTE_MAP[item.id] : undefined;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.navCard}
                disabled={!mobileRoute}
                onPress={() => mobileRoute && router.push(mobileRoute as any)}
              >
                <View style={styles.navIcon}>
                  <Text style={styles.navIconText}>{item.icon || '•'}</Text>
                </View>
                <View style={styles.navCopy}>
                  <Text style={styles.cardTitle}>{item.label}</Text>
                  <Text style={styles.cardSubtitle}>
                    {formatLabel(item.permission)} • {item.path || 'No web path'}
                  </Text>
                </View>
                {mobileRoute ? (
                  <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
                ) : (
                  <Text style={styles.unsyncedText}>View only</Text>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Icon name="grid" size={40} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No scoped navigation items were returned.</Text>
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
    alignItems: 'center',
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
    backgroundColor: colors.primary[500] + '15',
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[4],
    marginBottom: spacing[5],
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
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
  },
  navIconText: {
    fontSize: 18,
  },
  navCopy: {
    flex: 1,
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
  unsyncedText: {
    fontSize: 12,
    fontWeight: '600',
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

export default ScopeScreen;
