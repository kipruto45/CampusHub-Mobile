import React from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import Icon from '../ui/Icon';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  onOpenFilters: () => void;
  onClear?: () => void;
  loading?: boolean;
  activeFiltersCount?: number;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onOpenFilters,
  onClear,
  loading = false,
  activeFiltersCount = 0,
  placeholder = 'Search resources, books, notes...',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <Icon name="search" size={18} color={colors.text.tertiary} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary[500]} />
        ) : null}
        {value.length > 0 ? (
          <TouchableOpacity onPress={onClear} hitSlop={10}>
            <Icon name="close-circle" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity style={styles.filterButton} onPress={onOpenFilters}>
        <Icon name="filter" size={18} color={colors.primary[700]} />
        {activeFiltersCount > 0 ? <View style={styles.badge} /> : null}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  inputWrap: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    position: 'relative',
  },
  badge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderColor: colors.card.light,
    borderWidth: 1,
    position: 'absolute',
    right: 10,
    top: 10,
  },
});

export default SearchBar;
