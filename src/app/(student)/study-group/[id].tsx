// Study Group Detail Screen for CampusHub
// View and manage a specific study group

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import { studyGroupsAPI } from '../../../services/api';

interface StudyGroupPost {
  id: string;
  title: string;
  content: string;
  author: { id: string; first_name: string; last_name: string; avatar?: string };
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface StudyGroupResource {
  id: string;
  title: string;
  resource_type: string;
  uploaded_by: { first_name: string; last_name: string };
  created_at: string;
}

interface StudyGroupMember {
  id: string;
  user: { id: string; first_name: string; last_name: string; avatar?: string };
  role: string;
  joined_at: string;
}

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  course?: { id: string; name: string };
  is_private: boolean;
  member_count: number;
  created_by: { id: string; first_name: string; last_name: string };
  created_at: string;
  is_member: boolean;
  my_role?: string;
}

const StudyGroupDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<StudyGroupMember[]>([]);
  const [posts, setPosts] = useState<StudyGroupPost[]>([]);
  const [resources, setResources] = useState<StudyGroupResource[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'resources'>('posts');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchGroupDetails = useCallback(async () => {
    try {
      const response = await studyGroupsAPI.get(id);
      setGroup(response.data);
      
      const [membersRes, postsRes] = await Promise.all([
        studyGroupsAPI.getMembers(id),
        studyGroupsAPI.getPosts(id),
      ]);
      
      setMembers(membersRes.data.results || membersRes.data);
      setPosts(postsRes.data.results || postsRes.data);
      setResources([]);
    } catch (err) {
      console.error('Failed to fetch group details:', err);
      Alert.alert('Error', 'Failed to load group details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGroupDetails();
  };

  const handleJoinGroup = async () => {
    try {
      await studyGroupsAPI.join(id);
      Alert.alert('Success', 'You have joined the group!');
      fetchGroupDetails();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to join group');
    }
  };

  const handleLeaveGroup = async () => {
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
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    
    setPosting(true);
    try {
      await studyGroupsAPI.createPost(id, { title: newPostTitle, content: newPostContent });
      setNewPostTitle('');
      setNewPostContent('');
      fetchGroupDetails();
      Alert.alert('Success', 'Post created successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return colors.error;
      case 'moderator': return colors.warning;
      default: return colors.primary[500];
    }
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {group?.name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.groupInfoCard}>
          <View style={styles.groupHeader}>
            <View style={styles.groupIcon}>
              <Icon name="people" size={32} color={colors.primary[500]} />
            </View>
            <View style={styles.groupDetails}>
              <Text style={styles.groupName}>{group?.name}</Text>
              <View style={styles.groupMeta}>
                <Icon name="person" size={14} color={colors.text.secondary} />
                <Text style={styles.groupMetaText}>
                  {group?.member_count} members
                </Text>
                {group?.course && (
                  <>
                    <Text style={styles.groupMetaDot}>•</Text>
                    <Text style={styles.groupMetaText}>{group.course.name}</Text>
                  </>
                )}
              </View>
            </View>
            {group?.is_private && (
              <View style={styles.privateBadge}>
                <Icon name="lock-closed" size={14} color={colors.text.secondary} />
              </View>
            )}
          </View>
          
          <Text style={styles.groupDescription}>
            {group?.description || 'No description provided.'}
          </Text>

          <View style={styles.actionButtons}>
            {group?.is_member ? (
              <>
                <TouchableOpacity
                  style={styles.leaveButton}
                  onPress={handleLeaveGroup}
                >
                  <Icon name="log-out" size={18} color={colors.error} />
                  <Text style={styles.leaveButtonText}>Leave Group</Text>
                </TouchableOpacity>
                {group?.my_role === 'admin' && (
                  <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => Alert.alert('Coming Soon', 'Group management coming soon!')}
                  >
                    <Icon name="settings" size={18} color={colors.primary[500]} />
                    <Text style={styles.manageButtonText}>Manage</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={handleJoinGroup}
              >
                <Icon name="person-add" size={18} color={colors.text.inverse} />
                <Text style={styles.joinButtonText}>Join Group</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
              Posts ({posts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.activeTab]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
              Members ({members.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'resources' && styles.activeTab]}
            onPress={() => setActiveTab('resources')}
          >
            <Text style={[styles.tabText, activeTab === 'resources' && styles.activeTabText]}>
              Resources ({resources.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'posts' && (
          <View style={styles.tabContent}>
            {group?.is_member && (
              <View style={styles.createPostCard}>
                <TextInput
                  style={styles.postTitleInput}
                  placeholder="Post title..."
                  placeholderTextColor={colors.text.tertiary}
                  value={newPostTitle}
                  onChangeText={setNewPostTitle}
                />
                <TextInput
                  style={styles.postInput}
                  placeholder="Share something with the group..."
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                />
                <TouchableOpacity
                  style={[styles.postButton, (!newPostTitle.trim() || !newPostContent.trim() || posting) && styles.postButtonDisabled]}
                  onPress={handleCreatePost}
                  disabled={!newPostTitle.trim() || !newPostContent.trim() || posting}
                >
                  {posting ? (
                    <ActivityIndicator size="small" color={colors.text.inverse} />
                  ) : (
                    <Icon name="arrow-forward" size={18} color={colors.text.inverse} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {posts.length > 0 ? (
              posts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.postAuthorAvatar}>
                      <Icon name="person" size={20} color={colors.text.secondary} />
                    </View>
                    <View style={styles.postAuthorInfo}>
                      <Text style={styles.postAuthorName}>
                        {post.author.first_name} {post.author.last_name}
                      </Text>
                      <Text style={styles.postDate}>{formatDate(post.created_at)}</Text>
                    </View>
                  </View>
                  {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
                  <Text style={styles.postContent}>{post.content}</Text>
                  <View style={styles.postActions}>
                    <TouchableOpacity style={styles.postAction}>
                      <Icon name="heart-outline" size={18} color={colors.text.secondary} />
                      <Text style={styles.postActionText}>{post.likes_count}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.postAction}>
                      <Icon name="chatbubble" size={18} color={colors.text.secondary} />
                      <Text style={styles.postActionText}>{post.comments_count}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="chatbubbles" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>No Posts Yet</Text>
                <Text style={styles.emptyText}>
                  {group?.is_member 
                    ? 'Be the first to share something!' 
                    : 'Join the group to see posts'}
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'members' && (
          <View style={styles.tabContent}>
            {members.length > 0 ? (
              members.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Icon name="person" size={24} color={colors.text.secondary} />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.user.first_name} {member.user.last_name}
                    </Text>
                    <Text style={styles.memberJoined}>
                      Joined {formatDate(member.joined_at)}
                    </Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(member.role) + '20' }]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleBadgeColor(member.role) }]}>
                      {member.role}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="people" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>No Members</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'resources' && (
          <View style={styles.tabContent}>
            {resources.length > 0 ? (
              resources.map((resource) => (
                <TouchableOpacity 
                  key={resource.id} 
                  style={styles.resourceCard}
                  onPress={() => router.push(`/(student)/resource/${resource.id}`)}
                >
                  <View style={[styles.resourceIcon, { backgroundColor: colors.primary[50] }]}>
                    <Icon name="document-text" size={24} color={colors.primary[500]} />
                  </View>
                  <View style={styles.resourceInfo}>
                    <Text style={styles.resourceTitle} numberOfLines={2}>
                      {resource.title}
                    </Text>
                    <Text style={styles.resourceMeta}>
                      {resource.uploaded_by.first_name} {resource.uploaded_by.last_name} • {formatDate(resource.created_at)}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="document-text" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>No Resources</Text>
                <Text style={styles.emptyText}>
                  Share learning resources with your group
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.primary[500],
  },
  backButton: {
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
    color: colors.text.inverse,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  groupInfoCard: {
    backgroundColor: colors.background.primary,
    margin: 16,
    padding: 24,
    borderRadius: 12,
    ...shadows.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupDetails: {
    flex: 1,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupMetaText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  groupMetaDot: {
    marginHorizontal: 8,
    color: colors.text.tertiary,
  },
  privateBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  joinButtonText: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 15,
  },
  leaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '15',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  leaveButtonText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 15,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  manageButtonText: {
    color: colors.primary[500],
    fontWeight: '600',
    fontSize: 15,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    padding: 4,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.text.inverse,
  },
  tabContent: {
    padding: 16,
  },
  createPostCard: {
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...shadows.sm,
  },
  postTitleInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 8,
  },
  postInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text.primary,
    maxHeight: 100,
  },
  postButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  postButtonDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  postCard: {
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...shadows.sm,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  postDate: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  postContent: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postActionText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    ...shadows.sm,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  memberJoined: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    ...shadows.sm,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  resourceMeta: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default StudyGroupDetailScreen;
