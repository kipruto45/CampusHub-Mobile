import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Icon from '../components/ui/Icon';
import Input from '../components/ui/Input';
import ScreenContainer from '../components/ui/ScreenContainer';
import { useToast } from '../components/ui/Toast';
import { resolveHomeRouteByRole } from '../lib/auth-routing';
import { adminAPI, setAuthToken, setRefreshToken } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { colors } from '../theme/colors';
import { borderRadius, spacing } from '../theme/spacing';

type ValidationPayload = {
  valid: boolean;
  status?: string;
  message?: string;
  role?: string;
  roles?: string[];
  role_names?: string[];
  role_details?: Array<{
    code: string;
    name: string;
    description?: string;
    permission_preset?: string[];
  }>;
  email?: string;
  note?: string;
  expires_at?: string;
  existing_account?: boolean;
  requires_login?: boolean;
  can_accept?: boolean;
  invited_by_name?: string;
};

export default function RoleInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = String(params.token || '').trim();
  const { showToast } = useToast();
  const authState = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    fetchCurrentUser: state.fetchCurrentUser,
  }));

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [validation, setValidation] = useState<ValidationPayload | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const validateInvitation = useCallback(async () => {
    if (!token) {
      setValidation({
        valid: false,
        message: 'Missing invitation token.',
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await adminAPI.validateInvitation(token);
      const payload = response.data?.data || response.data || {};
      setValidation(payload);
    } catch (error: any) {
      console.error('Failed to validate invitation:', error);
      setValidation({
        valid: false,
        message:
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          'This invitation is not available.',
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    validateInvitation();
  }, [validateInvitation, authState.isAuthenticated, authState.user?.email]);

  const roleNames = useMemo(() => {
    if (validation?.role_details?.length) {
      return validation.role_details.map((detail) => detail.name);
    }
    if (validation?.role_names?.length) {
      return validation.role_names;
    }
    if (validation?.roles?.length) {
      return validation.roles.map((role) => role.replace(/_/g, ' '));
    }
    return validation?.role ? [validation.role.replace(/_/g, ' ')] : [];
  }, [validation]);

  const needsAccountSetup = Boolean(validation?.valid && !validation?.existing_account);

  const handleAccept = async () => {
    if (!validation?.valid) {
      return;
    }

    if (needsAccountSetup) {
      if (!fullName.trim()) {
        showToast('error', 'Full name is required');
        return;
      }
      if (!password.trim()) {
        showToast('error', 'Password is required');
        return;
      }
      if (password !== passwordConfirm) {
        showToast('error', 'Passwords do not match');
        return;
      }
    }

    try {
      setAccepting(true);
      const response = await adminAPI.acceptInvitation({
        token,
        full_name: fullName,
        password,
        password_confirm: passwordConfirm,
        registration_number: registrationNumber,
        phone_number: phoneNumber,
      });
      const payload = response.data?.data || response.data || {};

      if (payload.access) {
        setAuthToken(payload.access);
        setRefreshToken(payload.refresh || null);
        useAuthStore.setState((state) => ({
          ...state,
          accessToken: payload.access,
          refreshToken: payload.refresh || null,
          isAuthenticated: true,
          isLoading: false,
        }));
      }

      await authState.fetchCurrentUser();
      showToast('success', payload.message || 'Invitation accepted');
      router.replace(resolveHomeRouteByRole(payload.user?.role || authState.user?.role) as any);
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      showToast(
        'error',
        error?.response?.data?.message ||
          error?.response?.data?.detail ||
          'Unable to accept invitation'
      );
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.loaderShell} padding="large">
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loaderText}>Validating your invitation...</Text>
      </ScreenContainer>
    );
  }

  if (!validation?.valid) {
    return (
      <ScreenContainer style={styles.screen} padding="large">
        <EmptyState
          icon="mail"
          title="Invitation not available"
          description={validation?.message || 'Ask a CampusHub administrator to send a fresh invitation link.'}
          actionLabel="Back to Login"
          onAction={() => router.replace('/(auth)/login')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.screen} padding="none">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <Badge label="Role Invitation" variant="primary" />
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.heroTitle}>You’ve been invited to join CampusHub.</Text>
          <Text style={styles.heroSubtitle}>{validation.message}</Text>

          <View style={styles.rolePillRow}>
            {roleNames.map((roleName) => (
              <View key={roleName} style={styles.rolePill}>
                <Text style={styles.rolePillText}>{roleName}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.detailCard}>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Invitation Email</Text>
              <Text style={styles.detailValue}>{validation.email}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Invited By</Text>
              <Text style={styles.detailValue}>{validation.invited_by_name || 'CampusHub admin'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Expires</Text>
              <Text style={styles.detailValue}>
                {validation.expires_at ? new Date(validation.expires_at).toLocaleDateString() : 'Soon'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Account Match</Text>
              <Text style={styles.detailValue}>
                {validation.existing_account ? 'Existing CampusHub account' : 'New account setup'}
              </Text>
            </View>
          </View>

          {validation.note ? (
            <View style={styles.notePanel}>
              <Icon name="information-circle" size={18} color={colors.primary[600]} />
              <Text style={styles.noteText}>{validation.note}</Text>
            </View>
          ) : null}
        </Card>

        {validation.requires_login && !authState.isAuthenticated ? (
          <Card style={styles.noticeCard} variant="filled">
            <Text style={styles.noticeTitle}>Sign in required</Text>
            <Text style={styles.noticeBody}>
              This invitation is attached to an existing CampusHub account. Sign in with
              {` ${validation.email} `}to accept it.
            </Text>
            <Button
              title="Go to Login"
              onPress={() => router.push('/(auth)/login')}
              icon={<Icon name="arrow-forward" size={16} color={colors.text.inverse} />}
            />
          </Card>
        ) : validation.can_accept === false ? (
          <Card style={styles.noticeCard} variant="filled">
            <Text style={styles.noticeTitle}>Account mismatch</Text>
            <Text style={styles.noticeBody}>
              You’re currently signed in with a different CampusHub account. Switch to
              {` ${validation.email} `}to continue.
            </Text>
          </Card>
        ) : (
          <>
            {needsAccountSetup ? (
              <Card style={styles.formCard}>
                <Text style={styles.formTitle}>Create your CampusHub account</Text>
                <Input
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Jane Doe"
                  leftIcon={<Icon name="person" size={18} color={colors.text.tertiary} />}
                />
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Choose a password"
                  secureTextEntry
                />
                <Input
                  label="Confirm Password"
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  placeholder="Repeat your password"
                  secureTextEntry
                />
                <Input
                  label="Registration Number"
                  value={registrationNumber}
                  onChangeText={setRegistrationNumber}
                  placeholder="Optional"
                />
                <Input
                  label="Phone Number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Optional"
                  keyboardType="phone-pad"
                />
              </Card>
            ) : (
              <Card style={styles.noticeCard} variant="filled">
                <Text style={styles.noticeTitle}>Ready to accept</Text>
                <Text style={styles.noticeBody}>
                  Your existing CampusHub profile matches this invitation. Accept now to apply the
                  selected roles and permissions immediately.
                </Text>
              </Card>
            )}

            <Button
              title={needsAccountSetup ? 'Create Account & Accept' : 'Accept Invitation'}
              onPress={handleAccept}
              loading={accepting}
              fullWidth
              icon={<Icon name="checkmark-circle" size={16} color={colors.text.inverse} />}
              style={styles.acceptButton}
            />
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background.secondary,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  loaderShell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: spacing[4],
    color: colors.text.secondary,
  },
  heroCard: {
    backgroundColor: colors.primary[700],
    marginBottom: spacing[4],
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  loginLink: {
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '700',
  },
  heroTitle: {
    color: colors.text.inverse,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: spacing[3],
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    lineHeight: 22,
  },
  rolePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  rolePill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  rolePillText: {
    color: colors.text.inverse,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  detailCard: {
    marginBottom: spacing[4],
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  detailItem: {
    flex: 1,
    minWidth: 140,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '700',
  },
  notePanel: {
    marginTop: spacing[4],
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[50],
  },
  noteText: {
    flex: 1,
    color: colors.primary[700],
    lineHeight: 20,
  },
  noticeCard: {
    marginBottom: spacing[4],
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  noticeBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  formCard: {
    marginBottom: spacing[4],
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  acceptButton: {
    marginBottom: spacing[4],
  },
});
