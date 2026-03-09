// Offline Cache Service for CampusHub
// Provides local caching for API responses

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

const CACHE_PREFIX = 'campushub_cache_';
const CACHE_METADATA_PREFIX = 'campushub_cache_meta_';

// Default cache duration in milliseconds (5 minutes)
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000;

interface CacheMetadata {
  key: string;
  timestamp: number;
  duration: number;
}

interface CacheOptions {
  duration?: number; // Cache duration in milliseconds
  skipCache?: boolean; // Skip cache and fetch fresh data
}

class CacheService {
  // Check if device is connected to the internet
  async isConnected(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.isConnected ?? false;
    } catch {
      return false;
    }
  }

  // Generate a cache key from request parameters
  private generateCacheKey(endpoint: string, params?: Record<string, any>): string {
    const key = params ? `${endpoint}_${JSON.stringify(params)}` : endpoint;
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${CACHE_PREFIX}${Math.abs(hash).toString(36)}`;
  }

  // Get cached data
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T | null> {
    try {
      const cacheKey = this.generateCacheKey(endpoint, params);
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return null;
      }

      // Check if cache is expired
      const metadataKey = `${CACHE_METADATA_PREFIX}${cacheKey}`;
      const metadataStr = await AsyncStorage.getItem(metadataKey);
      
      if (metadataStr) {
        const metadata: CacheMetadata = JSON.parse(metadataStr);
        const isExpired = Date.now() - metadata.timestamp > metadata.duration;
        
        if (isExpired) {
          // Cache expired, remove it
          await this.remove(endpoint, params);
          return null;
        }
      }

      return JSON.parse(cachedData) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set cached data
  async set<T>(
    endpoint: string,
    data: T,
    params?: Record<string, any>,
    duration: number = DEFAULT_CACHE_DURATION
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(endpoint, params);
      
      // Store data
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      
      // Store metadata
      const metadata: CacheMetadata = {
        key: cacheKey,
        timestamp: Date.now(),
        duration,
      };
      await AsyncStorage.setItem(
        `${CACHE_METADATA_PREFIX}${cacheKey}`,
        JSON.stringify(metadata)
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Remove cached data
  async remove(endpoint: string, params?: Record<string, any>): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(endpoint, params);
      await AsyncStorage.removeItem(cacheKey);
      await AsyncStorage.removeItem(`${CACHE_METADATA_PREFIX}${cacheKey}`);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  // Clear all cached data
  async clearAll(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_METADATA_PREFIX)
      );
      
      // Remove each key individually
      for (const key of cacheKeys) {
        await AsyncStorage.removeItem(key);
      }
      console.log('Cache cleared');
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // Get cached data size
  async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      let totalSize = 0;
      
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return totalSize;
    } catch {
      return 0;
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    itemCount: number;
    totalSizeBytes: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      let totalSize = 0;
      
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return {
        itemCount: cacheKeys.length,
        totalSizeBytes: totalSize,
      };
    } catch {
      return { itemCount: 0, totalSizeBytes: 0 };
    }
  }

  // Fetch with caching - main method to use
  async fetchWithCache<T>(
    fetchFn: () => Promise<T>,
    endpoint: string,
    params?: Record<string, any>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { duration = DEFAULT_CACHE_DURATION, skipCache = false } = options;
    
    // Try to get from cache first (unless skipCache is true)
    if (!skipCache) {
      const cachedData = await this.get<T>(endpoint, params);
      if (cachedData !== null) {
        console.log(`Cache hit for: ${endpoint}`);
        return cachedData;
      }
    }
    
    // Check network connection
    const connected = await this.isConnected();
    
    if (!connected) {
      // No network, try to get stale cache as fallback
      const staleCache = await this.get<T>(endpoint, { ...params, _stale: true });
      if (staleCache) {
        console.log(`Using stale cache for: ${endpoint}`);
        return staleCache;
      }
      throw new Error('No network connection and no cached data available');
    }
    
    // Fetch fresh data
    try {
      const freshData = await fetchFn();
      
      // Cache the fresh data
      await this.set(endpoint, freshData, params, duration);
      console.log(`Cached fresh data for: ${endpoint}`);
      
      return freshData;
    } catch (error) {
      // On error, try to get stale cache as fallback
      const staleCache = await this.get<T>(endpoint, { ...params, _stale: true });
      if (staleCache) {
        console.log(`Using stale cache after error for: ${endpoint}`);
        return staleCache;
      }
      throw error;
    }
  }

  // Preload cache with common data
  async preloadCache(data: Array<{ endpoint: string; data: any; duration?: number }>): Promise<void> {
    for (const item of data) {
      await this.set(item.endpoint, item.data, undefined, item.duration);
    }
    console.log('Cache preloaded');
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// React hook for caching
export const useCache = () => {
  return {
    get: <T>(endpoint: string, params?: Record<string, any>) => cacheService.get<T>(endpoint, params),
    set: <T>(endpoint: string, data: T, params?: Record<string, any>, duration?: number) => 
      cacheService.set(endpoint, data, params, duration),
    remove: (endpoint: string, params?: Record<string, any>) => 
      cacheService.remove(endpoint, params),
    clearAll: () => cacheService.clearAll(),
    getStats: () => cacheService.getCacheStats(),
    fetchWithCache: <T>(fetchFn: () => Promise<T>, endpoint: string, params?: Record<string, any>, options?: CacheOptions) =>
      cacheService.fetchWithCache(fetchFn, endpoint, params, options),
    isConnected: () => cacheService.isConnected(),
  };
};

export default CacheService;
