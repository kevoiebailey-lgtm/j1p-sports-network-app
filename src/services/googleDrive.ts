/**
 * Google Drive API Service Layer
 * 
 * Provides typed methods to interact with the Google Drive v3 REST API:
 * - Fetches file metadata, parent folder items, and media collections
 * - Obtains direct webContentLink and webViewLink references
 * - Upgrades thumbnailLink from default low-res icons to high-resolution assets using 'sz=w1000'
 */

import { getDriveAccessToken } from '../lib/googleDriveService';

export interface GoogleDriveImageMetadata {
  width?: number;
  height?: number;
  rotation?: number;
  time?: string;
  cameraMake?: string;
  cameraModel?: string;
  exposureTime?: number;
  aperture?: number;
  flashUsed?: boolean;
  focalLength?: number;
  isoSpeed?: number;
}

export interface GoogleDriveVideoMetadata {
  width?: number;
  height?: number;
  durationMillis?: string;
}

export interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  highResThumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  imageMediaMetadata?: GoogleDriveImageMetadata;
  videoMediaMetadata?: GoogleDriveVideoMetadata;
  parents?: string[];
  description?: string;
  properties?: Record<string, string>;
}

export interface FetchDriveFilesOptions {
  token?: string;
  folderId?: string;
  queryTerm?: string;
  mimeTypes?: string[];
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  includeTrashed?: boolean;
  customThumbnailSize?: string;
}

export interface DriveFileListResponse {
  files: GoogleDriveFileMetadata[];
  nextPageToken?: string;
}

export const DEFAULT_HIGH_RES_THUMBNAIL_SIZE = 'w1000';

const DEFAULT_FILE_FIELDS = [
  'id',
  'name',
  'mimeType',
  'thumbnailLink',
  'webContentLink',
  'webViewLink',
  'iconLink',
  'size',
  'createdTime',
  'modifiedTime',
  'imageMediaMetadata',
  'videoMediaMetadata',
  'parents',
  'description'
].join(', ');

/**
 * Transforms a standard Google Drive thumbnailLink (which defaults to low-resolution icon ~220px)
 * or a raw file ID into a crisp, high-resolution thumbnail using 'sz=w1000'.
 * 
 * @param thumbnailLinkOrFileId - The original thumbnailLink returned by Drive API or raw file ID
 * @param size - The resolution parameter, defaults to 'w1000' (or 's1000', 'w1600', etc.)
 * @returns High-resolution thumbnail URL
 */
export function getHighResThumbnailUrl(
  thumbnailLinkOrFileId?: string | null, 
  size: string = DEFAULT_HIGH_RES_THUMBNAIL_SIZE
): string {
  if (!thumbnailLinkOrFileId || typeof thumbnailLinkOrFileId !== 'string') {
    return '';
  }

  const trimmed = thumbnailLinkOrFileId.trim();
  if (!trimmed) return '';

  // If already a full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      // 1. Google Drive thumbnail endpoint (drive.google.com/thumbnail?id=...&sz=...)
      if (trimmed.includes('drive.google.com/thumbnail')) {
        const url = new URL(trimmed);
        url.searchParams.set('sz', size);
        return url.toString();
      }

      // 2. Google UserContent thumbnail with sizing suffix (e.g., =s220, =s220-c, =w500)
      if (/=[sw]\d+(?:-c)?$/i.test(trimmed)) {
        return trimmed.replace(/=[sw]\d+(?:-c)?$/i, `=${size}`);
      }

      // 3. UserContent URL without sizing suffix (lh3.googleusercontent.com/d/...)
      if (trimmed.includes('googleusercontent.com/d/')) {
        return `${trimmed}=${size}`;
      }

      // 4. Fallback: append sz param if query params exist or suffix
      if (trimmed.includes('?')) {
        const url = new URL(trimmed);
        url.searchParams.set('sz', size);
        return url.toString();
      }

      return `${trimmed}=${size}`;
    } catch {
      // If URL parsing fails, perform regex replacement or append
      if (/=[sw]\d+(?:-c)?$/i.test(trimmed)) {
        return trimmed.replace(/=[sw]\d+(?:-c)?$/i, `=${size}`);
      }
      return `${trimmed}=${size}`;
    }
  }

  // If a raw Google Drive File ID is provided
  const cleanId = trimmed.replace(/^(gdrive:|drive:)/, '').trim();
  return `https://drive.google.com/thumbnail?id=${cleanId}&sz=${size}`;
}

/**
 * Normalizes raw Google Drive API file objects, augmenting them with highResThumbnailLink.
 */
export function normalizeDriveFileMetadata(
  rawFile: any, 
  customSize: string = DEFAULT_HIGH_RES_THUMBNAIL_SIZE
): GoogleDriveFileMetadata {
  const thumbnailLink = rawFile.thumbnailLink || undefined;
  const highResThumbnailLink = thumbnailLink 
    ? getHighResThumbnailUrl(thumbnailLink, customSize)
    : (rawFile.id ? getHighResThumbnailUrl(rawFile.id, customSize) : undefined);

  return {
    id: rawFile.id,
    name: rawFile.name || 'Untitled Media',
    mimeType: rawFile.mimeType || 'application/octet-stream',
    thumbnailLink,
    highResThumbnailLink,
    webContentLink: rawFile.webContentLink || undefined,
    webViewLink: rawFile.webViewLink || (rawFile.id ? `https://drive.google.com/file/d/${rawFile.id}/view` : undefined),
    iconLink: rawFile.iconLink || undefined,
    size: rawFile.size?.toString(),
    createdTime: rawFile.createdTime,
    modifiedTime: rawFile.modifiedTime,
    imageMediaMetadata: rawFile.imageMediaMetadata,
    videoMediaMetadata: rawFile.videoMediaMetadata,
    parents: rawFile.parents,
    description: rawFile.description,
    properties: rawFile.properties
  };
}

/**
 * Fetches metadata for a single Google Drive file, including webContentLink,
 * webViewLink, and high-resolution thumbnailLink (sz=w1000).
 * 
 * @param fileId - The Google Drive file ID
 * @param token - Optional OAuth access token (defaults to current active session)
 * @param customSize - Optional resolution modifier (defaults to 'w1000')
 */
export async function fetchFileMetadata(
  fileId: string,
  token?: string,
  customSize: string = DEFAULT_HIGH_RES_THUMBNAIL_SIZE
): Promise<GoogleDriveFileMetadata> {
  const activeToken = token || getDriveAccessToken();
  if (!activeToken) {
    throw new Error('Google Drive access token required to fetch file metadata.');
  }

  const cleanId = fileId.replace(/^(gdrive:|drive:)/, '').trim();
  const url = `https://www.googleapis.com/drive/v3/files/${cleanId}?fields=${encodeURIComponent(DEFAULT_FILE_FIELDS)}&supportsAllDrives=true`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${activeToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to fetch Drive file metadata (${response.status}): ${response.statusText}`
    );
  }

  const data = await response.json();
  return normalizeDriveFileMetadata(data, customSize);
}

/**
 * Fetches a list of files from Google Drive matching specified filters,
 * ensuring all items include webContentLink, webViewLink, and highResThumbnailLink (sz=w1000).
 */
export async function fetchDriveFiles(
  options: FetchDriveFilesOptions = {}
): Promise<DriveFileListResponse> {
  const activeToken = options.token || getDriveAccessToken();
  if (!activeToken) {
    throw new Error('Google Drive access token required to list files.');
  }

  const queryConditions: string[] = [];

  if (!options.includeTrashed) {
    queryConditions.push('trashed = false');
  }

  if (options.folderId) {
    queryConditions.push(`'${options.folderId}' in parents`);
  }

  if (options.queryTerm) {
    const sanitizedTerm = options.queryTerm.replace(/'/g, "\\'");
    queryConditions.push(`name contains '${sanitizedTerm}'`);
  }

  if (options.mimeTypes && options.mimeTypes.length > 0) {
    const mimeClauses = options.mimeTypes.map(mime => `mimeType = '${mime}'`).join(' or ');
    queryConditions.push(`(${mimeClauses})`);
  }

  const queryString = queryConditions.join(' and ');
  const pageSize = options.pageSize || 100;
  const orderBy = options.orderBy || 'createdTime desc';
  const fields = `nextPageToken, files(${DEFAULT_FILE_FIELDS})`;

  let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryString)}&fields=${encodeURIComponent(fields)}&pageSize=${pageSize}&orderBy=${encodeURIComponent(orderBy)}&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  if (options.pageToken) {
    url += `&pageToken=${encodeURIComponent(options.pageToken)}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${activeToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to query Google Drive files (${response.status}): ${response.statusText}`
    );
  }

  const data = await response.json();
  const rawFiles = data.files || [];
  const normalizedFiles = rawFiles.map((file: any) => 
    normalizeDriveFileMetadata(file, options.customThumbnailSize || DEFAULT_HIGH_RES_THUMBNAIL_SIZE)
  );

  return {
    files: normalizedFiles,
    nextPageToken: data.nextPageToken || undefined
  };
}

/**
 * Fetches all high-resolution images and videos inside a specified Google Drive folder.
 */
export async function fetchFolderMediaFiles(
  folderId: string,
  token?: string,
  customSize: string = DEFAULT_HIGH_RES_THUMBNAIL_SIZE
): Promise<GoogleDriveFileMetadata[]> {
  const activeToken = token || getDriveAccessToken();
  if (!activeToken) {
    throw new Error('Google Drive access token required to fetch folder media.');
  }

  const query = `'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/' or mimeType = 'application/vnd.google-apps.photo')`;
  const fields = `nextPageToken, files(${DEFAULT_FILE_FIELDS})`;

  let allFiles: GoogleDriveFileMetadata[] = [];
  let pageToken: string | undefined = undefined;

  do {
    let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=100&orderBy=createdTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.error?.message || `Failed to fetch folder media files (${response.status})`
      );
    }

    const data = await response.json();
    const batchFiles = (data.files || []).map((file: any) =>
      normalizeDriveFileMetadata(file, customSize)
    );

    allFiles.push(...batchFiles);
    pageToken = data.nextPageToken;
  } while (pageToken && allFiles.length < 500);

  return allFiles;
}

/**
 * Helper to resolve the best direct download or view URL for a file.
 */
export function getDriveFileDownloadUrl(file: GoogleDriveFileMetadata): string {
  if (file.webContentLink) {
    return file.webContentLink;
  }
  if (file.id) {
    return `https://drive.google.com/uc?export=download&id=${file.id}`;
  }
  return '';
}

export default {
  fetchFileMetadata,
  fetchDriveFiles,
  fetchFolderMediaFiles,
  getHighResThumbnailUrl,
  normalizeDriveFileMetadata,
  getDriveFileDownloadUrl,
  DEFAULT_HIGH_RES_THUMBNAIL_SIZE
};
