// Cloud Storage Service for CampusHub
// Google Drive and OneDrive integration

import * as Linking from 'expo-linking';
import api from './api';

export interface CloudAccount {
  id: string;
  provider: 'google_drive' | 'onedrive';
  email: string;
  display_name: string;
  avatar_url?: string;
  connected: boolean;
  last_sync?: string;
  storage_used?: number;
  storage_total?: number;
}

export interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webUrl?: string;
  downloadUrl?: string;
  isFolder: boolean;
  parents?: string[];
}

export interface CloudFolder {
  id: string;
  name: string;
  path: string;
}

export interface CloudStorageStats {
  provider: 'google_drive' | 'onedrive';
  storage_used: number;
  storage_total: number;
  connected: boolean;
}

export type CloudProvider = 'google_drive' | 'onedrive';

const getQueryValue = (value: string | string[] | undefined): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return '';
};

const CLOUD_REDIRECT_PATHS: Record<CloudProvider, string> = {
  google_drive: 'auth/google/callback',
  onedrive: 'auth/microsoft/callback',
};

export const getCloudRedirectUri = (provider: CloudProvider): string =>
  Linking.createURL(CLOUD_REDIRECT_PATHS[provider]);

export const getCloudProviderLabel = (provider: CloudProvider): string =>
  provider === 'google_drive' ? 'Google Drive' : 'My Drive';

const parseCloudCallback = (callbackUrl: string) => {
  const parsed = Linking.parse(callbackUrl);
  const queryParams = parsed.queryParams || {};
  return {
    code: getQueryValue(queryParams.code as string | string[] | undefined),
    error: getQueryValue(queryParams.error as string | string[] | undefined),
    errorDescription:
      getQueryValue(queryParams.error_description as string | string[] | undefined) ||
      getQueryValue(queryParams.errorDescription as string | string[] | undefined),
  };
};

// Google Drive Service
export const googleDriveService = {
  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await api.get('/cloud-storage/google/status/');
      return response.data?.connected || false;
    } catch {
      return false;
    }
  },

  // Get connected account info
  async getAccount(): Promise<CloudAccount | null> {
    try {
      const response = await api.get('/cloud-storage/google/account/');
      return response.data;
    } catch {
      return null;
    }
  },

  // Connect Google Drive
  async connect(): Promise<{ authUrl: string }> {
    try {
      const response = await api.post('/cloud-storage/google/connect/', {
        redirect_uri: getCloudRedirectUri('google_drive'),
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to connect to Google Drive');
    }
  },

  // Disconnect Google Drive
  async disconnect(): Promise<void> {
    try {
      await api.post('/cloud-storage/google/disconnect/');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to disconnect Google Drive');
    }
  },

  // List files in Google Drive
  async listFiles(folderId?: string, pageToken?: string): Promise<{ files: CloudFile[]; nextPageToken?: string }> {
    try {
      const response = await api.get('/cloud-storage/google/files/', {
        params: { folder_id: folderId, page_token: pageToken },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to list files');
    }
  },

  // List folders in Google Drive
  async listFolders(parentId?: string): Promise<CloudFolder[]> {
    try {
      const response = await api.get('/cloud-storage/google/folders/', {
        params: { parent_id: parentId },
      });
      return response.data.folders || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to list folders');
    }
  },

  // Download file from Google Drive
  async downloadFile(fileId: string): Promise<{ url: string; filename: string }> {
    try {
      const response = await api.get(`/cloud-storage/google/download/${fileId}/`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to download file');
    }
  },

  // Upload file to Google Drive
  async uploadFile(file: { uri: string; name: string; type: string }, parentId?: string): Promise<CloudFile> {
    try {
      const formData = new FormData();
      formData.append('file', file as any);
      if (parentId) {
        formData.append('parent_id', parentId);
      }
      
      const response = await api.post('/cloud-storage/google/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to upload file');
    }
  },

  // Get storage stats
  async getStorageStats(): Promise<CloudStorageStats> {
    try {
      const response = await api.get('/cloud-storage/google/storage/');
      return response.data;
    } catch {
      return { provider: 'google_drive', storage_used: 0, storage_total: 0, connected: false };
    }
  },
};

// OneDrive Service
export const onedriveService = {
  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await api.get('/cloud-storage/onedrive/status/');
      return response.data?.connected || false;
    } catch {
      return false;
    }
  },

  // Get connected account info
  async getAccount(): Promise<CloudAccount | null> {
    try {
      const response = await api.get('/cloud-storage/onedrive/account/');
      return response.data;
    } catch {
      return null;
    }
  },

  // Connect OneDrive
  async connect(): Promise<{ authUrl: string }> {
    try {
      const response = await api.post('/cloud-storage/onedrive/connect/', {
        redirect_uri: getCloudRedirectUri('onedrive'),
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to connect to OneDrive');
    }
  },

  // Disconnect OneDrive
  async disconnect(): Promise<void> {
    try {
      await api.post('/cloud-storage/onedrive/disconnect/');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to disconnect OneDrive');
    }
  },

  // List files in OneDrive
  async listFiles(folderId?: string, pageToken?: string): Promise<{ files: CloudFile[]; nextPageToken?: string }> {
    try {
      const response = await api.get('/cloud-storage/onedrive/files/', {
        params: { folder_id: folderId, page_token: pageToken },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to list files');
    }
  },

  // List folders in OneDrive
  async listFolders(parentId?: string): Promise<CloudFolder[]> {
    try {
      const response = await api.get('/cloud-storage/onedrive/folders/', {
        params: { parent_id: parentId },
      });
      return response.data.folders || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to list folders');
    }
  },

  // Download file from OneDrive
  async downloadFile(fileId: string): Promise<{ url: string; filename: string }> {
    try {
      const response = await api.get(`/cloud-storage/onedrive/download/${fileId}/`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to download file');
    }
  },

  // Upload file to OneDrive
  async uploadFile(file: { uri: string; name: string; type: string }, parentId?: string): Promise<CloudFile> {
    try {
      const formData = new FormData();
      formData.append('file', file as any);
      if (parentId) {
        formData.append('parent_id', parentId);
      }
      
      const response = await api.post('/cloud-storage/onedrive/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to upload file');
    }
  },

  // Get storage stats
  async getStorageStats(): Promise<CloudStorageStats> {
    try {
      const response = await api.get('/cloud-storage/onedrive/storage/');
      return response.data;
    } catch {
      return { provider: 'onedrive', storage_used: 0, storage_total: 0, connected: false };
    }
  },
};

// Unified Cloud Storage API
export const cloudStorageService = {
  // Get all connected accounts
  async getConnectedAccounts(): Promise<CloudAccount[]> {
    try {
      const response = await api.get('/cloud-storage/accounts/');
      return response.data.accounts || [];
    } catch {
      return [];
    }
  },

  async completeConnection(provider: CloudProvider, callbackUrl: string): Promise<CloudAccount> {
    const { code, error, errorDescription } = parseCloudCallback(callbackUrl);
    if (error) {
      throw new Error(errorDescription || error.replace(/_/g, ' '));
    }
    if (!code) {
      throw new Error('The sign-in callback did not include an authorization code.');
    }

    try {
      const response = await api.post(`/cloud-storage/${provider}/oauth/callback/`, {
        code,
        redirect_uri: getCloudRedirectUri(provider),
      });
      return response.data?.account;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          `Failed to finish linking ${getCloudProviderLabel(provider)}`
      );
    }
  },

  // Import file from cloud storage to CampusHub
  async importFile(provider: 'google_drive' | 'onedrive', fileId: string, targetLibraryId?: string): Promise<{ resource_id: string }> {
    try {
      const response = await api.post(`/cloud-storage/${provider}/import/`, {
        file_id: fileId,
        target_library_id: targetLibraryId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to import file');
    }
  },

  // Export CampusHub resource to cloud storage
  async exportFile(provider: 'google_drive' | 'onedrive', resourceId: string, folderId?: string): Promise<{ cloud_file_id: string }> {
    try {
      const response = await api.post(`/cloud-storage/${provider}/export/`, {
        resource_id: resourceId,
        folder_id: folderId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to export file');
    }
  },

  // Sync files between CampusHub and cloud
  async syncFiles(provider: 'google_drive' | 'onedrive'): Promise<{ synced: number; errors: string[] }> {
    try {
      const response = await api.post(`/cloud-storage/${provider}/sync/`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to sync files');
    }
  },
};

export default cloudStorageService;
