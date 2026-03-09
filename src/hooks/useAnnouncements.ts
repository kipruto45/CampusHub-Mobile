// Announcements Hook for CampusHub Mobile App
// Provides state management and API calls for announcements

import { useState, useCallback, useEffect } from 'react';
import { announcementsApi, Announcement, AnnouncementListResponse } from '../services/announcements.service';
import { useAuthStore } from '../store/auth.store';

interface UseAnnouncementsState {
  announcements: Announcement[];
  pinnedAnnouncements: Announcement[];
  dashboardAnnouncements: Announcement[];
  currentAnnouncement: Announcement | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

interface UseAnnouncementsActions {
  fetchAnnouncements: (params?: { page?: number; page_size?: number }) => Promise<void>;
  fetchPinnedAnnouncements: () => Promise<void>;
  fetchDashboardAnnouncements: (limit?: number) => Promise<void>;
  fetchAnnouncementBySlug: (slug: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export type UseAnnouncements = UseAnnouncementsState & UseAnnouncementsActions;

export function useAnnouncements(): UseAnnouncements {
  const { isAuthenticated } = useAuthStore();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState<Announcement[]>([]);
  const [dashboardAnnouncements, setDashboardAnnouncements] = useState<Announcement[]>([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchAnnouncements = useCallback(async (params?: {
    page?: number;
    page_size?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response: AnnouncementListResponse = await announcementsApi.getAnnouncements({
        page: params?.page || 1,
        page_size: params?.page_size || 20,
      });
      
      if (params?.page && params.page > 1) {
        setAnnouncements(prev => [...prev, ...response.results]);
      } else {
        setAnnouncements(response.results);
      }
      
      setHasMore(!!response.next);
      setCurrentPage(params?.page || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch announcements');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPinnedAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await announcementsApi.getPinnedAnnouncements();
      setPinnedAnnouncements(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pinned announcements');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDashboardAnnouncements = useCallback(async (limit: number = 5) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await announcementsApi.getDashboardAnnouncements(limit);
      setDashboardAnnouncements(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard announcements');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAnnouncementBySlug = useCallback(async (slug: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await announcementsApi.getAnnouncement(slug);
      setCurrentAnnouncement(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch announcement');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!isLoading && hasMore) {
      await fetchAnnouncements({ page: currentPage + 1, page_size: 20 });
    }
  }, [isLoading, hasMore, currentPage, fetchAnnouncements]);

  const refresh = useCallback(async () => {
    await fetchAnnouncements({ page: 1, page_size: 20 });
    await fetchPinnedAnnouncements();
    await fetchDashboardAnnouncements(5);
  }, [fetchAnnouncements, fetchPinnedAnnouncements, fetchDashboardAnnouncements]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchAnnouncements({ page: 1, page_size: 20 });
      fetchPinnedAnnouncements();
      fetchDashboardAnnouncements(5);
    }
  }, [isAuthenticated, fetchAnnouncements, fetchPinnedAnnouncements, fetchDashboardAnnouncements]);

  return {
    announcements,
    pinnedAnnouncements,
    dashboardAnnouncements,
    currentAnnouncement,
    isLoading,
    error,
    hasMore,
    currentPage,
    fetchAnnouncements,
    fetchPinnedAnnouncements,
    fetchDashboardAnnouncements,
    fetchAnnouncementBySlug,
    loadMore,
    refresh,
  };
}

export default useAnnouncements;
