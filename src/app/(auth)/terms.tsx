// Terms of Service Screen for CampusHub

import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import Icon from '../../components/ui/Icon';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';

const TermsScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: March 2026</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing and using CampusHub, you accept and agree to be bound 
          by the terms and provision of this agreement. Additionally, when 
          using CampusHub's services, you shall be subject to any posted 
          guidelines or rules applicable to such services.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          CampusHub provides users with access to a rich collection of 
          educational resources, including notes, past papers, tutorials, 
          and other learning materials. You also understand and agree that 
          the service may include advertisements and that these 
          advertisements are necessary for CampusHub to provide the service.
        </Text>

        <Text style={styles.sectionTitle}>3. Registration Obligations</Text>
        <Text style={styles.paragraph}>
          In consideration of your use of the Service, you agree to: 
          (a) provide true, accurate, current, and complete information 
          about yourself as prompted by the Service's registration form 
          and (b) maintain and promptly update the registration data 
          to keep it true, accurate, current, and complete.
        </Text>

        <Text style={styles.sectionTitle}>4. User Conduct</Text>
        <Text style={styles.paragraph}>
          You agree not to use the Service to:
          {'\n\n'}• Upload, post, email, transmit, or otherwise make 
          available any content that is unlawful, harmful, threatening, 
          abusive, harassing, tortious, defamatory, vulgar, obscene, 
          libelous, invasive of another's privacy, hateful, or racially, 
          ethnically, or otherwise objectionable
          {'\n\n'}• Harm minors in any way
          {'\n\n'}• Forge headers or otherwise manipulate identifiers 
          in order to disguise the origin of any content transmitted 
          through the Service
          {'\n\n'}• Upload, post, email, transmit, or otherwise make 
          available any content that you do not have a right to make 
          available under any law or under contractual or fiduciary 
          relationships
        </Text>

        <Text style={styles.sectionTitle}>5. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          All content included on CampusHub, such as text, graphics, 
          logos, button icons, images, audio clips, digital downloads, 
          data compilations, and software, is the property of CampusHub 
          or its content suppliers and is protected by international 
          copyright laws.
        </Text>

        <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          You expressly understand and agree that CampusHub shall not be 
          liable for any direct, indirect, incidental, special, 
          consequential, or exemplary damages, including but not limited 
          to damages for loss of profits, goodwill, use, data, or other 
          intangible losses resulting from: (i) the use or the inability 
          to use the service; (ii) unauthorized access to or alteration 
          of your transmissions or data.
        </Text>

        <Text style={styles.sectionTitle}>7. Governing Law</Text>
        <Text style={styles.paragraph}>
          This Agreement shall be governed by the laws of Kenya. You 
          hereby consent to the exclusive jurisdiction and venue of courts 
          in Kenya in all disputes arising out of or relating to the use 
          of CampusHub.
        </Text>

        <Text style={styles.sectionTitle}>8. Contact Information</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms of Service, please 
          contact us at support@campushub.com
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
});

export default TermsScreen;
