// Tier & Trial Screen (Freemium Access)

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
import { colors } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import Button from '../../../components/ui/Button';
import { paymentsAPI } from '../../../services/api';

type TierFeature = {
  key: string;
  name: string;
  description: string;
  category: string;
};

type TierInfo = {
  tier: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  storage_limit_gb: number;
  download_limit_monthly: number;
  is_popular?: boolean;
  feature_details?: TierFeature[];
};

const formatPrice = (value: any, suffix: '/mo' | '/yr') => {
  const parsed = Number(value ?? 0);
  if (!parsed) return 'Free';
  const label = parsed % 1 === 0 ? parsed.toFixed(0) : parsed.toFixed(2);
  return `USD ${label}${suffix}`;
};

const formatDownloadLimit = (value: any) => {
  const parsed = Number(value ?? 0);
  if (parsed < 0) return 'Unlimited';
  if (!parsed) return '0/mo';
  return `${parsed}/mo`;
};

const TierScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [userTier, setUserTier] = useState<any | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [tiersRes, userRes] = await Promise.all([
        paymentsAPI.getTiers(),
        paymentsAPI.getUserTier(),
      ]);

      const tiersPayload = tiersRes?.data?.data ?? tiersRes?.data ?? {};
      setTiers(Array.isArray(tiersPayload?.tiers) ? tiersPayload.tiers : []);

      const userPayload = userRes?.data?.data ?? userRes?.data ?? {};
      setUserTier(userPayload || null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Unable to load tiers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentTierName = useMemo(
    () => String(userTier?.tier_name || userTier?.tier || 'Free'),
    [userTier?.tier, userTier?.tier_name]
  );
  const currentTierKey = useMemo(() => String(userTier?.tier || '').toLowerCase(), [userTier?.tier]);
  const storageLimit = Number(userTier?.limits?.storage_limit_gb ?? 1);
  const downloadLimit = userTier?.limits?.download_limit_monthly ?? 50;

  const handleStartTrial = useCallback(() => {
    Alert.alert('Start free trial', 'Start a Premium trial on this account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start trial',
        onPress: async () => {
          try {
            setStartingTrial(true);
            const response = await paymentsAPI.startTrial();
            const payload = response?.data?.data ?? response?.data ?? {};
            Alert.alert(
              'Trial started',
              payload?.trial_end
                ? `Your trial ends on ${new Date(payload.trial_end).toLocaleString()}.`
                : payload?.message || 'Your trial has started.'
            );
            await load();
          } catch (err: any) {
            Alert.alert(
              'Trial unavailable',
              err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                'Unable to start trial.'
            );
          } finally {
            setStartingTrial(false);
          }
        },
      },
    ]);
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading tiers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tiers</Text>
        <TouchableOpacity
          style={styles.headerBtn}
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
                <Icon name="shield-checkmark" size={18} color={colors.primary[600]} />
              </View>
              <View>
                <Text style={styles.kicker}>Your tier</Text>
                <Text style={styles.title}>{currentTierName}</Text>
              </View>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.gray[100] }]}>
              <Text style={[styles.pillText, { color: colors.text.secondary }]}>
                {currentTierKey ? currentTierKey.toUpperCase() : 'FREE'}
              </Text>
            </View>
          </View>

          <View style={styles.meta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Storage</Text>
              <Text style={styles.metaValue}>{storageLimit} GB</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Downloads</Text>
              <Text style={styles.metaValue}>{formatDownloadLimit(downloadLimit)}</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Button
              title="View Plans"
              onPress={() => router.push('/(student)/billing/plans' as any)}
              style={{ flex: 1 }}
            />
            <View style={{ width: spacing[3] }} />
            <Button
              title="Feature Access"
              onPress={() => router.push('/(student)/billing/feature-access' as any)}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.trialTop}>
            <View style={styles.trialLeft}>
              <View style={[styles.trialIcon, { backgroundColor: colors.accent[50] }]}>
                <Icon name="gift" size={18} color={colors.accent[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Free trial</Text>
                <Text style={styles.trialText}>
                  Try Premium for a limited time. If you already used a trial, the backend will tell you why.
                </Text>
              </View>
            </View>
          </View>
          <Button
            title={startingTrial ? 'Starting...' : 'Start Trial'}
            onPress={handleStartTrial}
            loading={startingTrial}
            disabled={startingTrial}
            fullWidth
          />
        </View>

        <Text style={styles.listTitle}>All tiers</Text>

        {tiers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="layers" size={36} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No tiers available</Text>
            <Text style={styles.emptyText}>
              {currentTierName
                ? `Your account is currently on ${currentTierName}. Tier details are unavailable right now, but your current limits still apply and you can open plans for upgrade options.`
                : 'Tier details are unavailable right now. Open plans for upgrade help or refresh after billing sync completes.'}
            </Text>
            <View style={styles.emptyActions}>
              <Button
                title="View Plans"
                onPress={() => router.push('/(student)/billing/plans' as any)}
                fullWidth
              />
            </View>
            <View style={styles.emptyActions}>
              <Button
                title="Refresh"
                onPress={() => {
                  setRefreshing(true);
                  load();
                }}
                variant="secondary"
                fullWidth
              />
            </View>
          </View>
        ) : (
          tiers.map((t) => {
            const features = Array.isArray(t?.feature_details) ? t.feature_details : [];
            const top = features.slice(0, 4);
            const remaining = Math.max(0, features.length - top.length);
            return (
              <View key={String(t.tier || t.name)} style={styles.tierCard}>
                <View style={styles.tierTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierName}>{t.name}</Text>
                    <Text style={styles.tierDesc}>{t.description}</Text>
                  </View>
                  {t.is_popular ? (
                    <View style={styles.popularPill}>
                      <Text style={styles.popularPillText}>Popular</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>{formatPrice(t.price_monthly, '/mo')}</Text>
                  <Text style={styles.priceHint}>{formatPrice(t.price_yearly, '/yr')}</Text>
                </View>

                <View style={styles.tierMetaRow}>
                  <View style={styles.metaChip}>
                    <Icon name="server" size={14} color={colors.primary[600]} />
                    <Text style={styles.metaChipText}>{Number(t.storage_limit_gb || 0)} GB</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Icon name="download" size={14} color={colors.primary[600]} />
                    <Text style={styles.metaChipText}>{formatDownloadLimit(t.download_limit_monthly)}</Text>
                  </View>
                </View>

                {top.length ? (
                  <View style={styles.featureList}>
                    {top.map((f) => (
                      <View key={f.key} style={styles.featureRow}>
                        <Icon name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={styles.featureText}>{f.name}</Text>
                      </View>
                    ))}
                    {remaining ? (
                      <Text style={styles.moreText}>+{remaining} more</Text>
                    ) : null}
                  </View>
                ) : null}
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
  headerBtn: {
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
  errorTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
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
  metaValue: { fontSize: 13, fontWeight: '800', color: colors.text.primary },

  actionsRow: { flexDirection: 'row', marginTop: spacing[4] },

  trialTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  trialLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], flex: 1 },
  trialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  trialText: { marginTop: 6, fontSize: 13, color: colors.text.secondary, lineHeight: 18 },

  listTitle: { marginTop: spacing[1], marginBottom: spacing[3], fontSize: 14, fontWeight: '900', color: colors.text.primary },

  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: { marginTop: spacing[3], fontSize: 15, fontWeight: '900', color: colors.text.primary },
  emptyText: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },
  emptyActions: { marginTop: spacing[3], alignSelf: 'stretch' },

  tierCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  tierTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tierName: { fontSize: 15, fontWeight: '900', color: colors.text.primary },
  tierDesc: { marginTop: 4, fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  popularPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.accent[50] },
  popularPillText: { fontSize: 12, fontWeight: '900', color: colors.accent[500] },

  priceRow: { marginTop: spacing[3], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  priceText: { fontSize: 15, fontWeight: '900', color: colors.primary[700] },
  priceHint: { fontSize: 12, color: colors.text.tertiary, fontWeight: '800' },

  tierMetaRow: { marginTop: spacing[3], flexDirection: 'row', gap: spacing[2] },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary[50],
  },
  metaChipText: { fontSize: 12, color: colors.primary[700], fontWeight: '900' },

  featureList: { marginTop: spacing[3], gap: spacing[2] },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  featureText: { fontSize: 13, color: colors.text.secondary, fontWeight: '700' },
  moreText: { marginTop: spacing[2], fontSize: 12, color: colors.text.tertiary, fontWeight: '800' },

  bottomSpacing: { height: spacing[4] },
});

export default TierScreen;
