// Reset Password Screen for CampusHub

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { authAPI } from '../../services/api';

type ResetPasswordScreenProps = {
  tokenOverride?: string | string[] | null;
};

const resolveToken = (value?: string | string[] | null) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value || undefined;
};

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ tokenOverride }) => {
  const router = useRouter();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = resolveToken(tokenOverride ?? tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (!token) {
      Alert.alert('Error', 'Invalid reset token');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        uid: '',
        token,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reset password. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon name="lock-closed" size={40} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your new password below</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter new password" 
                value={newPassword} 
                onChangeText={setNewPassword} 
                secureTextEntry 
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Confirm new password" 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
                secureTextEntry 
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} disabled={loading}>
              <Text style={styles.resetBtnText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  scrollContent: { flexGrow: 1, padding: spacing[6] },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card.light, justifyContent: 'center', alignItems: 'center', marginTop: spacing[10], ...shadows.sm },
  backIcon: { fontSize: 24 },
  content: { flex: 1, justifyContent: 'center' },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing[6] },
  icon: { fontSize: 40 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.primary, textAlign: 'center', marginBottom: spacing[2] },
  subtitle: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing[8] },
  form: { backgroundColor: colors.card.light, borderRadius: 24, padding: spacing[6], ...shadows.md },
  field: { marginBottom: spacing[4] },
  label: { fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: spacing[2] },
  input: { backgroundColor: colors.background.secondary, borderRadius: 12, padding: spacing[4], fontSize: 15, color: colors.text.primary },
  resetBtn: { backgroundColor: colors.primary[500], borderRadius: 16, padding: spacing[4], alignItems: 'center', marginTop: spacing[4] },
  resetBtnText: { fontSize: 16, fontWeight: '600', color: colors.text.inverse },
});

export default ResetPasswordScreen;
