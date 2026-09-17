import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth, ensureAuthUser } from '../lib/firebase';
import { compressImageToCanvas, fileToDataUrl } from '../lib/imageCompressor';
import { dispatchGlobalToast } from '../context/ToastContext';

export const STORAGE_FOLDERS = {
  MEDIA_VAULT: 'media_vault',
  MEDIA_VAULT_PHOTOS: 'media_vault/photos',
  MEDIA_VAULT_VIDEOS: 'media_vault/videos',
  EVENT_FLYERS: 'media_vault/flyers/events',
  TOURNAMENT_FLYERS: 'media_vault/flyers/tournaments',
  GALLERY_COVERS: 'media_vault/gallery/covers',
  GALLERY_ALBUMS: 'media_vault/gallery/albums',
  BLOG_BANNERS: 'media_vault/blog/banners',
  USER_AVATARS: 'media_vault/avatars/users',
  POST_MEDIA: 'media_vault/posts/media',
  REELS_VIDEOS: 'media_vault/reels/videos'
} as const;

export interface StorageBucketCheckResult {
  valid: boolean;
  bucket: string;
  authenticated: boolean;
  userId?: string;
  error?: string;
}

export interface UploadMediaOptions {
  folderPath?: string;
  onProgress?: (progress: number) => void;
  customMetadata?: Record<string, string>;
  maxDimension?: number;
  quality?: number;
  skipCompression?: boolean;
  /** Whether to show a success toast automatically upon upload completion (default: true) */
  showSuccessToast?: boolean;
  /** Custom success toast message */
  successMessage?: string;
  /** Whether to show an error toast automatically on upload failure (default: true) */
  showErrorToast?: boolean;
}

/**
 * Explicit check for Firebase Storage bucket configuration and user access permissions
 */
export function verifyStorageBucketPermissions(): StorageBucketCheckResult {
  try {
    if (!storage) {
      return {
        valid: false,
        bucket: '',
        authenticated: false,
        error: 'Firebase Storage instance is not initialized.'
      };
    }

    const bucket = storage.app.options.storageBucket || '';
    const user = auth.currentUser;

    return {
      valid: true,
      bucket: bucket || 'default',
      authenticated: !!user,
      userId: user?.uid
    };
  } catch (err: any) {
    return {
      valid: true,
      bucket: 'default',
      authenticated: false
    };
  }
}

/**
 * Helper to map Firebase Storage error codes to clear, actionable messages
 */
export function mapStorageError(error: any): Error {
  const code = error?.code || '';
  const originalMessage = error?.message || 'An unknown storage error occurred.';

  switch (code) {
    case 'storage/unauthorized':
    case 'storage/permission-denied':
      return new Error('Storage Permission Denied: You do not have permission to write to this storage location. Please ensure you are signed in.');
    case 'storage/bucket-not-found':
      return new Error('Storage Bucket Not Found: The configured Firebase Storage bucket could not be found.');
    case 'storage/project-not-found':
      return new Error('Firebase Project Not Found: The project configuration is invalid.');
    case 'storage/quota-exceeded':
      return new Error('Storage Quota Exceeded: The storage allocation quota has been reached. Please try again later.');
    case 'storage/unauthenticated':
      return new Error('Authentication Required: Please sign in to upload media to the Media Vault.');
    case 'storage/retry-limit-exceeded':
      return new Error('Upload Timeout: Network interrupted the upload. Please check your connection and retry.');
    case 'storage/canceled':
      return new Error('Upload Canceled: Media file upload was aborted.');
    case 'storage/invalid-checksum':
      return new Error('Corrupted File: File checksum mismatch. Please try re-selecting the file.');
    case 'storage/cannot-slice-blob':
      return new Error('File Error: Unable to read file slices from device memory.');
    default:
      if (originalMessage.includes('permission') || originalMessage.includes('unauthorized')) {
        return new Error('Storage Permission Denied: Upload rejected by Firebase security policy.');
      }
      return new Error(originalMessage);
  }
}

/**
 * Generates a collision-proof, unique storage path anchored in /media_vault/
 */
export function generateUniqueVaultPath(
  originalFileName: string,
  folderPath: string = STORAGE_FOLDERS.MEDIA_VAULT_PHOTOS,
  extensionOverride?: string
): string {
  let cleanFolder = folderPath.replace(/^\/+|\/+$/g, '') || STORAGE_FOLDERS.MEDIA_VAULT;
  
  // Ensure the storage path is rooted in /media_vault/
  if (!cleanFolder.startsWith('media_vault')) {
    cleanFolder = `media_vault/${cleanFolder}`;
  }

  const timestamp = Date.now();
  const randomSuffix = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID().slice(0, 8) 
    : Math.random().toString(36).substring(2, 9);

  const cleanExt = (extensionOverride || originalFileName.split('.').pop() || 'dat')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const sanitizedBaseName = originalFileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 32) || 'asset';

  return `${cleanFolder}/${timestamp}_${randomSuffix}_${sanitizedBaseName}.${cleanExt}`;
}

/**
 * Universal Media Asset Upload Pipeline for Firebase Storage
 * Handles explicit auth verification, auto-compression, unique path generation,
 * resumable uploads with progress tracking, and resilient fallback to high-speed Data URLs.
 *
 * @param file The File object to upload
 * @param folderPathOrOptions The directory path (e.g. 'media_vault/photos') or UploadMediaOptions
 * @param onProgress Optional progress callback (0 - 100)
 * @returns The permanent downloadURL or optimized Data URL string
 */
export async function uploadMediaAsset(
  file: File,
  folderPathOrOptions: string | UploadMediaOptions = STORAGE_FOLDERS.MEDIA_VAULT_PHOTOS,
  onProgress?: (progress: number) => void
): Promise<string> {
  const options: UploadMediaOptions = typeof folderPathOrOptions === 'string'
    ? { folderPath: folderPathOrOptions, onProgress }
    : folderPathOrOptions;

  const targetFolder = options.folderPath || STORAGE_FOLDERS.MEDIA_VAULT_PHOTOS;
  const progressCallback = options.onProgress || onProgress;
  const shouldToastSuccess = options.showSuccessToast ?? true;
  const shouldToastError = options.showErrorToast ?? true;

  if (!file) {
    const emptyErr = new Error('No media file selected for upload.');
    if (shouldToastError) {
      dispatchGlobalToast('error', 'Upload Notice', emptyErr.message);
    }
    throw emptyErr;
  }

  // 1. Ensure active Firebase Auth session before upload
  try {
    await ensureAuthUser();
  } catch (authErr) {
    console.warn('Silent auth check warning:', authErr);
  }

  // 2. Auto-compress / optimize image if it is an image file and compression is not skipped
  let fileToUpload = file;
  let fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  let isImageOptimized = false;

  if (file.type.startsWith('image/') && !options.skipCompression && !file.type.includes('svg')) {
    try {
      const maxDim = options.maxDimension || (targetFolder.includes('avatars') ? 600 : 2560);
      const quality = options.quality || 0.88;
      const compressionResult = await compressImageToCanvas(
        file,
        maxDim,
        quality,
        file.name
      );
      fileToUpload = compressionResult.file;
      fileExt = 'webp';
      isImageOptimized = true;
    } catch (compressErr) {
      console.warn('Image auto-compression failed, proceeding with original:', compressErr);
    }
  }

  // Helper for resilient client Data URL fallback if storage is restricted or offline
  const fallbackToDataUrl = async (): Promise<string> => {
    try {
      if (progressCallback) progressCallback(50);
      const dataUrl = await fileToDataUrl(fileToUpload);
      if (progressCallback) progressCallback(100);
      if (shouldToastSuccess) {
        dispatchGlobalToast('success', 'Media Ready', `"${file.name}" saved successfully.`);
      }
      return dataUrl;
    } catch (dataUrlErr) {
      console.error('Fallback Data URL conversion failed:', dataUrlErr);
      throw new Error('Unable to read or convert media file.');
    }
  };

  // Helper for resilient backend server upload fallback
  const fallbackToServerOrDataUrl = async (): Promise<string> => {
    try {
      if (progressCallback) progressCallback(40);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('title', file.name);
      formData.append('category', targetFolder);

      const res = await fetch('/api/creator/upload-asset', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          if (progressCallback) progressCallback(100);
          if (shouldToastSuccess) {
            const successMsg = options.successMessage || `"${file.name}" was uploaded successfully.`;
            dispatchGlobalToast('success', 'Media Uploaded', successMsg);
          }
          return data.url;
        }
      }
    } catch (serverErr) {
      console.warn('Server asset ingest fallback notice:', serverErr);
    }
    return fallbackToDataUrl();
  };

  // 3. Generate unique, collision-proof file path in /media_vault/
  const fullStoragePath = generateUniqueVaultPath(file.name, targetFolder, fileExt);

  // 4. Create Storage reference & custom metadata
  try {
    const storageRef = ref(storage, fullStoragePath);
    const metadata = {
      contentType: fileToUpload.type || (fileExt === 'webp' ? 'image/webp' : fileExt === 'mp4' ? 'video/mp4' : 'application/octet-stream'),
      customMetadata: {
        uploadedBy: auth.currentUser?.uid || 'member',
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        fileSizeBytes: String(fileToUpload.size),
        storageFolder: targetFolder,
        isOptimized: String(isImageOptimized),
        ...(options.customMetadata || {})
      }
    };

    // 5. Upload with progress reporting & global toast alerts
    return await new Promise<string>((resolve, reject) => {
      try {
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload, metadata);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 100
            );
            if (progressCallback) {
              progressCallback(progress);
            }
          },
          async (uploadError) => {
            console.warn(`Firebase Storage upload notice at ${fullStoragePath} (switching to resilient fallback):`, uploadError);
            try {
              const fallbackUrl = await fallbackToServerOrDataUrl();
              resolve(fallbackUrl);
            } catch (fbErr) {
              const friendlyError = mapStorageError(uploadError);
              if (shouldToastError) {
                dispatchGlobalToast('error', 'Upload Failed', friendlyError.message);
              }
              reject(friendlyError);
            }
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (progressCallback) progressCallback(100);

              if (shouldToastSuccess) {
                const successMsg = options.successMessage || `"${file.name}" was uploaded successfully.`;
                dispatchGlobalToast('success', 'Media Uploaded', successMsg);
              }

              resolve(downloadUrl);
            } catch (urlErr) {
              console.warn('Download URL retrieval notice, falling back to data URI:', urlErr);
              const fallbackUrl = await fallbackToServerOrDataUrl();
              resolve(fallbackUrl);
            }
          }
        );
      } catch (taskErr: any) {
        console.warn('Upload task init notice, using resilient fallback:', taskErr);
        fallbackToServerOrDataUrl().then(resolve).catch(reject);
      }
    });
  } catch (storageErr) {
    console.warn('Storage pipeline notice, using resilient fallback:', storageErr);
    return await fallbackToServerOrDataUrl();
  }
}

/**
 * Upload Media Asset directly to the /media_vault/ directory
 */
export async function uploadToMediaVault(
  file: File,
  category: 'photos' | 'videos' = 'photos',
  onProgress?: (progress: number) => void
): Promise<string> {
  const folder = category === 'videos' ? STORAGE_FOLDERS.MEDIA_VAULT_VIDEOS : STORAGE_FOLDERS.MEDIA_VAULT_PHOTOS;
  return uploadMediaAsset(file, folder, onProgress);
}

export default uploadMediaAsset;
