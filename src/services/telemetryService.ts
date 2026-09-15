import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { LiveCalloutTelemetry, PlayCallPayload } from '../types/tactics';
import { resolveSafeTeamId } from './signalHubService';

const CACHE_PREFIX = 'j1p_live_callout_';

// BroadcastChannel for sub-10ms tab-to-tab synchronization across coach and player views
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('j1p_telemetry_hub');
  }
} catch (e) {
  console.warn('BroadcastChannel not available in environment:', e);
}

export function getSafeTeamId(teamId?: string | null): string {
  return resolveSafeTeamId(teamId);
}


/**
 * Pushes a real-time tactical callout to /teams/{teamId}/liveCallout/current
 * as well as saving to local cache and notifying any local broadcast subscribers.
 */
export async function pushLiveCallout(
  teamId: string,
  callout: Omit<LiveCalloutTelemetry, 'timestamp' | 'teamId'> & { timestamp?: number }
): Promise<LiveCalloutTelemetry> {
  const cleanTeamId = getSafeTeamId(teamId);
  const currentUser = auth.currentUser;

  const payload: LiveCalloutTelemetry = {
    playId: callout.playId,
    playName: callout.playName,
    formation: callout.formation,
    signalCode: callout.signalCode,
    audibleColor: callout.audibleColor || 'GREEN LIGHT',
    cadence: callout.cadence || 'ON ONE',
    timestamp: callout.timestamp || Date.now(),
    playState: callout.playState || 'LIVE',
    assignments: callout.assignments || {},
    teamId: cleanTeamId,
    callerUid: currentUser?.uid || 'coach',
    callerName: currentUser?.displayName || 'Coach Sideline',
  };

  // 1. Immediately update local storage cache for offline resilience
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${CACHE_PREFIX}${cleanTeamId}`, JSON.stringify(payload));
    }
  } catch (err) {
    console.warn('Telemetry local storage write error:', err);
  }

  // 2. Broadcast via BroadcastChannel for instant (<5ms) intra-browser dispatch
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'CALLOUT_UPDATE', teamId: cleanTeamId, payload });
    } catch (err) {
      console.warn('BroadcastChannel postMessage error:', err);
    }
  }

  // 3. Write to Firestore document /teams/{teamId}/liveCallout/current
  try {
    const calloutRef = doc(db, 'teams', cleanTeamId, 'liveCallout', 'current');
    await setDoc(calloutRef, payload, { merge: true });

    // Also mirror to live_sessions/active for backward compatibility with existing HUD
    try {
      const activeSessionRef = doc(db, 'teams', cleanTeamId, 'live_sessions', 'active');
      await setDoc(activeSessionRef, {
        playName: payload.playName,
        audibleColor: payload.audibleColor,
        cadence: payload.cadence,
        positions: payload.assignments,
        assignments: payload.assignments,
        playState: payload.playState,
        timestamp: payload.timestamp,
        signalCode: payload.signalCode,
        formation: payload.formation,
      }, { merge: true });
    } catch (_) {}
  } catch (firestoreErr) {
    console.warn('Firestore pushLiveCallout warning (will use offline local cache):', firestoreErr);
  }

  return payload;
}

/**
 * Immediately flags the active play as DEAD / STOP PLAY.
 */
export async function killLivePlay(teamId: string): Promise<void> {
  const cleanTeamId = getSafeTeamId(teamId);
  const cached = getCachedLiveCallout(cleanTeamId);

  const payload: LiveCalloutTelemetry = cached
    ? { ...cached, playState: 'DEAD', timestamp: Date.now() }
    : {
        playId: 'dead_ball',
        playName: 'DEAD BALL / TIMEOUT',
        formation: 'ALL STOP',
        signalCode: 'DEAD-99',
        audibleColor: 'RED 80',
        cadence: 'FREEZE',
        timestamp: Date.now(),
        playState: 'DEAD',
        teamId: cleanTeamId,
        assignments: {},
      };

  await pushLiveCallout(cleanTeamId, payload);
}

/**
 * Retrieves the local cached callout for a given teamId.
 */
export function getCachedLiveCallout(teamId: string): LiveCalloutTelemetry | null {
  const cleanTeamId = getSafeTeamId(teamId);
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${cleanTeamId}`);
    if (raw) {
      return JSON.parse(raw) as LiveCalloutTelemetry;
    }
  } catch (err) {
    console.warn('Failed to parse cached callout:', err);
  }
  return null;
}

/**
 * Subscribes to real-time liveCallout updates for a specific teamId.
 * Listens to Firestore onSnapshot on /teams/{teamId}/liveCallout/current.
 * Automatically falls back to local cache & BroadcastChannel if offline or while connecting.
 */
export function subscribeToLiveCallout(
  teamId: string,
  onUpdate: (callout: LiveCalloutTelemetry | null, isLiveOnline: boolean) => void
): () => void {
  const cleanTeamId = getSafeTeamId(teamId);

  // Step A: Immediately fire with cached state if present for instant rendering
  const cached = getCachedLiveCallout(cleanTeamId);
  if (cached) {
    onUpdate(cached, false);
  }

  // Step B: Set up BroadcastChannel listener for local instant sync
  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data?.type === 'CALLOUT_UPDATE' && event.data.teamId === cleanTeamId) {
      onUpdate(event.data.payload as LiveCalloutTelemetry, true);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  // Step C: Set up window storage event listener for cross-tab sync fallback
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === `${CACHE_PREFIX}${cleanTeamId}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        onUpdate(parsed, true);
      } catch (_) {}
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
  }

  // Step D: Firestore real-time onSnapshot listener on /teams/{teamId}/liveCallout/current
  let isSubscribed = true;
  let unsubscribeFirestore: (() => void) | null = null;

  try {
    const calloutRef = doc(db, 'teams', cleanTeamId, 'liveCallout', 'current');
    unsubscribeFirestore = onSnapshot(
      calloutRef,
      (snap) => {
        if (!isSubscribed) return;
        if (snap.exists()) {
          const data = snap.data() as LiveCalloutTelemetry;
          // Sync to local cache
          try {
            localStorage.setItem(`${CACHE_PREFIX}${cleanTeamId}`, JSON.stringify(data));
          } catch (_) {}
          onUpdate(data, true);
        } else {
          // Check if fallback to cached callout exists
          const currentCached = getCachedLiveCallout(cleanTeamId);
          onUpdate(currentCached, true);
        }
      },
      (error) => {
        console.warn(`Live telemetry sync notice for team ${cleanTeamId} (using offline cache):`, error.message);
        if (isSubscribed) {
          const currentCached = getCachedLiveCallout(cleanTeamId);
          onUpdate(currentCached, false);
        }
      }
    );
  } catch (err) {
    console.warn('Firestore subscription init error, falling back to local channel:', err);
  }

  // Clean-up handler
  return () => {
    isSubscribed = false;
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
    }
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}

/**
 * Coach Broadcaster:
 * Writes real-time play call to /game_sessions/{cleanTeamId} with sub-200ms latency,
 * and syncs to /teams/{cleanTeamId}/liveCallout/current and BroadcastChannel.
 */
export async function broadcastLiveCall(
  teamId: string,
  play: PlayCallPayload
): Promise<void> {
  const cleanTeamId = getSafeTeamId(teamId);
  const currentUser = auth.currentUser;

  const payload: LiveCalloutTelemetry = {
    playId: play.playId,
    playName: play.playName,
    formation: play.formation,
    signalCode: play.signalCode,
    audibleColor: play.audibleColor || 'GREEN LIGHT',
    cadence: play.cadence || 'ON ONE',
    timestamp: play.timestamp || Date.now(),
    playState: play.playState || 'LIVE',
    assignments: play.assignments || {},
    teamId: cleanTeamId,
    callerUid: play.callerUid || currentUser?.uid || 'coach',
    callerName: play.callerName || currentUser?.displayName || 'Coach Sideline',
    activePersonnel: play.activePersonnel || 'Standard',
    category: play.category,
  };

  // 1. Write to /game_sessions/{cleanTeamId}
  try {
    const sessionRef = doc(db, 'game_sessions', cleanTeamId);
    await setDoc(
      sessionRef,
      {
        playId: payload.playId,
        playName: payload.playName,
        formation: payload.formation,
        signalCode: payload.signalCode,
        timestamp: payload.timestamp,
        activePersonnel: payload.activePersonnel,
        audibleColor: payload.audibleColor,
        cadence: payload.cadence,
        playState: payload.playState,
        assignments: payload.assignments,
        category: payload.category || 'flag_5v5',
        callerUid: payload.callerUid,
        callerName: payload.callerName,
        lastUpdated: payload.timestamp,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore game_sessions broadcast error:', err);
  }

  // 2. Also push to /teams/{cleanTeamId}/liveCallout/current and BroadcastChannel for <5ms intra-browser delivery
  await pushLiveCallout(cleanTeamId, payload);
}

/**
 * Wristband Receiver Hook:
 * Sets up a real-time Firestore onSnapshot listener on the active telemetry stream.
 * Pushes immediate UI state updates to the athlete Wristband HUD in <200ms.
 */
export function useLiveCalloutStream(teamId?: string) {
  const [liveCall, setLiveCall] = useState<LiveCalloutTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activePersonnel, setActivePersonnel] = useState<string | undefined>(undefined);

  useEffect(() => {
    const safeId = getSafeTeamId(teamId);

    // Initial check from local cache for instant <1ms rendering
    const cached = getCachedLiveCallout(safeId);
    if (cached) {
      setLiveCall(cached);
      setActivePersonnel(cached.activePersonnel);
    }

    // Subscribe to primary live callout pipeline
    const unsubscribe = subscribeToLiveCallout(safeId, (callout, isOnline) => {
      setLiveCall(callout);
      setIsConnected(isOnline);
      if (callout?.activePersonnel) {
        setActivePersonnel(callout.activePersonnel);
      }
    });

    // Redundant fast listener on /game_sessions/{safeId}
    let unsubscribeGameSession: (() => void) | null = null;
    try {
      const sessionRef = doc(db, 'game_sessions', safeId);
      unsubscribeGameSession = onSnapshot(
        sessionRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.playId) {
              const telemetry: LiveCalloutTelemetry = {
                playId: data.playId,
                playName: data.playName || '',
                formation: data.formation || '',
                signalCode: data.signalCode || '',
                audibleColor: data.audibleColor,
                cadence: data.cadence,
                timestamp: data.timestamp || Date.now(),
                playState: data.playState || 'LIVE',
                assignments: data.assignments || {},
                teamId: safeId,
                callerUid: data.callerUid,
                callerName: data.callerName,
                activePersonnel: data.activePersonnel,
                category: data.category,
              };
              setLiveCall(telemetry);
              setIsConnected(true);
              if (data.activePersonnel) {
                setActivePersonnel(data.activePersonnel);
              }
            }
          }
        },
        (err) => {
          console.warn('game_sessions stream warning:', err);
        }
      );
    } catch (_) {}

    return () => {
      unsubscribe();
      if (unsubscribeGameSession) {
        unsubscribeGameSession();
      }
    };
  }, [teamId]);

  const killCurrentPlay = useCallback(async () => {
    const safeId = getSafeTeamId(teamId);
    await killLivePlay(safeId);
  }, [teamId]);

  return {
    liveCall,
    isConnected,
    activePersonnel,
    killCurrentPlay,
  };
}

