import { doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase';
import { downloadPhotoFile } from './downloadHelper';

export interface GalleryPhotoDownloadOptions {
  photoId: string;
  photoTitle?: string;
  user?: any;
  fallbackCleanUrl?: string;
  albumId?: string;
  vaultPath?: string;
}

export interface GalleryPhotoDownloadResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  isUnauthorized?: boolean;
  needsAuth?: boolean;
  needsPurchase?: boolean;
}

/**
 * Checks whether the current user is an admin.
 */
export function isUserAdmin(user?: any): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const role = (user.role || '').toLowerCase().trim();
  const uid = user.uid || '';

  return (
    uid === 'ADMIN_UID' ||
    email === 'kevoiebailey@gmail.com' ||
    role === 'admin' ||
    role === 'director' ||
    role === 'tournament_director' ||
    user.isAdmin === true ||
    user.token?.admin === true ||
    user.token?.role === 'admin'
  );
}

/**
 * Checks Firestore purchases collection for direct ${userId}_${photoId} document.
 * This matches the Firebase Storage Security Rule O(1) existence check:
 * firestore.exists(/databases/(default)/documents/purchases/$(request.auth.uid + '_' + photoId))
 */
export async function checkPhotoPurchased(userId: string, photoId: string): Promise<boolean> {
  if (!userId || !photoId || userId === 'guest') return false;

  try {
    const purchaseDocRef = doc(db, 'purchases', `${userId}_${photoId}`);
    const snap = await getDoc(purchaseDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return data?.status === 'completed' || data?.status === 'COMPLETED' || true;
    }

    // Also check user subcollection fallback: users/{userId}/purchased_photos/{photoId}
    const userSubDocRef = doc(db, `users/${userId}/purchased_photos`, photoId);
    const userSubSnap = await getDoc(userSubDocRef);
    if (userSubSnap.exists()) {
      return true;
    }
  } catch (err) {
    console.warn(`[galleryDownloadService] Error verifying purchase for ${userId}_${photoId}:`, err);
  }

  return false;
}

/**
 * Executes clean original download flow:
 * 1. Checks user authentication (returns needsAuth: true if not logged in).
 * 2. Checks if user is Admin OR has verified purchase in purchases/${userId}_${photoId}.
 * 3. Fetches clean unwatermarked master from gallery/originals/${photoId} via getDownloadURL().
 * 4. Catches storage/unauthorized and surfaces "Please purchase this photo to unlock the high-res download without watermark."
 * 5. Triggers instant browser download of original file.
 */
export async function executeCleanPhotoDownload({
  photoId,
  photoTitle = 'photo',
  user,
  fallbackCleanUrl,
  albumId,
  vaultPath,
}: GalleryPhotoDownloadOptions): Promise<GalleryPhotoDownloadResult> {
  const currentUser = user || auth.currentUser;

  // 1. Unauthenticated visitors cannot download clean original
  if (!currentUser || !currentUser.uid) {
    return {
      success: false,
      needsAuth: true,
      error: 'Please sign in to download clean high-resolution photos.',
    };
  }

  const isAdmin = isUserAdmin(currentUser);

  // 2. Check if user is Admin or has purchased the photo
  let hasPurchased = false;
  if (!isAdmin) {
    hasPurchased = await checkPhotoPurchased(currentUser.uid, photoId);
    if (!hasPurchased) {
      return {
        success: false,
        needsPurchase: true,
        error: 'Please purchase this photo to unlock the high-res download without watermark.',
      };
    }
  }

  // 3. Attempt to fetch clean image from gallery/originals/${photoId}
  try {
    const cleanStorageRef = ref(storage, `gallery/originals/${photoId}`);
    let resolvedDownloadUrl: string;

    try {
      resolvedDownloadUrl = await getDownloadURL(cleanStorageRef);
    } catch (storageErr: any) {
      // If storage/unauthorized is returned by Firebase Storage Security Rules
      if (storageErr?.code === 'storage/unauthorized') {
        return {
          success: false,
          isUnauthorized: true,
          needsPurchase: true,
          error: 'Please purchase this photo to unlock the high-res download without watermark.',
        };
      }

      // If object not found at direct gallery/originals/${photoId}, try album path or fallbackCleanUrl
      if (storageErr?.code === 'storage/object-not-found' && albumId) {
        try {
          const albumRef = ref(storage, `gallery/originals/${albumId}/${photoId}`);
          resolvedDownloadUrl = await getDownloadURL(albumRef);
        } catch {
          // Continue to fallback
        }
      }

      if (!resolvedDownloadUrl!) {
        if (fallbackCleanUrl) {
          resolvedDownloadUrl = fallbackCleanUrl;
        } else if (vaultPath || albumId) {
          resolvedDownloadUrl = `/api/media/download?albumId=${encodeURIComponent(albumId || '')}&photoId=${encodeURIComponent(photoId)}&vaultPath=${encodeURIComponent(vaultPath || '')}&filename=${encodeURIComponent(photoTitle)}_clean.jpg`;
        } else {
          throw storageErr;
        }
      }
    }

    // 4. Trigger instant browser download
    const safeFilename = `${photoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || `just1play_${photoId}`}_clean.jpg`;
    await downloadPhotoFile(resolvedDownloadUrl, safeFilename);

    return {
      success: true,
      downloadUrl: resolvedDownloadUrl,
    };
  } catch (err: any) {
    if (err?.code === 'storage/unauthorized') {
      return {
        success: false,
        isUnauthorized: true,
        needsPurchase: true,
        error: 'Please purchase this photo to unlock the high-res download without watermark.',
      };
    }

    console.error('[galleryDownloadService] Download error:', err);
    return {
      success: false,
      error: err?.message || 'Unable to download clean photo. Please try again.',
    };
  }
}
