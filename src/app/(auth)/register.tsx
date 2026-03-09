// Register Screen for CampusHub
// Simplified registration with just email and full name

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { useAuthStore } from '../../store/auth.store';
import { authAPI } from '../../services/api';

const RegisterScreen: React.FC = () => {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  
  // Personal info state - simplified
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!agreeTerms) {
      Alert.alert('Error', 'Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Parse full name into first and last name
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      await register({
        email,
        password,
        password_confirm: confirmPassword,
        first_name: firstName,
        last_name: lastName,
      });
      
      Alert.alert(
        'Registration Successful',
        'Please check your email to verify your account before logging in.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      const message = error?.response?.data?.message || 
                     error?.response?.data?.error?.message || 
                     'Registration failed. Please try again.';
      Alert.alert('Registration Failed', message);
    }
  };

  const handleSocialSignup = async (provider: 'Google' | 'Microsoft') => {
    try {
      const response =
        provider === 'Google'
          ? await authAPI.getGoogleOAuthUrl()
          : await authAPI.getMicrosoftOAuthUrl();

      const payload = response?.data?.data ?? response?.data ?? {};
      const authorizationUrl = payload?.authorization_url;

      if (!authorizationUrl) {
        Alert.alert('Error', `${provider} sign up is not available at the moment.`);
        return;
      }

      await Linking.openURL(authorizationUrl);
    } catch (error: any) {
      Alert.alert(
        'Authentication Error',
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          error?.message ||
          `Failed to start ${provider} sign up.`
      );
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
                {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
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
