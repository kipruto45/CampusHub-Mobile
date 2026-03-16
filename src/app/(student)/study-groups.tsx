// Study Groups Screen for CampusHub
// Browse and manage study groups

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { studyGroupsAPI } from '../../services/api';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  course?: { id: string; name: string };
  member_count: number;
  max_members: number;
  is_public: boolean;
  created_by: { id: string; first_name: string; last_name: string };
  created_at: string;
}

const StudyGroupsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'my' | 'public'>('all');

  const fetchGroups = useCallback(async () => {
    try {
      const response = await studyGroupsAPI.list({
        scope: selectedFilter,
        search: searchQuery || undefined,
      });
      const payload = response.data.data;
      setGroups(payload?.results || payload || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedFilter]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const handleGroupPress = (groupId: string) => {
    router.push(`/(student)/study-group/${groupId}` as any);
  };

  const handleCreateGroup = () => {
    router.push('/(student)/create-study-group' as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading study groups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Groups</Text>
        <TouchableOpacity onPress={handleCreateGroup} style={styles.addButton}>
          <Icon name="add" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {(['all', 'my', 'public'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, selectedFilter === filter && styles.filterButtonActive]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>
              {filter === 'all' ? 'All Groups' : filter === 'my' ? 'My Groups' : 'Public'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {/* Groups List */}
        {groups.length > 0 ? (
          groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => handleGroupPress(group.id)}
            >
              <View style={styles.groupHeader}>
                <View style={styles.groupIcon}>
                  <Icon name="people" size={24} color={colors.primary[500]} />
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupCourse} numberOfLines={1}>
                    {group.course?.name || 'General'}
                  </Text>
                </View>
                {!group.is_public && (
                  <View style={styles.privateBadge}>
                    <Icon name="lock-closed" size={12} color={colors.text.secondary} />
                  </View>
                )}
              </View>
              <Text style={styles.groupDescription} numberOfLines={2}>
                {group.description}
              </Text>
              <View style={styles.groupFooter}>
                <View style={styles.memberCount}>
                  <Icon name="people" size={14} color={colors.text.secondary} />
                  <Text style={styles.memberText}>
                    {group.member_count}/{group.max_members} members
                  </Text>
                </View>
                <Text style={styles.createdBy}>
                  by {group.created_by?.first_name || 'Unknown'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="people" size={60} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Study Groups Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search term' : 'Create a study group to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
                <Icon name="add" size={20} color={colors.text.inverse} />
                <Text style={styles.createButtonText}>Create Group</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: 14,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    backgroundColor: colors.primary[500],
  },
  backButton: {
    padding: spacing[2],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  addButton: {
    padding: spacing[2],
  },
  searchContainer: {
    padding: spacing[4],
    backgroundColor: colors.primary[500],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: 14,
    color: colors.text.primary,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.primary[500],
  },
  filterButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterButtonActive: {
    backgroundColor: colors.background.primary,
  },
  filterText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.primary[500],
  },
  content: {
    padding: spacing[4],
  },
  groupCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  groupCourse: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  privateBadge: {
    padding: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.full,
  },
  groupDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: spacing[1],
  },
  createdBy: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[10],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing[4],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.full,
    marginTop: spacing[4],
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
    marginLeft: spacing[2],
  },
});

export default StudyGroupsScreen;
