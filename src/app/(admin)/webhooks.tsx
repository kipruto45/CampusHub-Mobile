import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { getApiBaseUrl } from '../../services/api';

interface Webhook {
  id: string;
  name: string;
  description: string;
  url: string;
  status: string;
  events: string[];
  auth_type: string;
  success_rate: number;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  last_delivered_at: string | null;
  created_at: string;
}

const AVAILABLE_EVENTS = [
  { value: 'user.registered', label: 'User Registered' },
  { value: 'user.updated', label: 'User Updated' },
  { value: 'resource.created', label: 'Resource Created' },
  { value: 'resource.downloaded', label: 'Resource Downloaded' },
  { value: 'report.submitted', label: 'Report Submitted' },
  { value: 'report.resolved', label: 'Report Resolved' },
  { value: 'moderation.content_flagged', label: 'Content Flagged' },
  { value: 'moderation.content_approved', label: 'Content Approved' },
  { value: 'gamification.badge_earned', label: 'Badge Earned' },
  { value: 'system.alert', label: 'System Alert' },
];

export default function Webhooks() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);

  const [newWebhook, setNewWebhook] = useState({
    name: '',
    description: '',
    url: '',
    events: [] as string[],
    auth_type: 'none',
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const apiBaseUrl = await getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/admin-management/webhooks/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWebhooks();
  };

  const createWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      const apiBaseUrl = await getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/admin-management/webhooks/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWebhook),
      });

      if (response.ok) {
        Alert.alert('Success', 'Webhook created successfully');
        setShowModal(false);
        setNewWebhook({
          name: '',
          description: '',
          url: '',
          events: [],
          auth_type: 'none',
        });
        fetchWebhooks();
      } else {
        Alert.alert('Error', 'Failed to create webhook');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const toggleWebhook = async (webhookId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      const apiBaseUrl = await getApiBaseUrl();
      const response = await fetch(
        `${apiBaseUrl}/admin-management/webhooks/${webhookId}/`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        Alert.alert('Success', `Webhook ${newStatus}`);
        fetchWebhooks();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update webhook');
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      const apiBaseUrl = await getApiBaseUrl();
      const response = await fetch(
        `${apiBaseUrl}/admin-management/webhooks/${webhookId}/test/`,
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        Alert.alert('Success', 'Test request sent! Check the webhook endpoint for the response.');
      } else {
        Alert.alert('Error', 'Test request failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    Alert.alert(
      'Delete Webhook',
      'Are you sure you want to delete this webhook?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const apiBaseUrl = await getApiBaseUrl();
              const response = await fetch(
                `${apiBaseUrl}/admin-management/webhooks/${webhookId}/`,
                { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
              );

              if (response.ok) {
                Alert.alert('Success', 'Webhook deleted');
                fetchWebhooks();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete webhook');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'inactive': return '#F59E0B';
      case 'failed': return '#EF4444';
      case 'suspended': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const renderWebhookCard = (webhook: Webhook) => (
    <TouchableOpacity
      key={webhook.id}
      style={styles.webhookCard}
      onPress={() => setSelectedWebhook(webhook)}
    >
      <View style={styles.webhookHeader}>
        <View style={styles.webhookInfo}>
          <Text style={styles.webhookName}>{webhook.name}</Text>
          <Text style={styles.webhookUrl} numberOfLines={1}>{webhook.url}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(webhook.status) }]}>
          <Text style={styles.statusBadgeText}>{webhook.status}</Text>
        </View>
      </View>
      
      {webhook.description && (
        <Text style={styles.webhookDescription}>{webhook.description}</Text>
      )}
      
      <View style={styles.webhookStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{webhook.total_deliveries}</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {webhook.success_rate}%
          </Text>
          <Text style={styles.statLabel}>Success</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {webhook.failed_deliveries}
          </Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>
      
      <View style={styles.eventsContainer}>
        {webhook.events.slice(0, 4).map((event, i) => (
          <View key={i} style={styles.eventTag}>
            <Text style={styles.eventTagText}>{event.split('.')[1] || event}</Text>
          </View>
        ))}
        {webhook.events.length > 4 && (
          <Text style={styles.moreEvents}>+{webhook.events.length - 4}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderWebhookDetail = () => {
    if (!selectedWebhook) return null;

    return (
      <Modal visible={!!selectedWebhook} animationType="slide">
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setSelectedWebhook(null)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>Webhook Details</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.detailContent}>
            <View style={styles.detailCard}>
              <View style={styles.detailBadges}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedWebhook.status) }]}>
                  <Text style={styles.statusBadgeText}>{selectedWebhook.status}</Text>
                </View>
                <View style={[styles.authBadge, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={styles.authBadgeText}>{selectedWebhook.auth_type}</Text>
                </View>
              </View>
              
              <Text style={styles.detailWebhookName}>{selectedWebhook.name}</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>URL:</Text>
                <Text style={styles.detailValue} numberOfLines={2}>{selectedWebhook.url}</Text>
              </View>
              
              {selectedWebhook.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>{selectedWebhook.description}</Text>
                </View>
              )}
              
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Statistics:</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.gridStat}>
                    <Text style={styles.gridStatValue}>{selectedWebhook.total_deliveries}</Text>
                    <Text style={styles.gridStatLabel}>Total</Text>
                  </View>
                  <View style={styles.gridStat}>
                    <Text style={[styles.gridStatValue, { color: '#10B981' }]}>
                      {selectedWebhook.successful_deliveries}
                    </Text>
                    <Text style={styles.gridStatLabel}>Success</Text>
                  </View>
                  <View style={styles.gridStat}>
                    <Text style={[styles.gridStatValue, { color: '#EF4444' }]}>
                      {selectedWebhook.failed_deliveries}
                    </Text>
                    <Text style={styles.gridStatLabel}>Failed</Text>
                  </View>
                </View>
              </View>
              
              {selectedWebhook.last_delivered_at && (
                <Text style={styles.lastDelivered}>
                  Last delivery: {new Date(selectedWebhook.last_delivered_at).toLocaleString()}
                </Text>
              )}
            </View>
            
            <Text style={styles.sectionTitle}>Subscribed Events</Text>
            <View style={styles.eventsList}>
              {selectedWebhook.events.map((event, i) => (
                <View key={i} style={styles.eventItem}>
                  <Text style={styles.eventItemText}>{event}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleWebhook(selectedWebhook.id, selectedWebhook.status)}
              >
                <Text style={styles.actionButtonText}>
                  {selectedWebhook.status === 'active' ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#DBEAFE' }]}
                onPress={() => testWebhook(selectedWebhook.id)}
              >
                <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
                  Test
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => deleteWebhook(selectedWebhook.id)}
              >
                <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Webhooks</Text>
        <TouchableOpacity onPress={() => setShowModal(true)}>
          <Text style={styles.addButton}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          Webhooks allow external services to receive real-time notifications.
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {webhooks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔗</Text>
            <Text style={styles.emptyTitle}>No Webhooks</Text>
            <Text style={styles.emptyText}>Create a webhook to receive real-time events</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.createButtonText}>Create Webhook</Text>
            </TouchableOpacity>
          </View>
        ) : (
          webhooks.map(renderWebhookCard)
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Create Webhook</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Webhook Name"
                value={newWebhook.name}
                onChangeText={(text) => setNewWebhook({ ...newWebhook, name: text })}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                multiline
                value={newWebhook.description}
                onChangeText={(text) => setNewWebhook({ ...newWebhook, description: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Endpoint URL (https://...)"
                value={newWebhook.url}
                onChangeText={(text) => setNewWebhook({ ...newWebhook, url: text })}
                autoCapitalize="none"
              />
              
              <Text style={styles.label}>Authentication</Text>
              <View style={styles.optionsRow}>
                {['none', 'basic', 'bearer', 'api_key'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionButton,
                      newWebhook.auth_type === type && styles.optionButtonActive,
                    ]}
                    onPress={() => setNewWebhook({ ...newWebhook, auth_type: type })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        newWebhook.auth_type === type && styles.optionTextActive,
                      ]}
                    >
                      {type === 'none' ? 'None' : type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.label}>Subscribe to Events</Text>
              <View style={styles.eventsOptions}>
                {AVAILABLE_EVENTS.map(event => (
                  <TouchableOpacity
                    key={event.value}
                    style={[
                      styles.eventOption,
                      newWebhook.events.includes(event.value) && styles.eventOptionActive,
                    ]}
                    onPress={() => {
                      const events = newWebhook.events.includes(event.value)
                        ? newWebhook.events.filter(e => e !== event.value)
                        : [...newWebhook.events, event.value];
                      setNewWebhook({ ...newWebhook, events });
                    }}
                  >
                    <View style={[
                      styles.checkbox,
                      newWebhook.events.includes(event.value) && styles.checkboxActive,
                    ]}>
                      {newWebhook.events.includes(event.value) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={[
                      styles.eventOptionText,
                      newWebhook.events.includes(event.value) && styles.eventOptionTextActive,
                    ]}>
                      {event.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={createWebhook}
                >
                  <Text style={styles.submitButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {renderWebhookDetail()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 16,
    color: '#3B82F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  infoBar: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#C7D2FE',
  },
  infoText: {
    fontSize: 12,
    color: '#4F46E5',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  webhookCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  webhookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  webhookInfo: {
    flex: 1,
  },
  webhookName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  webhookUrl: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  webhookDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  webhookStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  eventsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  eventTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  eventTagText: {
    fontSize: 10,
    color: '#6B7280',
  },
  moreEvents: {
    fontSize: 10,
    color: '#9CA3AF',
    alignSelf: 'center',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailBadges: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  authBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  authBadgeText: {
    fontSize: 10,
    color: '#4F46E5',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  detailWebhookName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  detailSection: {
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 8,
  },
  gridStat: {
    flex: 1,
    alignItems: 'center',
  },
  gridStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  gridStatLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  lastDelivered: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  eventsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  eventItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  eventItemText: {
    fontSize: 14,
    color: '#1F2937',
  },
  detailActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
  },
  optionButtonActive: {
    backgroundColor: '#DBEAFE',
  },
  optionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  optionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  eventsOptions: {
    marginBottom: 12,
  },
  eventOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  eventOptionActive: {},
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  eventOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  eventOptionTextActive: {
    color: '#1F2937',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
