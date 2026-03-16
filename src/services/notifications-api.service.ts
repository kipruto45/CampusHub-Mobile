// Notifications API Service for CampusHub Mobile App
// Handles all notification-related API calls

import api from './api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  notification_type_display: string;
  is_read: boolean;
  link: string;
  target_resource?: number;
  target_resource_title?: string;
  target_comment?: number;
  created_at: string;
}

export interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

export interface UnreadCountResponse {
  unread_count: number;
}

class NotificationsApiService {
  // Get all notifications with pagination
  async getNotifications(params?: {
    page?: number;
    page_size?: number;
    is_read?: boolean;
    type?: string;
  }): Promise<NotificationListResponse> {
    const response = await api.get<NotificationListResponse>(
      '/notifications/',
      { params }
    );
    return response.data;
  }

  // Get unread notifications
  async getUnreadNotifications(): Promise<Notification[]> {
    const response = await api.get<Notification[]>(
      '/notifications/unread/'
    );
    return response.data;
  }

  // Get unread count
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await api.get<UnreadCountResponse>(
      '/notifications/unread_count/'
    );
    return response.data;
  }

  // Get single notification by ID
  async getNotification(id: string): Promise<Notification> {
    const response = await api.get<Notification>(
      `/notifications/${id}/`
    );
    return response.data;
  }

  // Mark notification as read
  async markAsRead(id: string): Promise<Notification> {
    const response = await api.post<Notification>(
      `/notifications/${id}/mark_read/`
    );
    return response.data;
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      '/notifications/mark_all_read/'
    );
    return response.data;
  }

  // Mark multiple notifications as read
  async markMultipleAsRead(notificationIds?: string[]): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      '/notifications/mark_multiple_read/',
      { notification_ids: notificationIds }
    );
    return response.data;
  }

  // Register device token for push notifications
  async registerDevice(tokenData: {
    expo_push_token: string;
    device_id: string;
    device_name: string;
    platform: string;
  }): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      '/notifications/register-device/',
      tokenData
    );
    return response.data;
  }

  // Unregister device token
  async unregisterDevice(expoPushToken: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      '/notifications/unregister-device/',
      { expo_push_token: expoPushToken }
    );
    return response.data;
  }
}

// Export singleton instance
export const notificationsApi = new NotificationsApiService();

export default NotificationsApiService;
