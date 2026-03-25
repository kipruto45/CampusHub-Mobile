// Points History Screen

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

type Txn = {
  id: string;
  points: number;
  category_name?: string;
  action_name?: string;
  balance_after?: number;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  created_at?: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const PointsHistoryScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Txn[]>([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await gamificationAPI.getPointsHistory({ limit: 60 });
      const payload = res?.data?.data ?? res?.data ?? {};
      const list = Array.isArray(payload?.history) ? payload.history : Array.isArray(payload) ? payload : [];
      setHistory(
        list.map((t: any) => ({
          id: String(t?.id || ''),
          points: Number(t?.points ?? 0),
          category_name: String(t?.category_name || ''),
          action_name: String(t?.action_name || ''),
          balance_after: Number(t?.balance_after ?? 0),
          description: String(t?.description || ''),
          reference_id: String(t?.reference_id || ''),
          reference_type: String(t?.reference_type || ''),
          created_at: String(t?.created_at || ''),
        }))
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load history.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalDelta = useMemo(
    () => history.reduce((sum, t) => sum + Number(t.points || 0), 0),
    [history]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Points History</Text>
          <Text style={styles.headerSubtitle}>
            {history.length ? `${history.length} entries • ${totalDelta >= 0 ? '+' : ''}${totalDelta} pts` : 'Recent activity'}
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
            <View style={styles.errorTop}>
              <Icon name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorTitle}>Unavailable</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Try Again" onPress={() => load()} variant="outline" />
          </View>
        ) : null}

        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="time" size={32} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Your point transactions will show up here.</Text>
            <Button
              title="View points"
              onPress={() => router.push('/(student)/gamification/points' as any)}
              variant="outline"
            />
          </View>
        ) : (
          history.map((t) => {
            const isPositive = Number(t.points) >= 0;
            const badgeBg = isPositive ? colors.success + '14' : colors.error + '10';
            const badgeFg = isPositive ? colors.success : colors.error;
            const title = t.action_name || t.category_name || 'Points';
            return (
              <View key={t.id || `${title}-${t.created_at}`} style={styles.card}>
                <View style={styles.topRow}>
                  <View style={styles.left}>
                    <View style={[styles.iconWrap, { backgroundColor: badgeBg }]}>
                      <Icon name={isPositive ? 'add-circle' : 'remove-circle'} size={18} color={badgeFg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{title}</Text>
                      <Text style={styles.sub}>
                        {t.category_name ? `${t.category_name} • ` : ''}
                        {formatDateTime(t.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.right}>
                    <Text style={[styles.points, { color: badgeFg }]}>
                      {isPositive ? '+' : ''}
                      {Number(t.points || 0)}
                    </Text>
                    <Text style={styles.pointsLabel}>pts</Text>
                  </View>
                </View>
                {t.description ? <Text style={styles.desc}>{t.description}</Text> : null}
                {t.balance_after !== undefined ? (
                  <Text style={styles.meta}>Balance after: {Number(t.balance_after).toLocaleString()}</Text>
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
  headerBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text.primary },
  headerSubtitle: { marginTop: 2, fontSize: 12, color: colors.text.tertiary, fontWeight: '700' },

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

  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: { marginTop: spacing[3], fontSize: 15, fontWeight: '900', color: colors.text.primary },
  emptyText: { marginTop: spacing[2], marginBottom: spacing[4], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },

  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[3] },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  sub: { marginTop: 2, fontSize: 12, color: colors.text.tertiary, fontWeight: '700' },
  right: { alignItems: 'flex-end' },
  points: { fontSize: 16, fontWeight: '900' },
  pointsLabel: { marginTop: 2, fontSize: 11, color: colors.text.tertiary, fontWeight: '800' },
  desc: { marginTop: spacing[3], fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  meta: { marginTop: spacing[2], fontSize: 12, color: colors.text.tertiary, fontWeight: '700' },

  bottomSpacing: { height: spacing[4] },
});

export default PointsHistoryScreen;

