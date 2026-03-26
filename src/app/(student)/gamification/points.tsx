// Points Screen

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import Button from '../../../components/ui/Button';
import { gamificationAPI } from '../../../services/api';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const PointsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<any | null>(null);
  const [actions, setActions] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [pointsRes, actionsRes] = await Promise.all([
        gamificationAPI.getPoints(),
        gamificationAPI.getActions().catch(() => null),
      ]);

      const pointsPayload = pointsRes?.data?.data ?? pointsRes?.data ?? {};
      setPoints(pointsPayload || null);

      const actionsPayload = actionsRes?.data?.data ?? actionsRes?.data ?? {};
      const list = Array.isArray(actionsPayload?.actions) ? actionsPayload.actions : [];
      setActions(list);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load points.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPoints = Number(points?.total_points ?? 0);
  const level = Number(points?.level ?? 1);
  const currentLevelPoints = Number(points?.current_level_points ?? 0);
  const pointsForNext = Number(points?.points_for_next_level ?? 0);
  const pointsToNext = Number(points?.points_to_next_level ?? 0);
  const progress = useMemo(
    () => (pointsForNext ? clamp01(currentLevelPoints / pointsForNext) : 0),
    [currentLevelPoints, pointsForNext]
  );

  const breakdown = useMemo(
    () => [
      { key: 'learning', label: 'Learning', icon: 'school', value: Number(points?.learning_points ?? 0), color: colors.primary[600], bg: colors.primary[50] },
      { key: 'engagement', label: 'Engagement', icon: 'chatbubbles', value: Number(points?.engagement_points ?? 0), color: colors.info, bg: colors.info + '12' },
      { key: 'contribution', label: 'Contribution', icon: 'heart', value: Number(points?.contribution_points ?? 0), color: colors.accent[500], bg: colors.accent[50] },
      { key: 'achievement', label: 'Achievement', icon: 'diamond', value: Number(points?.achievement_points ?? 0), color: colors.warning, bg: colors.warning + '12' },
    ],
    [points]
  );

  const topActions = useMemo(() => {
    const list = Array.isArray(actions) ? actions.slice() : [];
    return list
      .sort((a, b) => Number(b?.points ?? 0) - Number(a?.points ?? 0))
      .slice(0, 8);
  }, [actions]);
  const hasMomentum = totalPoints > 0 || breakdown.some((item) => item.value > 0);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading points...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Points</Text>
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
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <View style={styles.heroIcon}>
                <Icon name="analytics" size={18} color={colors.primary[600]} />
              </View>
              <View>
                <Text style={styles.heroKicker}>Total points</Text>
                <Text style={styles.heroValue}>{totalPoints.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>LEVEL {level}</Text>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFg, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <View style={styles.progressMeta}>
              <Text style={styles.progressText}>{currentLevelPoints}/{pointsForNext || '—'} in this level</Text>
              <Text style={styles.progressText}>
                {pointsForNext ? `${pointsToNext} to next` : 'Next level unavailable'}
              </Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Button
              title="History"
              onPress={() => router.push('/(student)/gamification/history' as any)}
              style={{ flex: 1 }}
            />
            <View style={{ width: spacing[3] }} />
            <Button
              title="Badges"
              onPress={() => router.push('/(student)/gamification/badges' as any)}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Breakdown</Text>
        <View style={styles.breakdownGrid}>
          {breakdown.map((item) => (
            <View key={item.key} style={[styles.breakdownCard, { backgroundColor: item.bg }]}>
              <View style={styles.breakdownTop}>
                <View style={[styles.breakdownIcon, { backgroundColor: item.color + '14' }]}>
                  <Icon name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
              </View>
              <Text style={styles.breakdownValue}>{item.value.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing[4] }]}>How to earn points</Text>
        {topActions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="information-circle" size={28} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>
              {hasMomentum ? 'Action catalog syncing' : 'Ways to earn are still loading'}
            </Text>
            <Text style={styles.emptyText}>
              {hasMomentum
                ? 'Your live totals are up to date. The full action list is temporarily unavailable, so use challenges and badges to keep moving.'
                : 'Once the server shares the latest point actions, they will show up here with their exact values.'}
            </Text>
            <View style={styles.emptyActions}>
              <Button
                title="Challenges"
                onPress={() => router.push('/(student)/gamification/achievements' as any)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <View style={{ width: spacing[3] }} />
              <Button
                title="Refresh"
                onPress={() => {
                  setRefreshing(true);
                  load();
                }}
                variant="outline"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.actionsCard}>
            {topActions.map((action) => (
              <View key={String(action?.id || action?.name)} style={styles.actionRow}>
                <View style={styles.actionLeft}>
                  <View style={styles.actionIcon}>
                    <Icon name="add-circle" size={18} color={colors.primary[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionName}>{action?.name || 'Action'}</Text>
                    <Text style={styles.actionMeta}>
                      {action?.category?.name ? `${action.category.name} • ` : ''}
                      {Number(action?.max_times_per_day ?? 1)}/day
                    </Text>
                  </View>
                </View>
                <View style={styles.actionRight}>
                  <Text style={styles.actionPoints}>+{Number(action?.points ?? 0)}</Text>
                  <Text style={styles.actionPointsLabel}>pts</Text>
                </View>
              </View>
            ))}
          </View>
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
    ...shadows.sm,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroKicker: { fontSize: 12, color: colors.text.tertiary, fontWeight: '700' },
  heroValue: { marginTop: 2, fontSize: 22, fontWeight: '900', color: colors.text.primary },
  levelPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.gray[100] },
  levelPillText: { fontSize: 12, fontWeight: '900', color: colors.text.secondary },

  progressWrap: { marginTop: spacing[4] },
  progressBarBg: { height: 10, borderRadius: 999, backgroundColor: colors.gray[100], overflow: 'hidden' },
  progressBarFg: { height: 10, borderRadius: 999, backgroundColor: colors.primary[500] },
  progressMeta: { marginTop: spacing[2], flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  progressText: { fontSize: 12, color: colors.text.tertiary, fontWeight: '700' },

  heroActions: { flexDirection: 'row', marginTop: spacing[4] },

  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary, marginBottom: spacing[2] },
  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  breakdownCard: {
    width: '48%',
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  breakdownTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  breakdownIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  breakdownLabel: { fontSize: 13, fontWeight: '800', color: colors.text.primary, flexShrink: 1 },
  breakdownValue: { marginTop: spacing[3], fontSize: 18, fontWeight: '900', color: colors.text.primary },

  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: { marginTop: spacing[3], fontSize: 14, fontWeight: '900', color: colors.text.primary },
  emptyText: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },
  emptyActions: { flexDirection: 'row', marginTop: spacing[4], width: '100%' },

  actionsCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[2],
    ...shadows.sm,
  },
  actionRow: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionName: { fontSize: 13, fontWeight: '900', color: colors.text.primary },
  actionMeta: { marginTop: 2, fontSize: 12, color: colors.text.tertiary, fontWeight: '700' },
  actionRight: { alignItems: 'flex-end' },
  actionPoints: { fontSize: 15, fontWeight: '900', color: colors.primary[700] },
  actionPointsLabel: { marginTop: 1, fontSize: 11, color: colors.text.tertiary, fontWeight: '800' },

  bottomSpacing: { height: spacing[4] },
});

export default PointsScreen;
