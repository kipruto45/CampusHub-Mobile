import { resourcesAPI } from './api';

export type ShareMethod =
  | 'copy_link'
  | 'native_share'
  | 'whatsapp'
  | 'telegram'
  | 'email'
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
};

