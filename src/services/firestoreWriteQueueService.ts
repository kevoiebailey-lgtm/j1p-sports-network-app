/**
 * Firestore Write Queue & Offline Synchronization Service
 * 
 * Holds outgoing write operations (posts, comments, likes, reactions, check-ins)
 * when the user is offline or experiencing network partition, persists them in LocalStorage,
 * coalesces/deduplicates redundant writes, and automatically synchronizes them once the network
 * is restored to eliminate failed re-attempt spikes and minimize Firestore Blaze write costs.
 */

import { 
  doc, 
  collection, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, sanitizeFirestorePayload } from '../lib/firebase';
import { isFirestoreQuotaExceeded, markFirestoreQuotaExceeded, isQuotaError } from '../lib/firestoreQuotaGuard';
import { createBatchWriter } from './firestoreBatchService';

export type WriteOperationType = 'set' | 'add' | 'update' | 'delete';
export type ActionCategory = 'post' | 'comment' | 'reaction' | 'like' | 'stat' | 'checkin' | 'generic';

export interface QueuedWriteItem {
  id: string;
  actionCategory: ActionCategory;
  type: WriteOperationType;
  collectionName: string;
  docId?: string;
  subcollection?: string;
  subDocId?: string;
  payload?: any;
  options?: {
    merge?: boolean;
  };
  dedupKey?: string; // Allows coalescing rapid changes (e.g. 'reaction:post_123')
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  lastError?: string;
  metadata?: {
    title?: string;
    summary?: string;
    authorUid?: string;
    authorName?: string;
  };
}

export interface WriteQueueState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  coalescedCount: number;
  lastSyncTime: number | null;
  items: QueuedWriteItem[];
}

const STORAGE_KEY = 'just1play_firestore_write_queue_v2';
const STATS_KEY = 'just1play_firestore_write_queue_stats';
const DEFAULT_MAX_RETRIES = 5;

class FirestoreWriteQueueService {
  private queue: QueuedWriteItem[] = [];
  private isSyncing = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners = new Set<(state: WriteQueueState) => void>();
  private syncTimer: NodeJS.Timeout | null = null;
  private lifetimeStats = {
    totalSynced: 0,
    totalCoalesced: 0,
    totalFailed: 0,
    lastSyncTime: null as number | null
  };

  constructor() {
    this.loadQueueFromStorage();
    this.loadStatsFromStorage();
    this.initNetworkListeners();

    // If we're online and have pending writes from a previous session, trigger sync
    if (this.isOnline && this.getPendingCount() > 0) {
      setTimeout(() => this.processQueue(), 1500);
    }
  }

  // ==========================================
  // 1. LIFECYCLE & NETWORK LISTENERS
  // ==========================================
  private initNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[FirestoreWriteQueue] Network connection RESTORED. Triggering automatic write queue flush...');
      this.isOnline = true;
      this.notifyListeners();
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.warn('[FirestoreWriteQueue] Network connection LOST. All outgoing Firestore writes will be held in resilient local queue.');
      this.isOnline = false;
      this.notifyListeners();
    });

    // Optional heartbeat check for flaky connections
    window.addEventListener('focus', () => {
      if (typeof navigator !== 'undefined' && navigator.onLine !== this.isOnline) {
        this.isOnline = navigator.onLine;
        this.notifyListeners();
        if (this.isOnline && this.getPendingCount() > 0) {
          this.processQueue();
        }
      }
    });

    // Automatically trigger queue sync when user signs in
    if (auth) {
      try {
        onAuthStateChanged(auth, (user) => {
          if (user && this.isOnline && this.getPendingCount() > 0) {
            console.log('[FirestoreWriteQueue] User authenticated. Flushing pending user writes...');
            this.processQueue();
          }
        });
      } catch (e) {
        // Safe catch for SSR/testing
      }
    }
  }

  // ==========================================
  // 2. STORAGE PERSISTENCE
  // ==========================================
  private loadQueueFromStorage() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: QueuedWriteItem[] = JSON.parse(stored);
        // Reset any items that were mid-'syncing' when tab was closed back to 'pending'
        this.queue = parsed.map(item => ({
          ...item,
          status: item.status === 'syncing' ? 'pending' : item.status
        }));
      }
    } catch (e) {
      console.warn('[FirestoreWriteQueue] Could not load persisted queue:', e);
      this.queue = [];
    }
  }

  private saveQueueToStorage() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      } catch (e) {
        console.warn('[FirestoreWriteQueue] Could not persist queue to localStorage:', e);
      }
    }
    this.notifyListeners();
  }

  private loadStatsFromStorage() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(STATS_KEY);
      if (stored) {
        this.lifetimeStats = { ...this.lifetimeStats, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore
    }
  }

  private saveStatsToStorage() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(this.lifetimeStats));
    } catch {
      // Ignore
    }
  }

  // ==========================================
  // 3. SUBSCRIBERS & STATE NOTIFICATION
  // ==========================================
  public subscribe(listener: (state: WriteQueueState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (err) {
        console.error('[FirestoreWriteQueue] Error in subscriber listener:', err);
      }
    });
  }

  public getState(): WriteQueueState {
    const pending = this.queue.filter(i => i.status === 'pending' || i.status === 'syncing');
    const failed = this.queue.filter(i => i.status === 'failed');
    const synced = this.queue.filter(i => i.status === 'synced');

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: pending.length,
      syncedCount: this.lifetimeStats.totalSynced + synced.length,
      failedCount: failed.length,
      coalescedCount: this.lifetimeStats.totalCoalesced,
      lastSyncTime: this.lifetimeStats.lastSyncTime,
      items: [...this.queue]
    };
  }

  public getPendingCount(): number {
    return this.queue.filter(i => i.status === 'pending').length;
  }

  // ==========================================
  // 4. ENQUEUE & COALESCING ENGINE
  // ==========================================
  /**
   * Enqueues a write operation.
   * If a write with the same `dedupKey` already exists in pending state,
   * coalesces the new payload with the pending item rather than queuing redundant writes.
   */
  public enqueue(params: {
    actionCategory: ActionCategory;
    type: WriteOperationType;
    collectionName: string;
    docId?: string;
    subcollection?: string;
    subDocId?: string;
    payload?: any;
    options?: { merge?: boolean };
    dedupKey?: string;
    metadata?: {
      title?: string;
      summary?: string;
      authorUid?: string;
      authorName?: string;
    };
  }): QueuedWriteItem {
    const now = Date.now();

    // Check for coalescing deduplication
    if (params.dedupKey) {
      const existingIndex = this.queue.findIndex(
        item => item.dedupKey === params.dedupKey && (item.status === 'pending' || item.status === 'failed')
      );

      if (existingIndex !== -1) {
        const existing = this.queue[existingIndex];
        console.log(`[FirestoreWriteQueue] Coalescing write for key: "${params.dedupKey}". Replacing prior payload to save billable writes.`);
        
        const updatedItem: QueuedWriteItem = {
          ...existing,
          payload: params.options?.merge ? { ...existing.payload, ...params.payload } : params.payload,
          options: params.options || existing.options,
          updatedAt: now,
          status: 'pending',
          lastError: undefined,
          metadata: params.metadata || existing.metadata
        };

        this.queue[existingIndex] = updatedItem;
        this.lifetimeStats.totalCoalesced += 1;
        this.saveStatsToStorage();
        this.saveQueueToStorage();

        // Trigger sync attempt if online
        if (this.isOnline && !this.isSyncing) {
          this.scheduleDebouncedProcess();
        }

        return updatedItem;
      }
    }

    // Create new queue item
    const newItem: QueuedWriteItem = {
      id: `write_${now}_${Math.random().toString(36).slice(2, 8)}`,
      actionCategory: params.actionCategory,
      type: params.type,
      collectionName: params.collectionName,
      docId: params.docId,
      subcollection: params.subcollection,
      subDocId: params.subDocId,
      payload: params.payload,
      options: params.options,
      dedupKey: params.dedupKey,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: DEFAULT_MAX_RETRIES,
      status: 'pending',
      metadata: params.metadata
    };

    this.queue.push(newItem);
    this.saveQueueToStorage();

    console.log(`[FirestoreWriteQueue] Enqueued write [${newItem.actionCategory}] for collection "${newItem.collectionName}" (Queue size: ${this.queue.length})`);

    // If online, kick off sync
    if (this.isOnline && !this.isSyncing) {
      this.scheduleDebouncedProcess();
    }

    return newItem;
  }

  private scheduleDebouncedProcess(delayMs = 300) {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.processQueue();
    }, delayMs);
  }

  // ==========================================
  // 5. HIGH-LEVEL SPECIALIZED ENQUEUE HELPERS
  // ==========================================
  /**
   * Enqueue a new social post
   */
  public enqueuePost(postId: string, postPayload: any) {
    return this.enqueue({
      actionCategory: 'post',
      type: 'set',
      collectionName: 'socialPosts',
      docId: postId,
      payload: postPayload,
      options: { merge: true },
      dedupKey: `post:${postId}`,
      metadata: {
        title: 'New Social Post',
        summary: postPayload.caption?.slice(0, 50) || 'Game film or highlight tape',
        authorUid: postPayload.authorUid,
        authorName: postPayload.authorName
      }
    });
  }

  /**
   * Enqueue a comment on a social post
   */
  public enqueueComment(postId: string, commentData: any, fullPostCommentsList?: any[]) {
    // 1. Update the parent post's embedded comments list
    if (fullPostCommentsList) {
      this.enqueue({
        actionCategory: 'comment',
        type: 'set',
        collectionName: 'socialPosts',
        docId: postId,
        payload: {
          comments: fullPostCommentsList,
          commentsCount: fullPostCommentsList.length
        },
        options: { merge: true },
        dedupKey: `post_comments:${postId}`,
        metadata: {
          title: 'Post Comment Added',
          summary: commentData.text?.slice(0, 50) || 'New reply',
          authorUid: commentData.authorUid,
          authorName: commentData.authorName
        }
      });
    }

    // 2. Add to subcollection for live subcollection listeners if comment has ID
    if (commentData.id) {
      this.enqueue({
        actionCategory: 'comment',
        type: 'set',
        collectionName: 'socialPosts',
        docId: postId,
        subcollection: 'comments',
        subDocId: commentData.id,
        payload: commentData,
        options: { merge: true },
        dedupKey: `sub_comment:${postId}:${commentData.id}`
      });
    }
  }

  /**
   * Enqueue a sports emoji reaction with coalescing
   */
  public enqueueReaction(postId: string, updatedReactions: Record<string, string[]>) {
    return this.enqueue({
      actionCategory: 'reaction',
      type: 'set',
      collectionName: 'socialPosts',
      docId: postId,
      payload: { reactions: updatedReactions },
      options: { merge: true },
      dedupKey: `reaction:${postId}`,
      metadata: {
        title: 'Emoji Reaction Update',
        summary: `Reactions on post ${postId.slice(0, 8)}...`
      }
    });
  }

  /**
   * Enqueue a post like toggle with coalescing
   */
  public enqueueLike(postId: string, updatedLikes: string[], updatedLikesCount: number) {
    return this.enqueue({
      actionCategory: 'like',
      type: 'set',
      collectionName: 'socialPosts',
      docId: postId,
      payload: {
        likes: updatedLikes,
        likesCount: updatedLikesCount
      },
      options: { merge: true },
      dedupKey: `like:${postId}`,
      metadata: {
        title: 'Post Like Toggle',
        summary: `Like on post ${postId.slice(0, 8)}...`
      }
    });
  }

  // ==========================================
  // 6. SYNC & QUEUE FLUSH PROCESSING ENGINE
  // ==========================================
  /**
   * Flushes the write queue in FIFO order with exponential backoff
   */
  public async processQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isSyncing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    if (!this.isOnline) {
      console.log('[FirestoreWriteQueue] Device is currently offline. Skipping sync until connectivity returns.');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    if (isFirestoreQuotaExceeded()) {
      console.warn('[FirestoreWriteQueue] Daily quota exceeded flag active. Holding writes in local queue to prevent backoff errors.');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    const pendingItems = this.queue.filter(
      item => item.status === 'pending' || (item.status === 'failed' && item.retryCount < item.maxRetries)
    );

    if (pendingItems.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();

    let succeeded = 0;
    let failed = 0;

    console.log(`[FirestoreWriteQueue] Starting queue sync: ${pendingItems.length} items to process...`);

    // If we have multiple pending items, attempt atomic batch execution first for massive network & cost savings
    if (pendingItems.length > 1 && db && !isFirestoreQuotaExceeded()) {
      try {
        const batchWriter = createBatchWriter();
        const batchEligibleItems: QueuedWriteItem[] = [];

        for (const item of pendingItems) {
          let targetRef: any = null;
          if (item.docId && item.subcollection && item.subDocId) {
            targetRef = doc(db, item.collectionName, item.docId, item.subcollection, item.subDocId);
          } else if (item.docId) {
            targetRef = doc(db, item.collectionName, item.docId);
          } else if (item.type === 'add') {
            // Pre-generate doc ID for atomic batched set
            const newDocRef = doc(collection(db, item.collectionName));
            targetRef = newDocRef;
          }

          if (targetRef) {
            if (item.type === 'set' || item.type === 'add') {
              batchWriter.set(targetRef, item.payload, item.options?.merge ? { merge: true } : undefined);
              batchEligibleItems.push(item);
            } else if (item.type === 'update') {
              batchWriter.update(targetRef, item.payload);
              batchEligibleItems.push(item);
            } else if (item.type === 'delete') {
              batchWriter.delete(targetRef);
              batchEligibleItems.push(item);
            }
          }
        }

        if (batchEligibleItems.length > 0) {
          const batchResult = await batchWriter.commit();
          if (batchResult.success) {
            const now = Date.now();
            for (const item of batchEligibleItems) {
              item.status = 'synced';
              item.updatedAt = now;
            }
            succeeded += batchEligibleItems.length;
            this.lifetimeStats.totalSynced += batchEligibleItems.length;
            this.lifetimeStats.lastSyncTime = now;

            // Remove synced items
            this.queue = this.queue.filter(i => i.status !== 'synced');
            this.isSyncing = false;
            this.saveStatsToStorage();
            this.saveQueueToStorage();
            this.notifyListeners();

            console.log(`[FirestoreWriteQueue] Atomic batch sync completed: ${batchEligibleItems.length} items synced in ${batchResult.batchesCommitted} batch(es).`);
            return { processed: pendingItems.length, succeeded, failed: 0 };
          }
        }
      } catch (batchErr: any) {
        console.warn('[FirestoreWriteQueue] Batch execution encountered issue, falling back to sequential writes:', batchErr);
      }
    }

    // Fallback: Individual item execution loop
    for (const item of pendingItems) {
      if (item.status === 'synced') continue;

      // Re-check online status between items
      if (!this.isOnline) {
        console.warn('[FirestoreWriteQueue] Network disconnected during sync loop. Pausing queue.');
        break;
      }

      // Mark as syncing
      item.status = 'syncing';
      this.notifyListeners();

      try {
        await this.executeWrite(item);

        // Mark succeeded
        item.status = 'synced';
        item.updatedAt = Date.now();
        succeeded += 1;
        this.lifetimeStats.totalSynced += 1;
        this.lifetimeStats.lastSyncTime = Date.now();

        // Brief delay between writes to avoid burst throttling
        await new Promise(r => setTimeout(r, 80));
      } catch (err: any) {
        console.warn(`[FirestoreWriteQueue] Write failed for item ${item.id}:`, err?.message || err);

        if (isQuotaError(err)) {
          markFirestoreQuotaExceeded(err?.message || 'Quota reached during sync');
          item.status = 'pending';
          item.lastError = 'Firestore daily quota reached. Saved locally in queue.';
          failed += 1;
          break; // Stop loop if quota exhausted
        }

        item.retryCount += 1;
        item.lastError = err?.message || String(err);

        if (item.retryCount >= item.maxRetries) {
          item.status = 'failed';
          this.lifetimeStats.totalFailed += 1;
        } else {
          item.status = 'pending'; // Will retry next round
        }

        failed += 1;
      }
    }

    // Clean up successfully synced items from active queue after retention
    this.queue = this.queue.filter(i => i.status !== 'synced');

    this.isSyncing = false;
    this.saveStatsToStorage();
    this.saveQueueToStorage();

    console.log(`[FirestoreWriteQueue] Queue sync cycle complete. Succeeded: ${succeeded}, Failed: ${failed}, Remaining: ${this.queue.length}`);
    return { processed: pendingItems.length, succeeded, failed };
  }

  /**
   * Executes a single Firestore write operation
   */
  private async executeWrite(item: QueuedWriteItem): Promise<void> {
    if (!db) {
      throw new Error('Firestore database instance is not initialized.');
    }

    // Build target reference
    let targetRef: any;

    if (item.docId && item.subcollection && item.subDocId) {
      targetRef = doc(db, item.collectionName, item.docId, item.subcollection, item.subDocId);
    } else if (item.docId) {
      targetRef = doc(db, item.collectionName, item.docId);
    } else {
      targetRef = collection(db, item.collectionName);
    }

    switch (item.type) {
      case 'set':
        const cleanSetPayload = sanitizeFirestorePayload(item.payload);
        if (item.options?.merge) {
          await setDoc(targetRef, cleanSetPayload, { merge: true });
        } else {
          await setDoc(targetRef, cleanSetPayload);
        }
        break;

      case 'add':
        const cleanAddPayload = sanitizeFirestorePayload(item.payload);
        await addDoc(collection(db, item.collectionName), cleanAddPayload);
        break;

      case 'update':
        const cleanUpdatePayload = sanitizeFirestorePayload(item.payload);
        await updateDoc(targetRef, cleanUpdatePayload);
        break;

      case 'delete':
        await deleteDoc(targetRef);
        break;

      default:
        throw new Error(`Unsupported write operation type: ${(item as any).type}`);
    }
  }

  // ==========================================
  // 7. PUBLIC CONTROL & MANAGEMENT METHODS
  // ==========================================
  /**
   * Manually trigger immediate queue sync
   */
  public async syncNow() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return await this.processQueue();
  }

  /**
   * Retry a specific failed item
   */
  public async retryItem(itemId: string) {
    const item = this.queue.find(i => i.id === itemId);
    if (item) {
      item.status = 'pending';
      item.retryCount = 0;
      item.lastError = undefined;
      this.saveQueueToStorage();
      if (this.isOnline) {
        this.processQueue();
      }
    }
  }

  /**
   * Remove an item from the queue
   */
  public removeItem(itemId: string) {
    this.queue = this.queue.filter(i => i.id !== itemId);
    this.saveQueueToStorage();
  }

  /**
   * Clear all pending or failed items
   */
  public clearQueue() {
    this.queue = [];
    this.saveQueueToStorage();
  }

  /**
   * Reset lifetime sync telemetry stats
   */
  public resetStats() {
    this.lifetimeStats = {
      totalSynced: 0,
      totalCoalesced: 0,
      totalFailed: 0,
      lastSyncTime: null
    };
    this.saveStatsToStorage();
    this.notifyListeners();
  }
}

export const firestoreWriteQueue = new FirestoreWriteQueueService();
