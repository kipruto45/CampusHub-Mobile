// Notifications Hook for CampusHub Mobile App
// Provides state management and API calls for notifications

import { useState, useCallback, useEffect } from 'react';
import { notificationsApi, Notification, NotificationListResponse, UnreadCountResponse } from '../services/notifications-api.service';
import { useAuthStore } from '../store/auth.store';

interface UseNotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

interface UseNotificationsActions {
  fetchNotifications: (params?: { page?: number; page_size?: number; is_read?: boolean; type?: string }) => Promise<void>;
  fetchUnreadNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markMultipleAsRead: (ids?: string[]) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export type UseNotifications = UseNotificationsState & UseNotificationsActions;

export function useNotifications(): UseNotifications {
  const { isAuthenticated } = useAuthStore();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchNotifications = useCallback(async (params?: {
    page?: number;
    page_size?: number;
    is_read?: boolean;
    type?: string;
  }) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response: NotificationListResponse = await notificationsApi.getNotifications({
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        is_read: params?.is_read,
        type: params?.type,
      });
      
      if (params?.page && params.page > 1) {
        setNotifications(prev => [...prev, ...response.results]);
      } else {
        setNotifications(response.results);
      }
      
      setTotalCount(response.count);
      setHasMore(!!response.next);
      setCurrentPage(params?.page || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchUnreadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await notificationsApi.getUnreadNotifications();
      setNotifications(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch unread notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response: UnreadCountResponse = await notificationsApi.getUnreadCount();
      setUnreadCount(response.unread_count);
    } catch (err: any) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message || 'Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to mark all notifications as read');
    }
  }, []);

  const markMultipleAsRead = useCallback(async (ids?: string[]) => {
    try {
      await notificationsApi.markMultipleAsRead(ids);
      if (ids) {
        setNotifications(prev =>
          prev.map(notif =>
            ids.includes(notif.id) ? { ...notif, is_read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - ids.length));
      } else {
        setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark notifications as read');
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!isLoading && hasMore) {
      await fetchNotifications({ page: currentPage + 1, page_size: 20 });
    }
  }, [isLoading, hasMore, currentPage, fetchNotifications]);

  const refresh = useCallback(async () => {
    await fetchNotifications({ page: 1, page_size: 20 });
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications({ page: 1, page_size: 20 });
      fetchUnreadCount();
    }
  }, [isAuthenticated, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    currentPage,
    fetchNotifications,
    fetchUnreadNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    markMultipleAsRead,
    loadMore,
    refresh,
  };
}

export default useNotifications;
