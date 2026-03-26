// Admin Announcements Management for CampusHub
// Create, edit, publish, and manage announcement attachments

import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import {
  announcementsApi,
  type Announcement,
  type AnnouncementAttachment,
} from '../../services/announcements.service';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

type AnnouncementStatus = 'draft' | 'published' | 'archived';
type AnnouncementType =
  | 'general'
  | 'academic'
  | 'maintenance'
  | 'urgent'
  | 'course_update'
  | 'system_notice';

interface PendingAttachment {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

interface AnnouncementFormState {
  title: string;
  content: string;
  announcement_type: AnnouncementType;
  status: AnnouncementStatus;
  is_pinned: boolean;
}

const TYPE_OPTIONS: { value: AnnouncementType; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'academic', label: 'Academic' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'course_update', label: 'Course Update' },
  { value: 'system_notice', label: 'System Notice' },
];

const STATUS_OPTIONS: { value: AnnouncementStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const EMPTY_FORM: AnnouncementFormState = {
  title: '',
  content: '',
  announcement_type: 'general',
  status: 'draft',
  is_pinned: false,
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const buildAnnouncementPayload = (
  formData: AnnouncementFormState,
  pendingAttachments: PendingAttachment[],
  removedAttachmentIds: string[]
) => {
  const payload = new FormData();
  payload.append('title', formData.title.trim());
  payload.append('content', formData.content.trim());
  payload.append('announcement_type', formData.announcement_type);
  payload.append('status', formData.status);
  payload.append('is_pinned', String(formData.is_pinned));

  pendingAttachments.forEach((attachment) => {
    payload.append('attachment_files', {
      uri: attachment.uri,
      name: attachment.name,
      type: attachment.mimeType || 'application/octet-stream',
    } as any);
  });

  removedAttachmentIds.forEach((attachmentId) => {
    payload.append('remove_attachment_ids', attachmentId);
  });

  return payload;
};

const AnnouncementsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickingFiles, setPickingFiles] = useState(false);
  const [actioningSlug, setActioningSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<AnnouncementFormState>(EMPTY_FORM);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);

  const fetchAnnouncements = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setError(null);
      }

      const response = await announcementsApi.getAdminAnnouncements({ page: 1 });
      setAnnouncements(response.results || []);
    } catch (err: any) {
      console.error('Failed to fetch announcements:', err);
      setError(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements(true);
  }, [fetchAnnouncements]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements(true);
  }, [fetchAnnouncements]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    fetchAnnouncements(true);
  }, [fetchAnnouncements]);

  const closeModal = () => {
    setModalVisible(false);
    setEditingAnnouncement(null);
    setFormData(EMPTY_FORM);
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setSaving(false);
    setPickingFiles(false);
  };

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setFormData(EMPTY_FORM);
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setModalVisible(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content || '',
      announcement_type: (announcement.announcement_type as AnnouncementType) || 'general',
      status: (announcement.status as AnnouncementStatus) || 'draft',
      is_pinned: Boolean(announcement.is_pinned),
    });
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setModalVisible(true);
  };

  const pickAttachments = async () => {
    try {
      setPickingFiles(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const nextAttachments = result.assets.map((asset, index) => ({
        id: `${asset.uri}-${asset.name}-${index}`,
        uri: asset.uri,
        name: asset.name || `attachment-${Date.now()}-${index}`,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: Number(asset.size || 0),
      }));

      setPendingAttachments((current) => {
        const existingKeys = new Set(current.map((item) => `${item.uri}:${item.name}`));
        const uniqueNewItems = nextAttachments.filter(
          (item) => !existingKeys.has(`${item.uri}:${item.name}`)
        );
        return [...current, ...uniqueNewItems];
      });
    } catch (err) {
      console.error('Failed to pick announcement attachments:', err);
      Alert.alert('Attachment Error', 'Unable to select files right now.');
    } finally {
      setPickingFiles(false);
    }
  };

  const removePendingAttachment = (attachmentId: string) => {
    setPendingAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId)
    );
  };

  const removeExistingAttachment = (attachmentId: string) => {
    setRemovedAttachmentIds((current) =>
      current.includes(attachmentId)
        ? current.filter((id) => id !== attachmentId)
        : [...current, attachmentId]
    );
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      Alert.alert('Missing Details', 'Title and content are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = buildAnnouncementPayload(
        formData,
        pendingAttachments,
        removedAttachmentIds
      );

      if (editingAnnouncement) {
        await announcementsApi.updateAnnouncement(editingAnnouncement.slug, payload);
        Alert.alert('Success', 'Announcement updated successfully.');
      } else {
        await announcementsApi.createAnnouncement(payload);
        Alert.alert('Success', 'Announcement created successfully.');
      }

      closeModal();
      await fetchAnnouncements(true);
    } catch (err: any) {
      console.error('Failed to save announcement:', err);
      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to save announcement.';
      Alert.alert('Error', message);
      setSaving(false);
    }
  };

  const handleDelete = (announcement: Announcement) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await announcementsApi.deleteAnnouncement(announcement.slug);
              Alert.alert('Success', 'Announcement deleted.');
              fetchAnnouncements(true);
            } catch (err: any) {
              console.error('Failed to delete announcement:', err);
              Alert.alert('Error', 'Failed to delete announcement.');
            }
          },
        },
      ]
    );
  };

  const handlePublish = async (announcement: Announcement) => {
    setActioningSlug(announcement.slug);
    try {
      await announcementsApi.publishAnnouncement(announcement.slug);
      Alert.alert('Success', 'Announcement published.');
      await fetchAnnouncements(true);
    } catch (err: any) {
      console.error('Failed to publish announcement:', err);
      Alert.alert('Error', 'Failed to publish announcement.');
    } finally {
      setActioningSlug(null);
    }
  };

  const handleArchive = (announcement: Announcement) => {
    Alert.alert(
      'Archive Announcement',
      'This will remove the announcement from active circulation while keeping it in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              setActioningSlug(announcement.slug);
              await announcementsApi.archiveAnnouncement(announcement.slug);
              Alert.alert('Success', 'Announcement archived.');
              await fetchAnnouncements(true);
            } catch (err: any) {
              console.error('Failed to archive announcement:', err);
              Alert.alert('Error', 'Failed to archive announcement.');
            } finally {
              setActioningSlug(null);
            }
          },
        },
      ]
    );
  };

  const handleUnpublish = async (announcement: Announcement) => {
    setActioningSlug(announcement.slug);
    try {
      await announcementsApi.unpublishAnnouncement(announcement.slug);
      Alert.alert('Success', 'Announcement moved back to draft.');
      await fetchAnnouncements(true);
    } catch (err: any) {
      console.error('Failed to unpublish announcement:', err);
      Alert.alert('Error', 'Failed to unpublish announcement.');
    } finally {
      setActioningSlug(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return colors.error;
      case 'maintenance':
        return colors.warning;
      case 'academic':
      case 'course_update':
        return colors.info;
      case 'system_notice':
        return colors.accent[500];
      default:
        return colors.primary[500];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return colors.success;
      case 'archived':
        return colors.text.tertiary;
      default:
        return colors.warning;
    }
  };

  const visibleExistingAttachments =
    editingAnnouncement?.attachments?.filter(
      (attachment) => !removedAttachmentIds.includes(attachment.id)
    ) || [];

  const renderAttachmentRow = (
    attachment: { id: string; name: string; meta: string },
    onRemove: () => void
  ) => (
    <View key={attachment.id} style={styles.attachmentRow}>
      <View style={styles.attachmentRowIcon}>
        <Icon name="document-text" size={18} color={colors.primary[500]} />
      </View>
      <View style={styles.attachmentRowContent}>
        <Text style={styles.attachmentRowName} numberOfLines={1}>
          {attachment.name}
        </Text>
        <Text style={styles.attachmentRowMeta}>{attachment.meta}</Text>
      </View>
      <TouchableOpacity style={styles.attachmentRemoveButton} onPress={onRemove}>
        <Icon name="close-circle" size={20} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  const renderAnnouncementItem = ({ item }: { item: Announcement }) => {
    const isActioning = actioningSlug === item.slug;

    return (
    <View style={styles.announcementCard}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: `${getTypeColor(item.announcement_type)}20` },
            ]}
          >
            <Text
              style={[
                styles.typeText,
                { color: getTypeColor(item.announcement_type) },
              ]}
            >
              {item.announcement_type_display || item.announcement_type}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(item.status)}20` },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status_display || item.status}
            </Text>
          </View>
          {item.is_pinned && (
            <View style={styles.pinnedBadge}>
              <Icon name="pin" size={12} color={colors.primary[500]} />
              <Text style={styles.pinnedBadgeText}>Pinned</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.announcementTitle}>{item.title}</Text>
      <Text style={styles.announcementMessage} numberOfLines={3}>
        {item.content}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{item.target_summary || 'All Students'}</Text>
        <Text style={styles.metaText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          By {item.created_by_name || 'CampusHub'}
        </Text>
        <Text style={styles.metaText}>
          {item.attachment_count || item.attachments?.length || 0} attachment
          {(item.attachment_count || item.attachments?.length || 0) === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.cardActions}>
        {item.status === 'draft' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSuccess, isActioning && styles.actionBtnDisabled]}
            onPress={() => handlePublish(item)}
            disabled={isActioning}
          >
            <Icon name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextSuccess]}>Publish</Text>
          </TouchableOpacity>
        )}
        {item.status === 'published' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnMuted, isActioning && styles.actionBtnDisabled]}
            onPress={() => handleUnpublish(item)}
            disabled={isActioning}
          >
            <Icon name="close-circle" size={18} color={colors.warning} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextMuted]}>Unpublish</Text>
          </TouchableOpacity>
        )}
        {item.status !== 'archived' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnMuted, isActioning && styles.actionBtnDisabled]}
            onPress={() => handleArchive(item)}
            disabled={isActioning}
          >
            <Icon name="archive" size={18} color={colors.text.secondary} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextMuted]}>Archive</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnInfo, isActioning && styles.actionBtnDisabled]}
          onPress={() => handleEdit(item)}
          disabled={isActioning}
        >
          <Icon name="pencil" size={18} color={colors.info} />
          <Text style={[styles.actionBtnText, styles.actionBtnTextInfo]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDanger, isActioning && styles.actionBtnDisabled]}
          onPress={() => handleDelete(item)}
          disabled={isActioning}
        >
          <Icon name="trash" size={18} color={colors.error} />
          <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !announcements.length) {
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.title}>Announcements</Text>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <Icon name="add" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={announcements}
        renderItem={renderAnnouncementItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="megaphone" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No announcements yet</Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
              <Text style={styles.createButtonText}>Create First Announcement</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingAnnouncement ? 'Edit' : 'Create'} Announcement
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Title"
                placeholderTextColor={colors.text.tertiary}
                value={formData.title}
                onChangeText={(text) => setFormData((current) => ({ ...current, title: text }))}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Message"
                placeholderTextColor={colors.text.tertiary}
                value={formData.content}
                onChangeText={(text) => setFormData((current) => ({ ...current, content: text }))}
                multiline
                numberOfLines={6}
              />

              <Text style={styles.label}>Type</Text>
              <View style={styles.optionsRow}>
                {TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionBtn,
                      formData.announcement_type === option.value && styles.optionBtnActive,
                    ]}
                    onPress={() =>
                      setFormData((current) => ({
                        ...current,
                        announcement_type: option.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        formData.announcement_type === option.value &&
                          styles.optionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Status</Text>
              <View style={styles.optionsRow}>
                {STATUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionBtn,
                      formData.status === option.value && styles.optionBtnActive,
                    ]}
                    onPress={() =>
                      setFormData((current) => ({
                        ...current,
                        status: option.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        formData.status === option.value && styles.optionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.pinToggle, formData.is_pinned && styles.pinToggleActive]}
                onPress={() =>
                  setFormData((current) => ({
                    ...current,
                    is_pinned: !current.is_pinned,
                  }))
                }
              >
                <View style={styles.pinToggleContent}>
                  <Icon
                    name={formData.is_pinned ? 'pin' : 'pin-outline'}
                    size={18}
                    color={formData.is_pinned ? colors.primary[500] : colors.text.secondary}
                  />
                  <Text style={styles.pinToggleLabel}>Pin announcement</Text>
                </View>
                <Text style={styles.pinToggleValue}>
                  {formData.is_pinned ? 'Pinned' : 'Not pinned'}
                </Text>
              </TouchableOpacity>

              <View style={styles.attachmentsHeader}>
                <Text style={styles.label}>Attachments</Text>
                <Button
                  title={pickingFiles ? 'Selecting...' : 'Add Files'}
                  onPress={pickAttachments}
                  size="sm"
                  variant="outline"
                  loading={pickingFiles}
                />
              </View>

              {visibleExistingAttachments.length > 0 && (
                <View style={styles.attachmentSection}>
                  <Text style={styles.sectionLabel}>Current files</Text>
                  {visibleExistingAttachments.map((attachment: AnnouncementAttachment) =>
                    renderAttachmentRow(
                      {
                        id: attachment.id,
                        name: attachment.filename,
                        meta:
                          `${attachment.file_type || 'File'} • ` +
                          `${attachment.formatted_file_size || formatFileSize(attachment.file_size)}`,
                      },
                      () => removeExistingAttachment(attachment.id)
                    )
                  )}
                </View>
              )}

              {pendingAttachments.length > 0 && (
                <View style={styles.attachmentSection}>
                  <Text style={styles.sectionLabel}>Files to upload</Text>
                  {pendingAttachments.map((attachment) =>
                    renderAttachmentRow(
                      {
                        id: attachment.id,
                        name: attachment.name,
                        meta:
                          `${attachment.mimeType || 'File'} • ${formatFileSize(attachment.size)}`,
                      },
                      () => removePendingAttachment(attachment.id)
                    )
                  )}
                </View>
              )}

              {!visibleExistingAttachments.length && !pendingAttachments.length && (
                <View style={styles.emptyAttachmentState}>
                  <Icon name="attach" size={18} color={colors.text.tertiary} />
                  <Text style={styles.emptyAttachmentText}>
                    No files attached yet.
                  </Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={closeModal}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title={saving ? 'Saving...' : 'Save'}
                  onPress={handleSave}
                  loading={saving}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    paddingTop: spacing[8],
    backgroundColor: colors.primary[500],
  },
  backButton: {
    padding: spacing[1],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  addButton: {
    padding: spacing[1],
  },
  listContent: {
    padding: spacing[4],
  },
  announcementCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  cardHeader: {
    marginBottom: spacing[2],
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  typeBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.primary[500]}18`,
  },
  pinnedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[500],
  },
  announcementTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  announcementMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    gap: spacing[2],
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    marginTop: spacing[3],
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing[3],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  actionBtnSuccess: {
    backgroundColor: colors.success + '12',
    borderColor: colors.success + '33',
  },
  actionBtnInfo: {
    backgroundColor: colors.info + '12',
    borderColor: colors.info + '33',
  },
  actionBtnMuted: {
    backgroundColor: colors.gray[50],
    borderColor: colors.border.light,
  },
  actionBtnDanger: {
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '2A',
  },
  actionBtnDisabled: {
    opacity: 0.55,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnTextSuccess: {
    color: colors.success,
  },
  actionBtnTextInfo: {
    color: colors.info,
  },
  actionBtnTextMuted: {
    color: colors.text.secondary,
  },
  actionBtnTextDanger: {
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.tertiary,
    marginTop: spacing[2],
  },
  createButton: {
    marginTop: spacing[4],
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  createButtonText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingVertical: spacing[6],
  },
  modalContent: {
    backgroundColor: colors.card.light,
    marginHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    padding: spacing[6],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  optionBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
  },
  optionBtnActive: {
    backgroundColor: colors.primary[500],
  },
  optionText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  optionTextActive: {
    color: colors.text.inverse,
    fontWeight: '700',
  },
  pinToggle: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  pinToggleActive: {
    borderColor: colors.primary[500],
    backgroundColor: `${colors.primary[500]}08`,
  },
  pinToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  pinToggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  pinToggleValue: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  attachmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  attachmentSection: {
    marginBottom: spacing[3],
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  attachmentRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary[500]}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentRowContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  attachmentRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  attachmentRowMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  attachmentRemoveButton: {
    paddingLeft: spacing[2],
  },
  emptyAttachmentState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  emptyAttachmentText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  modalButton: {
    flex: 1,
  },
});

export default AnnouncementsScreen;
