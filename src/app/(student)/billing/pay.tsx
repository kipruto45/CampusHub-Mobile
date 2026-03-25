// One-time Payment Screen

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { paymentsAPI } from '../../../services/api';

type Provider = 'stripe' | 'paypal' | 'mobile_money';

const parseAmount = (value: string): number | null => {
  const cleaned = String(value || '').trim().replace(/,/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
};

const OneTimePaymentScreen: React.FC = () => {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>('stripe');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('CampusHub payment');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

  const amountNumber = useMemo(() => parseAmount(amount), [amount]);

  const providerOptions = useMemo(
    () => [
      { id: 'stripe', label: 'Card', icon: 'card' },
      { id: 'paypal', label: 'PayPal', icon: 'wallet' },
      { id: 'mobile_money', label: 'Mobile Money', icon: 'cash' },
    ],
    []
  );

  const handleStartPayment = useCallback(async () => {
    const parsedAmount = parseAmount(amount);
    if (!parsedAmount) {
      Alert.alert('Amount', 'Enter a valid amount greater than 0.');
      return;
    }

    if (provider === 'mobile_money' && !String(phoneNumber || '').trim()) {
      Alert.alert('Phone number required', 'Add your phone number to receive payment instructions.');
      return;
    }

    try {
      setSubmitting(true);
      setLastPaymentId(null);
      const response = await paymentsAPI.createPayment({
        provider,
        amount: parsedAmount,
        currency: 'USD',
        description: description || 'CampusHub payment',
        payment_type: 'one_time',
        phone_number: provider === 'mobile_money' ? phoneNumber : undefined,
      });
      const payload = response?.data?.data ?? response?.data ?? {};
      const checkoutUrl = String(payload?.checkout_url || '').trim();
      const instructions = payload?.instructions || null;
      const localPaymentId = String(payload?.local_payment_id || '').trim();

      if (localPaymentId) {
        setLastPaymentId(localPaymentId);
      }

      if (checkoutUrl) {
        await WebBrowser.openBrowserAsync(checkoutUrl);
        Alert.alert(
          'Complete payment',
          'Finish payment in your browser, then come back and check status or view your payment history.'
        );
      } else if (instructions) {
        Alert.alert(
          'Payment instructions',
          String(instructions?.message || 'Follow the instructions to complete your payment.')
        );
      } else {
        Alert.alert('Payment started', 'Your payment has been initiated.');
      }
    } catch (err: any) {
      Alert.alert(
        'Payment Failed',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to start payment.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [amount, description, phoneNumber, provider]);

  const handleCheckStatus = useCallback(async () => {
    if (!lastPaymentId) return;
    try {
      const response = await paymentsAPI.getPaymentStatus({ payment_id: lastPaymentId });
      const payload = response?.data?.data ?? response?.data ?? {};
      Alert.alert(
        'Payment Status',
        `Status: ${String(payload?.status || 'unknown')}`
      );
    } catch (err: any) {
      Alert.alert(
        'Status Check Failed',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to verify payment status.'
      );
    }
  }, [lastPaymentId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Make a Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          <View style={styles.providerRow}>
            {providerOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.providerChip,
                  provider === opt.id ? styles.providerChipActive : null,
                ]}
                onPress={() => setProvider(opt.id as Provider)}
              >
                <Icon
                  name={opt.icon as any}
                  size={16}
                  color={provider === opt.id ? colors.primary[600] : colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.providerChipText,
                    provider === opt.id ? styles.providerChipTextActive : null,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Amount (USD)"
            placeholder="e.g. 9.99"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            hint={amountNumber ? `You will pay USD ${amountNumber}` : 'Enter the amount to pay.'}
            containerStyle={{ marginTop: spacing[4] }}
          />

          <Input
            label="Description"
            placeholder="What is this payment for?"
            value={description}
            onChangeText={setDescription}
            autoCapitalize="sentences"
            containerStyle={{ marginBottom: 0 }}
          />

          {provider === 'mobile_money' ? (
            <Input
              label="Phone number"
              placeholder="e.g. +2547XXXXXXXX"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
              hint="Used to generate mobile money payment instructions."
              containerStyle={{ marginTop: spacing[4], marginBottom: 0 }}
            />
          ) : null}

          <View style={{ marginTop: spacing[4] }}>
            <Button
              title={submitting ? 'Starting...' : 'Continue'}
              onPress={handleStartPayment}
              loading={submitting}
              disabled={submitting}
              fullWidth
              icon={<Icon name="arrow-forward" size={18} color={colors.text.inverse} />}
              iconPosition="right"
            />
          </View>

          {lastPaymentId ? (
            <View style={styles.statusCard}>
              <View style={styles.statusTop}>
                <Icon name="information-circle" size={18} color={colors.info} />
                <Text style={styles.statusTitle}>Payment started</Text>
              </View>
              <Text style={styles.statusText}>Payment ID: {lastPaymentId}</Text>
              <View style={styles.statusActions}>
                <Button title="Check status" onPress={handleCheckStatus} variant="outline" style={{ flex: 1 }} />
                <View style={{ width: spacing[3] }} />
                <Button
                  title="History"
                  onPress={() => router.push('/(student)/billing/history' as any)}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[10],
    paddingBottom: spacing[4],
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.text.primary },
  placeholder: { width: 40 },
  scrollContent: { padding: spacing[4], paddingBottom: spacing[10] },

  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    ...shadows.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text.primary, marginBottom: spacing[2] },

  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.gray[100],
  },
  providerChipActive: { backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
  providerChipText: { fontSize: 13, fontWeight: '700', color: colors.text.secondary },
  providerChipTextActive: { color: colors.primary[700] },

  statusCard: {
    marginTop: spacing[4],
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    backgroundColor: colors.info + '0D',
    borderWidth: 1,
    borderColor: colors.info + '33',
  },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  statusTitle: { fontSize: 14, fontWeight: '800', color: colors.text.primary },
  statusText: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary },
  statusActions: { flexDirection: 'row', marginTop: spacing[4] },

  bottomSpacing: { height: spacing[4] },
});

export default OneTimePaymentScreen;

