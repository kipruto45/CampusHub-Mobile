/**
 * Admin API Usage Analytics Screen
 * Monitor API usage and performance metrics
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as adminService from '../../services/admin-management.service';
import { APIUsageStats } from '../../services/admin-management.service';

const TIME_RANGES = [
  { value: 1, label: 'Today' },
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' },
];

export default function APIUsageScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<APIUsageStats | null>(null);
  const [selectedRange, setSelectedRange] = useState(7);
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'users'>('overview');

  const loadData = async () => {
    try {
      const data = await adminService.getAPIUsageStats(selectedRange);
      setStats(data);
    } catch (error) {
      console.error('Error loading API usage:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedRange])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderOverview = () => {
    if (!stats) return null;

    return (
      <ScrollView style={styles.contentContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_requests.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.average_response_time_ms}ms</Text>
            <Text style={styles.statLabel}>Avg Response Time</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: stats.error_rate > 5 ? '#EF4444' : '#10B981' }]}>
              {stats.error_rate}%
            </Text>
            <Text style={styles.statLabel}>Error Rate</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Distribution</Text>
          {stats.status_distribution.map((item) => (
            <View key={item.status_code} style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(item.status_code) },
                  ]}
                />
                <Text style={styles.statusCode}>{item.status_code}</Text>
              </View>
              <View style={styles.statusBarContainer}>
                <View
                  style={[
                    styles.statusBar,
                    {
                      backgroundColor: getStatusColor(item.status_code),
                      width: `${(item.count / stats.total_requests) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.statusCount}>{item.count.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderEndpoints = () => {
    if (!stats) return null;

    return (
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Top Endpoints</Text>
        <FlatList
          data={stats.top_endpoints}
          keyExtractor={(item, index) => `${item.endpoint}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.endpointCard}>
              <View style={styles.endpointInfo}>
                <Text style={styles.endpointPath} numberOfLines={1}>
                  {item.endpoint}
                </Text>
                <Text style={styles.endpointStats}>
                  {item.count.toLocaleString()} requests • {item.avg_time_ms}ms avg
                </Text>
              </View>
              <View style={styles.endpointBar}>
                <View
                  style={[
                    styles.endpointBarFill,
                    { width: `${(item.count / stats.top_endpoints[0].count) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </View>
    );
  };

  const renderUsers = () => {
    if (!stats) return null;

    return (
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Top Users</Text>
        <FlatList
          data={stats.top_users}
          keyExtractor={(item) => item.email}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userStats}>
                  {item.count.toLocaleString()} requests • {item.avg_time_ms}ms avg
                </Text>
              </View>
              <View style={styles.userBar}>
                <View
                  style={[
                    styles.userBarFill,
                    { width: `${(item.count / stats.top_users[0].count) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>API Usage Analytics</Text>
        <View style={styles.timeRangeSelector}>
          {TIME_RANGES.map((range) => (
            <TouchableOpacity
              key={range.value}
              style={[
                styles.timeRangeButton,
                selectedRange === range.value && styles.timeRangeButtonActive,
              ]}
              onPress={() => setSelectedRange(range.value)}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  selectedRange === range.value && styles.timeRangeTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'endpoints' && styles.tabActive]}
          onPress={() => setActiveTab('endpoints')}
        >
          <Text style={[styles.tabText, activeTab === 'endpoints' && styles.tabTextActive]}>
            Endpoints
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'endpoints' && renderEndpoints()}
      {activeTab === 'users' && renderUsers()}
    </View>
  );
}

function getStatusColor(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return '#10B981'; // Success - Green
  if (statusCode >= 300 && statusCode < 400) return '#3B82F6'; // Redirect - Blue
  if (statusCode >= 400 && statusCode < 500) return '#F59E0B'; // Client Error - Yellow
  if (statusCode >= 500) return '#EF4444'; // Server Error - Red
  return '#6B7280'; // Unknown - Gray
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  timeRangeButtonActive: {
    backgroundColor: '#4F46E5',
  },
  timeRangeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F46E5',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  statusBar: {
    height: 8,
    borderRadius: 4,
  },
  statusCount: {
    fontSize: 12,
    color: '#6B7280',
    width: 50,
    textAlign: 'right',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  endpointCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  endpointInfo: {
    marginBottom: 8,
  },
  endpointPath: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  endpointStats: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  endpointBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
  },
  endpointBarFill: {
    height: 6,
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  userInfo: {
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  userStats: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  userBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
  },
  userBarFill: {
    height: 6,
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
});
