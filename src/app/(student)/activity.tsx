// Activity Screen for CampusHub
// Recent user activity with filters and stats - Backend-driven

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { userAPI, activityStatsAPI } from '../../services/api';

// Activity Types - matching backend response
interface Activity {
  id: string;
  type: 'view' | 'download' | 'upload' | 'comment' | 'rate' | 'save' | 'share' | 'folder';
  title: string;
  description?: string;
  created_at: string;
  resource_id?: string;
  icon: string;
}

interface ActivityStats {
  total_views: number;
  total_downloads: number;
  total_uploads: number;
  hours_active: number;
}

const ActivityScreen: React.FC = () => {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'views' | 'downloads' | 'uploads'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch both activity and stats in parallel
      const [activityResponse, statsResponse] = await Promise.all([
        userAPI.getActivity({ page: 1 }),
        activityStatsAPI.getStats(),
      ]);
      
      const activityData = activityResponse.data?.data?.results || activityResponse.data?.data || activityResponse.data || [];
      const statsData = statsResponse.data?.data || statsResponse.data || null;
      
      setActivities(activityData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching activity data:', err);
      setError(err.response?.data?.message || 'Failed to load activity data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filters = [
    { key: 'all', label: 'All Activity', icon: 'apps' },
    { key: 'views', label: 'Views', icon: 'eye' },
    { key: 'downloads', label: 'Downloads', icon: 'download' },
    { key: 'uploads', label: 'Uploads', icon: 'cloud-upload' },
  ];

  const filteredActivity = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'views') return activity.type === 'view';
    if (filter === 'downloads') return activity.type === 'download';
    if (filter === 'uploads') return activity.type === 'upload' || activity.type === 'folder';
    return true;
  });

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'view': return colors.info;
      case 'download': return colors.primary[500];
      case 'upload': return colors.success;
      case 'comment': return colors.accent[500];
      case 'rate': return colors.warning;
      case 'save': return colors.error;
      case 'share': return colors.accent[300];
      case 'folder': return colors.gray[500];
      default: return colors.primary[500];
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'view': return 'eye';
      case 'download': return 'download';
      case 'upload': return 'cloud-upload';
      case 'comment': return 'chatbubbles';
      case 'rate': return 'star';
      case 'save': return 'heart';
      case 'share': return 'share-social';
      case 'folder': return 'folder';
      default: return 'ellipsis-horizontal';
    }
  };

  const renderItem = ({ item }: { item: Activity }) => (
    <TouchableOpacity 
      style={styles.activityCard}
      onPress={() => item.resource_id && router.push(`/(student)/resource/${item.resource_id}`)}
    >
      <View style={[styles.activityIcon, { backgroundColor: getActivityColor(item.type) + '20' }]}>
        <Icon name={getActivityIcon(item.type) as any} size={20} color={getActivityColor(item.type)} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.activityDescription} numberOfLines={1}>{item.description}</Text>
        )}
        <Text style={styles.activityTime}>{formatTime(item.created_at)}</Text>
      </View>
      <Icon name="chevron-forward" size={16} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="time" size={48} color={colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Activity Yet</Text>
      <Text style={styles.emptyText}>Your recent activity will appear here</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Icon name="alert-circle" size={48} color={colors.error} />
      </View>
      <Text style={styles.errorTitle}>Unable to Load Activity</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
        <Icon name="refresh" size={18} color={colors.text.inverse} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
      <Text style={styles.loadingText}>Loading activity...</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle}>Your Stats</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.info + '20' }]}>
            <Icon name="eye" size={20} color={colors.info} />
          </View>
          <Text style={styles.statValue}>{stats?.total_views || 0}</Text>
          <Text style={styles.statLabel}>Views</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.primary[500] + '20' }]}>
            <Icon name="download" size={20} color={colors.primary[500]} />
          </View>
          <Text style={styles.statValue}>{stats?.total_downloads || 0}</Text>
          <Text style={styles.statLabel}>Downloads</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.success + '20' }]}>
            <Icon name="cloud-upload" size={20} color={colors.success} />
          </View>
          <Text style={styles.statValue}>{stats?.total_uploads || 0}</Text>
          <Text style={styles.statLabel}>Uploads</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.warning + '20' }]}>
            <Icon name="time" size={20} color={colors.warning} />
          </View>
          <Text style={styles.statValue}>{stats?.hours_active || 0}</Text>
          <Text style={styles.statLabel}>Hours</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recent Activity</Text>
          <View style={styles.placeholder} />
        </View>
        {renderLoading()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recent Activity</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={onRefresh}>
          <Icon name="refresh" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity 
            key={f.key} 
            style={[styles.filterTab, filter === f.key && styles.activeFilterTab]}
            onPress={() => setFilter(f.key as any)}
          >
            <Icon 
              name={f.icon as any} 
              size={14} 
              color={filter === f.key ? colors.text.inverse : colors.text.secondary} 
            />
            <Text style={[styles.filterText, filter === f.key && styles.activeFilterText]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        renderError()
      ) : (
        <FlatList
          data={filteredActivity}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
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
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing[4], 
    paddingTop: spacing[10], 
    paddingBottom: spacing[4], 
    backgroundColor: colors.card.light, 
    ...shadows.sm 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  headerTitle: { 
    flex: 1, 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary, 
    textAlign: 'center' 
  },
  filterBtn: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
  },
  placeholder: { width: 40 },
  filterContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: spacing[4], 
    paddingVertical: spacing[3], 
    backgroundColor: colors.card.light,
    gap: spacing[2],
  },
  filterTab: { 
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2], 
    paddingHorizontal: spacing[2],
    borderRadius: 12, 
    backgroundColor: colors.background.secondary,
    gap: spacing[1],
  },
  activeFilterTab: { 
    backgroundColor: colors.primary[500] 
  },
  filterText: { 
    fontSize: 12, 
    fontWeight: '500', 
    color: colors.text.secondary 
  },
  activeFilterText: { 
    color: colors.text.inverse 
  },
  statsSection: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  statsContainer: { 
    flexDirection: 'row', 
    gap: spacing[2],
  },
  statCard: { 
    flex: 1, 
    backgroundColor: colors.card.light, 
    borderRadius: 16, 
    padding: spacing[3], 
    alignItems: 'center',
    ...shadows.sm,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  statValue: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: colors.text.primary 
  },
  statLabel: { 
    fontSize: 11, 
    color: colors.text.secondary, 
    marginTop: 2 
  },
  listContent: { 
    paddingHorizontal: spacing[4], 
    paddingBottom: spacing[10], 
    flexGrow: 1 
  },
  activityCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.card.light, 
    padding: spacing[4], 
    borderRadius: 16, 
    marginBottom: spacing[3], 
    ...shadows.sm,
  },
  activityIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  activityInfo: { 
    flex: 1, 
    marginLeft: spacing[3] 
  },
  activityTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.text.primary 
  },
  activityDescription: { 
    fontSize: 12, 
    color: colors.text.secondary, 
    marginTop: 2 
  },
  activityTime: { 
    fontSize: 11, 
    color: colors.text.tertiary, 
    marginTop: 2 
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 60 
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary, 
    marginBottom: spacing[2] 
  },
  emptyText: { 
    fontSize: 14, 
    color: colors.text.secondary 
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 60,
    paddingHorizontal: spacing[6],
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  errorTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary, 
    marginBottom: spacing[2] 
  },
  errorText: { 
    fontSize: 14, 
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 12,
    gap: spacing[2],
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});

export default ActivityScreen;
