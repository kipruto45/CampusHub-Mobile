// Announcements Screen for CampusHub
// School-wide announcements with filters and details - Backend-driven

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams,useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useRef,useState } from 'react';
import { ActivityIndicator,Alert,FlatList,Linking,Modal,RefreshControl,ScrollView,Share,StyleSheet,Text,TextInput,TouchableOpacity,View } from 'react-native';
import Icon from '../../components/ui/Icon';
import { announcementsAPI } from '../../services/api';
import { localDownloadsService } from '../../services/local-downloads.service';
import { useAuthStore } from '../../store/auth.store';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';

// Announcement Types - matching backend response
interface AnnouncementAttachment {
  id: string;
  file_url: string;
  filename: string;
  file_type: string;
  file_size: number;
  formatted_file_size: string;
  created_at: string;
}

interface Announcement {
  id: string;
  uuid?: string;
  slug?: string;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
  priority: 'high' | 'medium' | 'low';
  is_read: boolean;
  is_pinned: boolean;
  category: string;
  is_saved: boolean;
  attachments?: AnnouncementAttachment[];
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  attachment_size?: string;
}

const ANNOUNCEMENT_READ_STORAGE_PREFIX = '@campushub/announcements/read';
const ANNOUNCEMENT_SAVED_STORAGE_PREFIX = '@campushub/announcements/saved';

const buildAnnouncementStateKey = (prefix: string, userId?: string) =>
  `${prefix}/${userId || 'guest'}`;

const getRouteParamValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }
  return String(value || '').trim();
};

// Filter Categories
const filterCategories = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'saved', label: 'Saved', icon: 'bookmark-outline' },
  { key: 'unread', label: 'Unread', icon: 'mail-unread' },
  { key: 'important', label: 'Important', icon: 'alert-circle' },
];

const AnnouncementsScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ announcement?: string | string[] }>();
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [attachmentActionKey, setAttachmentActionKey] = useState<string | null>(null);
  const handledRouteAnnouncementRef = useRef<string>('');

  const readStorageKey = buildAnnouncementStateKey(ANNOUNCEMENT_READ_STORAGE_PREFIX, user?.id);
  const savedStorageKey = buildAnnouncementStateKey(ANNOUNCEMENT_SAVED_STORAGE_PREFIX, user?.id);
  const requestedAnnouncement = getRouteParamValue(params.announcement);

  const loadStoredIds = useCallback(async (storageKey: string): Promise<string[]> => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((value) => String(value)).filter(Boolean);
    } catch (err) {
      console.error('Error loading announcement state:', err);
      return [];
    }
  }, []);

  const saveStoredIds = useCallback(async (storageKey: string, ids: string[]) => {
    try {
      const uniqueIds = Array.from(new Set(ids.map((value) => String(value)).filter(Boolean)));
      await AsyncStorage.setItem(storageKey, JSON.stringify(uniqueIds));
    } catch (err) {
      console.error('Error saving announcement state:', err);
    }
  }, []);

  const syncSelectedAnnouncement = useCallback((nextAnnouncements: Announcement[]) => {
    setSelectedAnnouncement((current) => {
      if (!current) {
        return null;
      }

      return nextAnnouncements.find((announcement) => announcement.id === current.id) || current;
    });
  }, []);

  const setAnnouncementState = useCallback(
    (updater: (current: Announcement[]) => Announcement[]) => {
      setAnnouncements((current) => {
        const next = updater(current);
        syncSelectedAnnouncement(next);
        return next;
      });
    },
    [syncSelectedAnnouncement]
  );

  const mergeAnnouncementState = useCallback(
    async (items: Announcement[]) => {
      const [readIds, savedIds] = await Promise.all([
        loadStoredIds(readStorageKey),
        loadStoredIds(savedStorageKey),
      ]);
      const readSet = new Set(readIds);
      const savedSet = new Set(savedIds);

      return items.map((item) => ({
        ...item,
        is_read: item.is_read || readSet.has(item.id),
        is_saved: savedSet.has(item.id),
      }));
    },
    [loadStoredIds, readStorageKey, savedStorageKey]
  );

  const fetchAnnouncements = useCallback(async () => {
    try {
      setError(null);
      const response = await announcementsAPI.list({ page: 1 });
      const data = response.data?.data?.results || response.data?.data || response.data || [];
      const items = Array.isArray(data) ? data : [];
      const mergedAnnouncements = await mergeAnnouncementState(items);
      setAnnouncements(mergedAnnouncements);
      syncSelectedAnnouncement(mergedAnnouncements);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setError(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [mergeAnnouncementState, syncSelectedAnnouncement]);

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

  const formatRelativeDate = (dateString: string) => {
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

  const formatAbsoluteDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const formatAbsoluteTime = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const unreadCount = announcements.filter(a => !a.is_read).length;
  const pinnedCount = announcements.filter(a => a.is_pinned).length;
  const savedCount = announcements.filter(a => a.is_saved).length;

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
    if (activeFilter === 'saved' && !a.is_saved) return false;
    if (activeFilter === 'unread' && a.is_read) return false;
    if (activeFilter === 'important' && a.priority !== 'high') return false;
    
    return true;
  });

  const markAsRead = useCallback(async (id: string) => {
    setAnnouncementState((current) =>
      current.map((announcement) =>
        announcement.id === id ? { ...announcement, is_read: true } : announcement
      )
    );

    const readIds = await loadStoredIds(readStorageKey);
    if (!readIds.includes(id)) {
      await saveStoredIds(readStorageKey, [...readIds, id]);
    }
  }, [loadStoredIds, readStorageKey, saveStoredIds, setAnnouncementState]);

  const toggleSaved = useCallback(async (id: string) => {
    const announcement =
      announcements.find((item) => item.id === id) ||
      (selectedAnnouncement?.id === id ? selectedAnnouncement : null);

    if (!announcement) {
      return;
    }

    const nextSaved = !announcement.is_saved;
    setAnnouncementState((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_saved: nextSaved } : item
      )
    );

    const savedIds = new Set(await loadStoredIds(savedStorageKey));
    if (nextSaved) {
      savedIds.add(id);
    } else {
      savedIds.delete(id);
    }
    await saveStoredIds(savedStorageKey, Array.from(savedIds));
  }, [announcements, loadStoredIds, saveStoredIds, savedStorageKey, selectedAnnouncement, setAnnouncementState]);

  const openAnnouncement = useCallback((announcement: Announcement) => {
    if (!announcement.is_read) {
      void markAsRead(announcement.id);
    }
    setSelectedAnnouncement(
      announcement.is_read ? announcement : { ...announcement, is_read: true }
    );
    setShowDetailModal(true);
  }, [markAsRead]);

  const findAnnouncementByKey = useCallback(
    (key: string) =>
      announcements.find(
        (announcement) =>
          announcement.id === key || announcement.slug === key || announcement.uuid === key
      ) || null,
    [announcements]
  );

  const openAnnouncementFromRoute = useCallback(
    async (announcementKey: string) => {
      const normalizedKey = String(announcementKey || '').trim();
      if (!normalizedKey) {
        return;
      }

      const existingAnnouncement = findAnnouncementByKey(normalizedKey);
      if (existingAnnouncement) {
        openAnnouncement(existingAnnouncement);
        return;
      }

      try {
        const response = await announcementsAPI.get(normalizedKey);
        const payload = response.data?.data || response.data || null;
        const mergedAnnouncements = await mergeAnnouncementState(payload ? [payload] : []);
        const targetAnnouncement = mergedAnnouncements[0];

        if (!targetAnnouncement) {
          throw new Error('Announcement not found.');
        }

        setAnnouncementState((current) => {
          const remaining = current.filter((item) => item.id !== targetAnnouncement.id);
          return [targetAnnouncement, ...remaining];
        });
        openAnnouncement(targetAnnouncement);
      } catch (routeError) {
        console.error('Failed to open announcement from route:', routeError);
        Alert.alert(
          'Unable to open announcement',
          'This announcement could not be loaded right now.'
        );
      }
    },
    [findAnnouncementByKey, mergeAnnouncementState, openAnnouncement, setAnnouncementState]
  );

  useEffect(() => {
    if (!requestedAnnouncement) {
      handledRouteAnnouncementRef.current = '';
      return;
    }

    if (loading || handledRouteAnnouncementRef.current === requestedAnnouncement) {
      return;
    }

    handledRouteAnnouncementRef.current = requestedAnnouncement;
    void openAnnouncementFromRoute(requestedAnnouncement);
  }, [loading, openAnnouncementFromRoute, requestedAnnouncement]);

  const ensureAttachmentAvailable = useCallback(
    async (announcement: Announcement, attachment: AnnouncementAttachment) => {
      const remoteUrl = String(attachment.file_url || '').trim();
      if (!remoteUrl) {
        throw new Error('Attachment URL is unavailable.');
      }

      const downloadKey = `announcement-attachment:${announcement.uuid || announcement.id}:${
        attachment.id
      }`;

      await localDownloadsService.ensureLocalFile({
        key: downloadKey,
        remoteUrl,
        fileName: attachment.filename,
        title: attachment.filename || `${announcement.title} attachment`,
        fileType: attachment.file_type,
      });

      return downloadKey;
    },
    []
  );

  const handleViewAttachment = useCallback(
    async (announcement: Announcement, attachment: AnnouncementAttachment) => {
      const remoteUrl = String(attachment.file_url || '').trim();
      if (!remoteUrl) {
        Alert.alert('View unavailable', 'This attachment does not have a file URL yet.');
        return;
      }

      const actionKey = `view:${attachment.id}`;
      setAttachmentActionKey(actionKey);

      try {
        const downloadKey = await ensureAttachmentAvailable(announcement, attachment);
        await localDownloadsService.openLocalFile(downloadKey);
      } catch (_err) {
        try {
          await Linking.openURL(remoteUrl);
        } catch {
          Alert.alert('View failed', 'Unable to open this attachment right now.');
        }
      } finally {
        setAttachmentActionKey((current) => (current === actionKey ? null : current));
      }
    },
    [ensureAttachmentAvailable]
  );

  const handleDownloadAttachment = useCallback(
    async (announcement: Announcement, attachment: AnnouncementAttachment) => {
      const remoteUrl = String(attachment.file_url || '').trim();
      if (!remoteUrl) {
        Alert.alert('Download unavailable', 'This attachment does not have a file URL yet.');
        return;
      }

      const actionKey = `download:${attachment.id}`;
      setAttachmentActionKey(actionKey);

      try {
        const downloadKey = await ensureAttachmentAvailable(announcement, attachment);
        let detailMessage = 'Saved inside CampusHub for offline access.';

        try {
          const copyResult = await localDownloadsService.saveCopyToDevice(downloadKey);
          if (copyResult.status === 'saved') {
            detailMessage = 'Saved inside CampusHub and copied to your phone storage.';
          } else if (copyResult.status === 'already_saved') {
            detailMessage = 'Saved inside CampusHub. A phone-storage copy already exists.';
          } else if (copyResult.status === 'shared') {
            detailMessage = 'Saved inside CampusHub. Use the share sheet to save a copy to Files.';
          } else if (copyResult.status === 'browser') {
            detailMessage = 'Opened in your browser for download.';
          }
        } catch {
          detailMessage = 'Saved inside CampusHub. You can export a copy again later.';
        }

        Alert.alert('Download Complete', detailMessage, [
          {
            text: 'Open File',
            onPress: () => {
              void localDownloadsService.openLocalFile(downloadKey);
            },
          },
          { text: 'OK', style: 'cancel' },
        ]);
      } catch (err) {
        console.error('Failed to download announcement attachment:', err);
        Alert.alert('Download failed', 'Unable to download this attachment right now.');
      } finally {
        setAttachmentActionKey((current) => (current === actionKey ? null : current));
      }
    },
    [ensureAttachmentAvailable]
  );

  const handleShareAnnouncement = useCallback(async (announcement: Announcement) => {
    try {
      const attachmentLinks = (announcement.attachments || [])
        .map((attachment) => attachment.file_url)
        .filter(Boolean);
      const message = [
        announcement.title,
        announcement.category ? `Category: ${announcement.category}` : '',
        announcement.content,
        ...attachmentLinks.map((url, index) => `Attachment ${index + 1}: ${url}`),
      ]
        .filter(Boolean)
        .join('\n\n');

      await Share.share({
        title: announcement.title,
        message,
      });
    } catch (_err) {
      Alert.alert('Share failed', 'Unable to share this announcement right now.');
    }
  }, []);

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
          style={[styles.saveButton, item.is_saved && styles.saveButtonActive]}
          onPress={() => void toggleSaved(item.id)}
        >
          <Icon 
            name={item.is_saved ? 'bookmark' : 'bookmark-outline'} 
            size={18} 
            color={item.is_saved ? colors.warning : colors.text.tertiary} 
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
        <View style={styles.timestampColumn}>
          <Text style={styles.announcementDate}>{formatAbsoluteDate(item.created_at)}</Text>
          <Text style={styles.announcementTime}>{formatAbsoluteTime(item.created_at)}</Text>
        </View>
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
          <Icon name="bookmark" size={14} color={colors.warning} />
          <Text style={styles.summaryText}>{savedCount} saved</Text>
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
                  style={[styles.saveButtonLarge, selectedAnnouncement.is_saved && styles.saveButtonLargeActive]}
                  onPress={() => void toggleSaved(selectedAnnouncement.id)}
                >
                  <Icon 
                    name={selectedAnnouncement.is_saved ? 'bookmark' : 'bookmark-outline'} 
                    size={22} 
                    color={selectedAnnouncement.is_saved ? colors.warning : colors.text.tertiary} 
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
                  <Text style={styles.modalDate}>{formatAbsoluteDate(selectedAnnouncement.created_at)}</Text>
                  <Text style={styles.modalTime}>{formatAbsoluteTime(selectedAnnouncement.created_at)} • {formatRelativeDate(selectedAnnouncement.created_at)}</Text>
                </View>
                <View style={[styles.categoryBadgeLarge, { backgroundColor: getCategoryColor(selectedAnnouncement.category) + '20' }]}>
                  <Text style={[styles.categoryTextLarge, { color: getCategoryColor(selectedAnnouncement.category) }]}>
                    {selectedAnnouncement.category}
                  </Text>
                </View>
              </View>

              <View style={styles.modalTimestampRow}>
                <View style={styles.timestampBadge}>
                  <Icon name="calendar" size={14} color={colors.text.secondary} />
                  <Text style={styles.timestampBadgeText}>{formatAbsoluteDate(selectedAnnouncement.created_at)}</Text>
                </View>
                <View style={styles.timestampBadge}>
                  <Icon name="time" size={14} color={colors.text.secondary} />
                  <Text style={styles.timestampBadgeText}>{formatAbsoluteTime(selectedAnnouncement.created_at)}</Text>
                </View>
              </View>
              
              <Text style={styles.modalAnnouncementContent}>{selectedAnnouncement.content}</Text>
              
              {(selectedAnnouncement.attachments || []).length > 0 && (
                <View style={styles.attachmentsSection}>
                  <Text style={styles.attachmentsTitle}>Attachments</Text>
                  {(selectedAnnouncement.attachments || []).map((attachment) => (
                    <View key={attachment.id} style={styles.attachmentContainer}>
                      <View style={styles.attachmentIcon}>
                        <Icon name="document-text" size={24} color={colors.primary[500]} />
                      </View>
                      <View style={styles.attachmentInfo}>
                        <Text style={styles.attachmentName}>{attachment.filename || 'Attachment'}</Text>
                        <Text style={styles.attachmentMeta}>
                          {attachment.file_type || 'File'} • {attachment.formatted_file_size || selectedAnnouncement.attachment_size || ''}
                        </Text>
                      </View>
                      <View style={styles.attachmentActions}>
                        <TouchableOpacity
                          style={[styles.attachmentActionButton, styles.attachmentViewButton]}
                          onPress={() => void handleViewAttachment(selectedAnnouncement, attachment)}
                          disabled={attachmentActionKey === `view:${attachment.id}`}
                        >
                          {attachmentActionKey === `view:${attachment.id}` ? (
                            <ActivityIndicator size="small" color={colors.primary[500]} />
                          ) : (
                            <>
                              <Icon name="eye" size={16} color={colors.primary[500]} />
                              <Text style={styles.attachmentViewButtonText}>View</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.attachmentActionButton, styles.attachmentDownloadButton]}
                          onPress={() => void handleDownloadAttachment(selectedAnnouncement, attachment)}
                          disabled={attachmentActionKey === `download:${attachment.id}`}
                        >
                          {attachmentActionKey === `download:${attachment.id}` ? (
                            <ActivityIndicator size="small" color={colors.text.inverse} />
                          ) : (
                            <>
                              <Icon name="download" size={16} color={colors.text.inverse} />
                              <Text style={styles.attachmentDownloadButtonText}>Download</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => void handleShareAnnouncement(selectedAnnouncement)}
                >
                  <Icon name="share-social" size={20} color={colors.primary[500]} />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.bookmarkButton}
                  onPress={() => void toggleSaved(selectedAnnouncement.id)}
                >
                  <Icon 
                    name={selectedAnnouncement.is_saved ? 'bookmark' : 'bookmark-outline'} 
                    size={20} 
                    color={selectedAnnouncement.is_saved ? colors.warning : colors.text.secondary} 
                  />
                  <Text style={[styles.bookmarkButtonText, selectedAnnouncement.is_saved && styles.bookmarkButtonTextActive]}>
                    {selectedAnnouncement.is_saved ? 'Saved' : 'Save'}
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
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.card.light,
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderRadius: 12,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  saveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  saveButtonActive: {
    backgroundColor: colors.warning + '15',
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
    textAlign: 'right',
  },
  announcementTime: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  timestampColumn: {
    alignItems: 'flex-end',
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
  saveButtonLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  saveButtonLargeActive: {
    backgroundColor: colors.warning + '15',
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
  modalTime: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  modalTimestampRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.card.light,
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  timestampBadgeText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
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
  attachmentsSection: {
    marginBottom: spacing[6],
  },
  attachmentsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card.light,
    padding: spacing[4],
    borderRadius: 16,
    marginBottom: spacing[4],
    gap: spacing[3],
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
  attachmentActions: {
    alignItems: 'stretch',
    gap: spacing[2],
  },
  attachmentActionButton: {
    minWidth: 104,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: 12,
    paddingHorizontal: spacing[3],
  },
  attachmentViewButton: {
    backgroundColor: colors.primary[500] + '15',
  },
  attachmentViewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
  },
  attachmentDownloadButton: {
    backgroundColor: colors.primary[500],
  },
  attachmentDownloadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.inverse,
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
