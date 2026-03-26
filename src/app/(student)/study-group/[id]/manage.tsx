// Study Group Manage Screen for CampusHub
// Admin management options for study groups

import { useLocalSearchParams,useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,Alert,ScrollView,StyleSheet,Switch,Text,TouchableOpacity,View } from 'react-native';
import Icon from '../../../../components/ui/Icon';
import { studyGroupsAPI } from '../../../../services/api';
import { colors } from '../../../../theme/colors';
import { borderRadius,spacing } from '../../../../theme/spacing';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  privacy: string;
  allow_member_invites: boolean;
  is_member: boolean;
  my_role?: string;
}

const StudyGroupManageScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchGroupDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await studyGroupsAPI.get(id || '');
      const data = response.data.data || response.data;
      setGroup(data);
    } catch (_err: any) {
      Alert.alert('Error', 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  const handleTogglePrivacy = async (value: boolean) => {
    if (!group) return;
    setSaving(true);
    try {
      const newPrivacy = value ? 'private' : 'public';
      await studyGroupsAPI.update(id, { privacy: newPrivacy });
      setGroup({ ...group, privacy: newPrivacy });
      Alert.alert('Success', `Group is now ${newPrivacy}`);
    } catch (_err: any) {
      Alert.alert('Error', 'Failed to update privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleInvites = async (value: boolean) => {
    if (!group) return;
    setSaving(true);
    try {
      await studyGroupsAPI.update(id, { allow_member_invites: value });
      setGroup({ ...group, allow_member_invites: value });
      Alert.alert('Success', value ? 'Members can now invite others' : 'Only admins can invite members');
    } catch (_err: any) {
      Alert.alert('Error', 'Failed to update invite settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await studyGroupsAPI.delete(id);
              Alert.alert('Success', 'Group deleted successfully');
              router.replace('/(student)/study-groups');
            } catch (_err: any) {
              Alert.alert('Error', 'Failed to delete group');
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await studyGroupsAPI.leave(id);
              Alert.alert('Success', 'You have left the group');
              router.replace('/(student)/study-groups');
            } catch (_err: any) {
              Alert.alert('Error', 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Group</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{group?.name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Privacy</Text>
              <Text style={styles.infoValue}>{group?.privacy === 'private' ? 'Private' : 'Public'}</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Private Group</Text>
                <Text style={styles.settingDescription}>
                  When enabled, only invited members can join
                </Text>
              </View>
              <Switch
                value={group?.privacy === 'private'}
                onValueChange={handleTogglePrivacy}
                trackColor={{ true: colors.primary[500] }}
                thumbColor="#FFFFFF"
                disabled={saving}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Allow Member Invites</Text>
                <Text style={styles.settingDescription}>
                  Let members invite others to the group
                </Text>
              </View>
              <Switch
                value={group?.allow_member_invites}
                onValueChange={handleToggleInvites}
                trackColor={{ true: colors.primary[500] }}
                thumbColor="#FFFFFF"
                disabled={saving}
              />
            </View>
          </View>
        </View>

        {/* Member Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push(`/(student)/study-group/${id}/manage-members`)}
          >
            <View style={styles.menuRow}>
              <Icon name="people" size={20} color={colors.text.primary} />
              <Text style={styles.menuText}>Manage Members</Text>
              <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.error }]}>Danger Zone</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuRow} onPress={handleLeaveGroup}>
              <Icon name="log-out" size={20} color={colors.warning} />
              <Text style={[styles.menuText, { color: colors.warning }]}>Leave Group</Text>
            </TouchableOpacity>
            {group?.my_role === 'admin' && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.menuRow} onPress={handleDeleteGroup}>
                  <Icon name="trash" size={20} color={colors.error} />
                  <Text style={[styles.menuText, { color: colors.error }]}>Delete Group</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
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
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing[4],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing[2],
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing[4],
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    marginLeft: spacing[3],
  },
  bottomSpacing: {
    height: spacing[10],
  },
});

export default StudyGroupManageScreen;
