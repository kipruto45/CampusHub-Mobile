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
} from 'react-native';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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
  }, [fetchReports]);

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
            onPress={() => Alert.alert('Coming Soon', 'Bulk update feature coming soon')}
          >
            <Text style={styles.bulkOperationIcon}>✏️</Text>
            <Text style={styles.bulkOperationLabel}>Bulk Update</Text>
            <Text style={styles.bulkOperationDesc}>
              Update multiple resources
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bulkOperationCard}
            onPress={() => Alert.alert('Coming Soon', 'Bulk delete feature coming soon')}
          >
            <Text style={styles.bulkOperationIcon}>🗑️</Text>
            <Text style={styles.bulkOperationLabel}>Bulk Delete</Text>
            <Text style={styles.bulkOperationDesc}>
              Delete multiple resources
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bulkOperationCard}
            onPress={() => Alert.alert('Coming Soon', 'Bulk moderation feature coming soon')}
          >
            <Text style={styles.bulkOperationIcon}>✅</Text>
            <Text style={styles.bulkOperationLabel}>Bulk Moderate</Text>
            <Text style={styles.bulkOperationDesc}>
              Approve/reject multiple items
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bulkOperationCard}
            onPress={() => Alert.alert('Coming Soon', 'Bulk notification feature coming soon')}
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
});
