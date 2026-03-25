// Admin User Detail Screen for CampusHub
// Detailed view of a user account

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import { adminAPI } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { strings } from '../../constants/strings';

interface UserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string;
  profile?: {
    avatar?: string;
    bio?: string;
    department?: string;
    faculty?: string;
    course?: string;
    year_of_study?: number;
    registration_number?: string;
  };
  stats?: {
    total_uploads: number;
    total_downloads: number;
    total_bookmarks: number;
    total_favorites: number;
  };
}

interface Activity {
  id: string;
  action: string;
  resource?: string;
  created_at: string;
}

interface UploadedResource {
  id: string;
  title: string;
  file_type: string;
  status: string;
  file_size: number;
  created_at: string;
  download_count: number;
}

const UserDetailScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [uploads, setUploads] = useState<UploadedResource[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'uploads'>('profile');
  const [activityFilter, setActivityFilter] = useState<'all' | 'uploads' | 'downloads' | 'auth'>('all');
  const [activityRange, setActivityRange] = useState<'all' | '7d' | '30d'>('all');

  const fetchUserDetail = useCallback(async () => {
    try {
      setError(null);
      const [userRes, activityRes] = await Promise.all([
        adminAPI.getUser(String(id)),
        adminAPI.getUserActivities(String(id)),
      ]);
      setUser(userRes.data.data);
      setActivities(activityRes.data?.data?.results || []);
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      setError(err.response?.data?.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUserDetail();
  }, [fetchUserDetail]);

  const fetchUserUploads = useCallback(async () => {
    if (activeTab !== 'uploads') return;
    setUploadsLoading(true);
    try {
      const response = await adminAPI.getUserUploads(String(id), { page_size: 50 });
      setUploads(response.data?.data?.results || []);
    } catch (err) {
      console.error('Failed to fetch user uploads:', err);
    } finally {
      setUploadsLoading(false);
    }
  }, [id, activeTab]);

  useEffect(() => {
    fetchUserUploads();
  }, [fetchUserUploads]);

  const filteredActivities = activities.filter((activity) => {
    const action = (activity.action || '').toLowerCase();
    if (activityFilter === 'uploads' && !action.includes('upload')) return false;
    if (activityFilter === 'downloads' && !action.includes('download')) return false;
    if (activityFilter === 'auth' && !(action.includes('login') || action.includes('auth'))) return false;

    if (activityRange !== 'all' && activity.created_at) {
      const created = new Date(activity.created_at).getTime();
      const now = Date.now();
      const diffDays = (now - created) / (1000 * 60 * 60 * 24);
      if (activityRange === '7d' && diffDays > 7) return false;
      if (activityRange === '30d' && diffDays > 30) return false;
    }
    return true;
  });

  const handleToggleStatus = async () => {
    if (!user) return;
    try {
      await adminAPI.updateUserStatus(String(id), !user.is_active);
      setUser(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
      showToast('success', user.is_active ? strings.users.deactivate : strings.users.activate);
    } catch (err: any) {
      showToast('error', strings.users.updateFailed);
    }
  };

  const handleImpersonate = async () => {
    try {
      const resp = await adminAPI.impersonateUser(String(id));
      if (resp?.access) {
        await Clipboard.setStringAsync(resp.access);
        showToast('success', 'Impersonation token copied (30 min).');
      } else {
        showToast('error', 'No token returned.');
      }
    } catch (err) {
      showToast('error', 'Failed to generate impersonation token.');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return colors.error;
      case 'staff': return colors.warning;
      case 'instructor': return colors.primary[500];
      default: return colors.info;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error || !user) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load"
        message={error || 'User not found'}
        onRetry={fetchUserDetail}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name={'arrow-back'} size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user.profile?.avatar ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.first_name?.[0] || user.email[0].toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary[500] }]}>
                <Text style={styles.avatarText}>
                  {user.first_name?.[0] || user.email[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.statusDot, { backgroundColor: user.is_active ? colors.success : colors.error }]} />
          </View>
          
          <Text style={styles.userName}>{user.first_name} {user.last_name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: getRoleBadgeColor(user.role) + '20' }]}>
              <Text style={[styles.badgeText, { color: getRoleBadgeColor(user.role) }]}>
                {user.role || 'Student'}
              </Text>
            </View>
            {user.is_verified && (
              <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.success }]}>Verified</Text>
              </View>
            )}
            {user.is_staff && (
              <View style={[styles.badge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.warning }]}>Staff</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user.stats?.total_uploads || 0}</Text>
            <Text style={styles.statLabel}>Uploads</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user.stats?.total_downloads || 0}</Text>
            <Text style={styles.statLabel}>Downloads</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user.stats?.total_bookmarks || 0}</Text>
            <Text style={styles.statLabel}>Bookmarks</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user.stats?.total_favorites || 0}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['profile', 'activity', 'uploads'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'profile' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Information</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user.email}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: user.is_active ? colors.success + '20' : colors.error + '20' }]}>
                    <Text style={[styles.statusText, { color: user.is_active ? colors.success : colors.error }]}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Joined</Text>
                  <Text style={styles.infoValue}>
                    {new Date(user.date_joined).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last Login</Text>
                  <Text style={styles.infoValue}>
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </Text>
                </View>
              </View>

              {user.profile && (
                <>
                  <Text style={styles.sectionTitle}>Academic Information</Text>
                  <View style={styles.infoCard}>
                    {user.profile.faculty && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Faculty</Text>
                        <Text style={styles.infoValue}>{user.profile.faculty}</Text>
                      </View>
                    )}
                    {user.profile.department && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Department</Text>
                        <Text style={styles.infoValue}>{user.profile.department}</Text>
                      </View>
                    )}
                    {user.profile.course && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Course</Text>
                        <Text style={styles.infoValue}>{user.profile.course}</Text>
                      </View>
                    )}
                    {user.profile.year_of_study && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Year</Text>
                        <Text style={styles.infoValue}>Year {user.profile.year_of_study}</Text>
                      </View>
                    )}
                    {user.profile.registration_number && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Reg. Number</Text>
                        <Text style={styles.infoValue}>{user.profile.registration_number}</Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: user.is_active ? colors.error + '20' : colors.success + '20' }]}
                  onPress={handleToggleStatus}
                >
                  <Icon name={user.is_active ? 'close-circle' : 'checkmark-circle'} size={20} 
                    color={user.is_active ? colors.error : colors.success} />
                  <Text style={[styles.actionText, { color: user.is_active ? colors.error : colors.success }]}>
                    {user.is_active ? 'Deactivate' : 'Activate'} User
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary[500] + '15' }]}
                  onPress={handleImpersonate}
                >
                  <Icon name="person-circle" size={20} color={colors.primary[500]} />
                  <Text style={[styles.actionText, { color: colors.primary[500] }]}>
                    Impersonate (copy token)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'activity' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.filterRow}>
                {(['all', 'uploads', 'downloads', 'auth'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, activityFilter === f && styles.chipActive]}
                    onPress={() => setActivityFilter(f)}
                  >
                    <Text style={[styles.chipText, activityFilter === f && styles.chipTextActive]}>
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.filterRow}>
                {(['all', '7d', '30d'] as const).map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[styles.chipSmall, activityRange === range && styles.chipActive]}
                    onPress={() => setActivityRange(range)}
                  >
                    <Text style={[styles.chipText, activityRange === range && styles.chipTextActive]}>
                      {range === 'all' ? 'Any time' : range === '7d' ? '7 days' : '30 days'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {filteredActivities.length > 0 ? (
                filteredActivities.map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <Icon name={'document-text'} size={16} color={colors.primary[500]} />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityText}>{activity.action}</Text>
                      {activity.resource && (
                        <Text style={styles.activityResource}>{activity.resource}</Text>
                      )}
                      <Text style={styles.activityDate}>
                        {new Date(activity.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No activity for this filter</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'uploads' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Uploads</Text>
              {uploadsLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color={colors.primary[500]} />
                </View>
              ) : uploads.length > 0 ? (
                <View style={styles.uploadsList}>
                  {uploads.map((upload) => (
                    <View key={upload.id} style={styles.uploadItem}>
                      <View style={styles.uploadInfo}>
                        <Text style={styles.uploadTitle}>{upload.title}</Text>
                        <Text style={styles.uploadMeta}>
                          {upload.file_type} • {formatFileSize(upload.file_size)} • {upload.status}
                        </Text>
                      </View>
                      <View style={styles.uploadStats}>
                        <Icon name="download" size={16} color={colors.text.tertiary} />
                        <Text style={styles.uploadCount}>{upload.download_count}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Icon name={'cloud-upload'} size={48} color={colors.text.tertiary} />
                  <Text style={styles.emptyText}>No uploads yet</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    paddingTop: spacing[8],
    backgroundColor: colors.primary[500],
  },
  backButton: {
    padding: spacing[1],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  headerSpacer: {
    width: 32,
  },
  profileCard: {
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: colors.background.primary,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing[3],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  badges: {
    flexDirection: 'row',
    marginTop: spacing[3],
    gap: spacing[2],
  },
  badge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[2],
    backgroundColor: colors.background.primary,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary[500],
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[2],
    backgroundColor: colors.background.primary,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.text.inverse,
  },
  tabContent: {
    padding: spacing[4],
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
  },
  chipSmall: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  chipActive: {
    backgroundColor: colors.primary[500],
  },
  chipText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.text.inverse,
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  infoCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    marginTop: spacing[4],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[500] + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  activityResource: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  activityDate: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: spacing[2],
  },
  uploadsList: {
    gap: spacing[2],
  },
  uploadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  uploadInfo: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  uploadMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  uploadStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  uploadCount: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default UserDetailScreen;
