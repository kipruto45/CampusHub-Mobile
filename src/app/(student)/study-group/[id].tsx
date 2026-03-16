// Study Group Detail Screen for CampusHub
// View and manage a specific study group

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, FlatList, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import Avatar from '../../../components/ui/Avatar';
import { studyGroupsAPI } from '../../../services/api';
import { resourcesAPI } from '../../../services/api';
import InviteLinkCard from '../../../components/social/InviteLinkCard';
import CreateInviteLinkSheet, { CreateLinkData } from '../../../components/social/CreateInviteLinkSheet';
import Tooltip from '../../../components/ui/Tooltip';
import { useAuthStore } from '../../../store/auth.store';

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
  privacy: string;
  allow_member_invites: boolean;
  member_count: number;
  max_members: number;
  created_by: { id: string; first_name: string; last_name: string };
  created_at: string;
  is_member: boolean;
  my_role?: string;
}

interface InviteLink {
  id: string;
  token: string;
  invite_link: string;
  url: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  notes: string | null;
  created_by_name: string;
}

const StudyGroupDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<StudyGroupMember[]>([]);
  const [posts, setPosts] = useState<StudyGroupPost[]>([]);
  const [resources, setResources] = useState<StudyGroupResource[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'resources' | 'invites'>('posts');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  
  // Invite Link State
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [showCreateLinkSheet, setShowCreateLinkSheet] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  // Share Resource State
  const [showShareResourceSheet, setShowShareResourceSheet] = useState(false);
  const [userResources, setUserResources] = useState<any[]>([]);
  const [loadingUserResources, setLoadingUserResources] = useState(false);

  // Comment State
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const canManageInvites = group?.my_role === 'admin' || group?.my_role === 'moderator';

  const fetchGroupDetails = useCallback(async () => {
    try {
      const response = await studyGroupsAPI.get(id);
      setGroup(response.data.data);
      
      const [membersRes, postsRes, resourcesRes] = await Promise.all([
        studyGroupsAPI.getMembers(id),
        studyGroupsAPI.getPosts(id),
        studyGroupsAPI.getResources(id),
      ]);
      
      setMembers(membersRes.data.data?.results || membersRes.data.data || []);
      setPosts(postsRes.data.data?.results || postsRes.data.data || []);
      setResources(resourcesRes.data.data?.results || resourcesRes.data.data || []);
      
      // Fetch invite links if user can manage them
      if (group?.my_role === 'admin' || group?.my_role === 'moderator') {
        try {
          const linksRes = await studyGroupsAPI.getInviteLinks(id);
          setInviteLinks(linksRes.data.data || []);
        } catch (e) {
          // Ignore invite links fetch error
        }
      }
    } catch (err) {
      console.error('Failed to fetch group details:', err);
      Alert.alert('Error', 'Failed to load group details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, group?.my_role]);

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

  const handleLikePost = async (postId: string) => {
    try {
      const response = await studyGroupsAPI.likePost(id, postId);
      const { likes_count, liked } = response.data.data;
      
      // Update the post in the posts list
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, likes_count } 
          : post
      ));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to like post');
    }
  };

  const handleCommentPost = async (postId: string, content: string) => {
    if (!content.trim()) return;
    
    setSubmittingComment(true);
    try {
      await studyGroupsAPI.createPostComment(id, postId, { content });
      
      // Update the post comments count
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, comments_count: post.comments_count + 1 } 
          : post
      ));
      
      // Close modal and reset
      setShowCommentModal(false);
      setCommentingPostId(null);
      setCommentText('');
      Alert.alert('Success', 'Comment added!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const openCommentModal = (postId: string) => {
    setCommentingPostId(postId);
    setCommentText('');
    setShowCommentModal(true);
  };

  const fetchInviteLinks = async () => {
    try {
      const response = await studyGroupsAPI.getInviteLinks(id);
      setInviteLinks(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch invite links:', err);
    }
  };

  const fetchUserResources = async () => {
    setLoadingUserResources(true);
    try {
      const response = await resourcesAPI.list({ scope: 'my', page: 1 });
      setUserResources(response.data.data?.results || response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch user resources:', err);
    } finally {
      setLoadingUserResources(false);
    }
  };

  const handleOpenShareResource = async () => {
    await fetchUserResources();
    setShowShareResourceSheet(true);
  };

  const handleShareResource = async (resourceId: string) => {
    try {
      await studyGroupsAPI.shareResource(id, { resource_id: resourceId });
      Alert.alert('Success', 'Resource shared successfully!');
      setShowShareResourceSheet(false);
      fetchGroupDetails();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to share resource');
    }
  };

  const handleCreateInviteLink = async (data: CreateLinkData) => {
    setCreatingLink(true);
    try {
      await studyGroupsAPI.createInviteLink(id, data);
      await fetchInviteLinks();
      Alert.alert('Success', 'Invite link created successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create invite link');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleRevokeInviteLink = async (linkId: string) => {
    try {
      await studyGroupsAPI.revokeInviteLink(linkId);
      await fetchInviteLinks();
      Alert.alert('Success', 'Invite link revoked successfully');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to revoke invite link');
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
        <View style={styles.headerActions}>
          <Tooltip 
            title="How to Share Resources"
            content="Tap the upload icon to share your uploaded resources with this group. Go to the Resources tab to see shared resources. Only resources you've uploaded can be shared."
            iconName="information-circle"
          />
          {group?.is_member && (
            <TouchableOpacity 
              onPress={handleOpenShareResource} 
              style={styles.headerAction}
            >
              <Icon name="cloud-upload" size={22} color={colors.text.inverse} />
            </TouchableOpacity>
          )}
          {canManageInvites && (
            <TouchableOpacity 
              onPress={() => setShowCreateLinkSheet(true)} 
              style={styles.headerAction}
            >
              <Icon name="person-add" size={22} color={colors.text.inverse} />
            </TouchableOpacity>
          )}
        </View>
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
            {group?.privacy !== 'public' && (
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
                {canManageInvites && (
                  <TouchableOpacity
                    style={styles.inviteButton}
                    onPress={() => {
                      fetchInviteLinks();
                      setActiveTab('invites');
                    }}
                  >
                    <Icon name="link" size={18} color={colors.primary[500]} />
                    <Text style={styles.inviteButtonText}>Invite</Text>
                  </TouchableOpacity>
                )}
                {group?.my_role === 'admin' && (
                  <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => router.push(`/(student)/study-group/${id}/manage`)}
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
          {canManageInvites && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'invites' && styles.activeTab]}
              onPress={() => {
                fetchInviteLinks();
                setActiveTab('invites');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'invites' && styles.activeTabText]}>
                Invites ({inviteLinks.length})
              </Text>
            </TouchableOpacity>
          )}
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
                    <Icon name="send" size={18} color={colors.text.inverse} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {posts.length > 0 ? (
              posts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.postAuthorAvatar}>
                      <Avatar
                        source={post.author?.avatar}
                        name={`${post.author?.first_name || ''} ${post.author?.last_name || ''}`.trim()}
                        sizePx={40}
                        cacheKey={`study-post-${post.author?.id || 'unknown'}`}
                      />
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
                    <TouchableOpacity 
                      style={styles.postAction}
                      onPress={() => handleLikePost(post.id)}
                    >
                      <Icon name="heart-outline" size={18} color={colors.text.secondary} />
                      <Text style={styles.postActionText}>{post.likes_count}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.postAction}
                      onPress={() => openCommentModal(post.id)}
                    >
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
                    <Avatar
                      source={member.user?.avatar}
                      name={`${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim()}
                      sizePx={48}
                      cacheKey={`study-member-${member.user?.id || 'unknown'}`}
                    />
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
            {/* Share Resource Button */}
            {group?.is_member && (
              <TouchableOpacity 
                style={styles.createLinkButton}
                onPress={handleOpenShareResource}
              >
                <View style={[styles.createLinkIcon, { backgroundColor: colors.primary[50] }]}>
                  <Icon name="share-social" size={24} color={colors.primary[500]} />
                </View>
                <View style={styles.createLinkInfo}>
                  <Text style={styles.createLinkTitle}>Share Resource</Text>
                  <Text style={styles.createLinkText}>
                    Share your uploaded resources with this group
                  </Text>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}

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

        {activeTab === 'invites' && canManageInvites && (
          <View style={styles.tabContent}>
            {/* Create Link Button */}
            <TouchableOpacity 
              style={styles.createLinkButton}
              onPress={() => setShowCreateLinkSheet(true)}
            >
              <View style={styles.createLinkIcon}>
                <Icon name="add" size={24} color={colors.primary[500]} />
              </View>
              <View style={styles.createLinkInfo}>
                <Text style={styles.createLinkTitle}>Create Invite Link</Text>
                <Text style={styles.createLinkText}>
                  Generate a new link for others to join
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            {/* Invite Links List */}
            {inviteLinks.length > 0 ? (
              inviteLinks.map((link) => (
                <InviteLinkCard
                  key={link.id}
                  link={link}
                  onRevoke={handleRevokeInviteLink}
                  onUpdate={() => fetchInviteLinks()}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="link" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>No Invite Links</Text>
                <Text style={styles.emptyText}>
                  Create an invite link to share with others
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Create Invite Link Sheet */}
      <CreateInviteLinkSheet
        visible={showCreateLinkSheet}
        onClose={() => setShowCreateLinkSheet(false)}
        onCreate={handleCreateInviteLink}
      />

      {/* Share Resource Modal */}
      <Modal
        visible={showShareResourceSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShareResourceSheet(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowShareResourceSheet(false)}>
              <Icon name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share Resource</Text>
            <View style={{ width: 24 }} />
          </View>

          {loadingUserResources ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
          ) : userResources.length > 0 ? (
            <ScrollView style={styles.modalContent}>
              {userResources.map((resource) => (
                <TouchableOpacity
                  key={resource.id}
                  style={styles.resourceSelectCard}
                  onPress={() => handleShareResource(resource.id)}
                >
                  <View style={[styles.resourceIcon, { backgroundColor: colors.primary[50] }]}>
                    <Icon name="document-text" size={24} color={colors.primary[500]} />
                  </View>
                  <View style={styles.resourceInfo}>
                    <Text style={styles.resourceTitle} numberOfLines={2}>
                      {resource.title}
                    </Text>
                    <Text style={styles.resourceMeta}>
                      {resource.resource_type} • {resource.course_name || 'No course'}
                    </Text>
                  </View>
                  <Icon name="add-circle" size={24} color={colors.primary[500]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="document-text" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No Resources</Text>
              <Text style={styles.emptyText}>
                You haven't uploaded any resources yet
              </Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => {
                  setShowShareResourceSheet(false);
                  router.push('/(student)/upload-resource');
                }}
              >
                <Text style={styles.uploadButtonText}>Upload Resource</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCommentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCommentModal(false)}>
              <Icon name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Comment</Text>
            <TouchableOpacity 
              onPress={() => handleCommentPost(commentingPostId!, commentText)}
              disabled={!commentText.trim() || submittingComment}
            >
              <Text style={[
                styles.sendButton,
                (!commentText.trim() || submittingComment) && styles.sendButtonDisabled
              ]}>
                {submittingComment ? 'Posting...' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write your comment..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              value={commentText}
              onChangeText={setCommentText}
              autoFocus
            />
          </View>
        </View>
      </Modal>
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
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
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
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  inviteButtonText: {
    color: colors.primary[500],
    fontWeight: '600',
    fontSize: 15,
  },
  createLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderStyle: 'dashed',
  },
  createLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  createLinkInfo: {
    flex: 1,
  },
  createLinkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  createLinkText: {
    fontSize: 13,
    color: colors.text.secondary,
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
  // Share Resource Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: spacing[4],
  },
  resourceSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  uploadButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.md,
    marginTop: spacing[4],
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sendButton: {
    color: colors.primary[500],
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonDisabled: {
    color: colors.text.tertiary,
  },
  commentInputContainer: {
    flex: 1,
    padding: spacing[4],
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 120,
  },
});

export default StudyGroupDetailScreen;
