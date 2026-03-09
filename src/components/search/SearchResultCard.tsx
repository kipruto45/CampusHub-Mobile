import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import Icon from '../ui/Icon';

interface SearchResultCardProps {
  item: any;
  onPress: () => void;
  onToggleBookmark?: () => void;
  onToggleFavorite?: () => void;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({
  item,
  onPress,
  onToggleBookmark,
  onToggleFavorite,
}) => {
  const courseLabel = item?.course?.code || item?.course?.name || '';
  const unitLabel = item?.unit?.code || item?.unit?.name || '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item?.resource_type || 'resource'}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onToggleFavorite} hitSlop={8}>
            <Icon
              name={item?.is_favorited ? 'heart' : 'heart-outline'}
              size={18}
              color={item?.is_favorited ? colors.error : colors.text.tertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onToggleBookmark} hitSlop={8}>
            <Icon
              name={item?.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={item?.is_bookmarked ? colors.warning : colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {item?.title || 'Untitled Resource'}
      </Text>
      {item?.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <Text style={styles.meta} numberOfLines={1}>
        {[courseLabel, unitLabel].filter(Boolean).join(' • ')}
      </Text>
      <View style={styles.stats}>
        <Text style={styles.stat}>⭐ {Number(item?.average_rating || 0).toFixed(1)}</Text>
        <Text style={styles.stat}>⬇ {Number(item?.download_count || 0)}</Text>
        <Text style={styles.stat}>👁 {Number(item?.view_count || 0)}</Text>
      </View>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  typeBadge: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  typeText: {
    fontSize: 11,
    color: colors.primary[700],
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  description: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  meta: {
    fontSize: 12,
    color: colors.primary[700],
    marginBottom: spacing[2],
  },
  stats: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  stat: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});

export default SearchResultCard;
