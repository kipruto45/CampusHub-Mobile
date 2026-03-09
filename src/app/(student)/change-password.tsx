// Change Password Screen for CampusHub
// Backend-driven with real API integration

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { userAPI } from '../../services/api';

const ChangePasswordScreen: React.FC = () => {
  const router = useRouter();
  
  // Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Loading state
  const [saving, setSaving] = useState(false);

  const validatePassword = (): boolean => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      return false;
    }
    
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return false;
    }
    
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      Alert.alert('Error', 'Password must contain uppercase, lowercase, and number');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return false;
    }
    
    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validatePassword()) return;
    
    setSaving(true);
    
    try {
      await userAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      
      Alert.alert(
        'Success', 
        'Your password has been changed successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Failed to change password:', error);
      const errorMessage = error.response?.data?.old_password?.[0] || 
                          error.response?.data?.new_password?.[0] ||
                          error.response?.data?.non_field_errors?.[0] ||
                          error.response?.data?.detail || 
                          'Failed to change password. Please check your current password.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (currentPassword || newPassword || confirmPassword) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const getPasswordStrength = (): { level: string; color: string; percentage: number } => {
    if (!newPassword) return { level: '', color: colors.text.tertiary, percentage: 0 };
    
    let strength = 0;
    if (newPassword.length >= 8) strength += 25;
    if (newPassword.length >= 12) strength += 25;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) strength += 25;
    if (/\d/.test(newPassword)) strength += 12.5;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) strength += 12.5;
    
    if (strength <= 25) return { level: 'Weak', color: colors.error, percentage: strength };
    if (strength <= 50) return { level: 'Fair', color: colors.warning, percentage: strength };
    if (strength <= 75) return { level: 'Good', color: colors.primary[500], percentage: strength };
    return { level: 'Strong', color: colors.success, percentage: strength };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleCancel}>
          <Icon name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Lock Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.lockIcon}>
              <Icon name="lock-closed" size={32} color={colors.primary[500]} />
            </View>
          </View>

          {/* Instructions */}
          <Text style={styles.instructions}>
            Create a strong password with at least 8 characters including uppercase, lowercase, and numbers.
          </Text>

          {/* Password Form */}
          <View style={styles.form}>
            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.toggleButton}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Icon 
                    name={showCurrentPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={colors.text.secondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.toggleButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Icon 
                    name={showNewPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={colors.text.secondary} 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    <View 
                      style={[
                        styles.strengthFill, 
                        { 
                          width: `${passwordStrength.percentage}%`,
                          backgroundColor: passwordStrength.color 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.level}
                  </Text>
                </View>
              )}
              
              {/* Password Requirements */}
              <View style={styles.requirements}>
                <View style={styles.requirement}>
                  <Icon 
                    name={newPassword.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={14} 
                    color={newPassword.length >= 8 ? colors.success : colors.text.tertiary} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: newPassword.length >= 8 ? colors.success : colors.text.tertiary }
                  ]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <Icon 
                    name={/[A-Z]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={14} 
                    color={/[A-Z]/.test(newPassword) ? colors.success : colors.text.tertiary} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: /[A-Z]/.test(newPassword) ? colors.success : colors.text.tertiary }
                  ]}>
                    One uppercase letter
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <Icon 
                    name={/[a-z]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={14} 
                    color={/[a-z]/.test(newPassword) ? colors.success : colors.text.tertiary} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: /[a-z]/.test(newPassword) ? colors.success : colors.text.tertiary }
                  ]}>
                    One lowercase letter
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <Icon 
                    name={/\d/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={14} 
                    color={/\d/.test(newPassword) ? colors.success : colors.text.tertiary} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: /\d/.test(newPassword) ? colors.success : colors.text.tertiary }
                  ]}>
                    One number
                  </Text>
                </View>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.toggleButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Icon 
                    name={showConfirmPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={colors.text.secondary} 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Match indicator */}
              {confirmPassword.length > 0 && (
                <View style={styles.matchIndicator}>
                  <Icon 
                    name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'} 
                    size={14} 
                    color={newPassword === confirmPassword ? colors.success : colors.error} 
                  />
                  <Text style={[
                    styles.matchText,
                    { color: newPassword === confirmPassword ? colors.success : colors.error }
                  ]}>
                    {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <View style={styles.tipHeader}>
              <Icon name="bulb" size={18} color={colors.warning} />
              <Text style={styles.tipTitle}>Password Tips</Text>
            </View>
            <Text style={styles.tipText}>
              • Use a mix of letters, numbers, and symbols{'\n'}
              • Avoid using personal information{'\n'}
              • Don't reuse passwords from other accounts{'\n'}
              • Consider using a password manager
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[10],
    paddingBottom: spacing[4],
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  saveButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[6],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  lockIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructions: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 20,
  },
  form: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  inputGroup: {
    marginBottom: spacing[4],
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
  },
  input: {
    flex: 1,
    padding: spacing[4],
    fontSize: 15,
    color: colors.text.primary,
  },
  toggleButton: {
    padding: spacing[3],
    marginRight: spacing[1],
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: spacing[2],
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  requirements: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  requirementText: {
    fontSize: 12,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: spacing[1],
  },
  matchText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tipsCard: {
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginTop: spacing[6],
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tipText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

export default ChangePasswordScreen;
