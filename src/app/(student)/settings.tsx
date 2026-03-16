// Settings Screen for CampusHub
// Backend-driven with real API integration

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator, Linking, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { userAPI } from '../../services/api';
import { biometricService } from '../../services/biometric';
import { useAuthStore } from '../../store/auth.store';
import {
  clearNotificationUndoMs,
  getDefaultNotificationUndoMs,
  getNotificationUndoMs,
  setNotificationUndoMs,
} from '../../services/app-settings';

interface UserPreferences {
  id: number;
  email_notifications: boolean;
  app_notifications: boolean;
  push_notifications: boolean;
  weekly_digest: boolean;
  public_profile: boolean;
  show_email: boolean;
  show_activity: boolean;
  theme: string;
  language: string;
  timezone: string;
}

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

interface SettingItemData {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

interface SettingGroup {
  title: string;
  items: SettingItemData[];
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, title, subtitle, onPress, rightElement }) => (
  <TouchableOpacity 
    style={styles.settingItem} 
    onPress={onPress} 
    disabled={!onPress}
  >
    <View style={styles.settingIcon}>
      <Icon name={icon as any} size={22} color={colors.primary[500]} />
    </View>
    <View style={styles.settingInfo}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || <Icon name="chevron-forward" size={20} color={colors.text.secondary} />}
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const defaultUndoDurationMs = getDefaultNotificationUndoMs();
  
  // Handle rate app - opens the app store
  const handleRateApp = useCallback(async () => {
    // CampusHub app store URLs - replace with actual app IDs when published
    const APP_STORE_URLS = {
      ios: 'itms-apps://itunes.apple.com/app/campushub/id123456789',
      android: 'market://details?id=com.campushub.app',
      web: 'https://play.google.com/store/apps/details?id=com.campushub.app',
    };
    
    try {
      const url = Platform.OS === 'ios' 
        ? APP_STORE_URLS.ios 
        : Platform.OS === 'android' 
          ? APP_STORE_URLS.android 
          : APP_STORE_URLS.web;
      
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to web URL if native URL doesn't work
        await Linking.openURL(APP_STORE_URLS.web);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open app store. Please try again later.');
    }
  }, []);
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  
  // Local toggles synced with preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autosave, setAutosave] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [undoDurationMs, setUndoDurationMs] = useState(defaultUndoDurationMs);
  const [showUndoModal, setShowUndoModal] = useState(false);
  
  // Language
  const [language, setLanguage] = useState('English');

  // Fetch preferences from API
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userAPI.getPreferences();
      const prefs: UserPreferences = response.data.data;
      setPreferences(prefs);
      
      // Sync local state with preferences
      setNotificationsEnabled(prefs.app_notifications);
      setLanguage(prefs.language === 'en' ? 'English' : prefs.language === 'sw' ? 'Swahili' : prefs.language);
    } catch (error: any) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Check biometric availability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      const capability = await biometricService.checkBiometricCapability();
      setBiometricAvailable(capability.hasHardware && capability.isEnrolled);
      const isEnabled = await biometricService.isBiometricEnabled();
      setBiometricEnabled(isEnabled);
    };
    checkBiometric();
  }, []);

  useEffect(() => {
    let active = true;
    const loadUndoDuration = async () => {
      const storedValue = await getNotificationUndoMs();
      if (active) {
        setUndoDurationMs(storedValue);
      }
    };
    loadUndoDuration();
    return () => {
      active = false;
    };
  }, []);
  
  // Save preference to API
  const updatePreference = async (key: string, value: any) => {
    try {
      setSaving(true);
      await userAPI.updatePreferences({ [key]: value });
      setPreferences(prev => prev ? { ...prev, [key]: value } : null);
    } catch (error: any) {
      console.error('Failed to update preference:', error);
      Alert.alert('Error', 'Failed to save preference');
    } finally {
      setSaving(false);
    }
  };

  // Handle notification toggle
  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    await updatePreference('app_notifications', value);
  };
  
  // Handle public profile toggle
  const handlePublicProfileToggle = async (value: boolean) => {
    await updatePreference('public_profile', value);
  };
  
  // Handle show email toggle
  const handleShowEmailToggle = async (value: boolean) => {
    await updatePreference('show_email', value);
  };
  
  // Handle show activity toggle
  const handleShowActivityToggle = async (value: boolean) => {
    await updatePreference('show_activity', value);
  };
  
  // Handle weekly digest toggle
  const handleWeeklyDigestToggle = async (value: boolean) => {
    await updatePreference('weekly_digest', value);
  };

  // Handle biometric toggle
  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const success = await biometricService.enableBiometric();
      if (success) {
        if (refreshToken) {
          await biometricService.storeAuthKey(refreshToken);
        } else {
          Alert.alert(
            'Biometric Enabled',
            'Sign in again to finish setting up biometric login.'
          );
        }
      }
      setBiometricEnabled(success);
    } else {
      await biometricService.disableBiometric();
      setBiometricEnabled(false);
    }
  };
  
  const handleLanguagePress = () => {
    Alert.alert(
      'Select Language',
      'Choose your preferred language',
      [
        { 
          text: 'English', 
          onPress: async () => {
            setLanguage('English');
            await updatePreference('language', 'en');
          }
        },
        { 
          text: 'Swahili', 
          onPress: async () => {
            setLanguage('Swahili');
            await updatePreference('language', 'sw');
          }
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const formatUndoDuration = (valueMs: number) => `${Math.round(valueMs / 1000)}s`;

  const handleUndoDurationSelect = async (valueMs: number) => {
    const nextValue = await setNotificationUndoMs(valueMs);
    setUndoDurationMs(nextValue);
    setShowUndoModal(false);
  };

  const handleUndoDurationReset = async () => {
    const nextValue = await clearNotificationUndoMs();
    setUndoDurationMs(nextValue);
    setShowUndoModal(false);
  };

  const undoDurationOptions = [2000, 4000, 6000, 8000, 10000];

  const settingGroups: SettingGroup[] = [
    {
      title: 'Account',
      items: [
        { 
          icon: 'person', 
          title: 'Edit Profile', 
          subtitle: 'Update your information', 
          onPress: () => router.push('/(student)/edit-profile') 
        },
        { 
          icon: 'key', 
          title: 'Change Password', 
          subtitle: 'Update your password', 
          onPress: () => router.push('/(student)/change-password') 
        },
        { 
          icon: 'shield-checkmark', 
          title: 'Security', 
          subtitle: 'Manage your account security', 
          onPress: () => router.push('/(student)/security' as any) 
        },
      ]
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'finger-print',
          title: 'Biometric Login',
          subtitle: biometricAvailable ? 'Use Face ID or Fingerprint' : 'Not available on this device',
          rightElement: (
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ true: colors.primary[500] }}
              thumbColor="#FFFFFF"
              disabled={!biometricAvailable}
            />
          )
        },
        { 
          icon: 'time', 
          title: 'Notification Undo Window', 
          subtitle: `Undo window: ${formatUndoDuration(undoDurationMs)}`, 
          onPress: () => setShowUndoModal(true) 
        },
        { 
          icon: 'globe', 
          title: 'Language', 
          subtitle: language, 
          onPress: handleLanguagePress 
        },
      ]
    },
    {
      title: 'Privacy',
      items: [
        { 
          icon: 'earth', 
          title: 'Public Profile', 
          subtitle: 'Allow others to view your profile',
          rightElement: (
            <Switch 
              value={preferences?.public_profile ?? true} 
              onValueChange={handlePublicProfileToggle} 
              trackColor={{ true: colors.primary[500] }} 
              thumbColor="#FFFFFF" 
            />
          )
        },
        { 
          icon: 'mail', 
          title: 'Show Email', 
          subtitle: 'Display your email on profile',
          rightElement: (
            <Switch 
              value={preferences?.show_email ?? false} 
              onValueChange={handleShowEmailToggle} 
              trackColor={{ true: colors.primary[500] }} 
              thumbColor="#FFFFFF" 
            />
          )
        },
        { 
          icon: 'eye', 
          title: 'Show Activity', 
          subtitle: 'Display your activity publicly',
          rightElement: (
            <Switch 
              value={preferences?.show_activity ?? true} 
              onValueChange={handleShowActivityToggle} 
              trackColor={{ true: colors.primary[500] }} 
              thumbColor="#FFFFFF" 
            />
          )
        },
      ]
    },
    {
      title: 'Storage',
      items: [
        { 
          icon: 'analytics', 
          title: 'Storage Usage', 
          subtitle: 'View your storage usage', 
          onPress: () => router.push('/(student)/storage') 
        },
        { 
          icon: 'trash', 
          title: 'Trash', 
          subtitle: 'View deleted items', 
          onPress: () => router.push('/(student)/trash') 
        },
      ]
    },
    {
      title: 'Learning',
      items: [
        { 
          icon: 'document-text', 
          title: 'Resource Requests', 
          subtitle: 'Request or browse needed resources', 
          onPress: () => router.push('/(student)/resource-requests' as any) 
        },
        { 
          icon: 'trending-up', 
          title: 'My Progress', 
          subtitle: 'Track your learning progress', 
          onPress: () => router.push('/(student)/my-progress' as any) 
        },
        { 
          icon: 'people', 
          title: 'Study Groups', 
          subtitle: 'Join study groups', 
          onPress: () => router.push('/(student)/study-groups' as any) 
        },
        { 
          icon: 'star', 
          title: 'Leaderboard', 
          subtitle: 'View top learners', 
          onPress: () => router.push('/(student)/leaderboard' as any) 
        },
      ]
    },
  ];

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Notification Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: notificationsEnabled ? colors.success + '20' : colors.error + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: notificationsEnabled ? colors.success : colors.error }
              ]}>
                {notificationsEnabled ? 'On' : 'Off'}
              </Text>
            </View>
          </View>
          <View style={styles.mainToggle}>
            <View style={styles.mainToggleInfo}>
              <Icon name="notifications" size={24} color={colors.primary[500]} />
              <View style={styles.mainToggleText}>
                <Text style={styles.mainToggleTitle}>Enable Notifications</Text>
                <Text style={styles.mainToggleSubtitle}>Master toggle for all notifications</Text>
              </View>
            </View>
            <Switch 
              value={notificationsEnabled} 
              onValueChange={handleNotificationToggle} 
              trackColor={{ true: colors.primary[500] }} 
              thumbColor="#FFFFFF" 
            />
          </View>
          <View style={styles.card}>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceTitle}>Push Notifications</Text>
                <Text style={styles.preferenceDescription}>Receive push notifications on your device</Text>
              </View>
              <Switch 
                value={preferences?.push_notifications ?? true} 
                onValueChange={(value) => updatePreference('push_notifications', value)}
                trackColor={{ true: colors.primary[500] }} 
                thumbColor="#FFFFFF"
                disabled={!notificationsEnabled}
              />
            </View>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceTitle}>Email Notifications</Text>
                <Text style={styles.preferenceDescription}>Receive email notifications</Text>
              </View>
              <Switch 
                value={preferences?.email_notifications ?? true} 
                onValueChange={(value) => updatePreference('email_notifications', value)}
                trackColor={{ true: colors.primary[500] }} 
                thumbColor="#FFFFFF"
                disabled={!notificationsEnabled}
              />
            </View>
            <View style={[styles.preferenceItem, styles.preferenceItemLast]}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceTitle}>Weekly Digest</Text>
                <Text style={styles.preferenceDescription}>Receive weekly summary email</Text>
              </View>
              <Switch 
                value={preferences?.weekly_digest ?? true} 
                onValueChange={handleWeeklyDigestToggle}
                trackColor={{ true: colors.primary[500] }} 
                thumbColor="#FFFFFF"
                disabled={!notificationsEnabled}
              />
            </View>
          </View>
        </View>

        {/* Other Settings */}
        {settingGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.section}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.card}>
              {group.items.map((item, itemIndex) => (
                <SettingItem
                  key={itemIndex}
                  icon={item.icon}
                  title={item.title}
                  subtitle={item.subtitle}
                  onPress={item.onPress}
                  rightElement={item.rightElement}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.groupTitle}>Support</Text>
          <View style={styles.card}>
            <SettingItem icon="help-circle" title="Help & FAQ" onPress={() => router.push('/(student)/help-faq' as any)} />
            <SettingItem icon="chatbubbles" title="Contact Support" onPress={() => router.push('/(student)/contact-support' as any)} />
            <SettingItem icon="star" title="Rate the App" onPress={handleRateApp} />
            <SettingItem 
              icon="document-text" 
              title="Privacy Policy" 
              onPress={() => router.push('/(auth)/privacy')} 
            />
            <SettingItem 
              icon="library" 
              title="Terms of Service" 
              onPress={() => router.push('/(auth)/terms')} 
            />
          </View>
        </View>

        {/* Version */}
        <Text style={styles.version}>CampusHub v1.0.0</Text>
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <Modal
        visible={showUndoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUndoModal(false)}
      >
        <View style={styles.undoModalBackdrop}>
          <View style={styles.undoModalCard}>
            <Text style={styles.undoModalTitle}>Undo Window</Text>
            <Text style={styles.undoModalSubtitle}>
              Choose how long the Restore option stays available.
            </Text>
            <View style={styles.undoOptions}>
              {undoDurationOptions.map((option) => {
                const isActive = option === undoDurationMs;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.undoOption, isActive && styles.undoOptionActive]}
                    onPress={() => handleUndoDurationSelect(option)}
                  >
                    <Text style={[styles.undoOptionText, isActive && styles.undoOptionTextActive]}>
                      {formatUndoDuration(option)}
                    </Text>
                    {isActive && <Icon name="checkmark" size={18} color={colors.primary[500]} />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.undoOption} onPress={handleUndoDurationReset}>
                <Text style={styles.undoOptionText}>
                  Use default ({formatUndoDuration(defaultUndoDurationMs)})
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.undoCancel} onPress={() => setShowUndoModal(false)}>
              <Text style={styles.undoCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: spacing[3],
    fontSize: 14,
    color: colors.text.secondary,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing[4], 
    paddingTop: spacing[10], 
    paddingBottom: spacing[4], 
    backgroundColor: colors.card.light, 
    ...shadows.sm 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    flex: 1, 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary, 
    textAlign: 'center' 
  },
  placeholder: { width: 40 },
  section: { 
    paddingHorizontal: spacing[4], 
    paddingTop: spacing[6] 
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: colors.text.secondary, 
    marginBottom: spacing[3], 
    marginLeft: spacing[1], 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  groupTitle: {
    fontSize: 13, 
    fontWeight: '600', 
    color: colors.text.secondary, 
    marginBottom: spacing[3], 
    marginLeft: spacing[1], 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  mainToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mainToggleText: {
    marginLeft: spacing[3],
    flex: 1,
  },
  mainToggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  mainToggleSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  card: { 
    backgroundColor: colors.card.light, 
    borderRadius: borderRadius.xl, 
    overflow: 'hidden', 
    ...shadows.sm 
  },
  settingItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing[4], 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light 
  },
  settingIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: colors.primary[50], 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: spacing[3] 
  },
  settingInfo: { 
    flex: 1, 
    marginLeft: spacing[3] 
  },
  settingTitle: { 
    fontSize: 15, 
    fontWeight: '500', 
    color: colors.text.primary 
  },
  settingSubtitle: { 
    fontSize: 12, 
    color: colors.text.secondary, 
    marginTop: 2 
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  preferenceItemLast: {
    borderBottomWidth: 0,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  preferenceDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: spacing[6],
    marginBottom: spacing[4],
  },
  bottomSpacing: {
    height: spacing[16],
  },
  undoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  undoModalCard: {
    width: '100%',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    ...shadows.md,
  },
  undoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  undoModalSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  undoOptions: {
    gap: spacing[2],
  },
  undoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  undoOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  undoOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  undoOptionTextActive: {
    color: colors.primary[600],
  },
  undoCancel: {
    marginTop: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  undoCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});

export default SettingsScreen;
