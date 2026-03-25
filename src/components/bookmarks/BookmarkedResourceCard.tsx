import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import Icon from '../ui/Icon';
import BookmarkButton from '../resources/BookmarkButton';
import FavoriteButton from '../resources/FavoriteButton';
import { useResourceShare } from '../../hooks/useResourceShare';
import ResourceShareSheet from '../modals/ResourceShareSheet';
import { useToast } from '../ui/Toast';

interface BookmarkedResourceCardProps {
  item: any;
  onPress: () => void;
  onRemove: () => void;
  onToggleFavorite?: () => void;
  onShare?: () => void;
}

const BookmarkedResourceCard: React.FC<BookmarkedResourceCardProps> = ({
  item,
  onPress,
  onRemove,
  onToggleFavorite,
  onShare,
}) => {
  const resource = item?.resource || {};
  const share = useResourceShare(
    resource?.id
      ? {
          id: resource.id,
          title: resource.title,
          can_share: resource.can_share,
        }
      : null
  );

  const { showToast } = useToast();

  const handleShare = () => {
    if (!resource?.can_share) {
      showToast('info', 'This resource is not available for sharing.');
      return;
    }
    share.openShareSheet();
  };

  const handleRemove = () => {
    onRemove();
  };

  const handleToggleFavorite = () => {
    onToggleFavorite?.();
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.type}>{resource?.resource_type || 'resource'}</Text>
        <View style={styles.actions}>
          {onShare ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Icon name="link" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          ) : null}
          {onToggleFavorite ? (
            <FavoriteButton
              isFavorited={Boolean(resource?.is_favorited)}
              onPress={handleToggleFavorite}
            />
          ) : null}
          <BookmarkButton isBookmarked={true} onPress={handleRemove} />
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {resource?.title || 'Untitled Resource'}
      </Text>
      {resource?.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {resource.description}
        </Text>
      ) : null}
      <Text style={styles.meta} numberOfLines={1}>
        {[resource?.course?.name, resource?.unit?.name].filter(Boolean).join(' • ')}
      </Text>
      <Text style={styles.savedAt}>Saved {new Date(item?.saved_at).toLocaleDateString()}</Text>

      {/* Share Sheet Modal */}
      <ResourceShareSheet
        visible={share.isSheetOpen}
        onClose={share.closeShareSheet}
        onCopyLink={share.copyLink}
        onNativeShare={share.nativeShare}
        loading={share.loading}
        canShare={share.isShareable}
        error={share.error}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  actionButton: {
    padding: spacing[1],
  },
  shareIcon: {
    fontSize: 16,
  },
  type: {
    textTransform: 'capitalize',
    color: colors.primary[700],
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  description: {
    color: colors.text.secondary,
    fontSize: 13,
    marginBottom: spacing[1],
  },
  meta: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginBottom: spacing[1],
  },
  savedAt: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});

export default BookmarkedResourceCard;
