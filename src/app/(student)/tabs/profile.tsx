// Profile Screen for CampusHub
// Backend-driven - no mock data

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Image,ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import Avatar from '../../../components/ui/Avatar';
import ErrorState from '../../../components/ui/ErrorState';
import Icon from '../../../components/ui/Icon';
import { gamificationAPI,userAPI } from '../../../services/api';
import { useAuthStore } from '../../../store/auth.store';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { borderRadius,spacing } from '../../../theme/spacing';

// Types
interface LinkedProvider {
  id: string;
  provider: 'google' | 'microsoft' | 'apple';
  email: string;
  connected: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  registration_number?: string;
  avatar?: string;
  role?: string;
  department?: string;
  faculty?: string;
  year_of_study?: number;
  phone?: string;
  bio?: string;
}

interface UserStats {
  bookmarks: number;
  downloads: number;
  comments: number;
  uploads: number;
}

interface GamificationStats {
  total_points: number;
  total_uploads: number;
  total_downloads: number;
  total_shares: number;
  total_comments: number;
  leaderboard_rank?: number | null;
  badges: {
    id: string;
    name: string;
    icon: string;
    is_earned: boolean;
    category?: string;
  }[];
}

const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(user);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<LinkedProvider[]>([]);

  const fetchUserData = useCallback(async () => {
    try {
      setError(null);
      
      const [profileRes, linkedAccountsRes, gamificationRes] = await Promise.all([
        userAPI.getProfile(),
        userAPI.getLinkedAccounts().catch(() => ({ data: { data: { linked_providers: [], accounts: [] } } })),
        gamificationAPI.getStats().catch(() => ({ data: { data: null } })), // Graceful fallback
      ]);
      
      const profileData = profileRes.data.data;
      const linkedData = linkedAccountsRes.data.data || {};
      const gamificationData = gamificationRes.data?.data;
      
      setUserProfile(profileData);
      setUserStats({
        bookmarks: profileData?.stats?.total_bookmarks || 0,
        downloads: profileData?.stats?.total_downloads || 0,
        comments: profileData?.stats?.total_comments || 0,
        uploads: profileData?.stats?.total_uploads || 0,
      });
      const accounts = Array.isArray(linkedData?.accounts) ? linkedData.accounts : [];
      const accountMap = new Map<string, any>(
        accounts.map((account: any, index: number) => [
          String(account?.provider || `provider-${index}`),
          account as any,
        ])
      );
      const providerNames = Array.from(
        new Set([
          ...(Array.isArray(linkedData?.linked_providers) ? linkedData.linked_providers : []),
          ...accounts.map((account: any) => String(account?.provider || '').trim()).filter(Boolean),
        ])
      );
      setLinkedProviders(
        providerNames.map((provider: any, index: number) => {
          const account: any = accountMap.get(String(provider));
          return {
            id: String(account?.id || `${provider}-${index}`),
            provider: provider as LinkedProvider['provider'],
            email: account?.provider_email || profileData?.email || '',
            connected: true,
          };
        })
      );
      
      // Set gamification stats if available
      if (gamificationData) {
        const earnedBadges = Array.isArray(gamificationData.earned_badges)
          ? gamificationData.earned_badges
          : [];
        const allBadges = Array.isArray(gamificationData.all_badges)
          ? gamificationData.all_badges
          : [];
        const badgesSource = earnedBadges.length > 0 ? earnedBadges : allBadges;
        const mappedBadges = badgesSource.map((badge: any) => ({
          id: String(badge?.id || ''),
          name: String(badge?.name || 'Badge'),
          icon: String(badge?.icon || ''),
          is_earned: earnedBadges.length > 0 ? true : Boolean(badge?.is_earned),
          category: String(badge?.category || ''),
        }));

        setGamificationStats({
          total_points: Number(gamificationData.total_points || 0),
          total_uploads: Number(gamificationData.total_uploads || 0),
          total_downloads: Number(gamificationData.total_downloads || 0),
          total_shares: Number(gamificationData.total_shares || 0),
          total_comments: Number(gamificationData.total_comments || 0),
          leaderboard_rank:
            gamificationData.leaderboard_rank === null ||
            gamificationData.leaderboard_rank === undefined
              ? null
              : Number(gamificationData.leaderboard_rank),
          badges: mappedBadges,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch user data:', err);
      // Don't show error if we have user from auth store
      if (!user) {
        setError(err.response?.data?.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchUserData();
  }, [fetchUserData]);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive', 
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  const handleMenuPress = (route?: string) => {
    if (route) router.push(route as any);
  };

  const handleProviderPress = (provider: LinkedProvider) => {
    Alert.alert(
      provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1),
      provider.connected 
        ? 'This feature would disconnect your account'
        : 'This feature would connect your account'
    );
  };

  const getProviderIcon = (provider: string): string => {
    switch (provider) {
      case 'google': return 'logo-google';
      case 'apple': return 'logo-apple';
      default: return 'link';
    }
  };

  const getProviderColor = (provider: string): string => {
    switch (provider) {
      case 'google': return '#DB4437';
      case 'microsoft': return '#00A4EF';
      case 'apple': return '#000000';
      default: return colors.text.secondary;
    }
  };

  const menuItems = [
    { id: '1', icon: 'person', label: 'Edit Profile', route: '/(student)/edit-profile' },
    { id: '2', icon: 'key', label: 'Change Password', route: '/(student)/change-password' },
    { id: '3', icon: 'analytics', label: 'My Activity', route: '/(student)/activity' },
    { id: '4', icon: 'download', label: 'My Downloads', route: '/(student)/downloads' },
    { id: '5', icon: 'cloud-upload', label: 'My Uploads', route: '/(student)/my-uploads' },
    { id: '10', icon: 'document-text', label: 'Resource Requests', route: '/(student)/resource-requests' },
    { id: '11', icon: 'trending-up', label: 'My Progress', route: '/(student)/my-progress' },
    { id: '14', icon: 'diamond', label: 'Achievements', route: '/(student)/gamification' },
    { id: '15', icon: 'gift', label: 'Referrals', route: '/(student)/referrals' },
    { id: '12', icon: 'people', label: 'Study Groups', route: '/(student)/study-groups' },
    { id: '13', icon: 'star', label: 'Leaderboard', route: '/(student)/leaderboard' },
    { id: '6', icon: 'notifications', label: 'Notifications', route: '/(student)/notifications' },
    { id: '7', icon: 'shield-checkmark', label: 'Privacy', route: '/(student)/privacy' },
    { id: '8', icon: 'help-circle', label: 'Help & Support', route: '/(student)/help' },
    { id: '9', icon: 'information-circle', label: 'About', route: '/(student)/about' },
  ];

  const getYearLabel = (year?: number) => {
    if (!year) return 'N/A';
    switch (year) {
      case 1: return 'First Year';
      case 2: return 'Second Year';
      case 3: return 'Third Year';
      case 4: return 'Fourth Year';
      case 5: return 'Fifth Year';
      default: return `Year ${year}`;
    }
  };

  const getRankBadge = (rank?: number | null) => {
    if (!rank || rank < 1) return null;
    if (rank <= 3) {
      return { label: 'Elite', icon: 'diamond', color: colors.warning };
    }
    if (rank <= 10) {
      return { label: 'Gold', icon: 'star', color: colors.accent[500] };
    }
    if (rank <= 50) {
      return { label: 'Silver', icon: 'shield-checkmark', color: colors.gray[500] };
    }
    return { label: 'Bronze', icon: 'pricetag', color: colors.accent[700] };
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Error state
  if (error && !userProfile) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  const profile = userProfile;
  const stats = userStats || { bookmarks: 0, downloads: 0, comments: 0, uploads: 0 };
  const rankBadge = getRankBadge(gamificationStats?.leaderboard_rank);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Avatar
            source={profile?.avatar}
            name={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'User'}
            sizePx={80}
            cacheKey={`student-profile-${profile?.id || 'current'}`}
          />
          <TouchableOpacity 
            style={styles.editAvatarBtn}
            onPress={() => router.push('/(student)/edit-profile')}
          >
            <Icon name="camera" size={14} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>
          {profile?.first_name || 'User'} {profile?.last_name || ''}
        </Text>
        <Text style={styles.userEmail}>{profile?.email || 'No email'}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Icon name="school" size={12} color={colors.primary[700]} />
            <Text style={styles.badgeText}>{getYearLabel(profile?.year_of_study)}</Text>
          </View>
          {profile?.department && (
            <View style={styles.badge}>
              <Icon name="book" size={12} color={colors.primary[700]} />
              <Text style={styles.badgeText}>{profile.department}</Text>
            </View>
          )}
          {rankBadge ? (
            <View
              style={[
                styles.tierBadge,
                { backgroundColor: `${rankBadge.color}20` },
              ]}
            >
              <Icon name={rankBadge.icon as any} size={12} color={rankBadge.color} />
              <Text style={[styles.tierBadgeText, { color: rankBadge.color }]}>
                {rankBadge.label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Academic Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Academic Information</Text>
        <View style={styles.academicCard}>
          <View style={styles.academicItem}>
            <Icon name="card" size={20} color={colors.primary[500]} />
            <View style={styles.academicInfo}>
              <Text style={styles.academicLabel}>Student ID</Text>
              <Text style={styles.academicValue}>{profile?.registration_number || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.academicDivider} />
          <View style={styles.academicItem}>
            <Icon name="business" size={20} color={colors.primary[500]} />
            <View style={styles.academicInfo}>
              <Text style={styles.academicLabel}>Faculty</Text>
              <Text style={styles.academicValue}>{profile?.faculty || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.academicDivider} />
          <View style={styles.academicItem}>
            <Icon name="library" size={20} color={colors.primary[500]} />
            <View style={styles.academicInfo}>
              <Text style={styles.academicLabel}>Department</Text>
              <Text style={styles.academicValue}>{profile?.department || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.academicDivider} />
          <View style={styles.academicItem}>
            <Icon name="calendar" size={20} color={colors.primary[500]} />
            <View style={styles.academicInfo}>
              <Text style={styles.academicLabel}>Academic Year</Text>
              <Text style={styles.academicValue}>{getYearLabel(profile?.year_of_study)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats - From Backend */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.bookmarks}</Text>
          <Text style={styles.statLabel}>Bookmarks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.downloads}</Text>
          <Text style={styles.statLabel}>Downloads</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.comments}</Text>
          <Text style={styles.statLabel}>Comments</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.uploads}</Text>
          <Text style={styles.statLabel}>Uploads</Text>
        </View>
      </View>

      {/* Gamification Section */}
      {gamificationStats && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements & Progress</Text>
            {gamificationStats.leaderboard_rank ? (
              <View
                style={[
                  styles.rankBadge,
                  {
                    backgroundColor: `${
                      rankBadge?.color || colors.warning
                    }20`,
                  },
                ]}
              >
                <Icon
                  name={(rankBadge?.icon || 'diamond') as any}
                  size={14}
                  color={rankBadge?.color || colors.warning}
                />
                <Text
                  style={[
                    styles.rankText,
                    { color: rankBadge?.color || colors.warning },
                  ]}
                >
                  {rankBadge ? rankBadge.label : 'Rank'} • #{gamificationStats.leaderboard_rank}
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.gamificationCard}
            activeOpacity={0.9}
            onPress={() => router.push('/(student)/gamification' as any)}
          >
            {/* Points */}
            <View style={styles.pointsRow}>
              <View style={styles.pointsItem}>
                <Icon name="star" size={24} color="#F59E0B" />
                <Text style={styles.pointsValue}>{gamificationStats.total_points}</Text>
                <Text style={styles.pointsLabel}>Points</Text>
              </View>
              {/* Stats Grid */}
              <View style={styles.gamificationStatsGrid}>
                <View style={styles.gamificationStatItem}>
                  <Text style={styles.gamificationStatValue}>{gamificationStats.total_uploads}</Text>
                  <Text style={styles.gamificationStatLabel}>Uploads</Text>
                </View>
                <View style={styles.gamificationStatItem}>
                  <Text style={styles.gamificationStatValue}>{gamificationStats.total_downloads}</Text>
                  <Text style={styles.gamificationStatLabel}>Downloads</Text>
                </View>
                <View style={styles.gamificationStatItem}>
                  <Text style={styles.gamificationStatValue}>{gamificationStats.total_shares}</Text>
                  <Text style={styles.gamificationStatLabel}>Shares</Text>
                </View>
                <View style={styles.gamificationStatItem}>
                  <Text style={styles.gamificationStatValue}>{gamificationStats.total_comments}</Text>
                  <Text style={styles.gamificationStatLabel}>Comments</Text>
                </View>
              </View>
            </View>
            {/* Badges */}
            {gamificationStats.badges && gamificationStats.badges.length > 0 && (
              <View style={styles.badgesSection}>
                <Text style={styles.badgesTitle}>Badges Earned</Text>
                <View style={styles.badgesGrid}>
                  {gamificationStats.badges.filter(b => b.is_earned).slice(0, 6).map((badge) => (
                    <View key={badge.id} style={styles.badgeItem}>
                      <View style={styles.earnedBadge}>
                        <Icon name="bookmark" size={20} color={colors.primary[500]} />
                      </View>
                      <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Linked Providers Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Linked Accounts</Text>
          <TouchableOpacity onPress={() => Alert.alert('Info', 'Link your Google, Microsoft, or Apple account for quick login')}>
            <Icon name="information-circle" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
        <View style={styles.providersCard}>
          {linkedProviders.length > 0 ? (
            linkedProviders.map((provider, index) => (
              <TouchableOpacity 
                key={provider.id} 
                style={[
                  styles.providerItem,
                  index === linkedProviders.length - 1 && styles.providerItemLast
                ]}
                onPress={() => handleProviderPress(provider)}
              >
                <View style={[styles.providerIcon, { backgroundColor: getProviderColor(provider.provider) + '20' }]}>
                  {provider.provider === 'microsoft' ? (
                    <Image
                      source={require('../../../../assets/micro.png')}
                      style={styles.providerBrandIcon}
                      resizeMode="contain"
                    />
                  ) : (
                    <Icon
                      name={getProviderIcon(provider.provider) as any}
                      size={18}
                      color={getProviderColor(provider.provider)}
                    />
                  )}
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>
                    {provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1)}
                  </Text>
                  <Text style={styles.providerEmail}>
                    {provider.connected ? provider.email : 'Not connected'}
                  </Text>
                </View>
                <View style={[
                  styles.providerStatus,
                  { backgroundColor: provider.connected ? colors.success + '20' : colors.background.secondary }
                ]}>
                  <Text style={[
                    styles.providerStatusText,
                    { color: provider.connected ? colors.success : colors.text.tertiary }
                  ]}>
                    {provider.connected ? 'Connected' : 'Connect'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyProviders}>
              <Text style={styles.emptyProvidersText}>No linked accounts</Text>
              <Text style={styles.emptyProvidersSubtext}>Link your Google, Microsoft, or Apple account for easier login</Text>
            </View>
          )}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.menuItem} 
            onPress={() => handleMenuPress(item.route)}
          >
            <View style={styles.menuIconContainer}>
              <Icon name={item.icon as any} size={20} color={colors.primary[500]} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Settings */}
      <TouchableOpacity 
        style={styles.settingsButton} 
        onPress={() => router.push('/(student)/settings')}
      >
        <View style={styles.menuIconContainer}>
          <Icon name="settings" size={20} color={colors.primary[500]} />
        </View>
        <Text style={styles.settingsLabel}>Settings</Text>
        <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="log-out" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background.secondary 
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { 
    paddingHorizontal: spacing[6], 
    paddingTop: spacing[12], 
    paddingBottom: spacing[4] 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: colors.text.primary 
  },
  profileCard: { 
    backgroundColor: colors.card.light, 
    marginHorizontal: spacing[6], 
    borderRadius: borderRadius['2xl'], 
    padding: spacing[6], 
    alignItems: 'center', 
    ...shadows.md 
  },
  avatarContainer: { 
    position: 'relative', 
    marginBottom: spacing[4] 
  },
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: colors.primary[500], 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: { 
    fontSize: 28, 
    fontWeight: '600', 
    color: colors.text.inverse 
  },
  editAvatarBtn: { 
    position: 'absolute', 
    bottom: 0, 
    right: -4, 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: colors.card.light, 
    justifyContent: 'center', 
    alignItems: 'center', 
    ...shadows.sm 
  },
  userName: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: colors.text.primary, 
    marginBottom: spacing[1] 
  },
  userEmail: { 
    fontSize: 14, 
    color: colors.text.secondary, 
    marginBottom: spacing[3] 
  },
  badgeRow: { 
    flexDirection: 'row', 
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  badge: { 
    backgroundColor: colors.primary[50], 
    paddingHorizontal: spacing[3], 
    paddingVertical: spacing[1], 
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  badgeText: { 
    fontSize: 12, 
    fontWeight: '500', 
    color: colors.primary[700] 
  },
  tierBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: spacing[6],
    marginTop: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text.primary, 
    marginBottom: spacing[3] 
  },
  academicCard: { 
    backgroundColor: colors.card.light, 
    borderRadius: borderRadius.xl, 
    padding: spacing[4],
    ...shadows.sm,
  },
  academicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  academicInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  academicLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  academicValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  academicDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing[2],
  },
  statsRow: { 
    flexDirection: 'row', 
    marginHorizontal: spacing[6], 
    marginTop: spacing[6],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border.light,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  providersCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
    overflow: 'hidden',
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  providerItemLast: {
    borderBottomWidth: 0,
  },
  providerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerBrandIcon: {
    width: 18,
    height: 18,
  },
  providerInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  providerEmail: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  providerStatus: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  providerStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyProviders: {
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyProvidersText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  emptyProvidersSubtext: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  menuSection: {
    marginHorizontal: spacing[6],
    marginTop: spacing[6],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
    overflow: 'hidden',
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing[4], 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light 
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  settingsButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginHorizontal: spacing[6],
    marginTop: spacing[4],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: spacing[3],
  },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginHorizontal: spacing[6],
    marginTop: spacing[6],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
    gap: spacing[2],
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.error,
  },
  // Gamification Styles
  gamificationCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  pointsItem: {
    alignItems: 'center',
    marginRight: spacing[6],
    paddingRight: spacing[4],
    borderRightWidth: 1,
    borderRightColor: colors.border.light,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.warning,
    marginTop: spacing[1],
  },
  pointsLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  gamificationStatsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gamificationStatItem: {
    width: '50%',
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  gamificationStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  gamificationStatLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  badgesSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing[4],
    marginTop: spacing[2],
  },
  badgesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeItem: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  earnedBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  badgeName: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}20`,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
    marginLeft: spacing[1],
  },
  bottomSpacing: {
    height: spacing[10],
  },
});

export default ProfileScreen;
