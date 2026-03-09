// Library Screen for CampusHub
// Personal library for private files - Backend-driven

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'folders'>('folders');
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [summary, setSummary] = useState<LibrarySummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchLibraryData = useCallback(async () => {
    try {
      setError(null);

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
      setError(err.response?.data?.message || 'Failed to load library');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLibraryData();
  }, [fetchLibraryData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLibraryData();
  }, [fetchLibraryData]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchLibraryData();
  }, [fetchLibraryData]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
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
      Alert.alert('Success', 'Folder created successfully!');
      fetchLibraryData();
    } catch (err: any) {
      console.error('Failed to create folder:', err);
      Alert.alert('Error', 'Failed to create folder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    Alert.alert('Delete Folder', `Are you sure you want to delete "${name}" and all its contents?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
          onPress: async () => {
            try {
              await libraryService.deleteFolder(id);
              setFolders(prev => prev.filter(f => f.id !== id));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete folder');
          }
        }
      },
    ]);
  };

  const handleDeleteFile = async (id: string, name: string) => {
    Alert.alert('Delete File', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
          onPress: async () => {
            try {
              await libraryService.deleteFile(id);
              setFiles(prev => prev.filter(f => f.id !== id));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete file');
          }
        }
      },
    ]);
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

    try {
      await favoritesService.toggleFolderFavorite(folderId);
    } catch {
      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === folderId ? { ...folder, is_favorite: Boolean(current.is_favorite) } : folder
        )
      );
      Alert.alert('Error', 'Failed to update folder favorite');
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

    try {
      await favoritesService.toggleFileFavorite(fileId);
    } catch {
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId ? { ...file, is_favorite: Boolean(current.is_favorite) } : file
        )
      );
      Alert.alert('Error', 'Failed to update file favorite');
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

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const storageUsed = summary?.used_storage ? summary.used_storage / (1024 * 1024 * 1024) : 0; // Convert to GB
  const storageTotal = summary?.storage_limit ? summary.storage_limit / (1024 * 1024 * 1024) : 10; // Default 10GB
  const storagePercent = (storageUsed / storageTotal) * 100;

  const renderFolderItem = ({ item }: { item: Folder }) => (
    <TouchableOpacity 
      style={styles.folderCard}
      onPress={() => router.push(`/(student)/folder/${item.id}`)}
      onLongPress={() => {
        Alert.alert(item.name, 'Choose an action', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Rename', onPress: () => Alert.alert('Coming Soon', 'Rename feature coming soon!') },
          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteFolder(item.id, item.name) },
        ]);
      }}
    >
      <View style={styles.folderLeft}>
        <View style={styles.folderIconBox}>
          <Icon name="folder" size={28} color={colors.warning} />
        </View>
        <View style={styles.folderInfo}>
          <Text style={styles.folderName}>{item.name}</Text>
          <Text style={styles.folderMeta}>{item.file_count || 0} files</Text>
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
      onPress={() => router.push(`/(student)/file/${item.id}` as any)}
      onLongPress={() => {
        Alert.alert(item.name, 'Choose an action', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Details', onPress: () => router.push(`/(student)/file/${item.id}` as any) },
          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteFile(item.id, item.name) },
        ]);
      }}
    >
      <View style={styles.fileLeft}>
        <View style={styles.fileIconBox}>
          <Icon name={getFileIcon(item.file_type) as any} size={22} color={colors.primary[500]} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileMeta}>{formatFileSize(item.file_size)} • {formatDate(item.created_at)}</Text>
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
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
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

      {/* Search Bar */}
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
