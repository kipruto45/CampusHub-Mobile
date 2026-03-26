/**
 * Admin Notifications Screen
 * Real-time admin notifications and alerts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { notificationsAPI } from '../../services/api';

interface AdminNotification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  link: string;
  created_at: string;
}

const NOTIFICATION_TYPE_LABELS: { [key: string]: string } = {
  admin_user_report: 'User Report',
  admin_content_report: 'Content Report',
  admin_new_user_signup: 'New User',
  admin_suspicious_activity: 'Security Alert',
  admin_system_alert: 'System Alert',
  admin_resource_pending_moderation: 'Moderation',
  admin_bulk_operation_complete: 'Bulk Operation',
  admin_api_threshold_warning: 'API Warning',
  admin_storage_warning: 'Storage',
  admin_performance_alert: 'Performance',
};

const PRIORITY_COLORS: { [key: string]: string } = {
  low: '#9CA3AF',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, unread: 0, urgent: 0 });

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationsAPI.adminList();
      const data = response?.data?.data ?? response?.data ?? {};
      setNotifications(Array.isArray(data?.results) ? data.results : []);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await notificationsAPI.adminStats();
      const data = response?.data?.data ?? response?.data ?? {};
      setStats({
        total: Number(data?.total || 0),
        unread: Number(data?.unread || 0),
        urgent: Number(data?.urgent || 0),
      });
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  }, []);

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAdminRead();
      await fetchNotifications();
      await fetchStats();
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
    fetchStats();
  }, [fetchNotifications, fetchStats]);

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [fetchNotifications, fetchStats]);

  const renderNotification = ({ item }: { item: AdminNotification }) => {
    const typeLabel = NOTIFICATION_TYPE_LABELS[item.notification_type] || 'Notification';
    const priorityColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
        onPress={() => {
          if (item.link) {
            router.push(item.link as any);
          }
        }}
      >
        <View style={styles.notificationHeader}>
          <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
          <View style={styles.typeContainer}>
            <Text style={styles.typeLabel}>{typeLabel}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          {!item.is_read && <View style={styles.unreadBadge} />}
        </View>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.unread}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.urgent}</Text>
          <Text style={styles.statLabel}>Urgent</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={markAllAsRead}
        >
          <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
            Mark All Read
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No admin notifications</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 8,
  },
  typeContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
