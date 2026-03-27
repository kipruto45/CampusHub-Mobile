// Calendar Sync Screen

import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { calendarSyncService, CalendarAccount, CalendarProvider, getCalendarRedirectUri } from '../../services/calendar.service';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius, spacing } from '../../theme/spacing';

const providerLabel = (provider: CalendarProvider) =>
  provider === 'google' ? 'Google Calendar' : 'Outlook Calendar';

const CalendarSyncScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState<CalendarProvider | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);

  const load = useCallback(async () => {
    try {
      const result = await calendarSyncService.getAccounts();
      setAccounts(result);
    } catch (err: any) {
      Alert.alert(
        'Calendar Sync',
        err?.response?.data?.error || err?.message || 'Unable to load calendar accounts.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connectedProviders = useMemo(
    () => new Set(accounts.map((account) => account.provider)),
    [accounts]
  );

  const handleConnect = useCallback(
    async (provider: CalendarProvider) => {
      try {
        setConnecting(provider);
        const { authUrl, redirectUri } = await calendarSyncService.connect(provider);
        if (!authUrl) {
          throw new Error('Calendar authorization link was not returned.');
        }

        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri || getCalendarRedirectUri());
        if (result.type === 'success') {
          if (!result.url) {
            throw new Error('Calendar connection did not return a valid callback.');
          }
          await calendarSyncService.completeConnection(provider, result.url);
          await load();
          Alert.alert('Connected', `${providerLabel(provider)} is now linked to your CampusHub account.`);
        } else if (result.type !== 'cancel') {
          throw new Error('Calendar sign-in did not finish. Please try again.');
        }
      } catch (err: any) {
        Alert.alert('Calendar Connect Failed', err?.message || 'Unable to connect calendar.');
      } finally {
        setConnecting(null);
      }
    },
    [load]
  );

  const handleSync = useCallback(async (account: CalendarAccount) => {
    try {
      setSyncingId(account.id);
      const result = await calendarSyncService.syncAccount(account.id, 30);
      await load();
      Alert.alert(
        'Sync Complete',
        `Synced ${result?.synced ?? 0} events${result?.errors ? `, ${result.errors} errors` : ''}.`
      );
    } catch (err: any) {
      Alert.alert('Sync Failed', err?.message || 'Unable to sync calendar.');
    } finally {
      setSyncingId(null);
    }
  }, [load]);

  const handleDisconnect = useCallback(
    (account: CalendarAccount) => {
      Alert.alert(
        'Disconnect Calendar',
        `Disconnect ${providerLabel(account.provider)} for ${account.email}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                await calendarSyncService.disconnect(account.id);
                await load();
              } catch (err: any) {
                Alert.alert('Disconnect Failed', err?.message || 'Unable to disconnect calendar.');
              }
            },
          },
        ]
      );
    },
    [load]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading calendars...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar Sync</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            setRefreshing(true);
            load();
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
              load();
            }}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Connect a calendar</Text>
          <Text style={styles.sectionSubtitle}>
            Link Google or Outlook to keep CampusHub events in sync with your personal calendar.
          </Text>
          <View style={styles.actionsRow}>
            <Button
              title={connecting === 'google' ? 'Connecting...' : 'Connect Google'}
              onPress={() => handleConnect('google')}
              loading={connecting === 'google'}
              disabled={connecting === 'google'}
              style={{ flex: 1 }}
            />
            <View style={{ width: spacing[3] }} />
            <Button
              title={connecting === 'outlook' ? 'Connecting...' : 'Connect Outlook'}
              onPress={() => handleConnect('outlook')}
              loading={connecting === 'outlook'}
              disabled={connecting === 'outlook'}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>
          {connectedProviders.size ? (
            <Text style={styles.connectedNote}>
              Connected: {[...connectedProviders].map((provider) => providerLabel(provider as CalendarProvider)).join(', ')}
            </Text>
          ) : null}
        </View>

        <Text style={styles.listTitle}>Linked calendars</Text>
        {accounts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="calendar" size={36} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No calendars connected</Text>
            <Text style={styles.emptyText}>Connect Google or Outlook to start syncing your events.</Text>
          </View>
        ) : (
          accounts.map((account) => (
            <View key={account.id} style={styles.accountCard}>
              <View style={styles.accountTop}>
                <View style={styles.accountIcon}>
                  <Icon name="calendar" size={16} color={colors.primary[600]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountTitle}>{providerLabel(account.provider)}</Text>
                  <Text style={styles.accountSubtitle}>{account.email}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{account.sync_enabled ? 'SYNC ON' : 'SYNC OFF'}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Last sync</Text>
                <Text style={styles.metaValue}>
                  {account.last_sync_at ? new Date(account.last_sync_at).toLocaleString() : 'Never'}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <Button
                  title={syncingId === account.id ? 'Syncing...' : 'Sync Now'}
                  onPress={() => handleSync(account)}
                  loading={syncingId === account.id}
                  disabled={syncingId === account.id}
                  style={{ flex: 1 }}
                />
                <View style={{ width: spacing[3] }} />
                <Button
                  title="Disconnect"
                  onPress={() => handleDisconnect(account)}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ))
        )}
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
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.text.primary },

  scrollContent: { padding: spacing[4], paddingBottom: spacing[10] },

  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },

  sectionTitle: { fontSize: 15, fontWeight: '900', color: colors.text.primary },
  sectionSubtitle: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  connectedNote: { marginTop: spacing[2], fontSize: 12, color: colors.text.tertiary },

  listTitle: { marginBottom: spacing[3], fontSize: 14, fontWeight: '900', color: colors.text.primary },

  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: { marginTop: spacing[3], fontSize: 15, fontWeight: '900', color: colors.text.primary },
  emptyText: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },

  accountCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  accountTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  accountSubtitle: { marginTop: 2, fontSize: 12, color: colors.text.secondary },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.gray[100],
  },
  statusText: { fontSize: 11, fontWeight: '800', color: colors.text.secondary },

  metaRow: { marginTop: spacing[3], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 12, color: colors.text.secondary },
  metaValue: { fontSize: 12, fontWeight: '800', color: colors.text.primary },

  actionsRow: { flexDirection: 'row', marginTop: spacing[4] },
});

export default CalendarSyncScreen;
