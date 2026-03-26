// Library Share Sheet Component
// Modal for sharing personal library files

import React,{ useCallback,useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { LibraryFile,libraryService } from '../../services/library.service';
import { localDownloadsService } from '../../services/local-downloads.service';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';
import { copyToClipboard,openNativeShareSheet } from '../../utils/share';
import BottomSheet from '../ui/BottomSheet';
import Icon from '../ui/Icon';
import { useToast } from '../ui/Toast';

type Props = {
  visible: boolean;
  onClose: () => void;
  file: LibraryFile | null;
  onShareComplete?: () => void;
};

type ActionConfig = {
  id: string;
  label: string;
  icon: string;
  onPress: () => Promise<boolean>;
  requiresUrl?: boolean;
};

const LibraryShareSheet: React.FC<Props> = ({
  visible,
  onClose,
  file,
  onShareComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState<{
    share_url: string;
    file_title: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchShareData = useCallback(async () => {
    if (!file?.id) return null;
    
    try {
      const data = await libraryService.shareFile(file.id);
      setShareData({
        share_url: data.share_url,
        file_title: data.file_title,
      });
      return data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to generate share link';
      setError(message);
      return null;
    }
  }, [file]);

  const handleCopyLink = useCallback(async (): Promise<boolean> => {
    if (!shareData?.share_url) {
      const data = await fetchShareData();
      if (!data) return false;
    }
    
    try {
      await copyToClipboard(shareData?.share_url || '');
      await libraryService.recordShare(file?.id || '', 'copy_link');
      showToast('success', 'Link copied to clipboard');
      onShareComplete?.();
      return true;
    } catch (_err) {
      showToast('error', 'Failed to copy link');
      return false;
    }
  }, [shareData, fetchShareData, file, showToast, onShareComplete]);

  const handleNativeShare = useCallback(async (): Promise<boolean> => {
    if (!shareData?.share_url) {
      const data = await fetchShareData();
      if (!data) return false;
    }
    
    try {
      const message = `Check out this file: ${shareData?.file_title || file?.title}`;
      const result = await openNativeShareSheet({
        title: shareData?.file_title || file?.title || 'Share File',
        message,
        url: shareData?.share_url || '',
      });
      
      if (result) {
        await libraryService.recordShare(file?.id || '', 'native_share');
        onShareComplete?.();
      }
      return result;
    } catch (_err) {
      showToast('error', 'Failed to share');
      return false;
    }
  }, [shareData, fetchShareData, file, showToast, onShareComplete]);

  const handleDownload = useCallback(async (): Promise<boolean> => {
    if (!file?.id) return false;
    
    setLoading(true);
    try {
      const downloadData = await libraryService.getDownloadUrl(file.id);
      const downloadKey = `personal-file:${file.id}`;

      await localDownloadsService.ensureLocalFile({
        key: downloadKey,
        remoteUrl: downloadData.download_url,
        fileName: downloadData.file_name,
        title: file.title,
        fileType: downloadData.file_type,
      });

      const copyResult = await localDownloadsService.saveCopyToDevice(downloadKey);
      if (copyResult.status === 'saved') {
        showToast('success', 'File saved and copied to your phone storage.');
      } else if (copyResult.status === 'already_saved') {
        showToast('success', 'File already has a copy in phone storage.');
      } else if (copyResult.status === 'shared') {
        showToast('success', 'Use the share sheet to save a copy to Files.');
      } else if (copyResult.status === 'cancelled') {
        showToast('warning', 'Download kept inside CampusHub. Phone-storage copy was cancelled.');
      }
      await libraryService.recordShare(file.id, 'download');
      onShareComplete?.();
      return true;
    } catch (_err: any) {
      showToast('error', 'Failed to download this file');
      return false;
    } finally {
      setLoading(false);
    }
  }, [file, showToast, onShareComplete]);

  const actions: ActionConfig[] = [
    {
      id: 'copy',
      label: 'Copy Link',
      icon: 'clipboard',
      onPress: handleCopyLink,
    },
    {
      id: 'share',
      label: 'Share File',
      icon: 'share-social',
      onPress: handleNativeShare,
    },
    {
      id: 'download',
      label: 'Download',
      icon: 'download',
      onPress: handleDownload,
    },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={file?.title ? `Share: ${file.title}` : 'Share File'}
      height={360}
      showCloseButton
    >
      <View style={styles.content}>
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.success} />
            <Text style={styles.loadingText}>Preparing share data...</Text>
          </View>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionRow}
            onPress={async () => {
              setLoading(true);
              setError(null);
              await action.onPress();
              setLoading(false);
            }}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <Icon
                name={action.icon as any}
                size={18}
                color={colors.success}
              />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  loadingRow: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    padding: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginBottom: spacing[1],
  },
  actionRow: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.card.light,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '600',
  },
});

export default LibraryShareSheet;
