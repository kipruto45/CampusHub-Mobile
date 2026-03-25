// Resource Detail Screen for CampusHub
// Resource details with comments and ratings - Backend-driven

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { shadows } from '../../../theme/shadows';
import Icon from '../../../components/ui/Icon';
import Avatar from '../../../components/ui/Avatar';
import { courseProgressAPI, resourcesAPI, aiAPI } from '../../../services/api';
import { localDownloadsService } from '../../../services/local-downloads.service';
import ShareResourceButton from '../../../components/resources/ShareResourceButton';
import ResourceShareSheet from '../../../components/modals/ResourceShareSheet';
import { useResourceShare } from '../../../hooks/useResourceShare';
import { bookmarksService } from '../../../services/bookmarks.service';
import { favoritesService } from '../../../services/favorites.service';

const formatNumber = (value: number) => {
  try {
    return new Intl.NumberFormat().format(value);
  } catch {
    return String(value);
  }
};

const formatDateLocale = (iso: string) => {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
};

// Types
interface Comment {
  id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
  text: string;
  created_at: string;
  rating: number;
}

interface Resource {
  id: string;
  slug?: string;
  title: string;
  description: string;
  resource_type: string;
  course: {
    id: string;
    name: string;
    code: string;
  };
  year: string;
  semester?: string;
  average_rating: number;
  rating_count: number;
  download_count: number;
  view_count: number;
  file_size: number;
  file_url?: string;
  file_format: string;
  uploader: {
    id: string;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
  created_at: string;
  tags: string[];
  is_bookmarked: boolean;
  is_favorited: boolean;
  is_in_my_library?: boolean;
  default_library_folder_name?: string;
  library_folder_name?: string;
  share_count?: number;
  can_share?: boolean;
}

const ResourceDetailScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [resource, setResource] = useState<Resource | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const trackedProgressKeyRef = useRef<string | null>(null);
  const share = useResourceShare(
    resource
      ? {
          id: resource.id,
          title: resource.title,
          can_share: resource.can_share,
        }
      : null
  );

  const syncCourseProgress = useCallback(
    async (courseId?: string, resourceId?: string, action: 'view' | 'completed' = 'view') => {
      if (!courseId || !resourceId) {
        return;
      }

      try {
        await courseProgressAPI.updateProgress(courseId, resourceId, action);
      } catch (progressError) {
        console.error('Failed to sync course progress:', progressError);
      }
    },
    []
  );

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await resourcesAPI.get(id || '');
      const data = response.data?.data || response.data;
      setResource(data);
      const progressKey = data?.course?.id && data?.id ? `${data.course.id}:${data.id}` : null;
      if (progressKey && trackedProgressKeyRef.current !== progressKey) {
        trackedProgressKeyRef.current = progressKey;
        void syncCourseProgress(String(data.course.id), String(data.id), 'view');
      }
      
      // Get comments
      const commentsResponse = await resourcesAPI.getComments(id || '');
      const commentsData = commentsResponse.data?.data || [];
      setComments(commentsData);
    } catch (err: any) {
      console.error('Error fetching resource:', err);
      setError(err.response?.data?.message || 'Failed to load resource');
    } finally {
      setLoading(false);
    }
  }, [id, syncCourseProgress]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const fetchSummary = async () => {
    if (!resource || loadingSummary) return;
    setLoadingSummary(true);
    try {
      const response = await aiAPI.summarizeResource(resource.id, { max_length: 180, summary_type: 'auto' });
      const payload = response?.data?.data || response?.data || {};
      setSummary(payload?.summary || 'No summary available yet.');
    } catch (err: any) {
      setSummary('Could not generate summary. Please try again.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateString: string) => formatDateLocale(dateString);

  const formatCommentDate = (dateString: string) => formatDateLocale(dateString);

  const handleDownload = useCallback(async () => {
    if (!resource) return;

    setDownloading(true);
    try {
      const response = await resourcesAPI.download(resource.id);
      const payload = response.data?.data || response.data || {};
      const fileUrl = payload?.file_url || resource.file_url;

      if (!fileUrl) {
        throw new Error('File URL is unavailable for this resource.');
      }

      const downloadKey = `resource:${resource.id}`;
      await localDownloadsService.ensureLocalFile({
        key: downloadKey,
        remoteUrl: fileUrl,
        fileName: payload?.file_name,
        title: resource.title,
        fileType: resource.file_format,
      });

      let detailMessage = 'Saved inside CampusHub for offline access.';
      try {
        const copyResult = await localDownloadsService.saveCopyToDevice(downloadKey);
        if (copyResult.status === 'saved') {
          detailMessage = 'Saved inside CampusHub and copied to your phone storage.';
        } else if (copyResult.status === 'already_saved') {
          detailMessage = 'Saved inside CampusHub. A phone-storage copy already exists.';
        } else if (copyResult.status === 'shared') {
          detailMessage = 'Saved inside CampusHub. Use the share sheet to save a copy to Files.';
        }
      } catch {
        detailMessage = 'Saved inside CampusHub. You can export a copy again from My Downloads.';
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
      void syncCourseProgress(resource.course?.id, resource.id, 'completed');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || err?.message || 'Failed to download'
      );
    } finally {
      setDownloading(false);
    }
  }, [resource, syncCourseProgress]);

  const handleSave = async () => {
    if (!resource) return;
    
    try {
      await bookmarksService.toggleResourceBookmark(resource.id);
      const next = !resource.is_bookmarked;
      setResource({ ...resource, is_bookmarked: next });
      Alert.alert(next ? 'Saved' : 'Removed', next ? 'Added to saved resources' : 'Removed from saved resources');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save');
    }
  };

  const handleFavorite = async () => {
    if (!resource) return;
    
    try {
      await favoritesService.toggleResourceFavorite(resource.id);
      const next = !resource.is_favorited;
      setResource({ ...resource, is_favorited: next });
      Alert.alert(next ? 'Favorited' : 'Removed', next ? 'Added to favorites' : 'Removed from favorites');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to favorite');
    }
  };

  const handleRate = async () => {
    if (!resource || rating === 0) return;
    
    try {
      await resourcesAPI.rate(resource.id, rating);
      Alert.alert('Success', 'Rating submitted!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit rating');
    }
  };

  const handleSharePress = async () => {
    if (!resource?.can_share) {
      Alert.alert('Not Shareable', 'This resource is not available for sharing.');
      return;
    }
    await share.openShareSheet();
  };

  const handleAddToLibrary = async () => {
    if (!resource || savingToLibrary) return;

    if (resource.is_in_my_library) {
      const existingFolder =
        resource.library_folder_name || resource.default_library_folder_name || 'Library';
      Alert.alert('Already in Library', `This resource is already in your ${existingFolder} folder.`);
      return;
    }

    setSavingToLibrary(true);
    try {
      const response = await resourcesAPI.saveToLibrary(resource.id);
      const payload = response.data?.data || response.data || {};
      const folderName =
        payload?.folder?.name ||
        resource.default_library_folder_name ||
        resource.library_folder_name ||
        'Library';

      setResource({
        ...resource,
        is_in_my_library: true,
        library_folder_name: folderName,
      });
      Alert.alert(
        payload?.already_saved ? 'Already in Library' : 'Added to Library',
        payload?.already_saved
          ? `This resource is already in your ${folderName} folder.`
          : `Saved to your ${folderName} folder.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save to library');
    } finally {
      setSavingToLibrary(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!comment.trim()) return;
    
    setSubmitting(true);
    try {
      await resourcesAPI.addComment(id, { text: comment, rating });
      Alert.alert('Success', 'Comment added successfully!');
      setComment('');
      // Refresh comments
      const commentsResponse = await resourcesAPI.getComments(id);
      const commentsData = commentsResponse.data?.data || [];
      setComments(commentsData);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Icon name="alert-circle" size={48} color={colors.error} />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
      <Text style={styles.loadingText}>Loading resource...</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resource</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={{ padding: spacing[4], gap: spacing[4] }}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={[styles.skeletonCard, { opacity: 0.35 }]}>
              <View style={{ height: 16, width: '60%', backgroundColor: colors.gray[200], borderRadius: 6 }} />
              <View style={{ height: 12, width: '40%', backgroundColor: colors.gray[100], borderRadius: 6, marginTop: 8 }} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error || !resource) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resource</Text>
          <View style={styles.placeholder} />
        </View>
        {renderError()}
      </View>
    );
  }

  const targetLibraryFolderName =
    resource.library_folder_name || resource.default_library_folder_name || 'Library';

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resource</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleSharePress}>
            <Icon name="share-social" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Type Badge */}
          <View style={styles.typeRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>{resource.resource_type}</Text></View>
            <Text style={styles.course}>{resource.course?.code || resource.course?.name || ''}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{resource.title}</Text>

          {/* AI Summary */}
          <TouchableOpacity style={styles.summaryButton} onPress={fetchSummary} disabled={loadingSummary}>
            <Icon name="sparkles" size={18} color={colors.primary[500]} />
            <Text style={styles.summaryButtonText}>
              {loadingSummary ? 'Summarizing…' : summary ? 'Refresh AI summary' : 'Get AI summary'}
            </Text>
          </TouchableOpacity>
          {summary && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>AI Summary</Text>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>
          )}

          {/* Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="star" size={14} color={colors.warning} />
              <Text style={styles.metaText}>{resource.average_rating?.toFixed(1) || '0'} ({resource.rating_count || 0})</Text>
            </View>
          <View style={styles.metaItem}>
            <Icon name="download" size={14} color={colors.primary[500]} />
            <Text style={styles.metaText}>{formatNumber(resource.download_count || 0)}</Text>
          </View>
            <View style={styles.metaItem}>
              <Icon name="document" size={14} color={colors.text.secondary} />
              <Text style={styles.metaText}>{formatFileSize(resource.file_size)}</Text>
            </View>
          </View>

          {/* Uploader */}
          <View style={styles.uploaderCard}>
            <View style={styles.uploaderAvatar}>
              <Text style={styles.uploaderInitial}>
                {getInitials(resource.uploader?.first_name, resource.uploader?.last_name)}
              </Text>
            </View>
            <View style={styles.uploaderInfo}>
              <Text style={styles.uploaderName}>
                {resource.uploader?.first_name} {resource.uploader?.last_name}
              </Text>
              <Text style={styles.uploadTime}>Uploaded {formatDate(resource.created_at)}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{resource.description}</Text>

          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {resource.tags.map((tag, index) => (
                <View key={index} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionBtn, resource.is_bookmarked && styles.actionBtnBookmarked]} 
              onPress={handleSave}
            >
              <Icon 
                name={resource.is_bookmarked ? 'bookmark' : 'bookmark-outline'} 
                size={20} 
                color={resource.is_bookmarked ? colors.accent[500] : colors.text.secondary} 
              />
              <Text style={[styles.actionLabel, resource.is_bookmarked && styles.actionLabelBookmarked]}>
                {resource.is_bookmarked ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, resource.is_favorited && styles.actionBtnFavorited]} 
              onPress={handleFavorite}
            >
              <Icon 
                name={resource.is_favorited ? 'heart' : 'heart-outline'} 
                size={20} 
                color={resource.is_favorited ? colors.error : colors.text.secondary} 
              />
              <Text style={[styles.actionLabel, resource.is_favorited && styles.actionLabelFavorite]}>
                {resource.is_favorited ? 'Favorited' : 'Favorite'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.libraryActionBtn,
              resource.is_in_my_library && styles.libraryActionBtnSaved,
              savingToLibrary && styles.libraryActionBtnDisabled,
            ]}
            onPress={handleAddToLibrary}
            disabled={savingToLibrary}
          >
            <View style={styles.libraryActionCopy}>
              <Text style={styles.libraryActionTitle}>
                {resource.is_in_my_library ? 'In Library' : 'Add to Library'}
              </Text>
              <Text style={styles.libraryActionSubtitle}>
                {resource.is_in_my_library
                  ? `Stored in ${targetLibraryFolderName}`
                  : `Save to ${targetLibraryFolderName}`}
              </Text>
            </View>
            {savingToLibrary ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Icon
                name={resource.is_in_my_library ? 'checkmark-circle' : 'folder-open'}
                size={20}
                color={colors.text.inverse}
              />
            )}
          </TouchableOpacity>

          {/* Rating */}
          <Text style={styles.sectionTitle}>Rate this Resource</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Icon 
                  name={star <= rating ? 'star' : 'star-outline'} 
                  size={28} 
                  color={star <= rating ? colors.warning : colors.gray[300]} 
                />
              </TouchableOpacity>
            ))}
            <Text style={styles.ratingText}>{rating > 0 ? `${rating}/5` : 'Tap to rate'}</Text>
            {rating > 0 && (
              <TouchableOpacity style={styles.submitRatingBtn} onPress={handleRate}>
                <Text style={styles.submitRatingText}>Submit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Comments */}
          <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
          {comments.length > 0 ? (
            comments.map((c) => (
              <View key={c.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAvatar}>
                    <Avatar
                      source={c.user?.avatar}
                      name={`${c.user?.first_name || ''} ${c.user?.last_name || ''}`.trim()}
                      sizePx={32}
                      cacheKey={`comment-${c.user?.id || 'unknown'}`}
                    />
                  </View>
                  <View style={styles.commentInfo}>
                    <Text style={styles.commentUser}>
                      {c.user?.first_name} {c.user?.last_name}
                    </Text>
                    <Text style={styles.commentTime}>{formatCommentDate(c.created_at)}</Text>
                  </View>
                  <View style={styles.commentRating}>
                    <Icon name="star" size={12} color={colors.warning} />
                    <Text style={styles.commentRatingText}>{c.rating}</Text>
                  </View>
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyComments}>
              <Icon name="chatbubbles" size={32} color={colors.text.tertiary} />
              <Text style={styles.emptyCommentsText}>No comments yet. Be the first to comment!</Text>
            </View>
          )}

          {/* Add Comment */}
          <View style={styles.addComment}>
            <TextInput 
              style={styles.commentInput} 
              placeholder="Add a comment..." 
              placeholderTextColor={colors.text.tertiary} 
              value={comment} 
              onChangeText={setComment} 
              multiline 
            />
            <TouchableOpacity 
              style={[styles.submitBtn, !comment.trim() && styles.submitBtnDisabled]} 
              onPress={handleSubmitComment}
              disabled={!comment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.submitText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Download Button */}
      <View style={styles.downloadBar}>
        <TouchableOpacity
          style={[styles.downloadBtn, downloading && styles.downloadBtnDisabled]}
          onPress={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Icon name="download" size={20} color={colors.text.inverse} />
          )}
          <Text style={styles.downloadText}>
            {downloading
              ? 'Preparing File...'
              : `Download (${formatFileSize(resource.file_size)})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ResourceShareSheet
        visible={share.isSheetOpen}
        onClose={share.closeShareSheet}
        onCopyLink={share.copyLink}
        onNativeShare={share.nativeShare}
        onSaveToLibrary={handleAddToLibrary}
        onFavorite={handleFavorite}
        loading={share.loading}
        canShare={share.isShareable}
        error={share.error}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: spacing[4], 
    paddingTop: spacing[12],
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: colors.background.secondary, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary 
  },
  shareBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: colors.background.secondary, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  shareButton: {
    height: 36,
    paddingHorizontal: spacing[3],
  },
  placeholder: { width: 40 },
  skeletonCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  content: { padding: spacing[6], paddingBottom: 100 },
  typeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3] },
  badge: { backgroundColor: colors.primary[100], paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginRight: spacing[3] },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.primary[700] },
  course: { fontSize: 14, color: colors.primary[600] },
  title: { fontSize: 24, fontWeight: '700', color: colors.text.primary, lineHeight: 32, marginBottom: spacing[4] },
  summaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
  },
  summaryButtonText: { color: colors.primary[500], fontWeight: '700' },
  summaryCard: {
    marginBottom: spacing[4],
    backgroundColor: colors.card.light,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  summaryLabel: { fontSize: 13, fontWeight: '700', color: colors.text.secondary, marginBottom: spacing[1] },
  summaryText: { fontSize: 14, color: colors.text.primary, lineHeight: 20 },
  metaRow: { flexDirection: 'row', marginBottom: spacing[6], gap: spacing[4] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: colors.text.secondary },
  uploaderCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.card.light, 
    borderRadius: 16, 
    padding: spacing[4], 
    marginBottom: spacing[6] 
  },
  uploaderAvatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: colors.primary[500], 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: spacing[3] 
  },
  uploaderInitial: { fontSize: 16, fontWeight: '600', color: colors.text.inverse },
  uploaderInfo: { flex: 1 },
  uploaderName: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  uploadTime: { fontSize: 12, color: colors.text.tertiary },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: spacing[3], marginTop: spacing[2] },
  description: { fontSize: 14, color: colors.text.secondary, lineHeight: 22, marginBottom: spacing[4] },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[6] },
  tag: { backgroundColor: colors.background.tertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tagText: { fontSize: 12, color: colors.text.secondary },
  actions: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[6] },
  actionBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: colors.card.light, 
    borderRadius: 12, 
    paddingVertical: spacing[3], 
    gap: spacing[2] 
  },
  actionBtnBookmarked: { backgroundColor: `${colors.accent[500]}18` },
  actionBtnFavorited: { backgroundColor: `${colors.error}18` },
  actionLabel: { fontSize: 13, fontWeight: '500', color: colors.text.secondary },
  actionLabelBookmarked: { color: colors.accent[500] },
  actionLabelFavorite: { color: colors.error },
  libraryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary[500],
    borderRadius: 16,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    marginBottom: spacing[6],
  },
  libraryActionBtnSaved: {
    backgroundColor: colors.success,
  },
  libraryActionBtnDisabled: {
    opacity: 0.8,
  },
  libraryActionCopy: {
    flex: 1,
    paddingRight: spacing[3],
  },
  libraryActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  libraryActionSubtitle: {
    fontSize: 13,
    color: colors.text.inverse,
    opacity: 0.9,
    marginTop: 2,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[6], gap: spacing[1] },
  ratingText: { marginLeft: spacing[3], fontSize: 14, color: colors.text.secondary },
  submitRatingBtn: {
    marginLeft: 'auto',
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 8,
  },
  submitRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  commentCard: { backgroundColor: colors.card.light, borderRadius: 16, padding: spacing[4], marginBottom: spacing[3] },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] },
  commentAvatar: { 
    marginRight: spacing[2] 
  },
  commentInfo: { flex: 1 },
  commentUser: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  commentTime: { fontSize: 11, color: colors.text.tertiary },
  commentRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  commentRatingText: { fontSize: 12, color: colors.text.secondary },
  commentText: { fontSize: 14, color: colors.text.secondary, lineHeight: 20 },
  emptyComments: { 
    alignItems: 'center', 
    padding: spacing[6],
    backgroundColor: colors.card.light,
    borderRadius: 16,
  },
  emptyCommentsText: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  addComment: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2] },
  commentInput: { 
    flex: 1, 
    backgroundColor: colors.card.light, 
    borderRadius: 12, 
    padding: spacing[3], 
    fontSize: 14, 
    color: colors.text.primary, 
    minHeight: 44, 
    maxHeight: 100 
  },
  submitBtn: { 
    backgroundColor: colors.primary[500], 
    paddingHorizontal: spacing[4], 
    paddingVertical: spacing[3], 
    borderRadius: 12 
  },
  submitBtnDisabled: {
    backgroundColor: colors.gray[400],
  },
  submitText: { fontSize: 14, fontWeight: '600', color: colors.text.inverse },
  downloadBar: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: colors.card.light, 
    padding: spacing[4], 
    borderTopWidth: 1, 
    borderTopColor: colors.border.light 
  },
  downloadBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: colors.primary[500], 
    borderRadius: 16, 
    paddingVertical: spacing[4], 
    gap: spacing[2] 
  },
  downloadBtnDisabled: {
    opacity: 0.75,
  },
  downloadIcon: { fontSize: 20 },
  downloadText: { fontSize: 16, fontWeight: '600', color: colors.text.inverse },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: spacing[6] 
  },
  errorText: { 
    fontSize: 14, 
    color: colors.text.secondary, 
    textAlign: 'center', 
    marginTop: spacing[3],
    marginBottom: spacing[4] 
  },
  retryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: spacing[3] 
  },
  loadingText: { fontSize: 14, color: colors.text.secondary },
});

export default ResourceDetailScreen;
