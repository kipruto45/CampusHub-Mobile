// More Screen for CampusHub - Secondary Navigation Hub
// Grid layout showing all remaining student modules

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import Card from '../../../components/ui/Card';
import { useAuthStore } from '../../../store/auth.store';

// Menu Item Type
interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  iconColor: string;
  route: string;
  badge?: number;
}

// Main menu items for the More screen
const MAIN_MENU_ITEMS: MenuItem[] = [
  {
    id: 'upload',
    title: 'Upload Resource',
    subtitle: 'Share notes & materials',
    icon: 'cloud-upload',
    iconColor: colors.success,
    route: '/(student)/upload-resource',
  },
  {
    id: 'recommendations',
    title: 'Recommendations',
    subtitle: 'Personalized for you',
    icon: 'bulb',
    iconColor: colors.accent[500],
    route: '/(student)/recommendations',
  },
  {
    id: 'search',
    title: 'Search',
    subtitle: 'Find any resource',
    icon: 'search',
    iconColor: colors.info,
    route: '/(student)/search',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Stay updated',
    icon: 'notifications',
    iconColor: colors.primary[500],
    route: '/(student)/notifications',
  },
];

// Secondary menu items
const SECONDARY_MENU_ITEMS: MenuItem[] = [
  {
    id: 'groups',
    title: 'Groups',
    subtitle: 'Study groups & communities',
    icon: 'people',
    iconColor: colors.primary[500],
    route: '/(student)/study-groups',
  },
  {
    id: 'achievements',
    title: 'Achievements',
    subtitle: 'Points, badges & streaks',
    icon: 'diamond',
    iconColor: colors.warning,
    route: '/(student)/gamification',
  },
  {
    id: 'referrals',
    title: 'Referrals',
    subtitle: 'Invite friends & earn',
    icon: 'gift',
    iconColor: colors.accent[500],
    route: '/(student)/referrals',
  },
  {
    id: 'billing',
    title: 'Billing',
    subtitle: 'Plans & receipts',
    icon: 'card',
    iconColor: colors.primary[500],
    route: '/(student)/billing',
  },
  {
    id: 'certificates',
    title: 'Certificates',
    subtitle: 'My earned certificates',
    icon: 'ribbon',
    iconColor: '#6366F1',
    route: '/(student)/certificates',
  },
  {
    id: 'favorites',
    title: 'Favorites',
    icon: 'heart',
    iconColor: colors.error,
    route: '/(student)/favorites',
  },
  {
    id: 'collections',
    title: 'Collections',
    icon: 'folder',
    iconColor: colors.warning,
    route: '/(student)/collections',
  },
  {
    id: 'announcements',
    title: 'Announcements',
    icon: 'megaphone',
    iconColor: colors.warning,
    route: '/(student)/announcements',
  },
  {
    id: 'activity',
    title: 'Activity',
    icon: 'time',
    iconColor: colors.info,
    route: '/(student)/activity',
  },
  {
    id: 'downloads',
    title: 'My Downloads',
    icon: 'download',
    iconColor: colors.primary[500],
    route: '/(student)/downloads',
  },
  {
    id: 'storage',
    title: 'Storage',
    icon: 'server',
    iconColor: colors.primary[500],
    route: '/(student)/storage',
  },
  {
    id: 'trash',
    title: 'Trash',
    icon: 'trash',
    iconColor: colors.error,
    route: '/(student)/trash',
  },
  {
    id: 'profile',
    title: 'Profile',
    icon: 'person',
    iconColor: colors.text.secondary,
    route: '/(student)/tabs/profile',
  },
  {
    id: 'edit-profile',
    title: 'Edit Profile',
    icon: 'create',
    iconColor: colors.text.secondary,
    route: '/(student)/edit-profile',
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: 'settings',
    iconColor: colors.text.secondary,
    route: '/(student)/settings',
  },
];

const MoreScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleMenuPress = (item: MenuItem) => {
    router.push(item.route as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Profile Card */}
        <TouchableOpacity 
          style={styles.profileCard}
          onPress={() => router.push('/(student)/tabs/profile')}
        >
          <View style={styles.profileContent}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: colors.primary[500] }]}>
                <Text style={styles.avatarText}>
                  {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.first_name} {user?.last_name}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email}
              </Text>
              {user?.faculty && (
                <Text style={styles.profileFaculty}>
                  {user.faculty}
                </Text>
              )}
            </View>
            <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
          </View>
        </TouchableOpacity>

        {/* Main Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.mainMenuGrid}>
            {MAIN_MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.mainMenuItem}
                onPress={() => handleMenuPress(item)}
              >
                <View style={[styles.mainMenuIcon, { backgroundColor: item.iconColor + '15' }]}>
                  <Icon name={item.icon as any} size={24} color={item.iconColor} />
                </View>
                <Text style={styles.mainMenuTitle}>{item.title}</Text>
                {item.subtitle && (
                  <Text style={styles.mainMenuSubtitle}>{item.subtitle}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Secondary Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More</Text>
          <Card style={styles.menuCard}>
            {SECONDARY_MENU_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < SECONDARY_MENU_ITEMS.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => handleMenuPress(item)}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: item.iconColor + '15' }]}>
                    <Icon name={item.icon as any} size={18} color={item.iconColor} />
                  </View>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                </View>
                <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>CampusHub</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
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
  scrollContent: {
    padding: spacing[6],
    paddingBottom: 100,
  },
  
  // Profile Card
  profileCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[6],
    ...shadows.sm,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing[4],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    color: colors.text.inverse,
    fontSize: 22,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  profileFaculty: {
    fontSize: 12,
    color: colors.primary[500],
    fontWeight: '500',
  },

  // Sections
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[4],
  },

  // Main Menu Grid
  mainMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  mainMenuItem: {
    width: '48%',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    alignItems: 'center',
    ...shadows.sm,
  },
  mainMenuIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  mainMenuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  mainMenuSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },

  // Secondary Menu
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },

  // App Info
  appInfo: {
    alignItems: 'center',
    paddingTop: spacing[6],
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  appVersion: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});

export default MoreScreen;
