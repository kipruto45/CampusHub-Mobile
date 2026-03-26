/**
 * Admin Email Campaign Management Screen
 * Create and manage email campaigns for targeted announcements
 */

import { useFocusEffect,useRouter } from 'expo-router';
import React,{ useCallback,useState } from 'react';
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
import * as adminService from '../../services/admin-management.service';
import { CampaignStats,EmailCampaign } from '../../services/admin-management.service';

const CAMPAIGN_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'notification', label: 'Notification' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'digest', label: 'Digest' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  scheduled: '#F59E0B',
  sending: '#3B82F6',
  sent: '#10B981',
  cancelled: '#EF4444',
  failed: '#DC2626',
};

export default function EmailCampaignsScreen() {
  const _router = useRouter();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'create' | 'stats'>('campaigns');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    body: '',
    campaign_type: 'general',
    target_faculties: [] as number[],
    target_departments: [] as number[],
    target_courses: [] as number[],
    target_year_of_study: undefined as number | undefined,
    send_now: false,
  });

  const loadData = useCallback(async () => {
    try {
      if (activeTab === 'campaigns') {
        const data = await adminService.getEmailCampaigns();
        setCampaigns(data);
      } else if (activeTab === 'stats') {
        const statsData = await adminService.getCampaignStats();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.subject || !newCampaign.body) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await adminService.createEmailCampaign(newCampaign);
      setShowCreateModal(false);
      setNewCampaign({
        name: '',
        subject: '',
        body: '',
        campaign_type: 'general',
        target_faculties: [],
        target_departments: [],
        target_courses: [],
        target_year_of_study: undefined,
        send_now: false,
      });
      loadData();
      Alert.alert('Success', 'Campaign created successfully');
    } catch (_error) {
      Alert.alert('Error', 'Failed to create campaign');
    }
  };

  const handleSendCampaign = async (campaign: EmailCampaign) => {
    Alert.alert(
      'Send Campaign',
      `Are you sure you want to send "${campaign.name}" to ${campaign.recipient_count} recipients?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Now',
          onPress: async () => {
            try {
              await adminService.sendEmailCampaign(campaign.id);
              loadData();
              Alert.alert('Success', 'Campaign sent successfully');
            } catch (_error) {
              Alert.alert('Error', 'Failed to send campaign');
            }
          },
        },
      ]
    );
  };

  const handleCancelCampaign = async (campaign: EmailCampaign) => {
    Alert.alert(
      'Cancel Campaign',
      `Are you sure you want to cancel "${campaign.name}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.cancelEmailCampaign(campaign.id);
              loadData();
              Alert.alert('Success', 'Campaign cancelled');
            } catch (_error) {
              Alert.alert('Error', 'Failed to cancel campaign');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCampaign = async (campaign: EmailCampaign) => {
    Alert.alert(
      'Delete Campaign',
      `Are you sure you want to delete "${campaign.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteEmailCampaign(campaign.id);
              loadData();
              Alert.alert('Success', 'Campaign deleted');
            } catch (_error) {
              Alert.alert('Error', 'Failed to delete campaign');
            }
          },
        },
      ]
    );
  };

  const renderCampaigns = () => (
    <View style={styles.listContainer}>
      <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
        <Text style={styles.createButtonText}>+ Create Campaign</Text>
      </TouchableOpacity>

      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.campaignCard}>
            <View style={styles.campaignHeader}>
              <View style={styles.campaignInfo}>
                <Text style={styles.campaignName}>{item.name}</Text>
                <Text style={styles.campaignSubject}>{item.subject}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.campaignMeta}>
              <Text style={styles.metaText}>Type: {item.campaign_type}</Text>
              <Text style={styles.metaText}>Recipients: {item.recipient_count}</Text>
            </View>

            {item.status === 'sent' && (
              <View style={styles.campaignStats}>
                <View style={styles.campaignStatItem}>
                  <Text style={styles.campaignStatValue}>{item.sent_count}</Text>
                  <Text style={styles.campaignStatLabel}>Sent</Text>
                </View>
                <View style={styles.campaignStatItem}>
                  <Text style={styles.campaignStatValue}>{item.opened_count}</Text>
                  <Text style={styles.campaignStatLabel}>Opened</Text>
                </View>
                <View style={styles.campaignStatItem}>
                  <Text style={styles.campaignStatValue}>{item.clicked_count}</Text>
                  <Text style={styles.campaignStatLabel}>Clicked</Text>
                </View>
              </View>
            )}

            <View style={styles.campaignActions}>
              {item.status === 'draft' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.sendButton]}
                  onPress={() => handleSendCampaign(item)}
                >
                  <Text style={styles.actionButtonText}>Send Now</Text>
                </TouchableOpacity>
              )}
              {item.status === 'scheduled' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.campaignActionCancel]}
                  onPress={() => handleCancelCampaign(item)}
                >
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              {(item.status === 'draft' || item.status === 'cancelled') && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteCampaign(item)}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );

  const renderStats = () => {
    if (!stats) return null;

    return (
      <ScrollView style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_campaigns}</Text>
            <Text style={styles.statLabel}>Total Campaigns</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_sent.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Emails Sent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.open_rate}%</Text>
            <Text style={styles.statLabel}>Open Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.click_rate}%</Text>
            <Text style={styles.statLabel}>Click Rate</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Campaigns</Text>
          {stats.recent_campaigns.map((campaign) => (
            <View key={campaign.id} style={styles.recentCampaign}>
              <View style={styles.recentCampaignInfo}>
                <Text style={styles.recentCampaignName}>{campaign.name}</Text>
                <Text style={styles.recentCampaignStatus}>
                  {campaign.status} • {campaign.sent_count} sent
                </Text>
              </View>
              {campaign.sent_at && (
                <Text style={styles.recentCampaignDate}>
                  {new Date(campaign.sent_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'campaigns' && styles.tabActive]}
          onPress={() => setActiveTab('campaigns')}
        >
          <Text style={[styles.tabText, activeTab === 'campaigns' && styles.tabTextActive]}>
            Campaigns
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Stats</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'campaigns' && renderCampaigns()}
      {activeTab === 'stats' && renderStats()}

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Create Email Campaign</Text>

              <TextInput
                style={styles.input}
                placeholder="Campaign Name *"
                value={newCampaign.name}
                onChangeText={(text) => setNewCampaign({ ...newCampaign, name: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Email Subject *"
                value={newCampaign.subject}
                onChangeText={(text) => setNewCampaign({ ...newCampaign, subject: text })}
              />

              <Text style={styles.inputLabel}>Campaign Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {CAMPAIGN_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeChip,
                      newCampaign.campaign_type === type.value && styles.typeChipActive,
                    ]}
                    onPress={() => setNewCampaign({ ...newCampaign, campaign_type: type.value })}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        newCampaign.campaign_type === type.value && styles.typeChipTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Email Body *"
                value={newCampaign.body}
                onChangeText={(text) => setNewCampaign({ ...newCampaign, body: text })}
                multiline
                numberOfLines={6}
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setNewCampaign({ ...newCampaign, send_now: !newCampaign.send_now })}
              >
                <View style={[styles.checkbox, newCampaign.send_now && styles.checkboxChecked]}>
                  {newCampaign.send_now && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Send immediately</Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleCreateCampaign}>
                  <Text style={styles.submitButtonText}>
                    {newCampaign.send_now ? 'Create & Send' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  createButton: {
    backgroundColor: '#4F46E5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  campaignSubject: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  campaignMeta: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  campaignStats: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  campaignStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  campaignStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  campaignStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  campaignActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  sendButton: {
    backgroundColor: '#10B981',
  },
  campaignActionCancel: {
    backgroundColor: '#F59E0B',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  recentCampaign: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  recentCampaignInfo: {
    flex: 1,
  },
  recentCampaignName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  recentCampaignStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  recentCampaignDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1F2937',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  typeSelector: {
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 8,
  },
  typeChipActive: {
    backgroundColor: '#4F46E5',
  },
  typeChipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    marginLeft: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
