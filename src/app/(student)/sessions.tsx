// Active Sessions Screen

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { securityAPI } from '../../services/api';

interface SessionItem {
  session_key: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
}

const formatDate = (value?: string) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const SessionsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await securityAPI.getSessions();
      const payload = response?.data?.data ?? response?.data ?? {};
      const results = Array.isArray(payload?.results) ? payload.results : [];
      setSessions(results);
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
      Alert.alert('Sessions', 'Unable to load active sessions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionKey: string) => {
    Alert.alert('Revoke Session', 'Sign out of this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            setRevoking(sessionKey);
            await securityAPI.revokeSession(sessionKey);
            await fetchSessions();
          } catch (error: any) {
            Alert.alert('Revoke Failed', error?.response?.data?.detail || 'Unable to revoke session.');
          } finally {
            setRevoking(null);
          }
        },
      },
    ]);
  };

  const handleRevokeAll = () => {
    Alert.alert(
      'Sign Out All Sessions',
      'This will sign you out of all devices. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            try {
              setRevoking('all');
              await securityAPI.revokeSession(undefined, true);
              await fetchSessions();
            } catch (error: any) {
              Alert.alert('Revoke Failed', error?.response?.data?.detail || 'Unable to revoke sessions.');
            } finally {
              setRevoking(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Sessions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          fetchSessions();
        }} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Sessions</Text>
          <View style={styles.card}>
            {sessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="laptop" size={36} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>No active sessions</Text>
                <Text style={styles.emptySubtitle}>You're signed in on this device only.</Text>
              </View>
            ) : (
              sessions.map((session, index) => (
                <View key={session.session_key}>
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionIcon}>
                      <Icon name="laptop" size={18} color={colors.primary[500]} />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle}>{session.user_agent || 'Unknown device'}</Text>
                      <Text style={styles.sessionMeta}>IP: {session.ip_address || 'Unknown'}</Text>
                      <Text style={styles.sessionMeta}>Last active: {formatDate(session.last_activity)}</Text>
                      <Text style={styles.sessionMeta}>Expires: {formatDate(session.expires_at)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.revokeButton}
                      onPress={() => handleRevokeSession(session.session_key)}
                      disabled={revoking === session.session_key}
                    >
                      <Text style={styles.revokeText}>
                        {revoking === session.session_key ? '...' : 'Revoke'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {index < sessions.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </View>
        </View>

        {sessions.length > 1 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.revokeAllButton, revoking === 'all' && styles.revokeAllDisabled]}
              onPress={handleRevokeAll}
              disabled={revoking === 'all'}
            >
              <Text style={styles.revokeAllText}>
                {revoking === 'all' ? 'Signing Out...' : 'Sign Out All Sessions'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[3],
    fontSize: 14,
    color: colors.text.secondary,
  },
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  section: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  sessionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  sessionMeta: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  revokeButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '15',
  },
  revokeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing[4] + 38 + spacing[3],
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing[6],
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing[3],
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  revokeAllButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  revokeAllDisabled: {
    opacity: 0.7,
  },
  revokeAllText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: spacing[16],
  },
});

export default SessionsScreen;
