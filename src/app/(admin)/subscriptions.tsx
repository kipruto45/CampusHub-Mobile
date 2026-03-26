import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

interface SubscriptionItem {
  id: string;
  user_name?: string;
  plan_name?: string;
  status?: string;
  billing_period?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
  created_at?: string;
  updated_at?: string;
}

type SubscriptionFilter = 'all' | 'active' | 'trialing' | 'attention';

const unwrapEnvelopeData = <T,>(response: any, fallback: T): T => {
  if (response?.data?.data !== undefined) return response.data.data as T;
  if (response?.data !== undefined) return response.data as T;
  return fallback;
};

const asArray = <T,>(value: any): T[] => (Array.isArray(value) ? value : []);

const normalizeStatus = (value?: string): string => String(value || '').trim().toLowerCase();

const formatRelativeDate = (value?: string): string => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const formatDateTime = (value?: string): string => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString();
};

const formatPeriodLabel = (value?: string): string => {
  const cleaned = String(value || '').trim();
  if (!cleaned) return 'Billing period not set';
  return cleaned.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
};

const matchesSubscriptionFilter = (
  subscription: SubscriptionItem,
  filter: SubscriptionFilter
): boolean => {
  const status = normalizeStatus(subscription.status);

  if (filter === 'all') return true;
  if (filter === 'active') return status === 'active';
  if (filter === 'trialing') return status === 'trialing';
  return (
    subscription.cancel_at_period_end ||
    ['past_due', 'canceled', 'cancelled', 'inactive', 'unpaid', 'expired'].includes(status)
  );
};

const getStatusTone = (subscription: SubscriptionItem) => {
  const status = normalizeStatus(subscription.status);

  if (status === 'active' && !subscription.cancel_at_period_end) {
    return {
      backgroundColor: colors.success + '18',
      textColor: colors.success,
      label: 'Active',
    };
  }

  if (status === 'trialing') {
    return {
      backgroundColor: colors.info + '18',
      textColor: colors.info,
      label: 'Trialing',
    };
  }

  if (subscription.cancel_at_period_end) {
    return {
      backgroundColor: colors.warning + '18',
      textColor: colors.warning,
      label: 'Ending Soon',
    };
  }

  return {
    backgroundColor: colors.error + '18',
    textColor: colors.error,
    label: subscription.status || 'Attention',
  };
};

const SubscriptionsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionFilter>('all');
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionItem | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setError(null);
      const response = await adminAPI.listSubscriptions({
        page: 1,
        page_size: 30,
        search: searchQuery.trim() || undefined,
      });
      const payload = unwrapEnvelopeData<any>(response, {});
      setSubscriptions(asArray<SubscriptionItem>(payload?.results || payload));
    } catch (fetchError: any) {
      console.error('Failed to fetch subscriptions:', fetchError);
      setError(
        fetchError?.response?.data?.message ||
          fetchError?.message ||
          'Failed to load subscriptions.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    void fetchSubscriptions();
  }, [fetchSubscriptions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchSubscriptions();
  }, [fetchSubscriptions]);

  const filteredSubscriptions = useMemo(
    () =>
      subscriptions.filter((subscription) =>
        matchesSubscriptionFilter(subscription, statusFilter)
      ),
    [subscriptions, statusFilter]
  );

  const summary = useMemo(
    () => ({
      active: subscriptions.filter((subscription) =>
        matchesSubscriptionFilter(subscription, 'active')
      ).length,
      trialing: subscriptions.filter((subscription) =>
        matchesSubscriptionFilter(subscription, 'trialing')
      ).length,
      attention: subscriptions.filter((subscription) =>
        matchesSubscriptionFilter(subscription, 'attention')
      ).length,
    }),
    [subscriptions]
  );

  const openSubscriptionDetails = useCallback(async (subscription: SubscriptionItem) => {
    setSelectedSubscription(subscription);
    setShowDetailModal(true);
    setDetailLoading(true);

    try {
      const response = await adminAPI.getSubscription(subscription.id);
      const payload = unwrapEnvelopeData<SubscriptionItem>(response, subscription);
      setSelectedSubscription(payload);
    } catch (detailError) {
      console.error('Failed to fetch subscription details:', detailError);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !subscriptions.length) {
    return (
      <ErrorState
        type="server"
        title="Unable to Load Subscriptions"
        message={error}
        onRetry={() => {
          setLoading(true);
          void fetchSubscriptions();
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
        <Text style={styles.headerTitle}>Subscriptions</Text>
        <View style={styles.headerIcon} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{subscriptions.length}</Text>
            <Text style={styles.summaryLabel}>Loaded</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.active}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.trialing}</Text>
            <Text style={styles.summaryLabel}>Trialing</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.attention}</Text>
            <Text style={styles.summaryLabel}>Attention</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Subscription lifecycle</Text>
          <Text style={styles.infoText}>
            Monitor active plans, learners on trial, and subscriptions set to expire or cancel.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by learner or plan..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {(['all', 'active', 'trialing', 'attention'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter === 'all'
                  ? 'All'
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Current Subscriptions</Text>
        {filteredSubscriptions.length ? (
          filteredSubscriptions.map((subscription) => {
            const tone = getStatusTone(subscription);

            return (
              <TouchableOpacity
                key={subscription.id}
                style={styles.card}
                onPress={() => void openSubscriptionDetails(subscription)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>
                      {subscription.plan_name || 'Plan not assigned'}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {(subscription.user_name || 'Unknown learner') +
                        ` • ${formatPeriodLabel(subscription.billing_period)}`}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: tone.backgroundColor }]}>
                    <Text style={[styles.statusText, { color: tone.textColor }]}>
                      {tone.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.metaText}>
                  Started {formatRelativeDate(subscription.created_at)}
                  {subscription.current_period_end
                    ? ` • Ends ${formatRelativeDate(subscription.current_period_end)}`
                    : ''}
                </Text>

                {subscription.cancel_at_period_end ? (
                  <Text style={styles.alertText}>This subscription will cancel at period end.</Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Icon name="sync" size={40} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No subscriptions matched the current filters.</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subscription Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Icon name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={colors.primary[500]} />
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Learner</Text>
                  <Text style={styles.detailValue}>
                    {selectedSubscription?.user_name || 'Unknown learner'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plan</Text>
                  <Text style={styles.detailValue}>
                    {selectedSubscription?.plan_name || 'Not assigned'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>
                    {selectedSubscription?.status || 'Unknown'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Billing</Text>
                  <Text style={styles.detailValue}>
                    {formatPeriodLabel(selectedSubscription?.billing_period)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Period Start</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(selectedSubscription?.current_period_start)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Period End</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(selectedSubscription?.current_period_end)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trial Start</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(selectedSubscription?.trial_start)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trial End</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(selectedSubscription?.trial_end)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cancel At Period End</Text>
                  <Text style={styles.detailValue}>
                    {selectedSubscription?.cancel_at_period_end ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Canceled At</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(selectedSubscription?.canceled_at)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(selectedSubscription?.created_at)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Updated</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(selectedSubscription?.updated_at)}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
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
  },
  infoCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  infoText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
    marginTop: spacing[1],
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: 15,
    color: colors.text.primary,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing[3],
  },
  alertText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
    marginTop: spacing[2],
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalLoading: {
    padding: spacing[6],
    alignItems: 'center',
  },
  modalBody: {
    padding: spacing[4],
    gap: spacing[3],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: colors.text.primary,
  },
});

export default SubscriptionsScreen;
