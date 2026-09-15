import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, sanitizeFirestorePayload } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { PlayLabPlay, TacticalPlayer, RouteNumber } from '../types/tactics';
import { ROUTE_TREE_DEFINITIONS, generateRouteVectorPath } from '../components/playlab/FormationPresets';
import { CHAMPIONSHIP_12_PLAYS } from '../data/championship12Plays';

export const PLAYS_COLLECTION = 'plays';

/**
 * Normalizes and validates a PlayLabPlay object ensuring all required fields
 * and route stem coordinate arrays are strictly formatted.
 */
export function normalizePlayLabPlay(data: any, fallbackId?: string): PlayLabPlay {
  const allowedPlayers: Array<'QB' | 'C' | 'X' | 'H' | 'Z'> = ['QB', 'C', 'X', 'H', 'Z'];

  const rawRoutes = Array.isArray(data?.routes) ? data.routes : [];
  const normalizedRoutes: PlayLabPlay['routes'] = rawRoutes.map((r: any) => {
    const playerToken = allowedPlayers.includes(r?.player) ? r.player : (r?.player || 'X');
    const rawCoords = Array.isArray(r?.coordinates) ? r.coordinates : [];
    const validCoords = rawCoords
      .map((pt: any) => ({
        x: typeof pt?.x === 'number' && !isNaN(pt.x) ? pt.x : 0,
        y: typeof pt?.y === 'number' && !isNaN(pt.y) ? pt.y : 0,
      }))
      .filter((pt: any) => pt.x >= 0 && pt.x <= 800 && pt.y >= 0 && pt.y <= 500);

    return {
      player: playerToken,
      coordinates: validCoords.length > 0 ? validCoords : [{ x: 400, y: 350 }],
      routeType: typeof r?.routeType === 'string' && r.routeType.trim() ? r.routeType.trim() : 'Stem',
      isPrimary: Boolean(r?.isPrimary),
      readProgression: r?.readProgression === 1 || r?.readProgression === 2 || r?.readProgression === 3 ? r.readProgression : undefined,
      color: typeof r?.color === 'string' ? r.color : undefined,
      isMotion: Boolean(r?.isMotion),
      strokeDasharray: typeof r?.strokeDasharray === 'string' ? r.strokeDasharray : undefined,
    };
  });

  const sharedTeams = Array.isArray(data?.sharedTeams)
    ? data.sharedTeams
    : Array.isArray(data?.sharedWithTeamIds)
    ? data.sharedWithTeamIds
    : [];

  const rawSlot = Number(data?.slotIndex);
  const slotIndex = !isNaN(rawSlot) && rawSlot >= 1 && rawSlot <= 12 ? rawSlot : undefined;

  return {
    id: data?.id || fallbackId,
    userId: typeof data?.userId === 'string' ? data.userId : (auth?.currentUser?.uid || 'anonymous_coach'),
    name: typeof data?.name === 'string' && data.name.trim() ? data.name.trim() : 'Fil Fly',
    formation: typeof data?.formation === 'string' && data.formation.trim() ? data.formation.trim() : 'Spread',
    category: typeof data?.category === 'string' && data.category.trim() ? data.category.trim() : 'Spread',
    format: typeof data?.format === 'string' && data.format.trim() ? data.format.trim() : '5v5',
    isPublic: typeof data?.isPublic === 'boolean' ? data.isPublic : false,
    sharedTeams,
    sharedWithTeamIds: sharedTeams,
    slotIndex,
    conceptNote: typeof data?.conceptNote === 'string' ? data.conceptNote : undefined,
    tacticalIfThen: typeof data?.tacticalIfThen === 'string' ? data.tacticalIfThen : undefined,
    playMode: data?.playMode === 'defense' ? 'defense' : 'offense',
    defensePreset: typeof data?.defensePreset === 'string' ? data.defensePreset : undefined,
    defenseZones: Array.isArray(data?.defenseZones) ? data.defenseZones : undefined,
    blitzArrows: Array.isArray(data?.blitzArrows) ? data.blitzArrows : undefined,
    manLockLinks: Array.isArray(data?.manLockLinks) ? data.manLockLinks : undefined,
    routes: normalizedRoutes,
    cadence: typeof data?.cadence === 'string' ? data.cadence : 'ON ONE',
    audibleColor: typeof data?.audibleColor === 'string' ? data.audibleColor : 'GREEN LIGHT',
    notes: typeof data?.notes === 'string' ? data.notes : '',
    createdAt: typeof data?.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: typeof data?.updatedAt === 'number' ? data.updatedAt : undefined,
  };
}

/**
 * Saves a PlayLabPlay to Firestore under the 'plays' collection with local storage backup.
 * Matches schema: { userId, name, formation, format: "5v5", isPublic: false, sharedTeams: [], routes, cadence, audibleColor, createdAt }
 */
export async function savePlayLabPlay(
  play: Omit<PlayLabPlay, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<string> {
  const playId = play.id || `playlab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const currentUser = auth?.currentUser;
  const targetUserId = play.userId || currentUser?.uid || 'anonymous_coach';

  const normalizedPlay: PlayLabPlay = normalizePlayLabPlay({
    ...play,
    id: playId,
    userId: targetUserId,
    createdAt: play.createdAt || Date.now(),
  }, playId);

  // Local storage backup for instant offline retrieval
  try {
    const localKey = `playlab_play_${playId}`;
    localStorage.setItem(localKey, JSON.stringify(normalizedPlay));
    
    // Maintain index in local storage
    const listKey = `playlab_user_plays_${targetUserId}`;
    const existingListStr = localStorage.getItem(listKey);
    const existingList: PlayLabPlay[] = existingListStr ? JSON.parse(existingListStr) : [];
    const updatedList = [normalizedPlay, ...existingList.filter((p) => p.id !== playId)];
    localStorage.setItem(listKey, JSON.stringify(updatedList.slice(0, 100)));
  } catch (err) {
    console.warn('PlayLab local cache error:', err);
  }

  // Firestore persistence with exact requested schema fields
  try {
    const playDocRef = doc(db, PLAYS_COLLECTION, playId);
    const payload = sanitizeFirestorePayload({
      userId: normalizedPlay.userId,
      name: normalizedPlay.name,
      formation: normalizedPlay.formation,
      category: normalizedPlay.category || 'Spread',
      format: normalizedPlay.format || '5v5',
      isPublic: Boolean(normalizedPlay.isPublic),
      sharedTeams: normalizedPlay.sharedTeams || [],
      sharedWithTeamIds: normalizedPlay.sharedTeams || [],
      slotIndex: normalizedPlay.slotIndex || null,
      conceptNote: normalizedPlay.conceptNote || '',
      routes: normalizedPlay.routes,
      cadence: normalizedPlay.cadence || 'ON ONE',
      audibleColor: normalizedPlay.audibleColor || 'GREEN LIGHT',
      notes: normalizedPlay.notes || '',
      createdAt: normalizedPlay.createdAt,
      updatedAt: Date.now(),
    });
    await setDoc(playDocRef, payload, { merge: true });
    return playId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `plays/${playId}`);
    return playId;
  }
}

/**
 * Fetches a single PlayLabPlay by its ID.
 */
export async function getPlayLabPlay(id: string): Promise<PlayLabPlay | null> {
  // Check local cache first
  try {
    const cached = localStorage.getItem(`playlab_play_${id}`);
    if (cached) {
      return normalizePlayLabPlay(JSON.parse(cached), id);
    }
  } catch {}

  try {
    const playDocRef = doc(db, PLAYS_COLLECTION, id);
    const snapshot = await getDoc(playDocRef);
    if (snapshot.exists()) {
      return normalizePlayLabPlay(snapshot.data(), snapshot.id);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `plays/${id}`);
  }

  return null;
}

/**
 * Fetches all PlayLabPlays created by a specific coach/user.
 * Queries strictly: query(collection(db, "plays"), where("userId", "==", currentUser.uid))
 */
export async function getUserPlayLabPlays(userId: string): Promise<PlayLabPlay[]> {
  try {
    const q = query(
      collection(db, PLAYS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const plays = snapshot.docs.map((docSnap) => normalizePlayLabPlay(docSnap.data(), docSnap.id));
      plays.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return plays;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'plays');
  }

  // Fallback to local storage
  try {
    const listKey = `playlab_user_plays_${userId}`;
    const existingListStr = localStorage.getItem(listKey);
    if (existingListStr) {
      const parsed: PlayLabPlay[] = JSON.parse(existingListStr);
      parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return parsed;
    }
  } catch {}

  return [];
}

/**
 * Fetches PlayLabPlays shared with a specific team for wristband HUD broadcast.
 */
export async function getTeamPlayLabPlays(teamId: string): Promise<PlayLabPlay[]> {
  try {
    const q = query(
      collection(db, PLAYS_COLLECTION),
      where('sharedTeams', 'array-contains', teamId),
      limit(30)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => normalizePlayLabPlay(docSnap.data(), docSnap.id));
  } catch (error) {
    // Fallback try legacy sharedWithTeamIds
    try {
      const legacyQ = query(
        collection(db, PLAYS_COLLECTION),
        where('sharedWithTeamIds', 'array-contains', teamId),
        limit(30)
      );
      const snap = await getDocs(legacyQ);
      return snap.docs.map((docSnap) => normalizePlayLabPlay(docSnap.data(), docSnap.id));
    } catch {}
    console.warn('Could not query team PlayLab plays from Firestore:', error);
    return [];
  }
}

/**
 * Updates the privacy and team sharing authorizations of a PlayLabPlay.
 */
export async function updatePlayPrivacy(
  playId: string,
  updates: { isPublic?: boolean; sharedTeams?: string[] }
): Promise<void> {
  const payload: Record<string, any> = { updatedAt: Date.now() };
  if (typeof updates.isPublic === 'boolean') {
    payload.isPublic = updates.isPublic;
  }
  if (Array.isArray(updates.sharedTeams)) {
    payload.sharedTeams = updates.sharedTeams;
    payload.sharedWithTeamIds = updates.sharedTeams;
  }

  // Update Firestore
  try {
    const playDocRef = doc(db, PLAYS_COLLECTION, playId);
    await setDoc(playDocRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `plays/${playId}`);
  }

  // Update local cache
  try {
    const localKey = `playlab_play_${playId}`;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const updated = { ...parsed, ...payload };
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch {}
}

/**
 * Fetches public plays designed in PlayLab.
 */
export async function getPublicPlayLabPlays(limitCount = 20): Promise<PlayLabPlay[]> {
  try {
    const q = query(
      collection(db, PLAYS_COLLECTION),
      where('isPublic', '==', true),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map((docSnap) => normalizePlayLabPlay(docSnap.data(), docSnap.id));
    }
  } catch (error) {
    console.warn('Could not query public PlayLab plays:', error);
  }

  return [SAMPLE_FIL_FLY_PLAY];
}

/**
 * Deletes a PlayLabPlay by ID.
 */
export async function deletePlayLabPlay(id: string): Promise<void> {
  try {
    localStorage.removeItem(`playlab_play_${id}`);
    const playDocRef = doc(db, PLAYS_COLLECTION, id);
    await deleteDoc(playDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `plays/${id}`);
  }
}

/**
 * Subscribes to real-time updates for a user's PlayLab plays.
 * Queries strictly: query(collection(db, "plays"), where("userId", "==", currentUser.uid))
 */
export function subscribeUserPlayLabPlays(
  userId: string,
  onUpdate: (plays: PlayLabPlay[]) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, PLAYS_COLLECTION),
      where('userId', '==', userId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const plays = snapshot.docs.map((docSnap) =>
          normalizePlayLabPlay(docSnap.data(), docSnap.id)
        );
        plays.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onUpdate(plays);
      },
      (error) => {
        console.warn('Real-time PlayLab subscription error:', error);
      }
    );
  } catch (err) {
    console.warn('Could not establish real-time PlayLab subscription:', err);
    return () => {};
  }
}

/**
 * Converts TacticalPlayer array from PlayLabCanvas into PlayLabPlay['routes'].
 */
export function convertTacticalPlayersToRoutes(players: TacticalPlayer[]): PlayLabPlay['routes'] {
  const allowedTokens: Array<'QB' | 'C' | 'X' | 'H' | 'Z'> = ['QB', 'C', 'X', 'H', 'Z'];

  return players
    .filter((p) => allowedTokens.includes(p.label as any))
    .map((p) => {
      const playerToken = p.label as 'QB' | 'C' | 'X' | 'H' | 'Z';
      const coordinates = p.routePoints && p.routePoints.length > 0
        ? p.routePoints
        : [{ x: p.x, y: p.y }];
      
      const routeType = p.routeName || (p.routeNumber !== undefined ? ROUTE_TREE_DEFINITIONS[p.routeNumber]?.name : 'Stem') || 'Stem';
      const isPrimary = p.readProgression === 1;

      return {
        player: playerToken,
        coordinates,
        routeType,
        isPrimary,
      };
    });
}

/**
 * The 9 Vetted 5v5 Flag Plays for the Playbook Pack Seeder
 */
export const VETTED_FLAG_PLAYBOOK_PACK: Omit<PlayLabPlay, 'id' | 'userId'>[] = [
  {
    name: "Spread Right - Fil Fly",
    formation: "Spread",
    category: "Spread",
    format: "5v5",
    isPublic: false,
    sharedTeams: [],
    sharedWithTeamIds: [],
    cadence: "ON ONE",
    audibleColor: "GREEN LIGHT",
    notes: "Primary look is X on single-high fly. C checkdown release across middle.",
    createdAt: Date.now(),
    routes: [
      { player: "QB", coordinates: [{ x: 400, y: 420 }, { x: 400, y: 435 }], routeType: "Drop & Plant", isPrimary: false },
      { player: "C", coordinates: [{ x: 400, y: 350 }, { x: 400, y: 310 }, { x: 450, y: 300 }], routeType: "0: Delay Flat", isPrimary: false },
      { player: "X", coordinates: [{ x: 180, y: 350 }, { x: 180, y: 140 }], routeType: "8: Fade / Go", isPrimary: true },
      { player: "H", coordinates: [{ x: 520, y: 350 }, { x: 520, y: 280 }, { x: 460, y: 250 }], routeType: "2: Quick Slant", isPrimary: false },
      { player: "Z", coordinates: [{ x: 640, y: 350 }, { x: 640, y: 160 }], routeType: "8: Clearout Go", isPrimary: false },
    ],
  },
  {
    name: "Spread Left - Slant Under",
    formation: "Spread",
    category: "Man/Zone Beater",
    format: "5v5",
    isPublic: false,
    sharedTeams: [],
    sharedWithTeamIds: [],
    cadence: "ON SOUND",
    audibleColor: "BLUE 42",
    notes: "X attacks leverage on inside slant. H clears boundary to create void under.",
    createdAt: Date.now(),
    routes: [
      { player: "QB", coordinates: [{ x: 400, y: 420 }, { x: 390, y: 435 }], routeType: "3-Step Drop", isPrimary: false },
      { player: "C", coordinates: [{ x: 400, y: 350 }, { x: 400, y: 300 }, { x: 350, y: 290 }], routeType: "1: Shoot Flat", isPrimary: false },
      { player: "X", coordinates: [{ x: 180, y: 350 }, { x: 180, y: 300 }, { x: 320, y: 240 }], routeType: "2: Slant Inside", isPrimary: true },
      { player: "H", coordinates: [{ x: 280, y: 350 }, { x: 280, y: 260 }, { x: 140, y: 240 }], routeType: "4: Speed Out", isPrimary: false },
      { player: "Z", coordinates: [{ x: 620, y: 350 }, { x: 620, y: 240 }, { x: 450, y: 220 }], routeType: "5: Deep In / Dig", isPrimary: false },
    ],
  },
  {
    name: "Stack Right - Corner Post",
    formation: "Stack",
    category: "Red Zone",
    format: "5v5",
    isPublic: false,
    sharedTeams: [],
    sharedWithTeamIds: [],
    cadence: "ON TWO",
    audibleColor: "RED LIGHT",
    notes: "Stack release creates bracket confusion. X post cuts behind safety bite.",
    createdAt: Date.now(),
    routes: [
      { player: "QB", coordinates: [{ x: 400, y: 420 }, { x: 410, y: 435 }], routeType: "Boot Right", isPrimary: false },
      { player: "C", coordinates: [{ x: 400, y: 350 }, { x: 400, y: 290 }], routeType: "0: Middle Hook", isPrimary: false },
      { player: "X", coordinates: [{ x: 200, y: 350 }, { x: 200, y: 250 }, { x: 320, y: 180 }], routeType: "7: Post", isPrimary: true },
      { player: "H", coordinates: [{ x: 580, y: 350 }, { x: 580, y: 260 }, { x: 700, y: 190 }], routeType: "6: Corner", isPrimary: false },
      { player: "Z", coordinates: [{ x: 580, y: 375 }, { x: 650, y: 360 }, { x: 720, y: 300 }], routeType: "1: Wheel Release", isPrimary: false },
    ],
  },
  {
    name: "Stack Left - T-In",
    formation: "Stack",
    category: "Spread",
    format: "5v5",
    isPublic: false,
    sharedTeams: [],
    sharedWithTeamIds: [],
    cadence: "ON ONE",
    audibleColor: "GOLD 15",
    notes: "X drives 12 yards before 90-degree dig cut across middle line.",
    createdAt: Date.now(),
    routes: [
      { player: "QB", coordinates: [{ x: 400, y: 420 }, { x: 395, y: 435 }], routeType: "Dropback", isPrimary: false },
      { player: "C", coordinates: [{ x: 400, y: 350 }, { x: 430, y: 310 }, { x: 480, y: 280 }], routeType: "2: Arrow Right", isPrimary: false },
      { player: "X", coordinates: [{ x: 220, y: 350 }, { x: 220, y: 230 }, { x: 420, y: 230 }], routeType: "5: Dig / Square In", isPrimary: true },
      { player: "H", coordinates: [{ x: 220, y: 375 }, { x: 130, y: 340 }, { x: 110, y: 250 }], routeType: "1: Flat Under", isPrimary: false },
      { player: "Z", coordinates: [{ x: 620, y: 350 }, { x: 620, y: 150 }], routeType: "8: Clearout Streak", isPrimary: false },
    ],
  },
  {
    name: "Trips Right - Akron (Goal Line)",
    formation: "Trips",
    category: "Red Zone",
    format: "5v5",
    isPublic: false,
    sharedTeams: [],
    sharedWithTeamIds: [],
    cadence: "FAST CADENCE",
    audibleColor: "ORANGE CHECK",
    notes: "Goal line rub concept. Z breaks to back pylon; H sets legal shield pick.",
    createdAt: Date.now(),
    routes: [
      { player: "QB", coordinates: [{ x: 400, y: 420 }, { x: 420, y: 430 }], routeType: "Quick Sprint", isPrimary: false },
      { player: "C", coordinates: [{ x: 400, y: 350 }, { x: 400, y: 310 }], routeType: "0: Goal Line Sit", isPrimary: false },
      { player: "X", coordinates: [{ x: 180, y: 350 }, { x: 180, y: 260 }, { x: 300, y: 200 }], routeType: "2: Backside Slant", isPrimary: false },
      { player: "H", coordinates: [{ x: 520, y: 350 }, { x: 520, y: 300 }, { x: 450, y: 280 }], routeType: "1: Rub Shallow", isPrimary: false },
      { player: "Z", coordinates: [{ x: 640, y: 350 }, { x: 640, y: 280 }, { x: 740, y: 220 }], routeType: "6: Pylon Corner", isPrimary: true },
    ],
  },
  {
    name: "Stack Right - Stack 90",
    formation: "Stack",
    category: "Man/Zone Beater",
    format: "5v5",
    isPublic: false,
    sharedTeams: [],
    sharedWithTeamIds: [],
    cadence: "ON ONE",
    audibleColor: "SILVER BULLET",
    notes: "High-low intermediate spacing. H dig breaks at 10 yards against zone seams.",
    createdAt: Date.now(),
    routes: [
      { player: "QB", coordinates: [{ x: 400, y: 420 }, { x: 400, y: 440 }], routeType: "5-Step Gun", isPrimary: false },
      { player: "C", coordinates: [{ x: 400, y: 350 }, { x: 400, y: 270 }, { x: 340, y: 260 }], routeType: "0: Check & Release", isPrimary: false },
      { player: "X", coordinates: [{ x: 200, y: 350 }, { x: 200, y: 250 }, { x: 130, y: 250 }], routeType: "4: 90-Degree Out", isPrimary: false },
      { player: "H", coordinates: [{ x: 580, y: 350 }, { x: 580, y: 250 }, { x: 420, y: 250 }], routeType: "5: 90-Degree In", isPrimary: true },
      { player: "Z", coordinates: [{ x: 580, y: 375 }, { x: 660, y: 340 }, { x: 720, y: 270 }], routeType: "1: Flat Out", isPrimary: false },
    ],
  },
  {
    name: "Spread Right - Hook 'N' Ladder (Run)",
    formation: "Spread",
    category: "Run",
    format: "5v5",
    isPublic: false,
    sharedTeams: [],
    sharedWithTeamIds: [],
    cadence: "ON HIT",
    audibleColor: "TURBO RED",
    notes: "H catches hitch, immediately lateral flips to trailing Z sprinting full speed.",
    createdAt: Date.now(),
    routes: [
      { player: "QB", coordinates: [{ x: 400, y: 420 }, { x: 410, y: 410 }], routeType: "Quick Pitch / Shuffle", isPrimary: false },
      { player: "C", coordinates: [{ x: 400, y: 350 }, { x: 400, y: 310 }], routeType: "Shield Block / Turn", isPrimary: false },
      { player: "X", coordinates: [{ x: 180, y: 350 }, { x: 180, y: 220 }, { x: 260, y: 170 }], routeType: "7: Post Decoy", isPrimary: false },
      { player: "H", coordinates: [{ x: 500, y: 350 }, { x: 500, y: 280 }, { x: 500, y: 295 }], routeType: "0: 5-Yd Hook Catch", isPrimary: true },
      { player: "Z", coordinates: [{ x: 640, y: 350 }, { x: 580, y: 340 }, { x: 515, y: 290 }, { x: 530, y: 150 }], routeType: "9: Motion Pitch Trail & Burst", isPrimary: false },
    ],
  },
  {
    name: "Trips Right - Pitchpass Al (Pitch)",
    formation: "Trips",
    category: "Run",
    format: "5v5",
    isPublic: false,
    sharedTeams: [],
    sharedWithTeamIds: [],
    cadence: "ON SOUND",
    audibleColor: "VIPER BLUE",
    notes: "QB rolls right with pitch option to H, or pops overtop to Z on corner wheel.",
    createdAt: Date.now(),
    routes: [
      { player: "QB", coordinates: [{ x: 400, y: 420 }, { x: 460, y: 410 }], routeType: "Sprint Option Right", isPrimary: false },
      { player: "C", coordinates: [{ x: 400, y: 350 }, { x: 410, y: 310 }], routeType: "Zone Shield", isPrimary: false },
      { player: "X", coordinates: [{ x: 180, y: 350 }, { x: 180, y: 160 }], routeType: "8: Backside Clearout", isPrimary: false },
      { player: "H", coordinates: [{ x: 500, y: 350 }, { x: 550, y: 340 }, { x: 620, y: 340 }], routeType: "9: Pitch Option Pitchman", isPrimary: true },
      { player: "Z", coordinates: [{ x: 620, y: 350 }, { x: 620, y: 260 }, { x: 720, y: 210 }], routeType: "6: Wheel / Corner Pop", isPrimary: false },
    ],
  },
  {
    name: "Trips Right - Zig Zag (Coverage Beater)",
    formation: "Trips",
    category: "Man/Zone Beater",
    format: "5v5",
    isPublic: false,
    sharedTeams: [],
    sharedWithTeamIds: [],
    cadence: "ON TWO",
    audibleColor: "LIGHTNING GREEN",
    notes: "H stems inside, plants hard on foot, and reverses back outside into open prairie.",
    createdAt: Date.now(),
    routes: [
      { player: "QB", coordinates: [{ x: 400, y: 420 }, { x: 400, y: 440 }], routeType: "Deep Pocket Set", isPrimary: false },
      { player: "C", coordinates: [{ x: 400, y: 350 }, { x: 370, y: 310 }, { x: 320, y: 310 }], routeType: "1: Underneath Check", isPrimary: false },
      { player: "X", coordinates: [{ x: 180, y: 350 }, { x: 180, y: 240 }, { x: 280, y: 170 }], routeType: "7: Post / Split Safety", isPrimary: false },
      { player: "H", coordinates: [{ x: 520, y: 350 }, { x: 540, y: 290 }, { x: 500, y: 270 }, { x: 560, y: 210 }], routeType: "2: Whip / Zig Route", isPrimary: true },
      { player: "Z", coordinates: [{ x: 640, y: 350 }, { x: 640, y: 230 }, { x: 540, y: 230 }], routeType: "5: Deep In / Cross", isPrimary: false },
    ],
  },
];

/**
 * 1-Click Seeder: Seeds the 9 vetted flag plays into the specified user's private library
 */
export async function seedVettedFlagPlaybook(userId: string): Promise<PlayLabPlay[]> {
  const seededPlays: PlayLabPlay[] = [];
  const baseTime = Date.now();

  for (let i = 0; i < VETTED_FLAG_PLAYBOOK_PACK.length; i++) {
    const template = VETTED_FLAG_PLAYBOOK_PACK[i];
    const playToSave = {
      ...template,
      userId,
      isPublic: false,
      sharedTeams: [],
      sharedWithTeamIds: [],
      format: "5v5" as const,
      createdAt: baseTime + (i * 100),
    };

    const savedId = await savePlayLabPlay(playToSave);
    seededPlays.push({
      ...playToSave,
      id: savedId,
    });
  }

  return seededPlays;
}

/**
 * 1-Click Seeder: Seeds the official Top 12 Championship Flag Plays (Slots 1-12)
 * into the current user's private library.
 */
export async function seedChampionship12Playbook(userId: string): Promise<PlayLabPlay[]> {
  const seededPlays: PlayLabPlay[] = [];
  const baseTime = Date.now();

  for (let i = 0; i < CHAMPIONSHIP_12_PLAYS.length; i++) {
    const template = CHAMPIONSHIP_12_PLAYS[i];
    const slot = template.slotIndex || (i + 1);
    const playId = `champ_${userId.substring(0, 8)}_slot_${slot}`;

    const playToSave: PlayLabPlay = {
      ...template,
      id: playId,
      userId,
      slotIndex: slot,
      isPublic: false,
      sharedTeams: [],
      sharedWithTeamIds: [],
      format: "5v5",
      createdAt: baseTime + (i * 50),
      updatedAt: Date.now(),
    };

    const savedId = await savePlayLabPlay(playToSave);
    seededPlays.push({
      ...playToSave,
      id: savedId,
    });
  }

  return seededPlays;
}

/**
 * Returns the active 12-slot call sheet for the user.
 * Hydrates any unassigned slot with the championship preset as default fallback.
 */
export async function get12SlotCallSheet(userId: string): Promise<PlayLabPlay[]> {
  let userPlays: PlayLabPlay[] = [];
  try {
    userPlays = await getUserPlayLabPlays(userId);
  } catch (e) {
    console.warn('Could not fetch user plays for call sheet:', e);
  }

  const callSheet: PlayLabPlay[] = [];

  for (let slot = 1; slot <= 12; slot++) {
    // Check if user has an explicitly assigned play for this slot
    const assigned = userPlays.find((p) => p.slotIndex === slot);
    if (assigned) {
      callSheet.push(assigned);
    } else {
      // Fallback to default preset from CHAMPIONSHIP_12_PLAYS
      const defaultPreset = CHAMPIONSHIP_12_PLAYS.find((p) => p.slotIndex === slot) || CHAMPIONSHIP_12_PLAYS[slot - 1];
      callSheet.push({
        ...defaultPreset,
        id: `preset_slot_${slot}`,
        userId: userId || 'coach',
        slotIndex: slot,
      });
    }
  }

  return callSheet;
}

/**
 * Assigns or updates a play's slot index (1 to 12).
 */
export async function updatePlaySlot(playId: string, slotIndex: number): Promise<void> {
  const existing = await getPlayLabPlay(playId);
  if (!existing) return;

  await savePlayLabPlay({
    ...existing,
    slotIndex,
    updatedAt: Date.now(),
  });
}

/**
 * Pushes all 12 plays of the active call sheet to athletes on the team's Wristband HUD in <200ms.
 */
export async function broadcast12SlotCallSheet(teamId: string, plays: PlayLabPlay[]): Promise<void> {
  try {
    const callSheetRef = doc(db, 'telemetry_callsheets', teamId || 'demo-team');
    await setDoc(
      callSheetRef,
      {
        teamId: teamId || 'demo-team',
        timestamp: Date.now(),
        updatedAt: Date.now(),
        playsCount: plays.length,
        plays: plays.map((p, idx) => ({
          id: p.id || `slot_${idx + 1}`,
          slotIndex: p.slotIndex || idx + 1,
          name: p.name,
          formation: p.formation,
          category: p.category || '5v5',
          cadence: p.cadence || 'ON ONE',
          audibleColor: p.audibleColor || 'GREEN LIGHT',
          conceptNote: p.conceptNote || '',
          routes: p.routes.map(r => ({
            player: r.player,
            routeType: r.routeType,
            isPrimary: Boolean(r.isPrimary),
            color: r.color || (r.isPrimary ? '#F59E0B' : '#38BDF8'),
            isMotion: Boolean(r.isMotion),
            coordinates: r.coordinates,
          })),
        })),
      },
      { merge: true }
    );
    // Also save in localStorage for instant offline receiver access
    localStorage.setItem(`telemetry_callsheet_${teamId || 'demo-team'}`, JSON.stringify(plays));
  } catch (err) {
    console.warn('Failed to broadcast 12-slot call sheet to Firestore:', err);
    // Local fallback is already updated
    localStorage.setItem(`telemetry_callsheet_${teamId || 'demo-team'}`, JSON.stringify(plays));
  }
}

/**
 * Default sample play matching the exact "Fil Fly" example from the user specification.
 */
export const SAMPLE_FIL_FLY_PLAY: PlayLabPlay = {
  id: 'playlab_fil_fly_preset',
  userId: 'master_coach',
  name: 'Fil Fly',
  formation: 'Spread',
  category: 'Spread',
  format: '5v5',
  isPublic: true,
  sharedTeams: [],
  sharedWithTeamIds: [],
  cadence: 'ON ONE',
  audibleColor: 'GREEN LIGHT',
  routes: [
    {
      player: 'QB',
      coordinates: [{ x: 400, y: 390 }, { x: 400, y: 410 }],
      routeType: 'Dropback 3-Step',
      isPrimary: false,
    },
    {
      player: 'C',
      coordinates: [{ x: 400, y: 350 }, { x: 400, y: 310 }, { x: 450, y: 310 }],
      routeType: 'Underneath Drag',
      isPrimary: false,
    },
    {
      player: 'X',
      coordinates: [{ x: 180, y: 350 }, { x: 180, y: 140 }],
      routeType: '9: Go / Fly',
      isPrimary: true,
    },
    {
      player: 'H',
      coordinates: [{ x: 280, y: 355 }, { x: 280, y: 260 }, { x: 160, y: 240 }],
      routeType: '4: Out Route',
      isPrimary: false,
    },
    {
      player: 'Z',
      coordinates: [{ x: 620, y: 350 }, { x: 620, y: 260 }, { x: 520, y: 200 }],
      routeType: '2: Slant Route',
      isPrimary: false,
    },
  ],
  notes: 'Read progression: 1) X Fly vs Single High Safety. 2) Z Slant on soft zone. 3) C Drag checkdown.',
  createdAt: 1725820000000,
};
