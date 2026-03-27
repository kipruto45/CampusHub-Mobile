// Achievements Hub (Gamification)

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
import { gamificationAPI } from '../../../services/api';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { borderRadius,spacing } from '../../../theme/spacing';

type GamificationStats = {
  total_points?: number;
  leaderboard_rank?: number | null;
  consecutive_login_days?: number;
  earned_badges?: any[];
  all_badges?: any[];
};

const formatRank = (rank?: number | null) => {
  if (!rank || rank < 1) return 'Unranked';
  return `#${rank}`;
};

const AchievementsHome: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [checkingBadges, setCheckingBadges] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await gamificationAPI.getStats();
      const payload = res?.data?.data ?? res?.data ?? {};
      setStats(payload || null);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load achievements.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPoints = Number(stats?.total_points ?? 0);
  const streak = Number(stats?.consecutive_login_days ?? 0);
  const earnedBadgeCount = useMemo(
    () => (Array.isArray(stats?.earned_badges) ? stats!.earned_badges!.length : 0),
    [stats]
  );
  const totalBadgeCount = useMemo(
    () => (Array.isArray(stats?.all_badges) ? stats!.all_badges!.length : 0),
    [stats]
  );

  const handleCheckBadges = useCallback(async () => {
    try {
      setCheckingBadges(true);
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
      setCheckingBadges(false);
    }
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading achievements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
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
              <Text style={styles.errorTitle}>Gamification unavailable</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Try Again" onPress={() => load()} variant="outline" />
          </View>
        ) : null}

        <View style={styles.hero}>
          <View style={styles.heroAccentA} />
          <View style={styles.heroAccentB} />
          <Text style={styles.heroKicker}>Your progress</Text>
          <Text style={styles.heroPoints}>{totalPoints.toLocaleString()}</Text>
          <Text style={styles.heroSub}>Points • Streak {streak} day{streak === 1 ? '' : 's'} • Rank {formatRank(stats?.leaderboard_rank ?? null)}</Text>

          <View style={styles.heroActions}>
            <Button
              title={checkingBadges ? 'Checking...' : 'Check badges'}
              onPress={handleCheckBadges}
              loading={checkingBadges}
              disabled={checkingBadges}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <View style={{ width: spacing[3] }} />
            <Button
              title="Leaderboard"
              onPress={() => router.push('/(student)/leaderboard' as any)}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.primary[50], borderColor: colors.primary[100] }]}
            onPress={() => router.push('/(student)/gamification/points' as any)}
          >
            <View style={[styles.tileIcon, { backgroundColor: colors.primary[500] + '14' }]}>
              <Icon name="analytics" size={18} color={colors.primary[600]} />
            </View>
            <Text style={styles.tileTitle}>Points</Text>
            <Text style={styles.tileSub}>{totalPoints.toLocaleString()} total</Text>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.accent[50], borderColor: colors.accent[100] }]}
            onPress={() => router.push('/(student)/gamification/badges' as any)}
          >
            <View style={[styles.tileIcon, { backgroundColor: colors.accent[500] + '14' }]}>
              <Icon name="star" size={18} color={colors.accent[500]} />
            </View>
            <Text style={styles.tileTitle}>Badges</Text>
            <Text style={styles.tileSub}>
              {earnedBadgeCount}/{totalBadgeCount || '—'} earned
            </Text>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '2A' }]}
            onPress={() => router.push('/(student)/gamification/streak' as any)}
          >
            <View style={[styles.tileIcon, { backgroundColor: colors.warning + '14' }]}>
              <Icon name="flame" size={18} color={colors.warning} />
            </View>
            <Text style={styles.tileTitle}>Streak</Text>
            <Text style={styles.tileSub}>{streak} day{streak === 1 ? '' : 's'}</Text>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.info + '10', borderColor: colors.info + '2A' }]}
            onPress={() => router.push('/(student)/gamification/achievements' as any)}
          >
            <View style={[styles.tileIcon, { backgroundColor: colors.info + '14' }]}>
              <Icon name="diamond" size={18} color={colors.info} />
            </View>
            <Text style={styles.tileTitle}>Challenges</Text>
            <Text style={styles.tileSub}>Milestones & rewards</Text>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.gray[100], borderColor: colors.border.light }]}
            onPress={() => router.push('/(student)/my-progress' as any)}
          >
            <View style={[styles.tileIcon, { backgroundColor: colors.gray[200] }]}>
              <Icon name="trending-up" size={18} color={colors.text.secondary} />
            </View>
            <Text style={styles.tileTitle}>My progress</Text>
            <Text style={styles.tileSub}>Courses & milestones</Text>
            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
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
  heroPoints: { marginTop: 6, fontSize: 34, fontWeight: '900', color: colors.text.inverse, letterSpacing: 0.2 },
  heroSub: { marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  heroActions: { flexDirection: 'row', marginTop: spacing[4] },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  tile: {
    width: '48%',
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    borderWidth: 1,
    ...shadows.sm,
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileTitle: { marginTop: spacing[3], fontSize: 14, fontWeight: '900', color: colors.text.primary },
  tileSub: { marginTop: 4, marginBottom: spacing[2], fontSize: 12, color: colors.text.secondary, fontWeight: '700' },

  bottomSpacing: { height: spacing[4] },
});

export default AchievementsHome;
