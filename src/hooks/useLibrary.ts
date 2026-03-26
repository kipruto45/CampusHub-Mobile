// React Hooks for Library
import { useCallback,useEffect,useState } from 'react';
import { folderAlgorithms } from '../services/algorithms.service';
import { LibraryFile,LibraryFolder,LibraryOverview,libraryService,StorageSummary,TrashItem } from '../services/library.service';
import { networkService,syncQueueService } from '../services/offline';

interface UseLibraryResult {
  overview: LibraryOverview | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseFoldersResult {
  folders: LibraryFolder[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createFolder: (name: string, parent?: string, color?: string) => Promise<LibraryFolder>;
  renameFolder: (folderId: string, name: string) => Promise<LibraryFolder>;
  moveFolder: (folderId: string, targetParentId: string | null) => Promise<LibraryFolder>;
  favoriteFolder: (folderId: string) => Promise<LibraryFolder>;
  deleteFolder: (folderId: string) => Promise<void>;
}

interface UseFilesResult {
  files: LibraryFile[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  uploadFile: (data: { file: FormData; title?: string; folder?: string; description?: string }) => Promise<LibraryFile>;
  renameFile: (fileId: string, title: string) => Promise<LibraryFile>;
  moveFile: (fileId: string, folderId: string | null) => Promise<LibraryFile>;
  duplicateFile: (fileId: string) => Promise<LibraryFile>;
  favoriteFile: (fileId: string) => Promise<LibraryFile>;
  deleteFile: (fileId: string) => Promise<void>;
}

interface UseStorageResult {
  storage: StorageSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseTrashResult {
  trashItems: TrashItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  restoreFile: (fileId: string) => Promise<void>;
  permanentlyDeleteFile: (fileId: string) => Promise<void>;
}

interface UseFavoritesResult {
  favoriteFiles: LibraryFile[];
  favoriteFolders: LibraryFolder[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseRecentResult {
  recentFiles: LibraryFile[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Main library overview hook
export const useLibrary = (): UseLibraryResult => {
  const [overview, setOverview] = useState<LibraryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await libraryService.getLibraryOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { overview, loading, error, refresh };
};

// Folders hook
export const useFolders = (parentId?: string): UseFoldersResult => {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await libraryService.getFolders(parentId);
      setFolders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createFolder = async (name: string, parent?: string, color?: string) => {
    const optimisticFolder: LibraryFolder = {
      id: `local-folder-${Date.now()}`,
      name,
      color: color || '#3b82f6',
      parent: parent || null,
      is_favorite: false,
      file_count: 0,
      total_size: 0,
      subfolders_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setFolders((prev) => folderAlgorithms.sortFolders([optimisticFolder, ...prev]));
    try {
      const folder = await libraryService.createFolder({ name, parent, color });
      await refresh();
      return folder;
    } catch (err: any) {
      const isOffline = !(await networkService.isConnected()) || !err?.response;
      if (isOffline) {
        await syncQueueService.addAction('folder_create', { name, parent, color });
        return optimisticFolder;
      }
      setFolders((prev) => prev.filter((folder) => folder.id !== optimisticFolder.id));
      throw err;
    }
  };

  const renameFolder = async (folderId: string, name: string) => {
    const previous = folders;
    const optimisticFolder =
      previous.find((folder) => folder.id === folderId)
        ? { ...(previous.find((folder) => folder.id === folderId) as LibraryFolder), name }
        : ({ id: folderId, name } as LibraryFolder);
    setFolders((prev) =>
      folderAlgorithms.sortFolders(
        prev.map((folder) => (folder.id === folderId ? { ...folder, name } : folder))
      )
    );
    try {
      const folder = await libraryService.renameFolder(folderId, name);
      await refresh();
      return folder;
    } catch (err: any) {
      const isOffline = !(await networkService.isConnected()) || !err?.response;
      if (isOffline) {
        await syncQueueService.addAction('folder_rename', { folderId, name });
        return optimisticFolder;
      }
      setFolders(previous);
      throw err;
    }
  };

  const moveFolder = async (folderId: string, targetParentId: string | null) => {
    const folder = await libraryService.moveFolder(folderId, targetParentId);
    await refresh();
    return folder;
  };

  const favoriteFolderAction = async (folderId: string) => {
    const folder = await libraryService.favoriteFolder(folderId);
    await refresh();
    return folder;
  };

  const deleteFolderAction = async (folderId: string) => {
    await libraryService.deleteFolder(folderId);
    await refresh();
  };

  return {
    folders,
    loading,
    error,
    refresh,
    createFolder,
    renameFolder,
    moveFolder,
    favoriteFolder: favoriteFolderAction,
    deleteFolder: deleteFolderAction,
  };
};

// All folders hook (for move operations)
export const useAllFolders = () => {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await libraryService.getAllFolders();
      setFolders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { folders, loading, error, refresh };
};

// Files hook
export const useFiles = (folderId?: string): UseFilesResult => {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await libraryService.getFiles(folderId);
      setFiles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadFileAction = async (data: { file: FormData; title?: string; folder?: string; description?: string }) => {
    const file = await libraryService.uploadFile(data);
    await refresh();
    return file;
  };

  const renameFileAction = async (fileId: string, title: string) => {
    const previous = files;
    const optimisticFile =
      previous.find((file) => file.id === fileId)
        ? { ...(previous.find((file) => file.id === fileId) as LibraryFile), title }
        : ({ id: fileId, title } as LibraryFile);
    setFiles((prev) =>
      folderAlgorithms.sortFiles(
        prev.map((file) => (file.id === fileId ? { ...file, title } : file))
      )
    );
    try {
      const file = await libraryService.renameFile(fileId, title);
      await refresh();
      return file;
    } catch (err: any) {
      const isOffline = !(await networkService.isConnected()) || !err?.response;
      if (isOffline) {
        await syncQueueService.addAction('file_rename', { fileId, title });
        return optimisticFile;
      }
      setFiles(previous);
      throw err;
    }
  };

  const moveFileAction = async (fileId: string, folderId: string | null) => {
    const file = await libraryService.moveFile(fileId, folderId);
    await refresh();
    return file;
  };

  const duplicateFileAction = async (fileId: string) => {
    const file = await libraryService.duplicateFile(fileId);
    await refresh();
    return file;
  };

  const favoriteFileAction = async (fileId: string) => {
    const file = await libraryService.favoriteFile(fileId);
    await refresh();
    return file;
  };

  const deleteFileAction = async (fileId: string) => {
    await libraryService.deleteFile(fileId);
    await refresh();
  };

  return {
    files,
    loading,
    error,
    refresh,
    uploadFile: uploadFileAction,
    renameFile: renameFileAction,
    moveFile: moveFileAction,
    duplicateFile: duplicateFileAction,
    favoriteFile: favoriteFileAction,
    deleteFile: deleteFileAction,
  };
};

// Storage hook
export const useStorage = (): UseStorageResult => {
  const [storage, setStorage] = useState<StorageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await libraryService.getStorageSummary();
      setStorage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load storage');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { storage, loading, error, refresh };
};

// Trash hook
export const useTrash = (): UseTrashResult => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await libraryService.getTrashItems();
      setTrashItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trash');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const restoreFileAction = async (fileId: string) => {
    await libraryService.restoreFile(fileId);
    await refresh();
  };

  const permanentlyDeleteFileAction = async (fileId: string) => {
    await libraryService.permanentlyDeleteFile(fileId);
    await refresh();
  };

  return {
    trashItems,
    loading,
    error,
    refresh,
    restoreFile: restoreFileAction,
    permanentlyDeleteFile: permanentlyDeleteFileAction,
  };
};

// Favorites hook
export const useFavorites = (): UseFavoritesResult => {
  const [favoriteFiles, setFavoriteFiles] = useState<LibraryFile[]>([]);
  const [favoriteFolders, setFavoriteFolders] = useState<LibraryFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [files, folders] = await Promise.all([
        libraryService.getFavoriteFiles(),
        libraryService.getFavoriteFolders(),
      ]);
      setFavoriteFiles(files);
      setFavoriteFolders(folders);
    } catch (err: any) {
      setError(err.message || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { favoriteFiles, favoriteFolders, loading, error, refresh };
};

// Recent files hook
export const useRecent = (limit: number = 10): UseRecentResult => {
  const [recentFiles, setRecentFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await libraryService.getRecentFiles(limit);
      setRecentFiles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load recent files');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { recentFiles, loading, error, refresh };
};
