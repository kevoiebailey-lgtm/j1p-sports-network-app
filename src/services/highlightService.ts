import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  onSnapshot,
  writeBatch,
  arrayUnion,
  arrayRemove,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEmbedUrl, isValidVideoUrl } from '../lib/videoParser';

/**
 * Extracts a candidate video URL from social wall post documents, strictly excluding photo-only or text-only posts
 */
function extractVideoUrlFromPost(p: any): string {
  if (!p) return '';

  // 1. Explicit video fields
  const explicitVideo = p.videoUrl || p.highlightUrl || p.video || p.externalUrl;
  if (explicitVideo && typeof explicitVideo === 'string' && explicitVideo.trim()) {
    return explicitVideo.trim();
  }

  // 2. If mediaType explicitly indicates video
  if (p.mediaType === 'video' || p.mediaType === 'hudl' || p.mediaType === 'youtube' || p.mediaType === 'vimeo' || p.mediaType === 'reel') {
    const candidate = p.mediaUrl || p.embedUrl || '';
    if (candidate && typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  // 3. If mediaType is 'image', 'photo', 'text', or 'none', it is NOT a video post
  if (p.mediaType === 'image' || p.mediaType === 'photo' || p.mediaType === 'none' || p.mediaType === 'text') {
    return '';
  }

  // 4. Fallback mediaUrl: only if not explicitly an image
  if (p.mediaUrl && typeof p.mediaUrl === 'string' && p.mediaUrl.trim()) {
    const candidate = p.mediaUrl.trim();
    if (/\.(jpe?g|png|webp|gif|heic|svg|bmp|tiff|avif)(\?.*)?$/i.test(candidate)) {
      return '';
    }
    return candidate;
  }

  return '';
}

export interface HighlightItem {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  userAvatar?: string;
  sport: string;
  position: string;
  gradYear: string;
  title: string;
  videoUrl: string;
  embedUrl?: string;
  platform?: string;
  thumbnailUrl?: string;
  isFeatured?: boolean;
  highSchool?: string;
  state?: string;
  source?: 'highlight_vault' | 'profile_wall' | 'film_room' | 'social_wall';
  viewsCount?: number;
  likesCount?: number;
  createdAt: any;
  updatedAt?: any;
}

export interface SaveHighlightParams {
  userId: string;
  userName: string;
  userRole?: string;
  userAvatar?: string;
  title: string;
  videoUrl: string;
  sport: string;
  position: string;
  gradYear: string;
  highSchool?: string;
  state?: string;
  isFeatured?: boolean;
  highlightId?: string; // Optional: if provided updates doc, otherwise generates unique ID
}

export interface HighlightFilters {
  sport?: string;
  position?: string;
  gradYear?: string;
  searchQuery?: string;
  limitCount?: number;
}

/**
 * Saves athlete highlight reel with unique document ID to Firestore:
 * 1. `highlights/{uniqueDocId}` (allows unlimited highlight URLs for each member)
 * 2. Updates `users/{userId}` (featuredHighlightUrl, highlightUrls array, mediaUrls array)
 */
export async function saveAthleteHighlight(params: SaveHighlightParams): Promise<string> {
  if (!db) {
    throw new Error('Firestore database is not initialized');
  }

  const {
    userId,
    userName,
    userRole = 'athlete',
    userAvatar = '',
    title,
    videoUrl,
    sport,
    position,
    gradYear,
    highSchool = '',
    state = '',
    isFeatured = false,
    highlightId
  } = params;

  const normalizedUrl = videoUrl.trim();
  const embedInfo = getEmbedUrl(normalizedUrl);
  
  // Generate unique document ID so athletes can post unlimited highlights
  const highlightsCol = collection(db, 'highlights');
  const docId = highlightId || doc(highlightsCol).id;

  const cleanTitle = title.trim() || `${sport || 'Athlete'} Highlight Reel`;

  const highlightData: Record<string, any> = {
    id: docId,
    userId,
    userName: userName || 'Athlete',
    userRole,
    userAvatar,
    title: cleanTitle,
    videoUrl: normalizedUrl,
    embedUrl: embedInfo.embedUrl,
    platform: embedInfo.provider,
    thumbnailUrl: embedInfo.thumbnailUrl || '',
    sport: sport || 'Basketball',
    position: position || '',
    gradYear: String(gradYear || ''),
    highSchool,
    state,
    isFeatured: isFeatured ?? false,
    source: 'highlight_vault',
    viewsCount: 0,
    likesCount: 0,
    updatedAt: serverTimestamp()
  };

  const batch = writeBatch(db);

  // 1. Highlight document in top-level `highlights` collection
  const highlightRef = doc(db, 'highlights', docId);
  batch.set(highlightRef, {
    ...highlightData,
    createdAt: serverTimestamp()
  }, { merge: true });

  // 2. Update user profile document in `users/{userId}`
  const userRef = doc(db, 'users', userId);
  const newMediaItem = {
    id: docId,
    title: cleanTitle,
    url: normalizedUrl,
    embedUrl: embedInfo.embedUrl,
    platform: embedInfo.provider,
    thumbnailUrl: embedInfo.thumbnailUrl || '',
    createdAt: new Date().toISOString()
  };

  const userUpdateData: Record<string, any> = {
    sport: highlightData.sport,
    position: highlightData.position,
    gradYear: highlightData.gradYear,
    highlightUrls: arrayUnion(normalizedUrl),
    mediaUrls: arrayUnion(newMediaItem),
    updatedAt: serverTimestamp()
  };

  // If marked featured or first highlight, set as featured on profile
  if (isFeatured || !highlightId) {
    userUpdateData.featuredHighlightUrl = normalizedUrl;
    userUpdateData.featuredHighlightTitle = cleanTitle;
  }

  if (highSchool) userUpdateData.highSchool = highSchool;
  if (state) userUpdateData.state = state;

  batch.set(userRef, userUpdateData, { merge: true });

  await batch.commit();
  return docId;
}

/**
 * Fetches all highlights for an athlete (unlimited footage list)
 */
export async function getAthleteHighlights(userId: string): Promise<HighlightItem[]> {
  if (!db || !userId) return [];

  const items: HighlightItem[] = [];
  const seenUrls = new Set<string>();

  try {
    // 1. Query highlights collection for this user
    const q = query(
      collection(db, 'highlights'),
      where('userId', '==', userId),
      limit(100)
    );
    const querySnap = await getDocs(q);
    
    querySnap.forEach((docSnap) => {
      const data = docSnap.data();
      const hUrl = data.videoUrl || data.highlightUrl || data.video || '';
      if (hUrl && isValidVideoUrl(hUrl) && !seenUrls.has(hUrl)) {
        seenUrls.add(hUrl);
        items.push({
          id: docSnap.id,
          userId: data.userId || userId,
          userName: data.userName || 'Athlete',
          userRole: data.userRole || 'athlete',
          userAvatar: data.userAvatar || '',
          sport: data.sport || 'Basketball',
          position: data.position || '',
          gradYear: String(data.gradYear || ''),
          title: data.title || 'Highlight Reel',
          videoUrl: hUrl,
          embedUrl: data.embedUrl || getEmbedUrl(hUrl).embedUrl,
          platform: data.platform || getEmbedUrl(hUrl).provider,
          thumbnailUrl: data.thumbnailUrl || getEmbedUrl(hUrl).thumbnailUrl || '',
          isFeatured: data.isFeatured ?? false,
          highSchool: data.highSchool || '',
          state: data.state || '',
          viewsCount: data.viewsCount || 0,
          likesCount: data.likesCount || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      }
    });

    // 2. Also check user document `mediaUrls` and `highlightUrls`
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      
      // Check mediaUrls array
      if (Array.isArray(uData.mediaUrls)) {
        uData.mediaUrls.forEach((m: any, idx: number) => {
          const mUrl = m.url || m.embedUrl || '';
          if (mUrl && isValidVideoUrl(mUrl) && !seenUrls.has(mUrl)) {
            seenUrls.add(mUrl);
            const embed = getEmbedUrl(mUrl);
            items.push({
              id: m.id || `user-media-${idx}`,
              userId,
              userName: uData.displayName || uData.name || 'Athlete',
              userRole: uData.role || 'athlete',
              userAvatar: uData.avatarUrl || uData.photoURL || '',
              sport: uData.sport || 'Basketball',
              position: uData.position || '',
              gradYear: String(uData.gradYear || ''),
              title: m.title || `${uData.displayName || 'Athlete'} Clip #${idx + 1}`,
              videoUrl: mUrl,
              embedUrl: m.embedUrl || embed.embedUrl,
              platform: m.platform || embed.provider,
              thumbnailUrl: m.thumbnailUrl || embed.thumbnailUrl || '',
              isFeatured: mUrl === uData.featuredHighlightUrl,
              highSchool: uData.highSchool || '',
              state: uData.state || '',
              createdAt: m.createdAt || new Date().toISOString()
            });
          }
        });
      }

      // Check highlightUrls array
      if (Array.isArray(uData.highlightUrls)) {
        uData.highlightUrls.forEach((hUrl: string, idx: number) => {
          if (hUrl && isValidVideoUrl(hUrl) && !seenUrls.has(hUrl)) {
            seenUrls.add(hUrl);
            const embed = getEmbedUrl(hUrl);
            items.push({
              id: `user-hl-${idx}`,
              userId,
              userName: uData.displayName || uData.name || 'Athlete',
              userRole: uData.role || 'athlete',
              userAvatar: uData.avatarUrl || uData.photoURL || '',
              sport: uData.sport || 'Basketball',
              position: uData.position || '',
              gradYear: String(uData.gradYear || ''),
              title: `${uData.displayName || 'Athlete'} Highlight #${idx + 1}`,
              videoUrl: hUrl,
              embedUrl: embed.embedUrl,
              platform: embed.provider,
              thumbnailUrl: embed.thumbnailUrl || '',
              isFeatured: hUrl === uData.featuredHighlightUrl,
              highSchool: uData.highSchool || '',
              state: uData.state || '',
              createdAt: new Date().toISOString()
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('Error fetching athlete highlights:', err);
  }

  // Sort: featured first, then newest
  items.sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    return timeB - timeA;
  });

  return items;
}

/**
 * Real-time subscription to all highlights for a specific athlete
 */
export function subscribeToUserHighlights(
  userId: string,
  callback: (highlights: HighlightItem[]) => void
): Unsubscribe {
  if (!db || !userId) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'highlights'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const items: HighlightItem[] = snap.docs
        .map((d): HighlightItem | null => {
          const data = d.data();
          const vUrl = data.videoUrl || data.highlightUrl || data.video || '';
          if (!vUrl || !isValidVideoUrl(vUrl)) return null;
          const embed = getEmbedUrl(vUrl);
          return {
            id: d.id,
            userId: data.userId || userId,
            userName: data.userName || 'Athlete',
            userRole: data.userRole || 'athlete',
            userAvatar: data.userAvatar || '',
            sport: data.sport || 'Basketball',
            position: data.position || '',
            gradYear: String(data.gradYear || ''),
            title: data.title || 'Highlight Reel',
            videoUrl: vUrl,
            embedUrl: data.embedUrl || embed.embedUrl,
            platform: data.platform || embed.provider,
            thumbnailUrl: data.thumbnailUrl || embed.thumbnailUrl || '',
            isFeatured: data.isFeatured ?? false,
            highSchool: data.highSchool || '',
            state: data.state || '',
            viewsCount: data.viewsCount || 0,
            likesCount: data.likesCount || 0,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
        })
        .filter((item): item is HighlightItem => item !== null);

      // Also merge user doc media if highlights collection is empty
      if (items.length === 0) {
        const fallbackItems = await getAthleteHighlights(userId);
        callback(fallbackItems);
      } else {
        items.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });
        callback(items);
      }
    }, (err) => {
      console.warn('User highlights listener notice:', err);
      getAthleteHighlights(userId).then(callback);
    });

    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to user highlights:', err);
    getAthleteHighlights(userId).then(callback);
    return () => {};
  }
}

/**
 * Fetches the featured or most recent highlight for an athlete
 */
export async function getAthleteLatestHighlight(userId: string): Promise<HighlightItem | null> {
  if (!db || !userId) return null;

  try {
    const list = await getAthleteHighlights(userId);
    if (list.length > 0) {
      return list[0];
    }
  } catch (err) {
    console.warn('Error fetching latest highlight:', err);
  }

  return null;
}

/**
 * Subscribes to the Community Video Watch Feed with dynamic filtering.
 * Aggregates all highlights posted to the Watch Vault and all video posts from Profile Walls!
 */
export function subscribeToHighlights(
  filters: HighlightFilters,
  callback: (highlights: HighlightItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const highlightsRef = collection(db, 'highlights');
    const postsRef = collection(db, 'posts');

    let currentHighlights: HighlightItem[] = [];
    let currentPostVideos: HighlightItem[] = [];

    const mergeAndEmit = () => {
      const combinedMap = new Map<string, HighlightItem>();

      // 1. Add all direct highlights (strictly validated)
      currentHighlights.forEach((item) => {
        if (item.videoUrl && isValidVideoUrl(item.videoUrl)) {
          combinedMap.set(item.videoUrl, item);
        }
      });

      // 2. Add video posts from Social / Profile Wall (strictly validated)
      currentPostVideos.forEach((item) => {
        if (item.videoUrl && isValidVideoUrl(item.videoUrl) && !combinedMap.has(item.videoUrl)) {
          combinedMap.set(item.videoUrl, item);
        }
      });

      let results = Array.from(combinedMap.values());

      // Filter: Sport
      if (filters.sport && filters.sport !== 'All' && filters.sport !== 'All Sports') {
        results = results.filter((item) => item.sport?.toLowerCase() === filters.sport?.toLowerCase());
      }

      // Filter: Position
      if (filters.position && filters.position !== 'All' && filters.position !== 'All Positions') {
        results = results.filter((item) => item.position?.toLowerCase().includes(filters.position!.toLowerCase()));
      }

      // Filter: Grad Year
      if (filters.gradYear && filters.gradYear !== 'All' && filters.gradYear !== 'All Classes') {
        results = results.filter((item) => String(item.gradYear) === String(filters.gradYear));
      }

      // Filter: Search Query
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const searchLower = filters.searchQuery.toLowerCase().trim();
        results = results.filter((item) => 
          item.title.toLowerCase().includes(searchLower) ||
          item.userName.toLowerCase().includes(searchLower) ||
          item.sport.toLowerCase().includes(searchLower) ||
          item.position.toLowerCase().includes(searchLower) ||
          item.gradYear.includes(searchLower) ||
          (item.highSchool && item.highSchool.toLowerCase().includes(searchLower)) ||
          (item.state && item.state.toLowerCase().includes(searchLower))
        );
      }

      // Sort descending by timestamp / newest first
      results.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });

      const maxItems = filters.limitCount || 100;
      callback(results.slice(0, maxItems));
    };

    // 1. Subscribe to highlights collection
    const unsubsHighlights = onSnapshot(
      query(highlightsRef, limit(150)),
      (snapshot) => {
        currentHighlights = snapshot.docs
          .map((docSnap): HighlightItem | null => {
            const data = docSnap.data();
            const rawVideo = data.videoUrl || data.highlightUrl || data.video || data.externalUrl || '';
            const vUrl = typeof rawVideo === 'string' ? rawVideo.trim() : '';
            
            // Exclude anything without a confirmed playable video URL
            if (!vUrl || !isValidVideoUrl(vUrl)) {
              return null;
            }

            const embed = getEmbedUrl(vUrl);
            return {
              id: docSnap.id,
              userId: data.userId || '',
              userName: data.userName || data.athleteName || 'Athlete',
              userRole: data.userRole || 'athlete',
              userAvatar: data.userAvatar || data.photoURL || '',
              sport: data.sport || 'Basketball',
              position: data.position || '',
              gradYear: String(data.gradYear || ''),
              title: data.title || 'Highlight Reel',
              videoUrl: vUrl,
              embedUrl: data.embedUrl || embed.embedUrl,
              platform: data.platform || embed.provider,
              thumbnailUrl: data.thumbnailUrl || embed.thumbnailUrl || '',
              isFeatured: data.isFeatured ?? false,
              highSchool: data.highSchool || '',
              state: data.state || '',
              source: 'highlight_vault' as const,
              viewsCount: data.viewsCount || 0,
              likesCount: data.likesCount || 0,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            };
          })
          .filter((item): item is HighlightItem => item !== null);

        mergeAndEmit();
      },
      (error) => {
        console.warn('Firestore highlight collection stream notice:', error);
      }
    );

    // 2. Subscribe to posts collection to capture video wall posts (strictly video only)
    const unsubsPosts = onSnapshot(
      query(postsRef, limit(100)),
      (snapshot) => {
        const videoPosts: HighlightItem[] = [];
        snapshot.docs.forEach((docSnap) => {
          const p = docSnap.data();
          const candidateVideoUrl = extractVideoUrlFromPost(p);

          // STRICT CHECK: Exclude photo-only and text posts.
          // Must have a populated, valid video URL pointing to a supported platform or file.
          if (!candidateVideoUrl || !isValidVideoUrl(candidateVideoUrl)) {
            return;
          }

          const embed = getEmbedUrl(candidateVideoUrl);
          videoPosts.push({
            id: `wall-post-${docSnap.id}`,
            userId: p.authorId || p.userId || '',
            userName: p.authorName || p.userName || 'Member',
            userRole: p.authorRole || 'athlete',
            userAvatar: p.authorAvatar || p.userAvatar || '',
            sport: p.authorSport || p.sport || 'Basketball',
            position: p.position || '',
            gradYear: String(p.authorClassYear || p.gradYear || ''),
            title: p.caption || p.title || `${p.authorName || 'Member'}'s Highlight Reel`,
            videoUrl: candidateVideoUrl,
            embedUrl: embed.embedUrl,
            platform: embed.provider,
            thumbnailUrl: embed.thumbnailUrl || p.thumbnailUrl || '',
            isFeatured: false,
            highSchool: p.authorSchool || p.highSchool || '',
            state: p.state || '',
            source: 'profile_wall' as const,
            viewsCount: p.viewsCount || 0,
            likesCount: p.likesCount || 0,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          });
        });
        currentPostVideos = videoPosts;
        mergeAndEmit();
      },
      (error) => {
        console.warn('Firestore posts collection stream notice in WatchFeed:', error);
      }
    );

    return () => {
      unsubsHighlights();
      unsubsPosts();
    };
  } catch (err) {
    console.error('Failed to initialize highlights subscription:', err);
    if (onError) onError(err as Error);
    return () => {};
  }
}

/**
 * Deletes a highlight document and removes from user profile media
 */
export async function deleteHighlight(highlightId: string, userId: string, videoUrl?: string): Promise<void> {
  if (!db) return;

  try {
    // 1. Delete from highlights collection
    const highlightRef = doc(db, 'highlights', highlightId);
    await deleteDoc(highlightRef);

    // 2. Remove from user profile document
    if (userId) {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        const updates: Record<string, any> = {
          updatedAt: serverTimestamp()
        };

        if (videoUrl) {
          updates.highlightUrls = arrayRemove(videoUrl);
        }

        if (Array.isArray(uData.mediaUrls)) {
          updates.mediaUrls = uData.mediaUrls.filter((m: any) => m.id !== highlightId && m.url !== videoUrl);
        }

        await updateDoc(userRef, updates);
      }
    }
  } catch (err) {
    console.error('Error deleting highlight:', err);
    throw err;
  }
}
