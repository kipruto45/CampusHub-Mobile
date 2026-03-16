// Home Screen for CampusHub - Modern Student Dashboard
// Premium, mobile-first student dashboard design
// Backend-driven with comprehensive sections

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Share,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Card from '../../../components/ui/Card';
import Loading from '../../../components/ui/Loading';
import ErrorState from '../../../components/ui/ErrorState';
import Icon from '../../../components/ui/Icon';
import BookmarkButton from '../../../components/resources/BookmarkButton';
import FavoriteButton from '../../../components/resources/FavoriteButton';
import { notificationService } from '../../../services/notifications';
import { useAuthStore } from '../../../store/auth.store';
import { analyticsAPI, resourcesAPI } from '../../../services/api';
import { announcementsApi } from '../../../services/announcements.service';
import { bookmarksService } from '../../../services/bookmarks.service';
import { favoritesService } from '../../../services/favorites.service';
import { dashboardApi, DashboardRecommendation } from '../../../services/dashboard.service';
import { notificationsApi } from '../../../services/notifications-api.service';
import { gamificationAPI } from '../../../services/api';

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
  status?: string;
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

// Category type for quick navigation
interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'notes', name: 'Notes', icon: 'document-text', color: colors.primary[500] },
  { id: 'books', name: 'Books', icon: 'book', color: colors.accent[500] },
  { id: 'past_papers', name: 'Past Papers', icon: 'document', color: colors.warning },
  { id: 'slides', name: 'Slides', icon: 'images', color: colors.info },
  { id: 'assignments', name: 'Assignments', icon: 'create', color: colors.error },
  { id: 'tutorials', name: 'Tutorials', icon: 'school', color: colors.primary[400] },
];

// Quick action items
interface QuickAction {
  id: string;
  name: string;
  icon: string;
  color: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'upload', name: 'Upload', icon: 'cloud-upload', color: colors.success, route: '/(student)/upload-resource' },
  { id: 'favorites', name: 'Favorites', icon: 'heart', color: colors.error, route: '/(student)/favorites' },
  { id: 'groups', name: 'Groups', icon: 'people', color: colors.accent[500], route: '/(student)/study-groups' },
  { id: 'announcements', name: 'News', icon: 'megaphone', color: colors.info, route: '/(student)/announcements' },
];

const ANNOUNCEMENT_READ_STORAGE_PREFIX = '@campushub/announcements/read';
const HOME_BADGE_REFRESH_INTERVAL_MS = 20_000;
const buildAnnouncementStateKey = (userId?: string) =>
  `${ANNOUNCEMENT_READ_STORAGE_PREFIX}/${userId || 'guest'}`;

const extractEnvelopeData = <T,>(response: any): T =>
  (response?.data?.data ?? response?.data ?? response) as T;

const extractResults = <T,>(response: any): T[] => {
  const payload = extractEnvelopeData<any>(response);
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (Array.isArray(payload?.results)) {
    return payload.results as T[];
  }
  return [];
};

const formatBadgeCount = (count: number): string => (count > 99 ? '99+' : String(count));

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const isFocused = useIsFocused();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [groupsCount, setGroupsCount] = useState(0);
  const [savedPreview, setSavedPreview] = useState<any[]>([]);
  const [favoritesPreview, setFavoritesPreview] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<{
    for_you: DashboardRecommendation[];
    trending: DashboardRecommendation[];
    course_related: DashboardRecommendation[];
  }>({ for_you: [], trending: [], course_related: [] });
  const [recentlyViewed, setRecentlyViewed] = useState<Resource[]>([]);
  const [recentlyUploaded, setRecentlyUploaded] = useState<Resource[]>([]);
  
  // Gamification state
  const [gamificationStats, setGamificationStats] = useState<{
    total_points: number;
    leaderboard_rank: number | null;
    consecutive_login_days: number;
    earned_badges: Array<{ id: string; name: string; icon: string; category: string }>;
  } | null>(null);
  const lastHeaderBadgeRefreshAtRef = useRef(0);
  const lastQuickActionBadgeRefreshAtRef = useRef(0);

  const loadStoredAnnouncementReadIds = useCallback(async (): Promise<string[]> => {
    try {
      const raw = await AsyncStorage.getItem(buildAnnouncementStateKey(user?.id));
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map((value) => String(value)).filter(Boolean);
    } catch (storageError) {
      console.error('Failed to load announcement read state:', storageError);
      return [];
    }
  }, [user?.id]);

  const refreshHeaderBadges = useCallback(async (force: boolean = false) => {
    if (
      !force &&
      Date.now() - lastHeaderBadgeRefreshAtRef.current < HOME_BADGE_REFRESH_INTERVAL_MS
    ) {
      return;
    }

    try {
      const [unreadCountRes, announcementsRes, readIds] = await Promise.all([
        notificationsApi.getUnreadCount(),
        announcementsApi.getAnnouncements({ page: 1, page_size: 100 }),
        loadStoredAnnouncementReadIds(),
      ]);

      setUnreadCount(Number(unreadCountRes?.unread_count || 0));

      const readIdSet = new Set(readIds);
      const unreadAnnouncements = (announcementsRes.results || []).filter((announcement) => {
        const readKey = announcement.slug || announcement.id;
        return !readIdSet.has(readKey);
      }).length;
      setUnreadAnnouncementsCount(unreadAnnouncements);
      lastHeaderBadgeRefreshAtRef.current = Date.now();
    } catch (badgeError) {
      console.error('Failed to refresh home badges:', badgeError);
    }
  }, [loadStoredAnnouncementReadIds]);

  const refreshQuickActionBadges = useCallback(async (force: boolean = false) => {
    if (
      !force &&
      Date.now() - lastQuickActionBadgeRefreshAtRef.current < HOME_BADGE_REFRESH_INTERVAL_MS
    ) {
      return;
    }

    try {
      const [favoritesRes, userGroupsRes] = await Promise.all([
        favoritesService.getFavorites({ limit: 1 }),
        resourcesAPI.getUserStudyGroups(),
      ]);
      const favoritesPagination = (favoritesRes as any)?.pagination;

      setFavoritesCount(
        Number(
          favoritesPagination?.total ??
            favoritesRes?.favorites?.length ??
            favoritesRes?.results?.length ??
            0
        )
      );
      setGroupsCount(extractResults(userGroupsRes).length);
      lastQuickActionBadgeRefreshAtRef.current = Date.now();
    } catch (quickActionBadgeError) {
      console.error('Failed to refresh quick action badges:', quickActionBadgeError);
    }
  }, []);

  const refreshRecentlyUploaded = useCallback(async () => {
    try {
      const recentUploadsRes = await resourcesAPI.list({ sort: 'newest', limit: 5 });
      setRecentlyUploaded(extractResults<Resource>(recentUploadsRes));
    } catch (recentlyUploadedError) {
      console.error('Failed to refresh recent uploads:', recentlyUploadedError);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch all data in parallel
      const [
        dashboardRes,
        bookmarksRes,
        favoritesRes,
        recommendationsRes,
        recentlyUploadedRes,
        userGroupsRes,
      ] = await Promise.all([
        analyticsAPI.getDashboard(),
        bookmarksService.getBookmarks({ limit: 3 }),
        favoritesService.getFavorites({ limit: 3, type: 'resources' }),
        dashboardApi.getRecommendations(),
        resourcesAPI.list({ sort: 'newest', limit: 5 }).catch(() => ({ results: [] })),
        resourcesAPI.getUserStudyGroups().catch(() => ({ data: { data: [] } })),
      ]);
      const favoritesPagination = (favoritesRes as any)?.pagination;
      
      const data = dashboardRes.data.data as DashboardData;
      setDashboardData(data);
      setSavedPreview(bookmarksRes.bookmarks || bookmarksRes.results || []);
      setFavoritesPreview(favoritesRes.favorites || favoritesRes.results || []);
      setFavoritesCount(
        Number(
          data?.stats?.total_favorites ??
            favoritesPagination?.total ??
            favoritesRes?.favorites?.length ??
            favoritesRes?.results?.length ??
            0
        )
      );
      setGroupsCount(extractResults(userGroupsRes).length);
      lastQuickActionBadgeRefreshAtRef.current = Date.now();
      
      setRecommendations(recommendationsRes);
      setRecentlyViewed(data.recent_resources || []);
      setRecentlyUploaded(extractResults<Resource>(recentlyUploadedRes));

      // Fetch gamification stats
      try {
        const gamificationRes = await gamificationAPI.getStats();
        const gamData = gamificationRes.data?.data;
        if (gamData) {
          setGamificationStats({
            total_points: Number(gamData.total_points || 0),
            leaderboard_rank: gamData.leaderboard_rank ?? null,
            consecutive_login_days: Number(gamData.consecutive_login_days || 0),
            earned_badges: (gamData.earned_badges || []).slice(0, 4).map((b: any) => ({
              id: String(b.id || ''),
              name: String(b.name || 'Badge'),
              icon: String(b.icon || 'star'),
              category: String(b.category || ''),
            })),
          });
        }
      } catch (gamErr) {
        console.log('Gamification not available:', gamErr);
      }

      await refreshHeaderBadges(true);
    } catch (err: any) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshHeaderBadges]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (isFocused && !loading) {
      void Promise.all([refreshHeaderBadges(), refreshQuickActionBadges()]);
    }
  }, [isFocused, loading, refreshHeaderBadges, refreshQuickActionBadges]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const unsubscribe = notificationService.subscribeToRealtimeNotifications((notification) => {
      void refreshHeaderBadges(true);

      if (notification.notification_type === 'new_resource') {
        void refreshRecentlyUploaded();
      }
    });

    return unsubscribe;
  }, [isFocused, refreshHeaderBadges, refreshRecentlyUploaded]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dashboardApi.invalidateCache();
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

  const handleShare = async (resourceId: string, resourceTitle: string) => {
    try {
      await Share.share({
        message: `Check out this resource on CampusHub: ${resourceTitle}`,
        title: resourceTitle,
      });
    } catch (error) {
      console.log('Share cancelled or failed');
    }
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
        )
      };
    });
  };

  const handleToggleFavorite = async (resourceId: string) => {
    await favoritesService.toggleResourceFavorite(resourceId);
    setDashboardData(prev => {
      if (!prev) return prev;
      const targetResource = prev.recent_resources.find((resource) => resource.id === resourceId);
      const delta = targetResource?.is_favorited ? -1 : 1;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          total_favorites: Math.max(0, prev.stats.total_favorites + delta),
        },
        recent_resources: prev.recent_resources.map(resource =>
          resource.id === resourceId
            ? { ...resource, is_favorited: !resource.is_favorited }
            : resource
        )
      };
    });
    setFavoritesCount((prev) => {
      const currentResource = dashboardData?.recent_resources.find((resource) => resource.id === resourceId);
      const delta = currentResource?.is_favorited ? -1 : 1;
      return Math.max(0, prev + delta);
    });
  };

  const handleCategoryPress = (category: CategoryItem) => {
    // Navigate to resources with filter
    router.push({
      pathname: '/(student)/tabs/resources',
      params: { type: category.id }
    });
  };

  const handleQuickActionPress = (action: QuickAction) => {
    router.push(action.route as any);
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

  const getQuickActionBadgeCount = (actionId: QuickAction['id']): number => {
    if (actionId === 'announcements') return unreadAnnouncementsCount;
    if (actionId === 'favorites') return favoritesCount;
    if (actionId === 'groups') return groupsCount;
    return 0;
  };

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
            <View>
              <Text style={styles.logoText}>CampusHub</Text>
              {user?.course && (
                <Text style={styles.courseText} numberOfLines={1}>
                  {user.course}
                </Text>
              )}
            </View>
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
              style={styles.profileButton}
              onPress={() => router.push('/(student)/tabs/profile')}
            >
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  {user?.last_name?.[0] || ''}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Welcome Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={styles.heroGreeting}>{getGreeting()},</Text>
            <Text style={styles.heroName}>{user?.first_name || 'Student'}!</Text>
            <Text style={styles.heroSubtext}>
              {user?.department 
                ? `${user.department} • Ready to learn?`
                : 'Ready to continue learning?'
              }
            </Text>
              <View style={styles.heroButtons}>
                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: colors.success }]}
                  onPress={() => router.push('/(student)/upload-resource')}
                >
                  <Icon name="cloud-upload" size={20} color={colors.text.inverse} />
                  <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>Upload</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={() => router.push('/(student)/tabs/resources')}
                >
                  <Icon name="search" size={18} color={colors.primary[500]} />
                  <Text style={styles.secondaryButtonText}>Browse</Text>
                </TouchableOpacity>
              </View>
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
              placeholder="Search notes, books, past papers, tutorials..."
              placeholderTextColor={colors.text.tertiary}
              editable={false}
              pointerEvents="none"
            />
            <TouchableOpacity style={styles.filterButton}>
              <Icon name="ellipsis-horizontal" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* 4. Quick Action Buttons */}
        <View style={styles.section}>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => {
              const badgeCount = getQuickActionBadgeCount(action.id);
              return (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionItem}
                onPress={() => handleQuickActionPress(action)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
                  <Icon name={action.icon as any} size={22} color={action.color} />
                  {badgeCount > 0 && (
                    <View style={styles.quickActionBadge}>
                      <Text style={styles.quickActionBadgeText}>
                        {formatBadgeCount(badgeCount)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.quickActionLabel}>{action.name}</Text>
              </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4B. Gamification / Progress Section */}
        {gamificationStats && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Progress</Text>
              <TouchableOpacity onPress={() => router.push('/(student)/leaderboard')}>
                <Text style={styles.viewAll}>Leaderboard</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.gamificationCard}>
              <View style={styles.gamificationTopRow}>
                {/* Points */}
                <View style={styles.gamificationStat}>
                  <View style={[styles.gamificationIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Icon name="star" size={20} color="#F59E0B" />
                  </View>
                  <Text style={styles.gamificationValue}>{gamificationStats.total_points}</Text>
                  <Text style={styles.gamificationLabel}>Points</Text>
                </View>
                
                {/* Streak */}
                <View style={styles.gamificationStat}>
                  <View style={[styles.gamificationIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Icon name="flame" size={20} color="#EF4444" />
                  </View>
                  <Text style={styles.gamificationValue}>{gamificationStats.consecutive_login_days}</Text>
                  <Text style={styles.gamificationLabel}>Day Streak</Text>
                </View>
                
                {/* Rank */}
                <View style={styles.gamificationStat}>
                  <View style={[styles.gamificationIcon, { backgroundColor: '#DBEAFE' }]}>
                    <Icon name="flag" size={20} color="#3B82F6" />
                  </View>
                  <Text style={styles.gamificationValue}>#{gamificationStats.leaderboard_rank || '-'}</Text>
                  <Text style={styles.gamificationLabel}>Rank</Text>
                </View>
              </View>
              
              {/* Badges Preview */}
              {gamificationStats.earned_badges.length > 0 && (
                <View style={styles.badgesPreview}>
                  <Text style={styles.badgesPreviewTitle}>Badges Earned</Text>
                  <View style={styles.badgesPreviewRow}>
                    {gamificationStats.earned_badges.map((badge) => (
                      <View key={badge.id} style={styles.badgePreviewItem}>
                        <View style={styles.badgePreviewIcon}>
                          <Icon name="star" size={16} color="#8B5CF6" />
                        </View>
                        <Text style={styles.badgePreviewName} numberOfLines={1}>{badge.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 5. Recently Uploaded Files */}
        {recentlyUploaded.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Uploaded</Text>
              <TouchableOpacity onPress={() => router.push('/(student)/tabs/resources')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {recentlyUploaded.slice(0, 5).map((resource) => (
                <TouchableOpacity 
                  key={resource.id} 
                  style={styles.resourceCard}
                  onPress={() => router.push(`/(student)/resource/${resource.id}`)}
                >
                  <View style={styles.resourceCardContent}>
                    <View style={styles.resourceTypeRow}>
                      <View style={[styles.resourceTypeTag, { backgroundColor: getResourceTypeColor(resource.resource_type) + '20' }]}>
                        <Text style={[styles.resourceTypeText, { color: getResourceTypeColor(resource.resource_type) }]}>
                          {resource.resource_type || 'File'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.resourceTitle} numberOfLines={2}>{resource.title}</Text>
                    <Text style={styles.resourceMeta}>
                      {resource.course?.name || resource.course?.code || 'General'}
                    </Text>
                    {resource.uploaded_by && (
                      <Text style={styles.uploaderText}>Uploaded by {resource.uploaded_by}</Text>
                    )}
                    <View style={styles.resourceCardFooter}>
                      <View style={styles.downloadContainer}>
                        <Icon name="eye" size={14} color={colors.text.tertiary} />
                        <Text style={styles.downloadText}>{resource.view_count || 0}</Text>
                      </View>
                      <View style={styles.downloadContainer}>
                        <Icon name="download" size={14} color={colors.text.tertiary} />
                        <Text style={styles.downloadText}>{resource.download_count || 0}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 6. Categories / Explore Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explore</Text>
            <TouchableOpacity onPress={() => router.push('/(student)/tabs/resources')}>
              <Text style={styles.viewAll}>Browse All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryChip}
                onPress={() => handleCategoryPress(category)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Icon name={category.icon as any} size={18} color={category.color} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 6. Continue Studying Section */}
        {recentlyViewed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Continue Studying</Text>
              <TouchableOpacity onPress={() => router.push('/(student)/tabs/resources')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {recentlyViewed.slice(0, 5).map((resource) => (
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
                      <TouchableOpacity
                        onPress={() => handleShare(resource.id, resource.title)}
                        style={[styles.cardActionButton, { backgroundColor: colors.primary[50], padding: 6, borderRadius: 8 }]}
                      >
                        <Icon name="share-social" size={18} color={colors.primary[500]} />
                      </TouchableOpacity>
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
          </View>
        )}

        {/* 7. Recommended for You Section */}
        {recommendations.for_you.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommended for You</Text>
              <TouchableOpacity onPress={() => router.push('/(student)/recommendations')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {recommendations.for_you.slice(0, 5).map((resource) => (
                <TouchableOpacity 
                  key={resource.id} 
                  style={styles.resourceCard}
                  onPress={() => router.push(`/(student)/resource/${resource.id}`)}
                >
                  <View style={styles.resourceCardHeader}>
                    <View style={[styles.resourceTypeTag, { backgroundColor: getResourceTypeColor(resource.file_type) + '20' }]}>
                      <Text style={[styles.resourceTypeText, { color: getResourceTypeColor(resource.file_type) }]}>
                        {resource.file_type}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.resourceTitle} numberOfLines={2}>{resource.title}</Text>
                  <Text style={styles.resourceMeta}>
                    {resource.course_name || 'General'}
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
                  <View style={styles.cardQuickActions}>
                    <TouchableOpacity 
                      style={styles.quickActionBtn}
                      onPress={() => handleToggleFavorite(resource.id)}
                    >
                      <Icon name="heart-outline" size={18} color={colors.text.tertiary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.quickActionBtn}
                      onPress={() => handleToggleBookmark(resource.id)}
                    >
                      <Icon name="bookmark-outline" size={18} color={colors.text.tertiary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.quickActionBtn}
                    >
                      <Icon name="download" size={18} color={colors.text.tertiary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.quickActionBtn}
                      onPress={() => handleShare(resource.id, resource.title)}
                    >
                      <Icon name="share-social" size={18} color={colors.primary[500]} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 8. Trending Resources Section */}
        {recommendations.trending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.titleWithBadge}>
                <Text style={styles.sectionTitle}>Trending Now</Text>
                <View style={styles.trendingBadge}>
                  <Icon name="trending-up" size={12} color={colors.text.inverse} />
                  <Text style={styles.trendingBadgeText}>Hot</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/(student)/recommendations')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {recommendations.trending.slice(0, 5).map((resource) => (
                <TouchableOpacity 
                  key={resource.id} 
                  style={styles.resourceCard}
                  onPress={() => router.push(`/(student)/resource/${resource.id}`)}
                >
                  <View style={styles.resourceCardHeader}>
                    <View style={[styles.resourceTypeTag, { backgroundColor: getResourceTypeColor(resource.file_type) + '20' }]}>
                      <Text style={[styles.resourceTypeText, { color: getResourceTypeColor(resource.file_type) }]}>
                        {resource.file_type}
                      </Text>
                    </View>
                    <View style={styles.trendingIndicator}>
                      <TouchableOpacity
                        onPress={() => handleShare(resource.id, resource.title)}
                        style={[styles.cardActionButton, { backgroundColor: colors.primary[50], padding: 6, borderRadius: 8 }]}
                      >
                        <Icon name="share-social" size={16} color={colors.primary[500]} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.resourceTitle} numberOfLines={2}>{resource.title}</Text>
                  <Text style={styles.resourceMeta}>
                    {resource.course_name || 'General'}
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
          </View>
        )}

        {/* 8b. Course-Related Resources Section */}
        {recommendations.course_related.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>For Your Course</Text>
              <TouchableOpacity onPress={() => router.push('/(student)/recommendations')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {recommendations.course_related.slice(0, 5).map((resource) => (
                <TouchableOpacity 
                  key={resource.id} 
                  style={styles.resourceCard}
                  onPress={() => router.push(`/(student)/resource/${resource.id}`)}
                >
                  <View style={styles.resourceCardHeader}>
                    <View style={[styles.resourceTypeTag, { backgroundColor: getResourceTypeColor(resource.file_type) + '20' }]}>
                      <Text style={[styles.resourceTypeText, { color: getResourceTypeColor(resource.file_type) }]}>
                        {resource.file_type}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.resourceTitle} numberOfLines={2}>{resource.title}</Text>
                  <Text style={styles.resourceMeta}>
                    {resource.course_name || 'General'}
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
          </View>
        )}


        {/* 10. Saved Preview */}
        {savedPreview.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved</Text>
              <TouchableOpacity onPress={() => router.push('/(student)/tabs/saved')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <Card style={styles.previewCard}>
              {savedPreview.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.previewRow,
                    index < savedPreview.length - 1 && styles.previewBorder
                  ]}
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
                  <Icon name="bookmark" size={18} color={colors.accent[500]} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        )}

        {/* 11. Favorites Preview */}
        {favoritesPreview.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Favorites</Text>
              <TouchableOpacity onPress={() => router.push('/(student)/favorites')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <Card style={styles.previewCard}>
              {favoritesPreview.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.previewRow,
                    index < favoritesPreview.length - 1 && styles.previewBorder
                  ]}
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
                  <Icon name="heart" size={18} color={colors.error} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        )}

        {/* 12. Announcements Preview */}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Announcements</Text>
              <TouchableOpacity onPress={() => router.push('/(student)/announcements')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            
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
                    <View style={[styles.announcementIconBox, { backgroundColor: announcement.type === 'urgent' ? colors.error + '20' : colors.warning + '20' }]}>
                      <Icon name="megaphone" size={16} color={announcement.type === 'urgent' ? colors.error : colors.warning} />
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
          </View>
        )}

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
    paddingBottom: 100,
  },
  
  // Top Navigation
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
    width: 44,
    height: 44,
    borderRadius: 14,
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
  courseText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: spacing[3],
    marginTop: 2,
    flexShrink: 1,
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  avatarText: {
    color: colors.text.inverse,
    fontSize: 18,
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '700',
  },

  // Hero Card
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
    fontSize: 15,
    color: colors.text.inverse,
    opacity: 0.85,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.inverse,
    marginBottom: spacing[1],
  },
  heroSubtext: {
    fontSize: 13,
    color: colors.text.inverse,
    opacity: 0.8,
    marginBottom: spacing[4],
  },
  heroButtons: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text.inverse,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  primaryButtonText: {
    color: colors.primary[600],
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  secondaryButtonText: {
    color: colors.text.inverse,
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

  // Search Bar
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
    fontSize: 15,
    color: colors.text.primary,
    marginHorizontal: spacing[3],
  },
  filterButton: {
    padding: spacing[2],
  },

  // Section Styles
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
    fontWeight: '700',
    color: colors.text.primary,
  },
  viewAll: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '600',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent[500],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  trendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.inverse,
  },

  // Gamification Styles
  gamificationCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    ...shadows.sm,
  },
  gamificationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gamificationStat: {
    alignItems: 'center',
    flex: 1,
  },
  gamificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  gamificationValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  gamificationLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  badgesPreview: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  badgesPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  badgesPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  badgePreviewItem: {
    alignItems: 'center',
    width: 64,
  },
  badgePreviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgePreviewName: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
    position: 'relative',
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  quickActionBadgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '700',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },

  // Categories
  categoriesScroll: {
    paddingRight: spacing[6],
    gap: spacing[3],
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    ...shadows.sm,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Horizontal Scroll
  horizontalScroll: {
    paddingRight: spacing[6],
    gap: spacing[3],
  },

  // Resource Card
  resourceCard: {
    width: 180,
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
  cardActionButton: {
    padding: spacing[1],
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
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  resourceTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  resourceCardContent: {
    padding: spacing[4],
  },
  uploaderText: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginBottom: spacing[2],
  },
  cardQuickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  quickActionBtn: {
    padding: spacing[1],
  },
  trendingIndicator: {
    padding: 2,
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

  // Storage Card
  storageCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  storageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  storageInfo: {
    flex: 1,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  storageBar: {
    height: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  storageProgress: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 3,
  },
  storageText: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Preview Cards
  previewCard: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  previewRow: {
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBorder: {
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
  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyCardText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing[3],
    textAlign: 'center',
  },
  emptyCardAction: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '600',
    marginTop: spacing[2],
  },

  // Announcements
  announcementCard: {
    padding: spacing[4],
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
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  announcementTextContainer: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  announcementTime: {
    fontSize: 12,
    color: colors.text.tertiary,
  },

  // Empty States
  emptySection: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[8],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptySectionText: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: spacing[3],
  },
});

export default HomeScreen;
