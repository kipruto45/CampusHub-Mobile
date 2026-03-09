// Download Manager - Handles downloading files for offline access
// Simplified version using metadata tracking

import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineFileService } from './offline';

const DOWNLOADS_KEY = 'campushub_downloads';
const MAX_CONCURRENT_DOWNLOADS = 3;

export interface DownloadTask {
  id: string;
  resourceId: string;
  url: string;
  fileName: string;
  mimeType: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface DownloadManagerState {
  tasks: DownloadTask[];
  activeDownloads: number;
}

class DownloadManager {
  private tasks: Map<string, DownloadTask> = new Map();
  private listeners: Array<(state: DownloadManagerState) => void> = [];
  private activeCount: number = 0;

  constructor() {
    this.loadTasks();
  }

  private async loadTasks() {
    try {
      const data = await AsyncStorage.getItem(DOWNLOADS_KEY);
      if (data) {
        const tasks: DownloadTask[] = JSON.parse(data);
        tasks.forEach(task => {
          if (task.status === 'downloading') {
            // Reset any tasks that were in progress when app closed
            task.status = 'pending';
          }
          this.tasks.set(task.id, task);
        });
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading download tasks:', error);
    }
  }

  private async saveTasks() {
    try {
      const tasks = Array.from(this.tasks.values());
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving download tasks:', error);
    }
  }

  /**
   * Start downloading a file for offline access
   * Note: The actual download is handled by offlineFileService
   */
  async startDownload(
    resourceId: string,
    url: string,
    fileName: string,
    mimeType: string
  ): Promise<DownloadTask> {
    // Check if already downloading
    const existingTask = Array.from(this.tasks.values()).find(
      t => t.resourceId === resourceId && t.status !== 'completed'
    );
    if (existingTask) {
      return existingTask;
    }

    const task: DownloadTask = {
      id: `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      resourceId,
      url,
      fileName,
      mimeType,
      progress: 0,
      status: 'pending',
      startedAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    await this.saveTasks();
    this.notifyListeners();

    // Start the download process
    this.processDownload(task);

    return task;
  }

  /**
   * Process a single download
   */
  private async processDownload(task: DownloadTask) {
    if (this.activeCount >= MAX_CONCURRENT_DOWNLOADS) {
      return;
    }

    this.activeCount++;
    task.status = 'downloading';
    this.notifyListeners();
    await this.saveTasks();

    try {
      // Download the file using offline file service
      const result = await offlineFileService.downloadForOffline(
        task.resourceId,
        task.url,
        task.fileName,
        task.mimeType
      );

      if (result) {
        task.progress = 1;
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.activeCount--;
    await this.saveTasks();
    this.notifyListeners();
  }

  /**
   * Cancel a download
   */
  async cancelDownload(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'downloading') {
      task.status = 'cancelled';
      await this.saveTasks();
      this.notifyListeners();
    }
  }

  /**
   * Cancel all downloads
   */
  async cancelAll(): Promise<void> {
    this.tasks.forEach(task => {
      if (task.status === 'pending' || task.status === 'downloading') {
        task.status = 'cancelled';
      }
    });
    await this.saveTasks();
    this.notifyListeners();
  }

  /**
   * Retry a failed download
   */
  async retryDownload(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task && (task.status === 'failed' || task.status === 'cancelled')) {
      task.status = 'pending';
      task.progress = 0;
      task.error = undefined;
      await this.saveTasks();
      this.notifyListeners();
      this.processDownload(task);
    }
  }

  /**
   * Remove a download (deletes local file too)
   */
  async removeDownload(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      // Delete the offline file
      await offlineFileService.deleteOfflineFile(task.resourceId);
      this.tasks.delete(taskId);
      await this.saveTasks();
      this.notifyListeners();
    }
  }

  /**
   * Get all downloads
   */
  getDownloads(): DownloadTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get download by resource ID
   */
  getDownloadByResourceId(resourceId: string): DownloadTask | undefined {
    return Array.from(this.tasks.values()).find(t => t.resourceId === resourceId);
  }

  /**
   * Check if a resource is downloaded
   */
  async isDownloaded(resourceId: string): Promise<boolean> {
    return await offlineFileService.isAvailableOffline(resourceId);
  }

  /**
   * Get active downloads count
   */
  getActiveCount(): number {
    return this.activeCount;
  }

  subscribe(listener: (state: DownloadManagerState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const state: DownloadManagerState = {
      tasks: Array.from(this.tasks.values()),
      activeDownloads: this.activeCount,
    };
    this.listeners.forEach(listener => listener(state));
  }
}

export const downloadManager = new DownloadManager();
export default downloadManager;
