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

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  status: string;
  actions: { type: string; config: any }[];
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  created_at: string;
}

interface WorkflowExecution {
  id: string;
  workflow: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  results: { action: string; status: string }[];
}

const TRIGGER_TYPES = [
  { value: 'scheduled', label: 'Scheduled', icon: '⏰' },
  { value: 'event', label: 'Event-Based', icon: '⚡' },
  { value: 'manual', label: 'Manual', icon: '👆' },
  { value: 'api', label: 'API Triggered', icon: '🔌' },
];

const ACTION_TYPES = [
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'create_announcement', label: 'Create Announcement' },
  { value: 'delete_old_resources', label: 'Delete Old Resources' },
  { value: 'archive_old_reports', label: 'Archive Old Reports' },
  { value: 'flag_inactive_users', label: 'Flag Inactive Users' },
  { value: 'webhook', label: 'Trigger Webhook' },
  { value: 'email', label: 'Send Email' },
];

export default function Workflows() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [activeTab, setActiveTab] = useState<'workflows' | 'executions'>('workflows');

  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
    actions: [] as string[],
    schedule_interval_minutes: 60,
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const apiBaseUrl = await getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/admin-management/workflows/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchExecutions = async () => {
    if (!selectedWorkflow) return;
    
    try {
      const apiBaseUrl = await getApiBaseUrl();
      const response = await fetch(
        `${apiBaseUrl}/admin-management/workflows/${selectedWorkflow.id}/executions/`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setExecutions(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkflows();
  };

  const createWorkflow = async () => {
    if (!newWorkflow.name || newWorkflow.actions.length === 0) {
      Alert.alert('Error', 'Please fill in required fields and add at least one action');
      return;
    }

    const workflowData = {
      ...newWorkflow,
      actions: newWorkflow.actions.map(actionType => ({
        type: actionType,
        config: {},
      })),
    };

    try {
      const apiBaseUrl = await getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/admin-management/workflows/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Workflow created successfully');
        setShowModal(false);
        setNewWorkflow({
          name: '',
          description: '',
          trigger_type: 'manual',
          actions: [],
          schedule_interval_minutes: 60,
        });
        fetchWorkflows();
      } else {
        Alert.alert('Error', 'Failed to create workflow');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const toggleWorkflow = async (workflowId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    try {
      const apiBaseUrl = await getApiBaseUrl();
      const response = await fetch(
        `${apiBaseUrl}/admin-management/workflows/${workflowId}/`,
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
        Alert.alert('Success', `Workflow ${newStatus}`);
        fetchWorkflows();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update workflow');
    }
  };

  const runWorkflow = async (workflowId: string) => {
    try {
      const apiBaseUrl = await getApiBaseUrl();
      const response = await fetch(
        `${apiBaseUrl}/admin-management/workflows/${workflowId}/run/`,
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        Alert.alert('Success', 'Workflow started');
        fetchWorkflows();
      } else {
        Alert.alert('Error', 'Failed to run workflow');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    Alert.alert(
      'Delete Workflow',
      'Are you sure you want to delete this workflow?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const apiBaseUrl = await getApiBaseUrl();
              const response = await fetch(
                `${apiBaseUrl}/admin-management/workflows/${workflowId}/`,
                { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
              );

              if (response.ok) {
                Alert.alert('Success', 'Workflow deleted');
                fetchWorkflows();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete workflow');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'paused': return '#F59E0B';
      case 'draft': return '#6B7280';
      case 'disabled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'running': return '#3B82F6';
      case 'failed': return '#EF4444';
      case 'skipped': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const renderWorkflowCard = (workflow: Workflow) => (
    <TouchableOpacity
      key={workflow.id}
      style={styles.workflowCard}
      onPress={() => {
        setSelectedWorkflow(workflow);
        setActiveTab('workflows');
        fetchExecutions();
      }}
    >
      <View style={styles.workflowHeader}>
        <View style={styles.workflowInfo}>
          <Text style={styles.workflowName}>{workflow.name}</Text>
          <Text style={styles.workflowDescription} numberOfLines={1}>
            {workflow.description || 'No description'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(workflow.status) }]}>
          <Text style={styles.statusBadgeText}>{workflow.status}</Text>
        </View>
      </View>
      
      <View style={styles.workflowMeta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Trigger:</Text>
          <Text style={styles.metaValue}>{workflow.trigger_type}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Runs:</Text>
          <Text style={styles.metaValue}>{workflow.run_count}</Text>
        </View>
      </View>
      
      {workflow.last_run_at && (
        <Text style={styles.lastRun}>
          Last run: {new Date(workflow.last_run_at).toLocaleString()}
        </Text>
      )}
      
      <View style={styles.actionsPreview}>
        {workflow.actions.slice(0, 3).map((action, i) => (
          <View key={i} style={styles.actionTag}>
            <Text style={styles.actionTagText}>{action.type}</Text>
          </View>
        ))}
        {workflow.actions.length > 3 && (
          <Text style={styles.moreActions}>+{workflow.actions.length - 3}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderExecutionItem = (execution: WorkflowExecution) => (
    <View key={execution.id} style={styles.executionCard}>
      <View style={styles.executionHeader}>
        <View style={[styles.executionStatus, { backgroundColor: getExecutionStatusColor(execution.status) }]}>
          <Text style={styles.executionStatusText}>{execution.status}</Text>
        </View>
        <Text style={styles.executionTime}>
          {new Date(execution.started_at).toLocaleString()}
        </Text>
      </View>
      
      <View style={styles.executionResults}>
        {execution.results?.map((result, i) => (
          <View key={i} style={styles.resultItem}>
            <Text style={[
              styles.resultStatus,
              { color: result.status === 'success' ? '#10B981' : '#EF4444' }
            ]}>
              {result.status === 'success' ? '✓' : '✗'}
            </Text>
            <Text style={styles.resultAction}>{result.action}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workflows</Text>
        <TouchableOpacity onPress={() => setShowModal(true)}>
          <Text style={styles.addButton}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'workflows' && styles.tabActive]}
          onPress={() => setActiveTab('workflows')}
        >
          <Text style={[styles.tabText, activeTab === 'workflows' && styles.tabTextActive]}>
            Workflows ({workflows.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'executions' && styles.tabActive]}
          onPress={() => setActiveTab('executions')}
        >
          <Text style={[styles.tabText, activeTab === 'executions' && styles.tabTextActive]}>
            Executions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'workflows' ? (
          workflows.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⚙️</Text>
              <Text style={styles.emptyTitle}>No Workflows</Text>
              <Text style={styles.emptyText}>Create automated workflows to streamline admin tasks</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowModal(true)}
              >
                <Text style={styles.createButtonText}>Create Workflow</Text>
              </TouchableOpacity>
            </View>
          ) : (
            workflows.map(renderWorkflowCard)
          )
        ) : selectedWorkflow ? (
          executions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No executions yet</Text>
            </View>
          ) : (
            executions.map(renderExecutionItem)
          )
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Select a workflow to view executions</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Create Workflow</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Workflow Name"
                value={newWorkflow.name}
                onChangeText={(text) => setNewWorkflow({ ...newWorkflow, name: text })}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                multiline
                value={newWorkflow.description}
                onChangeText={(text) => setNewWorkflow({ ...newWorkflow, description: text })}
              />
              
              <Text style={styles.label}>Trigger Type</Text>
              <View style={styles.triggerTypes}>
                {TRIGGER_TYPES.map(trigger => (
                  <TouchableOpacity
                    key={trigger.value}
                    style={[
                      styles.triggerButton,
                      newWorkflow.trigger_type === trigger.value && styles.triggerButtonActive,
                    ]}
                    onPress={() => setNewWorkflow({ ...newWorkflow, trigger_type: trigger.value })}
                  >
                    <Text style={styles.triggerIcon}>{trigger.icon}</Text>
                    <Text
                      style={[
                        styles.triggerText,
                        newWorkflow.trigger_type === trigger.value && styles.triggerTextActive,
                      ]}
                    >
                      {trigger.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {newWorkflow.trigger_type === 'scheduled' && (
                <>
                  <Text style={styles.label}>Run Every (minutes)</Text>
                  <View style={styles.intervalRow}>
                    {[15, 30, 60, 120, 360].map(interval => (
                      <TouchableOpacity
                        key={interval}
                        style={[
                          styles.intervalButton,
                          newWorkflow.schedule_interval_minutes === interval && styles.intervalButtonActive,
                        ]}
                        onPress={() => setNewWorkflow({ ...newWorkflow, schedule_interval_minutes: interval })}
                      >
                        <Text
                          style={[
                            styles.intervalText,
                            newWorkflow.schedule_interval_minutes === interval && styles.intervalTextActive,
                          ]}
                        >
                          {interval}m
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              
              <Text style={styles.label}>Actions</Text>
              <View style={styles.actionsList}>
                {ACTION_TYPES.map(action => (
                  <TouchableOpacity
                    key={action.value}
                    style={[
                      styles.actionOption,
                      newWorkflow.actions.includes(action.value) && styles.actionOptionActive,
                    ]}
                    onPress={() => {
                      const actions = newWorkflow.actions.includes(action.value)
                        ? newWorkflow.actions.filter(a => a !== action.value)
                        : [...newWorkflow.actions, action.value];
                      setNewWorkflow({ ...newWorkflow, actions });
                    }}
                  >
                    <View style={[
                      styles.checkbox,
                      newWorkflow.actions.includes(action.value) && styles.checkboxActive,
                    ]}>
                      {newWorkflow.actions.includes(action.value) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={[
                      styles.actionOptionText,
                      newWorkflow.actions.includes(action.value) && styles.actionOptionTextActive,
                    ]}>
                      {action.label}
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
                  onPress={createWorkflow}
                >
                  <Text style={styles.submitButtonText}>Create</Text>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
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
  workflowCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  workflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  workflowInfo: {
    flex: 1,
  },
  workflowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  workflowDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
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
    textTransform: 'capitalize',
  },
  workflowMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    marginRight: 16,
  },
  metaLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 4,
  },
  metaValue: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  lastRun: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  actionsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 4,
  },
  actionTagText: {
    fontSize: 10,
    color: '#6B7280',
  },
  moreActions: {
    fontSize: 10,
    color: '#9CA3AF',
    alignSelf: 'center',
  },
  executionCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  executionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  executionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  executionStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  executionTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  executionResults: {},
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultStatus: {
    fontSize: 12,
    marginRight: 8,
    fontWeight: '700',
  },
  resultAction: {
    fontSize: 12,
    color: '#6B7280',
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
  triggerTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
  },
  triggerButtonActive: {
    backgroundColor: '#DBEAFE',
  },
  triggerIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  triggerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  triggerTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  intervalRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  intervalButtonActive: {
    backgroundColor: '#3B82F6',
  },
  intervalText: {
    fontSize: 12,
    color: '#6B7280',
  },
  intervalTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionsList: {
    marginBottom: 16,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionOptionActive: {},
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
  actionOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionOptionTextActive: {
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
