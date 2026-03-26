import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

// Storage keys
const OFFLINE_RESOURCES_KEY = 'offline_resources';
const OFFLINE_RESOURCES_META_KEY = 'offline_resources_meta';
const DOWNLOAD_QUEUE_KEY = 'download_queue';

// Types
export interface CachedResource {
  id: string;
  title: string;
  description?: string;
  resource_type: string;
  file_url?: string;
  thumbnail?: string;
  course?: { id: string; name: string; code?: string };
  unit?: { id: string; name: string; code?: string };
  average_rating: number;
  download_count: number;
  view_count?: number;
  file_size?: number;
  downloaded_at: string;
  cached_files?: string[];
}

export interface OfflineMeta {
  lastSync: string;
  totalCached: number;
  storageUsed: number;
}

export interface DownloadQueueItem {
  resourceId: string;
  priority: 'high' | 'normal' | 'low';
  addedAt: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
}

class OfflineService {
  private isOnline: boolean = true;
  private listeners: ((online: boolean) => void)[] = [];

  constructor() {
    this.initNetworkListener();
  }

  private async initNetworkListener() {
    try {
      // Check initial state
      const state = await Network.getNetworkStateAsync();
      this.isOnline = state.isConnected ?? false;
    } catch (_e) {
      console.log('Network detection not available');
      this.isOnline = true;
    }
  }

  // Check if online
  async checkOnlineStatus(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      this.isOnline = state.isConnected ?? false;
      return this.isOnline;
    } catch (_e) {
      return this.isOnline;
    }
  }

  // Subscribe to network status changes
  subscribe(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Check if online
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Save a resource for offline access
  async saveResourceOffline(resource: CachedResource): Promise<boolean> {
    try {
      const isOnline = await this.checkOnlineStatus();
      
      if (!isOnline) {
        // Add to download queue if offline
        await this.addToDownloadQueue(resource.id, 'normal');
        return false;
      }

      const cached = await this.getCachedResources();
      const existingIndex = cached.findIndex(r => r.id === resource.id);
      
      const resourceToCache: CachedResource = {
        ...resource,
        downloaded_at: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        cached[existingIndex] = resourceToCache;
      } else {
        cached.push(resourceToCache);
      }

      await AsyncStorage.setItem(OFFLINE_RESOURCES_KEY, JSON.stringify(cached));
      await this.updateMetadata();
      return true;
    } catch (error) {
      console.error('Error saving resource offline:', error);
      return false;
    }
  }

  // Get all cached resources
  async getCachedResources(): Promise<CachedResource[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_RESOURCES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting cached resources:', error);
      return [];
    }
  }

  // Get a specific cached resource
  async getCachedResource(resourceId: string): Promise<CachedResource | null> {
    try {
      const cached = await this.getCachedResources();
      return cached.find(r => r.id === resourceId) || null;
    } catch (error) {
      console.error('Error getting cached resource:', error);
      return null;
    }
  }

  // Remove a resource from offline storage
  async removeResourceOffline(resourceId: string): Promise<boolean> {
    try {
      const cached = await this.getCachedResources();
      const filtered = cached.filter(r => r.id !== resourceId);
      await AsyncStorage.setItem(OFFLINE_RESOURCES_KEY, JSON.stringify(filtered));
      await this.updateMetadata();
      return true;
    } catch (error) {
      console.error('Error removing resource:', error);
      return false;
    }
  }

  // Check if a resource is available offline
  async isResourceAvailableOffline(resourceId: string): Promise<boolean> {
    const resource = await this.getCachedResource(resourceId);
    return resource !== null;
  }

  // Get offline metadata
  async getOfflineMeta(): Promise<OfflineMeta> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_RESOURCES_META_KEY);
      return data ? JSON.parse(data) : {
        lastSync: '',
        totalCached: 0,
        storageUsed: 0,
      };
    } catch (_error) {
      return {
        lastSync: '',
        totalCached: 0,
        storageUsed: 0,
      };
    }
  }

  // Update metadata
  private async updateMetadata(): Promise<void> {
    try {
      const cached = await this.getCachedResources();
      const storageUsed = cached.reduce((sum, r) => sum + (r.file_size || 0), 0);
      
      const meta: OfflineMeta = {
        lastSync: new Date().toISOString(),
        totalCached: cached.length,
        storageUsed,
      };
      
      await AsyncStorage.setItem(OFFLINE_RESOURCES_META_KEY, JSON.stringify(meta));
    } catch (error) {
      console.error('Error updating metadata:', error);
    }
  }

  // Download queue methods
  async addToDownloadQueue(resourceId: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(DOWNLOAD_QUEUE_KEY);
      const queue: DownloadQueueItem[] = queueData ? JSON.parse(queueData) : [];
      
      if (queue.some(item => item.resourceId === resourceId && item.status === 'pending')) {
        return;
      }

      queue.push({
        resourceId,
        priority,
        addedAt: new Date().toISOString(),
        status: 'pending',
      });

      queue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      await AsyncStorage.setItem(DOWNLOAD_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error adding to download queue:', error);
    }
  }

  async getDownloadQueue(): Promise<DownloadQueueItem[]> {
    try {
      const data = await AsyncStorage.getItem(DOWNLOAD_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (_error) {
      return [];
    }
  }

  async clearDownloadQueue(): Promise<void> {
    await AsyncStorage.removeItem(DOWNLOAD_QUEUE_KEY);
  }

  // Sync offline data when back online
  async syncOfflineData(): Promise<void> {
    console.log('Syncing offline data...');
    const isOnline = await this.checkOnlineStatus();
    
    if (!isOnline) {
      console.log('Still offline, skipping sync');
      return;
    }
    
    const queue = await this.getDownloadQueue();
    const pendingItems = queue.filter(item => item.status === 'pending');
    
    for (const item of pendingItems) {
      await this.updateQueueItemStatus(item.resourceId, 'downloading');
      
      try {
        await this.updateQueueItemStatus(item.resourceId, 'completed');
      } catch (error) {
        console.error('Error syncing item:', item.resourceId, error);
        await this.updateQueueItemStatus(item.resourceId, 'failed');
      }
    }
    
    await this.updateMetadata();
    console.log('Offline data sync complete');
  }

  private async updateQueueItemStatus(resourceId: string, status: DownloadQueueItem['status']): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(DOWNLOAD_QUEUE_KEY);
      const queue: DownloadQueueItem[] = queueData ? JSON.parse(queueData) : [];
      
      const index = queue.findIndex(item => item.resourceId === resourceId);
      if (index >= 0) {
        queue[index].status = status;
        await AsyncStorage.setItem(DOWNLOAD_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Error updating queue item:', error);
    }
  }

  // Clear all offline data
  async clearAllOfflineData(): Promise<void> {
    await AsyncStorage.removeItem(OFFLINE_RESOURCES_KEY);
    await AsyncStorage.removeItem(OFFLINE_RESOURCES_META_KEY);
    await AsyncStorage.removeItem(DOWNLOAD_QUEUE_KEY);
  }
}

export const offlineService = new OfflineService();
export default offlineService;
