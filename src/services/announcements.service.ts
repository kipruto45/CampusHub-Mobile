// Announcements API Service for CampusHub Mobile App
// Handles all announcement-related API calls

import api from './api';

export interface AnnouncementAttachment {
  id: string;
  file?: string;
  file_url: string;
  filename: string;
  file_size: number;
  formatted_file_size: string;
  file_type: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  slug: string;
  content: string;
  announcement_type: string;
  announcement_type_display: string;
  status: string;
  status_display: string;
  is_pinned: boolean;
  target_faculty?: number;
  target_department?: number;
  target_course?: number;
  target_year_of_study?: number;
  target_summary: string;
  published_at: string;
  created_by?: number;
  created_by_name?: string;
  attachments: AnnouncementAttachment[];
  attachment_count: number;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  attachment_size?: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Announcement[];
}

class AnnouncementsApiService {
  // Admin: Get all announcements with pagination
  async getAdminAnnouncements(params?: {
    page?: number;
    page_size?: number;
  }): Promise<AnnouncementListResponse> {
    const response = await api.get<AnnouncementListResponse>(
      '/announcements/admin/',
      { params }
    );
    return response.data;
  }

  // Get all announcements with pagination
  async getAnnouncements(params?: {
    page?: number;
    page_size?: number;
  }): Promise<AnnouncementListResponse> {
    const response = await api.get<AnnouncementListResponse>(
      '/announcements/',
      { params }
    );
    return response.data;
  }

  // Get pinned announcements
  async getPinnedAnnouncements(): Promise<Announcement[]> {
    const response = await api.get<Announcement[]>(
      '/announcements/pinned/'
    );
    return response.data;
  }

  // Get announcement by slug
  async getAnnouncement(slug: string): Promise<Announcement> {
    const response = await api.get<Announcement>(
      `/announcements/${slug}/`
    );
    return response.data;
  }

  // Get dashboard announcements (preview)
  async getDashboardAnnouncements(limit: number = 5): Promise<Announcement[]> {
    const response = await api.get<Announcement[]>(
      '/announcements/dashboard/',
      { params: { limit } }
    );
    return response.data;
  }

  // Get announcements filtered by type
  async getAnnouncementsByType(
    announcementType: string,
    params?: { page?: number; page_size?: number }
  ): Promise<AnnouncementListResponse> {
    const response = await api.get<AnnouncementListResponse>(
      '/announcements/',
      { params: { ...params, announcement_type: announcementType } }
    );
    return response.data;
  }

  // Get visible announcements for current user (filtered by their profile)
  async getVisibleAnnouncements(params?: {
    page?: number;
    page_size?: number;
  }): Promise<AnnouncementListResponse> {
    const response = await api.get<AnnouncementListResponse>(
      '/announcements/',
      { params }
    );
    return response.data;
  }

  // Admin: Create announcement
  async createAnnouncement(data: FormData): Promise<Announcement> {
    const response = await api.post<Announcement>(
      '/announcements/admin/',
      data,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  }

  // Admin: Update announcement
  async updateAnnouncement(
    slug: string,
    data: FormData
  ): Promise<Announcement> {
    const response = await api.patch<Announcement>(
      `/announcements/admin/${slug}/`,
      data,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  }

  // Admin: Publish announcement
  async publishAnnouncement(slug: string): Promise<Announcement> {
    const response = await api.post<Announcement>(
      `/announcements/admin/${slug}/publish/`
    );
    return response.data;
  }

  // Admin: Archive announcement
  async archiveAnnouncement(slug: string): Promise<Announcement> {
    const response = await api.post<Announcement>(
      `/announcements/admin/${slug}/archive/`
    );
    return response.data;
  }

  // Admin: Unpublish announcement
  async unpublishAnnouncement(slug: string): Promise<Announcement> {
    const response = await api.post<Announcement>(
      `/announcements/admin/${slug}/unpublish/`
    );
    return response.data;
  }

  // Admin: Delete announcement
  async deleteAnnouncement(slug: string): Promise<void> {
    await api.delete(`/announcements/admin/${slug}/`);
  }
}

// Export singleton instance
export const announcementsApi = new AnnouncementsApiService();

export default AnnouncementsApiService;
