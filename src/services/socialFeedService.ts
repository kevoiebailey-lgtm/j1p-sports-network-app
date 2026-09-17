import { db, auth, sanitizeFirestorePayload } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  onSnapshot, 
  serverTimestamp, 
  increment,
  DocumentSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { uploadMediaAsset, STORAGE_FOLDERS } from './storageService';

export type ReactionType = 'fire' | 'applause' | 'hype' | 'respect' | 'defense' | 'heart';

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  text: string;
  createdAt: string;
  likesCount?: number;
  parentCommentId?: string; // For nested replies
}

export interface LockerRoomPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  authorHandle?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'hudl' | 'youtube' | 'none';
  embedUrl?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  tags?: string[];
  sport?: string;
  tournamentId?: string;
  reactions: {
    fire: number;
    applause: number;
    hype: number;
    respect: number;
    defense: number;
    heart: number;
  };
  userReactions?: Record<string, ReactionType>;
  commentsCount: number;
  viewsCount: number;
  isPinned?: boolean;
  isStaffPick?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Lightweight profanity filter for automated moderation
const PROFANITY_LIST = [
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'nigger', 'faggot', 'bastard', 'slut', 'whore'
];

export function filterProfanity(text: string): { cleanText: string; hasProfanity: boolean } {
  let cleanText = text;
  let hasProfanity = false;

  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(cleanText)) {
      hasProfanity = true;
      cleanText = cleanText.replace(regex, '****');
    }
  }

  return { cleanText, hasProfanity };
}

/**
 * 1. REAL-TIME SOCIAL FEED LISTENER WITH PAGINATION
 */
export function subscribeSocialFeed(
  options: {
    sport?: string;
    tag?: string;
    limitCount?: number;
  } = {},
  onUpdate: (posts: LockerRoomPost[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const pageSize = options.limitCount || 25;
    let q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (options.sport && options.sport !== 'All') {
      q = query(
        collection(db, 'posts'),
        where('sport', '==', options.sport),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const posts: LockerRoomPost[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorId: data.authorId || '',
            authorName: data.authorName || 'Just1Play Athlete',
            authorRole: data.authorRole || 'Athlete',
            authorAvatar: data.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            authorHandle: data.authorHandle || `@${(data.authorName || 'player').toLowerCase().replace(/\s+/g, '')}`,
            content: data.content || data.caption || '',
            mediaUrl: data.mediaUrl || data.imageUrl || data.videoUrl || '',
            mediaType: data.mediaType || (data.videoUrl ? 'video' : data.imageUrl ? 'image' : 'none'),
            embedUrl: data.embedUrl || '',
            sport: data.sport || 'Basketball',
            tags: data.tags || ['#Just1Play', '#Highlight'],
            reactions: {
              fire: data.reactions?.fire || data.fireCount || 0,
              applause: data.reactions?.applause || data.applauseCount || 0,
              hype: data.reactions?.hype || data.hypeCount || 0,
              respect: data.reactions?.respect || 0,
              defense: data.reactions?.defense || 0,
              heart: data.reactions?.heart || 0
            },
            commentsCount: data.commentsCount || 0,
            viewsCount: data.viewsCount || 0,
            isPinned: !!data.isPinned,
            isStaffPick: !!data.isStaffPick,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
          };
        });

        onUpdate(posts);
      },
      (err) => {
        console.warn('Social feed snapshot warning:', err);
        // Secondary fallback to locker_room_posts
        try {
          const fallbackQ = query(collection(db, 'locker_room_posts'), orderBy('createdAt', 'desc'), limit(pageSize));
          return onSnapshot(
            fallbackQ,
            (fSnap) => {
              const fPosts = fSnap.docs.map(d => ({ id: d.id, ...d.data() } as LockerRoomPost));
              onUpdate(fPosts);
            },
            (fallbackErr) => {
              console.warn('Fallback locker_room_posts snapshot warning:', fallbackErr);
              if (onError) onError(err);
            }
          );
        } catch (fErr) {
          if (onError) onError(err);
        }
      }
    );
  } catch (err: any) {
    console.error('Error starting social feed listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * 2. FETCH PAGINATED POSTS (CURSOR BASED)
 */
export async function fetchPaginatedPosts(
  lastVisibleDoc?: DocumentSnapshot,
  pageSize: number = 15
): Promise<{ posts: LockerRoomPost[]; lastDoc: DocumentSnapshot | null }> {
  if (!db) return { posts: [], lastDoc: null };

  let q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastVisibleDoc) {
    q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      startAfter(lastVisibleDoc),
      limit(pageSize)
    );
  }

  const snap = await getDocs(q);
  const posts: LockerRoomPost[] = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  } as LockerRoomPost));

  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { posts, lastDoc };
}

/**
 * 3. ATOMIC REACTION ENGINE
 */
export async function reactToPost(
  postId: string,
  reaction: ReactionType,
  userId: string = auth.currentUser?.uid || 'anon'
): Promise<void> {
  if (!db) return;

  try {
    const postRef = doc(db, 'posts', postId);
    const userReactionRef = doc(db, `posts/${postId}/reactions`, userId);

    const userReactionSnap = await getDoc(userReactionRef);

    if (userReactionSnap.exists()) {
      const prevReaction = userReactionSnap.data()?.type as ReactionType;
      if (prevReaction === reaction) {
        // Toggle OFF
        await deleteDoc(userReactionRef);
        await updateDoc(postRef, {
          [`reactions.${reaction}`]: increment(-1)
        });
        return;
      } else {
        // Switch reaction type
        await setDoc(userReactionRef, { type: reaction, updatedAt: serverTimestamp() });
        await updateDoc(postRef, {
          [`reactions.${prevReaction}`]: increment(-1),
          [`reactions.${reaction}`]: increment(1)
        });
        return;
      }
    }

    // New reaction
    await setDoc(userReactionRef, { type: reaction, createdAt: serverTimestamp() });
    await updateDoc(postRef, {
      [`reactions.${reaction}`]: increment(1)
    });
  } catch (err) {
    console.warn('Reaction update error:', err);
  }
}

/**
 * 4. REAL-TIME THREADED COMMENTS
 */
export function subscribePostComments(
  postId: string,
  onUpdate: (comments: PostComment[]) => void
): Unsubscribe {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, `posts/${postId}/comments`),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const comments = snap.docs.map(d => ({
          id: d.id,
          postId,
          ...d.data()
        } as PostComment));
        onUpdate(comments);
      },
      (err) => {
        console.warn('Post comments snapshot warning:', err);
      }
    );
  } catch (err) {
    console.error('Error attaching post comments listener:', err);
    return () => {};
  }
}

export async function addPostComment(
  postId: string,
  rawText: string,
  author: { id: string; name: string; avatar?: string; role?: string },
  parentCommentId?: string
): Promise<PostComment> {
  const { cleanText } = filterProfanity(rawText);

  const commentData: Omit<PostComment, 'id'> = {
    postId,
    authorId: author.id || auth.currentUser?.uid || 'anon',
    authorName: author.name || 'Just1Play Athlete',
    authorAvatar: author.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    authorRole: author.role || 'Athlete',
    text: cleanText,
    createdAt: new Date().toISOString(),
    likesCount: 0,
    parentCommentId: parentCommentId || undefined
  };

  if (db) {
    const docRef = await addDoc(collection(db, `posts/${postId}/comments`), sanitizeFirestorePayload(commentData));
    // Increment commentsCount on parent post
    try {
      await updateDoc(doc(db, 'posts', postId), sanitizeFirestorePayload({
        commentsCount: increment(1)
      }));
    } catch (e) {
      console.warn('Failed to increment commentsCount:', e);
    }

    return { id: docRef.id, ...commentData };
  }

  return { id: `comment_${Date.now()}`, ...commentData };
}

/**
 * 5. CREATE AND PUBLISH SOCIAL POST WITH FILE UPLOAD
 */
export async function createSocialPostWithMedia(
  postInput: {
    authorId: string;
    authorName: string;
    authorRole: string;
    authorAvatar: string;
    content: string;
    sport: string;
    tags?: string[];
    mediaFile?: File | null;
    embedUrl?: string;
  },
  onUploadProgress?: (pct: number) => void
): Promise<string> {
  let mediaUrl = '';
  let mediaType: 'image' | 'video' | 'youtube' | 'hudl' | 'none' = 'none';

  if (postInput.mediaFile) {
    onUploadProgress?.(10);
    const isVideo = postInput.mediaFile.type.startsWith('video/');
    const folder = isVideo ? STORAGE_FOLDERS.REELS_VIDEOS : STORAGE_FOLDERS.POST_MEDIA;
    
    mediaUrl = await uploadMediaAsset(postInput.mediaFile, folder, (progress) => {
      onUploadProgress?.(Math.round(10 + progress * 0.8));
    });

    mediaType = isVideo ? 'video' : 'image';
  } else if (postInput.embedUrl) {
    if (postInput.embedUrl.includes('hudl.com')) {
      mediaType = 'hudl';
    } else if (postInput.embedUrl.includes('youtube.com') || postInput.embedUrl.includes('youtu.be')) {
      mediaType = 'youtube';
    }
    mediaUrl = postInput.embedUrl;
  }

  const { cleanText } = filterProfanity(postInput.content);

  const postDoc: Omit<LockerRoomPost, 'id'> = {
    authorId: postInput.authorId || auth.currentUser?.uid || 'anon',
    authorName: postInput.authorName || 'Just1Play Creator',
    authorRole: postInput.authorRole || 'Athlete',
    authorAvatar: postInput.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    content: cleanText,
    mediaUrl,
    mediaType,
    embedUrl: postInput.embedUrl || '',
    sport: postInput.sport || 'Basketball',
    tags: postInput.tags && postInput.tags.length > 0 ? postInput.tags : ['#Just1Play', '#GameFilm'],
    reactions: { fire: 0, applause: 0, hype: 0, respect: 0, defense: 0, heart: 0 },
    commentsCount: 0,
    viewsCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  let createdId = `post_${Date.now()}`;
  if (db) {
    const cleanDoc = sanitizeFirestorePayload(postDoc);
    const docRef = await addDoc(collection(db, 'posts'), cleanDoc);
    createdId = docRef.id;

    // Dual-write to locker_room_posts for backwards compatibility
    try {
      await setDoc(doc(db, 'locker_room_posts', createdId), sanitizeFirestorePayload({
        ...postDoc,
        id: createdId
      }));
    } catch (e) {
      console.warn('Locker room dual write notice:', e);
    }
  }

  onUploadProgress?.(100);
  return createdId;
}
