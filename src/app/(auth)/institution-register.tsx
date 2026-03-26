// Institution Registration Screen for CampusHub Mobile App

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
} from 'react-native';
import { useToast } from '../../components/ui/Toast';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import api from '../../services/api';

const InstitutionRegisterScreen: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Institution info state
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [slug, setSlug] = useState('');
  const [institutionType, setInstitutionType] = useState('');
  const [description, setDescription] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');

  // Admin contact state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const institutionTypes = [
    { value: 'university', label: 'University' },
    { value: 'college', label: 'College' },
    { value: 'high_school', label: 'High School' },
    { value: 'bootcamp', label: 'Bootcamp' },
    { value: 'online', label: 'Online Learning Platform' },
    { value: 'other', label: 'Other' },
  ];

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug) {
      setSlug(generateSlug(value));
    }
  };

  const handleRegister = async () => {
    // Validation
    if (!name || !slug || !institutionType || !emailDomain || !contactName || !contactEmail || !password) {
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

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      showToast('error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/institutions/register/', {
        name,
        short_name: shortName,
        slug,
        institution_type: institutionType,
        description,
        email_domain: emailDomain,
        website: website || undefined,
        address: address || undefined,
        contact_name: contactName,
        contact_email: contactEmail,
        password,
        confirm_password: confirmPassword,
      });

      if (response.status === 201) {
        showToast('success', 'Registration submitted! Pending approval.');
        router.push('/(auth)/login');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Registration failed. Please try again.';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Register Your Institution</Text>
          <Text style={styles.subtitle}>Join CampusHub - the university learning platform</Text>
        </View>

        <View style={styles.form}>
          {/* Institution Information Section */}
          <Text style={styles.sectionTitle}>Institution Information</Text>

          <Input
            label="Institution Name *"
            value={name}
            onChangeText={handleNameChange}
            placeholder="e.g., Massachusetts Institute of Technology"
            autoCapitalize="words"
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Short Name"
                value={shortName}
                onChangeText={setShortName}
                placeholder="e.g., MIT"
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="URL Slug *"
                value={slug}
                onChangeText={(text) => setSlug(generateSlug(text))}
                placeholder="e.g., mit-university"
              />
            </View>
          </View>

          <Input
            label="Institution Type *"
            value={institutionType ? institutionTypes.find(t => t.value === institutionType)?.label || '' : ''}
            placeholder="Select type..."
            editable={false}
            onPress={() => {
              Alert.alert(
                'Select Institution Type',
                '',
                [
                  ...institutionTypes.map((type) => ({
                    text: type.label,
                    onPress: () => setInstitutionType(type.value),
                  })),
                  { text: 'Cancel', onPress: () => {} },
                ]
              );
            }}
          />

          <Input
            label="Email Domain *"
            value={emailDomain}
            onChangeText={setEmailDomain}
            placeholder="@university.edu"
            
            keyboardType="email-address"
          />

          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description of your institution"
            multiline
            numberOfLines={3}
          />

          <Input
            label="Website"
            value={website}
            onChangeText={setWebsite}
            placeholder="https://university.edu"
            keyboardType="url"
          />

          <Input
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Full address"
            multiline
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Admin Contact Section */}
          <Text style={styles.sectionTitle}>Admin Contact</Text>

          <Input
            label="Full Name *"
            value={contactName}
            onChangeText={setContactName}
            placeholder="Your full name"
            autoCapitalize="words"
          />

          <Input
            label="Email *"
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            
          />

          <Input
            label="Password *"
            value={password}
            onChangeText={setPassword}
            placeholder="Min 8 characters"
            secureTextEntry
          />

          <Input
            label="Confirm Password *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter password"
            secureTextEntry
          />

          {/* Terms Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setAgreeTerms(!agreeTerms)}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
              {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the{' '}
              <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Register Button */}
          <Button
            title={isLoading ? 'Registering...' : 'Register Institution'}
            onPress={handleRegister}
            disabled={isLoading}
            loading={isLoading}
            style={styles.registerButton}
          />

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Login here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    ...shadows.small,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.lg,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border.light,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  checkmark: {
    color: colors.text.inverse,
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  link: {
    color: colors.primary[500],
    fontWeight: '500',
  },
  registerButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  loginText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  loginLink: {
    color: colors.primary[500],
    fontSize: 14,
    fontWeight: '600',
  },
});

export default InstitutionRegisterScreen;