// Onboarding / Landing Screen for CampusHub
// Modern sleek design with background image

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ImageBackground, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';

const { width, height } = Dimensions.get('window');

const OnboardingScreen: React.FC = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <ImageBackground
        source={require('../../../assets/ground.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Overlay for readability */}
        <View style={styles.overlay}>
          {/* Content */}
          <View style={styles.content}>
            {/* Icon and Title */}
            <View style={styles.logoSection}>
              <View style={styles.iconContainer}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.logoText}>CampusHub</Text>
            </View>

            {/* Headlines */}
            <View style={styles.textSection}>
              <Text style={styles.headline}>
                Access All Your
              </Text>
              <Text style={styles.headline}>
                Learning Resources
              </Text>
              <Text style={styles.headline}>
                in One Place
              </Text>
              <Text style={styles.subheadline}>
                Access notes, past papers, tutorials, and more.
                All your study materials in one convenient app.
              </Text>
            </View>

            {/* Bottom Action Bar */}
            <View style={styles.bottomActionBar}>
              {/* CTA Button */}
              <TouchableOpacity
                style={styles.ctaButton}
                activeOpacity={0.9}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.ctaText}>Get Started</Text>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.authLinks}>
                <Text style={styles.authText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.authLink}>Log In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[16],
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.inverse,
    letterSpacing: 1,
  },
  textSection: {
    alignItems: 'center',
    paddingHorizontal: spacing[2],
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.inverse,
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  bottomActionBar: {
    paddingBottom: spacing[10],
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    backgroundColor: colors.text.inverse,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary[600],
  },
  authLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[6],
  },
  authText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  authLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});

export default OnboardingScreen;
