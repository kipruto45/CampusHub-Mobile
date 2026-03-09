import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { searchService, SearchFilters, SearchSuggestion } from '../services/search.service';

const MIN_QUERY_LENGTH = 2;

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({ sort: 'relevance' });
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const activeFiltersCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([key, value]) =>
          value !== undefined &&
          value !== null &&
          value !== '' &&
          !(key === 'sort' && value === 'relevance')
      ).length,
    [filters]
  );

  const loadRecentSearches = useCallback(async () => {
    try {
      const recent = await searchService.getRecentSearches(8);
      setRecentSearches(recent);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  const runSearch = useCallback(
    async (nextQuery?: string) => {
      const keyword = (nextQuery ?? query).trim();
      if (keyword.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setError(null);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const payload = await searchService.searchResources({
          q: keyword,
          filters,
          signal: controller.signal,
        });
        setResults(Array.isArray(payload.results) ? payload.results : []);
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') {
          return;
        }
        setError(
          err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            'Search failed.'
        );
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [filters, query]
  );

  const loadSuggestions = useCallback(async (value: string) => {
    const keyword = value.trim();
    if (keyword.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }
    setSuggestionLoading(true);
    try {
      const payload = await searchService.getSuggestions(keyword, 8);
      setSuggestions(payload.typed_suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionLoading(false);
    }
  }, []);

  const clearQuery = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setError(null);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ sort: 'relevance' });
  }, []);

  const removeRecentSearch = useCallback(
    async (id: string) => {
      try {
        await searchService.deleteRecentSearch(id);
        setRecentSearches((prev) => prev.filter((item) => item.id !== id));
      } catch {
        // ignore remove errors in UI flow
      }
    },
    []
  );

  const clearRecentSearches = useCallback(async () => {
    try {
      await searchService.clearRecentSearches();
      setRecentSearches([]);
    } catch {
      // ignore clear errors in UI flow
    }
  }, []);

  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadSuggestions(query);
      runSearch(query);
    }, 350);
    return () => clearTimeout(timeout);
  }, [query, filters, loadSuggestions, runSearch]);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    suggestions,
    recentSearches,
    loading,
    suggestionLoading,
    error,
    runSearch,
    loadRecentSearches,
    refreshRecentSearches: loadRecentSearches,
    clearQuery,
    clearFilters,
    removeRecentSearch,
    clearRecentSearches,
    isFilterSheetOpen,
    openFilterSheet: () => setIsFilterSheetOpen(true),
    closeFilterSheet: () => setIsFilterSheetOpen(false),
    activeFiltersCount,
    minQueryLength: MIN_QUERY_LENGTH,
  };
};
