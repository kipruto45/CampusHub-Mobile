// Login Screen for CampusHub
// Premium white card design with social login

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [googleIconLoadError, setGoogleIconLoadError] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    try {
      const nextRoute = await login(email, password, rememberMe);
      router.replace(nextRoute as any);
    } catch (err) {
      // Error is handled in the store
    }
  };

  const handleSocialLogin = async (provider: 'Google' | 'Microsoft') => {
    try {
      const response =
        provider === 'Google'
          ? await authAPI.getGoogleOAuthUrl()
          : await authAPI.getMicrosoftOAuthUrl();

      const payload = response?.data?.data ?? response?.data ?? {};
      const authorizationUrl = payload?.authorization_url;
      if (!authorizationUrl) {
        Alert.alert('Authentication Error', `Unable to start ${provider} sign in.`);
        return;
      }

      const canOpen = await Linking.canOpenURL(authorizationUrl);
      if (!canOpen) {
        Alert.alert('Authentication Error', 'Could not open authentication provider.');
        return;
      }

      await Linking.openURL(authorizationUrl);
    } catch (error: any) {
      Alert.alert(
        'Authentication Error',
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          error?.message ||
          `Failed to start ${provider} sign in.`
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
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

            {/* Remember Me & Forgot Password */}
            <View style={styles.helperRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Remember</Text>
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
