import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import { db, auth, sanitizeFirestorePayload } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { PlayerNode, SportType, PlaybookCardData } from '../components/Playbook/types';

export interface SavePlayPayload {
  id?: string;
  title: string;
  description: string;
  sport: SportType;
  sportName?: string;
  players: PlayerNode[];
  formation?: string;
  personnel?: string;
  passProtection?: string;
  tags?: string[];
  authorId?: string;
  authorName?: string;
  creatorId?: string;
  athleteId?: string;
  athleteName?: string;
}

export interface PlayFilterOptions {
  sport?: SportType;
  userId?: string;
  limitCount?: number;
}

/**
 * Normalizes player nodes from Firestore document data to ensure
 * clean coordinate numbers, array routes, and all progression/blocking tags.
 */
export function normalizePlayerNodes(rawPlayers: any[]): PlayerNode[] {
  if (!Array.isArray(rawPlayers)) return [];

  return rawPlayers.map((p, index) => {
    // Ensure route points are valid { x, y } numbers
    const rawRoute = Array.isArray(p.route) ? p.route : [];
    const validRoute = rawRoute
      .map((pt: any) => ({
        x: typeof pt?.x === 'number' && !isNaN(pt.x) ? pt.x : 0,
        y: typeof pt?.y === 'number' && !isNaN(pt.y) ? pt.y : 0,
      }))
      .filter((pt: any) => pt.x >= 0 && pt.x <= 800 && pt.y >= 0 && pt.y <= 500);

    return {
      id: p.id || `token_${index}_${Date.now()}`,
      label: p.label || (p.role === 'defense' ? 'X' : p.role === 'cone' ? 'CONE' : 'O'),
      role: p.role === 'defense' || p.role === 'cone' ? p.role : 'offense',
      shape: p.shape === 'cross' || p.shape === 'square' ? p.shape : 'circle',
      color: p.color || (p.role === 'defense' ? '#ef4444' : p.role === 'cone' ? '#f59e0b' : '#10b981'),
      x: typeof p.x === 'number' && !isNaN(p.x) ? p.x : 400,
      y: typeof p.y === 'number' && !isNaN(p.y) ? p.y : 300,
      route: validRoute,
      progression: p.progression || 'none',
      blocking: p.blocking || 'none',
      preSnapMotion: p.preSnapMotion,
      customNote: p.customNote || '',
    };
  });
}

/**
 * Transforms a raw Firestore play snapshot into a typed PlaybookCardData object.
 */
export function transformPlayDoc(docId: string, data: any): PlaybookCardData & { 
  createdAt?: string; 
  updatedAt?: string; 
  authorId?: string;
  sportName?: string;
} {
  const createdAtFormatted = data.createdAt instanceof Timestamp 
    ? data.createdAt.toDate().toISOString() 
    : typeof data.createdAt === 'string' ? data.createdAt : undefined;

  const updatedAtFormatted = data.updatedAt instanceof Timestamp 
    ? data.updatedAt.toDate().toISOString() 
    : typeof data.updatedAt === 'string' ? data.updatedAt : undefined;

  return {
    id: docId,
    title: data.title || 'Untitled Play',
    sport: (data.sport as SportType) || 'flag_5v5',
    sportName: data.sportName || 'Tactical Play',
    description: data.description || '',
    personnel: data.personnel || '',
    formation: data.formation || '',
    passProtection: data.passProtection || '',
    players: normalizePlayerNodes(data.players),
    authorName: data.authorName || data.athleteName || 'Coach / Athlete',
    authorId: data.authorId || data.creatorId || data.userId || data.athleteId,
    createdAt: createdAtFormatted,
    updatedAt: updatedAtFormatted,
  };
}

/**
 * Service Layer: Save a new play or update an existing play in Firestore.
 * Accurately serializes individual player nodes, route waypoints, progression reads, and blocking schemes.
 */
export async function savePlay(payload: SavePlayPayload): Promise<string> {
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid || payload.authorId || payload.creatorId || 'guest_coach';
  const currentDisplayName = currentUser?.displayName || payload.authorName || 'Coach / Athlete';

  const collectionRef = collection(db, 'plays');
  const docRef = payload.id ? doc(collectionRef, payload.id) : doc(collectionRef);
  const path = `plays/${docRef.id}`;

  const cleanPlayers = normalizePlayerNodes(payload.players);

  const rawDocument = {
    title: payload.title?.trim() || 'Custom Play',
    description: payload.description?.trim() || '',
    sport: payload.sport || 'flag_5v5',
    sportName: payload.sportName || 'Custom Tactical Play',
    formation: payload.formation || '',
    personnel: payload.personnel || '',
    passProtection: payload.passProtection || '',
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    players: cleanPlayers,
    type: 'tactical_playbook',
    category: 'Playbook Lab',
    isInteractive: true,
    authorId: currentUid,
    authorName: currentDisplayName,
    creatorId: currentUid,
    athleteId: currentUid,
    athleteName: currentDisplayName,
    userId: currentUid,
    updatedAt: serverTimestamp(),
    ...(payload.id ? {} : { createdAt: serverTimestamp() }),
  };

  const sanitized = sanitizeFirestorePayload(rawDocument);

  try {
    await setDoc(docRef, sanitized, { merge: true });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Service Layer: Update specific fields of an existing play.
 */
export async function updatePlay(playId: string, updates: Partial<SavePlayPayload>): Promise<void> {
  if (!playId) throw new Error('Play ID is required for update.');
  const docRef = doc(db, 'plays', playId);
  const path = `plays/${playId}`;

  const payloadToUpdate: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.title !== undefined) payloadToUpdate.title = updates.title.trim();
  if (updates.description !== undefined) payloadToUpdate.description = updates.description.trim();
  if (updates.sport !== undefined) payloadToUpdate.sport = updates.sport;
  if (updates.sportName !== undefined) payloadToUpdate.sportName = updates.sportName;
  if (updates.formation !== undefined) payloadToUpdate.formation = updates.formation;
  if (updates.personnel !== undefined) payloadToUpdate.personnel = updates.personnel;
  if (updates.passProtection !== undefined) payloadToUpdate.passProtection = updates.passProtection;
  if (updates.tags !== undefined) payloadToUpdate.tags = updates.tags;
  if (updates.players !== undefined) payloadToUpdate.players = normalizePlayerNodes(updates.players);

  const sanitized = sanitizeFirestorePayload(payloadToUpdate);

  try {
    await updateDoc(docRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Service Layer: Retrieve a play by document ID.
 */
export async function getPlayById(playId: string): Promise<PlaybookCardData | null> {
  if (!playId) return null;
  const docRef = doc(db, 'plays', playId);
  const path = `plays/${playId}`;

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return transformPlayDoc(snap.id, snap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Service Layer: Real-time listener for a single play document.
 */
export function subscribeToPlay(
  playId: string, 
  callback: (play: PlaybookCardData | null) => void
): Unsubscribe {
  const docRef = doc(db, 'plays', playId);
  const path = `plays/${playId}`;

  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
      } else {
        callback(transformPlayDoc(snap.id, snap.data()));
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        console.warn(`Play snapshot notice for ${path}:`, e);
      }
      callback(null);
    }
  );
}

/**
 * Service Layer: Fetch a list of plays filtered by sport or author.
 */
export async function getPlays(options: PlayFilterOptions = {}): Promise<PlaybookCardData[]> {
  const collectionRef = collection(db, 'plays');
  const path = 'plays';

  try {
    const constraints: any[] = [orderBy('updatedAt', 'desc')];

    if (options.sport) {
      constraints.unshift(where('sport', '==', options.sport));
    }
    if (options.userId) {
      constraints.unshift(where('authorId', '==', options.userId));
    }
    if (options.limitCount && options.limitCount > 0) {
      constraints.push(limit(options.limitCount));
    } else {
      constraints.push(limit(50));
    }

    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((docSnap) => transformPlayDoc(docSnap.id, docSnap.data()));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (e) {
      console.warn(`getPlays list notice for ${path}:`, e);
    }
    return [];
  }
}

/**
 * Service Layer: Real-time subscription to plays created by a specific user.
 */
export function subscribeToUserPlays(
  userId: string,
  callback: (plays: PlaybookCardData[]) => void
): Unsubscribe {
  const collectionRef = collection(db, 'plays');
  const path = `plays?authorId=${userId}`;

  const q = query(
    collectionRef,
    where('authorId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const plays = snapshot.docs.map((docSnap) => transformPlayDoc(docSnap.id, docSnap.data()));
      callback(plays);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        console.warn(`User plays snapshot notice for ${path}:`, e);
      }
      callback([]);
    }
  );
}

/**
 * Service Layer: Real-time subscription to public/community plays (optionally by sport).
 */
export function subscribeToPublicPlays(
  sport?: SportType,
  callback?: (plays: PlaybookCardData[]) => void
): Unsubscribe {
  const collectionRef = collection(db, 'plays');
  const path = `plays?sport=${sport || 'all'}`;

  const constraints: any[] = [orderBy('updatedAt', 'desc'), limit(50)];
  if (sport) {
    constraints.unshift(where('sport', '==', sport));
  }

  const q = query(collectionRef, ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const plays = snapshot.docs.map((docSnap) => transformPlayDoc(docSnap.id, docSnap.data()));
      if (callback) callback(plays);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        console.warn(`Public plays snapshot notice for ${path}:`, e);
      }
      if (callback) callback([]);
    }
  );
}

/**
 * Service Layer: Delete a custom play from Firestore.
 */
export async function deletePlay(playId: string): Promise<void> {
  if (!playId) return;
  const docRef = doc(db, 'plays', playId);
  const path = `plays/${playId}`;

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Service Layer: Duplicate an existing play into a new editable version.
 */
export async function duplicatePlay(
  playId: string, 
  newAuthorId?: string, 
  newAuthorName?: string
): Promise<string> {
  const original = await getPlayById(playId);
  if (!original) throw new Error('Original play not found.');

  const currentUser = auth.currentUser;
  const targetAuthorId = newAuthorId || currentUser?.uid || original.authorName || 'coach';
  const targetAuthorName = newAuthorName || currentUser?.displayName || original.authorName || 'Coach';

  const newPayload: SavePlayPayload = {
    title: `${original.title} (Copy)`,
    description: original.description,
    sport: original.sport,
    formation: original.formation,
    personnel: original.personnel,
    passProtection: original.passProtection,
    players: JSON.parse(JSON.stringify(original.players)),
    authorId: targetAuthorId,
    authorName: targetAuthorName,
  };

  return await savePlay(newPayload);
}

// Re-export staple plays seeding from seedPlays script
export { seedStaplePlays, STAPLE_PLAYS } from '../scripts/seedPlays';
export type { StaplePlayDefinition, StaplePlayRouteItem } from '../scripts/seedPlays';

/**
 * Service Layer: Fetch all playbooks/plays for a specific team.
 */
export async function getTeamPlaybooks(teamId: string): Promise<any[]> {
  if (!teamId) return [];
  const playbookRef = collection(db, 'teams', teamId, 'playbooks');
  try {
    const snap = await getDocs(playbookRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.warn(`Could not load team playbooks for ${teamId}:`, error);
    return [];
  }
}

/**
 * Service Layer: Subscribe to playbooks for a specific team.
 */
export function subscribeToTeamPlaybooks(
  teamId: string,
  callback: (plays: any[]) => void
): Unsubscribe {
  const playbookRef = collection(db, 'teams', teamId, 'playbooks');
  return onSnapshot(
    playbookRef,
    (snapshot) => {
      const plays = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(plays);
    },
    (error) => {
      console.warn(`Team playbooks snapshot error for ${teamId}:`, error);
      callback([]);
    }
  );
}
