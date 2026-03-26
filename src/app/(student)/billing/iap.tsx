// In-App Purchases Screen

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import { iapAPI } from '../../../services/api';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { borderRadius,spacing } from '../../../theme/spacing';

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const pillFor = (status?: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return { bg: colors.success + '1A', fg: colors.success, label: 'Active' };
  if (normalized === 'pending') return { bg: colors.warning + '1A', fg: colors.warning, label: 'Pending' };
  if (normalized === 'expired') return { bg: colors.gray[100], fg: colors.text.secondary, label: 'Expired' };
  if (normalized === 'canceled') return { bg: colors.gray[100], fg: colors.text.secondary, label: 'Canceled' };
  return { bg: colors.gray[100], fg: colors.text.secondary, label: normalized ? normalized : 'None' };
};

const InAppPurchasesScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionPayload, setSubscriptionPayload] = useState<any>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [subRes, featRes] = await Promise.all([
        iapAPI.getSubscription(),
        iapAPI.getFeatures(),
      ]);

      const subData = subRes?.data?.data ?? subRes?.data ?? {};
      setSubscriptionPayload(subData);

      const featData = featRes?.data?.data ?? featRes?.data ?? {};
      setFeatures(Array.isArray(featData?.features) ? featData.features : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load in-app purchases.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasSubscription = Boolean(subscriptionPayload?.has_subscription);
  const subscription = subscriptionPayload?.subscription || null;

  const pill = useMemo(() => pillFor(subscription?.status), [subscription?.status]);

  const handleRestore = useCallback(async () => {
    try {
      setRestoring(true);
      const response = await iapAPI.restore();
      const payload = response?.data?.data ?? response?.data ?? {};
      const count = Array.isArray(payload?.purchases) ? payload.purchases.length : 0;
      Alert.alert('Restore complete', count ? `Restored ${count} purchase(s).` : 'No active purchases to restore.');
      await load();
    } catch (err: any) {
      Alert.alert(
        'Restore failed',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to restore purchases.'
      );
    } finally {
      setRestoring(false);
    }
  }, [load]);

  const handleCancel = useCallback(async () => {
    if (!hasSubscription) return;
    Alert.alert('Cancel subscription', 'Disable auto-renew for your in-app subscription?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Disable Auto-Renew',
        style: 'destructive',
        onPress: async () => {
          try {
            setCanceling(true);
            const response = await iapAPI.cancelSubscription({
              platform: subscription?.platform,
            });
            const payload = response?.data?.data ?? response?.data ?? {};
            Alert.alert('Updated', payload?.message || 'Subscription will be canceled at period end.');
            await load();
          } catch (err: any) {
            Alert.alert(
              'Cancel failed',
              err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                'Unable to cancel subscription.'
            );
          } finally {
            setCanceling(false);
          }
        },
      },
    ]);
  }, [hasSubscription, load, subscription?.platform]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading in-app purchases...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>In-App Purchases</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            setRefreshing(true);
            load();
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
              load();
            }}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {error ? (
          <View style={styles.errorCard}>
            <View style={styles.errorTop}>
              <Icon name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorTitle}>Unavailable</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Try Again" onPress={() => load()} variant="outline" />
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <View style={styles.iconWrap}>
                <Icon name="diamond" size={18} color={colors.primary[500]} />
              </View>
              <View>
                <Text style={styles.kicker}>Subscription</Text>
                <Text style={styles.title}>{hasSubscription ? subscription?.product_name : 'None'}</Text>
              </View>
            </View>
            <View style={[styles.pill, { backgroundColor: pill.bg }]}>
              <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
            </View>
          </View>

          {hasSubscription ? (
            <View style={styles.meta}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Tier</Text>
                <Text style={styles.metaValue}>{String(subscription?.tier || '').toUpperCase() || '-'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Platform</Text>
                <Text style={styles.metaValue}>{String(subscription?.platform || '').toUpperCase() || '-'}</Text>
              </View>
              {subscription?.period_end ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Renews / Expires</Text>
                  <Text style={styles.metaValue}>{formatDateTime(subscription.period_end)}</Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Auto-renew</Text>
                <Text style={styles.metaValue}>
                  {subscription?.auto_renew_enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.subText}>
              Buy a subscription using the products list, or manage web billing from the main Billing screen.
            </Text>
          )}

          <View style={styles.actionsRow}>
            <Button
              title="Browse Products"
              onPress={() => router.push('/(student)/billing/iap-products' as any)}
              style={{ flex: 1 }}
            />
            <View style={{ width: spacing[3] }} />
            <Button
              title={restoring ? 'Restoring...' : 'Restore'}
              onPress={handleRestore}
              variant="secondary"
              loading={restoring}
              disabled={restoring}
              style={{ flex: 1 }}
            />
          </View>

          <View style={styles.actionsRow}>
            <Button
              title={canceling ? 'Updating...' : 'Disable Auto-Renew'}
              onPress={handleCancel}
              variant="danger"
              loading={canceling}
              disabled={!hasSubscription || canceling}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Unlocked features</Text>
          {features.length === 0 ? (
            <View style={styles.emptyInline}>
              <Icon name="extension-puzzle" size={28} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No feature unlocks</Text>
              <Text style={styles.emptyText}>Feature unlocks will show here after a purchase.</Text>
            </View>
          ) : (
            features.map((f) => (
              <View key={String(f?.id || f?.feature_key || Math.random())} style={styles.featureRow}>
                <View style={styles.featureLeft}>
                  <View style={styles.featureIcon}>
                    <Icon name="extension-puzzle" size={16} color={colors.primary[500]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureName}>{f.feature_name || f.feature_key}</Text>
                    <Text style={styles.featureKey}>{f.feature_key}</Text>
                  </View>
                </View>
                <View style={styles.featureRight}>
                  <Text style={styles.featureExpiry}>
                    {f.expires_at ? `Expires ${formatDateTime(f.expires_at)}` : 'No expiry'}
                  </Text>
                </View>
              </View>
            ))
          )}
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.text.primary },

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
  errorTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  errorTitle: { fontSize: 14, fontWeight: '800', color: colors.text.primary },
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
  kicker: { fontSize: 12, fontWeight: '700', color: colors.text.tertiary },
  title: { marginTop: 1, fontSize: 16, fontWeight: '900', color: colors.text.primary },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '800' },

  meta: { marginTop: spacing[4], gap: spacing[2] },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 13, color: colors.text.secondary },
  metaValue: { fontSize: 13, fontWeight: '800', color: colors.text.primary, marginLeft: spacing[3], flexShrink: 1, textAlign: 'right' },
  subText: { marginTop: spacing[4], fontSize: 13, color: colors.text.secondary, lineHeight: 18 },

  actionsRow: { flexDirection: 'row', marginTop: spacing[4] },

  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary, marginBottom: spacing[2] },
  emptyInline: { paddingVertical: spacing[6], alignItems: 'center' },
  emptyTitle: { marginTop: spacing[2], fontSize: 14, fontWeight: '900', color: colors.text.primary },
  emptyText: { marginTop: spacing[1], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },

  featureRow: { paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: colors.border.light },
  featureLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureName: { fontSize: 13, fontWeight: '900', color: colors.text.primary },
  featureKey: { marginTop: 2, fontSize: 12, color: colors.text.tertiary },
  featureRight: { marginTop: spacing[2] },
  featureExpiry: { fontSize: 12, color: colors.text.tertiary, fontWeight: '700' },

  bottomSpacing: { height: spacing[4] },
});

export default InAppPurchasesScreen;

