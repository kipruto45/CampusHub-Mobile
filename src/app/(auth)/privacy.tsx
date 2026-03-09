// Privacy Policy Screen for CampusHub

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import Icon from '../../components/ui/Icon';

const PrivacyScreen: React.FC = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: March 2026</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          At CampusHub, we take your privacy seriously. This Privacy Policy 
          explains how we collect, use, disclose, and safeguard your 
          information when you use our mobile application and services.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Personal Information:</Text>
          {'\n'}• Name and email address
          {'\n'}• University/Institution affiliation
          {'\n'}• Profile picture (optional)
          {'\n'}• Registration number (for verification)
          {'\n\n'}<Text style={styles.bold}>Automatically Collected Information:</Text>
          {'\n'}• Device information (device ID, operating system)
          {'\n'}• Usage data and analytics
          {'\n'}• Location data (if permitted)
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the information we collect to:
          {'\n\n'}• Provide, maintain, and improve our services
          {'\n'}• Process your registration and account management
          {'\n'}• Send you technical notices, updates, and support messages
          {'\n'}• Respond to your comments, questions, and requests
          {'\n'}• Communicate with you about products, services, and events
          {'\n'}• Monitor and analyze trends, usage, and activities
          {'\n'}• Detect, investigate, and prevent fraudulent transactions
        </Text>

        <Text style={styles.sectionTitle}>4. Sharing Your Information</Text>
        <Text style={styles.paragraph}>
          We may share your information with:
          {'\n\n'}<Text style={styles.bold}>Service Providers:</Text>
          {'\n'}Third-party vendors who perform services for us (e.g., 
          hosting, analytics, customer support)
          {'\n\n'}<Text style={styles.bold}>Legal Requirements:</Text>
          {'\n'}When required by law or in response to valid requests 
          by public authorities
          {'\n\n'}<Text style={styles.bold}>With Your Consent:</Text>
          {'\n'}We may share information with your explicit consent
        </Text>

        <Text style={styles.sectionTitle}>5. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical and organizational security 
          measures to protect your personal information against unauthorized 
          access, alteration, disclosure, or destruction. However, no method 
          of transmission over the Internet or electronic storage is 100% 
          secure, so we cannot guarantee absolute security.
        </Text>

        <Text style={styles.sectionTitle}>6. Data Retention</Text>
        <Text style={styles.paragraph}>
          We will retain your personal information only for as long as 
          necessary to fulfill the purposes outlined in this Privacy Policy. 
          When your account is deleted, we will delete or anonymize your 
          personal information within a reasonable timeframe.
        </Text>

        <Text style={styles.sectionTitle}>7. Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the following rights regarding your personal information:
          {'\n\n'}• <Text style={styles.bold}>Access:</Text> Request a copy of the personal 
          information we hold about you
          {'\n'}• <Text style={styles.bold}>Correction:</Text> Request correction of inaccurate 
          personal information
          {'\n'}• <Text style={styles.bold}>Deletion:</Text> Request deletion of your personal 
          information
          {'\n'}• <Text style={styles.bold}>Opt-out:</Text> Opt-out of certain data collection 
          and sharing
        </Text>

        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our service is not intended for users under the age of 13. We 
          do not knowingly collect personal information from children under 
          13. If you become aware that a child has provided us with personal 
          information without parental consent, please contact us.
        </Text>

        <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          Our application may contain links to third-party websites or 
          services. We are not responsible for the privacy practices of 
          those third parties. We encourage you to review the privacy 
          policies of any third-party services you access.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will 
          notify you of any changes by posting the new Privacy Policy on 
          this page and updating the "Last Updated" date. You are advised 
          to review this Privacy Policy periodically for any changes.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please 
          contact us at privacy@campushub.com
        </Text>
      </ScrollView>
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
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
    backgroundColor: colors.card.light,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[5],
    paddingBottom: spacing[10],
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  paragraph: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
  },
});

export default PrivacyScreen;
