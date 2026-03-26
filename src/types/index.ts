// User Types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  registration_number?: string;
  avatar?: string;
  bio?: string;
  role: 'student' | 'moderator' | 'admin';
  faculty?: number;
  department?: number;
  year_of_study?: number;
  is_verified: boolean;
  date_joined: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginResponse {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: User;
  };
}

export interface RegisterResponse {
  success: boolean;
  data: {
    user_id: number;
    email: string;
    message: string;
    requires_email_verification: boolean;
  };
}

// Resource Types
export interface Resource {
  id: number;
  uuid: string;
  slug: string;
  title: string;
  description: string;
  resource_type: ResourceType;
  status: ResourceStatus;
  visibility: ResourceVisibility;
  course?: Course;
  unit?: Unit;
  faculty?: Faculty;
  department?: Department;
  files: ResourceFile[];
  tags: string[];
  view_count: number;
  download_count: number;
  share_count: number;
  bookmark_count: number;
  average_rating: number;
  rating_count: number;
  is_bookmarked: boolean;
  is_favorited: boolean;
  is_downloaded: boolean;
  owner: User;
  uploaded_by: User;
  created_at: string;
  updated_at: string;
  approved_at?: string;
}

export type ResourceType = 
  | 'notes' 
  | 'slides' 
  | 'past_paper' 
  | 'book' 
  | 'assignment' 
  | 'tutorial' 
  | 'other';

export type ResourceStatus = 'pending' | 'approved' | 'rejected';

export type ResourceVisibility = 'public' | 'private' | 'unlisted';

export interface ResourceFile {
  id: number;
  file: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

export interface ResourceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Resource[];
}

// Faculty & Department Types
export interface Faculty {
  id: number;
  name: string;
  code: string;
  description?: string;
  icon?: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  faculty: number;
}

export interface Course {
  id: number;
  name: string;
  code: string;
  department: number;
  year: number;
  semester: number;
}

export interface Unit {
  id: number;
  name: string;
  code: string;
  course: number;
  semester: number;
}

// Personal Library Types
export interface PersonalFolder {
  id: number;
  name: string;
  color: string;
  parent?: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalResource {
  id: number;
  uuid: string;
  name: string;
  file: string;
  file_size: number;
  file_type: string;
  folder?: PersonalFolder;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
}

export interface StorageUsage {
  used: number;
  total: number;
  percentage: number;
}

// Study Group Types
export interface StudyGroup {
  id: number;
  name: string;
  description: string;
  icon?: string;
  privacy: 'public' | 'private';
  allow_member_invites: boolean;
  is_member: boolean;
  is_admin: boolean;
  member_count: number;
  resource_count: number;
  created_by: User;
  created_at: string;
}

export interface StudyGroupMember {
  id: number;
  user: User;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface StudyGroupPost {
  id: number;
  group: StudyGroup;
  content: string;
  resource?: Resource;
  posted_by: User;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

export interface StudyGroupPostComment {
  id: number;
  post: StudyGroupPost;
  content: string;
  parent?: number;
  commented_by: User;
  created_at: string;
  updated_at: string;
}

// Bookmark & Favorite Types
export interface Bookmark {
  id: number;
  resource: Resource;
  created_at: string;
}

export interface Favorite {
  id: number;
  resource: Resource;
  created_at: string;
}

// Comment & Rating Types
export interface Comment {
  id: number;
  resource: number;
  content: string;
  parent?: number;
  commented_by: User;
  created_at: string;
  updated_at: string;
  replies_count: number;
}

export interface Rating {
  id: number;
  resource: number;
  value: number;
  user: User;
  created_at: string;
}

// Notification Types
export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  actor?: User;
  resource?: Resource;
  created_at: string;
}

// Announcement Types
export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  is_pinned: boolean;
  created_by: User;
  created_at: string;
  expires_at?: string;
}

// Analytics Types
export interface DashboardStats {
  total_resources: number;
  total_users: number;
  total_downloads: number;
  total_uploads: number;
  pending_resources: number;
  rejected_resources: number;
  storage_used: number;
}

export interface TrendingResource {
  resource: Resource;
  trend_score: number;
}

// Search Types
export interface SearchResult {
  resources: Resource[];
  courses: Course[];
  units: Unit[];
  users: User[];
}

export interface SearchSuggestion {
  text: string;
  type: 'resource' | 'course' | 'unit' | 'user';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Error Types
export interface ApiError {
  success: boolean;
  error: string;
  details?: Record<string, string[]>;
}
