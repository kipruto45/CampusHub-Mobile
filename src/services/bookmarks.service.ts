import { bookmarksAPI } from './api';

export interface BookmarkListParams {
  page?: number;
  limit?: number;
  sort?: string;
  resource_type?: string;
  course?: string;
  unit?: string;
}

const unwrap = <T>(response: any, fallback: T): T => {
  if (response?.data?.data !== undefined) return response.data.data as T;
  if (response?.data !== undefined) return response.data as T;
  return fallback;
};

export const bookmarksService = {
  async getBookmarks(params?: BookmarkListParams) {
    const response = await bookmarksAPI.list(params);
    return unwrap(response, {
      bookmarks: [],
      results: [],
      pagination: null,
    });
  },

  async toggleResourceBookmark(resourceId: string) {
    const response = await bookmarksAPI.add(resourceId);
    return unwrap(response, response?.data || {});
  },

  async removeBookmark(bookmarkId: string) {
    return bookmarksAPI.remove(bookmarkId);
  },
};
