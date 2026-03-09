// My Uploads Screen for CampusHub
// User's uploaded resources - Backend-driven

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { userUploadsAPI } from '../../services/api';

// Types
interface UploadItem {
  id: string;
  title: string;
  description?: string;
  resource_type: string;
  file_size: number;
  status: 'published' | 'draft' | 'pending' | 'rejected';
  view_count: number;
  download_count: number;
  average_rating: number;
  created_at: string;
  rejection_reason?: string;
}

type TabType = 'all' | 'published' | 'pending' | 'rejected' | 'draft';

const MyUploadsScreen: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUploads = useCallback(async () => {
    try {
      setError(null);
      const params: any = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      
      const response = await userUploadsAPI.list(params);
      const data = response.data?.data?.results || response.data?.data || response.data || [];
      setUploads(data);
    } catch (err: any) {
      console.error('Error fetching uploads:', err);
      setError(err.response?.data?.message || 'Failed to load your uploads');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUploads();
    setRefreshing(false);
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: uploads.length },
    { key: 'published', label: 'Published', count: uploads.filter(u => u.status === 'published').length },
    { key: 'pending', label: 'Pending', count: uploads.filter(u => u.status === 'pending').length },
    { key: 'rejected', label: 'Rejected', count: uploads.filter(u => u.status === 'rejected').length },
    { key: 'draft', label: 'Drafts', count: uploads.filter(u => u.status === 'draft').length },
  ];

  const filteredUploads = uploads.filter(u => {
    const matchesSearch = u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.resource_type?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffDays < 1) return 'Today';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return colors.success;
      case 'draft': return colors.gray[500];
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      default: return colors.gray[500];
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Approved';
      case 'pending': return 'Pending Review';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pdf': return 'document-text';
      case 'video':
      case 'mp4': return 'videocam';
      case 'doc':
      case 'docx': return 'document';
      case 'ppt':
      case 'pptx': return 'play-circle';
      default: return 'document';
    }
  };

  const handleEdit = (id: string, title: string) => {
    Alert.alert('Edit Resource', `Edit "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => {
        router.push(`/edit-resource/${id}` as any);
      }}
    ]);
  };

  const handleDelete = async (id: string, title: string) => {
    Alert.alert(
      'Delete Resource', 
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await userUploadsAPI.delete(id);
              setUploads(uploads.filter(u => u.id !== id));
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete resource');
            }
          }
        }
      ]
    );
  };

  const handleViewRejection = (reason: string) => {
    Alert.alert('Rejection Reason', reason, [{ text: 'OK' }]);
  };

  const renderItem = ({ item }: { item: UploadItem }) => (
    <TouchableOpacity 
      style={styles.uploadCard}
      onPress={() => router.push(`/(student)/resource/${item.id}`)}
    >
      <View style={styles.thumbnail}>
        <Icon name={getTypeIcon(item.resource_type) as any} size={28} color={colors.primary[500]} />
      </View>
      <View style={styles.uploadInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.uploadTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.uploadMeta}>
          {item.resource_type} • {formatFileSize(item.file_size)} • {formatDate(item.created_at)}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="eye" size={12} color={colors.text.secondary} />
            <Text style={styles.statText}>{item.view_count || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="download" size={12} color={colors.primary[500]} />
            <Text style={styles.statText}>{item.download_count || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="star" size={12} color={colors.warning} />
            <Text style={styles.statText}>{item.average_rating?.toFixed(1) || '0'}</Text>
          </View>
        </View>
        {item.status === 'rejected' && item.rejection_reason && (
          <TouchableOpacity 
            style={styles.rejectionLink}
            onPress={() => handleViewRejection(item.rejection_reason!)}
          >
            <Text style={styles.rejectionText}>View rejection reason</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => handleEdit(item.id, item.title)}
        >
          <Icon name="create" size={18} color={colors.primary[500]} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => handleDelete(item.id, item.title)}
        >
          <Icon name="trash" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="cloud-upload" size={64} color={colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Uploads Yet</Text>
      <Text style={styles.emptyText}>
        Start uploading resources to share with your classmates
      </Text>
      <TouchableOpacity 
        style={styles.uploadButton}
        onPress={() => router.push('/(student)/upload-resource')}
      >
        <Icon name="cloud-upload" size={20} color={colors.text.inverse} />
        <Text style={styles.uploadButtonText}>Upload Resource</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Icon name="alert-circle" size={48} color={colors.error} />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchUploads}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
      <Text style={styles.loadingText}>Loading uploads...</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Uploads</Text>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => router.push('/(student)/upload-resource')}
          >
            <Icon name="add" size={24} color={colors.primary[500]} />
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>My Uploads</Text>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => router.push('/(student)/upload-resource')}
        >
          <Icon name="add" size={24} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color={colors.text.tertiary} />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search uploads..." 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.text.tertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <FlatList
        horizontal
        data={tabs}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.tab, activeTab === item.key && styles.activeTab]}
            onPress={() => setActiveTab(item.key)}
          >
            <Text style={[styles.tabText, activeTab === item.key && styles.activeTabText]}>
              {item.label}
            </Text>
            <View style={[styles.tabBadge, activeTab === item.key && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, activeTab === item.key && styles.activeTabBadgeText]}>
                {item.count}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.tabsContainer}
        showsHorizontalScrollIndicator={false}
      />

      {/* Content */}
      {error ? (
        renderError()
      ) : (
        <FlatList
          data={filteredUploads}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
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
  addBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.primary[50],
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.card.light, 
    marginHorizontal: spacing[4], 
    marginTop: spacing[3],
    paddingHorizontal: spacing[4], 
    borderRadius: 12, 
    gap: spacing[2],
  },
  searchInput: { 
    flex: 1, 
    paddingVertical: spacing[3], 
    fontSize: 15, 
    color: colors.text.primary,
  },
  tabsContainer: { 
    padding: spacing[4], 
    gap: spacing[2] 
  },
  tab: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4], 
    paddingVertical: spacing[2], 
    borderRadius: 20, 
    backgroundColor: colors.card.light,
    marginRight: spacing[2],
    gap: spacing[2],
  },
  activeTab: { 
    backgroundColor: colors.primary[500] 
  },
  tabText: { 
    fontSize: 13, 
    fontWeight: '500', 
    color: colors.text.secondary 
  },
  activeTabText: { 
    color: colors.text.inverse 
  },
  tabBadge: { 
    backgroundColor: colors.background.secondary, 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 10,
  },
  activeTabBadge: { 
    backgroundColor: colors.primary[700] 
  },
  tabBadgeText: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: colors.text.secondary 
  },
  activeTabBadgeText: { 
    color: colors.text.inverse 
  },
  list: { 
    paddingHorizontal: spacing[4], 
    paddingBottom: spacing[10], 
    flexGrow: 1 
  },
  uploadCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.card.light, 
    padding: spacing[4], 
    borderRadius: 16, 
    marginBottom: spacing[3], 
    ...shadows.sm 
  },
  thumbnail: { 
    width: 56, 
    height: 56, 
    borderRadius: 14, 
    backgroundColor: colors.primary[50], 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  uploadInfo: { 
    flex: 1, 
    marginLeft: spacing[3] 
  },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  uploadTitle: { 
    flex: 1,
    fontSize: 15, 
    fontWeight: '600', 
    color: colors.text.primary,
    marginRight: spacing[2],
  },
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 8,
  },
  statusText: { 
    fontSize: 10, 
    fontWeight: '600' 
  },
  uploadMeta: { 
    fontSize: 12, 
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  statsRow: { 
    flexDirection: 'row', 
    gap: spacing[4] 
  },
  statItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  statText: { 
    fontSize: 12, 
    color: colors.text.secondary 
  },
  rejectionLink: { 
    marginTop: spacing[2] 
  },
  rejectionText: { 
    fontSize: 12, 
    color: colors.error,
    textDecorationLine: 'underline',
  },
  actions: { 
    flexDirection: 'row', 
    gap: spacing[2] 
  },
  actionBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 60,
    paddingHorizontal: spacing[6],
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: colors.text.primary, 
    marginBottom: spacing[2] 
  },
  emptyText: { 
    fontSize: 14, 
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 12,
    gap: spacing[2],
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: spacing[6] 
  },
  errorText: { 
    fontSize: 14, 
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[4],
  },
  retryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: spacing[3] 
  },
  loadingText: { 
    fontSize: 14, 
    color: colors.text.secondary 
  },
});

export default MyUploadsScreen;
