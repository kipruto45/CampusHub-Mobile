// Collections Screen for CampusHub
// Shows all resources saved/collected by the student

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { bookmarksService } from '../../services/bookmarks.service';
import { favoritesService } from '../../services/favorites.service';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

interface CollectionItem {
  id: string;
  title: string;
  description?: string;
  resource_count: number;
  type: 'bookmark' | 'favorite' | 'custom';
  created_at?: string;
}

interface Resource {
  id: string;
  title: string;
  description?: string;
  resource_type?: string;
  file_size?: number;
  uploaded_by?: string;
  course?: string;
  faculty?: string;
  created_at: string;
  is_bookmarked?: boolean;
  is_favorited?: boolean;
}

const CollectionsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collectionResources, setCollectionResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const normalizeCollectionResource = (resource: any, overrides?: Partial<Resource>): Resource => ({
    id: String(resource?.id || ''),
    title: String(resource?.title || ''),
    description: resource?.description || '',
    resource_type: resource?.resource_type || resource?.file_type || 'resource',
    file_size: Number(resource?.file_size || 0),
    uploaded_by:
      resource?.uploaded_by ||
      resource?.uploader?.full_name ||
      [resource?.uploader?.first_name, resource?.uploader?.last_name].filter(Boolean).join(' ') ||
      '',
    course:
      typeof resource?.course === 'string'
        ? resource.course
        : resource?.course?.name || resource?.course_name || '',
    faculty:
      typeof resource?.faculty === 'string'
        ? resource.faculty
        : resource?.faculty?.name || resource?.faculty_name || '',
    created_at: String(resource?.created_at || ''),
    is_bookmarked:
      overrides?.is_bookmarked !== undefined
        ? overrides.is_bookmarked
        : Boolean(resource?.is_bookmarked),
    is_favorited:
      overrides?.is_favorited !== undefined
        ? overrides.is_favorited
        : Boolean(resource?.is_favorited),
  });

  const fetchCollections = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setError(null);
      }

      // Fetch bookmarks and favorites counts
      const [bookmarksRes, favoritesRes] = await Promise.all([
        bookmarksService
          .getBookmarks({ page: 1, limit: 1 })
          .catch(() => ({ results: [], bookmarks: [], pagination: null })),
        favoritesService
          .getFavorites({ page: 1, limit: 1 })
          .catch(() => ({ results: [], favorites: [], pagination: null })),
      ]);

      const bookmarkItems = bookmarksRes?.bookmarks || bookmarksRes?.results || [];
      const favoriteItems = favoritesRes?.favorites || favoritesRes?.results || [];

      const bookmarkPagination = (bookmarksRes as any)?.pagination;
      const favoritePagination = (favoritesRes as any)?.pagination;
      const bookmarkTotal =
        Number(bookmarkPagination?.total ?? bookmarkPagination?.count ?? bookmarkItems.length) || 0;
      const favoriteTotal =
        Number(favoritePagination?.total ?? favoritePagination?.count ?? favoriteItems.length) || 0;

      const collectionsData: CollectionItem[] = [
        {
          id: 'bookmarks',
          title: 'Bookmarks',
          description: 'Your saved resources',
          resource_count: bookmarkTotal,
          type: 'bookmark',
        },
        {
          id: 'favorites',
          title: 'Favorites',
          description: 'Resources you love',
          resource_count: favoriteTotal,
          type: 'favorite',
        },
      ];

      setCollections(collectionsData);
    } catch (err: any) {
      console.error('Failed to fetch collections:', err);
      setError(err.response?.data?.message || 'Failed to load collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCollectionResources = useCallback(async (
    collectionId: string,
    options?: { silent?: boolean }
  ) => {
    try {
      if (!options?.silent) {
        setLoadingResources(true);
      }
      setSelectedCollection(collectionId);

      if (collectionId === 'bookmarks') {
        const response = await bookmarksService.getBookmarks({ page: 1, limit: 50 });
        const bookmarks = response?.bookmarks || response?.results || [];
        const resources = bookmarks
          .map((item: any) => item?.resource)
          .filter(Boolean)
          .map((resource: any) =>
            normalizeCollectionResource(resource, { is_bookmarked: true })
          );
        setCollectionResources(resources);
        return;
      }

      if (collectionId === 'favorites') {
        const response = await favoritesService.getFavorites({ page: 1, limit: 50, type: 'resources' });
        const favorites = response?.favorites || response?.results || [];
        const resources = favorites
          .map((item: any) => item?.resource)
          .filter(Boolean)
          .map((resource: any) =>
            normalizeCollectionResource(resource, { is_favorited: true })
          );
        setCollectionResources(resources);
        return;
      }

      setCollectionResources([]);
    } catch (err: any) {
      console.error('Failed to fetch collection resources:', err);
      Alert.alert('Error', 'Failed to load resources');
    } finally {
      setLoadingResources(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections(true);
  }, [fetchCollections]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedCollection) {
      fetchCollectionResources(selectedCollection, { silent: true });
    } else {
      fetchCollections(true);
    }
  }, [fetchCollections, fetchCollectionResources, selectedCollection]);

  const handleCollectionPress = (collection: CollectionItem) => {
    fetchCollectionResources(collection.id);
  };

  const handleBackToCollections = () => {
    setSelectedCollection(null);
    setCollectionResources([]);
  };

  const handleResourcePress = (resource: Resource) => {
    router.push(`/(student)/resource/${resource.id}`);
  };

  const renderCollectionItem = ({ item }: { item: CollectionItem }) => (
    <TouchableOpacity
      style={[styles.collectionCard, shadows.md]}
      onPress={() => handleCollectionPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.collectionIcon}>
        <Icon
          name={item.type === 'bookmark' ? 'bookmark' : 'heart'}
          size={32}
          color={item.type === 'bookmark' ? colors.accent[500] : colors.error}
        />
      </View>
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionTitle}>{item.title}</Text>
        <Text style={styles.collectionDescription}>{item.description}</Text>
        <Text style={styles.collectionCount}>{item.resource_count} resources</Text>
      </View>
      <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  const renderResourceItem = ({ item }: { item: Resource }) => (
    <TouchableOpacity
      style={[styles.resourceCard, shadows.sm]}
      onPress={() => handleResourcePress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.resourceIcon}>
        <Icon
          name={item.resource_type === 'pdf' ? 'document-text' : 'document'}
          size={24}
          color={colors.primary[500]}
        />
      </View>
      <View style={styles.resourceInfo}>
        <Text style={styles.resourceTitle} numberOfLines={2}>{item.title}</Text>
        {item.uploaded_by && (
          <Text style={styles.resourceMeta}>by {item.uploaded_by}</Text>
        )}
        {item.course && (
          <Text style={styles.resourceMeta}>{item.course}</Text>
        )}
      </View>
      <View style={styles.resourceActions}>
        {item.is_bookmarked && (
          <Icon name="bookmark" size={16} color={colors.accent[500]} />
        )}
        {item.is_favorited && (
          <Icon name="heart" size={16} color={colors.error} />
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading collections...</Text>
      </View>
    );
  }

  // Show collection resources if a collection is selected
  if (selectedCollection) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: colors.primary[500] }]}>
          <TouchableOpacity onPress={handleBackToCollections} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectedCollection === 'bookmarks' ? 'Bookmarks' : 'Favorites'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {loadingResources ? (
          <View style={[styles.container, styles.center]}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        ) : collectionResources.length > 0 ? (
          <FlatList
            data={collectionResources}
            renderItem={renderResourceItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary[500]]}
              />
            }
          />
        ) : (
          <View style={[styles.container, styles.center]}>
            <Icon name="folder-open" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No resources yet</Text>
            <Text style={styles.emptySubtext}>
              {selectedCollection === 'bookmarks'
                ? 'Bookmark resources to see them here'
                : 'Favorite resources to see them here'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Show collections list
  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: colors.primary[500] }]}>
        <Text style={styles.headerTitle}>Collections</Text>
      </View>

      {error ? (
        <ErrorState
          type="server"
          title="Failed to Load"
          message={error}
          onRetry={() => fetchCollections(true)}
        />
      ) : (
        <FlatList
          data={collections}
          renderItem={renderCollectionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary[500]]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="folder-open" size={64} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No collections yet</Text>
              <Text style={styles.emptySubtext}>
                Bookmark or favorite resources to create collections
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    paddingTop: spacing[8],
  },
  backButton: {
    padding: spacing[1],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  loadingText: {
    marginTop: spacing[3],
    fontSize: 14,
    color: colors.text.secondary,
  },
  listContent: {
    padding: spacing[4],
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  collectionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  collectionInfo: {
    flex: 1,
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  collectionDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  collectionCount: {
    fontSize: 12,
    color: colors.primary[500],
    fontWeight: '500',
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  resourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  resourceMeta: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  resourceActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing[4],
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing[2],
    textAlign: 'center',
    paddingHorizontal: spacing[6],
  },
});

export default CollectionsScreen;
