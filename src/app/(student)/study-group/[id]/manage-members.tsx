// Study Group Manage Members Screen for CampusHub
// Admin can manage group members here

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../../../theme/colors';
import { spacing, borderRadius } from '../../../../theme/spacing';
import Icon from '../../../../components/ui/Icon';
import { studyGroupsAPI } from '../../../../services/api';

interface Member {
  id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar?: string;
    email: string;
  };
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
}

const ManageMembersScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    fetchMembers();
  }, [id]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await studyGroupsAPI.getMembers(id || '');
      const data = response.data.data || response.data;
      setMembers(data.results || data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMembers();
    setRefreshing(false);
  };

  const handleRemoveMember = (member: Member) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user.first_name} ${member.user.last_name} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await studyGroupsAPI.removeMember(id, member.user.id);
              Alert.alert('Success', 'Member removed successfully');
              fetchMembers();
            } catch (err: any) {
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = (member: Member, newRole: 'admin' | 'moderator' | 'member') => {
    Alert.alert(
      'Change Role',
      `Change ${member.user.first_name}'s role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await studyGroupsAPI.updateMemberRole(id, member.user.id, { role: newRole });
              Alert.alert('Success', 'Role updated successfully');
              fetchMembers();
            } catch (err: any) {
              Alert.alert('Error', 'Failed to update role');
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return colors.primary[500];
      case 'moderator':
        return colors.warning;
      default:
        return colors.text.tertiary;
    }
  };

  const renderMember = ({ item }: { item: Member }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <View style={styles.avatar}>
          {item.user.avatar ? (
            <Icon name="person-circle" size={40} color={colors.text.tertiary} />
          ) : (
            <Text style={styles.avatarText}>
              {item.user.first_name[0]}{item.user.last_name[0]}
            </Text>
          )}
        </View>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>
            {item.user.first_name} {item.user.last_name}
          </Text>
          <Text style={styles.memberEmail}>{item.user.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) + '20' }]}>
            <Text style={[styles.roleText, { color: getRoleBadgeColor(item.role) }]}>
              {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.memberActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            const roles: ('admin' | 'moderator' | 'member')[] = ['admin', 'moderator', 'member'];
            const currentIndex = roles.indexOf(item.role);
            const nextRole = roles[(currentIndex + 1) % roles.length];
            handleChangeRole(item, nextRole);
          }}
        >
          <Icon name="person-add" size={18} color={colors.primary[500]} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleRemoveMember(item)}
        >
          <Icon name="trash" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Manage Members</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[500]]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="people" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No members found</Text>
          </View>
        }
      />
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
  listContent: {
    padding: spacing[4],
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[700],
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  memberEmail: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing[2],
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing[10],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: spacing[3],
  },
});

export default ManageMembersScreen;
