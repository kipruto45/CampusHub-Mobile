/**
 * Reports & Export / Bulk Operations Screen
 * Generate reports, export data, and perform bulk operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { getApiBaseUrl } from '../../services/api';

interface Report {
  id: string;
  name: string;
  description: string;
  filters: string[];
  fields: string[];
}

export default function ReportsExportScreen() {
  const { accessToken: token } = useAuthStore();
  const params = useLocalSearchParams<{ ids?: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkMode, setBulkMode] = useState<'update' | 'delete' | 'moderate' | 'notify' | null>(null);
  const [idsInput, setIdsInput] = useState('');
  const [statusInput, setStatusInput] = useState('approved');
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | 'flag'>('approve');
  const [reason, setReason] = useState('');
  const [softDelete, setSoftDelete] = useState(true);
  const [notifyTitle, setNotifyTitle] = useState('Bulk update');
  const [notifyMessage, setNotifyMessage] = useState('We applied a bulk change.');
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/admin/reports/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    fetchReports();
    // Prefill IDs from deep link or navigation params
    if (params?.ids) {
      setIdsInput(String(params.ids));
    }
  }, [fetchReports, params?.ids]);

  const generateReport = async (reportId: string, format: string) => {
    setGenerating(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/admin/reports/generate/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: reportId,
            format: format,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Report Generated',
          `Generated ${data.record_count} records\nFormat: ${data.format}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const openBulk = (mode: 'update' | 'delete' | 'moderate' | 'notify') => {
    setBulkMode(mode);
    setBulkModalVisible(true);
  };

  const parseIds = () =>
    Array.from(
      new Set(
        idsInput
          .split(/[\s,]+/)
          .map((id) => id.trim())
          .filter(Boolean)
      )
    );

  const isValidId = (id: string) =>
    /^[0-9a-fA-F-]{8,}$/.test(id) || /^\d+$/.test(id);

  const submitBulk = async () => {
    if (!bulkMode) return;
    const resource_ids = parseIds();
    if (resource_ids.length === 0 && bulkMode !== 'notify') {
      Alert.alert('Add resource IDs', 'Enter one or more resource IDs separated by commas or spaces.');
      return;
    }
    const invalid = resource_ids.filter((id) => !isValidId(id));
    if (invalid.length) {
      Alert.alert(
        'Invalid IDs',
        `These IDs look invalid:\n${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? '…' : ''}`
      );
      return;
    }
    setSubmittingBulk(true);
    try {
      const base = getApiBaseUrl();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      if (bulkMode === 'update') {
        const res = await fetch(`${base}/api/admin-management/bulk/resources/update/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ resource_ids, updates: { status: statusInput } }),
        });
        if (!res.ok) throw new Error('Bulk update failed');
        Alert.alert('Bulk Update', 'Resources updated.');
      } else if (bulkMode === 'delete') {
        const res = await fetch(`${base}/api/admin-management/bulk/resources/delete/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ resource_ids, soft: softDelete }),
        });
        if (!res.ok) throw new Error('Bulk delete failed');
        Alert.alert('Bulk Delete', softDelete ? 'Resources moved to trash.' : 'Resources deleted.');
      } else if (bulkMode === 'moderate') {
        const res = await fetch(`${base}/api/admin-management/bulk/moderation/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ resource_ids, action: moderationAction, reason }),
        });
        if (!res.ok) throw new Error('Bulk moderation failed');
        Alert.alert('Bulk Moderation', `Action "${moderationAction}" applied.`);
      } else if (bulkMode === 'notify') {
        const res = await fetch(`${base}/api/announcements/admin/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: notifyTitle,
            content: notifyMessage,
            announcement_type: 'system',
            status: 'published',
          }),
        });
        if (!res.ok) throw new Error('Bulk notification failed');
        Alert.alert('Notification sent', 'Announcement broadcast successfully.');
      }
      setBulkModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Bulk operation failed');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const getReportIcon = (reportId: string) => {
    const icons: { [key: string]: string } = {
      user_activity: '👤',
      resource_usage: '📚',
      system_analytics: '⚙️',
      moderation_report: '✅',
      engagement_report: '📊',
    };
    return icons[reportId] || '📋';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Export</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionCard}>
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={styles.quickActionLabel}>User CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Text style={styles.quickActionIcon}>📚</Text>
            <Text style={styles.quickActionLabel}>Resources</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Text style={styles.quickActionIcon}>📈</Text>
            <Text style={styles.quickActionLabel}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Text style={styles.quickActionIcon}>✅</Text>
            <Text style={styles.quickActionLabel}>Moderation</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Available Reports */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Reports</Text>
        <Text style={styles.sectionSubtitle}>
          Select a report type and export format
        </Text>

        {reports.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={[
              styles.reportCard,
              selectedReport === report.id && styles.reportCardSelected,
            ]}
            onPress={() => setSelectedReport(report.id)}
          >
            <View style={styles.reportHeader}>
              <Text style={styles.reportIcon}>
                {getReportIcon(report.id)}
              </Text>
              <View style={styles.reportInfo}>
                <Text style={styles.reportName}>{report.name}</Text>
                <Text style={styles.reportDescription}>
                  {report.description}
                </Text>
              </View>
            </View>

            {selectedReport === report.id && (
              <View style={styles.reportActions}>
                <TouchableOpacity
                  style={[styles.formatButton, styles.jsonButton]}
                  onPress={() => generateReport(report.id, 'json')}
                  disabled={generating}
                >
                  <Text style={styles.formatButtonText}>JSON</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formatButton, styles.csvButton]}
                  onPress={() => generateReport(report.id, 'csv')}
                  disabled={generating}
                >
                  <Text style={styles.formatButtonText}>CSV</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Bulk Operations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bulk Operations</Text>
        <Text style={styles.sectionSubtitle}>
          Perform actions on multiple resources at once
        </Text>

        <View style={styles.bulkOperations}>
          <TouchableOpacity
            style={styles.bulkOperationCard}
            onPress={() => openBulk('update')}
          >
            <Text style={styles.bulkOperationIcon}>✏️</Text>
            <Text style={styles.bulkOperationLabel}>Bulk Update</Text>
            <Text style={styles.bulkOperationDesc}>
              Update multiple resources
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bulkOperationCard}
            onPress={() => openBulk('delete')}
          >
            <Text style={styles.bulkOperationIcon}>🗑️</Text>
            <Text style={styles.bulkOperationLabel}>Bulk Delete</Text>
            <Text style={styles.bulkOperationDesc}>
              Delete multiple resources
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bulkOperationCard}
            onPress={() => openBulk('moderate')}
          >
            <Text style={styles.bulkOperationIcon}>✅</Text>
            <Text style={styles.bulkOperationLabel}>Bulk Moderate</Text>
            <Text style={styles.bulkOperationDesc}>
              Approve/reject multiple items
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bulkOperationCard}
            onPress={() => openBulk('notify')}
          >
            <Text style={styles.bulkOperationIcon}>📧</Text>
            <Text style={styles.bulkOperationLabel}>Bulk Notify</Text>
            <Text style={styles.bulkOperationDesc}>
              Send to multiple users
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Export History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Exports</Text>
        
        <View style={styles.emptyHistory}>
          <Text style={styles.emptyHistoryText}>
            No recent exports
          </Text>
          <Text style={styles.emptyHistorySubtext}>
            Generated reports will appear here
          </Text>
        </View>
      </View>

      {generating && (
        <View style={styles.generatingOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.generatingText}>Generating report...</Text>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent
        visible={bulkModalVisible}
        onRequestClose={() => setBulkModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {bulkMode === 'update' && 'Bulk Update'}
              {bulkMode === 'delete' && 'Bulk Delete'}
              {bulkMode === 'moderate' && 'Bulk Moderation'}
              {bulkMode === 'notify' && 'Bulk Notify'}
            </Text>

            {bulkMode !== 'notify' && (
              <>
                <Text style={styles.modalLabel}>Resource IDs (comma or space separated)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="id1,id2,id3"
                  value={idsInput}
                  onChangeText={setIdsInput}
                  multiline
                />
              </>
            )}

            {bulkMode === 'update' && (
              <>
                <Text style={styles.modalLabel}>Status</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="approved | pending | rejected | archived"
                  value={statusInput}
                  onChangeText={setStatusInput}
                />
              </>
            )}

            {bulkMode === 'delete' && (
              <View style={styles.switchRow}>
                <Text style={styles.modalLabel}>Soft delete (move to trash)</Text>
                <Switch value={softDelete} onValueChange={setSoftDelete} />
              </View>
            )}

            {bulkMode === 'moderate' && (
              <>
                <Text style={styles.modalLabel}>Action</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="approve | reject | flag"
                  value={moderationAction}
                  onChangeText={(v) => setModerationAction((v as any) || 'approve')}
                />
                <Text style={styles.modalLabel}>Reason (optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Reason"
                  value={reason}
                  onChangeText={setReason}
                />
              </>
            )}

            {bulkMode === 'notify' && (
              <>
                <Text style={styles.modalLabel}>Title</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Announcement title"
                  value={notifyTitle}
                  onChangeText={setNotifyTitle}
                />
                <Text style={styles.modalLabel}>Message</Text>
                <TextInput
                  style={[styles.modalInput, { height: 100 }]}
                  placeholder="Message to send to users"
                  value={notifyMessage}
                  onChangeText={setNotifyMessage}
                  multiline
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setBulkModalVisible(false)}
                disabled={submittingBulk}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimary]}
                onPress={submitBulk}
                disabled={submittingBulk}
              >
                {submittingBulk ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>Run</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reportCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  reportDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  reportActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  jsonButton: {
    backgroundColor: '#10B981',
  },
  csvButton: {
    backgroundColor: '#3B82F6',
  },
  formatButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bulkOperations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bulkOperationCard: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  bulkOperationIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  bulkOperationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  bulkOperationDesc: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  emptyHistory: {
    padding: 24,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyHistorySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  generatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#3B82F6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modalCancel: {
    backgroundColor: '#E5E7EB',
  },
  modalPrimary: {
    backgroundColor: '#2563EB',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBtnTextPrimary: {
    color: '#FFFFFF',
  },
});
