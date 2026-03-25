// Referral Rewards History
// Displays reward items awarded from referrals (points, premium days, badges).

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
import { referralsAPI } from '../../../services/api';

type Reward = {
  id: string;
  reward_type?: string;
  reward_value?: number | string;
  description?: string;
  created_at?: string;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const rewardMeta = (rewardType?: string | null) => {
  const normalized = String(rewardType || '').toLowerCase();
  if (normalized === 'points') return { icon: 'analytics' as const, color: colors.primary[600], label: 'Points' };
  if (normalized === 'premium_days') return { icon: 'card' as const, color: colors.warning, label: 'Premium days' };
  if (normalized === 'badge') return { icon: 'star' as const, color: colors.accent[500], label: 'Badge' };
  return { icon: 'gift' as const, color: colors.text.secondary, label: normalized || 'Reward' };
};

const ReferralsRewards: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Reward[]>([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await referralsAPI.rewards();
      const payload = res?.data?.data ?? res?.data ?? {};
      const rewards = Array.isArray(payload?.rewards) ? payload.rewards : [];
      setItems(
        rewards.map((reward: any) => ({
          id: String(reward?.id || ''),
          reward_type: String(reward?.reward_type || ''),
          reward_value: reward?.reward_value ?? 0,
          description: String(reward?.description || ''),
          created_at: reward?.created_at || '',
        }))
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load rewards.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    let points = 0;
    let premiumDays = 0;
    items.forEach((item) => {
      const type = String(item.reward_type || '').toLowerCase();
      const value = Number(item.reward_value ?? 0);
      if (type === 'points') points += value;
      if (type === 'premium_days') premiumDays += value;
    });
    return { points, premiumDays };
  }, [items]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading rewards...</Text>
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
          <Text style={styles.headerTitle}>Rewards</Text>
          <Text style={styles.headerSubtitle}>
            {totals.points.toLocaleString()} points • {totals.premiumDays} premium days
          </Text>
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
              <Icon name="gift" size={22} color={colors.text.secondary} />
            </View>
            <Text style={styles.emptyTitle}>No rewards yet</Text>
            <Text style={styles.emptyText}>Rewards appear here after your referrals subscribe.</Text>
            <Button title="Back to Referrals" onPress={() => router.replace('/(student)/referrals' as any)} />
          </View>
        ) : null}

        {items.map((item) => {
          const meta = rewardMeta(item.reward_type);
          const value = Number(item.reward_value ?? 0);
          const suffix =
            String(item.reward_type || '').toLowerCase() === 'points'
              ? 'pts'
              : String(item.reward_type || '').toLowerCase() === 'premium_days'
                ? 'days'
                : '';

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => {
                Alert.alert(
                  meta.label,
                  [item.description, item.created_at ? formatDateTime(item.created_at) : '']
                    .filter(Boolean)
                    .join('\n')
                );
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: meta.color + '14' }]}>
                <Icon name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.description || meta.label}</Text>
                <Text style={styles.cardSub}>{item.created_at ? formatDateTime(item.created_at) : ''}</Text>
              </View>
              <View style={styles.valueWrap}>
                <Text style={styles.valueText}>
                  {value.toLocaleString()}
                  {suffix ? ` ${suffix}` : ''}
                </Text>
                <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
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
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.border.light,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    ...shadows.sm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
  },
  cardSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.text.secondary,
  },
  valueWrap: {
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  valueText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text.primary,
  },
});

export default ReferralsRewards;

