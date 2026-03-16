// Folder Card Component
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Icon from '../ui/Icon';
import { LibraryFolder } from '../../services/library.service';
import { colors } from '../../theme/colors';

interface FolderCardProps {
  folder: LibraryFolder;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
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
      <View style={[styles.folderIcon as ViewStyle, { backgroundColor: folder.color + '20' }]}>
        <Icon name="folder" size={28} color={folder.color} />
      </View>
      <View style={styles.content as ViewStyle}>
        <View style={styles.nameRow as ViewStyle}>
          <Text style={styles.name} numberOfLines={1}>
            {folder.name}
          </Text>
          {folder.is_favorite && (
            <Icon name="heart" size={14} color={colors.error} />
          )}
        </View>
        <Text style={styles.meta}>
          {folder.file_count} {folder.file_count === 1 ? 'item' : 'items'}
        </Text>
      </View>
      <Icon name="chevron-right" size={20} color={colors.text.secondary} />
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
  folderIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  meta: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
