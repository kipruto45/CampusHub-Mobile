// OAuth Callback Handler
// Handles the redirect from Google/Microsoft OAuth

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors } from '../../../theme/colors';
import { exchangeCodeForTokens } from '../../../services/socialAuth';
import { useAuthStore } from '../../../store/auth.store';
import { resolveHomeRouteByRole } from '../../../lib/auth-routing';
import Icon from '../../../components/ui/Icon';

const OAuthCallback: React.FC = () => {
  const { provider, code, error, error_description } = useLocalSearchParams<{
    provider?: string | string[];
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const toValue = (input: string | string[] | undefined): string => {
      if (Array.isArray(input)) return input[0] || '';
      return input || '';
    };

    const handleCallback = async () => {
      try {
        const providerValue = toValue(provider).toLowerCase();
        const codeValue = toValue(code);
        const errorValue = toValue(error);
        const errorDescriptionValue = toValue(error_description);

        const providerType =
          providerValue === 'google'
            ? 'google'
            : providerValue === 'microsoft'
            ? 'microsoft'
            : null;

        if (!providerType) {
          setStatus('error');
          setMessage('Invalid OAuth provider.');
          setTimeout(() => router.replace('/(auth)/login'), 3000);
          return;
        }

        if (errorValue || errorDescriptionValue) {
          setStatus('error');
          setMessage(errorDescriptionValue || `Authentication failed: ${errorValue}`);
          setTimeout(() => router.replace('/(auth)/login'), 3000);
          return;
        }

        if (!codeValue) {
          setStatus('error');
          setMessage('No authorization code received. Please try again.');
          setTimeout(() => router.replace('/(auth)/login'), 3000);
          return;
        }

        // Exchange the code for tokens
        await finalizeSocialLogin(providerType, codeValue);
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setMessage(err.message || 'Authentication failed');
        setTimeout(() => router.replace('/(auth)/login'), 3000);
      }
    };

    const finalizeSocialLogin = async (providerType: 'google' | 'microsoft', authCode: string) => {
      try {
        setMessage('Exchanging code for tokens...');
        const result = await exchangeCodeForTokens(providerType, authCode);

        if (!result.success || !result.tokens?.accessToken) {
          throw new Error(result.error || 'Failed to get tokens');
        }

        setMessage('Logging you in...');
        await useAuthStore.getState().socialLogin(providerType, {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        });

        setStatus('success');
        setMessage('Successfully logged in!');
        const { user } = useAuthStore.getState();
        setTimeout(() => router.replace(resolveHomeRouteByRole(user?.role) as any), 1000);
      } catch (err: any) {
        console.error('Token exchange error:', err);
        setStatus('error');
        const errorMsg = err.response?.data?.message || err.response?.data?.detail || 'Failed to complete authentication';
        setMessage(errorMsg);
        setTimeout(() => router.replace('/(auth)/login'), 3000);
      }
    };

    handleCallback();
  }, [provider, code, error, error_description, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.message}>{message}</Text>
        {status === 'success' && (
          <Icon name="checkmark-circle" size={40} color={colors.success} />
        )}
        {status === 'error' && (
          <Icon name="close-circle" size={40} color={colors.error} />
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 20,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
  },
  successIcon: {
    marginTop: 20,
    fontSize: 48,
    color: colors.success,
  },
  errorIcon: {
    marginTop: 20,
    fontSize: 48,
    color: colors.error,
  },
});

export default OAuthCallback;
