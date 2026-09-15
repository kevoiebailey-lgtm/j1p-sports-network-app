import { 
  collection, 
  doc, 
  getDocs, 
  deleteDoc, 
  writeBatch, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

/**
 * Helper to delete a collection or query results in chunked batches (Firestore limit is 500 per batch)
 */
async function deleteQueryInBatches(docsToDelete: Array<{ ref: any; path: string }>): Promise<number> {
  if (!docsToDelete || docsToDelete.length === 0) return 0;

  const CHUNK_SIZE = 400;
  let totalDeleted = 0;

  for (let i = 0; i < docsToDelete.length; i += CHUNK_SIZE) {
    const chunk = docsToDelete.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((item) => {
      batch.delete(item.ref);
    });

    await batch.commit();
    totalDeleted += chunk.length;
  }

  return totalDeleted;
}

/**
 * Cascading Deletion for Events & Showcases:
 * Deletes the root event doc and all subcollections (/events/{eventId}/rsvps, /events/{eventId}/attendees)
 * as well as associated games.
 */
export async function deleteEventCascade(eventId: string): Promise<{
  deletedEvent: boolean;
  deletedRsvps: number;
  deletedAttendees: number;
  deletedGames: number;
}> {
  if (!eventId) throw new Error('Event ID is required for cascade deletion');

  try {
    // 1. Fetch RSVPs subcollection
    const rsvpsRef = collection(db, 'events', eventId, 'rsvps');
    const rsvpsSnap = await getDocs(rsvpsRef).catch(() => null);
    const rsvpDocs = rsvpsSnap ? rsvpsSnap.docs.map(d => ({ ref: d.ref, path: d.ref.path })) : [];

    // 2. Fetch Attendees subcollection
    const attendeesRef = collection(db, 'events', eventId, 'attendees');
    const attendeesSnap = await getDocs(attendeesRef).catch(() => null);
    const attendeeDocs = attendeesSnap ? attendeesSnap.docs.map(d => ({ ref: d.ref, path: d.ref.path })) : [];

    // 3. Fetch any associated games where eventId or tournamentId equals this ID
    const gamesRef = collection(db, 'games');
    const gamesQuery = query(gamesRef, where('tournamentId', '==', eventId));
    const gamesSnap = await getDocs(gamesQuery).catch(() => null);
    const gameDocs = gamesSnap ? gamesSnap.docs.map(d => ({ ref: d.ref, path: d.ref.path })) : [];

    // 4. Batch delete subcollections
    const deletedRsvps = await deleteQueryInBatches(rsvpDocs);
    const deletedAttendees = await deleteQueryInBatches(attendeeDocs);
    const deletedGames = await deleteQueryInBatches(gameDocs);

    // 5. Delete root event document
    const eventDocRef = doc(db, 'events', eventId);
    await deleteDoc(eventDocRef);

    console.log(
      `⚡ [CascadeDelete] Event ${eventId} deleted successfully. Sub-items cleared: ` +
      `${deletedRsvps} RSVPs, ${deletedAttendees} Attendees, ${deletedGames} Games.`
    );

    return {
      deletedEvent: true,
      deletedRsvps,
      deletedAttendees,
      deletedGames
    };
  } catch (error) {
    throw handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`);
  }
}

/**
 * Cascading Deletion for Multi-Game Seasons:
 * Deletes the root season doc (/seasons/{seasonId}), all associated games in (/games),
 * and all team standings in (/seasons/{seasonId}/teams).
 */
export async function deleteSeasonCascade(seasonId: string): Promise<{
  deletedSeason: boolean;
  deletedTeams: number;
  deletedGames: number;
}> {
  if (!seasonId) throw new Error('Season ID is required for cascade deletion');

  try {
    // 1. Fetch Teams subcollection
    const teamsRef = collection(db, 'seasons', seasonId, 'teams');
    const teamsSnap = await getDocs(teamsRef).catch(() => null);
    const teamDocs = teamsSnap ? teamsSnap.docs.map(d => ({ ref: d.ref, path: d.ref.path })) : [];

    // 2. Fetch associated games matching seasonId (or tournamentId)
    const gamesRef = collection(db, 'games');
    const gamesQuery = query(gamesRef, where('seasonId', '==', seasonId));
    const gamesSnap = await getDocs(gamesQuery).catch(() => null);
    let gameDocs = gamesSnap ? gamesSnap.docs.map(d => ({ ref: d.ref, path: d.ref.path })) : [];

    // Also check tournamentId fallback
    if (gameDocs.length === 0) {
      const fallbackQuery = query(gamesRef, where('tournamentId', '==', seasonId));
      const fallbackSnap = await getDocs(fallbackQuery).catch(() => null);
      if (fallbackSnap && !fallbackSnap.empty) {
        gameDocs = fallbackSnap.docs.map(d => ({ ref: d.ref, path: d.ref.path }));
      }
    }

    // 3. Batch delete teams subcollection and games
    const deletedTeams = await deleteQueryInBatches(teamDocs);
    const deletedGames = await deleteQueryInBatches(gameDocs);

    // 4. Delete root season document
    const seasonDocRef = doc(db, 'seasons', seasonId);
    await deleteDoc(seasonDocRef);

    console.log(
      `⚡ [CascadeDelete] Season ${seasonId} deleted successfully. ` +
      `Teams cleared: ${deletedTeams}, Games cleared: ${deletedGames}.`
    );

    return {
      deletedSeason: true,
      deletedTeams,
      deletedGames
    };
  } catch (error) {
    throw handleFirestoreError(error, OperationType.DELETE, `seasons/${seasonId}`);
  }
}

export default {
  deleteEventCascade,
  deleteSeasonCascade
};
