// Comprehensive Admin Dashboard for CampusHub
// A modern, data-rich control center for platform administration

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../components/ui/Icon';
import { adminAPI,resourcesAPI } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';
import {
  AdminFeaturePermissions,
  AdminFeatureRequirement,
  AdminScopeInfo,
  countEnabledAdminPermissions,
  formatAdminRoleLabel,
  formatAdminScopeLabel,
  hasAdminAccess,
  normalizeAdminFeaturePermissions,
} from '../../utils/admin-access';

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
  route: string;
  icon: string;
  color: string;
}

interface AdminRecentUser {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  is_verified?: boolean;
  date_joined?: string;
  profile?: {
    department?: string;
    course?: string;
  };
}

interface AdminStudyGroup {
  id: string;
  name: string;
  course_name?: string;
  member_count?: number;
  privacy?: string;
  status?: string;
  created_by_name?: string;
  created_at?: string;
}

interface SystemHealthSnapshot {
  database?: {
    healthy?: boolean;
  };
  api?: {
    status?: string;
  };
  error_rates?: {
    errors_last_24h?: number;
  };
  active_users?: {
    last_24h?: number;
  };
}

interface DashboardData {
  stats: AdminStats;
  pending_resources: PendingResource[];
  recent_reports: Report[];
  recent_activity: RecentActivity[];
  top_resources: any[];
  recent_uploads: any[];
  recent_users: AdminRecentUser[];
  study_groups: AdminStudyGroup[];
  system_health: SystemHealthSnapshot | null;
}

interface AdminPriorityCard {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  route: string;
  icon: string;
  color: string;
  feature?: AdminFeatureRequirement;
}

interface AdminWorkspaceAction {
  id: string;
  label: string;
  route: string;
  badge?: string;
  feature?: AdminFeatureRequirement;
}

interface AdminWorkspaceGroup {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  actions: AdminWorkspaceAction[];
  feature?: AdminFeatureRequirement;
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

const getReportLabel = (report: any): string => {
  if (report?.reporter?.full_name) return report.reporter.full_name;
  if (report?.reporter?.first_name) {
    return [report.reporter.first_name, report.reporter.last_name].filter(Boolean).join(' ');
  }
  return 'Unknown';
};

const getResourceTitle = (report: any): string => {
  return report?.reported_resource?.title || report?.reported_resource?.content?.substring(0, 50) || 'Unknown Resource';
};

const formatRelativeDate = (value?: string): string => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getRouteRequirement = (route: string): AdminFeatureRequirement | undefined => {
  if (route.startsWith('/(admin)/users') || route === '/(admin)/invitations') {
    return 'manage_users';
  }
  if (
    route === '/(admin)/resources' ||
    route === '/(admin)/reports' ||
    route === '/(admin)/announcements' ||
    route === '/(admin)/ai-moderation' ||
    route === '/(admin)/study-groups'
  ) {
    return 'moderate_content';
  }
  if (
    route === '/(admin)/analytics' ||
    route === '/(admin)/email-campaigns' ||
    route === '/(admin)/api-usage' ||
    route === '/(admin)/predictive-analytics'
  ) {
    return 'view_analytics';
  }
  if (
    route === '/(admin)/faculties' ||
    route === '/(admin)/academic-management' ||
    route === '/(admin)/courses' ||
    route === '/(admin)/calendar'
  ) {
    return ['manage_faculties', 'manage_departments'];
  }
  if (route === '/(admin)/departments') {
    return 'manage_departments';
  }
  if (route === '/(admin)/referrals') {
    return 'manage_referrals';
  }
  if (route === '/(admin)/payments') {
    return 'manage_payments';
  }
  if (route === '/(admin)/subscriptions') {
    return 'manage_billing';
  }
  if (
    route === '/(admin)/reports-export' ||
    route === '/(admin)/backup'
  ) {
    return 'export_data';
  }
  if (
    route === '/(admin)/system-health' ||
    route === '/(admin)/storage' ||
    route === '/(admin)/workflows' ||
    route === '/(admin)/settings'
  ) {
    return 'system_settings';
  }
  return undefined;
};

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [scopeInfo, setScopeInfo] = useState<AdminScopeInfo | null>(null);
  const [featurePermissions, setFeaturePermissions] = useState<AdminFeaturePermissions | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch all needed data in parallel
      const [statsRes, resourcesRes, reportsRes, usersRes, studyGroupsRes, healthRes, scopeRes, featureAccessRes] = await Promise.all([
        adminAPI.getSystemStats(),
        resourcesAPI.list({ page: 1, limit: 10 }),
        adminAPI.listReports({ status: 'open', page_size: 5 }),
        adminAPI.listUsers({ page: 1, page_size: 5 }),
        adminAPI.listStudyGroups({ page: 1, page_size: 5 }),
        adminAPI.getSystemHealth().catch(() => null),
        adminAPI.getScopeInfo().catch(() => null),
        adminAPI.getFeatureAccess().catch(() => null),
      ]);

      const statsPayload = unwrapEnvelopeData<any>(statsRes, {});
      const statsSummary = statsPayload?.summary || {};
      const resourcesPayload = unwrapEnvelopeData<any>(resourcesRes, {});
      const recentUploads = asArray<any>(resourcesPayload?.results);
      const reportsPayload = unwrapEnvelopeData<any>(reportsRes, {});
      const recentReports = asArray<any>(reportsPayload?.results);
      const usersPayload = unwrapEnvelopeData<any>(usersRes, {});
      const recentUsers = asArray<AdminRecentUser>(usersPayload?.results);
      const studyGroupsPayload = unwrapEnvelopeData<any>(studyGroupsRes, {});
      const recentStudyGroups = asArray<AdminStudyGroup>(studyGroupsPayload?.results);
      const systemHealth = healthRes ? unwrapEnvelopeData<SystemHealthSnapshot | null>(healthRes, null) : null;
      const scopePayload = scopeRes ? unwrapEnvelopeData<any>(scopeRes, {}) : {};
      const featurePayload = featureAccessRes ? unwrapEnvelopeData<any>(featureAccessRes, {}) : {};

      const recentActivity: RecentActivity[] = [
        ...recentUploads.map((resource: any) => ({
          id: `upload-${resource.id}`,
          action: 'upload',
          description: `Uploaded ${resource.title || 'a resource'}`,
          user: getUploaderLabel(resource),
          created_at: resource.created_at || '',
          route: '/(admin)/resources',
          icon: 'cloud-upload',
          color: colors.success,
        })),
        ...recentReports.map((report: any) => ({
          id: `report-${report.id}`,
          action: 'report',
          description: `${report.reason || 'Report'} on ${getResourceTitle(report)}`,
          user: getReportLabel(report),
          created_at: report.created_at || '',
          route: '/(admin)/reports',
          icon: 'flag',
          color: colors.error,
        })),
        ...recentUsers.map((recentUser: AdminRecentUser) => ({
          id: `user-${recentUser.id}`,
          action: 'user',
          description: `Joined as ${String(recentUser.role || 'student').replace(/_/g, ' ')}`,
          user: recentUser.full_name || recentUser.email || 'User',
          created_at: recentUser.date_joined || '',
          route: '/(admin)/users',
          icon: 'person-add',
          color: colors.primary[500],
        })),
      ]
        .sort(
          (left, right) =>
            new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        )
        .slice(0, 6);

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
        recent_activity: recentActivity,
        top_resources: [],
        recent_uploads: recentUploads,
        recent_users: recentUsers,
        study_groups: recentStudyGroups,
        system_health: systemHealth,
      };

      setData(dashboardData);
      setScopeInfo((scopePayload?.scope || null) as AdminScopeInfo | null);
      setFeaturePermissions(normalizeAdminFeaturePermissions(featurePayload?.permissions || {}));
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
  const systemHealth = data?.system_health;
  const apiStatus = String(systemHealth?.api?.status || 'unknown').toLowerCase();
  const errorsLast24h = Number(systemHealth?.error_rates?.errors_last_24h || 0);
  const isSystemHealthy =
    (systemHealth?.database?.healthy ?? true) &&
    apiStatus !== 'error' &&
    errorsLast24h === 0;
  const statusHeadline = isSystemHealthy ? 'Platform running normally' : 'System attention needed';
  const statusMeta = isSystemHealthy
    ? `${Number(systemHealth?.active_users?.last_24h || stats.active_users_today).toLocaleString()} active users in the last 24 hours`
    : `${errorsLast24h.toLocaleString()} errors detected in the last 24 hours`;
  const hasAccess = (requirement?: AdminFeatureRequirement) =>
    hasAdminAccess(featurePermissions, requirement);
  const canManageUsers = hasAccess('manage_users');
  const canModerateContent = hasAccess('moderate_content');
  const scopeLabel = formatAdminScopeLabel(scopeInfo);
  const roleLabel = formatAdminRoleLabel(scopeInfo?.role);
  const enabledPermissionsCount = countEnabledAdminPermissions(featurePermissions);

  const quickActions: {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    route: string;
    color: string;
    feature?: AdminFeatureRequirement;
  }[] = [
    { id: '1', title: 'Review Flagged', subtitle: 'Check auto-held resources', icon: 'flag', route: '/(admin)/resources', color: colors.warning, feature: 'moderate_content' },
    { id: '2', title: 'Manage Users', subtitle: 'View & manage users', icon: 'people', route: '/(admin)/users', color: colors.primary[500], feature: 'manage_users' },
    { id: '3', title: 'Role Invites', subtitle: 'Send and track invites', icon: 'mail-unread', route: '/(admin)/invitations', color: colors.accent[500], feature: 'manage_users' },
    { id: '4', title: 'View Reports', subtitle: 'Review user reports', icon: 'flag', route: '/(admin)/reports', color: colors.error, feature: 'moderate_content' },
    { id: '5', title: 'Create Announcement', subtitle: 'Post to all users', icon: 'megaphone', route: '/(admin)/announcements', color: colors.warning, feature: 'moderate_content' },
    { id: '6', title: 'Analytics', subtitle: 'Platform insights', icon: 'stats-chart', route: '/(admin)/analytics', color: colors.info, feature: 'view_analytics' },
    { id: '7', title: 'System Health', subtitle: 'Server & storage', icon: 'hardware-chip', route: '/(admin)/system-health', color: colors.accent[500], feature: 'system_settings' },
  ];

  const priorityCards: AdminPriorityCard[] = [
    {
      id: 'moderation',
      title: 'Moderation Queue',
      value: stats.pending_resources.toLocaleString(),
      subtitle: 'auto-held resources waiting for review',
      route: '/(admin)/resources',
      icon: 'flag',
      color: colors.warning,
      feature: 'moderate_content',
    },
    {
      id: 'reports',
      title: 'Reports & Flags',
      value: stats.reported_resources.toLocaleString(),
      subtitle: 'reported items raised by the community',
      route: '/(admin)/reports',
      icon: 'alert-circle',
      color: colors.error,
      feature: 'moderate_content',
    },
    {
      id: 'users',
      title: 'New Users Today',
      value: stats.new_users_today.toLocaleString(),
      subtitle: 'fresh accounts to onboard and verify',
      route: '/(admin)/users',
      icon: 'person-add',
      color: colors.primary[500],
      feature: 'manage_users',
    },
    {
      id: 'announcements',
      title: 'Published Updates',
      value: stats.total_announcements.toLocaleString(),
      subtitle: 'announcements and notices live on campus',
      route: '/(admin)/announcements',
      icon: 'megaphone',
      color: colors.success,
      feature: 'moderate_content',
    },
  ];

  const workspaceGroups: AdminWorkspaceGroup[] = [
    {
      id: 'people',
      title: 'People & Access',
      description: 'Manage users, roles, invitations, notifications, and account oversight.',
      icon: 'people',
      color: colors.primary[500],
      feature: 'manage_users',
      actions: [
        { id: 'users', label: 'Users', route: '/(admin)/users', badge: stats.total_users.toLocaleString(), feature: 'manage_users' },
        { id: 'invitations', label: 'Invitations', route: '/(admin)/invitations', feature: 'manage_users' },
        { id: 'notifications', label: 'Notifications', route: '/(admin)/admin-notifications' },
        { id: 'activity-log', label: 'Activity Log', route: '/(admin)/activity-log', feature: 'moderate_content' },
      ],
    },
    {
      id: 'academic',
      title: 'Academic Structure',
      description: 'Keep the campus catalog accurate across faculties, departments, courses, units, and timetables.',
      icon: 'school',
      color: colors.info,
      feature: ['manage_faculties', 'manage_departments'],
      actions: [
        { id: 'academic-management', label: 'Academic Mgmt', route: '/(admin)/academic-management', feature: ['manage_faculties', 'manage_departments'] },
        { id: 'faculties', label: 'Faculties', route: '/(admin)/faculties', feature: 'manage_faculties' },
        { id: 'courses', label: 'Courses', route: '/(admin)/courses', feature: ['manage_faculties', 'manage_departments'] },
        { id: 'calendar', label: 'Calendar', route: '/(admin)/calendar', feature: ['manage_faculties', 'manage_departments'] },
      ],
    },
    {
      id: 'content',
      title: 'Content & Moderation',
      description: 'Moderate learning resources, study groups, announcements, and safety signals from the platform.',
      icon: 'document-text',
      color: colors.accent[500],
      feature: 'moderate_content',
      actions: [
        { id: 'resources', label: 'Resources', route: '/(admin)/resources', badge: stats.total_resources.toLocaleString(), feature: 'moderate_content' },
        { id: 'reports', label: 'Reports', route: '/(admin)/reports', badge: stats.reported_resources.toLocaleString(), feature: 'moderate_content' },
        { id: 'announcements', label: 'Announcements', route: '/(admin)/announcements', feature: 'moderate_content' },
        { id: 'ai-moderation', label: 'AI Moderation', route: '/(admin)/ai-moderation', feature: 'moderate_content' },
      ],
    },
    {
      id: 'insights',
      title: 'Insights & Growth',
      description: 'Track analytics, campaigns, engagement, gamification, and predictive signals.',
      icon: 'stats-chart',
      color: colors.success,
      feature: 'view_analytics',
      actions: [
        { id: 'analytics', label: 'Analytics', route: '/(admin)/analytics', feature: 'view_analytics' },
        { id: 'email-campaigns', label: 'Campaigns', route: '/(admin)/email-campaigns', feature: 'view_analytics' },
        { id: 'api-usage', label: 'API Usage', route: '/(admin)/api-usage', feature: 'view_analytics' },
        { id: 'predictive', label: 'Predictive', route: '/(admin)/predictive-analytics', feature: 'view_analytics' },
      ],
    },
    {
      id: 'revenue',
      title: 'Revenue & Access',
      description: 'Track referral growth, payments, subscriptions, and the admin permissions returned by the backend.',
      icon: 'card',
      color: colors.primary[600],
      feature: ['manage_referrals', 'manage_payments', 'manage_billing'],
      actions: [
        { id: 'referrals', label: 'Referrals', route: '/(admin)/referrals', feature: 'manage_referrals' },
        { id: 'payments', label: 'Payments', route: '/(admin)/payments', feature: 'manage_payments' },
        { id: 'subscriptions', label: 'Subscriptions', route: '/(admin)/subscriptions', feature: 'manage_billing' },
        { id: 'scope', label: 'Scope', route: '/(admin)/scope' },
        { id: 'feature-access', label: 'Feature Access', route: '/(admin)/feature-access' },
      ],
    },
    {
      id: 'platform',
      title: 'Platform Operations',
      description: 'Monitor system health, storage, automation, integrations, backups, and dashboard tooling.',
      icon: 'hardware-chip',
      color: colors.warning,
      feature: 'system_settings',
      actions: [
        { id: 'system-health', label: 'System Health', route: '/(admin)/system-health', feature: 'system_settings' },
        { id: 'storage', label: 'Storage', route: '/(admin)/storage', feature: 'system_settings' },
        { id: 'backup', label: 'Backup', route: '/(admin)/backup', feature: 'export_data' },
        { id: 'workflows', label: 'Workflows', route: '/(admin)/workflows', feature: 'system_settings' },
      ],
    },
  ];
  const visibleQuickActions = quickActions.filter((item) => hasAccess(item.feature));
  const visiblePriorityCards = priorityCards.filter((item) => hasAccess(item.feature));
  const visibleWorkspaceGroups = workspaceGroups
    .map((group) => ({
      ...group,
      actions: group.actions.filter((action) => hasAccess(action.feature)),
    }))
    .filter((group) => hasAccess(group.feature) && group.actions.length > 0);
  const visibleOperationsFeed = (data?.recent_activity || []).filter((item) =>
    hasAccess(getRouteRequirement(item.route))
  );

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

        <View style={styles.scopeCard}>
          <View style={styles.scopeHeader}>
            <View>
              <Text style={styles.scopeTitle}>{roleLabel}</Text>
              <Text style={styles.scopeSubtitle}>{scopeLabel}</Text>
            </View>
            <View style={styles.scopeBadge}>
              <Text style={styles.scopeBadgeText}>
                {enabledPermissionsCount > 0 ? `${enabledPermissionsCount} enabled` : 'Permissions loading'}
              </Text>
            </View>
          </View>
          <Text style={styles.scopeMeta}>
            The dashboard is trimming actions to match the backend feature access returned for this admin account.
          </Text>
        </View>

        {/* Platform Status Banner */}
        <View style={styles.statusBanner}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: isSystemHealthy ? colors.success : colors.error },
            ]}
          />
          <View style={styles.statusCopy}>
            <Text style={styles.statusText}>{statusHeadline}</Text>
            <Text style={styles.statusMeta}>{statusMeta}</Text>
          </View>
          {stats.pending_resources > 0 && canModerateContent ? (
            <TouchableOpacity onPress={() => router.push('/(admin)/resources')}>
              <Text style={styles.pendingAlert}>{stats.pending_resources} auto-held</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() =>
                router.push((hasAccess('system_settings') ? '/(admin)/system-health' : '/(admin)/scope') as any)
              }
            >
              <Text style={styles.pendingAlert}>Open health</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions Button */}
        {visibleQuickActions.length > 0 ? (
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
        ) : null}

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
        {canModerateContent ? (
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
        ) : null}

        {/* Priority Queues */}
        {visiblePriorityCards.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Priority Queues</Text>
            <View style={styles.priorityGrid}>
              {visiblePriorityCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.priorityCard}
                  onPress={() => router.push(card.route as any)}
                >
                  <View style={[styles.priorityIcon, { backgroundColor: card.color + '18' }]}>
                    <Icon name={card.icon as any} size={20} color={card.color} />
                  </View>
                  <Text style={styles.priorityValue}>{card.value}</Text>
                  <Text style={styles.priorityTitle}>{card.title}</Text>
                  <Text style={styles.prioritySubtitle}>{card.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {/* Django Admin Workspaces */}
        <View style={styles.sectionNoteWrap}>
          <Text style={styles.sectionNote}>
            These workspaces mirror the major areas exposed in the Django admin and the expanded admin app, but organized for faster mobile decision-making.
          </Text>
        </View>
        <Text style={styles.sectionTitle}>Admin Workspaces</Text>
        <View style={styles.workspaceStack}>
          {visibleWorkspaceGroups.map((group) => (
            <View key={group.id} style={styles.workspaceCard}>
              <View style={styles.workspaceHeader}>
                <View style={[styles.workspaceIcon, { backgroundColor: group.color + '18' }]}>
                  <Icon name={group.icon as any} size={22} color={group.color} />
                </View>
                <View style={styles.workspaceIntro}>
                  <Text style={styles.workspaceTitle}>{group.title}</Text>
                  <Text style={styles.workspaceDescription}>{group.description}</Text>
                </View>
              </View>
              <View style={styles.workspaceActions}>
                {group.actions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.workspaceActionChip}
                    onPress={() => router.push(action.route as any)}
                  >
                    <Text style={styles.workspaceActionLabel}>{action.label}</Text>
                    {action.badge ? (
                      <View style={styles.workspaceBadge}>
                        <Text style={styles.workspaceBadgeText}>{action.badge}</Text>
                      </View>
                    ) : (
                      <Icon name="chevron-forward" size={16} color={colors.text.tertiary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Recent Uploads */}
        {canModerateContent ? (
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
        ) : null}

        {/* Recent Users */}
        {canManageUsers ? (
          <View style={styles.reportsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Signups</Text>
              <TouchableOpacity onPress={() => router.push('/(admin)/users')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {data?.recent_users?.length ? (
              data.recent_users.slice(0, 3).map((recentUser) => (
                <TouchableOpacity
                  key={recentUser.id}
                  style={styles.rowCard}
                  onPress={() => router.push(`/(admin)/user-detail?id=${recentUser.id}` as any)}
                >
                  <View style={[styles.rowIcon, { backgroundColor: colors.primary[500] + '18' }]}>
                    <Icon name="person" size={16} color={colors.primary[500]} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {recentUser.full_name || recentUser.email}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {[recentUser.role, recentUser.profile?.department || recentUser.profile?.course]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  </View>
                  <Text style={styles.rowTime}>{formatRelativeDate(recentUser.date_joined)}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="people" size={32} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No recent signups</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Study Groups */}
        {canModerateContent ? (
          <View style={styles.reportsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Study Groups</Text>
              <TouchableOpacity onPress={() => router.push('/(admin)/study-groups')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {data?.study_groups?.length ? (
              data.study_groups.slice(0, 3).map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={styles.rowCard}
                  onPress={() => router.push('/(admin)/study-groups' as any)}
                >
                  <View style={[styles.rowIcon, { backgroundColor: colors.accent[500] + '18' }]}>
                    <Icon name="people" size={16} color={colors.accent[500]} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {[group.course_name, `${group.member_count || 0} members`, group.privacy]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  </View>
                  <Text style={styles.rowTime}>{formatRelativeDate(group.created_at)}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="people" size={32} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No study groups found</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Reports Section */}
        {canModerateContent ? (
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
        ) : null}

        {/* Operations Feed */}
        <View style={styles.reportsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Operations Feed</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/activity-log')}>
              <Text style={styles.viewAllText}>Open Log</Text>
            </TouchableOpacity>
          </View>
          {visibleOperationsFeed.length ? (
            visibleOperationsFeed.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.rowCard}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.rowIcon, { backgroundColor: item.color + '18' }]}>
                  <Icon name={item.icon as any} size={16} color={item.color} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.user}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
                <Text style={styles.rowTime}>{formatRelativeDate(item.created_at)}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="activity" size={32} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No recent activity for your access level</Text>
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
              data={visibleQuickActions}
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
  scopeCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginBottom: spacing[1],
    ...shadows.sm,
  },
  scopeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
  scopeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  scopeSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
  },
  scopeBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
  },
  scopeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[600],
  },
  scopeMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
    marginTop: spacing[3],
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
    fontWeight: '600',
  },
  statusCopy: {
    flex: 1,
  },
  statusMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
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
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  priorityCard: {
    width: '47%',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.small,
  },
  priorityIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  priorityValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  priorityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing[1],
  },
  prioritySubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },
  sectionNoteWrap: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[4],
  },
  sectionNote: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  workspaceStack: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  workspaceCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.small,
  },
  workspaceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  workspaceIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspaceIntro: {
    flex: 1,
  },
  workspaceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  workspaceDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  workspaceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  workspaceActionChip: {
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    gap: spacing[2],
  },
  workspaceActionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  workspaceBadge: {
    backgroundColor: colors.primary[500] + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
  },
  workspaceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[600],
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
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  rowTime: {
    fontSize: 11,
    color: colors.text.tertiary,
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
