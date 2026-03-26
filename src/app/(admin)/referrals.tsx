import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

interface ReferralItem {
  id: string;
  email: string;
  status: string;
  rewards_claimed: boolean;
  referral_code_value?: string;
  referrer_name?: string;
  referee_name?: string;
  created_at?: string;
  subscribed_at?: string;
}

interface RewardTierItem {
  id: number;
  name: string;
  min_referrals: number;
  points: number;
  premium_days: number;
  badge?: string;
  is_active: boolean;
}

const formatRelativeDate = (value?: string) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const ReferralsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [tiers, setTiers] = useState<RewardTierItem[]>([]);
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState<RewardTierItem | null>(null);
  const [savingTier, setSavingTier] = useState(false);
  const [tierForm, setTierForm] = useState({
    name: '',
    min_referrals: '',
    points: '',
    premium_days: '',
    badge: '',
    is_active: true,
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const referralStatus = statusFilter === 'all' ? undefined : statusFilter;
      const [referralsRes, tiersRes] = await Promise.all([
        adminAPI.listReferrals({
          page: 1,
          page_size: 25,
          search: searchQuery.trim() || undefined,
          status: referralStatus,
        }),
        adminAPI.listRewardTiers(),
      ]);

      setReferrals(referralsRes.data?.data?.results || []);
      setTiers(tiersRes.data?.data?.results || tiersRes.data?.data || []);
    } catch (fetchError: any) {
      console.error('Failed to fetch referrals:', fetchError);
      setError(fetchError?.response?.data?.message || fetchError?.message || 'Failed to load referrals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchData();
  }, [fetchData]);

  const openCreateTier = () => {
    setEditingTier(null);
    setTierForm({
      name: '',
      min_referrals: '',
      points: '',
      premium_days: '',
      badge: '',
      is_active: true,
    });
    setShowTierModal(true);
  };

  const openEditTier = (tier: RewardTierItem) => {
    setEditingTier(tier);
    setTierForm({
      name: tier.name,
      min_referrals: String(tier.min_referrals),
      points: String(tier.points),
      premium_days: String(tier.premium_days),
      badge: tier.badge || '',
      is_active: tier.is_active,
    });
    setShowTierModal(true);
  };

  const saveTier = async () => {
    if (!tierForm.name.trim()) {
      Alert.alert('Missing Name', 'Enter a reward tier name.');
      return;
    }

    setSavingTier(true);
    try {
      const payload = {
        name: tierForm.name.trim(),
        min_referrals: Number(tierForm.min_referrals || 0),
        points: Number(tierForm.points || 0),
        premium_days: Number(tierForm.premium_days || 0),
        badge: tierForm.badge.trim() || undefined,
        is_active: tierForm.is_active,
      };

      if (editingTier) {
        await adminAPI.updateRewardTier(editingTier.id, payload);
      } else {
        await adminAPI.createRewardTier(payload);
      }
      setShowTierModal(false);
      await fetchData();
    } catch (saveError: any) {
      Alert.alert('Unable to Save', saveError?.response?.data?.message || saveError?.message || 'Failed to save reward tier.');
    } finally {
      setSavingTier(false);
    }
  };

  const deleteTier = (tier: RewardTierItem) => {
    Alert.alert('Delete Reward Tier', `Delete "${tier.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminAPI.deleteRewardTier(tier.id);
            await fetchData();
          } catch (deleteError: any) {
            Alert.alert('Unable to Delete', deleteError?.response?.data?.message || deleteError?.message || 'Failed to delete reward tier.');
          }
        },
      },
    ]);
  };

  const claimedCount = referrals.filter((item) => item.rewards_claimed).length;
  const completedCount = referrals.filter((item) => String(item.status).toLowerCase() === 'completed').length;

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !referrals.length && !tiers.length) {
    return (
      <ErrorState
        type="server"
        title="Unable to Load Referrals"
        message={error}
        onRetry={() => {
          setLoading(true);
          void fetchData();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <Icon name="arrow-back" size={22} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Referrals</Text>
        <TouchableOpacity onPress={openCreateTier} style={styles.headerIcon}>
          <Icon name="add-circle" size={22} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{referrals.length}</Text>
            <Text style={styles.summaryLabel}>Loaded</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{completedCount}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{claimedCount}</Text>
            <Text style={styles.summaryLabel}>Claimed</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{tiers.length}</Text>
            <Text style={styles.summaryLabel}>Reward Tiers</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by email or code..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {(['all', 'pending', 'completed'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Referral Activity</Text>
        {referrals.length ? (
          referrals.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>{item.email || item.referee_name || 'Referral'}</Text>
                  <Text style={styles.cardSubtitle}>
                    {[item.referrer_name, item.referral_code_value].filter(Boolean).join(' • ')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, item.rewards_claimed ? styles.statusSuccess : styles.statusWarning]}>
                  <Text style={[styles.statusText, item.rewards_claimed ? styles.statusSuccessText : styles.statusWarningText]}>
                    {item.rewards_claimed ? 'Claimed' : item.status || 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.metaText}>
                {item.referee_name ? `Referee: ${item.referee_name}` : 'Waiting for referee account'} 
              </Text>
              <Text style={styles.metaText}>
                Created {formatRelativeDate(item.created_at)} {item.subscribed_at ? `• Subscribed ${formatRelativeDate(item.subscribed_at)}` : ''}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="gift" size={40} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No referrals matched the current filters.</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reward Tiers</Text>
          <TouchableOpacity onPress={openCreateTier}>
            <Text style={styles.linkText}>Add Tier</Text>
          </TouchableOpacity>
        </View>
        {tiers.length ? (
          tiers.map((tier) => (
            <TouchableOpacity key={tier.id} style={styles.card} onPress={() => openEditTier(tier)}>
              <View style={styles.cardHeader}>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>{tier.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    {tier.min_referrals} referrals • {tier.points} pts • {tier.premium_days} premium days
                  </Text>
                </View>
                <View style={[styles.statusBadge, tier.is_active ? styles.statusSuccess : styles.statusMuted]}>
                  <Text style={[styles.statusText, tier.is_active ? styles.statusSuccessText : styles.statusMutedText]}>
                    {tier.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <View style={styles.tierActions}>
                <Text style={styles.metaText}>{tier.badge ? `Badge: ${tier.badge}` : 'No badge linked'}</Text>
                <TouchableOpacity onPress={() => deleteTier(tier)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="ribbon" size={40} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No reward tiers configured yet.</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showTierModal} transparent animationType="slide" onRequestClose={() => setShowTierModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTier ? 'Edit Reward Tier' : 'Create Reward Tier'}</Text>
              <TouchableOpacity onPress={() => setShowTierModal(false)}>
                <Icon name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Tier name"
                value={tierForm.name}
                onChangeText={(value) => setTierForm((prev) => ({ ...prev, name: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Minimum referrals"
                keyboardType="number-pad"
                value={tierForm.min_referrals}
                onChangeText={(value) => setTierForm((prev) => ({ ...prev, min_referrals: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Points"
                keyboardType="number-pad"
                value={tierForm.points}
                onChangeText={(value) => setTierForm((prev) => ({ ...prev, points: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Premium days"
                keyboardType="number-pad"
                value={tierForm.premium_days}
                onChangeText={(value) => setTierForm((prev) => ({ ...prev, premium_days: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Badge slug or label"
                value={tierForm.badge}
                onChangeText={(value) => setTierForm((prev) => ({ ...prev, badge: value }))}
              />
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setTierForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
              >
                <Text style={styles.toggleLabel}>Tier active</Text>
                <Icon
                  name={tierForm.is_active ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={tierForm.is_active ? colors.primary[500] : colors.text.tertiary}
                />
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button title="Cancel" variant="outline" onPress={() => setShowTierModal(false)} style={styles.modalButton} />
              <Button title={savingTier ? 'Saving...' : 'Save'} onPress={saveTier} style={styles.modalButton} disabled={savingTier} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[9],
    paddingBottom: spacing[4],
    backgroundColor: colors.primary[500],
  },
  headerIcon: { padding: spacing[1] },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.inverse },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  summaryGrid: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
    ...shadows.sm,
  },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  summaryLabel: { marginTop: 4, fontSize: 11, color: colors.text.secondary },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...shadows.sm,
  },
  searchInput: { flex: 1, marginLeft: spacing[2], fontSize: 15, color: colors.text.primary },
  filterRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3], marginBottom: spacing[5] },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary,
  },
  filterChipActive: { backgroundColor: colors.primary[500] },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
  filterChipTextActive: { color: colors.text.inverse },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing[3] },
  linkText: { fontSize: 13, fontWeight: '600', color: colors.primary[500] },
  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  cardHeader: { flexDirection: 'row', gap: spacing[3], alignItems: 'center' },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  cardSubtitle: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  metaText: { fontSize: 12, color: colors.text.tertiary, marginTop: spacing[2] },
  statusBadge: { paddingHorizontal: spacing[2], paddingVertical: 6, borderRadius: borderRadius.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusSuccess: { backgroundColor: colors.success + '18' },
  statusSuccessText: { color: colors.success },
  statusWarning: { backgroundColor: colors.warning + '18' },
  statusWarningText: { color: colors.warning },
  statusMuted: { backgroundColor: colors.background.secondary },
  statusMutedText: { color: colors.text.secondary },
  tierActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[2] },
  deleteText: { fontSize: 12, fontWeight: '700', color: colors.error },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    ...shadows.sm,
  },
  emptyText: { marginTop: spacing[3], fontSize: 14, color: colors.text.secondary, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  modalBody: { padding: spacing[4], gap: spacing[3] },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: 15,
    color: colors.text.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  toggleLabel: { fontSize: 14, color: colors.text.primary, fontWeight: '600' },
  modalFooter: { flexDirection: 'row', gap: spacing[3], padding: spacing[4], borderTopWidth: 1, borderTopColor: colors.border.light },
  modalButton: { flex: 1 },
});

export default ReferralsScreen;
