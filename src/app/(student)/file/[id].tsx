import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import LibraryShareSheet from '../../../components/library/LibraryShareSheet';
import Icon from '../../../components/ui/Icon';
import {
  formatFileSize,
  formatRelativeTime,
  libraryService,
  LibraryFile,
} from '../../../services/library.service';
import { colors } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';

type PreviewInfo = {
  is_previewable: boolean;
  is_image: boolean;
  is_pdf: boolean;
  preview_type: string;
  file_type: string;
  file_url: string;
  thumbnail_url: string;
};

const getFileIconName = (fileType?: string) => {
  const normalized = String(fileType || '').toLowerCase();
  if (normalized.includes('pdf')) return 'document-text';
  if (normalized.includes('doc')) return 'document';
  if (normalized.includes('sheet') || normalized.includes('xls') || normalized.includes('csv')) return 'grid';
  if (normalized.includes('ppt') || normalized.includes('presentation')) return 'presentation';
  if (normalized.includes('image') || normalized.includes('jpg') || normalized.includes('jpeg') || normalized.includes('png') || normalized.includes('gif')) return 'image';
  if (normalized.includes('video') || normalized.includes('mp4') || normalized.includes('mov')) return 'videocam';
  if (normalized.includes('audio') || normalized.includes('mp3') || normalized.includes('wav')) return 'musical-note';
  if (normalized.includes('zip') || normalized.includes('rar') || normalized.includes('archive')) return 'archive';
  return 'document';
};

export default function LibraryFileDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [file, setFile] = useState<LibraryFile | null>(null);
  const [previewInfo, setPreviewInfo] = useState<PreviewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<'preview' | 'download' | null>(null);

  const fileId = String(id || '');

  const fetchFileData = useCallback(async () => {
    if (!fileId) {
      setError('Missing file identifier.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [fileData, previewData] = await Promise.all([
        libraryService.getFileDetails(fileId),
        libraryService.getPreviewInfo(fileId).catch(() => null),
      ]);
      setFile(fileData);
      setPreviewInfo(previewData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load file details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fileId]);

  useEffect(() => {
    fetchFileData();
  }, [fetchFileData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFileData();
  }, [fetchFileData]);

  const handleOpenPreview = useCallback(async () => {
    if (!file) return;

    const previewUrl = previewInfo?.file_url || file.file_url;
    if (!previewUrl) {
      Alert.alert('Preview unavailable', 'This file does not have a preview URL yet.');
      return;
    }

    setActionLoading('preview');
    try {
      await Linking.openURL(previewUrl);
    } catch {
      Alert.alert('Preview failed', 'Unable to open the preview right now.');
    } finally {
      setActionLoading(null);
    }
  }, [file, previewInfo]);

  const handleDownload = useCallback(async () => {
    if (!file) return;

    setActionLoading('download');
    try {
      const downloadData = await libraryService.getDownloadUrl(file.id);
      await Linking.openURL(downloadData.download_url);
    } catch {
      Alert.alert('Download failed', 'Unable to start the download right now.');
    } finally {
      setActionLoading(null);
    }
  }, [file]);

  const handleToggleFavorite = useCallback(async () => {
    if (!file) return;

    setFavoriteLoading(true);
    try {
      const updatedFile = await libraryService.favoriteFile(file.id);
      setFile(updatedFile);
    } catch {
      Alert.alert('Favorite failed', 'Unable to update favorite status right now.');
    } finally {
      setFavoriteLoading(false);
    }
  }, [file]);

  const metadata = file
    ? [
        { label: 'Type', value: file.file_type?.toUpperCase() || 'Unknown' },
        { label: 'Size', value: formatFileSize(file.file_size) },
        { label: 'Folder', value: file.folder_name || 'Root Library' },
        {
          label: 'Updated',
          value: formatRelativeTime(file.updated_at || file.created_at),
        },
      ]
    : [];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: file?.title || 'File',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Icon name="chevron-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => setShareVisible(true)} style={styles.headerButton}>
              <Icon name="share-social" size={20} color={colors.primary[500]} />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.stateText}>Loading file details...</Text>
        </View>
      ) : error || !file ? (
        <View style={styles.centerState}>
          <Icon name="alert-circle" size={44} color={colors.error} />
          <Text style={styles.errorText}>{error || 'File not found.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFileData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary[500]]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.fileIconWrap}>
              <Icon name={getFileIconName(file.file_type) as any} size={34} color={colors.primary[500]} />
            </View>
            <Text style={styles.fileTitle}>{file.title}</Text>
            <Text style={styles.fileSubtitle}>
              {previewInfo?.is_previewable ? 'Preview ready' : 'Preview may require external app'}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
              onPress={handleOpenPreview}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'preview' ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <>
                  <Icon name="eye" size={18} color={colors.text.inverse} />
                  <Text style={styles.primaryActionText}>Open</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownload}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'download' ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <>
                  <Icon name="download" size={18} color={colors.primary[500]} />
                  <Text style={styles.secondaryActionText}>Download</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleToggleFavorite}
              disabled={favoriteLoading}
            >
              {favoriteLoading ? (
                <ActivityIndicator size="small" color={colors.warning} />
              ) : (
                <>
                  <Icon
                    name={file.is_favorite ? 'star' : 'star-outline'}
                    size={18}
                    color={colors.warning}
                  />
                  <Text style={styles.secondaryActionText}>
                    {file.is_favorite ? 'Favorited' : 'Favorite'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Details</Text>
            {metadata.map((item) => (
              <View key={item.label} style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{item.label}</Text>
                <Text style={styles.metadataValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {file.description?.trim() || 'No description provided for this file yet.'}
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Preview Status</Text>
            <Text style={styles.descriptionText}>
              {previewInfo?.is_previewable
                ? `Preview type: ${previewInfo.preview_type || 'file'}`
                : 'This file type is not previewable in-app yet. Use Open or Download.'}
            </Text>
          </View>
        </ScrollView>
      )}

      <LibraryShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        file={file}
        onShareComplete={fetchFileData}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  stateText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[500],
  },
  retryButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
  },
  heroCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    alignItems: 'center',
    gap: spacing[3],
    ...shadows.soft,
  },
  fileIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  fileSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    ...shadows.sm,
  },
  primaryAction: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  primaryActionText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  metadataLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.secondary,
  },
});
