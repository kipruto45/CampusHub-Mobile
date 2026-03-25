// Challenges / Achievements Screen

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

type FilterKey = 'all' | 'in_progress' | 'completed' | 'unclaimed';

const clampPct = (value: any) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
};

const getCategoryAccent = (category: string) => {
  switch (String(category || '').toLowerCase()) {
    case 'learning':
      return colors.primary[600];
    case 'social':
      return colors.accent[500];
    case 'engagement':
      return colors.info;
    case 'special':
      return colors.warning;
    default:
      return colors.primary[600];
  }
};

const getCategoryIcon = (category: string): React.ComponentProps<typeof Icon>['name'] => {
  switch (String(category || '').toLowerCase()) {
    case 'learning':
      return 'school';
    case 'social':
      return 'people';
    case 'engagement':
      return 'chatbubbles';
    case 'special':
      return 'diamond';
    default:
      return 'diamond';
  }
};

const prettyTier = (tier?: string) => {
  const cleaned = String(tier || '').trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).replace(/_/g, ' ');
};

const ChallengesScreen: React.FC = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [categoriesRes, statsRes] = await Promise.all([
        gamificationAPI.getAchievementsByCategory(),
        gamificationAPI.getAchievementStats().catch(() => null),
      ]);

      const categoriesPayload = categoriesRes?.data?.data ?? categoriesRes?.data ?? {};
      const list = Array.isArray(categoriesPayload?.categories)
        ? categoriesPayload.categories
        : Array.isArray(categoriesPayload)
          ? categoriesPayload
          : [];
      setCategories(list);

      const statsPayload = statsRes?.data?.data ?? statsRes?.data ?? null;
      setStats(statsPayload || null);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load challenges.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const all = { total: 0, in_progress: 0, completed: 0, unclaimed: 0 };
    for (const c of categories || []) {
      const achievements = Array.isArray(c?.achievements) ? c.achievements : [];
      for (const a of achievements) {
        all.total += 1;
        const progress = a?.user_progress || {};
        const isCompleted = Boolean(progress?.is_completed);
        const isClaimed = Boolean(progress?.is_reward_claimed);
        const current = Number(progress?.current_progress ?? 0);
        const pct = clampPct(progress?.progress_percent ?? 0);
        const isInProgress = !isCompleted && (current > 0 || pct > 0);
        if (isCompleted) all.completed += 1;
        if (isInProgress) all.in_progress += 1;
        if (isCompleted && !isClaimed) all.unclaimed += 1;
      }
    }
    return all;
  }, [categories]);

  const filterOptions = useMemo(
    () => [
      { key: 'all', label: `All (${counts.total})` },
      { key: 'in_progress', label: `In progress (${counts.in_progress})` },
      { key: 'completed', label: `Completed (${counts.completed})` },
      { key: 'unclaimed', label: `Unclaimed (${counts.unclaimed})` },
    ],
    [counts]
  );

  const matchesFilter = useCallback(
    (achievement: any) => {
      const progress = achievement?.user_progress || {};
      const isCompleted = Boolean(progress?.is_completed);
      const isClaimed = Boolean(progress?.is_reward_claimed);
      const current = Number(progress?.current_progress ?? 0);
      const pct = clampPct(progress?.progress_percent ?? 0);
      const isInProgress = !isCompleted && (current > 0 || pct > 0);

      switch (filter) {
        case 'completed':
          return isCompleted;
        case 'in_progress':
          return isInProgress;
        case 'unclaimed':
          return isCompleted && !isClaimed;
        case 'all':
        default:
          return true;
      }
    },
    [filter]
  );

  const handleClaim = useCallback(
    (achievementId: string, name?: string) => {
      if (!achievementId || claimingId) return;
      Alert.alert('Claim reward', `Claim reward for "${name || 'this achievement'}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim',
          onPress: async () => {
            try {
              setClaimingId(achievementId);
              const res = await gamificationAPI.claimAchievementReward(achievementId);
              const payload = res?.data?.data ?? res?.data ?? {};
              if (payload?.success === false) {
                Alert.alert('Unable to claim', payload?.error || payload?.message || 'Try again later.');
              } else {
                Alert.alert('Reward claimed', payload?.message || 'Success.');
              }
              await load();
            } catch (err: any) {
              Alert.alert(
                'Claim failed',
                err?.response?.data?.error ||
                  err?.response?.data?.message ||
                  err?.message ||
                  'Unable to claim reward.'
              );
            } finally {
              setClaimingId(null);
            }
          },
        },
      ]);
    },
    [claimingId, load]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading challenges...</Text>
      </View>
    );
  }

  const completionPercent = clampPct(stats?.completion_percent ?? 0);
  const completed = Number(stats?.completed ?? 0);
  const total = Number(stats?.total_achievements ?? counts.total ?? 0);
  const pointsEarned = Number(stats?.points_earned ?? 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenges</Text>
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
          <View style={styles.heroAccentA} />
          <View style={styles.heroAccentB} />
          <Text style={styles.heroKicker}>Completion</Text>
          <Text style={styles.heroValue}>{Math.round(completionPercent)}%</Text>
          <Text style={styles.heroSub}>
            {completed}/{total || '—'} completed • {pointsEarned.toLocaleString()} pts earned
          </Text>
          <View style={styles.heroBarBg}>
            <View style={[styles.heroBarFg, { width: `${Math.round(completionPercent)}%` }]} />
          </View>
        </View>

        <View style={styles.filters}>
          {filterOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterChip, filter === (opt.key as FilterKey) ? styles.filterChipActive : null]}
              onPress={() => setFilter(opt.key as FilterKey)}
            >
              <Text style={[styles.filterText, filter === (opt.key as FilterKey) ? styles.filterTextActive : null]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="diamond" size={34} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No challenges available</Text>
            <Text style={styles.emptyText}>We could not load achievement milestones right now.</Text>
          </View>
        ) : (
          categories.map((cat) => {
            const achievements = Array.isArray(cat?.achievements) ? cat.achievements : [];
            const filtered = achievements.filter(matchesFilter);
            if (filtered.length === 0) return null;

            const categoryKey = String(cat?.category || '');
            const accent = getCategoryAccent(categoryKey);
            const iconName = getCategoryIcon(categoryKey);
            const title = String(cat?.display_name || cat?.category || 'Category');

            return (
              <View key={String(cat?.category || title)} style={{ marginBottom: spacing[4] }}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryIcon, { backgroundColor: accent + '14' }]}>
                    <Icon name={iconName as any} size={16} color={accent} />
                  </View>
                  <Text style={styles.categoryTitle}>{title}</Text>
                  <Text style={styles.categoryCount}>{filtered.length}</Text>
                </View>

                {filtered.map((achievement: any) => {
                  const progress = achievement?.user_progress || {};
                  const pct = clampPct(progress?.progress_percent ?? 0);
                  const isCompleted = Boolean(progress?.is_completed);
                  const isClaimed = Boolean(progress?.is_reward_claimed);
                  const isReady = isCompleted && !isClaimed;

                  const pointsReward = Number(achievement?.points_reward ?? 0);
                  const premiumDays = Number(achievement?.premium_days_reward ?? 0);
                  const tierLabel = prettyTier(achievement?.tier);
                  const chipBg = isReady ? colors.success + '1A' : isClaimed ? colors.primary[50] : colors.gray[100];
                  const chipFg = isReady ? colors.success : isClaimed ? colors.primary[700] : colors.text.tertiary;

                  return (
                    <View key={String(achievement?.id || Math.random())} style={styles.card}>
                      <View style={styles.cardTop}>
                        <View style={[styles.achievementIcon, { backgroundColor: accent + '12' }]}>
                          <Icon name="diamond" size={18} color={accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.achievementName}>{achievement?.name || 'Achievement'}</Text>
                          <Text style={styles.achievementMeta}>
                            {tierLabel ? `${tierLabel} • ` : ''}
                            {Math.round(pct)}% complete
                          </Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: chipBg }]}>
                          <Text style={[styles.statusPillText, { color: chipFg }]}>
                            {isClaimed ? 'CLAIMED' : isReady ? 'READY' : 'ACTIVE'}
                          </Text>
                        </View>
                      </View>

                      {achievement?.description ? (
                        <Text style={styles.achievementDesc}>{achievement.description}</Text>
                      ) : null}

                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFg, { width: `${Math.round(pct)}%`, backgroundColor: accent }]} />
                      </View>

                      <View style={styles.cardBottom}>
                        <View style={styles.rewardsRow}>
                          {pointsReward > 0 ? (
                            <View style={styles.rewardChip}>
                              <Icon name="star" size={14} color={colors.warning} />
                              <Text style={styles.rewardText}>+{pointsReward} pts</Text>
                            </View>
                          ) : null}
                          {premiumDays > 0 ? (
                            <View style={styles.rewardChip}>
                              <Icon name="card" size={14} color={colors.primary[600]} />
                              <Text style={styles.rewardText}>{premiumDays} premium day{premiumDays === 1 ? '' : 's'}</Text>
                            </View>
                          ) : null}
                        </View>

                        {isReady ? (
                          <Button
                            title={claimingId === String(achievement?.id) ? 'Claiming...' : 'Claim'}
                            onPress={() => handleClaim(String(achievement?.id || ''), achievement?.name)}
                            loading={claimingId === String(achievement?.id)}
                            disabled={claimingId === String(achievement?.id)}
                            variant="secondary"
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
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
    backgroundColor: colors.primary[700],
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[4],
    overflow: 'hidden',
    ...shadows.md,
  },
  heroAccentA: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroAccentB: {
    position: 'absolute',
    bottom: -60,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroKicker: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  heroValue: { marginTop: 6, fontSize: 34, fontWeight: '900', color: colors.text.inverse, letterSpacing: 0.2 },
  heroSub: { marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  heroBarBg: { marginTop: spacing[4], height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  heroBarFg: { height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.85)' },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] },
  filterChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.gray[100] },
  filterChipActive: { backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
  filterText: { fontSize: 13, fontWeight: '800', color: colors.text.secondary },
  filterTextActive: { color: colors.primary[700] },

  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: { marginTop: spacing[3], fontSize: 15, fontWeight: '900', color: colors.text.primary },
  emptyText: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },

  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] },
  categoryIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  categoryTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary, flex: 1 },
  categoryCount: { fontSize: 12, fontWeight: '900', color: colors.text.tertiary },

  card: { backgroundColor: colors.card.light, borderRadius: borderRadius['2xl'], padding: spacing[4], marginBottom: spacing[3], ...shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  achievementIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  achievementName: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  achievementMeta: { marginTop: 2, fontSize: 12, color: colors.text.tertiary, fontWeight: '700' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '900' },
  achievementDesc: { marginTop: spacing[3], fontSize: 13, color: colors.text.secondary, lineHeight: 18 },

  progressBarBg: { height: 10, borderRadius: 999, backgroundColor: colors.gray[100], overflow: 'hidden', marginTop: spacing[3] },
  progressBarFg: { height: 10, borderRadius: 999 },

  cardBottom: { marginTop: spacing[4], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
  rewardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], flex: 1 },
  rewardChip: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.gray[50], borderWidth: 1, borderColor: colors.border.light },
  rewardText: { fontSize: 12, fontWeight: '800', color: colors.text.secondary },

  bottomSpacing: { height: spacing[4] },
});

export default ChallengesScreen;
