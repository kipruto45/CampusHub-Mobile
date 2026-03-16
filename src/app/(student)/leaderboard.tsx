// Leaderboard Screen for CampusHub
// Display top students by points, uploads, downloads

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import Avatar from '../../components/ui/Avatar';
import { gamificationAPI } from '../../services/api';

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
    profile_image_url?: string;
  };
  total_points: number;
  total_uploads: number;
  total_downloads: number;
  total_shares: number;
}

const LeaderboardScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('all_time');

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await gamificationAPI.getLeaderboard(selectedPeriod);
      // Mobile API returns { data: { entries: [...] } }
      const entries = response.data.data?.entries || response.data.data || [];
      setLeaderboard(entries);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setLeaderboard([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return { icon: 'trophy', color: '#FFD700' }; // Gold
    if (rank === 2) return { icon: 'trophy', color: '#C0C0C0' }; // Silver
    if (rank === 3) return { icon: 'trophy', color: '#CD7F32' }; // Bronze
    return null;
  };

  const renderTopThree = () => {
    if (leaderboard.length < 3) return null;
    
    const topThree = [leaderboard[1], leaderboard[0], leaderboard[2]];
    
    return (
      <View style={styles.topThreeContainer}>
        {/* Second Place */}
        <TouchableOpacity style={[styles.topThreeCard, styles.secondPlace]}>
          <Avatar
            forceInitials
            source={topThree[0].user.avatar || topThree[0].user.profile_image_url}
            name={`${topThree[0].user.first_name} ${topThree[0].user.last_name}`.trim()}
            sizePx={56}
            cacheKey={`leaderboard-${topThree[0].user.id}`}
          />
          <View style={[styles.rankBadge, { backgroundColor: '#C0C0C0' }]}>
            <Text style={styles.rankBadgeText}>2</Text>
          </View>
          <Text style={styles.topThreeName} numberOfLines={1}>{topThree[0].user.first_name}</Text>
          <Text style={styles.topThreePoints}>{topThree[0].total_points} pts</Text>
        </TouchableOpacity>

        {/* First Place */}
        <TouchableOpacity style={[styles.topThreeCard, styles.firstPlace]}>
          <View style={styles.crownIcon}>
            <Icon name="star" size={20} color="#FFD700" />
          </View>
          <Avatar
            forceInitials
            source={topThree[1].user.avatar || topThree[1].user.profile_image_url}
            name={`${topThree[1].user.first_name} ${topThree[1].user.last_name}`.trim()}
            sizePx={56}
            cacheKey={`leaderboard-${topThree[1].user.id}`}
          />
          <View style={[styles.rankBadge, { backgroundColor: '#FFD700' }]}>
            <Text style={styles.rankBadgeText}>1</Text>
          </View>
          <Text style={styles.topThreeName} numberOfLines={1}>{topThree[1].user.first_name}</Text>
          <Text style={styles.topThreePoints}>{topThree[1].total_points} pts</Text>
        </TouchableOpacity>

        {/* Third Place */}
        <TouchableOpacity style={[styles.topThreeCard, styles.thirdPlace]}>
          <Avatar
            forceInitials
            source={topThree[2].user.avatar || topThree[2].user.profile_image_url}
            name={`${topThree[2].user.first_name} ${topThree[2].user.last_name}`.trim()}
            sizePx={56}
            cacheKey={`leaderboard-${topThree[2].user.id}`}
          />
          <View style={[styles.rankBadge, { backgroundColor: '#CD7F32' }]}>
            <Text style={styles.rankBadgeText}>3</Text>
          </View>
          <Text style={styles.topThreeName} numberOfLines={1}>{topThree[2].user.first_name}</Text>
          <Text style={styles.topThreePoints}>{topThree[2].total_points} pts</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
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
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Period Filters */}
      <View style={styles.filtersContainer}>
        {(['daily', 'weekly', 'monthly', 'all_time'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[styles.filterButton, selectedPeriod === period && styles.filterButtonActive]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[styles.filterText, selectedPeriod === period && styles.filterTextActive]}>
              {period === 'all_time' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {/* Top Three Podium */}
        {leaderboard.length >= 3 && renderTopThree()}

        {/* Full Leaderboard */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Full Rankings</Text>
          {leaderboard.map((entry, index) => {
            const rankIcon = getRankIcon(entry.rank);
            return (
              <View key={entry.user.id} style={styles.leaderboardItem}>
                <View style={styles.rankContainer}>
                  {rankIcon ? (
                    <View style={[styles.rankIconContainer, { backgroundColor: rankIcon.color + '20' }]}>
                      <Icon name={rankIcon.icon as any} size={16} color={rankIcon.color} />
                    </View>
                  ) : (
                    <Text style={styles.rankNumber}>{entry.rank}</Text>
                  )}
                </View>
                
                <View style={styles.userInfo}>
                  <Avatar
                    forceInitials
                    source={entry.user.avatar || entry.user.profile_image_url}
                    name={`${entry.user.first_name} ${entry.user.last_name}`.trim()}
                    size="md"
                    cacheKey={`leaderboard-${entry.user.id}`}
                  />
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {entry.user.first_name} {entry.user.last_name}
                    </Text>
                    <Text style={styles.userStats}>
                      {entry.total_uploads} uploads • {entry.total_downloads} downloads
                    </Text>
                  </View>
                </View>
                
                <View style={styles.pointsContainer}>
                  <Text style={styles.pointsValue}>{entry.total_points}</Text>
                  <Text style={styles.pointsLabel}>pts</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
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
  backButton: {
    padding: spacing[2],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.primary[500],
  },
  filterButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterButtonActive: {
    backgroundColor: colors.background.primary,
  },
  filterText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.primary[500],
  },
  content: {
    padding: spacing[4],
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: spacing[6],
    paddingTop: spacing[4],
  },
  topThreeCard: {
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    ...shadows.md,
    width: 100,
    marginHorizontal: spacing[2],
  },
  firstPlace: {
    paddingTop: spacing[6],
    backgroundColor: colors.warning[50],
    borderWidth: 2,
    borderColor: colors.warning[400],
  },
  secondPlace: {
    paddingTop: spacing[4],
  },
  thirdPlace: {
    paddingTop: spacing[4],
  },
  crownIcon: {
    position: 'absolute',
    top: -12,
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.full,
    padding: spacing[1],
  },
  topThreeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: spacing[2],
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary[700],
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  topThreeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  topThreePoints: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  listContainer: {
    marginTop: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
    ...shadows.sm,
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
  },
  rankIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userDetails: {
    marginLeft: spacing[3],
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  userStats: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.warning[600],
  },
  pointsLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
});

export default LeaderboardScreen;
