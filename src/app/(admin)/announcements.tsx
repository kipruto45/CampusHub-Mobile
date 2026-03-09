// Admin Announcements Management for CampusHub
// Create, edit, and manage announcements

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import api from '../../services/api';

type AnnouncementStatus = 'draft' | 'published' | 'archived';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'important' | 'update' | 'alert';
  status: AnnouncementStatus;
  target_audience: 'all' | 'students' | 'staff';
  created_at: string;
  published_at?: string;
  created_by: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

const AnnouncementsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'general' as 'general' | 'important' | 'update' | 'alert',
    status: 'draft' as AnnouncementStatus,
    target_audience: 'all' as 'all' | 'students' | 'staff',
  });

  const fetchAnnouncements = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setError(null);
      }
      
      const response = await api.get('/announcements/');
      setAnnouncements(response.data?.results || response.data || []);
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
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements(true);
  }, [fetchAnnouncements]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    fetchAnnouncements(true);
  }, []);

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      message: '',
      type: 'general',
      status: 'draft',
      target_audience: 'all',
    });
    setModalVisible(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      status: announcement.status,
      target_audience: announcement.target_audience,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      if (editingAnnouncement) {
        await api.patch(`/announcements/${editingAnnouncement.id}/`, formData);
        Alert.alert('Success', 'Announcement updated successfully');
      } else {
        await api.post('/announcements/', formData);
        Alert.alert('Success', 'Announcement created successfully');
      }
      setModalVisible(false);
      fetchAnnouncements(true);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save announcement');
    }
  };

  const handleDelete = async (id: string) => {
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
              await api.delete(`/announcements/${id}/`);
              Alert.alert('Success', 'Announcement deleted');
              fetchAnnouncements(true);
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const handlePublish = async (id: string) => {
    try {
      await api.patch(`/announcements/${id}/`, { status: 'published' });
      Alert.alert('Success', 'Announcement published');
      fetchAnnouncements(true);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to publish');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'important':
        return colors.error;
      case 'update':
        return colors.info;
      case 'alert':
        return colors.warning;
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

  const renderAnnouncementItem = ({ item }: { item: Announcement }) => (
    <View style={styles.announcementCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
          <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.announcementTitle}>{item.title}</Text>
      <Text style={styles.announcementMessage} numberOfLines={2}>{item.message}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.audienceText}>
          <Icon name="people" size={12} color={colors.text.tertiary} /> {item.target_audience}
        </Text>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.cardActions}>
        {item.status === 'draft' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handlePublish(item.id)}>
            <Icon name={'checkmark-circle'} size={18} color={colors.success} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
          <Icon name="pencil" size={18} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
          <Icon name="trash" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const typeOptions = ['general', 'important', 'update', 'alert'] as const;
  const statusOptions = ['draft', 'published', 'archived'] as const;
  const audienceOptions = ['all', 'students', 'staff'] as const;

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.title}>Announcements</Text>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <Icon name="add" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      {/* Announcements List */}
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

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingAnnouncement ? 'Edit' : 'Create'} Announcement
              </Text>
              
              <TextInput
                style={styles.input}
                placeholder="Title"
                placeholderTextColor={colors.text.tertiary}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Message"
                placeholderTextColor={colors.text.tertiary}
                value={formData.message}
                onChangeText={(text) => setFormData({ ...formData, message: text })}
                multiline
                numberOfLines={5}
              />

              <Text style={styles.label}>Type</Text>
              <View style={styles.optionsRow}>
                {typeOptions.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.optionBtn, formData.type === type && styles.optionBtnActive]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Text style={[styles.optionText, formData.type === type && styles.optionTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Status</Text>
              <View style={styles.optionsRow}>
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.optionBtn, formData.status === status && styles.optionBtnActive]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text style={[styles.optionText, formData.status === status && styles.optionTextActive]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Target Audience</Text>
              <View style={styles.optionsRow}>
                {audienceOptions.map((audience) => (
                  <TouchableOpacity
                    key={audience}
                    style={[styles.optionBtn, formData.target_audience === audience && styles.optionBtnActive]}
                    onPress={() => setFormData({ ...formData, target_audience: audience })}
                  >
                    <Text style={[styles.optionText, formData.target_audience === audience && styles.optionTextActive]}>
                      {audience.charAt(0).toUpperCase() + audience.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
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
    flexDirection: 'row',
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  typeBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  announcementTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  announcementMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  audienceText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  dateText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing[3],
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing[3],
  },
  actionBtn: {
    padding: spacing[2],
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.card.light,
    margin: spacing[4],
    marginTop: spacing[10],
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
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
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
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  saveButton: {
    backgroundColor: colors.primary[500],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});

export default AnnouncementsScreen;
