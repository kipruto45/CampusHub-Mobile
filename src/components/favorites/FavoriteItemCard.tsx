import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import Icon from '../ui/Icon';

interface FavoriteItemCardProps {
  item: any;
  onPress: () => void;
  onRemove: () => void;
}

const FavoriteItemCard: React.FC<FavoriteItemCardProps> = ({ item, onPress, onRemove }) => {
  const type = item?.favorite_type || 'resource';
  const resource = item?.resource;
  const file = item?.personal_file;
  const folder = item?.personal_folder;

  const title =
    resource?.title ||
    file?.title ||
    file?.name ||
    folder?.name ||
    'Favorite item';
  const subtitle =
    type === 'resource'
      ? [resource?.course?.name, resource?.unit?.name].filter(Boolean).join(' • ')
      : type === 'personal_file'
      ? [file?.file_type, file?.folder_name].filter(Boolean).join(' • ')
      : `Folder • ${Number(folder?.file_count || 0)} files`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Icon
            name={type === 'folder' ? 'folder' : type === 'personal_file' ? 'document' : 'book'}
            size={20}
            color={colors.primary[600]}
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle || 'No metadata'}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={10}>
        <Icon name="heart" size={20} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing[3],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});

export default FavoriteItemCard;
