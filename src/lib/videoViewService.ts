import { doc, setDoc, increment, addDoc, collection, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { isFirestoreQuotaExceeded, markFirestoreQuotaExceeded, isQuotaError } from './firestoreQuotaGuard';

export interface RecordViewOptions {
  videoId: string;
  videoTitle?: string;
  userId?: string | null;
  userRole?: string | null;
  videoSource?: 'admin' | 'imported' | 'member' | 'standalone';
}

// Session cache to prevent rapid duplicate view spam within a single viewing session
const recordedSessionViews = new Set<string>();

/**
 * Increments and persists the view count to Firestore every time a user starts watching a video.
 * @param options Video metadata and viewer details
 * @returns Updated view count from Firestore, or null if error
 */
export async function recordVideoView(options: RecordViewOptions): Promise<number | null> {
  const { videoId, videoTitle, userId, userRole, videoSource } = options;
  if (!videoId || isFirestoreQuotaExceeded()) return null;

  // Session key to debounce accidental rapid toggle re-triggers
  const sessionKey = `${videoId}_${Date.now() - (Date.now() % 30000)}`; // 30s window debounce
  if (recordedSessionViews.has(sessionKey)) {
    return null;
  }
  recordedSessionViews.add(sessionKey);

  try {
    const videoRef = doc(db, 'AdminVideos', videoId);

    // 1. Atomically increment viewCount on the AdminVideos collection in Firestore
    // Using setDoc with merge: true ensures even newly viewed or imported CSV clips get persisted
    await setDoc(videoRef, {
      id: videoId,
      viewCount: increment(1),
      lastViewedAt: new Date().toISOString(),
      ...(videoTitle ? { title: videoTitle } : {})
    }, { merge: true });

    // 2. Persist view log event in Firestore 'VideoViewLogs' collection
    const currentUid = userId || auth.currentUser?.uid || 'guest';
    const logRef = collection(db, 'VideoViewLogs');
    await addDoc(logRef, {
      videoId,
      videoTitle: videoTitle || 'Video Clip',
      viewerUid: currentUid,
      viewerRole: userRole || 'guest',
      timestamp: new Date().toISOString(),
      videoSource: videoSource || 'video_library'
    }).catch(err => {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded('VideoViewLogs write quota exceeded');
      }
    });

    // 3. Fetch current updated view count
    const updatedSnap = await getDoc(videoRef);
    if (updatedSnap.exists()) {
      const data = updatedSnap.data();
      return typeof data.viewCount === 'number' ? data.viewCount : null;
    }
  } catch (error: any) {
    if (isQuotaError(error)) {
      markFirestoreQuotaExceeded(error?.message || 'Firestore write quota reached');
    } else {
      console.warn('Failed to increment video view count in Firestore:', error);
    }
  }

  return null;
}
