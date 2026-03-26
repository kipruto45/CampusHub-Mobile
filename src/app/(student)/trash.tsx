// Trash Screen for CampusHub
// Deleted files management with restore and permanent delete - Backend-driven

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,Alert,FlatList,RefreshControl,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import Icon from '../../components/ui/Icon';
import { trashAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';

// Trash Item Types - matching backend response
interface TrashItem {
  id: string;
  name: string;
  file_type: string;
  deleted_at: string;
  size: number;
  days_remaining: number;
  original_path?: string;
}

const TrashScreen: React.FC = () => {
  const router = useRouter();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrashItems = useCallback(async () => {
    try {
      setError(null);
      const response = await trashAPI.list({ page: 1 });
      const data = response.data?.data?.results || response.data?.data || response.data || [];
      setItems(data);
    } catch (err: any) {
      console.error('Error fetching trash items:', err);
      setError(err.response?.data?.message || 'Failed to load trash items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrashItems();
  }, [fetchTrashItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrashItems();
    setRefreshing(false);
  };

  const totalSize = items.reduce((acc, item) => acc + (item.size || 0), 0);

  const formatSize = (bytes: number) => {
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

  const handleRestore = async (id: string) => {
    Alert.alert(
      'Restore File',
      'This file will be moved back to your library.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore', 
          onPress: async () => {
            try {
              await trashAPI.restore(id);
              setItems(items.filter(item => item.id !== id));
              Alert.alert('Success', 'File restored to your library!');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to restore file');
            }
          }
        }
      ]
    );
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Permanently',
      'This action cannot be undone. The file will be removed forever.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await trashAPI.permanentDelete(id);
              setItems(items.filter(item => item.id !== id));
              Alert.alert('Deleted', 'File has been permanently deleted.');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete file');
            }
          }
        }
      ]
    );
  };

  const handleRestoreAll = async () => {
    if (items.length === 0) return;
    
    Alert.alert(
      'Restore All Files',
      `This will restore all ${items.length} files (${formatSize(totalSize)}) back to your library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore All', 
          onPress: async () => {
            try {
              await trashAPI.restoreAll();
              setItems([]);
              Alert.alert('Success', 'All files restored to your library!');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to restore files');
            }
          }
        }
      ]
    );
  };

  const handleEmptyTrash = async () => {
    if (items.length === 0) return;
    
    Alert.alert(
      'Empty Trash',
      `This will permanently delete all ${items.length} items (${formatSize(totalSize)}). This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await trashAPI.emptyAll();
              setItems([]);
              Alert.alert('Done', 'Trash has been emptied.');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to empty trash');
            }
          }
        }
      ]
    );
  };

  const getFileIcon = (type: string) => {
    const fileType = type?.toLowerCase() || '';
    switch (fileType) {
      case 'pdf': return 'document-text';
      case 'doc':
      case 'docx': return 'document';
      case 'ppt':
      case 'pptx': return 'presentation';
      case 'xls':
      case 'xlsx': return 'grid';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'image': return 'image';
      case 'video':
      case 'mp4': return 'videocam';
      case 'audio':
      case 'mp3': return 'musical-note';
      default: return 'document';
    }
  };

  const getFileColor = (type: string) => {
    const fileType = type?.toLowerCase() || '';
    switch (fileType) {
      case 'pdf': return colors.error;
      case 'doc':
      case 'docx': return colors.info;
      case 'ppt':
      case 'pptx': return colors.warning;
      case 'xls':
      case 'xlsx': return colors.success;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'image': return colors.accent[500];
      case 'video':
      case 'mp4': return colors.accent[300];
      default: return colors.gray[500];
    }
  };

  const renderItem = ({ item }: { item: TrashItem }) => (
    <View style={styles.itemCard}>
      <View style={[styles.itemIcon, { backgroundColor: getFileColor(item.file_type) + '20' }]}>
        <Icon name={getFileIcon(item.file_type) as any} size={24} color={getFileColor(item.file_type)} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.itemMetaRow}>
          <Text style={styles.itemMeta}>{formatSize(item.size)}</Text>
          <Text style={styles.itemMetaDivider}>•</Text>
          <Text style={styles.itemMeta}>{item.file_type?.toUpperCase() || 'File'}</Text>
          <Text style={styles.itemMetaDivider}>•</Text>
          <Text style={styles.itemMeta}>Deleted {formatDate(item.deleted_at)}</Text>
        </View>
        <View style={styles.daysRemainingContainer}>
          <Icon name="time" size={12} color={item.days_remaining <= 7 ? colors.error : colors.text.tertiary} />
          <Text style={[styles.daysRemaining, item.days_remaining <= 7 && styles.daysRemainingCritical]}>
            {item.days_remaining || 0} days remaining
          </Text>
        </View>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={styles.restoreBtn} 
          onPress={() => handleRestore(item.id)}
        >
          <Icon name="refresh" size={18} color={colors.success} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteBtn} 
          onPress={() => handleDelete(item.id)}
        >
          <Icon name="trash" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="checkmark-circle" size={64} color={colors.success} />
      </View>
      <Text style={styles.emptyTitle}>Trash is Empty</Text>
      <Text style={styles.emptyText}>
        Items you delete will appear here.{'\n'}
        They will be automatically deleted after 30 days.
      </Text>
      <View style={styles.emptyFeatures}>
        <View style={styles.featureItem}>
          <Icon name="shield-checkmark" size={18} color={colors.success} />
          <Text style={styles.featureText}>Safe & secure deletion</Text>
        </View>
        <View style={styles.featureItem}>
          <Icon name="time" size={18} color={colors.info} />
          <Text style={styles.featureText}>30-day retention period</Text>
        </View>
        <View style={styles.featureItem}>
          <Icon name="refresh" size={18} color={colors.primary[500]} />
          <Text style={styles.featureText}>Easy restore option</Text>
        </View>
      </View>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Icon name="alert-circle" size={48} color={colors.error} />
      </View>
      <Text style={styles.errorTitle}>Unable to Load Trash</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchTrashItems}>
        <Icon name="refresh" size={18} color={colors.text.inverse} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
      <Text style={styles.loadingText}>Loading trash...</Text>
    </View>
  );

  const renderHeader = () => (
    items.length > 0 && (
      <View style={styles.headerStats}>
        <View style={styles.statItem}>
          <Icon name="folder" size={20} color={colors.primary[500]} />
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>Items</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="cloud" size={20} color={colors.warning} />
          <Text style={styles.statValue}>{formatSize(totalSize)}</Text>
          <Text style={styles.statLabel}>Total Size</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="time" size={20} color={colors.error} />
          <Text style={styles.statValue}>30</Text>
          <Text style={styles.statLabel}>Day Limit</Text>
        </View>
      </View>
    )
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trash</Text>
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
        <Text style={styles.headerTitle}>Trash</Text>
        {items.length > 0 ? (
          <TouchableOpacity style={styles.emptyBtn} onPress={handleEmptyTrash}>
            <Text style={styles.emptyBtnText}>Empty</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Info Banner */}
      <View style={styles.banner}>
        <Icon name="information-circle" size={18} color={colors.info} />
        <Text style={styles.bannerText}>
          Items in trash are automatically deleted after 30 days
        </Text>
      </View>

      {/* Bulk Actions */}
      {items.length > 0 && (
        <View style={styles.bulkActions}>
          <TouchableOpacity 
            style={styles.bulkActionBtn}
            onPress={handleRestoreAll}
          >
            <Icon name="refresh" size={16} color={colors.success} />
            <Text style={styles.bulkActionText}>Restore All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.bulkActionBtn}
            onPress={handleEmptyTrash}
          >
            <Icon name="trash" size={16} color={colors.error} />
            <Text style={[styles.bulkActionText, { color: colors.error }]}>Delete All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {error ? (
        renderError()
      ) : (
        <FlatList
          data={items}
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
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background.primary 
  },
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
  emptyBtn: { 
    paddingHorizontal: spacing[3], 
    paddingVertical: spacing[2] 
  },
  emptyBtnText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.error 
  },
  placeholder: { 
    width: 40 
  },
  banner: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: colors.info + '15', 
    padding: spacing[3], 
    marginHorizontal: spacing[4], 
    marginTop: spacing[3], 
    borderRadius: 12,
    gap: spacing[2],
  },
  bannerText: { 
    flex: 1,
    fontSize: 12, 
    color: colors.info,
  },
  bulkActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  bulkActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card.light,
    padding: spacing[3],
    borderRadius: 12,
    gap: spacing[2],
  },
  bulkActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: colors.card.light,
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    marginBottom: spacing[2],
    padding: spacing[4],
    borderRadius: 16,
    ...shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border.light,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing[1],
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  listContent: { 
    paddingHorizontal: spacing[4], 
    paddingTop: spacing[2], 
    paddingBottom: spacing[10], 
    flexGrow: 1 
  },
  itemCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.card.light, 
    padding: spacing[4], 
    borderRadius: 16, 
    marginBottom: spacing[3], 
    ...shadows.sm 
  },
  itemIcon: { 
    width: 52, 
    height: 52, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  itemInfo: { 
    flex: 1, 
    marginLeft: spacing[3] 
  },
  itemName: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemMeta: { 
    fontSize: 12, 
    color: colors.text.secondary, 
  },
  itemMetaDivider: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginHorizontal: 6,
  },
  daysRemainingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: 4,
  },
  daysRemaining: { 
    fontSize: 11, 
    color: colors.text.tertiary 
  },
  daysRemainingCritical: {
    color: colors.error,
    fontWeight: '600',
  },
  itemActions: { 
    flexDirection: 'row', 
    gap: spacing[2] 
  },
  restoreBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: colors.success + '20', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  deleteBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: colors.error + '20', 
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
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  emptyTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: colors.text.primary, 
    marginBottom: spacing[3] 
  },
  emptyText: { 
    fontSize: 14, 
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 20,
  },
  emptyFeatures: {
    gap: spacing[3],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  featureText: {
    fontSize: 13,
    color: colors.text.secondary,
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

export default TrashScreen;
