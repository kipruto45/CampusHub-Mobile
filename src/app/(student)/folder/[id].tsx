// Folder Details Screen
import * as DocumentPicker from 'expo-document-picker';
import { Stack,useLocalSearchParams,useRouter } from 'expo-router';
import React,{ useCallback,useMemo,useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';
import { FileCard } from '../../../components/library/FileCard';
import { FolderCard } from '../../../components/library/FolderCard';
import { CreateFolderModal } from '../../../components/modals/CreateFolderModal';
import Icon from '../../../components/ui/Icon';
import { useAllFolders,useFiles,useFolders,useStorage } from '../../../hooks/useLibrary';
import { folderAlgorithms } from '../../../services/algorithms.service';
import { libraryService } from '../../../services/library.service';
import { mobileAutomationService } from '../../../services/mobileAutomation.service';
import { colors } from '../../../theme/colors';

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const folderId = id || '';
  const {
    folders,
    createFolder,
    renameFolder: _renameFolder,
    deleteFolder: _deleteFolder,
    favoriteFolder: _favoriteFolder,
    refresh: refreshFolders,
  } = useFolders(folderId);
  const {
    files,
    uploadFile,
    renameFile: _renameFile,
    moveFile: _moveFile,
    duplicateFile: _duplicateFile,
    favoriteFile: _favoriteFile,
    deleteFile: _deleteFile,
    refresh: refreshFiles,
  } = useFiles(folderId);
  const { refresh: refreshStorage } = useStorage();
  const { folders: allFolders, refresh: refreshAllFolders } = useAllFolders();
  
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get folder details
  const [folderDetails, setFolderDetails] = useState<any>(null);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const details = await libraryService.getFolderDetails(folderId);
      setFolderDetails(details);
      await Promise.all([
        refreshFolders(),
        refreshFiles(),
        refreshAllFolders(),
        refreshStorage(),
      ]);
    } catch (error) {
      console.error('Error refreshing folder:', error);
    } finally {
      setLoading(false);
    }
  }, [folderId, refreshFolders, refreshFiles, refreshAllFolders, refreshStorage]);

  const handleCreateFolder = async (name: string, color: string) => {
    setIsCreatingFolder(true);
    try {
      const safeName = await mobileAutomationService.generateSafeFolderName(
        name,
        folders.map((folder) => folder.name)
      );
      await createFolder(safeName, folderId, color);
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
        
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        } as any);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
        formData.append('folder', folderId);

        await uploadFile({ file: formData });
        await handleRefresh();
        Alert.alert('Success', 'File added to your library');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload file');
    }
  };

  const handleSubfolderPress = (subfolderId: string) => {
    router.push(`/(student)/folder/${subfolderId}` as any);
  };

  const handleFilePress = (fileId: string) => {
    router.push(`/(student)/file/${fileId}` as any);
  };

  const handleBack = () => {
    router.back();
  };

  // Build breadcrumbs from folder details
  const breadcrumbs = useMemo(() => {
    if (Array.isArray(folderDetails?.breadcrumbs) && folderDetails.breadcrumbs.length > 0) {
      return folderDetails.breadcrumbs;
    }
    return folderAlgorithms.buildBreadcrumbs(folderId, allFolders);
  }, [allFolders, folderDetails?.breadcrumbs, folderId]);

  return (
    <View style={styles.container as ViewStyle}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: folderDetails?.name || 'Folder',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton as ViewStyle}>
              <Icon name="chevron-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions as ViewStyle}>
              <TouchableOpacity 
                onPress={handleUploadFile} 
                style={styles.headerButton as ViewStyle}
              >
                <Icon name="cloud-upload" size={22} color={colors.primary[500]} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowCreateFolder(true)} 
                style={styles.headerButton as ViewStyle}
              >
                <Icon name="folder-outline" size={22} color={colors.primary[500]} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.breadcrumbs as ViewStyle}
          contentContainerStyle={styles.breadcrumbsContent}
        >
          <TouchableOpacity onPress={() => router.push('/(student)/library' as any)}>
            <Text style={styles.breadcrumbText}>Library</Text>
          </TouchableOpacity>
          {breadcrumbs.map((crumb: any, index: number) => (
            <React.Fragment key={crumb.id}>
              <Text style={styles.breadcrumbSeparator}> / </Text>
              <TouchableOpacity 
                onPress={() => index < breadcrumbs.length - 1 
                  ? router.push(`/(student)/folder/${crumb.id}` as any) 
                  : undefined
                }
              >
                <Text style={[
                  styles.breadcrumbText,
                  index === breadcrumbs.length - 1 && styles.breadcrumbActive
                ]}>
                  {crumb.name}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </ScrollView>
      )}

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
        {/* Subfolders Section */}
        <View style={styles.section as ViewStyle}>
          <View style={styles.sectionHeader as ViewStyle}>
            <Text style={styles.sectionTitle}>Folders</Text>
            <Text style={styles.sectionCount}>
              {folders.length}
            </Text>
          </View>
          
          {folders.length > 0 ? (
            folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onPress={() => handleSubfolderPress(folder.id)}
              />
            ))
          ) : (
            <View style={styles.emptyState as ViewStyle}>
              <Icon name="folder-outline" size={36} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No subfolders</Text>
            </View>
          )}
        </View>

        {/* Files Section */}
        <View style={styles.section as ViewStyle}>
          <View style={styles.sectionHeader as ViewStyle}>
            <Text style={styles.sectionTitle}>Files</Text>
            <Text style={styles.sectionCount}>
              {files.length}
            </Text>
          </View>
          
          {files.length > 0 ? (
            files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onPress={() => handleFilePress(file.id)}
              />
            ))
          ) : (
            <View style={styles.emptyState as ViewStyle}>
              <Icon name="document-text" size={36} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No files in this folder</Text>
              <Text style={styles.emptySubtext}>
                Tap the upload button to add files
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Folder Modal */}
      <CreateFolderModal
        visible={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onSubmit={handleCreateFolder}
        isLoading={isCreatingFolder}
        parentFolderId={folderId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  headerButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  breadcrumbs: {
    backgroundColor: colors.background.primary,
    maxHeight: 44,
  },
  breadcrumbsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  breadcrumbActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  breadcrumbSeparator: {
    fontSize: 14,
    color: colors.text.tertiary,
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
