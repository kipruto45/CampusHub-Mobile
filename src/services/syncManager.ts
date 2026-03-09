// Sync Manager - Processes queued actions when back online

import { syncQueueService, networkService, QueuedAction, QueuedActionType } from './offline';

const MAX_RETRIES = 3;
const SYNC_DELAY_MS = 2000; // Delay before syncing to allow network to stabilize

interface SyncHandler {
  type: QueuedActionType;
  handler: (payload: Record<string, any>) => Promise<boolean>;
}

class SyncManager {
  private handlers: Map<QueuedActionType, SyncHandler['handler']> = new Map();
  private isSyncing: boolean = false;
  private listeners: Array<(status: SyncStatus) => void> = [];
  private unsubscribers: Array<() => void> = [];

  constructor() {
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    const unsubscribe = networkService.subscribe(async (state) => {
      if (state.isConnected && state.isInternetReachable) {
        // Network is back - trigger sync
        await this.processQueue();
      }
    });
    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Register a handler for a specific action type
   */
  registerHandler(type: QueuedActionType, handler: (payload: Record<string, any>) => Promise<boolean>) {
    this.handlers.set(type, handler);
  }

  /**
   * Process all queued actions
   */
  async processQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, processed: 0, failed: 0, message: 'Sync already in progress' };
    }

    const isConnected = await networkService.isConnected();
    if (!isConnected) {
      return { success: false, processed: 0, failed: 0, message: 'No network connection' };
    }

    this.isSyncing = true;
    this.notifyListeners({ isSyncing: true, lastSync: new Date().toISOString() });

    // Wait for network to stabilize
    await new Promise(resolve => setTimeout(resolve, SYNC_DELAY_MS));

    const queue = await syncQueueService.getQueue();
    const pendingActions = queue.filter(a => a.status === 'pending');

    let processed = 0;
    let failed = 0;

    for (const action of pendingActions) {
      const handler = this.handlers.get(action.type);

      if (!handler) {
        console.warn(`No handler registered for action type: ${action.type}`);
        await syncQueueService.removeAction(action.id);
        continue;
      }

      try {
        // Mark as syncing
        await syncQueueService.updateAction(action.id, { status: 'syncing' });

        const success = await handler(action.payload);

        if (success) {
          await syncQueueService.removeAction(action.id);
          processed++;
        } else {
          const newRetryCount = action.retryCount + 1;
          if (newRetryCount >= MAX_RETRIES) {
            await syncQueueService.updateAction(action.id, { 
              status: 'failed', 
              retryCount: newRetryCount 
            });
            failed++;
          } else {
            await syncQueueService.updateAction(action.id, { 
              status: 'pending', 
              retryCount: newRetryCount 
            });
          }
        }
      } catch (error) {
        console.error(`Error processing action ${action.id}:`, error);
        const newRetryCount = action.retryCount + 1;
        if (newRetryCount >= MAX_RETRIES) {
          await syncQueueService.updateAction(action.id, { 
            status: 'failed', 
            retryCount: newRetryCount 
          });
          failed++;
        } else {
          await syncQueueService.updateAction(action.id, { 
            status: 'pending', 
            retryCount: newRetryCount 
          });
        }
      }
    }

    this.isSyncing = false;
    const result: SyncResult = {
      success: failed === 0,
      processed,
      failed,
      message: `Processed ${processed} actions, ${failed} failed`,
    };

    this.notifyListeners({ 
      isSyncing: false, 
      lastSync: new Date().toISOString(),
      result 
    });

    return result;
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatus> {
    const queue = await syncQueueService.getQueue();
    const pending = queue.filter(a => a.status === 'pending').length;
    const failed = queue.filter(a => a.status === 'failed').length;
    const syncing = queue.filter(a => a.status === 'syncing').length;

    return {
      isSyncing: this.isSyncing,
      pendingCount: pending,
      failedCount: failed,
      syncingCount: syncing,
    };
  }

  /**
   * Retry failed actions
   */
  async retryFailed(): Promise<void> {
    const queue = await syncQueueService.getQueue();
    const failedActions = queue.filter(a => a.status === 'failed');

    for (const action of failedActions) {
      await syncQueueService.updateAction(action.id, { 
        status: 'pending', 
        retryCount: 0 
      });
    }

    await this.processQueue();
  }

  /**
   * Clear all failed actions
   */
  async clearFailed(): Promise<void> {
    const queue = await syncQueueService.getQueue();
    const failedActions = queue.filter(a => a.status === 'failed');

    for (const action of failedActions) {
      await syncQueueService.removeAction(action.id);
    }
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach(listener => listener(status));
  }

  cleanup() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}

interface SyncStatus {
  isSyncing: boolean;
  lastSync?: string;
  pendingCount?: number;
  failedCount?: number;
  syncingCount?: number;
  result?: SyncResult;
}

interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  message: string;
}

export const syncManager = new SyncManager();
export type { SyncStatus, SyncResult };
export default syncManager;
