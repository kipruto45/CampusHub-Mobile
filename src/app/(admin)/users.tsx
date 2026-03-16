// Admin Users Management for CampusHub
// Manage users, roles, and account statuses

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import { adminAPI } from '../../services/api';

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
      Alert.alert('Success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => router.push(`/(admin)/user-detail?id=${item.id}`)}
      activeOpacity={0.7}
    >
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
    justifyContent: 'center',
    padding: spacing[4],
    paddingTop: spacing[8],
    backgroundColor: colors.primary[500],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
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
