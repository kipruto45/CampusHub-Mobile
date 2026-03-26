import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import Card from '../../../components/ui/Card';
import Icon from '../../../components/ui/Icon';
import { useAuthStore } from '../../../store/auth.store';
import { colors } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  iconColor: string;
  route: string;
}

interface MenuSection {
  id: string;
  title: string;
  description: string;
  items: MenuItem[];
}

const QUICK_ACTIONS: MenuItem[] = [
  {
    id: 'upload',
    title: 'Upload Resource',
    subtitle: 'Share notes and course material',
    icon: 'cloud-upload',
    iconColor: colors.success,
    route: '/(student)/upload-resource',
  },
  {
    id: 'progress',
    title: 'My Progress',
    subtitle: 'Track courses, streaks, and goals',
    icon: 'stats-chart',
    iconColor: colors.primary[500],
    route: '/(student)/my-progress',
  },
  {
    id: 'search',
    title: 'Search',
    subtitle: 'Find resources fast',
    icon: 'search',
    iconColor: colors.info,
    route: '/(student)/search',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Catch up on updates',
    icon: 'notifications',
    iconColor: colors.warning,
    route: '/(student)/notifications',
  },
  {
    id: 'billing',
    title: 'Billing',
    subtitle: 'Plans, history, and perks',
    icon: 'card',
    iconColor: colors.accent[500],
    route: '/(student)/billing',
  },
  {
    id: 'ai-chat',
    title: 'AI Chat',
    subtitle: 'Ask questions and study smarter',
    icon: 'sparkles',
    iconColor: colors.primary[500],
    route: '/(student)/ai-chat',
  },
];

const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'learning',
    title: 'Learning & Library',
    description: 'Everything tied to studying, saving, and managing your materials.',
    items: [
      {
        id: 'library',
        title: 'Library',
        subtitle: 'Browse the full resource catalog',
        icon: 'library',
        iconColor: colors.primary[500],
        route: '/(student)/library',
      },
      {
        id: 'recommendations',
        title: 'Recommendations',
        subtitle: 'Discover suggestions picked for you',
        icon: 'bulb',
        iconColor: colors.warning,
        route: '/(student)/recommendations',
      },
      {
        id: 'uploads',
        title: 'My Uploads',
        subtitle: 'Track pending, approved, and rejected files',
        icon: 'albums',
        iconColor: colors.success,
        route: '/(student)/my-uploads',
      },
      {
        id: 'downloads',
        title: 'Downloads',
        subtitle: 'Open what you have taken offline',
        icon: 'download',
        iconColor: colors.info,
        route: '/(student)/downloads',
      },
      {
        id: 'favorites',
        title: 'Favorites',
        subtitle: 'Keep the best finds within reach',
        icon: 'heart',
        iconColor: colors.error,
        route: '/(student)/favorites',
      },
      {
        id: 'collections',
        title: 'Collections',
        subtitle: 'Organize saved material by topic',
        icon: 'folder',
        iconColor: colors.warning,
        route: '/(student)/collections',
      },
      {
        id: 'certificates',
        title: 'Certificates',
        subtitle: 'Review your earned recognitions',
        icon: 'ribbon',
        iconColor: colors.accent[500],
        route: '/(student)/certificates',
      },
      {
        id: 'storage',
        title: 'Storage',
        subtitle: 'Check usage and file space',
        icon: 'server',
        iconColor: colors.primary[500],
        route: '/(student)/storage',
      },
      {
        id: 'trash',
        title: 'Trash',
        subtitle: 'Recover or review removed items',
        icon: 'trash',
        iconColor: colors.error,
        route: '/(student)/trash',
      },
    ],
  },
  {
    id: 'community',
    title: 'Community & Collaboration',
    description: 'Join groups, rooms, referrals, and other student community tools.',
    items: [
      {
        id: 'study-groups',
        title: 'Study Groups',
        subtitle: 'Browse your active and suggested groups',
        icon: 'people',
        iconColor: colors.primary[500],
        route: '/(student)/study-groups',
      },
      {
        id: 'create-study-group',
        title: 'Create Study Group',
        subtitle: 'Start a focused group for classmates',
        icon: 'people-circle',
        iconColor: colors.success,
        route: '/(student)/create-study-group',
      },
      {
        id: 'live-rooms',
        title: 'Live Rooms',
        subtitle: 'Join real-time study sessions',
        icon: 'videocam',
        iconColor: colors.error,
        route: '/(student)/live-rooms',
      },
      {
        id: 'resource-requests',
        title: 'Resource Requests',
        subtitle: 'Ask the community for missing material',
        icon: 'help-circle',
        iconColor: colors.info,
        route: '/(student)/resource-requests',
      },
      {
        id: 'resource-share',
        title: 'Resource Share',
        subtitle: 'Share useful material directly with others',
        icon: 'share-social',
        iconColor: colors.accent[500],
        route: '/(student)/resource-share',
      },
      {
        id: 'group-invite',
        title: 'Group Invite',
        subtitle: 'Accept or review study-group invitations',
        icon: 'mail-unread',
        iconColor: colors.info,
        route: '/(student)/group-invite',
      },
      {
        id: 'announcements',
        title: 'Announcements',
        subtitle: 'Read campus-wide posts and notices',
        icon: 'megaphone',
        iconColor: colors.warning,
        route: '/(student)/announcements',
      },
      {
        id: 'referrals',
        title: 'Referrals',
        subtitle: 'Invite friends and track rewards',
        icon: 'gift',
        iconColor: colors.accent[500],
        route: '/(student)/referrals',
      },
      {
        id: 'leaderboard',
        title: 'Leaderboard',
        subtitle: 'See how your momentum stacks up',
        icon: 'trophy',
        iconColor: colors.warning,
        route: '/(student)/leaderboard',
      },
    ],
  },
  {
    id: 'growth',
    title: 'AI & Growth',
    description: 'Use smart tools, review your history, and keep learning momentum high.',
    items: [
      {
        id: 'gamification',
        title: 'Gamification',
        subtitle: 'Points, badges, streaks, and achievements',
        icon: 'diamond',
        iconColor: colors.warning,
        route: '/(student)/gamification',
      },
      {
        id: 'activity',
        title: 'Activity',
        subtitle: 'See your recent actions and engagement',
        icon: 'time',
        iconColor: colors.info,
        route: '/(student)/activity',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing & Membership',
    description: 'Open every student billing screen from one place, including plans, payment, access, and storage perks.',
    items: [
      {
        id: 'billing-home',
        title: 'Billing Hub',
        subtitle: 'Open your main plans and billing overview',
        icon: 'card',
        iconColor: colors.accent[500],
        route: '/(student)/billing',
      },
      {
        id: 'billing-plans',
        title: 'Plans',
        subtitle: 'Compare available subscription plans',
        icon: 'layers',
        iconColor: colors.primary[500],
        route: '/(student)/billing/plans',
      },
      {
        id: 'billing-history',
        title: 'Payment History',
        subtitle: 'Review your previous billing activity',
        icon: 'receipt',
        iconColor: colors.success,
        route: '/(student)/billing/history',
      },
      {
        id: 'billing-pay',
        title: 'Pay',
        subtitle: 'Complete a payment or checkout flow',
        icon: 'cash',
        iconColor: colors.warning,
        route: '/(student)/billing/pay',
      },
      {
        id: 'billing-promo',
        title: 'Promo Codes',
        subtitle: 'Apply offers and billing promotions',
        icon: 'pricetag',
        iconColor: colors.info,
        route: '/(student)/billing/promo',
      },
      {
        id: 'billing-tiers',
        title: 'Tiers',
        subtitle: 'See membership levels and benefits',
        icon: 'stats-chart',
        iconColor: colors.accent[500],
        route: '/(student)/billing/tiers',
      },
      {
        id: 'billing-feature-access',
        title: 'Feature Access',
        subtitle: 'Check billing-based access and perks',
        icon: 'key',
        iconColor: colors.primary[500],
        route: '/(student)/billing/feature-access',
      },
      {
        id: 'billing-storage',
        title: 'Storage Perks',
        subtitle: 'See storage benefits from your plan',
        icon: 'server',
        iconColor: colors.primary[500],
        route: '/(student)/billing/storage',
      },
      {
        id: 'billing-iap',
        title: 'In-App Purchase',
        subtitle: 'Open mobile purchase options',
        icon: 'phone-portrait',
        iconColor: colors.success,
        route: '/(student)/billing/iap',
      },
      {
        id: 'billing-iap-products',
        title: 'IAP Products',
        subtitle: 'Review the product catalog for purchases',
        icon: 'cube',
        iconColor: colors.warning,
        route: '/(student)/billing/iap-products',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account, Billing & Help',
    description: 'Manage your profile, security, account settings, and support channels.',
    items: [
      {
        id: 'profile',
        title: 'Profile',
        subtitle: 'Open your public student profile',
        icon: 'person',
        iconColor: colors.text.secondary,
        route: '/(student)/tabs/profile',
      },
      {
        id: 'edit-profile',
        title: 'Edit Profile',
        subtitle: 'Update your academic and personal details',
        icon: 'create',
        iconColor: colors.text.secondary,
        route: '/(student)/edit-profile',
      },
      {
        id: 'settings',
        title: 'Settings',
        subtitle: 'Control app behavior and preferences',
        icon: 'settings',
        iconColor: colors.text.secondary,
        route: '/(student)/settings',
      },
      {
        id: 'sessions',
        title: 'Sessions',
        subtitle: 'Review your active sign-ins',
        icon: 'phone-portrait',
        iconColor: colors.info,
        route: '/(student)/sessions',
      },
      {
        id: 'security',
        title: 'Security',
        subtitle: 'Review account protection settings',
        icon: 'shield-checkmark',
        iconColor: colors.success,
        route: '/(student)/security',
      },
      {
        id: 'change-password',
        title: 'Change Password',
        subtitle: 'Update your sign-in credentials',
        icon: 'lock-closed',
        iconColor: colors.warning,
        route: '/(student)/change-password',
      },
      {
        id: 'help',
        title: 'Help Center',
        subtitle: 'Get support and guidance',
        icon: 'information-circle',
        iconColor: colors.primary[500],
        route: '/(student)/help',
      },
      {
        id: 'help-faq',
        title: 'FAQ',
        subtitle: 'Find answers to common questions',
        icon: 'chatbox-ellipses',
        iconColor: colors.accent[500],
        route: '/(student)/help-faq',
      },
      {
        id: 'contact-support',
        title: 'Contact Support',
        subtitle: 'Reach the CampusHub support team',
        icon: 'mail-open',
        iconColor: colors.error,
        route: '/(student)/contact-support',
      },
      {
        id: 'privacy',
        title: 'Privacy',
        subtitle: 'Understand how your data is handled',
        icon: 'eye-off',
        iconColor: colors.info,
        route: '/(student)/privacy',
      },
      {
        id: 'about',
        title: 'About',
        subtitle: 'Learn more about CampusHub',
        icon: 'planet',
        iconColor: colors.success,
        route: '/(student)/about',
      },
    ],
  },
];

const MoreScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleMenuPress = (item: MenuItem) => {
    router.push(item.route as any);
  };

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'Student';
  const avatarLabel =
    user?.first_name?.[0] ||
    user?.email?.[0]?.toUpperCase() ||
    'S';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push('/(student)/tabs/profile')}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{avatarLabel}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileHint}>
              Open your profile, settings, billing, and support tools from one place.
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.quickCard}
                onPress={() => handleMenuPress(item)}
              >
                <View
                  style={[
                    styles.quickIcon,
                    { backgroundColor: item.iconColor + '18' },
                  ]}
                >
                  <Icon name={item.icon as any} size={22} color={item.iconColor} />
                </View>
                <Text style={styles.quickTitle}>{item.title}</Text>
                <Text style={styles.quickSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {MENU_SECTIONS.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionDescription}>{section.description}</Text>
            <Card style={styles.menuCard}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => handleMenuPress(item)}
                >
                  <View style={styles.menuItemLeft}>
                    <View
                      style={[
                        styles.menuIcon,
                        { backgroundColor: item.iconColor + '15' },
                      ]}
                    >
                      <Icon name={item.icon as any} size={18} color={item.iconColor} />
                    </View>
                    <View style={styles.menuTextWrap}>
                      <Text style={styles.menuItemTitle}>{item.title}</Text>
                      {item.subtitle ? (
                        <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        <View style={styles.appInfo}>
          <Text style={styles.appName}>CampusHub</Text>
          <Text style={styles.appVersion}>Student tools hub</Text>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[6],
    ...shadows.sm,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
    marginRight: spacing[4],
  },
  profileAvatarText: {
    color: colors.text.inverse,
    fontSize: 22,
    fontWeight: '700',
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  profileHint: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing[1],
    lineHeight: 18,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing[3],
    lineHeight: 19,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickCard: {
    width: '48%',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  quickSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
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
    flex: 1,
    marginRight: spacing[3],
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  menuTextWrap: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 3,
    lineHeight: 18,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: spacing[4],
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  appVersion: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});

export default MoreScreen;
