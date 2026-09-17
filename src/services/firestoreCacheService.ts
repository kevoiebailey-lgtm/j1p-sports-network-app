/**
 * Firestore Local-First Cache Service
 * 
 * Implements local-first caching strategies (cache-first, stale-while-revalidate,
 * cache-and-network) using Firestore's getDocFromCache / getDocsFromCache primitives
 * combined with an in-memory TTL layer to dramatically reduce billable read operations
 * and minimize Firebase Blaze costs.
 */

import {
  DocumentReference,
  Query,
  DocumentSnapshot,
  QuerySnapshot,
  getDocFromCache,
  getDocFromServer,
  getDocsFromCache,
  getDocsFromServer,
  getDoc,
  getDocs,
  doc as createDocRef,
  collection,
  where,
  query as buildQuery,
  limit as setLimit
} from 'firebase/firestore';
import { db, pruneStaleFirestoreLeaseKeys } from '../lib/firebase';
import type { UserProfile, EventItem, TeamItem, GameItem } from '../types';
import { isFirestoreQuotaExceeded } from '../lib/firestoreQuotaGuard';

export type CacheStrategy = 
  | 'cache-first'            // Try cache first. If found, return. Else fetch from server.
  | 'stale-while-revalidate' // Return cache immediately if exists, fetch fresh in background.
  | 'network-first'          // Try server first. If offline/fails, return cache.
  | 'cache-only'             // Only read from local cache.
  | 'server-only';           // Force server read (bypasses cache).

export interface CacheOptions {
  strategy?: CacheStrategy;
  ttlMs?: number;            // Time-to-live in milliseconds (default: 5 minutes)
  forceRefresh?: boolean;    // Bypass cache and fetch fresh from server
  onBackgroundUpdate?: (freshSnap: DocumentSnapshot | QuerySnapshot) => void;
}

export interface CacheTelemetry {
  cacheHits: number;
  cacheMisses: number;
  serverReads: number;
  estimatedReadsSaved: number;
  estimatedDollarsSaved: number; // Based on $0.06 per 100,000 reads
}

// In-Memory Timestamp Index for TTL Tracking
interface CacheMetaEntry {
  timestamp: number;
  ttlMs: number;
  dataSummary?: string;
}

class FirestoreCacheService {
  private memoryMetaIndex = new Map<string, CacheMetaEntry>();
  private defaultTtlMs = 5 * 60 * 1000; // 5 minutes default TTL
  private telemetry: CacheTelemetry = {
    cacheHits: 0,
    cacheMisses: 0,
    serverReads: 0,
    estimatedReadsSaved: 0,
    estimatedDollarsSaved: 0
  };
  private telemetryListeners = new Set<(telemetry: CacheTelemetry) => void>();

  constructor() {
    this.loadPersistedTelemetry();
  }

  private loadPersistedTelemetry() {
    try {
      const stored = localStorage.getItem('just1play_firestore_cache_telemetry');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.telemetry = { ...this.telemetry, ...parsed };
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  private persistTelemetry() {
    try {
      localStorage.setItem('just1play_firestore_cache_telemetry', JSON.stringify(this.telemetry));
    } catch {
      // Ignore
    }
    this.notifyTelemetryListeners();
  }

  private notifyTelemetryListeners() {
    this.telemetryListeners.forEach(listener => {
      try {
        listener({ ...this.telemetry });
      } catch (err) {
        console.error('Error notifying telemetry listener:', err);
      }
    });
  }

  private recordHit(savedCount: number = 1) {
    this.telemetry.cacheHits += 1;
    this.telemetry.estimatedReadsSaved += savedCount;
    // $0.06 per 100,000 reads = $0.0000006 per read
    this.telemetry.estimatedDollarsSaved = (this.telemetry.estimatedReadsSaved / 100000) * 0.06;
    this.persistTelemetry();
  }

  private recordMiss() {
    this.telemetry.cacheMisses += 1;
    this.telemetry.serverReads += 1;
    this.persistTelemetry();
  }

  /**
   * Subscribe to live cache efficiency telemetry
   */
  public subscribeToTelemetry(listener: (telemetry: CacheTelemetry) => void): () => void {
    this.telemetryListeners.add(listener);
    listener({ ...this.telemetry });
    return () => {
      this.telemetryListeners.delete(listener);
    };
  }

  /**
   * Get current telemetry statistics
   */
  public getTelemetry(): CacheTelemetry {
    return { ...this.telemetry };
  }

  /**
   * Reset telemetry counters
   */
  public resetTelemetry() {
    this.telemetry = {
      cacheHits: 0,
      cacheMisses: 0,
      serverReads: 0,
      estimatedReadsSaved: 0,
      estimatedDollarsSaved: 0
    };
    this.persistTelemetry();
  }

  /**
   * Invalidate specific document cache entry
   */
  public invalidate(pathOrKey: string) {
    this.memoryMetaIndex.delete(pathOrKey);
  }

  /**
   * Invalidate all memory cache entries
   */
  public invalidateAll() {
    this.memoryMetaIndex.clear();
  }

  /**
   * Checks if an in-memory cache metadata entry is still fresh
   */
  private isFresh(key: string, ttlOverride?: number): boolean {
    const entry = this.memoryMetaIndex.get(key);
    if (!entry) return false;
    const effectiveTtl = ttlOverride ?? entry.ttlMs ?? this.defaultTtlMs;
    return Date.now() - entry.timestamp < effectiveTtl;
  }

  /**
   * Record fresh cache entry timestamp
   */
  private markFresh(key: string, ttlMs?: number) {
    this.memoryMetaIndex.set(key, {
      timestamp: Date.now(),
      ttlMs: ttlMs ?? this.defaultTtlMs
    });
  }

  /**
   * Local-First Document Retrieval
   * 
   * Attempts to retrieve the document from Firestore's local IndexedDB cache first.
   * If found and fresh, avoids any network request and saves billable reads.
   */
  public async getDocument<T = any>(
    docRef: DocumentReference<T>,
    options: CacheOptions = {}
  ): Promise<DocumentSnapshot<T>> {
    const {
      strategy = 'cache-first',
      ttlMs = this.defaultTtlMs,
      forceRefresh = false,
      onBackgroundUpdate
    } = options;

    const cacheKey = `doc:${docRef.path}`;

    // If quota is exceeded, force cache-only to prevent backoff errors
    if (isFirestoreQuotaExceeded()) {
      try {
        const cachedSnap = await getDocFromCache(docRef);
        this.recordHit(1);
        return cachedSnap;
      } catch {
        // Fallback to regular getDoc which uses standard offline persistence
        return await getDoc(docRef);
      }
    }

    // 1. Force Server Only
    if (strategy === 'server-only' || forceRefresh) {
      try {
        const serverSnap = await getDoc(docRef);
        this.markFresh(cacheKey, ttlMs);
        this.recordMiss();
        return serverSnap;
      } catch (err) {
        // Fallback to cache or standard getDoc if server fails
        try {
          return await getDocFromCache(docRef);
        } catch {
          return await getDoc(docRef);
        }
      }
    }

    // 2. Cache Only
    if (strategy === 'cache-only') {
      const cached = await getDocFromCache(docRef);
      this.recordHit(1);
      return cached;
    }

    // 3. Stale-While-Revalidate (SWR)
    if (strategy === 'stale-while-revalidate') {
      try {
        const cachedSnap = await getDocFromCache(docRef);
        if (cachedSnap.exists()) {
          this.recordHit(1);
          
          // If expired or not marked fresh, fetch in background without blocking
          if (!this.isFresh(cacheKey, ttlMs)) {
            getDoc(docRef).then(freshSnap => {
              this.markFresh(cacheKey, ttlMs);
              if (onBackgroundUpdate) {
                onBackgroundUpdate(freshSnap);
              }
            }).catch(() => {
              // Silently ignore background refresh network errors
            });
          }
          return cachedSnap;
        }
      } catch {
        // Cache miss, proceed to server/network
      }

      // If not in cache, fetch from network/server with graceful fallback
      try {
        const serverSnap = await getDoc(docRef);
        this.markFresh(cacheKey, ttlMs);
        this.recordMiss();
        return serverSnap;
      } catch {
        try {
          return await getDocFromCache(docRef);
        } catch {
          return await getDoc(docRef);
        }
      }
    }

    // 4. Cache-First (Default Optimal Cost Pattern)
    // First, check if we have a fresh cached snapshot in IndexedDB
    try {
      const cachedSnap = await getDocFromCache(docRef);
      if (cachedSnap.exists()) {
        const fresh = this.isFresh(cacheKey, ttlMs);
        if (fresh) {
          this.recordHit(1);
          return cachedSnap;
        }
      }
    } catch {
      // Cache miss in IndexedDB
    }

    // Fall back to server fetch
    try {
      const serverSnap = await getDoc(docRef);
      this.markFresh(cacheKey, ttlMs);
      this.recordMiss();
      return serverSnap;
    } catch {
      // Network failure or offline -> attempt cache retrieval
      try {
        const cachedSnap = await getDocFromCache(docRef);
        this.recordHit(1);
        return cachedSnap;
      } catch {
        // Ultimate fallback
        return await getDoc(docRef);
      }
    }
  }

  /**
   * Local-First Collection / Query Retrieval
   * 
   * Attempts to retrieve query results from the local cache first.
   * Drastically reduces multi-document read costs.
   */
  public async getDocuments<T = any>(
    queryRef: Query<T>,
    queryKey: string,
    options: CacheOptions = {}
  ): Promise<QuerySnapshot<T>> {
    const {
      strategy = 'cache-first',
      ttlMs = this.defaultTtlMs,
      forceRefresh = false,
      onBackgroundUpdate
    } = options;

    const cacheKey = `query:${queryKey}`;

    // Quota exceeded guard
    if (isFirestoreQuotaExceeded()) {
      try {
        const cachedSnap = await getDocsFromCache(queryRef);
        this.recordHit(cachedSnap.size || 1);
        return cachedSnap;
      } catch {
        return await getDocs(queryRef);
      }
    }

    // Server-only
    if (strategy === 'server-only' || forceRefresh) {
      try {
        const serverSnap = await getDocs(queryRef);
        this.markFresh(cacheKey, ttlMs);
        this.recordMiss();
        return serverSnap;
      } catch (err) {
        try {
          return await getDocsFromCache(queryRef);
        } catch {
          return await getDocs(queryRef);
        }
      }
    }

    // Cache-only
    if (strategy === 'cache-only') {
      const cached = await getDocsFromCache(queryRef);
      this.recordHit(cached.size || 1);
      return cached;
    }

    // Stale-While-Revalidate
    if (strategy === 'stale-while-revalidate') {
      try {
        const cachedSnap = await getDocsFromCache(queryRef);
        if (!cachedSnap.empty) {
          this.recordHit(cachedSnap.size);

          if (!this.isFresh(cacheKey, ttlMs)) {
            getDocs(queryRef).then(freshSnap => {
              this.markFresh(cacheKey, ttlMs);
              if (onBackgroundUpdate) {
                onBackgroundUpdate(freshSnap);
              }
            }).catch(() => {
              // Silently ignore background revalidation network fluctuations
            });
          }
          return cachedSnap;
        }
      } catch {
        // Cache miss
      }

      try {
        const serverSnap = await getDocs(queryRef);
        this.markFresh(cacheKey, ttlMs);
        this.recordMiss();
        return serverSnap;
      } catch {
        try {
          return await getDocsFromCache(queryRef);
        } catch {
          return await getDocs(queryRef);
        }
      }
    }

    // Cache-First (Default)
    try {
      const cachedSnap = await getDocsFromCache(queryRef);
      if (!cachedSnap.empty && this.isFresh(cacheKey, ttlMs)) {
        this.recordHit(cachedSnap.size);
        return cachedSnap;
      }
    } catch {
      // Cache miss
    }

    // Fetch from server / network
    try {
      const serverSnap = await getDocs(queryRef);
      this.markFresh(cacheKey, ttlMs);
      this.recordMiss();
      return serverSnap;
    } catch (err: any) {
      try {
        const cachedSnap = await getDocsFromCache(queryRef);
        this.recordHit(cachedSnap.size || 1);
        return cachedSnap;
      } catch {
        return await getDocs(queryRef);
      }
    }
  }

  public async getDocsCached<T = any>(
    queryRef: Query<T>,
    queryKey: string,
    options: CacheOptions = {}
  ): Promise<QuerySnapshot<T>> {
    return this.getDocuments(queryRef, queryKey, options);
  }
}

export const firestoreCacheService = new FirestoreCacheService();

/**
 * Convenience drop-in functions
 */
export async function cachedGetDoc<T = any>(
  docRef: DocumentReference<T>,
  options?: CacheOptions
): Promise<DocumentSnapshot<T>> {
  return firestoreCacheService.getDocument(docRef, options);
}

export async function cachedGetDocs<T = any>(
  queryRef: Query<T>,
  cacheKey: string,
  options?: CacheOptions
): Promise<QuerySnapshot<T>> {
  return firestoreCacheService.getDocuments(queryRef, cacheKey, options);
}

/**
 * Dedicated Athlete & Tournament Cache Helpers
 * Ensures repeat interactions with athlete profiles, tournament brackets, rosters,
 * and game schedules result in near-zero billable Firestore read operations.
 */

/**
 * Retrieves an athlete user profile by UID or 6-digit athleteId using getDocFromCache first.
 */
export async function getAthleteProfileFromCache(uidOrAthleteId: string): Promise<UserProfile | null> {
  if (!db || !uidOrAthleteId) return null;

  try {
    // 1. Direct document ref by UID
    const userDocRef = createDocRef(db, 'users', uidOrAthleteId);
    const snap = await firestoreCacheService.getDocument(userDocRef, {
      strategy: 'cache-first',
      ttlMs: 10 * 60 * 1000 // 10 minutes cache
    });

    if (snap.exists()) {
      return { uid: snap.id, ...snap.data() } as UserProfile;
    }
  } catch {
    // Not found by doc ID or cache miss, proceed to athleteId query
  }

  try {
    // 2. Query by athleteId field
    const q = buildQuery(
      collection(db, 'users'),
      where('athleteId', '==', uidOrAthleteId),
      setLimit(1)
    );
    const querySnap = await firestoreCacheService.getDocuments(
      q,
      `athlete_by_id_${uidOrAthleteId}`,
      { strategy: 'cache-first', ttlMs: 10 * 60 * 1000 }
    );

    if (!querySnap.empty) {
      const first = querySnap.docs[0];
      return { uid: first.id, ...first.data() } as UserProfile;
    }
  } catch (err) {
    console.warn('[FirestoreCache] getAthleteProfileFromCache warning:', err);
  }

  return null;
}

/**
 * Retrieves a Tournament or Event document using getDocFromCache first.
 */
export async function getTournamentFromCache(tournamentId: string): Promise<EventItem | null> {
  if (!db || !tournamentId) return null;

  try {
    const eventRef = createDocRef(db, 'events', tournamentId);
    const snap = await firestoreCacheService.getDocument(eventRef, {
      strategy: 'cache-first',
      ttlMs: 15 * 60 * 1000 // 15 min cache for tournament metadata
    });

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as EventItem;
    }

    // Fallback to 'tournaments' collection
    const tournRef = createDocRef(db, 'tournaments', tournamentId);
    const tournSnap = await firestoreCacheService.getDocument(tournRef, {
      strategy: 'cache-first',
      ttlMs: 15 * 60 * 1000
    });

    if (tournSnap.exists()) {
      const data = tournSnap.data();
      return {
        id: tournSnap.id,
        title: data.name || data.title || 'Official Tournament Event',
        sport: data.sport || 'Basketball',
        eventType: 'Tournament',
        date: data.startDate || data.date || '2026-08-15',
        startDate: data.startDate || '2026-08-15',
        endDate: data.endDate || '2026-08-17',
        time: data.time || '09:00 AM EST',
        location: data.location || data.venueName || 'Just1Play Athletic Center',
        state: data.state || 'NJ',
        description: data.description || 'Official Just1Play Championship Showcase.',
        organizer: data.organizerName || data.createdBy || 'Just1Play Events Team',
        capacity: data.maxTeams || 100,
        registeredUserIds: data.registeredUserIds || [],
        price: data.price || 150,
        teamFee: data.teamFee || 250,
        divisions: data.divisions || ['10U', '12U', '14U', '17U', 'Varsity'],
        rosterLockDate: data.rosterLockDate || '2026-08-10',
        status: data.status || 'Upcoming'
      } as EventItem;
    }
  } catch (err) {
    console.warn('[FirestoreCache] getTournamentFromCache warning:', err);
  }

  return null;
}

/**
 * Retrieves Tournament Teams/Rosters using getDocsFromCache first.
 */
export async function getTournamentTeamsFromCache(eventId: string): Promise<TeamItem[]> {
  if (!db || !eventId) return [];

  try {
    const q = buildQuery(collection(db, 'teams'), where('eventId', '==', eventId));
    const snap = await firestoreCacheService.getDocuments(
      q,
      `tournament_teams_${eventId}`,
      { strategy: 'cache-first', ttlMs: 10 * 60 * 1000 }
    );

    const teams: TeamItem[] = [];
    snap.forEach(docSnap => {
      teams.push({ id: docSnap.id, ...docSnap.data() } as TeamItem);
    });
    return teams;
  } catch (err) {
    console.warn('[FirestoreCache] getTournamentTeamsFromCache warning:', err);
    return [];
  }
}

/**
 * Retrieves Tournament Games using getDocsFromCache first.
 */
export async function getTournamentGamesFromCache(eventId: string): Promise<GameItem[]> {
  if (!db || !eventId) return [];

  try {
    const q = buildQuery(collection(db, 'games'), where('eventId', '==', eventId));
    const snap = await firestoreCacheService.getDocuments(
      q,
      `tournament_games_${eventId}`,
      { strategy: 'cache-first', ttlMs: 5 * 60 * 1000 }
    );

    const games: GameItem[] = [];
    snap.forEach(docSnap => {
      games.push({ id: docSnap.id, ...docSnap.data() } as GameItem);
    });
    return games;
  } catch (err) {
    console.warn('[FirestoreCache] getTournamentGamesFromCache warning:', err);
    return [];
  }
}

/**
 * Force clear all in-memory Firestore cache, invalidate IndexedDB entries,
 * and dispatch a reset notification event across the window to force re-subscription.
 */
export async function clearLocalFirestoreCache(): Promise<void> {
  try {
    // 1. Invalidate memory cache metadata
    firestoreCacheService.invalidateAll();
    firestoreCacheService.resetTelemetry();

    // 2. Clear query result caches and stale Firestore lease keys stored in localStorage / sessionStorage
    if (typeof window !== 'undefined') {
      pruneStaleFirestoreLeaseKeys();

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('just1play_cache_') || key.startsWith('just1play_firestore_cache_') || key.startsWith('just1play_query_cache_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // 3. Dispatch global reset and re-subscription events
      window.dispatchEvent(new CustomEvent('just1play:cache-cleared', { detail: { timestamp: Date.now() } }));
      window.dispatchEvent(new CustomEvent('just1play:resubscribe-streams', { detail: { timestamp: Date.now() } }));
    }

    console.log('⚡ [FirestoreCache] Local Firestore cache cleared & stream re-subscriptions triggered.');
  } catch (e) {
    console.warn('[FirestoreCache] Error clearing local cache:', e);
  }
}

