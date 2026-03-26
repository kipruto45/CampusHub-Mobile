// Help & FAQ Screen for CampusHub

import { useRouter } from 'expo-router';
import React,{ useState } from 'react';
import { ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import Icon from '../../components/ui/Icon';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'How do I join a study group?',
    answer: 'To join a study group, navigate to the Study Groups section from the home screen or more tab. You can browse public groups or use an invite link shared by a group member to join a private group.',
  },
  {
    question: 'How do I upload a resource?',
    answer: 'Go to the Library tab and tap the + button or navigate to Upload Resource. Fill in the required details like title, description, and select the file you want to upload. Your resource will be reviewed before being published.',
  },
  {
    question: 'How do I track my learning progress?',
    answer: 'Visit the My Progress section from your profile or the more tab to view your learning analytics, including resources viewed, time spent, and achievements.',
  },
  {
    question: 'Can I download resources for offline access?',
    answer: 'Yes! Open any resource and tap the download button. Downloaded resources can be accessed from the Storage section even when you are offline.',
  },
  {
    question: 'How do I report inappropriate content?',
    answer: 'If you find content that violates our community guidelines, tap the report button on the resource or contact support. Our moderation team will review the report promptly.',
  },
  {
    question: 'How do I change my notification preferences?',
    answer: 'Go to Settings > Notifications to customize which notifications you want to receive. You can enable or disable push notifications, email notifications, and weekly digests.',
  },
  {
    question: 'How do I verify my student account?',
    answer: 'After registration, check your email for a verification link. If you do not receive it, contact your institution administrator or use the resend verification option.',
  },
  {
    question: 'What should I do if I forget my password?',
    answer: 'On the login screen, tap "Forgot Password" and enter your email address. You will receive a link to reset your password.',
  },
];

const HelpFAQScreen: React.FC = () => {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.introText}>
          Find answers to common questions below. If you need more help, contact our support team.
        </Text>

        {faqData.map((item, index) => (
          <View key={index} style={styles.faqItem}>
            <TouchableOpacity 
              style={styles.questionContainer}
              onPress={() => toggleExpand(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.questionText}>{item.question}</Text>
              <Icon 
                name={expandedIndex === index ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.text.secondary} 
              />
            </TouchableOpacity>
            {expandedIndex === index && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerText}>{item.answer}</Text>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity 
          style={styles.contactButton}
          onPress={() => router.push('/(student)/contact-support' as any)}
        >
          <Icon name="chatbubbles" size={20} color={colors.primary[500]} />
          <Text style={styles.contactButtonText}>Contact Support</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
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
  faqItem: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
    overflow: 'hidden',
    ...shadows.sm,
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: spacing[2],
  },
  answerContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    paddingTop: 0,
  },
  answerText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: spacing[4],
    gap: spacing[2],
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[500],
  },
  bottomSpacing: {
    height: spacing[8],
  },
});

export default HelpFAQScreen;
