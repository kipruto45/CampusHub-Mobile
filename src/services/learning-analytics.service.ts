/**
 * Learning Analytics Service
 * Track and analyze learning patterns and progress
 */

import api from './api';

// Types
export interface DashboardData {
  period_days: number;
  study_time: {
    total_minutes: number;
    total_hours: number;
    sessions_count: number;
    average_session_minutes: number;
  };
  progress: {
    resources_completed: number;
    courses_completed: number;
  };
  streak: {
    current: number;
    longest: number;
    total_days: number;
  };
  recent_insights: LearningInsight[];
}

export interface LearningInsight {
  id: string;
  insight_type: 'strength' | 'weakness' | 'recommendation' | 'achievement' | 'suggestion';
  title: string;
  description: string;
  subject?: string;
  priority: 'high' | 'medium' | 'low';
  is_read: boolean;
  created_at: string;
}

export interface SubjectBreakdown {
  subject: string;
  total_time: number;
  sessions: number;
  avg_focus: number;
}

export interface WeeklyProgress {
  date: string;
  day_name: string;
  study_minutes: number;
  sessions: number;
}

export interface PerformanceTrend {
  week_start: string;
  study_time: number;
  avg_focus: number;
  completed_items: number;
}

class LearningAnalyticsService {
  /**
   * Get user's learning dashboard
   */
  async getDashboard(periodDays: number = 30): Promise<DashboardData> {
    const response = await api.get(`/learning/dashboard/?period=${periodDays}`);
    return response.data;
  }

  /**
   * Get study time breakdown by subject
   */
  async getSubjectBreakdown(periodDays: number = 30): Promise<SubjectBreakdown[]> {
    const response = await api.get(`/learning/subjects/?period=${periodDays}`);
    return response.data;
  }

  /**
   * Get weekly progress
   */
  async getWeeklyProgress(): Promise<WeeklyProgress[]> {
    const response = await api.get('/learning/weekly/');
    return response.data;
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(periodDays: number = 90): Promise<PerformanceTrend[]> {
    const response = await api.get(`/learning/trends/?period=${periodDays}`);
    return response.data;
  }

  /**
   * Start a learning session
   */
  async startSession(params: {
    session_type?: 'study' | 'reading' | 'video' | 'practice' | 'quiz' | 'review';
    subject?: string;
    resource_id?: string;
  }): Promise<any> {
    const response = await api.post('/learning/session/start/', params);
    return response.data;
  }

  /**
   * End a learning session
   */
  async endSession(sessionId: string): Promise<any> {
    const response = await api.post(`/learning/session/${sessionId}/end/`);
    return response.data;
  }

  /**
   * Record an interaction
   */
  async recordInteraction(sessionId: string, type: 'view' | 'click' | 'scroll' = 'view'): Promise<any> {
    const response = await api.post('/learning/interaction/', {
      session_id: sessionId,
      type,
    });
    return response.data;
  }

  /**
   * Update learning progress
   */
  async updateProgress(params: {
    course_id?: string;
    resource_id?: string;
    progress: number;
    time_spent: number;
    quiz_score?: number;
  }): Promise<any> {
    const response = await api.post('/learning/progress/update/', params);
    return response.data;
  }

  /**
   * Get user's study streak
   */
  async getStreak(): Promise<{
    current_streak: number;
    longest_streak: number;
    total_study_days: number;
    last_study_date: string | null;
  }> {
    const response = await api.get('/learning/streak/');
    return response.data;
  }

  /**
   * Get learning insights
   */
  async getInsights(params?: {
    is_read?: boolean;
    type?: string;
  }): Promise<LearningInsight[]> {
    const queryParams = new URLSearchParams();
    if (params?.is_read !== undefined) queryParams.append('is_read', String(params.is_read));
    if (params?.type) queryParams.append('type', params.type);

    const response = await api.get(`/learning/insights/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Mark insight as read
   */
  async markInsightRead(insightId: string): Promise<LearningInsight> {
    const response = await api.post(`/learning/insights/${insightId}/read/`);
    return response.data;
  }

  /**
   * Generate new insights
   */
  async generateInsights(): Promise<LearningInsight[]> {
    const response = await api.post('/learning/insights/generate/');
    return response.data;
  }

  /**
   * Get performance metrics
   */
  async getMetrics(): Promise<any[]> {
    const response = await api.get('/learning/metrics/');
    return response.data;
  }
}

export const learningAnalyticsService = new LearningAnalyticsService();
