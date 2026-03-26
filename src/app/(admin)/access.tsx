import { useFocusEffect,useRouter } from 'expo-router';
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

import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Input from '../../components/ui/Input';
import { ADMIN_HOME_ROUTE } from '../../lib/auth-routing';
import { paymentsAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

type BillingPeriod = 'monthly' | 'yearly';
type Provider = 'stripe' | 'paypal' | 'mobile_money';

type Plan = {
  id: string;
  name: string;
  tier: string;
  description: string;
  price_monthly: string;
  price_yearly: string;
  storage_limit_gb: number;
  max_upload_size_mb: number;
  download_limit_monthly: number;
  has_priority_support: boolean;
  has_analytics: boolean;
  has_early_access: boolean;
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
  const parsed = Number(value ?? 0);
  if (!parsed) return 'Free';
  return `${currency} ${parsed.toFixed(parsed % 1 === 0 ? 0 : 2)}`;
};

const normalizePaymentError = (error: any): string => {
  const message = String(
    error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      ''
  ).trim();

  if (/you did not provide an api key/i.test(message) || /set stripe_secret_key/i.test(message)) {
    return 'Card payments are not configured on the server yet. Add a Stripe secret key and retry.';
  }

  if (/failed to get paypal access token/i.test(message) || /paypal_client_id|paypal_client_secret/i.test(message)) {
    return 'PayPal is not configured on the server yet. Add valid PayPal credentials and retry.';
  }

  return message || 'Unable to start checkout.';
};

const AdminAccessScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [providers, setProviders] = useState<ProviderStatusMap>({});
  const [provider, setProvider] = useState<Provider>('stripe');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [subscription, setSubscription] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [plansRes, subscriptionRes, accessRes] = await Promise.all([
        paymentsAPI.getPlans(),
        paymentsAPI.getSubscription(),
        paymentsAPI.getFeatureAccessSummary(),
      ]);

      const plansPayload = plansRes?.data?.data ?? plansRes?.data ?? {};
      const subscriptionPayload = subscriptionRes?.data?.data ?? subscriptionRes?.data ?? {};
      const accessPayload = accessRes?.data?.data ?? accessRes?.data ?? {};

      const nextPlans = Array.isArray(plansPayload?.plans) ? plansPayload.plans : [];
      const nextProviders = (plansPayload?.providers || {}) as ProviderStatusMap;

      setPlans(nextPlans.filter((plan: Plan) => String(plan?.tier || '').toLowerCase() !== 'free'));
      setProviders(nextProviders);
      setProvider((current) => {
        if (nextProviders?.[current]?.configured) {
          return current;
        }
        return PROVIDER_OPTIONS.find((option) => nextProviders?.[option.id]?.configured)?.id || current;
      });
      setSubscription(subscriptionPayload?.subscription ?? null);
      setSummary(accessPayload ?? null);

      if (accessPayload?.admin_access_granted) {
        router.replace(ADMIN_HOME_ROUTE as any);
      }
    } catch (error) {
      console.log('Failed to load admin access state:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        void load();
      }
      return undefined;
    }, [load, loading])
  );

  const providerStatusAvailable = useMemo(() => Object.keys(providers).length > 0, [providers]);
  const selectedProviderConfigured = useMemo(() => {
    if (!providerStatusAvailable) {
      return true;
    }
    return Boolean(providers?.[provider]?.configured);
  }, [provider, providerStatusAvailable, providers]);

  const selectedProviderError = useMemo(() => {
    if (!providerStatusAvailable || selectedProviderConfigured) {
      return '';
    }
    return String(providers?.[provider]?.error || 'This payment method is not configured right now.');
  }, [provider, providerStatusAvailable, providers, selectedProviderConfigured]);

  const activePlanName = String(summary?.plan_name || subscription?.plan?.name || summary?.tier_name || 'No active plan');
  const trialEndLabel = summary?.trial_end ? new Date(summary.trial_end).toLocaleString() : '';

  const handleStartTrial = useCallback(() => {
    Alert.alert(
      'Start admin trial',
      'Start the 7-day admin trial on this account?',
      [
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
                  ? `Your admin trial ends on ${new Date(payload.trial_end).toLocaleString()}.`
                  : 'Your trial is active now.'
              );
              await load();
              router.replace(ADMIN_HOME_ROUTE as any);
            } catch (error: any) {
              Alert.alert('Trial unavailable', normalizePaymentError(error));
            } finally {
              setStartingTrial(false);
            }
          },
        },
      ]
    );
  }, [load, router]);

  const handleSubscribe = useCallback(
    async (plan: Plan) => {
      if (!selectedProviderConfigured) {
        Alert.alert('Payment method unavailable', selectedProviderError || 'Choose another payment method.');
        return;
      }

      if (provider === 'mobile_money' && !phoneNumber.trim()) {
        Alert.alert('Phone number required', 'Enter a phone number to complete Mobile Money checkout.');
        return;
      }

      try {
        setStartingPlanId(plan.id);
        const response = await paymentsAPI.createSubscription({
          plan_id: plan.id,
          billing_period: billingPeriod,
          provider,
          ...(provider === 'mobile_money' ? { phone_number: phoneNumber.trim() } : {}),
        });
        const payload = response?.data?.data ?? response?.data ?? {};

        if (payload?.checkout_url) {
          await WebBrowser.openBrowserAsync(payload.checkout_url);
          await load();
          return;
        }

        Alert.alert(
          'Checkout started',
          payload?.instructions?.message ||
            payload?.instructions?.note ||
            'Follow the payment instructions to finish activating admin access.'
        );
        await load();
      } catch (error: any) {
        Alert.alert('Payment failed', normalizePaymentError(error));
      } finally {
        setStartingPlanId(null);
      }
    },
    [billingPeriod, load, phoneNumber, provider, selectedProviderConfigured, selectedProviderError]
  );

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Checking admin access...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Access</Text>
          <Text style={styles.headerSubtitle}>Choose a plan or start your 7-day admin trial.</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            setRefreshing(true);
            void load();
          }}
        >
          <Icon name="refresh" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Icon name="shield-checkmark" size={22} color={colors.primary[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Admin features are tied to billing access</Text>
              <Text style={styles.heroText}>
                {summary?.admin_access_reason ||
                  'Start the admin trial or activate a paid plan to unlock the admin dashboard and operations tools.'}
              </Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Current state</Text>
              <Text style={styles.metaValue}>
                {String(summary?.subscription_status || 'inactive').replace(/_/g, ' ')}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Current plan</Text>
              <Text style={styles.metaValue}>{activePlanName}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Trial</Text>
              <Text style={styles.metaValue}>
                {summary?.trial_eligible ? 'Available' : trialEndLabel || 'Used or inactive'}
              </Text>
            </View>
          </View>

          <Button
            title={startingTrial ? 'Starting Trial...' : 'Start 7-Day Trial'}
            onPress={handleStartTrial}
            disabled={startingTrial || !summary?.trial_eligible}
          />
        </View>

        <View style={styles.periodCard}>
          <Text style={styles.sectionTitle}>Billing cycle</Text>
          <View style={styles.periodRow}>
            {(['monthly', 'yearly'] as BillingPeriod[]).map((period) => {
              const active = billingPeriod === period;
              return (
                <TouchableOpacity
                  key={period}
                  style={[styles.periodPill, active && styles.periodPillActive]}
                  onPress={() => setBillingPeriod(period)}
                >
                  <Text style={[styles.periodText, active && styles.periodTextActive]}>
                    {period === 'monthly' ? 'Monthly' : 'Yearly'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.periodCard}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          <View style={styles.providerRow}>
            {PROVIDER_OPTIONS.map((option) => {
              const active = provider === option.id;
              const configured = !providerStatusAvailable || providers?.[option.id]?.configured;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.providerPill,
                    active && styles.providerPillActive,
                    !configured && styles.providerPillDisabled,
                  ]}
                  onPress={() => setProvider(option.id)}
                  disabled={!configured}
                >
                  <Icon
                    name={option.icon as any}
                    size={18}
                    color={active ? colors.primary[600] : colors.text.secondary}
                  />
                  <Text style={[styles.providerText, active && styles.providerTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {provider === 'mobile_money' ? (
            <View style={{ marginTop: spacing[4] }}>
              <Input
                label="Phone number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+254712345678"
                keyboardType="phone-pad"
              />
            </View>
          ) : null}
          {selectedProviderError ? <Text style={styles.providerError}>{selectedProviderError}</Text> : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Plans</Text>
          <Text style={styles.sectionSubtitle}>Pick the plan that matches your admin workload.</Text>
        </View>

        {plans.map((plan) => {
          const price = billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly;
          const currency = provider === 'mobile_money' ? 'KES' : 'USD';
          return (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planTier}>{String(plan.tier || '').toUpperCase()}</Text>
                </View>
                <Text style={styles.planPrice}>{formatMoney(price, currency)}</Text>
              </View>
              <Text style={styles.planDescription}>{plan.description}</Text>

              <View style={styles.planMetaRow}>
                <Text style={styles.planMeta}>Storage: {plan.storage_limit_gb} GB</Text>
                <Text style={styles.planMeta}>Upload: {plan.max_upload_size_mb} MB</Text>
              </View>
              <View style={styles.planMetaRow}>
                <Text style={styles.planMeta}>
                  Downloads: {plan.download_limit_monthly > 0 ? `${plan.download_limit_monthly}/mo` : 'Unlimited'}
                </Text>
                <Text style={styles.planMeta}>
                  {plan.has_priority_support ? 'Priority support' : 'Standard support'}
                </Text>
              </View>

              <Button
                title={startingPlanId === plan.id ? 'Opening Checkout...' : `Choose ${plan.name}`}
                onPress={() => void handleSubscribe(plan)}
                disabled={startingPlanId === plan.id}
                style={{ marginTop: spacing[4] }}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default AdminAccessScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing[6],
  },
  loadingText: {
    marginTop: spacing[3],
    color: colors.text.secondary,
    fontSize: 15,
  },
  header: {
    paddingTop: spacing[8],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerSubtitle: {
    marginTop: spacing[1],
    color: colors.text.secondary,
    fontSize: 14,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
  },
  scrollContent: {
    padding: spacing[5],
    paddingBottom: spacing[8],
  },
  heroCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.md,
  },
  heroTop: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  metaGrid: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  metaItem: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  metaLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing[1],
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  periodCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  sectionHeader: {
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  sectionSubtitle: {
    marginTop: spacing[1],
    fontSize: 13,
    color: colors.text.secondary,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  periodPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
  },
  periodPillActive: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  periodText: {
    color: colors.text.secondary,
    fontWeight: '700',
  },
  periodTextActive: {
    color: colors.primary[600],
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  providerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
  },
  providerPillActive: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  providerPillDisabled: {
    opacity: 0.45,
  },
  providerText: {
    color: colors.text.secondary,
    fontWeight: '700',
  },
  providerTextActive: {
    color: colors.primary[600],
  },
  providerError: {
    marginTop: spacing[3],
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
  planCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  planTier: {
    marginTop: spacing[1],
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary[600],
  },
  planDescription: {
    marginTop: spacing[3],
    color: colors.text.secondary,
    lineHeight: 20,
  },
  planMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  planMeta: {
    color: colors.text.secondary,
    fontSize: 13,
  },
});
