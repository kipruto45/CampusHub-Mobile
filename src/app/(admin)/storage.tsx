// Admin Storage/System Health Screen for CampusHub
// Platform storage analytics and system health

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,RefreshControl,ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import Icon from '../../components/ui/Icon';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

interface SystemHealthData {
  storage: {
    total_files: number;
    total_size_bytes: number;
    total_size_mb: number;
    total_size_gb: number;
    average_size_mb: number;
    largest_resources: { id: string; title: string; size_mb: number }[];
  };
  database: { healthy: boolean; error?: string };
  api: { status: string };
  errors: { errors_last_24h: number };
  active_users: { last_24h: number; last_7_days: number; last_30_days: number };
  timestamp: string;
}

const StorageScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<SystemHealthData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get('/admin-management/system-health/');
      setData(response.data);
    } catch (_err) { console.error('Failed to fetch system health'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Icon name={'arrow-back'} size={24} color={colors.text.inverse} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Storage & System</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />}>
        {/* Storage Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Overview</Text>
          <View style={styles.card}>
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statValue}>{data?.storage?.total_files || 0}</Text><Text style={styles.statLabel}>Total Files</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{data?.storage?.total_size_gb?.toFixed(2) || '0'} GB</Text><Text style={styles.statLabel}>Total Size</Text></View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statValue}>{data?.storage?.average_size_mb?.toFixed(2) || '0'} MB</Text><Text style={styles.statLabel}>Avg Size</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{data?.storage?.total_size_mb?.toFixed(0) || '0'} MB</Text><Text style={styles.statLabel}>Size (MB)</Text></View>
            </View>
          </View>
        </View>

        {/* System Health */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Health</Text>
          <View style={styles.card}>
            <View style={styles.healthRow}>
              <View style={styles.healthItem}>
                <View style={[styles.healthDot, { backgroundColor: data?.database?.healthy ? colors.success : colors.error }]} />
                <Text style={styles.healthLabel}>Database</Text>
              </View>
              <Text style={styles.healthValue}>{data?.database?.healthy ? 'Healthy' : 'Error'}</Text>
            </View>
            <View style={styles.healthRow}>
              <View style={styles.healthItem}>
                <View style={[styles.healthDot, { backgroundColor: data?.api?.status === 'running' ? colors.success : colors.warning }]} />
                <Text style={styles.healthLabel}>API</Text>
              </View>
              <Text style={styles.healthValue}>{data?.api?.status || 'Unknown'}</Text>
            </View>
            <View style={styles.healthRow}>
              <View style={styles.healthItem}>
                <Text style={styles.healthLabel}>Errors (24h)</Text>
              </View>
              <Text style={styles.healthValue}>{data?.errors?.errors_last_24h || 0}</Text>
            </View>
          </View>
        </View>

        {/* Active Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Users</Text>
          <View style={styles.card}>
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statValue}>{data?.active_users?.last_24h || 0}</Text><Text style={styles.statLabel}>Last 24h</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{data?.active_users?.last_7_days || 0}</Text><Text style={styles.statLabel}>Last 7 days</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{data?.active_users?.last_30_days || 0}</Text><Text style={styles.statLabel}>Last 30 days</Text></View>
            </View>
          </View>
        </View>

        {/* Largest Resources */}
        {data?.storage?.largest_resources && data.storage.largest_resources.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Largest Resources</Text>
            <View style={styles.card}>
              {data.storage.largest_resources.map((item, index) => (
                <View key={item.id || index} style={styles.resourceItem}>
                  <Text style={styles.resourceRank}>{index + 1}</Text>
                  <View style={styles.resourceInfo}>
                    <Text style={styles.resourceTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.resourceSize}>{item.size_mb} MB</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing[4], paddingTop: spacing[8], backgroundColor: colors.primary[500] },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.inverse, marginLeft: spacing[3] },
  section: { padding: spacing[4] },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: spacing[3] },
  card: { backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[6], ...shadows.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing[4] },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary[500] },
  statLabel: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border.light },
  healthItem: { flexDirection: 'row', alignItems: 'center' },
  healthDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing[2] },
  healthLabel: { fontSize: 14, color: colors.text.primary },
  healthValue: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
  resourceItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2] },
  resourceRank: { width: 24, fontSize: 14, fontWeight: '600', color: colors.text.tertiary },
  resourceInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  resourceTitle: { fontSize: 14, color: colors.text.primary, flex: 1 },
  resourceSize: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
});

export default StorageScreen;
