// Admin Global Search Screen for CampusHub
// Universal search across all entities

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';

type SearchType =
  | 'all'
  | 'users'
  | 'resources'
  | 'faculties'
  | 'departments'
  | 'courses'
  | 'units'
  | 'reports';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
}

const SearchScreen: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedType, setSelectedType] = useState<SearchType>('all');

  const searchTypes: { key: SearchType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'search' },
    { key: 'users', label: 'Users', icon: 'person' },
    { key: 'resources', label: 'Resources', icon: 'document-text' },
    { key: 'faculties', label: 'Faculties', icon: 'school' },
    { key: 'departments', label: 'Departments', icon: 'library' },
    { key: 'courses', label: 'Courses', icon: 'book' },
    { key: 'units', label: 'Units', icon: 'bookmark' },
    { key: 'reports', label: 'Reports', icon: 'flag' },
  ];

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await adminAPI.search(query.trim(), 20);
      const searchResults = response.data?.data?.results || [];
      setResults(
        selectedType === 'all'
          ? searchResults
          : searchResults.filter((item: SearchResult) => item.type === selectedType)
      );
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [query, selectedType]);

  useEffect(() => {
    const timeout = setTimeout(performSearch, 300);
    return () => clearTimeout(timeout);
  }, [performSearch]);

  const handleResultPress = (result: SearchResult) => {
    const routes: Record<string, string> = {
      users: `/(admin)/user-detail?id=${result.id}`,
      resources: `/(admin)/resource-detail?id=${result.id}`,
      faculties: '/(admin)/faculties',
      departments: '/(admin)/departments',
      courses: '/(admin)/courses',
      units: '/(admin)/units',
      reports: `/(admin)/report-detail?id=${result.id}`,
      announcements: '/(admin)/announcements',
    };
    router.push(routes[result.type] as any || '/(admin)/dashboard');
  };

  const getTypeIcon = (type: string) => {
    const typeItem = searchTypes.find(t => t.key === type);
    if (type === 'faculties') return 'school';
    if (type === 'departments') return 'library';
    return typeItem?.icon || 'document';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name={'arrow-back'} size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.title}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name={'search'} size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users, resources, courses..."
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Icon name={'close-circle'} size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Type Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={searchTypes}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, selectedType === item.key && styles.filterChipActive]}
              onPress={() => setSelectedType(item.key)}
            >
              <Icon name={item.icon as any} size={16} color={selectedType === item.key ? colors.text.inverse : colors.text.secondary} />
              <Text style={[styles.filterChipText, selectedType === item.key && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => handleResultPress(item)}>
              <View style={[styles.resultIcon, { backgroundColor: colors.primary[500] + '20' }]}>
                <Icon name={getTypeIcon(item.type) as any} size={20} color={colors.primary[500]} />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle}>{item.title}</Text>
                {item.subtitle && <Text style={styles.resultSubtitle}>{item.subtitle}</Text>}
              </View>
              <Icon name={'chevron-forward'} size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query ? (
              <View style={styles.emptyState}>
                <Icon name={'search'} size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name={'search'} size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>Start typing to search</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: spacing[4], paddingTop: spacing[8], backgroundColor: colors.primary[500],
  },
  backButton: { marginRight: spacing[3] },
  title: { fontSize: 20, fontWeight: '700', color: colors.text.inverse },
  searchContainer: { padding: spacing[4], backgroundColor: colors.background.primary },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[2],
  },
  searchInput: { flex: 1, marginLeft: spacing[2], fontSize: 16, color: colors.text.primary },
  filtersContainer: { paddingHorizontal: spacing[4], paddingBottom: spacing[3], backgroundColor: colors.background.primary },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: borderRadius.full, backgroundColor: colors.background.secondary, marginRight: spacing[2], gap: spacing[1],
  },
  filterChipActive: { backgroundColor: colors.primary[500] },
  filterChipText: { fontSize: 14, color: colors.text.secondary },
  filterChipTextActive: { color: colors.text.inverse },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  resultsList: { padding: spacing[4] },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[3], ...shadows.sm,
  },
  resultIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: spacing[3] },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  resultSubtitle: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[10] },
  emptyText: { fontSize: 16, color: colors.text.tertiary, marginTop: spacing[2] },
});

export default SearchScreen;
