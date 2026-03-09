import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import BookmarkedResourceCard from '../../../components/bookmarks/BookmarkedResourceCard';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';
import Loading from '../../../components/ui/Loading';
import { useBookmarks } from '../../../hooks/useBookmarks';
import { favoritesService } from '../../../services/favorites.service';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

const SavedScreen: React.FC = () => {
  const router = useRouter();
  const { items, loading, refreshing, error, refresh, removeBookmark } = useBookmarks();

  if (loading) {
    return (
      <View style={styles.container}>
        <Loading message="Loading saved resources..." />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <ErrorState
        type="server"
        title="Unable to load saved resources"
        message={error}
        onRetry={refresh}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved</Text>
        <Text style={styles.subtitle}>{items.length} resources saved</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookmarkedResourceCard
            item={item}
            onPress={() => router.push(`/(student)/resource/${item?.resource?.id}`)}
            onRemove={() => removeBookmark(item.id)}
            onToggleFavorite={async () => {
              if (!item?.resource?.id) return;
              await favoritesService.toggleResourceFavorite(item.resource.id);
              await refresh();
            }}
            onShare={() => {}}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No saved resources yet"
            description="Bookmark resources from listings or details to access them here quickly."
            actionLabel="Browse Resources"
            onAction={() => router.push('/(student)/tabs/resources')}
            icon="bookmark-outline"
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary[500]}
          />
        }
      />
      <TouchableOpacity style={styles.searchLink} onPress={() => router.push('/(student)/search')}>
        <Text style={styles.searchLinkText}>Search resources</Text>
      </TouchableOpacity>
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
  },
  subtitle: {
    marginTop: spacing[1],
    color: colors.text.secondary,
  },
  listContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[20],
    flexGrow: 1,
  },
  searchLink: {
    position: 'absolute',
    right: spacing[6],
    bottom: spacing[6],
    backgroundColor: colors.primary[500],
    borderRadius: 20,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  searchLinkText: {
    color: colors.text.inverse,
    fontWeight: '700',
  },
});

export default SavedScreen;
