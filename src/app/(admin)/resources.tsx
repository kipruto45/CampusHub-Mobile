// Admin Resources Management for CampusHub
// Review, moderate, and manage resources

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import { adminManagementAPI } from '../../services/api';

type ResourceStatus = 'pending' | 'approved' | 'rejected' | 'flagged' | 'archived';

interface Resource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  status: ResourceStatus;
  file_size: number;
  download_count: number;
  view_count: number;
  created_at: string;
  uploader: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
  course?: {
    id: string;
    name: string;
  };
  unit?: {
    id: string;
    name: string;
  };
}

const ResourcesScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<ResourceStatus | 'all'>('all');

  const fetchResources = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setError(null);
      }
      
      const params: any = { page: pageNum, page_size: 20 };
      if (selectedFilter !== 'all') {
        params.status = selectedFilter;
      }

      const response = await adminManagementAPI.listResources(params);
      const results = response.data?.data?.results || [];
      
      if (isRefresh || pageNum === 1) {
        setResources(results);
      } else {
        setResources(prev => [...prev, ...results]);
      }
      
      setHasMore(results.length === 20);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to fetch resources:', err);
      setError(err.response?.data?.message || 'Failed to load resources');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    fetchResources(1, true);
  }, [selectedFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResources(1, true);
  }, [fetchResources]);

  const loadMore = useCallback(() => {
    if (!loading && !refreshing && hasMore) {
      fetchResources(page + 1);
    }
  }, [loading, refreshing, hasMore, page, fetchResources]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    fetchResources(1, true);
  }, []);

  const handleUpdateStatus = async (resourceId: string, newStatus: ResourceStatus) => {
    try {
      if (newStatus === 'approved') {
        await adminManagementAPI.approveResource(resourceId);
      } else if (newStatus === 'rejected') {
        await adminManagementAPI.rejectResource(resourceId, 'Rejected by admin');
      }
      setResources(prev => prev.map(r => 
        r.id === resourceId ? { ...r, status: newStatus } : r
      ));
      Alert.alert('Success', `Resource ${newStatus} successfully`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update resource status');
    }
  };

  const handleFlagResource = async (resourceId: string) => {
    try {
      await adminManagementAPI.flagResource(resourceId, 'Flagged by admin');
      setResources(prev => prev.map(r => 
        r.id === resourceId ? { ...r, status: 'flagged' } : r
      ));
      Alert.alert('Success', 'Resource flagged successfully');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to flag resource');
    }
  };

  const handleArchiveResource = async (resourceId: string) => {
    Alert.alert(
      'Archive Resource',
      'Are you sure you want to archive this resource?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Archive', 
          onPress: async () => {
            try {
              await adminManagementAPI.archiveResource(resourceId, 'Archived by admin');
              setResources(prev => prev.map(r => 
                r.id === resourceId ? { ...r, status: 'archived' } : r
              ));
              Alert.alert('Success', 'Resource archived successfully');
            } catch (err: any) {
              Alert.alert('Error', 'Failed to archive resource');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: ResourceStatus) => {
    switch (status) {
      case 'approved':
        return colors.success;
      case 'rejected':
        return colors.error;
      case 'flagged':
        return colors.warning;
      case 'archived':
        return colors.text.tertiary;
      default:
        return colors.warning;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'notes':
      case 'past_paper':
      case 'assignment':
      case 'tutorial':
        return 'document';
      case 'slides':
        return 'presentation';
      case 'book':
        return 'book';
      default:
        return 'document';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderResourceItem = ({ item }: { item: Resource }) => (
    <TouchableOpacity
      style={styles.resourceCard}
      onPress={() => router.push(`/(admin)/resource-detail?id=${item.id}` as any)}
      activeOpacity={0.9}
    >
      <View style={[styles.typeIcon, { backgroundColor: colors.primary[500] + '20' }]}>
        <Icon name={getTypeIcon(item.resource_type) as any} size={24} color={colors.primary[500]} />
      </View>
      <View style={styles.resourceInfo}>
        <Text style={styles.resourceTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.resourceMeta}>
          {item.uploader?.first_name} {item.uploader?.last_name} • {formatFileSize(item.file_size)}
        </Text>
        <View style={styles.resourceFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.downloadCount}>
            <Icon name="download" size={12} color={colors.text.tertiary} /> {item.download_count}
          </Text>
        </View>
      </View>
      
      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.success + '20' }]}
            onPress={() => handleUpdateStatus(item.id, 'approved')}
          >
            <Icon name="checkmark" size={18} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.error + '20' }]}
            onPress={() => handleUpdateStatus(item.id, 'rejected')}
          >
            <Icon name="close" size={18} color={colors.error} />
          </TouchableOpacity>
          </View>
        )}
    </TouchableOpacity>
  );

  const filters: { key: ResourceStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !resources.length) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load Resources"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.title}>Resources Management</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{resources.filter(r => r.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.success }]}>{resources.filter(r => r.status === 'approved').length}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.error }]}>{resources.filter(r => r.status === 'rejected').length}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[styles.filterTab, selectedFilter === filter.key && styles.filterTabActive]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Text style={[styles.filterTabText, selectedFilter === filter.key && styles.filterTabTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resources List */}
      <FlatList
        data={resources}
        renderItem={renderResourceItem}
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
            <Icon name="document-text" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No resources found</Text>
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
  backButton: {
    padding: spacing[1],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  headerSpacer: {
    width: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[3],
    backgroundColor: colors.background.primary,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
    ...shadows.sm,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.warning,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
    backgroundColor: colors.background.primary,
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
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  resourceMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  resourceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: spacing[2],
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  downloadCount: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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

export default ResourcesScreen;
