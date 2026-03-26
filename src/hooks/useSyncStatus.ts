// useSyncStatus Hook - Monitor sync queue and network status

import { useCallback,useEffect,useState } from 'react';
import { networkService,QueuedAction,syncQueueService } from '../services/offline';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface UseSyncStatusResult {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: QueuedAction[];
  pendingCount: number;
  lastSyncTime: number | null;
  syncStatus: SyncStatus;
  retryFailed: () => Promise<void>;
  clearQueue: () => Promise<void>;
}

/**
 * Hook to monitor sync queue status and network connectivity
 * 
 * @example
 * const { isOnline, pendingCount, syncStatus } = useSyncStatus();
 */
export const useSyncStatus = (): UseSyncStatusResult => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const loadQueue = useCallback(async () => {
    const queue = await syncQueueService.getQueue();
    setPendingActions(queue);
  }, []);

  const checkNetwork = useCallback(async () => {
    const connected = await networkService.isConnected();
    setIsOnline(connected);
    return connected;
  }, []);

  useEffect(() => {
    // Initial load
    loadQueue();
    checkNetwork();

    // Subscribe to queue changes
    const unsubscribeQueue = syncQueueService.subscribe(loadQueue);
    
    // Subscribe to network changes
    const unsubscribeNetwork = networkService.subscribe((state) => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    // Start network monitoring
    networkService.startMonitoring(30000);

    return () => {
      unsubscribeQueue();
      unsubscribeNetwork();
      networkService.stopMonitoring();
    };
  }, [loadQueue, checkNetwork]);

  const getSyncStatus = useCallback((): SyncStatus => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    const hasFailed = pendingActions.some(a => a.status === 'failed');
    if (hasFailed) return 'error';
    return 'idle';
  }, [isOnline, isSyncing, pendingActions]);

  const retryFailed = useCallback(async () => {
    setIsSyncing(true);
    const failedActions = pendingActions.filter(a => a.status === 'failed');
    
    for (const action of failedActions) {
      await syncQueueService.updateAction(action.id, { status: 'pending', retryCount: action.retryCount + 1 });
    }
    
    setIsSyncing(false);
    await loadQueue();
  }, [pendingActions, loadQueue]);

  const clearQueue = useCallback(async () => {
    await syncQueueService.clearQueue();
    setLastSyncTime(Date.now());
    await loadQueue();
  }, [loadQueue]);

  return {
    isOnline,
    isSyncing,
    pendingActions,
    pendingCount: pendingActions.filter(a => a.status === 'pending').length,
    lastSyncTime,
    syncStatus: getSyncStatus(),
    retryFailed,
    clearQueue,
  };
};

export default useSyncStatus;
