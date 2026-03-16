import { resourcesAPI } from './api';

export type ShareMethod =
  | 'copy_link'
  | 'native_share'
  | 'whatsapp'
  | 'telegram'
  | 'email'
  | 'send_to_student'
  | 'share_to_group'
  | 'other';

export interface ResourceSharePayload {
  resource_id: string;
  title: string;
  slug: string;
  share_url: string;
  deep_link_url?: string;
  share_message: string;
  metadata_summary?: string;
  can_share: boolean;
  reason?: string;
}

export interface ResourceShareRecordResult {
  success: boolean;
  message: string;
  share_count: number;
}

export interface ShareToStudentResult {
  success: boolean;
  message: string;
  resource_id: string;
  shared_with: string[];
}

export interface ShareToGroupResult {
  success: boolean;
  message: string;
  resource_id: string;
  shared_with: string[];
}

export interface StudentSearchResult {
  id: number;
  username: string;
  full_name: string;
  email: string;
  avatar?: string;
}

export interface StudyGroupInfo {
  id: number;
  name: string;
  member_count: number;
  course_name?: string;
}

const unwrap = <T>(response: any): T => {
  if (response?.data?.data) {
    return response.data.data as T;
  }
  if (response?.data) {
    return response.data as T;
  }
  return response as T;
};

export const resourcesService = {
  async getResourceShareLink(resourceId: string): Promise<ResourceSharePayload> {
    const response = await resourcesAPI.getShareLink(resourceId);
    return unwrap<ResourceSharePayload>(response);
  },

  async recordResourceShare(
    resourceId: string,
    method: ShareMethod = 'other'
  ): Promise<ResourceShareRecordResult> {
    const response = await resourcesAPI.recordShare(resourceId, method);
    return unwrap<ResourceShareRecordResult>(response);
  },

  async shareToStudent(
    resourceId: string,
    studentId: number,
    message?: string
  ): Promise<ShareToStudentResult> {
    const response = await resourcesAPI.shareToStudent(resourceId, studentId, message);
    return unwrap<ShareToStudentResult>(response);
  },

  async shareToGroup(
    resourceId: string,
    groupId: number,
    message?: string
  ): Promise<ShareToGroupResult> {
    const response = await resourcesAPI.shareToGroup(resourceId, groupId, message);
    return unwrap<ShareToGroupResult>(response);
  },

  async searchStudents(query: string): Promise<StudentSearchResult[]> {
    const response = await resourcesAPI.searchStudents(query);
    return unwrap<StudentSearchResult[]>(response);
  },

  async getUserStudyGroups(): Promise<StudyGroupInfo[]> {
    const response = await resourcesAPI.getUserStudyGroups();
    return unwrap<StudyGroupInfo[]>(response);
  },
};

