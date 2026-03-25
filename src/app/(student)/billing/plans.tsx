// Billing Plans Screen

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import Button from '../../../components/ui/Button';
import { paymentsAPI } from '../../../services/api';

type BillingPeriod = 'monthly' | 'yearly';

type Plan = {
  id: string;
  name: string;
  tier: string;
  description: string;
  price_monthly: string;
  price_yearly: string;
  billing_period: string;
  storage_limit_gb: number;
  max_upload_size_mb: number;
  download_limit_monthly: number;
  can_download_unlimited: boolean;
  has_ads: boolean;
  has_priority_support: boolean;
  has_analytics: boolean;
  has_early_access: boolean;
  is_featured: boolean;
  stripe_monthly_price_id: string;
  stripe_yearly_price_id: string;
};

const formatMoney = (value: any, currency = 'USD') => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) return `${currency} ${raw}`;
  return `${currency} ${parsed.toFixed(parsed % 1 === 0 ? 0 : 2)}`;
};

const PlansScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [currentPlan, setCurrentPlan] = useState<any | null>(null);
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        paymentsAPI.getPlans(),
        paymentsAPI.getSubscription(),
      ]);

      const plansPayload = plansRes?.data?.data ?? plansRes?.data ?? {};
      const results = Array.isArray(plansPayload?.plans) ? plansPayload.plans : [];
      setPlans(results);

      const subPayload = subRes?.data?.data ?? subRes?.data ?? {};
      setSubscription(subPayload?.subscription ?? null);
      setCurrentPlan(subPayload?.plan ?? null);
    } catch (err: any) {
      Alert.alert(
        'Plans',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load plans.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const currentPlanId = useMemo(() => String(currentPlan?.id || ''), [currentPlan]);

  const getPriceLabel = (plan: Plan) => {
    const currency = 'USD';
    const price = billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly;
    const suffix = billingPeriod === 'monthly' ? '/mo' : '/yr';
    const formatted = formatMoney(price, currency);
    return formatted ? `${formatted}${suffix}` : '';
  };

  const canPurchase = (plan: Plan) =>
    billingPeriod === 'monthly'
      ? Boolean(plan.stripe_monthly_price_id)
      : Boolean(plan.stripe_yearly_price_id);

  const handleSubscribe = async (plan: Plan) => {
    if (!plan?.id) return;

    if (!canPurchase(plan)) {
      Alert.alert('Not Available', 'This plan is not available for purchase right now.');
      return;
    }

    try {
      setStartingPlanId(plan.id);
      const response = await paymentsAPI.createSubscription({
        plan_id: plan.id,
        billing_period: billingPeriod,
      });
      const payload = response?.data?.data ?? response?.data ?? {};
      const checkoutUrl = String(payload?.checkout_url || '').trim();

      if (!checkoutUrl) {
        Alert.alert('Checkout', 'Checkout link was not returned. Please try again.');
        return;
      }

      await WebBrowser.openBrowserAsync(checkoutUrl);
      Alert.alert(
        'Complete Checkout',
        'Finish the payment in your browser, then come back and pull to refresh your billing status.'
      );
    } catch (err: any) {
      Alert.alert(
        'Subscribe Failed',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to start checkout.'
      );
    } finally {
      setStartingPlanId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading plans...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plans</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPlans();
            }}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.periodCard}>
          <Text style={styles.periodTitle}>Billing period</Text>
          <View style={styles.periodToggle}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                billingPeriod === 'monthly' && styles.periodButtonActive,
              ]}
              onPress={() => setBillingPeriod('monthly')}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  billingPeriod === 'monthly' && styles.periodButtonTextActive,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                billingPeriod === 'yearly' && styles.periodButtonActive,
              ]}
              onPress={() => setBillingPeriod('yearly')}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  billingPeriod === 'yearly' && styles.periodButtonTextActive,
                ]}
              >
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {plans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="diamond" size={36} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No plans available</Text>
            <Text style={styles.emptyText}>Try again later.</Text>
          </View>
        ) : (
          plans.map((plan) => {
            const isCurrent = currentPlanId && String(plan.id) === currentPlanId;
            const isActive = Boolean(subscription?.status && ['active', 'trialing'].includes(String(subscription.status).toLowerCase()));
            const label = getPriceLabel(plan);
            const purchasable = canPurchase(plan);
            const starting = startingPlanId === plan.id;

            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  plan.is_featured ? styles.planCardFeatured : null,
                ]}
              >
                <View style={styles.planTop}>
                  <View style={styles.planHeading}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planTier}>{String(plan.tier || '').toUpperCase()}</Text>
                  </View>
                  {plan.is_featured ? (
                    <View style={styles.featuredPill}>
                      <Text style={styles.featuredPillText}>Featured</Text>
                    </View>
                  ) : null}
                </View>

                {plan.description ? (
                  <Text style={styles.planDescription}>{plan.description}</Text>
                ) : null}

                <View style={styles.planPriceRow}>
                  <Text style={styles.planPrice}>{label || 'Contact us'}</Text>
                  {isCurrent && isActive ? (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>Current</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.featuresList}>
                  <View style={styles.featureRow}>
                    <Icon name="server" size={16} color={colors.primary[500]} />
                    <Text style={styles.featureText}>{plan.storage_limit_gb} GB storage</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Icon name="cloud-upload" size={16} color={colors.primary[500]} />
                    <Text style={styles.featureText}>{plan.max_upload_size_mb} MB upload max</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Icon name="download" size={16} color={colors.primary[500]} />
                    <Text style={styles.featureText}>
                      {plan.can_download_unlimited ? 'Unlimited downloads' : `${plan.download_limit_monthly}/mo downloads`}
                    </Text>
                  </View>
                </View>

                <Button
                  title={
                    isCurrent && isActive
                      ? 'Manage in Billing'
                      : purchasable
                        ? starting
                          ? 'Starting...'
                          : 'Subscribe'
                        : 'Not Available'
                  }
                  onPress={() => {
                    if (isCurrent && isActive) {
                      router.replace('/(student)/billing' as any);
                      return;
                    }
                    handleSubscribe(plan);
                  }}
                  disabled={!purchasable || starting}
                  loading={starting}
                  variant={isCurrent && isActive ? 'secondary' : 'primary'}
                  fullWidth
                />
              </View>
            );
          })
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing[3], color: colors.text.secondary, fontSize: 13 },

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

  periodCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  periodTitle: { fontSize: 13, color: colors.text.secondary, fontWeight: '700' },
  periodToggle: {
    flexDirection: 'row',
    marginTop: spacing[3],
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  periodButton: { flex: 1, paddingVertical: 10, borderRadius: borderRadius.md, alignItems: 'center' },
  periodButtonActive: { backgroundColor: colors.card.light, ...shadows.xs },
  periodButtonText: { fontSize: 13, fontWeight: '700', color: colors.text.secondary },
  periodButtonTextActive: { color: colors.text.primary },

  planCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  planCardFeatured: {
    borderColor: colors.primary[200],
    backgroundColor: colors.primary[50],
  },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planHeading: { flex: 1 },
  planName: { fontSize: 16, fontWeight: '900', color: colors.text.primary },
  planTier: { marginTop: 2, fontSize: 12, fontWeight: '800', color: colors.text.tertiary },
  featuredPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.accent[50] },
  featuredPillText: { fontSize: 12, fontWeight: '800', color: colors.accent[500] },
  planDescription: { marginTop: spacing[3], fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  planPriceRow: { marginTop: spacing[3], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planPrice: { fontSize: 16, fontWeight: '900', color: colors.primary[600] },
  currentPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.success + '1A' },
  currentPillText: { fontSize: 12, fontWeight: '800', color: colors.success },

  featuresList: { marginTop: spacing[3], gap: spacing[2], marginBottom: spacing[4] },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  featureText: { fontSize: 13, color: colors.text.secondary, fontWeight: '600' },

  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: { marginTop: spacing[3], fontSize: 15, fontWeight: '800', color: colors.text.primary },
  emptyText: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },

  bottomSpacing: { height: spacing[4] },
});

export default PlansScreen;

