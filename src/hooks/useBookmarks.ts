import { useCallback, useEffect, useMemo, useState } from 'react';

import { bookmarksAPI } from '../services/api';
import { networkService, syncQueueService } from '../services/offline';

export interface Bookmark {
  id: string;
  resource_id: string;
  resource?: any;
  created_at?: string;
  saved_at?: string;
}

interface UseBookmarksResult {
  // Legacy contract
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  refresh: () => Promise<void>;
  addBookmark: (resourceId: string) => Promise<boolean>;
  removeBookmark: (resourceOrBookmarkId: string) => Promise<boolean>;
  toggleBookmark: (resourceId: string) => Promise<boolean>;
  isBookmarked: (resourceId: string) => boolean;
  // Modern aliases
  items: Bookmark[];
  loading: boolean;
  refreshing: boolean;
}

const unwrap = (response: any) => {
  if (response?.data?.data) return response.data.data;
  if (response?.data) return response.data;
  return response || {};
};

const normalizeBookmarks = (raw: any[]): Bookmark[] =>
  raw.map((item: any) => ({
    id: String(item?.id || ''),
    resource_id: String(item?.resource_id || item?.resource?.id || ''),
    resource: item?.resource || null,
    created_at: item?.created_at || item?.saved_at || '',
    saved_at: item?.saved_at || item?.created_at || '',
  }));

export function useBookmarks(): UseBookmarksResult {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCount = bookmarks.length;

  const refresh = useCallback(async () => {
    setError(null);
    if (bookmarks.length) {
      setRefreshing(true);
    }
    setIsLoading(true);
    try {
      const response = await bookmarksAPI.list();
      const payload = unwrap(response);
      const list = payload?.bookmarks || payload?.results || [];
      setBookmarks(normalizeBookmarks(Array.isArray(list) ? list : []));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load bookmarks');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [bookmarks.length]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addBookmark = useCallback(async (resourceId: string): Promise<boolean> => {
    if (bookmarks.some((bookmark) => bookmark.resource_id === resourceId)) {
      return true;
    }

    const optimisticBookmark: Bookmark = {
      id: `local-bookmark-${resourceId}`,
      resource_id: resourceId,
      created_at: new Date().toISOString(),
      saved_at: new Date().toISOString(),
    };

    setBookmarks((prev) => [optimisticBookmark, ...prev]);

    try {
      await bookmarksAPI.add(resourceId);
      await refresh();
      return true;
    } catch (err: any) {
      const isOffline = !(await networkService.isConnected()) || !err?.response;
      if (isOffline) {
        await syncQueueService.addAction('bookmark_add', { resourceId, desiredState: true });
        return true;
      }
      setBookmarks((prev) => prev.filter((bookmark) => bookmark.resource_id !== resourceId));
      console.error('Failed to add bookmark:', err);
      return false;
    }
  }, [bookmarks, refresh]);

  const removeBookmark = useCallback(
    async (resourceOrBookmarkId: string): Promise<boolean> => {
      const previous = bookmarks;
      const matched = bookmarks.find(
        (bookmark) =>
          bookmark.id === resourceOrBookmarkId ||
          bookmark.resource_id === resourceOrBookmarkId
      );
      const bookmarkId = matched?.id || resourceOrBookmarkId;
      const resourceId = matched?.resource_id || resourceOrBookmarkId;

      setBookmarks((prev) =>
        prev.filter(
          (bookmark) =>
            bookmark.id !== bookmarkId && bookmark.resource_id !== resourceOrBookmarkId
        )
      );

      try {
        await bookmarksAPI.remove(bookmarkId);
        return true;
      } catch (err: any) {
        const isOffline = !(await networkService.isConnected()) || !err?.response;
        if (isOffline) {
          await syncQueueService.addAction('bookmark_remove', { resourceId, desiredState: false });
          return true;
        }
        setBookmarks(previous);
        console.error('Failed to remove bookmark:', err);
        return false;
      }
    },
    [bookmarks]
  );

  const isBookmarked = useCallback(
    (resourceId: string): boolean =>
      bookmarks.some((bookmark) => bookmark.resource_id === resourceId),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    async (resourceId: string): Promise<boolean> => {
      if (isBookmarked(resourceId)) {
        return removeBookmark(resourceId);
      }
      return addBookmark(resourceId);
    },
    [addBookmark, isBookmarked, removeBookmark]
  );

  const items = useMemo(() => bookmarks, [bookmarks]);

  return {
    bookmarks,
    isLoading,
    error,
    totalCount,
    refresh,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
    items,
    loading: isLoading,
    refreshing,
  };
}

export default useBookmarks;
