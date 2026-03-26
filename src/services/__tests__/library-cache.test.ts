import { libraryCacheService } from '../library-cache';
import { networkService } from '../offline';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((key) => mockStorage.delete(key));
    }),
  },
}));

jest.mock('expo-network', () => ({
  __esModule: true,
  getNetworkStateAsync: jest.fn(async () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'WIFI',
  })),
}));

describe('library-cache', () => {
  beforeEach(async () => {
    mockStorage.clear();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    await libraryCacheService.invalidateAll();
  });

  it('caches fetched data and reuses the fresh entry', async () => {
    jest.spyOn(networkService, 'isConnected').mockResolvedValue(true);
    const fetcher = jest.fn(async () => ({ total_files: 12 }));

    const first = await libraryCacheService.fetch({
      scope: 'overview',
      ttl: 60_000,
      fetcher,
    });
    const second = await libraryCacheService.fetch({
      scope: 'overview',
      ttl: 60_000,
      fetcher,
    });

    expect(first).toEqual({ total_files: 12 });
    expect(second).toEqual({ total_files: 12 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('returns stale cached data while offline when the entry has expired', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1_000).mockReturnValue(5_000);

    await libraryCacheService.set('files', 'root', [{ id: 'file-1' }], 1_000);
    jest.spyOn(networkService, 'isConnected').mockResolvedValue(false);

    const fetcher = jest.fn(async () => [{ id: 'file-2' }]);
    const result = await libraryCacheService.fetch({
      scope: 'files',
      identifier: 'root',
      ttl: 1_000,
      fetcher,
    });

    expect(result).toEqual([{ id: 'file-1' }]);
    expect(fetcher).not.toHaveBeenCalled();

    nowSpy.mockRestore();
  });

  it('invalidates only the requested scope entries', async () => {
    await libraryCacheService.set('overview', undefined, { id: 'overview' }, 60_000);
    await libraryCacheService.set('files', 'root', [{ id: 'file-1' }], 60_000);
    await libraryCacheService.set('folder-details', 'folder-1', { id: 'folder-1' }, 60_000);

    await libraryCacheService.invalidate('files');

    expect(await libraryCacheService.get('overview')).toEqual({ id: 'overview' });
    expect(await libraryCacheService.get('files', 'root')).toBeNull();
    expect(await libraryCacheService.get('folder-details', 'folder-1')).toEqual({
      id: 'folder-1',
    });
  });

  it('reports cache statistics from stored entries', async () => {
    await libraryCacheService.set('overview', undefined, { id: 'overview' }, 60_000);
    await libraryCacheService.set('storage', undefined, { id: 'storage' }, 60_000);

    const stats = await libraryCacheService.getStats();

    expect(stats.itemCount).toBe(2);
    expect(stats.keys).toHaveLength(2);
    expect(stats.oldestAgeMs).not.toBeNull();
    expect(stats.newestAgeMs).not.toBeNull();
  });
});
