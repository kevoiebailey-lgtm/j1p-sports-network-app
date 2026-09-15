import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, sanitizeFirestorePayload } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { SignalHubSession, SignalHubPlayCall, SignalHubConnectedDevice } from '../components/Playbook/SignalHub/types';

const SESSIONS_COLLECTION = 'game_sessions';

/**
 * Resolves an isolated tenant ID for tactical telemetry and sideline HUDs.
 * If user has no associated teamId, generates a private sandbox tenant ID: sandbox_${user.uid}.
 * Prevents unassigned coaches or athletes from sharing or overwriting signals.
 */
export function resolveSafeTeamId(teamId?: string | null): string {
  if (teamId && teamId.trim() && teamId !== 'default_team') {
    return teamId.trim();
  }
  const currentUid = auth.currentUser?.uid;
  if (currentUid) {
    return `sandbox_${currentUid}`;
  }
  return 'sandbox_guest';
}

/**
 * Generate a random 6-digit PIN string (e.g. "842109")
 */
export function generateSessionPin(): string {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  return pin;
}

/**
 * Formats 6-digit PIN with a clean hyphen separator (e.g. "842-109")
 */
export function formatPin(pin: string): string {
  const clean = pin.replace(/\D/g, '').slice(0, 6);
  if (clean.length > 3) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

/**
 * Create or initialize an active Game Session for a team
 */
export async function initializeGameSession(
  teamId: string,
  teamName: string,
  coachId: string,
  coachName: string
): Promise<SignalHubSession> {
  const pin = generateSessionPin();
  const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const now = Date.now();

  const defaultDevices: SignalHubConnectedDevice[] = [
    {
      id: `dev_${Date.now()}_qb`,
      position: 'QB',
      playerName: 'Starting QB #7',
      status: 'connected',
      latencyMs: 18,
      lastPing: now,
      deviceType: 'wrist_hud'
    },
    {
      id: `dev_${Date.now()}_wr1`,
      position: 'WR1',
      playerName: 'Wide Receiver X #1',
      status: 'connected',
      latencyMs: 24,
      lastPing: now,
      deviceType: 'wrist_hud'
    },
    {
      id: `dev_${Date.now()}_slot`,
      position: 'SLOT',
      playerName: 'Slot Receiver H #11',
      status: 'connected',
      latencyMs: 21,
      lastPing: now,
      deviceType: 'phone_hud'
    },
    {
      id: `dev_${Date.now()}_c`,
      position: 'C',
      playerName: 'Center #52',
      status: 'connected',
      latencyMs: 32,
      lastPing: now,
      deviceType: 'wrist_hud'
    }
  ];

  const safeTeamId = resolveSafeTeamId(teamId);

  const sessionData: SignalHubSession = {
    activeSessionId: sessionId,
    teamId: safeTeamId,
    teamName: teamName || 'Tactical Playbook Session',
    coachId: coachId || auth.currentUser?.uid || 'coach_default',
    coachName: coachName || auth.currentUser?.displayName || 'Head Coach',
    pin,
    pinHash: btoa(pin),
    status: 'active',
    connectedPlayers: defaultDevices,
    createdAt: now,
    updatedAt: now
  };

  const docRef = doc(db, SESSIONS_COLLECTION, safeTeamId);
  const path = `${SESSIONS_COLLECTION}/${safeTeamId}`;

  try {
    await setDoc(docRef, sanitizeFirestorePayload({
      ...sessionData,
      updatedAtServer: serverTimestamp()
    }), { merge: true });
    return sessionData;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch (e) {
      console.warn(`SignalHub write notice for ${path}:`, e);
    }
    // Return local in-memory session if network write has issue
    return sessionData;
  }
}

/**
 * Subscribe in real-time to a Game Session by team ID
 */
export function subscribeToGameSession(
  teamId: string,
  callback: (session: SignalHubSession | null) => void
): Unsubscribe {
  const safeTeamId = resolveSafeTeamId(teamId);
  const docRef = doc(db, SESSIONS_COLLECTION, safeTeamId);
  const path = `${SESSIONS_COLLECTION}/${safeTeamId}`;

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SignalHubSession;
        callback(data);
      } else {
        callback(null);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn(`SignalHub snapshot notice for ${path}:`, e);
      }
      callback(null);
    }
  );
}

/**
 * Find and subscribe to a Game Session in real-time by 6-digit PIN
 */
export function subscribeToSessionByPin(
  rawPin: string,
  callback: (session: SignalHubSession | null) => void
): Unsubscribe {
  const cleanPin = rawPin.replace(/\D/g, '');
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('pin', '==', cleanPin),
    limit(1)
  );
  const path = `${SESSIONS_COLLECTION}?pin=${cleanPin}`;

  return onSnapshot(
    q,
    (snap) => {
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data() as SignalHubSession;
        callback(data);
      } else {
        callback(null);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        console.warn(`SignalHub PIN snapshot notice for ${path}:`, e);
      }
      callback(null);
    }
  );
}

/**
 * Coach pushes a live play / audible call to on-field devices
 */
export async function dispatchPlayToField(
  teamId: string,
  playCall: SignalHubPlayCall
): Promise<void> {
  const safeTeamId = resolveSafeTeamId(teamId);
  const docRef = doc(db, SESSIONS_COLLECTION, safeTeamId);
  const path = `${SESSIONS_COLLECTION}/${safeTeamId}`;

  try {
    const snap = await getDoc(docRef);
    let existingRecent: SignalHubPlayCall[] = [];
    if (snap.exists()) {
      const data = snap.data() as SignalHubSession;
      existingRecent = data.recentCalls || [];
    }

    const updatedRecent = [playCall, ...existingRecent.slice(0, 19)];

    await updateDoc(docRef, sanitizeFirestorePayload({
      lastCall: playCall,
      recentCalls: updatedRecent,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Push emergency kill play or scramble alert
 */
export async function dispatchEmergencyKillCall(
  teamId: string,
  coachName?: string
): Promise<void> {
  const killCall: SignalHubPlayCall = {
    dispatchId: `kill_${Date.now()}`,
    playId: 'kill_play',
    playName: '🚨 KILL PLAY / SCRAMBLE / CHECK WITH ME',
    formation: 'SCRAMBLE / FREEZE',
    targeting: 'Entire Offense',
    targetRoutes: {
      QB: 'FREEZE & LOOK TO SIDELINE',
      WR1: 'FREEZE / CHECK AUDIBLE',
      WR2: 'FREEZE / CHECK AUDIBLE',
      SLOT: 'FREEZE / CHECK AUDIBLE',
      RB: 'PASS PROTECTION BLOCKING',
      C: 'HOLD SNAP / CHECK COUNT'
    },
    cadence: 'Freeze / Check Sideline',
    audibleColor: 'RED 80 (KILL CALL)',
    notes: 'Emergency Audible Triggered by Coach. Standby for new call.',
    isKillPlay: true,
    emergencyAudible: true,
    timestamp: Date.now(),
    authorName: coachName || 'Coach'
  };

  await dispatchPlayToField(teamId, killCall);
}

/**
 * Register or update on-field player device ping & position
 */
export async function registerDeviceInSession(
  teamId: string,
  device: SignalHubConnectedDevice
): Promise<void> {
  const safeTeamId = resolveSafeTeamId(teamId);
  const docRef = doc(db, SESSIONS_COLLECTION, safeTeamId);
  const path = `${SESSIONS_COLLECTION}/${safeTeamId}`;

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as SignalHubSession;
    const existing = data.connectedPlayers || [];
    const index = existing.findIndex(d => d.id === device.id || (d.position === device.position && d.position !== 'DEFENSE'));

    let updatedList: SignalHubConnectedDevice[];
    if (index >= 0) {
      updatedList = [...existing];
      updatedList[index] = { ...existing[index], ...device, lastPing: Date.now() };
    } else {
      updatedList = [...existing, { ...device, lastPing: Date.now() }];
    }

    await updateDoc(docRef, sanitizeFirestorePayload({
      connectedPlayers: updatedList,
      updatedAt: Date.now()
    }));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch (e) {
      console.warn(`registerConnectedPlayer notice for ${path}:`, e);
    }
  }
}

/**
 * Player acknowledges receipt of a play call on HUD ("Locked In")
 */
export async function acknowledgePlayCall(
  teamId: string,
  deviceId: string,
  dispatchId: string
): Promise<void> {
  const safeTeamId = resolveSafeTeamId(teamId);
  const docRef = doc(db, SESSIONS_COLLECTION, safeTeamId);
  const path = `${SESSIONS_COLLECTION}/${safeTeamId}`;

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as SignalHubSession;
    const existing = data.connectedPlayers || [];

    const updated = existing.map(d => {
      if (d.id === deviceId) {
        return {
          ...d,
          lastAcknowledgedCallId: dispatchId,
          lastAcknowledgedAt: Date.now(),
          status: 'connected' as const
        };
      }
      return d;
    });

    await updateDoc(docRef, sanitizeFirestorePayload({
      connectedPlayers: updated,
      updatedAt: Date.now()
    }));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch (e) {
      console.warn(`acknowledgePlayCall notice for ${path}:`, e);
    }
  }
}

/**
 * Activate Signal Hub subscription or 14-day free trial on user profile
 */
export async function activateSignalHubAddon(
  userId: string,
  plan: 'trial' | 'monthly' = 'trial'
): Promise<void> {
  if (!userId) return;
  const userRef = doc(db, 'users', userId);
  const path = `users/${userId}`;

  try {
    await updateDoc(userRef, sanitizeFirestorePayload({
      hasSignalHubAddon: true,
      signalHubPlan: plan,
      signalHubActivatedAt: Date.now(),
      isCoachPass: true,
      subscriptionTier: 'PRO_PLAYBOOK',
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}
