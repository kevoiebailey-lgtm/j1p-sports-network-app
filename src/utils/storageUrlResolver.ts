import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { useState, useEffect } from 'react';

// In-memory cache to prevent duplicate getDownloadURL calls across component re-renders
const resolvedUrlCache = new Map<string, string>();
const pendingResolutionMap = new Map<string, Promise<string>>();

/**
 * Checks if a string is a Google Drive URL, URI, or raw File ID.
 */
export function isGoogleDriveUrlOrId(urlOrPath?: string | null): boolean {
  if (!urlOrPath || typeof urlOrPath !== 'string') return false;
  const trimmed = urlOrPath.trim();
  if (trimmed.length === 0) return false;

  if (trimmed.startsWith('gdrive:') || trimmed.startsWith('drive:')) return true;
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) return true;
  if (trimmed.includes('lh3.googleusercontent.com/d/')) return true;

  // Raw Google Drive File ID string (alphanumeric, dashes, underscores, length >= 20, no slashes or dots)
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(trimmed) && !trimmed.includes('.') && !trimmed.includes('/')) {
    return true;
  }

  return false;
}

/**
 * Extracts a Google Drive File or Folder ID from various URL formats.
 */
export function extractGoogleDriveFileId(urlOrId?: string | null): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();
  if (trimmed.length === 0) return null;

  // Strip custom prefixes
  let cleaned = trimmed.replace(/^(gdrive:|drive:)/, '');

  // 1. Match /file/d/FILE_ID or /d/FILE_ID
  const fileDMatch = cleaned.match(/\/(?:file\/d|d)\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // 2. Match /folders/FOLDER_ID
  const folderMatch = cleaned.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // 3. Match ?id=FILE_ID or &id=FILE_ID
  const idParamMatch = cleaned.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // 4. Match /open?id= or /uc?id=
  const openMatch = cleaned.match(/\/(?:open|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) {
    return openMatch[1];
  }

  // 5. Raw file ID (length >= 15, no query params or protocol)
  if (/^[a-zA-Z0-9_-]{15,60}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Checks if a string is a raw Firebase Storage path or gs:// URI instead of an HTTP(S) or local server URL.
 */
export function isRawStoragePath(urlOrPath?: string | null): boolean {
  if (!urlOrPath || typeof urlOrPath !== 'string') return false;
  const trimmed = urlOrPath.trim();
  if (trimmed.length === 0) return false;

  // Google Drive custom identifiers or direct IDs are handled by Google Drive resolver
  if (isGoogleDriveUrlOrId(trimmed)) {
    return false;
  }

  // Already resolved HTTP, HTTPS, blob, or data URLs
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return false;
  }

  // Local server paths, uploads, API endpoints, or static web assets are direct web URLs
  if (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('uploads/') ||
    trimmed.startsWith('/api/') ||
    trimmed.startsWith('api/') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('assets/') ||
    trimmed.startsWith('/images/') ||
    trimmed.startsWith('images/') ||
    trimmed.startsWith('/static/') ||
    trimmed.startsWith('/favicon') ||
    trimmed.startsWith('/')
  ) {
    return false;
  }

  // Google Cloud Storage gs:// scheme
  if (trimmed.startsWith('gs://')) {
    return true;
  }

  // Known Firebase storage path prefixes (must be relative path into Firebase bucket)
  const normalized = trimmed.replace(/^\/+/, '');
  if (
    normalized.startsWith('photos/') ||
    normalized.startsWith('gallery/') ||
    normalized.startsWith('galleries/') ||
    normalized.startsWith('albums/') ||
    normalized.startsWith('Albums/') ||
    normalized.startsWith('post_media/') ||
    normalized.startsWith('social_wall/') ||
    normalized.startsWith('profile_images/') ||
    normalized.startsWith('users/') ||
    normalized.startsWith('media_vault/') ||
    normalized.startsWith('vault/') ||
    normalized.startsWith('videos/')
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves a Google Drive URL or File ID into a high-performance previewable CDN image URL.
 * Uses Google's open UserContent CDN (lh3.googleusercontent.com/d/ID) which bypasses 
 * CORS, SameSite cookie blocks, and cross-origin restrictions in standard <img> tags.
 */
export function resolveGoogleDriveImageUrl(urlOrId: string, size: 'thumb' | 'preview' | 'full' = 'preview'): string {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const trimmed = urlOrId.trim();

  const fileId = extractGoogleDriveFileId(trimmed);
  if (!fileId) {
    return trimmed;
  }

  if (size === 'thumb') {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }
  if (size === 'preview') {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  // Full master resolution
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2048`;
}

/**
 * Returns an ordered array of fallback CDN URLs for a Google Drive file in case one is throttled.
 */
export function getGoogleDriveFallbackUrls(urlOrId: string): string[] {
  const fileId = extractGoogleDriveFileId(urlOrId);
  if (!fileId) return [];

  return [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    `https://lh3.googleusercontent.com/d/${fileId}=w1000`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    `https://lh3.googleusercontent.com/d/${fileId}`,
    `https://drive.google.com/uc?export=view&id=${fileId}`
  ];
}

/**
 * Resolves a clean, full-resolution URL synchronously when possible (e.g. Google Drive full asset or direct URL).
 */
export function resolveCleanUrl(urlOrPath?: string | null): string {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';
  const trimmed = urlOrPath.trim();
  if (trimmed.length === 0) return '';

  if (isGoogleDriveUrlOrId(trimmed)) {
    return resolveGoogleDriveImageUrl(trimmed, 'full');
  }

  if (resolvedUrlCache.has(trimmed)) {
    return resolvedUrlCache.get(trimmed)!;
  }

  return trimmed;
}

/**
 * Normalizes a gs:// URI or storage path to a standard Firebase Storage relative reference.
 */
export function normalizeStoragePath(urlOrPath: string): string {
  let cleaned = urlOrPath.trim();

  // Strip gs://bucket-name/ prefix
  if (cleaned.startsWith('gs://')) {
    const withoutScheme = cleaned.slice(5); // e.g. "just1play26.firebasestorage.app/photos/thumbnails/xyz.jpg"
    const firstSlashIndex = withoutScheme.indexOf('/');
    if (firstSlashIndex !== -1) {
      cleaned = withoutScheme.slice(firstSlashIndex + 1);
    } else {
      cleaned = withoutScheme;
    }
  }

  // Remove leading slashes
  cleaned = cleaned.replace(/^\/+/, '');

  return cleaned;
}

/**
 * Resolves a Firebase Storage path, gs:// URI, or Google Drive URL/ID to a fully-qualified, high-performance image URL.
 * Automatically utilizes in-memory deduplication and caching.
 */
export async function resolveStorageUrl(urlOrPath?: string | null): Promise<string> {
  if (!urlOrPath || typeof urlOrPath !== 'string') {
    return '';
  }

  const raw = urlOrPath.trim();
  if (raw.length === 0) return '';

  // Fast-path: check cache
  if (resolvedUrlCache.has(raw)) {
    return resolvedUrlCache.get(raw)!;
  }

  // Google Drive URL or File ID -> Resolve to Google UserContent CDN
  if (isGoogleDriveUrlOrId(raw)) {
    const driveCdnUrl = resolveGoogleDriveImageUrl(raw, 'preview');
    resolvedUrlCache.set(raw, driveCdnUrl);
    return driveCdnUrl;
  }

  // Local server upload paths normalization
  if (raw.startsWith('/uploads/') || raw.startsWith('/api/') || raw.startsWith('/assets/') || raw.startsWith('/images/')) {
    resolvedUrlCache.set(raw, raw);
    return raw;
  }
  if (raw.startsWith('uploads/')) {
    const formatted = `/${raw}`;
    resolvedUrlCache.set(raw, formatted);
    return formatted;
  }

  // If it is already a valid standard HTTP(S), blob, or data URL
  if (!isRawStoragePath(raw)) {
    resolvedUrlCache.set(raw, raw);
    return raw;
  }

  // In-flight deduplication
  if (pendingResolutionMap.has(raw)) {
    return pendingResolutionMap.get(raw)!;
  }

  const resolutionPromise = (async () => {
    try {
      const storagePath = normalizeStoragePath(raw);
      const storageRef = ref(storage, storagePath);
      const downloadUrl = await getDownloadURL(storageRef);

      resolvedUrlCache.set(raw, downloadUrl);
      return downloadUrl;
    } catch (err: any) {
      console.warn(`[storageUrlResolver] Failed to resolve download URL for "${raw}":`, err?.message || err);
      // Return raw as fallback to avoid crashing caller
      return raw;
    } finally {
      pendingResolutionMap.delete(raw);
    }
  })();

  pendingResolutionMap.set(raw, resolutionPromise);
  return resolutionPromise;
}

/**
 * React Hook that seamlessly resolves a raw Firebase Storage path or Google Drive URL
 * with zero layout shift, synchronous cache hits, and loading state.
 */
export function useResolvedStorageUrl(src?: string | null, fallbackUrl: string = ''): {
  resolvedUrl: string;
  isLoading: boolean;
  isError: boolean;
} {
  const cleanInput = (typeof src === 'string' ? src : '').trim();

  // Fast resolution for Google Drive or direct URLs
  const getImmediateUrl = (input: string): string | null => {
    if (!input) return null;
    if (resolvedUrlCache.has(input)) return resolvedUrlCache.get(input)!;
    if (isGoogleDriveUrlOrId(input)) {
      const gUrl = resolveGoogleDriveImageUrl(input, 'preview');
      resolvedUrlCache.set(input, gUrl);
      return gUrl;
    }
    if (input.startsWith('/uploads/') || input.startsWith('/api/') || input.startsWith('/assets/') || input.startsWith('/images/')) {
      resolvedUrlCache.set(input, input);
      return input;
    }
    if (input.startsWith('uploads/')) {
      const formatted = `/${input}`;
      resolvedUrlCache.set(input, formatted);
      return formatted;
    }
    if (!isRawStoragePath(input)) {
      return input;
    }
    return null;
  };

  const initialUrl = getImmediateUrl(cleanInput);
  const isDirect = Boolean(initialUrl);

  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    if (initialUrl) return initialUrl;
    return fallbackUrl;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!cleanInput) return false;
    if (isDirect) return false;
    return true;
  });

  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    if (!cleanInput) {
      setResolvedUrl(fallbackUrl);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    const immediate = getImmediateUrl(cleanInput);
    if (immediate) {
      setResolvedUrl(immediate);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setIsError(false);

    resolveStorageUrl(cleanInput)
      .then((url) => {
        if (!isMounted) return;
        if (url) {
          setResolvedUrl(url);
          setIsError(false);
        } else {
          setResolvedUrl(fallbackUrl);
          setIsError(true);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setResolvedUrl(fallbackUrl);
        setIsError(true);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cleanInput, fallbackUrl]);

  return { resolvedUrl, isLoading, isError };
}

/**
 * Resolves all media and thumbnail URL properties in a Photo or Gallery object.
 */
export async function resolvePhotoDocument<T extends Record<string, any>>(docData: T): Promise<T> {
  if (!docData) return docData;

  const copy: Record<string, any> = { ...docData };
  const keysToResolve = [
    'thumbnailUrl',
    'thumbUrl',
    'watermarkedUrl',
    'originalUrl',
    'imageUrl',
    'coverPhotoUrl',
    'coverUrl',
    'previewUrl',
    'watermarkedCoverUrl'
  ];

  await Promise.all(
    keysToResolve.map(async (key) => {
      if (typeof copy[key] === 'string' && copy[key].trim().length > 0) {
        copy[key] = await resolveStorageUrl(copy[key]);
      }
    })
  );

  // If item has mediaUrls array
  if (Array.isArray(copy.mediaUrls)) {
    copy.mediaUrls = await Promise.all(
      copy.mediaUrls.map(async (u: any) => (typeof u === 'string' ? resolveStorageUrl(u) : u))
    );
  }

  // If item has watermarkedMediaUrls array
  if (Array.isArray(copy.watermarkedMediaUrls)) {
    copy.watermarkedMediaUrls = await Promise.all(
      copy.watermarkedMediaUrls.map(async (u: any) => (typeof u === 'string' ? resolveStorageUrl(u) : u))
    );
  }

  // If item has photos array
  if (Array.isArray(copy.photos)) {
    copy.photos = await Promise.all(
      copy.photos.map(async (p: any) => {
        if (p && typeof p === 'object') {
          return {
            ...p,
            originalUrl: p.originalUrl ? await resolveStorageUrl(p.originalUrl) : p.originalUrl,
            watermarkedUrl: p.watermarkedUrl ? await resolveStorageUrl(p.watermarkedUrl) : p.watermarkedUrl,
            thumbnailUrl: p.thumbnailUrl ? await resolveStorageUrl(p.thumbnailUrl) : p.thumbnailUrl,
            thumbUrl: p.thumbUrl ? await resolveStorageUrl(p.thumbUrl) : p.thumbUrl
          };
        }
        return p;
      })
    );
  }

  return copy as T;
}

/**
 * Resolves a Google Drive URL or File ID into a direct file download stream:
 * https://drive.google.com/uc?export=download&id=${driveFileId}
 * Required by Prodigi print labs to download raw high-resolution image assets.
 */
export function resolveDirectGoogleDriveDownloadUrl(urlOrId?: string | null): string {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const trimmed = urlOrId.trim();
  if (isGoogleDriveUrlOrId(trimmed)) {
    const fileId = extractGoogleDriveFileId(trimmed);
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }
  return trimmed;
}
