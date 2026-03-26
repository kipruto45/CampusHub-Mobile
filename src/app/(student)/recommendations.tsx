// Recommendations Screen for CampusHub
// Personalized recommendations based on user activity - Backend-driven

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,Alert,FlatList,RefreshControl,ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import BookmarkButton from '../../components/resources/BookmarkButton';
import FavoriteButton from '../../components/resources/FavoriteButton';
import Icon from '../../components/ui/Icon';
import { resourcesAPI } from '../../services/api';
import { bookmarksService } from '../../services/bookmarks.service';
import { favoritesService } from '../../services/favorites.service';
import { resourcesService } from '../../services/resources.service';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { openNativeShareSheet } from '../../utils/share';

// Types
interface RecommendationCategory {
  id: string;
  label: string;
}

interface RecommendationResource {
  id: string;
  title: string;
  description?: string;
  resource_type: string;
  can_share?: boolean;
  course?: {
    code: string;
    name: string;
  };
  uploader?: {
    first_name: string;
    last_name: string;
  };
  average_rating: number;
  download_count: number;
  view_count: number;
  thumbnail_url?: string;
  is_bookmarked?: boolean;
  is_favorited?: boolean;
}

const RecommendationsScreen: React.FC = () => {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [trending, setTrending] = useState<RecommendationResource[]>([]);
  const [forYou, setForYou] = useState<RecommendationResource[]>([]);
  const [courseBased, setCourseBased] = useState<RecommendationResource[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecommendationResource[]>([]);

  const categories: RecommendationCategory[] = [
    { id: 'all', label: 'All' },
    { id: 'trending', label: 'Trending' },
    { id: 'foryou', label: 'For You' },
    { id: 'courses', label: 'Your Courses' },
    { id: 'recent', label: 'Recently Viewed' },
  ];

  const fetchRecommendations = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch recommendations from backend
      const response = await resourcesAPI.list({ page: 1, search: '' });
      const data = response.data?.data?.results || response.data?.data || response.data || [];
      
      // In production, the backend should return categorized recommendations
      // For now, we'll use the same data for different categories
      setTrending(data.slice(0, 4));
      setForYou(data.slice(4, 8));
      setCourseBased(data.slice(0, 4));
      setRecentlyViewed(data.slice(2, 6));
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err.response?.data?.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  };

  const getCurrentResources = () => {
    switch (activeCategory) {
      case 'trending': return trending;
      case 'foryou': return forYou;
      case 'courses': return courseBased;
      case 'recent': return recentlyViewed;
      default: return [...trending, ...forYou, ...courseBased];
    }
  };

  const getResourceTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'notes': return 'document-text';
      case 'book': return 'book';
      case 'video': return 'videocam';
      case 'past_paper': return 'document';
      case 'assignment': return 'create';
      case 'slides': return 'albums';
      default: return 'document';
    }
  };

  const handleShareResource = async (item: RecommendationResource) => {
    try {
      const payload = await resourcesService.getResourceShareLink(item.id);
      if (!payload.can_share) {
        Alert.alert('Not Shareable', payload.reason || 'This resource cannot be shared.');
        return;
      }
      const shared = await openNativeShareSheet({
        title: payload.title,
        message: payload.share_message,
        url: payload.share_url,
      });
      if (shared) {
        await resourcesService.recordResourceShare(item.id, 'native_share');
      }
    } catch (err: any) {
      Alert.alert(
        'Share Error',
        err?.response?.data?.detail || err?.message || 'Failed to share resource'
      );
    }
  };

  const toggleBookmark = async (resourceId: string) => {
    await bookmarksService.toggleResourceBookmark(resourceId);
    const mutate = (collection: RecommendationResource[]) =>
      collection.map(item =>
        item.id === resourceId
          ? { ...item, is_bookmarked: !item.is_bookmarked }
          : item
      );
    setTrending(prev => mutate(prev));
    setForYou(prev => mutate(prev));
    setCourseBased(prev => mutate(prev));
    setRecentlyViewed(prev => mutate(prev));
  };

  const toggleFavorite = async (resourceId: string) => {
    await favoritesService.toggleResourceFavorite(resourceId);
    const mutate = (collection: RecommendationResource[]) =>
      collection.map(item =>
        item.id === resourceId
          ? { ...item, is_favorited: !item.is_favorited }
          : item
      );
    setTrending(prev => mutate(prev));
    setForYou(prev => mutate(prev));
    setCourseBased(prev => mutate(prev));
    setRecentlyViewed(prev => mutate(prev));
  };

  const renderResourceCard = (item: RecommendationResource) => (
    <TouchableOpacity 
      style={styles.resourceCard} 
      onPress={() => router.push(`/(student)/resource/${item.id}`)}
    >
      <View style={styles.thumbnail}>
        <Icon name={getResourceTypeIcon(item.resource_type) as any} size={32} color={colors.primary[500]} />
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.cardActions}>
            <FavoriteButton
              isFavorited={Boolean(item.is_favorited)}
              onPress={() => toggleFavorite(item.id)}
            />
            <BookmarkButton
              isBookmarked={Boolean(item.is_bookmarked)}
              onPress={() => toggleBookmark(item.id)}
            />
            <TouchableOpacity style={styles.cardShareBtn} onPress={() => handleShareResource(item)}>
              <Icon name="share-social" size={16} color={colors.success} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.cardAuthor}>
          {item.uploader?.first_name} {item.uploader?.last_name}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardType}>{item.resource_type}</Text>
          <Text style={styles.cardDivider}>•</Text>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={10} color={colors.warning} />
            <Text style={styles.cardRating}>{item.average_rating?.toFixed(1) || '0'}</Text>
          </View>
          <Text style={styles.cardDivider}>•</Text>
          <Text style={styles.cardDownloads}>{item.download_count || 0} downloads</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string, data: RecommendationResource[]) => {
    if (data.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {data.map(item => (
            <View key={item.id} style={styles.horizontalCard}>
              {renderResourceCard(item)}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="star" size={64} color={colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Recommendations</Text>
      <Text style={styles.emptyText}>
        Browse resources to get personalized recommendations based on your interests
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Icon name="alert-circle" size={48} color={colors.error} />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchRecommendations}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
      <Text style={styles.loadingText}>Loading recommendations...</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recommendations</Text>
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
        <Text style={styles.headerTitle}>Recommendations</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Icon name="refresh" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map(cat => (
          <TouchableOpacity 
            key={cat.id}
            style={[styles.categoryChip, activeCategory === cat.id && styles.activeCategoryChip]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={[styles.categoryText, activeCategory === cat.id && styles.activeCategoryText]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        renderError()
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
            />
          }
        >
          {activeCategory === 'all' ? (
            <>
              {renderSection('🔥 Trending', trending)}
              {renderSection('🎯 For You', forYou)}
              {renderSection('📚 Your Courses', courseBased)}
              {renderSection('🕐 Recently Viewed', recentlyViewed)}
            </>
          ) : (
            <FlatList
              data={getCurrentResources()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.fullWidthCard}>
                  {renderResourceCard(item)}
                </View>
              )}
              ListEmptyComponent={renderEmpty}
              scrollEnabled={false}
            />
          )}
        </ScrollView>
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
  refreshBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  placeholder: { width: 40 },
  categoriesContainer: { 
    padding: spacing[4], 
    gap: spacing[2],
    flexDirection: 'row',
  },
  categoryChip: { 
    paddingHorizontal: spacing[4], 
    paddingVertical: spacing[2], 
    borderRadius: 20, 
    backgroundColor: colors.card.light,
    marginRight: spacing[2],
  },
  activeCategoryChip: { 
    backgroundColor: colors.primary[500] 
  },
  categoryText: { 
    fontSize: 13, 
    fontWeight: '500', 
    color: colors.text.secondary 
  },
  activeCategoryText: { 
    color: colors.text.inverse 
  },
  content: { 
    paddingBottom: spacing[10] 
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  horizontalList: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  horizontalCard: {
    width: 200,
  },
  resourceCard: { 
    backgroundColor: colors.card.light, 
    borderRadius: 16, 
    padding: spacing[3], 
    ...shadows.sm 
  },
  thumbnail: { 
    width: '100%', 
    height: 100, 
    borderRadius: 12, 
    backgroundColor: colors.primary[50], 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  cardInfo: {},
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  cardTitle: { 
    flex: 1,
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.text.primary,
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  cardShareBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success + '15',
  },
  cardAuthor: { 
    fontSize: 12, 
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  cardMeta: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  cardType: { 
    fontSize: 11, 
    color: colors.primary[500],
    fontWeight: '500',
  },
  cardDivider: { 
    fontSize: 11, 
    color: colors.text.tertiary,
    marginHorizontal: 4,
  },
  ratingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 2 
  },
  cardRating: { 
    fontSize: 11, 
    color: colors.text.secondary 
  },
  cardDownloads: { 
    fontSize: 11, 
    color: colors.text.secondary 
  },
  fullWidthCard: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
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
    lineHeight: 20,
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

export default RecommendationsScreen;
