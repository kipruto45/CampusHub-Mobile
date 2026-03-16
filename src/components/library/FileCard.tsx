// File Card Component
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Icon from '../ui/Icon';
import { LibraryFile, formatFileSize } from '../../services/library.service';
import { colors } from '../../theme/colors';

interface FileCardProps {
  file: LibraryFile;
  onPress?: () => void;
  onLongPress?: () => void;
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
    mp3: 'musical-note',
    mp4: 'videocam',
    wav: 'musical-note',
    mov: 'videocam',
  };
  return iconMap[fileType.toLowerCase()] || 'document';
};

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onPress,
  onLongPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.container as ViewStyle}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.fileIcon as ViewStyle}>
        <Icon 
          name={getFileIcon(file.file_type) as any} 
          size={24} 
          color={colors.primary[500]} 
        />
      </View>
      <View style={styles.content as ViewStyle}>
        <View style={styles.nameRow as ViewStyle}>
          <Text style={styles.name} numberOfLines={1}>
            {file.title}
          </Text>
          {file.is_favorite && (
            <Icon name="heart" size={14} color={colors.error} />
          )}
        </View>
        <View style={styles.metaRow as ViewStyle}>
          <Text style={styles.meta}>
            {file.file_type.toUpperCase()} • {formatFileSize(file.file_size)}
          </Text>
        </View>
      </View>
      <Icon name="ellipsis-vertical" size={18} color={colors.text.secondary} />
    </TouchableOpacity>
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
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
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
});
