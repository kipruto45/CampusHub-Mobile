import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Icon from '../../components/ui/Icon';
import api,{ adminAPI,getAuthToken } from '../../services/api';
import { localDownloadsService } from '../../services/local-downloads.service';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

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
  study_groups_count?: number;
  announcements_count?: number;
  includes: string[];
  download_url?: string;
}

interface ExportInfo {
  export_date: string;
  generated_at?: string;
  exported_by?: string;
  faculties_count: number;
  departments_count: number;
  courses_count: number;
  units_count?: number;
  users_count?: number;
  resources_count?: number;
  study_groups_count?: number;
  announcements_count?: number;
  available_formats?: string[];
  download_urls?: Record<string, string>;
  format?: ExportFormat;
}

type ExportFormat = 'csv' | 'pdf' | 'excel';

const EXPORT_FORMATS: {
  key: ExportFormat;
  label: string;
  icon: string;
  description: string;
  mimeType: string;
  extension: string;
}[] = [
  {
    key: 'csv',
    label: 'CSV',
    icon: 'grid',
    description: 'Spreadsheet-ready rows for quick analysis.',
    mimeType: 'text/csv',
    extension: 'csv',
  },
  {
    key: 'pdf',
    label: 'PDF',
    icon: 'document-text',
    description: 'Portable export for sharing and printing.',
    mimeType: 'application/pdf',
    extension: 'pdf',
  },
  {
    key: 'excel',
    label: 'Excel',
    icon: 'bar-chart',
    description: 'Excel-compatible workbook with separate sheets.',
    mimeType: 'application/vnd.ms-excel',
    extension: 'xls',
  },
];

const buildApiDownloadUrl = (path: string, params?: Record<string, string>) => {
  const baseUrl = String(api.defaults.baseURL || '').replace(/\/+$/, '');
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  const queryString = new URLSearchParams(
    Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null)
  ).toString();

  return `${baseUrl}/${normalizedPath}${queryString ? `?${queryString}` : ''}`;
};

const describeDownloadResult = (status: string, noun: string) => {
  switch (status) {
    case 'saved':
      return `${noun} downloaded and saved to device storage.`;
    case 'shared':
      return `${noun} downloaded. The share sheet is open so you can save it.`;
    case 'browser':
      return `${noun} opened in the browser.`;
    case 'already_saved':
      return `${noun} is already saved on this device.`;
    case 'cancelled':
      return `Download finished, but saving to device was cancelled.`;
    default:
      return `${noun} downloaded successfully.`;
  }
};

const formatTimestamp = (value?: string) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const BackupScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
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

  const selectedFormatMeta = useMemo(
    () => EXPORT_FORMATS.find((format) => format.key === selectedFormat) || EXPORT_FORMATS[0],
    [selectedFormat]
  );

  const downloadAdminFile = useCallback(
    async (params: {
      key: string;
      endpoint: string;
      query?: Record<string, string>;
      fileName: string;
      mimeType: string;
      title: string;
      noun: string;
    }) => {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Your session expired. Please sign in again.');
      }

      const remoteUrl = buildApiDownloadUrl(params.endpoint, params.query);
      await localDownloadsService.ensureLocalFile({
        key: params.key,
        remoteUrl,
        fileName: params.fileName,
        title: params.title,
        mimeType: params.mimeType,
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const saveResult = await localDownloadsService.saveCopyToDevice(params.key);
      Alert.alert('Download ready', describeDownloadResult(saveResult.status, params.noun));
    },
    []
  );

  const handleCreateBackup = useCallback(() => {
    Alert.alert(
      'Create Backup',
      'This will generate a full system backup and download it. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create & Download',
          onPress: async () => {
            try {
              setProcessing(true);
              const response = await adminAPI.createBackup();
              const backup = response.data?.data as BackupInfo;
              setLatestBackup(backup);

              await downloadAdminFile({
                key: `admin-backup-${backup.backup_id || Date.now()}`,
                endpoint: 'admin-management/backup/',
                query: { download: '1' },
                fileName: `campushub_backup_${backup.backup_id || Date.now()}.json`,
                mimeType: 'application/json',
                title: 'CampusHub backup',
                noun: 'Backup',
              });
            } catch (err: any) {
              Alert.alert(
                'Backup failed',
                err?.message ||
                  err?.response?.data?.message ||
                  'Unable to create and download the backup right now.'
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  }, [downloadAdminFile]);

  const handleExportData = useCallback(() => {
    Alert.alert(
      'Export Data',
      `Generate a ${selectedFormatMeta.label} export and download it?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export & Download',
          onPress: async () => {
            try {
              setProcessing(true);
              const response = await adminAPI.exportData();
              const exportMeta = {
                ...(response.data?.data as ExportInfo),
                format: selectedFormat,
              };
              setLatestExport(exportMeta);

              const exportStamp =
                exportMeta.generated_at ||
                exportMeta.export_date ||
                new Date().toISOString();
              const fileSuffix = exportStamp.replace(/[:.]/g, '-');

              await downloadAdminFile({
                key: `admin-export-${selectedFormat}-${fileSuffix}`,
                endpoint: 'admin-management/export/',
                query: {
                  download: '1',
                  format: selectedFormat,
                },
                fileName: `campushub_export_${fileSuffix}.${selectedFormatMeta.extension}`,
                mimeType: selectedFormatMeta.mimeType,
                title: `CampusHub ${selectedFormatMeta.label} export`,
                noun: `${selectedFormatMeta.label} export`,
              });
            } catch (err: any) {
              Alert.alert(
                'Export failed',
                err?.message ||
                  err?.response?.data?.message ||
                  'Unable to export data right now.'
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  }, [downloadAdminFile, selectedFormat, selectedFormatMeta]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading backup tools...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Backup & Export</Text>
        <TouchableOpacity onPress={fetchSystemStats} style={styles.backButton}>
          <Icon name="refresh" size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Icon name="people" size={22} color={colors.primary[500]} />
              <Text style={styles.statValue}>{systemStats?.total_users || 0}</Text>
              <Text style={styles.statLabel}>Users</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="document-text" size={22} color={colors.accent[500]} />
              <Text style={styles.statValue}>{systemStats?.total_resources || 0}</Text>
              <Text style={styles.statLabel}>Resources</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="activity" size={22} color={colors.info} />
              <Text style={styles.statValue}>{systemStats?.activities_today || 0}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="cloud" size={22} color={colors.warning} />
              <Text style={styles.statValue}>
                {(systemStats?.total_storage_used_gb || 0).toFixed(2)} GB
              </Text>
              <Text style={styles.statLabel}>Storage</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Backup</Text>
          <TouchableOpacity
            style={[styles.actionCard, processing && styles.actionCardDisabled]}
            onPress={handleCreateBackup}
            disabled={processing}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary[50] }]}>
              <Icon name="archive" size={26} color={colors.primary[500]} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Create and Download Backup</Text>
              <Text style={styles.actionDescription}>
                Generates a JSON backup snapshot covering users, resources, groups, announcements, and academic data.
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>

          {latestBackup ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Latest Backup</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>
                  {formatTimestamp(latestBackup.created_at)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estimated size</Text>
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
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Study groups</Text>
                <Text style={styles.infoValue}>{latestBackup.study_groups_count || 0}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Data</Text>
          <View style={styles.formatRow}>
            {EXPORT_FORMATS.map((format) => (
              <TouchableOpacity
                key={format.key}
                style={[
                  styles.formatCard,
                  selectedFormat === format.key && styles.formatCardActive,
                ]}
                onPress={() => setSelectedFormat(format.key)}
              >
                <Icon
                  name={format.icon as any}
                  size={20}
                  color={selectedFormat === format.key ? colors.text.inverse : colors.primary[500]}
                />
                <Text
                  style={[
                    styles.formatTitle,
                    selectedFormat === format.key && styles.formatTitleActive,
                  ]}
                >
                  {format.label}
                </Text>
                <Text
                  style={[
                    styles.formatDescription,
                    selectedFormat === format.key && styles.formatDescriptionActive,
                  ]}
                >
                  {format.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.actionCard, processing && styles.actionCardDisabled]}
            onPress={handleExportData}
            disabled={processing}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accent[50] }]}>
              <Icon name="download" size={26} color={colors.accent[500]} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Export {selectedFormatMeta.label} and Download</Text>
              <Text style={styles.actionDescription}>
                Exports users, resources, groups, announcements, and academic structure in {selectedFormatMeta.label} format.
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>

          {latestExport ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Latest Export</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Prepared</Text>
                <Text style={styles.infoValue}>
                  {formatTimestamp(latestExport.export_date || latestExport.generated_at)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Format</Text>
                <Text style={styles.infoValue}>{(latestExport.format || selectedFormat).toUpperCase()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Users</Text>
                <Text style={styles.infoValue}>{latestExport.users_count || 0}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Resources</Text>
                <Text style={styles.infoValue}>{latestExport.resources_count || 0}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Study groups</Text>
                <Text style={styles.infoValue}>{latestExport.study_groups_count || 0}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Announcements</Text>
                <Text style={styles.infoValue}>{latestExport.announcements_count || 0}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {processing ? (
          <View style={styles.processingCard}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
            <Text style={styles.processingText}>Generating file and preparing download...</Text>
          </View>
        ) : null}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  content: {
    padding: spacing[5],
    paddingBottom: spacing[8],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  statValue: {
    marginTop: spacing[3],
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    marginTop: spacing[1],
    fontSize: 12,
    color: colors.text.secondary,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[4],
  },
  actionBody: {
    flex: 1,
    marginRight: spacing[3],
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  actionDescription: {
    marginTop: spacing[1],
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  formatRow: {
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  formatCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  formatCardActive: {
    backgroundColor: colors.primary[500],
  },
  formatTitle: {
    marginTop: spacing[3],
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  formatTitleActive: {
    color: colors.text.inverse,
  },
  formatDescription: {
    marginTop: spacing[1],
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  formatDescriptionActive: {
    color: 'rgba(255,255,255,0.86)',
  },
  infoCard: {
    marginTop: spacing[3],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  processingCard: {
    marginTop: spacing[2],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    ...shadows.sm,
  },
  processingText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
});

export default BackupScreen;
