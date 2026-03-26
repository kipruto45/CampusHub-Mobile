import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

type MagicStatus = 'idle' | 'requested' | 'verifying' | 'success' | 'error';

const readParam = (value?: string | string[]): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return '';
};

const MagicLinkScreen: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { loginWithMagicLink, isLoading } = useAuthStore();
  const params = useLocalSearchParams<{
    token?: string | string[];
    email?: string | string[];
    requested?: string | string[];
  }>();
  const initialToken = useMemo(() => readParam(params?.token).trim(), [params]);
  const emailAddress = useMemo(
    () => readParam(params?.email).trim().toLowerCase(),
    [params]
  );
  const hasRequestedLink = useMemo(
    () => readParam(params?.requested).trim() === '1',
    [params]
  );

  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<MagicStatus>(
    initialToken ? 'verifying' : hasRequestedLink ? 'requested' : 'idle'
  );
  const [error, setError] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);

  useEffect(() => {
    setToken(initialToken);
    setStatus(initialToken ? 'verifying' : hasRequestedLink ? 'requested' : 'idle');
    setError('');
  }, [hasRequestedLink, initialToken]);

  const routeToVerification = (candidateEmail?: string) => {
    const normalizedEmail = (candidateEmail || emailAddress).trim().toLowerCase();
    router.replace({
      pathname: '/(auth)/verify-email',
      params: normalizedEmail ? { email: normalizedEmail } : {},
    });
  };

  const processToken = async (value?: string) => {
    const tokenValue = (value ?? token).trim();
    if (!tokenValue) {
      showToast('warning', 'Open the email link or paste the token from your email');
      return;
    }

    try {
      setStatus('verifying');
      setError('');
      const nextRoute = await loginWithMagicLink(tokenValue);
      setStatus('success');
      showToast('success', 'Signed in successfully');
      router.replace((nextRoute as any) || '/(student)/tabs/home');
    } catch (err: any) {
      const responseData = err?.response?.data ?? {};
      const message =
        responseData?.detail ||
        responseData?.message ||
        err?.message ||
        'Magic link is invalid or expired. Request a new one.';
      const errorCode = responseData?.code;
      const verificationEmail = responseData?.email;

      if (errorCode === 'email_not_verified') {
        showToast('warning', message);
        routeToVerification(verificationEmail);
        return;
      }

      setStatus('error');
      setError(message);
      showToast('error', message);
    }
  };

  const handleResendLink = async () => {
    if (!emailAddress) {
      showToast('warning', 'Go back and enter your email first');
      return;
    }

    try {
      setRequestBusy(true);
      await authAPI.requestMagicLink(emailAddress);
      setStatus('requested');
      setError('');
      showToast('success', 'A fresh magic link is on the way.');
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Unable to send another magic link right now.';
      setStatus('error');
      setError(message);
      showToast('error', message);
    } finally {
      setRequestBusy(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      void processToken(initialToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  const renderStatus = () => {
    if (status === 'verifying') {
      return (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.primary[500]} />
          <Text style={styles.statusText}>Verifying your magic link...</Text>
        </View>
      );
    }

    if (status === 'requested') {
      return (
        <View style={[styles.statusRow, styles.infoRow]}>
          <Icon name="mail" size={20} color={colors.primary[500]} />
          <Text style={styles.statusText}>
            {emailAddress
              ? `We sent a sign-in link to ${emailAddress}. Open the email on this phone, tap the link, or paste the token below.`
              : 'Check your email for the sign-in link, then open it on this device or paste the token below.'}
          </Text>
        </View>
      );
    }

    if (status === 'success') {
      return (
        <View style={[styles.statusRow, styles.successRow]}>
          <Icon name="checkmark-circle" size={20} color={colors.success} />
          <Text style={[styles.statusText, styles.successText]}>Signed in</Text>
        </View>
      );
    }

    if (status === 'error' && error) {
      return (
        <View style={[styles.statusRow, styles.errorRow]}>
          <Icon name="warning" size={20} color={colors.error} />
          <Text style={[styles.statusText, styles.errorText]}>{error}</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>

        <Text style={styles.title}>One-tap sign in</Text>
        <Text style={styles.subtitle}>
          Enter your email on the login screen, tap the magic-link button, then open the email link on this device.
          If the link lands you here, CampusHub will finish signing you in automatically.
        </Text>

        {renderStatus()}

        <Input
          label="Magic link token"
          placeholder="Paste token here if the link did not open automatically"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.input}
        />

        <Button
          title={status === 'verifying' || isLoading ? 'Signing in...' : 'Sign in with token'}
          onPress={() => void processToken()}
          loading={status === 'verifying' || isLoading}
          fullWidth
          style={styles.button}
        />

        <Button
          title={requestBusy ? 'Sending...' : emailAddress ? 'Resend magic link' : 'Use password instead'}
          onPress={
            emailAddress
              ? () => void handleResendLink()
              : () => router.replace('/(auth)/login')
          }
          loading={requestBusy}
          fullWidth
          size="md"
          variant="outline"
          style={styles.secondaryButton}
        />

        <View style={styles.helperRow}>
          <Text style={styles.helperText}>Prefer your password?</Text>
          <TouchableOpacity
            onPress={() =>
              router.replace({
                pathname: '/(auth)/login',
                params: emailAddress ? { email: emailAddress } : {},
              })
            }
          >
            <Text style={styles.helperLink}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background.secondary,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  input: {
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.sm,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  helperText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  helperLink: {
    color: colors.primary[500],
    fontSize: 14,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  statusText: {
    color: colors.text.secondary,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  infoRow: {
    borderColor: '#BFDBFE',
    borderWidth: 1,
    backgroundColor: '#EFF6FF',
  },
  successRow: {
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderWidth: 1,
  },
  successText: {
    color: '#166534',
  },
  errorRow: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  errorText: {
    color: '#991B1B',
  },
});

export default MagicLinkScreen;
