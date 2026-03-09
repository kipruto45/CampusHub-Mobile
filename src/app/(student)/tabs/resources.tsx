// Resources Screen for CampusHub
// Browse all learning resources - Backend-driven

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Icon from '../../../components/ui/Icon';
import ErrorState from '../../../components/ui/ErrorState';
import BookmarkButton from '../../../components/resources/BookmarkButton';
import FavoriteButton from '../../../components/resources/FavoriteButton';
import { resourcesAPI } from '../../../services/api';
import { resourcesService } from '../../../services/resources.service';
import { bookmarksService } from '../../../services/bookmarks.service';
import { favoritesService } from '../../../services/favorites.service';
import { openNativeShareSheet } from '../../../utils/share';

// Types matching backend response
interface Resource {
  id: string;
  title: string;
  description?: string;
  resource_type: string;
  file_type?: string;
  file_size?: number;
  thumbnail?: string;
  course?: { id: string; name: string; code?: string };
  unit?: { name: string; code?: string };
  average_rating: number;
  download_count: number;
  created_at: string;
  can_share?: boolean;
  is_bookmarked?: boolean;
  is_favorited?: boolean;
}

const ResourcesScreen: React.FC = () => {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const resourceTypes = ['All', 'Notes', 'Past Exam', 'Book', 'Assignment', 'Slides', 'Tutorial'];

  const fetchResources = useCallback(async () => {
    try {
      setError(null);
      const params: any = {};
      if (selectedType && selectedType !== 'All') {
        params.type = selectedType.toLowerCase().replace(' ', '_');
      }
      
      const response = await resourcesAPI.list(params);
      const data = response.data.data;
      
      const resourcesList = data.resources || data.results || [];
      setResources(resourcesList);
    } catch (err: any) {
      console.error('Failed to fetch resources:', err);
      setError(err.response?.data?.message || 'Failed to load resources');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResources();
  }, [fetchResources]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchResources();
  }, [fetchResources]);

  const getResourceTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'notes': return colors.primary[500];
      case 'past_exam':
      case 'past exam': 
      case 'past_paper':
      case 'past paper': return colors.warning;
      case 'slides': return colors.info;
      case 'lab_report':
      case 'lab report': return colors.success;
      case 'book': return colors.accent[500];
      case 'assignment': return colors.error;
      default: return colors.primary[500];
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  const handleShareResource = async (item: Resource) => {
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
    setResources(prev =>
      prev.map(item =>
        item.id === resourceId
          ? { ...item, is_bookmarked: !item.is_bookmarked }
          : item
      )
    );
  };

  const toggleFavorite = async (resourceId: string) => {
    await favoritesService.toggleResourceFavorite(resourceId);
    setResources(prev =>
      prev.map(item =>
        item.id === resourceId
          ? { ...item, is_favorited: !item.is_favorited }
          : item
      )
    );
  };

  const renderItem = ({ item }: { item: Resource }) => (
    <TouchableOpacity
      style={styles.resourceCard}
      onPress={() => router.push(`/(student)/resource/${item.id}`)}
    >
      <View style={styles.resourceHeader}>
        <Badge
          label={item.resource_type}
          variant={
            item.resource_type === 'Video' || item.resource_type?.toLowerCase() === 'tutorial' 
              ? 'info' 
              : item.resource_type?.toLowerCase().includes('past') 
                ? 'warning' 
                : 'primary'
          }
        />
        <View style={styles.resourceHeaderActions}>
          <Text style={styles.resourceRating}>⭐ {item.average_rating?.toFixed(1) || '0.0'}</Text>
          <FavoriteButton
            isFavorited={Boolean(item.is_favorited)}
            onPress={() => toggleFavorite(item.id)}
          />
          <BookmarkButton
            isBookmarked={Boolean(item.is_bookmarked)}
            onPress={() => toggleBookmark(item.id)}
          />
          <TouchableOpacity onPress={() => handleShareResource(item)} style={styles.shareIconBtn}>
            <Icon name="share-social" size={16} color={colors.success} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.resourceTitle}>{item.title}</Text>
      <View style={styles.resourceMeta}>
        <Text style={styles.resourceCourse}>{item.course?.name || 'General'}</Text>
        {item.created_at && (
          <>
            <Text style={styles.resourceDot}>•</Text>
            <Text style={styles.resourceYear}>{new Date(item.created_at).getFullYear()}</Text>
          </>
        )}
      </View>
      <View style={styles.resourceFooter}>
        <View style={styles.resourceStat}>
          <Icon name="download" size={14} color={colors.text.tertiary} />
          <Text style={styles.resourceStatText}>{item.download_count || 0}</Text>
        </View>
        <View style={styles.resourceStat}>
          <Icon name="document" size={14} color={colors.text.tertiary} />
          <Text style={styles.resourceStatText}>{formatFileSize(item.file_size)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Error state
  if (error && resources.length === 0) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={resources}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Resources</Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => {}}
              >
                <Icon name="filter" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <TouchableOpacity
              style={styles.searchBar}
              onPress={() => router.push('/(student)/search')}
            >
              <Icon name="search" size={20} color={colors.text.tertiary} />
              <Text style={styles.searchPlaceholder}>Search resources...</Text>
            </TouchableOpacity>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {resourceTypes.map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={[
                    styles.chip, 
                    (selectedType === type || (type === 'All' && !selectedType)) && styles.chipActive
                  ]}
                  onPress={() => setSelectedType(type === 'All' ? null : type)}
                >
                  <Text style={[
                    styles.chipText, 
                    (selectedType === type || (type === 'All' && !selectedType)) && styles.chipTextActive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>
              {selectedType || 'All'} Resources ({resources.length})
            </Text>
          </>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="document-text" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Resources Found</Text>
            <Text style={styles.emptyText}>
              {selectedType ? `No ${selectedType.toLowerCase()} resources available` : 'No resources available yet'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    paddingBottom: spacing[10],
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card.light,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[6],
    ...shadows.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: colors.text.tertiary,
    marginLeft: spacing[3],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  chipsScroll: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  chipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.text.inverse,
  },
  resourceCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.md,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  resourceHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  resourceRating: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  shareIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success + '15',
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
    lineHeight: 22,
  },
  resourceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  resourceCourse: {
    fontSize: 13,
    color: colors.primary[600],
    fontWeight: '500',
  },
  resourceDot: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginHorizontal: spacing[2],
  },
  resourceYear: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  resourceFooter: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  resourceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  resourceStatText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default ResourcesScreen;
