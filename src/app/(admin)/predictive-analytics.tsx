/**
 * Predictive Analytics Screen
 * View predictive analytics, churn risk, and content trends
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { getApiBaseUrl } from '../../services/api';

interface ChurnRisk {
  user_id: number;
  email: string;
  name: string;
  risk_score: number;
  risk_level: string;
  recent_activity: number;
}

interface ContentTrend {
  trend: string;
  growth_rate: number;
  prediction: string;
  total_resources: number;
  total_downloads: number;
}

interface PredictiveSummary {
  user_predictions: {
    total_active_users: number;
    users_at_risk: number;
    risk_percentage: number;
    risk_distribution: { high: number; medium: number; low: number };
  };
  resource_predictions: {
    total_recent_resources: number;
    trending: any[];
    stable: any[];
    declining: any[];
  };
}

export default function PredictiveAnalyticsScreen() {
  const router = useRouter();
  const { accessToken: token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<PredictiveSummary | null>(null);
  const [churnRisks, setChurnRisks] = useState<ChurnRisk[]>([]);
  const [contentTrends, setContentTrends] = useState<ContentTrend | null>(null);
  const [selectedTab, setSelectedTab] = useState<'summary' | 'churn' | 'trends'>('summary');

  const fetchPredictiveData = useCallback(async () => {
    try {
      // Fetch summary
      const summaryResponse = await fetch(
        `${getApiBaseUrl()}/api/admin/predictive/summary/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (summaryResponse.ok) {
        const data = await summaryResponse.json();
        setSummary(data);
      }

      // Fetch churn risks
      const churnResponse = await fetch(
        `${getApiBaseUrl()}/api/admin/predictive/churn-risk/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (churnResponse.ok) {
        const data = await churnResponse.json();
        setChurnRisks(data.users || []);
      }

      // Fetch content trends
      const trendsResponse = await fetch(
        `${getApiBaseUrl()}/api/admin/predictive/content-trends/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (trendsResponse.ok) {
        const data = await trendsResponse.json();
        setContentTrends(data);
      }
    } catch (error) {
      console.error('Error fetching predictive data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPredictiveData();
  }, [fetchPredictiveData]);

  useEffect(() => {
    fetchPredictiveData();
  }, [fetchPredictiveData]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growing':
        return '📈';
      case 'stable':
        return '➡️';
      case 'declining':
        return '📉';
      case 'shrinking':
        return '⚠️';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'summary' && styles.tabActive]}
          onPress={() => setSelectedTab('summary')}
        >
          <Text style={[styles.tabText, selectedTab === 'summary' && styles.tabTextActive]}>
            Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'churn' && styles.tabActive]}
          onPress={() => setSelectedTab('churn')}
        >
          <Text style={[styles.tabText, selectedTab === 'churn' && styles.tabTextActive]}>
            Churn Risk
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'trends' && styles.tabActive]}
          onPress={() => setSelectedTab('trends')}
        >
          <Text style={[styles.tabText, selectedTab === 'trends' && styles.tabTextActive]}>
            Trends
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedTab === 'summary' && summary && (
          <>
            {/* User Predictions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Predictions</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {summary.user_predictions.total_active_users}
                  </Text>
                  <Text style={styles.statLabel}>Active Users</Text>
                </View>
                <View style={[styles.statCard, styles.warningCard]}>
                  <Text style={[styles.statValue, { color: '#EF4444' }]}>
                    {summary.user_predictions.users_at_risk}
                  </Text>
                  <Text style={styles.statLabel}>At Risk</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {summary.user_predictions.risk_percentage}%
                  </Text>
                  <Text style={styles.statLabel}>Risk Rate</Text>
                </View>
              </View>

              <Text style={styles.subsectionTitle}>Risk Distribution</Text>
              <View style={styles.distributionBar}>
                <View
                  style={[
                    styles.distributionSegment,
                    {
                      flex: summary.user_predictions.risk_distribution.high || 0.1,
                      backgroundColor: '#EF4444',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.distributionSegment,
                    {
                      flex: summary.user_predictions.risk_distribution.medium || 0.1,
                      backgroundColor: '#F59E0B',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.distributionSegment,
                    {
                      flex: summary.user_predictions.risk_distribution.low || 0.1,
                      backgroundColor: '#3B82F6',
                    },
                  ]}
                />
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendText}>High</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendText}>Medium</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={styles.legendText}>Low</Text>
                </View>
              </View>
            </View>

            {/* Resource Predictions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resource Predictions</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {summary.resource_predictions.total_recent_resources}
                  </Text>
                  <Text style={styles.statLabel}>Recent Resources</Text>
                </View>
              </View>

              <View style={styles.resourceCategories}>
                <View style={[styles.categoryCard, { borderLeftColor: '#10B981' }]}>
                  <Text style={styles.categoryValue}>
                    {summary.resource_predictions.trending.length}
                  </Text>
                  <Text style={styles.categoryLabel}>Trending</Text>
                </View>
                <View style={[styles.categoryCard, { borderLeftColor: '#3B82F6' }]}>
                  <Text style={styles.categoryValue}>
                    {summary.resource_predictions.stable.length}
                  </Text>
                  <Text style={styles.categoryLabel}>Stable</Text>
                </View>
                <View style={[styles.categoryCard, { borderLeftColor: '#EF4444' }]}>
                  <Text style={styles.categoryValue}>
                    {summary.resource_predictions.declining.length}
                  </Text>
                  <Text style={styles.categoryLabel}>Declining</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {selectedTab === 'churn' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Users at Risk of Churn</Text>
            <Text style={styles.sectionSubtitle}>
              {churnRisks.length} users identified as at-risk
            </Text>

            {churnRisks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No users at risk</Text>
              </View>
            ) : (
              churnRisks.slice(0, 20).map((user) => (
                <View key={user.user_id} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View style={styles.userStats}>
                    <View
                      style={[
                        styles.riskBadge,
                        { backgroundColor: getRiskColor(user.risk_level) },
                      ]}
                    >
                      <Text style={styles.riskText}>{user.risk_level.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.activityText}>
                      {user.recent_activity} activities
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {selectedTab === 'trends' && contentTrends && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content Trends</Text>

            <View style={styles.trendCard}>
              <Text style={styles.trendIcon}>{getTrendIcon(contentTrends.trend)}</Text>
              <View style={styles.trendInfo}>
                <Text style={styles.trendTitle}>
                  {contentTrends.trend.charAt(0).toUpperCase() + contentTrends.trend.slice(1)}
                </Text>
                <Text style={styles.trendRate}>
                  Growth Rate: {contentTrends.growth_rate > 0 ? '+' : ''}
                  {contentTrends.growth_rate}%
                </Text>
              </View>
            </View>

            <Text style={styles.predictionText}>{contentTrends.prediction}</Text>

            <View style={styles.trendStats}>
              <View style={styles.trendStatCard}>
                <Text style={styles.trendStatValue}>{contentTrends.total_resources}</Text>
                <Text style={styles.trendStatLabel}>Total Resources</Text>
              </View>
              <View style={styles.trendStatCard}>
                <Text style={styles.trendStatValue}>{contentTrends.total_downloads}</Text>
                <Text style={styles.trendStatLabel}>Total Downloads</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 8,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
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
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  distributionBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  distributionSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  resourceCategories: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
  },
  categoryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  userCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  userStats: {
    alignItems: 'flex-end',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activityText: {
    fontSize: 10,
    color: '#6B7280',
  },
  trendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  trendIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  trendInfo: {
    flex: 1,
  },
  trendTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  trendRate: {
    fontSize: 14,
    color: '#6B7280',
  },
  predictionText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  trendStats: {
    flexDirection: 'row',
    gap: 12,
  },
  trendStatCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  trendStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  trendStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
});
