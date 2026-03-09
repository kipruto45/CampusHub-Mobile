// Activity Hook for CampusHub Mobile App
// Provides state management and API calls for recent activity

import { useState, useCallback, useEffect } from 'react';
import {
  activityApi,
  RecentActivity,
  RecentResource,
  RecentFile,
  ActivityStats,
  ActivityListResponse,
} from '../services/activity.service';
import { useAuthStore } from '../store/auth.store';

interface UseActivityState {
  activities: RecentActivity[];
  recentResources: RecentResource[];
  recentFiles: RecentFile[];
  recentDownloads: RecentActivity[];
  recentBookmarks: RecentActivity[];
  dashboardRecentResources: RecentResource[];
  activityStats: ActivityStats | null;
  isLoading: boolean;
  error: string | null;
}

interface UseActivityActions {
  fetchActivities: (params?: { page?: number; page_size?: number }) => Promise<void>;
  fetchRecentActivity: (limit?: number) => Promise<void>;
  fetchRecentResources: (limit?: number) => Promise<void>;
  fetchRecentFiles: (limit?: number) => Promise<void>;
  fetchRecentDownloads: (limit?: number) => Promise<void>;
  fetchRecentBookmarks: (limit?: number) => Promise<void>;
  fetchDashboardRecentResources: (limit?: number) => Promise<void>;
  fetchActivityStats: () => Promise<void>;
  clearOldActivities: (days?: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export type UseActivity = UseActivityState & UseActivityActions;

export function useActivity(): UseActivity {
  const { isAuthenticated } = useAuthStore();
  
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [recentResources, setRecentResources] = useState<RecentResource[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [recentDownloads, setRecentDownloads] = useState<RecentActivity[]>([]);
  const [recentBookmarks, setRecentBookmarks] = useState<RecentActivity[]>([]);
  const [dashboardRecentResources, setDashboardRecentResources] = useState<RecentResource[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (params?: {
    page?: number;
    page_size?: number;
  }) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response: ActivityListResponse = await activityApi.getActivities({
        page: params?.page || 1,
        page_size: params?.page_size || 20,
      });
      setActivities(response.results);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchRecentActivity = useCallback(async (limit: number = 20) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await activityApi.getRecentActivity(limit);
      setActivities(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recent activity');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchRecentResources = useCallback(async (limit: number = 10) => {
    if (!isAuthenticated) return;
    
    try {
      const response = await activityApi.getRecentResources(limit);
      setRecentResources(response);
    } catch (err: any) {
      console.error('Failed to fetch recent resources:', err);
    }
  }, [isAuthenticated]);

  const fetchRecentFiles = useCallback(async (limit: number = 10) => {
    if (!isAuthenticated) return;
    
    try {
      const response = await activityApi.getRecentFiles(limit);
      setRecentFiles(response);
    } catch (err: any) {
      console.error('Failed to fetch recent files:', err);
    }
  }, [isAuthenticated]);

  const fetchRecentDownloads = useCallback(async (limit: number = 10) => {
    if (!isAuthenticated) return;
    
    try {
      const response = await activityApi.getRecentDownloads(limit);
      setRecentDownloads(response);
    } catch (err: any) {
      console.error('Failed to fetch recent downloads:', err);
    }
  }, [isAuthenticated]);

  const fetchRecentBookmarks = useCallback(async (limit: number = 10) => {
    if (!isAuthenticated) return;
    
    try {
      const response = await activityApi.getRecentBookmarks(limit);
      setRecentBookmarks(response);
    } catch (err: any) {
      console.error('Failed to fetch recent bookmarks:', err);
    }
  }, [isAuthenticated]);

  const fetchDashboardRecentResources = useCallback(async (limit: number = 5) => {
    if (!isAuthenticated) return;
    
    try {
      const response = await activityApi.getDashboardRecentResources(limit);
      setDashboardRecentResources(response);
    } catch (err: any) {
      console.error('Failed to fetch dashboard recent resources:', err);
    }
  }, [isAuthenticated]);

  const fetchActivityStats = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await activityApi.getActivityStats();
      setActivityStats(response);
    } catch (err: any) {
      console.error('Failed to fetch activity stats:', err);
    }
  }, [isAuthenticated]);

  const clearOldActivities = useCallback(async (days: number = 90) => {
    try {
      const response = await activityApi.clearOldActivities(days);
      console.log(response.message);
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to clear old activities');
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchRecentActivity(20);
    await fetchRecentResources(10);
    await fetchRecentFiles(10);
    await fetchRecentDownloads(10);
    await fetchRecentBookmarks(10);
    await fetchDashboardRecentResources(5);
    await fetchActivityStats();
  }, [
    fetchRecentActivity,
    fetchRecentResources,
    fetchRecentFiles,
    fetchRecentDownloads,
    fetchRecentBookmarks,
    fetchDashboardRecentResources,
    fetchActivityStats,
  ]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    }
  }, [isAuthenticated, refresh]);

  return {
    activities,
    recentResources,
    recentFiles,
    recentDownloads,
    recentBookmarks,
    dashboardRecentResources,
    activityStats,
    isLoading,
    error,
    fetchActivities,
    fetchRecentActivity,
    fetchRecentResources,
    fetchRecentFiles,
    fetchRecentDownloads,
    fetchRecentBookmarks,
    fetchDashboardRecentResources,
    fetchActivityStats,
    clearOldActivities,
    refresh,
  };
}

export default useActivity;
