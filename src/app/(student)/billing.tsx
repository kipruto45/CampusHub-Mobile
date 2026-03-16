// Storage Upgrade / Billing Screen

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { billingAPI } from '../../services/api';

type PlanId = 'starter' | 'pro' | 'plus';
type PaymentMethod = 'card' | 'mpesa' | 'bank';

const BillingScreen: React.FC = () => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [submitting, setSubmitting] = useState(false);

  const handleRequestUpgrade = useCallback(async () => {
    try {
      setSubmitting(true);
      await billingAPI.requestStorageUpgrade({
        plan: selectedPlan,
        billing_cycle: 'monthly',
        payment_method: paymentMethod,
      });
      Alert.alert(
        'Request Submitted',
        'Your storage upgrade request has been received. We will notify you after payment verification.'
      );
      router.back();
    } catch (error: any) {
      Alert.alert(
        'Request Failed',
        error?.response?.data?.message || error?.message || 'Unable to submit your request.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [paymentMethod, router, selectedPlan]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade Storage</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Choose a Plan</Text>
          {[
            { id: 'starter', title: 'Starter', subtitle: '10 GB', price: '$0.99/mo' },
            { id: 'pro', title: 'Pro', subtitle: '50 GB', price: '$2.99/mo' },
            { id: 'plus', title: 'Plus', subtitle: '200 GB', price: '$6.99/mo' },
          ].map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardActive,
              ]}
              onPress={() => setSelectedPlan(plan.id as PlanId)}
            >
              <View>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
              </View>
              <Text style={styles.planPrice}>{plan.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Billing Features</Text>
          <Text style={styles.sectionText}>• Instant storage upgrade after approval</Text>
          <Text style={styles.sectionText}>• Cancel or downgrade anytime</Text>
          <Text style={styles.sectionText}>• Secure payments with audit trails</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {[
            { id: 'mpesa', label: 'M-Pesa', icon: 'cash' },
            { id: 'card', label: 'Card', icon: 'card' },
            { id: 'bank', label: 'Bank Transfer', icon: 'wallet' },
          ].map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodRow,
                paymentMethod === method.id && styles.methodRowActive,
              ]}
              onPress={() => setPaymentMethod(method.id as PaymentMethod)}
            >
              <Icon name={method.icon as any} size={18} color={colors.primary[500]} />
              <Text style={styles.methodLabel}>{method.label}</Text>
              {paymentMethod === method.id ? (
                <Icon name="checkmark-circle" size={18} color={colors.success} />
              ) : (
                <View style={styles.methodPlaceholder} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleRequestUpgrade}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Request Upgrade'}
          </Text>
        </TouchableOpacity>

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
  },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  planCardActive: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
  },
  planTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  planSubtitle: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  planPrice: { fontSize: 13, fontWeight: '600', color: colors.primary[500] },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  methodRowActive: { backgroundColor: colors.primary[50], borderRadius: borderRadius.lg, paddingHorizontal: spacing[3] },
  methodLabel: { flex: 1, fontSize: 13, color: colors.text.primary },
  methodPlaceholder: { width: 18 },
  submitButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: { fontSize: 15, fontWeight: '600', color: colors.text.inverse },
  bottomSpacing: { height: spacing[4] },
});

export default BillingScreen;
