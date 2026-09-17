// Global Firestore Quota & Offline State Manager
// Protects against free-tier write exhaustion, backoff loops, and provides seamless offline fallback

import { 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  DocumentReference, 
  CollectionReference, 
  SetOptions, 
  UpdateData 
} from 'firebase/firestore';
import { sanitizeFirestorePayload } from './firebase';
import { firestoreWriteQueue } from '../services/firestoreWriteQueueService';

type QuotaListener = (exceeded: boolean) => void;

let quotaExceededState = false;
const listeners = new Set<QuotaListener>();

export const FIRESTORE_UPGRADE_URL = 
  'https://console.firebase.google.com/project/just1play/firestore';

export function resetFirestoreQuotaState() {
  quotaExceededState = false;
  try {
    sessionStorage.removeItem('just1play_firestore_quota_exceeded');
  } catch (e) {
    // Ignore
  }
  listeners.forEach(fn => {
    try {
      fn(false);
    } catch (err) {
      console.error('Error notifying quota listener on reset:', err);
    }
  });
}

/**
 * Check if the Firestore quota has been marked as exceeded for this session
 */
export function isFirestoreQuotaExceeded(): boolean {
  if (quotaExceededState) return true;
  try {
    const cached = sessionStorage.getItem('just1play_firestore_quota_exceeded');
    if (cached === 'true') {
      quotaExceededState = true;
      return true;
    }
  } catch (e) {
    // Ignore storage restrictions
  }
  return false;
}

/**
 * Mark that Firestore write quota has been exceeded
 */
export function markFirestoreQuotaExceeded(reason?: string) {
  if (!quotaExceededState) {
    quotaExceededState = true;
    try {
      sessionStorage.setItem('just1play_firestore_quota_exceeded', 'true');
    } catch (e) {
      // Ignore
    }
    console.warn('[Firestore Quota Guard] Free daily write units quota reached. Switching writes to resilient local fallback mode.', reason);
    listeners.forEach(fn => {
      try {
        fn(true);
      } catch (err) {
        console.error('Error notifying quota listener:', err);
      }
    });
  }
}

/**
 * Subscribe to quota status changes across the app
 */
export function subscribeToQuotaStatus(listener: QuotaListener): () => void {
  listeners.add(listener);
  if (isFirestoreQuotaExceeded()) {
    listener(true);
  }
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Helper to check if an error is a Firestore quota / resource exhaustion error
 */
export function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  const msg = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as any).message)
    : String(error);
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as any).code)
    : '';

  return (
    code === 'resource-exhausted' ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('quota metric') ||
    msg.includes('Free daily write units') ||
    msg.includes('Free daily read units') ||
    msg.includes('maximum backoff delay')
  );
}

/**
 * Execute a Firestore write safely. If quota is exceeded, skips network call and returns fallback immediately.
 */
export async function safeFirestoreWrite<T>(
  writeFn: () => Promise<T>,
  fallbackFn?: () => T | Promise<T>
): Promise<T | null> {
  if (isFirestoreQuotaExceeded()) {
    if (fallbackFn) {
      return await fallbackFn();
    }
    return null;
  }

  try {
    return await writeFn();
  } catch (error: any) {
    if (isQuotaError(error)) {
      markFirestoreQuotaExceeded(error?.message || 'Resource exhausted');
      if (fallbackFn) {
        return await fallbackFn();
      }
      return null;
    }
    throw error;
  }
}

/**
 * Drop-in safe replacements for Firebase Firestore write functions
 */
export async function safeSetDoc<T>(
  reference: DocumentReference<T>,
  data: Partial<T> | T,
  options?: SetOptions
): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const cleanData = sanitizeFirestorePayload(data);
  if (!isOnline || isFirestoreQuotaExceeded()) {
    // Parse collection and docId from reference path
    const pathParts = reference.path.split('/');
    const collectionName = pathParts[0];
    const docId = pathParts[1];
    const subcollection = pathParts[2];
    const subDocId = pathParts[3];

    firestoreWriteQueue.enqueue({
      actionCategory: 'generic',
      type: 'set',
      collectionName,
      docId,
      subcollection,
      subDocId,
      payload: cleanData,
      options: options ? { merge: (options as any).merge } : undefined,
      metadata: {
        title: `Set /${reference.path}`
      }
    });
    return;
  }

  try {
    if (options) {
      await setDoc(reference, cleanData, options);
    } else {
      await setDoc(reference, cleanData as any);
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded(err?.message || 'setDoc quota exceeded');
    }
    console.warn('[safeSetDoc notice - enqueued to write buffer]', err?.message || err);

    const pathParts = reference.path.split('/');
    firestoreWriteQueue.enqueue({
      actionCategory: 'generic',
      type: 'set',
      collectionName: pathParts[0],
      docId: pathParts[1],
      subcollection: pathParts[2],
      subDocId: pathParts[3],
      payload: cleanData,
      options: options ? { merge: (options as any).merge } : undefined
    });
  }
}

export async function safeAddDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T> | null> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const cleanData = sanitizeFirestorePayload(data);
  if (!isOnline || isFirestoreQuotaExceeded()) {
    firestoreWriteQueue.enqueue({
      actionCategory: 'generic',
      type: 'add',
      collectionName: reference.path,
      payload: cleanData,
      metadata: {
        title: `Add /${reference.path}`
      }
    });
    return null;
  }

  try {
    return await addDoc(reference, cleanData);
  } catch (err: any) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded(err?.message || 'addDoc quota exceeded');
    }
    console.warn('[safeAddDoc notice - enqueued to write buffer]', err?.message || err);

    firestoreWriteQueue.enqueue({
      actionCategory: 'generic',
      type: 'add',
      collectionName: reference.path,
      payload: cleanData
    });
    return null;
  }
}

export async function safeUpdateDoc<T extends object>(
  reference: DocumentReference<T>,
  data: UpdateData<T>
): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const cleanData = sanitizeFirestorePayload(data);
  if (!isOnline || isFirestoreQuotaExceeded()) {
    const pathParts = reference.path.split('/');
    firestoreWriteQueue.enqueue({
      actionCategory: 'generic',
      type: 'update',
      collectionName: pathParts[0],
      docId: pathParts[1],
      subcollection: pathParts[2],
      subDocId: pathParts[3],
      payload: cleanData,
      metadata: {
        title: `Update /${reference.path}`
      }
    });
    return;
  }

  try {
    await updateDoc(reference, cleanData);
  } catch (err: any) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded(err?.message || 'updateDoc quota exceeded');
    }
    console.warn('[safeUpdateDoc notice - enqueued to write buffer]', err?.message || err);

    const pathParts = reference.path.split('/');
    firestoreWriteQueue.enqueue({
      actionCategory: 'generic',
      type: 'update',
      collectionName: pathParts[0],
      docId: pathParts[1],
      subcollection: pathParts[2],
      subDocId: pathParts[3],
      payload: cleanData
    });
  }
}

export async function safeDeleteDoc<T>(
  reference: DocumentReference<T>
): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline || isFirestoreQuotaExceeded()) {
    const pathParts = reference.path.split('/');
    firestoreWriteQueue.enqueue({
      actionCategory: 'generic',
      type: 'delete',
      collectionName: pathParts[0],
      docId: pathParts[1],
      metadata: {
        title: `Delete /${reference.path}`
      }
    });
    return;
  }

  try {
    await deleteDoc(reference);
  } catch (err: any) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded(err?.message || 'deleteDoc quota exceeded');
    }
    console.warn('[safeDeleteDoc notice - enqueued to write buffer]', err?.message || err);

    const pathParts = reference.path.split('/');
    firestoreWriteQueue.enqueue({
      actionCategory: 'generic',
      type: 'delete',
      collectionName: pathParts[0],
      docId: pathParts[1]
    });
  }
}

// Re-export batching service helpers for direct convenience
export { 
  createBatchWriter, 
  executeAtomicBatch, 
  autoBatchCollector, 
  FirestoreBatchWriter,
  firestoreBatchTelemetry 
} from '../services/firestoreBatchService';
export type { 
  BatchOperationDescriptor, 
  BatchCommitResult, 
  BatchTelemetry 
} from '../services/firestoreBatchService';

