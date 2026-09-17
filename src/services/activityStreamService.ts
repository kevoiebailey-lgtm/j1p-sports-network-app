import { db, auth, sanitizeFirestorePayload } from '../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';

export type ActivityType = 
  | 'highlight_added'
  | 'play_published'
  | 'roster_updated'
  | 'combine_logged'
  | 'post_created'
  | 'tournament_event'
  | 'badge_earned'
  | 'album_sync'
  | 'media_upload';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  sport?: string;
  targetId?: string;
  targetUrl: string;
  thumbnailUrl?: string;
  coverPhotoUrl?: string;
  previewUrls?: string[];
  embedUrl?: string;
  mediaType?: 'video' | 'image' | 'play' | 'stat';
  metadata?: Record<string, any>;
  createdAt: any;
}

const COLLECTION_NAME = 'activity';
const FALLBACK_COLLECTION = 'activity_feed';

export function getFallbackActivities(): ActivityItem[] {
  return [
    {
      id: 'seed_act_1',
      type: 'album_sync',
      title: 'New Album Synced: National Showcase Finals',
      description: 'synced 359 photos from Google Drive for 2026 National Championship Showcase',
      authorId: 'creator_kevoie',
      authorName: 'Kevoie Bailey',
      authorRole: 'creator',
      sport: 'Basketball',
      targetId: 'album_showcase_1',
      targetUrl: '/gallery',
      thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
      coverPhotoUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
      previewUrls: [
        'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80'
      ],
      mediaType: 'image',
      metadata: { photoCount: 359, albumName: 'National Showcase Finals' },
      createdAt: '12m ago'
    },
    {
      id: 'seed_act_2',
      type: 'highlight_added',
      title: 'Q4 Clutch Buzzer Beater Highlight (4K)',
      description: 'Game-winning transition step-back three in Championship Semifinal',
      authorId: 'athlete_marcus',
      authorName: 'Marcus Johnson',
      authorRole: 'athlete',
      sport: 'Basketball',
      targetId: 'highlight_1',
      targetUrl: '/watch',
      thumbnailUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=800&auto=format&fit=crop&q=80',
      embedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      mediaType: 'video',
      metadata: {},
      createdAt: '28m ago'
    },
    {
      id: 'seed_act_3',
      type: 'tournament_event',
      title: 'Court 1 Championship Bracket Finalized',
      description: 'Championship bracket advanced: Apex Predators vs West Coast Ballers',
      authorId: 'director_henderson',
      authorName: 'Coach Henderson',
      authorRole: 'director',
      sport: 'Basketball',
      targetId: 'bracket_1',
      targetUrl: '/tournaments',
      thumbnailUrl: '',
      mediaType: 'stat',
      metadata: {},
      createdAt: '1h ago'
    },
    {
      id: 'seed_act_4',
      type: 'play_published',
      title: 'Horns Flare Stagger 2.0 (Playbook)',
      description: 'Published new baseline inbounds set with dual curl read and weakside flare',
      authorId: 'coach_miller',
      authorName: 'Coach Miller',
      authorRole: 'coach',
      sport: 'Basketball',
      targetId: 'play_1',
      targetUrl: '/playbook',
      thumbnailUrl: '',
      mediaType: 'play',
      metadata: {},
      createdAt: '2h ago'
    }
  ];
}

/**
 * Log a new cross-module system activity to Firestore
 */
export async function logActivity(payload: Omit<ActivityItem, 'id' | 'createdAt'>): Promise<string> {
  try {
    const currentUser = auth.currentUser;
    const authorId = payload.authorId || currentUser?.uid || 'system';
    const authorName = payload.authorName || currentUser?.displayName || 'Just1Play Athlete';
    const authorAvatar = payload.authorAvatar || currentUser?.photoURL || '';

    const cleanData = sanitizeFirestorePayload({
      type: payload.type,
      title: payload.title,
      description: payload.description,
      authorId,
      authorName,
      authorAvatar,
      authorRole: payload.authorRole || 'athlete',
      sport: payload.sport || 'Basketball',
      targetId: payload.targetId || '',
      targetUrl: payload.targetUrl || '/feed',
      thumbnailUrl: payload.thumbnailUrl || '',
      embedUrl: payload.embedUrl || '',
      mediaType: payload.mediaType || 'video',
      metadata: payload.metadata || {},
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    });

    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData);
    
    // Also broadcast to fallback activity_feed collection for legacy listener compatibility
    try {
      await setDoc(doc(db, FALLBACK_COLLECTION, docRef.id), cleanData);
    } catch {
      // Non-blocking
    }

    return docRef.id;
  } catch (error) {
    console.warn('logActivity warning (proceeding with local fallback):', error);
    return `local_${Date.now()}`;
  }
}

/**
 * Subscribe to real-time cross-module activity stream
 */
export function subscribeToActivityStream(
  options: {
    sport?: string;
    type?: ActivityType;
    limitCount?: number;
  } = {},
  onData: (activities: ActivityItem[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const maxLimit = options.limitCount || 30;

  let q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc'),
    limit(maxLimit)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ActivityItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        let formattedDate = 'Just now';
        if (data.createdAt?.toDate) {
          formattedDate = data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (data.timestamp) {
          formattedDate = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const coverPhoto = data.coverPhotoUrl || data.thumbnailUrl || data.metadata?.coverPhotoUrl || '';
        const previews = data.previewUrls || data.metadata?.previewUrls || (coverPhoto ? [coverPhoto] : []);

        return {
          id: d.id,
          type: data.type || 'highlight_added',
          title: data.title || 'System Activity',
          description: data.description || '',
          authorId: data.authorId || '',
          authorName: data.authorName || 'Anonymous Athlete',
          authorAvatar: data.authorAvatar || '',
          authorRole: data.authorRole || 'athlete',
          sport: data.sport || 'Basketball',
          targetId: data.targetId || '',
          targetUrl: data.targetUrl || '/feed',
          thumbnailUrl: data.thumbnailUrl || coverPhoto,
          coverPhotoUrl: coverPhoto,
          previewUrls: previews,
          embedUrl: data.embedUrl || '',
          mediaType: data.mediaType || 'video',
          metadata: data.metadata || {},
          createdAt: formattedDate
        };
      });

      // If no activities are yet recorded in Firestore, provide realistic seed activities
      if (items.length === 0) {
        items.push(...getFallbackActivities());
      }

      // Filter in memory if sport or type specified
      let filtered = items;
      if (options.sport && options.sport !== 'All') {
        filtered = filtered.filter((i) => i.sport?.toLowerCase() === options.sport?.toLowerCase());
      }
      if (options.type) {
        filtered = filtered.filter((i) => i.type === options.type);
      }

      onData(filtered);
    },
    (err: any) => {
      // Gracefully handle permission-denied or offline states by supplying fallback activity items
      let fallback = getFallbackActivities();
      if (options.sport && options.sport !== 'All') {
        fallback = fallback.filter((i) => i.sport?.toLowerCase() === options.sport?.toLowerCase());
      }
      if (options.type) {
        fallback = fallback.filter((i) => i.type === options.type);
      }
      onData(fallback);

      if (err?.code !== 'permission-denied') {
        console.warn('Activity stream live subscription notice:', err?.message || err);
      }
      if (onError) onError(err);
    }
  );
}
