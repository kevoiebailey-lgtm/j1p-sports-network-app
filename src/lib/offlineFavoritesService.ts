/**
 * Offline Favorites & Watchlist Service
 * 
 * Provides robust offline caching & retrieval for:
 * 1. Saved Spectator / Viewer Favorites (Teams, Athletes, Preferences)
 * 2. Scout / Coach Recruit Watchlists & Private Evaluation Notes
 * 3. Collegiate Recruiter Pipeline Watchlists
 * 
 * Integrates directly with the Just1Play Service Worker Cache API so users can
 * seamlessly browse their saved athletes, notes, and scouting dossiers even
 * when cellular signal drops completely inside high-density stadiums or gyms.
 */

import { ScoutingNoteDoc, AthleteDoc } from '../types/platform';
import { WatchlistEntry, getWatchlistEntries } from './watchlistHelper';
import { INITIAL_SCOUTING_NOTES, INITIAL_ATHLETE_DOCS } from './platformData';

// Local storage key constants
export const OFFLINE_FAVORITES_KEY = 'j1p_offline_viewer_favorites';
export const OFFLINE_SCOUT_NOTES_KEY = 'j1p_offline_scout_notes';
export const OFFLINE_RECRUITER_PIPELINE_KEY = 'j1p_offline_recruiter_pipeline';
export const STADIUM_OFFLINE_MODE_FLAG = 'j1p_stadium_offline_mode_active';

export interface FavoriteAthleteItem {
  id: string;
  displayName: string;
  teamName: string;
  jerseyNumber: string;
  sport: string;
  avatarUrl: string;
  position?: string;
  gradYear?: string;
  gpa?: string;
  notes?: string;
  savedAt: string;
}

export interface OfflineCacheStats {
  favoritesCount: number;
  watchlistCount: number;
  scoutNotesCount: number;
  lastSynced: string;
  isServiceWorkerActive: boolean;
  isStadiumOffline: boolean;
}

/**
 * Send payload to Service Worker to persist in CacheStorage (FAVORITES_CACHE)
 */
export async function sendToServiceWorkerCache(key: string, data: any, mediaUrls: string[] = []): Promise<boolean> {
  // 1. Direct browser Cache API fallback (if supported in current client context)
  try {
    if ('caches' in window) {
      const cache = await caches.open('just1play-v1-favorites-watchlist');
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'X-J1P-Cached-At': new Date().toISOString(),
          'X-J1P-Offline-Key': key
        }
      });
      await cache.put(new Request(`/offline-data/${key}`), response);

      // Pre-cache media images (avatars, thumbnails)
      const validMediaUrls = mediaUrls.filter(url => url && typeof url === 'string' && url.startsWith('http'));
      for (const imgUrl of validMediaUrls) {
        try {
          const imgReq = new Request(imgUrl, { mode: 'no-cors' });
          const imgRes = await fetch(imgReq);
          if (imgRes) {
            await cache.put(imgReq, imgRes);
          }
        } catch (mediaErr) {
          // Non-blocking for external CORS images
        }
      }
    }
  } catch (err) {
    console.warn('[OfflineService] Direct cache put notice:', err);
  }

  // 2. Service Worker Message Channel
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_FAVORITES_PAYLOAD',
        payload: {
          key,
          data,
          mediaUrls: mediaUrls.filter(Boolean)
        }
      });
      return true;
    } catch (swErr) {
      console.warn('[OfflineService] SW postMessage notice:', swErr);
    }
  }

  return false;
}

/**
 * Persist & Sync Viewer Favorites to LocalStorage & Service Worker Cache
 */
export async function saveViewerFavoritesOffline(athleteIds: string[]): Promise<void> {
  try {
    // Map IDs to athlete documentation for rich offline representation
    const fullAthletes: FavoriteAthleteItem[] = athleteIds.map(id => {
      const doc = INITIAL_ATHLETE_DOCS.find(a => a.id === id);
      return {
        id,
        displayName: doc?.displayName || `Athlete ${id}`,
        teamName: doc?.teamName || 'High School Varsity',
        jerseyNumber: doc?.jerseyNumber || '00',
        sport: doc?.sport || 'Football',
        avatarUrl: doc?.avatarUrl || '',
        position: doc?.position || 'ATH',
        gradYear: String(doc?.gradYear || '2026'),
        savedAt: new Date().toISOString()
      };
    });

    localStorage.setItem(OFFLINE_FAVORITES_KEY, JSON.stringify({
      ids: athleteIds,
      athletes: fullAthletes,
      savedAt: new Date().toISOString()
    }));

    const avatarUrls = fullAthletes.map(a => a.avatarUrl).filter(Boolean);
    await sendToServiceWorkerCache('favorites', { ids: athleteIds, athletes: fullAthletes }, avatarUrls);

    window.dispatchEvent(new CustomEvent('j1p-favorites-synced', { 
      detail: { count: athleteIds.length, athleteIds } 
    }));
  } catch (err) {
    console.warn('[OfflineService] Failed to save viewer favorites:', err);
  }
}

/**
 * Retrieve Viewer Favorites (with fallback to default if empty)
 */
export function getViewerFavoritesOffline(): { ids: string[]; athletes: FavoriteAthleteItem[] } {
  try {
    const raw = localStorage.getItem(OFFLINE_FAVORITES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ids: parsed.ids || [],
        athletes: parsed.athletes || []
      };
    }
  } catch (err) {
    console.warn('[OfflineService] Failed to read viewer favorites:', err);
  }

  // Initial fallback
  const defaultIds = ['ath-001'];
  const defaultAthletes: FavoriteAthleteItem[] = INITIAL_ATHLETE_DOCS.filter(a => defaultIds.includes(a.id)).map(doc => ({
    id: doc.id,
    displayName: doc.displayName,
    teamName: doc.teamName,
    jerseyNumber: doc.jerseyNumber,
    sport: doc.sport,
    avatarUrl: doc.avatarUrl,
    position: doc.position,
    gradYear: String(doc.gradYear || '2026'),
    savedAt: new Date().toISOString()
  }));

  return { ids: defaultIds, athletes: defaultAthletes };
}

/**
 * Persist & Sync Scout Watchlist & Notes to LocalStorage & Service Worker Cache
 */
export async function saveScoutNotesOffline(notes: ScoutingNoteDoc[]): Promise<void> {
  try {
    localStorage.setItem(OFFLINE_SCOUT_NOTES_KEY, JSON.stringify({
      notes,
      savedAt: new Date().toISOString()
    }));

    // Find any media associated with athletes
    const mediaUrls: string[] = [];
    notes.forEach(n => {
      const matched = INITIAL_ATHLETE_DOCS.find(a => a.displayName.toLowerCase() === n.athleteName.toLowerCase());
      if (matched?.avatarUrl) mediaUrls.push(matched.avatarUrl);
    });

    await sendToServiceWorkerCache('scout-watchlist', { notes }, mediaUrls);

    window.dispatchEvent(new CustomEvent('j1p-scout-notes-synced', { 
      detail: { count: notes.length } 
    }));
  } catch (err) {
    console.warn('[OfflineService] Failed to save scout notes offline:', err);
  }
}

/**
 * Retrieve Scout Notes from Local Cache
 */
export function getScoutNotesOffline(): ScoutingNoteDoc[] {
  try {
    const raw = localStorage.getItem(OFFLINE_SCOUT_NOTES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.notes) && parsed.notes.length > 0) {
        return parsed.notes;
      }
    }
  } catch (err) {
    console.warn('[OfflineService] Failed to read scout notes from offline cache:', err);
  }
  return INITIAL_SCOUTING_NOTES;
}

/**
 * Sync Recruiter Pipeline to LocalStorage & Service Worker Cache
 */
export async function saveRecruiterPipelineOffline(pipeline: any[]): Promise<void> {
  try {
    localStorage.setItem(OFFLINE_RECRUITER_PIPELINE_KEY, JSON.stringify({
      pipeline,
      savedAt: new Date().toISOString()
    }));

    await sendToServiceWorkerCache('recruiter-pipeline', { pipeline });
  } catch (err) {
    console.warn('[OfflineService] Failed to save recruiter pipeline offline:', err);
  }
}

/**
 * Retrieve Recruiter Pipeline from Local Cache
 */
export function getRecruiterPipelineOffline(): any[] {
  try {
    const raw = localStorage.getItem(OFFLINE_RECRUITER_PIPELINE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.pipeline)) {
        return parsed.pipeline;
      }
    }
  } catch (err) {
    console.warn('[OfflineService] Failed to read recruiter pipeline:', err);
  }
  return [];
}

/**
 * Get comprehensive offline cache telemetry stats
 */
export function getOfflineCacheStats(): OfflineCacheStats {
  const favorites = getViewerFavoritesOffline();
  const scoutNotes = getScoutNotesOffline();
  const watchlistEntries = getWatchlistEntries();

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return {
    favoritesCount: favorites.ids.length,
    watchlistCount: watchlistEntries.length,
    scoutNotesCount: scoutNotes.length,
    lastSynced: new Date().toISOString(),
    isServiceWorkerActive: typeof navigator !== 'undefined' && Boolean(navigator?.serviceWorker?.controller),
    isStadiumOffline: !isOnline
  };
}

/**
 * Pre-cache all favorites, watchlists, and dossiers immediately
 */
export async function warmStadiumOfflineCache(): Promise<void> {
  try {
    const favorites = getViewerFavoritesOffline();
    await saveViewerFavoritesOffline(favorites.ids);

    const scoutNotes = getScoutNotesOffline();
    await saveScoutNotesOffline(scoutNotes);

    console.log('[OfflineService] 🏟️ Stadium Offline Cache warmed successfully.');
  } catch (err) {
    console.warn('[OfflineService] Failed to warm stadium offline cache:', err);
  }
}
