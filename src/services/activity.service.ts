// Activity API Service for CampusHub Mobile App
// Handles all activity-related API calls

import api from './api';

export interface RecentActivity {
  id: string;
  activity_type: string;
  activity_type_display: string;
  target_title: string;
  target_type: string;
  resource?: number;
  personal_file?: number;
  bookmark?: number;
  resource_type?: string;
  file_type?: string;
  file_url?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface RecentResource {
  id: string;
  title: string;
  resource_type: string;
  file_type: string;
  created_at: string;
}

export interface RecentFile {
  id: string;
  name: string;
  file_type: string;
  created_at: string;
}

export interface ActivityStats {
  total_activities: number;
  viewed_count: number;
  downloaded_count: number;
  bookmarked_count: number;
  opened_files_count: number;
}

export interface ActivityListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RecentActivity[];
}

class ActivityApiService {
  // Get all recent activities with pagination
  async getActivities(params?: {
    page?: number;
    page_size?: number;
  }): Promise<ActivityListResponse> {
    const response = await api.get<ActivityListResponse>(
      '/activity/',
      { params }
    );
    return response.data;
  }

  // Get unified recent activity
  async getRecentActivity(limit: number = 20): Promise<RecentActivity[]> {
    const response = await api.get<RecentActivity[]>(
      '/activity/recent/',
      { params: { limit } }
    );
    return response.data;
  }

  // Get recently viewed resources
  async getRecentResources(limit: number = 10): Promise<RecentResource[]> {
    const response = await api.get<RecentResource[]>(
      '/activity/recent/resources/',
      { params: { limit } }
    );
    return response.data;
  }

  // Get recently opened personal files
  async getRecentFiles(limit: number = 10): Promise<RecentFile[]> {
    const response = await api.get<RecentFile[]>(
      '/activity/recent/files/',
      { params: { limit } }
    );
    return response.data;
  }

  // Get recently downloaded items
  async getRecentDownloads(limit: number = 10): Promise<RecentActivity[]> {
    const response = await api.get<RecentActivity[]>(
      '/activity/recent/downloads/',
      { params: { limit } }
    );
    return response.data;
  }

  // Get recently bookmarked items
  async getRecentBookmarks(limit: number = 10): Promise<RecentActivity[]> {
    const response = await api.get<RecentActivity[]>(
      '/activity/recent/bookmarks/',
      { params: { limit } }
    );
    return response.data;
  }

  // Get activity statistics
  async getActivityStats(): Promise<ActivityStats> {
    const response = await api.get<ActivityStats>('/activity/stats/');
    return response.data;
  }

  // Clear old activities
  async clearOldActivities(days: number = 90): Promise<{
    message: string;
    deleted_count: number;
  }> {
    const response = await api.delete<{
      message: string;
      deleted_count: number;
    }>('/activity/clear/', {
      params: { days },
    });
    return response.data;
  }

  // Get activity by ID
  async getActivity(id: string): Promise<RecentActivity> {
    const response = await api.get<RecentActivity>(`/activity/${id}/`);
    return response.data;
  }

  // Get activities filtered by type
  async getActivitiesByType(
    activityType: string,
    params?: { page?: number; page_size?: number }
  ): Promise<ActivityListResponse> {
    const response = await api.get<ActivityListResponse>(
      '/activity/',
      { params: { ...params, activity_type: activityType } }
    );
    return response.data;
  }

  // Get recent resources formatted for dashboard
  async getDashboardRecentResources(limit: number = 5): Promise<RecentResource[]> {
    const response = await api.get<RecentResource[]>(
      '/activity/recent/resources/',
      { params: { limit } }
    );
    return response.data;
  }
}

// Export singleton instance
export const activityApi = new ActivityApiService();

export default ActivityApiService;
