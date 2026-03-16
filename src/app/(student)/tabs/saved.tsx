// Saved Screen for CampusHub - Bookmarks & Favorites
// Shows both bookmarks and favorites with tab switching

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import BookmarkedResourceCard from '../../../components/bookmarks/BookmarkedResourceCard';
import FavoriteItemCard from '../../../components/favorites/FavoriteItemCard';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';
import Loading from '../../../components/ui/Loading';
import Icon from '../../../components/ui/Icon';
import { useBookmarks } from '../../../hooks/useBookmarks';
import { favoritesService } from '../../../services/favorites.service';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';

type TabType = 'bookmarks' | 'favorites';

const SavedScreen: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('bookmarks');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [bookmarkFavoriteOverrides, setBookmarkFavoriteOverrides] = useState<
    Record<string, boolean>
  >({});

  const { items, loading, refreshing, error, refresh, removeBookmark } = useBookmarks();

  const bookmarkedItems = useMemo(
    () =>
      items.map((item) => {
        const resourceId = item?.resource?.id;
        if (!resourceId || bookmarkFavoriteOverrides[resourceId] === undefined) {
          return item;
        }

        return {
          ...item,
          resource: {
            ...item.resource,
            is_favorited: bookmarkFavoriteOverrides[resourceId],
          },
        };
      }),
    [bookmarkFavoriteOverrides, items]
  );

  const loadFavorites = async () => {
    try {
      setFavoritesLoading(true);
      setFavoritesError(null);
      const response = await favoritesService.getFavorites({ limit: 50 });
      setFavorites(response.favorites || response.results || []);
    } catch (err: any) {
      setFavoritesError(err.message || 'Failed to load favorites');
    } finally {
      setFavoritesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'favorites') {
      loadFavorites();
    }
  }, [activeTab]);

  const handleRefresh = async () => {
    if (activeTab === 'bookmarks') {
      await refresh();
      setBookmarkFavoriteOverrides({});
    } else {
      await loadFavorites();
    }
  };

  const isLoading = activeTab === 'bookmarks' ? loading : favoritesLoading;
  const currentError = activeTab === 'bookmarks' ? error : favoritesError;
  const currentItems = activeTab === 'bookmarks' ? bookmarkedItems : favorites;

  const handleToggleFavoriteFromBookmarks = async (item: any) => {
    const resourceId = item?.resource?.id;
    if (!resourceId) return;

    const currentValue =
      bookmarkFavoriteOverrides[resourceId] ?? Boolean(item?.resource?.is_favorited);
    const nextValue = !currentValue;

    setBookmarkFavoriteOverrides((prev) => ({
      ...prev,
      [resourceId]: nextValue,
    }));

    try {
      await favoritesService.toggleResourceFavorite(resourceId);
    } catch (err: any) {
      setBookmarkFavoriteOverrides((prev) => ({
        ...prev,
        [resourceId]: currentValue,
      }));
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update favorite');
    }
  };

  const handleOpenFavorite = (item: any) => {
    if (item?.favorite_type === 'resource' && item?.resource?.id) {
      router.push(`/(student)/resource/${item.resource.id}`);
      return;
    }

    if (item?.favorite_type === 'personal_file' && item?.personal_file?.id) {
      router.push(`/(student)/file/${item.personal_file.id}` as any);
      return;
    }

    if (item?.favorite_type === 'folder' && item?.personal_folder?.id) {
      router.push(`/(student)/folder/${item.personal_folder.id}`);
    }
  };

  const handleRemoveFavorite = async (favoriteItem: any) => {
    const previousFavorites = favorites;
    setFavorites((prev) => prev.filter((item) => item.id !== favoriteItem.id));

    try {
      await favoritesService.removeFavorite(favoriteItem.id);
    } catch (err: any) {
      setFavorites(previousFavorites);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to remove favorite');
    }
  };

  if (isLoading && currentItems.length === 0) {
    return (
      <View style={styles.container}>
        <Loading message="Loading..." />
      </View>
    );
  }

  if (currentError && currentItems.length === 0) {
    return (
      <View style={styles.container}>
        <ErrorState
          type="server"
          title={activeTab === 'bookmarks' ? 'Unable to load bookmarks' : 'Unable to load favorites'}
          message={currentError}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Saved</Text>
        
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bookmarks' && styles.tabActive]}
            onPress={() => setActiveTab('bookmarks')}
          >
            <Icon 
              name="bookmark" 
              size={16} 
              color={activeTab === 'bookmarks' ? colors.accent[500] : colors.text.tertiary} 
            />
            <Text style={[styles.tabText, activeTab === 'bookmarks' && styles.tabTextActive]}>
              Bookmarks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
            onPress={() => setActiveTab('favorites')}
          >
            <Icon 
              name="heart" 
              size={16} 
              color={activeTab === 'favorites' ? colors.error : colors.text.tertiary} 
            />
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>
              Favorites
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={currentItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          activeTab === 'bookmarks' ? (
            <BookmarkedResourceCard
              item={item}
              onPress={() => router.push(`/(student)/resource/${item?.resource?.id}`)}
              onRemove={() => removeBookmark(item.id)}
              onToggleFavorite={() => void handleToggleFavoriteFromBookmarks(item)}
              onShare={() => {}}
            />
          ) : (
            <FavoriteItemCard
              item={item}
              onPress={() => handleOpenFavorite(item)}
              onRemove={() => void handleRemoveFavorite(item)}
            />
          )
        )}
        ListEmptyComponent={
          <EmptyState
            title={activeTab === 'bookmarks' ? "No bookmarks yet" : "No favorites yet"}
            description={
              activeTab === 'bookmarks' 
                ? "Bookmark resources from listings or details to access them here quickly."
                : "Mark resources as favorites from listings or details to see them here."
            }
            actionLabel="Browse Resources"
            onAction={() => router.push('/(student)/tabs/resources')}
            icon={activeTab === 'bookmarks' ? "bookmark-outline" : "heart-outline"}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (activeTab === 'favorites' && favoritesLoading)}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
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
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
  },
  title: {
    fontSize: 28,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing[4],
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  tabActive: {
    backgroundColor: colors.card.light,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  tabTextActive: {
    color: colors.text.primary,
  },
  listContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[20],
    flexGrow: 1,
  },
});

export default SavedScreen;
