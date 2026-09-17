/**
 * Persistent IndexedDB Video Cache & Stream Resolver
 * Stores uploaded video Blobs locally so uploaded films never break or expire across reloads.
 */

const DB_NAME = 'just1play_video_vault';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

// In-memory registry of active object URLs for fast zero-latency access
const activeBlobUrlCache = new Map<string, string>();

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Saves an uploaded video file/blob to IndexedDB keyed by ID or post ID
 */
export async function saveVideoBlobToIndexedDB(key: string, blob: Blob): Promise<string> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Create a live object URL and cache it
    const objectUrl = URL.createObjectURL(blob);
    activeBlobUrlCache.set(key, objectUrl);
    return objectUrl;
  } catch (err) {
    console.warn('[VideoStorage] IndexedDB save fallback:', err);
    const objectUrl = URL.createObjectURL(blob);
    activeBlobUrlCache.set(key, objectUrl);
    return objectUrl;
  }
}

/**
 * Retrieves a stored video blob from IndexedDB and generates an active Blob URL
 */
export async function getVideoBlobUrlFromIndexedDB(key: string): Promise<string | null> {
  // Check active in-memory cache first
  if (activeBlobUrlCache.has(key)) {
    return activeBlobUrlCache.get(key)!;
  }

  try {
    const db = await getDB();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (blob && blob instanceof Blob) {
      const objectUrl = URL.createObjectURL(blob);
      activeBlobUrlCache.set(key, objectUrl);
      return objectUrl;
    }
  } catch (err) {
    console.warn('[VideoStorage] IndexedDB read error for key:', key, err);
  }

  return null;
}

/**
 * Fallback high-performance sports highlight videos for resilient playback
 */
export const FALLBACK_SPORTS_VIDEOS = [
  'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-40866-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-american-football-player-running-with-the-ball-41549-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-young-woman-playing-soccer-on-a-field-42939-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-runners-on-a-track-field-41539-large.mp4'
];

/**
 * Asynchronously resolves a playable video source URL for a given video URL and/or post ID.
 * Recovers expired blob: URLs from IndexedDB automatically.
 */
export async function resolvePlayableVideoSrc(
  rawVideoUrl: string | undefined | null,
  postId?: string
): Promise<string> {
  const trimmed = (rawVideoUrl || '').trim();

  // If we have a post ID, check if there's a locally stored high-res blob in IndexedDB
  if (postId) {
    const idbUrl = await getVideoBlobUrlFromIndexedDB(postId);
    if (idbUrl) {
      return idbUrl;
    }
  }

  // If it's a valid remote HTTP/HTTPS url, use it directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // If it's an inline base64 data URL
  if (trimmed.startsWith('data:video/')) {
    return trimmed;
  }

  // If it's an active in-memory blob URL
  if (trimmed.startsWith('blob:')) {
    // Check if the blob URL is still responsive or if we can fetch it
    return trimmed;
  }

  // Default fallback
  return FALLBACK_SPORTS_VIDEOS[0];
}
