// Admin Settings Screen for CampusHub
// Admin account and app settings

import { useRouter } from 'expo-router';
import React,{ useEffect,useState } from 'react';
import { ActivityIndicator,Alert,ScrollView,StyleSheet,Switch,Text,TextInput,TouchableOpacity,View } from 'react-native';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingPreference, setSavingPreference] = useState<string | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [appNotifications, setAppNotifications] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await adminAPI.getPreferences();
        const preferences = response.data.data || {};
        setEmailNotifications(Boolean(preferences.email_notifications));
        setAppNotifications(Boolean(preferences.app_notifications));
        setShowActivity(Boolean(preferences.show_activity));
      } catch (error) {
        console.error('Failed to load admin preferences', error);
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const updatePreference = async (
    field: 'email_notifications' | 'app_notifications' | 'show_activity',
    value: boolean
  ) => {
    try {
      setSavingPreference(field);
      await adminAPI.updatePreferences({ [field]: value });
    } catch (_error) {
      Alert.alert('Error', 'Failed to update settings');
      if (field === 'email_notifications') setEmailNotifications((prev) => !prev);
      if (field === 'app_notifications') setAppNotifications((prev) => !prev);
      if (field === 'show_activity') setShowActivity((prev) => !prev);
    } finally {
      setSavingPreference(null);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    try {
      await adminAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          'Failed to change password'
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Icon name={'arrow-back'} size={24} color={colors.text.inverse} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/(admin)/profile' as any)}>
              <Icon name={'person'} size={22} color={colors.primary[500]} />
              <Text style={styles.settingText}>Profile</Text>
              <Icon name={'chevron-forward'} size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            <View style={styles.settingRow}>
              <Icon name={'lock-closed'} size={22} color={colors.primary[500]} />
              <Text style={styles.settingText}>Password controls are available below</Text>
            </View>
          </View>
        </View>

        {/* Password Change */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              placeholderTextColor={colors.text.tertiary}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor={colors.text.tertiary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor={colors.text.tertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.saveButton} onPress={handlePasswordChange}>
              <Text style={styles.saveButtonText}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Icon name={'mail'} size={22} color={colors.primary[500]} />
              <Text style={styles.settingText}>Email Notifications</Text>
              <Switch
                value={emailNotifications}
                onValueChange={(value) => {
                  setEmailNotifications(value);
                  updatePreference('email_notifications', value);
                }}
                disabled={savingPreference === 'email_notifications'}
                trackColor={{ true: colors.primary[500] }}
              />
            </View>
            <View style={styles.switchRow}>
              <Icon name={'notifications'} size={22} color={colors.primary[500]} />
              <Text style={styles.settingText}>In-App Notifications</Text>
              <Switch
                value={appNotifications}
                onValueChange={(value) => {
                  setAppNotifications(value);
                  updatePreference('app_notifications', value);
                }}
                disabled={savingPreference === 'app_notifications'}
                trackColor={{ true: colors.primary[500] }}
              />
            </View>
            <View style={styles.switchRow}>
              <Icon name={'calendar'} size={22} color={colors.primary[500]} />
              <Text style={styles.settingText}>Show Activity</Text>
              <Switch
                value={showActivity}
                onValueChange={(value) => {
                  setShowActivity(value);
                  updatePreference('show_activity', value);
                }}
                disabled={savingPreference === 'show_activity'}
                trackColor={{ true: colors.primary[500] }}
              />
            </View>
          </View>
        </View>

        <Text style={styles.version}>CampusHub Admin v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing[4], paddingTop: spacing[8], backgroundColor: colors.primary[500] },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.inverse, marginLeft: spacing[3] },
  section: { padding: spacing[4] },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing[2], marginLeft: spacing[1] },
  card: { backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[4], ...shadows.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border.light },
  settingText: { flex: 1, fontSize: 16, color: colors.text.primary, marginLeft: spacing[3] },
  input: { backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg, padding: spacing[3], fontSize: 15, color: colors.text.primary, marginBottom: spacing[3] },
  saveButton: { backgroundColor: colors.primary[500], borderRadius: borderRadius.lg, padding: spacing[3], alignItems: 'center', marginTop: spacing[2] },
  saveButtonText: { fontSize: 15, fontWeight: '600', color: colors.text.inverse },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border.light },
  version: { textAlign: 'center', fontSize: 12, color: colors.text.tertiary, paddingVertical: spacing[6] },
});

export default SettingsScreen;
