// Feature Access Screen (Freemium gating visibility)

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
import Input from '../../../components/ui/Input';
import { paymentsAPI } from '../../../services/api';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { borderRadius,spacing } from '../../../theme/spacing';

type FeatureRow = {
  key: string;
  name: string;
  description: string;
  available: boolean;
};

type AccessSummary = {
  tier?: string;
  tier_name?: string;
  storage_limit_gb?: number;
  download_limit_monthly?: number;
  categories?: Record<string, FeatureRow[]>;
};

const formatDownloadLimit = (value: any) => {
  const parsed = Number(value ?? 0);
  if (parsed < 0) return 'Unlimited';
  return `${parsed}/mo`;
};

const CATEGORY_META: {
  key: string;
  title: string;
  icon: any;
  tint: string;
  bg: string;
}[] = [
  { key: 'core', title: 'Core', icon: 'home', tint: colors.text.secondary, bg: colors.gray[100] },
  { key: 'basic', title: 'Basic', icon: 'diamond', tint: colors.primary[600], bg: colors.primary[50] },
  { key: 'premium', title: 'Premium', icon: 'briefcase', tint: colors.accent[500], bg: colors.accent[50] },
  { key: 'enterprise', title: 'Enterprise', icon: 'business', tint: colors.info, bg: colors.info + '12' },
];

const FeatureAccessScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AccessSummary | null>(null);

  const [featureKey, setFeatureKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await paymentsAPI.getFeatureAccessSummary();
      const payload = response?.data?.data ?? response?.data ?? {};
      setSummary(payload || null);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load feature access.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => summary?.categories || {}, [summary?.categories]);

  const tierName = String(summary?.tier_name || summary?.tier || 'Free');
  const tierKey = String(summary?.tier || '').toLowerCase();
  const storageLimit = Number(summary?.storage_limit_gb ?? 1);
  const downloadLimit = summary?.download_limit_monthly ?? 50;

  const totalCounts = useMemo(() => {
    let available = 0;
    let locked = 0;
    for (const list of Object.values(categories || {})) {
      for (const item of list || []) {
        if (item?.available) available += 1;
        else locked += 1;
      }
    }
    return { available, locked };
  }, [categories]);

  const handleCheck = useCallback(async () => {
    const cleaned = String(featureKey || '').trim();
    if (!cleaned) {
      Alert.alert('Feature key', 'Enter a feature key (example: ai_chat).');
      return;
    }

    try {
      setChecking(true);
      setCheckResult(null);
      const response = await paymentsAPI.checkFeatureAccess(cleaned);
      const payload = response?.data?.data ?? response?.data ?? {};
      setCheckResult(payload);
    } catch (err: any) {
      Alert.alert(
        'Check failed',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to check feature access.'
      );
    } finally {
      setChecking(false);
    }
  }, [featureKey]);

  const handleStartTrial = useCallback(() => {
    Alert.alert('Start free trial', 'Start the trial available for this account?', [
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
                ? `Your ${payload?.tier_name || 'trial'} ends on ${new Date(payload.trial_end).toLocaleString()}.`
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
        <Text style={styles.loadingText}>Loading access...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feature Access</Text>
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
                <Text style={styles.kicker}>Current tier</Text>
                <Text style={styles.title}>{tierName}</Text>
              </View>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.gray[100] }]}>
              <Text style={[styles.pillText, { color: colors.text.secondary }]}>
                {tierKey ? tierKey.toUpperCase() : 'FREE'}
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
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Features</Text>
              <Text style={styles.metaValue}>
                {totalCounts.available} available, {totalCounts.locked} locked
              </Text>
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
              title="Tiers"
              onPress={() => router.push('/(student)/billing/tiers' as any)}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>

          <View style={styles.actionsRow}>
            <Button
              title={startingTrial ? 'Starting...' : 'Start Trial'}
              onPress={handleStartTrial}
              loading={startingTrial}
              disabled={startingTrial}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Check a feature</Text>
          <Input
            label="Feature key"
            placeholder="e.g. ai_chat"
            value={featureKey}
            onChangeText={setFeatureKey}
            autoCapitalize="none"
            autoCorrect={false}
            hint="Use the API key, not the display name."
            containerStyle={{ marginBottom: spacing[3] }}
          />
          <Button
            title={checking ? 'Checking...' : 'Check'}
            onPress={handleCheck}
            loading={checking}
            disabled={checking}
            fullWidth
          />

          {checkResult ? (
            <View style={styles.resultCard}>
              <View style={styles.resultTop}>
                <Icon
                  name={checkResult?.has_access ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={checkResult?.has_access ? colors.success : colors.text.tertiary}
                />
                <Text style={styles.resultTitle}>
                  {checkResult?.feature_details?.name || checkResult?.feature || 'Feature'}
                </Text>
              </View>
              {checkResult?.feature_details?.description ? (
                <Text style={styles.resultText}>{checkResult.feature_details.description}</Text>
              ) : null}
              <Text style={styles.resultText}>
                {checkResult?.has_access ? 'Available on your tier.' : checkResult?.reason || 'Locked.'}
              </Text>
            </View>
          ) : null}
        </View>

        {CATEGORY_META.map((meta) => {
          const list = Array.isArray(categories?.[meta.key]) ? (categories?.[meta.key] as FeatureRow[]) : [];
          if (!list.length) return null;
          const availableCount = list.filter((f) => Boolean(f?.available)).length;
          return (
            <View key={meta.key} style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: meta.bg }]}>
                  <Icon name={meta.icon} size={16} color={meta.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>{meta.title}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {availableCount}/{list.length} available
                  </Text>
                </View>
              </View>

              <View style={styles.featureList}>
                {list.map((f) => (
                  <View key={f.key} style={styles.featureItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureName}>{f.name}</Text>
                      <Text style={styles.featureDesc}>{f.description}</Text>
                    </View>
                    <View
                      style={[
                        styles.availabilityPill,
                        {
                          backgroundColor: f.available ? colors.success + '1A' : colors.gray[100],
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.availabilityText,
                          { color: f.available ? colors.success : colors.text.tertiary },
                        ]}
                      >
                        {f.available ? 'Available' : 'Locked'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

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
  metaValue: { fontSize: 13, fontWeight: '800', color: colors.text.primary, marginLeft: spacing[3], flexShrink: 1, textAlign: 'right' },

  actionsRow: { flexDirection: 'row', marginTop: spacing[4] },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  sectionSubtitle: { marginTop: 2, fontSize: 12, color: colors.text.tertiary, fontWeight: '800' },

  resultCard: {
    marginTop: spacing[4],
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  resultTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  resultText: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary, lineHeight: 18 },

  featureList: { marginTop: spacing[3], gap: spacing[3] },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  featureName: { fontSize: 13, fontWeight: '900', color: colors.text.primary },
  featureDesc: { marginTop: 4, fontSize: 12, color: colors.text.secondary, lineHeight: 16 },

  availabilityPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start' },
  availabilityText: { fontSize: 12, fontWeight: '900' },

  bottomSpacing: { height: spacing[4] },
});

export default FeatureAccessScreen;
