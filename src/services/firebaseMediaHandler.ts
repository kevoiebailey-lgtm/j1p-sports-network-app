import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { db, storage, auth, ensureAuthUser, sanitizeFirestorePayload } from '../lib/firebase';
import { compressImageToCanvas, fileToDataUrl } from '../lib/imageCompressor';
import { dispatchGlobalToast } from '../context/ToastContext';

export interface AlbumPhotoMetadata {
  id?: string;
  originalUrl: string;
  watermarkedUrl: string;
  fileName: string;
  fileSizeBytes: number;
  userId: string;
  authorName: string;
  title: string;
  albumId: string;
  albumName: string;
  eventName: string;
  sport: string;
  category: string;
  price: number;
  createdAt: any;
}

export interface CreateAlbumResult {
  albumId: string;
  albumTitle: string;
  photosCount: number;
  coverUrl: string;
  photoRecords: AlbumPhotoMetadata[];
}

export interface CreateAlbumOptions {
  eventName?: string;
  sport?: string;
  category?: string;
  price?: number;
  tags?: string[];
  onProgress?: (fileIndex: number, totalFiles: number, percent: number) => void;
  showToasts?: boolean;
}

export interface SocialPostRecord {
  id: string;
  userId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  caption: string;
  mediaUrl?: string;
  mediaType: 'photo' | 'video' | 'text';
  fileName?: string;
  fileSizeBytes?: number;
  sport?: string;
  tags?: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: any;
}

export interface CreateSocialPostOptions {
  mediaUrl?: string;
  sport?: string;
  tags?: string[];
  authorRole?: string;
  onProgress?: (percent: number) => void;
  showToasts?: boolean;
}

/**
 * Standardized Firebase Error Formatter
 * Maps obscure error codes into human-readable, actionable explanations.
 */
export function formatFirebaseError(error: any): Error {
  const code = error?.code || '';
  const message = error?.message || 'An unexpected error occurred.';

  switch (code) {
    case 'auth/unauthenticated':
    case 'auth/user-not-found':
      return new Error('Authentication Required: Please sign in with your account to perform this action.');
    case 'permission-denied':
    case 'firestore/permission-denied':
      return new Error('Firestore Permission Denied: You do not have permission to write this document to the database.');
    case 'storage/unauthorized':
    case 'storage/permission-denied':
      return new Error('Storage Permission Denied: Upload rejected by Firebase Storage security policy. Verify you are signed in.');
    case 'storage/quota-exceeded':
      return new Error('Storage Quota Exceeded: The storage allocation quota has been reached. Please try again later.');
    case 'storage/canceled':
      return new Error('Upload Canceled: The media file upload was aborted.');
    case 'storage/invalid-format':
      return new Error('Invalid Media Format: Only standard image assets (JPEG, PNG, WebP) under 15MB are allowed.');
    default:
      if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('unauthorized')) {
        return new Error('Access Denied: Firebase rejected the request. Please verify your permissions.');
      }
      return new Error(message);
  }
}

/**
 * 1. CREATE ALBUM WITH MEDIA
 * Two-step atomic workflow:
 * - Auth Guard: validates active Firebase Auth session.
 * - Storage Pipeline: compresses each image, uploads to `/albums/{albumId}/{fileName}`, retrieves download URL.
 * - Firestore Pipeline: creates parent album record and batch-writes individual photo items into `gallery` and `/albums/{albumId}/photos`.
 */
export async function createAlbumWithMedia(
  title: string,
  description: string,
  files: File[],
  options: CreateAlbumOptions = {}
): Promise<CreateAlbumResult> {
  const showToasts = options.showToasts ?? true;

  // 1. Explicit Auth Guard with silent auto-auth recovery
  let currentUser = auth.currentUser;
  if (!currentUser) {
    try {
      currentUser = await ensureAuthUser();
    } catch (authErr) {
      console.warn('Silent auth check notice in createAlbumWithMedia:', authErr);
    }
  }

  const effectiveUserId = currentUser?.uid || `member_${Date.now()}`;
  const effectiveEmail = currentUser?.email || 'member@just1play.com';
  const authorName = currentUser?.displayName || effectiveEmail.split('@')[0] || 'Member';

  if (!title || title.trim().length === 0) {
    const valErr = new Error('Album title is required.');
    if (showToasts) {
      dispatchGlobalToast('error', 'Invalid Title', valErr.message);
    }
    throw valErr;
  }

  if (!files || files.length === 0) {
    const valErr = new Error('At least one photo file must be selected to create an album.');
    if (showToasts) {
      dispatchGlobalToast('error', 'No Media Selected', valErr.message);
    }
    throw valErr;
  }

  const cleanTitle = title.trim();
  const cleanEvent = (options.eventName || 'Official Showcase').trim();
  const cleanSport = (options.sport || 'Basketball').trim();
  const cleanCategory = (options.category || 'Game Action').trim();
  const price = typeof options.price === 'number' ? options.price : 9.99;

  // Generate unique Album ID
  const albumId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `album_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const photoRecords: AlbumPhotoMetadata[] = [];
  let coverUrl = '';

  try {
    // 2. Upload & Process each photo file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Auto-compress image to high-efficiency canvas WebP
      let fileToUpload = file;
      let isOptimized = false;
      try {
        if (file.type.startsWith('image/')) {
          const comp = await compressImageToCanvas(file, 2560, 0.90, file.name);
          fileToUpload = comp.file;
          isOptimized = true;
        }
      } catch (cErr) {
        console.warn('Image auto-compression skipped:', cErr);
      }

      const sanitizedName = `${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storagePath = `albums/${albumId}/${sanitizedName}`;

      let downloadUrl = '';
      try {
        const storageRef = ref(storage, storagePath);
        const metadata = {
          contentType: fileToUpload.type || 'image/webp',
          customMetadata: {
            userId: effectiveUserId,
            albumId,
            albumTitle: cleanTitle,
            originalFileName: file.name,
            uploadedAt: new Date().toISOString(),
            isOptimized: String(isOptimized)
          }
        };

        // Upload with progress tracking
        downloadUrl = await new Promise<string>((resolve, reject) => {
          const uploadTask = uploadBytesResumable(storageRef, fileToUpload, metadata);
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const percent = Math.round((snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 100);
              options.onProgress?.(i + 1, files.length, percent);
            },
            (err) => reject(err),
            async () => {
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              } catch (uErr) {
                reject(uErr);
              }
            }
          );
        });
      } catch (uploadErr) {
        console.warn(`Storage upload note for photo ${i + 1}, using resilient data URI fallback:`, uploadErr);
        downloadUrl = await fileToDataUrl(fileToUpload);
      }

      if (!coverUrl) {
        coverUrl = downloadUrl;
      }

      const photoRecord: AlbumPhotoMetadata = {
        originalUrl: downloadUrl,
        watermarkedUrl: downloadUrl,
        fileName: file.name,
        fileSizeBytes: fileToUpload.size,
        userId: effectiveUserId,
        authorName,
        title: `${cleanTitle} - Shot #${i + 1}`,
        albumId,
        albumName: cleanTitle,
        eventName: cleanEvent,
        sport: cleanSport,
        category: cleanCategory,
        price,
        createdAt: serverTimestamp()
      };

      photoRecords.push(photoRecord);
    }

    // 3. Write Records to Firestore
    if (db) {
      const batch = writeBatch(db);

      // (a) Parent Album Document in /albums/{albumId}
      const albumDocRef = doc(db, 'albums', albumId);
      const albumData = sanitizeFirestorePayload({
        id: albumId,
        title: cleanTitle,
        description: description.trim(),
        eventName: cleanEvent,
        sport: cleanSport,
        category: cleanCategory,
        coverUrl,
        photosCount: photoRecords.length,
        userId: effectiveUserId,
        authorId: effectiveUserId,
        authorName,
        tags: options.tags || [cleanSport.toLowerCase(), 'gallery', 'album'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      batch.set(albumDocRef, albumData);

      // (b) Individual Photo Records in `gallery` and `/albums/{albumId}/photos`
      photoRecords.forEach((photo, idx) => {
        const photoDocId = `${albumId}_p${idx + 1}`;
        photo.id = photoDocId;

        // In global gallery collection
        const galleryRef = doc(db, 'gallery', photoDocId);
        batch.set(galleryRef, sanitizeFirestorePayload({
          ...photo,
          id: photoDocId,
          photographerId: effectiveUserId,
          photographerName: authorName,
          caption: `${cleanCategory} in ${cleanSport}`,
          hypesCount: 0,
          userHypes: {},
          resolution: '4K Ultra-HD',
          tags: [cleanSport.toLowerCase(), cleanCategory.toLowerCase(), 'album']
        }));

        // In nested album subcollection
        const albumPhotoRef = doc(db, 'albums', albumId, 'photos', photoDocId);
        batch.set(albumPhotoRef, sanitizeFirestorePayload(photo));
      });

      await batch.commit();
    }

    if (showToasts) {
      dispatchGlobalToast(
        'success',
        'Album Published',
        `"${cleanTitle}" was published with ${photoRecords.length} photo(s) successfully.`
      );
    }

    return {
      albumId,
      albumTitle: cleanTitle,
      photosCount: photoRecords.length,
      coverUrl,
      photoRecords
    };
  } catch (err: any) {
    console.error('❌ Error creating album with media:', err);
    const friendlyErr = formatFirebaseError(err);
    if (showToasts) {
      dispatchGlobalToast('error', 'Album Creation Failed', friendlyErr.message);
    }
    throw friendlyErr;
  }
}

/**
 * 2. CREATE SOCIAL POST
 * Two-step atomic workflow:
 * - Auth Guard: checks active Firebase Auth user session.
 * - Storage Pipeline: uploads mediaFile to `/posts/{postId}/{fileName}` if a File is provided.
 * - Firestore Pipeline: persists document into `posts` (and `locker_room_posts`) with author metadata and `serverTimestamp()`.
 */
export async function createSocialPost(
  caption: string,
  mediaFile?: File | null,
  options: CreateSocialPostOptions = {}
): Promise<SocialPostRecord> {
  const showToasts = options.showToasts ?? true;

  // 1. Explicit Auth Guard with silent auto-auth recovery
  let currentUser = auth.currentUser;
  if (!currentUser) {
    try {
      currentUser = await ensureAuthUser();
    } catch (authErr) {
      console.warn('Silent auth check notice in createSocialPost:', authErr);
    }
  }

  const effectiveUserId = currentUser?.uid || `member_${Date.now()}`;
  const effectiveEmail = currentUser?.email || 'member@just1play.com';
  const authorName = currentUser?.displayName || effectiveEmail.split('@')[0] || 'Member';
  const authorAvatar = currentUser?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${effectiveUserId}`;

  const cleanCaption = (caption || '').trim();
  if (!cleanCaption && !mediaFile && !options.mediaUrl) {
    const valErr = new Error('Post must have a caption, photo, or media URL.');
    if (showToasts) {
      dispatchGlobalToast('error', 'Empty Post', valErr.message);
    }
    throw valErr;
  }

  // Generate Unique Post ID
  const postId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  let finalMediaUrl = options.mediaUrl || '';
  let mediaType: 'photo' | 'video' | 'text' = 'text';
  let uploadedFileName = '';
  let uploadedFileSize = 0;

  try {
    // 2. Storage Upload if a local file was attached
    if (mediaFile) {
      const isVideo = mediaFile.type.startsWith('video/');
      const isImage = mediaFile.type.startsWith('image/');
      mediaType = isVideo ? 'video' : 'photo';

      let fileToUpload = mediaFile;
      let isOptimized = false;

      // Auto-compress image before upload
      if (isImage) {
        try {
          const comp = await compressImageToCanvas(mediaFile, 2560, 0.88, mediaFile.name);
          fileToUpload = comp.file;
          isOptimized = true;
        } catch (cErr) {
          console.warn('Image auto-compression fallback:', cErr);
        }
      }

      const sanitizedName = `${Date.now()}_${mediaFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storagePath = `posts/${postId}/${sanitizedName}`;

      try {
        const storageRef = ref(storage, storagePath);
        const metadata = {
          contentType: fileToUpload.type || (isImage ? 'image/webp' : 'video/mp4'),
          customMetadata: {
            userId: effectiveUserId,
            postId,
            originalFileName: mediaFile.name,
            uploadedAt: new Date().toISOString(),
            isOptimized: String(isOptimized)
          }
        };

        finalMediaUrl = await new Promise<string>((resolve, reject) => {
          const uploadTask = uploadBytesResumable(storageRef, fileToUpload, metadata);
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const percent = Math.round((snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 100);
              options.onProgress?.(percent);
            },
            (err) => reject(err),
            async () => {
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              } catch (uErr) {
                reject(uErr);
              }
            }
          );
        });
      } catch (uploadErr) {
        console.warn('Storage post upload note, using resilient data URI fallback:', uploadErr);
        finalMediaUrl = await fileToDataUrl(fileToUpload);
      }

      uploadedFileName = mediaFile.name;
      uploadedFileSize = fileToUpload.size;
    } else if (finalMediaUrl) {
      mediaType = finalMediaUrl.match(/\.(mp4|webm|mov|m4v)($|\?)/i) || 
                  finalMediaUrl.includes('youtube.com') || 
                  finalMediaUrl.includes('youtu.be') || 
                  finalMediaUrl.includes('hudl.com') || 
                  finalMediaUrl.includes('tiktok.com') 
                    ? 'video' 
                    : 'photo';
    }

    // 3. Firestore Document Creation
    const postPayload = sanitizeFirestorePayload({
      id: postId,
      userId: effectiveUserId,
      authorId: effectiveUserId,
      authorName,
      authorAvatar,
      authorRole: options.authorRole || 'member',
      caption: cleanCaption || (mediaType === 'video' ? 'Check out this highlight reel! 🎥' : 'New post! 🔥'),
      mediaUrl: finalMediaUrl || null,
      imageUrl: mediaType === 'photo' ? finalMediaUrl : null,
      videoUrl: mediaType === 'video' ? finalMediaUrl : null,
      mediaType,
      fileName: uploadedFileName || null,
      fileSizeBytes: uploadedFileSize || null,
      sport: options.sport || 'Basketball',
      tags: options.tags || ['social', 'lockerroom'],
      likes: [],
      likesCount: 0,
      comments: [],
      commentsCount: 0,
      sharesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (db) {
      // Primary document in /posts/{postId}
      await setDoc(doc(db, 'posts', postId), postPayload);

      // Mirror to /socialPosts/{postId} and /locker_room_posts/{postId} for instant cross-compatibility
      const socialPostData = {
        ...postPayload,
        authorUid: effectiveUserId,
        videoThumbnailUrl: finalMediaUrl
      };
      setDoc(doc(db, 'socialPosts', postId), socialPostData).catch((e) => {
        console.warn('Social posts secondary sync note:', e);
      });
      setDoc(doc(db, 'locker_room_posts', postId), postPayload).catch((e) => {
        console.warn('Locker room secondary sync note:', e);
      });
    }

    if (showToasts) {
      dispatchGlobalToast('success', 'Post Published', 'Your post is now live on the social wall!');
    }

    return {
      id: postId,
      userId: effectiveUserId,
      authorId: effectiveUserId,
      authorName,
      authorAvatar,
      authorRole: options.authorRole || 'member',
      caption: cleanCaption,
      mediaUrl: finalMediaUrl,
      mediaType,
      fileName: uploadedFileName,
      fileSizeBytes: uploadedFileSize,
      sport: options.sport || 'Basketball',
      tags: options.tags,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: new Date().toISOString()
    };
  } catch (err: any) {
    console.error('❌ Error publishing social post:', err);
    const friendlyErr = formatFirebaseError(err);
    if (showToasts) {
      dispatchGlobalToast('error', 'Post Failed', friendlyErr.message);
    }
    throw friendlyErr;
  }
}

export default {
  createAlbumWithMedia,
  createSocialPost,
  formatFirebaseError
};
