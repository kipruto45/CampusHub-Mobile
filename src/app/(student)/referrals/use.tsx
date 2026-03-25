// Use Referral Code
// Allows a user to apply someone else's referral code.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { referralsAPI } from '../../../services/api';

const normalizeCode = (value: string) => value.replace(/\s+/g, '').toUpperCase().trim();

const UseReferralCode: React.FC = () => {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cleaned = useMemo(() => normalizeCode(code), [code]);

  const handleSubmit = useCallback(async () => {
    const value = cleaned;
    if (value.length < 4) {
      Alert.alert('Referral code', 'Enter a valid referral code.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await referralsAPI.useCode(value);
      const payload = res?.data?.data ?? res?.data ?? {};
      const message = String(payload?.message || 'Referral code applied successfully.');
      Alert.alert('Referral applied', message, [
        {
          text: 'OK',
          onPress: () => router.replace('/(student)/referrals' as any),
        },
      ]);
    } catch (err: any) {
      Alert.alert(
        'Could not apply code',
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Unable to apply referral code.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [cleaned, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Use a Code</Text>
          <Text style={styles.headerSubtitle}>Apply an invite code to your account</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconWrap}>
              <Icon name="qr-code" size={20} color={colors.primary[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Enter referral code</Text>
              <Text style={styles.cardSub}>
                You can only use a referral code once. Make sure it’s correct before submitting.
              </Text>
            </View>
          </View>

          <Input
            label="Referral Code"
            placeholder="ABCD1234"
            value={code}
            autoCapitalize="characters"
            onChangeText={setCode}
            hint="Tip: paste the code from a friend."
          />

          <Button
            title={submitting ? 'Applying...' : 'Apply code'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
          />
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>What happens next?</Text>
          <Text style={styles.noteText}>
            Your inviter earns rewards after you subscribe. You’ll still get full access to CampusHub either way.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingTop: spacing[6],
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[4],
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.text.secondary,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[6],
    ...shadows.md,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[5],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text.primary,
  },
  cardSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  noteCard: {
    marginTop: spacing[5],
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[6],
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text.primary,
  },
  noteText: {
    marginTop: spacing[2],
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
  },
});

export default UseReferralCode;

