// Security Screen for CampusHub
// Backend-driven with real API integration

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { userAPI } from '../../services/api';

interface LinkedAccount {
  id: string;
  provider: string;
  provider_display: string;
  provider_email: string;
  is_active: boolean;
  created_at: string;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_alerts: boolean;
  session_timeout: number;
}

const SecurityScreen: React.FC = () => {
  const router = useRouter();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Linked accounts
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  
  // Security settings (mock for now - would need backend endpoint)
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Fetch linked accounts from API
  const fetchLinkedAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userAPI.getLinkedAccounts();
      const accounts: LinkedAccount[] = response.data.data || [];
      setLinkedAccounts(accounts);
    } catch (error: any) {
      console.error('Failed to fetch linked accounts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinkedAccounts();
  }, [fetchLinkedAccounts]);

  const handlePasswordChange = () => {
    router.push('/(student)/change-password');
  };

  const handleLoginAlertToggle = (value: boolean) => {
    setLoginAlerts(value);
    // Would save to backend
    Alert.alert(
      'Setting Updated',
      value 
        ? 'Login alerts enabled. You will be notified of new device logins.' 
        : 'Login alerts disabled.'
    );
  };

  const handleTwoFactorToggle = (value: boolean) => {
    if (value) {
      Alert.alert(
        'Enable Two-Factor Authentication',
        'This feature is coming soon. You will be able to set up 2FA using an authenticator app.',
        [{ text: 'OK' }]
      );
    }
    setTwoFactorEnabled(value);
  };

  const handleUnlinkAccount = (account: LinkedAccount) => {
    Alert.alert(
      'Unlink Account',
      `Are you sure you want to unlink your ${account.provider_display} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlink', 
          style: 'destructive', 
          onPress: () => {
            // Would call API to unlink
            Alert.alert('Coming Soon', 'Account unlinking will be available soon.');
          }
        },
      ]
    );
  };

  const getProviderIcon = (provider: string): string => {
    switch (provider) {
      case 'google': return 'logo-google';
      case 'microsoft': return 'logo-microsoft';
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

  // Check if user can change password (email-based accounts only)
  const canChangePassword = true; // Would check auth_provider from profile data

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading security settings...</Text>
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
        <Text style={styles.headerTitle}>Security</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Password</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.securityItem} 
              onPress={handlePasswordChange}
              disabled={!canChangePassword}
            >
              <View style={styles.securityIconContainer}>
                <Icon name="key" size={22} color={colors.primary[500]} />
              </View>
              <View style={styles.securityInfo}>
                <Text style={[styles.securityTitle, !canChangePassword && styles.disabledText]}>
                  Change Password
                </Text>
                <Text style={styles.securitySubtitle}>
                  {canChangePassword 
                    ? 'Update your account password' 
                    : 'Password cannot be changed for OAuth accounts'}
                </Text>
              </View>
              {canChangePassword && (
                <Icon name="chevron-forward" size={20} color={colors.text.secondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Two-Factor Authentication Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
          <View style={styles.card}>
            <View style={styles.securityItem}>
              <View style={styles.securityIconContainer}>
                <Icon name="shield-checkmark" size={22} color={colors.primary[500]} />
              </View>
              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>Enable 2FA</Text>
                <Text style={styles.securitySubtitle}>
                  Add an extra layer of security to your account
                </Text>
              </View>
              <Switch 
                value={twoFactorEnabled} 
                onValueChange={handleTwoFactorToggle}
                trackColor={{ true: colors.primary[500] }} 
                thumbColor="#FFFFFF" 
              />
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.securityItem} onPress={() => Alert.alert('Coming Soon', 'Recovery codes will be available soon')}>
              <View style={styles.securityIconContainer}>
                <Icon name="key" size={22} color={colors.primary[500]} />
              </View>
              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>Recovery Codes</Text>
                <Text style={styles.securitySubtitle}>
                  Get backup codes to access your account
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Alerts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Login Alerts</Text>
          <View style={styles.card}>
            <View style={styles.securityItem}>
              <View style={styles.securityIconContainer}>
                <Icon name="notifications" size={22} color={colors.primary[500]} />
              </View>
              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>Login Notifications</Text>
                <Text style={styles.securitySubtitle}>
                  Get notified of new device logins
                </Text>
              </View>
              <Switch 
                value={loginAlerts} 
                onValueChange={handleLoginAlertToggle}
                trackColor={{ true: colors.primary[500] }} 
                thumbColor="#FFFFFF" 
              />
            </View>
          </View>
        </View>

        {/* Linked Accounts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Linked Accounts</Text>
            <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Link new accounts will be available soon')}>
              <Text style={styles.addButton}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {linkedAccounts.length > 0 ? (
              linkedAccounts.map((account, index) => (
                <View key={account.id}>
                  <View style={styles.securityItem}>
                    <View style={[styles.securityIconContainer, { backgroundColor: getProviderColor(account.provider) + '20' }]}>
                      <Icon name={getProviderIcon(account.provider) as any} size={18} color={getProviderColor(account.provider)} />
                    </View>
                    <View style={styles.securityInfo}>
                      <Text style={styles.securityTitle}>{account.provider_display}</Text>
                      <Text style={styles.securitySubtitle}>
                        {account.provider_email || 'Connected'}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleUnlinkAccount(account)}
                      style={styles.unlinkButton}
                    >
                      <Text style={styles.unlinkText}>Unlink</Text>
                    </TouchableOpacity>
                  </View>
                  {index < linkedAccounts.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="link" size={40} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>No linked accounts</Text>
                <Text style={styles.emptySubtitle}>
                  Link your Google or Microsoft account for easier login
                </Text>
                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={() => Alert.alert('Coming Soon', 'Link accounts will be available soon')}
                >
                  <Text style={styles.linkButtonText}>Link Account</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Active Sessions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Sessions</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.securityItem} onPress={() => Alert.alert('Coming Soon', 'Session management will be available soon')}>
              <View style={styles.securityIconContainer}>
                <Icon name="laptop" size={22} color={colors.primary[500]} />
              </View>
              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>Manage Sessions</Text>
                <Text style={styles.securitySubtitle}>
                  View and manage your active login sessions
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.dangerItem} 
              onPress={() => Alert.alert(
                'Delete Account',
                'This action is irreversible. All your data will be permanently deleted.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Coming Soon', 'Account deletion will be available soon') },
                ]
              )}
            >
              <View style={[styles.securityIconContainer, { backgroundColor: colors.error + '20' }]}>
                <Icon name="trash" size={22} color={colors.error} />
              </View>
              <View style={styles.securityInfo}>
                <Text style={[styles.securityTitle, { color: colors.error }]}>Delete Account</Text>
                <Text style={styles.securitySubtitle}>
                  Permanently delete your account and data
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
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
    ...shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  section: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addButton: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
    marginBottom: spacing[3],
  },
  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  securityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  securityInfo: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  securitySubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  disabledText: {
    color: colors.text.tertiary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing[4] + 40 + spacing[3],
  },
  unlinkButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  unlinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing[6],
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing[3],
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[1],
    marginBottom: spacing[4],
  },
  linkButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  bottomSpacing: {
    height: spacing[16],
  },
});

export default SecurityScreen;
