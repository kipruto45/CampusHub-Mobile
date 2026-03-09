import { favoritesAPI } from './api';

export type FavoriteCategory =
  | 'resources'
  | 'resource'
  | 'files'
  | 'file'
  | 'folders'
  | 'folder';

const unwrap = <T>(response: any, fallback: T): T => {
  if (response?.data?.data !== undefined) return response.data.data as T;
  if (response?.data !== undefined) return response.data as T;
  return fallback;
};

export const favoritesService = {
  async getFavorites(params?: {
    page?: number;
    limit?: number;
    type?: FavoriteCategory;
  }) {
    const response = await favoritesAPI.list(params);
    return unwrap(response, {
      favorites: [],
      results: [],
      pagination: null,
    });
  },

  async toggleResourceFavorite(resourceId: string) {
    const response = await favoritesAPI.toggleResource(resourceId);
    return unwrap(response, response?.data || {});
  },

  async toggleFileFavorite(personalFileId: string) {
    const response = await favoritesAPI.toggleFile(personalFileId);
    return unwrap(response, response?.data || {});
  },

  async toggleFolderFavorite(personalFolderId: string) {
    const response = await favoritesAPI.toggleFolder(personalFolderId);
    return unwrap(response, response?.data || {});
  },

  async removeFavorite(favoriteId: string) {
    return favoritesAPI.remove(favoriteId);
  },
};
