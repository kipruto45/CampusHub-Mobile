// Referrals List
// Shows all users you have referred and their status.

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
import { referralsAPI } from '../../../services/api';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { borderRadius,spacing } from '../../../theme/spacing';

type Referral = {
  id: string;
  email?: string;
  referee_email?: string | null;
  referee_name?: string | null;
  status?: string;
  rewards_claimed?: boolean;
  subscribed_at?: string | null;
  created_at?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

const statusPill = (status?: string | null) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'subscribed') return { bg: colors.success + '1A', fg: colors.success, label: 'Subscribed' };
  if (normalized === 'registered') return { bg: colors.info + '1A', fg: colors.info, label: 'Registered' };
  if (normalized === 'pending') return { bg: colors.warning + '1A', fg: colors.warning, label: 'Pending' };
  if (!normalized) return { bg: colors.gray[100], fg: colors.text.secondary, label: '—' };
  return { bg: colors.gray[100], fg: colors.text.secondary, label: normalized.replace(/_/g, ' ') };
};

const ReferralsList: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Referral[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await referralsAPI.list();
      const payload = res?.data?.data ?? res?.data ?? {};
      const referrals = Array.isArray(payload?.referrals) ? payload.referrals : [];
      setItems(
        referrals.map((ref: any) => ({
          id: String(ref?.id || ''),
          email: String(ref?.email || ''),
          referee_email: ref?.referee_email ?? null,
          referee_name: ref?.referee_name ?? null,
          status: String(ref?.status || ''),
          rewards_claimed: Boolean(ref?.rewards_claimed),
          subscribed_at: ref?.subscribed_at ?? null,
          created_at: ref?.created_at ?? null,
        }))
      );
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

  const eligibleToClaim = useMemo(() => {
    const eligible = new Set<string>();
    items.forEach((item) => {
      const status = String(item.status || '').toLowerCase();
      if (status === 'subscribed' && !item.rewards_claimed && item.id) {
        eligible.add(item.id);
      }
    });
    return eligible;
  }, [items]);

  const handleClaim = useCallback(
    (referralId: string) => {
      Alert.alert('Claim rewards', 'Claim rewards for this referral?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim',
          onPress: async () => {
            try {
              setClaimingId(referralId);
              const res = await referralsAPI.claim(referralId);
              const payload = res?.data?.data ?? res?.data ?? {};
              const message = String(payload?.message || 'Rewards claimed.');
              Alert.alert('Rewards', message);
              await load();
            } catch (err: any) {
              Alert.alert(
                'Claim failed',
                err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Unable to claim rewards.'
              );
            } finally {
              setClaimingId(null);
            }
          },
        },
      ]);
    },
    [load]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading referrals...</Text>
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
          <Text style={styles.headerTitle}>My Referrals</Text>
          <Text style={styles.headerSubtitle}>{items.length} total</Text>
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

        {!error && items.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon name="gift" size={22} color={colors.primary[600]} />
            </View>
            <Text style={styles.emptyTitle}>No referrals yet</Text>
            <Text style={styles.emptyText}>Share your code from the referrals home screen.</Text>
            <Button title="Back to Referrals" onPress={() => router.replace('/(student)/referrals' as any)} />
          </View>
        ) : null}

        {items.map((item) => {
          const pill = statusPill(item.status);
          const name = String(item.referee_name || '').trim();
          const email = String(item.referee_email || item.email || '').trim();
          const title = name || email || 'Referral';
          const subtitleParts = [
            name && email ? email : '',
            item.created_at ? `Invited ${formatDate(item.created_at)}` : '',
          ].filter(Boolean);
          const subtitle = subtitleParts.join(' • ');
          const canClaim = eligibleToClaim.has(item.id);
          const isClaiming = claimingId === item.id;

          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
                </View>
                <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                  <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.metaText}>
                  Rewards: {item.rewards_claimed ? 'Claimed' : 'Not claimed'}
                  {item.subscribed_at ? ` • Subscribed ${formatDate(item.subscribed_at)}` : ''}
                </Text>

                {canClaim ? (
                  <Button
                    title={isClaiming ? 'Claiming...' : 'Claim rewards'}
                    onPress={() => handleClaim(item.id)}
                    loading={isClaiming}
                    disabled={isClaiming}
                    variant="secondary"
                    style={{ marginTop: spacing[3] }}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
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
    fontWeight: '800',
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
    fontWeight: '800',
    color: colors.text.primary,
  },
  errorText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  emptyCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    marginBottom: spacing[5],
    ...shadows.md,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
  },
  emptyText: {
    marginTop: spacing[2],
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.primary,
  },
  cardSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.text.secondary,
  },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardBottom: {
    marginTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing[4],
  },
  metaText: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
});

export default ReferralsList;

