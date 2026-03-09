// Announcement Item Component for CampusHub Mobile App
// Displays a single announcement item

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import Icon from '../ui/Icon';
import { Announcement } from '../../services/announcements.service';

interface AnnouncementItemProps {
  announcement: Announcement;
  onPress?: (announcement: Announcement) => void;
  showFullContent?: boolean;
}

const getAnnouncementIcon = (type: string): string => {
  switch (type) {
    case 'academic':
      return 'school';
    case 'maintenance':
      return 'construct';
    case 'urgent':
      return 'warning';
    case 'course_update':
      return 'book';
    case 'system_notice':
      return 'information-circle';
    case 'general':
    default:
      return 'megaphone';
  }
};

const getAnnouncementColor = (type: string): string => {
  switch (type) {
    case 'urgent':
      return colors.error;
    case 'maintenance':
      return colors.warning;
    case 'academic':
      return colors.info;
    case 'course_update':
      return colors.success;
    case 'system_notice':
      return colors.accent[500];
    case 'general':
    default:
      return colors.primary[500];
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const AnnouncementItem: React.FC<AnnouncementItemProps> = ({
  announcement,
  onPress,
  showFullContent = false,
}) => {
  const iconName = getAnnouncementIcon(announcement.announcement_type);
  const iconColor = getAnnouncementColor(announcement.announcement_type);

  const handlePress = () => {
    if (onPress) {
      onPress(announcement);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Icon name={iconName as any} size={22} color={iconColor} />
        </View>
        
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            {announcement.is_pinned && (
              <Icon name="pin" size={16} color={colors.warning} />
            )}
            <Text style={styles.title} numberOfLines={showFullContent ? undefined : 2}>
              {announcement.title}
            </Text>
          </View>
          
          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: iconColor + '15' }]}>
              <Text style={[styles.typeLabel, { color: iconColor }]}>
                {announcement.announcement_type_display}
              </Text>
            </View>
            <Text style={styles.date}>
              {formatDate(announcement.published_at || announcement.created_at)}
            </Text>
          </View>
        </View>
      </View>

      {showFullContent ? (
        <Text style={styles.content}>{announcement.content}</Text>
      ) : (
        <Text style={styles.contentPreview} numberOfLines={2}>
          {announcement.content}
        </Text>
      )}

      {announcement.target_summary && announcement.target_summary !== 'All Students' && (
        <View style={styles.targetRow}>
          <Icon name="people" size={14} color={colors.text.tertiary} />
          <Text style={styles.targetText}>{announcement.target_summary}</Text>
        </View>
      )}

      {announcement.created_by_name && (
        <View style={styles.footer}>
          <Text style={styles.authorText}>
            By {announcement.created_by_name}
          </Text>
        </View>
      )}

      <View style={styles.arrowContainer}>
        <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.card.light,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  typeBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  content: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[3],
  },
  contentPreview: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing[2],
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  targetText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  footer: {
    marginTop: spacing[1],
  },
  authorText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  arrowContainer: {
    position: 'absolute',
    right: spacing[2],
    top: '50%',
    marginTop: -10,
  },
});

export default AnnouncementItem;
