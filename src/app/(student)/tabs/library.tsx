// Library Screen for CampusHub
// Personal library for private files - Backend-driven

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import ErrorState from '../../../components/ui/ErrorState';
import FavoriteFileButton from '../../../components/library/FavoriteFileButton';
import FavoriteFolderButton from '../../../components/library/FavoriteFolderButton';
import { favoritesService } from '../../../services/favorites.service';
import { libraryService } from '../../../services/library.service';
import { mobileAutomationService } from '../../../services/mobileAutomation.service';
import { useToast } from '../../../components/ui/Toast';

const formatNumber = (value: number) => {
  try {
    return new Intl.NumberFormat().format(value);
  } catch {
    return String(value);
  }
};

const formatDateLocale = (iso: string) => {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
};

// Types matching backend response
interface Folder {
  id: string;
  name: string;
  parent?: string;
  created_at: string;
  file_count?: number;
  is_favorite?: boolean;
}

interface LibraryFile {
  id: string;
  name: string;
  file_size: number;
  file_type: string;
  created_at: string;
  updated_at: string;
  folder?: string;
  is_favorite?: boolean;
}

interface LibrarySummary {
  total_files: number;
  total_folders: number;
  used_storage: number;
  storage_limit: number;
}

const LibraryScreen: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showRenameFolder, setShowRenameFolder] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'folders'>('folders');
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [summary, setSummary] = useState<LibrarySummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingActions, setPendingActions] = useState<{ id: string; exec: () => Promise<unknown> }[]>([]);
  const [lastOpenedMap, setLastOpenedMap] = useState<Record<string, string>>({});

  const fetchLibraryData = useCallback(async () => {
    try {
      setError(null);
      setIsOffline(false);

      const [storageSummary, foldersData, filesData] = await Promise.all([
        libraryService.getStorageSummary(),
        libraryService.getFolders(),
        libraryService.getFiles(),
      ]);

      setSummary({
        total_files: storageSummary.total_files,
        total_folders: foldersData.length,
        used_storage: storageSummary.storage_used_bytes,
        storage_limit: storageSummary.storage_limit_bytes,
      });
      setFolders(
        foldersData.map((folder) => ({
          id: folder.id,
          name: folder.name,
          parent: folder.parent || undefined,
          created_at: folder.created_at,
          file_count: folder.file_count,
          is_favorite: folder.is_favorite,
        }))
      );
      setFiles(
        filesData.map((file) => ({
          id: file.id,
          name: file.title,
          file_size: file.file_size,
          file_type: file.file_type,
          created_at: file.created_at,
          updated_at: file.updated_at,
          folder: file.folder || undefined,
          is_favorite: file.is_favorite,
        }))
      );
    } catch (err: any) {
      console.error('Failed to fetch library:', err);
      const message = err.response?.data?.message || 'Failed to load library';
      setError(message);
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('offline')) {
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLibraryData();
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    // load last opened map
    AsyncStorage.getItem('library_last_opened_v1')
      .then((val) => {
        if (val) {
          setLastOpenedMap(JSON.parse(val));
        }
      })
      .catch(() => {});
    return () => unsub();
  }, [fetchLibraryData]);

  useEffect(() => {
    const flush = async () => {
      if (isOffline || pendingActions.length === 0) return;
      const queue = [...pendingActions];
      setPendingActions([]);
      for (const action of queue) {
        try {
          await action.exec();
        } catch (err) {
          console.error('Queued action failed', err);
          showToast('error', 'Some offline actions failed to sync');
        }
      }
    };
    void flush();
  }, [isOffline, pendingActions, showToast]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLibraryData();
  }, [fetchLibraryData]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders;
    const term = searchQuery.trim().toLowerCase();
    return folders.filter((f) => f.name.toLowerCase().includes(term));
  }, [folders, searchQuery]);

  const filteredFiles = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const pool = term ? files.filter((f) => f.name.toLowerCase().includes(term)) : files;
    return [...pool].sort((a, b) => {
      const aTime = new Date(lastOpenedMap[a.id] || a.updated_at || a.created_at).getTime();
      const bTime = new Date(lastOpenedMap[b.id] || b.updated_at || b.created_at).getTime();
      return bTime - aTime;
    });
  }, [files, searchQuery, lastOpenedMap]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchLibraryData();
  }, [fetchLibraryData]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showToast('error', 'Please enter a folder name');
      return;
    }
    
    try {
      setSubmitting(true);
      const safeName = await mobileAutomationService.generateSafeFolderName(
        newFolderName,
        folders.map((folder) => folder.name)
      );
      await libraryService.createFolder({ name: safeName });
      setNewFolderName('');
      setShowCreateFolder(false);
      showToast('success', 'Folder created successfully!');
      fetchLibraryData();
    } catch (err: any) {
      console.error('Failed to create folder:', err);
      showToast('error', 'Failed to create folder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    const exec = async () => libraryService.deleteFolder(id);
    const optimistic = () => setFolders((prev) => prev.filter((f) => f.id !== id));
    optimistic();
    if (isOffline) {
      setPendingActions((q) => [...q, { id: `delete-folder-${id}`, exec }]);
      showToast('info', 'Folder deletion queued offline');
      return;
    }
    try {
      await exec();
      showToast('success', 'Folder deleted.');
    } catch (err) {
      showToast('error', 'Failed to delete folder');
      fetchLibraryData();
    }
  };

  const handleRenameFolder = async () => {
    if (!renameFolderId || !renameFolderName.trim()) {
      showToast('error', 'Folder name required');
      return;
    }
    const exec = async () => libraryService.renameFolder(renameFolderId, renameFolderName.trim());
    const optimistic = () =>
      setFolders((prev) =>
        prev.map((f) => (f.id === renameFolderId ? { ...f, name: renameFolderName.trim() } : f))
      );
    optimistic();
    setShowRenameFolder(false);
    setRenameFolderId(null);
    setRenameFolderName('');

    if (isOffline) {
      setPendingActions((q) => [...q, { id: `rename-folder-${renameFolderId}`, exec }]);
      showToast('info', 'Rename queued offline');
      return;
    }
    try {
      setSubmitting(true);
      await exec();
      showToast('success', 'Folder renamed');
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to rename folder');
      fetchLibraryData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFile = async (id: string, name: string) => {
    const exec = async () => libraryService.deleteFile(id);
    const optimistic = () => setFiles((prev) => prev.filter((f) => f.id !== id));
    optimistic();
    if (isOffline) {
      setPendingActions((q) => [...q, { id: `delete-file-${id}`, exec }]);
      showToast('info', 'File deletion queued offline');
      return;
    }
    try {
      await exec();
      showToast('success', 'File deleted.');
    } catch (err) {
      showToast('error', 'Failed to delete file');
      fetchLibraryData();
    }
  };

  const handleToggleFolderFavorite = async (folderId: string) => {
    const current = folders.find((folder) => folder.id === folderId);
    if (!current) return;

    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === folderId
          ? { ...folder, is_favorite: !Boolean(folder.is_favorite) }
          : folder
      )
    );

    const exec = async () => favoritesService.toggleFolderFavorite(folderId);
    if (isOffline) {
      setPendingActions((q) => [...q, { id: `favorite-folder-${folderId}-${Date.now()}`, exec }]);
      showToast('info', 'Favorite update queued offline');
      return;
    }
    try {
      await exec();
    } catch {
      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === folderId ? { ...folder, is_favorite: Boolean(current.is_favorite) } : folder
        )
      );
      showToast('error', 'Failed to update folder favorite');
    }
  };

  const handleToggleFileFavorite = async (fileId: string) => {
    const current = files.find((file) => file.id === fileId);
    if (!current) return;

    setFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, is_favorite: !Boolean(file.is_favorite) } : file
      )
    );

    const exec = async () => favoritesService.toggleFileFavorite(fileId);
    if (isOffline) {
      setPendingActions((q) => [...q, { id: `favorite-file-${fileId}-${Date.now()}`, exec }]);
      showToast('info', 'Favorite update queued offline');
      return;
    }
    try {
      await exec();
    } catch {
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId ? { ...file, is_favorite: Boolean(current.is_favorite) } : file
        )
      );
      showToast('error', 'Failed to update file favorite');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return 'document';
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return 'document-text';
    if (type.includes('word') || type.includes('doc')) return 'document-text';
    if (type.includes('excel') || type.includes('sheet') || type.includes('csv')) return 'grid';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'presentation';
    if (type.includes('image') || type.includes('jpg') || type.includes('png') || type.includes('jpeg')) return 'image';
    if (type.includes('video')) return 'videocam';
    if (type.includes('audio')) return 'musical-note';
    if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return 'archive';
    return 'document';
  };

  const storageUsed = summary?.used_storage ? summary.used_storage / (1024 * 1024 * 1024) : 0; // Convert to GB
  const storageTotal = summary?.storage_limit ? summary.storage_limit / (1024 * 1024 * 1024) : 10; // Default 10GB
  const storagePercent = (storageUsed / storageTotal) * 100;

  const renderFolderItem = ({ item }: { item: Folder }) => (
    <TouchableOpacity 
      style={styles.folderCard}
      onPress={() => router.push(`/(student)/folder/${item.id}`)}
      onLongPress={() => {
        setRenameFolderId(item.id);
        setRenameFolderName(item.name);
        setShowRenameFolder(true);
      }}
    >
      <View style={styles.folderLeft}>
        <View style={styles.folderIconBox}>
          <Icon name="folder" size={28} color={colors.warning} />
        </View>
        <View style={styles.folderInfo}>
          <Text style={styles.folderName}>{item.name}</Text>
          <Text style={styles.folderMeta}>{formatNumber(item.file_count || 0)} files</Text>
        </View>
      </View>
      <View style={styles.itemActions}>
        <FavoriteFolderButton
          isFavorited={Boolean(item.is_favorite)}
          onPress={() => handleToggleFolderFavorite(item.id)}
        />
        <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );

  const renderFileItem = ({ item }: { item: LibraryFile }) => (
    <TouchableOpacity 
      style={styles.fileCard}
      onPress={async () => {
        const now = new Date().toISOString();
        setLastOpenedMap((prev) => ({ ...prev, [item.id]: now }));
        await AsyncStorage.setItem(
          'library_last_opened_v1',
          JSON.stringify({ ...lastOpenedMap, [item.id]: now })
        );
        router.push(`/(student)/file/${item.id}` as any);
      }}
      onLongPress={() => handleDeleteFile(item.id, item.name)}
    >
      <View style={styles.fileLeft}>
        <View style={styles.fileIconBox}>
          <Icon name={getFileIcon(item.file_type) as any} size={22} color={colors.primary[500]} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileMeta}>{formatFileSize(item.file_size)} • {formatDateLocale(item.created_at)}</Text>
        </View>
      </View>
      <FavoriteFileButton
        isFavorited={Boolean(item.is_favorite)}
        onPress={() => handleToggleFileFavorite(item.id)}
      />
    </TouchableOpacity>
  );

  const renderEmptyFolders = () => (
    <View style={styles.emptyState}>
      <Icon name="folder" size={48} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Folders</Text>
      <Text style={styles.emptyText}>Create a folder to organize your files</Text>
    </View>
  );

  const renderEmptyFiles = () => (
    <View style={styles.emptyState}>
      <Icon name="document" size={48} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Files</Text>
      <Text style={styles.emptyText}>Upload files to your library</Text>
    </View>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { paddingTop: spacing[6] }]}>
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={[styles.folderCard, { opacity: 0.35 }]}>
              <View style={styles.folderLeft}>
                <View style={[styles.folderIconBox, { backgroundColor: colors.gray[200] }]} />
                <View style={{ gap: 6 }}>
                  <View style={{ width: 160, height: 12, backgroundColor: colors.gray[200], borderRadius: 6 }} />
                  <View style={{ width: 90, height: 10, backgroundColor: colors.gray[100], borderRadius: 6 }} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Error state
  if (error && folders.length === 0 && files.length === 0) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Library</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateFolder(true)}
        >
          <Icon name="add" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      {/* Search & offline */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={colors.text.tertiary} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search files and folders..."
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
        {isOffline && (
          <View style={styles.offlinePill}>
            <Icon name="cloud-offline" size={16} color={colors.warning} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'folders' && styles.activeTab]}
          onPress={() => setActiveTab('folders')}
        >
          <Text style={[styles.tabText, activeTab === 'folders' && styles.activeTabText]}>
            Folders ({folders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'files' && styles.activeTab]}
          onPress={() => setActiveTab('files')}
        >
          <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>
            Files ({files.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Storage Summary - From Backend */}
      <View style={styles.storageCard}>
        <View style={styles.storageHeader}>
          <View style={styles.storageTitleRow}>
            <Icon name="cloud" size={18} color={colors.primary[500]} />
            <Text style={styles.storageTitle}>Storage</Text>
          </View>
          <Text style={styles.storageLimit}>{storageUsed.toFixed(1)} GB / {storageTotal.toFixed(0)} GB</Text>
        </View>
        <View style={styles.storageBar}>
          <View style={[styles.storageProgress, { width: `${Math.min(storagePercent, 100)}%` }]} />
        </View>
        <Text style={styles.storageNote}>
          {summary?.total_files || 0} files • {summary?.total_folders || 0} folders • {(storageTotal - storageUsed).toFixed(1)} GB available
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => setShowUploadModal(true)}
        >
          <Icon name="cloud-upload" size={22} color={colors.primary[500]} />
          <Text style={styles.actionLabel}>Upload</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => setShowCreateFolder(true)}
        >
          <Icon name="folder" size={22} color={colors.warning} />
          <Text style={styles.actionLabel}>New Folder</Text>
        </TouchableOpacity>
      </View>

      {/* Content - Folders */}
      {activeTab === 'folders' && (
        <FlatList
          data={filteredFolders}
          keyExtractor={(item) => item.id}
          renderItem={renderFolderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={8}
          removeClippedSubviews
          ListEmptyComponent={renderEmptyFolders}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
              colors={[colors.primary[500]]}
            />
          }
        />
      )}

      {/* Content - Files */}
      {activeTab === 'files' && (
        <FlatList
          data={filteredFiles}
          keyExtractor={(item) => item.id}
          renderItem={renderFileItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={8}
          removeClippedSubviews
          ListEmptyComponent={renderEmptyFiles}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
              colors={[colors.primary[500]]}
            />
          }
        />
      )}

      {isOffline && (
        <Text style={styles.offlineMessage}>
          You’re offline. Showing last loaded data. Pull to retry.
        </Text>
      )}

      {/* Create Folder Modal */}
      <Modal visible={showCreateFolder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Folder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Folder name"
              placeholderTextColor={colors.text.tertiary}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setNewFolderName('');
                  setShowCreateFolder(false);
                }}
                disabled={submitting}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCreate, submitting && styles.modalBtnDisabled]}
                onPress={handleCreateFolder}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalBtnCreateText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal visible={showRenameFolder} animationType="slide" transparent onRequestClose={() => setShowRenameFolder(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Folder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Folder name"
              placeholderTextColor={colors.text.tertiary}
              value={renameFolderName}
              onChangeText={setRenameFolderName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setShowRenameFolder(false);
                  setRenameFolderId(null);
                  setRenameFolderName('');
                }}
                disabled={submitting}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCreate, submitting && styles.modalBtnDisabled]}
                onPress={handleRenameFolder}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalBtnCreateText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Modal */}
      <Modal visible={showUploadModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload File</Text>
            <Text style={styles.modalSubtitle}>Select a file to upload to your library</Text>
            
            <TouchableOpacity style={styles.uploadOption}>
              <Icon name="document-text" size={24} color={colors.primary[500]} />
              <Text style={styles.uploadOptionText}>Document (PDF, DOCX, etc.)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.uploadOption}>
              <Icon name="grid" size={24} color={colors.success} />
              <Text style={styles.uploadOptionText}>Spreadsheet (XLSX, CSV)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.uploadOption}>
              <Icon name="videocam" size={24} color={colors.warning} />
              <Text style={styles.uploadOptionText}>Presentation (PPTX)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.uploadOption}>
              <Icon name="image" size={24} color={colors.accent[500]} />
              <Text style={styles.uploadOptionText}>Image (JPG, PNG)</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background.secondary 
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: spacing[6], 
    paddingTop: spacing[12], 
    paddingBottom: spacing[3], 
    backgroundColor: colors.card.light 
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.primary },
  addButton: { 
    width: 40, 
    height: 40, 
    borderRadius: borderRadius.full, 
    backgroundColor: colors.primary[500], 
    justifyContent: 'center', 
    alignItems: 'center', 
    ...shadows.md 
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.card.light, 
    marginHorizontal: spacing[4], 
    marginTop: spacing[3], 
    paddingHorizontal: spacing[4], 
    borderRadius: 16, 
    ...shadows.sm 
  },
  searchInput: { 
    flex: 1, 
    paddingVertical: spacing[3], 
    fontSize: 15, 
    color: colors.text.primary, 
    marginLeft: spacing[2] 
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning + '15',
    marginLeft: spacing[2],
  },
  offlineText: {
    color: colors.warning,
    fontWeight: '700',
    fontSize: 12,
  },
  tabsContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: spacing[4], 
    paddingVertical: spacing[3], 
    gap: spacing[2] 
  },
  tab: { 
    flex: 1, 
    paddingVertical: spacing[2], 
    alignItems: 'center', 
    backgroundColor: colors.card.light, 
    borderRadius: 12 
  },
  activeTab: { backgroundColor: colors.primary[500] },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.text.secondary },
  activeTabText: { color: colors.text.inverse },
  storageCard: { 
    backgroundColor: colors.card.light, 
    borderRadius: borderRadius.xl, 
    padding: spacing[4], 
    marginHorizontal: spacing[4], 
    marginBottom: spacing[4], 
    ...shadows.sm 
  },
  storageHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: spacing[3] 
  },
  storageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  storageTitle: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  storageLimit: { fontSize: 14, color: colors.text.secondary },
  storageBar: { height: 8, backgroundColor: colors.gray[200], borderRadius: 4, marginBottom: spacing[2] },
  storageProgress: { height: 8, backgroundColor: colors.primary[500], borderRadius: 4 },
  storageNote: { fontSize: 12, color: colors.text.tertiary },
  quickActions: { 
    flexDirection: 'row', 
    paddingHorizontal: spacing[4], 
    gap: spacing[3], 
    marginBottom: spacing[4] 
  },
  actionBtn: { 
    flex: 1, 
    backgroundColor: colors.card.light, 
    borderRadius: borderRadius.lg, 
    paddingVertical: spacing[3], 
    alignItems: 'center', 
    ...shadows.sm 
  },
  actionIcon: { fontSize: 20, marginBottom: spacing[1] },
  actionLabel: { fontSize: 11, fontWeight: '500', color: colors.text.primary },
  listContent: { 
    paddingHorizontal: spacing[4], 
    paddingBottom: spacing[10],
    flexGrow: 1,
  },
  folderCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: colors.card.light, 
    borderRadius: borderRadius.lg, 
    padding: spacing[4], 
    marginBottom: spacing[3], 
    ...shadows.sm 
  },
  folderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  folderIconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  folderInfo: { flex: 1 },
  folderName: { fontSize: 15, fontWeight: '500', color: colors.text.primary },
  folderMeta: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  fileCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: colors.card.light, 
    borderRadius: borderRadius.lg, 
    padding: spacing[3], 
    marginBottom: spacing[2], 
    ...shadows.sm 
  },
  fileLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  fileMeta: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: spacing[16],
    flex: 1,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: spacing[2] },
  emptyText: { fontSize: 14, color: colors.text.secondary, textAlign: 'center' },
  offlineMessage: { textAlign: 'center', color: colors.text.tertiary, paddingVertical: spacing[3] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing[6] },
  modalContent: { backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[6] },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.text.primary, marginBottom: spacing[4], textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: colors.text.secondary, marginBottom: spacing[6], textAlign: 'center' },
  modalInput: { backgroundColor: colors.background.secondary, borderRadius: 12, padding: spacing[4], fontSize: 16, color: colors.text.primary, marginBottom: spacing[4] },
  modalActions: { flexDirection: 'row', gap: spacing[3] },
  modalBtn: { flex: 1, paddingVertical: spacing[3], borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: colors.background.secondary },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
  modalBtnCreate: { backgroundColor: colors.primary[500] },
  modalBtnDisabled: { opacity: 0.6 },
  modalBtnCreateText: { fontSize: 14, fontWeight: '600', color: colors.text.inverse },
  uploadOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing[4], 
    backgroundColor: colors.background.secondary, 
    borderRadius: 12, 
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  uploadOptionText: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
});

export default LibraryScreen;
