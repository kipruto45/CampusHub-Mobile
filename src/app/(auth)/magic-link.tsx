// Magic Link Consumption Screen
// Handles passwordless login via emailed token

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/ui/Icon';
import { useAuthStore } from '../../store/auth.store';
import { useToast } from '../../components/ui/Toast';

const MagicLinkScreen: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { loginWithMagicLink, isLoading } = useAuthStore();
  const params = useLocalSearchParams<{ token?: string }>();
  const initialToken = useMemo(() => {
    const raw = params?.token;
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  }, [params]);

  const [token, setToken] = useState(initialToken || '');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    initialToken ? 'verifying' : 'idle'
  );
  const [error, setError] = useState('');

  const processToken = async (value?: string) => {
    const tokenValue = (value ?? token).trim();
    if (!tokenValue) {
      showToast('warning', 'Paste the magic link token from your email');
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
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Magic link is invalid or expired. Request a new one.';
      setStatus('error');
      setError(message);
      showToast('error', message);
    }
  };

  useEffect(() => {
    if (initialToken) {
      // Auto-consume when opened from email deep link
      processToken(initialToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  const renderStatus = () => {
    if (status === 'verifying') {
      return (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.primary[500]} />
          <Text style={styles.statusText}>Verifying your magic link…</Text>
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
          Opened from your email? We’ll verify the token automatically. You can also paste it below.
        </Text>

        {renderStatus()}

        <Input
          label="Magic link token"
          placeholder="Paste token here"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          containerStyle={styles.input}
        />

        <Button
          title={status === 'verifying' || isLoading ? 'Signing in…' : 'Sign in with token'}
          onPress={() => processToken()}
          loading={status === 'verifying' || isLoading}
          fullWidth
          style={styles.button}
        />

        <View style={styles.helperRow}>
          <Text style={styles.helperText}>No email yet?</Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.helperLink}>Request a new link</Text>
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
  },
  input: {
    marginBottom: spacing.md,
  },
  button: {
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
