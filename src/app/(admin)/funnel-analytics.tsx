import { useRouter } from 'expo-router';
import React,{ useEffect,useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { adminManagementAPI } from '../../services/api';

interface FunnelData {
  id: string;
  name: string;
  description: string;
  steps: FunnelStep[];
  overall_conversion: number;
  total_users: number;
}

interface FunnelStep {
  step: number;
  name: string;
  event: string;
  count: number;
  conversion_rate: number | null;
}

interface DropOffData {
  step: number;
  step_name: string;
  at_step: number;
  dropped: number;
  drop_rate: number;
}

const { width } = Dimensions.get('window');

export default function FunnelAnalytics() {
  const router = useRouter();
  const [funnels, setFunnels] = useState<FunnelData[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<FunnelData | null>(null);
  const [dropOffData, setDropOffData] = useState<DropOffData[]>([]);
  const [_loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'dropoff'>('overview');

  useEffect(() => {
    fetchFunnels();
  }, []);

  const fetchFunnels = async () => {
    try {
      const response = await adminManagementAPI.listFunnels();
      const data = response?.data?.data ?? response?.data ?? {};
      const results = Array.isArray(data?.results) ? data.results : [];
      setFunnels(results);
      if (results.length > 0) {
        setSelectedFunnel(results[0]);
      }
    } catch (error) {
      console.error('Error fetching funnels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDropOff = async (funnelId: string) => {
    try {
      const response = await adminManagementAPI.getFunnelDropoff(funnelId);
      const data = response?.data?.data ?? response?.data ?? {};
      setDropOffData(Array.isArray(data?.results) ? data.results : []);
    } catch (error) {
      console.error('Error fetching dropoff:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFunnels();
  };

  const selectFunnel = (funnel: FunnelData) => {
    setSelectedFunnel(funnel);
    if (activeTab === 'dropoff') {
      fetchDropOff(funnel.id);
    }
  };

  const renderFunnelBar = (count: number, maxCount: number, color: string) => {
    const barWidth = maxCount > 0 ? (count / maxCount) * (width - 80) : 0;
    
    return (
      <View style={styles.barContainer}>
        <View style={[styles.funnelBar, { width: barWidth, backgroundColor: color }]} />
      </View>
    );
  };

  const renderOverviewTab = () => {
    if (!selectedFunnel) {
      return <Text style={styles.noData}>No funnel selected</Text>;
    }

    const maxCount = Math.max(...selectedFunnel.steps.map(s => s.count), 1);
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    return (
      <View style={styles.funnelContainer}>
        <View style={styles.funnelHeader}>
          <Text style={styles.funnelName}>{selectedFunnel.name}</Text>
          <Text style={styles.funnelDescription}>{selectedFunnel.description}</Text>
        </View>

        <View style={styles.overallStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{selectedFunnel.total_users}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {selectedFunnel.overall_conversion || 0}%
            </Text>
            <Text style={styles.statLabel}>Overall Conversion</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Funnel Steps</Text>
        
        {selectedFunnel.steps.slice(0, -1).map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepInfo}>
                <Text style={styles.stepNumber}>Step {step.step}</Text>
                <Text style={styles.stepName}>{step.name}</Text>
                <Text style={styles.stepEvent}>{step.event}</Text>
              </View>
              <View style={styles.stepStats}>
                <Text style={styles.stepCount}>{step.count}</Text>
                {step.conversion_rate !== null && (
                  <Text style={styles.conversionRate}>
                    {step.conversion_rate}% conversion
                  </Text>
                )}
              </View>
            </View>
            {renderFunnelBar(step.count, maxCount, colors[index % colors.length])}
          </View>
        ))}
      </View>
    );
  };

  const renderDropOffTab = () => {
    if (!selectedFunnel) {
      return <Text style={styles.noData}>No funnel selected</Text>;
    }

    return (
      <View style={styles.dropoffContainer}>
        <Text style={styles.sectionTitle}>Drop-off Analysis</Text>
        
        {dropOffData.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading drop-off data...</Text>
            <TouchableOpacity
              style={styles.loadButton}
              onPress={() => fetchDropOff(selectedFunnel.id)}
            >
              <Text style={styles.loadButtonText}>Load Data</Text>
            </TouchableOpacity>
          </View>
        ) : (
          dropOffData.map((data, index) => (
            <View key={index} style={styles.dropoffCard}>
              <View style={styles.dropoffHeader}>
                <Text style={styles.dropoffStep}>Step {data.step}</Text>
                <Text style={styles.dropoffName}>{data.step_name}</Text>
              </View>
              
              <View style={styles.dropoffStats}>
                <View style={styles.dropoffStat}>
                  <Text style={styles.dropoffValue}>{data.at_step}</Text>
                  <Text style={styles.dropoffLabel}>Users at Step</Text>
                </View>
                <View style={styles.dropoffStat}>
                  <Text style={[styles.dropoffValue, { color: '#EF4444' }]}>
                    {data.dropped}
                  </Text>
                  <Text style={styles.dropoffLabel}>Dropped</Text>
                </View>
                <View style={styles.dropoffStat}>
                  <Text style={[styles.dropoffValue, { color: '#F59E0B' }]}>
                    {data.drop_rate}%
                  </Text>
                  <Text style={styles.dropoffLabel}>Drop Rate</Text>
                </View>
              </View>
              
              <View style={styles.dropRateBar}>
                <View
                  style={[
                    styles.dropRateFill,
                    { width: `${Math.min(data.drop_rate, 100)}%` },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Funnel Analytics</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.funnelSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {funnels.map(funnel => (
            <TouchableOpacity
              key={funnel.id}
              style={[
                styles.funnelChip,
                selectedFunnel?.id === funnel.id && styles.funnelChipActive,
              ]}
              onPress={() => selectFunnel(funnel)}
            >
              <Text
                style={[
                  styles.funnelChipText,
                  selectedFunnel?.id === funnel.id && styles.funnelChipTextActive,
                ]}
              >
                {funnel.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'overview' && styles.tabTextActive,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dropoff' && styles.tabActive]}
          onPress={() => {
            setActiveTab('dropoff');
            if (selectedFunnel) {
              fetchDropOff(selectedFunnel.id);
            }
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'dropoff' && styles.tabTextActive,
            ]}
          >
            Drop-off Analysis
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'overview' ? renderOverviewTab() : renderDropOffTab()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 16,
    color: '#3B82F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  funnelSelector: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  funnelChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  funnelChipActive: {
    backgroundColor: '#3B82F6',
  },
  funnelChipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  funnelChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  funnelContainer: {
    padding: 16,
  },
  funnelHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  funnelName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  funnelDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  overallStats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepInfo: {
    flex: 1,
  },
  stepNumber: {
    fontSize: 12,
    color: '#6B7280',
  },
  stepName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  stepEvent: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  stepStats: {
    alignItems: 'flex-end',
  },
  stepCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  conversionRate: {
    fontSize: 12,
    color: '#10B981',
  },
  barContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  funnelBar: {
    height: '100%',
    borderRadius: 4,
  },
  noData: {
    textAlign: 'center',
    color: '#6B7280',
    padding: 40,
  },
  dropoffContainer: {
    padding: 16,
  },
  dropoffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dropoffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropoffStep: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  dropoffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  dropoffStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dropoffStat: {
    flex: 1,
    alignItems: 'center',
  },
  dropoffValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  dropoffLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  dropRateBar: {
    height: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    overflow: 'hidden',
  },
  dropRateFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  loadButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loadButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
