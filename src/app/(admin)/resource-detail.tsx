import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { adminManagementAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius, spacing } from '../../theme/spacing';

type ResourceStatus = 'pending' | 'approved' | 'rejected' | 'flagged' | 'archived';
type ReasonAction = 'reject' | 'flag' | null;

interface ResourceDetail {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  status: ResourceStatus;
  file_size: number;
  file_url?: string;
  download_count: number;
  average_rating: number;
  created_at: string;
  updated_at?: string;
  rejection_reason?: string;
  reports_count?: number;
  comments_count?: number;
  uploader: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
  course?: { id: string; name: string; code?: string };
  unit?: { id: string; name: string; code?: string };
}

const getStatusColor = (status: ResourceStatus) => {
  switch (status) {
    case 'approved':
      return colors.success;
    case 'rejected':
      return colors.error;
    case 'flagged':
      return colors.warning;
    case 'archived':
      return colors.text.tertiary;
    default:
      return colors.warning;
  }
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const ResourceDetailScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [reasonAction, setReasonAction] = useState<ReasonAction>(null);
  const [reason, setReason] = useState('');

  const statusColor = useMemo(
    () => getStatusColor(resource?.status || 'pending'),
    [resource?.status]
  );

  const fetchResource = useCallback(async () => {
    if (!id) {
      setError('Resource ID is missing.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await adminManagementAPI.getResource(String(id));
      setResource(response.data?.data || null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load resource');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchResource();
  }, [fetchResource]);

  const updateLocalStatus = useCallback(
    (status: ResourceStatus, rejectionReason = '') => {
      setResource((prev) =>
        prev
          ? {
              ...prev,
              status,
              rejection_reason: rejectionReason || prev.rejection_reason || '',
            }
          : null
      );
    },
    []
  );

  const handleApprove = async () => {
    if (!resource) return;

    try {
      setSubmitting(true);
      await adminManagementAPI.approveResource(resource.id);
      updateLocalStatus('approved', '');
      Alert.alert('Success', 'Resource approved.');
    } catch {
      Alert.alert('Error', 'Failed to approve resource.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = () => {
    if (!resource) return;

    Alert.alert('Archive Resource', 'Archive this resource?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmitting(true);
            await adminManagementAPI.archiveResource(resource.id, 'Archived by admin');
            updateLocalStatus('archived');
            Alert.alert('Success', 'Resource archived.');
          } catch {
            Alert.alert('Error', 'Failed to archive resource.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!resource) return;

    Alert.alert('Delete Resource', 'Delete this resource permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmitting(true);
            await adminManagementAPI.deleteResource(resource.id);
            Alert.alert('Success', 'Resource deleted.');
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete resource.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const openReasonModal = (action: Exclude<ReasonAction, null>) => {
    setReasonAction(action);
    setReason('');
  };

  const closeReasonModal = () => {
    setReasonAction(null);
    setReason('');
  };

  const submitReasonAction = async () => {
    if (!resource || !reasonAction) return;

    const trimmedReason = reason.trim();
    if (reasonAction === 'reject' && !trimmedReason) {
      Alert.alert('Reason Required', 'Enter a rejection reason.');
      return;
    }

    try {
      setSubmitting(true);
      if (reasonAction === 'reject') {
        await adminManagementAPI.rejectResource(resource.id, trimmedReason);
        updateLocalStatus('rejected', trimmedReason);
        Alert.alert('Success', 'Resource rejected.');
      } else {
        await adminManagementAPI.flagResource(resource.id, trimmedReason || 'Flagged by admin');
        updateLocalStatus('flagged');
        Alert.alert('Success', 'Resource flagged.');
      }
      closeReasonModal();
    } catch {
      Alert.alert('Error', `Failed to ${reasonAction} resource.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error || !resource) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load Resource"
        message={error || 'Resource not found.'}
        onRetry={fetchResource}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resource Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{resource.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {resource.status.charAt(0).toUpperCase() + resource.status.slice(1)}
            </Text>
          </View>

          {!!resource.description && <Text style={styles.description}>{resource.description}</Text>}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{resource.download_count}</Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{resource.average_rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{resource.reports_count || 0}</Text>
              <Text style={styles.statLabel}>Reports</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{resource.comments_count || 0}</Text>
              <Text style={styles.statLabel}>Comments</Text>
            </View>
          </View>

          <View style={styles.info}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{resource.resource_type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Uploaded by</Text>
              <Text style={styles.infoValue}>
                {`${resource.uploader.first_name} ${resource.uploader.last_name}`.trim() ||
                  resource.uploader.email ||
                  'Unknown'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Course</Text>
              <Text style={styles.infoValue}>{resource.course?.name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Unit</Text>
              <Text style={styles.infoValue}>{resource.unit?.name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>
                {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>File size</Text>
              <Text style={styles.infoValue}>{formatFileSize(resource.file_size)}</Text>
            </View>
            {resource.status === 'rejected' && !!resource.rejection_reason && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Rejection reason</Text>
                <Text style={[styles.infoValue, styles.reasonValue]}>{resource.rejection_reason}</Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${colors.success}20` }]}
              onPress={handleApprove}
              disabled={submitting}
            >
              <Icon name="checkmark" size={18} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${colors.warning}20` }]}
              onPress={() => openReasonModal('flag')}
              disabled={submitting}
            >
              <Icon name="flag" size={18} color={colors.warning} />
              <Text style={[styles.actionText, { color: colors.warning }]}>Flag</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${colors.error}20` }]}
              onPress={() => openReasonModal('reject')}
              disabled={submitting}
            >
              <Icon name="close" size={18} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${colors.text.tertiary}20` }]}
              onPress={handleArchive}
              disabled={submitting}
            >
              <Icon name="archive" size={18} color={colors.text.secondary} />
              <Text style={[styles.actionText, { color: colors.text.secondary }]}>Archive</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={submitting}
          >
            <Icon name="trash" size={18} color={colors.text.inverse} />
            <Text style={styles.deleteText}>Delete Resource</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal transparent visible={reasonAction !== null} animationType="fade" onRequestClose={closeReasonModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {reasonAction === 'reject' ? 'Reject Resource' : 'Flag Resource'}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={
                reasonAction === 'reject'
                  ? 'Enter rejection reason'
                  : 'Enter flag reason (optional)'
              }
              placeholderTextColor={colors.text.tertiary}
              multiline
              style={styles.reasonInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={closeReasonModal}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={submitReasonAction}>
                <Text style={styles.modalPrimaryText}>
                  {submitting ? 'Saving...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    paddingTop: spacing[8],
    backgroundColor: colors.primary[500],
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.inverse },
  headerSpacer: { width: 24 },
  content: { padding: spacing[4] },
  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    ...shadows.md,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
    marginTop: spacing[4],
  },
  stats: {
    flexDirection: 'row',
    marginTop: spacing[6],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary[500] },
  statLabel: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  info: { marginTop: spacing[4] },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoLabel: { fontSize: 14, color: colors.text.secondary },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text.primary, textAlign: 'right' },
  reasonValue: { color: colors.error },
  actions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  actionText: { fontSize: 13, fontWeight: '700' },
  deleteButton: {
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
  },
  deleteText: { color: colors.text.inverse, fontSize: 14, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: spacing[3] },
  reasonInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  modalSecondaryButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
  },
  modalSecondaryText: { color: colors.text.secondary, fontWeight: '600' },
  modalPrimaryButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[500],
  },
  modalPrimaryText: { color: colors.text.inverse, fontWeight: '700' },
});

export default ResourceDetailScreen;
