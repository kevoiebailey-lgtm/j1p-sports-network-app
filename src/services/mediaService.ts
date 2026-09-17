import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot,
  Unsubscribe,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { parseVideoUrl } from '../lib/videoParser';

export interface HighlightClip {
  id: string;
  title: string;
  caption?: string;
  videoUrl: string;
  playbackUrl?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  duration?: string;
  tag?: string;
  tags?: string[];
  sport?: string;
  jerseyNumber?: string;
  playType?: string;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  isVerified?: boolean;
  isPublic?: boolean;
  viewsCount?: number;
  likesCount?: number;
  createdAt?: any;
  source: 'media_vault' | 'posts' | 'highlights' | 'athlete_profile' | 'community_feed';
}

/**
 * Normalizes any document from `media_vault`, `posts`, `highlights`, or profile media
 * into a strongly-typed, consistent HighlightClip.
 */
export function normalizeToHighlightClip(data: any, id: string, source: HighlightClip['source']): HighlightClip | null {
  if (!data) return null;

  const rawVideoUrl = data.videoUrl || data.playbackUrl || data.originalUrl || data.mediaUrl || data.url;
  
  // Verify that it is a video asset or supported embed URL
  const isVideoType = data.mediaType === 'video' || data.type === 'video' || Boolean(data.isVideo);
  const parsed = rawVideoUrl ? parseVideoUrl(rawVideoUrl) : null;
  const hasVideoExtension = typeof rawVideoUrl === 'string' && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(rawVideoUrl);
  const isLikelyVideo = isVideoType || Boolean(parsed) || hasVideoExtension;

  if (!rawVideoUrl || !isLikelyVideo) {
    return null;
  }

  // Derive thumbnail / poster
  const thumb = data.thumbnailUrl || data.posterUrl || data.previewUrl || parsed?.thumbnailUrl || '';
  
  // Format title / headline
  const title = data.title || data.caption || data.headline || 'Latest Verified Highlight';
  
  // Extract tags & pills (sport, play type, jersey number, tags)
  const extractedTags: string[] = [];
  if (data.sport) extractedTags.push(data.sport);
  if (data.playType || data.category) extractedTags.push(data.playType || data.category);
  if (data.jerseyNumber) {
    const num = String(data.jerseyNumber).trim();
    extractedTags.push(num.startsWith('#') ? num : `#${num}`);
  }
  if (Array.isArray(data.tags)) {
    data.tags.forEach((t: any) => {
      if (typeof t === 'string' && t.trim() && !extractedTags.includes(t.trim())) {
        extractedTags.push(t.trim());
      }
    });
  } else if (typeof data.tag === 'string' && data.tag.trim()) {
    if (!extractedTags.includes(data.tag.trim())) {
      extractedTags.push(data.tag.trim());
    }
  }

  return {
    id: id || data.id || `clip-${Date.now()}`,
    title,
    caption: data.caption || '',
    videoUrl: rawVideoUrl,
    playbackUrl: data.playbackUrl || rawVideoUrl,
    embedUrl: data.embedUrl || parsed?.embedUrl,
    thumbnailUrl: thumb,
    posterUrl: data.posterUrl || thumb,
    duration: data.duration || (data.durationSeconds ? `${Math.floor(data.durationSeconds / 60)}:${String(data.durationSeconds % 60).padStart(2, '0')}` : undefined),
    tag: extractedTags[0] || (data.sport ? `#${data.sport}` : '#Highlights'),
    tags: extractedTags.length > 0 ? extractedTags : ['#Highlights'],
    sport: data.sport || '',
    jerseyNumber: data.jerseyNumber || '',
    playType: data.playType || data.category || '',
    authorId: data.authorId || data.creatorId || data.userId || '',
    authorName: data.authorName || data.creatorName || data.userName || 'Athlete',
    authorAvatar: data.authorAvatar || data.creatorAvatar || data.userAvatar || '',
    isVerified: Boolean(data.isVerified || data.verified),
    isPublic: data.isPublic !== false,
    viewsCount: data.viewsCount || data.views || 0,
    likesCount: data.likesCount || (Array.isArray(data.likes) ? data.likes.length : 0),
    createdAt: data.createdAt || null,
    source
  };
}

/**
 * Sorts an array of items by createdAt descending (handles Firestore Timestamps, Dates, and ISO strings)
 */
function sortByCreatedAtDesc(a: any, b: any): number {
  const getMillis = (item: any): number => {
    if (!item?.createdAt) return 0;
    if (typeof item.createdAt.toMillis === 'function') return item.createdAt.toMillis();
    if (item.createdAt.seconds) return item.createdAt.seconds * 1000;
    if (typeof item.createdAt === 'number') return item.createdAt;
    const parsed = new Date(item.createdAt).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };
  return getMillis(b) - getMillis(a);
}

/**
 * Dynamic Highlight Reel Query:
 * 
 * 1. Primary: Query `media_vault` (or `posts` where `type == 'video'`) filtered by 
 *    `authorId == athlete.id` or `taggedAthleteIds array-contains athlete.id`, ordered by `createdAt desc`, limit 1.
 * 2. Fallback: If the athlete has no uploaded reels yet, query the most recent public verified video clip 
 *    from `media_vault` across the site (`isPublic == true`, ordered by `createdAt desc`, limit 1).
 * 3. Graceful Zero-State: If no film exists anywhere, returns null.
 */
export async function fetchLatestAthleteHighlight(
  athleteId?: string, 
  userProfile?: any
): Promise<HighlightClip | null> {
  if (!db) return null;

  const candidateId = athleteId || userProfile?.uid || userProfile?.id;

  // 1. PRIMARY QUERY: Athlete's own uploaded film or tagged reels
  if (candidateId) {
    // 1a. Query `media_vault` for this athlete
    try {
      const mediaVaultRef = collection(db, 'media_vault');
      
      // Try by authorId
      let q1 = query(mediaVaultRef, where('authorId', '==', candidateId), limit(5));
      let snap = await getDocs(q1);
      
      // Try by creatorId if empty
      if (snap.empty) {
        const qCreator = query(mediaVaultRef, where('creatorId', '==', candidateId), limit(5));
        snap = await getDocs(qCreator);
      }

      // Try by userId if empty
      if (snap.empty) {
        const qUser = query(mediaVaultRef, where('userId', '==', candidateId), limit(5));
        snap = await getDocs(qUser);
      }

      // Try by taggedAthleteIds array-contains if empty
      if (snap.empty) {
        const qTagged = query(mediaVaultRef, where('taggedAthleteIds', 'array-contains', candidateId), limit(5));
        snap = await getDocs(qTagged);
      }

      if (!snap.empty) {
        const validClips: HighlightClip[] = [];
        snap.forEach(docSnap => {
          const clip = normalizeToHighlightClip(docSnap.data(), docSnap.id, 'media_vault');
          if (clip) validClips.push(clip);
        });
        if (validClips.length > 0) {
          validClips.sort(sortByCreatedAtDesc);
          return validClips[0];
        }
      }
    } catch (err) {
      console.warn('[mediaService] media_vault query for athlete notice:', err);
    }

    // 1b. Query `posts` collection (filtered by authorId or taggedAthleteIds)
    try {
      const postsRef = collection(db, 'posts');
      let snapPosts = await getDocs(query(postsRef, where('authorId', '==', candidateId), limit(10)));
      
      if (snapPosts.empty) {
        snapPosts = await getDocs(query(postsRef, where('taggedAthleteIds', 'array-contains', candidateId), limit(10)));
      }

      if (!snapPosts.empty) {
        const videoClips: HighlightClip[] = [];
        snapPosts.forEach(docSnap => {
          const data = docSnap.data();
          if (data.type === 'video' || data.mediaType === 'video' || data.videoUrl || data.originalUrl) {
            const clip = normalizeToHighlightClip(data, docSnap.id, 'posts');
            if (clip) videoClips.push(clip);
          }
        });
        if (videoClips.length > 0) {
          videoClips.sort(sortByCreatedAtDesc);
          return videoClips[0];
        }
      }
    } catch (err) {
      console.warn('[mediaService] posts video query for athlete notice:', err);
    }

    // 1c. Query `highlights` collection
    try {
      const highlightsRef = collection(db, 'highlights');
      const snapHighlights = await getDocs(query(highlightsRef, where('userId', '==', candidateId), limit(5)));
      if (!snapHighlights.empty) {
        const highlightClips: HighlightClip[] = [];
        snapHighlights.forEach(docSnap => {
          const clip = normalizeToHighlightClip(docSnap.data(), docSnap.id, 'highlights');
          if (clip) highlightClips.push(clip);
        });
        if (highlightClips.length > 0) {
          highlightClips.sort(sortByCreatedAtDesc);
          return highlightClips[0];
        }
      }
    } catch (err) {
      console.warn('[mediaService] highlights query notice:', err);
    }

    // 1d. Check user profile mediaUrls / highlightUrls if passed in
    if (userProfile?.mediaUrls && Array.isArray(userProfile.mediaUrls) && userProfile.mediaUrls.length > 0) {
      const firstValid = userProfile.mediaUrls.find((m: any) => m.url || m.videoUrl || m.embedUrl);
      if (firstValid) {
        const clip = normalizeToHighlightClip(firstValid, firstValid.id || 'profile-clip-0', 'athlete_profile');
        if (clip) return clip;
      }
    }
  }

  // 2. FALLBACK QUERY: Most recent public verified video clip across the site (`isPublic == true`)
  try {
    const mediaVaultRef = collection(db, 'media_vault');
    
    // Query public verified clips from media_vault
    let publicSnap = await getDocs(
      query(mediaVaultRef, where('isPublic', '==', true), limit(15))
    );

    if (publicSnap.empty) {
      // Fallback: general media_vault items
      publicSnap = await getDocs(query(mediaVaultRef, limit(15)));
    }

    if (!publicSnap.empty) {
      const publicClips: HighlightClip[] = [];
      publicSnap.forEach(docSnap => {
        const data = docSnap.data();
        const clip = normalizeToHighlightClip(data, docSnap.id, 'media_vault');
        if (clip) {
          // Boost verified clips
          publicClips.push(clip);
        }
      });

      if (publicClips.length > 0) {
        publicClips.sort((a, b) => {
          // Prioritize verified clips first, then newest
          if (a.isVerified && !b.isVerified) return -1;
          if (!a.isVerified && b.isVerified) return 1;
          return sortByCreatedAtDesc(a, b);
        });
        return publicClips[0];
      }
    }
  } catch (err) {
    console.warn('[mediaService] fallback media_vault query notice:', err);
  }

  // 2b. Fallback: Check community highlights table for verified public film
  try {
    const highlightsRef = collection(db, 'highlights');
    const snapCommunity = await getDocs(query(highlightsRef, limit(10)));
    if (!snapCommunity.empty) {
      const communityClips: HighlightClip[] = [];
      snapCommunity.forEach(docSnap => {
        const clip = normalizeToHighlightClip(docSnap.data(), docSnap.id, 'community_feed');
        if (clip) communityClips.push(clip);
      });
      if (communityClips.length > 0) {
        communityClips.sort(sortByCreatedAtDesc);
        return communityClips[0];
      }
    }
  } catch (err) {
    console.warn('[mediaService] fallback community highlights query notice:', err);
  }

  // 2c. Fallback: Check recent video posts on The Wall
  try {
    const postsRef = collection(db, 'posts');
    const snapRecentPosts = await getDocs(query(postsRef, limit(15)));
    if (!snapRecentPosts.empty) {
      const wallVideoClips: HighlightClip[] = [];
      snapRecentPosts.forEach(docSnap => {
        const data = docSnap.data();
        if (data.type === 'video' || data.mediaType === 'video' || data.videoUrl) {
          const clip = normalizeToHighlightClip(data, docSnap.id, 'posts');
          if (clip) wallVideoClips.push(clip);
        }
      });
      if (wallVideoClips.length > 0) {
        wallVideoClips.sort(sortByCreatedAtDesc);
        return wallVideoClips[0];
      }
    }
  } catch (err) {
    console.warn('[mediaService] fallback wall posts query notice:', err);
  }

  // 3. ZERO-STATE: No film exists in database anywhere
  return null;
}

/**
 * Subscribes to the latest athlete highlight reel with real-time updates.
 */
export function subscribeToLatestAthleteHighlight(
  athleteId: string | undefined,
  userProfile: any,
  callback: (clip: HighlightClip | null) => void
): Unsubscribe {
  let isSubscribed = true;

  // Initial fetch
  fetchLatestAthleteHighlight(athleteId, userProfile).then(clip => {
    if (isSubscribed) {
      callback(clip);
    }
  });

  if (!db) {
    return () => { isSubscribed = false; };
  }

  const unsubscribers: Unsubscribe[] = [];

  const candidateId = athleteId || userProfile?.uid || userProfile?.id;

  try {
    if (candidateId) {
      // Listen to media_vault for author updates
      const mvQuery = query(collection(db, 'media_vault'), where('authorId', '==', candidateId), limit(5));
      const un1 = onSnapshot(mvQuery, () => {
        if (isSubscribed) {
          fetchLatestAthleteHighlight(athleteId, userProfile).then(callback);
        }
      }, (err) => console.warn('[mediaService] snapshot listener notice:', err));
      unsubscribers.push(un1);

      // Listen to posts for new video updates
      const postsQuery = query(collection(db, 'posts'), where('authorId', '==', candidateId), limit(5));
      const un2 = onSnapshot(postsQuery, () => {
        if (isSubscribed) {
          fetchLatestAthleteHighlight(athleteId, userProfile).then(callback);
        }
      }, (err) => console.warn('[mediaService] snapshot listener notice:', err));
      unsubscribers.push(un2);
    } else {
      // Listen to public media_vault
      const pubQuery = query(collection(db, 'media_vault'), where('isPublic', '==', true), limit(5));
      const un3 = onSnapshot(pubQuery, () => {
        if (isSubscribed) {
          fetchLatestAthleteHighlight(athleteId, userProfile).then(callback);
        }
      }, (err) => console.warn('[mediaService] snapshot listener notice:', err));
      unsubscribers.push(un3);
    }
  } catch (err) {
    console.warn('[mediaService] Realtime subscription init notice:', err);
  }

  return () => {
    isSubscribed = false;
    unsubscribers.forEach(un => {
      try { un(); } catch (_) {}
    });
  };
}
