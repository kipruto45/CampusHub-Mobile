import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';

import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

interface PaymentItem {
  id: string;
  user_name?: string;
  plan_name?: string;
  payment_type?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  description?: string;
  stripe_payment_intent_id?: string;
  stripe_invoice_id?: string;
  created_at?: string;
  updated_at?: string;
}

type PaymentFilter = 'all' | 'successful' | 'pending' | 'attention';

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

const formatCurrency = (amount?: number | string, currency?: string): string => {
  const parsedAmount = Number(amount || 0);
  const resolvedCurrency = String(currency || 'USD').toUpperCase();

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: resolvedCurrency,
      maximumFractionDigits: 2,
    }).format(parsedAmount);
  } catch {
    return `${resolvedCurrency} ${parsedAmount.toFixed(2)}`;
  }
};

const matchesPaymentFilter = (payment: PaymentItem, filter: PaymentFilter): boolean => {
  const status = normalizeStatus(payment.status);

  if (filter === 'all') return true;
  if (filter === 'successful') {
    return ['paid', 'succeeded', 'success', 'completed'].includes(status);
  }
  if (filter === 'pending') {
    return ['pending', 'processing', 'requires_action'].includes(status);
  }
  return ['failed', 'canceled', 'cancelled', 'refunded', 'expired', 'unpaid'].includes(status);
};

const getStatusTone = (status?: string) => {
  const normalized = normalizeStatus(status);
  if (['paid', 'succeeded', 'success', 'completed'].includes(normalized)) {
    return {
      backgroundColor: colors.success + '18',
      textColor: colors.success,
      label: status || 'Success',
    };
  }
  if (['pending', 'processing', 'requires_action'].includes(normalized)) {
    return {
      backgroundColor: colors.warning + '18',
      textColor: colors.warning,
      label: status || 'Pending',
    };
  }
  return {
    backgroundColor: colors.error + '18',
    textColor: colors.error,
    label: status || 'Attention',
  };
};

const PaymentsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>('all');
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setError(null);
      const response = await adminAPI.listPayments({
        page: 1,
        page_size: 30,
        search: searchQuery.trim() || undefined,
      });
      const payload = unwrapEnvelopeData<any>(response, {});
      setPayments(asArray<PaymentItem>(payload?.results || payload));
    } catch (fetchError: any) {
      console.error('Failed to fetch payments:', fetchError);
      setError(
        fetchError?.response?.data?.message ||
          fetchError?.message ||
          'Failed to load payments.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchPayments();
  }, [fetchPayments]);

  const filteredPayments = useMemo(
    () => payments.filter((payment) => matchesPaymentFilter(payment, statusFilter)),
    [payments, statusFilter]
  );

  const summary = useMemo(
    () => ({
      successful: payments.filter((payment) => matchesPaymentFilter(payment, 'successful')).length,
      pending: payments.filter((payment) => matchesPaymentFilter(payment, 'pending')).length,
      attention: payments.filter((payment) => matchesPaymentFilter(payment, 'attention')).length,
    }),
    [payments]
  );

  const openPaymentDetails = useCallback(async (payment: PaymentItem) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
    setDetailLoading(true);

    try {
      const response = await adminAPI.getPayment(payment.id);
      const payload = unwrapEnvelopeData<PaymentItem>(response, payment);
      setSelectedPayment(payload);
    } catch (detailError) {
      console.error('Failed to fetch payment details:', detailError);
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

  if (error && !payments.length) {
    return (
      <ErrorState
        type="server"
        title="Unable to Load Payments"
        message={error}
        onRetry={() => {
          setLoading(true);
          void fetchPayments();
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
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={styles.headerIcon} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{payments.length}</Text>
            <Text style={styles.summaryLabel}>Loaded</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.successful}</Text>
            <Text style={styles.summaryLabel}>Successful</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.pending}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.attention}</Text>
            <Text style={styles.summaryLabel}>Attention</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Revenue oversight</Text>
          <Text style={styles.infoText}>
            Search by learner, plan, or Stripe reference to investigate payment history and status changes.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by user or Stripe reference..."
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
          {(['all', 'successful', 'pending', 'attention'] as const).map((filter) => (
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

        <Text style={styles.sectionTitle}>Recent Payments</Text>
        {filteredPayments.length ? (
          filteredPayments.map((payment) => {
            const tone = getStatusTone(payment.status);

            return (
              <TouchableOpacity
                key={payment.id}
                style={styles.card}
                onPress={() => void openPaymentDetails(payment)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>
                      {formatCurrency(payment.amount, payment.currency)}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {(payment.user_name || 'Unknown learner') +
                        (payment.plan_name ? ` • ${payment.plan_name}` : '')}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: tone.backgroundColor }]}>
                    <Text style={[styles.statusText, { color: tone.textColor }]}>
                      {tone.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    {payment.payment_type || 'Payment'} • {formatRelativeDate(payment.created_at)}
                  </Text>
                  <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
                </View>

                {payment.description ? (
                  <Text style={styles.descriptionText}>{payment.description}</Text>
                ) : null}

                <Text style={styles.metaText}>
                  {payment.stripe_payment_intent_id || payment.stripe_invoice_id || 'No Stripe reference'}
                </Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Icon name="card" size={40} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No payments matched the current filters.</Text>
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
              <Text style={styles.modalTitle}>Payment Details</Text>
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
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(selectedPayment?.amount, selectedPayment?.currency)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Learner</Text>
                  <Text style={styles.detailValue}>
                    {selectedPayment?.user_name || 'Unknown learner'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plan</Text>
                  <Text style={styles.detailValue}>{selectedPayment?.plan_name || 'Not linked'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{selectedPayment?.status || 'Unknown'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{selectedPayment?.payment_type || 'Not set'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>{formatDateTime(selectedPayment?.created_at)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Updated</Text>
                  <Text style={styles.detailValue}>{formatDateTime(selectedPayment?.updated_at)}</Text>
                </View>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailLongValue}>
                    {selectedPayment?.description || 'No description was supplied for this payment.'}
                  </Text>
                </View>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Stripe Payment Intent</Text>
                  <Text style={styles.detailLongValue}>
                    {selectedPayment?.stripe_payment_intent_id || 'Not available'}
                  </Text>
                </View>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Stripe Invoice</Text>
                  <Text style={styles.detailLongValue}>
                    {selectedPayment?.stripe_invoice_id || 'Not available'}
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  metaText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  descriptionText: {
    fontSize: 13,
    color: colors.text.secondary,
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
  detailBlock: {
    gap: spacing[1],
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
  detailLongValue: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
});

export default PaymentsScreen;
