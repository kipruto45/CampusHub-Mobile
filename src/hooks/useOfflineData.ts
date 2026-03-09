// Offline Data Hook - For screens to fetch and cache data with offline support

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService, syncQueueService, QueuedActionType } from '../services/offline';

const CACHE_PREFIX = 'campushub_cache_';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes default cache

interface CacheOptions {
  key: string;
  expiryMs?: number;
}

interface UseOfflineDataOptions<T> extends CacheOptions {
  fetchData: () => Promise<T>;
  fallbackData?: T;
  autoRefresh?: boolean;
}

interface UseOfflineDataResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  isOffline: boolean;
  isStale: boolean;
  refresh: () => Promise<void>;
  queueAction: (type: QueuedActionType, payload: Record<string, any>) => Promise<void>;
}

/**
 * Hook for offline-first data fetching
 * 
 * @example
 * const { data, isLoading, isOffline, refresh } = useOfflineData({
 *   key: 'resources',
 *   fetchData: () => api.getResources(),
 *   fallbackData: []
 * });
 */
export function useOfflineData<T>({
  key,
  expiryMs = CACHE_EXPIRY_MS,
  fetchData,
  fallbackData,
  autoRefresh = true,
}: UseOfflineDataOptions<T>): UseOfflineDataResult<T> {
  const [data, setData] = useState<T | undefined>(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const cacheKey = `${CACHE_PREFIX}${key}`;

  // Load cached data
  const loadCachedData = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > expiryMs;
        setIsStale(isExpired);
        setData(cachedData);
        return true;
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
    }
    return false;
  }, [cacheKey, expiryMs]);

  // Save data to cache
  const saveToCache = useCallback(async (newData: T) => {
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data: newData,
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  }, [cacheKey]);

  // Fetch fresh data
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const isConnected = await networkService.isConnected();
    setIsOffline(!isConnected);

    try {
      if (isConnected) {
        const freshData = await fetchData();
        setData(freshData);
        await saveToCache(freshData);
        setIsStale(false);
      } else {
        // Try to load from cache when offline
        const hasCache = await loadCachedData();
        if (!hasCache) {
          setError(new Error('No network connection and no cached data available'));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Fall back to cache on error
      await loadCachedData();
    } finally {
      setIsLoading(false);
    }
  }, [fetchData, loadCachedData, saveToCache]);

  // Queue an action for later sync
  const queueAction = useCallback(async (
    type: QueuedActionType,
    payload: Record<string, any>
  ) => {
    await syncQueueService.addAction(type, payload);
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, []);

  // Auto-refresh when coming back online
  useEffect(() => {
    if (!isOffline && isStale && autoRefresh) {
      refresh();
    }
  }, [isOffline, isStale, autoRefresh, refresh]);

  return {
    data,
    isLoading,
    error,
    isOffline,
    isStale,
    refresh,
    queueAction,
  };
}

// Clear all cached data
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    // Remove each cache key individually
    for (const cacheKey of cacheKeys) {
      await AsyncStorage.removeItem(cacheKey);
    }
  } catch (err) {
    console.error('Error clearing cache:', err);
  }
}

// Get cache info
export async function getCacheInfo(): Promise<{ keys: string[]; size: number }> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    
    let totalSize = 0;
    for (const cacheKey of cacheKeys) {
      const value = await AsyncStorage.getItem(cacheKey);
      if (value) {
        totalSize += value.length;
      }
    }
    
    return { keys: cacheKeys, size: totalSize };
  } catch (err) {
    console.error('Error getting cache info:', err);
    return { keys: [], size: 0 };
  }
}

export default useOfflineData;
