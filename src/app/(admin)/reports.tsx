// Admin Reports Management for CampusHub
// View and manage user-generated reports

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,Alert,FlatList,RefreshControl,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';
type ReportType = 'resource' | 'comment' | 'unknown';

interface Report {
  id: string;
  report_type: ReportType;
  reason: string;
  description: string;
  status: ReportStatus;
  reported_by: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  reported_content?: {
    type: string;
    id: string;
    title?: string;
    content?: string;
  };
  created_at: string;
  resolved_at?: string;
  resolved_by?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

const ReportsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<ReportStatus | 'all'>('all');

  const fetchReports = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setError(null);
      }
      
      const params: any = {};
      if (selectedFilter !== 'all') {
        params.status = selectedFilter;
      }

      const response = await adminAPI.listReports(params);
      setReports(response.data?.data?.results || []);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    fetchReports(true);
  }, [fetchReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports(true);
  }, [fetchReports]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    fetchReports(true);
  }, [fetchReports]);

  const handleUpdateStatus = async (reportId: string, newStatus: ReportStatus) => {
    try {
      if (newStatus === 'resolved') {
        await adminAPI.resolveReport(reportId);
      } else if (newStatus === 'dismissed') {
        await adminAPI.dismissReport(reportId);
      } else {
        await adminAPI.updateReport(reportId, { status: newStatus });
      }
      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, status: newStatus } : r
      ));
      Alert.alert('Success', `Report marked as ${newStatus}`);
    } catch (_err: any) {
      Alert.alert('Error', 'Failed to update report');
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'resolved':
        return colors.success;
      case 'in_review':
        return colors.info;
      case 'dismissed':
        return colors.text.tertiary;
      default:
        return colors.warning;
    }
  };

  const getTypeIcon = (type: ReportType) => {
    switch (type) {
      case 'resource':
        return 'document-text';
      case 'comment':
        return 'chatbubble';
      default:
        return 'flag';
    }
  };

  const renderReportItem = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={styles.reportCard}
      activeOpacity={0.9}
      onPress={() => router.push(`/(admin)/report-detail?id=${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: colors.primary[500] + '20' }]}>
          <Icon name={getTypeIcon(item.report_type) as any} size={14} color={colors.primary[500]} />
          <Text style={[styles.typeText, { color: colors.primary[500], marginLeft: 4 }]}>
            {item.report_type.charAt(0).toUpperCase() + item.report_type.slice(1)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <Text style={styles.reportReason}>{item.reason}</Text>
      <Text style={styles.reportDescription} numberOfLines={2}>{item.description}</Text>

      <View style={styles.reporterInfo}>
        <Icon name="person" size={12} color={colors.text.tertiary} />
        <Text style={styles.reporterText}>
          {`${item.reported_by?.first_name || ''} ${item.reported_by?.last_name || ''}`.trim() || item.reported_by?.email || 'Unknown reporter'}
        </Text>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      {item.status === 'open' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.success + '20' }]}
            onPress={() => handleUpdateStatus(item.id, 'resolved')}
          >
            <Icon name="checkmark" size={16} color={colors.success} />
            <Text style={[styles.actionBtnText, { color: colors.success }]}>Resolve</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.info + '20' }]}
            onPress={() => handleUpdateStatus(item.id, 'in_review')}
          >
            <Icon name="eye" size={16} color={colors.info} />
            <Text style={[styles.actionBtnText, { color: colors.info }]}>Review</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.error + '20' }]}
            onPress={() => handleUpdateStatus(item.id, 'dismissed')}
          >
            <Icon name="close" size={16} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const filters: { key: ReportStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'in_review', label: 'In Review' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'dismissed', label: 'Dismissed' },
  ];

  const pendingCount = reports.filter(r => r.status === 'open').length;

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !reports.length) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>User Reports</Text>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>
            {reports.filter(r => r.status === 'open').length}
          </Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.info }]}>
            {reports.filter(r => r.status === 'in_review').length}
          </Text>
          <Text style={styles.statLabel}>In Review</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.success }]}>
            {reports.filter(r => r.status === 'resolved').length}
          </Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.text.tertiary }]}>
            {reports.filter(r => r.status === 'dismissed').length}
          </Text>
          <Text style={styles.statLabel}>Dismissed</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[styles.filterTab, selectedFilter === filter.key && styles.filterTabActive]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Text style={[styles.filterTabText, selectedFilter === filter.key && styles.filterTabTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reports List */}
      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="flag" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No reports found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    paddingTop: spacing[8],
    backgroundColor: colors.primary[500],
  },
  backButton: {
    padding: spacing[1],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[2],
    backgroundColor: colors.background.primary,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
    ...shadows.sm,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.warning,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
    backgroundColor: colors.background.primary,
    flexWrap: 'wrap',
  },
  filterTab: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
  },
  filterTabActive: {
    backgroundColor: colors.primary[500],
  },
  filterTabText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.text.inverse,
  },
  listContent: {
    padding: spacing[4],
  },
  reportCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reportReason: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  reportDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
    gap: spacing[1],
  },
  reporterText: {
    fontSize: 12,
    color: colors.text.tertiary,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing[3],
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing[3],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    gap: spacing[1],
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.tertiary,
    marginTop: spacing[2],
  },
});

export default ReportsScreen;
