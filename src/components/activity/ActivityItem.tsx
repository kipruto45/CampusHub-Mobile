// Activity Item Component for CampusHub Mobile App
// Displays a single activity item

import React from 'react';
import { StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import { RecentActivity } from '../../services/activity.service';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';
import Icon from '../ui/Icon';

interface ActivityItemProps {
  activity: RecentActivity;
  onPress?: (activity: RecentActivity) => void;
}

const getActivityIcon = (type: string): string => {
  switch (type) {
    case 'viewed_resource':
      return 'eye';
    case 'opened_personal_file':
      return 'document';
    case 'downloaded_resource':
      return 'arrow-down-circle';
    case 'downloaded_personal_file':
      return 'arrow-down';
    case 'bookmarked_resource':
      return 'bookmark';
    case 'created_resource':
      return 'add-circle';
    case 'updated_resource':
      return 'create';
    case 'commented':
      return 'chatbubble-ellipses';
    case 'rated':
      return 'star';
    default:
      return 'activity';
  }
};

const getActivityColor = (type: string): string => {
  switch (type) {
    case 'viewed_resource':
      return colors.info;
    case 'opened_personal_file':
      return colors.accent[500];
    case 'downloaded_resource':
    case 'downloaded_personal_file':
      return colors.success;
    case 'bookmarked_resource':
      return colors.warning;
    case 'created_resource':
      return colors.primary[500];
    case 'updated_resource':
      return colors.primary[600];
    case 'commented':
      return colors.accent[600];
    case 'rated':
      return colors.warning;
    default:
      return colors.text.secondary;
  }
};

const getActivityAction = (type: string): string => {
  switch (type) {
    case 'viewed_resource':
      return 'Viewed';
    case 'opened_personal_file':
      return 'Opened';
    case 'downloaded_resource':
    case 'downloaded_personal_file':
      return 'Downloaded';
    case 'bookmarked_resource':
      return 'Bookmarked';
    case 'created_resource':
      return 'Created';
    case 'updated_resource':
      return 'Updated';
    case 'commented':
      return 'Commented on';
    case 'rated':
      return 'Rated';
    default:
      return 'Activity';
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

const getFileTypeIcon = (fileType: string): string => {
  if (!fileType) return 'document';
  
  const ext = fileType.toLowerCase();
  if (['pdf'].includes(ext)) return 'document-text';
  if (['doc', 'docx'].includes(ext)) return 'document-text';
  if (['xls', 'xlsx'].includes(ext)) return 'grid';
  if (['ppt', 'pptx'].includes(ext)) return 'presentation';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi'].includes(ext)) return 'videocam';
  if (['mp3', 'wav', 'aac'].includes(ext)) return 'musical-note';
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
  
  return 'document';
};

const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  onPress,
}) => {
  const iconName = getActivityIcon(activity.activity_type);
  const iconColor = getActivityColor(activity.activity_type);
  const action = getActivityAction(activity.activity_type);
  const fileIcon = getFileTypeIcon(activity.file_type || '');

  const handlePress = () => {
    if (onPress) {
      onPress(activity);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Icon name={iconName as any} size={20} color={iconColor} />
        </View>
        <View style={styles.line} />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.action}>{action}</Text>
          <Text style={styles.time}>
            {formatTimeAgo(activity.created_at)}
          </Text>
        </View>
        
        <Text style={styles.title} numberOfLines={1}>
          {activity.target_title}
        </Text>
        
        <View style={styles.metaRow}>
          {activity.file_type && (
            <View style={styles.fileTypeContainer}>
              <Icon name={fileIcon as any} size={12} color={colors.text.tertiary} />
              <Text style={styles.fileType}>{activity.file_type.toUpperCase()}</Text>
            </View>
          )}
          
          {activity.resource_type && (
            <View style={styles.resourceTypeContainer}>
              <Text style={styles.resourceType}>
                {activity.resource_type}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  iconWrapper: {
    alignItems: 'center',
    marginRight: spacing[3],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border.light,
    marginTop: spacing[2],
    minHeight: 20,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  action: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  time: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  fileTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileType: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  resourceTypeContainer: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  resourceType: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});

export default ActivityItem;
