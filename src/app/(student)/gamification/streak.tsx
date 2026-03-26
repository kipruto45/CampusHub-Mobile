// Streak Screen

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

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

const StreakScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [updatingFreeze, setUpdatingFreeze] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [statusRes, historyRes] = await Promise.all([
        gamificationAPI.getCurrentStreak(),
        gamificationAPI.getStreakHistory({ limit: 30 }).catch(() => null),
      ]);

      const statusPayload = statusRes?.data?.data ?? statusRes?.data ?? {};
      setStatus(statusPayload || null);

      const historyPayload = historyRes?.data?.data ?? historyRes?.data ?? {};
      const list = Array.isArray(historyPayload?.history) ? historyPayload.history : Array.isArray(historyPayload) ? historyPayload : [];
      setHistory(list);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load streak.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = Number(status?.current_streak ?? 0);
  const longest = Number(status?.longest_streak ?? 0);
  const isFrozen = Boolean(status?.is_frozen);
  const freezesRemaining = Number(status?.streak_freezes_remaining ?? 0);
  const nextMilestone = status?.next_milestone ?? null;
  const daysUntilNext = Number(status?.days_until_next_milestone ?? 0);
  const threshold = Number(status?.activity_threshold ?? 0);

  const milestoneLabel = useMemo(() => {
    if (!nextMilestone) return 'No next milestone';
    if (!daysUntilNext) return `${nextMilestone} days`;
    return `${daysUntilNext} day${daysUntilNext === 1 ? '' : 's'} to ${nextMilestone}`;
  }, [daysUntilNext, nextMilestone]);

  const handleToggleFreeze = useCallback(() => {
    if (updatingFreeze) return;

    if (isFrozen) {
      Alert.alert('Unfreeze streak', 'Resume your streak tracking?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfreeze',
          onPress: async () => {
            try {
              setUpdatingFreeze(true);
              await gamificationAPI.unfreezeStreak();
              await load();
            } catch (err: any) {
              Alert.alert(
                'Unfreeze failed',
                err?.response?.data?.error ||
                  err?.response?.data?.message ||
                  err?.message ||
                  'Unable to unfreeze streak.'
              );
            } finally {
              setUpdatingFreeze(false);
            }
          },
        },
      ]);
      return;
    }

    if (freezesRemaining <= 0) {
      Alert.alert('No freezes left', 'You have no streak freezes remaining.');
      return;
    }

    Alert.alert(
      'Freeze streak',
      'Use a freeze to pause your streak for one day?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Freeze',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdatingFreeze(true);
              await gamificationAPI.freezeStreak();
              await load();
            } catch (err: any) {
              Alert.alert(
                'Freeze failed',
                err?.response?.data?.error ||
                  err?.response?.data?.message ||
                  err?.message ||
                  'Unable to freeze streak.'
              );
            } finally {
              setUpdatingFreeze(false);
            }
          },
        },
      ]
    );
  }, [freezesRemaining, isFrozen, load, updatingFreeze]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading streak...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Streak</Text>
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

          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <View style={styles.heroIcon}>
                <Icon name="flame" size={18} color={colors.warning} />
              </View>
              <View>
                <Text style={styles.heroKicker}>Current streak</Text>
                <Text style={styles.heroValue}>{current} day{current === 1 ? '' : 's'}</Text>
              </View>
            </View>
            <View style={[styles.frozenPill, { backgroundColor: isFrozen ? colors.warning + '1A' : colors.gray[100] }]}>
              <Text style={[styles.frozenPillText, { color: isFrozen ? colors.warning : colors.text.tertiary }]}>
                {isFrozen ? 'FROZEN' : 'ACTIVE'}
              </Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Longest</Text>
              <Text style={styles.metaValue}>{longest} days</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Next</Text>
              <Text style={styles.metaValue}>{milestoneLabel}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Daily goal</Text>
              <Text style={styles.metaValue}>{threshold ? `${threshold} activities` : '—'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Freezes</Text>
              <Text style={styles.metaValue}>{freezesRemaining}</Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Button
              title={updatingFreeze ? 'Updating...' : isFrozen ? 'Unfreeze' : 'Freeze'}
              onPress={handleToggleFreeze}
              loading={updatingFreeze}
              disabled={updatingFreeze}
              variant={isFrozen ? 'secondary' : 'outline'}
              style={{ flex: 1 }}
            />
            <View style={{ width: spacing[3] }} />
            <Button
              title="Badges"
              onPress={() => router.push('/(student)/gamification/badges' as any)}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent days</Text>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="time" size={34} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No streak history yet</Text>
            <Text style={styles.emptyText}>Come back after some activity to see your streak timeline.</Text>
          </View>
        ) : (
          history.map((h) => {
            const milestone = String(h?.milestone_reached || '').trim();
            return (
              <View key={String(h?.id || h?.date || Math.random())} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <View style={styles.dayIcon}>
                      <Icon name={milestone ? 'gift' : 'calendar'} size={16} color={milestone ? colors.accent[500] : colors.text.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{formatDate(h?.date)}</Text>
                      <Text style={styles.cardSub}>
                        {Number(h?.activity_count ?? 0)} activities • {Number(h?.points_earned ?? 0)} pts
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.cardStreak}>{Number(h?.streak_at_date ?? 0)}d</Text>
                    {milestone ? (
                      <Text style={styles.cardMilestone}>Milestone {milestone}</Text>
                    ) : null}
                  </View>
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
    overflow: 'hidden',
    ...shadows.sm,
  },
  heroAccentA: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.warning + '10',
  },
  heroAccentB: {
    position: 'absolute',
    bottom: -60,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.accent[500] + '10',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  heroIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.warning + '12', justifyContent: 'center', alignItems: 'center' },
  heroKicker: { fontSize: 12, color: colors.text.tertiary, fontWeight: '700' },
  heroValue: { marginTop: 2, fontSize: 22, fontWeight: '900', color: colors.text.primary },
  frozenPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  frozenPillText: { fontSize: 12, fontWeight: '900' },

  metaGrid: { marginTop: spacing[4], flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  metaItem: {
    width: '48%',
    borderRadius: borderRadius['2xl'],
    padding: spacing[3],
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  metaLabel: { fontSize: 12, color: colors.text.tertiary, fontWeight: '800' },
  metaValue: { marginTop: 4, fontSize: 13, color: colors.text.primary, fontWeight: '900' },

  heroActions: { flexDirection: 'row', marginTop: spacing[4] },

  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary, marginBottom: spacing[2] },

  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: { marginTop: spacing[3], fontSize: 15, fontWeight: '900', color: colors.text.primary },
  emptyText: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },

  card: { backgroundColor: colors.card.light, borderRadius: borderRadius['2xl'], padding: spacing[4], marginBottom: spacing[4], ...shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  dayIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray[100], justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  cardSub: { marginTop: 2, fontSize: 12, color: colors.text.tertiary, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end' },
  cardStreak: { fontSize: 14, fontWeight: '900', color: colors.primary[700] },
  cardMilestone: { marginTop: 2, fontSize: 12, color: colors.accent[500], fontWeight: '900' },

  bottomSpacing: { height: spacing[4] },
});

export default StreakScreen;

