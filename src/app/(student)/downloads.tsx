import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { strings } from '../../constants/strings';
import { downloadsAPI,resourcesAPI } from '../../services/api';
import { libraryService } from '../../services/library.service';
import { LocalDownloadRecord,localDownloadsService } from '../../services/local-downloads.service';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

const formatNumber = (value: number) => {
  try {
    return new Intl.NumberFormat().format(value);
  } catch {
    return String(value);
  }
};

  const formatDateLocale = (value: string) => {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

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
  isLocal?: boolean;
  localRecord?: LocalDownloadRecord;
}

interface DownloadStats {
  total_downloads: number;
  unique_resources: number;
}

const DownloadsScreen: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [stats, setStats] = useState<DownloadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'open' | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [search, setSearch] = useState('');

  const applyDownloadPage = (payload: any, append: boolean) => {
    const results = (payload?.downloads || payload?.results || []) as DownloadItem[];
    setDownloads((prev) => (append ? [...prev, ...results] : results));
    setHasMore(Boolean(payload?.next));
    setNextPage((current) => (append ? current + 1 : 2));
  };

  const fetchInitialData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch both server downloads and local downloads in parallel
      const [downloadsResponse, statsResponse, localRecords] = await Promise.all([
        downloadsAPI.list({ page: 1, page_size: 20 }),
        downloadsAPI.stats(),
        localDownloadsService.getAllRecords(),
      ]);

      // Process server downloads
      const serverData = downloadsResponse.data.data;
      const serverDownloads: DownloadItem[] = (serverData?.downloads || serverData?.results || []).map(
        (item: any) => ({
          id: item.id?.toString() || item.resource_id?.toString() || '',
          download_type: item.download_type || 'resource',
          title: item.title || item.resource_title || 'Untitled',
          resource_id: item.resource_id?.toString() || '',
          personal_file_id: item.personal_file_id?.toString() || '',
          resource_type: item.resource_type || 'file',
          file_type: item.file_type || 'pdf',
          file_url: item.file_url || item.url || '',
          created_at: item.created_at || new Date().toISOString(),
          isLocal: false,
        })
      );

      // Process local downloads
      const localDownloads: DownloadItem[] = localRecords.map((record) => ({
        id: `local_${record.key}`,
        download_type: 'local',
        title: record.fileName,
        resource_id: '',
        personal_file_id: '',
        resource_type: record.mimeType?.split('/')[0] || 'file',
        file_type: record.fileName?.split('.').pop() || 'pdf',
        file_url: record.localUri,
        created_at: record.createdAt,
        isLocal: true,
        localRecord: record,
      }));

      // Combine local and server downloads
      const allDownloads = [...localDownloads, ...serverDownloads];
      
      // Sort by last opened then created, newest first
      allDownloads.sort((a, b) => {
        const aTime = new Date((a.localRecord?.lastOpenedAt || a.created_at)).getTime();
        const bTime = new Date((b.localRecord?.lastOpenedAt || b.created_at)).getTime();
        return bTime - aTime;
      });

      setDownloads(allDownloads);
      setStats({
        total_downloads: localRecords.length + (serverData?.count || statsResponse.data.data.total_downloads || 0),
        unique_resources: statsResponse.data.data.unique_resources || 0,
      });
    } catch (err: any) {
      console.error('Failed to load downloads:', err);
      setError(err.response?.data?.message || 'Failed to load your downloads');
      
      // Fallback: try to load local downloads only
      try {
        const localRecords = await localDownloadsService.getAllRecords();
        const localDownloads: DownloadItem[] = localRecords.map((record) => ({
          id: `local_${record.key}`,
          download_type: 'local',
          title: record.fileName,
          resource_id: '',
          personal_file_id: '',
          resource_type: record.mimeType?.split('/')[0] || 'file',
          file_type: record.fileName?.split('.').pop() || 'pdf',
          file_url: record.localUri,
          created_at: record.createdAt,
          isLocal: true,
          localRecord: record,
        }));
        setDownloads(localDownloads);
      } catch (localErr) {
        console.error('Failed to load local downloads:', localErr);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, [fetchInitialData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInitialData();
  }, [fetchInitialData]);

  const filteredDownloads = useMemo(() => {
    if (!search.trim()) return downloads;
    const term = search.trim().toLowerCase();
    return downloads.filter((d) => d.title.toLowerCase().includes(term));
  }, [downloads, search]);

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
      let record = existingRecord;

      if (!record) {
        if (!item.file_url && !item.resource_id && !item.personal_file_id) {
          throw new Error('Missing file URL.');
        }

        let source = await resolveDownloadSource(item);
        if (!source.remoteUrl) {
          throw new Error('Missing file URL.');
        }

        try {
          record = await localDownloadsService.ensureLocalFile({
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
            record = await localDownloadsService.ensureLocalFile({
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

      // Offer system chooser so user can open in any app
      const shareAvailable = await Sharing.isAvailableAsync().catch(() => false);
      if (shareAvailable) {
        await Sharing.shareAsync(record.localUri, {
          mimeType: record.mimeType,
          dialogTitle: 'Open with…',
          UTI: record.mimeType,
        });
        await localDownloadsService.markOpened(downloadKey).catch(() => null);
        return;
      }

      // Web or fallback: open in browser/local
      if (Platform.OS === 'web') {
        await Linking.openURL(record.remoteUrl || record.localUri);
        await localDownloadsService.markOpened(downloadKey).catch(() => null);
        return;
      }

      await localDownloadsService.openLocalFile(downloadKey);
      await localDownloadsService.markOpened(downloadKey).catch(() => null);
      return;
    } catch (err) {
      console.error('Failed to open download:', err);
      showToast(
        'error',
        Platform.OS === 'web' ? strings.downloads.openErrorWeb : strings.downloads.openErrorDevice
      );
    } finally {
      setActiveItemId(null);
      setActiveAction(null);
    }
  }, [buildDownloadKey, resolveDownloadSource, showToast]);

  const formatDateTime = (value: string) => {
    return formatDateLocale(value) || 'Unknown date';
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
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search downloads"
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
        {isOffline && (
          <View style={styles.offlinePill}>
            <Icon name="cloud-offline" size={16} color={colors.warning} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>
      <View style={styles.summaryCard}>
        <View style={[styles.summaryIcon, { backgroundColor: colors.primary[50] }]}>
          <Icon name="download" size={22} color={colors.primary[500]} />
        </View>
        <Text style={styles.summaryValue}>{formatNumber(stats?.total_downloads || downloads.length)}</Text>
        <Text style={styles.summaryLabel}>Total Downloads</Text>
      </View>
      <View style={styles.summaryCard}>
        <View style={[styles.summaryIcon, { backgroundColor: colors.accent[50] }]}>
          <Icon name="book" size={22} color={colors.accent[500]} />
        </View>
        <Text style={styles.summaryValue}>{formatNumber(stats?.unique_resources || 0)}</Text>
        <Text style={styles.summaryLabel}>Unique Resources</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: DownloadItem }) => {
    const isWeb = Platform.OS === 'web';
    return (
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
        {isWeb && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL(item.file_url || item.localRecord?.localUri || '')}
          >
            <Icon name="link" size={18} color={colors.accent[500]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );};

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
      <View style={[styles.container, { padding: spacing[4] }]}>
        {[1, 2, 3, 4].map((key) => (
          <View key={key} style={[styles.card, { opacity: 0.3 }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.gray[200] }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ height: 12, width: '70%', backgroundColor: colors.gray[200], borderRadius: 6 }} />
              <View style={{ height: 10, width: '40%', backgroundColor: colors.gray[100], borderRadius: 6 }} />
              <View style={{ height: 10, width: '50%', backgroundColor: colors.gray[100], borderRadius: 6 }} />
            </View>
            <View style={[styles.cardActions, { width: 80 }]} />
          </View>
        ))}
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
        data={filteredDownloads}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning + '15',
  },
  offlineText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
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
