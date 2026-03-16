// API Service for CampusHub Mobile App
// Backend/mobile integration layer with endpoint and response normalization.

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Primitive = string | number | boolean | null | undefined;

const IN_MEMORY_CACHE_DISABLED_TTL = 0;
const ACADEMIC_REFERENCE_CACHE_TTL_MS = 5 * 60 * 1000;
const STUDY_GROUPS_CACHE_TTL_MS = 30 * 1000;

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

type MemoryResponseCacheEntry = {
  expiresAt: number;
  response: AxiosResponse<any>;
};

const memoryGetResponseCache = new Map<string, MemoryResponseCacheEntry>();
const inFlightGetRequests = new Map<string, Promise<AxiosResponse<any>>>();

const buildMemoryGetCacheKey = (
  scope: string,
  params?: Record<string, unknown>
): string => `${scope}:${stableSerialize(params || {})}`;

const getMemoryCachedGet = (
  cacheKey: string
): AxiosResponse<any> | null => {
  const cached = memoryGetResponseCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    memoryGetResponseCache.delete(cacheKey);
    return null;
  }
  return cached.response;
};

const withMemoryGetCache = (
  cacheKey: string,
  ttlMs: number,
  fetcher: () => Promise<AxiosResponse<any>>
): Promise<AxiosResponse<any>> => {
  if (ttlMs <= IN_MEMORY_CACHE_DISABLED_TTL) {
    return fetcher();
  }

  const cached = getMemoryCachedGet(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  const inFlight = inFlightGetRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request = fetcher()
    .then((response) => {
      memoryGetResponseCache.set(cacheKey, {
        expiresAt: Date.now() + ttlMs,
        response,
      });
      return response;
    })
    .finally(() => {
      inFlightGetRequests.delete(cacheKey);
    });

  inFlightGetRequests.set(cacheKey, request);
  return request;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const ensureApiSuffix = (value: string): string => {
  const normalized = trimTrailingSlash(value);
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '10.0.2.2']);
const DEV_TUNNEL_HOST_PATTERNS = [
  /\.loca\.lt$/i,
  /\.ngrok(?:-free)?\.app$/i,
  /\.ngrok\.io$/i,
  /\.trycloudflare\.com$/i,
];

const isIpAddress = (value: string): boolean =>
  /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || value.includes(':');

const getExpoHost = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost ||
    '';

  if (!hostUri) return null;
  const host = String(hostUri).split(':')[0];
  return host || null;
};

const inferDefaultApiBaseUrl = (): string => {
  const expoHost = getExpoHost();
  if (expoHost) {
    return `http://${expoHost}:8000/api`;
  }
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
  return `http://${defaultHost}:8000/api`;
};

const resolveLoopbackHost = (): string | null => {
  const expoHost = getExpoHost();
  if (expoHost) return expoHost;
  if (Platform.OS === 'android') return '10.0.2.2';
  if (Platform.OS === 'ios') return '127.0.0.1';
  return null;
};

const normalizeLoopbackApiUrlForMobile = (value: string): string => {
  if (Platform.OS === 'web') return value;

  try {
    const parsed = new URL(value);
    if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
      return value;
    }
    const replacementHost = resolveLoopbackHost();
    if (!replacementHost) return value;
    parsed.hostname = replacementHost;
    return trimTrailingSlash(parsed.toString());
  } catch {
    return value;
  }
};

const resolveApiBaseUrl = (): string => {
  const fromEnv = String(process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (!fromEnv) {
    return inferDefaultApiBaseUrl();
  }
  return normalizeLoopbackApiUrlForMobile(fromEnv);
};

const API_BASE_URL_STORAGE_KEY = 'campushub.apiBaseUrl';

const normalizeApiBaseUrl = (value: string): string =>
  ensureApiSuffix(normalizeLoopbackApiUrlForMobile(value));

const parseApiBaseUrlList = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeApiBaseUrl);
};

const DEFAULT_API_BASE_URL = normalizeApiBaseUrl(resolveApiBaseUrl());

const FALLBACK_API_BASE_URLS = parseApiBaseUrlList(
  process.env.EXPO_PUBLIC_API_URL_FALLBACKS
);

const IMPLICIT_API_BASE_URLS = parseApiBaseUrlList(
  [
    process.env.EXPO_PUBLIC_WEB_URL,
    process.env.EXPO_PUBLIC_RESOURCE_SHARE_URL,
    process.env.EXPO_PUBLIC_SHARE_BASE_URL,
  ]
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .map((entry) => ensureApiSuffix(entry))
    .join(',')
);

let apiBaseUrl = DEFAULT_API_BASE_URL;

export const getApiBaseUrl = (): string => apiBaseUrl;

const getDevFallbackApiBaseUrl = (): string | null => {
  const expoHost = getExpoHost();
  if (!expoHost) return null;
  const normalizedHost = expoHost.trim().toLowerCase();
  if (!LOOPBACK_HOSTS.has(normalizedHost) && !isIpAddress(normalizedHost)) {
    return null;
  }
  return ensureApiSuffix(`http://${expoHost}:8000`);
};

const isDevFallbackEligibleHost = (host: string): boolean =>
  DEV_TUNNEL_HOST_PATTERNS.some((pattern) => pattern.test(host)) ||
  (!LOOPBACK_HOSTS.has(host) && !isIpAddress(host));

const getOAuthCallbackUrl = (provider: 'google' | 'microsoft'): string =>
  `${getApiBaseUrl()}/auth/${provider}/callback/`;

const api: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export const setApiBaseUrl = (value: string) => {
  const normalized = normalizeApiBaseUrl(value);
  apiBaseUrl = normalized;
  api.defaults.baseURL = normalized;
};

const getApiHealthUrl = (baseUrl: string): string => {
  const normalized = trimTrailingSlash(baseUrl);
  const root = /\/api$/i.test(normalized) ? normalized.replace(/\/api$/i, '') : normalized;
  return `${root}/health/`;
};

const checkApiHealth = async (baseUrl: string, timeoutMs = 3500): Promise<boolean> => {
  try {
    const response = await axios.get(getApiHealthUrl(baseUrl), {
      timeout: timeoutMs,
      headers: { Accept: 'application/json' },
      validateStatus: (status) => status >= 200 && status < 300,
    });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
};

const uniqueApiBaseUrls = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalized = normalizeApiBaseUrl(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
};

let apiBaseUrlProbe: Promise<string | null> | null = null;

const readPersistedApiBaseUrl = async (): Promise<string> => {
  try {
    return (await AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY)) || '';
  } catch {
    return '';
  }
};

const persistApiBaseUrl = async (value: string) => {
  try {
    await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, value);
  } catch {
    // Ignore persistence errors.
  }
};

export const ensureApiBaseUrl = async (
  options: { forceRefresh?: boolean } = {}
): Promise<string> => {
  if (apiBaseUrlProbe) {
    const resolved = await apiBaseUrlProbe;
    return resolved || getApiBaseUrl();
  }

  apiBaseUrlProbe = (async () => {
    const persisted = options.forceRefresh ? '' : await readPersistedApiBaseUrl();
    const candidates = uniqueApiBaseUrls([
      persisted,
      getApiBaseUrl(),
      DEFAULT_API_BASE_URL,
      ...FALLBACK_API_BASE_URLS,
      ...IMPLICIT_API_BASE_URLS,
    ]).filter(Boolean);

    for (const candidate of candidates) {
      if (await checkApiHealth(candidate)) {
        if (candidate !== getApiBaseUrl()) {
          setApiBaseUrl(candidate);
        }
        await persistApiBaseUrl(candidate);
        return candidate;
      }
    }

    if (!options.forceRefresh && persisted && persisted !== getApiBaseUrl()) {
      setApiBaseUrl(persisted);
    }
    return null;
  })().finally(() => {
    apiBaseUrlProbe = null;
  });

  const resolved = await apiBaseUrlProbe;
  return resolved || getApiBaseUrl();
};

let authToken: string | null = null;
let refreshToken: string | null = null;
let refreshTokenCallback: ((
  tokens: { accessToken: string; refreshToken?: string | null }
) => void) | null = null;
let sessionInvalidationCallback: ((reason?: string) => void) | null = null;
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export const setRefreshToken = (token: string | null) => {
  refreshToken = token;
};

export const getRefreshToken = () => refreshToken;

export const resetApiSessionState = () => {
  authToken = null;
  refreshToken = null;
  refreshTokenCallback = null;
  isRefreshing = false;

  // Reject pending retried requests when user logs out.
  failedQueue.forEach((pending) => pending.reject(new Error('Session cleared')));
  failedQueue = [];
};

export const clearAuthToken = () => {
  resetApiSessionState();
};

export const setRefreshTokenCallback = (
  callback: (tokens: { accessToken: string; refreshToken?: string | null }) => void
) => {
  refreshTokenCallback = callback;
};

export const setSessionInvalidationCallback = (
  callback: ((reason?: string) => void) | null
) => {
  sessionInvalidationCallback = callback;
};

const toEnvelopeResponse = (
  response: AxiosResponse<any>,
  data: any,
  extras?: Record<string, Primitive | Record<string, unknown> | unknown[]>
): AxiosResponse<any> => {
  return {
    ...response,
    data: {
      success: true,
      data,
      ...(extras || {}),
    },
  } as AxiosResponse<any>;
};

const localEnvelopeResponse = (
  data: any,
  extras?: Record<string, Primitive | Record<string, unknown> | unknown[]>
): AxiosResponse<any> => {
  return {
    data: {
      success: true,
      data,
      ...(extras || {}),
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  } as AxiosResponse<any>;
};

const extractData = <T = any>(payload: any): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'success') &&
    Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    return payload.data as T;
  }
  return payload as T;
};

const asArray = <T = any>(value: any): T[] => {
  if (Array.isArray(value)) return value as T[];
  return [];
};

const normalizeNameValue = (value: any): string => {
  const cleaned = String(value ?? '').trim();
  if (!cleaned) return '';
  const lowered = cleaned.toLowerCase();
  if (['null', 'undefined', 'none', 'nil'].includes(lowered)) return '';
  return cleaned;
};

const parseFullName = (fullName?: string | null): { firstName: string; lastName: string } => {
  const cleaned = normalizeNameValue(fullName);
  if (!cleaned) return { firstName: '', lastName: '' };
  const parts = cleaned.split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
};

const normalizeAvatarUrl = (value: any): string | undefined => {
  const normalized = normalizeAbsoluteAppUrl(value);
  return normalized || undefined;
};

const normalizeUser = (raw: any) => {
  const { firstName, lastName } = parseFullName(raw?.full_name);
  const first = normalizeNameValue(raw?.first_name) || firstName;
  const last = normalizeNameValue(raw?.last_name) || lastName;
  const rawFullName = normalizeNameValue(raw?.full_name);
  return {
    id: String(raw?.id || ''),
    email: raw?.email || '',
    full_name: rawFullName || `${first} ${last}`.trim(),
    first_name: first,
    last_name: last,
    registration_number: raw?.registration_number || '',
    avatar: normalizeAvatarUrl(raw?.avatar || raw?.profile_image_url || raw?.profile_image),
    profile_image: normalizeAbsoluteAppUrl(raw?.profile_image_url || raw?.profile_image),
    role: String(raw?.role || 'STUDENT').toLowerCase(),
    faculty: raw?.faculty_name || raw?.faculty || '',
    department: raw?.department_name || raw?.department || '',
    course: raw?.course_name || raw?.course || '',
    faculty_id: raw?.faculty ? String(raw.faculty) : '',
    department_id: raw?.department ? String(raw.department) : '',
    course_id: raw?.course ? String(raw.course) : '',
    year_of_study: raw?.year_of_study || null,
    semester: raw?.semester || null,
    phone: raw?.phone_number || '',
    bio: raw?.profile?.bio || raw?.bio || '',
    is_verified: Boolean(raw?.is_verified),
    is_active: raw?.is_active !== false,
    date_joined: raw?.date_joined || '',
    last_login: raw?.last_login || '',
    auth_provider: raw?.auth_provider || 'email',
    preferences: raw?.preferences || null,
    stats: raw?.stats || null,
  };
};

const normalizeTags = (rawTags: any): string[] => {
  if (Array.isArray(rawTags)) return rawTags.map((t) => String(t).trim()).filter(Boolean);
  if (typeof rawTags === 'string') {
    return rawTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeResource = (raw: any) => {
  const uploadedByObject =
    raw?.uploaded_by && typeof raw.uploaded_by === 'object' ? raw.uploaded_by : null;
  const uploaderName =
    raw?.uploaded_by_name ||
    uploadedByObject?.full_name ||
    [uploadedByObject?.first_name, uploadedByObject?.last_name].filter(Boolean).join(' ') ||
    (typeof raw?.uploaded_by === 'string' ? raw.uploaded_by : '');
  const uploaderParts = parseFullName(uploaderName);

  const courseName =
    raw?.course?.name || raw?.course_name || raw?.course_details?.name || '';
  const courseCode =
    raw?.course?.code || raw?.course_code || raw?.course_details?.code || '';
  const courseId = raw?.course?.id || raw?.course || raw?.course_id || '';

  const unitName = raw?.unit?.name || raw?.unit_name || raw?.unit_details?.name || '';
  const unitCode = raw?.unit?.code || raw?.unit_code || raw?.unit_details?.code || '';
  const unitId = raw?.unit?.id || raw?.unit || raw?.unit_id || '';

  const autoRatingRaw =
    raw?.auto_rating ??
    raw?.autoRating ??
    raw?.autoRatingValue ??
    null;
  const averageRatingRaw = Number(raw?.average_rating || 0);
  const normalizedAverageRating =
    autoRatingRaw !== null && autoRatingRaw !== undefined
      ? Number(autoRatingRaw)
      : averageRatingRaw;

  const mapped = {
    id: String(raw?.id || ''),
    slug: raw?.slug || '',
    title: raw?.title || '',
    description: raw?.description || '',
    resource_type: raw?.resource_type || raw?.file_type || 'resource',
    file_type: raw?.file_type || raw?.file_format || '',
    file_format: raw?.file_format || raw?.file_type || '',
    file_size: Number(raw?.file_size || 0),
    thumbnail: raw?.thumbnail_url || raw?.thumbnail || '',
    thumbnail_url: raw?.thumbnail_url || raw?.thumbnail || '',
    file_url: raw?.file_url || raw?.file || '',
    status: raw?.status || 'pending',
    rejection_reason: raw?.rejection_reason || '',
    course: courseName
      ? {
          id: String(courseId || ''),
          name: courseName,
          code: courseCode,
        }
      : undefined,
    unit: unitName
      ? {
          id: String(unitId || ''),
          name: unitName,
          code: unitCode,
        }
      : undefined,
    year: raw?.year || String(raw?.year_of_study || ''),
    year_of_study: raw?.year_of_study || null,
    semester: raw?.semester || null,
    average_rating: normalizedAverageRating,
    auto_rating:
      autoRatingRaw !== null && autoRatingRaw !== undefined
        ? Number(autoRatingRaw)
        : null,
    rating_count: Number(raw?.rating_count || raw?.ratings_count || 0),
    ratings_count: Number(raw?.ratings_count || raw?.rating_count || 0),
    download_count: Number(raw?.download_count || 0),
    share_count: Number(raw?.share_count || 0),
    view_count: Number(raw?.view_count || 0),
    reports_count: Number(raw?.reports_count || raw?.report_count || 0),
    comments_count: Number(raw?.comments_count || 0),
    created_at: raw?.created_at || '',
    tags: normalizeTags(raw?.tags),
    is_bookmarked: Boolean(raw?.is_bookmarked),
    is_favorited: Boolean(raw?.is_favorited),
    can_share:
      typeof raw?.can_share === 'boolean'
        ? raw.can_share
        : Boolean((raw?.status || '').toLowerCase() === 'approved' && raw?.is_public !== false),
    uploader: {
      id: String(
        raw?.uploader?.id ||
          uploadedByObject?.id ||
          raw?.uploaded_by_id ||
          (typeof raw?.uploaded_by === 'string' || typeof raw?.uploaded_by === 'number'
            ? raw.uploaded_by
            : '')
      ),
      first_name:
        raw?.uploader?.first_name || uploadedByObject?.first_name || uploaderParts.firstName,
      last_name:
        raw?.uploader?.last_name || uploadedByObject?.last_name || uploaderParts.lastName,
      email: raw?.uploader?.email || uploadedByObject?.email || '',
      avatar: normalizeAvatarUrl(raw?.uploader?.avatar || uploadedByObject?.avatar) || '',
    },
    uploaded_by: uploaderName,
  };

  return mapped;
};

const normalizeAnnouncement = (raw: any) => {
  const formatAttachmentSize = (value: number): string => {
    if (!value) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(
      Math.floor(Math.log(value) / Math.log(1024)),
      units.length - 1
    );
    const normalized = value / Math.pow(1024, index);
    return `${parseFloat(normalized.toFixed(index === 0 ? 0 : 1))} ${units[index]}`;
  };

  const normalizeAttachment = (attachment: any) => ({
    id: String(attachment?.id || ''),
    file_url: normalizeAbsoluteAppUrl(attachment?.file_url || attachment?.url),
    filename: String(attachment?.filename || attachment?.name || 'Attachment'),
    file_type: String(attachment?.file_type || attachment?.type || ''),
    file_size: Number(attachment?.file_size || 0),
    formatted_file_size:
      String(attachment?.formatted_file_size || '').trim() ||
      formatAttachmentSize(Number(attachment?.file_size || 0)),
    created_at: String(attachment?.created_at || ''),
  });

  const category = raw?.announcement_type_display || raw?.announcement_type || 'General';
  const attachmentsSource = asArray(raw?.attachments);
  const attachments = attachmentsSource.length
    ? attachmentsSource.map(normalizeAttachment)
    : raw?.attachment_url
      ? [
          normalizeAttachment({
            id: raw?.id || raw?.slug || 'attachment',
            file_url: raw?.attachment_url,
            filename: raw?.attachment_name,
            file_type: raw?.attachment_type,
            formatted_file_size: raw?.attachment_size,
          }),
        ]
      : [];
  const primaryAttachment = attachments[0];

  return {
    id: String(raw?.slug || raw?.id || ''),
    uuid: raw?.id ? String(raw.id) : '',
    slug: raw?.slug || '',
    title: raw?.title || '',
    content: raw?.content || '',
    author_name: raw?.created_by_name || 'CampusHub',
    created_at: raw?.published_at || raw?.created_at || '',
    published_at: raw?.published_at || raw?.created_at || '',
    priority: raw?.is_pinned ? 'high' : 'medium',
    is_read: Boolean(raw?.is_read),
    is_pinned: Boolean(raw?.is_pinned),
    is_saved: false,
    category,
    attachments,
    attachment_count: Number(raw?.attachment_count || attachments.length),
    attachment_url: primaryAttachment?.file_url || raw?.attachment_url || '',
    attachment_name: primaryAttachment?.filename || raw?.attachment_name || '',
    attachment_type: primaryAttachment?.file_type || raw?.attachment_type || '',
    attachment_size:
      primaryAttachment?.formatted_file_size || raw?.attachment_size || '',
  };
};

const normalizeNotification = (raw: any) => {
  const type = String(raw?.type || raw?.notification_type || 'system');
  const notificationTypeDisplay = String(raw?.notification_type_display || '')
    .trim() || type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  return {
    id: String(raw?.id || ''),
    type,
    notification_type_display: notificationTypeDisplay,
    title: raw?.title || '',
    message: raw?.message || '',
    is_read: Boolean(raw?.is_read),
    link: raw?.link || '',
    resource_id: raw?.resource_id || raw?.target_resource ? String(raw?.resource_id || raw?.target_resource) : '',
    created_at: raw?.created_at || '',
  };
};

const normalizeActivity = (raw: any) => {
  const activityType = String(raw?.activity_type || raw?.type || '').toLowerCase();
  const map: Record<string, 'view' | 'download' | 'upload' | 'comment' | 'rate' | 'save' | 'share' | 'folder'> = {
    viewed_resource: 'view',
    downloaded_resource: 'download',
    downloaded_personal_file: 'download',
    bookmarked_resource: 'save',
    opened_personal_file: 'folder',
    uploaded_resource: 'upload',
    commented_resource: 'comment',
    rated_resource: 'rate',
  };
  const type = map[activityType] || 'view';
  return {
    id: String(raw?.id || ''),
    type,
    title: raw?.title || raw?.target_title || raw?.activity_type_display || 'Activity',
    description: raw?.description || raw?.metadata?.description || '',
    created_at: raw?.created_at || '',
    resource_id: raw?.resource_id || raw?.resource || raw?.metadata?.resource_id || '',
    icon: raw?.icon || type,
  };
};

const normalizeLibraryFolder = (raw: any) => ({
  id: String(raw?.id || ''),
  name: raw?.name || '',
  color: raw?.color || '',
  parent: raw?.parent || null,
  file_count: Number(raw?.file_count || 0),
  total_size: Number(raw?.total_size || 0),
  is_favorite: Boolean(raw?.is_favorite),
  created_at: raw?.created_at || '',
  updated_at: raw?.updated_at || '',
});

const normalizeLibraryFile = (raw: any) => ({
  id: String(raw?.id || ''),
  name: raw?.name || raw?.title || '',
  title: raw?.title || raw?.name || '',
  file_size: Number(raw?.file_size || 0),
  file_type: raw?.file_type || '',
  file_url: raw?.file_url || '',
  folder: raw?.folder || null,
  folder_name: raw?.folder_name || '',
  description: raw?.description || '',
  tags: raw?.tags || '',
  is_favorite: Boolean(raw?.is_favorite),
  last_accessed_at: raw?.last_accessed_at || '',
  created_at: raw?.created_at || '',
  updated_at: raw?.updated_at || '',
});

export const normalizeAbsoluteAppUrl = (value: any): string => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '';
  const normalizedLower = rawValue.toLowerCase();
  if (['null', 'undefined', 'none', 'nil'].includes(normalizedLower)) {
    return '';
  }
  if (/\/(null|undefined|none|nil)$/i.test(normalizedLower)) {
    return '';
  }
  if (/^(file|content|data|blob):/i.test(rawValue)) {
    return rawValue;
  }
  if (/^https?:\/\//i.test(rawValue)) {
    return normalizeLoopbackApiUrlForMobile(rawValue);
  }
  const baseUrl = getResourceShareBaseUrl();
  return `${baseUrl}${rawValue.startsWith('/') ? '' : '/'}${rawValue}`;
};

const normalizeDownloadHistoryItem = (raw: any) => ({
  id: String(raw?.id || ''),
  download_type: raw?.download_type || 'resource',
  title: raw?.download_title || raw?.resource_title || raw?.personal_file_name || 'Download',
  resource_id: raw?.resource ? String(raw.resource) : '',
  personal_file_id: raw?.personal_file ? String(raw.personal_file) : '',
  resource_type: raw?.resource_type || '',
  file_type: raw?.file_type || '',
  file_url: normalizeAbsoluteAppUrl(raw?.file_url),
  created_at: raw?.created_at || '',
});

const normalizeAdminUser = (raw: any) => {
  const user = normalizeUser(raw);
  const profile = raw?.profile || {};
  return {
    ...user,
    profile: {
      ...profile,
      avatar: normalizeAvatarUrl(raw?.profile_image_url || raw?.profile_image),
      faculty: raw?.faculty_name || user.faculty || '',
      department: raw?.department_name || user.department || '',
      course: raw?.course_name || user.course || '',
      year_of_study: raw?.year_of_study || null,
      registration_number: raw?.registration_number || '',
    },
    stats: {
      total_uploads: Number(raw?.stats?.total_uploads || profile?.total_uploads || raw?.uploads_count || 0),
      total_downloads: Number(raw?.stats?.total_downloads || profile?.total_downloads || 0),
      total_bookmarks: Number(raw?.stats?.total_bookmarks || profile?.total_bookmarks || 0),
      total_favorites: Number(raw?.stats?.total_favorites || 0),
      total_comments: Number(raw?.stats?.total_comments || profile?.total_comments || 0),
      total_ratings: Number(raw?.stats?.total_ratings || profile?.total_ratings || 0),
    },
    uploads_count: Number(raw?.uploads_count || 0),
    reports_count: Number(raw?.reports_count || 0),
  };
};

const normalizeAdminReport = (raw: any) => {
  const reporterParts = parseFullName(raw?.reporter_name);
  const reviewerParts = parseFullName(raw?.reviewed_by_name);
  const targetId = raw?.resource || raw?.comment || '';
  return {
    id: String(raw?.id || ''),
    report_type: raw?.target_type || 'unknown',
    reason: raw?.reason || raw?.reason_type || '',
    reason_type: raw?.reason_type || raw?.reason || '',
    description: raw?.description || raw?.message || '',
    message: raw?.message || raw?.description || '',
    status: raw?.status || 'open',
    reported_by: {
      id: String(raw?.reporter || ''),
      first_name: reporterParts.firstName,
      last_name: reporterParts.lastName,
      email: raw?.reporter_email || '',
      full_name: raw?.reporter_name || '',
    },
    reported_content: {
      type: raw?.target_type || 'unknown',
      id: String(targetId || ''),
      title: raw?.target_title || '',
      content: raw?.target_title || '',
    },
    admin_note: raw?.resolution_note || '',
    resolution_note: raw?.resolution_note || '',
    created_at: raw?.created_at || '',
    updated_at: raw?.updated_at || '',
    resolved_at:
      raw?.status === 'resolved' || raw?.status === 'dismissed' ? raw?.updated_at || '' : '',
    resolved_by: raw?.reviewed_by
      ? {
          id: String(raw.reviewed_by),
          first_name: reviewerParts.firstName,
          last_name: reviewerParts.lastName,
          full_name: raw?.reviewed_by_name || '',
        }
      : undefined,
  };
};

const normalizeAdminSystemStats = (raw: any) => {
  const payload = extractData<any>(raw);
  const summary = payload?.summary || {};
  const users = payload?.users || {};
  const resources = payload?.resources || {};
  const studyGroups = payload?.study_groups || payload?.social || {};
  const announcements = payload?.announcements || {};
  const news = payload?.news || {};
  const academic = payload?.academic || {};
  const storage = payload?.storage || {};
  const activity = payload?.activity || {};

  return {
    users: {
      total: Number(summary?.total_users ?? users?.total ?? users?.total_users ?? 0),
      total_users: Number(summary?.total_users ?? users?.total ?? users?.total_users ?? 0),
      total_students: Number(summary?.total_students ?? users?.students ?? users?.total_students ?? 0),
      total_admins: Number(summary?.total_admins ?? users?.admins ?? users?.total_admins ?? 0),
      active: Number(summary?.active_users ?? users?.active ?? 0),
      active_users_today: Number(summary?.active_users_today ?? users?.active_today ?? activity?.active_users_today ?? 0),
      new_users_today: Number(summary?.new_users_today ?? users?.new_today ?? activity?.new_users_today ?? 0),
      active_users_week: Number(summary?.active_users_week ?? users?.active_week ?? activity?.active_users_week ?? 0),
      suspended_users: Number(summary?.suspended_users ?? users?.suspended ?? 0),
      verified: Number(summary?.verified_users ?? users?.verified ?? 0),
    },
    resources: {
      total: Number(summary?.total_resources ?? resources?.total ?? resources?.total_resources ?? 0),
      total_resources: Number(summary?.total_resources ?? resources?.total ?? resources?.total_resources ?? 0),
      approved: Number(summary?.approved_resources ?? resources?.approved ?? resources?.approved_resources ?? 0),
      approved_resources: Number(summary?.approved_resources ?? resources?.approved ?? resources?.approved_resources ?? 0),
      pending: Number(summary?.pending_resources ?? resources?.pending ?? resources?.pending_resources ?? 0),
      pending_resources: Number(summary?.pending_resources ?? resources?.pending ?? resources?.pending_resources ?? 0),
      rejected: Number(summary?.rejected_resources ?? resources?.rejected ?? resources?.rejected_resources ?? 0),
      rejected_resources: Number(summary?.rejected_resources ?? resources?.rejected ?? resources?.rejected_resources ?? 0),
      reported_resources: Number(summary?.reported_resources ?? resources?.reported ?? resources?.reported_resources ?? payload?.reports?.total ?? 0),
      total_downloads: Number(summary?.total_downloads ?? resources?.downloads ?? resources?.total_downloads ?? activity?.total_downloads ?? 0),
      total_shares: Number(summary?.total_shares ?? resources?.shares ?? resources?.total_shares ?? activity?.total_shares ?? 0),
    },
    study_groups: {
      total: Number(summary?.total_study_groups ?? studyGroups?.total ?? studyGroups?.study_groups ?? 0),
      total_study_groups: Number(summary?.total_study_groups ?? studyGroups?.total ?? studyGroups?.study_groups ?? 0),
    },
    announcements: {
      total: Number(summary?.total_announcements ?? announcements?.total ?? news?.total ?? 0),
      total_announcements: Number(summary?.total_announcements ?? announcements?.total ?? 0),
      total_news: Number(summary?.total_news ?? news?.total ?? 0),
    },
    academic: {
      faculties: Number(academic?.faculties ?? 0),
      departments: Number(academic?.departments ?? 0),
      courses: Number(academic?.courses ?? 0),
    },
    storage: {
      total_bytes: Number(storage?.total_bytes ?? 0),
      total_mb: Number(storage?.total_mb ?? 0),
      total_gb: Number(storage?.total_gb ?? 0),
    },
    activity: {
      activities_today: Number(summary?.activities_today ?? activity?.activities_today ?? 0),
    },
    summary: {
      total_users: Number(summary?.total_users ?? users?.total ?? users?.total_users ?? 0),
      total_students: Number(summary?.total_students ?? users?.students ?? users?.total_students ?? 0),
      total_admins: Number(summary?.total_admins ?? users?.admins ?? users?.total_admins ?? 0),
      active_users: Number(summary?.active_users ?? users?.active ?? 0),
      active_users_today: Number(summary?.active_users_today ?? users?.active_today ?? activity?.active_users_today ?? 0),
      new_users_today: Number(summary?.new_users_today ?? users?.new_today ?? activity?.new_users_today ?? 0),
      active_users_week: Number(summary?.active_users_week ?? users?.active_week ?? activity?.active_users_week ?? 0),
      suspended_users: Number(summary?.suspended_users ?? users?.suspended ?? 0),
      verified_users: Number(summary?.verified_users ?? users?.verified ?? 0),
      total_resources: Number(summary?.total_resources ?? resources?.total ?? resources?.total_resources ?? 0),
      approved_resources: Number(summary?.approved_resources ?? resources?.approved ?? resources?.approved_resources ?? 0),
      pending_resources: Number(summary?.pending_resources ?? resources?.pending ?? resources?.pending_resources ?? 0),
      rejected_resources: Number(summary?.rejected_resources ?? resources?.rejected ?? resources?.rejected_resources ?? 0),
      reported_resources: Number(summary?.reported_resources ?? resources?.reported ?? resources?.reported_resources ?? payload?.reports?.total ?? 0),
      total_downloads: Number(summary?.total_downloads ?? resources?.downloads ?? resources?.total_downloads ?? activity?.total_downloads ?? 0),
      total_shares: Number(summary?.total_shares ?? resources?.shares ?? resources?.total_shares ?? activity?.total_shares ?? 0),
      total_study_groups: Number(summary?.total_study_groups ?? studyGroups?.total ?? studyGroups?.study_groups ?? 0),
      total_announcements: Number(summary?.total_announcements ?? announcements?.total ?? 0),
      total_news: Number(summary?.total_news ?? news?.total ?? 0),
      total_storage_used_gb: Number(summary?.total_storage_used_gb ?? storage?.total_gb ?? 0),
      activities_today: Number(summary?.activities_today ?? activity?.activities_today ?? 0),
    },
  };
};

const normalizeAdminDepartment = (raw: any) => ({
  id: String(raw?.id || ''),
  name: raw?.name || '',
  code: raw?.code || '',
  description: raw?.description || '',
  faculty_id: raw?.faculty ? String(raw.faculty) : '',
  faculty_name: raw?.faculty_name || '',
  course_count: Number(raw?.course_count || 0),
  is_active: raw?.is_active ?? true,
  created_at: raw?.created_at || '',
  updated_at: raw?.updated_at || '',
});

const normalizeAdminFaculty = (raw: any) => ({
  id: String(raw?.id || ''),
  name: raw?.name || '',
  code: raw?.code || '',
  description: raw?.description || '',
  department_count: Number(raw?.department_count || 0),
  is_active: raw?.is_active ?? true,
  created_at: raw?.created_at || '',
  updated_at: raw?.updated_at || '',
});

const normalizeAdminCourse = (raw: any) => ({
  id: String(raw?.id || ''),
  name: raw?.name || '',
  code: raw?.code || '',
  description: raw?.description || '',
  department_id: raw?.department ? String(raw.department) : '',
  department_name: raw?.department_name || '',
  department: raw?.department
    ? {
        id: String(raw.department),
        name: raw?.department_name || '',
      }
    : undefined,
  duration_years:
    raw?.duration_years === null || raw?.duration_years === undefined
      ? null
      : Number(raw.duration_years),
  duration:
    raw?.duration_years === null || raw?.duration_years === undefined
      ? ''
      : `${Number(raw.duration_years)} years`,
  unit_count: Number(raw?.unit_count || 0),
  is_active: raw?.is_active ?? true,
  created_at: raw?.created_at || '',
  updated_at: raw?.updated_at || '',
});

const normalizeAdminUnit = (raw: any) => ({
  id: String(raw?.id || ''),
  name: raw?.name || '',
  code: raw?.code || '',
  description: raw?.description || '',
  course_id: raw?.course ? String(raw.course) : '',
  course_name: raw?.course_name || '',
  course: raw?.course
    ? {
        id: String(raw.course),
        name: raw?.course_name || '',
      }
    : undefined,
  semester:
    raw?.semester === null || raw?.semester === undefined || raw?.semester === ''
      ? undefined
      : Number(raw.semester),
  year_of_study:
    raw?.year_of_study === null || raw?.year_of_study === undefined || raw?.year_of_study === ''
      ? undefined
      : Number(raw.year_of_study),
  is_active: raw?.is_active ?? true,
  created_at: raw?.created_at || '',
  updated_at: raw?.updated_at || '',
});

const normalizeAdminStudyGroup = (raw: any) => ({
  id: String(raw?.id || ''),
  name: raw?.name || '',
  description: raw?.description || '',
  course_id: raw?.course ? String(raw.course) : '',
  course_name: raw?.course_name || '',
  faculty_id: raw?.faculty ? String(raw.faculty) : '',
  faculty_name: raw?.faculty_name || '',
  department_id: raw?.department ? String(raw.department) : '',
  department_name: raw?.department_name || '',
  year_of_study:
    raw?.year_of_study === null || raw?.year_of_study === undefined || raw?.year_of_study === ''
      ? null
      : Number(raw.year_of_study),
  privacy: raw?.privacy || (raw?.is_public ? 'public' : 'private'),
  is_public: raw?.is_public ?? true,
  allow_member_invites: raw?.allow_member_invites ?? true,
  max_members: Number(raw?.max_members || 0),
  member_count: Number(raw?.member_count || 0),
  status: raw?.status || 'active',
  created_by_name: raw?.created_by_name || '',
  created_by_email: raw?.created_by_email || '',
  created_at: raw?.created_at || '',
  updated_at: raw?.updated_at || '',
});

const collectPaginatedResults = async <T>(
  fetchPage: (page: number) => Promise<AxiosResponse<any, any>>,
  normalize: (raw: any) => T
) => {
  const aggregated: T[] = [];
  let page = 1;
  let totalCount = 0;
  let next: string | null = null;

  while (true) {
    const response = await fetchPage(page);
    const raw = response.data || {};
    const pageResults = asArray(raw?.results || raw).map(normalize);
    aggregated.push(...pageResults);
    totalCount = Number(raw?.count || aggregated.length);
    next = raw?.next || null;
    if (!next || pageResults.length === 0) {
      break;
    }
    page += 1;
  }

  return {
    results: aggregated,
    count: totalCount || aggregated.length,
    next: null,
    previous: null,
  };
};

const normalizeBackupMetadata = (raw: any) => {
  const payload = raw?.backup || raw || {};
  return {
    backup_id: String(payload?.backup_id || payload?.timestamp || ''),
    created_at: payload?.timestamp || payload?.created_at || '',
    size_bytes: Number(payload?.total_storage_bytes || payload?.size_bytes || 0),
    size_mb: Number(payload?.total_storage_mb || payload?.size_mb || 0),
    resources_count: Number(payload?.resources_count || 0),
    users_count: Number(payload?.users_count || 0),
    study_groups_count: Number(payload?.study_groups_count || 0),
    announcements_count: Number(payload?.announcements_count || 0),
    includes: asArray(payload?.includes).length ? asArray(payload?.includes) : ['users', 'resources', 'media'],
    download_url: payload?.download_url || '',
    message: raw?.message || '',
  };
};

const normalizeExportMetadata = (raw: any) => {
  const payload = raw?.data || raw || {};
  return {
    export_date: payload?.export_date || '',
    generated_at: payload?.generated_at || '',
    exported_by: payload?.exported_by || '',
    faculties_count: Number(payload?.faculties_count ?? asArray(payload?.faculties).length),
    departments_count: Number(payload?.departments_count ?? asArray(payload?.departments).length),
    courses_count: Number(payload?.courses_count ?? asArray(payload?.courses).length),
    units_count: Number(payload?.units_count || 0),
    users_count: Number(payload?.users_count || 0),
    resources_count: Number(payload?.resources_count || 0),
    study_groups_count: Number(payload?.study_groups_count || 0),
    announcements_count: Number(payload?.announcements_count || 0),
    available_formats: asArray(payload?.available_formats),
    download_urls: payload?.download_urls || {},
    message: raw?.message || '',
    data: payload,
  };
};

const computeDaysRemaining = (deletedAt?: string): number => {
  if (!deletedAt) return 0;
  const deletedDate = new Date(deletedAt);
  if (Number.isNaN(deletedDate.getTime())) return 0;
  const now = new Date();
  const elapsedMs = now.getTime() - deletedDate.getTime();
  const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
  return Math.max(0, 30 - elapsedDays);
};

const normalizeTrashItem = (raw: any) => ({
  id: String(raw?.id || ''),
  name: raw?.title || raw?.name || 'Untitled',
  file_type: raw?.file_type || '',
  deleted_at: raw?.deleted_at || raw?.updated_at || raw?.created_at || '',
  size: Number(raw?.file_size || raw?.size || 0),
  days_remaining: computeDaysRemaining(raw?.deleted_at),
  original_path: raw?.original_folder_name || '',
});

const normalizeUploadFormData = (input: FormData): FormData => {
  const parts = (input as any)?._parts;
  if (!Array.isArray(parts)) return input;

  const normalized = new FormData();
  let hasTitle = false;
  let fallbackFileName = '';

  parts.forEach((entry: any) => {
    const [rawKey, rawValue] = Array.isArray(entry) ? entry : [];
    if (!rawKey) return;
    const key = rawKey === 'year' ? 'year_of_study' : rawKey;
    if (rawValue === '' || rawValue === null || rawValue === undefined) return;
    if (key === 'title') hasTitle = true;
    if (key === 'file' && typeof rawValue === 'object' && rawValue?.name) {
      fallbackFileName = String(rawValue.name);
    }
    normalized.append(key, rawValue as any);
  });

  if (!hasTitle && fallbackFileName) {
    const guessed = fallbackFileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
    if (guessed) normalized.append('title', guessed);
  }

  return normalized;
};

const normalizeResourceListPayload = (rawPayload: any) => {
  const rawResources = asArray(rawPayload?.resources || rawPayload?.results || rawPayload);
  const resources = rawResources.map(normalizeResource);
  const pagination = rawPayload?.pagination || {
    page: 1,
    limit: resources.length,
    total: resources.length,
    pages: 1,
  };
  return {
    resources,
    results: resources,
    pagination,
  };
};

const getResourceShareBaseUrl = (): string => {
  const explicit = String(
    process.env.EXPO_PUBLIC_RESOURCE_SHARE_URL ||
      process.env.EXPO_PUBLIC_WEB_URL ||
      process.env.EXPO_PUBLIC_SHARE_BASE_URL ||
      ''
  ).trim();

  if (explicit) {
    return trimTrailingSlash(explicit);
  }

  return trimTrailingSlash(getApiBaseUrl().replace(/\/api$/i, ''));
};

const normalizeResourceSharePayload = (rawPayload: any) => {
  const slug = String(rawPayload?.slug || '').trim();
  const providedShareUrl = String(rawPayload?.share_url || '').trim();
  const fallbackShareUrl = slug ? `${getResourceShareBaseUrl()}/resources/${slug}` : '';
  const shareUrl =
    providedShareUrl && /^https?:\/\//i.test(providedShareUrl)
      ? providedShareUrl
      : fallbackShareUrl;

  let shareMessage = String(rawPayload?.share_message || '').trim();
  if (providedShareUrl && shareUrl && shareUrl !== providedShareUrl && shareMessage) {
    shareMessage = shareMessage.replace(providedShareUrl, shareUrl);
  }
  if (shareUrl && shareMessage && !shareMessage.includes(shareUrl)) {
    shareMessage = `${shareMessage}\n\nOpen here:\n${shareUrl}`;
  }
  if (!shareMessage) {
    shareMessage = shareUrl
      ? `Check out this resource on CampusHub:\n\n${rawPayload?.title || 'Resource'}\n\nOpen here:\n${shareUrl}`
      : String(rawPayload?.title || 'Resource');
  }

  return {
    resource_id: String(rawPayload?.resource_id || rawPayload?.id || ''),
    title: String(rawPayload?.title || ''),
    slug,
    share_url: shareUrl,
    deep_link_url: String(
      rawPayload?.deep_link_url || (slug ? `campushub://resources/${slug}` : '')
    ),
    share_message: shareMessage,
    metadata_summary: String(rawPayload?.metadata_summary || ''),
    can_share: Boolean(rawPayload?.can_share),
    reason: String(rawPayload?.reason || ''),
  };
};

const isFallbackStatus = (error: any, statuses: number[]) =>
  axios.isAxiosError(error) && statuses.includes(error.response?.status || 0);

const humanizeFieldName = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const extractFirstError = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = extractFirstError(entry);
      if (message) return message;
    }
    return '';
  }
  if (typeof value === 'object') {
    const direct = String(value?.message || value?.detail || '').trim();
    if (direct) return direct;
    for (const entry of Object.values(value)) {
      const message = extractFirstError(entry);
      if (message) return message;
    }
  }
  return '';
};

const extractErrorMessage = (payload: any): string => {
  if (!payload || typeof payload !== 'object') return '';

  const direct = String(
    payload?.error?.message ||
      payload?.message ||
      payload?.detail ||
      ''
  ).trim();

  if (direct) return direct;

  const errorPayload = payload?.errors || payload;
  if (!errorPayload || typeof errorPayload !== 'object') return '';

  for (const [field, value] of Object.entries(errorPayload)) {
    const message = extractFirstError(value);
    if (!message) continue;
    if (field === 'non_field_errors') return message;
    const label = humanizeFieldName(field);
    return label ? `${label}: ${message}` : message;
  }

  return '';
};

const getDevRetryBaseUrl = (
  error: AxiosError,
  requestConfig?: InternalAxiosRequestConfig & { _devBaseUrlRetried?: boolean }
): string | null => {
  if (Platform.OS === 'web') return null;
  if (!(typeof __DEV__ !== 'undefined' && __DEV__)) return null;
  if (!requestConfig || requestConfig._devBaseUrlRetried) return null;

  const fallbackBaseUrl = getDevFallbackApiBaseUrl();
  if (!fallbackBaseUrl) return null;

  const statusCode = error.response?.status ?? 0;
  const isRetryableStatus = statusCode === 502 || statusCode === 503 || statusCode === 504;
  const isNetworkFailure =
    !error.response &&
    /network error|timeout|timed out|abort/i.test(String(error.message || ''));

  if (!isRetryableStatus && !isNetworkFailure) {
    return null;
  }

  try {
    const currentBaseUrl = String(
      requestConfig.baseURL || api.defaults.baseURL || getApiBaseUrl()
    );
    const currentHost = new URL(currentBaseUrl).hostname.toLowerCase();
    const fallbackHost = new URL(fallbackBaseUrl).hostname.toLowerCase();
    if (currentHost === fallbackHost) {
      return null;
    }
    if (!isDevFallbackEligibleHost(currentHost)) {
      return null;
    }
    return fallbackBaseUrl;
  } catch {
    return null;
  }
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === 'object') {
      const responsePayload = error.response.data as Record<string, any>;
      const normalizedMessage = extractErrorMessage(responsePayload);
      if (normalizedMessage && !responsePayload.message) {
        responsePayload.message = normalizedMessage;
      }
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _devBaseUrlRetried?: boolean;
      _autoBaseUrlRetried?: boolean;
    };

    const devRetryBaseUrl = getDevRetryBaseUrl(error, originalRequest);
    if (devRetryBaseUrl) {
      originalRequest._devBaseUrlRetried = true;
      originalRequest.baseURL = devRetryBaseUrl;
      console.log(
        `API request retrying against local dev backend: ${devRetryBaseUrl}`
      );
      return api(originalRequest);
    }

    const statusCode = error.response?.status ?? 0;
    const isRetryableStatus = statusCode === 502 || statusCode === 503 || statusCode === 504;
    const isNetworkFailure =
      !error.response &&
      /network error|timeout|timed out|abort/i.test(String(error.message || ''));

    if (!originalRequest._devBaseUrlRetried && !originalRequest._autoBaseUrlRetried && (isRetryableStatus || isNetworkFailure)) {
      const currentBaseUrl = String(
        originalRequest.baseURL || api.defaults.baseURL || getApiBaseUrl()
      );
      const nextBaseUrl = await ensureApiBaseUrl({ forceRefresh: true });
      if (nextBaseUrl && nextBaseUrl !== currentBaseUrl) {
        originalRequest._autoBaseUrlRetried = true;
        originalRequest.baseURL = nextBaseUrl;
        console.log(`API request retrying against fallback backend: ${nextBaseUrl}`);
        return api(originalRequest);
      }
    }

    if (axios.isAxiosError(error) && !error.response && /network error/i.test(error.message || '')) {
      const hint = `Network Error: cannot reach API at ${getApiBaseUrl()}.`;
      return Promise.reject(Object.assign(error, { message: hint }));
    }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${getApiBaseUrl()}/mobile/refresh/`, {
          refresh_token: refreshToken,
        });

        const payload = extractData<any>(response.data);
        const accessToken = payload?.access_token || '';
        const newRefreshToken = payload?.refresh_token || '';
        authToken = accessToken;
        refreshToken = newRefreshToken || refreshToken;

        if (refreshTokenCallback && accessToken) {
          refreshTokenCallback({
            accessToken,
            refreshToken: newRefreshToken || null,
          });
        }

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        clearAuthToken();
        sessionInvalidationCallback?.('refresh_failed');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export {
  getDevFallbackApiBaseUrl,
  getDevRetryBaseUrl,
  getExpoHost,
};

export const authAPI = {
  login: (
    email: string,
    password: string,
    registration_number?: string,
    remember_me?: boolean,
    two_factor_code?: string
  ) =>
    api
      .post('/mobile/login/', {
        email,
        password,
        registration_number,
        ...(typeof remember_me === 'boolean' ? { remember_me } : {}),
        ...(two_factor_code ? { two_factor_code } : {}),
      })
      .then((response) => {
        const payload = extractData<any>(response.data);
        return toEnvelopeResponse(response, {
          ...payload,
          user: normalizeUser(payload?.user || {}),
        });
      }),

  register: (data: {
    email: string;
    password: string;
    password_confirm: string;
    registration_number?: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    faculty?: number;
    department?: number;
    course?: number;
    year_of_study?: number;
  }) =>
    api
      .post('/mobile/register/', {
        email: data.email,
        password: data.password,
        password_confirm: data.password_confirm,
        ...(data.registration_number && { registration_number: data.registration_number }),
        ...(data.phone_number && { phone_number: data.phone_number }),
        full_name: `${data.first_name} ${data.last_name}`.trim(),
        ...(data.faculty && { faculty: data.faculty }),
        ...(data.department && { department: data.department }),
        ...(data.course && { course: data.course }),
        ...(data.year_of_study && { year_of_study: data.year_of_study }),
      })
      .then((response) => {
        const payload = extractData<any>(response.data);
        return toEnvelopeResponse(response, payload, { message: response.data?.message });
      }),

  logout: (refresh?: string | null, deviceToken?: string | null) =>
    api.post('/mobile/logout/', {
      ...(refresh ? { refresh_token: refresh } : {}),
      ...(deviceToken ? { device_token: deviceToken } : {}),
    }),

  refreshToken: (refresh: string) =>
    api.post('/mobile/refresh/', { refresh_token: refresh }),

  forgotPassword: (email: string) => api.post('/mobile/password/reset/', { email }),

  resetPassword: (data: { uid: string; token: string; new_password: string; new_password_confirm?: string }) =>
    api.post(`/mobile/password/reset/confirm/${encodeURIComponent(data.token)}/`, {
      new_password: data.new_password,
      new_password_confirm: data.new_password_confirm || data.new_password,
    }),

  verifyEmail: (key: string) => api.get(`/mobile/verify-email/${key}/`),

  resendVerificationEmail: (email: string) =>
    api.post('/mobile/verify-email/resend/', { email }),

  getGoogleOAuthUrl: (redirectUri?: string) =>
    api.get('/auth/google/url/', {
      params: {
        redirect_uri: redirectUri || getOAuthCallbackUrl('google'),
      },
    }),

  googleOAuth: (code: string, redirectUri?: string) =>
    api.post('/auth/google/', {
      code,
      redirect_uri: redirectUri || getOAuthCallbackUrl('google'),
    }),
  googleOAuthNative: (payload: { id_token?: string; access_token?: string }) =>
    api.post('/auth/google/native/', payload),

  getMicrosoftOAuthUrl: (redirectUri?: string) =>
    api.get('/auth/microsoft/url/', {
      params: {
        redirect_uri: redirectUri || getOAuthCallbackUrl('microsoft'),
      },
    }),

  microsoftOAuth: (code: string, redirectUri?: string) =>
    api.post('/auth/microsoft/', {
      code,
      redirect_uri: redirectUri || getOAuthCallbackUrl('microsoft'),
    }),
  microsoftOAuthNative: (payload: { access_token: string; id_token?: string }) =>
    api.post('/auth/microsoft/native/', payload),

  getCurrentUser: () =>
    api.get('/auth/profile/').then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, normalizeUser(payload));
    }),
};

export const resourcesAPI = {
  list: (params?: {
    page?: number;
    search?: string;
    category?: string;
    faculty?: string;
    department?: string;
    course?: string;
    unit?: string;
    semester?: string | number;
    year_of_study?: string | number;
    type?: string;
    sort?: string;
    limit?: number;
    scope?: 'my' | 'all' | 'public';
  }) =>
    api
      .get('/mobile/resources/', {
        params: {
          page: params?.page,
          limit: params?.limit,
          search: params?.search,
          faculty: params?.faculty,
          department: params?.department,
          course: params?.course,
          unit: params?.unit,
          semester: params?.semester,
          year_of_study: params?.year_of_study,
          type: params?.type || params?.category,
          sort: params?.sort,
          scope: params?.scope,
        },
      })
      .then((response) => {
        const payload = extractData<any>(response.data);
        return toEnvelopeResponse(response, normalizeResourceListPayload(payload));
      }),

  get: (id: string) =>
    api.get(`/mobile/resources/${id}/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, normalizeResource(payload));
    }),

  create: (data: FormData) =>
    api
      .post('/mobile/resources/upload/', normalizeUploadFormData(data), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => {
        const payload = extractData<any>(response.data);
        const resource = payload?.resource ? normalizeResource(payload.resource) : payload;
        return toEnvelopeResponse(response, resource);
      }),

  update: (id: string, data: FormData) =>
    api.patch(`/resources/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) => api.delete(`/resources/${id}/`),

  download: (id: string) => api.post(`/mobile/resources/${id}/download/`),

  saveToLibrary: (id: string, folderId?: string, title?: string) =>
    api.post(`/mobile/resources/${id}/save-to-library/`, {
      ...(folderId ? { folder_id: folderId } : {}),
      ...(title ? { title } : {}),
    }),

  rate: (id: string, rating: number) => api.post(`/resources/${id}/rate/`, { value: rating }),

  // Comments
  getComments: (resourceId: string) =>
    api.get(`/mobile/resources/${resourceId}/comments/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  addComment: (resourceId: string, data: { text: string; rating?: number }) =>
    api.post(`/mobile/resources/${resourceId}/comments/`, data).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  getShareLink: (id: string) =>
    api.get(`/resources/${id}/share-link/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, normalizeResourceSharePayload(payload));
    }),

  recordShare: (id: string, method: string = 'other') =>
    api.post(`/resources/${id}/share/`, { share_method: method }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  shareToStudent: (id: string, studentId: number, message?: string) =>
    api.post(`/resources/${id}/share-to-student/`, { student_id: studentId, message }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  shareToGroup: (id: string, groupId: number, message?: string) =>
    api.post(`/resources/${id}/share-to-group/`, { group_id: groupId, message }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  searchStudents: (query: string) =>
    api.get('/accounts/users/search/', { params: { q: query } }).then((response) => {
      const raw = response.data || {};
      const results = asArray(raw?.results || raw);
      return toEnvelopeResponse(response, results);
    }),

  getUserStudyGroups: () =>
    withMemoryGetCache(
      buildMemoryGetCacheKey('social-study-groups-my-groups'),
      STUDY_GROUPS_CACHE_TTL_MS,
      () => api.get('/social/study-groups/my-groups/')
    ).then((response) => {
      const raw = response.data || {};
      const results = asArray(raw?.results || raw);
      return toEnvelopeResponse(response, results);
    }),
};

export const adminManagementAPI = {
  listResources: (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    resource_type?: string;
    uploaded_by?: string;
    search?: string;
  }) =>
    api.get('admin-management/resources/', { params }).then((response) => {
      const raw = response.data || {};
      const results = asArray(raw?.results || raw).map(normalizeResource);
      return toEnvelopeResponse(response, {
        results,
        count: Number(raw?.count || results.length),
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),

  getResource: (id: string) =>
    api.get(`admin-management/resources/${id}/`).then((response) => {
      return toEnvelopeResponse(response, normalizeResource(response.data || {}));
    }),

  approveResource: (id: string, reason?: string) =>
    api.post(`admin-management/resources/${id}/approve/`, {
      ...(reason ? { reason } : {}),
    }),

  rejectResource: (id: string, reason: string) =>
    api.post(`admin-management/resources/${id}/reject/`, { reason }),

  flagResource: (id: string, reason?: string) =>
    api.post(`/moderation/resources/${id}/flag/`, {
      ...(reason ? { reason } : {}),
    }),

  archiveResource: (id: string, reason?: string) =>
    api.post(`/moderation/resources/${id}/archive/`, {
      ...(reason ? { reason } : {}),
    }),

  deleteResource: (id: string) => api.delete(`admin-management/resources/${id}/`),

  pinResource: (id: string, isPinned: boolean) =>
    api.post(`admin-management/resources/${id}/pin/`, { pin: isPinned }),
};

export const bookmarksAPI = {
  list: (params?: {
    page?: number;
    limit?: number;
    sort?: string;
    resource_type?: string;
    course?: string;
    unit?: string;
  }) =>
    api.get('/mobile/bookmarks/', { params }).then((response) => {
      const payload = extractData<any>(response.data);
      const bookmarks = asArray(payload?.bookmarks).map((item: any) => ({
        id: String(item?.id || ''),
        saved_at: item?.saved_at || item?.created_at || '',
        resource: normalizeResource(item?.resource || {}),
      }));
      return toEnvelopeResponse(response, {
        bookmarks,
        results: bookmarks,
        pagination: payload?.pagination || null,
      });
    }),

  add: (resourceId: string) => api.post(`/mobile/resources/${resourceId}/bookmark/`),

  remove: async (id: string) => {
    try {
      return await api.delete(`/bookmarks/${id}/`);
    } catch (error) {
      if (isFallbackStatus(error, [404, 405])) {
        try {
          return await api.delete(`/resources/${id}/bookmark/`);
        } catch (secondaryError) {
          if (isFallbackStatus(secondaryError, [404, 405])) {
            return api.post(`/mobile/resources/${id}/bookmark/`);
          }
          throw secondaryError;
        }
      }
      throw error;
    }
  },
};

export const favoritesAPI = {
  list: (params?: {
    page?: number;
    limit?: number;
    type?: 'resources' | 'files' | 'folders' | 'resource' | 'file' | 'folder';
  }) =>
    api.get('/mobile/favorites/', { params }).then((response) => {
      const payload = extractData<any>(response.data);
      const favorites = asArray(payload?.favorites).map((item: any) => ({
        id: String(item?.id || ''),
        created_at: item?.saved_at || item?.created_at || '',
        favorite_type: item?.favorite_type || 'resource',
        resource: item?.resource ? normalizeResource(item.resource) : null,
        personal_file: item?.personal_file || null,
        personal_folder: item?.personal_folder || null,
      }));
      return toEnvelopeResponse(response, {
        favorites,
        results: favorites,
        pagination: payload?.pagination || null,
      });
    }),

  add: (
    payload:
      | string
      | {
          favorite_type: 'resource' | 'personal_file' | 'folder';
          resource_id?: string;
          personal_file_id?: string;
          personal_folder_id?: string;
        }
  ) => {
    if (typeof payload === 'string') {
      return api.post(`/favorites/resources/${payload}/favorite/`);
    }
    return api.post('/favorites/', payload);
  },
  toggleResource: (resourceId: string) => api.post(`/favorites/resources/${resourceId}/favorite/`),
  toggleFile: (fileId: string) => api.post(`/favorites/library/files/${fileId}/favorite/`),
  toggleFolder: (folderId: string) => api.post(`/favorites/library/folders/${folderId}/favorite/`),

  remove: async (id: string) => {
    try {
      return await api.delete(`/favorites/${id}/`);
    } catch (error) {
      if (isFallbackStatus(error, [404, 405])) {
        return api.post(`/favorites/resources/${id}/favorite/`);
      }
      throw error;
    }
  },
};

export const libraryAPIExtended = {
  getSummary: () =>
    api.get('/mobile/library/summary/').then((response) => {
      const payload = extractData<any>(response.data);
      const summary = payload?.summary || payload || {};
      return toEnvelopeResponse(response, {
        total_files: Number(summary?.total_files || 0),
        total_folders: Number(summary?.total_folders || 0),
        used_storage: Number(summary?.storage_used_bytes || 0),
        storage_limit: Number(summary?.storage_limit_bytes || 0),
        remaining_storage: Number(summary?.storage_remaining_bytes || 0),
        usage_percent: Number(summary?.usage_percent || 0),
        warning_level: summary?.warning_level || 'normal',
        trashed_files: Number(summary?.trashed_files || 0),
      });
    }),

  listFiles: (params?: { page?: number; limit?: number; search?: string; folder?: string }) =>
    api.get('/mobile/library/files/', { params }).then((response) => {
      const payload = extractData<any>(response.data);
      const files = asArray(payload?.files).map(normalizeLibraryFile);
      return toEnvelopeResponse(response, {
        files,
        results: files,
        pagination: payload?.pagination || null,
      });
    }),

  listFolders: (params?: { parent?: string }) =>
    api.get('/mobile/library/folders/', { params }).then((response) => {
      const payload = extractData<any>(response.data);
      const folders = asArray(payload?.folders).map(normalizeLibraryFolder);
      return toEnvelopeResponse(response, {
        folders,
        results: folders,
        pagination: payload?.pagination || null,
      });
    }),

  createFolder: (name: string, parent?: string) =>
    api.post('/personal-folders/', { name, parent: parent || null }).then((response) => {
      return toEnvelopeResponse(response, normalizeLibraryFolder(response.data));
    }),

  uploadFile: (data: FormData) =>
    api
      .post('/personal-resources/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => toEnvelopeResponse(response, normalizeLibraryFile(response.data))),

  deleteFile: (id: string) => api.delete(`/personal-resources/${id}/`),

  deleteFolder: (id: string) => api.delete(`/personal-folders/${id}/`),

  moveFile: (id: string, folderId: string) =>
    api.patch(`/personal-resources/${id}/move/`, { folder_id: folderId }),
};

export const libraryAPI = {
  list: async () => {
    const [foldersRes, filesRes] = await Promise.all([
      libraryAPIExtended.listFolders({}),
      libraryAPIExtended.listFiles({}),
    ]);

    const folders = asArray((foldersRes.data as any)?.data?.results).map((folder: any) => ({
      id: folder.id,
      name: folder.name,
      item_count: Number(folder.file_count || 0),
      created_at: folder.created_at,
      is_favorite: Boolean(folder.is_favorite),
      parent: folder.parent,
    }));

    const files = asArray((filesRes.data as any)?.data?.results).map((file: any) => ({
      id: file.id,
      name: file.name,
      title: file.title,
      file_size: file.file_size,
      file_type: file.file_type,
      resource_type: file.file_type || 'file',
      created_at: file.created_at,
      is_favorite: Boolean(file.is_favorite),
    }));

    return localEnvelopeResponse({
      results: [...folders, ...files],
    });
  },

  createFolder: (name: string, parent?: string) => libraryAPIExtended.createFolder(name, parent),

  uploadFile: (data: FormData) => libraryAPIExtended.uploadFile(data),

  deleteFile: (id: string) => libraryAPIExtended.deleteFile(id),

  deleteFolder: (id: string) => libraryAPIExtended.deleteFolder(id),

  moveFile: (id: string, folderId: string) => libraryAPIExtended.moveFile(id, folderId),

  moveFolder: (id: string, parentId: string | null) =>
    api.patch(`/personal-folders/${id}/move/`, { parent_id: parentId }),
};

export const notificationsAPI = {
  list: (params?: { page?: number; unread_only?: boolean }) =>
    api
      .get('/mobile/notifications/', {
        params: {
          page: params?.page,
        },
      })
      .then((response) => {
        const payload = extractData<any>(response.data);
        let notifications = asArray(payload?.notifications).map(normalizeNotification);
        if (params?.unread_only) {
          notifications = notifications.filter((item) => !item.is_read);
        }
        return toEnvelopeResponse(response, {
          notifications,
          results: notifications,
          unread_count: Number(payload?.unread_count || notifications.filter((n) => !n.is_read).length),
          pagination: payload?.pagination || null,
        });
      }),

  markAsRead: (id: string) => api.post(`/mobile/notifications/${id}/read/`),

  markAllAsRead: () => api.post('/mobile/notifications/read-all/'),

  registerDevice: (token: string, deviceType: string) =>
    api.post('/mobile/device/register/', {
      device_token: token,
      device_type: deviceType,
    }),

  unregisterDevice: (_id: string) =>
    Promise.resolve(localEnvelopeResponse({ success: true }, { message: 'Device unregistration is handled server-side by token rotation.' })),
};

export const downloadsAPI = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get('/downloads/history/', {
      params: {
        page: params?.page,
        page_size: params?.page_size,
      },
    }).then((response) => {
      const payload = response.data || {};
      const results = asArray(payload?.results || payload).map(normalizeDownloadHistoryItem);
      return toEnvelopeResponse(response, {
        downloads: results,
        results,
        count: Number(payload?.count || results.length),
        next: payload?.next || null,
        previous: payload?.previous || null,
      });
    }),

  stats: () =>
    api.get('/downloads/stats/').then((response) => {
      const payload = response.data || {};
      return toEnvelopeResponse(response, {
        total_downloads: Number(payload?.total_downloads || 0),
        unique_resources: Number(payload?.unique_resources || 0),
        recent_downloads: asArray(payload?.recent_downloads).map(normalizeDownloadHistoryItem),
      });
    }),
};

export const announcementsAPI = {
  list: (params?: { page?: number; category?: string }) =>
    api
      .get('/announcements/', {
        params: {
          page: params?.page,
          announcement_type: params?.category,
        },
      })
      .then((response) => {
        const raw = response.data || {};
        const rawList = asArray(raw?.results || raw);
        const announcements = rawList.map(normalizeAnnouncement);
        return toEnvelopeResponse(response, {
          announcements,
          results: announcements,
          count: raw?.count || announcements.length,
          next: raw?.next || null,
          previous: raw?.previous || null,
        });
      }),

  get: (id: string) =>
    api.get(`/announcements/${id}/`).then((response) => {
      const announcement = normalizeAnnouncement(response.data || {});
      return toEnvelopeResponse(response, announcement);
    }),
};

export const trashAPI = {
  list: (_params?: { page?: number }) =>
    api.get('/library/trash/').then((response) => {
      const items = asArray(response.data).map(normalizeTrashItem);
      return toEnvelopeResponse(response, {
        items,
        results: items,
      });
    }),

  restore: (id: string) => api.post('/library/trash/restore/', { file_id: id }),

  restoreAll: async () => {
    const listResponse = await trashAPI.list({ page: 1 });
    const items = asArray((listResponse.data as any)?.data?.results);
    await Promise.all(items.map((item: any) => trashAPI.restore(String(item.id))));
    return localEnvelopeResponse({ restored_count: items.length });
  },

  permanentDelete: (id: string) =>
    api.post('/library/trash/permanent-delete/', { file_id: id }),

  emptyAll: async () => {
    const listResponse = await trashAPI.list({ page: 1 });
    const items = asArray((listResponse.data as any)?.data?.results);
    await Promise.all(items.map((item: any) => trashAPI.permanentDelete(String(item.id))));
    return localEnvelopeResponse({ deleted_count: items.length });
  },
};

export const activityStatsAPI = {
  getStats: async () => {
    const [activityResponse, mobileStatsResponse] = await Promise.all([
      api.get('/activity/stats/'),
      api.get('/mobile/stats/'),
    ]);

    const activity = activityResponse.data || {};
    const mobilePayload = extractData<any>(mobileStatsResponse.data);
    const mobileStats = mobilePayload?.stats || mobilePayload || {};

    return toEnvelopeResponse(activityResponse, {
      total_views: Number(activity?.viewed_count || 0),
      total_downloads: Number(mobileStats?.total_downloads || activity?.downloaded_count || 0),
      total_uploads: Number(mobileStats?.total_uploads || 0),
      hours_active: Number(activity?.total_activities || 0),
    });
  },

  getRecent: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/activity/recent/', { params }).then((response) => {
      const raw = response.data || {};
      const items = asArray(raw?.results || raw).map(normalizeActivity);
      return toEnvelopeResponse(response, {
        results: items,
        count: raw?.count || items.length,
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),
};

export const userAPI = {
  getProfile: () =>
    api.get('/auth/profile/').then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, normalizeUser(payload));
    }),

  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    bio?: string;
    avatar?: string;
  }) => {
    const currentFullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
    const payload: Record<string, unknown> = {
      ...(currentFullName ? { full_name: currentFullName } : {}),
      ...(data.phone ? { phone_number: data.phone } : {}),
      ...(data.bio ? { bio: data.bio } : {}),
      ...(data.avatar ? { profile_image: data.avatar } : {}),
    };
    return api.patch('/auth/profile/', payload);
  },

  // Full profile update with all fields
  updateFullProfile: (data: {
    full_name?: string;
    phone_number?: string;
    registration_number?: string;
    faculty?: number | string | null;
    department?: number | string | null;
    course?: number | string | null;
    year_of_study?: number | null;
    semester?: number | null;
    bio?: string;
    date_of_birth?: string | null;
    address?: string;
    city?: string;
    country?: string;
    website?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  }) => {
    return api.patch('/auth/profile/', data).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, normalizeUser(payload));
    });
  },

  // Profile photo upload
  uploadProfilePhoto: (formData: FormData) => {
    return api.post('/auth/profile/photo/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    });
  },

  // Delete profile photo
  deleteProfilePhoto: () => {
    return api.delete('/auth/profile/photo/delete/');
  },

  changePassword: (data: {
    current_password: string;
    new_password: string;
    new_password_confirm: string;
  }) =>
    api.post('/auth/password/change/', {
      old_password: data.current_password,
      new_password: data.new_password,
      new_password_confirm: data.new_password_confirm,
    }),

  // User preferences
  getPreferences: () =>
    api.get('/auth/profile/preferences/').then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  updatePreferences: (data: {
    email_notifications?: boolean;
    app_notifications?: boolean;
    push_notifications?: boolean;
    weekly_digest?: boolean;
    public_profile?: boolean;
    show_email?: boolean;
    show_activity?: boolean;
    language?: string;
    timezone?: string;
    theme?: string;
  }) =>
    api.patch('/auth/profile/preferences/', data).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  // Profile completion
  getProfileCompletion: () =>
    api.get('/auth/profile/completion/').then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  // Linked accounts
  getLinkedAccounts: () =>
    api.get('/auth/profile/linked-accounts/').then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  getActivity: (params?: { page?: number }) =>
    api.get('/activity/recent/', { params }).then((response) => {
      const raw = response.data || {};
      const activities = asArray(raw?.results || raw).map(normalizeActivity);
      return toEnvelopeResponse(response, {
        results: activities,
        count: raw?.count || activities.length,
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),

  getStorage: () =>
    api.get('/library/storage-summary/').then((response) => {
      const payload = response.data || {};
      return toEnvelopeResponse(response, {
        storage_limit: Number(payload?.storage_limit_bytes || 0),
        storage_used: Number(payload?.storage_used_bytes || 0),
        storage_remaining: Number(payload?.storage_remaining_bytes || 0),
        usage_percent: Number(payload?.usage_percent || 0),
        total_files: Number(payload?.total_files || 0),
        warning_level: payload?.warning_level || 'normal',
      });
    }),
};

export const securityAPI = {
  getTwoFactorStatus: () =>
    api.get('/auth/2fa/status/').then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  setupTwoFactor: (method: 'totp' | 'email' = 'totp') =>
    api.post('/auth/2fa/setup/', { method }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  enableTwoFactor: (code: string) =>
    api.post('/auth/2fa/enable/', { code }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  disableTwoFactor: (password: string) =>
    api.post('/auth/2fa/disable/', { password }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  recoveryCodes: (password: string) =>
    api.post('/auth/2fa/recovery-codes/', { password }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  getSessions: () =>
    api.get('/auth/sessions/').then((response) => {
      const payload = response.data || {};
      return toEnvelopeResponse(response, payload);
    }),

  revokeSession: (session_key?: string, revoke_all?: boolean) =>
    api.post('/auth/sessions/revoke/', {
      ...(session_key ? { session_key } : {}),
      ...(revoke_all ? { revoke_all } : {}),
    }),

  deleteAccount: (password: string) =>
    api.post('/auth/account/delete/', { password }),

  linkGoogle: (payload: { id_token?: string; access_token?: string }) =>
    api.post('/auth/google/link/', payload),

  linkMicrosoft: (payload: { access_token: string; id_token?: string }) =>
    api.post('/auth/microsoft/link/', payload),

  unlinkAccount: (provider: 'google' | 'microsoft' | 'apple') =>
    api.post('/auth/profile/linked-accounts/unlink/', { provider }),
};

export const billingAPI = {
  requestStorageUpgrade: (payload: {
    plan: string;
    billing_cycle?: 'monthly' | 'yearly';
    payment_method?: string;
  }) =>
    api.post('/storage/upgrade-requests/', payload).then((response) => {
      const data = extractData<any>(response.data);
      return toEnvelopeResponse(response, data);
    }),
};

export const searchAPI = {
  search: (
    query: string,
    filters?: {
      resource_type?: string;
      faculty?: string;
      department?: string;
      course?: string;
      unit?: string;
      year?: string | number;
      year_of_study?: string | number;
      semester?: string | number;
      file_type?: string;
      sort?: string;
      page?: number;
    },
    options?: { signal?: AbortSignal }
  ) =>
    api
      .get('/search/', {
        signal: options?.signal,
        params: {
          q: query,
          resource_type: filters?.resource_type,
          faculty: filters?.faculty,
          department: filters?.department,
          course: filters?.course,
          unit: filters?.unit,
          year: filters?.year,
          year_of_study: filters?.year_of_study,
          semester: filters?.semester,
          file_type: filters?.file_type,
          sort: filters?.sort,
          page: filters?.page,
        },
      })
      .then((response) => {
        const raw = response.data || {};
        const results = asArray(raw?.results || raw).map(normalizeResource);
        return toEnvelopeResponse(response, {
          results,
          count: raw?.count || results.length,
          next: raw?.next || null,
          previous: raw?.previous || null,
        });
      }),

  suggestions: (query: string, limit: number = 10) =>
    api.get('/search/suggestions/', { params: { q: query, limit } }).then((response) => {
      const payload = response.data || {};
      return toEnvelopeResponse(response, {
        suggestions: asArray(payload?.suggestions),
        typed_suggestions: asArray(payload?.typed_suggestions),
      });
    }),

  recentSearches: (limit: number = 10) =>
    api.get('/search/recent/').then((response) => {
      const payload = response.data || {};
      const recent = asArray(payload?.recent_searches).map((item: any) => ({
        id: String(item?.id || ''),
        query: String(item?.query || '').trim(),
        normalized_query: String(item?.normalized_query || '').trim(),
        filters: item?.filters || {},
        results_count: Number(item?.results_count || 0),
        last_searched_at: item?.last_searched_at || '',
      }));
      return toEnvelopeResponse(response, recent.slice(0, Math.max(1, limit)));
    }),

  clearRecentSearches: () => api.delete('/search/recent/'),
  deleteRecentSearch: (id: string) => api.delete(`/search/recent/${id}/`),
};

export const analyticsAPI = {
  getDashboard: () =>
    api.get('/mobile/dashboard/').then((response) => {
      const payload = extractData<any>(response.data);
      const resources = asArray(payload?.recent_resources).map(normalizeResource);
      const announcements = asArray(payload?.announcements).map((a: any) => ({
        id: String(a?.id || ''),
        title: a?.title || '',
        message: a?.message || '',
        type: a?.type || '',
        created_at: a?.created_at || '',
      }));
      return toEnvelopeResponse(response, {
        stats: payload?.stats || {},
        recent_resources: resources,
        announcements,
      });
    }),

  getStats: async () => {
    try {
      const [dashboardResponse, resourcesResponse] = await Promise.all([
        api.get('/analytics/dashboard/'),
        api.get('/analytics/resources/', { params: { limit: 10 } }),
      ]);
      const rawStats = dashboardResponse.data || {};
      const overview = rawStats?.overview || {};
      const nestedUsers = rawStats?.users || {};
      const nestedResources = rawStats?.resources || {};
      const nestedDownloads = rawStats?.downloads || {};
      const topRaw = asArray(
        rawStats?.top_resources?.length ? rawStats.top_resources : resourcesResponse.data?.results || resourcesResponse.data
      );
      const topResources = topRaw.slice(0, 10).map((item: any) => ({
        id: String(item?.id || ''),
        title: item?.title || '',
        download_count: Number(item?.download_count || 0),
        view_count: Number(item?.view_count || 0),
      }));
      return toEnvelopeResponse(dashboardResponse, {
        stats: {
          total_users: Number(overview?.total_users ?? nestedUsers?.total ?? rawStats?.total_users ?? 0),
          total_resources: Number(
            overview?.total_resources ?? nestedResources?.total ?? rawStats?.total_resources ?? 0
          ),
          total_downloads: Number(
            overview?.total_downloads ?? nestedDownloads?.total ?? rawStats?.total_downloads ?? 0
          ),
          total_uploads: Number(
            overview?.total_uploads ?? nestedResources?.new_last_30_days ?? rawStats?.total_uploads ?? 0
          ),
          pending_resources: Number(
            nestedResources?.pending ?? rawStats?.pending_resources ?? 0
          ),
          reported_resources: Number(rawStats?.reported_resources || 0),
          active_users: Number(
            overview?.active_users ?? rawStats?.active_users ?? 0
          ),
        },
        top_resources: topResources,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const fallback = await api.get('/mobile/stats/');
        const payload = extractData<any>(fallback.data);
        const stats = payload?.stats || payload || {};
        return toEnvelopeResponse(fallback, {
          stats: {
            total_users: 0,
            total_resources: 0,
            total_downloads: Number(stats?.total_downloads || 0),
            total_uploads: Number(stats?.total_uploads || 0),
            pending_resources: 0,
            reported_resources: 0,
            active_users: 0,
          },
          top_resources: [],
        });
      }
      throw error;
    }
  },

  getResourceStats: (resourceId: string) =>
    api.get('/analytics/resource-analytics/', { params: { resource_id: resourceId } }),

  getUserStats: (_userId: string) => api.get('/analytics/user/activity-summary/'),
};

export const coursesAPI = {
  list: () =>
    api.get('/mobile/courses/').then((response) => {
      const payload = extractData<any>(response.data);
      const courses = asArray(payload?.courses).map((course: any) => ({
        id: String(course?.id || ''),
        name: course?.name || '',
        code: course?.code || '',
      }));
      return toEnvelopeResponse(response, {
        courses,
        results: courses,
      });
    }),

  getUnits: (
    courseId: string,
    filters?: { semester?: string; yearOfStudy?: string | number }
  ) =>
    withMemoryGetCache(
      buildMemoryGetCacheKey(`mobile-courses-units:${courseId}`, {
        semester: filters?.semester,
        year_of_study: filters?.yearOfStudy,
      }),
      ACADEMIC_REFERENCE_CACHE_TTL_MS,
      () =>
        api.get(`/mobile/courses/${courseId}/units/`, {
          params: {
            semester: filters?.semester,
            year_of_study: filters?.yearOfStudy,
          },
        })
    ).then((response) => {
      const payload = extractData<any>(response.data);
      const units = asArray(payload?.units).map((unit: any) => ({
        id: String(unit?.id || ''),
        name: unit?.name || '',
        code: unit?.code || '',
        semester:
          unit?.semester === null || unit?.semester === undefined || unit?.semester === ''
            ? undefined
            : Number(unit.semester),
        year_of_study:
          unit?.year_of_study === null ||
          unit?.year_of_study === undefined ||
          unit?.year_of_study === ''
            ? undefined
            : Number(unit.year_of_study),
      }));
      return toEnvelopeResponse(response, {
        units,
        results: units,
      });
    }),
};

export const facultiesAPI = {
  list: () =>
    api.get('/mobile/faculties/').then((response) => {
      const payload = extractData<any>(response.data);
      const faculties = asArray(payload?.faculties).map((faculty: any) => ({
        id: String(faculty?.id || ''),
        name: faculty?.name || '',
      }));
      return toEnvelopeResponse(response, {
        faculties,
        results: faculties,
      });
    }),
};

// Public academic data API for registration (no auth required)
export const publicAcademicAPI = {
  getFaculties: () =>
    withMemoryGetCache(
      buildMemoryGetCacheKey('public-faculties', { api_base_url: getApiBaseUrl() }),
      ACADEMIC_REFERENCE_CACHE_TTL_MS,
      () => api.get('/public/faculties/')
    ).then((response) => {
      const payload = extractData<any>(response.data);
      const faculties = asArray(payload?.faculties).map((faculty: any) => ({
        id: String(faculty?.id || ''),
        name: faculty?.name || '',
        code: faculty?.code || '',
      }));
      return toEnvelopeResponse(response, {
        faculties,
        results: faculties,
      });
    }),

  getDepartments: (facultyId: string) =>
    withMemoryGetCache(
      buildMemoryGetCacheKey('public-departments', {
        faculty_id: facultyId,
        api_base_url: getApiBaseUrl(),
      }),
      ACADEMIC_REFERENCE_CACHE_TTL_MS,
      () => api.get('/public/departments/', { params: { faculty_id: facultyId } })
    ).then((response) => {
      const payload = extractData<any>(response.data);
      const departments = asArray(payload?.departments).map((dept: any) => ({
        id: String(dept?.id || ''),
        name: dept?.name || '',
        code: dept?.code || '',
        faculty_id: String(dept?.faculty_id || ''),
      }));
      return toEnvelopeResponse(response, {
        departments,
        results: departments,
      });
    }),

  getCourses: (
    departmentIdOrFacultyId: string,
    filters?: { semester?: string; yearOfStudy?: string | number },
    isFaculty?: boolean
  ) =>
    withMemoryGetCache(
      buildMemoryGetCacheKey('public-courses', {
        [isFaculty ? 'faculty_id' : 'department_id']: departmentIdOrFacultyId,
        api_base_url: getApiBaseUrl(),
        semester: filters?.semester,
        year_of_study: filters?.yearOfStudy,
      }),
      ACADEMIC_REFERENCE_CACHE_TTL_MS,
      () =>
        api.get('/public/courses/', {
          params: {
            [isFaculty ? 'faculty_id' : 'department_id']: departmentIdOrFacultyId,
            semester: filters?.semester,
            year_of_study: filters?.yearOfStudy,
          },
        })
    ).then((response) => {
      const payload = extractData<any>(response.data);
      const courses = asArray(payload?.courses).map((course: any) => ({
        id: String(course?.id || ''),
        name: course?.name || '',
        code: course?.code || '',
        department_id: String(course?.department_id || ''),
        duration_years: course?.duration_years || 4,
      }));
      return toEnvelopeResponse(response, {
        courses,
        results: courses,
      });
    }),
};

export const userUploadsAPI = {
  list: (params?: { page?: number; status?: string }) =>
    api.get('/resources/my-uploads/', { params: { page: params?.page } }).then((response) => {
      const raw = response.data || {};
      const source = asArray(raw?.results || raw);
      let uploads = source.map((item: any) => ({
        id: String(item?.id || ''),
        title: item?.title || '',
        description: item?.description || '',
        resource_type: item?.resource_type || item?.file_type || '',
        file_size: Number(item?.file_size || 0),
        status: item?.status === 'approved' ? 'published' : item?.status || 'pending',
        view_count: Number(item?.view_count || 0),
        download_count: Number(item?.download_count || 0),
        average_rating: Number(item?.average_rating || 0),
        created_at: item?.created_at || '',
        updated_at: item?.updated_at || '',
        rejection_reason: item?.rejection_reason || '',
      }));

      if (params?.status && params.status !== 'all') {
        uploads = uploads.filter((item) => item.status === params.status);
      }

      return toEnvelopeResponse(response, {
        results: uploads,
        count: uploads.length,
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),

  get: (id: string) => api.get(`/resources/${id}/`),

  update: (id: string, data: FormData) =>
    api.patch(`/resources/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) => api.delete(`/resources/${id}/`),

  publish: (id: string) => api.patch(`/resources/${id}/`, { status: 'pending' }),
};

export const folderAPI = {
  get: (id: string) =>
    api.get(`/personal-folders/${id}/`).then((response) => {
      const folder = normalizeLibraryFolder(response.data || {});
      const raw = response.data || {};
      return {
        ...response,
        data: {
          ...raw,
          ...folder,
          item_count:
            Number(asArray(raw?.files).length) + Number(asArray(raw?.subfolders).length),
          modified_at: raw?.updated_at || raw?.created_at || '',
        },
      };
    }),

  listContents: (id: string, _params?: { page?: number }) =>
    api.get(`/personal-folders/${id}/contents/`).then((response) => {
      const raw = response.data || {};
      const subfolders = asArray(raw?.subfolders).map((folder: any) => ({
        id: String(folder?.id || ''),
        name: folder?.name || '',
        item_count: Number(folder?.file_count || 0),
        created_at: folder?.created_at || '',
      }));
      const files = asArray(raw?.files).map((file: any) => ({
        id: String(file?.id || ''),
        name: file?.title || '',
        title: file?.title || '',
        file_size: Number(file?.file_size || 0),
        file_type: file?.file_type || '',
        resource_type: file?.file_type || 'file',
        created_at: file?.created_at || '',
      }));
      return {
        ...response,
        data: {
          results: [...subfolders, ...files],
        },
      };
    }),

  create: (name: string, parent?: string) =>
    api.post('/personal-folders/', { name, parent: parent || null }),

  rename: (id: string, name: string) =>
    api.patch(`/personal-folders/${id}/`, { name }),

  delete: (id: string) => api.delete(`/personal-folders/${id}/`),
};

export const deviceAPI = {
  register: (data: {
    device_token: string;
    device_type: string;
    device_name?: string;
    device_model?: string;
    app_version?: string;
  }) => api.post('/mobile/device/register/', data),

  subscribeTopic: (topic: string, deviceToken: string) =>
    api.post('/mobile/topic/subscribe/', { topic, device_token: deviceToken }),

  unsubscribeTopic: (topic: string, deviceToken: string) =>
    api.post('/mobile/topic/unsubscribe/', { topic, device_token: deviceToken }),
};

// Gamification API for badges, points, achievements, and leaderboards
export const gamificationAPI = {
  getStats: () =>
    api.get('/gamification/stats/').then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  getLeaderboard: (period?: string) =>
    api.get('/mobile/leaderboard/', { params: { period } }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  checkBadges: () =>
    api.post('/gamification/check-badges/').then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
};

// Admin Backup & System API
export const adminAPI = {
  getSystemStats: () =>
    api.get('admin-management/system-stats/').then((response) => {
      return toEnvelopeResponse(response, normalizeAdminSystemStats(response.data || {}));
    }),
  createBackup: () =>
    api.get('admin-management/backup/').then((response) => {
      return toEnvelopeResponse(response, normalizeBackupMetadata(response.data || {}));
    }),
  exportData: () =>
    api.get('admin-management/export/').then((response) => {
      return toEnvelopeResponse(response, normalizeExportMetadata(response.data || {}));
    }),
  listStudyGroups: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    privacy?: 'public' | 'private';
    year_of_study?: number;
  }) =>
    api.get('admin-management/study-groups/', { params }).then((response) => {
      const raw = response.data || {};
      const results = asArray(raw?.results || raw).map(normalizeAdminStudyGroup);
      return toEnvelopeResponse(response, {
        results,
        count: Number(raw?.count || results.length),
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),
  getStudyGroup: (id: string) =>
    api.get(`admin-management/study-groups/${id}/`).then((response) => {
      return toEnvelopeResponse(response, normalizeAdminStudyGroup(response.data || {}));
    }),
  updateStudyGroup: (
    id: string,
    data: {
      name?: string;
      description?: string;
      is_public?: boolean;
      allow_member_invites?: boolean;
      max_members?: number;
      status?: 'active' | 'archived' | 'completed';
    }
  ) =>
    api.patch(`admin-management/study-groups/${id}/`, data).then((response) => {
      return toEnvelopeResponse(response, normalizeAdminStudyGroup(response.data || {}));
    }),
  getSystemHealth: () =>
    api.get('admin-management/system-health/').then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  search: (query: string, limit: number = 20) =>
    api
      .get('admin-management/search/', {
        params: { query: query.trim(), limit },
      })
      .then((response) => {
        const grouped = response.data || {};
        const results = [
          ...asArray(grouped?.users).map((item: any) => ({
            id: String(item?.id || ''),
            type: 'users',
            title: item?.full_name || item?.email || 'User',
            subtitle: item?.email || '',
          })),
          ...asArray(grouped?.resources).map((item: any) => ({
            id: String(item?.id || ''),
            type: 'resources',
            title: item?.title || 'Resource',
            subtitle: [item?.status, item?.resource_type].filter(Boolean).join(' • '),
          })),
          ...asArray(grouped?.reports).map((item: any) => ({
            id: String(item?.id || ''),
            type: 'reports',
            title: item?.reason_type || 'Report',
            subtitle: item?.status || '',
          })),
          ...asArray(grouped?.faculties).map((item: any) => ({
            id: String(item?.id || ''),
            type: 'faculties',
            title: item?.name || 'Faculty',
            subtitle: item?.code || '',
          })),
          ...asArray(grouped?.departments).map((item: any) => ({
            id: String(item?.id || ''),
            type: 'departments',
            title: item?.name || 'Department',
            subtitle: item?.code || '',
          })),
          ...asArray(grouped?.courses).map((item: any) => ({
            id: String(item?.id || ''),
            type: 'courses',
            title: item?.name || 'Course',
            subtitle: item?.code || '',
          })),
          ...asArray(grouped?.units).map((item: any) => ({
            id: String(item?.id || ''),
            type: 'units',
            title: item?.name || 'Unit',
            subtitle: item?.code || '',
          })),
        ];
        return toEnvelopeResponse(response, { grouped, results });
      }),
  listUsers: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
    is_verified?: boolean;
    role?: string;
  }) =>
    api.get('admin-management/users/', { params }).then((response) => {
      const raw = response.data || {};
      const results = asArray(raw?.results || raw).map(normalizeAdminUser);
      return toEnvelopeResponse(response, {
        results,
        count: Number(raw?.count || results.length),
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),
  getUser: (id: string) =>
    api.get(`admin-management/users/${id}/`).then((response) => {
      return toEnvelopeResponse(response, normalizeAdminUser(response.data || {}));
    }),
  getUserActivities: (id: string, params?: { page?: number; page_size?: number }) =>
    api.get(`admin-management/users/${id}/activities/`, { params }).then((response) => {
      const raw = response.data || {};
      const results = asArray(raw?.results || raw).map((item: any) => ({
        id: String(item?.id || ''),
        action: item?.action || '',
        description: item?.description || '',
        resource: item?.resource || '',
        created_at: item?.created_at || '',
      }));
      return toEnvelopeResponse(response, {
        results,
        count: Number(raw?.count || results.length),
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),
  updateUserStatus: (id: string, isActive: boolean) =>
    api.patch(`admin-management/users/${id}/status/`, { is_active: isActive }),
  updateUserRole: (id: string, role: string) =>
    api.patch(`admin-management/users/${id}/role/`, { role }),
  listReports: (params?: { status?: string; page?: number; page_size?: number }) =>
    api.get('admin-management/reports/', { params }).then((response) => {
      const raw = response.data || {};
      const results = asArray(raw?.results || raw).map(normalizeAdminReport);
      return toEnvelopeResponse(response, {
        results,
        count: Number(raw?.count || results.length),
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),
  getReport: (id: string) =>
    api.get(`admin-management/reports/${id}/`).then((response) => {
      return toEnvelopeResponse(response, normalizeAdminReport(response.data || {}));
    }),
  updateReport: (id: string, data: { status?: string; resolution_note?: string }) =>
    api.patch(`admin-management/reports/${id}/`, data).then((response) => {
      return toEnvelopeResponse(response, normalizeAdminReport(response.data || {}));
    }),
  resolveReport: (id: string, resolution_note?: string) =>
    api
      .post(`admin-management/reports/${id}/resolve/`, {
        ...(resolution_note ? { resolution_note } : {}),
      })
      .then((response) => toEnvelopeResponse(response, normalizeAdminReport(response.data || {}))),
  dismissReport: (id: string, resolution_note?: string) =>
    api
      .post(`admin-management/reports/${id}/dismiss/`, {
        ...(resolution_note ? { resolution_note } : {}),
      })
      .then((response) => toEnvelopeResponse(response, normalizeAdminReport(response.data || {}))),
  getCurrentProfile: () =>
    api.get('/auth/profile/').then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, normalizeAdminUser(payload));
    }),
  updateCurrentProfile: (data: {
    full_name?: string;
    phone_number?: string;
    bio?: string;
  }) =>
    api.patch('/auth/profile/', data).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, normalizeAdminUser(payload));
    }),
  changePassword: (data: {
    current_password: string;
    new_password: string;
    new_password_confirm: string;
  }) => userAPI.changePassword(data),
  getPreferences: () => userAPI.getPreferences(),
  updatePreferences: (data: {
    email_notifications?: boolean;
    app_notifications?: boolean;
    public_profile?: boolean;
    show_email?: boolean;
    show_activity?: boolean;
    language?: string;
    theme?: string;
  }) => userAPI.updatePreferences(data),

  // Academic Management - Faculties
  getFaculties: (params?: { page?: number; page_size?: number; search?: string; is_active?: boolean }) =>
    api.get('admin-management/faculties/', { params }).then((response) => {
      const raw = response.data || {};
      const results = asArray(raw?.results || raw).map(normalizeAdminFaculty);
      return toEnvelopeResponse(response, {
        results,
        count: Number(raw?.count || results.length),
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),
  getFaculty: (id: string) =>
    api.get(`admin-management/faculties/${id}/`).then((response) => {
      return toEnvelopeResponse(response, normalizeAdminFaculty(response.data || {}));
    }),
  createFaculty: (data: { name: string; code?: string; is_active?: boolean }) =>
    api.post('admin-management/faculties/', data).then((response) => {
      return toEnvelopeResponse(response, normalizeAdminFaculty(response.data || {}));
    }),
  updateFaculty: (id: string, data: { name?: string; code?: string; is_active?: boolean }) =>
    api.patch(`admin-management/faculties/${id}/`, data).then((response) => {
      return toEnvelopeResponse(response, normalizeAdminFaculty(response.data || {}));
    }),
  deleteFaculty: (id: string) =>
    api.delete(`admin-management/faculties/${id}/`).then((response) => {
      return toEnvelopeResponse(response, { success: true });
    }),
  getDepartments: (params?: {
    page?: number;
    page_size?: number;
    faculty?: string;
    is_active?: boolean;
  }) =>
    api.get('admin-management/departments/', { params }).then((response) => {
      const raw = response.data || {};
      const results = asArray(raw?.results || raw).map(normalizeAdminDepartment);
      return toEnvelopeResponse(response, {
        results,
        count: Number(raw?.count || results.length),
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),

  // Academic Management - Courses
  getCourses: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    department?: string;
    is_active?: boolean;
  }) =>
    api.get('admin-management/courses/', { params }).then((response) => {
      const raw = response.data || {};
      const results = asArray(raw?.results || raw).map(normalizeAdminCourse);
      return toEnvelopeResponse(response, {
        results,
        count: Number(raw?.count || results.length),
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),
  getCourse: (id: string) =>
    api.get(`admin-management/courses/${id}/`).then((response) => {
      return toEnvelopeResponse(response, normalizeAdminCourse(response.data || {}));
    }),
  createCourse: (data: {
    name: string;
    code: string;
    description?: string;
    department?: string;
    department_id?: string;
    duration_years?: number;
    is_active?: boolean;
  }) =>
    api
      .post('admin-management/courses/', {
        ...data,
        department: data.department || data.department_id,
      })
      .then((response) => {
        return toEnvelopeResponse(response, normalizeAdminCourse(response.data || {}));
      }),
  updateCourse: (id: string, data: {
    name?: string;
    code?: string;
    description?: string;
    department?: string;
    department_id?: string;
    duration_years?: number;
    is_active?: boolean;
  }) =>
    api
      .patch(`admin-management/courses/${id}/`, {
        ...data,
        department: data.department || data.department_id,
      })
      .then((response) => {
        return toEnvelopeResponse(response, normalizeAdminCourse(response.data || {}));
      }),
  deleteCourse: (id: string) =>
    api.delete(`admin-management/courses/${id}/`).then((response) => {
      return toEnvelopeResponse(response, { success: true });
    }),

  // Academic Management - Units
  getUnits: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    course?: string;
    is_active?: boolean;
  }) =>
    api.get('admin-management/units/', { params }).then((response) => {
      const raw = response.data || {};
      const results = asArray(raw?.results || raw).map(normalizeAdminUnit);
      return toEnvelopeResponse(response, {
        results,
        count: Number(raw?.count || results.length),
        next: raw?.next || null,
        previous: raw?.previous || null,
      });
    }),
  getAllUnits: async (params?: {
    search?: string;
    course?: string;
    is_active?: boolean;
  }) => {
    const data = await collectPaginatedResults(
      (page) =>
        api.get('admin-management/units/', {
          params: {
            ...params,
            page,
            page_size: 100,
          },
        }),
      normalizeAdminUnit
    );
    return {
      data: {
        success: true,
        data,
      },
    };
  },
  getUnit: (id: string) =>
    api.get(`admin-management/units/${id}/`).then((response) => {
      return toEnvelopeResponse(response, normalizeAdminUnit(response.data || {}));
    }),
  createUnit: (data: {
    name: string;
    code: string;
    description?: string;
    course?: string;
    course_id?: string;
    semester?: number | string;
    year_of_study?: number;
    is_active?: boolean;
  }) =>
    api
      .post('admin-management/units/', {
        ...data,
        course: data.course || data.course_id,
      })
      .then((response) => {
        return toEnvelopeResponse(response, normalizeAdminUnit(response.data || {}));
      }),
  updateUnit: (id: string, data: {
    name?: string;
    code?: string;
    description?: string;
    course?: string;
    course_id?: string;
    semester?: number | string;
    year_of_study?: number;
    is_active?: boolean;
  }) =>
    api
      .patch(`admin-management/units/${id}/`, {
        ...data,
        course: data.course || data.course_id,
      })
      .then((response) => {
        return toEnvelopeResponse(response, normalizeAdminUnit(response.data || {}));
      }),
  deleteUnit: (id: string) =>
    api.delete(`admin-management/units/${id}/`).then((response) => {
      return toEnvelopeResponse(response, { success: true });
    }),
};

// Study Groups API
export const studyGroupsAPI = {
  list: (params?: {
    course_id?: string;
    year?: number;
    page?: number;
    search?: string;
    scope?: 'all' | 'my' | 'public';
  }) =>
    api.get('/social/study-groups/', { params }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  get: (id: string) =>
    api.get(`/social/study-groups/${id}/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  update: (id: string, data: { name?: string; description?: string; privacy?: string; allow_member_invites?: boolean }) =>
    api.patch(`/social/study-groups/${id}/`, data).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  delete: (id: string) =>
    api.delete(`/social/study-groups/${id}/`).then((response) => {
      return toEnvelopeResponse(response, null);
    }),
  getGroup: (id: string) =>
    api.get(`/social/study-groups/${id}/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  create: (data: { name: string; description: string; course_id?: string; year_of_study?: number; is_public?: boolean; max_members?: number }) =>
    api.post('/social/study-groups/', data).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  join: (id: string) =>
    api.post(`/social/study-groups/${id}/join/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  joinGroup: (id: string) =>
    api.post(`/social/study-groups/${id}/join/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  leave: (id: string) =>
    api.post(`/social/study-groups/${id}/leave/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  leaveGroup: (id: string) =>
    api.post(`/social/study-groups/${id}/leave/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  getMembers: (id: string) =>
    api.get(`/social/study-groups/${id}/members/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  removeMember: (groupId: string, userId: string) =>
    api.delete(`/social/study-groups/${groupId}/members/${userId}/`).then((response) => {
      return toEnvelopeResponse(response, null);
    }),
  updateMemberRole: (groupId: string, userId: string, data: { role: 'admin' | 'moderator' | 'member' }) =>
    api.patch(`/social/study-groups/${groupId}/members/${userId}/`, data).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  getPosts: (id: string, params?: { page?: number }) =>
    api.get(`/social/study-groups/${id}/posts/`, { params }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  createPost: (id: string, data: { title?: string; content: string }) =>
    api.post(`/social/study-groups/${id}/posts/`, {
      title: data.title || data.content.slice(0, 80) || 'Group update',
      content: data.content,
    }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  likePost: (groupId: string, postId: string) =>
    api.post(`/social/study-groups/${groupId}/posts/${postId}/like/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  getPostComments: (groupId: string, postId: string) =>
    api.get(`/social/study-groups/${groupId}/posts/${postId}/comments/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  createPostComment: (groupId: string, postId: string, data: { content: string }) =>
    api.post(`/social/study-groups/${groupId}/posts/${postId}/comments/`, data).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  getResources: (id: string) =>
    api.get(`/social/study-groups/${id}/resources/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  shareResource: (groupId: string, data: { resource_id: string; description?: string }) =>
    api.post(`/social/study-groups/${groupId}/resources/`, data).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  // Invite Link Methods
  createInviteLink: (groupId: string, data: {
    expires_in_hours?: number;
    allow_auto_join?: boolean;
    max_uses?: number;
    notes?: string;
  }) =>
    api.post(`/social/study-groups/${groupId}/invite-links/`, data).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  getInviteLinks: (groupId: string) =>
    api.get(`/social/study-groups/${groupId}/invite-links/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  validateInviteLink: (token: string) =>
    api.get(`/social/study-groups/invite-links/${token}/validate/`).then((response) => {
      return toEnvelopeResponse(response, response.data);
    }),

  joinViaInvite: (token: string) =>
    api.post(`/social/study-groups/invite-links/${token}/join/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),

  revokeInviteLink: (token: string) =>
    api.post(`/social/study-groups/invite-links/${token}/revoke/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
};

// Resource Requests API
export const resourceRequestsAPI = {
  list: (params?: { status?: string; page?: number }) =>
    api.get('/mobile/resource-requests/', { params }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  create: (data: { title: string; description: string; course_id?: string; priority?: string }) =>
    api.post('/mobile/resource-requests/', data).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  upvote: (id: string) =>
    api.post(`/mobile/resource-requests/${id}/upvote/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
};

// Course Progress API
export const courseProgressAPI = {
  getProgress: (courseId: string) =>
    api.get(`/courses/${courseId}/progress/`).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  updateProgress: (courseId: string, resourceId: string, status: string) =>
    api.post(`/courses/${courseId}/progress/`, { resource_id: resourceId, status }).then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
  getAllProgress: () =>
    api.get('/courses/progress/').then((response) => {
      const payload = extractData<any>(response.data);
      return toEnvelopeResponse(response, payload);
    }),
};

export default api;
