// Notification Item Component for CampusHub Mobile App
// Displays a single notification item

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import Icon from '../ui/Icon';
import { Notification } from '../../services/notifications-api.service';

interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  onMarkAsRead?: (id: string) => void;
}

const getNotificationIcon = (type: string): string => {
  switch (type) {
    case 'resource_approved':
      return 'checkmark-circle';
    case 'resource_rejected':
      return 'close-circle';
    case 'new_resource':
      return 'document-text';
    case 'resource_updated':
      return 'refresh';
    case 'resource_liked':
      return 'heart';
    case 'new_comment':
      return 'chatbubble-ellipses';
    case 'comment_reply':
      return 'arrow-return-left';
    case 'new_rating':
      return 'star';
    case 'new_download':
      return 'arrow-down-circle';
    case 'trending':
      return 'flame';
    case 'announcement':
      return 'megaphone';
    case 'report_update':
      return 'flag';
    case 'resource_shared_with_user':
      return 'share';
    case 'resource_shared_to_group':
      return 'people';
    case 'resource_request':
      return 'help-circle';
    case 'inactivity_reminder':
      return 'time';
    case 'system':
      return 'gear';
    default:
      return 'notifications';
  }
};

const getNotificationColor = (type: string): string => {
  switch (type) {
    case 'resource_approved':
      return colors.success;
    case 'resource_rejected':
      return colors.error;
    case 'new_resource':
      return colors.success;
    case 'resource_updated':
      return colors.info;
    case 'resource_liked':
      return colors.error;
    case 'new_comment':
    case 'comment_reply':
      return colors.info;
    case 'new_rating':
      return colors.warning;
    case 'new_download':
      return colors.primary[500];
    case 'trending':
      return colors.warning;
    case 'announcement':
      return colors.accent[500];
    case 'report_update':
      return colors.primary[600];
    case 'resource_shared_with_user':
      return colors.primary[500];
    case 'resource_shared_to_group':
      return colors.primary[400];
    case 'resource_request':
      return colors.warning;
    case 'inactivity_reminder':
      return colors.warning;
    default:
      return colors.text.secondary;
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
}) => {
  const iconName = getNotificationIcon(notification.notification_type);
  const iconColor = getNotificationColor(notification.notification_type);

  const handlePress = () => {
    if (onPress) {
      onPress(notification);
    }
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.is_read && styles.unreadContainer,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <Icon name={iconName as any} size={24} color={iconColor} />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.title,
              !notification.is_read && styles.unreadTitle,
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          {!notification.is_read && <View style={styles.unreadDot} />}
        </View>
        
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        
        <View style={styles.footerRow}>
          <Text style={styles.typeLabel}>
            {notification.notification_type_display}
          </Text>
          <Text style={styles.time}>
            {formatTimeAgo(notification.created_at)}
          </Text>
        </View>
      </View>
      
      {notification.link && (
        <View style={styles.arrowContainer}>
          <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.card.light,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  unreadContainer: {
    backgroundColor: colors.primary[50],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginLeft: spacing[2],
  },
  message: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing[2],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  time: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingLeft: spacing[2],
  },
});

export default NotificationItem;
