// Library Service for CampusHub Personal Library
// Provides comprehensive API methods for managing personal files and folders

import { folderAlgorithms } from './algorithms.service';
import api from './api';
import { LIBRARY_CACHE_TTL,libraryCacheService } from './library-cache';

// Types
export interface StorageSummary {
  storage_limit_bytes: number;
  storage_used_bytes: number;
  storage_remaining_bytes: number;
  usage_percent: number;
  total_files: number;
  warning_level: 'normal' | 'warning' | 'critical';
}

export interface LibraryFolder {
  id: string;
  name: string;
  color: string;
  parent: string | null;
  is_favorite: boolean;
  file_count: number;
  total_size: number;
  subfolders_count?: number;
  created_at: string;
  updated_at: string;
}

export interface LibraryFile {
  id: string;
  title: string;
  file: string;
  file_url: string;
  file_type: string;
  file_size: number;
  description: string;
  folder: string | null;
  folder_name: string | null;
  is_favorite: boolean;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrashItem {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  deleted_at: string;
  original_folder: string | null;
  original_folder_name: string | null;
  file_url: string;
  can_restore: boolean;
  created_at: string;
}

export interface Breadcrumb {
  id: string;
  name: string;
  slug: string;
}

export interface LibraryOverview {
  root_folders: LibraryFolder[];
  recent_files: LibraryFile[];
  favorite_folders: LibraryFolder[];
  favorite_files: LibraryFile[];
  storage_summary: StorageSummary;
}

// Helper functions
const isArray = (value: any): value is any[] => Array.isArray(value);

const normalizeFolder = (data: any): LibraryFolder => ({
  id: data.id,
  name: data.name,
  color: data.color || '#3b82f6',
  parent: data.parent,
  is_favorite: Boolean(data.is_favorite),
  file_count: Number(data.file_count || 0),
  total_size: Number(data.total_size || 0),
  subfolders_count: Number(data.subfolders_count || 0),
  created_at: data.created_at,
  updated_at: data.updated_at,
});

const normalizeFile = (data: any): LibraryFile => ({
  id: data.id,
  title: data.title,
  file: data.file,
  file_url: data.file_url || data.file,
  file_type: data.file_type || '',
  file_size: Number(data.file_size || 0),
  description: data.description || '',
  folder: data.folder,
  folder_name: data.folder_name || null,
  is_favorite: Boolean(data.is_favorite),
  last_accessed_at: data.last_accessed_at,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

const normalizeTrashItem = (data: any): TrashItem => ({
  id: data.id,
  title: data.title,
  file_type: data.file_type || '',
  file_size: Number(data.file_size || 0),
  deleted_at: data.deleted_at,
  original_folder: data.original_folder,
  original_folder_name: data.original_folder_name || null,
  file_url: data.file_url || '',
  can_restore: Boolean(data.can_restore),
  created_at: data.created_at,
});

const extractArray = (data: any): any[] => {
  if (!data) return [];
  if (isArray(data)) return data;
  if (data.results && isArray(data.results)) return data.results;
  return [];
};

const normalizeOverview = (data: any): LibraryOverview => ({
  root_folders: folderAlgorithms.sortFolders(
    extractArray(data?.root_folders || data).map(normalizeFolder)
  ),
  recent_files: folderAlgorithms.sortFiles(extractArray(data?.recent_files).map(normalizeFile)),
  favorite_folders: folderAlgorithms.sortFolders(
    extractArray(data?.favorite_folders).map(normalizeFolder)
  ),
  favorite_files: folderAlgorithms.sortFiles(
    extractArray(data?.favorite_files).map(normalizeFile)
  ),
  storage_summary: data?.storage_summary || {
    storage_limit_bytes: 0,
    storage_used_bytes: 0,
    storage_remaining_bytes: 0,
    usage_percent: 0,
    total_files: 0,
    warning_level: 'normal',
  },
});

const normalizeStorageSummary = (data: any): StorageSummary => ({
  storage_limit_bytes: Number(data?.storage_limit_bytes || 0),
  storage_used_bytes: Number(data?.storage_used_bytes || 0),
  storage_remaining_bytes: Number(data?.storage_remaining_bytes || 0),
  usage_percent: Number(data?.usage_percent || 0),
  total_files: Number(data?.total_files || 0),
  warning_level: data?.warning_level || 'normal',
});

const invalidateFolderCaches = async () => {
  await libraryCacheService.invalidateMany([
    { scope: 'overview' },
    { scope: 'all-folders' },
    { scope: 'folders' },
    { scope: 'folder-details' },
    { scope: 'favorite-folders' },
  ]);
};

const invalidateFileCaches = async () => {
  await libraryCacheService.invalidateMany([
    { scope: 'overview' },
    { scope: 'files' },
    { scope: 'file-details' },
    { scope: 'folder-details' },
    { scope: 'recent-files' },
    { scope: 'favorite-files' },
    { scope: 'storage' },
    { scope: 'trash' },
  ]);
};

// Library API
export const libraryService = {
  // Library Overview
  async getLibraryOverview(): Promise<LibraryOverview> {
    return libraryCacheService.fetch({
      scope: 'overview',
      ttl: LIBRARY_CACHE_TTL.overview,
      fetcher: async () => {
        const response = await api.get('/library/');
        return normalizeOverview(response.data);
      },
    });
  },

  // Storage Summary
  async getStorageSummary(): Promise<StorageSummary> {
    return libraryCacheService.fetch({
      scope: 'storage',
      ttl: LIBRARY_CACHE_TTL.storage,
      fetcher: async () => {
        const response = await api.get('/library/storage-summary/');
        return normalizeStorageSummary(response.data);
      },
    });
  },

  // Folders
  async getFolders(parentId?: string): Promise<LibraryFolder[]> {
    return libraryCacheService.fetch({
      scope: 'folders',
      identifier: parentId || 'root',
      ttl: LIBRARY_CACHE_TTL.folders,
      fetcher: async () => {
        const params = parentId ? { parent: parentId } : {};
        const response = await api.get('/library/folders/', { params });
        return folderAlgorithms.sortFolders(
          extractArray(response.data?.results || response.data).map(normalizeFolder)
        );
      },
    });
  },

  async getAllFolders(): Promise<LibraryFolder[]> {
    return libraryCacheService.fetch({
      scope: 'all-folders',
      ttl: LIBRARY_CACHE_TTL.allFolders,
      fetcher: async () => {
        const response = await api.get('/library/folders/all/');
        return folderAlgorithms.sortFolders(
          extractArray(response.data?.results || response.data).map(normalizeFolder)
        );
      },
    });
  },

  async getFolderDetails(folderId: string): Promise<LibraryFolder & { subfolders: LibraryFolder[], files: LibraryFile[], breadcrumbs: Breadcrumb[] }> {
    return libraryCacheService.fetch({
      scope: 'folder-details',
      identifier: folderId,
      ttl: LIBRARY_CACHE_TTL.folderDetails,
      fetcher: async () => {
        const response = await api.get(`/library/folders/${folderId}/`);
        const data = response.data;
        return {
          ...normalizeFolder(data),
          subfolders: folderAlgorithms.sortFolders(
            extractArray(data?.subfolders).map(normalizeFolder)
          ),
          files: folderAlgorithms.sortFiles(extractArray(data?.files).map(normalizeFile)),
          breadcrumbs: extractArray(data?.breadcrumbs),
        };
      },
    });
  },

  async createFolder(data: { name: string; parent?: string; color?: string }): Promise<LibraryFolder> {
    const response = await api.post('/library/folders/', {
      name: data.name,
      parent: data.parent || null,
      color: data.color || '#3b82f6',
    });
    await invalidateFolderCaches();
    return normalizeFolder(response.data);
  },

  async renameFolder(folderId: string, name: string): Promise<LibraryFolder> {
    const response = await api.patch(`/library/folders/${folderId}/`, { name });
    await invalidateFolderCaches();
    return normalizeFolder(response.data);
  },

  async moveFolder(folderId: string, targetParentId: string | null): Promise<LibraryFolder> {
    const response = await api.post(`/library/folders/${folderId}/move/`, {
      target_parent_id: targetParentId,
    });
    await invalidateFolderCaches();
    return normalizeFolder(response.data);
  },

  async favoriteFolder(folderId: string): Promise<LibraryFolder> {
    const response = await api.post(`/library/folders/${folderId}/favorite/`);
    await invalidateFolderCaches();
    return normalizeFolder(response.data);
  },

  async deleteFolder(folderId: string): Promise<void> {
    await api.delete(`/library/folders/${folderId}/`);
    await invalidateFolderCaches();
  },

  // Files
  async getFiles(folderId?: string): Promise<LibraryFile[]> {
    return libraryCacheService.fetch({
      scope: 'files',
      identifier: folderId || 'root',
      ttl: LIBRARY_CACHE_TTL.files,
      fetcher: async () => {
        const params = folderId ? { folder: folderId } : {};
        const response = await api.get('/library/files/', { params });
        return folderAlgorithms.sortFiles(
          extractArray(response.data?.results || response.data).map(normalizeFile)
        );
      },
    });
  },

  async getFileDetails(fileId: string): Promise<LibraryFile> {
    return libraryCacheService.fetch({
      scope: 'file-details',
      identifier: fileId,
      ttl: LIBRARY_CACHE_TTL.fileDetails,
      fetcher: async () => {
        const response = await api.get(`/library/files/${fileId}/`);
        return normalizeFile(response.data);
      },
    });
  },

  async uploadFile(data: {
    file: FormData;
    title?: string;
    folder?: string;
    description?: string;
  }): Promise<LibraryFile> {
    const existingParts = (data.file as any)?._parts;
    const formData =
      Array.isArray(existingParts) ? data.file : new FormData();

    if (!Array.isArray(existingParts) && data.file) {
      formData.append('file', data.file as any);
    }

    const appendIfMissing = (key: string, value?: string) => {
      if (!value) return;
      const hasKey = Array.isArray((formData as any)?._parts)
        ? (formData as any)._parts.some((part: any) => Array.isArray(part) && part[0] === key)
        : false;
      if (!hasKey) {
        formData.append(key, value);
      }
    };

    appendIfMissing('title', data.title);
    appendIfMissing('folder', data.folder);
    appendIfMissing('description', data.description);

    const response = await api.post('/library/files/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await invalidateFileCaches();
    return normalizeFile(response.data);
  },

  async renameFile(fileId: string, title: string): Promise<LibraryFile> {
    const response = await api.patch(`/library/files/${fileId}/`, { title });
    await invalidateFileCaches();
    return normalizeFile(response.data);
  },

  async moveFile(fileId: string, folderId: string | null): Promise<LibraryFile> {
    const response = await api.post(`/library/files/${fileId}/move/`, {
      folder_id: folderId,
    });
    await invalidateFileCaches();
    return normalizeFile(response.data);
  },

  async duplicateFile(fileId: string): Promise<LibraryFile> {
    const response = await api.post(`/library/files/${fileId}/duplicate/`);
    await invalidateFileCaches();
    return normalizeFile(response.data);
  },

  async favoriteFile(fileId: string): Promise<LibraryFile> {
    const response = await api.post(`/library/files/${fileId}/favorite/`);
    await invalidateFileCaches();
    return normalizeFile(response.data);
  },

  async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/library/files/${fileId}/`);
    await invalidateFileCaches();
  },

  // Share & Preview
  async shareFile(fileId: string): Promise<{
    token: string;
    file_id: string;
    file_title: string;
    file_type: string;
    expires_in: number;
    share_url: string;
    can_share: boolean;
  }> {
    const response = await api.get(`/library/files/${fileId}/share/`);
    return response.data;
  },

  async recordShare(fileId: string, method: string): Promise<void> {
    await api.post(`/library/files/${fileId}/share/`, { method });
  },

  async getDownloadUrl(fileId: string): Promise<{
    download_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
  }> {
    const response = await api.get(`/library/files/${fileId}/download/`);
    return response.data;
  },

  async getPreviewInfo(fileId: string): Promise<{
    is_previewable: boolean;
    is_image: boolean;
    is_pdf: boolean;
    preview_type: string;
    file_type: string;
    file_url: string;
    thumbnail_url: string;
  }> {
    const response = await api.get(`/library/files/${fileId}/preview/`);
    return response.data;
  },

  // Recent Files
  async getRecentFiles(limit: number = 10): Promise<LibraryFile[]> {
    return libraryCacheService.fetch({
      scope: 'recent-files',
      identifier: String(limit),
      ttl: LIBRARY_CACHE_TTL.recentFiles,
      fetcher: async () => {
        const response = await api.get('/library/recent/', {
          params: { limit },
        });
        return folderAlgorithms
          .sortFiles(extractArray(response.data?.results || response.data).map(normalizeFile))
          .slice(0, limit);
      },
    });
  },

  // Favorites
  async getFavoriteFiles(): Promise<LibraryFile[]> {
    return libraryCacheService.fetch({
      scope: 'favorite-files',
      ttl: LIBRARY_CACHE_TTL.favoriteFiles,
      fetcher: async () => {
        const response = await api.get('/library/favorites/files/');
        return folderAlgorithms.sortFiles(
          extractArray(response.data?.results || response.data).map(normalizeFile)
        );
      },
    });
  },

  async getFavoriteFolders(): Promise<LibraryFolder[]> {
    return libraryCacheService.fetch({
      scope: 'favorite-folders',
      ttl: LIBRARY_CACHE_TTL.favoriteFolders,
      fetcher: async () => {
        const response = await api.get('/library/favorites/folders/');
        return folderAlgorithms.sortFolders(
          extractArray(response.data?.results || response.data).map(normalizeFolder)
        );
      },
    });
  },

  // Trash
  async getTrashItems(): Promise<TrashItem[]> {
    return libraryCacheService.fetch({
      scope: 'trash',
      ttl: LIBRARY_CACHE_TTL.trash,
      fetcher: async () => {
        const response = await api.get('/library/trash/');
        return extractArray(response.data?.results || response.data).map(normalizeTrashItem);
      },
    });
  },

  async restoreFile(fileId: string): Promise<void> {
    await api.post(`/library/files/${fileId}/restore/`);
    await invalidateFileCaches();
  },

  async permanentlyDeleteFile(fileId: string): Promise<void> {
    await api.delete(`/library/files/${fileId}/permanent-delete/`);
    await invalidateFileCaches();
  },

  async moveFileToTrash(fileId: string): Promise<void> {
    await api.post('/library/trash/move-to-trash/', { file_id: fileId });
    await invalidateFileCaches();
  },
};

// Utility functions for formatting
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(dateString);
};

export const getFileIcon = (fileType: string): string => {
  const iconMap: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    ppt: '📊',
    pptx: '📊',
    xls: '📈',
    xlsx: '📈',
    txt: '📃',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    zip: '📦',
    rar: '📦',
    mp3: '🎵',
    mp4: '🎬',
    wav: '🎵',
    mov: '🎬',
  };
  
  return iconMap[fileType.toLowerCase()] || '📁';
};

export const getFolderColor = (color: string): string => {
  const colorMap: Record<string, string> = {
    '#3b82f6': 'Blue',
    '#10b981': 'Green',
    '#f59e0b': 'Amber',
    '#ef4444': 'Red',
    '#8b5cf6': 'Purple',
    '#ec4899': 'Pink',
    '#06b6d4': 'Cyan',
    '#6b7280': 'Gray',
  };
  
  return colorMap[color] || 'Blue';
};
