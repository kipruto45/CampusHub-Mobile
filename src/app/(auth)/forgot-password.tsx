// Forgot Password Screen for CampusHub

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useToast } from '../../components/ui/Toast';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { authAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';

const ForgotPasswordScreen: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      showToast('error', 'Please enter your email address');
      return;
    }
    
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      showToast('success', 'Password reset link sent to your email!');
      router.back();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset link. Please try again.';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Icon name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
        <Icon name="key" size={40} color={colors.primary[500]} />
        </View>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>Enter your email address and we'll send you a link to reset your password.</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput style={styles.input} placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.submitBtnText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary, padding: spacing[6] },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card.light, justifyContent: 'center', alignItems: 'center', marginTop: spacing[10], ...shadows.sm },
  backIcon: { fontSize: 24 },
  content: { flex: 1, justifyContent: 'center' },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing[6] },
  icon: { fontSize: 40 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.primary, textAlign: 'center', marginBottom: spacing[2] },
  subtitle: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing[8] },
  form: { backgroundColor: colors.card.light, borderRadius: 24, padding: spacing[6], ...shadows.md },
  field: { marginBottom: spacing[4] },
  label: { fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: spacing[2] },
  input: { backgroundColor: colors.background.secondary, borderRadius: 12, padding: spacing[4], fontSize: 15, color: colors.text.primary },
  submitBtn: { backgroundColor: colors.primary[500], borderRadius: 16, padding: spacing[4], alignItems: 'center', marginTop: spacing[4] },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: colors.text.inverse },
});

export default ForgotPasswordScreen;
