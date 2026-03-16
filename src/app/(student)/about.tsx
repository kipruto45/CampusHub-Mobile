// About Screen for CampusHub (Student)

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Icon from '../../components/ui/Icon';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

const AboutScreen: React.FC = () => {
  const router = useRouter();

  const handleRateApp = useCallback(async () => {
    const APP_STORE_URLS = {
      ios: 'itms-apps://itunes.apple.com/app/campushub/id123456789',
      android: 'market://details?id=com.campushub.app',
      web: 'https://play.google.com/store/apps/details?id=com.campushub.app',
    };

    try {
      const url =
        Platform.OS === 'ios'
          ? APP_STORE_URLS.ios
          : Platform.OS === 'android'
            ? APP_STORE_URLS.android
            : APP_STORE_URLS.web;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(APP_STORE_URLS.web);
      }
    } catch {
      Alert.alert('Error', 'Unable to open the app store right now.');
    }
  }, []);

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to open', 'This link is not supported on your device.');
      }
    } catch {
      Alert.alert('Error', 'Unable to open the link right now.');
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About CampusHub</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Icon name="school" size={28} color={colors.primary[500]} />
          </View>
          <Text style={styles.heroTitle}>CampusHub</Text>
          <Text style={styles.heroSubtitle}>
            The student learning hub for resources, collaboration, and growth.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What you can do</Text>
          <Text style={styles.sectionText}>• Discover trusted learning resources</Text>
          <Text style={styles.sectionText}>• Upload and share course materials</Text>
          <Text style={styles.sectionText}>• Track your learning progress</Text>
          <Text style={styles.sectionText}>• Collaborate in study groups</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/(student)/contact-support')}
          >
            <Icon name="chatbubbles" size={18} color={colors.primary[500]} />
            <Text style={styles.linkText}>Contact Support</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/(student)/help')}
          >
            <Icon name="help-circle" size={18} color={colors.primary[500]} />
            <Text style={styles.linkText}>Help & FAQ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/(student)/privacy')}
          >
            <Icon name="shield-checkmark" size={18} color={colors.primary[500]} />
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => handleOpenLink('https://campushub.local/terms')}
          >
            <Icon name="document-text" size={18} color={colors.primary[500]} />
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rate the App</Text>
          <Text style={styles.sectionText}>
            Love CampusHub? Your rating helps us improve.
          </Text>
          <TouchableOpacity style={styles.rateButton} onPress={handleRateApp}>
            <Icon name="star" size={18} color={colors.text.inverse} />
            <Text style={styles.rateButtonText}>Rate CampusHub</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>2026.03</Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[10],
    paddingBottom: spacing[4],
  },
  backButton: { padding: spacing[2] },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  placeholder: { width: 32 },
  content: { flex: 1 },
  contentContainerStyle: { padding: spacing[4], paddingBottom: spacing[8] },
  heroCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    alignItems: 'center',
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  heroTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  heroSubtitle: {
    marginTop: spacing[2],
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  sectionText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing[2],
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  linkText: { fontSize: 13, color: colors.text.primary },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
  },
  rateButtonText: { fontSize: 14, fontWeight: '600', color: colors.text.inverse },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  infoLabel: { fontSize: 13, color: colors.text.secondary },
  infoValue: { fontSize: 13, color: colors.text.primary, fontWeight: '600' },
  bottomSpacing: { height: spacing[4] },
});

export default AboutScreen;
