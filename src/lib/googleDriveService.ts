/**
 * Google Drive OAuth 2.0 and Media Storage Service Layer for Just1Play
 * 
 * Specifically designed for Content Creators, Photographers, and Videographers to:
 * 1. Authorize their personal Google Drive account via Google OAuth 2.0 (Firebase Auth GoogleAuthProvider & GIS)
 * 2. Ingest tournament albums, high-definition action shots, and video reels directly from Drive
 * 3. Upload and organize media in custom Drive folder hierarchies (e.g. Just1Play / Tournaments)
 * 4. Resolve high-performance CDN preview URLs and direct uncompressed master download links
 * 5. Monitor Google Drive storage quota and manage asset permissions
 */

import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth as driveAuth } from './firebase';

// Export unified Firebase Auth instance for Drive
export { driveAuth };

// Google Drive Scopes for Content Creators
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly'
];

// Configure Google Auth Provider with full creator media scopes
export const googleDriveProvider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach(scope => {
  googleDriveProvider.addScope(scope);
});
googleDriveProvider.setCustomParameters({
  prompt: 'select_account'
});

// In-Memory Token State (Security: Never store raw OAuth tokens in localStorage)
let isDriveSigningIn = false;
let cachedDriveAccessToken: string | null = null;
let tokenExpiryTimestamp: number = 0;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  iconLink?: string;
  imageMediaMetadata?: {
    width?: number;
    height?: number;
    rotation?: number;
    time?: string;
  };
  videoMediaMetadata?: {
    width?: number;
    height?: number;
    durationMillis?: string;
  };
}

export interface DriveFolderItem {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface DriveStorageQuota {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInTrash: number;
  percentUsed: number;
  userDisplayName?: string;
  userEmail?: string;
  userPhotoLink?: string;
}

export interface DriveFolderScanResult {
  folderName: string;
  folderId: string;
  files: DriveFileItem[];
  totalImages: number;
  totalVideos: number;
  totalSizeFormatted: string;
}

export interface DriveAuthResult {
  user: User;
  accessToken: string;
}

/**
 * Initialize Drive Auth State Listener.
 * Executes on app load to restore in-memory session if already authenticated.
 */
export const initDriveAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(driveAuth, async (user: User | null) => {
    if (user) {
      if (cachedDriveAccessToken) {
        if (onSuccess) onSuccess(user, cachedDriveAccessToken);
      } else if (!isDriveSigningIn) {
        if (onFailure) onFailure();
      }
    } else {
      cachedDriveAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

/**
 * Triggers the Google OAuth 2.0 popup authorization flow for Content Creators.
 * Requests read/write access to Google Drive files for tournament media ingestion and storage.
 */
export const signInWithGoogleDrive = async (): Promise<DriveAuthResult | null> => {
  try {
    isDriveSigningIn = true;
    const result = await signInWithPopup(driveAuth, googleDriveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token from Google.');
    }

    cachedDriveAccessToken = credential.accessToken;
    // Default Google token TTL is 3600 seconds (1 hour); set buffer of 2 minutes
    tokenExpiryTimestamp = Date.now() + (3600 - 120) * 1000;

    return { 
      user: result.user, 
      accessToken: cachedDriveAccessToken 
    };
  } catch (error: any) {
    console.error('[Google Drive Service] OAuth Sign-in error:', error);
    throw error;
  } finally {
    isDriveSigningIn = false;
  }
};

/**
 * Returns the active in-memory Google Drive Access Token if valid.
 */
export const getDriveAccessToken = (): string | null => {
  if (cachedDriveAccessToken && tokenExpiryTimestamp && Date.now() > tokenExpiryTimestamp) {
    console.warn('[Google Drive Service] Cached token expired.');
    return null;
  }
  return cachedDriveAccessToken;
};

/**
 * Sets or updates the in-memory access token (e.g. when received from an external OAuth credential).
 */
export const setDriveAccessToken = (token: string, expiresInSeconds: number = 3600) => {
  cachedDriveAccessToken = token;
  tokenExpiryTimestamp = Date.now() + (expiresInSeconds - 60) * 1000;
};

/**
 * Disconnects the Google Drive session and purges cached tokens from memory.
 */
export const disconnectGoogleDrive = async () => {
  cachedDriveAccessToken = null;
  tokenExpiryTimestamp = 0;
};

/**
 * Verifies if the active access token is valid and returns user/quota details.
 */
export const checkDrivePermissions = async (token?: string): Promise<DriveStorageQuota> => {
  const activeToken = token || getDriveAccessToken();
  if (!activeToken) {
    throw new Error('No active Google Drive OAuth token found. Please sign in with Google Drive.');
  }

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink),storageQuota(limit,usage,usageInDrive,usageInDriveTrash)',
    {
      headers: {
        Authorization: `Bearer ${activeToken}`
      }
    }
  );

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Failed to verify Google Drive credentials (${response.status})`);
  }

  const data = await response.json();
  const quota = data.storageQuota || {};
  const limit = parseInt(quota.limit || '0', 10);
  const usage = parseInt(quota.usage || '0', 10);
  const usageInDrive = parseInt(quota.usageInDrive || '0', 10);
  const usageInTrash = parseInt(quota.usageInDriveTrash || '0', 10);

  const percentUsed = limit > 0 ? Math.round((usage / limit) * 100) : 0;

  return {
    limit,
    usage,
    usageInDrive,
    usageInTrash,
    percentUsed,
    userDisplayName: data.user?.displayName,
    userEmail: data.user?.emailAddress,
    userPhotoLink: data.user?.photoLink
  };
};

/**
 * Extracts a Google Drive Folder ID from a URL or raw ID string.
 * Supports:
 * - https://drive.google.com/drive/folders/1abcxyz...
 * - https://drive.google.com/drive/u/0/folders/1abcxyz...
 * - https://drive.google.com/open?id=1abcxyz...
 * - Raw folder ID string (alphanumeric, dashes, underscores)
 */
export const extractDriveFolderId = (input: string): string | null => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // If already a raw folder ID (alphanumeric, dashes, underscores, length >= 15)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  // URL matching: /folders/ID
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // Parameter matching: ?id=ID or &id=ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  return null;
};

/**
 * Resolves high-speed CDN preview, thumbnail, and uncompressed download URLs for a Google Drive file.
 * Uses Google's open UserContent CDN (lh3.googleusercontent.com/d/ID) which eliminates 403 Forbidden
 * and CORS issues on third-party live sites.
 */
export const getDriveImageUrls = (fileId: string): {
  thumbnailUrl: string;
  previewUrl: string;
  directDownloadUrl: string;
  viewUrl: string;
} => {
  const cleanId = fileId.replace(/^(gdrive:|drive:)/, '').trim();
  return {
    thumbnailUrl: `https://lh3.googleusercontent.com/d/${cleanId}=w800`,
    previewUrl: `https://lh3.googleusercontent.com/d/${cleanId}=w1600`,
    directDownloadUrl: `https://lh3.googleusercontent.com/d/${cleanId}=s0`,
    viewUrl: `https://drive.google.com/file/d/${cleanId}/view`
  };
};

/**
 * Fetches folders located inside the creator's Google Drive.
 */
export const fetchCreatorDriveFolders = async (
  token?: string,
  parentFolderId?: string
): Promise<DriveFolderItem[]> => {
  const activeToken = token || getDriveAccessToken();
  if (!activeToken) {
    throw new Error('Google Drive authorization required.');
  }

  let query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const fields = 'files(id, name, createdTime, modifiedTime)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=100&orderBy=name`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${activeToken}`
    }
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Failed to fetch Drive folders (${response.status})`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime
  }));
};

export const fetchDriveFolders = fetchCreatorDriveFolders;

/**
 * Fetches files from the user's Google Drive (returns array of DriveFileItem).
 */
export const fetchDriveFiles = async (
  token: string, 
  queryTerm?: string,
  folderId?: string
): Promise<DriveFileItem[]> => {
  try {
    let q = "trashed = false";
    if (folderId) {
      q += ` and '${folderId}' in parents`;
    }
    if (queryTerm) {
      q += ` and name contains '${queryTerm.replace(/'/g, "\\'")}'`;
    }

    const fields = "files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, createdTime, size, iconLink, imageMediaMetadata, videoMediaMetadata)";
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=100&orderBy=createdTime%20desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Drive API error: ${res.status}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Failed to fetch Drive files:', err);
    throw err;
  }
};

/**
 * Scans a specific Google Drive folder for tournament photos and videos.
 * Iterates through pages up to 500 files per scan.
 */
export const fetchDriveFolderImages = async (
  folderId: string, 
  token?: string
): Promise<DriveFolderScanResult> => {
  const activeToken = token || getDriveAccessToken();
  
  // 1. Resolve folder name
  let folderName = 'Tournament Drive Album';
  if (activeToken) {
    try {
      const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData.name) {
          folderName = metaData.name;
        }
      }
    } catch (err) {
      console.warn('[Google Drive Service] Could not fetch folder name:', err);
    }
  }

  // 2. Query all image and video media items in folder
  const queryParts = [
    `'${folderId}' in parents`,
    'trashed = false',
    "(mimeType contains 'image/' or mimeType contains 'video/' or mimeType = 'application/vnd.google-apps.photo')"
  ];

  const q = queryParts.join(' and ');
  const fields = 'nextPageToken, files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, createdTime, size, imageMediaMetadata, videoMediaMetadata)';
  
  let allFiles: DriveFileItem[] = [];
  let pageToken: string | null = null;
  let totalBytes = 0;
  let imagesCount = 0;
  let videosCount = 0;

  do {
    let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=100&orderBy=createdTime desc`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const headers: Record<string, string> = {};
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson?.error?.message || `Google Drive API Error (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    const batchFiles: DriveFileItem[] = data.files || [];
    
    batchFiles.forEach(file => {
      allFiles.push(file);
      if (file.mimeType?.startsWith('image/')) imagesCount++;
      if (file.mimeType?.startsWith('video/')) videosCount++;
      if (file.size) {
        totalBytes += parseInt(file.size.toString(), 10) || 0;
      }
    });

    pageToken = data.nextPageToken || null;
  } while (pageToken && allFiles.length < 500);

  // Format size string
  const totalMB = totalBytes / (1024 * 1024);
  const sizeFormatted = totalMB > 1024 
    ? `${(totalMB / 1024).toFixed(2)} GB` 
    : `${totalMB.toFixed(1)} MB`;

  return {
    folderName,
    folderId,
    files: allFiles,
    totalImages: imagesCount,
    totalVideos: videosCount,
    totalSizeFormatted: sizeFormatted
  };
};

/**
 * Creates a dedicated folder in Google Drive for creator tournament storage.
 */
export const createDriveFolder = async (
  token: string, 
  folderName: string, 
  parentFolderId?: string
): Promise<DriveFileItem> => {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to create Drive media folder.');
  }

  return await response.json();
};

export const createCreatorMediaFolder = createDriveFolder;

/**
 * Uploads a media file directly to the creator's Google Drive storage.
 * Uses multipart upload with metadata injection.
 */
export const uploadFileToDrive = async (
  token: string,
  file: File,
  parentFolderId?: string,
  customDescription?: string
): Promise<DriveFileItem> => {
  const metadata: any = {
    name: file.name,
    mimeType: file.type,
    description: customDescription || 'Uploaded via Just1Play Creator Studio'
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webContentLink,webViewLink,size,createdTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }
  );

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to upload media file to Google Drive.');
  }

  return await response.json();
};

export const uploadCreatorMediaToDrive = uploadFileToDrive;

/**
 * Makes a Google Drive file publicly viewable so it can stream in the gallery lightbox and locker room.
 */
export const makeDriveFileShareable = async (token: string, fileId: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
    return response.ok;
  } catch (err) {
    console.warn('[Google Drive Service] Permission setting warning:', err);
    return false;
  }
};

/**
 * Deletes a file from Google Drive.
 * NOTE: User confirmation MUST be obtained in UI before calling this method.
 */
export const deleteDriveFile = async (token: string, fileId: string): Promise<boolean> => {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok && response.status !== 204) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to delete file from Google Drive.');
  }

  return true;
};
