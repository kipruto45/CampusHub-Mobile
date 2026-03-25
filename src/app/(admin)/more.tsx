// Admin More Screen (Admin Tools Hub) for CampusHub
// Central hub for all admin tools

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';

interface Tool {
  id: string;
  title: string;
  icon: string;
  route: string;
  color: string;
}

const MoreScreen: React.FC = () => {
  const router = useRouter();

  const tools: Tool[] = [
    // Academic - moved here from dashboard quick menu
    { id: '0', title: 'Academic Mgmt', icon: 'library', route: '/(admin)/academic-management', color: colors.info },
    { id: '1', title: 'Faculties', icon: 'school', route: '/(admin)/faculties', color: colors.primary[500] },
    { id: '2', title: 'Departments', icon: 'folder', route: '/(admin)/departments', color: colors.accent[500] },
    { id: '3', title: 'Courses', icon: 'book', route: '/(admin)/courses', color: colors.info },
    { id: '4', title: 'Units', icon: 'bookmark', route: '/(admin)/units', color: colors.warning },
    // Platform Management
    { id: '5', title: 'Announcements', icon: 'megaphone', route: '/(admin)/announcements', color: colors.success },
    { id: '6', title: 'Analytics', icon: 'stats-chart', route: '/(admin)/analytics', color: colors.primary[500] },
    { id: '7', title: 'Search', icon: 'search', route: '/(admin)/search', color: colors.accent[500] },
    { id: '8', title: 'Notifications', icon: 'notifications', route: '/(admin)/notifications', color: colors.warning },
    { id: '9', title: 'Activity Log', icon: 'list', route: '/(admin)/activity-log', color: colors.info },
    { id: '10', title: 'Storage', icon: 'cloud', route: '/(admin)/storage', color: colors.success },
    { id: '11', title: 'Backup & System', icon: 'archive', route: '/(admin)/backup', color: colors.primary[600] },
    // Engagement & Analytics
    { id: '14', title: 'Gamification', icon: 'trophy', route: '/(admin)/gamification', color: colors.warning },
    { id: '15', title: 'Email Campaigns', icon: 'mail', route: '/(admin)/email-campaigns', color: colors.info },
    { id: '16', title: 'API Usage', icon: 'code-slash', route: '/(admin)/api-usage', color: colors.accent[500] },
    // NEW: Advanced Admin Features
    { id: '17', title: 'Admin Notifications', icon: 'notifications-unread', route: '/(admin)/admin-notifications', color: colors.error },
    { id: '18', title: 'AI Moderation', icon: 'shield-checkmark', route: '/(admin)/ai-moderation', color: colors.primary[500] },
    { id: '19', title: 'Predictive Analytics', icon: 'trending-up', route: '/(admin)/predictive-analytics', color: colors.success },
    { id: '20', title: 'Dashboard Builder', icon: 'grid', route: '/(admin)/dashboard-builder', color: colors.info },
    { id: '21', title: 'Reports & Export', icon: 'download', route: '/(admin)/reports-export', color: colors.accent[500] },
    { id: '22', title: 'Audit Log', icon: 'document-text', route: '/(admin)/audit-log', color: colors.warning },
    // NEW: Modern Admin Features
    { id: '23', title: 'Content Calendar', icon: 'calendar', route: '/(admin)/content-calendar', color: colors.primary[400] },
    { id: '24', title: 'Funnel Analytics', icon: 'funnel', route: '/(admin)/funnel-analytics', color: colors.success },
    { id: '25', title: 'Incidents', icon: 'alert-circle', route: '/(admin)/incidents', color: colors.error },
    { id: '26', title: 'API Keys', icon: 'key', route: '/(admin)/api-keys', color: colors.accent[600] },
    { id: '27', title: 'Webhooks', icon: 'link', route: '/(admin)/webhooks', color: colors.info },
    { id: '28', title: 'Workflows', icon: 'git-branch', route: '/(admin)/workflows', color: colors.warning },
    // Groups
    { id: '29', title: 'Study Groups', icon: 'people', route: '/(admin)/study-groups', color: colors.primary[500] },
    // Account
    { id: '12', title: 'Settings', icon: 'settings', route: '/(admin)/settings', color: colors.text.secondary },
    { id: '13', title: 'Profile', icon: 'person', route: '/(admin)/profile', color: colors.primary[500] },
  ];

  const academicTools = tools.filter((tool) => ['0', '1', '2', '3', '4'].includes(tool.id));
  const platformTools = tools.filter((tool) =>
    ['5', '6', '7', '8', '9', '10', '11', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29'].includes(tool.id)
  );
  const accountTools = tools.filter((tool) => ['12', '13'].includes(tool.id));

  const handleToolPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Tools</Text>
        <Text style={styles.headerSubtitle}>Manage your campus platform</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(admin)/dashboard')}>
            <Icon name={'home'} size={24} color={colors.primary[500]} />
            <Text style={styles.statText}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(admin)/users')}>
            <Icon name={'people'} size={24} color={colors.accent[500]} />
            <Text style={styles.statText}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(admin)/resources')}>
            <Icon name={'document-text'} size={24} color={colors.info} />
            <Text style={styles.statText}>Resources</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(admin)/reports')}>
            <Icon name={'flag'} size={24} color={colors.error} />
            <Text style={styles.statText}>Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Academic Structure */}
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

        {/* Platform Management */}
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
