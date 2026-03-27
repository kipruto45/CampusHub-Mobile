// Calendar Sync Service for CampusHub
// Google Calendar and Outlook integration (mobile).

import * as Linking from 'expo-linking';
import api from './api';

export type CalendarProvider = 'google' | 'outlook';

export interface CalendarAccount {
  id: string;
  provider: CalendarProvider;
  email: string;
  sync_enabled: boolean;
  last_sync_at?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SyncedEvent {
  id: string;
  external_event_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  is_all_day?: boolean;
  attendees?: any[];
  last_synced_at?: string;
  is_deleted?: boolean;
}

export interface SyncSettings {
  id: string;
  auto_sync: boolean;
  sync_interval_minutes: number;
  sync_direction: string;
  sync_lectures: boolean;
  sync_assignments: boolean;
  sync_exams: boolean;
  sync_study_sessions: boolean;
  sync_personal: boolean;
  notify_before_events: boolean;
  notify_minutes_before: number;
}

const CALENDAR_REDIRECT_PATH = 'calendar-sync/callback';

const getQueryValue = (value: string | string[] | undefined): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return '';
};

export const getCalendarRedirectUri = (): string => Linking.createURL(CALENDAR_REDIRECT_PATH);

const parseCalendarCallback = (callbackUrl: string) => {
  const parsed = Linking.parse(callbackUrl);
  const queryParams = parsed.queryParams || {};
  return {
    code: getQueryValue(queryParams.code as string | string[] | undefined),
    error: getQueryValue(queryParams.error as string | string[] | undefined),
    errorDescription:
      getQueryValue(queryParams.error_description as string | string[] | undefined) ||
      getQueryValue(queryParams.errorDescription as string | string[] | undefined),
  };
};

export const calendarSyncService = {
  async getAccounts(): Promise<CalendarAccount[]> {
    const response = await api.get('/calendar-sync/accounts/');
    const payload = response.data || {};
    return Array.isArray(payload) ? payload : payload?.results || payload?.accounts || [];
  },

  async getEvents(daysAhead = 30): Promise<SyncedEvent[]> {
    const response = await api.get('/calendar-sync/events/', {
      params: { days: daysAhead },
    });
    const payload = response.data || {};
    return Array.isArray(payload) ? payload : payload?.results || payload?.events || [];
  },

  async getSettings(): Promise<SyncSettings> {
    const response = await api.get('/calendar-sync/settings/');
    return response.data;
  },

  async updateSettings(payload: Partial<SyncSettings>): Promise<SyncSettings> {
    const response = await api.put('/calendar-sync/settings/', payload);
    return response.data;
  },

  async connect(provider: CalendarProvider): Promise<{ authUrl: string; redirectUri: string }> {
    const redirectUri = getCalendarRedirectUri();
    const response = await api.post(`/calendar-sync/connect/${provider}/`, {
      redirect_uri: redirectUri,
    });
    return {
      authUrl: response.data?.auth_url || response.data?.authUrl || '',
      redirectUri,
    };
  },

  async completeConnection(provider: CalendarProvider, callbackUrl: string): Promise<CalendarAccount> {
    const { code, error, errorDescription } = parseCalendarCallback(callbackUrl);
    if (error) {
      throw new Error(errorDescription || error);
    }
    if (!code) {
      throw new Error('Missing authorization code in callback.');
    }

    const response = await api.post('/calendar-sync/oauth/callback/', {
      provider,
      code,
      redirect_uri: getCalendarRedirectUri(),
    });
    return response.data;
  },

  async syncAccount(accountId: string, daysAhead = 30): Promise<{ synced: number; errors: number; total?: number }> {
    const response = await api.post(`/calendar-sync/accounts/${accountId}/sync/`, {
      days_ahead: daysAhead,
    });
    return response.data;
  },

  async disconnect(accountId: string): Promise<void> {
    await api.delete(`/calendar-sync/accounts/${accountId}/`);
  },
};
