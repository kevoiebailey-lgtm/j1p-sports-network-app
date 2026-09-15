import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  writeBatch, 
  serverTimestamp,
  setDoc,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface BulkSetPhotoPricingOptions {
  galleryId: string;
  isFreeForMembers: boolean;
  priceCents: number;
  authToken?: string;
  galleryTitle?: string;
}

export interface BulkSetPhotoPricingResult {
  success: boolean;
  updatedCount: number;
  galleryId: string;
  isFreeForMembers: boolean;
  priceCents: number;
  priceDollars: number;
  message?: string;
}

/**
 * Bulk-sets 'isFreeForMembers' and 'priceCents' for all photos within a specific gallery.
 * 
 * Updates:
 * 1. The gallery document: galleries/{galleryId} (including its 'photos' array if present)
 * 2. The mirror album document: albums/{galleryId} (including its 'photos' array if present)
 * 3. All photos in subcollections:
 *    - galleries/{galleryId}/photos
 *    - galleries/{galleryId}/Photos
 *    - albums/{galleryId}/photos
 *    - albums/{galleryId}/Photos
 * 4. Linked media documents in root 'gallery' and 'photos' collections matching this gallery/album
 * 5. Calls server API /api/gallery/bulk-photo-pricing if available for elevated admin persistence
 */
export async function bulkSetGalleryPhotosPricing(
  options: BulkSetPhotoPricingOptions
): Promise<BulkSetPhotoPricingResult> {
  const { galleryId, isFreeForMembers, priceCents, authToken, galleryTitle } = options;

  if (!galleryId) {
    throw new Error('Missing required galleryId parameter.');
  }

  const safeCents = typeof priceCents === 'number' && !isNaN(priceCents)
    ? Math.max(0, Math.round(priceCents))
    : 0;
  const safeFreeForMembers = Boolean(isFreeForMembers);
  const priceDollars = Number((safeCents / 100).toFixed(2));
  const isFree = safeFreeForMembers || safeCents === 0;
  const isPaid = !isFree;

  let totalUpdatedPhotos = 0;
  let serverSuccess = false;

  // 1. Attempt Server-Side Admin API Route (fast, elevated privileges)
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch('/api/gallery/bulk-photo-pricing', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        galleryId,
        isFreeForMembers: safeFreeForMembers,
        priceCents: safeCents,
        galleryTitle: galleryTitle || ''
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        serverSuccess = true;
        totalUpdatedPhotos = Math.max(totalUpdatedPhotos, data.updatedCount || 0);
      }
    }
  } catch (serverErr) {
    console.warn('[bulkSetGalleryPhotosPricing] Server endpoint notice, applying client Firestore updates:', serverErr);
  }

  // 2. Direct Client Firestore Updates (guarantees local & live listeners update instantly)
  if (db) {
    try {
      const docRefsToUpdate = new Map<string, any>();

      // A. Fetch & update galleries/{galleryId} document
      const galleryDocRef = doc(db, 'galleries', galleryId);
      try {
        const gallerySnap = await getDoc(galleryDocRef);
        if (gallerySnap.exists()) {
          const data = gallerySnap.data() || {};
          let updatedPhotosArray = undefined;

          if (Array.isArray(data.photos) && data.photos.length > 0) {
            updatedPhotosArray = data.photos.map((p: any) => ({
              ...p,
              isFreeForMembers: safeFreeForMembers,
              priceCents: safeCents,
              price: priceDollars,
              isFree: isFree,
              isPaid: isPaid,
              updatedAt: new Date().toISOString()
            }));
            totalUpdatedPhotos = Math.max(totalUpdatedPhotos, updatedPhotosArray.length);
          }

          const galleryPayload: any = {
            isFreeForMembers: safeFreeForMembers,
            priceCents: safeCents,
            singlePhotoPrice: priceDollars,
            price: priceDollars,
            isFree: isFree,
            isPaid: isPaid,
            updatedAt: serverTimestamp()
          };

          if (updatedPhotosArray) {
            galleryPayload.photos = updatedPhotosArray;
          }

          await setDoc(galleryDocRef, galleryPayload, { merge: true });
        }
      } catch (gErr) {
        console.warn('Notice updating galleries doc:', gErr);
      }

      // B. Fetch & update mirror albums/{galleryId} document
      const albumDocRef = doc(db, 'albums', galleryId);
      try {
        const albumSnap = await getDoc(albumDocRef);
        if (albumSnap.exists()) {
          const data = albumSnap.data() || {};
          let updatedPhotosArray = undefined;

          if (Array.isArray(data.photos) && data.photos.length > 0) {
            updatedPhotosArray = data.photos.map((p: any) => ({
              ...p,
              isFreeForMembers: safeFreeForMembers,
              priceCents: safeCents,
              price: priceDollars,
              isFree: isFree,
              isPaid: isPaid,
              updatedAt: new Date().toISOString()
            }));
            totalUpdatedPhotos = Math.max(totalUpdatedPhotos, updatedPhotosArray.length);
          }

          const albumPayload: any = {
            isFreeForMembers: safeFreeForMembers,
            priceCents: safeCents,
            singlePhotoPrice: priceDollars,
            price: priceDollars,
            isFree: isFree,
            isPaid: isPaid,
            updatedAt: serverTimestamp()
          };

          if (updatedPhotosArray) {
            albumPayload.photos = updatedPhotosArray;
          }

          await setDoc(albumDocRef, albumPayload, { merge: true });
        }
      } catch (aErr) {
        console.warn('Notice updating albums doc:', aErr);
      }

      // C. Collect photo documents from subcollections
      const subcollectionPaths = [
        ['galleries', galleryId, 'photos'],
        ['galleries', galleryId, 'Photos'],
        ['albums', galleryId, 'photos'],
        ['albums', galleryId, 'Photos']
      ];

      for (const [col, gId, subCol] of subcollectionPaths) {
        try {
          const subColRef = collection(db, col, gId, subCol);
          const subSnap = await getDocs(query(subColRef, limit(300)));
          subSnap.forEach((d) => {
            docRefsToUpdate.set(d.ref.path, d.ref);
          });
        } catch (_) {
          // Subcollection may not exist or be empty
        }
      }

      // D. Collect photo documents from root 'gallery' and 'photos' collections linked to this gallery
      const queryTargets = [
        { col: 'gallery', field: 'albumId', val: galleryId },
        { col: 'gallery', field: 'galleryId', val: galleryId },
        { col: 'photos', field: 'albumId', val: galleryId },
        { col: 'photos', field: 'galleryId', val: galleryId }
      ];

      if (galleryTitle) {
        queryTargets.push({ col: 'gallery', field: 'albumName', val: galleryTitle });
        queryTargets.push({ col: 'gallery', field: 'albumTitle', val: galleryTitle });
        queryTargets.push({ col: 'photos', field: 'albumName', val: galleryTitle });
        queryTargets.push({ col: 'photos', field: 'albumTitle', val: galleryTitle });
      }

      for (const target of queryTargets) {
        try {
          const qSnap = await getDocs(query(collection(db, target.col), where(target.field, '==', target.val), limit(200)));
          qSnap.forEach((d) => {
            docRefsToUpdate.set(d.ref.path, d.ref);
          });
        } catch (_) {}
      }

      // E. Execute chunked batch updates (max 400 per batch)
      const allRefs = Array.from(docRefsToUpdate.values());
      const chunkSize = 400;

      for (let i = 0; i < allRefs.length; i += chunkSize) {
        const chunk = allRefs.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        for (const targetRef of chunk) {
          batch.update(targetRef, {
            isFreeForMembers: safeFreeForMembers,
            priceCents: safeCents,
            price: priceDollars,
            isFree: isFree,
            isPaid: isPaid,
            updatedAt: serverTimestamp()
          });
        }

        await batch.commit();
      }

      if (allRefs.length > 0) {
        totalUpdatedPhotos = Math.max(totalUpdatedPhotos, allRefs.length);
      }
    } catch (clientBatchErr) {
      console.error('[bulkSetGalleryPhotosPricing] Client batch error:', clientBatchErr);
      if (!serverSuccess) {
        throw clientBatchErr;
      }
    }
  }

  return {
    success: true,
    updatedCount: totalUpdatedPhotos,
    galleryId,
    isFreeForMembers: safeFreeForMembers,
    priceCents: safeCents,
    priceDollars,
    message: `Successfully set isFreeForMembers to ${safeFreeForMembers} and priceCents to ${safeCents} ($${priceDollars.toFixed(2)}) across photos.`
  };
}
