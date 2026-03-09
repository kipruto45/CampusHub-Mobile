export interface SearchRankableItem {
  id: string;
  title?: string;
  description?: string;
  resource_type?: string;
  tags?: string[] | string;
  course?: { code?: string; name?: string } | string;
  unit?: { code?: string; name?: string } | string;
  download_count?: number;
  average_rating?: number;
  view_count?: number;
  is_bookmarked?: boolean;
  is_favorited?: boolean;
  created_at?: string;
}

export interface SuggestionCandidate {
  value: string;
  type: string;
}

export interface FolderLike {
  id: string;
  name: string;
  parent?: string | null;
  is_favorite?: boolean;
  created_at?: string;
  updated_at?: string;
}

const normalizeText = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const scoreDate = (value?: string | null): number => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

class CollectionAlgorithms {
  uniqueBy<T>(items: T[], keySelector: (item: T) => string): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = keySelector(item);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  sortByTimestampDesc<T>(items: T[], selector: (item: T) => string | undefined | null): T[] {
    return [...items].sort((left, right) => scoreDate(selector(right)) - scoreDate(selector(left)));
  }

  groupBy<T>(items: T[], keySelector: (item: T) => string): Record<string, T[]> {
    return items.reduce<Record<string, T[]>>((groups, item) => {
      const key = keySelector(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }
}

class SearchAlgorithms {
  normalizeQuery(query: string): string {
    return String(query || '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  normalizeFilters<T extends Record<string, unknown>>(filters: T): T {
    return Object.entries(filters).reduce((acc, [key, value]) => {
      if (value === undefined || value === null || value === '') {
        return acc;
      }
      acc[key as keyof T] = value as T[keyof T];
      return acc;
    }, {} as T);
  }

  rankResources<T extends SearchRankableItem>(
    items: T[],
    query: string,
    filters: Record<string, unknown> = {}
  ): T[] {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      return collectionAlgorithms.uniqueBy(items, (item) => String(item.id));
    }

    const normalizedFilters = this.normalizeFilters(filters);
    const scored = collectionAlgorithms.uniqueBy(items, (item) => String(item.id)).map((item) => {
      const title = normalizeText(item.title);
      const description = normalizeText(item.description);
      const resourceType = normalizeText(item.resource_type);
      const course =
        typeof item.course === 'string'
          ? normalizeText(item.course)
          : normalizeText(`${item.course?.code || ''} ${item.course?.name || ''}`);
      const unit =
        typeof item.unit === 'string'
          ? normalizeText(item.unit)
          : normalizeText(`${item.unit?.code || ''} ${item.unit?.name || ''}`);
      const tags = Array.isArray(item.tags)
        ? item.tags.map((tag) => normalizeText(tag))
        : normalizeText(item.tags)
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);

      let score = 0;

      if (title === normalizedQuery) score += 5;
      else if (title.startsWith(normalizedQuery)) score += 4;
      else if (title.includes(normalizedQuery)) score += 3;

      if (description.includes(normalizedQuery)) score += 2;
      if (course.includes(normalizedQuery)) score += 2;
      if (unit.includes(normalizedQuery)) score += 2;
      if (resourceType.includes(normalizedQuery)) score += 1;
      if (tags.some((tag) => tag.includes(normalizedQuery))) score += 2;

      score += Math.min(Number(item.download_count || 0) / 50, 2);
      score += Math.min(Number(item.view_count || 0) / 100, 1);
      score += Math.min(Number(item.average_rating || 0) / 5, 1);
      if (item.is_bookmarked) score += 0.5;
      if (item.is_favorited) score += 0.5;

      if (normalizedFilters.resource_type && resourceType === normalizeText(normalizedFilters.resource_type)) {
        score += 1;
      }

      return { item, score };
    });

    return scored
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        return scoreDate(right.item.created_at) - scoreDate(left.item.created_at);
      })
      .map((entry) => entry.item);
  }

  mergeSuggestions<T extends SuggestionCandidate>(
    typedSuggestions: T[],
    recentQueries: Array<{ query?: string }>,
    limit: number = 10
  ): SuggestionCandidate[] {
    const recentSuggestions: SuggestionCandidate[] = recentQueries
      .map((item) => item.query?.trim())
      .filter(Boolean)
      .map((value) => ({
        value: String(value),
        type: 'recent',
      }));

    const merged = [...typedSuggestions, ...recentSuggestions];
    return collectionAlgorithms.uniqueBy(
      merged.filter((item) => item.value.trim().length > 0),
      (item) => `${item.type}:${normalizeText(item.value)}`
    ).slice(0, limit);
  }
}

class FolderAlgorithms {
  sortFolders<T extends FolderLike>(folders: T[]): T[] {
    return [...folders].sort((left, right) => {
      const favoriteWeight = Number(Boolean(right.is_favorite)) - Number(Boolean(left.is_favorite));
      if (favoriteWeight !== 0) {
        return favoriteWeight;
      }

      const updatedDelta = scoreDate(right.updated_at || right.created_at) - scoreDate(left.updated_at || left.created_at);
      if (updatedDelta !== 0) {
        return updatedDelta;
      }

      return left.name.localeCompare(right.name);
    });
  }

  sortFiles<T extends { title?: string; name?: string; is_favorite?: boolean; last_accessed_at?: string | null; updated_at?: string; created_at?: string }>(
    files: T[]
  ): T[] {
    return [...files].sort((left, right) => {
      const favoriteWeight = Number(Boolean(right.is_favorite)) - Number(Boolean(left.is_favorite));
      if (favoriteWeight !== 0) {
        return favoriteWeight;
      }

      const recentDelta =
        scoreDate(right.last_accessed_at || right.updated_at || right.created_at) -
        scoreDate(left.last_accessed_at || left.updated_at || left.created_at);
      if (recentDelta !== 0) {
        return recentDelta;
      }

      return String(left.title || left.name || '').localeCompare(String(right.title || right.name || ''));
    });
  }

  buildBreadcrumbs<T extends FolderLike>(folderId: string, folders: T[]): T[] {
    const index = new Map(folders.map((folder) => [String(folder.id), folder]));
    const breadcrumbs: T[] = [];
    const visited = new Set<string>();
    let current = index.get(String(folderId));

    while (current && !visited.has(String(current.id))) {
      breadcrumbs.unshift(current);
      visited.add(String(current.id));
      current = current.parent ? index.get(String(current.parent)) : undefined;
    }

    return breadcrumbs;
  }

  collectDescendantIds(folderId: string, folders: FolderLike[]): Set<string> {
    const descendants = new Set<string>();
    const childrenMap = folders.reduce<Map<string, FolderLike[]>>((map, folder) => {
      const parentId = String(folder.parent || '');
      const siblings = map.get(parentId) || [];
      siblings.push(folder);
      map.set(parentId, siblings);
      return map;
    }, new Map<string, FolderLike[]>());

    const visit = (currentId: string) => {
      const children = childrenMap.get(currentId) || [];
      children.forEach((child) => {
        const childId = String(child.id);
        if (!descendants.has(childId)) {
          descendants.add(childId);
          visit(childId);
        }
      });
    };

    visit(String(folderId));
    return descendants;
  }

  validateMove(folderId: string, targetParentId: string | null, folders: FolderLike[]) {
    if (!targetParentId) {
      return { valid: true as const };
    }

    if (String(folderId) === String(targetParentId)) {
      return { valid: false as const, reason: 'A folder cannot be moved into itself.' };
    }

    const descendants = this.collectDescendantIds(folderId, folders);
    if (descendants.has(String(targetParentId))) {
      return { valid: false as const, reason: 'A folder cannot be moved into one of its descendants.' };
    }

    return { valid: true as const };
  }

  generateDuplicateSafeName(desiredName: string, existingNames: string[]): string {
    const baseName = desiredName.trim().replace(/\s+/g, ' ') || 'New Folder';
    const existing = new Set(existingNames.map((name) => normalizeText(name)));

    if (!existing.has(normalizeText(baseName))) {
      return baseName;
    }

    let suffix = 2;
    let candidate = `${baseName} (${suffix})`;
    while (existing.has(normalizeText(candidate))) {
      suffix += 1;
      candidate = `${baseName} (${suffix})`;
    }
    return candidate;
  }
}

export const collectionAlgorithms = new CollectionAlgorithms();
export const searchAlgorithms = new SearchAlgorithms();
export const folderAlgorithms = new FolderAlgorithms();
