import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  course_name?: string;
  faculty_name?: string;
  department_name?: string;
  year_of_study?: number | null;
  privacy: string;
  is_public: boolean;
  allow_member_invites: boolean;
  max_members: number;
  member_count: number;
  status: 'active' | 'archived' | 'completed';
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
}

const STATUS_FILTERS = ['all', 'active', 'archived', 'completed'] as const;
const PRIVACY_FILTERS = ['all', 'public', 'private'] as const;

const StudyGroupsScreen: React.FC = () => {
  const router = useRouter();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [privacyFilter, setPrivacyFilter] = useState<(typeof PRIVACY_FILTERS)[number]>('all');
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchGroups = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setError(null);
      }

      const response = await adminAPI.listStudyGroups({
        page: 1,
        page_size: 100,
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(privacyFilter !== 'all' ? { privacy: privacyFilter } : {}),
      });
      const results = response.data?.data?.results || [];
      setGroups(results);
    } catch (err: any) {
      console.error('Failed to fetch study groups:', err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          'Failed to load study groups'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [privacyFilter, searchQuery, statusFilter]);

  useEffect(() => {
    fetchGroups(true);
  }, [fetchGroups]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGroups(true);
  }, [fetchGroups]);

  const applyGroupUpdate = useCallback((groupId: string, updater: (group: StudyGroup) => StudyGroup) => {
    setGroups((current) => {
      const next = current.map((group) => (group.id === groupId ? updater(group) : group));
      setSelectedGroup((selected) => {
        if (!selected || selected.id !== groupId) {
          return selected;
        }
        return next.find((group) => group.id === groupId) || selected;
      });
      return next;
    });
  }, []);

  const handleStatusChange = useCallback(
    async (group: StudyGroup, nextStatus: StudyGroup['status']) => {
      if (group.status === nextStatus) {
        return;
      }

      try {
        setUpdating(true);
        const response = await adminAPI.updateStudyGroup(group.id, { status: nextStatus });
        const updated = response.data?.data;
        applyGroupUpdate(group.id, () => updated);
      } catch (err: any) {
        Alert.alert(
          'Update failed',
          err?.response?.data?.message ||
            err?.response?.data?.detail ||
            'Unable to update group status right now.'
        );
      } finally {
        setUpdating(false);
      }
    },
    [applyGroupUpdate]
  );

  const handleInvitesToggle = useCallback(
    async (group: StudyGroup) => {
      try {
        setUpdating(true);
        const response = await adminAPI.updateStudyGroup(group.id, {
          allow_member_invites: !group.allow_member_invites,
        });
        const updated = response.data?.data;
        applyGroupUpdate(group.id, () => updated);
      } catch (err: any) {
        Alert.alert(
          'Update failed',
          err?.response?.data?.message ||
            err?.response?.data?.detail ||
            'Unable to update invite permissions right now.'
        );
      } finally {
        setUpdating(false);
      }
    },
    [applyGroupUpdate]
  );

  const stats = useMemo(() => {
    const active = groups.filter((group) => group.status === 'active').length;
    const privateGroups = groups.filter((group) => !group.is_public).length;
    const members = groups.reduce((total, group) => total + group.member_count, 0);
    return {
      total: groups.length,
      active,
      privateGroups,
      members,
    };
  }, [groups]);

  const getStatusColor = (status: StudyGroup['status']) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'completed':
        return colors.primary[500];
      case 'archived':
      default:
        return colors.text.tertiary;
    }
  };

  const renderGroup = ({ item }: { item: StudyGroup }) => (
    <TouchableOpacity
      style={styles.groupCard}
      activeOpacity={0.9}
      onPress={() => setSelectedGroup(item)}
    >
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Icon name="people" size={20} color={colors.primary[500]} />
        </View>
        <View style={styles.groupTitleBlock}>
          <Text style={styles.groupTitle}>{item.name}</Text>
          <Text style={styles.groupMeta} numberOfLines={1}>
            {[item.course_name, item.year_of_study ? `Year ${item.year_of_study}` : ''].filter(Boolean).join(' • ') || 'General'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '18' }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.groupDescription} numberOfLines={2}>
        {item.description || 'No description provided.'}
      </Text>

      <View style={styles.groupPills}>
        <View style={styles.metaPill}>
          <Icon name={item.is_public ? 'globe' : 'lock-closed'} size={14} color={colors.text.secondary} />
          <Text style={styles.metaPillText}>{item.is_public ? 'Public' : 'Private'}</Text>
        </View>
        <View style={styles.metaPill}>
          <Icon name="people" size={14} color={colors.text.secondary} />
          <Text style={styles.metaPillText}>
            {item.member_count}/{item.max_members}
          </Text>
        </View>
        <View style={styles.metaPill}>
          <Icon name={item.allow_member_invites ? 'checkmark-circle' : 'close-circle'} size={14} color={colors.text.secondary} />
          <Text style={styles.metaPillText}>
            {item.allow_member_invites ? 'Invites on' : 'Invites off'}
          </Text>
        </View>
      </View>

      <View style={styles.groupFooter}>
        <Text style={styles.creatorText} numberOfLines={1}>
          {item.created_by_name || item.created_by_email || 'Unknown creator'}
        </Text>
        <View style={styles.manageButton}>
          <Text style={styles.manageButtonText}>Manage</Text>
          <Icon name="chevron-forward" size={16} color={colors.primary[500]} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading study groups...</Text>
      </View>
    );
  }

  if (error && groups.length === 0) {
    return (
      <ErrorState
        type="server"
        title="Unable to Load Study Groups"
        message={error}
        onRetry={() => {
          setLoading(true);
          fetchGroups(true);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Groups</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onRefresh}>
          <Icon name="refresh" size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchInputWrap}>
          <Icon name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups, creator, or course"
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>
                {filter === 'all' ? 'All Statuses' : filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {PRIVACY_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChipSecondary, privacyFilter === filter && styles.filterChipSecondaryActive]}
              onPress={() => setPrivacyFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipSecondaryText,
                  privacyFilter === filter && styles.filterChipSecondaryTextActive,
                ]}
              >
                {filter === 'all' ? 'All Visibility' : filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.active}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.privateGroups}</Text>
          <Text style={styles.summaryLabel}>Private</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.members}</Text>
          <Text style={styles.summaryLabel}>Members</Text>
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroup}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="people" size={56} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No study groups found</Text>
            <Text style={styles.emptyText}>
              Adjust the filters or search terms to view more groups.
            </Text>
          </View>
        }
      />

      <Modal
        visible={Boolean(selectedGroup)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedGroup(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Group</Text>
              <TouchableOpacity onPress={() => setSelectedGroup(null)}>
                <Icon name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedGroup ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalGroupTitle}>{selectedGroup.name}</Text>
                <Text style={styles.modalGroupDescription}>
                  {selectedGroup.description || 'No description provided.'}
                </Text>

                <View style={styles.modalInfoGrid}>
                  <View style={styles.modalInfoCard}>
                    <Text style={styles.modalInfoLabel}>Creator</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedGroup.created_by_name || selectedGroup.created_by_email || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.modalInfoCard}>
                    <Text style={styles.modalInfoLabel}>Members</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedGroup.member_count}/{selectedGroup.max_members}
                    </Text>
                  </View>
                  <View style={styles.modalInfoCard}>
                    <Text style={styles.modalInfoLabel}>Visibility</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedGroup.is_public ? 'Public' : 'Private'}
                    </Text>
                  </View>
                  <View style={styles.modalInfoCard}>
                    <Text style={styles.modalInfoLabel}>Created</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedGroup.created_at ? new Date(selectedGroup.created_at).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.inviteToggle}
                  disabled={updating}
                  onPress={() => void handleInvitesToggle(selectedGroup)}
                >
                  <View style={styles.inviteToggleText}>
                    <Text style={styles.inviteToggleTitle}>Member Invites</Text>
                    <Text style={styles.inviteToggleDescription}>
                      {selectedGroup.allow_member_invites
                        ? 'Members can invite others into this group.'
                        : 'Only admins can add people to this group.'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.inviteToggleBadge,
                      selectedGroup.allow_member_invites && styles.inviteToggleBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.inviteToggleBadgeText,
                        selectedGroup.allow_member_invites && styles.inviteToggleBadgeTextActive,
                      ]}
                    >
                      {selectedGroup.allow_member_invites ? 'On' : 'Off'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <Text style={styles.modalSectionTitle}>Status</Text>
                <View style={styles.statusActions}>
                  {(['active', 'archived', 'completed'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      disabled={updating}
                      style={[
                        styles.statusActionButton,
                        selectedGroup.status === status && styles.statusActionButtonActive,
                      ]}
                      onPress={() => void handleStatusChange(selectedGroup, status)}
                    >
                      <Text
                        style={[
                          styles.statusActionText,
                          selectedGroup.status === status && styles.statusActionTextActive,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {updating ? (
                  <View style={styles.inlineLoader}>
                    <ActivityIndicator size="small" color={colors.primary[500]} />
                    <Text style={styles.inlineLoaderText}>Updating group...</Text>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[3],
    color: colors.text.secondary,
    fontSize: 14,
  },
  header: {
    backgroundColor: colors.primary[500],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  searchSection: {
    padding: spacing[4],
    gap: spacing[3],
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  filterRow: {
    gap: spacing[2],
  },
  filterChip: {
    backgroundColor: colors.card.light,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
  },
  filterChipText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },
  filterChipSecondary: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  filterChipSecondaryActive: {
    backgroundColor: colors.accent[500] + '22',
  },
  filterChipSecondaryText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipSecondaryTextActive: {
    color: colors.accent[600],
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3],
    ...shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  summaryLabel: {
    marginTop: spacing[1],
    fontSize: 12,
    color: colors.text.secondary,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border.light,
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  groupCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitleBlock: {
    flex: 1,
    marginLeft: spacing[3],
    marginRight: spacing[2],
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  groupMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.text.secondary,
  },
  statusBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  groupDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  groupPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  metaPillText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[4],
  },
  creatorText: {
    flex: 1,
    marginRight: spacing[3],
    fontSize: 12,
    color: colors.text.tertiary,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[12],
  },
  emptyTitle: {
    marginTop: spacing[4],
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptyText: {
    marginTop: spacing[2],
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '85%',
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[8],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalGroupTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalGroupDescription: {
    marginTop: spacing[2],
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.secondary,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  modalInfoCard: {
    width: '47%',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  modalInfoLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  modalInfoValue: {
    marginTop: spacing[1],
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  inviteToggle: {
    marginTop: spacing[4],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  inviteToggleText: {
    flex: 1,
  },
  inviteToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  inviteToggleDescription: {
    marginTop: spacing[1],
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  inviteToggleBadge: {
    minWidth: 52,
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.background.secondary,
  },
  inviteToggleBadgeActive: {
    backgroundColor: colors.success + '18',
  },
  inviteToggleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  inviteToggleBadgeTextActive: {
    color: colors.success,
  },
  modalSectionTitle: {
    marginTop: spacing[5],
    marginBottom: spacing[3],
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statusActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  statusActionButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  statusActionButtonActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  statusActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  statusActionTextActive: {
    color: colors.text.inverse,
  },
  inlineLoader: {
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  inlineLoaderText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
});

export default StudyGroupsScreen;
