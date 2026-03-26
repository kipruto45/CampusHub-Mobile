// Admin Activity Log Screen for CampusHub
// Audit log of admin actions

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,FlatList,RefreshControl,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import Icon from '../../components/ui/Icon';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

interface LogEntry {
  id: string;
  action: string;
  description: string;
  user: { first_name: string; last_name: string };
  target_type: string;
  target_id: string;
  created_at: string;
}

const ActivityLogScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await api.get('/admin/activity-log/');
      setLogs(response.data?.results || response.data || []);
    } catch (_err) { console.error('Failed to fetch logs'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const onRefresh = () => { setRefreshing(true); fetchLogs(); };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return colors.success;
    if (action.includes('update')) return colors.info;
    if (action.includes('delete')) return colors.error;
    return colors.primary[500];
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return 'add-circle';
    if (action.includes('update')) return 'pencil';
    if (action.includes('delete')) return 'trash';
    return 'information-circle';
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Icon name={'arrow-back'} size={24} color={colors.text.inverse} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Log</Text>
      </View>

      <FlatList data={logs} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />}
        renderItem={({ item }) => (
          <View style={styles.logItem}>
            <View style={[styles.iconBox, { backgroundColor: getActionColor(item.action) + '20' }]}>
              <Icon name={getActionIcon(item.action) as any} size={20} color={getActionColor(item.action)} />
            </View>
            <View style={styles.logInfo}>
              <Text style={styles.logAction}>{item.action}</Text>
              <Text style={styles.logDesc}>{item.description}</Text>
              <View style={styles.logMeta}>
                <Text style={styles.logUser}>{item.user?.first_name} {item.user?.last_name}</Text>
                <Text style={styles.logDate}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Icon name={'list'} size={48} color={colors.text.tertiary} /><Text style={styles.emptyText}>No activity yet</Text></View>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing[4], paddingTop: spacing[8], backgroundColor: colors.primary[500] },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.inverse, marginLeft: spacing[3] },
  list: { padding: spacing[4] },
  logItem: { flexDirection: 'row', backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[3], ...shadows.sm },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: spacing[3] },
  logInfo: { flex: 1 },
  logAction: { fontSize: 15, fontWeight: '600', color: colors.text.primary, textTransform: 'capitalize' },
  logDesc: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  logMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2] },
  logUser: { fontSize: 11, color: colors.primary[500] },
  logDate: { fontSize: 11, color: colors.text.tertiary },
  empty: { alignItems: 'center', paddingVertical: spacing[10] },
  emptyText: { fontSize: 16, color: colors.text.tertiary, marginTop: spacing[2] },
});

export default ActivityLogScreen;
