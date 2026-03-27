// Security Screen for CampusHub
// Backend-driven with real API integration

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../components/ui/Icon';
import { securityAPI,userAPI } from '../../services/api';
import { canUseNativeProvider,signInWithNativeProvider,type NativeProvider } from '../../services/nativeSocialAuth';
import { useAuthStore } from '../../store/auth.store';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';
import { copyToClipboard } from '../../utils/share';

interface LinkedAccount {
  id: string;
  provider: string;
  provider_display: string;
  provider_email: string;
  is_active: boolean;
  created_at: string;
}

interface TwoFactorStatus {
  enabled: boolean;
  method?: string | null;
  verified_at?: string | null;
}

const PROVIDERS: { id: NativeProvider; label: string; icon: string; color: string }[] = [
  { id: 'google', label: 'Google', icon: 'logo-google', color: '#DB4437' },
  { id: 'microsoft', label: 'Microsoft', icon: 'logo-microsoft', color: '#00A4EF' },
];

const SecurityScreen: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [linkedProviders, setLinkedProviders] = useState<Set<string>>(new Set());
  const [linkedAccounts, setLinkedAccounts] = useState<Record<string, LinkedAccount>>({});
  const [linkingProvider, setLinkingProvider] = useState<NativeProvider | null>(null);

  const [twoFactor, setTwoFactor] = useState<TwoFactorStatus>({ enabled: false });
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorUri, setTwoFactorUri] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesOpen, setBackupCodesOpen] = useState(false);

  const [promptOpen, setPromptOpen] = useState(false);
  const [promptType, setPromptType] = useState<'disable-2fa' | 'recovery-codes' | 'delete-account' | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const isPrimaryProvider = (providerId: string) =>
    (user?.auth_provider || 'email').toLowerCase() === providerId.toLowerCase();

  const loadSecurityData = useCallback(async () => {
    try {
      setLoading(true);
      const [linkedRes, twoFactorRes] = await Promise.all([
        userAPI.getLinkedAccounts(),
        securityAPI.getTwoFactorStatus().catch(() => ({ data: { data: { enabled: false } } })),
      ]);

      const linkedPayload = linkedRes?.data?.data ?? linkedRes?.data ?? {};
      const accounts = Array.isArray(linkedPayload?.accounts) ? linkedPayload.accounts : [];
      const providerList = Array.isArray(linkedPayload?.linked_providers)
        ? linkedPayload.linked_providers
        : [];

      const providerSet = new Set<string>(
        [...providerList, ...accounts.map((account: any) => account?.provider)]
          .map((entry) => String(entry || '').toLowerCase())
          .filter(Boolean)
      );

      const accountMap: Record<string, LinkedAccount> = {};
      accounts.forEach((account: any) => {
        const key = String(account?.provider || '').toLowerCase();
        if (!key) return;
        accountMap[key] = account as LinkedAccount;
      });

      setLinkedProviders(providerSet);
      setLinkedAccounts(accountMap);

      const twoFactorPayload = twoFactorRes?.data?.data ?? twoFactorRes?.data ?? {};
      setTwoFactor({
        enabled: Boolean(twoFactorPayload?.enabled),
        method: twoFactorPayload?.method || null,
        verified_at: twoFactorPayload?.verified_at || null,
      });
    } catch (error: any) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  const handleStartTwoFactor = async () => {
    try {
      setSaving(true);
      const response = await securityAPI.setupTwoFactor('totp');
      const payload = response?.data?.data ?? response?.data ?? {};
      setTwoFactorSecret(String(payload?.secret || ''));
      setTwoFactorUri(String(payload?.uri || ''));
      setTwoFactorCode('');
      setTwoFactorSetupOpen(true);
    } catch (error: any) {
      Alert.alert('2FA Setup', error?.response?.data?.detail || 'Unable to start 2FA setup.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    if (!twoFactorCode.trim()) {
      Alert.alert('2FA Verification', 'Enter the 6-digit code from your authenticator app.');
      return;
    }
    try {
      setSaving(true);
      const response = await securityAPI.enableTwoFactor(twoFactorCode.trim());
      const payload = response?.data?.data ?? response?.data ?? {};
      const codes = Array.isArray(payload?.backup_codes) ? payload.backup_codes : [];
      setBackupCodes(codes.map((code: unknown) => String(code)));
      setTwoFactor({ enabled: true, method: 'totp', verified_at: new Date().toISOString() });
      setTwoFactorSetupOpen(false);
      if (codes.length > 0) {
        setBackupCodesOpen(true);
      }
      Alert.alert('2FA Enabled', 'Two-factor authentication is now enabled.');
    } catch (error: any) {
      Alert.alert(
        '2FA Enable Failed',
        error?.response?.data?.detail || error?.response?.data?.message || 'Unable to enable 2FA.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTwoFactorToggle = async (value: boolean) => {
    if (value) {
      await handleStartTwoFactor();
      return;
    }
    setPromptType('disable-2fa');
    setPromptValue('');
    setPromptOpen(true);
  };

  const handlePromptConfirm = async () => {
    if (!promptValue.trim()) {
      Alert.alert('Password Required', 'Please enter your password to continue.');
      return;
    }

    try {
      setSaving(true);
      if (promptType === 'disable-2fa') {
        await securityAPI.disableTwoFactor(promptValue.trim());
        setTwoFactor({ enabled: false, method: null, verified_at: null });
        Alert.alert('2FA Disabled', 'Two-factor authentication has been disabled.');
      } else if (promptType === 'recovery-codes') {
        const response = await securityAPI.recoveryCodes(promptValue.trim());
        const payload = response?.data?.data ?? response?.data ?? {};
        const codes = Array.isArray(payload?.backup_codes) ? payload.backup_codes : [];
        setBackupCodes(codes.map((code: unknown) => String(code)));
        setBackupCodesOpen(true);
      } else if (promptType === 'delete-account') {
        await securityAPI.deleteAccount(promptValue.trim());
        Alert.alert(
          'Account Scheduled for Deletion',
          'Your account will be permanently deleted after 7 days. You can contact support within this window to restore access.'
        );
        await logout();
        router.replace('/(auth)/login');
      }
    } catch (error: any) {
      Alert.alert(
        'Action Failed',
        error?.response?.data?.detail || error?.response?.data?.message || 'Unable to complete this action.'
      );
    } finally {
      setSaving(false);
      setPromptOpen(false);
      setPromptType(null);
      setPromptValue('');
    }
  };

  const handleRecoveryCodes = () => {
    setPromptType('recovery-codes');
    setPromptValue('');
    setPromptOpen(true);
  };

  const handleDeleteAccount = () => {
    setPromptType('delete-account');
    setPromptValue('');
    setPromptOpen(true);
  };

  const handleLinkAccount = async (providerId: NativeProvider) => {
    try {
      setLinkingProvider(providerId);
      if (!canUseNativeProvider(providerId)) {
        Alert.alert(
          'Link Account',
          `Native ${providerId} sign-in is not configured on this build.`
        );
        return;
      }

      const nativeResult = await signInWithNativeProvider(providerId);
      if (!nativeResult.success || !nativeResult.tokens) {
        Alert.alert('Link Account', nativeResult.error || 'Unable to authenticate.');
        return;
      }

      if (providerId === 'google') {
        await securityAPI.linkGoogle({
          id_token: nativeResult.tokens.idToken,
          access_token: nativeResult.tokens.accessToken,
        });
      } else {
        if (!nativeResult.tokens.accessToken) {
          Alert.alert('Link Account', 'Microsoft did not return an access token.');
          return;
        }
        await securityAPI.linkMicrosoft({
          access_token: nativeResult.tokens.accessToken,
          id_token: nativeResult.tokens.idToken,
        });
      }

      Alert.alert('Account Linked', `${providerId} account linked successfully.`);
      loadSecurityData();
    } catch (error: any) {
      Alert.alert(
        'Link Account Failed',
        error?.response?.data?.detail || error?.message || 'Unable to link account.'
      );
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleUnlinkAccount = async (providerId: NativeProvider) => {
    if (isPrimaryProvider(providerId)) {
      Alert.alert('Primary Account', 'You cannot unlink the primary sign-in provider.');
      return;
    }

    try {
      setSaving(true);
      await securityAPI.unlinkAccount(providerId);
      Alert.alert('Account Unlinked', `${providerId} account has been unlinked.`);
      loadSecurityData();
    } catch (error: any) {
      Alert.alert(
        'Unlink Failed',
        error?.response?.data?.detail || error?.message || 'Unable to unlink account.'
      );
    } finally {
      setSaving(false);
    }
  };

  const promptConfig = useMemo(() => {
    if (promptType === 'disable-2fa') {
      return {
        title: 'Disable Two-Factor Authentication',
        message: 'Enter your password to disable 2FA.',
        confirmLabel: 'Disable',
      };
    }
    if (promptType === 'recovery-codes') {
      return {
        title: 'Generate Recovery Codes',
        message: 'Enter your password to generate new recovery codes.',
        confirmLabel: 'Generate',
      };
    }
    if (promptType === 'delete-account') {
      return {
        title: 'Delete Account',
        message: 'Enter your password to schedule account deletion.',
        confirmLabel: 'Delete',
      };
    }
    return {
      title: 'Confirm Action',
      message: 'Enter your password to continue.',
      confirmLabel: 'Confirm',
    };
  }, [promptType]);
  const hasBackupCodes = backupCodes.length > 0;

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
              onPress={() => router.push('/(student)/change-password')}
            >
              <View style={styles.securityIconContainer}>
                <Icon name="key" size={22} color={colors.primary[500]} />
              </View>
              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>Change Password</Text>
                <Text style={styles.securitySubtitle}>Update your account password</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Two-Factor Authentication */}
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
                  {twoFactor.enabled ? 'Enabled with authenticator app' : 'Add an extra layer of security'}
                </Text>
              </View>
              <Switch
                value={twoFactor.enabled}
                onValueChange={handleTwoFactorToggle}
                trackColor={{ true: colors.primary[500] }}
                thumbColor="#FFFFFF"
                disabled={saving}
              />
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.securityItem} onPress={handleRecoveryCodes}>
              <View style={styles.securityIconContainer}>
                <Icon name="key" size={22} color={colors.primary[500]} />
              </View>
              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>Recovery Codes</Text>
                <Text style={styles.securitySubtitle}>
                  Generate backup codes for account access
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Linked Accounts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Linked Accounts</Text>
          </View>
          <View style={styles.card}>
            {PROVIDERS.map((provider, index) => {
              const isLinked = linkedProviders.has(provider.id);
              const account = linkedAccounts[provider.id];
              const email = account?.provider_email || user?.email || '';
              const isPrimary = isPrimaryProvider(provider.id);
              const actionLabel = isLinked ? (isPrimary ? 'Primary' : 'Unlink') : 'Link';
              const actionDisabled = saving || linkingProvider === provider.id || (isLinked && isPrimary);

              return (
                <View key={provider.id}>
                  <View style={styles.securityItem}>
                    <View
                      style={[
                        styles.securityIconContainer,
                        { backgroundColor: provider.color + '15' },
                      ]}
                    >
                      <Icon name={provider.icon as any} size={18} color={provider.color} />
                    </View>
                    <View style={styles.securityInfo}>
                      <Text style={styles.securityTitle}>{provider.label}</Text>
                      <Text style={styles.securitySubtitle}>
                        {isLinked ? email || 'Connected' : 'Not linked'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionButton, actionDisabled && styles.actionButtonDisabled]}
                      onPress={() =>
                        isLinked
                          ? handleUnlinkAccount(provider.id)
                          : handleLinkAccount(provider.id)
                      }
                      disabled={actionDisabled}
                    >
                      <Text
                        style={[
                          styles.actionText,
                          isLinked && !isPrimary ? styles.unlinkText : styles.linkText,
                        ]}
                      >
                        {linkingProvider === provider.id ? '...' : actionLabel}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {index < PROVIDERS.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Active Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Sessions</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.securityItem}
              onPress={() => router.push('/(student)/sessions')}
            >
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
            <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
              <View
                style={[styles.securityIconContainer, { backgroundColor: colors.error + '20' }]}
              >
                <Icon name="trash" size={22} color={colors.error} />
              </View>
              <View style={styles.securityInfo}>
                <Text style={[styles.securityTitle, { color: colors.error }]}>Delete Account</Text>
                <Text style={styles.securitySubtitle}>
                  Schedule deletion with a 7-day recovery window
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Two-Factor Setup Modal */}
      <Modal
        visible={twoFactorSetupOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTwoFactorSetupOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Set Up Two-Factor Auth</Text>
            <Text style={styles.modalText}>
              Scan the secret in your authenticator app, then enter the 6-digit code.
            </Text>
            <View style={styles.secretBox}>
              <Text style={styles.secretLabel}>Secret</Text>
              <Text style={styles.secretValue}>{twoFactorSecret || 'Not ready'}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard(twoFactorSecret || '')}
              >
                <Text style={styles.copyButtonText}>Copy Secret</Text>
              </TouchableOpacity>
            </View>
            {twoFactorUri ? (
              <Text style={styles.uriText}>Setup URI: {twoFactorUri}</Text>
            ) : null}
            <TextInput
              style={styles.modalInput}
              placeholder="6-digit code"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="number-pad"
              value={twoFactorCode}
              onChangeText={setTwoFactorCode}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setTwoFactorSetupOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleEnableTwoFactor}
                disabled={saving}
              >
                <Text style={styles.modalConfirmText}>
                  {saving ? 'Saving...' : 'Enable'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Backup Codes Modal */}
      <Modal
        visible={backupCodesOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBackupCodesOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Recovery Codes</Text>
            <Text style={styles.modalText}>
              Save these codes in a safe place. Each code can be used once.
            </Text>
            <View style={styles.codesContainer}>
              {hasBackupCodes ? (
                backupCodes.map((code) => (
                  <Text key={code} style={styles.codeItem}>
                    {code}
                  </Text>
                ))
              ) : (
                <Text style={styles.modalText}>
                  No recovery codes were returned for this account. Generate a fresh set to replace any older codes you may have stored.
                </Text>
              )}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setBackupCodesOpen(false)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={() => {
                  if (hasBackupCodes) {
                    copyToClipboard(backupCodes.join('\n'));
                    return;
                  }
                  setBackupCodesOpen(false);
                  handleRecoveryCodes();
                }}
              >
                <Text style={styles.modalConfirmText}>
                  {hasBackupCodes ? 'Copy All' : 'Generate New'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Prompt Modal */}
      <Modal
        visible={promptOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPromptOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{promptConfig.title}</Text>
            <Text style={styles.modalText}>{promptConfig.message}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Password"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry
              value={promptValue}
              onChangeText={setPromptValue}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setPromptOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handlePromptConfirm}
                disabled={saving}
              >
                <Text style={styles.modalConfirmText}>
                  {saving ? 'Working...' : promptConfig.confirmLabel}
                </Text>
              </TouchableOpacity>
            </View>
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
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing[4] + 40 + spacing[3],
  },
  actionButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  linkText: {
    color: colors.primary[600],
  },
  unlinkText: {
    color: colors.error,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  bottomSpacing: {
    height: spacing[16],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContainer: {
    width: '100%',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  modalText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
  },
  modalButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  modalCancelButton: {
    backgroundColor: colors.background.secondary,
  },
  modalConfirmButton: {
    backgroundColor: colors.primary[500],
  },
  modalCancelText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  modalConfirmText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  secretBox: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  secretLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  secretValue: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  copyButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
  },
  uriText: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginBottom: spacing[3],
  },
  codesContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  codeItem: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
});

export default SecurityScreen;
