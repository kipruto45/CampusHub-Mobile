import { useLocalSearchParams,useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Icon from '../../../components/ui/Icon';
import { courseProgressAPI,coursesAPI } from '../../../services/api';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { borderRadius,spacing } from '../../../theme/spacing';

interface CourseProgressSummary {
  course_id: string;
  total_resources: number;
  completed_resources: number;
  in_progress_resources: number;
  not_started_resources?: number;
  overall_percentage: number;
  time_spent_minutes: number;
}

interface UnitItem {
  id: string;
  name: string;
  code: string;
}

const formatTime = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const CourseProgressDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courseName, setCourseName] = useState('Course Progress');
  const [summary, setSummary] = useState<CourseProgressSummary | null>(null);
  const [units, setUnits] = useState<UnitItem[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [summaryResponse, unitsResponse, coursesResponse] = await Promise.all([
        courseProgressAPI.getProgress(id),
        coursesAPI.getUnits(id).catch(() => ({ data: { data: { results: [] } } })),
        coursesAPI.list().catch(() => ({ data: { data: { results: [] } } })),
      ]);

      const summaryPayload = summaryResponse.data.data || {};
      const unitsPayload = unitsResponse.data.data || {};
      const coursesPayload = coursesResponse.data.data || {};

      setSummary(summaryPayload);
      setUnits(unitsPayload.results || unitsPayload.units || []);

      const course = (coursesPayload.results || coursesPayload.courses || []).find(
        (item: any) => String(item?.id) === String(id)
      );
      setCourseName(course?.name || 'Course Progress');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {courseName}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          fetchData();
        }} />}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Progress Summary</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{Math.round(summary?.overall_percentage || 0)}%</Text>
              <Text style={styles.metricLabel}>Completed</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{summary?.completed_resources || 0}</Text>
              <Text style={styles.metricLabel}>Finished</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{summary?.in_progress_resources || 0}</Text>
              <Text style={styles.metricLabel}>In Progress</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{formatTime(summary?.time_spent_minutes || 0)}</Text>
              <Text style={styles.metricLabel}>Time</Text>
            </View>
          </View>
        </View>

        <View style={styles.unitsCard}>
          <Text style={styles.sectionTitle}>Units</Text>
          {units.length > 0 ? (
            units.map((unit) => (
              <View key={unit.id} style={styles.unitRow}>
                <View style={styles.unitIcon}>
                  <Icon name="book" size={18} color={colors.primary[500]} />
                </View>
                <View style={styles.unitInfo}>
                  <Text style={styles.unitName}>{unit.name}</Text>
                  <Text style={styles.unitCode}>{unit.code}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No units available for this course yet.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    backgroundColor: colors.primary[500],
  },
  backButton: { padding: spacing[2] },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.text.inverse, fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 40 },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  summaryCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  unitsCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing[3] },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 20, fontWeight: '700', color: colors.primary[500] },
  metricLabel: { marginTop: spacing[1], fontSize: 12, color: colors.text.secondary },
  unitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3] },
  unitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  unitInfo: { flex: 1 },
  unitName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  unitCode: { marginTop: spacing[1], fontSize: 12, color: colors.text.secondary },
  emptyText: { fontSize: 13, color: colors.text.secondary },
});

export default CourseProgressDetailScreen;
