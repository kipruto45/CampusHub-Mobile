/**
 * Dashboard Builder Screen
 * Customize admin dashboard with widgets and layouts
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
  Alert,
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { getApiBaseUrl } from '../../services/api';

interface Widget {
  type: string;
  name: string;
  description: string;
  default_size: { w: number; h: number };
}

interface Layout {
  id: string;
  name: string;
  is_default: boolean;
  widgets: any[];
}

export default function DashboardBuilderScreen() {
  const { accessToken: token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch widgets
      const widgetsResponse = await fetch(
        `${getApiBaseUrl()}/api/admin/dashboard/widgets/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (widgetsResponse.ok) {
        const data = await widgetsResponse.json();
        setWidgets(data.widgets || []);
      }

      // Fetch layouts
      const layoutsResponse = await fetch(
        `${getApiBaseUrl()}/api/admin/dashboard/layouts/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (layoutsResponse.ok) {
        const data = await layoutsResponse.json();
        setLayouts(data.layouts || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getWidgetIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      stats_card: '📊',
      kpi_card: '🎯',
      chart_line: '📈',
      chart_bar: '📊',
      chart_pie: '🥧',
      table: '📋',
      list: '📝',
      activity_feed: '⚡',
      quick_actions: '🚀',
      notifications: '🔔',
      resource_queue: '✅',
      user_table: '👥',
    };
    return icons[type] || '📦';
  };

  const getLayoutPreview = (layout: Layout) => {
    const widgetCount = layout.widgets?.length || 0;
    return `${widgetCount} widgets`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Predefined Layouts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dashboard Layouts</Text>
        <Text style={styles.sectionSubtitle}>
          Choose from predefined layouts or customize your own
        </Text>

        <View style={styles.layoutGrid}>
          {layouts.map((layout) => (
            <TouchableOpacity
              key={layout.id}
              style={[
                styles.layoutCard,
                selectedLayout === layout.id && styles.layoutCardSelected,
              ]}
              onPress={() => {
                setSelectedLayout(layout.id);
                Alert.alert(
                  'Layout Selected',
                  `${layout.name} selected as your dashboard`,
                  [{ text: 'OK' }]
                );
              }}
            >
              <View style={styles.layoutIcon}>
                <Text style={styles.layoutIconText}>
                  {layout.is_default ? '⭐' : '📐'}
                </Text>
              </View>
              <Text style={styles.layoutName}>{layout.name}</Text>
              <Text style={styles.layoutInfo}>{getLayoutPreview(layout)}</Text>
              {layout.is_default && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Available Widgets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Widgets</Text>
        <Text style={styles.sectionSubtitle}>
          Drag and drop widgets to customize your dashboard
        </Text>

        <View style={styles.widgetGrid}>
          {widgets.map((widget) => (
            <View key={widget.type} style={styles.widgetCard}>
              <Text style={styles.widgetIcon}>{getWidgetIcon(widget.type)}</Text>
              <View style={styles.widgetInfo}>
                <Text style={styles.widgetName}>{widget.name}</Text>
                <Text style={styles.widgetDescription} numberOfLines={2}>
                  {widget.description}
                </Text>
                <Text style={styles.widgetSize}>
                  Size: {widget.default_size.w}x{widget.default_size.h}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Widget Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Widget Categories</Text>

        <View style={styles.categoryList}>
          <View style={styles.categoryItem}>
            <Text style={styles.categoryIcon}>📊</Text>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>Statistics</Text>
              <Text style={styles.categoryCount}>
                {widgets.filter(w => 
                  ['stats_card', 'kpi_card'].includes(w.type)
                ).length} widgets
              </Text>
            </View>
          </View>

          <View style={styles.categoryItem}>
            <Text style={styles.categoryIcon}>📈</Text>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>Charts</Text>
              <Text style={styles.categoryCount}>
                {widgets.filter(w => 
                  ['chart_line', 'chart_bar', 'chart_pie'].includes(w.type)
                ).length} widgets
              </Text>
            </View>
          </View>

          <View style={styles.categoryItem}>
            <Text style={styles.categoryIcon}>📋</Text>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>Data</Text>
              <Text style={styles.categoryCount}>
                {widgets.filter(w => 
                  ['table', 'list', 'user_table'].includes(w.type)
                ).length} widgets
              </Text>
            </View>
          </View>

          <View style={styles.categoryItem}>
            <Text style={styles.categoryIcon}>🔔</Text>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>Activity</Text>
              <Text style={styles.categoryCount}>
                {widgets.filter(w => 
                  ['activity_feed', 'notifications', 'resource_queue'].includes(w.type)
                ).length} widgets
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Tips</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>
            • Tap on a layout to select it as your dashboard{'\n'}
            • Predefined layouts include Overview, Analytics, and Moderation{'\n'}
            • Custom layouts can be created via the API{'\n'}
            • Widgets refresh automatically every 5 minutes
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  layoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  layoutCard: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  layoutCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  layoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  layoutIconText: {
    fontSize: 24,
  },
  layoutName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  layoutInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  defaultBadge: {
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  widgetGrid: {
    gap: 12,
  },
  widgetCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  widgetIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  widgetInfo: {
    flex: 1,
  },
  widgetName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  widgetDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  widgetSize: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  categoryList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  categoryCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  tipCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
});
