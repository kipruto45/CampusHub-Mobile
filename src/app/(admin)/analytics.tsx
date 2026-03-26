 // Admin Analytics for CampusHub
// Platform insights and statistics

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Share } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import api, { analyticsAPI } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

interface AnalyticsData {
  overview: {
    total_users: number;
    total_resources: number;
    total_downloads: number;
    total_uploads: number;
    active_users: number;
    storage_used: number;
  };
  trends: {
    period: string;
    users_count: number;
    resources_count: number;
    downloads_count: number;
  }[];
  top_resources: {
    id: string;
    title: string;
    download_count: number;
    upload_count?: number;
    view_count?: number;
  }[];
  top_users: {
    id: string;
    name: string;
    email: string;
    upload_count: number;
  }[];
  resource_types: {
    type: string;
    count: number;
    percentage: number;
  }[];
}

interface EventAnalytics {
  attendance_trend: { period: string; registered: number; attended: number; revenue?: number }[];
  type_distribution: { type: string; count: number }[];
  demographics: { label: string; count: number }[];
  registration_vs_attendance: { event: string; registered: number; attended: number }[];
  popular_categories: { category: string; count: number; revenue?: number }[];
  heatmap: { slot: string; count: number }[];
  revenue?: { period: string; amount: number }[];
}

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 150;

const AnalyticsScreen: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [eventData, setEventData] = useState<EventAnalytics | null>(null);
  const [eventAnalyticsError, setEventAnalyticsError] = useState<string | null>(null);
  const eventCache = React.useRef<Record<string, EventAnalytics>>({});

  const fetchAnalytics = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setError(null);
      }
      
      const response = await api.get('/analytics/dashboard/', {
        params: { period: timeRange }
      });
      setAnalyticsData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  const fetchEventAnalytics = useCallback(async () => {
    try {
      if (eventCache.current[timeRange]) {
        setEventData(eventCache.current[timeRange]);
        setEventAnalyticsError(null);
        return;
      }
      const response = await analyticsAPI.getEventAnalytics({ period: timeRange });
      const payload = response.data || response;
      const normalized: EventAnalytics = {
        attendance_trend: payload.attendance_trend || payload.trend || [],
        type_distribution: payload.type_distribution || payload.types || [],
        demographics: payload.demographics || [],
        registration_vs_attendance: payload.registration_vs_attendance || [],
        popular_categories: payload.popular_categories || [],
        heatmap: payload.heatmap || [],
      };
      eventCache.current[timeRange] = normalized;
      setEventData(normalized);
      setEventAnalyticsError(null);
    } catch (err: any) {
      console.error('Failed to fetch event analytics:', err);
      setEventData({
        attendance_trend: [],
        type_distribution: [],
        demographics: [],
        registration_vs_attendance: [],
        popular_categories: [],
        heatmap: [],
      });
      setEventAnalyticsError(
        err?.response?.data?.message ||
          err?.message ||
          'Event analytics are unavailable right now.'
      );
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics(true);
    fetchEventAnalytics();
  }, [timeRange, fetchAnalytics, fetchEventAnalytics]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics(true);
    fetchEventAnalytics();
  }, [fetchAnalytics, fetchEventAnalytics]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    fetchAnalytics(true);
    fetchEventAnalytics();
  }, [fetchAnalytics, fetchEventAnalytics]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return gb.toFixed(2) + ' GB';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + ' MB';
  };

  const attendanceTrend = eventData?.attendance_trend || [];
  const trendMax =
    attendanceTrend.length > 0
      ? Math.max(
          ...attendanceTrend.map((t) => Math.max(t.registered, t.attended))
        )
      : 1;

  const buildLinePath = (points: { value: number }[], widthPx: number, heightPx: number) => {
    if (!points.length) return '';
    const stepX = points.length > 1 ? widthPx / (points.length - 1) : widthPx;
    return points
      .map((p, idx) => {
        const x = idx * stepX;
        const y = heightPx - (p.value / trendMax) * heightPx;
        return `${idx === 0 ? 'M' : 'L'}${x} ${y}`;
      })
      .join(' ');
  };

  const typeDistribution = eventData?.type_distribution || [];
  const typeTotal = typeDistribution.reduce((acc, cur) => acc + cur.count, 0) || 1;

  const heatmap = eventData?.heatmap || [];
  const hasEventAnalyticsData =
    attendanceTrend.length > 0 ||
    typeDistribution.length > 0 ||
    (eventData?.registration_vs_attendance || []).length > 0 ||
    (eventData?.popular_categories || []).length > 0 ||
    heatmap.length > 0;

  const exportEventData = async () => {
    try {
      if (!eventData) return;
      await Share.share({
        title: 'Event Analytics',
        message: JSON.stringify(eventData, null, 2),
      });
    } catch {
      showToast('error', 'Unable to export event analytics right now.');
    }
  };

  const overview = analyticsData?.overview || {
    total_users: 0,
    total_resources: 0,
    total_downloads: 0,
    total_uploads: 0,
    active_users: 0,
    storage_used: 0,
  };

  const trends = analyticsData?.trends || [];
  const maxTrendValue = Math.max(...trends.map(t => Math.max(t.users_count, t.resources_count, t.downloads_count)), 1);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !analyticsData) {
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['week', 'month', 'year'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            style={[styles.timeRangeBtn, timeRange === range && styles.timeRangeBtnActive]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Icon name="people" size={24} color={colors.primary[500]} />
              <Text style={styles.statValue}>{formatNumber(overview.total_users)}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="document-text" size={24} color={colors.accent[500]} />
              <Text style={styles.statValue}>{formatNumber(overview.total_resources)}</Text>
              <Text style={styles.statLabel}>Resources</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="download" size={24} color={colors.success} />
              <Text style={styles.statValue}>{formatNumber(overview.total_downloads)}</Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="cloud-upload" size={24} color={colors.info} />
              <Text style={styles.statValue}>{formatNumber(overview.total_uploads)}</Text>
              <Text style={styles.statLabel}>Uploads</Text>
            </View>
          </View>
        </View>

        {/* Activity Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.activityGrid}>
            <View style={styles.activityCard}>
              <Text style={styles.activityValue}>{overview.active_users}</Text>
              <Text style={styles.activityLabel}>Active Users</Text>
            </View>
            <View style={styles.activityCard}>
              <Text style={styles.activityValue}>{formatStorage(overview.storage_used)}</Text>
              <Text style={styles.activityLabel}>Storage Used</Text>
            </View>
          </View>
        </View>

        {/* Trends Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trends</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary[500] }]} />
                <Text style={styles.legendText}>Users</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accent[500] }]} />
                <Text style={styles.legendText}>Resources</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={styles.legendText}>Downloads</Text>
              </View>
            </View>
            <View style={styles.chart}>
              {trends.map((trend, index) => (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          height: (trend.users_count / maxTrendValue) * CHART_HEIGHT,
                          backgroundColor: colors.primary[500],
                        }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          height: (trend.resources_count / maxTrendValue) * CHART_HEIGHT,
                          backgroundColor: colors.accent[500],
                        }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          height: (trend.downloads_count / maxTrendValue) * CHART_HEIGHT,
                          backgroundColor: colors.success,
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.barLabel}>{trend.period}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Resources</Text>
          <View style={styles.topList}>
            {(analyticsData?.top_resources || []).slice(0, 5).map((resource, index) => (
              <View key={resource.id} style={styles.topItem}>
                <Text style={styles.topRank}>{index + 1}</Text>
                <View style={styles.topInfo}>
                  <Text style={styles.topTitle} numberOfLines={1}>{resource.title}</Text>
                  <Text style={styles.topMeta}>
                    {resource.download_count} downloads
                    {typeof resource.view_count === 'number'
                      ? ` • ${resource.view_count} views`
                      : typeof resource.upload_count === 'number'
                        ? ` • ${resource.upload_count} uploads`
                        : ''}
                  </Text>
                </View>
              </View>
            ))}
            {(!analyticsData?.top_resources || analyticsData.top_resources.length === 0) && (
              <Text style={styles.emptyText}>No data available</Text>
            )}
          </View>
        </View>

        {/* Resource Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resource Types</Text>
          <View style={styles.typesContainer}>
            {(analyticsData?.resource_types || []).map((item, index) => (
              <View key={index} style={styles.typeItem}>
                <View style={styles.typeInfo}>
                  <Text style={styles.typeName}>{item.type}</Text>
                  <Text style={styles.typeCount}>{item.count} ({item.percentage.toFixed(1)}%)</Text>
                </View>
                <View style={styles.typeBar}>
                  <View 
                    style={[
                      styles.typeBarFill, 
                      { width: `${item.percentage}%`, backgroundColor: getTypeColor(index) }
                    ]} 
                  />
                </View>
              </View>
            ))}
            {(!analyticsData?.resource_types || analyticsData.resource_types.length === 0) && (
              <Text style={styles.emptyText}>No data available</Text>
            )}
          </View>
        </View>

        {/* Event Analytics */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Event Analytics</Text>
            {hasEventAnalyticsData && (
              <TouchableOpacity style={styles.exportBtn} onPress={exportEventData}>
                <Icon name="download" size={16} color={colors.text.inverse} />
                <Text style={styles.exportText}>Export</Text>
              </TouchableOpacity>
            )}
          </View>
          {eventAnalyticsError ? (
            <View style={styles.inlineNotice}>
              <Icon name="information-circle" size={16} color={colors.warning} />
              <Text style={styles.inlineNoticeText}>{eventAnalyticsError}</Text>
            </View>
          ) : null}

          {/* Attendance trend */}
          <View style={styles.chartContainer}>
            <Text style={styles.sectionSubtitle}>Attendance trend</Text>
            {attendanceTrend.length === 0 ? (
              <Text style={styles.emptyText}>No event data</Text>
            ) : (
              <Svg height={CHART_HEIGHT + 20} width={width - spacing[6]}>
                <Path
                  d={buildLinePath(
                    attendanceTrend.map((p) => ({ value: p.registered })),
                    width - spacing[6],
                    CHART_HEIGHT
                  )}
                  stroke={colors.info}
                  strokeWidth={3}
                  fill="none"
                />
                <Path
                  d={buildLinePath(
                    attendanceTrend.map((p) => ({ value: p.attended })),
                    width - spacing[6],
                    CHART_HEIGHT
                  )}
                  stroke={colors.success}
                  strokeWidth={3}
                  fill="none"
                />
              </Svg>
            )}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
                <Text style={styles.legendText}>Registered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={styles.legendText}>Attended</Text>
              </View>
            </View>
          </View>

          {/* Type distribution */}
          <View style={styles.chartContainer}>
            <Text style={styles.sectionSubtitle}>Event type distribution</Text>
            {typeDistribution.length === 0 ? (
              <Text style={styles.emptyText}>No event type data</Text>
            ) : (
              <View style={styles.donutRow}>
                <Svg height={140} width={140} viewBox="0 0 140 140">
                  {typeDistribution.reduce(
                    (acc: any, slice, idx) => {
                      const percent = slice.count / typeTotal;
                      const dash = acc.circumference * percent;
                      const gap = acc.circumference - dash;
                      acc.offset -= dash;
                      acc.elems.push(
                        <Circle
                          key={slice.type}
                          cx="70"
                          cy="70"
                          r={acc.radius}
                          stroke={getTypeColor(idx)}
                          strokeWidth={20}
                          fill="none"
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={acc.offset}
                          transform="rotate(-90 70 70)"
                        />
                      );
                      return acc;
                    },
                    { elems: [], circumference: 2 * Math.PI * 50, radius: 50, offset: 0 }
                  ).elems}
                  <Circle cx="70" cy="70" r="30" fill={colors.card.light} />
                </Svg>
                <View style={{ flex: 1, gap: spacing[2] }}>
                  {typeDistribution.map((item, idx) => (
                    <View key={item.type} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: getTypeColor(idx) }]} />
                      <Text style={styles.legendText}>
                        {item.type} ({((item.count / typeTotal) * 100).toFixed(1)}%)
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Registration vs attendance */}
          <View style={styles.chartContainer}>
            <Text style={styles.sectionSubtitle}>Registration vs Attendance</Text>
            {(eventData?.registration_vs_attendance || []).map((item) => {
              const max = Math.max(item.registered, item.attended, 1);
              return (
                <View key={item.event} style={{ marginBottom: spacing[3] }}>
                  <Text style={styles.barLabel}>{item.event}</Text>
                  <View style={styles.compareRow}>
                    <View
                      style={[
                        styles.compareBar,
                        { width: `${(item.registered / max) * 100}%`, backgroundColor: colors.info },
                      ]}
                    />
                    <View
                      style={[
                        styles.compareBar,
                        { width: `${(item.attended / max) * 100}%`, backgroundColor: colors.success },
                      ]}
                    />
                  </View>
                  <Text style={styles.compareMeta}>
                    {item.attended}/{item.registered} attended ({Math.round((item.attended / item.registered) * 100)}%)
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Popular categories */}
          <View style={styles.chartContainer}>
            <Text style={styles.sectionSubtitle}>Popular categories</Text>
            {(eventData?.popular_categories || []).map((cat, idx) => (
              <View key={cat.category} style={{ marginBottom: spacing[2] }}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: getTypeColor(idx) }]} />
                  <Text style={styles.legendText}>{cat.category}</Text>
                  {typeof cat.revenue === 'number' && (
                    <Text style={styles.legendText}> • ${cat.revenue?.toFixed(0)}</Text>
                  )}
                </View>
                <View style={styles.typeBar}>
                  <View
                    style={[
                      styles.typeBarFill,
                      { width: `${Math.min(100, cat.count * 10)}%`, backgroundColor: getTypeColor(idx) },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Peak activity heatmap */}
          <View style={styles.chartContainer}>
            <Text style={styles.sectionSubtitle}>Peak activity</Text>
            <View style={styles.heatmapGrid}>
              {heatmap.map((cell, idx) => {
                const intensity = Math.min(1, cell.count / 40);
                return (
                  <View
                    key={`${cell.slot}-${idx}`}
                    style={[
                      styles.heatCell,
                      { backgroundColor: `rgba(59,130,246,${0.2 + intensity * 0.7})` },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const getTypeColor = (index: number) => {
  const colors_list = [
    colors.primary[500],
    colors.accent[500],
    colors.success,
    colors.info,
    colors.warning,
  ];
  return colors_list[index % colors_list.length];
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
    padding: spacing[4],
    paddingTop: spacing[8],
    backgroundColor: colors.primary[500],
  },
  backButton: {
    marginRight: spacing[3],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[2],
    backgroundColor: colors.background.primary,
  },
  timeRangeBtn: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  timeRangeBtnActive: {
    backgroundColor: colors.primary[500],
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  timeRangeTextActive: {
    color: colors.text.inverse,
  },
  section: {
    padding: spacing[4],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  statCard: {
    width: (width - spacing[8] * 2 - spacing[3]) / 2,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing[2],
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  activityGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  activityCard: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    ...shadows.sm,
  },
  activityValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary[500],
  },
  activityLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  chartContainer: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 30,
  },
  chartBar: {
    alignItems: 'center',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: CHART_HEIGHT,
  },
  bar: {
    width: 20,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: spacing[2],
  },
  topList: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  topRank: {
    width: 24,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  topInfo: {
    flex: 1,
  },
  topTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  topMeta: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  typesContainer: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  typeItem: {
    marginBottom: spacing[3],
  },
  typeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  typeName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  typeCount: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  typeBar: {
    height: 8,
    backgroundColor: colors.background.secondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  typeBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  exportText: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 12,
  },
  inlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.warning + '12',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginBottom: spacing[3],
  },
  inlineNoticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  compareRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  compareBar: {
    height: 8,
    borderRadius: 6,
    flex: 1,
  },
  compareMeta: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heatCell: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: colors.primary[100],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
});

export default AnalyticsScreen;
