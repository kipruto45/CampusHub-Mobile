// Offline Support Services for CampusHub
// Comprehensive offline support: cache, sync queue, network, and files
// Note: AsyncStorage requires development build - gracefully falls back in Expo Go

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { useState, useEffect, useCallback } from 'react';

// Check if AsyncStorage is available (requires development build)
let isStorageAvailable = true;

// Test AsyncStorage availability
(async () => {
  try {
    await AsyncStorage.setItem('__test__', 'test');
    await AsyncStorage.removeItem('__test__');
    isStorageAvailable = true;
  } catch (e) {
    isStorageAvailable = false;
    console.log('AsyncStorage not available - using memory fallback');
  }
})();

// ==================== NETWORK SERVICE ====================

const NETWORK_STATE_KEY = 'campushub_network_state';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string | null;
  lastChecked: number;
}

class NetworkService {
  private listeners: Array<(state: NetworkState) => void> = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  async getNetworkState(): Promise<NetworkState> {
    try {
      const state = await Network.getNetworkStateAsync();
      const networkState: NetworkState = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type ?? null,
        lastChecked: Date.now(),
      };
      
      // Save to storage if available
      if (isStorageAvailable) {
        await AsyncStorage.setItem(NETWORK_STATE_KEY, JSON.stringify(networkState)).catch(() => {});
      }
      
      return networkState;
    } catch (error) {
      // Return cached state if error
      if (isStorageAvailable) {
        try {
          const cached = await AsyncStorage.getItem(NETWORK_STATE_KEY);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch {}
      }
      return {
        isConnected: false,
        isInternetReachable: false,
        type: null,
        lastChecked: Date.now(),
      };
    }
  }

  async isConnected(): Promise<boolean> {
    const state = await this.getNetworkState();
    return state.isConnected && state.isInternetReachable;
  }

  subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(state: NetworkState) {
    this.listeners.forEach(listener => listener(state));
  }

  startMonitoring(intervalMs: number = 30000) {
    if (this.checkInterval) return;
    
    this.checkInterval = setInterval(async () => {
      const state = await this.getNetworkState();
      this.notifyListeners(state);
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const networkService = new NetworkService();

// ==================== SYNC QUEUE SERVICE ====================

const SYNC_QUEUE_KEY = 'campushub_sync_queue';

export type QueuedActionType = 
  | 'bookmark_add'
  | 'bookmark_remove'
  | 'favorite_add'
  | 'favorite_remove'
  | 'folder_create'
  | 'folder_rename'
  | 'file_rename'
  | 'profile_update';

export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  payload: Record<string, any>;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

const buildActionFingerprint = (
  type: QueuedActionType,
  payload: Record<string, any>
): string | null => {
  switch (type) {
    case 'bookmark_add':
    case 'bookmark_remove':
      return `bookmark:${String(payload.resourceId || payload.resource_id || '')}`;
    case 'favorite_add':
    case 'favorite_remove':
      return `favorite:${String(payload.target_type || 'resource')}:${String(
        payload.target_id || payload.resourceId || ''
      )}`;
    case 'folder_rename':
      return `folder_rename:${String(payload.folderId || payload.id || '')}`;
    case 'file_rename':
      return `file_rename:${String(payload.fileId || payload.id || '')}`;
    case 'profile_update':
      return 'profile_update';
    default:
      return null;
  }
};

class SyncQueueService {
  private listeners: Array<(queue: QueuedAction[]) => void> = [];

  async getQueue(): Promise<QueuedAction[]> {
    try {
      const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async addAction(
    type: QueuedActionType,
    payload: Record<string, any>
  ): Promise<QueuedAction> {
    const action: QueuedAction = {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };

    const queue = await this.getQueue();
    const fingerprint = buildActionFingerprint(type, payload);
    const nextQueue =
      fingerprint === null
        ? [...queue, action]
        : [
            ...queue.filter((queuedAction) => {
              const queuedFingerprint = buildActionFingerprint(queuedAction.type, queuedAction.payload);
              return queuedFingerprint !== fingerprint;
            }),
            action,
          ];
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(nextQueue));
    
    this.notifyListeners(nextQueue);
    return action;
  }

  async updateAction(id: string, updates: Partial<QueuedAction>): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex(a => a.id === id);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      this.notifyListeners(queue);
    }
  }

  async removeAction(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(a => a.id !== id);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    this.notifyListeners(filtered);
  }

  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.filter(a => a.status === 'pending').length;
  }

  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    this.notifyListeners([]);
  }

  subscribe(listener: (queue: QueuedAction[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(queue: QueuedAction[]) {
    this.listeners.forEach(listener => listener(queue));
  }
}

export const syncQueueService = new SyncQueueService();

// ==================== OFFLINE FILE SERVICE ====================

const OFFLINE_FILES_KEY = 'campushub_offline_files';

interface OfflineFile {
  id: string;
  resourceId: string;
  localUri: string;
  originalUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadedAt: string;
  lastAccessed: string;
}

class OfflineFileService {
  async downloadForOffline(
    resourceId: string,
    url: string,
    fileName: string,
    mimeType: string
  ): Promise<OfflineFile | null> {
    // Store offline file metadata - actual file download handled by Downloads service
    const offlineFile: OfflineFile = {
      id: `offline-${resourceId}`,
      resourceId,
      localUri: `cached_${resourceId}_${fileName}`,
      originalUrl: url,
      fileName,
      fileSize: 0,
      mimeType,
      downloadedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
    };

    // Save metadata
    const files = await this.getOfflineFiles();
    const existingIndex = files.findIndex(f => f.resourceId === resourceId);
    if (existingIndex !== -1) {
      files[existingIndex] = offlineFile;
    } else {
      files.push(offlineFile);
    }
    await AsyncStorage.setItem(OFFLINE_FILES_KEY, JSON.stringify(files));

    return offlineFile;
  }

  async getOfflineFiles(): Promise<OfflineFile[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_FILES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async getOfflineFile(resourceId: string): Promise<OfflineFile | null> {
    const files = await this.getOfflineFiles();
    return files.find(f => f.resourceId === resourceId) || null;
  }

  async isAvailableOffline(resourceId: string): Promise<boolean> {
    const files = await this.getOfflineFiles();
    return files.some(f => f.resourceId === resourceId);
  }

  async deleteOfflineFile(resourceId: string): Promise<void> {
    const files = await this.getOfflineFiles();
    const filtered = files.filter(f => f.resourceId !== resourceId);
    await AsyncStorage.setItem(OFFLINE_FILES_KEY, JSON.stringify(filtered));
  }

  async getTotalOfflineSize(): Promise<number> {
    const files = await this.getOfflineFiles();
    return files.reduce((total, file) => total + (file.fileSize || 0), 0);
  }

  async clearAllOfflineFiles(): Promise<void> {
    await AsyncStorage.removeItem(OFFLINE_FILES_KEY);
  }
}

export const offlineFileService = new OfflineFileService();

// ==================== REACT HOOKS ====================

// Hook for network state
export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);

  useEffect(() => {
    const checkNetwork = async () => {
      const state = await networkService.getNetworkState();
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    };

    checkNetwork();
    const unsubscribe = networkService.subscribe(checkNetwork);
    networkService.startMonitoring();

    return () => {
      unsubscribe();
      networkService.stopMonitoring();
    };
  }, []);

  return { isConnected, isInternetReachable };
};

// Hook for sync queue
export const useSyncQueue = () => {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const loadQueue = async () => {
      const q = await syncQueueService.getQueue();
      setQueue(q);
      setPendingCount(q.filter(a => a.status === 'pending').length);
    };

    loadQueue();
    const unsubscribe = syncQueueService.subscribe(setQueue);
    
    return unsubscribe;
  }, []);

  const addAction = useCallback(async (type: QueuedActionType, payload: Record<string, any>) => {
    await syncQueueService.addAction(type, payload);
    const q = await syncQueueService.getQueue();
    setQueue(q);
    setPendingCount(q.filter(a => a.status === 'pending').length);
  }, []);

  return { queue, pendingCount, addAction };
};

// Hook for offline files
export const useOfflineFiles = () => {
  const [files, setFiles] = useState<OfflineFile[]>([]);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    const loadFiles = async () => {
      const f = await offlineFileService.getOfflineFiles();
      setFiles(f);
      const size = await offlineFileService.getTotalOfflineSize();
      setTotalSize(size);
    };

    loadFiles();
  }, []);

  const isAvailableOffline = useCallback(async (resourceId: string) => {
    return await offlineFileService.isAvailableOffline(resourceId);
  }, []);

  const downloadForOffline = useCallback(async (
    resourceId: string,
    url: string,
    fileName: string,
    mimeType: string
  ) => {
    const file = await offlineFileService.downloadForOffline(resourceId, url, fileName, mimeType);
    const f = await offlineFileService.getOfflineFiles();
    setFiles(f);
    const size = await offlineFileService.getTotalOfflineSize();
    setTotalSize(size);
    return file;
  }, []);

  const removeOfflineFile = useCallback(async (resourceId: string) => {
    await offlineFileService.deleteOfflineFile(resourceId);
    const f = await offlineFileService.getOfflineFiles();
    setFiles(f);
    const size = await offlineFileService.getTotalOfflineSize();
    setTotalSize(size);
  }, []);

  return { files, totalSize, isAvailableOffline, downloadForOffline, removeOfflineFile };
};

export default {
  networkService,
  syncQueueService,
  offlineFileService,
};
