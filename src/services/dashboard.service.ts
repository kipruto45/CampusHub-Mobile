// Dashboard API Service for CampusHub Mobile App
// Handles normalized dashboard-related API calls with lightweight caching

import api,{ normalizeAbsoluteAppUrl } from './api';

// User Summary Types
export interface DashboardUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar?: string;
  role: string;
}

export interface DashboardUserSummary {
  user: DashboardUser;
  profile_completion: number;
  is_profile_complete: boolean;
  academic_info?: {
    faculty?: string | null;
    department?: string | null;
    course?: string | null;
    year_of_study?: number | null;
    semester?: string | number | null;
  };
}

export interface DashboardQuickStats {
  bookmarks_count: number;
  personal_files_count: number;
  uploads_count: number;
  downloads_count: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  storage_percent_used: number;
}

export interface DashboardActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  url: string;
}

export interface DashboardRecentActivity {
  recent_uploads: DashboardActivityItem[];
  recent_downloads: DashboardActivityItem[];
  recent_bookmarks: DashboardActivityItem[];
}

export interface DashboardRecommendation {
  id: string;
  title: string;
  description: string;
  resource_type?: string;
  file_type: string;
  file_size: number;
  download_count: number;
  average_rating: number;
  uploaded_by: string;
  course_name?: string | null;
  url: string;
}

export interface DashboardRecommendations {
  for_you: DashboardRecommendation[];
  trending: DashboardRecommendation[];
  course_related: DashboardRecommendation[];
  recently_added: DashboardRecommendation[];
}

export interface DashboardAnnouncement {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  is_active: boolean;
}

export interface DashboardPendingUpload {
  id: string;
  title: string;
  description: string;
  file_type: string;
  course_name?: string | null;
  uploaded_at: string;
  status: string;
}

export interface DashboardPendingUploads {
  pending_approval: DashboardPendingUpload[];
  rejected: DashboardPendingUpload[];
  total_pending: number;
  total_rejected: number;
}

export interface DashboardNotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardNotificationSummary {
  unread_count: number;
  recent_notifications: DashboardNotificationItem[];
}

export interface DashboardData {
  user_summary: DashboardUserSummary;
  quick_stats: DashboardQuickStats;
  recent_activity: DashboardRecentActivity;
  recommendations: DashboardRecommendations;
  announcements: DashboardAnnouncement[];
  pending_uploads: DashboardPendingUploads;
  notifications: DashboardNotificationSummary;
}

const DASHBOARD_CACHE_TTL_MS = 30_000;

const unwrapPayload = <T>(raw: any): T => {
  if (
    raw &&
    typeof raw === 'object' &&
    'data' in raw &&
    ('success' in raw || 'message' in raw || 'errors' in raw)
  ) {
    return raw.data as T;
  }
  return raw as T;
};

const asArray = <T>(value: any): T[] => (Array.isArray(value) ? value : []);
const toStringValue = (value: any): string => (value == null ? '' : String(value));
const toNumberValue = (value: any): number => Number(value || 0);

const normalizeActivityItem = (raw: any): DashboardActivityItem => ({
  id: toStringValue(raw?.id),
  type: toStringValue(raw?.type),
  title: toStringValue(raw?.title),
  description: toStringValue(raw?.description),
  timestamp: toStringValue(raw?.timestamp || raw?.created_at),
  url: toStringValue(raw?.url),
});

const normalizeRecommendation = (raw: any): DashboardRecommendation => ({
  id: toStringValue(raw?.id),
  title: toStringValue(raw?.title),
  description: toStringValue(raw?.description),
  resource_type: toStringValue(raw?.resource_type || raw?.file_type),
  file_type: toStringValue(raw?.file_type),
  file_size: toNumberValue(raw?.file_size),
  download_count: toNumberValue(raw?.download_count),
  average_rating: Number(raw?.average_rating || 0),
  uploaded_by: toStringValue(raw?.uploaded_by),
  course_name: raw?.course_name ?? null,
  url: toStringValue(raw?.url),
});

const normalizeAnnouncement = (raw: any): DashboardAnnouncement => ({
  id: toStringValue(raw?.id),
  title: toStringValue(raw?.title),
  message: toStringValue(raw?.message || raw?.content),
  type: toStringValue(raw?.type || raw?.announcement_type),
  created_at: toStringValue(raw?.created_at || raw?.published_at),
  is_active: Boolean(raw?.is_active ?? true),
});

const normalizeNotification = (raw: any): DashboardNotificationItem => ({
  id: toStringValue(raw?.id),
  title: toStringValue(raw?.title),
  message: toStringValue(raw?.message),
  type: toStringValue(raw?.type || raw?.notification_type),
  is_read: Boolean(raw?.is_read),
  created_at: toStringValue(raw?.created_at),
});

const normalizeQuickStats = (raw: any): DashboardQuickStats => ({
  bookmarks_count: toNumberValue(raw?.bookmarks_count),
  personal_files_count: toNumberValue(raw?.personal_files_count),
  uploads_count: toNumberValue(raw?.uploads_count),
  downloads_count: toNumberValue(raw?.downloads_count),
  storage_used_mb: Number(raw?.storage_used_mb || 0),
  storage_limit_mb: Number(raw?.storage_limit_mb || 0),
  storage_percent_used: Number(raw?.storage_percent_used || 0),
});

const emptyDashboardData = (): DashboardData => ({
  user_summary: {
    user: {
      id: '',
      email: '',
      first_name: '',
      last_name: '',
      full_name: '',
      role: '',
    },
    profile_completion: 0,
    is_profile_complete: false,
    academic_info: {},
  },
  quick_stats: normalizeQuickStats({}),
  recent_activity: {
    recent_uploads: [],
    recent_downloads: [],
    recent_bookmarks: [],
  },
  recommendations: {
    for_you: [],
    trending: [],
    course_related: [],
    recently_added: [],
  },
  announcements: [],
  pending_uploads: {
    pending_approval: [],
    rejected: [],
    total_pending: 0,
    total_rejected: 0,
  },
  notifications: {
    unread_count: 0,
    recent_notifications: [],
  },
});

const normalizeDashboardPayload = (raw: any): DashboardData => {
  const payload = unwrapPayload<any>(raw) || {};
  const fallback = emptyDashboardData();
  const summaryUser = payload?.user_summary?.user || {};
  const summaryAvatar =
    summaryUser?.avatar || summaryUser?.profile_image_url || summaryUser?.profile_image;

  return {
    ...fallback,
    user_summary: {
      user: {
        id: toStringValue(summaryUser?.id),
        email: toStringValue(summaryUser?.email),
        first_name: toStringValue(summaryUser?.first_name),
        last_name: toStringValue(summaryUser?.last_name),
        full_name: toStringValue(
          summaryUser?.full_name ||
            `${toStringValue(summaryUser?.first_name)} ${toStringValue(
              summaryUser?.last_name
            )}`.trim()
        ),
        avatar: normalizeAbsoluteAppUrl(summaryAvatar) || undefined,
        role: toStringValue(summaryUser?.role),
      },
      profile_completion: toNumberValue(payload?.user_summary?.profile_completion),
      is_profile_complete: Boolean(payload?.user_summary?.is_profile_complete),
      academic_info: payload?.user_summary?.academic_info || {},
    },
    quick_stats: normalizeQuickStats(payload?.quick_stats),
    recent_activity: {
      recent_uploads: asArray(payload?.recent_activity?.recent_uploads).map(normalizeActivityItem),
      recent_downloads: asArray(payload?.recent_activity?.recent_downloads).map(normalizeActivityItem),
      recent_bookmarks: asArray(payload?.recent_activity?.recent_bookmarks).map(normalizeActivityItem),
    },
    recommendations: {
      for_you: asArray(payload?.recommendations?.for_you).map(normalizeRecommendation),
      trending: asArray(payload?.recommendations?.trending).map(normalizeRecommendation),
      course_related: asArray(payload?.recommendations?.course_related).map(normalizeRecommendation),
      recently_added: asArray(payload?.recommendations?.recently_added).map(normalizeRecommendation),
    },
    announcements: asArray(payload?.announcements).map(normalizeAnnouncement),
    pending_uploads: {
      pending_approval: asArray(payload?.pending_uploads?.pending_approval).map((item: any) => ({
        id: toStringValue(item?.id),
        title: toStringValue(item?.title),
        description: toStringValue(item?.description),
        file_type: toStringValue(item?.file_type),
        course_name: item?.course_name ?? null,
        uploaded_at: toStringValue(item?.uploaded_at),
        status: toStringValue(item?.status),
      })),
      rejected: asArray(payload?.pending_uploads?.rejected).map((item: any) => ({
        id: toStringValue(item?.id),
        title: toStringValue(item?.title),
        description: toStringValue(item?.description),
        file_type: toStringValue(item?.file_type),
        course_name: item?.course_name ?? null,
        uploaded_at: toStringValue(item?.uploaded_at),
        status: toStringValue(item?.status),
      })),
      total_pending: toNumberValue(payload?.pending_uploads?.total_pending),
      total_rejected: toNumberValue(payload?.pending_uploads?.total_rejected),
    },
    notifications: {
      unread_count: toNumberValue(payload?.notifications?.unread_count),
      recent_notifications: asArray(payload?.notifications?.recent_notifications).map(
        normalizeNotification
      ),
    },
  };
};

class DashboardApiService {
  private cachedDashboard: DashboardData | null = null;
  private cachedAt = 0;

  private isCacheFresh() {
    return this.cachedDashboard !== null && Date.now() - this.cachedAt < DASHBOARD_CACHE_TTL_MS;
  }

  invalidateCache() {
    this.cachedDashboard = null;
    this.cachedAt = 0;
  }

  private async fetchDashboardData(forceRefresh: boolean = false): Promise<DashboardData> {
    if (!forceRefresh && this.isCacheFresh()) {
      return this.cachedDashboard as DashboardData;
    }

    const response = await api.get('/dashboard/');
    const normalized = normalizeDashboardPayload(response.data);
    this.cachedDashboard = normalized;
    this.cachedAt = Date.now();
    return normalized;
  }

  async getDashboardData(forceRefresh: boolean = false): Promise<DashboardData> {
    return this.fetchDashboardData(forceRefresh);
  }

  async getQuickStats(forceRefresh: boolean = false): Promise<DashboardQuickStats> {
    if (!forceRefresh && this.isCacheFresh()) {
      return (this.cachedDashboard as DashboardData).quick_stats;
    }

    const response = await api.get('/dashboard/stats/');
    return normalizeQuickStats(unwrapPayload(response.data));
  }

  async getRecentActivity(forceRefresh: boolean = false): Promise<DashboardRecentActivity> {
    if (!forceRefresh && this.isCacheFresh()) {
      return (this.cachedDashboard as DashboardData).recent_activity;
    }

    const response = await api.get('/dashboard/activity/');
    const payload = unwrapPayload<any>(response.data) || {};
    return {
      recent_uploads: asArray(payload?.recent_uploads).map(normalizeActivityItem),
      recent_downloads: asArray(payload?.recent_downloads).map(normalizeActivityItem),
      recent_bookmarks: asArray(payload?.recent_bookmarks).map(normalizeActivityItem),
    };
  }

  async getRecommendations(forceRefresh: boolean = false): Promise<DashboardRecommendations> {
    if (!forceRefresh && this.isCacheFresh()) {
      return (this.cachedDashboard as DashboardData).recommendations;
    }

    const response = await api.get('/dashboard/recommendations/');
    const payload = unwrapPayload<any>(response.data) || {};
    return {
      for_you: asArray(payload?.for_you).map(normalizeRecommendation),
      trending: asArray(payload?.trending).map(normalizeRecommendation),
      course_related: asArray(payload?.course_related).map(normalizeRecommendation),
      recently_added: asArray(payload?.recently_added).map(normalizeRecommendation),
    };
  }

  async getAnnouncements(forceRefresh: boolean = false): Promise<DashboardAnnouncement[]> {
    const dashboard = await this.fetchDashboardData(forceRefresh);
    return dashboard.announcements;
  }

  async getNotificationsSummary(
    forceRefresh: boolean = false
  ): Promise<DashboardNotificationSummary> {
    const dashboard = await this.fetchDashboardData(forceRefresh);
    return dashboard.notifications;
  }
}

export const dashboardApi = new DashboardApiService();

export default DashboardApiService;
