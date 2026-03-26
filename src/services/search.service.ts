import { collectionAlgorithms,searchAlgorithms } from './algorithms.service';
import { searchAPI } from './api';
import { localRecentSearchAutomation } from './mobileAutomation.service';

export type SearchSort =
  | 'relevance'
  | 'newest'
  | 'oldest'
  | 'most_downloaded'
  | 'highest_rated'
  | 'most_viewed'
  | 'most_favorited';

export interface SearchFilters {
  faculty?: string;
  department?: string;
  course?: string;
  unit?: string;
  year?: string | number;
  semester?: string | number;
  resource_type?: string;
  file_type?: string;
  sort?: SearchSort;
}

export interface SearchSuggestion {
  value: string;
  type: 'title' | 'course' | 'unit' | 'tag' | 'recent';
}

export interface RecentSearchItem {
  id: string;
  query: string;
  normalized_query: string;
  filters: Record<string, unknown>;
  results_count: number;
  last_searched_at: string;
}

const unwrap = <T>(response: any, fallback: T): T => {
  if (response?.data?.data !== undefined) return response.data.data as T;
  if (response?.data !== undefined) return response.data as T;
  return fallback;
};

export const searchService = {
  async searchResources(params: {
    q: string;
    filters?: SearchFilters;
    page?: number;
    signal?: AbortSignal;
  }) {
    const query = searchAlgorithms.normalizeQuery(params.q);
    const filters = searchAlgorithms.normalizeFilters(
      (params.filters || {}) as Record<string, unknown>
    ) as SearchFilters;
    const response = await searchAPI.search(
      query,
      {
        ...filters,
        page: params.page,
      },
      { signal: params.signal }
    );
    const payload = unwrap(response, { results: [], count: 0, next: null, previous: null });
    const results = searchAlgorithms.rankResources(
      Array.isArray(payload.results) ? payload.results : [],
      query,
      filters as Record<string, unknown>
    );

    await localRecentSearchAutomation.saveSearch({
      query,
      filters: filters as Record<string, unknown>,
      resultsCount: results.length,
    });

    return {
      ...payload,
      results,
      count: payload.count ?? results.length,
    };
  },

  async getSuggestions(q: string, limit: number = 10) {
    const query = searchAlgorithms.normalizeQuery(q);
    if (!query) {
      return { suggestions: [], typed_suggestions: [] };
    }

    const response = await searchAPI.suggestions(query, limit);
    const payload = unwrap<{
      suggestions: string[];
      typed_suggestions: SearchSuggestion[];
    }>(response, { suggestions: [], typed_suggestions: [] });
    const localRecent = await localRecentSearchAutomation.list(limit);
    const typedSuggestions = searchAlgorithms.mergeSuggestions(
      payload.typed_suggestions || [],
      localRecent,
      limit
    ) as SearchSuggestion[];

    return {
      suggestions: collectionAlgorithms
        .uniqueBy(
          [...(payload.suggestions || []), ...typedSuggestions.map((item) => item.value)],
          (item) => String(item).toLowerCase()
        )
        .slice(0, limit),
      typed_suggestions: typedSuggestions,
    };
  },

  async getRecentSearches(limit: number = 10): Promise<RecentSearchItem[]> {
    const [localRecent, remoteRecent] = await Promise.all([
      localRecentSearchAutomation.list(limit),
      searchAPI
        .recentSearches(limit)
        .then((response) => unwrap<RecentSearchItem[]>(response, []))
        .catch(() => [] as RecentSearchItem[]),
    ]);

    const merged = collectionAlgorithms.uniqueBy(
      collectionAlgorithms.sortByTimestampDesc(
        [...remoteRecent, ...localRecent],
        (item) => item.last_searched_at
      ),
      (item) => item.normalized_query || item.query
    );

    return merged.slice(0, limit);
  },

  async clearRecentSearches() {
    await localRecentSearchAutomation.clear();
    try {
      return await searchAPI.clearRecentSearches();
    } catch {
      return null;
    }
  },

  async deleteRecentSearch(id: string) {
    await localRecentSearchAutomation.removeSearch(id);
    try {
      return await searchAPI.deleteRecentSearch(id);
    } catch {
      return null;
    }
  },
};
