// Notifications Screen for CampusHub
// User notifications with read/unread states and actions
// Backend-driven - no mock data

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import { notificationsAPI } from '../../services/api';

// Notification Types - matches backend response
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  resource_id?: string;
  created_at: string;
}

const NotificationsScreen: React.FC = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const response = await notificationsAPI.list();
      const data = response.data.data;
      
      // Handle both paginated and non-paginated responses
      const notificationsList = data.notifications || data.results || [];
      setNotifications(notificationsList);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      setSubmitting(true);
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (err: any) {
      console.error('Failed to mark as read:', err);
      // Still update local state even if API fails
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      setSubmitting(true);
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      Alert.alert('Success', 'All notifications marked as read');
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
      Alert.alert('Error', 'Failed to mark all as read');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification link
    if (notification.resource_id) {
      router.push(`/(student)/resource/${notification.resource_id}`);
    } else if (notification.link) {
      router.push(notification.link as any);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'resource':
      case 'resource_approved':
      case 'resource_rejected':
        return 'book';
      case 'comment':
      case 'reply':
        return 'chatbubbles';
      case 'announcement':
        return 'megaphone';
      case 'download':
        return 'download';
      case 'like':
      case 'heart':
        return 'heart';
      case 'follow':
        return 'person-add';
      case 'system':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'resource':
      case 'resource_approved':
        return colors.primary[500];
      case 'resource_rejected':
        return colors.error;
      case 'comment':
      case 'reply':
        return colors.accent[500];
      case 'announcement':
        return colors.warning;
      case 'download':
        return colors.success;
      case 'like':
      case 'heart':
        return colors.error;
      case 'follow':
        return colors.info;
      case 'system':
        return colors.gray[500];
      default:
        return colors.primary[500];
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[styles.card, !item.is_read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      disabled={submitting}
    >
      <View style={[styles.iconBox, { backgroundColor: getIconColor(item.type) + '20' }]}>
        <Icon name={getNotificationIcon(item.type) as any} size={22} color={getIconColor(item.type)} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, !item.is_read && styles.unreadTitle]}>
          {item.title}
        </Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.message}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardTime}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="notifications-off" size={48} color={colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>You're all caught up!</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Icon name="notifications" size={20} color={colors.primary[500]} />
          <Text style={styles.unreadBannerText}>
            You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
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
  if (error && notifications.length === 0) {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity 
          style={styles.markAllBtn}
          onPress={markAllAsRead}
          disabled={unreadCount === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllDisabled]}>
              Mark all read
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
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
    backgroundColor: colors.background.secondary 
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing[4], 
    paddingTop: spacing[12], 
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
  },
  title: { 
    flex: 1, 
    fontSize: 20, 
    fontWeight: '600', 
    color: colors.text.primary,
    marginLeft: spacing[2],
  },
  markAllBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minWidth: 80,
    alignItems: 'center',
  },
  markAllText: { 
    fontSize: 14, 
    color: colors.primary[500], 
    fontWeight: '500' 
  },
  markAllDisabled: {
    color: colors.text.tertiary,
  },
  headerSection: {
    paddingBottom: spacing[2],
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    padding: spacing[3],
    borderRadius: 12,
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  unreadBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary[700],
    flex: 1,
  },
  list: { 
    padding: spacing[4],
    paddingBottom: spacing[10],
    flexGrow: 1,
  },
  card: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: colors.card.light, 
    borderRadius: 16, 
    padding: spacing[4], 
    marginBottom: spacing[3], 
    ...shadows.sm,
  },
  unreadCard: { 
    backgroundColor: colors.card.light,
    borderLeftWidth: 4, 
    borderLeftColor: colors.primary[500],
  },
  iconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: spacing[3],
  },
  cardContent: { 
    flex: 1,
  },
  cardTitle: { 
    fontSize: 15, 
    fontWeight: '500', 
    color: colors.text.primary,
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  cardDesc: { 
    fontSize: 13, 
    color: colors.text.secondary,
    marginBottom: spacing[2],
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTime: { 
    fontSize: 11, 
    color: colors.text.tertiary,
  },
  unreadDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: colors.primary[500],
    marginLeft: spacing[2],
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 80 
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary, 
    marginBottom: spacing[2] 
  },
  emptyText: { 
    fontSize: 14, 
    color: colors.text.secondary 
  },
});

export default NotificationsScreen;
