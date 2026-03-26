// Group Invite Screen - Handle invite link opening
// CampusHub Mobile App

import { Stack,useLocalSearchParams,useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,Alert,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import Icon from '../../components/ui/Icon';
import { studyGroupsAPI } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

interface GroupInfo {
  id: string;
  name: string;
  description: string;
  course: string | null;
  unit: string | null;
  privacy: string;
  member_count: number;
  max_members: number;
}

export default function GroupInviteScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [validation, setValidation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user is active
  const isUserActive = user?.is_active !== false;

  const validateInvite = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await studyGroupsAPI.validateInviteLink(token!);
      const data = response.data?.data || response.data || {};

      setValidation(data);
      if (data.valid && data.group) {
        setGroupInfo(data.group);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to validate invite link');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void validateInvite();
    } else {
      setLoading(false);
      setValidation(null);
      setGroupInfo(null);
    }
  }, [token, validateInvite]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please log in to join this study group',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    // Check if user is active
    if (!isUserActive) {
      Alert.alert(
        'Account Inactive',
        'Your account is not active. Please contact support.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setJoining(true);
      const response = await studyGroupsAPI.joinViaInvite(token!);
      const data = response.data?.data || response.data || {};

      if (data.success) {
        Alert.alert(
          'Success!',
          data.message,
          [{ text: 'OK', onPress: () => router.push(`/(student)/study-group/${groupInfo?.id}` as any) }]
        );
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  const handleLoginAndJoin = async () => {
    router.push({
      pathname: '/(auth)/login',
      params: token ? { redirect: `/group-invite?token=${token}` } : {},
    });
  };

  if (!token) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Icon name="mail-unread" size={64} color={colors.primary[500]} />
          </View>
          <Text style={styles.errorTitle}>Open a Group Invite</Text>
          <Text style={styles.errorMessage}>
            Group invite links open here automatically. If you do not have a token yet, browse your study groups or ask for a fresh invite link.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(student)/study-groups')}
          >
            <Text style={styles.primaryButtonText}>Browse Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(student)/create-study-group')}
          >
            <Text style={styles.secondaryButtonText}>Create a Group</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Validating invite link...</Text>
        </View>
      </View>
    );
  }

  if (error || !validation?.valid) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Icon name="close-circle" size={64} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Invalid Invite</Text>
          <Text style={styles.errorMessage}>
            {validation?.message || error || 'This invite link is invalid or has expired'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(student)/study-groups')}
          >
            <Text style={styles.primaryButtonText}>Browse Groups</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (validation?.already_member) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <Icon name="checkmark-circle" size={64} color={colors.success} />
          </View>
          <Text style={styles.alreadyMemberTitle}>You're a Member!</Text>
          <Text style={styles.alreadyMemberText}>
            You are already a member of {groupInfo?.name}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push(`/(student)/study-group/${groupInfo?.id}` as any)}
          >
            <Text style={styles.primaryButtonText}>Open Group</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        {/* Group Preview Card */}
        <View style={styles.previewCard}>
          <View style={styles.groupIcon}>
            <Icon name="people" size={40} color={colors.primary[500]} />
          </View>

          <Text style={styles.groupName}>{groupInfo?.name}</Text>

          {groupInfo?.course && (
            <Text style={styles.courseText}>{groupInfo.course}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Icon name="people" size={18} color={colors.text.secondary} />
              <Text style={styles.statText}>
                {groupInfo?.member_count}/{groupInfo?.max_members} members
              </Text>
            </View>

            <View style={styles.privacyBadge}>
              <Icon
                name={groupInfo?.privacy === 'public' ? 'globe' : groupInfo?.privacy === 'private' ? 'lock-closed' : 'mail'}
                size={14}
                color={colors.primary[500]}
              />
              <Text style={styles.privacyText}>
                {groupInfo?.privacy === 'public' ? 'Public' :
                 groupInfo?.privacy === 'private' ? 'Private' : 'Invite Only'}
              </Text>
            </View>
          </View>

          {groupInfo?.description && (
            <Text style={styles.description} numberOfLines={3}>
              {groupInfo.description}
            </Text>
          )}
        </View>

        {/* Join Status */}
        <View style={styles.joinStatus}>
          {validation?.can_join_directly ? (
            <View style={styles.statusSuccess}>
              <Icon name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.statusText}>
                You can join this group directly
              </Text>
            </View>
          ) : (
            <View style={styles.statusPending}>
              <Icon name="time" size={24} color={colors.warning} />
              <Text style={styles.statusText}>
                Your join request will need approval
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isAuthenticated ? (
            <TouchableOpacity
              style={[styles.primaryButton, joining && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {validation?.can_join_directly ? 'Join Group' : 'Request to Join'}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleLoginAndJoin}
            >
              <Text style={styles.primaryButtonText}>Login to Join</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(student)/study-groups')}
          >
            <Text style={styles.secondaryButtonText}>Browse Groups</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: 16,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
    padding: spacing[5],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  errorIcon: {
    marginBottom: spacing[4],
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  errorMessage: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  alreadyMemberTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  alreadyMemberText: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  previewCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.md,
  },
  groupIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  courseText: {
    fontSize: 15,
    color: colors.primary[600],
    marginBottom: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  privacyBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
  },
  privacyText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  joinStatus: {
    marginTop: spacing[6],
    padding: spacing[4],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
  },
  statusSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  statusPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  statusText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  actions: {
    marginTop: 'auto',
    gap: spacing[3],
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  successIcon: {
    marginBottom: spacing[4],
  },
});
