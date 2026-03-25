// Comprehensive Admin Dashboard for CampusHub
// A modern, data-rich control center for platform administration

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, Modal, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { adminAPI, resourcesAPI } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

// Types
interface AdminStats {
  total_users: number;
  total_students: number;
  total_admins: number;
  total_resources: number;
  pending_resources: number;
  approved_resources: number;
  rejected_resources: number;
  reported_resources: number;
  total_downloads: number;
  total_shares: number;
  total_study_groups: number;
  total_announcements: number;
  total_news: number;
  active_users_today: number;
  new_users_today: number;
  active_users_week: number;
  suspended_users: number;
}

interface PendingResource {
  id: string;
  title: string;
  uploaded_by: { first_name: string; last_name: string; email: string };
  course_name: string;
  created_at: string;
  status: string;
}

interface Report {
  id: string;
  reason: string;
  description: string;
  reporter: { first_name: string; last_name: string; full_name?: string };
  reported_resource?: { title: string; content?: string };
  status: string;
  created_at: string;
}

interface RecentActivity {
  id: string;
  action: string;
  description: string;
  user: string;
  created_at: string;
}

interface DashboardData {
  stats: AdminStats;
  pending_resources: PendingResource[];
  recent_reports: Report[];
  recent_activity: RecentActivity[];
  top_resources: any[];
  recent_uploads: any[];
  recent_users: any[];
  study_groups: any[];
}

const unwrapEnvelopeData = <T,>(response: any, fallback: T): T => {
  if (response?.data?.data !== undefined) {
    return response.data.data as T;
  }
  if (response?.data !== undefined) {
    return response.data as T;
  }
  return fallback;
};

const asArray = <T,>(value: any): T[] => (Array.isArray(value) ? value : []);

const toCount = (value: any): number => Number(value || 0);

const getUploaderLabel = (resource: any): string => {
  const fullName = [resource?.uploader?.first_name, resource?.uploader?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || resource?.uploaded_by || 'Unknown';
};

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch all needed data in parallel
      const [statsRes, resourcesRes, reportsRes] = await Promise.all([
        adminAPI.getSystemStats(),
        resourcesAPI.list({ page: 1, limit: 10 }),
        adminAPI.listReports({ status: 'open', page_size: 5 }),
      ]);

      const statsPayload = unwrapEnvelopeData<any>(statsRes, {});
      const statsSummary = statsPayload?.summary || {};
      const resourcesPayload = unwrapEnvelopeData<any>(resourcesRes, {});
      const recentUploads = asArray<any>(resourcesPayload?.results);
      const reportsPayload = unwrapEnvelopeData<any>(reportsRes, {});
      const recentReports = asArray<any>(reportsPayload?.results);

      // Build dashboard data
      const dashboardData: DashboardData = {
        stats: {
          total_users: toCount(statsSummary.total_users ?? statsPayload?.users?.total_users ?? statsPayload?.users?.total),
          total_students: toCount(statsSummary.total_students ?? statsPayload?.users?.total_students ?? statsPayload?.users?.students),
          total_admins: toCount(statsSummary.total_admins ?? statsPayload?.users?.total_admins ?? statsPayload?.users?.admins),
          total_resources: toCount(statsSummary.total_resources ?? statsPayload?.resources?.total_resources ?? statsPayload?.resources?.total),
          pending_resources: toCount(statsSummary.pending_resources ?? statsPayload?.resources?.pending_resources ?? statsPayload?.resources?.pending),
          approved_resources: toCount(statsSummary.approved_resources ?? statsPayload?.resources?.approved_resources ?? statsPayload?.resources?.approved),
          rejected_resources: toCount(statsSummary.rejected_resources ?? statsPayload?.resources?.rejected_resources ?? statsPayload?.resources?.rejected),
          reported_resources: toCount(statsSummary.reported_resources ?? statsPayload?.resources?.reported_resources),
          total_downloads: toCount(statsSummary.total_downloads ?? statsPayload?.resources?.total_downloads),
          total_shares: toCount(statsSummary.total_shares ?? statsPayload?.resources?.total_shares),
          total_study_groups: toCount(statsSummary.total_study_groups ?? statsPayload?.study_groups?.total_study_groups ?? statsPayload?.study_groups?.total),
          total_announcements: toCount(statsSummary.total_announcements ?? statsPayload?.announcements?.total_announcements ?? statsPayload?.announcements?.total),
          total_news: toCount(statsSummary.total_news ?? statsPayload?.announcements?.total_news),
          active_users_today: toCount(statsSummary.active_users_today ?? statsPayload?.users?.active_users_today ?? statsPayload?.users?.active_today),
          new_users_today: toCount(statsSummary.new_users_today ?? statsPayload?.users?.new_users_today ?? statsPayload?.users?.new_today),
          active_users_week: toCount(statsSummary.active_users_week ?? statsPayload?.users?.active_users_week ?? statsPayload?.users?.active_week),
          suspended_users: toCount(statsSummary.suspended_users ?? statsPayload?.users?.suspended_users ?? statsPayload?.users?.suspended),
        },
        pending_resources: [],
        recent_reports: recentReports.map((report: any) => ({
          id: String(report?.id || ''),
          reason: report?.reason || report?.reason_type || 'Report',
          description: report?.description || report?.message || '',
          reporter: report?.reported_by || { first_name: 'Unknown', last_name: '', full_name: 'Unknown' },
          reported_resource: report?.reported_content,
          status: report?.status || 'open',
          created_at: report?.created_at || '',
        })),
        recent_activity: [],
        top_resources: [],
        recent_uploads: recentUploads,
        recent_users: [],
        study_groups: [],
      };

      setData(dashboardData);
    } catch (err: any) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const stats = data?.stats || {
    total_users: 0, total_students: 0, total_admins: 0,
    total_resources: 0, pending_resources: 0, approved_resources: 0,
    rejected_resources: 0, reported_resources: 0, total_downloads: 0,
    total_shares: 0, total_study_groups: 0, total_announcements: 0,
    total_news: 0, active_users_today: 0, new_users_today: 0,
    active_users_week: 0, suspended_users: 0
  };

  const quickActions = [
    { id: '1', title: 'Review Flagged', subtitle: 'Check auto-held resources', icon: 'flag', route: '/(admin)/resources', color: colors.warning },
    { id: '2', title: 'Manage Users', subtitle: 'View & manage users', icon: 'people', route: '/(admin)/users', color: colors.primary[500] },
    { id: '3', title: 'Role Invites', subtitle: 'Send and track invites', icon: 'mail-unread', route: '/(admin)/invitations', color: colors.accent[500] },
    { id: '4', title: 'View Reports', subtitle: 'Review user reports', icon: 'flag', route: '/(admin)/reports', color: colors.error },
    { id: '5', title: 'Create Announcement', subtitle: 'Post to all users', icon: 'megaphone', route: '/(admin)/announcements', color: colors.warning },
    { id: '6', title: 'Analytics', subtitle: 'Platform insights', icon: 'stats-chart', route: '/(admin)/analytics', color: colors.info },
    { id: '7', title: 'System Health', subtitle: 'Server & storage', icon: 'hardware-chip', route: '/(admin)/system-health', color: colors.accent[500] },
  ];

  const menuItems = [
    { id: 'users', title: 'Users', subtitle: 'Manage users & roles', icon: 'people', route: '/(admin)/users', color: colors.primary[500] },
    { id: 'invitations', title: 'Invitations', subtitle: 'Role invites & CSV batches', icon: 'mail-unread', route: '/(admin)/invitations', color: colors.primary[700] },
    { id: 'resources', title: 'Resources', subtitle: 'Review & moderate', icon: 'document-text', route: '/(admin)/resources', color: colors.accent[500] },
    { id: 'faculties', title: 'Academic', subtitle: 'Faculties & courses', icon: 'school', route: '/(admin)/faculties', color: colors.info },
    { id: 'courses', title: 'Courses', subtitle: 'Manage courses', icon: 'book', route: '/(admin)/courses', color: colors.warning },
    { id: 'units', title: 'Units', subtitle: 'Manage units', icon: 'bookmark', route: '/(admin)/units', color: colors.success },
    { id: 'reports', title: 'Reports', subtitle: 'User reports', icon: 'flag', route: '/(admin)/reports', color: colors.error },
    { id: 'announcements', title: 'Announcements', subtitle: 'Post announcements', icon: 'megaphone', route: '/(admin)/announcements', color: colors.primary[600] },
    { id: 'study-groups', title: 'Study Groups', subtitle: 'Manage groups', icon: 'people-circle', route: '/(admin)/study-groups', color: colors.accent[600] },
    { id: 'analytics', title: 'Analytics', subtitle: 'Platform insights', icon: 'stats-chart', route: '/(admin)/analytics', color: colors.info },
    { id: 'backup', title: 'Backup', subtitle: 'System backup', icon: 'cloud', route: '/(admin)/backup', color: colors.accent[700] },
  ];

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logoText}>CampusHub</Text>
          <Text style={styles.headerSubtitle}>Admin Control Center</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/(admin)/search')}>
            <Icon name="search" size={22} color={colors.text.inverse} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/(admin)/notifications')}>
            <Icon name="notifications" size={22} color={colors.text.inverse} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/(admin)/profile')}>
            <Text style={styles.avatarText}>
              {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}{user?.last_name?.[0] || ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.welcomeText}>Welcome back, {user?.first_name || 'Admin'}!</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Platform Status Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusIndicator} />
          <Text style={styles.statusText}>Platform running normally</Text>
          {stats.pending_resources > 0 && (
            <TouchableOpacity onPress={() => router.push('/(admin)/resources')}>
              <Text style={styles.pendingAlert}>{stats.pending_resources} auto-held resources</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions Button */}
        <TouchableOpacity 
          style={styles.quickActionsCard} 
          onPress={() => setShowQuickActions(true)}
          activeOpacity={0.8}
        >
          <View style={styles.quickActionsIconContainer}>
            <Icon name="flash" size={24} color={colors.primary[500]} />
          </View>
          <View style={styles.quickActionsContent}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <Text style={styles.quickActionsSubtitle}>Access common admin tasks</Text>
          </View>
          <View style={styles.quickActionsArrow}>
            <Icon name="chevron-forward" size={22} color={colors.text.tertiary} />
          </View>
        </TouchableOpacity>

        {/* Main KPI Cards */}
        <Text style={styles.sectionTitle}>Platform Overview</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.primary[500] + '20' }]}>
              <Icon name="people" size={20} color={colors.primary[500]} />
            </View>
            <Text style={styles.kpiValue}>{stats.total_users.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Total Users</Text>
          </View>
          
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.success + '20' }]}>
              <Icon name="person" size={20} color={colors.success} />
            </View>
            <Text style={styles.kpiValue}>{stats.total_students.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Students</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.accent[500] + '20' }]}>
              <Icon name="document-text" size={20} color={colors.accent[500]} />
            </View>
            <Text style={styles.kpiValue}>{stats.total_resources.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Resources</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.warning + '20' }]}>
              <Icon name="time" size={20} color={colors.warning} />
            </View>
            <Text style={styles.kpiValue}>{stats.pending_resources}</Text>
            <Text style={styles.kpiLabel}>Auto-Held</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.error + '20' }]}>
              <Icon name="flag" size={20} color={colors.error} />
            </View>
            <Text style={styles.kpiValue}>{stats.reported_resources}</Text>
            <Text style={styles.kpiLabel}>Reported</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.info + '20' }]}>
              <Icon name="download" size={20} color={colors.info} />
            </View>
            <Text style={styles.kpiValue}>{stats.total_downloads.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Downloads</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.primary[600] + '20' }]}>
              <Icon name="people" size={20} color={colors.primary[600]} />
            </View>
            <Text style={styles.kpiValue}>{stats.total_study_groups}</Text>
            <Text style={styles.kpiLabel}>Study Groups</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.success + '20' }]}>
              <Icon name="megaphone" size={20} color={colors.success} />
            </View>
            <Text style={styles.kpiValue}>{stats.total_announcements}</Text>
            <Text style={styles.kpiLabel}>Announcements</Text>
          </View>
        </View>

        {/* User Activity Section */}
        <Text style={styles.sectionTitle}>User Activity</Text>
        <View style={styles.activityGrid}>
          <View style={[styles.activityCard, { backgroundColor: colors.success + '15' }]}>
            <Text style={styles.activityValue}>{stats.active_users_today}</Text>
            <Text style={styles.activityLabel}>Active Today</Text>
          </View>
          <View style={[styles.activityCard, { backgroundColor: colors.primary[500] + '15' }]}>
            <Text style={styles.activityValue}>{stats.new_users_today}</Text>
            <Text style={styles.activityLabel}>New Today</Text>
          </View>
          <View style={[styles.activityCard, { backgroundColor: colors.info + '15' }]}>
            <Text style={styles.activityValue}>{stats.active_users_week}</Text>
            <Text style={styles.activityLabel}>Active Week</Text>
          </View>
          <View style={[styles.activityCard, { backgroundColor: colors.error + '15' }]}>
            <Text style={styles.activityValue}>{stats.suspended_users}</Text>
            <Text style={styles.activityLabel}>Suspended</Text>
          </View>
        </View>

        {/* Resource Moderation */}
        <View style={styles.moderationSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resource Moderation</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/resources')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.moderationStats}>
            <View style={styles.modStat}>
              <Text style={[styles.modStatValue, { color: colors.warning }]}>{stats.pending_resources}</Text>
              <Text style={styles.modStatLabel}>Auto-Held</Text>
            </View>
            <View style={styles.modStat}>
              <Text style={[styles.modStatValue, { color: colors.success }]}>{stats.approved_resources}</Text>
              <Text style={styles.modStatLabel}>Approved</Text>
            </View>
            <View style={styles.modStat}>
              <Text style={[styles.modStatValue, { color: colors.error }]}>{stats.rejected_resources}</Text>
              <Text style={styles.modStatLabel}>Rejected</Text>
            </View>
          </View>
          {stats.pending_resources > 0 && (
            <TouchableOpacity 
              style={styles.moderationCta}
              onPress={() => router.push('/(admin)/resources')}
            >
              <Icon name="flag" size={20} color={colors.warning} />
              <Text style={styles.moderationCtaText}>Review {stats.pending_resources} auto-held resources</Text>
              <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Management Menu */}
        <Text style={styles.sectionTitle}>Quick Management</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.menuCard}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuIconBox, { backgroundColor: item.color + '20' }]}>
                <Icon name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.menuCardTitle}>{item.title}</Text>
              <Text style={styles.menuCardSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Uploads */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Uploads</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/resources')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {data?.recent_uploads?.slice(0, 3).map((resource: any) => (
            <View key={resource.id} style={styles.recentItem}>
              <View style={styles.recentIcon}>
                <Icon name="document-text" size={18} color={colors.primary[500]} />
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle} numberOfLines={1}>{resource.title}</Text>
                <Text style={styles.recentMeta}>
                  {getUploaderLabel(resource)} • {resource.course?.name || 'No course'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { 
                backgroundColor: resource.status === 'approved' ? colors.success + '20' : 
                               resource.status === 'pending' ? colors.warning + '20' : colors.error + '20' 
              }]}>
                <Text style={[styles.statusBadgeText, { 
                  color: resource.status === 'approved' ? colors.success : 
                         resource.status === 'pending' ? colors.warning : colors.error 
                }]}>
                  {resource.status || 'pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Reports Section */}
        <View style={styles.reportsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Open Reports</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/reports')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {data?.recent_reports && data.recent_reports.length > 0 ? (
            data.recent_reports?.slice(0, 3).map((report) => (
              <View key={report.id} style={styles.reportItem}>
                <View style={[styles.reportIcon, { backgroundColor: colors.error + '20' }]}>
                  <Icon name="flag" size={16} color={colors.error} />
                </View>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportTitle} numberOfLines={1}>{report.reason}</Text>
                  <Text style={styles.reportMeta}>
                    {report.reporter?.full_name || report.reporter?.first_name || 'Unknown'} • {new Date(report.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.reviewBtn}
                  onPress={() => router.push('/(admin)/reports' as any)}
                >
                  <Text style={styles.reviewBtnText}>Review</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="checkmark-circle" size={32} color={colors.success} />
              <Text style={styles.emptyText}>No open reports</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Quick Actions Modal */}
      <Modal visible={showQuickActions} animationType="slide" transparent onRequestClose={() => setShowQuickActions(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Actions</Text>
              <TouchableOpacity onPress={() => setShowQuickActions(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={quickActions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.quickActionItem}
                  onPress={() => {
                    setShowQuickActions(false);
                    router.push(item.route as any);
                  }}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: item.color + '20' }]}>
                    <Icon name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <View style={styles.quickActionInfo}>
                    <Text style={styles.quickActionTitle}>{item.title}</Text>
                    <Text style={styles.quickActionSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: spacing[3],
    fontSize: 14,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
    backgroundColor: colors.primary[500],
  },
  headerLeft: {},
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.inverse,
    opacity: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.text.inverse,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.background.primary,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  dateText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  quickActionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary[500] + '20',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
  },
  quickActionsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
    marginLeft: spacing[2],
  },
  quickActionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginVertical: spacing[3],
  },
  quickActionsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  quickActionsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  quickActionsSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  quickActionsArrow: {
    padding: spacing[1],
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 13,
    color: colors.text.primary,
    flex: 1,
  },
  pendingAlert: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    paddingHorizontal: spacing[4],
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  kpiCard: {
    width: '31%',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
    ...shadows.small,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  kpiLabel: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  activityGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  activityCard: {
    flex: 1,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  activityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  activityLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  moderationSection: {
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  viewAllText: {
    fontSize: 13,
    color: colors.primary[500],
    fontWeight: '500',
  },
  moderationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[3],
  },
  modStat: {
    alignItems: 'center',
  },
  modStatValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  modStatLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  moderationCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  moderationCtaText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.success,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  menuCard: {
    width: '31%',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
    ...shadows.small,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  menuCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  menuCardSubtitle: {
    fontSize: 9,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
  recentSection: {
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[500] + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  recentMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  reportsSection: {
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  reportIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  reportMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  reviewBtn: {
    backgroundColor: colors.primary[500] + '20',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  reviewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[500],
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing[6],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },
  bottomSpacer: {
    height: spacing[10],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionInfo: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
});

export default AdminDashboard;
