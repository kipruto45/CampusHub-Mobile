import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { getAuthToken } from './api';

const LOCAL_DOWNLOADS_KEY = 'campushub_local_downloads_v1';
const DOWNLOADS_DIR = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}campushub-downloads/`
  : null;

const MIME_TYPE_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  zip: 'application/zip',
};

type StoredDownloadMap = Record<string, LocalDownloadRecord>;

export interface LocalDownloadRecord {
  key: string;
  remoteUrl: string;
  localUri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  savedToDeviceAt?: string;
  lastOpenedAt?: string;
}

export interface EnsureLocalDownloadParams {
  key: string;
  remoteUrl: string;
  fileName?: string;
  title?: string;
  fileType?: string;
  mimeType?: string;
  headers?: Record<string, string>;
}

export interface SaveCopyResult {
  status: 'saved' | 'already_saved' | 'shared' | 'browser' | 'cancelled';
  uri?: string;
}

const sanitizeSegment = (value: string): string =>
  String(value || '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sanitizeKey = (value: string): string =>
  String(value || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();

const getExtensionFromName = (value?: string): string => {
  const trimmed = String(value || '').trim();
  const match = trimmed.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
};

const getExtensionFromFileType = (value?: string): string => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('/')) {
    return Object.entries(MIME_TYPE_MAP).find(([, mime]) => mime === normalized)?.[0] || '';
  }
  return normalized.replace(/^\./, '');
};

const getMimeType = (params: {
  mimeType?: string;
  fileType?: string;
  fileName?: string;
}): string => {
  const explicitMimeType = String(params.mimeType || '').trim().toLowerCase();
  if (explicitMimeType) {
    return explicitMimeType;
  }

  const extension =
    getExtensionFromName(params.fileName) || getExtensionFromFileType(params.fileType);
  return MIME_TYPE_MAP[extension] || 'application/octet-stream';
};

const ensureFileName = (params: {
  title?: string;
  fileName?: string;
  fileType?: string;
  mimeType?: string;
}): string => {
  const explicitName = sanitizeSegment(String(params.fileName || ''));
  if (explicitName) {
    return explicitName;
  }

  const baseName = sanitizeSegment(String(params.title || 'download')) || 'download';
  const extension =
    getExtensionFromName(params.fileName) ||
    getExtensionFromFileType(params.fileType) ||
    Object.entries(MIME_TYPE_MAP).find(([, mime]) => mime === params.mimeType)?.[0] ||
    '';

  if (!extension) {
    return baseName;
  }

  return baseName.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
    ? baseName
    : `${baseName}.${extension}`;
};

class LocalDownloadsService {
  private async loadRecords(): Promise<StoredDownloadMap> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_DOWNLOADS_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as StoredDownloadMap;
    } catch {
      return {};
    }
  }

  private async saveRecords(records: StoredDownloadMap): Promise<void> {
    await AsyncStorage.setItem(LOCAL_DOWNLOADS_KEY, JSON.stringify(records));
  }

  private async ensureDownloadsDirectory(): Promise<void> {
    if (!DOWNLOADS_DIR) {
      throw new Error('Local download storage is not available on this device.');
    }

    const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
    }
  }

  async getRecord(key: string): Promise<LocalDownloadRecord | null> {
    const records = await this.loadRecords();
    const record = records[key];

    if (!record) {
      return null;
    }

    if (Platform.OS !== 'web' && record.localUri.startsWith('file://')) {
      const info = await FileSystem.getInfoAsync(record.localUri);
      if (!info.exists) {
        delete records[key];
        await this.saveRecords(records);
        return null;
      }
    }

    return record;
  }

  // Get all local downloads
  async getAllRecords(): Promise<LocalDownloadRecord[]> {
    const records = await this.loadRecords();
    const validRecords: LocalDownloadRecord[] = [];
    
    for (const [key, record] of Object.entries(records)) {
      // Verify file still exists
      if (Platform.OS !== 'web' && record.localUri.startsWith('file://')) {
        const info = await FileSystem.getInfoAsync(record.localUri);
        if (!info.exists) {
          delete records[key];
          continue;
        }
      }
      validRecords.push(record);
    }
    
    // Save cleaned records
    if (Object.keys(records).length !== validRecords.length) {
      await this.saveRecords(records);
    }
    
    return validRecords;
  }

  async ensureLocalFile(params: EnsureLocalDownloadParams): Promise<LocalDownloadRecord> {
    const existing = await this.getRecord(params.key);
    if (existing) {
      return existing;
    }

    const fileName = ensureFileName(params);
    const mimeType = getMimeType(params);
    const timestamp = new Date().toISOString();

    if (Platform.OS === 'web' || !DOWNLOADS_DIR) {
      const webRecord: LocalDownloadRecord = {
        key: params.key,
        remoteUrl: params.remoteUrl,
        localUri: params.remoteUrl,
        fileName,
        mimeType,
        fileSize: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const records = await this.loadRecords();
      records[params.key] = webRecord;
      await this.saveRecords(records);
      return webRecord;
    }

    await this.ensureDownloadsDirectory();

    const safeKey = sanitizeKey(params.key) || 'download';
    const destinationUri = `${DOWNLOADS_DIR}${safeKey}-${fileName}`;
    const existingDestination = await FileSystem.getInfoAsync(destinationUri);
    if (existingDestination.exists) {
      await FileSystem.deleteAsync(destinationUri, { idempotent: true });
    }

    const headers = { ...(params.headers || {}) };
    if (!headers.Authorization && params.remoteUrl.includes('/api/storage/private/')) {
      const token = getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const result = await FileSystem.downloadAsync(params.remoteUrl, destinationUri, {
      headers,
    });
    const info = await FileSystem.getInfoAsync(result.uri);

    const record: LocalDownloadRecord = {
      key: params.key,
      remoteUrl: params.remoteUrl,
      localUri: result.uri,
      fileName,
      mimeType,
      fileSize: info.exists ? Number(info.size || 0) : 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastOpenedAt: null as any,
    };

    const records = await this.loadRecords();
    records[params.key] = record;
    await this.saveRecords(records);
    return record;
  }

  async openLocalFile(key: string): Promise<void> {
    const record = await this.getRecord(key);
    if (!record) {
      throw new Error('Downloaded file not found.');
    }
    await this.markOpened(key).catch(() => null);

    if (Platform.OS === 'web') {
      await Linking.openURL(record.remoteUrl);
      return;
    }

    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(record.localUri);
        const canOpenContentUri = await Linking.canOpenURL(contentUri).catch(() => false);
        if (canOpenContentUri) {
          await Linking.openURL(contentUri);
          return;
        }
      } else {
        const canOpenLocalUri = await Linking.canOpenURL(record.localUri).catch(() => false);
        if (canOpenLocalUri) {
          await Linking.openURL(record.localUri);
          return;
        }
      }
    } catch (error) {
      // Fall through to alternate open methods below.
    }

    const shareAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (shareAvailable) {
      await Sharing.shareAsync(record.localUri, {
        mimeType: record.mimeType,
        dialogTitle: 'Open file',
        UTI: record.mimeType,
      });
      return;
    }

    throw new Error('No application is available to open this file.');
  }

  async markOpened(key: string) {
    const records = await this.loadRecords();
    if (records[key]) {
      records[key] = { ...records[key], lastOpenedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await this.saveRecords(records);
    }
  }

  async saveCopyToDevice(key: string): Promise<SaveCopyResult> {
    const record = await this.getRecord(key);
    if (!record) {
      throw new Error('Downloaded file not found.');
    }

    if (record.savedToDeviceAt) {
      return { status: 'already_saved', uri: record.localUri };
    }

    if (Platform.OS === 'web') {
      await Linking.openURL(record.remoteUrl);
      return { status: 'browser', uri: record.remoteUrl };
    }

    if (Platform.OS === 'android') {
      const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);

      if (!permissions.granted || !permissions.directoryUri) {
        return { status: 'cancelled' };
      }

      const content = await FileSystem.readAsStringAsync(record.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const uniqueFileName = `${Date.now()}-${record.fileName}`;
      const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        uniqueFileName,
        record.mimeType
      );

      await FileSystem.StorageAccessFramework.writeAsStringAsync(targetUri, content, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const records = await this.loadRecords();
      records[key] = {
        ...record,
        savedToDeviceAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await this.saveRecords(records);
      return { status: 'saved', uri: targetUri };
    }

    const shareAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (!shareAvailable) {
      throw new Error('Saving to device is not supported on this platform.');
    }

    await Sharing.shareAsync(record.localUri, {
      mimeType: record.mimeType,
      dialogTitle: 'Save a copy',
      UTI: record.mimeType,
    });
    return { status: 'shared', uri: record.localUri };
  }

  // Remove all locally cached downloads and metadata
  async clearAll(): Promise<{ deleted: number; bytes: number }> {
    const records = await this.loadRecords();
    let deleted = 0;
    let bytes = 0;

    // Delete files on device
    if (Platform.OS !== 'web' && DOWNLOADS_DIR) {
      await this.ensureDownloadsDirectory();
      const info = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR).catch(() => []);
      for (const file of info) {
        const path = `${DOWNLOADS_DIR}${file}`;
        const stat = await FileSystem.getInfoAsync(path).catch(() => null);
        if (stat?.exists) {
          bytes += Number(stat.size || 0);
          await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => null);
          deleted += 1;
        }
      }
    }

    // Clear metadata
    await this.saveRecords({});
    return { deleted, bytes };
  }
}

export const localDownloadsService = new LocalDownloadsService();
