// Notifications Screen for CampusHub
// User notifications with read/unread states and actions
// Backend-driven - no mock data

import { useFocusEffect,useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useRef,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { notificationsAPI } from '../../services/api';
import {
  getDefaultNotificationUndoMs,
  getNotificationUndoMs,
} from '../../services/app-settings';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { resolveStudentNotificationTarget } from '../../utils/notification-targets';

// Notification Types - matches backend response
interface Notification {
  id: string;
  type: string;
  notification_type_display?: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  resource_id?: string;
  created_at: string;
}

const NotificationsScreen: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [undoTimeoutMs, setUndoTimeoutMs] = useState(getDefaultNotificationUndoMs());

  type PendingActionSingle = {
    type: 'single';
    notification: Notification;
    index: number;
    timer: ReturnType<typeof setTimeout>;
  };
  type PendingActionBulk = {
    type: 'bulk';
    notifications: Notification[];
    timer: ReturnType<typeof setTimeout>;
  };
  type PendingAction = PendingActionSingle | PendingActionBulk;
  type PendingActionDraft =
    | Omit<PendingActionSingle, 'timer'>
    | Omit<PendingActionBulk, 'timer'>;
  const pendingActionRef = useRef<PendingAction | null>(null);

  const commitPendingAction = useCallback(async (pending: PendingAction) => {
    try {
      if (pending.type === 'single') {
        await notificationsAPI.markAsRead(pending.notification.id);
      } else {
        await notificationsAPI.markAllAsRead();
      }
    } catch (err) {
      console.error('Failed to finalize notification delete:', err);
    }
  }, []);

  const flushPendingAction = useCallback(
    (commit: boolean = true) => {
      const pending = pendingActionRef.current;
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingActionRef.current = null;
      if (commit) {
        void commitPendingAction(pending);
      }
    },
    [commitPendingAction]
  );

  const undoPendingAction = useCallback(() => {
    const pending = pendingActionRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingActionRef.current = null;

    if (pending.type === 'single') {
      setNotifications((prev) => {
        const next = [...prev];
        const insertAt = Math.min(Math.max(pending.index, 0), next.length);
        next.splice(insertAt, 0, pending.notification);
        return next;
      });
      showToast('success', 'Notification restored.');
    } else {
      setNotifications(pending.notifications);
      showToast('success', 'Notifications restored.');
    }
  }, [showToast]);

  const schedulePendingAction = useCallback(
    (pending: PendingActionDraft) => {
      const timer = setTimeout(() => {
        const current = pendingActionRef.current;
        if (!current || current.timer !== timer) return;
        pendingActionRef.current = null;
        void commitPendingAction(current);
      }, undoTimeoutMs);

      pendingActionRef.current =
        pending.type === 'single'
          ? { ...pending, timer }
          : { ...pending, timer };
    },
    [commitPendingAction, undoTimeoutMs]
  );

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      flushPendingAction();
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
  }, [flushPendingAction]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadUndoTimeout = async () => {
        const value = await getNotificationUndoMs();
        if (active) {
          setUndoTimeoutMs(value);
        }
      };
      loadUndoTimeout();
      return () => {
        active = false;
      };
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = (notification: Notification) => {
    if (!notification) return;
    setSubmitting(true);
    flushPendingAction();
    const index = notifications.findIndex((item) => item.id === notification.id);
    setNotifications((prev) => prev.filter((item) => item.id !== notification.id));

    schedulePendingAction({
      type: 'single',
      notification,
      index: index < 0 ? 0 : index,
    });

    showToast('info', 'Notification removed.', {
      actionLabel: 'Restore',
      onAction: undoPendingAction,
      duration: undoTimeoutMs,
    });
    setSubmitting(false);
  };

  const markAllAsRead = async () => {
    try {
      setSubmitting(true);
      if (notifications.length === 0) {
        setSubmitting(false);
        return;
      }

      flushPendingAction();
      const snapshot = notifications;
      setNotifications([]);
      setSelectedNotification(null);

      schedulePendingAction({
        type: 'bulk',
        notifications: snapshot,
      });

      showToast('info', 'All notifications cleared.', {
        actionLabel: 'Restore',
        onAction: undoPendingAction,
        duration: undoTimeoutMs,
      });
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
      Alert.alert('Error', 'Failed to mark all as read');
    } finally {
      setSubmitting(false);
    }
  };

  const closeNotificationModal = () => {
    setSelectedNotification(null);
  };

  const handleOpenNotificationTarget = async (notification: Notification) => {
    try {
      const target = resolveStudentNotificationTarget({
        link: notification.link,
        resourceId: notification.resource_id,
      });

      if (!target) {
        Alert.alert('Unable to open', 'This notification does not have a supported destination.');
        return;
      }

      closeNotificationModal();

      if (target.kind === 'external') {
        await Linking.openURL(target.value);
        return;
      }

      router.push(target.value as any);
    } catch (err) {
      console.error('Failed to open notification target:', err);
      Alert.alert('Unable to open', 'The linked notification item could not be opened right now.');
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      markAsRead(notification);
    }
  };

  useEffect(() => {
    return () => {
      flushPendingAction(true);
    };
  }, [flushPendingAction]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'resource':
      case 'new_resource':
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
      case 'new_resource':
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

  const formatRelativeDate = (dateString: string) => {
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

  const formatAbsoluteDateTime = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }
    return date.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown';
    }
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTimeOnly = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown';
    }
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const selectedNotificationTarget = selectedNotification
    ? resolveStudentNotificationTarget({
        link: selectedNotification.link,
        resourceId: selectedNotification.resource_id,
      })
    : null;
  const selectedNotificationHasTarget = Boolean(selectedNotificationTarget);

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
          <Text style={styles.cardTime}>{formatRelativeDate(item.created_at)}</Text>
          <Text style={styles.cardDate}>{formatAbsoluteDateTime(item.created_at)}</Text>
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

      <Modal
        visible={Boolean(selectedNotification)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeNotificationModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={closeNotificationModal}>
              <Icon name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Notification</Text>
            <View style={styles.placeholder} />
          </View>

          {selectedNotification && (
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalCard}>
                <View style={styles.modalBadgeRow}>
                  <View
                    style={[
                      styles.modalTypeBadge,
                      { backgroundColor: getIconColor(selectedNotification.type) + '20' },
                    ]}
                  >
                    <Icon
                      name={getNotificationIcon(selectedNotification.type) as any}
                      size={16}
                      color={getIconColor(selectedNotification.type)}
                    />
                    <Text
                      style={[
                        styles.modalTypeText,
                        { color: getIconColor(selectedNotification.type) },
                      ]}
                    >
                      {selectedNotification.notification_type_display || 'Notification'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.readBadge,
                      selectedNotification.is_read && styles.readBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.readBadgeText,
                        selectedNotification.is_read && styles.readBadgeTextActive,
                      ]}
                    >
                      {selectedNotification.is_read ? 'Read' : 'Unread'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalTitle}>{selectedNotification.title}</Text>

                <View style={styles.modalMetaRow}>
                  <View style={styles.modalMetaItem}>
                    <Text style={styles.modalMetaLabel}>Date</Text>
                    <Text style={styles.modalMetaValue}>
                      {formatDateOnly(selectedNotification.created_at)}
                    </Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Text style={styles.modalMetaLabel}>Time</Text>
                    <Text style={styles.modalMetaValue}>
                      {formatTimeOnly(selectedNotification.created_at)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalSectionLabel}>Summary</Text>
                <Text style={styles.modalSummary}>{selectedNotification.message}</Text>

                <Text style={styles.modalTimestamp}>
                  Received {formatRelativeDate(selectedNotification.created_at)}
                </Text>
              </View>

              <View style={styles.modalActions}>
                {selectedNotificationHasTarget && (
                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={() => void handleOpenNotificationTarget(selectedNotification)}
                  >
                    <Icon name="arrow-forward" size={18} color={colors.text.inverse} />
                    <Text style={styles.primaryActionText}>Open related item</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.secondaryAction} onPress={closeNotificationModal}>
                  <Text style={styles.secondaryActionText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
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
    gap: 2,
  },
  cardTime: { 
    fontSize: 11, 
    color: colors.text.tertiary,
  },
  cardDate: {
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  modalCard: {
    backgroundColor: colors.card.light,
    borderRadius: 20,
    padding: spacing[5],
    ...shadows.sm,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  modalTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexShrink: 1,
  },
  modalTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  readBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.gray[100],
  },
  readBadgeActive: {
    backgroundColor: colors.success + '15',
  },
  readBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  readBadgeTextActive: {
    color: colors.success,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 30,
    marginBottom: spacing[4],
  },
  modalMetaRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  modalMetaItem: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  modalMetaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    marginBottom: spacing[1],
  },
  modalMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },
  modalSummary: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  modalTimestamp: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing[4],
  },
  modalActions: {
    gap: spacing[3],
    marginTop: spacing[4],
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary[500],
    borderRadius: 16,
    paddingVertical: spacing[4],
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  secondaryAction: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: spacing[4],
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
  },
});

export default NotificationsScreen;
