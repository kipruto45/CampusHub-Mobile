// Badges Screen

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
import { gamificationAPI } from '../../../services/api';

type TabKey = 'earned' | 'next' | 'all';

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

const percentLabel = (value: any) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return '0%';
  return `${Math.max(0, Math.min(100, Math.round(parsed)))}%`;
};

const BadgesScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('earned');

  const [earned, setEarned] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [earnedRes, progressRes, allRes] = await Promise.all([
        gamificationAPI.getUserBadges(),
        gamificationAPI.getBadgeProgress(),
        gamificationAPI.getAllBadges().catch(() => null),
      ]);

      const earnedPayload = earnedRes?.data?.data ?? earnedRes?.data ?? {};
      setEarned(Array.isArray(earnedPayload?.badges) ? earnedPayload.badges : Array.isArray(earnedPayload) ? earnedPayload : []);

      const progressPayload = progressRes?.data?.data ?? progressRes?.data ?? {};
      setProgress(Array.isArray(progressPayload?.progress) ? progressPayload.progress : Array.isArray(progressPayload) ? progressPayload : []);

      const allPayload = allRes?.data?.data ?? allRes?.data ?? {};
      const list = Array.isArray(allPayload?.badges) ? allPayload.badges : Array.isArray(allPayload) ? allPayload : [];
      setAllBadges(list);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load badges.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const earnedBadgeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of earned) {
      const badgeId = String(entry?.badge?.id || entry?.id || '').trim();
      if (badgeId) ids.add(badgeId);
    }
    return ids;
  }, [earned]);

  const handleCheck = useCallback(async () => {
    try {
      setChecking(true);
      const res = await gamificationAPI.checkBadges();
      const payload = res?.data?.data ?? res?.data ?? {};
      const count = Number(payload?.count ?? 0);
      if (count > 0) {
        Alert.alert('New badges unlocked', `You earned ${count} badge(s).`);
      } else {
        Alert.alert('All caught up', 'No new badges right now.');
      }
      await load();
    } catch (err: any) {
      Alert.alert(
        'Badge check failed',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to check badges.'
      );
    } finally {
      setChecking(false);
    }
  }, [load]);

  const tabOptions = useMemo(
    () => [
      { key: 'earned', label: `Earned (${earned.length})` },
      { key: 'next', label: `Next (${progress.length})` },
      { key: 'all', label: `All (${allBadges.length || '—'})` },
    ],
    [allBadges.length, earned.length, progress.length]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading badges...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Badges</Text>
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

        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIcon}>
              <Icon name="star" size={18} color={colors.accent[500]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{earned.length} badge{earned.length === 1 ? '' : 's'} earned</Text>
              <Text style={styles.heroSub}>Unlock more by earning points and keeping your streak.</Text>
            </View>
          </View>
          <Button
            title={checking ? 'Checking...' : 'Check'}
            onPress={handleCheck}
            loading={checking}
            disabled={checking}
            variant="secondary"
            style={{ marginTop: spacing[4] }}
            fullWidth
          />
        </View>

        <View style={styles.tabs}>
          {tabOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.tabChip, tab === opt.key ? styles.tabChipActive : null]}
              onPress={() => setTab(opt.key as TabKey)}
            >
              <Text style={[styles.tabText, tab === opt.key ? styles.tabTextActive : null]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'earned' ? (
          earned.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="star-outline" size={34} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No badges yet</Text>
              <Text style={styles.emptyText}>Earn points to unlock your first badge.</Text>
              <Button title="View points" onPress={() => router.push('/(student)/gamification/points' as any)} variant="outline" />
            </View>
          ) : (
            earned.map((entry) => {
              const badge = entry?.badge || entry;
              const category = badge?.category?.name || badge?.category || '';
              const earnedAt = entry?.earned_at || '';
              return (
                <View key={String(entry?.id || badge?.id || Math.random())} style={styles.card}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowLeft}>
                      <View style={styles.badgeIcon}>
                        <Icon name={(badge?.icon || 'star') as any} size={18} color={colors.primary[600]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.badgeName}>{badge?.name || 'Badge'}</Text>
                        <Text style={styles.badgeMeta}>
                          {category ? `${String(category).toUpperCase()} • ` : ''}
                          Earned {formatDate(earnedAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.earnedPill}>
                      <Text style={styles.earnedPillText}>EARNED</Text>
                    </View>
                  </View>
                  {badge?.description ? <Text style={styles.badgeDesc}>{badge.description}</Text> : null}
                </View>
              );
            })
          )
        ) : null}

        {tab === 'next' ? (
          progress.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="checkmark-circle" size={34} color={colors.success} />
              <Text style={styles.emptyTitle}>You are up to date</Text>
              <Text style={styles.emptyText}>No badge progress available right now.</Text>
            </View>
          ) : (
            progress.map((item) => {
              const badge = item?.badge || {};
              const pct = Number(item?.progress_percent ?? 0);
              return (
                <View key={String(badge?.id || Math.random())} style={styles.card}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowLeft}>
                      <View style={styles.badgeIcon}>
                        <Icon name={(badge?.icon || 'star') as any} size={18} color={colors.primary[600]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.badgeName}>{badge?.name || 'Badge'}</Text>
                        <Text style={styles.badgeMeta}>
                          {badge?.category ? `${String(badge.category).toUpperCase()} • ` : ''}
                          {percentLabel(pct)} complete
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.progressPct}>{percentLabel(pct)}</Text>
                  </View>
                  {badge?.description ? <Text style={styles.badgeDesc}>{badge.description}</Text> : null}
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFg, { width: `${Math.max(0, Math.min(100, Math.round(pct)))}%` }]} />
                  </View>
                </View>
              );
            })
          )
        ) : null}

        {tab === 'all' ? (
          allBadges.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="information-circle" size={34} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>All badges not available</Text>
              <Text style={styles.emptyText}>We could not load the full list right now.</Text>
            </View>
          ) : (
            allBadges.map((badge) => {
              const badgeId = String(badge?.id || '').trim();
              const isEarned = badgeId ? earnedBadgeIds.has(badgeId) : false;
              const category = badge?.category?.name || badge?.category || '';
              return (
                <View key={badgeId || String(Math.random())} style={styles.card}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowLeft}>
                      <View style={styles.badgeIcon}>
                        <Icon name={(badge?.icon || 'star') as any} size={18} color={colors.primary[600]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.badgeName}>{badge?.name || 'Badge'}</Text>
                        <Text style={styles.badgeMeta}>
                          {category ? `${String(category).toUpperCase()} • ` : ''}
                          {badge?.points_required ? `${badge.points_required} pts` : badge?.action_count_required ? `${badge.action_count_required} actions` : 'Unlockable'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: isEarned ? colors.success + '1A' : colors.gray[100] }]}>
                      <Text style={[styles.statusPillText, { color: isEarned ? colors.success : colors.text.tertiary }]}>
                        {isEarned ? 'EARNED' : 'LOCKED'}
                      </Text>
                    </View>
                  </View>
                  {badge?.description ? <Text style={styles.badgeDesc}>{badge.description}</Text> : null}
                </View>
              );
            })
          )
        ) : null}

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
  headerBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.text.primary },

  scrollContent: { padding: spacing[4], paddingBottom: spacing[10] },

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

  hero: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  heroIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent[50], justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 15, fontWeight: '900', color: colors.text.primary },
  heroSub: { marginTop: 4, fontSize: 13, color: colors.text.secondary, lineHeight: 18 },

  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] },
  tabChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.gray[100] },
  tabChipActive: { backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
  tabText: { fontSize: 13, fontWeight: '800', color: colors.text.secondary },
  tabTextActive: { color: colors.primary[700] },

  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: { marginTop: spacing[3], fontSize: 15, fontWeight: '900', color: colors.text.primary },
  emptyText: { marginTop: spacing[2], marginBottom: spacing[4], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },

  card: { backgroundColor: colors.card.light, borderRadius: borderRadius['2xl'], padding: spacing[4], marginBottom: spacing[4], ...shadows.sm },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[3] },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  badgeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  badgeName: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  badgeMeta: { marginTop: 2, fontSize: 12, color: colors.text.tertiary, fontWeight: '700' },
  badgeDesc: { marginTop: spacing[3], fontSize: 13, color: colors.text.secondary, lineHeight: 18 },

  earnedPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.success + '1A' },
  earnedPillText: { fontSize: 12, fontWeight: '900', color: colors.success },

  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '900' },

  progressPct: { fontSize: 13, fontWeight: '900', color: colors.primary[700] },
  progressBarBg: { height: 10, borderRadius: 999, backgroundColor: colors.gray[100], overflow: 'hidden', marginTop: spacing[3] },
  progressBarFg: { height: 10, borderRadius: 999, backgroundColor: colors.primary[500] },

  bottomSpacing: { height: spacing[4] },
});

export default BadgesScreen;

