// My Progress Screen for CampusHub
// Track learning progress across courses

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { courseProgressAPI, coursesAPI } from '../../services/api';

interface CourseProgress {
  course_id: string;
  course_name: string;
  total_resources: number;
  completed_resources: number;
  in_progress_resources: number;
  overall_percentage: number;
  time_spent_minutes: number;
}

interface MyCourse {
  id: string;
  name: string;
  code: string;
  year: number;
}

const MyProgressScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [progressData, setProgressData] = useState<CourseProgress[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch user's courses
      const coursesRes = await coursesAPI.list();
      const coursesList = coursesRes.data.results || coursesRes.data;
      setCourses(coursesList);

      // Fetch progress for each course
      const progressPromises = coursesList.map(async (course: MyCourse) => {
        try {
          const progressRes = await courseProgressAPI.getProgress(course.id);
          return {
            course_id: course.id,
            course_name: course.name,
            ...progressRes.data.data,
          };
        } catch {
          return null;
        }
      });

      const progressResults = await Promise.all(progressPromises);
      setProgressData(progressResults.filter(Boolean));
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getOverallStats = () => {
    const totalCompleted = progressData.reduce((sum, p) => sum + (p?.completed_resources || 0), 0);
    const totalInProgress = progressData.reduce((sum, p) => sum + (p?.in_progress_resources || 0), 0);
    const totalTime = progressData.reduce((sum, p) => sum + (p?.time_spent_minutes || 0), 0);
    const avgPercentage = progressData.length > 0 
      ? progressData.reduce((sum, p) => sum + (p?.overall_percentage || 0), 0) / progressData.length 
      : 0;

    return { totalCompleted, totalInProgress, totalTime, avgPercentage };
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const stats = getOverallStats();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {/* Overall Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Overall Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(stats.avgPercentage)}%</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalCompleted}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalInProgress}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatTime(stats.totalTime)}</Text>
              <Text style={styles.statLabel}>Time Spent</Text>
            </View>
          </View>
        </View>

        {/* Course Progress */}
        <Text style={styles.sectionTitle}>Course Progress</Text>
        
        {progressData.length > 0 ? (
          progressData.map((progress) => (
            <TouchableOpacity 
              key={progress?.course_id} 
              style={styles.courseCard}
              onPress={() => router.push(`/(student)/course/${progress?.course_id}` as any)}
            >
              <View style={styles.courseHeader}>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{progress?.course_name || 'Unknown Course'}</Text>
                  <Text style={styles.courseResources}>
                    {progress?.completed_resources || 0}/{progress?.total_resources || 0} resources
                  </Text>
                </View>
                <View style={styles.percentageCircle}>
                  <Text style={styles.percentageText}>{Math.round(progress?.overall_percentage || 0)}%</Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${progress?.overall_percentage || 0}%` }
                  ]} 
                />
              </View>
              
              {/* Course Stats */}
              <View style={styles.courseStats}>
                <View style={styles.courseStatItem}>
                  <Icon name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.courseStatText}>
                    {progress?.completed_resources || 0} completed
                  </Text>
                </View>
                <View style={styles.courseStatItem}>
                  <Icon name="time" size={16} color={colors.warning} />
                  <Text style={styles.courseStatText}>
                    {progress?.in_progress_resources || 0} in progress
                  </Text>
                </View>
                <View style={styles.courseStatItem}>
                  <Icon name="time" size={16} color={colors.info} />
                  <Text style={styles.courseStatText}>
                    {formatTime(progress?.time_spent_minutes || 0)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="book" size={60} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Courses Yet</Text>
            <Text style={styles.emptyText}>
              Enroll in courses to start tracking your progress
            </Text>
          </View>
        )}

        {/* Achievements Section */}
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
        <View style={styles.achievementsCard}>
          <View style={styles.achievementItem}>
            <View style={[styles.achievementIcon, { backgroundColor: colors.success + '20' }]}>
              <Icon name="star" size={24} color={colors.success} />
            </View>
            <View style={styles.achievementInfo}>
              <Text style={styles.achievementTitle}>First Steps</Text>
              <Text style={styles.achievementDesc}>Complete your first resource</Text>
            </View>
          </View>
          <View style={styles.achievementItem}>
            <View style={[styles.achievementIcon, { backgroundColor: colors.warning + '20' }]}>
              <Icon name="star" size={24} color={colors.warning} />
            </View>
            <View style={styles.achievementInfo}>
              <Text style={styles.achievementTitle}>Quick Learner</Text>
              <Text style={styles.achievementDesc}>Complete 5 resources</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary },
  loadingText: { marginTop: spacing[4], fontSize: 14, color: colors.text.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingTop: spacing[12], paddingBottom: spacing[4], backgroundColor: colors.primary[500] },
  backButton: { padding: spacing[2] },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text.inverse },
  content: { padding: spacing[4] },
  statsCard: { backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[6], ...shadows.sm },
  statsTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: spacing[4] },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary[500] },
  statLabel: { fontSize: 11, color: colors.text.secondary, marginTop: spacing[1], textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border.light },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: spacing[3], marginTop: spacing[2] },
  courseCard: { backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[3], ...shadows.sm },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  courseInfo: { flex: 1 },
  courseName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  courseResources: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  percentageCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  percentageText: { fontSize: 16, fontWeight: '700', color: colors.primary[500] },
  progressBarContainer: { height: 8, backgroundColor: colors.border.light, borderRadius: 4, marginBottom: spacing[3] },
  progressBar: { height: 8, backgroundColor: colors.primary[500], borderRadius: 4 },
  courseStats: { flexDirection: 'row', justifyContent: 'space-between' },
  courseStatItem: { flexDirection: 'row', alignItems: 'center' },
  courseStatText: { fontSize: 12, color: colors.text.secondary, marginLeft: spacing[1] },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing[10] },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary, marginTop: spacing[4] },
  emptyText: { fontSize: 14, color: colors.text.secondary, marginTop: spacing[2], textAlign: 'center' },
  achievementsCard: { backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[4], ...shadows.sm },
  achievementItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2] },
  achievementIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  achievementInfo: { marginLeft: spacing[3], flex: 1 },
  achievementTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  achievementDesc: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
});

export default MyProgressScreen;
