// AI + keyword search screen for CampusHub

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useRef,useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Badge from '../../components/ui/Badge';
import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { aiAPI,resourcesAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

type SearchMode = 'hybrid' | 'semantic' | 'keyword';

interface SearchResultItem {
  id: string;
  title: string;
  description?: string;
  type?: string;
  score?: number;
  metadata?: Record<string, any>;
}

const MODE_OPTIONS: { label: string; value: SearchMode }[] = [
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Semantic', value: 'semantic' },
  { label: 'Keyword', value: 'keyword' },
];

export default function SearchScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('hybrid');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  const runSearch = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const response = await aiAPI.search(q, { type: mode, limit: 25 });
      const payload = response?.data?.data || response?.data || {};
      const items: SearchResultItem[] = (payload.results || payload || []).map((item: any) => ({
        id: String(item.id || item.slug || Math.random()),
        title: item.title || 'Untitled',
        description: item.description,
        type: item.type,
        score: item.score,
        metadata: item.metadata,
      }));
      setResults(items);
      if (!items.length) {
        showToast('info', 'No matches found. Try a different phrase.');
      }
    } catch (_err: any) {
      // Fallback to keyword search on resources API
      try {
        const fallback = await resourcesAPI.list({ search: q, limit: 20 });
        const list = fallback?.data?.data?.results || fallback?.data?.data || [];
        const items: SearchResultItem[] = list.map((item: any) => ({
          id: String(item.id),
          title: item.title,
          description: item.description,
          type: item.resource_type,
          metadata: item,
        }));
        setResults(items);
        setError('Semantic search unavailable, showing keyword results.');
      } catch (fallbackErr: any) {
        setError(
          fallbackErr?.response?.data?.message || fallbackErr?.message || 'Search failed. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [mode, showToast]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.trim().length >= 2) {
        void runSearch(query);
      } else {
        setResults([]);
        setError(null);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [mode, query, runSearch]);

  const renderItem = ({ item }: { item: SearchResultItem }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => router.push(`/(student)/resource/${item.id}` as any)}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        {typeof item.score === 'number' && (
          <Badge label={`${(item.score * 100).toFixed(0)}%`} variant="info" size="sm" />
        )}
      </View>
      {item.description ? (
        <Text numberOfLines={3} style={styles.resultDescription}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.metaRow}>
        <Badge label={item.type || 'resource'} variant="secondary" size="sm" />
        {item.metadata?.course && (
          <Badge label={item.metadata.course?.name || item.metadata.course} variant="outline" size="sm" />
        )}
      </View>
    </TouchableOpacity>
  );

  if (error && !results.length) {
    return (
      <ErrorState
        type="server"
        title="Search unavailable"
        message={error}
        onRetry={() => runSearch(query)}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchInputContainer}>
        <Icon name="search" size={18} color={colors.text.tertiary} />
        <TextInput
          ref={inputRef}
          placeholder="Search resources, topics, or questions"
          placeholderTextColor={colors.text.tertiary}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => runSearch(query)}
        />
        {query ? (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setError(null); }}>
            <Icon name="close-circle" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.modeRow}>
        {MODE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.modeChip, mode === option.value && styles.modeChipActive]}
            onPress={() => setMode(option.value)}
          >
            <Text style={[styles.modeChipText, mode === option.value && styles.modeChipTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Searching {mode}…</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            query.length >= 2 ? (
              <View style={styles.emptyState}>
                <Icon name="search" size={32} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No results yet</Text>
                <Text style={styles.emptySub}>Try another phrase or switch mode.</Text>
              </View>
            ) : null
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[9],
    paddingBottom: spacing[4],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    marginHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[3],
    color: colors.text.primary,
    fontSize: 15,
  },
  modeRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    gap: spacing[2],
  },
  modeChip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card.light,
  },
  modeChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
    borderWidth: 1,
  },
  modeChipText: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: colors.primary[600],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing[3],
    color: colors.text.secondary,
  },
  resultsList: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
  },
  resultCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing[2],
  },
  resultDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: spacing[12],
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing[2],
  },
  emptySub: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: spacing[1],
  },
});
