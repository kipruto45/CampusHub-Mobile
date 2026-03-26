// Billing & Payments Hub

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

type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused'
  | string;

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const statusLabel = (status?: SubscriptionStatus | null) => {
  if (!status) return 'Free';
  const normalized = String(status).toLowerCase();
  if (normalized === 'trialing') return 'Trial';
  if (normalized === 'past_due') return 'Past due';
  if (normalized === 'unpaid') return 'Unpaid';
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const statusPill = (status?: SubscriptionStatus | null) => {
  const normalized = String(status || '').toLowerCase();
  if (!normalized) {
    return { bg: colors.gray[100], fg: colors.text.secondary };
  }
  if (normalized === 'active') return { bg: colors.success + '1A', fg: colors.success };
  if (normalized === 'trialing') return { bg: colors.info + '1A', fg: colors.info };
  if (normalized === 'past_due') return { bg: colors.warning + '1A', fg: colors.warning };
  if (normalized === 'unpaid') return { bg: colors.error + '1A', fg: colors.error };
  if (normalized === 'canceled') return { bg: colors.gray[100], fg: colors.text.secondary };
  return { bg: colors.gray[100], fg: colors.text.secondary };
};

const BillingHome: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [plan, setPlan] = useState<any | null>(null);
  const [limits, setLimits] = useState<any | null>(null);
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);

  const effectiveLimits = useMemo(
    () =>
      limits ?? {
        storage_gb: 1,
        max_upload_mb: 10,
        downloads_monthly: 50,
        unlimited_downloads: false,
        has_ads: true,
        priority_support: false,
        analytics: false,
        early_access: false,
      },
    [limits]
  );

  const loadBilling = useCallback(async () => {
    try {
      setError(null);
      const [subRes, limitsRes, upgradesRes] = await Promise.all([
        paymentsAPI.getSubscription(),
        paymentsAPI.getLimits(),
        paymentsAPI.getStorageUpgrades(),
      ]);

      const subscriptionPayload = subRes?.data?.data ?? subRes?.data ?? {};
      setSubscription(subscriptionPayload?.subscription ?? null);
      setPlan(subscriptionPayload?.plan ?? null);

      const limitsPayload = limitsRes?.data?.data ?? limitsRes?.data ?? null;
      setLimits(limitsPayload);

      const upgradesPayload = upgradesRes?.data?.data ?? upgradesRes?.data ?? {};
      setUpgrades(Array.isArray(upgradesPayload?.upgrades) ? upgradesPayload.upgrades : []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to load billing.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const activeUpgradeCount = useMemo(() => {
    const now = Date.now();
    return upgrades.filter((u) => {
      const status = String(u?.status || '').toLowerCase();
      const endsAt = u?.ends_at ? new Date(u.ends_at).getTime() : 0;
      return status === 'active' && (!endsAt || endsAt > now);
    }).length;
  }, [upgrades]);

  const openBillingFallback = useCallback(() => {
    const hasSubscription = Boolean(subscription?.id || plan?.id);
    Alert.alert(
      hasSubscription ? 'Manage Billing In App' : 'Choose a Plan In App',
      hasSubscription
        ? 'The browser billing portal is unavailable for this account right now. You can still review payment history or manage your plan from the app.'
        : 'A billing portal is not set up for this account yet. You can still compare plans and start a subscription from the app.',
      [
        {
          text: hasSubscription ? 'Payment History' : 'View Plans',
          onPress: () =>
            router.push((hasSubscription ? '/(student)/billing/history' : '/(student)/billing/plans') as any),
        },
        { text: 'Close', style: 'cancel' },
      ]
    );
  }, [plan?.id, router, subscription?.id]);

  const handleOpenPortal = useCallback(async () => {
    try {
      setOpeningPortal(true);
      const response = await paymentsAPI.getBillingPortal();
      const payload = response?.data?.data ?? response?.data ?? {};
      const url = String(payload?.portal_url || '').trim();
      if (!url) {
        openBillingFallback();
        return;
      }
      await WebBrowser.openBrowserAsync(url);
    } catch (err: any) {
      const message =
        err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Unable to open billing portal.';
      if (
        err?.response?.status === 404 ||
        /no billing account found/i.test(message) ||
        /not available/i.test(message)
      ) {
        openBillingFallback();
        return;
      }
      Alert.alert('Billing Portal', message);
    } finally {
      setOpeningPortal(false);
    }
  }, [openBillingFallback]);

  const handleCancelOrReactivate = useCallback(() => {
    const cancelAtPeriodEnd = Boolean(subscription?.cancel_at_period_end);
    const status = String(subscription?.status || '').toLowerCase();

    if (!subscription || (status !== 'active' && status !== 'trialing')) {
      Alert.alert('Subscription', 'No active subscription to manage right now.');
      return;
    }

    if (cancelAtPeriodEnd) {
      Alert.alert('Reactivate Subscription', 'Continue your subscription?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            try {
              setUpdatingSubscription(true);
              await paymentsAPI.reactivateSubscription();
              await loadBilling();
            } catch (err: any) {
              Alert.alert(
                'Reactivate Failed',
                err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Unable to reactivate.'
              );
            } finally {
              setUpdatingSubscription(false);
            }
          },
        },
      ]);
      return;
    }

    Alert.alert('Cancel Subscription', 'Cancel at the end of your current period?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setUpdatingSubscription(true);
            await paymentsAPI.cancelSubscription();
            await loadBilling();
          } catch (err: any) {
            Alert.alert(
              'Cancel Failed',
              err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Unable to cancel.'
            );
          } finally {
            setUpdatingSubscription(false);
          }
        },
      },
    ]);
  }, [loadBilling, subscription]);

  const pill = statusPill(subscription?.status);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading billing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Billing</Text>
          <Text style={styles.headerSubtitle}>Plans, payments, receipts</Text>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            setRefreshing(true);
            loadBilling();
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
              loadBilling();
            }}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {error ? (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Icon name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorTitle}>Billing Unavailable</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Try Again" onPress={() => loadBilling()} variant="outline" />
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <View style={styles.iconWrap}>
                <Icon name="diamond" size={18} color={colors.primary[500]} />
              </View>
              <View style={styles.cardTopText}>
                <Text style={styles.cardKicker}>Your plan</Text>
                <Text style={styles.cardTitle}>{plan?.name || 'Free'}</Text>
              </View>
            </View>
            <View style={[styles.pill, { backgroundColor: pill.bg }]}>
              <Text style={[styles.pillText, { color: pill.fg }]}>
                {statusLabel(subscription?.status)}
              </Text>
            </View>
          </View>

          <View style={styles.planMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Storage</Text>
              <Text style={styles.metaValue}>{Number(effectiveLimits?.storage_gb ?? 1)} GB</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Uploads</Text>
              <Text style={styles.metaValue}>{Number(effectiveLimits?.max_upload_mb ?? 10)} MB max</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Downloads</Text>
              <Text style={styles.metaValue}>
                {effectiveLimits?.unlimited_downloads
                  ? 'Unlimited'
                  : `${Number(effectiveLimits?.downloads_monthly ?? 50)}/mo`}
              </Text>
            </View>
          </View>

          {subscription?.current_period_end ? (
            <Text style={styles.periodText}>
              Period ends: {formatDateTime(subscription.current_period_end)}
            </Text>
          ) : subscription?.trial_end ? (
            <Text style={styles.periodText}>
              Trial ends: {formatDateTime(subscription.trial_end)}
            </Text>
          ) : null}

          {subscription?.cancel_at_period_end ? (
            <View style={styles.noticeRow}>
              <Icon name="information-circle" size={16} color={colors.warning} />
              <Text style={styles.noticeText}>Cancels at period end</Text>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <Button
              title="View Plans"
              onPress={() => router.push('/(student)/billing/plans' as any)}
              style={{ flex: 1 }}
            />
            <View style={{ width: spacing[3] }} />
            <Button
              title={openingPortal ? 'Opening...' : 'Manage'}
              onPress={handleOpenPortal}
              variant="secondary"
              disabled={openingPortal}
              loading={openingPortal}
              style={{ flex: 1 }}
            />
          </View>

          <View style={styles.actionsRow}>
            <Button
              title="Payment History"
              onPress={() => router.push('/(student)/billing/history' as any)}
              variant="outline"
              style={{ flex: 1 }}
            />
            <View style={{ width: spacing[3] }} />
            <Button
              title={subscription?.cancel_at_period_end ? 'Reactivate' : 'Cancel'}
              onPress={handleCancelOrReactivate}
              variant={subscription?.cancel_at_period_end ? 'secondary' : 'danger'}
              disabled={updatingSubscription}
              loading={updatingSubscription}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payments</Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(student)/billing/pay' as any)}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: colors.accent[50] }]}>
                <Icon name="cart" size={18} color={colors.accent[500]} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Make a payment</Text>
                <Text style={styles.rowSubtitle}>Card, PayPal, mobile money</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(student)/billing/iap' as any)}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primary[50] }]}>
                <Icon name="diamond" size={18} color={colors.primary[500]} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>In-app purchases</Text>
                <Text style={styles.rowSubtitle}>Restore, features, mobile subs</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(student)/billing/history' as any)}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: colors.gray[100] }]}>
                <Icon name="receipt" size={18} color={colors.text.secondary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>History & receipts</Text>
                <Text style={styles.rowSubtitle}>View past payments</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(student)/billing/storage' as any)}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primary[50] }]}>
                <Icon name="server" size={18} color={colors.primary[500]} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Storage add-ons</Text>
                <Text style={styles.rowSubtitle}>
                  {activeUpgradeCount ? `${activeUpgradeCount} active upgrade${activeUpgradeCount > 1 ? 's' : ''}` : 'Buy extra storage'}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(student)/billing/promo' as any)}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: colors.accent[50] }]}>
                <Icon name="pricetag" size={18} color={colors.accent[500]} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Promo code</Text>
                <Text style={styles.rowSubtitle}>Check discounts</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(student)/billing/tiers' as any)}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: colors.info + '12' }]}>
                <Icon name="layers" size={18} color={colors.info} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Tiers & trial</Text>
                <Text style={styles.rowSubtitle}>See what you get, start a trial</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Included features</Text>
          <View style={styles.featureRow}>
            <Icon
              name={effectiveLimits?.has_ads ? 'close-circle' : 'checkmark-circle'}
              size={18}
              color={effectiveLimits?.has_ads ? colors.text.tertiary : colors.success}
            />
            <Text style={styles.featureText}>{effectiveLimits?.has_ads ? 'Ads included' : 'No ads'}</Text>
          </View>
          <View style={styles.featureRow}>
            <Icon
              name={effectiveLimits?.priority_support ? 'checkmark-circle' : 'ellipse'}
              size={18}
              color={effectiveLimits?.priority_support ? colors.success : colors.text.tertiary}
            />
            <Text style={styles.featureText}>Priority support</Text>
          </View>
          <View style={styles.featureRow}>
            <Icon
              name={effectiveLimits?.analytics ? 'checkmark-circle' : 'ellipse'}
              size={18}
              color={effectiveLimits?.analytics ? colors.success : colors.text.tertiary}
            />
            <Text style={styles.featureText}>Analytics</Text>
          </View>
          <View style={styles.featureRow}>
            <Icon
              name={effectiveLimits?.early_access ? 'checkmark-circle' : 'ellipse'}
              size={18}
              color={effectiveLimits?.early_access ? colors.success : colors.text.tertiary}
            />
            <Text style={styles.featureText}>Early access</Text>
          </View>
        </View>

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
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: { flex: 1, paddingHorizontal: spacing[2] },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text.primary },
  headerSubtitle: { marginTop: 2, fontSize: 12, color: colors.text.tertiary },

  scrollContent: { padding: spacing[4], paddingBottom: spacing[10] },

  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },

  errorCard: {
    backgroundColor: colors.error + '0D',
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.error + '33',
  },
  errorHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  errorTitle: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  errorText: { marginTop: spacing[2], marginBottom: spacing[3], fontSize: 13, color: colors.text.secondary },

  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTopText: {},
  cardKicker: { fontSize: 12, color: colors.text.tertiary, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text.primary, marginTop: 1 },

  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '800' },

  planMeta: { marginTop: spacing[4], gap: spacing[2] },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 13, color: colors.text.secondary },
  metaValue: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  periodText: { marginTop: spacing[3], fontSize: 12, color: colors.text.tertiary },
  noticeRow: { marginTop: spacing[3], flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  noticeText: { fontSize: 12, color: colors.text.secondary, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', marginTop: spacing[4] },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text.primary, marginBottom: spacing[2] },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[3] },
  rowDivider: { height: 1, backgroundColor: colors.border.light },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {},
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  rowSubtitle: { marginTop: 2, fontSize: 12, color: colors.text.tertiary },

  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[2] },
  featureText: { fontSize: 13, color: colors.text.secondary, fontWeight: '600' },

  bottomSpacing: { height: spacing[4] },
});

export default BillingHome;
