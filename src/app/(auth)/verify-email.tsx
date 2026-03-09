// Verify Email Screen for CampusHub

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { resolveHomeRouteByRole } from '../../lib/auth-routing';

const VerifyEmailScreen: React.FC = () => {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (token) {
      handleVerify();
    }
  }, [token]);

  const handleVerify = async () => {
    if (!token) {
      return;
    }
    
    setLoading(true);
    try {
      await authAPI.verifyEmail(token);
      setVerified(true);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to verify email. The link may be invalid or expired.';
      Alert.alert('Verification Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    setLoading(true);
    try {
      await authAPI.resendVerificationEmail(email);
      Alert.alert('Success', 'Verification email sent! Please check your inbox.');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resend verification email.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (verified && isAuthenticated) {
      router.replace(resolveHomeRouteByRole(user?.role) as any);
      return;
    }
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{verified ? '✅' : '📧'}</Text>
        </View>
        
        {verified ? (
          <>
            <Text style={styles.title}>Email Verified!</Text>
            <Text style={styles.subtitle}>Your email has been verified successfully.</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>We've sent a verification link to your email. Please check your inbox and click the link to verify.</Text>
          </>
        )}

        {!verified && (
          <View style={styles.card}>
            <Text style={styles.label}>Enter your email to resend verification:</Text>
            <TextInput 
              style={styles.input} 
              placeholder="your.email@example.com" 
              value={email} 
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        )}

        {!verified && (
          <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={loading}>
            <Text style={styles.resendText}>{loading ? 'Sending...' : 'Resend Verification Email'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueText}>{verified ? 'Continue to App' : 'Go to Login'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary, justifyContent: 'center', padding: spacing[6] },
  content: { alignItems: 'center' },
  iconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', marginBottom: spacing[6] },
  icon: { fontSize: 48 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.primary, textAlign: 'center', marginBottom: spacing[2] },
  subtitle: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing[6] },
  card: { backgroundColor: colors.card.light, borderRadius: 16, padding: spacing[4], marginBottom: spacing[6], width: '100%', ...shadows.sm },
  label: { fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: spacing[2] },
  input: { backgroundColor: colors.background.secondary, borderRadius: 12, padding: spacing[3], fontSize: 15, color: colors.text.primary, marginBottom: spacing[3] },
  emailText: { fontSize: 16, fontWeight: '500', color: colors.text.primary, textAlign: 'center' },
  resendBtn: { marginBottom: spacing[4], width: '100%' },
  resendText: { fontSize: 14, fontWeight: '600', color: colors.primary[500], textAlign: 'center' },
  continueBtn: { backgroundColor: colors.primary[500], borderRadius: 16, padding: spacing[4], width: '100%', alignItems: 'center' },
  continueText: { fontSize: 16, fontWeight: '600', color: colors.text.inverse },
});

export default VerifyEmailScreen;
