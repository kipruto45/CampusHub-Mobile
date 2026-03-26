import React from 'react';
import { FlatList,StyleSheet,Text,TouchableOpacity,View } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import Icon from '../ui/Icon';

interface RecentSearchListProps {
  items: { id: string; query: string }[];
  onSelect: (query: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

const RecentSearchList: React.FC<RecentSearchListProps> = ({
  items,
  onSelect,
  onRemove,
  onClearAll,
}) => {
  if (!items.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Searches</Text>
        <TouchableOpacity onPress={onClearAll}>
          <Text style={styles.clear}>Clear all</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={styles.queryWrap} onPress={() => onSelect(item.query)}>
              <Icon name="time" size={15} color={colors.text.tertiary} />
              <Text style={styles.queryText}>{item.query}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onRemove(item.id)} hitSlop={8}>
              <Icon name="close" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        )}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  clear: {
    fontSize: 13,
    color: colors.primary[600],
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  queryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  queryText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
});

export default RecentSearchList;
