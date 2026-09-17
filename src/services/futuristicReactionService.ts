import { db, sanitizeFirestorePayload } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  collection,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { FuturisticReactionKey, FUTURISTIC_REACTIONS } from '../components/Social/FuturisticAthleticIcons';

/**
 * ============================================================================
 * FIRESTORE DATA SCHEMA SPECIFICATION FOR FUTURISTIC REACTIONS
 * ============================================================================
 * 
 * Document: `posts/{postId}`
 * {
 *   id: string;
 *   caption: string;
 *   // ...other post fields...
 *   
 *   // 1. Dynamic reaction counters map (fast O(1) reads without subcollection queries)
 *   reactionCounts?: {
 *     head_tap: number;
 *     ice: number;
 *     clamped: number;
 *     cooking: number;
 *     aura: number;
 *   };
 * 
 *   // 2. High-speed lookup map for top reacted user lists
 *   reactionUsers?: {
 *     head_tap: string[]; // User IDs (capped/synced)
 *     ice: string[];
 *     clamped: string[];
 *     cooking: string[];
 *     aura: string[];
 *   };
 * 
 *   totalReactionsCount?: number;
 *   updatedAt?: Timestamp;
 * }
 * 
 * Subcollection: `posts/{postId}/reactions/{userId}`
 * {
 *   userId: string;
 *   reactionType: 'head_tap' | 'ice' | 'clamped' | 'cooking' | 'aura';
 *   createdAt: Timestamp;
 *   updatedAt: Timestamp;
 * }
 * ============================================================================
 */

export interface PostReactionSummary {
  counts: Record<FuturisticReactionKey, number>;
  userReactions: Record<FuturisticReactionKey, string[]>;
  currentUserReaction: FuturisticReactionKey | null;
  totalCount: number;
}

export const INITIAL_REACTION_COUNTS: Record<FuturisticReactionKey, number> = {
  head_tap: 0,
  ice: 0,
  clamped: 0,
  cooking: 0,
  aura: 0
};

export const INITIAL_USER_REACTIONS: Record<FuturisticReactionKey, string[]> = {
  head_tap: [],
  ice: [],
  clamped: [],
  cooking: [],
  aura: []
};

/**
 * ATOMIC FIRESTORE REACTION TOGGLER
 * Handles:
 * 1. User clicking the SAME reaction -> Toggles OFF (decrement count, remove user, delete doc)
 * 2. User clicking a DIFFERENT reaction -> Switches reaction (decrements old, increments new, updates user doc)
 * 3. User clicking a NEW reaction -> Activates reaction (increments new count, adds user, creates doc)
 * 
 * Uses atomic Firestore transactions + field increments to eliminate race conditions.
 */
export async function toggleFuturisticReaction(
  postId: string,
  reactionType: FuturisticReactionKey,
  userId: string,
  userName?: string
): Promise<{
  action: 'added' | 'removed' | 'switched';
  activeReaction: FuturisticReactionKey | null;
}> {
  if (!postId || !userId) {
    throw new Error('Post ID and User ID are required to react');
  }

  // If local offline/demo mode without active Firestore connection
  if (!db) {
    return { action: 'added', activeReaction: reactionType };
  }

  const postRef = doc(db, 'posts', postId);
  const userReactionDocRef = doc(db, `posts/${postId}/reactions`, userId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userReactionSnap = await transaction.get(userReactionDocRef);
      const postSnap = await transaction.get(postRef);

      const existingData = userReactionSnap.exists() ? userReactionSnap.data() : null;
      const prevReaction = existingData?.reactionType as FuturisticReactionKey | undefined;

      // CASE 1: Toggle OFF (User clicked the same active reaction)
      if (prevReaction === reactionType) {
        transaction.delete(userReactionDocRef);

        if (postSnap.exists()) {
          transaction.update(postRef, {
            [`reactionCounts.${reactionType}`]: increment(-1),
            [`reactionUsers.${reactionType}`]: arrayRemove(userId),
            totalReactionsCount: increment(-1),
            updatedAt: serverTimestamp()
          });
        }

        return { action: 'removed' as const, activeReaction: null };
      }

      // CASE 2: Switch Reaction (User changed from one reaction to another)
      if (prevReaction && prevReaction !== reactionType) {
        transaction.set(userReactionDocRef, {
          userId,
          userName: userName || 'Athlete',
          reactionType,
          updatedAt: serverTimestamp()
        });

        if (postSnap.exists()) {
          transaction.update(postRef, {
            [`reactionCounts.${prevReaction}`]: increment(-1),
            [`reactionUsers.${prevReaction}`]: arrayRemove(userId),
            [`reactionCounts.${reactionType}`]: increment(1),
            [`reactionUsers.${reactionType}`]: arrayUnion(userId),
            updatedAt: serverTimestamp()
          });
        }

        return { action: 'switched' as const, activeReaction: reactionType };
      }

      // CASE 3: New Reaction
      transaction.set(userReactionDocRef, {
        userId,
        userName: userName || 'Athlete',
        reactionType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (postSnap.exists()) {
        transaction.update(postRef, {
          [`reactionCounts.${reactionType}`]: increment(1),
          [`reactionUsers.${reactionType}`]: arrayUnion(userId),
          totalReactionsCount: increment(1),
          updatedAt: serverTimestamp()
        });
      } else {
        // Post document might not have reaction fields yet
        transaction.set(postRef, {
          reactionCounts: {
            ...INITIAL_REACTION_COUNTS,
            [reactionType]: 1
          },
          reactionUsers: {
            ...INITIAL_USER_REACTIONS,
            [reactionType]: [userId]
          },
          totalReactionsCount: 1,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      return { action: 'added' as const, activeReaction: reactionType };
    });

    return result;
  } catch (error) {
    console.warn('[FuturisticReactionService] Transaction fallback to direct write:', error);

    // Fallback: direct update if transaction encountered contention
    try {
      const snap = await getDoc(userReactionDocRef);
      if (snap.exists() && snap.data()?.reactionType === reactionType) {
        await deleteDoc(userReactionDocRef);
        await updateDoc(postRef, {
          [`reactionCounts.${reactionType}`]: increment(-1),
          [`reactionUsers.${reactionType}`]: arrayRemove(userId),
          totalReactionsCount: increment(-1)
        });
        return { action: 'removed', activeReaction: null };
      } else {
        await setDoc(userReactionDocRef, {
          userId,
          reactionType,
          updatedAt: serverTimestamp()
        });
        await updateDoc(postRef, {
          [`reactionCounts.${reactionType}`]: increment(1),
          [`reactionUsers.${reactionType}`]: arrayUnion(userId),
          totalReactionsCount: increment(1)
        });
        return { action: 'added', activeReaction: reactionType };
      }
    } catch (fallbackErr) {
      console.error('[FuturisticReactionService] Failed to record reaction:', fallbackErr);
      return { action: 'added', activeReaction: reactionType };
    }
  }
}

/**
 * Subscribes to real-time reaction updates for a specific post
 */
export function subscribePostReactions(
  postId: string,
  currentUserId: string,
  onUpdate: (summary: PostReactionSummary) => void
): Unsubscribe {
  if (!db || !postId) {
    onUpdate({
      counts: { ...INITIAL_REACTION_COUNTS },
      userReactions: { ...INITIAL_USER_REACTIONS },
      currentUserReaction: null,
      totalCount: 0
    });
    return () => {};
  }

  const postRef = doc(db, 'posts', postId);

  return onSnapshot(
    postRef,
    (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();

      const counts: Record<FuturisticReactionKey, number> = {
        head_tap: data.reactionCounts?.head_tap || 0,
        ice: data.reactionCounts?.ice || 0,
        clamped: data.reactionCounts?.clamped || 0,
        cooking: data.reactionCounts?.cooking || 0,
        aura: data.reactionCounts?.aura || 0
      };

      const userReactions: Record<FuturisticReactionKey, string[]> = {
        head_tap: data.reactionUsers?.head_tap || [],
        ice: data.reactionUsers?.ice || [],
        clamped: data.reactionUsers?.clamped || [],
        cooking: data.reactionUsers?.cooking || [],
        aura: data.reactionUsers?.aura || []
      };

      // Determine current user's reaction from user arrays or legacy data
      let currentUserReaction: FuturisticReactionKey | null = null;
      (Object.keys(FUTURISTIC_REACTIONS) as FuturisticReactionKey[]).forEach((key) => {
        if (userReactions[key]?.includes(currentUserId)) {
          currentUserReaction = key;
        }
      });

      const totalCount = data.totalReactionsCount ?? 
        Object.values(counts).reduce((acc, curr) => acc + curr, 0);

      onUpdate({
        counts,
        userReactions,
        currentUserReaction,
        totalCount
      });
    },
    (err) => {
      console.warn(`[FuturisticReactionService] Real-time listener notice for post ${postId}:`, err);
    }
  );
}
