// Resource Requests Screen for CampusHub
// Browse and create resource requests

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { resourceRequestsAPI } from '../../services/api';

interface ResourceRequest {
  id: string;
  title: string;
  description: string;
  course?: { id: string; name: string };
  status: string;
  priority: string;
  upvotes: number;
  requested_by: { id: string; first_name: string; last_name: string };
  created_at: string;
}

const ResourceRequestsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [creating, setCreating] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await resourceRequestsAPI.list();
      setRequests(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleCreateRequest = async () => {
    if (!newTitle.trim() || !newDescription.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setCreating(true);
    try {
      await resourceRequestsAPI.create({
        title: newTitle,
        description: newDescription,
        priority: newPriority,
      });
      Alert.alert('Success', 'Resource request created!');
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      fetchRequests();
    } catch (err) {
      Alert.alert('Error', 'Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  const handleUpvote = async (id: string) => {
    try {
      await resourceRequestsAPI.upvote(id);
      fetchRequests();
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return colors.error;
      case 'high': return colors.warning;
      case 'medium': return colors.info;
      default: return colors.text.secondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled': return colors.success;
      case 'cancelled': return colors.error;
      case 'expired': return colors.text.tertiary;
      default: return colors.warning;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resource Requests</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
          <Icon name="add" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Icon name="information-circle" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Request resources you need. Upvote others' requests to help prioritize.
          </Text>
        </View>

        {/* Requests List */}
        {requests.length > 0 ? (
          requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestTitle}>{request.title}</Text>
                  <Text style={styles.requestCourse} numberOfLines={1}>
                    {request.course?.name || 'General'}
                  </Text>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(request.priority) + '20' }]}>
                  <Text style={[styles.priorityText, { color: getPriorityColor(request.priority) }]}>
                    {request.priority}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.requestDescription} numberOfLines={3}>
                {request.description}
              </Text>
              
              <View style={styles.requestFooter}>
                <TouchableOpacity style={styles.upvoteButton} onPress={() => handleUpvote(request.id)}>
                  <Icon name="add" size={24} color={colors.primary[500]} />
                  <Text style={styles.upvoteText}>{request.upvotes}</Text>
                </TouchableOpacity>
                
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                    {request.status}
                  </Text>
                </View>
                
                <Text style={styles.requestAuthor}>
                  by {request.requested_by?.first_name || 'Unknown'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="document-text" size={60} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Requests Yet</Text>
            <Text style={styles.emptyText}>
              Be the first to request a resource you need!
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
              <Icon name="add" size={20} color={colors.text.inverse} />
              <Text style={styles.createButtonText}>Create Request</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create Modal */}
      {showCreateModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Request</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="What resource do you need?"
              placeholderTextColor={colors.text.tertiary}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the resource in detail..."
              placeholderTextColor={colors.text.tertiary}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={4}
            />
            
            <Text style={styles.priorityLabel}>Priority</Text>
            <View style={styles.priorityOptions}>
              {['low', 'medium', 'high', 'urgent'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityOption, newPriority === p && styles.priorityOptionActive]}
                  onPress={() => setNewPriority(p)}
                >
                  <Text style={[styles.priorityOptionText, newPriority === p && styles.priorityOptionTextActive]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateRequest}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary },
  loadingText: { marginTop: spacing[4], fontSize: 14, color: colors.text.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingTop: spacing[12], paddingBottom: spacing[4], backgroundColor: colors.primary[500] },
  backButton: { padding: spacing[2] },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text.inverse },
  addButton: { padding: spacing[2] },
  content: { padding: spacing[4] },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.info + '10', padding: spacing[3], borderRadius: borderRadius.lg, marginBottom: spacing[4] },
  infoText: { flex: 1, marginLeft: spacing[2], fontSize: 13, color: colors.info },
  requestCard: { backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[3], ...shadows.sm },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  requestInfo: { flex: 1 },
  requestTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  requestCourse: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  priorityBadge: { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: borderRadius.full },
  priorityText: { fontSize: 12, fontWeight: '600' },
  requestDescription: { fontSize: 14, color: colors.text.secondary, lineHeight: 20, marginBottom: spacing[3] },
  requestFooter: { flexDirection: 'row', alignItems: 'center' },
  upvoteButton: { flexDirection: 'row', alignItems: 'center', marginRight: spacing[3] },
  upvoteText: { fontSize: 14, fontWeight: '600', color: colors.primary[500], marginLeft: spacing[1] },
  statusBadge: { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: borderRadius.full, marginRight: spacing[3] },
  statusText: { fontSize: 12, fontWeight: '500' },
  requestAuthor: { flex: 1, fontSize: 12, color: colors.text.tertiary, textAlign: 'right' },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing[10] },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary, marginTop: spacing[4] },
  emptyText: { fontSize: 14, color: colors.text.secondary, marginTop: spacing[2], textAlign: 'center' },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary[500], paddingHorizontal: spacing[6], paddingVertical: spacing[3], borderRadius: borderRadius.full, marginTop: spacing[4] },
  createButtonText: { fontSize: 14, fontWeight: '600', color: colors.text.inverse, marginLeft: spacing[2] },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
  modalContent: { backgroundColor: colors.background.primary, borderRadius: borderRadius.xl, padding: spacing[6], width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  input: { backgroundColor: colors.card.light, borderRadius: borderRadius.lg, padding: spacing[3], fontSize: 14, color: colors.text.primary, marginBottom: spacing[3] },
  textArea: { height: 100, textAlignVertical: 'top' },
  priorityLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: spacing[2] },
  priorityOptions: { flexDirection: 'row', marginBottom: spacing[4] },
  priorityOption: { flex: 1, paddingVertical: spacing[2], alignItems: 'center', backgroundColor: colors.card.light, marginRight: spacing[2], borderRadius: borderRadius.md },
  priorityOptionActive: { backgroundColor: colors.primary[500] },
  priorityOptionText: { fontSize: 12, color: colors.text.secondary },
  priorityOptionTextActive: { color: colors.text.inverse, fontWeight: '600' },
  submitButton: { backgroundColor: colors.primary[500], padding: spacing[4], borderRadius: borderRadius.lg, alignItems: 'center' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: colors.text.inverse },
});

export default ResourceRequestsScreen;
