// Billing Plans Screen

import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import Input from '../../../components/ui/Input';
import { paymentsAPI } from '../../../services/api';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { borderRadius,spacing } from '../../../theme/spacing';

type BillingPeriod = 'monthly' | 'yearly';
type Provider = 'stripe' | 'paypal' | 'mobile_money';

type Plan = {
  id: string;
  name: string;
  tier: string;
  description: string;
  plan_type?: string;
  ideal_for?: string;
  highlights?: string[];
  price_monthly: string;
  price_yearly: string;
  billing_period: string;
  storage_limit_gb: number;
  max_upload_size_mb: number;
  download_limit_monthly: number;
  upload_limit_monthly: number;
  message_limit_daily: number;
  group_limit: number;
  bookmark_limit: number;
  event_limit_monthly: number;
  points_limit_monthly: number;
  badge_limit: number;
  search_results_limit: number;
  notification_delay_hours: number;
  support_response_hours: number;
  limits?: Record<string, any>;
  trial_preview?: {
    available?: boolean;
    is_trial_limited?: boolean;
    locked_features?: string[];
    limits?: Record<string, any>;
  };
  feature_count?: number;
  can_download_unlimited: boolean;
  has_ads: boolean;
  has_priority_support: boolean;
  has_analytics: boolean;
  has_early_access: boolean;
  is_featured: boolean;
  stripe_monthly_price_id: string;
  stripe_yearly_price_id: string;
};

type ProviderStatus = {
  configured?: boolean;
  error?: string;
};

type ProviderStatusMap = Partial<Record<Provider, ProviderStatus>>;

const PROVIDER_OPTIONS: { id: Provider; label: string; icon: string }[] = [
  { id: 'stripe', label: 'Card', icon: 'card' },
  { id: 'paypal', label: 'PayPal', icon: 'wallet' },
  { id: 'mobile_money', label: 'Mobile Money', icon: 'cash' },
];

const formatMoney = (value: any, currency = 'USD') => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) return `${currency} ${raw}`;
  return `${currency} ${parsed.toFixed(parsed % 1 === 0 ? 0 : 2)}`;
};

const formatCap = (value: any, suffix: string, zeroLabel = `0${suffix}`) => {
  const parsed = Number(value ?? 0);
  if (parsed < 0) return 'Unlimited';
  if (!parsed) return zeroLabel;
  return `${parsed}${suffix}`;
};

const normalizePaymentError = (error: any): string => {
  const message = String(
    error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      ''
  ).trim();

  if (/you did not provide an api key/i.test(message) || /set stripe_secret_key/i.test(message)) {
    return 'Card subscriptions are not configured on the server yet. Please add a Stripe secret key before retrying.';
  }

  if (/invalid api key/i.test(message) || /must be a valid secret key/i.test(message)) {
    return 'Card subscriptions are misconfigured on the server. Add a valid Stripe secret key before retrying.';
  }

  if (/failed to get paypal access token/i.test(message) || /paypal_client_id|paypal_client_secret/i.test(message)) {
    return 'PayPal subscriptions are not configured on the server yet. Please add valid PayPal credentials before retrying.';
  }

  return message || 'Unable to start checkout.';
};

const PlansScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [currentPlan, setCurrentPlan] = useState<any | null>(null);
  const [entitlements, setEntitlements] = useState<any | null>(null);
  const [providers, setProviders] = useState<ProviderStatusMap>({});
  const [provider, setProvider] = useState<Provider>('stripe');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);

  const selectPreferredProvider = useCallback(
    (providerMap: ProviderStatusMap, current: Provider): Provider => {
      if (providerMap?.[current]?.configured) {
        return current;
      }
      return PROVIDER_OPTIONS.find((option) => providerMap?.[option.id]?.configured)?.id || current;
    },
    []
  );

  const loadPlans = useCallback(async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        paymentsAPI.getPlans(),
        paymentsAPI.getSubscription(),
      ]);

      const plansPayload = plansRes?.data?.data ?? plansRes?.data ?? {};
      const results = Array.isArray(plansPayload?.plans) ? plansPayload.plans : [];
      const providerPayload = (plansPayload?.providers || {}) as ProviderStatusMap;

      setPlans(results);
      setProviders(providerPayload);
      setProvider((current) => selectPreferredProvider(providerPayload, current));

      const subPayload = subRes?.data?.data ?? subRes?.data ?? {};
      setSubscription(subPayload?.subscription ?? null);
      setCurrentPlan(subPayload?.plan ?? null);
      setEntitlements(subPayload?.entitlements ?? null);
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
  }, [selectPreferredProvider]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const providerStatusAvailable = useMemo(() => Object.keys(providers).length > 0, [providers]);
  const currentPlanId = useMemo(() => String(currentPlan?.id || ''), [currentPlan]);
  const currentPlanLabel = useMemo(
    () => String(currentPlan?.name || currentPlan?.tier || '').trim(),
    [currentPlan]
  );
  const currentPlanTier = useMemo(
    () => String(currentPlan?.tier || entitlements?.plan_tier || '').trim().toLowerCase(),
    [currentPlan?.tier, entitlements?.plan_tier]
  );
  const currentPlanType = useMemo(
    () => String(entitlements?.plan_type || '').trim(),
    [entitlements?.plan_type]
  );
  const summaryBanner = entitlements?.trial_banner || entitlements?.upgrade_prompt || null;

  const isProviderConfigured = useCallback(
    (providerId: Provider) => {
      if (!providerStatusAvailable) {
        return true;
      }
      return Boolean(providers?.[providerId]?.configured);
    },
    [providerStatusAvailable, providers]
  );

  const selectedProviderError = useMemo(() => {
    if (!providerStatusAvailable || isProviderConfigured(provider)) {
      return '';
    }
    return String(providers?.[provider]?.error || 'This payment method is not configured right now.');
  }, [isProviderConfigured, provider, providerStatusAvailable, providers]);

  const getPlanAmount = useCallback(
    (plan: Plan) => Number(billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly || 0),
    [billingPeriod]
  );

  const getPriceLabel = useCallback(
    (plan: Plan) => {
      const currency = provider === 'mobile_money' ? 'KES' : 'USD';
      const price = billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly;
      const suffix = billingPeriod === 'monthly' ? '/mo' : '/yr';
      const formatted = formatMoney(price, currency);
      return formatted ? `${formatted}${suffix}` : '';
    },
    [billingPeriod, provider]
  );

  const hasAnyConfiguredProvider = useMemo(() => {
    if (!providerStatusAvailable) {
      return true;
    }
    return PROVIDER_OPTIONS.some((option) => isProviderConfigured(option.id));
  }, [isProviderConfigured, providerStatusAvailable]);

  const canPurchase = useCallback(
    (plan: Plan) => getPlanAmount(plan) > 0 && isProviderConfigured(provider),
    [getPlanAmount, isProviderConfigured, provider]
  );

  const handleUnavailablePlan = useCallback(
    (plan: Plan) => {
      if (getPlanAmount(plan) <= 0) {
        Alert.alert(
          'Included Plan',
          `${plan.name} is the free plan, so it does not need checkout. You can keep using it or start the available free trial from this screen.`,
          [{ text: 'Close', style: 'cancel' }]
        );
        return;
      }

      Alert.alert(
        'Payment method not available',
        selectedProviderError ||
          `${plan.name} is not available with the selected payment method right now. Switch payment method or contact support for help.`,
        [
          {
            text: 'Contact Support',
            onPress: () => router.push('/(student)/contact-support' as any),
          },
          { text: 'Close', style: 'cancel' },
        ]
      );
    },
    [getPlanAmount, router, selectedProviderError]
  );

  const handleStartTrial = useCallback(() => {
    Alert.alert('Start free trial', 'Start the trial available for this account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start trial',
        onPress: async () => {
          try {
            setStartingTrial(true);
            const response = await paymentsAPI.startTrial();
            const payload = response?.data?.data ?? response?.data ?? {};
            Alert.alert(
              'Trial started',
              payload?.trial_end
                ? `Your ${payload?.tier_name || 'trial'} ends on ${new Date(payload.trial_end).toLocaleString()}.`
                : payload?.message || 'Your trial has started.'
            );
            await loadPlans();
          } catch (err: any) {
            Alert.alert(
              'Trial unavailable',
              err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                'Unable to start trial.'
            );
          } finally {
            setStartingTrial(false);
          }
        },
      },
    ]);
  }, [loadPlans]);

  const handleSubscribe = useCallback(
    async (plan: Plan) => {
      if (!plan?.id) return;

      if (provider === 'mobile_money' && !String(phoneNumber || '').trim()) {
        Alert.alert('Phone number required', 'Add your phone number to receive mobile money payment instructions.');
        return;
      }

      if (!canPurchase(plan)) {
        handleUnavailablePlan(plan);
        return;
      }

      try {
        setStartingPlanId(plan.id);
        const response = await paymentsAPI.createSubscription({
          plan_id: plan.id,
          billing_period: billingPeriod,
          provider,
          phone_number: provider === 'mobile_money' ? phoneNumber : undefined,
        });
        const payload = response?.data?.data ?? response?.data ?? {};
        const checkoutUrl = String(payload?.checkout_url || '').trim();
        const instructions = payload?.instructions || null;

        if (!checkoutUrl) {
          if (instructions) {
            Alert.alert(
              'Payment instructions',
              String(instructions?.message || 'Follow the instructions to complete your payment.')
            );
            return;
          }
          Alert.alert('Checkout', 'Checkout link was not returned. Please try again.');
          return;
        }

        await WebBrowser.openBrowserAsync(checkoutUrl);
        Alert.alert(
          'Complete Checkout',
          'Finish the payment in your browser, then come back and pull to refresh your billing status.'
        );
      } catch (err: any) {
        Alert.alert('Subscribe Failed', normalizePaymentError(err));
      } finally {
        setStartingPlanId(null);
      }
    },
    [billingPeriod, canPurchase, handleUnavailablePlan, phoneNumber, provider]
  );

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
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryIconWrap}>
              <Icon name="diamond" size={18} color={colors.primary[600]} />
            </View>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryKicker}>Current plan</Text>
              <Text style={styles.summaryTitle}>
                {currentPlanLabel || (subscription ? 'Subscription' : 'Free')}
              </Text>
              {currentPlanType ? (
                <View style={styles.summaryTypePill}>
                  <Text style={styles.summaryTypePillText}>{currentPlanType}</Text>
                </View>
              ) : null}
              <Text style={styles.summaryText}>
                {subscription?.status
                  ? `Status: ${String(subscription.status).replace(/_/g, ' ')}.`
                  : 'Start your free trial or choose a paid plan below.'}
              </Text>
            </View>
          </View>

          {summaryBanner ? (
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryBannerTitle}>
                {summaryBanner.title || 'Plan update'}
              </Text>
              <Text style={styles.summaryBannerText}>
                {summaryBanner.message || 'Your account has updated billing access information.'}
              </Text>
            </View>
          ) : null}

          <View style={styles.summaryActions}>
            <Button
              title={startingTrial ? 'Starting...' : 'Start Free Trial'}
              onPress={handleStartTrial}
              loading={startingTrial}
              disabled={startingTrial}
              style={{ flex: 1 }}
            />
            <View style={{ width: spacing[3] }} />
            <Button
              title="Billing"
              onPress={() => router.replace('/(student)/billing' as any)}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>
        </View>

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

        <View style={styles.periodCard}>
          <Text style={styles.periodTitle}>Payment method</Text>
          <View style={styles.providerRow}>
            {PROVIDER_OPTIONS.map((option) => {
              const configured = isProviderConfigured(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.providerChip,
                    provider === option.id ? styles.providerChipActive : null,
                    !configured ? styles.providerChipDisabled : null,
                  ]}
                  onPress={() => setProvider(option.id)}
                  disabled={!configured}
                >
                  <Icon
                    name={option.icon as any}
                    size={16}
                    color={
                      !configured
                        ? colors.text.tertiary
                        : provider === option.id
                          ? colors.primary[600]
                          : colors.text.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.providerChipText,
                      provider === option.id ? styles.providerChipTextActive : null,
                      !configured ? styles.providerChipTextDisabled : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.providerHint}>
            {provider === 'mobile_money'
              ? 'Mobile Money subscriptions use KES automatically.'
              : 'Card and PayPal subscriptions use USD.'}
          </Text>

          {selectedProviderError ? (
            <Text style={styles.providerError}>{selectedProviderError}</Text>
          ) : null}

          {provider === 'mobile_money' ? (
            <Input
              label="Phone number"
              placeholder="e.g. +2547XXXXXXXX"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
              hint="Used to send mobile money payment instructions."
              containerStyle={{ marginTop: spacing[4], marginBottom: 0 }}
            />
          ) : null}
        </View>

        {plans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="diamond" size={36} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No plans available</Text>
            <Text style={styles.emptyText}>
              {currentPlanLabel
                ? `Your account is currently on ${currentPlanLabel}. The plan catalog is unavailable right now, but you can still open billing or contact support for changes.`
                : 'The plan catalog is unavailable right now. Open billing for your current subscription details or contact support for help with upgrades.'}
            </Text>
            <View style={styles.emptyActions}>
              <Button
                title="Open Billing"
                onPress={() => router.replace('/(student)/billing' as any)}
                fullWidth
              />
            </View>
            <View style={styles.emptyActions}>
              <Button
                title="Contact Support"
                onPress={() => router.push('/(student)/contact-support' as any)}
                variant="secondary"
                fullWidth
              />
            </View>
          </View>
        ) : (
          plans.map((plan) => {
            const isFreePlan = getPlanAmount(plan) <= 0;
            const isCurrent = currentPlanId
              ? String(plan.id) === currentPlanId
              : isFreePlan && !subscription;
            const isActive = Boolean(
              subscription?.status &&
                ['active', 'trialing'].includes(String(subscription.status).toLowerCase())
            );
            const label = getPriceLabel(plan);
            const purchasable = canPurchase(plan);
            const starting = startingPlanId === plan.id;
            const isCurrentTrial =
              isCurrent && String(subscription?.status || '').toLowerCase() === 'trialing';
            const isCurrentTierTrial =
              Boolean(entitlements?.is_trial) &&
              currentPlanTier === String(plan.tier || '').trim().toLowerCase();
            const limitStats = [
              {
                key: 'storage',
                icon: 'server',
                label: 'Storage',
                value: `${plan.storage_limit_gb} GB`,
              },
              {
                key: 'max-upload',
                icon: 'cloud-upload',
                label: 'Max file',
                value: `${plan.max_upload_size_mb} MB`,
              },
              {
                key: 'uploads',
                icon: 'albums',
                label: 'Uploads',
                value: formatCap(plan.upload_limit_monthly, '/mo'),
              },
              {
                key: 'downloads',
                icon: 'download',
                label: 'Downloads',
                value: plan.can_download_unlimited
                  ? 'Unlimited'
                  : formatCap(plan.download_limit_monthly, '/mo'),
              },
              {
                key: 'messages',
                icon: 'chatbubbles',
                label: 'Messages',
                value: formatCap(plan.message_limit_daily, '/day'),
              },
              {
                key: 'groups',
                icon: 'people',
                label: 'Groups',
                value: formatCap(plan.group_limit, ''),
              },
              {
                key: 'search',
                icon: 'search',
                label: 'Search',
                value: formatCap(plan.search_results_limit, '/query'),
              },
              {
                key: 'support',
                icon: 'time',
                label: 'Support',
                value: `${Number(plan.support_response_hours || 0)}h`,
              },
            ];
            const highlightTags = Array.isArray(plan.highlights) ? plan.highlights : [];
            const perkTags = [
              !plan.has_ads ? 'No ads' : null,
              plan.has_analytics ? 'Analytics' : null,
              plan.has_priority_support ? 'Priority support' : null,
              plan.has_early_access ? 'Early access' : null,
            ].filter(Boolean) as string[];

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
                  <View style={styles.planTopBadges}>
                    {plan.plan_type ? (
                      <View style={styles.planTypePill}>
                        <Text style={styles.planTypePillText}>{plan.plan_type}</Text>
                      </View>
                    ) : null}
                    {plan.is_featured ? (
                      <View style={styles.featuredPill}>
                        <Text style={styles.featuredPillText}>Featured</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {plan.description ? (
                  <Text style={styles.planDescription}>{plan.description}</Text>
                ) : null}
                {plan.ideal_for ? (
                  <Text style={styles.planAudience}>Best for: {plan.ideal_for}</Text>
                ) : null}

                <View style={styles.planPriceRow}>
                  <Text style={styles.planPrice}>{label || 'Included'}</Text>
                  {isCurrent && isActive ? (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>
                        {isCurrentTrial ? 'Current Trial' : 'Current'}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.limitGrid}>
                  {limitStats.map((item) => (
                    <View key={item.key} style={styles.limitStat}>
                      <View style={styles.limitStatTop}>
                        <Icon name={item.icon as any} size={14} color={colors.primary[600]} />
                        <Text style={styles.limitLabel}>{item.label}</Text>
                      </View>
                      <Text style={styles.limitValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.planSecondaryMeta}>
                  Bookmarks: {formatCap(plan.bookmark_limit, '')} • Events: {formatCap(plan.event_limit_monthly, '/mo')} • Badges: {formatCap(plan.badge_limit, '')}
                </Text>

                {perkTags.length ? (
                  <View style={styles.perkWrap}>
                    {perkTags.map((tag) => (
                      <View key={tag} style={styles.perkChip}>
                        <Text style={styles.perkChipText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {highlightTags.length ? (
                  <View style={styles.highlightWrap}>
                    {highlightTags.map((tag) => (
                      <View key={tag} style={styles.highlightChip}>
                        <Text style={styles.highlightChipText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {isCurrentTierTrial && plan.trial_preview?.is_trial_limited ? (
                  <View style={styles.trialNotice}>
                    <Icon name="information-circle" size={16} color={colors.warning} />
                    <Text style={styles.trialNoticeText}>
                      Your current trial uses lower caps than the full {plan.name} plan until you upgrade.
                    </Text>
                  </View>
                ) : null}

                {!hasAnyConfiguredProvider ? (
                  <Text style={styles.planHelperText}>
                    No payment methods are configured right now. Contact support or start the free trial first.
                  </Text>
                ) : !purchasable ? (
                  <Text style={styles.planHelperText}>
                    {isFreePlan
                      ? 'This is your included free plan.'
                      : selectedProviderError || `Switch payment method to continue with ${plan.name}.`}
                  </Text>
                ) : null}

                <Button
                  title={
                    isCurrent && isActive
                      ? 'Manage in Billing'
                      : isFreePlan
                        ? 'Included'
                        : purchasable
                          ? starting
                            ? 'Starting...'
                            : 'Subscribe'
                          : 'Choose Another Method'
                  }
                  onPress={() => {
                    if (isCurrent && isActive) {
                      router.replace('/(student)/billing' as any);
                      return;
                    }
                    if (isFreePlan || !purchasable) {
                      handleUnavailablePlan(plan);
                      return;
                    }
                    handleSubscribe(plan);
                  }}
                  disabled={starting || (!isCurrent && isFreePlan)}
                  loading={starting}
                  variant={
                    isCurrent && isActive ? 'secondary' : purchasable ? 'primary' : 'outline'
                  }
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

  summaryCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start' },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    marginRight: spacing[3],
  },
  summaryTextWrap: { flex: 1 },
  summaryKicker: { fontSize: 12, fontWeight: '700', color: colors.text.secondary },
  summaryTitle: { marginTop: 2, fontSize: 18, fontWeight: '900', color: colors.text.primary },
  summaryText: { marginTop: spacing[2], fontSize: 13, lineHeight: 18, color: colors.text.secondary },
  summaryTypePill: {
    alignSelf: 'flex-start',
    marginTop: spacing[2],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primary[50],
  },
  summaryTypePillText: { fontSize: 12, fontWeight: '800', color: colors.primary[700] },
  summaryBanner: {
    marginTop: spacing[4],
    padding: spacing[3],
    borderRadius: borderRadius.xl,
    backgroundColor: colors.warning + '12',
    borderWidth: 1,
    borderColor: colors.warning + '22',
  },
  summaryBannerTitle: { fontSize: 13, fontWeight: '800', color: colors.text.primary },
  summaryBannerText: { marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.text.secondary },
  summaryActions: { flexDirection: 'row', marginTop: spacing[4] },

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
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[3] },
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
  providerChipDisabled: { opacity: 0.45 },
  providerChipText: { fontSize: 13, fontWeight: '700', color: colors.text.secondary },
  providerChipTextActive: { color: colors.primary[700] },
  providerChipTextDisabled: { color: colors.text.tertiary },
  providerHint: { marginTop: spacing[3], fontSize: 12, color: colors.text.secondary },
  providerError: { marginTop: spacing[2], fontSize: 12, color: colors.error, lineHeight: 18 },

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
  planTopBadges: { alignItems: 'flex-end', gap: spacing[2] },
  planName: { fontSize: 16, fontWeight: '900', color: colors.text.primary },
  planTier: { marginTop: 2, fontSize: 12, fontWeight: '800', color: colors.text.tertiary },
  planTypePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.gray[100] },
  planTypePillText: { fontSize: 11, fontWeight: '800', color: colors.text.secondary },
  featuredPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.accent[50] },
  featuredPillText: { fontSize: 12, fontWeight: '800', color: colors.accent[500] },
  planDescription: { marginTop: spacing[3], fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  planAudience: { marginTop: spacing[2], fontSize: 12, lineHeight: 18, color: colors.text.tertiary, fontWeight: '700' },
  planPriceRow: { marginTop: spacing[3], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planPrice: { fontSize: 16, fontWeight: '900', color: colors.primary[600] },
  currentPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.success + '1A' },
  currentPillText: { fontSize: 12, fontWeight: '800', color: colors.success },

  limitGrid: {
    marginTop: spacing[4],
    marginBottom: spacing[3],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  limitStat: {
    width: '48%',
    padding: spacing[3],
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.secondary,
  },
  limitStatTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  limitLabel: { fontSize: 11, fontWeight: '700', color: colors.text.tertiary },
  limitValue: { marginTop: 6, fontSize: 13, fontWeight: '900', color: colors.text.primary },
  planSecondaryMeta: { fontSize: 12, lineHeight: 18, color: colors.text.secondary, fontWeight: '700' },
  perkWrap: { marginTop: spacing[3], flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  perkChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primary[50] },
  perkChipText: { fontSize: 11, fontWeight: '800', color: colors.primary[700] },
  highlightWrap: { marginTop: spacing[3], flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  highlightChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.gray[100] },
  highlightChipText: { fontSize: 11, fontWeight: '700', color: colors.text.secondary },
  trialNotice: {
    marginTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.xl,
    backgroundColor: colors.warning + '12',
  },
  trialNoticeText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.text.secondary },
  planHelperText: {
    marginTop: spacing[3],
    fontSize: 12,
    color: colors.warning,
    marginBottom: spacing[3],
    lineHeight: 18,
  },

  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: { marginTop: spacing[3], fontSize: 15, fontWeight: '800', color: colors.text.primary },
  emptyText: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },
  emptyActions: { marginTop: spacing[3], alignSelf: 'stretch' },

  bottomSpacing: { height: spacing[4] },
});

export default PlansScreen;
