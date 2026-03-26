import AsyncStorage from '@react-native-async-storage/async-storage';

import { networkService } from './offline';

export const LIBRARY_CACHE_TTL = {
  overview: 2 * 60 * 1000,
  storage: 5 * 60 * 1000,
  folders: 3 * 60 * 1000,
  allFolders: 3 * 60 * 1000,
  folderDetails: 2 * 60 * 1000,
  files: 2 * 60 * 1000,
  fileDetails: 2 * 60 * 1000,
  recentFiles: 60 * 1000,
  favoriteFiles: 2 * 60 * 1000,
  favoriteFolders: 2 * 60 * 1000,
  trash: 60 * 1000,
} as const;

export type LibraryCacheScope =
  | 'overview'
  | 'storage'
  | 'folders'
  | 'all-folders'
  | 'folder-details'
  | 'files'
  | 'file-details'
  | 'recent-files'
  | 'favorite-files'
  | 'favorite-folders'
  | 'trash';

type CacheEntry<T> = {
  data: T;
  cachedAt: number;
  ttl: number;
};

type FetchCacheParams<T> = {
  scope: LibraryCacheScope;
  ttl: number;
  identifier?: string | null;
  fetcher: () => Promise<T>;
};

type CacheStats = {
  keys: string[];
  itemCount: number;
  oldestAgeMs: number | null;
  newestAgeMs: number | null;
};

const STORAGE_PREFIX = 'campushub:library-cache:v1';
const INDEX_KEY = `${STORAGE_PREFIX}:index`;
const GLOBAL_IDENTIFIER = 'global';

const normalizeIdentifier = (value?: string | null): string =>
  value && String(value).trim().length > 0 ? String(value).trim() : GLOBAL_IDENTIFIER;

class LibraryCacheService {
  private buildStorageKey(scope: LibraryCacheScope, identifier?: string | null) {
    return `${STORAGE_PREFIX}:${scope}:${normalizeIdentifier(identifier)}`;
  }

  private async getIndex(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(INDEX_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private async setIndex(keys: string[]) {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(Array.from(new Set(keys))));
  }

  private async rememberKey(key: string) {
    const keys = await this.getIndex();
    if (!keys.includes(key)) {
      keys.push(key);
      await this.setIndex(keys);
    }
  }

  private async forgetKey(key: string) {
    const keys = await this.getIndex();
    await this.setIndex(keys.filter((item) => item !== key));
  }

  private async readEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
    } catch {
      return null;
    }
  }

  private isExpired<T>(entry: CacheEntry<T>) {
    return Date.now() - entry.cachedAt > entry.ttl;
  }

  async get<T>(
    scope: LibraryCacheScope,
    identifier?: string | null,
    options?: { allowExpired?: boolean }
  ): Promise<T | null> {
    const entry = await this.readEntry<T>(this.buildStorageKey(scope, identifier));
    if (!entry) {
      return null;
    }
    if (!options?.allowExpired && this.isExpired(entry)) {
      return null;
    }
    return entry.data;
  }

  async set<T>(
    scope: LibraryCacheScope,
    identifier: string | null | undefined,
    data: T,
    ttl: number
  ): Promise<T> {
    const storageKey = this.buildStorageKey(scope, identifier);
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      ttl,
    };

    await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
    await this.rememberKey(storageKey);
    return data;
  }

  async fetch<T>({ scope, ttl, identifier, fetcher }: FetchCacheParams<T>): Promise<T> {
    const fresh = await this.get<T>(scope, identifier);
    if (fresh !== null) {
      return fresh;
    }

    const isConnected = await networkService.isConnected().catch(() => false);
    if (!isConnected) {
      const stale = await this.get<T>(scope, identifier, { allowExpired: true });
      if (stale !== null) {
        return stale;
      }
      throw new Error('No network connection and no cached library data available.');
    }

    try {
      const data = await fetcher();
      await this.set(scope, identifier, data, ttl);
      return data;
    } catch (error) {
      const stale = await this.get<T>(scope, identifier, { allowExpired: true });
      if (stale !== null) {
        return stale;
      }
      throw error;
    }
  }

  async invalidate(scope: LibraryCacheScope, identifier?: string | null): Promise<void> {
    if (identifier !== undefined && identifier !== null) {
      const storageKey = this.buildStorageKey(scope, identifier);
      await AsyncStorage.removeItem(storageKey);
      await this.forgetKey(storageKey);
      return;
    }

    const keys = await this.getIndex();
    const prefix = `${STORAGE_PREFIX}:${scope}:`;
    const matchingKeys = keys.filter((key) => key.startsWith(prefix));

    if (matchingKeys.length === 0) {
      return;
    }

    await (AsyncStorage as any).multiRemove(matchingKeys);
    await this.setIndex(keys.filter((key) => !key.startsWith(prefix)));
  }

  async invalidateMany(
    targets: { scope: LibraryCacheScope; identifier?: string | null }[]
  ): Promise<void> {
    for (const target of targets) {
      await this.invalidate(target.scope, target.identifier);
    }
  }

  async invalidateAll(): Promise<void> {
    const keys = await this.getIndex();
    if (keys.length > 0) {
      await (AsyncStorage as any).multiRemove(keys);
    }
    await AsyncStorage.removeItem(INDEX_KEY);
  }

  async getStats(): Promise<CacheStats> {
    const keys = await this.getIndex();
    const ages = (
      await Promise.all(
        keys.map(async (key) => {
          const entry = await this.readEntry(key);
          return entry ? Date.now() - entry.cachedAt : null;
        })
      )
    ).filter((value): value is number => value !== null);

    return {
      keys,
      itemCount: keys.length,
      oldestAgeMs: ages.length ? Math.max(...ages) : null,
      newestAgeMs: ages.length ? Math.min(...ages) : null,
    };
  }
}

export const libraryCacheService = new LibraryCacheService();
