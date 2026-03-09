// Admin Dashboard for CampusHub
// Backend-driven - no mock data

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import { analyticsAPI } from '../../services/api';

// Types matching backend response
interface AdminStats {
  total_users: number;
  total_resources: number;
  total_downloads: number;
  total_uploads: number;
  pending_resources?: number;
  reported_resources?: number;
  active_users?: number;
}

interface TopResource {
  id: string;
  title: string;
  download_count: number;
}

interface AdminDashboardData {
  stats: AdminStats;
  top_resources: TopResource[];
}

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      // Use the stats endpoint for admin data
      const response = await analyticsAPI.getStats();
      const data = response.data.data as AdminDashboardData;
      setDashboardData(data);
    } catch (err: any) {
      console.error('Failed to fetch admin dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Stats from backend
  const stats = dashboardData?.stats || {
    total_users: 0,
    total_resources: 0,
    total_downloads: 0,
    total_uploads: 0,
    pending_resources: 0,
    reported_resources: 0,
    active_users: 0,
  };

  const topResources = dashboardData?.top_resources || [];

  const menuItems = [
    { id: '1', title: 'Users', subtitle: 'Manage users & roles', icon: 'people', route: '/(admin)/users', color: colors.primary[500] },
    { id: '2', title: 'Resources', subtitle: 'Review & moderate', icon: 'document-text', route: '/(admin)/resources', color: colors.accent[500] },
    { id: '3', title: 'Faculties', subtitle: 'Academic structure', icon: 'school', route: '/(admin)/faculties', color: colors.info },
    { id: '4', title: 'Announcements', subtitle: 'Post announcements', icon: 'megaphone', route: '/(admin)/announcements', color: colors.warning },
    { id: '5', title: 'Reports', subtitle: 'User reports', icon: 'flag', route: '/(admin)/reports', color: colors.error },
    { id: '6', title: 'Analytics', subtitle: 'Platform insights', icon: 'stats-chart', route: '/(admin)/analytics', color: colors.success },
  ];

  const handleMenuPress = (route: string) => {
    router.push(route as any);
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Error state
  if (error && !dashboardData) {
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
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.text.inverse}
          colors={[colors.primary[500]]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Platform Overview</Text>
      </View>

      {/* Stats - From Backend */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary[500] + '20' }]}>
            <Icon name="people" size={22} color={colors.primary[500]} />
          </View>
          <Text style={styles.statValue}>{stats.total_users.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.accent[500] + '20' }]}>
            <Icon name="document-text" size={22} color={colors.accent[500]} />
          </View>
          <Text style={styles.statValue}>{stats.total_resources.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Resources</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
            <Icon name="download" size={22} color={colors.success} />
          </View>
          <Text style={styles.statValue}>{stats.total_downloads.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Downloads</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
            <Icon name="flag" size={22} color={colors.warning} />
          </View>
          <Text style={styles.statValue}>{stats.reported_resources || 0}</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Management</Text>
      <View style={styles.menuSection}>
        {menuItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.menuItem} 
            onPress={() => handleMenuPress(item.route)}
          >
            <View style={[styles.menuIconBox, { backgroundColor: item.color + '20' }]}>
              <Icon name={item.icon as any} size={22} color={item.color} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Top Resources - From Backend */}
      <Text style={styles.sectionTitle}>Top Resources</Text>
      {topResources.length > 0 ? (
        <View style={styles.topResources}>
          {topResources.slice(0, 5).map((resource, index) => (
            <View key={resource.id} style={styles.topResourceItem}>
              <Text style={styles.topRank}>{index + 1}</Text>
              <Text style={styles.topTitle} numberOfLines={1}>{resource.title}</Text>
              <Text style={styles.topDownloads}>{resource.download_count.toLocaleString()} downloads</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptySection}>
          <Icon name="document-text" size={32} color={colors.text.tertiary} />
          <Text style={styles.emptySectionText}>No resources data available</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background.secondary 
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { 
    padding: spacing[6], 
    paddingTop: spacing[12], 
    backgroundColor: colors.primary[500] 
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.inverse },
  subtitle: { fontSize: 14, color: colors.text.inverse, opacity: 0.8, marginTop: 4 },
  statsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    padding: spacing[4], 
    gap: spacing[3], 
    marginTop: -30 
  },
  statCard: { 
    width: '47%', 
    backgroundColor: colors.card.light, 
    borderRadius: 20, 
    padding: spacing[4], 
    ...shadows.md 
  },
  statIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: spacing[2] 
  },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.text.primary },
  statLabel: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary, 
    paddingHorizontal: spacing[6], 
    marginTop: spacing[6], 
    marginBottom: spacing[3] 
  },
  menuSection: { 
    marginHorizontal: spacing[6], 
    backgroundColor: colors.card.light, 
    borderRadius: 20, 
    ...shadows.sm,
    overflow: 'hidden',
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing[4], 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light 
  },
  menuIconBox: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: spacing[3] 
  },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  menuSubtitle: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  topResources: { 
    marginHorizontal: spacing[6], 
    backgroundColor: colors.card.light, 
    borderRadius: 20, 
    padding: spacing[4], 
    ...shadows.sm 
  },
  topResourceItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: spacing[2] 
  },
  topRank: { 
    width: 24, 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.primary[500] 
  },
  topTitle: { 
    flex: 1, 
    fontSize: 14, 
    color: colors.text.primary,
    marginRight: spacing[2],
  },
  topDownloads: { fontSize: 12, color: colors.text.secondary },
  emptySection: {
    marginHorizontal: spacing[6],
    backgroundColor: colors.card.light,
    borderRadius: 20,
    padding: spacing[6],
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: spacing[2],
  },
});

export default AdminDashboard;
