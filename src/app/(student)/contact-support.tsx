// Contact Support Screen for CampusHub

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';

// CampusHub Contact Information
const CAMPUSHUB_EMAIL = 'kiprutovictor39@gmail.com';
const CAMPUSHUB_PHONE = '+254723484552';

interface ContactOption {
  icon: string;
  title: string;
  description: string;
  action: () => void;
}

const ContactSupportScreen: React.FC = () => {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const contactOptions: ContactOption[] = [
    {
      icon: 'mail',
      title: 'Email Support',
      description: CAMPUSHUB_EMAIL,
      action: async () => {
        try {
          const emailUrl = `mailto:${CAMPUSHUB_EMAIL}`;
          const canOpen = await Linking.canOpenURL(emailUrl);
          if (canOpen) {
            await Linking.openURL(emailUrl);
          } else {
            Alert.alert('Error', 'Unable to open email client. Please email us directly at ' + CAMPUSHUB_EMAIL);
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to open email client.');
        }
      },
    },
    {
      icon: 'call',
      title: 'Call Us',
      description: CAMPUSHUB_PHONE,
      action: async () => {
        try {
          const phoneUrl = `tel:${CAMPUSHUB_PHONE}`;
          const canOpen = await Linking.canOpenURL(phoneUrl);
          if (canOpen) {
            await Linking.openURL(phoneUrl);
          } else {
            Alert.alert('Error', 'Unable to make phone calls on this device.');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to initiate phone call.');
        }
      },
    },
    {
      icon: 'chatbubbles',
      title: 'Live Chat',
      description: 'Available 9AM - 6PM',
      action: () => {
        // Open live chat - using a web-based chat widget URL
        const chatUrl = 'https://campushub.com/chat';
        Linking.openURL(chatUrl).catch(() => {
          Alert.alert('Live Chat', 'Starting live chat support...\n\nOur support team is available from 9AM to 6PM.');
        });
      },
    },
  ];

  const handleSubmit = () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your message');
      return;
    }

    setSending(true);
    // Simulate sending
    setTimeout(() => {
      setSending(false);
      Alert.alert(
        'Message Sent',
        'Thank you for contacting us. We will get back to you within 24 hours.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 1500);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.introText}>
            Have a question or need help? Choose a contact method below or send us a message.
          </Text>

          {/* Contact Options */}
          <View style={styles.optionsContainer}>
            {contactOptions.map((option, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.optionItem}
                onPress={option.action}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  <Icon name={option.icon as any} size={24} color={colors.primary[500]} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or send a message</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Contact Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief description of your issue"
              placeholderTextColor={colors.text.tertiary}
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />

            <Text style={styles.formLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={colors.text.tertiary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity 
              style={[styles.submitButton, sending && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <Text style={styles.submitButtonText}>Sending...</Text>
              ) : (
                <>
                  <Icon name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
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
    paddingHorizontal: spacing[4],
    paddingTop: spacing[10],
    paddingBottom: spacing[4],
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
  },
  introText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  optionsContainer: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginHorizontal: spacing[3],
  },
  formContainer: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...shadows.sm,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    fontSize: 15,
    color: colors.text.primary,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  textArea: {
    height: 120,
    paddingTop: spacing[3],
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    marginTop: spacing[2],
  },
  submitButtonDisabled: {
    backgroundColor: colors.primary[300],
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: spacing[8],
  },
});

export default ContactSupportScreen;
