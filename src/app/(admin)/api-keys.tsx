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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { adminManagementAPI } from '../../services/api';

interface APIKey {
  id: string;
  name: string;
  description: string;
  key_type: string;
  status: string;
  key_prefix: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  rate_limit: number;
  rate_limit_remaining: number;
  total_requests: number;
  scopes: string[];
}

export default function APIKeys() {
  const router = useRouter();
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showKey, setShowKey] = useState<string | null>(null);

  const [newKey, setNewKey] = useState({
    name: '',
    description: '',
    key_type: 'personal',
    rate_limit: 1000,
    scopes: ['read'],
  });

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      const response = await adminManagementAPI.listApiKeys();
      const data = response?.data?.data ?? response?.data ?? {};
      setAPIKeys(Array.isArray(data?.results) ? data.results : []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAPIKeys();
  };

  const createAPIKey = async () => {
    if (!newKey.name) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      const response = await adminManagementAPI.createApiKey(newKey);
      const data = response?.data?.data ?? response?.data ?? {};
      Alert.alert(
        'Success',
        `API Key created: ${data.raw_key}\n\nSave this key - it won't be shown again!`,
        [{ text: 'OK', onPress: () => setShowModal(false) }]
      );
      setNewKey({
        name: '',
        description: '',
        key_type: 'personal',
        rate_limit: 1000,
        scopes: ['read'],
      });
      fetchAPIKeys();
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const toggleKeyStatus = async (keyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      await adminManagementAPI.updateApiKey(keyId, { status: newStatus });
      Alert.alert('Success', `API key ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchAPIKeys();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const revokeKey = async (keyId: string) => {
    Alert.alert(
      'Revoke API Key',
      'Are you sure you want to revoke this API key? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminManagementAPI.revokeApiKey(keyId);
              Alert.alert('Success', 'API key revoked');
              fetchAPIKeys();
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke key');
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
      case 'revoked': return '#EF4444';
      case 'expired': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'personal': return '👤';
      case 'project': return '📁';
      case 'service': return '⚙️';
      case 'integration': return '🔗';
      default: return '🔑';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API Keys</Text>
        <TouchableOpacity onPress={() => setShowModal(true)}>
          <Text style={styles.addButton}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{apiKeys.length}</Text>
          <Text style={styles.statLabel}>Total Keys</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {apiKeys.filter(k => k.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {apiKeys.reduce((sum, k) => sum + k.total_requests, 0).toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Total Requests</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {apiKeys.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔑</Text>
            <Text style={styles.emptyTitle}>No API Keys</Text>
            <Text style={styles.emptyText}>Create your first API key to get started</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.createButtonText}>Create API Key</Text>
            </TouchableOpacity>
          </View>
        ) : (
          apiKeys.map(key => (
            <View key={key.id} style={styles.keyCard}>
              <View style={styles.keyHeader}>
                <View style={styles.keyInfo}>
                  <Text style={styles.keyIcon}>{getTypeIcon(key.key_type)}</Text>
                  <View>
                    <Text style={styles.keyName}>{key.name}</Text>
                    <Text style={styles.keyPrefix}>{key.key_prefix}...••••••</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(key.status) }]}>
                  <Text style={styles.statusBadgeText}>{key.status}</Text>
                </View>
              </View>
              
              {key.description && (
                <Text style={styles.keyDescription}>{key.description}</Text>
              )}
              
              <View style={styles.keyDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Rate Limit</Text>
                  <Text style={styles.detailValue}>
                    {key.rate_limit_remaining.toLocaleString()} / {key.rate_limit.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Total Requests</Text>
                  <Text style={styles.detailValue}>{key.total_requests.toLocaleString()}</Text>
                </View>
              </View>
              
              {key.last_used_at && (
                <Text style={styles.lastUsed}>
                  Last used: {new Date(key.last_used_at).toLocaleString()}
                </Text>
              )}
              
              <View style={styles.scopesContainer}>
                {key.scopes.map((scope, i) => (
                  <View key={i} style={styles.scopeTag}>
                    <Text style={styles.scopeText}>{scope}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.keyActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => toggleKeyStatus(key.id, key.status)}
                >
                  <Text style={styles.actionButtonText}>
                    {key.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.revokeButton]}
                  onPress={() => revokeKey(key.id)}
                >
                  <Text style={[styles.actionButtonText, styles.revokeButtonText]}>
                    Revoke
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create API Key</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Key Name (e.g., My App)"
              value={newKey.name}
              onChangeText={(text) => setNewKey({ ...newKey, name: text })}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              multiline
              value={newKey.description}
              onChangeText={(text) => setNewKey({ ...newKey, description: text })}
            />
            
            <Text style={styles.label}>Key Type</Text>
            <View style={styles.optionsRow}>
              {['personal', 'project', 'service', 'integration'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    newKey.key_type === type && styles.optionButtonActive,
                  ]}
                  onPress={() => setNewKey({ ...newKey, key_type: type })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      newKey.key_type === type && styles.optionTextActive,
                    ]}
                  >
                    {getTypeIcon(type)} {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.label}>Rate Limit (requests/hour)</Text>
            <View style={styles.rateLimitRow}>
              {[500, 1000, 5000, 10000].map(limit => (
                <TouchableOpacity
                  key={limit}
                  style={[
                    styles.rateLimitButton,
                    newKey.rate_limit === limit && styles.rateLimitButtonActive,
                  ]}
                  onPress={() => setNewKey({ ...newKey, rate_limit: limit })}
                >
                  <Text
                    style={[
                      styles.rateLimitText,
                      newKey.rate_limit === limit && styles.rateLimitTextActive,
                    ]}
                  >
                    {limit.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.label}>Scopes</Text>
            <View style={styles.optionsRow}>
              {['read', 'write', 'admin'].map(scope => (
                <TouchableOpacity
                  key={scope}
                  style={[
                    styles.optionButton,
                    newKey.scopes.includes(scope) && styles.optionButtonActive,
                  ]}
                  onPress={() => {
                    const scopes = newKey.scopes.includes(scope)
                      ? newKey.scopes.filter(s => s !== scope)
                      : [...newKey.scopes, scope];
                    setNewKey({ ...newKey, scopes });
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      newKey.scopes.includes(scope) && styles.optionTextActive,
                    ]}
                  >
                    {scope}
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
                onPress={createAPIKey}
              >
                <Text style={styles.submitButtonText}>Create Key</Text>
              </TouchableOpacity>
            </View>
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
  keyCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  keyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  keyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  keyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  keyPrefix: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  keyDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  keyDetails: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  lastUsed: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  scopesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  scopeTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 4,
  },
  scopeText: {
    fontSize: 10,
    color: '#4F46E5',
    fontWeight: '500',
  },
  keyActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  revokeButton: {
    backgroundColor: '#FEE2E2',
  },
  revokeButtonText: {
    color: '#EF4444',
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
    maxHeight: '85%',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    textTransform: 'capitalize',
  },
  optionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  rateLimitRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  rateLimitButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  rateLimitButtonActive: {
    backgroundColor: '#3B82F6',
  },
  rateLimitText: {
    fontSize: 12,
    color: '#6B7280',
  },
  rateLimitTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
