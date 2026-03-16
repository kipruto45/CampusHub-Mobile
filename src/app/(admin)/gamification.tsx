/**
 * Admin Gamification Management Screen
 * Manage badges, leaderboards, and points for the gamification system
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import * as adminService from '../../services/admin-management.service';
import { Badge, GamificationStats, LeaderboardEntry } from '../../services/admin-management.service';

const CATEGORIES = ['all', 'uploads', 'downloads', 'engagement', 'social', 'learning', 'special'];

export default function GamificationManagementScreen() {
  const router = useRouter();
  const { } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'leaderboard'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all_time');
  const [showCreateBadge, setShowCreateBadge] = useState(false);
  const [newBadge, setNewBadge] = useState({
    name: '',
    description: '',
    icon: 'fa-star',
    category: 'uploads',
    points_required: 10,
    requirement_type: 'total_uploads',
    requirement_value: 1,
  });

  const loadData = async () => {
    try {
      if (activeTab === 'overview') {
        const statsData = await adminService.getGamificationStats();
        setStats(statsData);
      } else if (activeTab === 'badges') {
        const badgesData = await adminService.getBadges();
        setBadges(badgesData);
      } else if (activeTab === 'leaderboard') {
        const leaderboardData = await adminService.getLeaderboard(leaderboardPeriod, 20);
        setLeaderboard(leaderboardData);
      }
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeTab, selectedCategory, leaderboardPeriod])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateBadge = async () => {
    try {
      await adminService.createBadge(newBadge);
      setShowCreateBadge(false);
      setNewBadge({
        name: '',
        description: '',
        icon: 'fa-star',
        category: 'uploads',
        points_required: 10,
        requirement_type: 'total_uploads',
        requirement_value: 1,
      });
      loadData();
      Alert.alert('Success', 'Badge created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create badge');
    }
  };

  const handleToggleBadge = async (badge: Badge) => {
    try {
      await adminService.updateBadge(badge.id, { is_active: !badge.is_active });
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update badge');
    }
  };

  const handleRefreshLeaderboard = async () => {
    try {
      await adminService.refreshLeaderboard(leaderboardPeriod);
      loadData();
      Alert.alert('Success', 'Leaderboard refreshed');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh leaderboard');
    }
  };

  const filteredBadges = selectedCategory === 'all' 
    ? badges 
    : badges.filter(b => b.category === selectedCategory);

  const renderOverview = () => {
    if (!stats) return null;
    
    return (
      <View style={styles.overviewContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_points.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_badges_earned}</Text>
            <Text style={styles.statLabel}>Badges Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_users_with_gamification}</Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_achievements}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges by Category</Text>
          <View style={styles.categoryStats}>
            {stats.badges_by_category.map((cat) => (
              <View key={cat.category} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{cat.category}</Text>
                <Text style={styles.categoryCount}>{cat.count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.quickStats}>
            <View style={styles.quickStatRow}>
              <Text>Total Badges Available:</Text>
              <Text style={styles.quickStatValue}>{stats.total_badges_available}</Text>
            </View>
            <View style={styles.quickStatRow}>
              <Text>Active Badges:</Text>
              <Text style={styles.quickStatValue}>{stats.active_badges}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderBadges = () => (
    <View style={styles.badgesContainer}>
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateBadge(true)}>
        <Text style={styles.createButtonText}>+ Create Badge</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredBadges}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.badgeCard}>
            <View style={styles.badgeHeader}>
              <Text style={styles.badgeIcon}>{getBadgeIcon(item.icon)}</Text>
              <View style={styles.badgeInfo}>
                <Text style={styles.badgeName}>{item.name}</Text>
                <Text style={styles.badgeCategory}>{item.category}</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleButton, item.is_active ? styles.toggleActive : styles.toggleInactive]}
                onPress={() => handleToggleBadge(item)}
              >
                <Text style={styles.toggleText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.badgeDescription}>{item.description}</Text>
            <View style={styles.badgeFooter}>
              <Text style={styles.badgePoints}>{item.points_required} points</Text>
              <Text style={styles.badgeEarners}>{item.earned_count} earned</Text>
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );

  const renderLeaderboard = () => (
    <View style={styles.leaderboardContainer}>
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, leaderboardPeriod === 'daily' && styles.periodButtonActive]}
          onPress={() => setLeaderboardPeriod('daily')}
        >
          <Text style={[styles.periodText, leaderboardPeriod === 'daily' && styles.periodTextActive]}>Daily</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, leaderboardPeriod === 'weekly' && styles.periodButtonActive]}
          onPress={() => setLeaderboardPeriod('weekly')}
        >
          <Text style={[styles.periodText, leaderboardPeriod === 'weekly' && styles.periodTextActive]}>Weekly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, leaderboardPeriod === 'monthly' && styles.periodButtonActive]}
          onPress={() => setLeaderboardPeriod('monthly')}
        >
          <Text style={[styles.periodText, leaderboardPeriod === 'monthly' && styles.periodTextActive]}>Monthly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, leaderboardPeriod === 'all_time' && styles.periodButtonActive]}
          onPress={() => setLeaderboardPeriod('all_time')}
        >
          <Text style={[styles.periodText, leaderboardPeriod === 'all_time' && styles.periodTextActive]}>All Time</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshLeaderboard}>
        <Text style={styles.refreshButtonText}>Refresh Leaderboard</Text>
      </TouchableOpacity>

      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.rank.toString()}
        renderItem={({ item }) => (
          <View style={[styles.leaderboardItem, item.rank <= 3 && styles.topThree]}>
            <View style={styles.rankContainer}>
              <Text style={[styles.rank, item.rank <= 3 && styles.topRank]}>#{item.rank}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {item.user.first_name} {item.user.last_name}
              </Text>
              <Text style={styles.userEmail}>{item.user.email}</Text>
            </View>
            <Text style={styles.points}>{item.points.toLocaleString()} pts</Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'badges' && styles.tabActive]}
          onPress={() => setActiveTab('badges')}
        >
          <Text style={[styles.tabText, activeTab === 'badges' && styles.tabTextActive]}>Badges</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'badges' && renderBadges()}
      {activeTab === 'leaderboard' && renderLeaderboard()}

      <Modal visible={showCreateBadge} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Badge</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Badge Name"
              value={newBadge.name}
              onChangeText={(text) => setNewBadge({ ...newBadge, name: text })}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={newBadge.description}
              onChangeText={(text) => setNewBadge({ ...newBadge, description: text })}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Points Required"
              value={newBadge.points_required.toString()}
              onChangeText={(text) => setNewBadge({ ...newBadge, points_required: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateBadge(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleCreateBadge}>
                <Text style={styles.submitButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getBadgeIcon(iconName: string): string {
  const icons: Record<string, string> = {
    'fa-rocket': '🚀',
    'fa-upload': '📤',
    'fa-trophy': '🏆',
    'fa-download': '⬇️',
    'fa-graduation-cap': '🎓',
    'fa-star': '⭐',
    'fa-comments': '💬',
    'fa-users': '👥',
    'fa-check-circle': '✅',
    'fa-fire': '🔥',
  };
  return icons[iconName] || '🏅';
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  overviewContainer: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  categoryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryItem: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  categoryName: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  quickStats: {
    gap: 8,
  },
  quickStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStatValue: {
    fontWeight: '600',
    color: '#1F2937',
  },
  badgesContainer: {
    flex: 1,
    padding: 16,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  createButton: {
    backgroundColor: '#4F46E5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  badgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  badgeCategory: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  toggleActive: {
    backgroundColor: '#D1FAE5',
  },
  toggleInactive: {
    backgroundColor: '#FEE2E2',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  badgeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  badgePoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  badgeEarners: {
    fontSize: 14,
    color: '#6B7280',
  },
  leaderboardContainer: {
    flex: 1,
    padding: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#4F46E5',
  },
  periodText: {
    fontSize: 12,
    color: '#6B7280',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  topThree: {
    backgroundColor: '#FEF3C7',
  },
  rankContainer: {
    width: 50,
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  topRank: {
    color: '#F59E0B',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  points: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1F2937',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    marginLeft: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
