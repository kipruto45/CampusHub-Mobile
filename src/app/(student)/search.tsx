import React, { useMemo } from 'react';
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
import { useRouter } from 'expo-router';

import RecentSearchList from '../../components/search/RecentSearchList';
import SearchBar from '../../components/search/SearchBar';
import SearchFiltersSheet from '../../components/search/SearchFiltersSheet';
import SearchResultCard from '../../components/search/SearchResultCard';
import SearchSuggestionList from '../../components/search/SearchSuggestionList';
import { useSearch } from '../../hooks/useSearch';
import { bookmarksService } from '../../services/bookmarks.service';
import { favoritesService } from '../../services/favorites.service';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import Icon from '../../components/ui/Icon';

const SearchScreen: React.FC = () => {
  const router = useRouter();
  const {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    suggestions,
    recentSearches,
    loading,
    error,
    runSearch,
    updateResult,
    clearQuery,
    clearFilters,
    removeRecentSearch,
    clearRecentSearches,
    isFilterSheetOpen,
    openFilterSheet,
    closeFilterSheet,
    activeFiltersCount,
    minQueryLength,
  } = useSearch();

  const showRecent = query.trim().length < minQueryLength;

  const onToggleBookmark = async (resourceId: string, isBookmarked: boolean) => {
    const nextValue = !isBookmarked;
    updateResult(resourceId, { is_bookmarked: nextValue });

    try {
      await bookmarksService.toggleResourceBookmark(resourceId);
    } catch (err: any) {
      updateResult(resourceId, { is_bookmarked: isBookmarked });
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update bookmark');
    }
  };

  const onToggleFavorite = async (resourceId: string, isFavorited: boolean) => {
    const nextValue = !isFavorited;
    updateResult(resourceId, { is_favorited: nextValue });

    try {
      await favoritesService.toggleResourceFavorite(resourceId);
    } catch (err: any) {
      updateResult(resourceId, { is_favorited: isFavorited });
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update favorite');
    }
  };

  const emptyState = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[500]} />
          <Text style={styles.helperText}>Searching...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <Icon name="alert-circle" size={36} color={colors.error} />
          <Text style={styles.helperText}>{error}</Text>
        </View>
      );
    }
    if (!showRecent) {
      return (
        <View style={styles.center}>
          <Icon name="search" size={40} color={colors.text.tertiary} />
          <Text style={styles.helperText}>No results found. Try other keywords or filters.</Text>
        </View>
      );
    }
    return null;
  }, [error, loading, showRecent]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onOpenFilters={openFilterSheet}
            onClear={clearQuery}
            loading={loading}
            activeFiltersCount={activeFiltersCount}
          />
        </View>
      </View>

      <View style={styles.content}>
        {query.trim().length >= minQueryLength ? (
          <SearchSuggestionList
            suggestions={suggestions}
            onSelect={(value) => {
              setQuery(value);
              runSearch(value);
            }}
          />
        ) : null}

        {showRecent ? (
          <RecentSearchList
            items={recentSearches}
            onSelect={(value) => {
              setQuery(value);
              runSearch(value);
            }}
            onRemove={removeRecentSearch}
            onClearAll={clearRecentSearches}
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SearchResultCard
                item={item}
                onPress={() => router.push(`/(student)/resource/${item.id}`)}
                onToggleBookmark={() =>
                  onToggleBookmark(item.id, Boolean(item.is_bookmarked))
                }
                onToggleFavorite={() =>
                  onToggleFavorite(item.id, Boolean(item.is_favorited))
                }
              />
            )}
            ListHeaderComponent={
              results.length > 0 ? (
                <Text style={styles.resultCount}>{results.length} results</Text>
              ) : null
            }
            ListEmptyComponent={emptyState}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={() => runSearch()}
                tintColor={colors.primary[500]}
              />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <SearchFiltersSheet
        visible={isFilterSheetOpen}
        filters={filters}
        onClose={closeFilterSheet}
        onReset={clearFilters}
        onApply={(next) => setFilters(next)}
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
    paddingHorizontal: spacing[4],
    paddingTop: spacing[12],
    paddingBottom: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.background.secondary,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card.light,
  },
  searchWrap: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  resultCount: {
    color: colors.text.secondary,
    fontSize: 13,
    marginBottom: spacing[3],
  },
  listContent: {
    paddingBottom: spacing[16],
    flexGrow: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[12],
    paddingHorizontal: spacing[6],
  },
  helperText: {
    marginTop: spacing[2],
    textAlign: 'center',
    color: colors.text.secondary,
  },
});

export default SearchScreen;
