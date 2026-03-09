// Admin Notifications Screen for CampusHub
// Admin-specific notifications

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import api from '../../services/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  created_at: string;
  link?: string;
}

const NotificationsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const fetchNotifications = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) setError(null);
      const params: any = {};
      if (showUnreadOnly) params.is_read = false;
      const response = await api.get('/notifications/', { params });
      setNotifications(response.data?.results || response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showUnreadOnly]);

  useEffect(() => { fetchNotifications(true); }, [fetchNotifications]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchNotifications(true); }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/`, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) { console.error('Failed to mark as read'); }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      Alert.alert('Success', 'All notifications marked as read');
    } catch (err) { Alert.alert('Error', 'Failed to mark all as read'); }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return colors.warning;
      case 'error': return colors.error;
      case 'success': return colors.success;
      default: return colors.info;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return 'alert-circle';
      case 'error': return 'close-circle';
      case 'success': return 'checkmark-circle';
      default: return 'information-circle';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
      onPress={() => {
        if (!item.is_read) markAsRead(item.id);
        if (item.link) router.push(item.link as any);
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: getTypeColor(item.type) + '20' }]}>
        <Icon name={getTypeIcon(item.type) as any} size={24} color={getTypeColor(item.type)} />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.notificationTitle, !item.is_read && styles.unreadTitle]}>{item.title}</Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  if (error && !notifications.length) return <ErrorState type="server" title="Failed" message={error} onRetry={() => fetchNotifications(true)} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Icon name={'arrow-back'} size={24} color={colors.text.inverse} /></TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && <TouchableOpacity onPress={markAllAsRead}><Text style={styles.markAll}>Mark all read</Text></TouchableOpacity>}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterBtn, !showUnreadOnly && styles.filterBtnActive]} onPress={() => setShowUnreadOnly(false)}>
          <Text style={[styles.filterText, !showUnreadOnly && styles.filterTextActive]}>All ({notifications.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, showUnreadOnly && styles.filterBtnActive]} onPress={() => setShowUnreadOnly(true)}>
          <Text style={[styles.filterText, showUnreadOnly && styles.filterTextActive]}>Unread ({unreadCount})</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={notifications} renderItem={renderItem} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />}
        ListEmptyComponent={<View style={styles.empty}><Icon name={'notifications'} size={48} color={colors.text.tertiary} /><Text style={styles.emptyText}>No notifications</Text></View>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing[4], paddingTop: spacing[8], backgroundColor: colors.primary[500] },
  title: { fontSize: 20, fontWeight: '700', color: colors.text.inverse, flex: 1, marginLeft: spacing[3] },
  markAll: { fontSize: 14, color: colors.text.inverse, textDecorationLine: 'underline' },
  filterRow: { flexDirection: 'row', padding: spacing[4], gap: spacing[2], backgroundColor: colors.background.primary },
  filterBtn: { flex: 1, paddingVertical: spacing[2], borderRadius: borderRadius.lg, backgroundColor: colors.background.secondary, alignItems: 'center' },
  filterBtnActive: { backgroundColor: colors.primary[500] },
  filterText: { fontSize: 14, color: colors.text.secondary },
  filterTextActive: { color: colors.text.inverse, fontWeight: '600' },
  list: { padding: spacing[4] },
  notificationCard: { flexDirection: 'row', backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[3], ...shadows.sm },
  unreadCard: { borderLeftWidth: 3, borderLeftColor: colors.primary[500] },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: spacing[3] },
  content: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  notificationTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary, flex: 1 },
  unreadTitle: { fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[500], marginLeft: spacing[2] },
  message: { fontSize: 13, color: colors.text.secondary, marginTop: spacing[1] },
  date: { fontSize: 11, color: colors.text.tertiary, marginTop: spacing[2] },
  empty: { alignItems: 'center', paddingVertical: spacing[10] },
  emptyText: { fontSize: 16, color: colors.text.tertiary, marginTop: spacing[2] },
});

export default NotificationsScreen;
