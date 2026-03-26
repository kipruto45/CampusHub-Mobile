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
import { adminManagementAPI } from '../../services/api';

interface Incident {
  id: string;
  title: string;
  description: string;
  incident_type: string;
  severity: string;
  status: string;
  started_at: string;
  resolved_at: string | null;
  assigned_to: { id: string; name: string } | null;
  affected_systems: string[];
  duration: number;
  is_active: boolean;
}

const SEVERITY_COLORS = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#3B82F6',
  info: '#6B7280',
};

const STATUS_COLORS = {
  open: '#EF4444',
  investigating: '#F59E0B',
  identified: '#8B5CF6',
  monitoring: '#3B82F6',
  resolved: '#10B981',
  closed: '#6B7280',
};

export default function Incidents() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    incident_type: 'bug',
    severity: 'medium',
  });

  useEffect(() => {
    fetchIncidents();
  }, [filter]);

  const fetchIncidents = async () => {
    try {
      const params: { status?: string } = {};
      if (filter === 'active') {
        params.status = 'open,investigating,identified,monitoring';
      } else if (filter === 'resolved') {
        params.status = 'resolved,closed';
      }

      const response = await adminManagementAPI.listIncidents(params);
      const data = response?.data?.data ?? response?.data ?? {};
      setIncidents(Array.isArray(data?.results) ? data.results : []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const createIncident = async () => {
    if (!newIncident.title || !newIncident.description) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await adminManagementAPI.createIncident(newIncident);
      Alert.alert('Success', 'Incident created successfully');
      setShowModal(false);
      setNewIncident({
        title: '',
        description: '',
        incident_type: 'bug',
        severity: 'medium',
      });
      fetchIncidents();
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const updateIncidentStatus = async (incidentId: string, newStatus: string) => {
    try {
      await adminManagementAPI.updateIncidentStatus(incidentId, newStatus);
      Alert.alert('Success', 'Status updated');
      fetchIncidents();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const getSeverityBadge = (severity: string) => (
    <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || '#6B7280' }]}>
      <Text style={styles.badgeText}>{severity.toUpperCase()}</Text>
    </View>
  );

  const getStatusBadge = (status: string) => (
    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6B7280' }]}>
      <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
    </View>
  );

  const renderIncidentList = () => (
    <View style={styles.incidentList}>
      {incidents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No incidents found</Text>
        </View>
      ) : (
        incidents.map(incident => (
          <TouchableOpacity
            key={incident.id}
            style={styles.incidentCard}
            onPress={() => setSelectedIncident(incident)}
          >
            <View style={styles.incidentHeader}>
              {getSeverityBadge(incident.severity)}
              {getStatusBadge(incident.status)}
            </View>
            
            <Text style={styles.incidentTitle}>{incident.title}</Text>
            <Text style={styles.incidentType} numberOfLines={1}>
              {incident.incident_type}
            </Text>
            
            <View style={styles.incidentFooter}>
              <Text style={styles.incidentTime}>
                {new Date(incident.started_at).toLocaleDateString()}
              </Text>
              <Text style={styles.incidentDuration}>
                {incident.is_active ? `Active: ${incident.duration}m` : 'Resolved'}
              </Text>
            </View>
            
            {incident.affected_systems?.length > 0 && (
              <View style={styles.systemsRow}>
                {incident.affected_systems.slice(0, 3).map((system, i) => (
                  <View key={i} style={styles.systemTag}>
                    <Text style={styles.systemTagText}>{system}</Text>
                  </View>
                ))}
                {incident.affected_systems.length > 3 && (
                  <Text style={styles.moreSystems}>
                    +{incident.affected_systems.length - 3}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderIncidentDetail = () => {
    if (!selectedIncident) return null;

    const statusOptions = ['open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed'];

    return (
      <Modal visible={!!selectedIncident} animationType="slide">
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setSelectedIncident(null)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>Incident Details</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.detailContent}>
            <View style={styles.detailCard}>
              <View style={styles.detailBadges}>
                {getSeverityBadge(selectedIncident.severity)}
                {getStatusBadge(selectedIncident.status)}
              </View>
              
              <Text style={styles.detailIncidentTitle}>{selectedIncident.title}</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{selectedIncident.incident_type}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration:</Text>
                <Text style={styles.detailValue}>{selectedIncident.duration} minutes</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Started:</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedIncident.started_at).toLocaleString()}
                </Text>
              </View>
              
              {selectedIncident.resolved_at && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Resolved:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedIncident.resolved_at).toLocaleString()}
                  </Text>
                </View>
              )}
              
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Description:</Text>
                <Text style={styles.detailDescription}>{selectedIncident.description}</Text>
              </View>
              
              {selectedIncident.affected_systems?.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Affected Systems:</Text>
                  <View style={styles.systemsList}>
                    {selectedIncident.affected_systems.map((system, i) => (
                      <View key={i} style={styles.systemTag}>
                        <Text style={styles.systemTagText}>{system}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Update Status</Text>
            <View style={styles.statusButtons}>
              {statusOptions.map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    selectedIncident.status === status && styles.statusButtonActive,
                  ]}
                  onPress={() => updateIncidentStatus(selectedIncident.id, status)}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      selectedIncident.status === status && styles.statusButtonTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
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
        <Text style={styles.headerTitle}>Incidents</Text>
        <TouchableOpacity onPress={() => setShowModal(true)}>
          <Text style={styles.addButton}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'resolved' && styles.filterButtonActive]}
          onPress={() => setFilter('resolved')}
        >
          <Text style={[styles.filterText, filter === 'resolved' && styles.filterTextActive]}>
            Resolved
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderIncidentList()}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Incident</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Incident Title"
              value={newIncident.title}
              onChangeText={(text) => setNewIncident({ ...newIncident, title: text })}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              multiline
              value={newIncident.description}
              onChangeText={(text) => setNewIncident({ ...newIncident, description: text })}
            />
            
            <Text style={styles.label}>Incident Type</Text>
            <View style={styles.optionsRow}>
              {['bug', 'performance', 'security', 'outage', 'data'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    newIncident.incident_type === type && styles.optionButtonActive,
                  ]}
                  onPress={() => setNewIncident({ ...newIncident, incident_type: type })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      newIncident.incident_type === type && styles.optionTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.label}>Severity</Text>
            <View style={styles.optionsRow}>
              {['critical', 'high', 'medium', 'low'].map(sev => (
                <TouchableOpacity
                  key={sev}
                  style={[
                    styles.optionButton,
                    newIncident.severity === sev && styles.optionButtonActive,
                  ]}
                  onPress={() => setNewIncident({ ...newIncident, severity: sev })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      newIncident.severity === sev && styles.optionTextActive,
                    ]}
                  >
                    {sev}
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
                onPress={createIncident}
              >
                <Text style={styles.submitButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {renderIncidentDetail()}
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
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  incidentList: {
    padding: 16,
  },
  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  incidentHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  incidentType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  incidentTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  incidentDuration: {
    fontSize: 12,
    color: '#6B7280',
  },
  systemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  systemTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  systemTagText: {
    fontSize: 10,
    color: '#6B7280',
  },
  moreSystems: {
    fontSize: 10,
    color: '#9CA3AF',
    alignSelf: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
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
  detailIncidentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  detailSection: {
    marginTop: 16,
  },
  detailDescription: {
    fontSize: 14,
    color: '#1F2937',
    marginTop: 4,
    lineHeight: 20,
  },
  systemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  statusButtonText: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    maxHeight: '80%',
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
    height: 80,
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
    textTransform: 'capitalize',
  },
  optionTextActive: {
    color: '#3B82F6',
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
