// Home Screen for CampusHub - Modern Student Dashboard
// Premium, mobile-first student dashboard design
// Backend-driven - no mock data

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Loading from '../../../components/ui/Loading';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import Icon from '../../../components/ui/Icon';
import BookmarkButton from '../../../components/resources/BookmarkButton';
import FavoriteButton from '../../../components/resources/FavoriteButton';
import { useAuthStore } from '../../../store/auth.store';
import { analyticsAPI, resourcesAPI, notificationsAPI } from '../../../services/api';
import { bookmarksService } from '../../../services/bookmarks.service';
import { favoritesService } from '../../../services/favorites.service';

// Types matching backend response
interface Resource {
  id: string;
  title: string;
  description?: string;
  resource_type: string;
  file_type?: string;
  thumbnail?: string;
  course?: { id: string; name: string; code?: string };
  unit?: { id: string; name: string; code?: string };
  semester?: string;
  average_rating: number;
  download_count: number;
  view_count?: number;
  created_at: string;
  uploaded_by?: string;
  is_bookmarked?: boolean;
  is_favorited?: boolean;
}

interface Announcement {
  id: string;
  title: string;
  message?: string;
  type?: string;
  created_at: string;
  published_at?: string;
}

interface DashboardStats {
  total_uploads: number;
  total_downloads: number;
  total_bookmarks: number;
  total_favorites: number;
}

interface DashboardData {
  stats: DashboardStats;
  recent_resources: Resource[];
  announcements: Announcement[];
}

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [savedPreview, setSavedPreview] = useState<any[]>([]);
  const [favoritesPreview, setFavoritesPreview] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [dashboardRes, notificationsRes, bookmarksRes, favoritesRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        notificationsAPI.list({ unread_only: true }),
        bookmarksService.getBookmarks({ limit: 3 }),
        favoritesService.getFavorites({ limit: 3, type: 'resources' }),
      ]);
      
      const data = dashboardRes.data.data as DashboardData;
      setDashboardData(data);
      
      // Get unread count from notifications response
      const notificationsData = notificationsRes.data.data;
      const unread = notificationsData?.unread_count || 
                     notificationsData?.notifications?.filter((n: any) => !n.is_read).length ||
                     0;
      setUnreadCount(unread);
      setSavedPreview(bookmarksRes.bookmarks || bookmarksRes.results || []);
      setFavoritesPreview(favoritesRes.favorites || favoritesRes.results || []);
    } catch (err: any) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

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
      case 'tutorial': return colors.primary[400];
      default: return colors.primary[500];
    }
  };

  const getResourceTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'notes': return 'document-text';
      case 'past_exam':
      case 'past exam': 
      case 'past_paper':
      case 'past paper': return 'document';
      case 'slides': return 'images';
      case 'lab_report':
      case 'lab report': return 'flask';
      case 'book': return 'book';
      case 'assignment': return 'create';
      case 'tutorial': return 'school';
      default: return 'document';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const handleToggleBookmark = async (resourceId: string) => {
    await bookmarksService.toggleResourceBookmark(resourceId);
    setDashboardData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        recent_resources: prev.recent_resources.map(resource =>
          resource.id === resourceId
            ? { ...resource, is_bookmarked: !resource.is_bookmarked }
            : resource
        ),
      };
    });
    const bookmarksRes = await bookmarksService.getBookmarks({ limit: 3 });
    setSavedPreview(bookmarksRes.bookmarks || bookmarksRes.results || []);
  };

  const handleToggleFavorite = async (resourceId: string) => {
    await favoritesService.toggleResourceFavorite(resourceId);
    setDashboardData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        recent_resources: prev.recent_resources.map(resource =>
          resource.id === resourceId
            ? { ...resource, is_favorited: !resource.is_favorited }
            : resource
        ),
      };
    });
    const favoritesRes = await favoritesService.getFavorites({ limit: 3, type: 'resources' });
    setFavoritesPreview(favoritesRes.favorites || favoritesRes.results || []);
  };

  // Loading state
  if (loading && !refreshing) {
    return <Loading />;
  }

  // Error state with retry
  if (error && !dashboardData) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  const stats = dashboardData?.stats || { total_uploads: 0, total_downloads: 0, total_bookmarks: 0, total_favorites: 0 };
  const recentResources = dashboardData?.recent_resources || [];
  const announcements = dashboardData?.announcements || [];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      >
        {/* 1. Top Navigation Header */}
        <View style={styles.topNav}>
          <View style={styles.topNavLeft}>
            <View style={styles.logoContainer}>
              <Icon name="book" size={24} color={colors.primary[500]} />
            </View>
            <Text style={styles.logoText}>CampusHub</Text>
          </View>
          <View style={styles.topNavRight}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/(student)/notifications')}
            >
              <Icon name="notifications" size={24} color={colors.text.primary} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/(student)/settings')}
            >
              <Icon name="settings" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Welcome Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={styles.heroGreeting}>{getGreeting()},</Text>
            <Text style={styles.heroName}>{user?.first_name || 'Student'}!</Text>
            <Text style={styles.heroSubtext}>
              Find, save, and manage your study resources with ease.
            </Text>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => router.push('/(student)/upload-resource')}
            >
              <Icon name="cloud-upload" size={20} color={colors.text.inverse} />
              <Text style={styles.uploadButtonText}>Upload a Resource</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroIllustration}>
            <View style={styles.illustrationStack}>
              <View style={[styles.illustrationBook, styles.illBook1]}>
                <Icon name="book" size={24} color={colors.primary[400]} />
              </View>
              <View style={[styles.illustrationBook, styles.illBook2]}>
                <Icon name="document-text" size={24} color={colors.accent[400]} />
              </View>
              <View style={[styles.illustrationBook, styles.illBook3]}>
                <Icon name="folder" size={24} color={colors.info} />
              </View>
            </View>
          </View>
        </View>

        {/* 3. Global Search Bar */}
        <TouchableOpacity 
          style={styles.searchContainer}
          onPress={() => router.push('/(student)/search')}
        >
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color={colors.text.tertiary} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search resources..."
              placeholderTextColor={colors.text.tertiary}
              editable={false}
              pointerEvents="none"
            />
            <TouchableOpacity style={styles.filterButton}>
              <Icon name="filter" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* 4. Quick Resource Stats - From Backend */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primary[50] }]}>
                <Icon name="cloud-upload" size={20} color={colors.primary[500]} />
              </View>
              <Text style={styles.statNumber}>{stats.total_uploads}</Text>
              <Text style={styles.statLabel}>Uploads</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.accent[50] }]}>
                <Icon name="download" size={20} color={colors.accent[500]} />
              </View>
              <Text style={styles.statNumber}>{stats.total_downloads}</Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.success + '20' }]}>
                <Icon name="bookmark" size={20} color={colors.success} />
              </View>
              <Text style={styles.statNumber}>{stats.total_bookmarks}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.warning + '20' }]}>
                <Icon name="heart" size={20} color={colors.warning} />
              </View>
              <Text style={styles.statNumber}>{stats.total_favorites}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>
        </View>

        {/* 5. Recent Resources Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Resources</Text>
            <TouchableOpacity onPress={() => router.push('/(student)/tabs/resources')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentResources.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {recentResources.map((resource) => (
                <TouchableOpacity 
                  key={resource.id} 
                  style={styles.resourceCard}
                  onPress={() => router.push(`/(student)/resource/${resource.id}`)}
                >
                  <View style={styles.resourceCardHeader}>
                  <View style={[styles.resourceTypeTag, { backgroundColor: getResourceTypeColor(resource.resource_type) + '20' }]}>
                      <Text style={[styles.resourceTypeText, { color: getResourceTypeColor(resource.resource_type) }]}>
                        {resource.resource_type}
                      </Text>
                    </View>
                    <View style={styles.resourceActions}>
                      <FavoriteButton
                        isFavorited={Boolean(resource.is_favorited)}
                        onPress={() => handleToggleFavorite(resource.id)}
                      />
                      <BookmarkButton
                        isBookmarked={Boolean(resource.is_bookmarked)}
                        onPress={() => handleToggleBookmark(resource.id)}
                      />
                    </View>
                  </View>
                  <Text style={styles.resourceTitle} numberOfLines={2}>{resource.title}</Text>
                  <Text style={styles.resourceMeta}>
                    {resource.course?.name || 'General'} {resource.unit ? `| ${resource.unit.name}` : ''}
                  </Text>
                  <View style={styles.resourceCardFooter}>
                    <View style={styles.ratingContainer}>
                      <Icon name="star" size={14} color={colors.warning} />
                      <Text style={styles.ratingText}>{resource.average_rating?.toFixed(1) || '0.0'}</Text>
                    </View>
                    <View style={styles.downloadContainer}>
                      <Icon name="download" size={14} color={colors.text.tertiary} />
                      <Text style={styles.downloadText}>{resource.download_count || 0}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptySection}>
              <Icon name="document-text" size={40} color={colors.text.tertiary} />
              <Text style={styles.emptySectionText}>No resources available yet</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Saved Preview</Text>
            <TouchableOpacity onPress={() => router.push('/(student)/tabs/saved')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {savedPreview.length > 0 ? (
            <Card style={styles.previewCard}>
              {savedPreview.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.previewRow}
                  onPress={() => router.push(`/(student)/resource/${item.resource?.id}`)}
                >
                  <View>
                    <Text style={styles.previewTitle} numberOfLines={1}>
                      {item.resource?.title || 'Untitled Resource'}
                    </Text>
                    <Text style={styles.previewMeta} numberOfLines={1}>
                      {[item.resource?.course?.name, item.resource?.unit?.name]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  </View>
                  <Icon name="bookmark" size={18} color={colors.success} />
                </TouchableOpacity>
              ))}
            </Card>
          ) : (
            <View style={styles.emptySection}>
              <Icon name="bookmark-outline" size={40} color={colors.text.tertiary} />
              <Text style={styles.emptySectionText}>No saved resources yet</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorites Preview</Text>
            <TouchableOpacity onPress={() => router.push('/(student)/favorites')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {favoritesPreview.length > 0 ? (
            <Card style={styles.previewCard}>
              {favoritesPreview.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.previewRow}
                  onPress={() => router.push(`/(student)/resource/${item.resource?.id}`)}
                >
                  <View>
                    <Text style={styles.previewTitle} numberOfLines={1}>
                      {item.resource?.title || 'Untitled Resource'}
                    </Text>
                    <Text style={styles.previewMeta} numberOfLines={1}>
                      {[item.resource?.course?.name, item.resource?.unit?.name]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  </View>
                  <Icon name="heart" size={18} color={colors.warning} />
                </TouchableOpacity>
              ))}
            </Card>
          ) : (
            <View style={styles.emptySection}>
              <Icon name="heart-outline" size={40} color={colors.text.tertiary} />
              <Text style={styles.emptySectionText}>No favorites yet</Text>
            </View>
          )}
        </View>

        {/* 6. Announcements Preview - From Backend */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Announcements</Text>
            <TouchableOpacity onPress={() => router.push('/(student)/announcements')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {announcements.length > 0 ? (
            <Card style={styles.announcementCard}>
              {announcements.slice(0, 3).map((announcement, index) => (
                <TouchableOpacity 
                  key={announcement.id} 
                  style={[
                    styles.announcementItem,
                    index < Math.min(announcements.length, 3) - 1 && styles.announcementBorder
                  ]}
                  onPress={() => router.push('/(student)/announcements')}
                >
                  <View style={styles.announcementContent}>
                    <View style={styles.announcementIconBox}>
                      <Icon name="megaphone" size={16} color={colors.warning} />
                    </View>
                    <View style={styles.announcementTextContainer}>
                      <Text style={styles.announcementTitle} numberOfLines={1}>
                        {announcement.title}
                      </Text>
                      <Text style={styles.announcementTime}>
                        {formatDate(announcement.published_at || announcement.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={16} color={colors.text.tertiary} />
                </TouchableOpacity>
              ))}
            </Card>
          ) : (
            <View style={styles.emptySection}>
              <Icon name="megaphone" size={40} color={colors.text.tertiary} />
              <Text style={styles.emptySectionText}>No announcements at the moment</Text>
            </View>
          )}
        </View>

        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    backgroundColor: colors.card.light,
  },
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginLeft: spacing[3],
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '600',
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary[500],
    marginHorizontal: spacing[6],
    marginTop: spacing[4],
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    ...shadows.lg,
  },
  heroContent: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: 16,
    color: colors.text.inverse,
    opacity: 0.8,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.inverse,
    marginBottom: spacing[2],
  },
  heroSubtext: {
    fontSize: 14,
    color: colors.text.inverse,
    opacity: 0.8,
    marginBottom: spacing[4],
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text.inverse,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignSelf: 'flex-start',
    gap: spacing[2],
  },
  uploadButtonText: {
    color: colors.primary[600],
    fontWeight: '600',
    fontSize: 14,
  },
  heroIllustration: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationStack: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  illustrationBook: {
    position: 'absolute',
    width: 40,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.text.inverse,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  illBook1: {
    top: 0,
    left: 0,
    transform: [{ rotate: '-10deg' }],
  },
  illBook2: {
    top: 10,
    left: 20,
    transform: [{ rotate: '5deg' }],
  },
  illBook3: {
    top: 25,
    left: 40,
    transform: [{ rotate: '-5deg' }],
  },
  searchContainer: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    marginHorizontal: spacing[3],
  },
  filterButton: {
    padding: spacing[2],
  },
  statsSection: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  section: {
    paddingTop: spacing[6],
    paddingHorizontal: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  viewAll: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '500',
  },
  horizontalScroll: {
    paddingRight: spacing[6],
    gap: spacing[3],
  },
  resourceCard: {
    width: 200,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  resourceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  resourceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  resourceTypeTag: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  resourceTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
    lineHeight: 20,
  },
  resourceMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  resourceCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  downloadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  downloadText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  announcementCard: {
    padding: spacing[4],
  },
  previewCard: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  previewRow: {
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
    maxWidth: 230,
  },
  previewMeta: {
    fontSize: 12,
    color: colors.text.tertiary,
    maxWidth: 230,
  },
  announcementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
  },
  announcementBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  announcementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  announcementIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  announcementTextContainer: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  announcementTime: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
  },
  emptySectionText: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: spacing[2],
  },
});

export default HomeScreen;
