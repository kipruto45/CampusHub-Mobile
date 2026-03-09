// Personal Library Screen
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ViewStyle,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Icon from '../../components/ui/Icon';
import { colors } from '../../theme/colors';
import { useLibrary, useFolders, useFiles, useStorage } from '../../hooks/useLibrary';
import { FolderCard } from '../../components/library/FolderCard';
import { FileCard } from '../../components/library/FileCard';
import { StorageSummaryCard } from '../../components/library/StorageSummaryCard';
import { QuickActionsSheet } from '../../components/library/QuickActionsSheet';
import { CreateFolderModal } from '../../components/modals/CreateFolderModal';
import { libraryService } from '../../services/library.service';
import { mobileAutomationService } from '../../services/mobileAutomation.service';

export default function LibraryScreen() {
  const router = useRouter();
  const { overview, loading, refresh } = useLibrary();
  const { folders, createFolder, refresh: refreshFolders } = useFolders();
  const { files, uploadFile, refresh: refreshFiles } = useFiles();
  const { storage, refresh: refreshStorage } = useStorage();
  
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refresh(),
      refreshFolders(),
      refreshFiles(),
      refreshStorage(),
    ]);
  }, [refresh, refreshFolders, refreshFiles, refreshStorage]);

  const handleCreateFolder = async (name: string, color: string) => {
    setIsCreatingFolder(true);
    try {
      const safeName = await mobileAutomationService.generateSafeFolderName(
        name,
        folders.map((folder) => folder.name)
      );
      await createFolder(safeName, undefined, color);
      setShowCreateFolder(false);
      Alert.alert('Success', 'Folder created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/zip',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        } as any);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

        await uploadFile({ file: formData });
        Alert.alert('Success', 'File uploaded successfully');
        refreshStorage();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload file');
    }
  };

  const handleFolderPress = (folderId: string) => {
    router.push(`/(student)/folder/${folderId}` as any);
  };

  const handleFilePress = (fileId: string) => {
    router.push(`/(student)/file/${fileId}` as any);
  };

  const handleStoragePress = () => {
    router.push('/storage' as any);
  };

  return (
    <View style={styles.container as ViewStyle}>
      {/* Header */}
      <View style={styles.header as ViewStyle}>
        <View style={styles.headerTop as ViewStyle}>
          <Text style={styles.title}>My Library</Text>
          <TouchableOpacity
            style={styles.addButton as ViewStyle}
            onPress={() => setShowQuickActions(true)}
          >
            <Icon name="add" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer as ViewStyle}>
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
              <Icon name="close-circle" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Storage Summary */}
        {storage && (
          <StorageSummaryCard 
            storage={storage} 
            onPress={handleStoragePress} 
          />
        )}

        {/* Folders Section */}
        <View style={styles.section as ViewStyle}>
          <View style={styles.sectionHeader as ViewStyle}>
            <Text style={styles.sectionTitle}>Folders</Text>
            <Text style={styles.sectionCount}>
              {overview?.root_folders?.length || 0}
            </Text>
          </View>
          
          {folders.length > 0 ? (
            folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onPress={() => handleFolderPress(folder.id)}
              />
            ))
          ) : (
            <View style={styles.emptyState as ViewStyle}>
              <Icon name="folder-outline" size={40} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No folders yet</Text>
              <Text style={styles.emptySubtext}>
                Create a folder to organize your files
              </Text>
            </View>
          )}
        </View>

        {/* Recent Files Section */}
        <View style={styles.section as ViewStyle}>
          <View style={styles.sectionHeader as ViewStyle}>
            <Text style={styles.sectionTitle}>Recent Files</Text>
          </View>
          
          {files.length > 0 ? (
            files.slice(0, 5).map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onPress={() => handleFilePress(file.id)}
              />
            ))
          ) : (
            <View style={styles.emptyState as ViewStyle}>
              <Icon name="document-text" size={40} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No files yet</Text>
              <Text style={styles.emptySubtext}>
                Upload files to get started
              </Text>
            </View>
          )}
        </View>

        {/* Favorites Preview */}
        {overview?.favorite_folders && overview.favorite_folders.length > 0 && (
          <View style={styles.section as ViewStyle}>
            <View style={styles.sectionHeader as ViewStyle}>
              <Text style={styles.sectionTitle}>Favorites</Text>
            </View>
            
            {overview.favorite_folders.slice(0, 3).map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onPress={() => handleFolderPress(folder.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Quick Actions Sheet */}
      <QuickActionsSheet
        visible={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onUploadFile={handleUploadFile}
        onCreateFolder={() => {
          setShowQuickActions(false);
          setTimeout(() => setShowCreateFolder(true), 300);
        }}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        visible={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onSubmit={handleCreateFolder}
        isLoading={isCreatingFolder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    backgroundColor: colors.background.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.card.light,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 4,
  },
});
