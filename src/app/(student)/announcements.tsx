// Announcements Screen for CampusHub
// School-wide announcements with filters and details - Backend-driven

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, ScrollView, RefreshControl, ActivityIndicator, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { announcementsAPI } from '../../services/api';

// Announcement Types - matching backend response
interface Announcement {
  id: string;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
  priority: 'high' | 'medium' | 'low';
  is_read: boolean;
  is_pinned: boolean;
  category: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  attachment_size?: string;
}

// Filter Categories
const filterCategories = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'pinned', label: 'Pinned', icon: 'pin' },
  { key: 'unread', label: 'Unread', icon: 'mail-unread' },
  { key: 'important', label: 'Important', icon: 'alert-circle' },
];

const AnnouncementsScreen: React.FC = () => {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setError(null);
      const response = await announcementsAPI.list({ page: 1 });
      const data = response.data?.data?.results || response.data?.data || response.data || [];
      setAnnouncements(data);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setError(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.gray[500];
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Academic': return colors.primary[500];
      case 'System': return colors.error;
      case 'Facilities': return colors.info;
      case 'General': return colors.accent[500];
      default: return colors.gray[500];
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffHours < 24) {
        if (diffHours < 1) return 'Just now';
        return `${diffHours} hours ago`;
      }
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const unreadCount = announcements.filter(a => !a.is_read).length;
  const pinnedCount = announcements.filter(a => a.is_pinned).length;

  const filteredAnnouncements = announcements.filter(a => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!a.title.toLowerCase().includes(query) && 
          !a.content.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // Category filter
    if (activeFilter === 'pinned' && !a.is_pinned) return false;
    if (activeFilter === 'unread' && a.is_read) return false;
    if (activeFilter === 'important' && a.priority !== 'high') return false;
    
    return true;
  });

  const markAsRead = async (id: string) => {
    try {
      await announcementsAPI.get(id); // This marks as read in backend
      setAnnouncements(announcements.map(a => 
        a.id === id ? { ...a, is_read: true } : a
      ));
    } catch (err) {
      console.error('Error marking announcement as read:', err);
    }
  };

  const togglePin = async (id: string) => {
    try {
      // Optimistic update
      setAnnouncements(announcements.map(a => 
        a.id === id ? { ...a, is_pinned: !a.is_pinned } : a
      ));
    } catch (err) {
      console.error('Error toggling pin:', err);
      // Revert on error
      fetchAnnouncements();
    }
  };

  const openAnnouncement = (announcement: Announcement) => {
    if (!announcement.is_read) {
      markAsRead(announcement.id);
    }
    setSelectedAnnouncement(announcement);
    setShowDetailModal(true);
  };

  const handleDownloadAttachment = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Error', 'Unable to download attachment');
    }
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <TouchableOpacity 
      style={[styles.announcementCard, !item.is_read && styles.unreadCard]} 
      onPress={() => openAnnouncement(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {item.is_pinned && (
            <View style={styles.pinnedBadge}>
              <Icon name="pin" size={10} color={colors.primary[500]} />
            </View>
          )}
          <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
            <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
              {item.category}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.pinButton}
          onPress={() => togglePin(item.id)}
        >
          <Icon 
            name={item.is_pinned ? 'pin' : 'pin-outline'} 
            size={18} 
            color={item.is_pinned ? colors.primary[500] : colors.text.tertiary} 
          />
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.announcementTitle, !item.is_read && styles.unreadTitle]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.announcementContent} numberOfLines={2}>{item.content}</Text>
      
      <View style={styles.cardFooter}>
        <View style={styles.authorInfo}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorInitial}>{item.author_name?.[0] || 'A'}</Text>
          </View>
          <Text style={styles.authorName}>{item.author_name}</Text>
        </View>
        <Text style={styles.announcementDate}>{formatDate(item.created_at)}</Text>
      </View>
      
      {!item.is_read && <View style={styles.unreadBadge} />}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="megaphone" size={48} color={colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Announcements</Text>
      <Text style={styles.emptyText}>Check back later for updates</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Icon name="alert-circle" size={48} color={colors.error} />
      </View>
      <Text style={styles.errorTitle}>Unable to Load Announcements</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchAnnouncements}>
        <Icon name="refresh" size={18} color={colors.text.inverse} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
      <Text style={styles.loadingText}>Loading announcements...</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Announcements</Text>
          <View style={styles.placeholder} />
        </View>
        {renderLoading()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color={colors.text.tertiary} />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search announcements..." 
          value={searchQuery} 
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.text.tertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        {filterCategories.map((filter) => (
          <TouchableOpacity 
            key={filter.key} 
            style={[styles.filterChip, activeFilter === filter.key && styles.activeFilter]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Icon 
              name={filter.icon as any} 
              size={14} 
              color={activeFilter === filter.key ? colors.text.inverse : colors.text.secondary} 
            />
            <Text style={[styles.filterText, activeFilter === filter.key && styles.activeFilterText]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Icon name="pin" size={14} color={colors.primary[500]} />
          <Text style={styles.summaryText}>{pinnedCount} pinned</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Icon name="mail-unread" size={14} color={colors.error} />
          <Text style={styles.summaryText}>{unreadCount} unread</Text>
        </View>
      </View>

      {/* List */}
      {error ? (
        renderError()
      ) : (
        <FlatList
          data={filteredAnnouncements}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
              colors={[colors.primary[500]]}
            />
          }
        />
      )}

      {/* Announcement Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Icon name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Announcement</Text>
            <View style={styles.placeholder} />
          </View>
          
          {selectedAnnouncement && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalCardHeader}>
                <View style={styles.modalCardHeaderLeft}>
                  {selectedAnnouncement.is_pinned && (
                    <View style={styles.pinnedBadgeLarge}>
                      <Icon name="pin" size={12} color={colors.primary[500]} />
                      <Text style={styles.pinnedText}>Pinned</Text>
                    </View>
                  )}
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedAnnouncement.priority) + '20' }]}>
                    <View style={[styles.priorityDotLarge, { backgroundColor: getPriorityColor(selectedAnnouncement.priority) }]} />
                    <Text style={[styles.priorityText, { color: getPriorityColor(selectedAnnouncement.priority) }]}>
                      {selectedAnnouncement.priority.charAt(0).toUpperCase() + selectedAnnouncement.priority.slice(1)} Priority
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.pinButtonLarge}
                  onPress={() => togglePin(selectedAnnouncement.id)}
                >
                  <Icon 
                    name={selectedAnnouncement.is_pinned ? 'pin' : 'pin-outline'} 
                    size={22} 
                    color={selectedAnnouncement.is_pinned ? colors.primary[500] : colors.text.tertiary} 
                  />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalAnnouncementTitle}>{selectedAnnouncement.title}</Text>
              
              <View style={styles.modalAuthorSection}>
                <View style={styles.authorAvatarLarge}>
                  <Text style={styles.authorInitialLarge}>{selectedAnnouncement.author_name?.[0] || 'A'}</Text>
                </View>
                <View style={styles.modalAuthorInfo}>
                  <Text style={styles.modalAuthorName}>{selectedAnnouncement.author_name}</Text>
                  <Text style={styles.modalDate}>{formatDate(selectedAnnouncement.created_at)}</Text>
                </View>
                <View style={[styles.categoryBadgeLarge, { backgroundColor: getCategoryColor(selectedAnnouncement.category) + '20' }]}>
                  <Text style={[styles.categoryTextLarge, { color: getCategoryColor(selectedAnnouncement.category) }]}>
                    {selectedAnnouncement.category}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.modalAnnouncementContent}>{selectedAnnouncement.content}</Text>
              
              {selectedAnnouncement.attachment_url && (
                <TouchableOpacity 
                  style={styles.attachmentContainer}
                  onPress={() => handleDownloadAttachment(selectedAnnouncement.attachment_url!)}
                >
                  <View style={styles.attachmentIcon}>
                    <Icon name="document-text" size={24} color={colors.primary[500]} />
                  </View>
                  <View style={styles.attachmentInfo}>
                    <Text style={styles.attachmentName}>{selectedAnnouncement.attachment_name || 'Attachment'}</Text>
                    <Text style={styles.attachmentMeta}>
                      {selectedAnnouncement.attachment_type || 'File'} • {selectedAnnouncement.attachment_size || ''}
                    </Text>
                  </View>
                  <Icon name="download" size={20} color={colors.primary[500]} />
                </TouchableOpacity>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.shareButton}>
                  <Icon name="share-social" size={20} color={colors.primary[500]} />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.bookmarkButton}
                  onPress={() => togglePin(selectedAnnouncement.id)}
                >
                  <Icon 
                    name={selectedAnnouncement.is_pinned ? 'bookmark' : 'bookmark-outline'} 
                    size={20} 
                    color={selectedAnnouncement.is_pinned ? colors.warning : colors.text.secondary} 
                  />
                  <Text style={[styles.bookmarkButtonText, selectedAnnouncement.is_pinned && styles.bookmarkButtonTextActive]}>
                    {selectedAnnouncement.is_pinned ? 'Saved' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background.primary 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing[4], 
    paddingTop: spacing[10], 
    paddingBottom: spacing[4], 
    backgroundColor: colors.card.light, 
    ...shadows.sm 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  headerTitle: { 
    flex: 1, 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary, 
    textAlign: 'center' 
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  placeholder: { width: 40 },
  badge: { 
    backgroundColor: colors.error, 
    borderRadius: 12, 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    minWidth: 24, 
    alignItems: 'center' 
  },
  badgeText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: colors.text.inverse 
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.card.light, 
    marginHorizontal: spacing[4], 
    marginTop: spacing[4], 
    paddingHorizontal: spacing[4], 
    borderRadius: 14, 
    gap: spacing[2],
    ...shadows.sm 
  },
  searchInput: { 
    flex: 1, 
    paddingVertical: spacing[3], 
    fontSize: 15, 
    color: colors.text.primary,
  },
  filterContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: spacing[4], 
    paddingVertical: spacing[3], 
    gap: spacing[2] 
  },
  filterChip: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: 20,
    backgroundColor: colors.card.light,
    gap: spacing[1],
  },
  activeFilter: {
    backgroundColor: colors.primary[500],
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  activeFilterText: {
    color: colors.text.inverse,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.card.light,
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderRadius: 12,
    gap: spacing[3],
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  summaryText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border.light,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
    flexGrow: 1,
  },
  announcementCard: {
    backgroundColor: colors.card.light,
    borderRadius: 16,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pinnedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary[500] + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pinButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  unreadTitle: {
    fontWeight: '700',
  },
  announcementContent: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing[3],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInitial: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  authorName: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  announcementDate: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  unreadBadge: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 60 
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary, 
    marginBottom: spacing[2] 
  },
  emptyText: { 
    fontSize: 14, 
    color: colors.text.secondary 
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 60,
    paddingHorizontal: spacing[6],
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  errorTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary, 
    marginBottom: spacing[2] 
  },
  errorText: { 
    fontSize: 14, 
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 12,
    gap: spacing[2],
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[10],
    paddingBottom: spacing[4],
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
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
  modalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  modalCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  pinnedBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500] + '20',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[500],
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: 8,
    gap: spacing[1],
  },
  priorityDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pinButtonLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  modalAnnouncementTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[4],
    lineHeight: 28,
  },
  modalAuthorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  authorAvatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInitialLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  modalAuthorInfo: {
    flex: 1,
  },
  modalAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalDate: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  categoryBadgeLarge: {
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryTextLarge: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalAnnouncementContent: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 24,
    marginBottom: spacing[6],
  },
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    padding: spacing[4],
    borderRadius: 16,
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  attachmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[500] + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  attachmentMeta: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingBottom: spacing[10],
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500] + '20',
    padding: spacing[4],
    borderRadius: 14,
    gap: spacing[2],
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  bookmarkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card.light,
    padding: spacing[4],
    borderRadius: 14,
    gap: spacing[2],
  },
  bookmarkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  bookmarkButtonTextActive: {
    color: colors.warning,
  },
});

export default AnnouncementsScreen;
