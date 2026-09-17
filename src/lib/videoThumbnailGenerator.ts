/**
 * High-Performance Client-Side Video Thumbnail Generator & Cache
 * Extracts compressed image frame thumbnails (640x360 WebP/JPEG) from video files and video URLs.
 * Stores thumbnails in memory and browser storage to optimize feed rendering speed.
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

const THUMBNAIL_CACHE_KEY = 'j1p_video_thumbnail_cache_v1';

// In-memory cache map
const memoryThumbnailCache = new Map<string, string>();

// Initialize cache from localStorage
try {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(THUMBNAIL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([url, thumb]) => {
        if (typeof thumb === 'string') {
          memoryThumbnailCache.set(url, thumb);
        }
      });
    }
  }
} catch {
  // Ignore storage read errors
}

/**
 * Save item to local thumbnail cache
 */
export function cacheThumbnailUrl(videoKey: string, thumbnailUrl: string): void {
  if (!videoKey || !thumbnailUrl) return;
  memoryThumbnailCache.set(videoKey, thumbnailUrl);
  try {
    const obj: Record<string, string> = {};
    // Keep cache size bounded to last 150 items
    const entries = Array.from(memoryThumbnailCache.entries()).slice(-150);
    entries.forEach(([k, v]) => {
      obj[k] = v;
    });
    localStorage.setItem(THUMBNAIL_CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore storage write errors
  }
}

/**
 * Get cached thumbnail URL
 */
export function getCachedThumbnailUrl(videoKey: string): string | null {
  if (!videoKey) return null;
  return memoryThumbnailCache.get(videoKey) || null;
}

/**
 * Extract YouTube / Vimeo / Hudl thumbnail URL directly from URL if possible
 */
export function getEmbedThumbnailUrl(url: string): string | null {
  if (!url) return null;

  // YouTube match (Standard, Shorts, Embed)
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  // Vimeo match
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://vimeocdn.com/video/${vimeoMatch[1]}_640.jpg`;
  }

  // Hudl match
  if (url.includes('hudl.com')) {
    return 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop&q=80';
  }

  // TikTok match
  if (url.includes('tiktok.com')) {
    return 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80';
  }

  // Instagram match
  if (url.includes('instagram.com')) {
    return 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80';
  }

  return null;
}

export interface ThumbnailResult {
  blob: Blob;
  dataUrl: string;
  file: File;
}

/**
 * Extract frame thumbnail from a native video File or Blob
 */
export async function generateVideoThumbnailFromFile(
  file: File | Blob,
  options: {
    timeInSeconds?: number;
    maxWidth?: number;
    quality?: number;
  } = {}
): Promise<ThumbnailResult> {
  const { timeInSeconds = 1.0, maxWidth = 640, quality = 0.75 } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    let seeked = false;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    const timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new Error('Video thumbnail generation timed out'));
    }, 6000);

    video.onloadeddata = () => {
      const duration = video.duration || 2;
      const targetTime = Math.min(timeInSeconds, duration > 0.5 ? duration * 0.2 : 0.1);
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      if (seeked) return;
      seeked = true;
      clearTimeout(timeoutTimer);

      try {
        const origWidth = video.videoWidth || 640;
        const origHeight = video.videoHeight || 360;

        let targetWidth = origWidth;
        let targetHeight = origHeight;

        if (origWidth > maxWidth) {
          targetWidth = maxWidth;
          targetHeight = Math.round((origHeight * maxWidth) / origWidth);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Canvas 2D context not supported'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) {
              reject(new Error('Canvas blob conversion failed'));
              return;
            }

            const thumbFileName = (file instanceof File ? file.name : 'video').replace(/\.[^/.]+$/, '') + '_thumb.jpg';
            const thumbFile = new File([blob], thumbFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            console.log(
              `⚡ [videoThumbnailGenerator] Generated thumbnail (${targetWidth}x${targetHeight}) - ${(blob.size / 1024).toFixed(1)} KB`
            );

            resolve({
              blob,
              dataUrl,
              file: thumbFile,
            });
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = (err) => {
      clearTimeout(timeoutTimer);
      cleanup();
      reject(err);
    };
  });
}

/**
 * Upload compressed thumbnail image to Firebase Storage and return download URL
 */
export async function uploadThumbnailToStorage(
  thumbnailBlobOrFile: Blob | File,
  uid: string,
  prefix: string = 'social'
): Promise<string> {
  try {
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const storageRef = ref(storage, `thumbnails/${uid}/${filename}`);
    
    await uploadBytes(storageRef, thumbnailBlobOrFile, {
      contentType: 'image/jpeg',
      cacheControl: 'public,max-age=31536000', // 1 year cache header
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.warn('⚠️ [videoThumbnailGenerator] Thumbnail storage upload failed, using Data URL fallback:', err);
    throw err;
  }
}

/**
 * Extract multiple candidate frame thumbnails at distributed intervals across video duration
 */
export async function generateMultipleVideoFrames(
  file: File | Blob,
  frameCount: number = 4
): Promise<ThumbnailResult[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const results: ThumbnailResult[] = [];

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(results);
    }, 10000);

    video.onloadedmetadata = async () => {
      const duration = video.duration || 5;
      const timestamps: number[] = [];
      for (let i = 1; i <= frameCount; i++) {
        timestamps.push((duration * i) / (frameCount + 1));
      }

      for (let i = 0; i < timestamps.length; i++) {
        try {
          const frameResult = await new Promise<ThumbnailResult | null>((resSeek) => {
            const seekHandler = () => {
              video.removeEventListener('seeked', seekHandler);
              try {
                const origWidth = video.videoWidth || 640;
                const origHeight = video.videoHeight || 360;
                const targetWidth = Math.min(640, origWidth);
                const targetHeight = Math.round((origHeight * targetWidth) / origWidth);

                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resSeek(null);

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                canvas.toBlob((blob) => {
                  if (!blob) return resSeek(null);
                  const thumbFile = new File([blob], `frame_${i}.jpg`, { type: 'image/jpeg' });
                  resSeek({ blob, dataUrl, file: thumbFile });
                }, 'image/jpeg', 0.8);
              } catch {
                resSeek(null);
              }
            };

            video.addEventListener('seeked', seekHandler);
            video.currentTime = timestamps[i];
          });

          if (frameResult) {
            results.push(frameResult);
          }
        } catch {
          // Skip frame on seek failure
        }
      }

      clearTimeout(timeout);
      cleanup();
      resolve(results);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(results);
    };
  });
}

/**
 * Helper to get or generate best thumbnail for any video (file or URL)
 */
export async function resolveOrGenerateThumbnail(
  videoFileOrUrl: File | string,
  uid?: string
): Promise<string | null> {
  if (!videoFileOrUrl) return null;

  if (typeof videoFileOrUrl === 'string') {
    const embedThumb = getEmbedThumbnailUrl(videoFileOrUrl);
    if (embedThumb) return embedThumb;

    const cached = getCachedThumbnailUrl(videoFileOrUrl);
    if (cached) return cached;

    return null;
  }

  // Handle File
  try {
    const result = await generateVideoThumbnailFromFile(videoFileOrUrl);
    if (uid) {
      try {
        const uploadedUrl = await uploadThumbnailToStorage(result.file, uid);
        cacheThumbnailUrl(videoFileOrUrl.name, uploadedUrl);
        return uploadedUrl;
      } catch {
        // Use data URL if storage upload fails
      }
    }
    cacheThumbnailUrl(videoFileOrUrl.name, result.dataUrl);
    return result.dataUrl;
  } catch (err) {
    console.warn('Thumbnail generation skipped for file:', err);
    return null;
  }
}
