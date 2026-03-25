// Admin Users Management for CampusHub
// Manage users, roles, and account statuses

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import { adminAPI } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { strings } from '../../constants/strings';

interface User {
  id: string;
  email: string;
  full_name?: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  date_joined: string;
  profile?: {
    avatar?: string;
    department?: string;
  };
}

const UsersScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const { showToast } = useToast();

  const fetchUsers = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setError(null);
      }
      
      const params: any = { page: pageNum, page_size: 20 };
      if (searchQuery) {
        params.search = searchQuery;
      }
      if (selectedFilter === 'active') {
        params.is_active = true;
      } else if (selectedFilter === 'inactive') {
        params.is_active = false;
      }

      const response = await adminAPI.listUsers(params);
      const results = response.data?.data?.results || [];
      
      if (isRefresh || pageNum === 1) {
        setUsers(results);
        setSelectedIds(new Set());
      } else {
        setUsers(prev => [...prev, ...results]);
      }
      
      setHasMore(results.length === 20);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedFilter]);

  useEffect(() => {
    fetchUsers(1, true);
  }, [searchQuery, selectedFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers(1, true);
  }, [fetchUsers]);

  const loadMore = useCallback(() => {
    if (!loading && !refreshing && hasMore) {
      fetchUsers(page + 1);
    }
  }, [loading, refreshing, hasMore, page, fetchUsers]);

  const toggleSelect = useCallback((userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const handleRetry = useCallback(() => {
    setLoading(true);
    fetchUsers(1, true);
  }, []);

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminAPI.updateUserStatus(userId, !currentStatus);
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_active: !currentStatus } : u
      ));
      showToast('success', !currentStatus ? strings.users.activate : strings.users.deactivate);
    } catch (err: any) {
      showToast('error', strings.users.updateFailed);
    }
  };

  const handleBulkStatus = async (isActive: boolean) => {
    if (!selectedIds.size) {
      showToast('info', strings.users.bulkSelectPrompt);
      return;
    }
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => adminAPI.updateUserStatus(id, isActive)));
      setUsers((prev) =>
        prev.map((u) => (selectedIds.has(u.id) ? { ...u, is_active: isActive } : u))
      );
      showToast('success', isActive ? strings.users.bulkActivate : strings.users.bulkDeactivate);
      setSelectedIds(new Set());
    } catch (err) {
      showToast('error', strings.users.updateFailed);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkRole = async (role: string) => {
    if (!selectedIds.size) {
      showToast('info', strings.users.bulkSelectPrompt);
      return;
    }
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => adminAPI.updateUserRole(id, role)));
      setUsers((prev) =>
        prev.map((u) => (selectedIds.has(u.id) ? { ...u, role } : u))
      );
      showToast('success', strings.users.bulkRoleUpdate);
      setSelectedIds(new Set());
    } catch (err) {
      showToast('error', strings.users.roleUpdateFailed);
    } finally {
      setBulkLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity 
        style={[styles.userCard, isSelected && styles.userCardSelected]}
        onPress={() => router.push(`/(admin)/user-detail?id=${item.id}`)}
        onLongPress={() => toggleSelect(item.id)}
        activeOpacity={0.85}
      >
        <TouchableOpacity style={styles.selectPill} onPress={() => toggleSelect(item.id)}>
          <Icon name={isSelected ? 'checkbox' : 'square-outline'} size={18} color={isSelected ? colors.primary[500] : colors.text.tertiary} />
        </TouchableOpacity>
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>
            {item.first_name?.[0] || item.email[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.full_name || `${item.first_name} ${item.last_name}`.trim()}
          </Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <View style={[styles.badge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
              <Text style={[styles.badgeText, { color: getRoleColor(item.role) }]}>
                {item.role || 'Student'}
              </Text>
            </View>
            {item.is_verified && (
              <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.success }]}>Verified</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.statusButton, item.is_active ? styles.activeButton : styles.inactiveButton]}
          onPress={() => handleToggleUserStatus(item.id, item.is_active)}
        >
          <Text style={[styles.statusButtonText, item.is_active ? styles.activeText : styles.inactiveText]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return colors.error;
      case 'staff':
        return colors.warning;
      case 'instructor':
        return colors.primary[500];
      default:
        return colors.info;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !users.length) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load Users"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Users Management</Text>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => router.push('/(admin)/invitations')}
        >
          <Icon name="mail-unread" size={16} color={colors.text.inverse} />
          <Text style={styles.inviteButtonText}>Invitations</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterTabs}>
          {(['all', 'active', 'inactive'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, selectedFilter === filter && styles.filterTabActive]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[styles.filterTabText, selectedFilter === filter && styles.filterTabTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bulk actions */}
      <View style={styles.bulkBar}>
        <Text style={styles.bulkText}>{selectedIds.size} selected</Text>
        <View style={styles.bulkActions}>
          <TouchableOpacity
            style={[styles.bulkButton, styles.bulkPrimary, bulkLoading && styles.bulkDisabled]}
            onPress={() => handleBulkStatus(true)}
            disabled={bulkLoading}
          >
            <Text style={styles.bulkButtonText}>Activate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkButton, styles.bulkDanger, bulkLoading && styles.bulkDisabled]}
            onPress={() => handleBulkStatus(false)}
            disabled={bulkLoading}
          >
            <Text style={styles.bulkButtonText}>Deactivate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkButton, styles.bulkOutline, bulkLoading && styles.bulkDisabled]}
            onPress={() => handleBulkRole('instructor')}
            disabled={bulkLoading}
          >
            <Text style={[styles.bulkButtonText, styles.bulkTextDark]}>Set Instructor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkButton, styles.bulkOutline, bulkLoading && styles.bulkDisabled]}
            onPress={() => handleBulkRole('student')}
            disabled={bulkLoading}
          >
            <Text style={[styles.bulkButtonText, styles.bulkTextDark]}>Set Student</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="people" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    paddingTop: spacing[8],
    backgroundColor: colors.primary[500],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  inviteButtonText: {
    color: colors.text.inverse,
    fontWeight: '700',
    fontSize: 13,
  },
  filterContainer: {
    padding: spacing[4],
    backgroundColor: colors.background.primary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: 16,
    color: colors.text.primary,
  },
  filterTabs: {
    flexDirection: 'row',
    marginTop: spacing[3],
    gap: spacing[2],
  },
  filterTab: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
  },
  filterTabActive: {
    backgroundColor: colors.primary[500],
  },
  filterTabText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.text.inverse,
  },
  bulkBar: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  bulkText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  bulkActions: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    justifyContent: 'flex-end',
  },
  bulkButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  bulkPrimary: {
    backgroundColor: colors.success,
  },
  bulkDanger: {
    backgroundColor: colors.error,
  },
  bulkOutline: {
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  bulkDisabled: {
    opacity: 0.5,
  },
  bulkButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  bulkTextDark: {
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing[4],
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  userCardSelected: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    backgroundColor: colors.primary[50],
  },
  selectPill: {
    marginRight: spacing[2],
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    marginTop: spacing[2],
    gap: spacing[2],
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  statusButtonText: {
    fontWeight: '600',
    fontSize: 12,
  },
  activeButton: {
    backgroundColor: colors.success + '20',
  },
  inactiveButton: {
    backgroundColor: colors.error + '20',
  },
  activeText: {
    color: colors.success,
    fontWeight: '600',
    fontSize: 12,
  },
  inactiveText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.tertiary,
    marginTop: spacing[2],
  },
});

export default UsersScreen;
