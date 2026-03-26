/**
 * Admin Management Service for CampusHub
 * Handles admin API endpoints for gamification, email campaigns, and API usage
 */

import api from './api';

// ============================================
// GAMIFICATION ADMIN SERVICES
// ============================================

export interface Badge {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  points_required: number;
  requirement_type: string;
  requirement_value: number;
  is_active: boolean;
  earned_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserGamification {
  user_id: number;
  total_points: number;
  total_uploads: number;
  total_downloads: number;
  total_ratings: number;
  total_comments: number;
  consecutive_login_days: number;
  earned_badges: {
    badge_id: number;
    badge_name: string;
    badge_icon: string;
    badge_category: string;
    earned_at: string;
  }[];
  points_history: {
    action: string;
    points: number;
    description: string;
    created_at: string;
  }[];
  achievements: {
    title: string;
    description: string;
    points_earned: number;
    created_at: string;
  }[];
}

export interface LeaderboardEntry {
  rank: number;
  points: number;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
  updated_at: string;
}

export interface GamificationStats {
  total_points: number;
  total_badges_earned: number;
  total_users_with_gamification: number;
  total_achievements: number;
  badges_by_category: { category: string; count: number }[];
  top_uploaders: any[];
  total_badges_available: number;
  active_badges: number;
}

export interface PointsConfig {
  default_points: Record<string, number>;
  action_statistics: {
    action: string;
    total_points: number;
    count: number;
    avg_points: number;
  }[];
  total_transactions: number;
}

// Get gamification stats
export const getGamificationStats = async (): Promise<GamificationStats> => {
  const response = await api.get('/admin-management/gamification/stats/');
  return response.data;
};

// Get all badges
export const getBadges = async (): Promise<Badge[]> => {
  const response = await api.get('/admin-management/gamification/badges/');
  return response.data;
};

// Get badge by ID
export const getBadge = async (id: number): Promise<Badge> => {
  const response = await api.get(`/admin-management/gamification/badges/${id}/`);
  return response.data;
};

// Create badge
export const createBadge = async (data: Partial<Badge>): Promise<Badge> => {
  const response = await api.post('/admin-management/gamification/badges/', data);
  return response.data;
};

// Update badge
export const updateBadge = async (id: number, data: Partial<Badge>): Promise<Badge> => {
  const response = await api.patch(`/admin-management/gamification/badges/${id}/`, data);
  return response.data;
};

// Delete badge
export const deleteBadge = async (id: number): Promise<void> => {
  await api.delete(`/admin-management/gamification/badges/${id}/`);
};

// Get badge earners
export const getBadgeEarners = async (badgeId: number): Promise<any[]> => {
  const response = await api.get(`/admin-management/gamification/badges/${badgeId}/earners/`);
  return response.data;
};

// Get user gamification details
export const getUserGamification = async (userId: number): Promise<UserGamification> => {
  const response = await api.get(`/admin-management/gamification/users/${userId}/`);
  return response.data;
};

// Get leaderboard
export const getLeaderboard = async (period: string = 'all_time', limit: number = 50): Promise<LeaderboardEntry[]> => {
  const response = await api.get('/admin-management/gamification/leaderboard/', {
    params: { period, limit },
  });
  return response.data.entries;
};

// Refresh leaderboard
export const refreshLeaderboard = async (period: string = 'all_time'): Promise<void> => {
  await api.post('/admin-management/gamification/leaderboard/refresh/', { period });
};

// Get points configuration
export const getPointsConfig = async (): Promise<PointsConfig> => {
  const response = await api.get('/admin-management/gamification/points-config/');
  return response.data;
};

// Award points to user
export const awardPoints = async (userId: number, points: number, action: string = 'manual_award', description?: string): Promise<{ message: string; new_total: number }> => {
  const response = await api.post('/admin-management/gamification/award-points/', {
    user_id: userId,
    points,
    action,
    description: description || 'Manual points award by admin',
  });
  return response.data;
};

// ============================================
// EMAIL CAMPAIGN SERVICES
// ============================================

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  campaign_type: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';
  target_filters: Record<string, any>;
  recipient_count: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  failed_count: number;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  created_by?: string;
}

export interface CampaignStats {
  total_campaigns: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
  recent_campaigns: {
    id: string;
    name: string;
    status: string;
    sent_count: number;
    opened_count: number;
    clicked_count: number;
    sent_at?: string;
  }[];
}

// Get all campaigns
export const getEmailCampaigns = async (status?: string, type?: string): Promise<EmailCampaign[]> => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (type) params.type = type;
  
  const response = await api.get('/admin-management/email-campaigns/', { params });
  return response.data;
};

// Get campaign by ID
export const getEmailCampaign = async (id: string): Promise<EmailCampaign> => {
  const response = await api.get(`/admin-management/email-campaigns/${id}/`);
  return response.data;
};

// Create campaign
export const createEmailCampaign = async (data: {
  name: string;
  subject: string;
  body: string;
  campaign_type?: string;
  target_faculties?: number[];
  target_departments?: number[];
  target_courses?: number[];
  target_year_of_study?: number;
  target_user_roles?: string[];
  scheduled_at?: string;
  send_now?: boolean;
}): Promise<{ id: string; name: string; status: string; recipient_count: number; message: string }> => {
  const response = await api.post('/admin-management/email-campaigns/create/', data);
  return response.data;
};

// Send campaign
export const sendEmailCampaign = async (id: string, scheduledAt?: string): Promise<{ message: string; sent_count?: number }> => {
  const response = await api.post(`/admin-management/email-campaigns/${id}/send/`, {
    scheduled_at: scheduledAt,
  });
  return response.data;
};

// Cancel campaign
export const cancelEmailCampaign = async (id: string): Promise<{ message: string }> => {
  const response = await api.post(`/admin-management/email-campaigns/${id}/cancel/`);
  return response.data;
};

// Delete campaign
export const deleteEmailCampaign = async (id: string): Promise<void> => {
  await api.delete(`/admin-management/email-campaigns/${id}/delete/`);
};

// Get campaign stats
export const getCampaignStats = async (): Promise<CampaignStats> => {
  const response = await api.get('/admin-management/email-campaigns/stats/');
  return response.data;
};

// ============================================
// API USAGE ANALYTICS SERVICES
// ============================================

export interface APIUsageStats {
  total_requests: number;
  average_response_time_ms: number;
  error_rate: number;
  status_distribution: { status_code: number; count: number }[];
  requests_over_time: { hour: string; count: number }[];
  top_endpoints: {
    endpoint: string;
    count: number;
    avg_time_ms: number;
  }[];
  top_users: {
    email: string;
    count: number;
    avg_time_ms: number;
  }[];
}

export interface APIEndpointStats {
  endpoint_pattern: string;
  total_requests: number;
  avg_response_time_ms: number;
  max_response_time_ms: number;
  min_response_time_ms: number;
  status_distribution: { status_code: number; count: number }[];
  method_distribution: { method: string; count: number }[];
}

export interface UserAPIUsage {
  user_id: number;
  user_email: string;
  total_requests: number;
  avg_response_time_ms: number;
  top_endpoints: { endpoint: string; count: number }[];
  recent_requests: {
    endpoint: string;
    method: string;
    status_code: number;
    response_time_ms: number;
    created_at: string;
  }[];
}

// Get API usage stats
export const getAPIUsageStats = async (days: number = 7): Promise<APIUsageStats> => {
  const response = await api.get('/admin-management/api-usage/', {
    params: { days },
  });
  return response.data;
};

// Get endpoint detail
export const getAPIEndpointStats = async (endpoint: string, days: number = 7): Promise<APIEndpointStats> => {
  const response = await api.get('/admin-management/api-usage/endpoint/', {
    params: { endpoint, days },
  });
  return response.data;
};

// Get user API usage
export const getUserAPIUsage = async (userId: number, days: number = 30): Promise<UserAPIUsage> => {
  const response = await api.get(`/admin-management/api-usage/users/${userId}/`, {
    params: { days },
  });
  return response.data;
};

export default {
  // Gamification
  getGamificationStats,
  getBadges,
  getBadge,
  createBadge,
  updateBadge,
  deleteBadge,
  getBadgeEarners,
  getUserGamification,
  getLeaderboard,
  refreshLeaderboard,
  getPointsConfig,
  awardPoints,
  
  // Email Campaigns
  getEmailCampaigns,
  getEmailCampaign,
  createEmailCampaign,
  sendEmailCampaign,
  cancelEmailCampaign,
  deleteEmailCampaign,
  getCampaignStats,
  
  // API Usage
  getAPIUsageStats,
  getAPIEndpointStats,
  getUserAPIUsage,
};
