import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import { downloadsAPI, resourcesAPI } from '../../services/api';
import { localDownloadsService } from '../../services/local-downloads.service';
import { libraryService } from '../../services/library.service';

interface DownloadItem {
  id: string;
  download_type: string;
  title: string;
  resource_id: string;
  personal_file_id: string;
  resource_type: string;
  file_type: string;
  file_url: string;
  created_at: string;
}

interface DownloadStats {
  total_downloads: number;
  unique_resources: number;
}

const DownloadsScreen: React.FC = () => {
  const router = useRouter();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [stats, setStats] = useState<DownloadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'open' | 'save' | null>(null);

  const applyDownloadPage = (payload: any, append: boolean) => {
    const results = (payload?.downloads || payload?.results || []) as DownloadItem[];
    setDownloads((prev) => (append ? [...prev, ...results] : results));
    setHasMore(Boolean(payload?.next));
    setNextPage((current) => (append ? current + 1 : 2));
  };

  const fetchInitialData = useCallback(async () => {
    try {
      setError(null);
      const [downloadsResponse, statsResponse] = await Promise.all([
        downloadsAPI.list({ page: 1, page_size: 20 }),
        downloadsAPI.stats(),
      ]);

      applyDownloadPage(downloadsResponse.data.data, false);
      setStats({
        total_downloads: downloadsResponse.data.data.count || statsResponse.data.data.total_downloads || 0,
        unique_resources: statsResponse.data.data.unique_resources || 0,
      });
    } catch (err: any) {
      console.error('Failed to load downloads:', err);
      setError(err.response?.data?.message || 'Failed to load your downloads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInitialData();
  }, [fetchInitialData]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) {
      return;
    }

    try {
      setLoadingMore(true);
      const response = await downloadsAPI.list({ page: nextPage, page_size: 20 });
      applyDownloadPage(response.data.data, true);
    } catch (err) {
      console.error('Failed to load more downloads:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, nextPage]);

  const buildDownloadKey = useCallback((item: DownloadItem) => {
    if (item.resource_id) return `resource:${item.resource_id}`;
    if (item.personal_file_id) return `personal-file:${item.personal_file_id}`;
    return `download:${item.id}`;
  }, []);

  const resolveDownloadSource = useCallback(async (item: DownloadItem, forceFresh: boolean = false) => {
    if (!forceFresh && item.file_url) {
      return {
        remoteUrl: item.file_url,
        fileName: undefined,
        fileType: item.file_type || item.resource_type,
      };
    }

    if (item.personal_file_id) {
      const payload = await libraryService.getDownloadUrl(item.personal_file_id);
      return {
        remoteUrl: payload.download_url || item.file_url,
        fileName: payload.file_name,
        fileType: payload.file_type || item.file_type,
      };
    }

    if (item.resource_id) {
      const response = await resourcesAPI.download(item.resource_id);
      const payload = response.data?.data || response.data || {};
      return {
        remoteUrl: payload.file_url || item.file_url,
        fileName: payload.file_name,
        fileType: payload.file_type || item.file_type || item.resource_type,
      };
    }

    return {
      remoteUrl: item.file_url,
      fileName: undefined,
      fileType: item.file_type || item.resource_type,
    };
  }, []);

  const handleOpenDownload = useCallback(async (item: DownloadItem) => {
    setActiveItemId(item.id);
    setActiveAction('open');
    try {
      const downloadKey = buildDownloadKey(item);
      const existingRecord = await localDownloadsService.getRecord(downloadKey);
      if (existingRecord) {
        await localDownloadsService.openLocalFile(downloadKey);
        return;
      }

      if (item.file_url || item.resource_id || item.personal_file_id) {
        let source = await resolveDownloadSource(item);
        if (!source.remoteUrl) {
          throw new Error('Missing file URL.');
        }

        try {
          await localDownloadsService.ensureLocalFile({
            key: downloadKey,
            remoteUrl: source.remoteUrl,
            fileName: source.fileName,
            title: item.title,
            fileType: source.fileType,
          });
        } catch (downloadError) {
          if (
            source.remoteUrl === item.file_url &&
            (item.resource_id || item.personal_file_id)
          ) {
            source = await resolveDownloadSource(item, true);
            if (!source.remoteUrl) {
              throw downloadError;
            }
            await localDownloadsService.ensureLocalFile({
              key: downloadKey,
              remoteUrl: source.remoteUrl,
              fileName: source.fileName,
              title: item.title,
              fileType: source.fileType,
            });
          } else {
            throw downloadError;
          }
        }

        await localDownloadsService.openLocalFile(downloadKey);
        return;
      }

      if (item.resource_id) {
        router.push(`/(student)/resource/${item.resource_id}` as any);
        return;
      }

      if (item.personal_file_id) {
        router.push(`/(student)/file/${item.personal_file_id}` as any);
        return;
      }

      Alert.alert('Unavailable', 'This download no longer has an accessible file.');
    } catch (err) {
      console.error('Failed to open download:', err);
      Alert.alert('Unable to open', 'The selected download could not be opened right now.');
    } finally {
      setActiveItemId(null);
      setActiveAction(null);
    }
  }, [buildDownloadKey, resolveDownloadSource, router]);

  const handleSaveCopy = useCallback(async (item: DownloadItem) => {
    if (!item.file_url && !item.resource_id && !item.personal_file_id) {
      Alert.alert('Unavailable', 'This download no longer has an accessible file.');
      return;
    }

    setActiveItemId(item.id);
    setActiveAction('save');
    try {
      const downloadKey = buildDownloadKey(item);
      const existingRecord = await localDownloadsService.getRecord(downloadKey);
      if (!existingRecord) {
        let source = await resolveDownloadSource(item);
        if (!source.remoteUrl) {
          throw new Error('Missing file URL.');
        }

        try {
          await localDownloadsService.ensureLocalFile({
            key: downloadKey,
            remoteUrl: source.remoteUrl,
            fileName: source.fileName,
            title: item.title,
            fileType: source.fileType,
          });
        } catch (downloadError) {
          if (
            source.remoteUrl === item.file_url &&
            (item.resource_id || item.personal_file_id)
          ) {
            source = await resolveDownloadSource(item, true);
            if (!source.remoteUrl) {
              throw downloadError;
            }
            await localDownloadsService.ensureLocalFile({
              key: downloadKey,
              remoteUrl: source.remoteUrl,
              fileName: source.fileName,
              title: item.title,
              fileType: source.fileType,
            });
          } else {
            throw downloadError;
          }
        }
      }

      const result = await localDownloadsService.saveCopyToDevice(downloadKey);

      if (result.status === 'saved') {
        Alert.alert('Saved', 'A copy of this file has been saved to your phone storage.');
      } else if (result.status === 'already_saved') {
        Alert.alert('Already Saved', 'A phone-storage copy already exists for this download.');
      } else if (result.status === 'shared') {
        Alert.alert('Save Copy', 'Use the share sheet to save this file to Files.');
      } else if (result.status === 'cancelled') {
        Alert.alert('Save Cancelled', 'The file is still available inside CampusHub.');
      }
    } catch (err) {
      console.error('Failed to save copy:', err);
      Alert.alert('Unable to Save', 'The selected download could not be copied to phone storage.');
    } finally {
      setActiveItemId(null);
      setActiveAction(null);
    }
  }, [buildDownloadKey, resolveDownloadSource]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }
    return date.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDownloadType = (value: string) =>
    value === 'personal_file' ? 'Library File' : 'Resource';

  const formatResourceType = (value: string) =>
    String(value || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()) || 'File';

  const getDownloadIcon = (item: DownloadItem) => {
    const fileType = String(item.file_type || '').toLowerCase();
    if (fileType === 'pdf') return 'document-text';
    if (['ppt', 'pptx'].includes(fileType)) return 'images';
    if (['doc', 'docx'].includes(fileType)) return 'document';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) return 'image';
    if (item.download_type === 'personal_file') return 'folder';
    return 'download';
  };

  const renderHeader = () => (
    <View style={styles.summarySection}>
      <View style={styles.summaryCard}>
        <View style={[styles.summaryIcon, { backgroundColor: colors.primary[50] }]}>
          <Icon name="download" size={22} color={colors.primary[500]} />
        </View>
        <Text style={styles.summaryValue}>{stats?.total_downloads || downloads.length}</Text>
        <Text style={styles.summaryLabel}>Total Downloads</Text>
      </View>
      <View style={styles.summaryCard}>
        <View style={[styles.summaryIcon, { backgroundColor: colors.accent[50] }]}>
          <Icon name="book" size={22} color={colors.accent[500]} />
        </View>
        <Text style={styles.summaryValue}>{stats?.unique_resources || 0}</Text>
        <Text style={styles.summaryLabel}>Unique Resources</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: DownloadItem }) => (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: colors.primary[50] }]}>
        <Icon name={getDownloadIcon(item) as any} size={22} color={colors.primary[500]} />
      </View>
      <TouchableOpacity style={styles.cardMain} onPress={() => void handleOpenDownload(item)}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{formatDownloadType(item.download_type)}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                {formatResourceType(item.resource_type || item.file_type)}
              </Text>
            </View>
          </View>
          <Text style={styles.cardTime}>{formatDateTime(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => void handleOpenDownload(item)}
          disabled={activeItemId === item.id}
        >
          {activeItemId === item.id && activeAction === 'open' ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Icon name="eye" size={18} color={colors.primary[500]} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => void handleSaveCopy(item)}
          disabled={activeItemId === item.id}
        >
          {activeItemId === item.id && activeAction === 'save' ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Icon name="download" size={18} color={colors.primary[500]} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Icon name="download" size={40} color={colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Downloads Yet</Text>
      <Text style={styles.emptyText}>
        Resources and library files you download will appear here.
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && downloads.length === 0) {
    return (
      <ErrorState
        type="server"
        title="Unable to Load Downloads"
        message={error}
        onRetry={fetchInitialData}
        onBack={() => router.back()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Downloads</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Icon name="refresh" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={downloads}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => void loadMore()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
            </View>
          ) : null
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
    paddingHorizontal: spacing[4],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginLeft: spacing[2],
  },
  list: {
    padding: spacing[4],
    paddingBottom: spacing[10],
    flexGrow: 1,
  },
  summarySection: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  cardMain: {
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  cardContent: {
    flex: 1,
  },
  cardActions: {
    marginLeft: spacing[3],
    gap: spacing[2],
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  metaBadge: {
    backgroundColor: colors.gray[100],
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  cardTime: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[16],
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  loadingMore: {
    paddingVertical: spacing[4],
  },
});

export default DownloadsScreen;
