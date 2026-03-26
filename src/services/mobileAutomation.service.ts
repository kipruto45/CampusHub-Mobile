import AsyncStorage from '@react-native-async-storage/async-storage';

import { folderAlgorithms } from './algorithms.service';
import { bookmarksAPI,favoritesAPI,userAPI } from './api';
import { libraryService } from './library.service';
import { networkService } from './offline';
import syncManager from './syncManager';

const LOCAL_RECENT_SEARCHES_KEY = 'campushub_local_recent_searches';
const MAX_LOCAL_RECENT_SEARCHES = 12;

export interface LocalRecentSearchEntry {
  id: string;
  query: string;
  normalized_query: string;
  filters: Record<string, unknown>;
  results_count: number;
  last_searched_at: string;
}

class LocalRecentSearchAutomation {
  async list(limit: number = MAX_LOCAL_RECENT_SEARCHES): Promise<LocalRecentSearchEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_RECENT_SEARCHES_KEY);
      const parsed = raw ? (JSON.parse(raw) as LocalRecentSearchEntry[]) : [];
      return parsed.slice(0, limit);
    } catch {
      return [];
    }
  }

  async saveSearch(data: {
    query: string;
    filters?: Record<string, unknown>;
    resultsCount?: number;
  }): Promise<void> {
    const query = String(data.query || '').trim().replace(/\s+/g, ' ');
    if (!query) {
      return;
    }

    const now = new Date().toISOString();
    const normalizedQuery = query.toLowerCase();
    const current = await this.list(MAX_LOCAL_RECENT_SEARCHES);
    const next: LocalRecentSearchEntry = {
      id: `${normalizedQuery}-${Date.now()}`,
      query,
      normalized_query: normalizedQuery,
      filters: data.filters || {},
      results_count: Number(data.resultsCount || 0),
      last_searched_at: now,
    };

    const merged = [
      next,
      ...current.filter((item) => item.normalized_query !== normalizedQuery),
    ].slice(0, MAX_LOCAL_RECENT_SEARCHES);

    await AsyncStorage.setItem(LOCAL_RECENT_SEARCHES_KEY, JSON.stringify(merged));
  }

  async removeSearch(id: string): Promise<void> {
    const current = await this.list(MAX_LOCAL_RECENT_SEARCHES);
    const filtered = current.filter(
      (item) => item.id !== id && item.normalized_query !== String(id).toLowerCase()
    );
    await AsyncStorage.setItem(LOCAL_RECENT_SEARCHES_KEY, JSON.stringify(filtered));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(LOCAL_RECENT_SEARCHES_KEY);
  }
}

class MobileAutomationService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    networkService.startMonitoring();
    this.registerSyncHandlers();
    await this.tryProcessQueue();
  }

  async onAppForeground(): Promise<void> {
    await this.tryProcessQueue();
  }

  private registerSyncHandlers() {
    syncManager.registerHandler('bookmark_add', async (payload) =>
      this.syncBookmarkState(String(payload.resourceId || payload.resource_id || ''), true)
    );
    syncManager.registerHandler('bookmark_remove', async (payload) =>
      this.syncBookmarkState(String(payload.resourceId || payload.resource_id || ''), false)
    );
    syncManager.registerHandler('favorite_add', async (payload) =>
      this.syncFavoriteState(
        String(payload.target_type || 'resource'),
        String(payload.target_id || payload.resourceId || ''),
        true
      )
    );
    syncManager.registerHandler('favorite_remove', async (payload) =>
      this.syncFavoriteState(
        String(payload.target_type || 'resource'),
        String(payload.target_id || payload.resourceId || ''),
        false
      )
    );
    syncManager.registerHandler('folder_create', async (payload) => {
      const name = String(payload.name || '').trim();
      if (!name) return false;
      await libraryService.createFolder({
        name,
        parent: payload.parent ? String(payload.parent) : undefined,
        color: payload.color ? String(payload.color) : undefined,
      });
      return true;
    });
    syncManager.registerHandler('folder_rename', async (payload) => {
      const folderId = String(payload.folderId || payload.id || '');
      const name = String(payload.name || '').trim();
      if (!folderId || !name) return false;
      await libraryService.renameFolder(folderId, name);
      return true;
    });
    syncManager.registerHandler('file_rename', async (payload) => {
      const fileId = String(payload.fileId || payload.id || '');
      const title = String(payload.title || payload.name || '').trim();
      if (!fileId || !title) return false;
      await libraryService.renameFile(fileId, title);
      return true;
    });
    syncManager.registerHandler('profile_update', async (payload) => {
      await userAPI.updateProfile({
        first_name: payload.first_name ? String(payload.first_name) : undefined,
        last_name: payload.last_name ? String(payload.last_name) : undefined,
        phone: payload.phone ? String(payload.phone) : undefined,
        bio: payload.bio ? String(payload.bio) : undefined,
        avatar: payload.avatar ? String(payload.avatar) : undefined,
      });
      return true;
    });
  }

  private async syncBookmarkState(resourceId: string, desiredState: boolean): Promise<boolean> {
    if (!resourceId) return false;

    const response = await bookmarksAPI.list({ limit: 100 });
    const payload = response?.data?.data || response?.data || {};
    const bookmarks = Array.isArray(payload?.bookmarks) ? payload.bookmarks : payload?.results || [];
    const existing = bookmarks.find(
      (item: any) => String(item?.resource_id || item?.resource?.id || '') === String(resourceId)
    );

    if (desiredState) {
      if (existing) return true;
      await bookmarksAPI.add(resourceId);
      return true;
    }

    if (!existing) {
      return true;
    }

    await bookmarksAPI.remove(String(existing.id || resourceId));
    return true;
  }

  private async syncFavoriteState(
    targetType: string,
    targetId: string,
    desiredState: boolean
  ): Promise<boolean> {
    if (!targetId) return false;

    const listType =
      targetType === 'file' ? 'files' : targetType === 'folder' ? 'folders' : 'resources';
    const response = await favoritesAPI.list({ limit: 100, type: listType as any });
    const payload = response?.data?.data || response?.data || {};
    const favorites = Array.isArray(payload?.favorites) ? payload.favorites : payload?.results || [];
    const existing = favorites.find((item: any) => {
      if (targetType === 'file') {
        return String(item?.personal_file?.id || '') === targetId;
      }
      if (targetType === 'folder') {
        return String(item?.personal_folder?.id || '') === targetId;
      }
      return String(item?.resource?.id || '') === targetId;
    });

    if (desiredState) {
      if (existing) return true;

      await favoritesAPI.add({
        favorite_type:
          targetType === 'file'
            ? 'personal_file'
            : targetType === 'folder'
            ? 'folder'
            : 'resource',
        resource_id: targetType === 'resource' ? targetId : undefined,
        personal_file_id: targetType === 'file' ? targetId : undefined,
        personal_folder_id: targetType === 'folder' ? targetId : undefined,
      });
      return true;
    }

    if (!existing) {
      return true;
    }

    await favoritesAPI.remove(String(existing.id || targetId));
    return true;
  }

  async generateSafeFolderName(desiredName: string, existingNames: string[]): Promise<string> {
    return folderAlgorithms.generateDuplicateSafeName(desiredName, existingNames);
  }

  private async tryProcessQueue() {
    try {
      await syncManager.processQueue();
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }
}

export const localRecentSearchAutomation = new LocalRecentSearchAutomation();
export const mobileAutomationService = new MobileAutomationService();
