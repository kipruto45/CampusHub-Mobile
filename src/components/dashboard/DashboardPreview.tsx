// Dashboard Preview Components for CampusHub Mobile App
// Displays previews of notifications, announcements, and recent activity

import React,{ useEffect,useState } from 'react';
import { RefreshControl,ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import { DashboardActivityItem,DashboardAnnouncement,dashboardApi,DashboardNotificationItem } from '../../services/dashboard.service';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';
import Card from '../ui/Card';
import Icon from '../ui/Icon';

// Announcements Preview
interface AnnouncementsPreviewProps {
  onViewAll?: () => void;
  onAnnouncementPress?: (announcement: DashboardAnnouncement) => void;
}

export const AnnouncementsPreview: React.FC<AnnouncementsPreviewProps> = ({
  onViewAll,
  onAnnouncementPress,
}) => {
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await dashboardApi.getAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAnnouncementIcon = (type: string): string => {
    switch (type) {
      case 'urgent': return 'warning';
      case 'maintenance': return 'construct';
      case 'academic': return 'school';
      case 'course_update': return 'book';
      default: return 'megaphone';
    }
  };

  const getAnnouncementColor = (type: string): string => {
    switch (type) {
      case 'urgent': return colors.error;
      case 'maintenance': return colors.warning;
      case 'academic': return colors.info;
      default: return colors.primary[500];
    }
  };

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Announcements</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Announcements</Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <Icon name="chevron-forward" size={16} color={colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>
      
      {announcements.slice(0, 3).map((announcement, index) => (
        <TouchableOpacity
          key={announcement.id}
          style={[
            styles.announcementItem,
            index < announcements.length - 1 && styles.itemBorder,
          ]}
          onPress={() => onAnnouncementPress?.(announcement)}
        >
          <View style={[
            styles.announcementIcon,
            { backgroundColor: getAnnouncementColor(announcement.type) + '20' },
          ]}>
            <Icon
              name={getAnnouncementIcon(announcement.type) as any}
              size={18}
              color={getAnnouncementColor(announcement.type)}
            />
          </View>
          <View style={styles.announcementContent}>
            <Text style={styles.announcementTitle} numberOfLines={1}>
              {announcement.title}
            </Text>
            <Text style={styles.announcementMessage} numberOfLines={1}>
              {announcement.message}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </Card>
  );
};

// Notifications Preview
interface NotificationsPreviewProps {
  onViewAll?: () => void;
  onNotificationPress?: (notification: DashboardNotificationItem) => void;
}

export const NotificationsPreview: React.FC<NotificationsPreviewProps> = ({
  onViewAll,
  onNotificationPress,
}) => {
  const [notifications, setNotifications] = useState<DashboardNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await dashboardApi.getNotificationsSummary();
      setNotifications(data.recent_notifications);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'resource_approved': return 'checkmark-circle';
      case 'resource_rejected': return 'close-circle';
      case 'new_comment': return 'chatbubble-ellipses';
      case 'comment_reply': return 'arrow-return-left';
      case 'new_rating': return 'star';
      case 'announcement': return 'megaphone';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'resource_approved': return colors.success;
      case 'resource_rejected': return colors.error;
      case 'new_comment':
      case 'comment_reply': return colors.info;
      case 'new_rating': return colors.warning;
      case 'announcement': return colors.accent[500];
      default: return colors.text.secondary;
    }
  };

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <Icon name="chevron-forward" size={16} color={colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>
      
      {notifications.slice(0, 3).map((notification, index) => (
        <TouchableOpacity
          key={notification.id}
          style={[
            styles.notificationItem,
            index < notifications.length - 1 && styles.itemBorder,
          ]}
          onPress={() => onNotificationPress?.(notification)}
        >
          {!notification.is_read && <View style={styles.unreadDot} />}
          <View style={[
            styles.notificationIcon,
            { backgroundColor: getNotificationColor(notification.type) + '20' },
          ]}>
            <Icon
              name={getNotificationIcon(notification.type) as any}
              size={16}
              color={getNotificationColor(notification.type)}
            />
          </View>
          <View style={styles.notificationContent}>
            <Text
              style={[
                styles.notificationTitle,
                !notification.is_read && styles.unreadTitle,
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text style={styles.notificationMessage} numberOfLines={1}>
              {notification.message}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </Card>
  );
};

// Recent Activity Preview
interface RecentActivityPreviewProps {
  onViewAll?: () => void;
  onActivityPress?: (activity: DashboardActivityItem) => void;
}

export const RecentActivityPreview: React.FC<RecentActivityPreviewProps> = ({
  onViewAll,
  onActivityPress,
}) => {
  const [activities, setActivities] = useState<{
    uploads: DashboardActivityItem[];
    downloads: DashboardActivityItem[];
    bookmarks: DashboardActivityItem[];
  }>({ uploads: [], downloads: [], bookmarks: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      const data = await dashboardApi.getRecentActivity();
      setActivities({
        uploads: data.recent_uploads || [],
        downloads: data.recent_downloads || [],
        bookmarks: data.recent_bookmarks || [],
      });
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'upload': return 'cloud-upload';
      case 'download': return 'arrow-down-circle';
      case 'bookmark': return 'bookmark';
      default: return 'activity';
    }
  };

  const getActivityColor = (type: string): string => {
    switch (type) {
      case 'upload': return colors.primary[500];
      case 'download': return colors.success;
      case 'bookmark': return colors.warning;
      default: return colors.text.secondary;
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const allActivities = [
    ...activities.uploads.map(a => ({ ...a, category: 'upload' })),
    ...activities.downloads.map(a => ({ ...a, category: 'download' })),
    ...activities.bookmarks.map(a => ({ ...a, category: 'bookmark' })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Card>
    );
  }

  if (allActivities.length === 0) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <Icon name="chevron-forward" size={16} color={colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>
      
      {allActivities.map((activity, index) => (
        <TouchableOpacity
          key={`${activity.category}-${activity.id}`}
          style={[
            styles.activityItem,
            index < allActivities.length - 1 && styles.itemBorder,
          ]}
          onPress={() => onActivityPress?.(activity)}
        >
          <View style={[
            styles.activityIcon,
            { backgroundColor: getActivityColor(activity.category) + '20' },
          ]}>
            <Icon
              name={getActivityIcon(activity.category) as any}
              size={16}
              color={getActivityColor(activity.category)}
            />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle} numberOfLines={1}>
              {activity.title}
            </Text>
            <Text style={styles.activityDescription} numberOfLines={1}>
              {activity.description}
            </Text>
          </View>
          <Text style={styles.activityTime}>
            {formatTimeAgo(activity.timestamp)}
          </Text>
        </TouchableOpacity>
      ))}
    </Card>
  );
};

// Combined Dashboard Previews Component
interface DashboardPreviewsProps {
  onViewAllNotifications?: () => void;
  onViewAllAnnouncements?: () => void;
  onViewAllActivity?: () => void;
  onNotificationPress?: (notification: DashboardNotificationItem) => void;
  onAnnouncementPress?: (announcement: DashboardAnnouncement) => void;
  onActivityPress?: (activity: DashboardActivityItem) => void;
}

export const DashboardPreviews: React.FC<DashboardPreviewsProps> = ({
  onViewAllNotifications,
  onViewAllAnnouncements,
  onViewAllActivity,
  onNotificationPress,
  onAnnouncementPress,
  onActivityPress,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = async () => {
    setRefreshing(true);
    dashboardApi.invalidateCache();
    setRefreshKey((current) => current + 1);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      >
      <AnnouncementsPreview
        key={`announcements-${refreshKey}`}
        onViewAll={onViewAllAnnouncements}
        onAnnouncementPress={onAnnouncementPress}
      />
      
      <NotificationsPreview
        key={`notifications-${refreshKey}`}
        onViewAll={onViewAllNotifications}
        onNotificationPress={onNotificationPress}
      />
      
      <RecentActivityPreview
        key={`activity-${refreshKey}`}
        onViewAll={onViewAllActivity}
        onActivityPress={onActivityPress}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
    gap: spacing[4],
  },
  card: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  loadingContainer: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  badge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  // Announcement styles
  announcementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  announcementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  announcementContent: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  announcementMessage: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  // Notification styles
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginRight: spacing[2],
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  // Activity styles
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  activityTime: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginLeft: spacing[2],
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
});

export default DashboardPreviews;
