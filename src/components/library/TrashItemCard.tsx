// Trash Item Card Component
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import Icon from '../ui/Icon';
import { TrashItem, formatFileSize, formatRelativeTime } from '../../services/library.service';
import { colors } from '../../theme/colors';

interface TrashItemCardProps {
  item: TrashItem;
  onRestore: () => void;
  onDelete: () => void;
}

const getFileIcon = (fileType: string): string => {
  const iconMap: Record<string, string> = {
    pdf: 'document-text',
    doc: 'document',
    docx: 'document',
    ppt: 'albums',
    pptx: 'albums',
    xls: 'grid',
    xlsx: 'grid',
    txt: 'document-text',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    zip: 'archive',
    rar: 'archive',
  };
  return iconMap[fileType.toLowerCase()] || 'document';
};

export const TrashItemCard: React.FC<TrashItemCardProps> = ({
  item,
  onRestore,
  onDelete,
}) => {
  return (
    <View style={styles.container as ViewStyle}>
      <View style={styles.iconContainer as ViewStyle}>
        <Icon 
          name={getFileIcon(item.file_type) as any} 
          size={24} 
          color={colors.text.secondary} 
        />
      </View>
      
      <View style={styles.content as ViewStyle}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.metaRow as ViewStyle}>
          <Text style={styles.meta}>
            {formatFileSize(item.file_size)}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.meta}>
            Deleted {formatRelativeTime(item.deleted_at)}
          </Text>
        </View>
        {item.original_folder_name && (
          <Text style={styles.folderInfo}>
            Was in: {item.original_folder_name}
          </Text>
        )}
      </View>

      <View style={styles.actions as ViewStyle}>
        <TouchableOpacity
          style={styles.restoreButton as ViewStyle}
          onPress={onRestore}
        >
          <Icon name="refresh" size={18} color={colors.success} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton as ViewStyle}
          onPress={onDelete}
        >
          <Icon name="trash" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.card.light,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  metaDot: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginHorizontal: 4,
  },
  folderInfo: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  restoreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
