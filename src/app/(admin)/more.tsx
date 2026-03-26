// Admin More Screen (Admin Tools Hub) for CampusHub
// Central hub for all admin tools

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';
import {
  AdminFeaturePermissions,
  AdminFeatureRequirement,
  AdminScopeInfo,
  formatAdminRoleLabel,
  formatAdminScopeLabel,
  hasAdminAccess,
  normalizeAdminFeaturePermissions,
} from '../../utils/admin-access';

interface Tool {
  id: string;
  title: string;
  icon: string;
  route: string;
  color: string;
  feature?: AdminFeatureRequirement;
}

const MoreScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scopeInfo, setScopeInfo] = useState<AdminScopeInfo | null>(null);
  const [featurePermissions, setFeaturePermissions] = useState<AdminFeaturePermissions | null>(null);

  const tools: Tool[] = [
    // Academic - moved here from dashboard quick menu
    { id: '0', title: 'Academic Mgmt', icon: 'library', route: '/(admin)/academic-management', color: colors.info, feature: ['manage_faculties', 'manage_departments'] },
    { id: '1', title: 'Faculties', icon: 'school', route: '/(admin)/faculties', color: colors.primary[500], feature: 'manage_faculties' },
    { id: '2', title: 'Departments', icon: 'folder', route: '/(admin)/departments', color: colors.accent[500], feature: 'manage_departments' },
    { id: '3', title: 'Courses', icon: 'book', route: '/(admin)/courses', color: colors.info, feature: ['manage_faculties', 'manage_departments'] },
    { id: '4', title: 'Units', icon: 'bookmark', route: '/(admin)/units', color: colors.warning, feature: ['manage_faculties', 'manage_departments'] },
    // Platform Management
    { id: '5', title: 'Announcements', icon: 'megaphone', route: '/(admin)/announcements', color: colors.success, feature: 'moderate_content' },
    { id: '6', title: 'Analytics', icon: 'stats-chart', route: '/(admin)/analytics', color: colors.primary[500], feature: 'view_analytics' },
    { id: '7', title: 'Search', icon: 'search', route: '/(admin)/search', color: colors.accent[500] },
    { id: '8', title: 'Notifications', icon: 'notifications', route: '/(admin)/notifications', color: colors.warning },
    { id: '9', title: 'Activity Log', icon: 'list', route: '/(admin)/activity-log', color: colors.info, feature: 'moderate_content' },
    { id: '10', title: 'Storage', icon: 'cloud', route: '/(admin)/storage', color: colors.success, feature: 'system_settings' },
    { id: '11', title: 'Backup & System', icon: 'archive', route: '/(admin)/backup', color: colors.primary[600], feature: 'export_data' },
    // Engagement & Analytics
    { id: '14', title: 'Gamification', icon: 'trophy', route: '/(admin)/gamification', color: colors.warning, feature: 'view_analytics' },
    { id: '15', title: 'Email Campaigns', icon: 'mail', route: '/(admin)/email-campaigns', color: colors.info, feature: 'view_analytics' },
    { id: '16', title: 'API Usage', icon: 'code-slash', route: '/(admin)/api-usage', color: colors.accent[500], feature: 'view_analytics' },
    // NEW: Advanced Admin Features
    { id: '17', title: 'Admin Notifications', icon: 'notifications-unread', route: '/(admin)/admin-notifications', color: colors.error },
    { id: '18', title: 'AI Moderation', icon: 'shield-checkmark', route: '/(admin)/ai-moderation', color: colors.primary[500], feature: 'moderate_content' },
    { id: '19', title: 'Predictive Analytics', icon: 'trending-up', route: '/(admin)/predictive-analytics', color: colors.success, feature: 'view_analytics' },
    { id: '20', title: 'Dashboard Builder', icon: 'grid', route: '/(admin)/dashboard-builder', color: colors.info, feature: 'view_analytics' },
    { id: '21', title: 'Reports & Export', icon: 'download', route: '/(admin)/reports-export', color: colors.accent[500], feature: 'export_data' },
    { id: '22', title: 'Audit Log', icon: 'document-text', route: '/(admin)/audit-log', color: colors.warning, feature: 'moderate_content' },
    // NEW: Modern Admin Features
    { id: '23', title: 'Content Calendar', icon: 'calendar', route: '/(admin)/content-calendar', color: colors.primary[400], feature: 'moderate_content' },
    { id: '24', title: 'Funnel Analytics', icon: 'funnel', route: '/(admin)/funnel-analytics', color: colors.success, feature: 'view_analytics' },
    { id: '25', title: 'Incidents', icon: 'alert-circle', route: '/(admin)/incidents', color: colors.error, feature: 'moderate_content' },
    { id: '26', title: 'API Keys', icon: 'key', route: '/(admin)/api-keys', color: colors.accent[600], feature: 'system_settings' },
    { id: '27', title: 'Webhooks', icon: 'link', route: '/(admin)/webhooks', color: colors.info, feature: 'system_settings' },
    { id: '28', title: 'Workflows', icon: 'git-branch', route: '/(admin)/workflows', color: colors.warning, feature: 'system_settings' },
    // Groups
    { id: '29', title: 'Study Groups', icon: 'people', route: '/(admin)/study-groups', color: colors.primary[500], feature: 'moderate_content' },
    // Calendar & Timetable
    { id: '30', title: 'Calendar & Timetable', icon: 'calendar', route: '/(admin)/calendar', color: colors.info, feature: ['manage_faculties', 'manage_departments'] },
    // Revenue & Access
    { id: '31', title: 'Referrals', icon: 'gift', route: '/(admin)/referrals', color: colors.accent[500], feature: 'manage_referrals' },
    { id: '32', title: 'Payments', icon: 'card', route: '/(admin)/payments', color: colors.success, feature: 'manage_payments' },
    { id: '33', title: 'Subscriptions', icon: 'sync', route: '/(admin)/subscriptions', color: colors.primary[600], feature: 'manage_billing' },
    { id: '34', title: 'Admin Scope', icon: 'shield-checkmark', route: '/(admin)/scope', color: colors.warning },
    { id: '35', title: 'Feature Access', icon: 'key', route: '/(admin)/feature-access', color: colors.error },
    // Account
    { id: '12', title: 'Settings', icon: 'settings', route: '/(admin)/settings', color: colors.text.secondary, feature: 'system_settings' },
    { id: '13', title: 'Profile', icon: 'person', route: '/(admin)/profile', color: colors.primary[500] },
  ];
  const hasAccess = (requirement?: AdminFeatureRequirement) =>
    hasAdminAccess(featurePermissions, requirement);

  useEffect(() => {
    const loadAdminAccess = async () => {
      try {
        const [scopeRes, featureRes] = await Promise.all([
          adminAPI.getScopeInfo().catch(() => null),
          adminAPI.getFeatureAccess().catch(() => null),
        ]);

        const scopePayload = scopeRes?.data?.data ?? scopeRes?.data ?? {};
        const featurePayload = featureRes?.data?.data ?? featureRes?.data ?? {};

        setScopeInfo((scopePayload?.scope || null) as AdminScopeInfo | null);
        setFeaturePermissions(normalizeAdminFeaturePermissions(featurePayload?.permissions || {}));
      } finally {
        setLoading(false);
      }
    };

    void loadAdminAccess();
  }, []);

  const visibleTools = useMemo(
    () => tools.filter((tool) => hasAccess(tool.feature)),
    [tools, featurePermissions]
  );
  const academicTools = visibleTools.filter((tool) => ['0', '1', '2', '3', '4'].includes(tool.id));
  const platformTools = visibleTools.filter((tool) =>
    ['5', '6', '7', '8', '9', '10', '11', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'].includes(tool.id)
  );
  const revenueTools = visibleTools.filter((tool) => ['31', '32', '33', '34', '35'].includes(tool.id));
  const accountTools = visibleTools.filter((tool) => ['12', '13'].includes(tool.id));
  const quickStats = [
    { id: 'dashboard', title: 'Dashboard', icon: 'home', route: '/(admin)/dashboard', color: colors.primary[500] },
    { id: 'users', title: 'Users', icon: 'people', route: '/(admin)/users', color: colors.accent[500], feature: 'manage_users' as AdminFeatureRequirement },
    { id: 'resources', title: 'Resources', icon: 'document-text', route: '/(admin)/resources', color: colors.info, feature: 'moderate_content' as AdminFeatureRequirement },
    { id: 'reports', title: 'Reports', icon: 'flag', route: '/(admin)/reports', color: colors.error, feature: 'moderate_content' as AdminFeatureRequirement },
  ].filter((item) => hasAccess(item.feature));

  const handleToolPress = (route: string) => {
    router.push(route as any);
  };

  const headerSubtitle = scopeInfo
    ? `${formatAdminRoleLabel(scopeInfo.role)} • ${formatAdminScopeLabel(scopeInfo)}`
    : 'Manage your campus platform';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Tools</Text>
        <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Quick Stats */}
        <View style={styles.quickStats}>
          {quickStats.map((item) => (
            <TouchableOpacity key={item.id} style={styles.statCard} onPress={() => router.push(item.route as any)}>
              <Icon name={item.icon as any} size={24} color={item.color} />
              <Text style={styles.statText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Academic Structure */}
        {academicTools.length ? (
          <>
            <Text style={styles.sectionTitle}>Academic Structure</Text>
            <View style={styles.toolsGrid}>
              {academicTools.map((tool) => (
                <TouchableOpacity key={tool.id} style={styles.toolCard} onPress={() => handleToolPress(tool.route)}>
                  <View style={[styles.toolIcon, { backgroundColor: tool.color + '20' }]}>
                    <Icon name={tool.icon as any} size={28} color={tool.color} />
                  </View>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {/* Platform Management */}
        {platformTools.length ? (
          <>
            <Text style={styles.sectionTitle}>Platform Management</Text>
            <View style={styles.toolsGrid}>
              {platformTools.map((tool) => (
                <TouchableOpacity key={tool.id} style={styles.toolCard} onPress={() => handleToolPress(tool.route)}>
                  <View style={[styles.toolIcon, { backgroundColor: tool.color + '20' }]}>
                    <Icon name={tool.icon as any} size={28} color={tool.color} />
                  </View>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {/* Revenue & Access */}
        {revenueTools.length ? (
          <>
            <Text style={styles.sectionTitle}>Revenue & Access</Text>
            <View style={styles.toolsGrid}>
              {revenueTools.map((tool) => (
                <TouchableOpacity key={tool.id} style={styles.toolCard} onPress={() => handleToolPress(tool.route)}>
                  <View style={[styles.toolIcon, { backgroundColor: tool.color + '20' }]}>
                    <Icon name={tool.icon as any} size={28} color={tool.color} />
                  </View>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.toolsGrid}>
          {accountTools.map((tool) => (
            <TouchableOpacity key={tool.id} style={styles.toolCard} onPress={() => handleToolPress(tool.route)}>
              <View style={[styles.toolIcon, { backgroundColor: tool.color + '20' }]}>
                <Icon name={tool.icon as any} size={28} color={tool.color} />
              </View>
              <Text style={styles.toolTitle}>{tool.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
  },
  header: {
    padding: spacing[6],
    paddingTop: spacing[10],
    backgroundColor: colors.primary[500],
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.inverse,
    opacity: 0.8,
    marginTop: spacing[1],
  },
  content: {
    padding: spacing[4],
  },
  quickStats: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    ...shadows.sm,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing[2],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  toolCard: {
    width: '47%',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    ...shadows.sm,
  },
  toolIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
});

export default MoreScreen;
