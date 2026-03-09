import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { useToast } from '../components/ui/Toast';
import {
  ResourceSharePayload,
  ShareMethod,
  resourcesService,
} from '../services/resources.service';
import { copyToClipboard, openNativeShareSheet } from '../utils/share';

type ShareableResource = {
  id: string;
  title?: string;
  can_share?: boolean;
};

const resolveErrorMessage = (error: any): string => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail && typeof detail === 'object') {
    const first = Object.values(detail)[0];
    if (Array.isArray(first) && first[0]) return String(first[0]);
    if (first) return String(first);
  }
  const message = error?.response?.data?.error?.message || error?.message;
  if (typeof message === 'string' && message.trim()) return message;
  return 'Unable to share this resource right now.';
};

export const useResourceShare = (resource: ShareableResource | null) => {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharePayload, setSharePayload] = useState<ResourceSharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const isShareable = useMemo(() => {
    if (!resource) return false;
    if (typeof resource.can_share === 'boolean') return resource.can_share;
    return true;
  }, [resource]);

  const ensurePayload = useCallback(async (): Promise<ResourceSharePayload> => {
    if (!resource?.id) {
      throw new Error('Invalid resource.');
    }
    if (sharePayload && sharePayload.resource_id === resource.id) {
      return sharePayload;
    }

    const payload = await resourcesService.getResourceShareLink(resource.id);
    if (!payload.can_share) {
      throw new Error(payload.reason || 'This resource cannot be shared.');
    }
    setSharePayload(payload);
    return payload;
  }, [resource, sharePayload]);

  const openShareSheet = useCallback(async () => {
    if (!resource?.id) return;
    setError(null);
    setSheetOpen(true);
    setLoading(true);
    try {
      await ensurePayload();
    } catch (err: any) {
      const message = resolveErrorMessage(err);
      setError(message);
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  }, [ensurePayload, resource, showToast]);

  const closeShareSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const recordShare = useCallback(
    async (method: ShareMethod) => {
      if (!resource?.id) return;
      try {
        await resourcesService.recordResourceShare(resource.id, method);
      } catch {
        // Non-blocking analytics call.
      }
    },
    [resource]
  );

  const copyLink = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await ensurePayload();
      await copyToClipboard(payload.share_url);
      await recordShare('copy_link');
      showToast('success', 'Link copied successfully');
      return true;
    } catch (err: any) {
      const message = resolveErrorMessage(err);
      setError(message);
      showToast('error', message);
      Alert.alert('Share Error', message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [ensurePayload, recordShare, showToast]);

  const nativeShare = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await ensurePayload();
      const shared = await openNativeShareSheet({
        title: payload.title,
        message: payload.share_message,
        url: payload.share_url,
      });
      if (shared) {
        await recordShare('native_share');
        showToast('success', 'Share sheet opened');
      }
      return shared;
    } catch (err: any) {
      const message = resolveErrorMessage(err);
      setError(message);
      showToast('error', message);
      Alert.alert('Share Error', message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [ensurePayload, recordShare, showToast]);

  return {
    loading,
    error,
    isShareable,
    isSheetOpen,
    sharePayload,
    openShareSheet,
    closeShareSheet,
    copyLink,
    nativeShare,
  };
};

