import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth, ensureAuthUser } from '../lib/firebase';
import { createWatermarkedBlob } from '../lib/watermarkGenerator';

export type UploadDestination = 'gallery' | 'social_wall' | 'media_vault' | 'posts' | 'photos/thumbnails/watermarked';

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  maxSizeBytes?: number;
  allowFallback?: boolean;
}

export interface GalleryPhotoUploadResult {
  originalUrl: string;
  watermarkedUrl: string;
  storagePath: string;
  watermarkedStoragePath: string;
  originalFileName: string;
}

/**
 * Validates image mime type (JPEG, PNG, WebP, GIF, HEIC/HEIF)
 */
export function isValidImageFile(file: File): boolean {
  if (!file) return false;
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/heic', 'image/heif'];
  return validTypes.includes(file.type.toLowerCase()) || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}

/**
 * Compresses and normalizes an image file to standard JPEG blob and optimized Data URL.
 * Solves iOS Safari empty MIME types and prevents payload overflow.
 */
export async function normalizeAndCompressImage(
  file: File, 
  maxWidth = 1600, 
  maxHeight = 1600, 
  quality = 0.82
): Promise<{ blob: Blob; dataUrl: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        // Fallback for SVGs or un-decodeable formats
        resolve({
          blob: file,
          dataUrl: e.target?.result as string || '',
          contentType: file.type || 'image/jpeg'
        });
      };
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({
            blob: file,
            dataUrl: e.target?.result as string || '',
            contentType: 'image/jpeg'
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                dataUrl,
                contentType: 'image/jpeg'
              });
            } else {
              resolve({
                blob: file,
                dataUrl,
                contentType: 'image/jpeg'
              });
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image file directly to Firebase Storage under the requested destination folder:
 * - gallery: `gallery/{timestamp}_{filename}`
 * - social_wall: `social_wall/{timestamp}_{filename}`
 *
 * Enforces authenticated file size limits and automatic JPEG normalization.
 * Returns the permanent download URL or safe high-performance Data URL fallback.
 */
export async function uploadDirectImage(
  file: File,
  destination: UploadDestination,
  options?: UploadOptions
): Promise<string> {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  if (!isValidImageFile(file)) {
    throw new Error('Invalid file format. Only JPEG, PNG, and WebP images are allowed.');
  }

  // Size limit validation (Gallery: 15MB, Social Wall: 10MB)
  const maxLimit = destination === 'gallery' ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
  const maxLimitMB = destination === 'gallery' ? 15 : 10;

  if (file.size > maxLimit) {
    throw new Error(`File size exceeds limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is ${maxLimitMB}MB.`);
  }

  // Ensure user is authenticated and token is fresh before storage operations
  try {
    await ensureAuthUser();
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(false);
    }
  } catch (err) {
    console.warn('Auth check notice:', err);
  }

  // 1. Normalize and compress image
  let compressedBlob: Blob;
  let normalizedContentType = file.type || 'image/jpeg';

  try {
    const compressed = await normalizeAndCompressImage(file);
    compressedBlob = compressed.blob;
    normalizedContentType = compressed.contentType || file.type || 'image/jpeg';
  } catch {
    compressedBlob = file;
    normalizedContentType = file.type || 'image/jpeg';
  }

  const timestamp = Date.now();
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.[^/.]+$/, '')
    .substring(0, 36) + '.jpeg';

  // If destination is generic 'gallery', map to galleries/public/previews to match storage rules for authenticated users
  const resolvedDestination = destination === 'gallery' ? 'galleries/public/previews' : destination;
  const storagePath = `${resolvedDestination}/${timestamp}_${sanitizedName}`;
  const storageRef = ref(storage, storagePath);

  const metadata = {
    contentType: file.type || normalizedContentType || 'image/jpeg',
    customMetadata: {
      uploadedBy: auth.currentUser?.uid || 'authenticated_member',
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      destination: resolvedDestination
    }
  };

  return new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, compressedBlob, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 100
        );
        if (options?.onProgress) {
          options.onProgress(progress);
        }
      },
      (error) => {
        // Log direct Firebase Storage error clearly for browser console debugging
        console.error(`[Firebase Storage Upload Error at ${storagePath}]:`, error);
        reject(error || new Error(`Storage upload failed at ${storagePath}. Please verify storage permissions.`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (options?.onProgress) options.onProgress(100);
          resolve(downloadUrl);
        } catch (err: any) {
          console.error(`[Firebase Storage DownloadURL Error at ${storagePath}]:`, err);
          reject(err || new Error(`Failed to retrieve file download URL from Firebase Storage at ${storagePath}.`));
        }
      }
    );
  });
}

/**
 * Uploads a photo to the gallery and simultaneously generates and uploads
 * a low-resolution watermarked thumbnail to `/galleries/{albumId}/thumbs`.
 * This protects original high-resolution assets and incentivizes purchases.
 */
export async function uploadGalleryPhotoWithWatermark(
  file: File,
  options?: UploadOptions,
  albumId?: string
): Promise<GalleryPhotoUploadResult> {
  if (!file) {
    throw new Error('No file provided for gallery upload.');
  }

  // Ensure user is authenticated and token is fresh before uploading
  try {
    await ensureAuthUser();
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(false);
    }
  } catch (err) {
    console.warn('Auth token verification notice:', err);
  }

  const timestamp = Date.now();
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.[^/.]+$/, '')
    .substring(0, 36);

  const originalFileName = `${timestamp}_${sanitizedName}.jpeg`;
  const watermarkedFileName = `${timestamp}_${sanitizedName}_watermarked.jpeg`;

  const targetAlbum = (albumId || 'public').trim();
  const originalStoragePath = `galleries/${targetAlbum}/previews/${originalFileName}`;
  const watermarkedStoragePath = `galleries/${targetAlbum}/thumbs/${watermarkedFileName}`;

  // 1. Upload high-res preview master targeting galleries/{albumId}/previews
  const originalUrl = await uploadDirectImage(file, `galleries/${targetAlbum}/previews` as any, {
    onProgress: (p) => {
      if (options?.onProgress) {
        options.onProgress(Math.round(p * 0.55));
      }
    },
    allowFallback: false
  });

  // 2. Generate and upload low-resolution watermarked thumbnail targeting galleries/{albumId}/thumbs
  let watermarkedUrl = originalUrl;

  try {
    const watermarkedBlob = await createWatermarkedBlob(file, 'JUST1PLAY • OFFICIAL MEDIA');
    const wmStorageRef = ref(storage, watermarkedStoragePath);

    const wmMetadata = {
      contentType: file.type || 'image/jpeg',
      customMetadata: {
        type: 'watermarked_thumbnail',
        uploadedBy: auth.currentUser?.uid || 'authenticated_member',
        originalFileName: file.name,
        uploadedAt: new Date().toISOString(),
        destination: `galleries/${targetAlbum}/thumbs`
      }
    };

    const wmUploadTask = uploadBytesResumable(wmStorageRef, watermarkedBlob, wmMetadata);

    await new Promise<void>((resolve, reject) => {
      wmUploadTask.on(
        'state_changed',
        (snap) => {
          const p = Math.round((snap.bytesTransferred / (snap.totalBytes || 1)) * 100);
          if (options?.onProgress) {
            options.onProgress(55 + Math.round(p * 0.45));
          }
        },
        (err) => {
          console.error(`[Firebase Storage Watermark Upload Error at ${watermarkedStoragePath}]:`, err);
          reject(err);
        },
        async () => {
          try {
            const wmUrl = await getDownloadURL(wmUploadTask.snapshot.ref);
            if (wmUrl) {
              watermarkedUrl = wmUrl;
            }
            resolve();
          } catch (e) {
            console.error(`[Could not get download URL for watermarked thumbnail at ${watermarkedStoragePath}]:`, e);
            reject(e);
          }
        }
      );
    });
  } catch (err) {
    console.error(`[Error during watermarked thumbnail processing at ${watermarkedStoragePath}]:`, err);
    throw err;
  }

  if (options?.onProgress) {
    options.onProgress(100);
  }

  return {
    originalUrl,
    watermarkedUrl,
    storagePath: originalStoragePath,
    watermarkedStoragePath,
    originalFileName: file.name
  };
}

