// Referrals Hub
// Invite friends, track referral status, and view rewards.

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
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import Button from '../../../components/ui/Button';
import { referralsAPI } from '../../../services/api';

type ReferralStats = {
  total_referrals?: number;
  registered_count?: number;
  subscribed_count?: number;
  pending_count?: number;
  current_tier?: {
    name?: string | null;
    min_referrals?: number | null;
    points?: number;
    premium_days?: number;
    badge?: string | null;
  } | null;
  next_tier?: {
    name?: string | null;
    min_referrals?: number | null;
    points?: number;
    premium_days?: number;
    badge?: string | null;
  } | null;
  referrals_to_next_tier?: number;
};

const formatNumber = (value?: number | null) => Number(value ?? 0).toLocaleString();

const pillForStatus = (value?: string | null) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'subscribed') return { bg: colors.success + '1A', fg: colors.success, label: 'Subscribed' };
  if (normalized === 'registered') return { bg: colors.info + '1A', fg: colors.info, label: 'Registered' };
  if (normalized === 'pending') return { bg: colors.warning + '1A', fg: colors.warning, label: 'Pending' };
  if (!normalized) return { bg: colors.gray[100], fg: colors.text.secondary, label: '—' };
  return { bg: colors.gray[100], fg: colors.text.secondary, label: normalized.replace(/_/g, ' ') };
};

const ReferralsHome: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [codeRes, statsRes] = await Promise.all([
        referralsAPI.getCode(),
        referralsAPI.getStats(),
      ]);

      const codePayload = codeRes?.data?.data ?? codeRes?.data ?? {};
      setReferralCode(String(codePayload?.code || '').trim());

      const statsPayload = statsRes?.data?.data ?? statsRes?.data ?? {};
      setStats(statsPayload || null);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load referrals.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = useCallback(async () => {
    const code = referralCode.trim();
    if (!code) {
      Alert.alert('Referral code', 'No referral code available yet.');
      return;
    }
    try {
      await Clipboard.setStringAsync(code);
      Alert.alert('Copied', 'Your referral code is ready to paste.');
    } catch (err: any) {
      Alert.alert('Copy failed', err?.message || 'Unable to copy referral code.');
    }
  }, [referralCode]);

  const handleShare = useCallback(async () => {
    const code = referralCode.trim();
    if (!code) {
      Alert.alert('Referral code', 'No referral code available yet.');
      return;
    }
    try {
      await Share.share({
        message: `Join CampusHub with my referral code: ${code}`,
      });
    } catch (err: any) {
      Alert.alert('Share failed', err?.message || 'Unable to share referral code.');
    }
  }, [referralCode]);

  const subscribedCount = Number(stats?.subscribed_count ?? 0);
  const nextTierName = String(stats?.next_tier?.name || '').trim();
  const referralsToNext = Number(stats?.referrals_to_next_tier ?? 0);
  const progress = useMemo(() => {
    const nextMin = Number(stats?.next_tier?.min_referrals ?? 0);
    if (!nextMin || nextMin <= 0) return 1;
    return Math.min(1, Math.max(0, subscribedCount / nextMin));
  }, [stats?.next_tier?.min_referrals, subscribedCount]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading referrals...</Text>
      </View>
    );
  }

  const currentTier = stats?.current_tier || null;
  const statusPill = pillForStatus(nextTierName ? 'pending' : null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Referrals</Text>
          <Text style={styles.headerSubtitle}>Invite friends, earn rewards</Text>
        </View>
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
            <View style={styles.errorHeader}>
              <Icon name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorTitle}>Unavailable</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Try Again" onPress={() => load()} variant="outline" />
          </View>
        ) : null}

        <View style={styles.hero}>
          <View style={styles.heroAccentA} />
          <View style={styles.heroAccentB} />
          <Text style={styles.heroKicker}>Your invite code</Text>
          <Text style={styles.heroCode}>{referralCode || '— — — —'}</Text>
          <Text style={styles.heroSub}>
            Share this code with friends. When they subscribe, you unlock tier rewards.
          </Text>

          <View style={styles.heroActions}>
            <Button title="Copy" onPress={handleCopy} variant="secondary" style={{ flex: 1 }} />
            <View style={{ width: spacing[3] }} />
            <Button title="Share" onPress={handleShare} variant="outline" style={{ flex: 1 }} />
          </View>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.primary[50], borderColor: colors.primary[100] }]}
            onPress={() => router.push('/(student)/referrals/use' as any)}
          >
            <View style={[styles.tileIcon, { backgroundColor: colors.primary[500] + '14' }]}>
              <Icon name="qr-code" size={18} color={colors.primary[600]} />
            </View>
            <Text style={styles.tileTitle}>Use a code</Text>
            <Text style={styles.tileSub}>Got invited?</Text>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.accent[50], borderColor: colors.accent[100] }]}
            onPress={() => router.push('/(student)/referrals/list' as any)}
          >
            <View style={[styles.tileIcon, { backgroundColor: colors.accent[500] + '14' }]}>
              <Icon name="people" size={18} color={colors.accent[500]} />
            </View>
            <Text style={styles.tileTitle}>My referrals</Text>
            <Text style={styles.tileSub}>{formatNumber(stats?.total_referrals)} total</Text>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '2A' }]}
            onPress={() => router.push('/(student)/referrals/rewards' as any)}
          >
            <View style={[styles.tileIcon, { backgroundColor: colors.warning + '14' }]}>
              <Icon name="gift" size={18} color={colors.warning} />
            </View>
            <Text style={styles.tileTitle}>Rewards</Text>
            <Text style={styles.tileSub}>History & claims</Text>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your tier</Text>
            <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
              <Text style={[styles.statusPillText, { color: statusPill.fg }]}>
                {currentTier?.name ? String(currentTier.name) : 'Starter'}
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{formatNumber(stats?.subscribed_count)}</Text>
              <Text style={styles.statLabel}>Subscribed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{formatNumber(stats?.registered_count)}</Text>
              <Text style={styles.statLabel}>Registered</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{formatNumber(stats?.pending_count)}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressTop}>
              <Text style={styles.progressTitle}>
                {nextTierName ? `Next: ${nextTierName}` : 'Top tier reached'}
              </Text>
              {nextTierName ? (
                <Text style={styles.progressMeta}>
                  {referralsToNext > 0 ? `${referralsToNext} more` : 'Ready'}
                </Text>
              ) : null}
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            {nextTierName ? (
              <Text style={styles.progressHint}>
                Invite friends and help them subscribe to unlock tier rewards.
              </Text>
            ) : (
              <Text style={styles.progressHint}>You’ve unlocked all available tiers.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  loadingText: {
    marginTop: spacing[3],
    fontSize: 14,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[6],
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[4],
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.text.secondary,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
  },
  errorCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.error + '22',
    marginBottom: spacing[5],
    ...shadows.md,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  errorText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  hero: {
    position: 'relative',
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    overflow: 'hidden',
    marginBottom: spacing[5],
    ...shadows.lg,
  },
  heroAccentA: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary[500] + '22',
  },
  heroAccentB: {
    position: 'absolute',
    bottom: -50,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.accent[500] + '22',
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.72)',
  },
  heroCode: {
    marginTop: spacing[2],
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  heroSub: {
    marginTop: spacing[3],
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.78)',
  },
  heroActions: {
    marginTop: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    marginBottom: spacing[5],
  },
  tile: {
    width: '48%',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    ...shadows.sm,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  tileSub: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
  },
  statusPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  statBox: {
    flex: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text.primary,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    color: colors.text.secondary,
  },
  progressWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing[4],
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  progressMeta: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gray[100],
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
  },
  progressHint: {
    marginTop: spacing[3],
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
});

export default ReferralsHome;

