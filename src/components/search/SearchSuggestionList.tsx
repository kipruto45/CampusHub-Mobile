import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SearchSuggestion } from '../../services/search.service';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import Icon from '../ui/Icon';

interface SearchSuggestionListProps {
  suggestions: SearchSuggestion[];
  onSelect: (value: string) => void;
}

const suggestionIcon: Record<SearchSuggestion['type'], any> = {
  title: 'document-text',
  course: 'school',
  unit: 'book',
  tag: 'pricetag',
  recent: 'time',
};

const SearchSuggestionList: React.FC<SearchSuggestionListProps> = ({ suggestions, onSelect }) => {
  if (!suggestions.length) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={suggestions}
        keyExtractor={(item, index) => `${item.type}-${item.value}-${index}`}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => onSelect(item.value)}>
            <Icon name={suggestionIcon[item.type]} size={16} color={colors.primary[500]} />
            <Text style={styles.value}>{item.value}</Text>
            <Text style={styles.type}>{item.type}</Text>
          </TouchableOpacity>
        )}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[3],
    marginBottom: spacing[3],
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 14,
    padding: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  type: {
    textTransform: 'capitalize',
    fontSize: 11,
    color: colors.text.tertiary,
  },
});

export default SearchSuggestionList;
