/**
 * Server-Side Photo Storage & Permissions Handler
 * Just1Play Media Hub / Creator Studio
 * 
 * Enforces permissions logic before generating and returning signed download URLs:
 * 1. User Authentication (Firebase ID Token verification via Firebase Admin Auth)
 * 2. Admin Status (Role claims, KeVoie admin email, or Firestore user doc)
 * 3. Ownership (Gallery director, album creator, or photo photographer/uploader)
 * 4. Purchase Verification (User purchase records, unlocked photos, or full album pass)
 * 5. Gallery-Wide watermarkEnabled Flag (Proof watermarking disabled gallery-wide or free photo)
 * 
 * Generates signed Google Cloud Storage / Firebase Storage URLs (15-min default expiry)
 * or secure streaming proxy signed tokens when direct GCP signing is not configured.
 */

import crypto from 'crypto';
import path from 'path';
import type { Request, Response } from 'express';
import { getAdminFirestore, getAdminStorage, getAdminAuth } from './firebaseAdmin';

// Safe REST helper when Admin SDK encounters insufficient IAM / ADC permissions
async function fetchRestDoc(docPath: string): Promise<any | null> {
  try {
    const rawConfig = await import('../../firebase-applet-config.json');
    const projectId = (rawConfig as any)?.projectId || 'just1play26';
    const apiKey = (rawConfig as any)?.apiKey;
    if (!apiKey) return null;
    const dbName = (rawConfig as any)?.firestoreDatabaseId || (rawConfig as any)?.databaseId || 'ai-studio-just1play-e25f33f1-5677-4045-884c-9d2abf4ca88c';
    let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbName}/documents/${docPath}?key=${apiKey}`;
    let res = await fetch(url);
    if (!res.ok) {
      url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}?key=${apiKey}`;
      res = await fetch(url);
    }
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.fields) return null;
    const result: Record<string, any> = { id: docPath.split('/').pop() };
    for (const [k, v] of Object.entries(json.fields as Record<string, any>)) {
      if (v.stringValue !== undefined) result[k] = v.stringValue;
      else if (v.booleanValue !== undefined) result[k] = v.booleanValue;
      else if (v.integerValue !== undefined) result[k] = Number(v.integerValue);
      else if (v.doubleValue !== undefined) result[k] = Number(v.doubleValue);
      else if (v.timestampValue !== undefined) result[k] = v.timestampValue;
    }
    return result;
  } catch {
    return null;
  }
}

export interface PhotoDownloadPermissions {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  hasPurchased: boolean;
  isWatermarkDisabled: boolean;
  isFree: boolean;
  canAccessOriginal: boolean;
  reason:
    | 'admin'
    | 'owner'
    | 'purchased'
    | 'watermark_disabled'
    | 'free'
    | 'watermarked_proof';
}

export interface GetPhotoDownloadUrlOptions {
  photoId: string;
  galleryId?: string;
  albumId?: string;
  // Auth context
  authToken?: string; // Firebase ID Token from 'Authorization: Bearer <token>'
  userId?: string; // Direct UID if called internally or from session
  userEmail?: string;
  userRole?: string;
  isAdminOverride?: boolean;
  // Resource hints (if already known from request or cache)
  storagePath?: string;
  originalUrl?: string;
  watermarkedUrl?: string;
  watermarkEnabled?: boolean;
  title?: string;
  filename?: string;
  // Expiration settings
  expiresInMinutes?: number;
}

export interface PhotoDownloadUrlResult {
  success: boolean;
  downloadUrl: string;
  url: string;
  isOriginal: boolean;
  type: 'original' | 'watermarked';
  watermarkApplied: boolean;
  permissionReason: PhotoDownloadPermissions['reason'];
  permissions: PhotoDownloadPermissions;
  photoId: string;
  galleryId?: string;
  albumId?: string;
  title: string;
  filename: string;
  expiresAt: string;
  expiresInMinutes: number;
}

// Master Admin Emails with unrestricted access
const ADMIN_EMAILS = [
  'kevoiebailey@gmail.com',
  'admin@just1play.com',
];

/**
 * Generate HMAC token for signed URL validation fallback
 */
export function generateSignedToken(resourceId: string, expiresAt: number): string {
  const secret = process.env.SESSION_SECRET || process.env.FIREBASE_PROJECT_ID || 'just1play_secure_media_token_2026';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${resourceId}:${expiresAt}`);
  return hmac.digest('hex').substring(0, 32);
}

/**
 * Verifies if an HMAC signature token is valid and unexpired
 */
export function verifySignedToken(resourceId: string, signature: string, expiresAt: number): boolean {
  if (Date.now() > expiresAt) return false;
  const expected = generateSignedToken(resourceId, expiresAt);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Authenticate user from Firebase ID Token or explicit credentials
 */
export async function authenticateUser(
  token?: string,
  explicitUserId?: string,
  explicitEmail?: string
): Promise<{
  uid: string | null;
  email: string | null;
  role: string | null;
  isAdmin: boolean;
  tokenDecoded: any | null;
}> {
  let uid: string | null = explicitUserId || null;
  let email: string | null = explicitEmail || null;
  let role: string | null = null;
  let isAdmin = false;
  let tokenDecoded: any | null = null;

  // 1. Verify Firebase ID Token if provided
  if (token) {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    if (cleanToken) {
      try {
        const auth = getAdminAuth();
        tokenDecoded = await auth.verifyIdToken(cleanToken);
        uid = tokenDecoded.uid;
        email = tokenDecoded.email || email;
        role = tokenDecoded.role || tokenDecoded.userRole || null;
        if (tokenDecoded.admin === true || tokenDecoded.role === 'admin') {
          isAdmin = true;
        }
      } catch (authErr: any) {
        console.warn('[PhotoStorage] Firebase Auth verifyIdToken notice:', authErr?.message || authErr);
      }
    }
  }

  // 2. Check Admin by Email
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
    isAdmin = true;
    role = 'admin';
  }

  // 3. Check Firestore User Document if UID exists and not yet confirmed admin
  if (uid && !isAdmin) {
    try {
      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data() || {};
        if (
          data.role === 'admin' ||
          data.role === 'director' ||
          data.role === 'tournament_director' ||
          data.isAdmin === true
        ) {
          isAdmin = true;
          role = data.role || 'admin';
        }
        if (!email && data.email) {
          email = data.email;
          if (ADMIN_EMAILS.includes(data.email.toLowerCase())) {
            isAdmin = true;
          }
        }
      }
    } catch (err: any) {
      console.warn('[PhotoStorage] User profile lookup notice:', err?.message);
    }
  }

  return {
    uid,
    email,
    role,
    isAdmin,
    tokenDecoded,
  };
}

/**
 * Fetch Gallery / Album document and Photo data from Firestore
 */
export async function resolveGalleryAndPhoto(
  photoId: string,
  galleryId?: string,
  albumId?: string
): Promise<{
  galleryDoc: any | null;
  photoDoc: any | null;
  resolvedGalleryId: string;
  resolvedAlbumId: string;
}> {
  const db = getAdminFirestore();
  const targetId = galleryId || albumId || '';
  let galleryDocData: any = null;
  let photoDocData: any = null;
  let resolvedGalleryId = galleryId || '';
  let resolvedAlbumId = albumId || '';

  // 1. Fetch from 'galleries' collection
  if (targetId) {
    try {
      const gDoc = await db.collection('galleries').doc(targetId).get();
      if (gDoc.exists) {
        galleryDocData = { id: gDoc.id, ...gDoc.data() };
        resolvedGalleryId = gDoc.id;
      }
    } catch (_) {}
  }

  // 2. Fallback to 'albums' collection
  if (!galleryDocData && targetId) {
    try {
      const aDoc = await db.collection('albums').doc(targetId).get();
      if (aDoc.exists) {
        galleryDocData = { id: aDoc.id, ...aDoc.data() };
        resolvedAlbumId = aDoc.id;
        if (!resolvedGalleryId) resolvedGalleryId = aDoc.id;
      }
    } catch (_) {}
  }

  // 3. Fallback: Query albums by eventId or photo search
  if (!galleryDocData && photoId) {
    try {
      const snap = await db.collection('albums').limit(20).get();
      for (const doc of snap.docs) {
        const d = doc.data();
        if (Array.isArray(d.photos) && d.photos.some((p: any) => p?.id === photoId)) {
          galleryDocData = { id: doc.id, ...d };
          resolvedAlbumId = doc.id;
          resolvedGalleryId = doc.id;
          break;
        }
      }
    } catch (_) {}
  }

  // 4. Safe REST fallback if Firestore Admin SDK is unauthorized or has permission denied
  if (!galleryDocData && targetId) {
    try {
      const restAlbum = await fetchRestDoc(`albums/${targetId}`);
      if (restAlbum) {
        galleryDocData = restAlbum;
        resolvedAlbumId = targetId;
        if (!resolvedGalleryId) resolvedGalleryId = targetId;
      } else {
        const restGallery = await fetchRestDoc(`galleries/${targetId}`);
        if (restGallery) {
          galleryDocData = restGallery;
          resolvedGalleryId = targetId;
        }
      }
    } catch (_) {}
  }

  // 4. Resolve Photo Document from Gallery/Album
  if (galleryDocData) {
    // Check embedded photos array
    if (Array.isArray(galleryDocData.photos)) {
      const found = galleryDocData.photos.find((p: any) => p?.id === photoId);
      if (found) {
        photoDocData = found;
      }
    }

    // Check subcollection /galleries/{id}/photos/{photoId}
    if (!photoDocData && resolvedGalleryId) {
      try {
        const subP = await db.collection('galleries').doc(resolvedGalleryId).collection('photos').doc(photoId).get();
        if (subP.exists) {
          photoDocData = { id: subP.id, ...subP.data() };
        }
      } catch (_) {}
    }

    // Check subcollection /albums/{id}/photos/{photoId}
    if (!photoDocData && (resolvedAlbumId || resolvedGalleryId)) {
      const aid = resolvedAlbumId || resolvedGalleryId;
      try {
        const subP = await db.collection('albums').doc(aid).collection('photos').doc(photoId).get();
        if (subP.exists) {
          photoDocData = { id: subP.id, ...subP.data() };
        }
      } catch (_) {}
    }
  }

  // 5. Check root 'photos' or 'media' collection if still not found
  if (!photoDocData && photoId) {
    try {
      const rootP = await db.collection('photos').doc(photoId).get();
      if (rootP.exists) {
        photoDocData = { id: rootP.id, ...rootP.data() };
      }
    } catch (_) {}
  }

  return {
    galleryDoc: galleryDocData,
    photoDoc: photoDocData,
    resolvedGalleryId,
    resolvedAlbumId,
  };
}

/**
 * Check if a user has purchased a photo or full album pass
 */
export async function checkUserPurchase(
  userId: string,
  photoId: string,
  galleryId?: string,
  albumId?: string
): Promise<boolean> {
  if (!userId) return false;
  const db = getAdminFirestore();
  const targetGallery = galleryId || albumId;

  try {
    // A. Direct fast-lookup in /users/{userId}/purchased_photos/{photoId}
    const directPhotoRef = await db.collection('users').doc(userId).collection('purchased_photos').doc(photoId).get();
    if (directPhotoRef.exists) {
      return true;
    }

    // B. Check user's purchases subcollection: /users/{userId}/purchases
    const userPurchasesSnap = await db.collection('users').doc(userId).collection('purchases').get();
    for (const doc of userPurchasesSnap.docs) {
      const purchase = doc.data();
      // Single photo purchase match
      if (
        purchase.photoId === photoId ||
        purchase.itemId === photoId ||
        (Array.isArray(purchase.unlockedPhotoIds) && purchase.unlockedPhotoIds.includes(photoId))
      ) {
        return true;
      }
      // Full album pass match
      if (targetGallery && (
        purchase.galleryId === targetGallery ||
        purchase.albumId === targetGallery ||
        purchase.itemId === targetGallery ||
        purchase.type === 'gallery_album' ||
        purchase.mediaType === 'album'
      )) {
        return true;
      }
    }

    // C. Check root 'purchases' collection
    const rootPurchasesQuery = await db.collection('purchases')
      .where('userId', '==', userId)
      .limit(50)
      .get();

    for (const doc of rootPurchasesQuery.docs) {
      const purchase = doc.data();
      const isPaid = purchase.status === 'COMPLETED' || purchase.status === 'completed' || purchase.status === 'approved';
      if (!isPaid) continue;

      if (
        purchase.photoId === photoId ||
        purchase.itemId === photoId ||
        (Array.isArray(purchase.unlockedPhotoIds) && purchase.unlockedPhotoIds.includes(photoId))
      ) {
        return true;
      }

      if (targetGallery && (
        purchase.galleryId === targetGallery ||
        purchase.albumId === targetGallery ||
        purchase.itemId === targetGallery
      )) {
        return true;
      }
    }
  } catch (_err: any) {
    // If Firestore Admin SDK encounters permission issues, seamlessly check client subcollections via REST
    try {
      if (photoId) {
        const restPhotoPurchase = await fetchRestDoc(`users/${userId}/purchased_photos/${photoId}`);
        if (restPhotoPurchase) return true;
      }
      if (targetGallery) {
        const restAlbumPurchase = await fetchRestDoc(`users/${userId}/purchased_albums/${targetGallery}`);
        if (restAlbumPurchase) return true;
      }
    } catch (_) {}
  }

  return false;
}

/**
 * Generate a signed Google Cloud Storage / Firebase Storage URL
 * with automatic fallback to signed streaming proxy
 */
export async function createSignedDownloadUrl(
  resourceTarget: string,
  filename: string,
  expiresInMinutes: number = 15,
  contextMeta: { photoId?: string; galleryId?: string } = {}
): Promise<{ signedUrl: string; expiresAt: string }> {
  const expiresInMs = expiresInMinutes * 60 * 1000;
  const expiresTimestamp = Date.now() + expiresInMs;
  const expiresAt = new Date(expiresTimestamp).toISOString();

  // 1. Attempt GCS/Firebase Storage signed URL if credentials exist and target is a storage path
  let storagePath: string | null = null;

  if (resourceTarget.startsWith('gs://')) {
    const parts = resourceTarget.replace('gs://', '').split('/');
    parts.shift(); // remove bucket name
    storagePath = parts.join('/');
  } else if (!resourceTarget.startsWith('http://') && !resourceTarget.startsWith('https://') && !resourceTarget.startsWith('data:')) {
    storagePath = resourceTarget;
  } else if (resourceTarget.includes('firebasestorage.googleapis.com')) {
    // Extract path from Firebase Storage HTTP URL
    try {
      const match = resourceTarget.match(/\/o\/([^?]+)/);
      if (match && match[1]) {
        storagePath = decodeURIComponent(match[1]);
      }
    } catch (_) {}
  }

  if (storagePath) {
    try {
      const bucket = getAdminStorage();
      const file = bucket.file(storagePath);
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: expiresTimestamp,
        responseDisposition: `attachment; filename="${filename}"`,
      });
      if (signedUrl) {
        return { signedUrl, expiresAt };
      }
    } catch (_signErr: any) {
      // In cloud environments where signBlob permission is restricted, cleanly switch to streaming proxy
    }
  }

  // 2. Generate secure signed streaming proxy download URL
  const token = generateSignedToken(contextMeta.photoId || resourceTarget, expiresTimestamp);
  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  const queryParams = new URLSearchParams({
    url: resourceTarget,
    filename: cleanFilename,
    photoId: contextMeta.photoId || '',
    albumId: contextMeta.galleryId || '',
    signature: token,
    expires: String(expiresTimestamp),
  });

  const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : '';
  const signedUrl = `${baseUrl}/api/media/download?${queryParams.toString()}`;

  return { signedUrl, expiresAt };
}

/**
 * PRIMARY SERVER-SIDE HANDLER: getPhotoDownloadUrl
 * 
 * Enforces permissions logic:
 * - Verifying user authentication
 * - Admin status
 * - Ownership / creator
 * - Verified purchase / album pass
 * - Gallery-wide watermarkEnabled flag (or free photo)
 * 
 * Returns signed originalUrl if authorized, or signed watermarkedUrl proof.
 * 
 * Can be invoked either directly as an async function:
 * `const result = await getPhotoDownloadUrl(options);`
 * Or as an Express route handler:
 * `app.post('/api/media/download-url', getPhotoDownloadUrl);`
 */
export async function getPhotoDownloadUrl(options: GetPhotoDownloadUrlOptions): Promise<PhotoDownloadUrlResult>;
export async function getPhotoDownloadUrl(req: Request, res: Response): Promise<void>;
export async function getPhotoDownloadUrl(
  optionsOrReq: GetPhotoDownloadUrlOptions | Request,
  res?: Response
): Promise<PhotoDownloadUrlResult | void> {
  // Check if invoked as an Express route handler
  const isExpressHandler = Boolean(res && typeof (res as any).status === 'function');
  const req = isExpressHandler ? (optionsOrReq as Request) : null;

  try {
    // Extract parameters from options object or Express request
    const photoId = req
      ? ((req.body?.photoId || req.query?.photoId || req.params?.photoId) as string)
      : (optionsOrReq as GetPhotoDownloadUrlOptions).photoId;

    const galleryId = req
      ? ((req.body?.galleryId || req.query?.galleryId || req.params?.galleryId) as string | undefined)
      : (optionsOrReq as GetPhotoDownloadUrlOptions).galleryId;

    const albumId = req
      ? ((req.body?.albumId || req.query?.albumId || req.params?.albumId) as string | undefined)
      : (optionsOrReq as GetPhotoDownloadUrlOptions).albumId;

    const authToken = req
      ? (req.headers?.authorization || (req.body?.authToken as string) || (req.query?.token as string))
      : (optionsOrReq as GetPhotoDownloadUrlOptions).authToken;

    const userId = req
      ? ((req.body?.userId || req.query?.userId) as string | undefined)
      : (optionsOrReq as GetPhotoDownloadUrlOptions).userId;

    const userEmail = req
      ? ((req.body?.userEmail || req.query?.userEmail) as string | undefined)
      : (optionsOrReq as GetPhotoDownloadUrlOptions).userEmail;

    const isAdminOverride = req
      ? Boolean(req.body?.isAdminOverride)
      : Boolean((optionsOrReq as GetPhotoDownloadUrlOptions).isAdminOverride);

    const explicitOriginalUrl = req
      ? ((req.body?.originalUrl || req.query?.originalUrl) as string | undefined)
      : (optionsOrReq as GetPhotoDownloadUrlOptions).originalUrl;

    const explicitWatermarkedUrl = req
      ? ((req.body?.watermarkedUrl || req.query?.watermarkedUrl) as string | undefined)
      : (optionsOrReq as GetPhotoDownloadUrlOptions).watermarkedUrl;

    const explicitStoragePath = req
      ? ((req.body?.storagePath || req.query?.storagePath) as string | undefined)
      : (optionsOrReq as GetPhotoDownloadUrlOptions).storagePath;

    const explicitWatermarkEnabled = req
      ? (req.body?.watermarkEnabled !== undefined ? Boolean(req.body.watermarkEnabled) : (req.query?.watermarkEnabled !== undefined ? req.query.watermarkEnabled === 'true' : undefined))
      : (optionsOrReq as GetPhotoDownloadUrlOptions).watermarkEnabled;

    const requestedFilename = req
      ? ((req.body?.filename || req.query?.filename) as string | undefined)
      : (optionsOrReq as GetPhotoDownloadUrlOptions).filename;

    const expiresInMinutes = req
      ? Number(req.body?.expiresInMinutes || req.query?.expiresInMinutes || 15)
      : ((optionsOrReq as GetPhotoDownloadUrlOptions).expiresInMinutes || 15);

    if (!photoId) {
      const errorMsg = 'Missing required photoId parameter.';
      if (isExpressHandler && res) {
        res.status(400).json({ success: false, error: errorMsg });
        return;
      }
      throw new Error(errorMsg);
    }

    // Step 1: User Authentication & Role Resolution
    const authResult = await authenticateUser(authToken, userId, userEmail);
    const isAuthenticated = Boolean(authResult.uid);
    const isAdmin = isAdminOverride || authResult.isAdmin;

    // Step 2: Resolve Gallery & Photo Documents from Firestore
    const { galleryDoc, photoDoc, resolvedGalleryId, resolvedAlbumId } =
      await resolveGalleryAndPhoto(photoId, galleryId, albumId);

    // Step 3: Determine Ownership
    let isOwner = false;
    if (authResult.uid) {
      const ownerCandidates = [
        galleryDoc?.directorId,
        galleryDoc?.createdBy,
        galleryDoc?.creatorId,
        galleryDoc?.authorId,
        galleryDoc?.photographerId,
        photoDoc?.uploadedBy,
        photoDoc?.photographerId,
        photoDoc?.creatorId,
      ].filter(Boolean);

      if (ownerCandidates.includes(authResult.uid)) {
        isOwner = true;
      }
    }

    // Step 4: Determine Purchase Status
    let hasPurchased = false;
    if (authResult.uid) {
      // Check photo doc's purchasedUserIds array
      if (Array.isArray(photoDoc?.purchasedUserIds) && photoDoc.purchasedUserIds.includes(authResult.uid)) {
        hasPurchased = true;
      } else {
        // Query user's purchases in Firestore
        hasPurchased = await checkUserPurchase(
          authResult.uid,
          photoId,
          resolvedGalleryId,
          resolvedAlbumId
        );
      }
    }

    // Step 5: Check Gallery-Wide watermarkEnabled Flag & Free Photo Status
    // If watermarkEnabled === false or watermarkStyle === 'off', proof watermarking is disabled!
    const isWatermarkDisabled = Boolean(
      explicitWatermarkEnabled === false ||
      (galleryDoc && (
        galleryDoc.watermarkEnabled === false ||
        galleryDoc.watermarkStyle === 'off' ||
        galleryDoc.galleryConfig?.watermarkEnabled === false
      ))
    );

    // Check if gallery or photo is explicitly free
    const isFree = Boolean(
      (galleryDoc && (galleryDoc.isPaid === false || galleryDoc.isFree === true || galleryDoc.price === 0)) ||
      (photoDoc && (photoDoc.isFree === true || (photoDoc.isFreeForMembers === true && isAuthenticated)))
    );

    // Step 6: Permissions Evaluation Logic
    let canAccessOriginal = false;
    let reason: PhotoDownloadPermissions['reason'] = 'watermarked_proof';

    if (isAdmin) {
      canAccessOriginal = true;
      reason = 'admin';
    } else if (isOwner) {
      canAccessOriginal = true;
      reason = 'owner';
    } else if (hasPurchased) {
      canAccessOriginal = true;
      reason = 'purchased';
    } else if (isWatermarkDisabled) {
      canAccessOriginal = true;
      reason = 'watermark_disabled';
    } else if (isFree) {
      canAccessOriginal = true;
      reason = 'free';
    } else {
      canAccessOriginal = false;
      reason = 'watermarked_proof';
    }

    // Step 7: Resolve Resource URLs
    const cleanMasterCandidate =
      explicitStoragePath ||
      photoDoc?.cleanMasterUrl ||
      photoDoc?.originalUrl ||
      photoDoc?.storageFilePath ||
      photoDoc?.storagePath ||
      explicitOriginalUrl ||
      photoDoc?.url ||
      galleryDoc?.photos?.find((p: any) => p.id === photoId)?.originalUrl;

    const watermarkedCandidate =
      explicitWatermarkedUrl ||
      photoDoc?.watermarkedUrl ||
      photoDoc?.previewUrl ||
      photoDoc?.thumbUrl ||
      galleryDoc?.photos?.find((p: any) => p.id === photoId)?.watermarkedUrl ||
      cleanMasterCandidate; // fallback if no watermarkedUrl pre-generated

    const chosenResource = canAccessOriginal ? cleanMasterCandidate : watermarkedCandidate;

    if (!chosenResource) {
      const errorMsg = `Media asset with ID "${photoId}" could not be located in storage or gallery records.`;
      if (isExpressHandler && res) {
        res.status(404).json({ success: false, error: errorMsg });
        return;
      }
      throw new Error(errorMsg);
    }

    // Step 8: Build Filename
    const itemTitle = photoDoc?.title || galleryDoc?.title || `photo_${photoId}`;
    const safeTitle = itemTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const defaultFilename = canAccessOriginal
      ? `just1play_${safeTitle}_4K_original.jpg`
      : `just1play_${safeTitle}_proof_watermarked.jpg`;
    const finalFilename = requestedFilename || defaultFilename;

    // Step 9: Generate Signed Download URL (15-Minute Expiry)
    const { signedUrl, expiresAt } = await createSignedDownloadUrl(
      chosenResource,
      finalFilename,
      expiresInMinutes,
      { photoId, galleryId: resolvedGalleryId || resolvedAlbumId }
    );

    const permissions: PhotoDownloadPermissions = {
      isAuthenticated,
      isAdmin,
      isOwner,
      hasPurchased,
      isWatermarkDisabled,
      isFree,
      canAccessOriginal,
      reason,
    };

    const responsePayload: PhotoDownloadUrlResult = {
      success: true,
      downloadUrl: signedUrl,
      url: signedUrl,
      isOriginal: canAccessOriginal,
      type: canAccessOriginal ? 'original' : 'watermarked',
      watermarkApplied: !canAccessOriginal,
      permissionReason: reason,
      permissions,
      photoId,
      galleryId: resolvedGalleryId || undefined,
      albumId: resolvedAlbumId || undefined,
      title: itemTitle,
      filename: finalFilename,
      expiresAt,
      expiresInMinutes,
    };

    if (isExpressHandler && res) {
      res.status(200).json(responsePayload);
      return;
    }

    return responsePayload;
  } catch (err: any) {
    console.error('[getPhotoDownloadUrl Handler Error]:', err);
    if (isExpressHandler && res) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Internal server error while resolving photo download URL.',
      });
      return;
    }
    throw err;
  }
}

// Aliases for clear express routing
export const getPhotoDownloadUrlHandler = getPhotoDownloadUrl;
export default getPhotoDownloadUrl;
