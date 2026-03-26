// Login Screen for CampusHub
// Premium white card design with social login

import { useLocalSearchParams,useRouter } from 'expo-router';
import React,{ useEffect,useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { biometricService } from '../../services/biometric';
import { canUseNativeProvider,signInWithNativeProvider } from '../../services/nativeSocialAuth';
import { exchangeNativeTokens } from '../../services/socialAuth';
import { useAuthStore } from '../../store/auth.store';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { redirect, reason, email: prefilledEmail } = useLocalSearchParams<{
    redirect?: string;
    reason?: string;
    email?: string;
  }>();
  const { login, loginWithBiometric, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [googleIconLoadError, setGoogleIconLoadError] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);
  const sessionExpired = reason === 'session_expired';

  const resolveRedirectPath = (value?: string | string[]) => {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (
      trimmed.startsWith('/(student)/') ||
      trimmed.startsWith('/(auth)/') ||
      trimmed.startsWith('/role-invite')
    ) {
      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      return `/(student)${trimmed}`;
    }

    return `/(student)/${trimmed}`;
  };

  useEffect(() => {
    const initBiometric = async () => {
      try {
        const shouldUse = await biometricService.shouldUseBiometric();
        if (!shouldUse) {
          setBiometricReady(false);
          return;
        }

        const hasFace = await biometricService.hasFaceId();
        const hasFingerprint = await biometricService.hasFingerprint();
        setBiometricLabel(hasFace ? 'Face ID' : hasFingerprint ? 'Fingerprint' : 'Biometric');
        setBiometricReady(true);
      } catch {
        setBiometricReady(false);
      }
    };

    initBiometric();
  }, []);

  useEffect(() => {
    if (typeof prefilledEmail === 'string' && prefilledEmail.trim()) {
      setEmail(prefilledEmail.trim().toLowerCase());
    }
  }, [prefilledEmail]);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('error', 'Please fill in all fields');
      return;
    }
    if (needsTwoFactor && !twoFactorCode.trim()) {
      showToast('warning', 'Enter your 2FA verification code');
      return;
    }
    
    try {
      const nextRoute = await login(
        email,
        password,
        rememberMe,
        needsTwoFactor ? twoFactorCode.trim() : undefined
      );
      console.log('Login successful, redirecting to:', nextRoute);
      setNeedsTwoFactor(false);
      setTwoFactorCode('');
      
      // Navigate to the appropriate dashboard based on role or redirect
      const redirectPath = resolveRedirectPath(redirect);
      if (redirectPath) {
        router.replace(redirectPath as any);
      } else if (nextRoute) {
        router.replace(nextRoute as any);
      } else {
        // Fallback: try to determine route from stored user
        router.replace('/(student)/tabs/home');
      }
    } catch (err: any) {
      console.log('Login error:', err);
      
      // Parse error message properly
      let errorMessage = 'Login failed. Please check your credentials.';
      const statusCode = err?.response?.status;
      const responseData = err?.response?.data;
      
      if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
        errorMessage =
          'CampusHub backend is temporarily unavailable. If you are using a local tunnel, restart it and confirm the backend server is still running.';
      } else if (responseData) {
        // Handle MobileResponse error format
        if (responseData.error?.message) {
          errorMessage = responseData.error.message;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.detail) {
          errorMessage = responseData.detail;
        }
      } else if (
        typeof err?.message === 'string' &&
        /cannot reach api|network error/i.test(err.message)
      ) {
        errorMessage =
          'Could not reach the CampusHub backend. Check that the backend is running and that mobile/.env points to a reachable API URL.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      const errorCode = responseData?.error?.code || responseData?.code;
      if (errorCode === 'two_factor_required' || /two-factor/i.test(errorMessage)) {
        setNeedsTwoFactor(true);
      }

      if (errorCode === 'email_not_verified') {
        const candidate = email.trim();
        const emailParams = candidate.includes('@')
          ? { email: candidate.toLowerCase() }
          : {};
        showToast('warning', errorMessage);
        router.push({
          pathname: '/(auth)/verify-email',
          params: emailParams,
        });
        return;
      }

      showToast('error', errorMessage);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      showToast('warning', 'Enter your email to get a magic link');
      return;
    }

    // Basic email validation to avoid obvious typos
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast('error', 'Please enter a valid email address');
      return;
    }

    try {
      setMagicBusy(true);
      const normalizedEmail = email.trim().toLowerCase();
      await authAPI.requestMagicLink(normalizedEmail);
      showToast('success', 'If your account exists, a one-tap link is on the way.');
      router.push({
        pathname: '/(auth)/magic-link',
        params: { email: normalizedEmail, requested: '1' },
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Unable to send magic link. Please try again.';
      showToast('error', message);
    } finally {
      setMagicBusy(false);
    }
  };

  const handleSocialLogin = async (provider: 'Google' | 'Microsoft') => {
    try {
      const providerKey = provider === 'Google' ? 'google' : 'microsoft';
      if (canUseNativeProvider(providerKey)) {
        const nativeResult = await signInWithNativeProvider(providerKey);
        if (nativeResult.success && nativeResult.tokens) {
          const exchange = await exchangeNativeTokens(providerKey, {
            idToken: nativeResult.tokens.idToken,
            accessToken: nativeResult.tokens.accessToken,
          });

          if (!exchange.success || !exchange.tokens?.accessToken) {
            throw new Error(exchange.error || 'Failed to exchange native tokens');
          }

          const nextRoute = await useAuthStore.getState().socialLogin(providerKey, {
            accessToken: exchange.tokens.accessToken,
            refreshToken: exchange.tokens.refreshToken,
          });

          if (nextRoute) {
            router.replace(nextRoute as any);
          } else {
            router.replace('/(student)/tabs/home');
          }
          return;
        }

        if (!nativeResult.fallbackToWeb) {
          showToast('error', nativeResult.error || `Failed to sign in with ${provider}`);
          return;
        }
      }

      const response =
        provider === 'Google'
          ? await authAPI.getGoogleOAuthUrl()
          : await authAPI.getMicrosoftOAuthUrl();

      const payload = response?.data?.data ?? response?.data ?? {};
      const authorizationUrl = payload?.authorization_url;
      if (!authorizationUrl) {
        showToast('error', `Unable to start ${provider} sign in`);
        return;
      }

      const canOpen = await Linking.canOpenURL(authorizationUrl);
      if (!canOpen) {
        showToast('error', 'Could not open authentication provider');
        return;
      }

      await Linking.openURL(authorizationUrl);
    } catch (error: any) {
      showToast('error', error?.response?.data?.error || error?.response?.data?.detail || error?.message || `Failed to start ${provider} sign in`);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setBiometricBusy(true);
      const authResult = await biometricService.authenticate(`Log in with ${biometricLabel}`);
      if (!authResult.success) {
        showToast('error', authResult.error || 'Biometric authentication failed');
        return;
      }

      const authKey = await biometricService.getAuthKey();
      if (!authKey) {
        showToast('warning', 'Biometric login is enabled but no secure session is stored. Please log in with your password once');
        return;
      }

      const nextRoute = await loginWithBiometric(authKey);
      if (nextRoute) {
        router.replace(nextRoute as any);
      } else {
        router.replace('/(student)/tabs/home');
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Biometric login failed. Please try again.';
      showToast('error', message);
    } finally {
      setBiometricBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {sessionExpired && (
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>Your session expired. Please sign in again.</Text>
          </View>
        )}
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>CampusHub</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          {/* Welcome Text */}
          <Text style={styles.welcomeText}>Welcome{'\n'}Back</Text>
          <Text style={styles.subtitle}>Log in to continue</Text>

          {/* Form Fields */}
          <View style={styles.form}>
            <Input
              label="Email or Registration Number"
              placeholder="your.email@example.com or CS/2021/001"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              containerStyle={styles.inputContainer}
            />
            {needsTwoFactor && (
              <Input
                label="Two-Factor Code"
                placeholder="Enter 6-digit code"
                value={twoFactorCode}
                onChangeText={setTwoFactorCode}
                keyboardType="number-pad"
                containerStyle={styles.inputContainer}
              />
            )}

            {/* Remember Me & Forgot Password */}
            <View style={styles.helperRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>Keep me signed in for 30 days</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotPassword}>Forgot?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <Button
              title="Log In"
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              size="md"
              style={styles.loginButton}
            />

            <Button
              title="Email me a magic link"
              onPress={handleMagicLink}
              loading={magicBusy}
              fullWidth
              size="md"
              variant="outline"
              icon={<Icon name="mail" size={18} color={colors.primary[500]} />}
              style={styles.magicLinkButton}
            />

            {biometricReady ? (
              <Button
                title={`Use ${biometricLabel}`}
                onPress={handleBiometricLogin}
                loading={biometricBusy}
                fullWidth
                size="md"
                variant="outline"
                icon={<Icon name="finger-print" size={18} color={colors.primary[500]} />}
                style={styles.biometricButton}
              />
            ) : null}
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login */}
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Google')}
            >
              {googleIconLoadError ? (
                <Icon name="logo-google" size={24} color="#DB4437" />
              ) : (
                <Image
                  source={require('../../../assets/google.jpeg')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                  onError={() => setGoogleIconLoadError(true)}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Microsoft')}
            >
              <Image
                source={require('../../../assets/micro.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Institution Registration Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Want to register your institution? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/institution-register')}>
              <Text style={styles.signUpLink}>Register Here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[8],
    paddingBottom: spacing[6],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  noticeBanner: {
    backgroundColor: '#FDE8E8',
    borderColor: '#F8B4B4',
    borderWidth: 1,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
  },
  noticeText: {
    color: '#9B1C1C',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  logoImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
    marginBottom: spacing[1],
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['3xl'],
    padding: spacing[4],
    ...shadows.lg,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 32,
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing[2],
  },
  inputContainer: {
    marginBottom: spacing[3],
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border.medium,
    marginRight: spacing[2],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  checkmark: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  forgotPassword: {
    fontSize: 13,
    color: colors.primary[500],
    fontWeight: '500',
  },
  loginButton: {
    marginTop: spacing[1],
  },
  magicLinkButton: {
    marginTop: spacing[2],
  },
  biometricButton: {
    marginTop: spacing[2],
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginHorizontal: spacing[3],
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[4],
    marginBottom: spacing[3],
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  socialIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing[2],
  },
  footerText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
});

export default LoginScreen;
