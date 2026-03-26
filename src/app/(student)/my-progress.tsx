import { useFocusEffect,useRouter } from 'expo-router';
import React,{ useCallback,useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { courseProgressAPI,gamificationAPI,paymentsAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

interface CourseProgress {
  course_id: string;
  course_name: string;
  total_resources: number;
  completed_resources: number;
  in_progress_resources: number;
  not_started_resources?: number;
  overall_percentage: number;
  time_spent_minutes: number;
}

interface RecentAchievement {
  id: string;
  title: string;
  description: string;
  points_earned: number;
  milestone_type: string;
  created_at: string;
}

interface BadgeProgress {
  id: string | number;
  name: string;
  description: string;
  icon?: string;
  category?: string;
  requirement_type?: string;
  requirement_value?: number;
  is_earned: boolean;
  progress?: number;
  progress_percentage?: number;
}

interface GamificationSnapshot {
  total_points: number;
  total_uploads: number;
  total_downloads: number;
  total_ratings: number;
  total_comments: number;
  total_shares: number;
  consecutive_login_days: number;
  resources_saved: number;
  leaderboard_rank: number | null;
  recent_achievements: RecentAchievement[];
  earned_badges: BadgeProgress[];
  all_badges: BadgeProgress[];
}

const EMPTY_GAMIFICATION_SNAPSHOT: GamificationSnapshot = {
  total_points: 0,
  total_uploads: 0,
  total_downloads: 0,
  total_ratings: 0,
  total_comments: 0,
  total_shares: 0,
  consecutive_login_days: 0,
  resources_saved: 0,
  leaderboard_rank: null,
  recent_achievements: [],
  earned_badges: [],
  all_badges: [],
};

const normalizeGamificationSnapshot = (payload: any): GamificationSnapshot => ({
  total_points: Number(payload?.total_points || 0),
  total_uploads: Number(payload?.total_uploads || 0),
  total_downloads: Number(payload?.total_downloads || 0),
  total_ratings: Number(payload?.total_ratings || 0),
  total_comments: Number(payload?.total_comments || 0),
  total_shares: Number(payload?.total_shares || 0),
  consecutive_login_days: Number(payload?.consecutive_login_days || 0),
  resources_saved: Number(payload?.resources_saved || 0),
  leaderboard_rank:
    payload?.leaderboard_rank === null || payload?.leaderboard_rank === undefined
      ? null
      : Number(payload.leaderboard_rank),
  recent_achievements: Array.isArray(payload?.recent_achievements)
    ? payload.recent_achievements.map((achievement: any) => ({
        id: String(achievement?.id || ''),
        title: String(achievement?.title || 'Achievement'),
        description: String(achievement?.description || ''),
        points_earned: Number(achievement?.points_earned || 0),
        milestone_type: String(achievement?.milestone_type || ''),
        created_at: String(achievement?.created_at || ''),
      }))
    : [],
  earned_badges: Array.isArray(payload?.earned_badges)
    ? payload.earned_badges.map((badge: any) => ({
        id: badge?.id || '',
        name: String(badge?.name || 'Badge'),
        description: String(badge?.description || ''),
        icon: String(badge?.icon || ''),
        category: String(badge?.category || ''),
        requirement_type: String(badge?.requirement_type || ''),
        requirement_value: Number(badge?.requirement_value || 0),
        is_earned: true,
        progress: Number(badge?.progress || badge?.requirement_value || 0),
        progress_percentage: 100,
      }))
    : [],
  all_badges: Array.isArray(payload?.all_badges)
    ? payload.all_badges.map((badge: any) => ({
        id: badge?.id || '',
        name: String(badge?.name || 'Badge'),
        description: String(badge?.description || ''),
        icon: String(badge?.icon || ''),
        category: String(badge?.category || ''),
        requirement_type: String(badge?.requirement_type || ''),
        requirement_value: Number(badge?.requirement_value || 0),
        is_earned: Boolean(badge?.is_earned),
        progress: Number(badge?.progress || 0),
        progress_percentage: Number(badge?.progress_percentage || 0),
      }))
    : [],
});

const formatTime = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getAchievementIcon = (
  milestoneType: string
): React.ComponentProps<typeof Icon>['name'] => {
  const normalized = milestoneType.toLowerCase();
  if (normalized.includes('upload')) return 'cloud-upload';
  if (normalized.includes('download')) return 'download';
  if (normalized.includes('comment')) return 'chatbubbles';
  if (normalized.includes('share')) return 'share-social';
  if (normalized.includes('login') || normalized.includes('streak')) return 'flame';
  return 'analytics';
};

const getAchievementColor = (milestoneType: string) => {
  const normalized = milestoneType.toLowerCase();
  if (normalized.includes('upload')) return colors.success;
  if (normalized.includes('download')) return colors.primary[500];
  if (normalized.includes('comment')) return colors.info;
  if (normalized.includes('share')) return colors.accent[500];
  if (normalized.includes('login') || normalized.includes('streak')) return colors.warning;
  return colors.primary[500];
};

const getBadgeColor = (category?: string) => {
  switch (String(category || '').toLowerCase()) {
    case 'uploads':
      return colors.success;
    case 'downloads':
      return colors.primary[500];
    case 'engagement':
      return colors.info;
    case 'social':
      return colors.accent[500];
    case 'learning':
      return colors.warning;
    default:
      return colors.primary[500];
  }
};

const getBadgeIcon = (category?: string): React.ComponentProps<typeof Icon>['name'] => {
  switch (String(category || '').toLowerCase()) {
    case 'uploads':
      return 'cloud-upload';
    case 'downloads':
      return 'download';
    case 'engagement':
      return 'chatbubbles';
    case 'social':
      return 'share-social';
    case 'learning':
      return 'school';
    default:
      return 'star';
  }
};

const MyProgressScreen: React.FC = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [progressData, setProgressData] = useState<CourseProgress[]>([]);
  const [gamification, setGamification] = useState<GamificationSnapshot>(
    EMPTY_GAMIFICATION_SNAPSHOT
  );
  const [featureSummary, setFeatureSummary] = useState<any | null>(null);

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);

      const [featureRes, progressRes, gamificationRes] = await Promise.allSettled([
        paymentsAPI.getFeatureAccessSummary(),
        courseProgressAPI.getAllProgress(),
        (async () => {
          await gamificationAPI.checkBadges().catch(() => null);
          return gamificationAPI.getStats().catch(() => null);
        })(),
      ]);

      const featurePayload =
        featureRes.status === 'fulfilled'
          ? featureRes.value?.data?.data ?? featureRes.value?.data ?? null
          : null;
      setFeatureSummary(featurePayload);

      const hasAdvancedAnalytics = featurePayload
        ? Boolean(featurePayload?.feature_flags?.advanced_analytics)
        : true;
      if (!hasAdvancedAnalytics) {
        setProgressData([]);
        setGamification(EMPTY_GAMIFICATION_SNAPSHOT);
        setHasLoadedOnce(true);
        return;
      }

      const partialErrors: string[] = [];

      const progressPayload =
        progressRes.status === 'fulfilled'
          ? progressRes.value?.data?.data ?? progressRes.value?.data ?? []
          : [];
      setProgressData(
        Array.isArray(progressPayload)
          ? progressPayload
              .map((item: any) => ({
                course_id: String(item?.course_id || ''),
                course_name: String(item?.course_name || 'Course'),
                total_resources: Number(item?.total_resources || 0),
                completed_resources: Number(item?.completed_resources || 0),
                in_progress_resources: Number(item?.in_progress_resources || 0),
                not_started_resources: Number(item?.not_started_resources || 0),
                overall_percentage: Number(item?.overall_percentage || 0),
                time_spent_minutes: Number(item?.time_spent_minutes || 0),
              }))
              .sort(
                (left, right) =>
                  right.overall_percentage - left.overall_percentage ||
                  right.completed_resources - left.completed_resources ||
                  right.time_spent_minutes - left.time_spent_minutes
              )
          : []
      );

      if (progressRes.status === 'rejected') {
        partialErrors.push(
          progressRes.reason?.response?.data?.message ||
            progressRes.reason?.response?.data?.detail ||
            progressRes.reason?.message ||
            'course progress'
        );
      }

      const gamificationPayload =
        gamificationRes.status === 'fulfilled'
          ? gamificationRes.value?.data?.data ?? gamificationRes.value?.data ?? null
          : null;
      setGamification(
        gamificationPayload
          ? normalizeGamificationSnapshot(gamificationPayload)
          : EMPTY_GAMIFICATION_SNAPSHOT
      );

      if (gamificationRes.status === 'rejected') {
        partialErrors.push(
          gamificationRes.reason?.response?.data?.message ||
            gamificationRes.reason?.response?.data?.detail ||
            gamificationRes.reason?.message ||
            'gamification'
        );
      }

      if (partialErrors.length === 2) {
        throw new Error('Failed to load your progress.');
      }
      if (partialErrors.length > 0) {
        setError('Some progress details are temporarily unavailable, but the rest of your dashboard is ready.');
      }
      setHasLoadedOnce(true);
    } catch (err: any) {
      console.error('Failed to fetch progress:', err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to load your progress.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchData({ silent: hasLoadedOnce });
      return undefined;
    }, [fetchData, hasLoadedOnce])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchData({ silent: true });
  }, [fetchData]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    void fetchData();
  }, [fetchData]);
  const analyticsLocked = featureSummary?.feature_flags?.advanced_analytics === false;

  const getOverallStats = () => {
    const totalCourses = progressData.length;
    const totalCompleted = progressData.reduce(
      (sum, progress) => sum + progress.completed_resources,
      0
    );
    const totalInProgress = progressData.reduce(
      (sum, progress) => sum + progress.in_progress_resources,
      0
    );
    const totalTime = progressData.reduce(
      (sum, progress) => sum + progress.time_spent_minutes,
      0
    );
    const totalResources = progressData.reduce(
      (sum, progress) => sum + progress.total_resources,
      0
    );
    const avgPercentage =
      totalResources > 0
        ? progressData.reduce(
            (sum, progress) =>
              sum + progress.overall_percentage * (progress.total_resources || 0),
            0
          ) / totalResources
        : 0;

    return {
      totalCourses,
      totalCompleted,
      totalInProgress,
      totalTime,
      avgPercentage,
    };
  };

  const nextMilestones = gamification.all_badges
    .filter((badge) => !badge.is_earned)
    .sort(
      (left, right) =>
        (right.progress_percentage || 0) - (left.progress_percentage || 0) ||
        (right.progress || 0) - (left.progress || 0)
    )
    .slice(0, 3);

  const stats = getOverallStats();
  const primaryCourse = progressData[0];
  const progressStatus =
    progressData.length === 0
      ? {
          title: 'Start your learning streak',
          description: 'Browse resources, open a course, or save materials to begin tracking progress.',
          color: colors.primary[500],
        }
      : stats.avgPercentage < 40
        ? {
            title: 'Focus on your active courses',
            description: 'Your overall completion is still early. Keep momentum by finishing the resources already in progress.',
            color: colors.warning,
          }
        : stats.avgPercentage < 75
          ? {
              title: 'You are building momentum',
              description: 'You have solid progress. Push a few more resources to move your strongest course forward.',
              color: colors.info,
            }
          : {
              title: 'You are on track',
              description: 'Your learning progress is strong. Keep reviewing and share helpful resources with peers.',
              color: colors.success,
            };
  const quickStudyActions = [
    primaryCourse
      ? {
          id: 'course',
          title: 'Open top course',
          route: `/(student)/course/${primaryCourse.course_id}`,
          icon: 'school',
        }
      : {
          id: 'browse',
          title: 'Browse resources',
          route: '/(student)/tabs/resources',
          icon: 'search',
        },
    {
      id: 'recommendations',
      title: 'Recommendations',
      route: '/(student)/recommendations',
      icon: 'analytics',
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard',
      route: '/(student)/leaderboard',
      icon: 'ribbon',
    },
  ];

  if (loading && !hasLoadedOnce) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  if (error && !hasLoadedOnce) {
    return (
      <ErrorState
        type="server"
        title="Unable to Load Progress"
        message={error}
        onRetry={handleRetry}
        onBack={() => router.back()}
      />
    );
  }

  if (analyticsLocked) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="lock-closed"
          title="Upgrade to view your progress"
          description="Advanced progress insights are limited on the Free plan. Upgrade to unlock detailed tracking, analytics, and premium study insights."
          actionLabel="View Plans"
          onAction={() => router.push('/(student)/billing/plans' as any)}
        />
      </View>
    );
  }

  const showEmptyState =
    progressData.length === 0 &&
    gamification.recent_achievements.length === 0 &&
    gamification.earned_badges.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Progress</Text>
        <View style={styles.headerSpacer} />
      </View>

      {error && hasLoadedOnce ? (
        <View style={styles.inlineError}>
          <Icon name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.inlineErrorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.focusCard, { borderColor: `${progressStatus.color}33` }]}>
          <View style={styles.focusHeader}>
            <View style={[styles.focusIcon, { backgroundColor: `${progressStatus.color}18` }]}>
              <Icon name="trending-up" size={20} color={progressStatus.color} />
            </View>
            <View style={styles.focusCopy}>
              <Text style={styles.focusEyebrow}>Next Best Step</Text>
              <Text style={styles.focusTitle}>{progressStatus.title}</Text>
              <Text style={styles.focusDescription}>{progressStatus.description}</Text>
            </View>
          </View>
          <View style={styles.focusMetaRow}>
            <View style={styles.focusMetaPill}>
              <Text style={styles.focusMetaLabel}>{stats.totalInProgress} in progress</Text>
            </View>
            <View style={styles.focusMetaPill}>
              <Text style={styles.focusMetaLabel}>{gamification.recent_achievements.length} recent achievements</Text>
            </View>
          </View>
          <View style={styles.focusActionsRow}>
            {quickStudyActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.focusActionButton}
                onPress={() => router.push(action.route as any)}
              >
                <Icon name={action.icon as any} size={16} color={colors.primary[500]} />
                <Text style={styles.focusActionText}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Overall Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(stats.avgPercentage)}%</Text>
              <Text style={styles.statLabel}>Average</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalCourses}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalCompleted}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatTime(stats.totalTime)}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
          </View>
        </View>

        <View style={styles.highlightsCard}>
          <View style={styles.highlightItem}>
            <Icon name="flash" size={18} color={colors.warning} />
            <Text style={styles.highlightValue}>{gamification.total_points}</Text>
            <Text style={styles.highlightLabel}>Points</Text>
          </View>
          <View style={styles.highlightItem}>
            <Icon name="trending-up" size={18} color={colors.accent[500]} />
            <Text style={styles.highlightValue}>
              {gamification.leaderboard_rank ? `#${gamification.leaderboard_rank}` : '--'}
            </Text>
            <Text style={styles.highlightLabel}>Rank</Text>
          </View>
          <View style={styles.highlightItem}>
            <Icon name="flame" size={18} color={colors.error} />
            <Text style={styles.highlightValue}>{gamification.consecutive_login_days}</Text>
            <Text style={styles.highlightLabel}>Streak</Text>
          </View>
          <View style={styles.highlightItem}>
            <Icon name="shield-checkmark" size={18} color={colors.success} />
            <Text style={styles.highlightValue}>{gamification.earned_badges.length}</Text>
            <Text style={styles.highlightLabel}>Badges</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Course Progress</Text>
        {progressData.length > 0 ? (
          progressData.map((progress) => (
            <TouchableOpacity
              key={progress.course_id}
              style={styles.courseCard}
              onPress={() => router.push(`/(student)/course/${progress.course_id}` as any)}
            >
              <View style={styles.courseHeader}>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{progress.course_name}</Text>
                  <Text style={styles.courseResources}>
                    {progress.completed_resources}/{progress.total_resources} resources completed
                  </Text>
                </View>
                <View style={styles.percentageCircle}>
                  <Text style={styles.percentageText}>
                    {Math.round(progress.overall_percentage)}%
                  </Text>
                </View>
              </View>

              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${Math.max(0, Math.min(progress.overall_percentage, 100))}%` },
                  ]}
                />
              </View>

              <View style={styles.courseStats}>
                <View style={styles.courseStatItem}>
                  <Icon name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.courseStatText}>
                    {progress.completed_resources} completed
                  </Text>
                </View>
                <View style={styles.courseStatItem}>
                  <Icon name="time" size={16} color={colors.warning} />
                  <Text style={styles.courseStatText}>
                    {progress.in_progress_resources} in progress
                  </Text>
                </View>
                <View style={styles.courseStatItem}>
                  <Icon name="hourglass" size={16} color={colors.info} />
                  <Text style={styles.courseStatText}>
                    {formatTime(progress.time_spent_minutes)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.sectionCard}>
            <EmptyState
              icon="analytics"
              title="No learning progress yet"
              description="Open and download course resources to start tracking your learning progress here."
              actionLabel="Browse Resources"
              onAction={() => router.push('/(student)/tabs/resources')}
            />
          </View>
        )}

        <Text style={styles.sectionTitle}>Recent Achievements</Text>
        <View style={styles.sectionCard}>
          {gamification.recent_achievements.length > 0 ? (
            gamification.recent_achievements.slice(0, 5).map((achievement, index) => {
              const accentColor = getAchievementColor(achievement.milestone_type);
              return (
                <View
                  key={achievement.id}
                  style={[
                    styles.achievementItem,
                    index < Math.min(gamification.recent_achievements.length, 5) - 1 &&
                      styles.sectionDivider,
                  ]}
                >
                  <View
                    style={[
                      styles.achievementIcon,
                      { backgroundColor: `${accentColor}20` },
                    ]}
                  >
                    <Icon
                      name={getAchievementIcon(achievement.milestone_type)}
                      size={22}
                      color={accentColor}
                    />
                  </View>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementDesc}>{achievement.description}</Text>
                  </View>
                  <View style={styles.achievementMeta}>
                    <Text style={styles.achievementPoints}>+{achievement.points_earned}</Text>
                    <Text style={styles.achievementDate}>
                      {formatRelativeDate(achievement.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptySectionText}>
              Keep using CampusHub to unlock achievements and badge progress.
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Badges Earned</Text>
        <View style={styles.sectionCard}>
          {gamification.earned_badges.length > 0 ? (
            <View style={styles.badgesGrid}>
              {gamification.earned_badges.slice(0, 8).map((badge) => {
                const badgeColor = getBadgeColor(badge.category);
                return (
                  <View key={String(badge.id)} style={styles.badgeItem}>
                    <View
                      style={[
                        styles.badgeIcon,
                        { backgroundColor: `${badgeColor}20` },
                      ]}
                    >
                      <Icon
                        name={getBadgeIcon(badge.category)}
                        size={20}
                        color={badgeColor}
                      />
                    </View>
                    <Text style={styles.badgeName} numberOfLines={1}>
                      {badge.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptySectionText}>
              Complete uploads, downloads, and learning milestones to earn badges.
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Next Milestones</Text>
        <View style={styles.sectionCard}>
          {nextMilestones.length > 0 ? (
            nextMilestones.map((badge, index) => {
              const badgeColor = getBadgeColor(badge.category);
              const progressValue = Math.max(0, Math.min(100, badge.progress_percentage || 0));
              return (
                <View
                  key={String(badge.id)}
                  style={[
                    styles.milestoneItem,
                    index < nextMilestones.length - 1 && styles.sectionDivider,
                  ]}
                >
                  <View style={styles.milestoneHeader}>
                    <View>
                      <Text style={styles.milestoneTitle}>{badge.name}</Text>
                      <Text style={styles.milestoneDescription}>{badge.description}</Text>
                    </View>
                    <Text style={[styles.milestonePercent, { color: badgeColor }]}>
                      {Math.round(progressValue)}%
                    </Text>
                  </View>
                  <View style={styles.milestoneProgressTrack}>
                    <View
                      style={[
                        styles.milestoneProgressFill,
                        { width: `${progressValue}%`, backgroundColor: badgeColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.milestoneMeta}>
                    {badge.progress || 0}/{badge.requirement_value || 0} towards this badge
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptySectionText}>
              You have unlocked the milestones currently available to your account.
            </Text>
          )}
        </View>

        {showEmptyState ? <View style={styles.bottomSpacer} /> : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: 14,
    color: colors.text.secondary,
  },
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
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text.inverse },
  headerSpacer: { width: 40 },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: `${colors.error}12`,
  },
  inlineErrorText: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
  },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  focusCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    ...shadows.sm,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  focusIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusCopy: {
    flex: 1,
  },
  focusEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  focusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 4,
  },
  focusDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },
  focusMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  focusMetaPill: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  focusMetaLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  focusActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  focusActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  focusActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
  },
  statsCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary[500] },
  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  statDivider: { width: 1, backgroundColor: colors.border.light },
  highlightsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  highlightItem: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    ...shadows.sm,
  },
  highlightValue: {
    marginTop: spacing[2],
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  highlightLabel: {
    marginTop: spacing[1],
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  sectionCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[6],
    ...shadows.sm,
  },
  courseCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  courseInfo: { flex: 1, marginRight: spacing[3] },
  courseName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  courseResources: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  percentageCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: { fontSize: 16, fontWeight: '700', color: colors.primary[500] },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border.light,
    borderRadius: 4,
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.primary[500],
    borderRadius: 4,
  },
  courseStats: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[2] },
  courseStatItem: { flexDirection: 'row', alignItems: 'center' },
  courseStatText: { fontSize: 12, color: colors.text.secondary, marginLeft: spacing[1] },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  achievementInfo: { flex: 1 },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  achievementDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  achievementMeta: {
    alignItems: 'flex-end',
    marginLeft: spacing[3],
  },
  achievementPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  achievementDate: {
    marginTop: spacing[1],
    fontSize: 11,
    color: colors.text.tertiary,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  badgeName: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  emptySectionText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  milestoneItem: {
    paddingVertical: spacing[2],
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  milestoneDescription: {
    marginTop: 2,
    fontSize: 12,
    color: colors.text.secondary,
  },
  milestonePercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  milestoneProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border.light,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  milestoneMeta: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  bottomSpacer: {
    height: spacing[4],
  },
});

export default MyProgressScreen;
