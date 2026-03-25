// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000';
export const API_PREFIX = '/api';

// App Theme Colors
export const COLORS = {
  // Primary Colors
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryDark: '#3730A3',
  
  // Secondary Colors
  secondary: '#10B981',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',
  
  // Accent Colors
  accent: '#F59E0B',
  accentLight: '#FBBF24',
  accentDark: '#D97706',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Semantic Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Resource Type Colors
  resourceNotes: '#8B5CF6',
  resourceSlides: '#EC4899',
  resourcePastPaper: '#F97316',
  resourceBook: '#14B8A6',
  resourceAssignment: '#6366F1',
  resourceTutorial: '#84CC16',
  resourceOther: '#6B7280',
  
  // Status Colors
  statusPending: '#F59E0B',
  statusApproved: '#10B981',
  statusRejected: '#EF4444',
};

// Resource Type Icons
export const RESOURCE_TYPE_ICONS: Record<string, string> = {
  notes: 'book',
  slides: 'presentation',
  past_paper: 'document-text',
  book: 'book',
  assignment: 'create',
  tutorial: 'school',
  other: 'folder',
};

// Resource Type Labels
export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  notes: 'Notes',
  slides: 'Slides',
  past_paper: 'Past Papers',
  book: 'Books',
  assignment: 'Assignments',
  tutorial: 'Tutorials',
  other: 'Other',
};

// Notification Type Icons
export const NOTIFICATION_ICONS: Record<string, string> = {
  resource_approved: 'check-circle',
  resource_rejected: 'close-circle',
  new_comment: 'chatbubble',
  comment_reply: 'chatbubble-ellipses',
  new_rating: 'star',
  new_download: 'download',
  trending: 'trending-up',
  announcement: 'megaphone',
  resource_shared_with_user: 'share',
  resource_shared_to_group: 'people',
};

// Storage Keys
export const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: '@campushub_onboarding_complete',
  THEME_MODE: '@campushub_theme_mode',
  LANGUAGE: '@campushub_language',
};

// App Routes
export const ROUTES = {
  // Auth Routes
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  
  // Main Tabs
  HOME: 'Home',
  RESOURCES: 'Resources',
  LIBRARY: 'Library',
  GROUPS: 'Groups',
  PROFILE: 'Profile',
  
  // Stack Routes
  RESOURCE_DETAIL: 'ResourceDetail',
  RESOURCE_UPLOAD: 'ResourceUpload',
  PERSONAL_FOLDER: 'PersonalFolder',
  GROUP_DETAIL: 'GroupDetail',
  CREATE_GROUP: 'CreateGroup',
  SETTINGS: 'Settings',
  EDIT_PROFILE: 'EditProfile',
  NOTIFICATIONS: 'Notifications',
  SEARCH: 'Search',
  CHAT: 'Chat',
  SCHEDULE: 'Schedule',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// File Size Limits (in bytes)
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
};

// Gamification Points
export const POINTS = {
  DAILY_LOGIN: 1,
  UPLOAD_RESOURCE: 10,
  DOWNLOAD_RESOURCE: 2,
  COMMENT: 3,
  RATE: 2,
  SHARE_RESOURCE: 5,
  REPORT_CONTENT: 10,
  VERIFY_EMAIL: 15,
};
