// Storage Add-ons Screen

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
import Input from '../../../components/ui/Input';
import { paymentsAPI } from '../../../services/api';

type Provider = 'stripe' | 'paypal' | 'mobile_money';

const STORAGE_OPTIONS = [5, 10, 20, 50, 100] as const;
const DURATION_OPTIONS = [30, 90, 365] as const;

const formatDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const StorageAddonsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [storageGb, setStorageGb] = useState<(typeof STORAGE_OPTIONS)[number]>(50);
  const [durationDays, setDurationDays] = useState<(typeof DURATION_OPTIONS)[number]>(30);
  const [provider, setProvider] = useState<Provider>('stripe');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadUpgrades = useCallback(async () => {
    try {
      const response = await paymentsAPI.getStorageUpgrades();
      const payload = response?.data?.data ?? response?.data ?? {};
      setUpgrades(Array.isArray(payload?.upgrades) ? payload.upgrades : []);
    } catch (err: any) {
      Alert.alert(
        'Storage Add-ons',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load upgrades.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUpgrades();
  }, [loadUpgrades]);

  const activeUpgrades = useMemo(() => {
    const now = Date.now();
    return upgrades.filter((u) => {
      const status = String(u?.status || '').toLowerCase();
      const endsAt = u?.ends_at ? new Date(u.ends_at).getTime() : 0;
      return status === 'active' && (!endsAt || endsAt > now);
    });
  }, [upgrades]);

  const handlePurchase = async () => {
    if (provider === 'mobile_money' && !String(phoneNumber || '').trim()) {
      Alert.alert('Phone number required', 'Add your phone number to receive the payment instructions.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await paymentsAPI.purchaseStorageUpgrade({
        storage_gb: storageGb,
        duration_days: durationDays,
        provider,
        phone_number: provider === 'mobile_money' ? phoneNumber : undefined,
      });

      const payload = response?.data?.data ?? response?.data ?? {};
      const checkoutUrl = String(payload?.checkout_url || '').trim();
      const instructions = payload?.instructions || null;

      if (checkoutUrl) {
        await WebBrowser.openBrowserAsync(checkoutUrl);
        Alert.alert('Complete payment', 'Finish payment in your browser, then refresh to see the upgrade.');
      } else if (instructions) {
        Alert.alert(
          'Payment instructions',
          String(instructions?.message || 'Follow the instructions to complete your payment.')
        );
      } else {
        Alert.alert('Purchase started', 'Your request was received.');
      }

      await loadUpgrades();
    } catch (err: any) {
      Alert.alert(
        'Purchase Failed',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to start payment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading upgrades...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Storage Add-ons</Text>
          <Text style={styles.headerSubtitle}>
            {activeUpgrades.length ? `${activeUpgrades.length} active` : 'Buy extra storage'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            setRefreshing(true);
            loadUpgrades();
          }}
        >
          <Icon name="refresh" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadUpgrades();
            }}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Choose storage</Text>
          <View style={styles.choiceRow}>
            {STORAGE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.choiceChip,
                  storageGb === opt ? styles.choiceChipActive : null,
                ]}
                onPress={() => setStorageGb(opt)}
              >
                <Text
                  style={[
                    styles.choiceChipText,
                    storageGb === opt ? styles.choiceChipTextActive : null,
                  ]}
                >
                  {opt} GB
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: spacing[4] }]}>Duration</Text>
          <View style={styles.choiceRow}>
            {DURATION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.choiceChip,
                  durationDays === opt ? styles.choiceChipActive : null,
                ]}
                onPress={() => setDurationDays(opt)}
              >
                <Text
                  style={[
                    styles.choiceChipText,
                    durationDays === opt ? styles.choiceChipTextActive : null,
                  ]}
                >
                  {opt === 365 ? '1 year' : `${opt} days`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: spacing[4] }]}>Payment method</Text>
          <View style={styles.providerRow}>
            {[
              { id: 'stripe', label: 'Card', icon: 'card' },
              { id: 'paypal', label: 'PayPal', icon: 'wallet' },
              { id: 'mobile_money', label: 'Mobile Money', icon: 'cash' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.providerChip,
                  provider === opt.id ? styles.providerChipActive : null,
                ]}
                onPress={() => setProvider(opt.id as Provider)}
              >
                <Icon name={opt.icon as any} size={16} color={provider === opt.id ? colors.primary[600] : colors.text.tertiary} />
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

          {provider === 'mobile_money' ? (
            <Input
              label="Phone number"
              placeholder="e.g. +2547XXXXXXXX"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
              hint="Used to generate payment instructions."
              containerStyle={{ marginTop: spacing[4], marginBottom: 0 }}
            />
          ) : null}

          <View style={{ marginTop: spacing[4] }}>
            <Button
              title={submitting ? 'Starting...' : 'Purchase'}
              onPress={handlePurchase}
              loading={submitting}
              disabled={submitting}
              fullWidth
              icon={<Icon name="cart" size={18} color={colors.text.inverse} />}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your upgrades</Text>
          {upgrades.length === 0 ? (
            <View style={styles.emptyInline}>
              <Icon name="server" size={28} color={colors.text.tertiary} />
              <Text style={styles.emptyInlineTitle}>No upgrades yet</Text>
              <Text style={styles.emptyInlineText}>Purchase an add-on to increase your storage limit.</Text>
            </View>
          ) : (
            upgrades.map((u) => (
              <View key={String(u?.id || Math.random())} style={styles.upgradeRow}>
                <View style={styles.upgradeLeft}>
                  <View style={styles.upgradeIcon}>
                    <Icon name="server" size={16} color={colors.primary[500]} />
                  </View>
                  <View>
                    <Text style={styles.upgradeTitle}>{u.storage_gb} GB</Text>
                    <Text style={styles.upgradeSub}>
                      {u.status} • {u.duration_days} days
                    </Text>
                    {u.ends_at ? (
                      <Text style={styles.upgradeSub}>Ends: {formatDateTime(u.ends_at)}</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.upgradePrice}>USD {String(u.price || '')}</Text>
              </View>
            ))
          )}
        </View>

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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text.primary },
  headerSubtitle: { marginTop: 2, fontSize: 12, color: colors.text.tertiary },

  scrollContent: { padding: spacing[4], paddingBottom: spacing[10] },

  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text.primary, marginBottom: spacing[2] },

  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.gray[100],
  },
  choiceChipActive: { backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
  choiceChipText: { fontSize: 13, fontWeight: '700', color: colors.text.secondary },
  choiceChipTextActive: { color: colors.primary[700] },

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

  emptyInline: { paddingVertical: spacing[6], alignItems: 'center' },
  emptyInlineTitle: { marginTop: spacing[2], fontSize: 14, fontWeight: '800', color: colors.text.primary },
  emptyInlineText: { marginTop: spacing[1], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },

  upgradeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[3] },
  upgradeLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  upgradeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeTitle: { fontSize: 14, fontWeight: '800', color: colors.text.primary },
  upgradeSub: { marginTop: 2, fontSize: 12, color: colors.text.tertiary },
  upgradePrice: { fontSize: 13, fontWeight: '800', color: colors.text.secondary },

  bottomSpacing: { height: spacing[4] },
});

export default StorageAddonsScreen;

