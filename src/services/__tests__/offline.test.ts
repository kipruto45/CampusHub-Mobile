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
  getNetworkStateAsync: jest.fn(async () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'WIFI',
  })),
}));

import { syncQueueService } from '../offline';

describe('offline sync queue', () => {
  beforeEach(async () => {
    mockStorage.clear();
    jest.clearAllMocks();
    await syncQueueService.clearQueue();
  });

  it('collapses bookmark actions for the same resource into the latest intent', async () => {
    await syncQueueService.addAction('bookmark_add', { resourceId: 'resource-1' });
    await syncQueueService.addAction('bookmark_remove', { resourceId: 'resource-1' });

    const queue = await syncQueueService.getQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('bookmark_remove');
    expect(queue[0].payload).toEqual({ resourceId: 'resource-1' });
  });

  it('collapses favorite actions for the same target and keeps unrelated ones', async () => {
    await syncQueueService.addAction('favorite_add', {
      target_type: 'file',
      target_id: 'file-1',
    });
    await syncQueueService.addAction('favorite_remove', {
      target_type: 'file',
      target_id: 'file-1',
    });
    await syncQueueService.addAction('favorite_add', {
      target_type: 'folder',
      target_id: 'folder-1',
    });

    const queue = await syncQueueService.getQueue();

    expect(queue).toHaveLength(2);
    expect(queue[0].type).toBe('favorite_remove');
    expect(queue[1].type).toBe('favorite_add');
  });

  it('keeps only the latest profile update action', async () => {
    await syncQueueService.addAction('profile_update', { first_name: 'Victor' });
    await syncQueueService.addAction('profile_update', { first_name: 'Kipruto' });

    const queue = await syncQueueService.getQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toEqual({ first_name: 'Kipruto' });
  });
});
