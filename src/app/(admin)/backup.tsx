// Admin Backup & System Screen for CampusHub
// Backup management and system export

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';

interface SystemStats {
  total_users: number;
  active_users: number;
  verified_users: number;
  total_resources: number;
  total_storage_used_gb: number;
  activities_today: number;
  approved_resources: number;
  pending_resources: number;
  rejected_resources: number;
}

interface BackupInfo {
  backup_id: string;
  created_at: string;
  size_bytes: number;
  size_mb: number;
  resources_count: number;
  users_count: number;
  includes: string[];
}

interface ExportInfo {
  export_date: string;
  faculties_count: number;
  departments_count: number;
  courses_count: number;
}

const BackupScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [latestBackup, setLatestBackup] = useState<BackupInfo | null>(null);
  const [latestExport, setLatestExport] = useState<ExportInfo | null>(null);

  const fetchSystemStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSystemStats();
      setSystemStats(response.data.data.summary);
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemStats();
  }, [fetchSystemStats]);

  const handleCreateBackup = async () => {
    Alert.alert(
      'Create Backup',
      'This will create a system backup with all current data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            try {
              setExporting(true);
              const response = await adminAPI.createBackup();
              setLatestBackup(response.data.data);
              Alert.alert('Success', 'Backup metadata generated successfully.');
            } catch (err) {
              Alert.alert('Error', 'Failed to create backup');
            } finally {
              setExporting(false);
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    Alert.alert(
      'Export Data',
      'Export all platform data as JSON. This may take a while for large datasets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              setExporting(true);
              const response = await adminAPI.exportData();
              setLatestExport(response.data.data);
              Alert.alert('Success', 'Export metadata prepared successfully.');
            } catch (err) {
              Alert.alert('Error', 'Failed to export data');
            } finally {
              setExporting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading system information...</Text>
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
        <Text style={styles.headerTitle}>Backup & System</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* System Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Icon name="people" size={24} color={colors.primary[500]} />
                <Text style={styles.statValue}>{systemStats?.total_users || 0}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="document" size={24} color={colors.accent[500]} />
                <Text style={styles.statValue}>{systemStats?.total_resources || 0}</Text>
                <Text style={styles.statLabel}>Resources</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Icon name="people" size={24} color={colors.info} />
                <Text style={styles.statValue}>{systemStats?.active_users || 0}</Text>
                <Text style={styles.statLabel}>Active Users</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="cloud" size={24} color={colors.warning} />
                <Text style={styles.statValue}>{(systemStats?.total_storage_used_gb || 0).toFixed(2)} GB</Text>
                <Text style={styles.statLabel}>Storage Used</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Resource Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resource Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={styles.statusLabel}>Approved</Text>
              <Text style={styles.statusValue}>{systemStats?.approved_resources || 0}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.statusLabel}>Pending</Text>
              <Text style={styles.statusValue}>{systemStats?.pending_resources || 0}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
              <Text style={styles.statusLabel}>Rejected</Text>
              <Text style={styles.statusValue}>{systemStats?.rejected_resources || 0}</Text>
            </View>
          </View>
        </View>

        {/* Backup Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup & Export</Text>
          
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={handleCreateBackup}
            disabled={exporting}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary[50] }]}>
              <Icon name="archive" size={28} color={colors.primary[500]} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Create Backup</Text>
              <Text style={styles.actionDescription}>
                Create a full system backup including all resources and user data
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={handleExportData}
            disabled={exporting}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accent[50] }]}>
              <Icon name="download" size={28} color={colors.accent[500]} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Export Data</Text>
              <Text style={styles.actionDescription}>
                Export all platform data as JSON for external analysis
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Recent Backups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Backups</Text>
          {latestBackup ? (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>{new Date(latestBackup.created_at).toLocaleString()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estimated Size</Text>
                <Text style={styles.infoValue}>{latestBackup.size_mb.toFixed(2)} MB</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Users</Text>
                <Text style={styles.infoValue}>{latestBackup.users_count}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Resources</Text>
                <Text style={styles.infoValue}>{latestBackup.resources_count}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Icon name="archive" size={40} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No Backup Metadata Yet</Text>
              <Text style={styles.emptyText}>
                Generate a backup summary to review current system coverage.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Export</Text>
          {latestExport ? (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Prepared</Text>
                <Text style={styles.infoValue}>{new Date(latestExport.export_date).toLocaleString()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Faculties</Text>
                <Text style={styles.infoValue}>{latestExport.faculties_count}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Departments</Text>
                <Text style={styles.infoValue}>{latestExport.departments_count}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Courses</Text>
                <Text style={styles.infoValue}>{latestExport.courses_count}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Icon name="download" size={40} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No Export Metadata Yet</Text>
              <Text style={styles.emptyText}>
                Export summaries will appear here after you run an export.
              </Text>
            </View>
          )}
        </View>

        {exporting && (
          <View style={styles.exportingOverlay}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.exportingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: 14,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    backgroundColor: colors.primary[500],
  },
  backButton: {
    padding: spacing[2],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  content: {
    padding: spacing[6],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  statsCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing[4],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing[2],
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  statusCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing[3],
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing[2],
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  actionDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[8],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing[3],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  exportingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportingText: {
    marginTop: spacing[3],
    fontSize: 16,
    color: colors.text.primary,
  },
});

export default BackupScreen;
