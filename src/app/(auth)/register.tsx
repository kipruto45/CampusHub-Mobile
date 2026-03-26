// Register Screen for CampusHub
// Simplified registration with just email and full name

import { useRouter } from 'expo-router';
import React,{ useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
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
import { canUseNativeProvider,signInWithNativeProvider } from '../../services/nativeSocialAuth';
import { exchangeNativeTokens } from '../../services/socialAuth';
import { useAuthStore } from '../../store/auth.store';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

const RegisterScreen: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { register, isLoading } = useAuthStore();
  
  // Personal info state - simplified
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      showToast('error', 'Passwords do not match');
      return;
    }

    if (!agreeTerms) {
      showToast('error', 'Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('error', 'Please enter a valid email address');
      return;
    }

    // Parse full name into first and last name
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const registration = await register({
        email: normalizedEmail,
        password,
        password_confirm: confirmPassword,
        first_name: firstName,
        last_name: lastName,
      });

      showToast(
        'success',
        registration.message || 'Registration successful! Please verify your email to continue.'
      );
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: normalizedEmail },
      });
    } catch (error: any) {
      console.log('Registration error:', error);
      const message = error?.response?.data?.message || 
                     error?.response?.data?.error?.message ||
                     error?.response?.data?.error?.details ||
                     'Registration failed. Please try again.';
      showToast('error', typeof message === 'object' ? JSON.stringify(message) : message);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      showToast('warning', 'Enter your email to get a magic link');
      return;
    }

    // Reuse basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast('error', 'Please enter a valid email address');
      return;
    }

    try {
      setMagicBusy(true);
      const normalizedEmail = email.trim().toLowerCase();
      await authAPI.requestMagicLink(normalizedEmail);
      showToast('success', 'Check your email for a one-tap sign-in link.');
      router.push({
        pathname: '/(auth)/magic-link',
        params: { email: normalizedEmail, requested: '1' },
      });
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Unable to send magic link.';
      showToast('error', message);
    } finally {
      setMagicBusy(false);
    }
  };

  const handleSocialSignup = async (provider: 'Google' | 'Microsoft') => {
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
          showToast('error', nativeResult.error || `Failed to sign up with ${provider}`);
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
        showToast('error', `${provider} sign up is not available at the moment`);
        return;
      }

      await Linking.openURL(authorizationUrl);
    } catch (error: any) {
      showToast('error', error?.response?.data?.error || error?.response?.data?.detail || error?.message || `Failed to start ${provider} sign up`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>CampusHub</Text>
        </View>

        {/* Register Card */}
        <View style={styles.card}>
          {/* Heading */}
          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subtitle}>Join the learning community</Text>

          {/* Form Fields - Simplified */}
          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Email Address"
              placeholder="your.email@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              containerStyle={styles.inputContainer}
            />

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                {agreeTerms && <Icon name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text 
                  style={styles.termsLink}
                  onPress={() => router.push('/(auth)/terms')}
                >
                  Terms
                </Text>
                {' & '}
                <Text 
                  style={styles.termsLink}
                  onPress={() => router.push('/(auth)/privacy')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Register Button */}
            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
              size="md"
              style={styles.registerButton}
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
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Signup */}
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialSignup('Google')}
            >
              <Image
                source={require('../../../assets/google.jpeg')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialSignup('Microsoft')}
            >
              <Image
                source={require('../../../assets/micro.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
              <Text style={styles.socialButtonText}>Microsoft</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Institution Registration Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Want to register your institution? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/institution-register')}>
            <Text style={styles.loginLink}>Register Here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: spacing.sm,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary[600],
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectButtonText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  placeholderText: {
    color: colors.text.tertiary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border.medium,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  checkmark: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary[500],
    fontWeight: '500',
  },
  registerButton: {
    marginTop: spacing.sm,
  },
  magicLinkButton: {
    marginTop: spacing.xs,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginHorizontal: spacing.md,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  loginText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
});

export default RegisterScreen;
