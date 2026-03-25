// Payment History Screen

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import Button from '../../../components/ui/Button';
import { paymentsAPI } from '../../../services/api';

type PaymentItem = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  payment_type: string;
  created_at: string;
  receipt_url?: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const statusPill = (status?: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'succeeded') return { bg: colors.success + '1A', fg: colors.success, label: 'Succeeded' };
  if (normalized === 'pending') return { bg: colors.warning + '1A', fg: colors.warning, label: 'Pending' };
  if (normalized === 'failed') return { bg: colors.error + '1A', fg: colors.error, label: 'Failed' };
  if (normalized === 'refunded') return { bg: colors.gray[100], fg: colors.text.secondary, label: 'Refunded' };
  if (normalized === 'partial') return { bg: colors.warning + '1A', fg: colors.warning, label: 'Partial' };
  return { bg: colors.gray[100], fg: colors.text.secondary, label: normalized ? normalized : 'Unknown' };
};

const PaymentHistoryScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const response = await paymentsAPI.getPaymentHistory();
      const payload = response?.data?.data ?? response?.data ?? {};
      const results = Array.isArray(payload?.payments) ? payload.payments : [];
      setPayments(results);
    } catch (err: any) {
      Alert.alert(
        'Payments',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load payment history.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const openReceipt = async (url: string) => {
    try {
      const cleaned = String(url || '').trim();
      if (!cleaned) {
        Alert.alert('Receipt', 'Receipt link is not available yet.');
        return;
      }
      await WebBrowser.openBrowserAsync(cleaned);
    } catch (err: any) {
      Alert.alert('Receipt', err?.message || 'Unable to open receipt.');
    }
  };

  const handleCheckStatus = async (paymentId: string) => {
    try {
      setCheckingId(paymentId);
      const response = await paymentsAPI.getPaymentStatus({ payment_id: paymentId });
      const payload = response?.data?.data ?? response?.data ?? {};
      const status = String(payload?.status || 'unknown');
      const provider = String(payload?.provider || '');
      const providerPaymentId = String(payload?.provider_payment_id || '');
      Alert.alert(
        'Payment Status',
        [
          `Status: ${status}`,
          provider ? `Provider: ${provider}` : null,
          providerPaymentId ? `Reference: ${providerPaymentId}` : null,
        ]
          .filter(Boolean)
          .join('\n')
      );
      await loadHistory();
    } catch (err: any) {
      Alert.alert(
        'Status Check Failed',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to verify payment status.'
      );
    } finally {
      setCheckingId(null);
    }
  };

  const pendingCount = useMemo(
    () => payments.filter((p) => String(p.status || '').toLowerCase() === 'pending').length,
    [payments]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Payments</Text>
          {pendingCount ? (
            <Text style={styles.headerSubtitle}>{pendingCount} pending</Text>
          ) : (
            <Text style={styles.headerSubtitle}>History & receipts</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            setRefreshing(true);
            loadHistory();
          }}
        >
          <Icon name="refresh" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadHistory();
            }}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {payments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="receipt" size={36} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptyText}>Your receipts will appear here after a successful payment.</Text>
            <Button title="Browse Plans" onPress={() => router.push('/(student)/billing/plans' as any)} variant="outline" />
          </View>
        ) : (
          payments.map((p) => {
            const pill = statusPill(p.status);
            const checking = checkingId === p.id;
            const isPending = String(p.status || '').toLowerCase() === 'pending';
            return (
              <View key={p.id} style={styles.paymentCard}>
                <View style={styles.paymentTop}>
                  <View style={styles.paymentLeft}>
                    <View style={[styles.paymentIcon, { backgroundColor: pill.bg }]}>
                      <Icon name="card" size={18} color={pill.fg} />
                    </View>
                    <View style={styles.paymentText}>
                      <Text style={styles.paymentTitle}>
                        {String(p.payment_type || 'payment').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                      <Text style={styles.paymentSubtitle}>{formatDateTime(p.created_at)}</Text>
                    </View>
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={styles.amountText}>
                      {p.currency} {p.amount}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                      <Text style={[styles.statusPillText, { color: pill.fg }]}>{pill.label}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.paymentActions}>
                  <Button
                    title="Receipt"
                    onPress={() => openReceipt(String(p.receipt_url || ''))}
                    variant="secondary"
                    disabled={!p.receipt_url}
                    style={{ flex: 1 }}
                  />
                  <View style={{ width: spacing[3] }} />
                  <Button
                    title={checking ? 'Checking...' : 'Status'}
                    onPress={() => handleCheckStatus(p.id)}
                    variant={isPending ? 'outline' : 'ghost'}
                    disabled={checking}
                    loading={checking}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            );
          })
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing[3], color: colors.text.secondary, fontSize: 13 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[10],
    paddingBottom: spacing[4],
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text.primary },
  headerSubtitle: { marginTop: 2, fontSize: 12, color: colors.text.tertiary },

  scrollContent: { padding: spacing[4], paddingBottom: spacing[10] },

  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: { marginTop: spacing[3], fontSize: 15, fontWeight: '800', color: colors.text.primary },
  emptyText: { marginTop: spacing[2], marginBottom: spacing[4], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },

  paymentCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  paymentTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentText: { flex: 1 },
  paymentTitle: { fontSize: 14, fontWeight: '800', color: colors.text.primary },
  paymentSubtitle: { marginTop: 2, fontSize: 12, color: colors.text.tertiary },

  paymentRight: { alignItems: 'flex-end' },
  amountText: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  statusPill: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '800' },

  paymentActions: { flexDirection: 'row', marginTop: spacing[4] },

  bottomSpacing: { height: spacing[4] },
});

export default PaymentHistoryScreen;

