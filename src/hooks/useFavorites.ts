import { useCallback, useEffect, useMemo, useState } from 'react';

import { favoritesAPI } from '../services/api';
import { networkService, syncQueueService } from '../services/offline';

export type FavoriteTargetType = 'resource' | 'file' | 'folder';
export type FavoriteFilterType = 'resources' | 'files' | 'folders';

export interface Favorite {
  id: string;
  favorite_type: 'resource' | 'personal_file' | 'folder';
  target_type: FavoriteTargetType;
  target_id: string;
  resource?: any;
  personal_file?: any;
  personal_folder?: any;
  created_at: string;
}

interface UseFavoritesResult {
  // Legacy contract
  favorites: Favorite[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  resourceFavorites: Favorite[];
  fileFavorites: Favorite[];
  folderFavorites: Favorite[];
  refresh: () => Promise<void>;
  addFavorite: (targetType: FavoriteTargetType, targetId: string) => Promise<boolean>;
  removeFavorite: (targetTypeOrFavoriteId: FavoriteTargetType | string, targetId?: string) => Promise<boolean>;
  toggleFavorite: (targetType: FavoriteTargetType, targetId: string) => Promise<boolean>;
  isFavorited: (targetType: FavoriteTargetType, targetId: string) => boolean;
  // Modern aliases
  activeType: FavoriteFilterType;
  setActiveType: (type: FavoriteFilterType) => void;
  items: Favorite[];
  loading: boolean;
  refreshing: boolean;
}

const unwrap = (response: any) => {
  if (response?.data?.data) return response.data.data;
  if (response?.data) return response.data;
  return response || {};
};

const mapFilterToApiType = (type: FavoriteFilterType) => {
  if (type === 'resources') return 'resources';
  if (type === 'files') return 'files';
  return 'folders';
};

const mapTargetTypeToFavoriteType = (targetType: FavoriteTargetType) => {
  if (targetType === 'resource') return 'resource' as const;
  if (targetType === 'file') return 'personal_file' as const;
  return 'folder' as const;
};

const normalizeFavorite = (item: any): Favorite => {
  const favoriteType = item?.favorite_type || 'resource';
  const targetType: FavoriteTargetType =
    favoriteType === 'personal_file' ? 'file' : favoriteType === 'folder' ? 'folder' : 'resource';
  const targetId =
    targetType === 'resource'
      ? String(item?.resource?.id || '')
      : targetType === 'file'
      ? String(item?.personal_file?.id || '')
      : String(item?.personal_folder?.id || '');

  return {
    id: String(item?.id || ''),
    favorite_type: favoriteType,
    target_type: targetType,
    target_id: targetId,
    resource: item?.resource || null,
    personal_file: item?.personal_file || null,
    personal_folder: item?.personal_folder || null,
    created_at: item?.created_at || item?.saved_at || '',
  };
};

export function useFavorites(initialType: FavoriteFilterType = 'resources'): UseFavoritesResult {
  const [activeType, setActiveType] = useState<FavoriteFilterType>(initialType);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    if (favorites.length) {
      setRefreshing(true);
    }
    setIsLoading(true);
    try {
      const response = await favoritesAPI.list({ type: mapFilterToApiType(activeType) as any });
      const payload = unwrap(response);
      const list = payload?.favorites || payload?.results || [];
      setFavorites((Array.isArray(list) ? list : []).map(normalizeFavorite));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load favorites');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeType, favorites.length]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addFavorite = useCallback(
    async (targetType: FavoriteTargetType, targetId: string): Promise<boolean> => {
      if (
        favorites.some(
          (favorite) =>
            favorite.target_type === targetType && String(favorite.target_id) === String(targetId)
        )
      ) {
        return true;
      }

      const optimisticFavorite: Favorite = {
        id: `local-favorite-${targetType}-${targetId}`,
        favorite_type: mapTargetTypeToFavoriteType(targetType),
        target_type: targetType,
        target_id: targetId,
        created_at: new Date().toISOString(),
      };

      setFavorites((prev) => [optimisticFavorite, ...prev]);

      try {
        const favoriteType = mapTargetTypeToFavoriteType(targetType);
        await favoritesAPI.add({
          favorite_type: favoriteType,
          resource_id: targetType === 'resource' ? targetId : undefined,
          personal_file_id: targetType === 'file' ? targetId : undefined,
          personal_folder_id: targetType === 'folder' ? targetId : undefined,
        });
        await refresh();
        return true;
      } catch (err: any) {
        const isOffline = !(await networkService.isConnected()) || !err?.response;
        if (isOffline) {
          await syncQueueService.addAction('favorite_add', {
            target_type: targetType,
            target_id: targetId,
            desiredState: true,
          });
          return true;
        }
        setFavorites((prev) =>
          prev.filter(
            (favorite) =>
              !(favorite.target_type === targetType && String(favorite.target_id) === String(targetId))
          )
        );
        console.error('Failed to add favorite:', err);
        return false;
      }
    },
    [favorites, refresh]
  );

  const removeFavorite = useCallback(
    async (
      targetTypeOrFavoriteId: FavoriteTargetType | string,
      targetId?: string
    ): Promise<boolean> => {
      const previous = favorites;
      try {
        if (targetId) {
          const matched = favorites.find(
            (favorite) =>
              favorite.target_type === targetTypeOrFavoriteId && favorite.target_id === targetId
          );
          setFavorites((prev) =>
            prev.filter(
              (favorite) =>
                !(favorite.target_type === targetTypeOrFavoriteId && favorite.target_id === targetId)
            )
          );
          if (matched) {
            await favoritesAPI.remove(matched.id);
          }
        } else {
          setFavorites((prev) =>
            prev.filter((favorite) => favorite.id !== String(targetTypeOrFavoriteId))
          );
          await favoritesAPI.remove(String(targetTypeOrFavoriteId));
        }
        await refresh();
        return true;
      } catch (err: any) {
        const isOffline = !(await networkService.isConnected()) || !err?.response;
        if (isOffline && targetId) {
          await syncQueueService.addAction('favorite_remove', {
            target_type: targetTypeOrFavoriteId,
            target_id: targetId,
            desiredState: false,
          });
          return true;
        }
        setFavorites(previous);
        console.error('Failed to remove favorite:', err);
        return false;
      }
    },
    [favorites, refresh]
  );

  const toggleFavorite = useCallback(
    async (targetType: FavoriteTargetType, targetId: string): Promise<boolean> => {
      const alreadyFavorited = favorites.some(
        (favorite) =>
          favorite.target_type === targetType && String(favorite.target_id) === String(targetId)
      );

      if (alreadyFavorited) {
        return removeFavorite(targetType, targetId);
      }

      return addFavorite(targetType, targetId);
    },
    [addFavorite, favorites, removeFavorite]
  );

  const isFavorited = useCallback(
    (targetType: FavoriteTargetType, targetId: string): boolean =>
      favorites.some(
        (favorite) =>
          favorite.target_type === targetType && String(favorite.target_id) === String(targetId)
      ),
    [favorites]
  );

  const resourceFavorites = useMemo(
    () => favorites.filter((favorite) => favorite.target_type === 'resource'),
    [favorites]
  );
  const fileFavorites = useMemo(
    () => favorites.filter((favorite) => favorite.target_type === 'file'),
    [favorites]
  );
  const folderFavorites = useMemo(
    () => favorites.filter((favorite) => favorite.target_type === 'folder'),
    [favorites]
  );

  return {
    favorites,
    isLoading,
    error,
    totalCount: favorites.length,
    resourceFavorites,
    fileFavorites,
    folderFavorites,
    refresh,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorited,
    activeType,
    setActiveType,
    items: favorites,
    loading: isLoading,
    refreshing,
  };
}

export default useFavorites;
