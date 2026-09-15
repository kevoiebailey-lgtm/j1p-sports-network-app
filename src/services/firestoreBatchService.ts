/**
 * Firestore Atomic Batching Service & Writer Utility
 * 
 * Groups multiple small write operations (set, update, delete) into atomic batches
 * (up to Firestore's 500-operation transaction limit per batch), drastically reducing
 * HTTP/gRPC round-trips, network overhead, and potential retry costs.
 */

import { 
  writeBatch, 
  doc, 
  collection, 
  DocumentReference, 
  WriteBatch, 
  SetOptions, 
  UpdateData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isFirestoreQuotaExceeded, markFirestoreQuotaExceeded, isQuotaError } from '../lib/firestoreQuotaGuard';

export type BatchOpType = 'set' | 'update' | 'delete';

export interface BatchOperationDescriptor {
  type: BatchOpType;
  ref?: DocumentReference;
  collectionName?: string;
  docId?: string;
  subcollection?: string;
  subDocId?: string;
  data?: any;
  options?: SetOptions;
  description?: string;
}

export interface BatchCommitResult {
  success: boolean;
  totalOperations: number;
  batchesCommitted: number;
  networkRequestsSaved: number;
  durationMs: number;
  error?: string;
}

export interface BatchTelemetry {
  totalBatchesCommitted: number;
  totalOperationsBatched: number;
  networkRequestsSaved: number;
  estimatedCostSavingsDollars: number;
  lastBatchTimestamp: number | null;
}

const STATS_STORAGE_KEY = 'just1play_firestore_batch_telemetry_v1';
const FIRESTORE_BATCH_LIMIT = 500;

class FirestoreBatchTelemetryTracker {
  private telemetry: BatchTelemetry = {
    totalBatchesCommitted: 0,
    totalOperationsBatched: 0,
    networkRequestsSaved: 0,
    estimatedCostSavingsDollars: 0,
    lastBatchTimestamp: null
  };
  private listeners = new Set<(stats: BatchTelemetry) => void>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const saved = localStorage.getItem(STATS_STORAGE_KEY);
      if (saved) {
        this.telemetry = { ...this.telemetry, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore
    }
  }

  private save() {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(this.telemetry));
    } catch {
      // Ignore
    }
    this.notify();
  }

  public recordBatch(opsCount: number, batchesCount: number) {
    if (opsCount <= 0) return;
    this.telemetry.totalOperationsBatched += opsCount;
    this.telemetry.totalBatchesCommitted += batchesCount;
    const saved = Math.max(0, opsCount - batchesCount);
    this.telemetry.networkRequestsSaved += saved;
    // Estimate Blaze cost savings ($0.18 / 100k writes baseline overhead reduction)
    this.telemetry.estimatedCostSavingsDollars = (this.telemetry.networkRequestsSaved * 0.18) / 100000;
    this.telemetry.lastBatchTimestamp = Date.now();
    this.save();
  }

  public getTelemetry(): BatchTelemetry {
    return { ...this.telemetry };
  }

  public subscribe(listener: (stats: BatchTelemetry) => void): () => void {
    this.listeners.add(listener);
    listener(this.getTelemetry());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public reset() {
    this.telemetry = {
      totalBatchesCommitted: 0,
      totalOperationsBatched: 0,
      networkRequestsSaved: 0,
      estimatedCostSavingsDollars: 0,
      lastBatchTimestamp: null
    };
    this.save();
  }

  private notify() {
    const data = this.getTelemetry();
    this.listeners.forEach(l => {
      try { l(data); } catch (e) { console.error('Batch telemetry listener error:', e); }
    });
  }
}

export const firestoreBatchTelemetry = new FirestoreBatchTelemetryTracker();

/**
 * Fluent Batch Writer that handles auto-chunking when exceeding Firestore's 500 ops limit
 */
export class FirestoreBatchWriter {
  private operations: BatchOperationDescriptor[] = [];
  private maxBatchSize: number;

  constructor(maxBatchSize = FIRESTORE_BATCH_LIMIT) {
    this.maxBatchSize = Math.min(maxBatchSize, FIRESTORE_BATCH_LIMIT);
  }

  /**
   * Set a document in the batch
   */
  public set(ref: DocumentReference, data: any, options?: SetOptions): this {
    this.operations.push({
      type: 'set',
      ref,
      data,
      options
    });
    return this;
  }

  /**
   * Update a document in the batch
   */
  public update(ref: DocumentReference, data: UpdateData<any>): this {
    this.operations.push({
      type: 'update',
      ref,
      data
    });
    return this;
  }

  /**
   * Delete a document in the batch
   */
  public delete(ref: DocumentReference): this {
    this.operations.push({
      type: 'delete',
      ref
    });
    return this;
  }

  /**
   * Add arbitrary operation descriptor
   */
  public addOperation(op: BatchOperationDescriptor): this {
    this.operations.push(op);
    return this;
  }

  /**
   * Count of currently staged operations
   */
  public get size(): number {
    return this.operations.length;
  }

  /**
   * Commits all staged operations in atomic chunks of up to 500 operations
   */
  public async commit(): Promise<BatchCommitResult> {
    const startTime = performance.now();
    const totalOps = this.operations.length;

    if (totalOps === 0) {
      return {
        success: true,
        totalOperations: 0,
        batchesCommitted: 0,
        networkRequestsSaved: 0,
        durationMs: 0
      };
    }

    if (isFirestoreQuotaExceeded()) {
      console.warn('[FirestoreBatchWriter] Quota exceeded flag active. Aborting batch commit.');
      return {
        success: false,
        totalOperations: totalOps,
        batchesCommitted: 0,
        networkRequestsSaved: 0,
        durationMs: performance.now() - startTime,
        error: 'Firestore daily quota exceeded.'
      };
    }

    if (!db) {
      throw new Error('Firestore instance is not initialized.');
    }

    // Split operations into chunks
    const chunks: BatchOperationDescriptor[][] = [];
    for (let i = 0; i < this.operations.length; i += this.maxBatchSize) {
      chunks.push(this.operations.slice(i, i + this.maxBatchSize));
    }

    let batchesCommitted = 0;

    try {
      for (const chunk of chunks) {
        const batch: WriteBatch = writeBatch(db);

        for (const op of chunk) {
          const targetRef = op.ref || this.resolveRef(op);
          if (!targetRef) {
            console.warn('[FirestoreBatchWriter] Skipping operation with unresolved ref:', op);
            continue;
          }

          if (op.type === 'set') {
            if (op.options) {
              batch.set(targetRef, op.data, op.options);
            } else {
              batch.set(targetRef, op.data);
            }
          } else if (op.type === 'update') {
            batch.update(targetRef, op.data);
          } else if (op.type === 'delete') {
            batch.delete(targetRef);
          }
        }

        // Commit this chunk
        await batch.commit();
        batchesCommitted += 1;
      }

      const durationMs = Math.round(performance.now() - startTime);
      const networkRequestsSaved = Math.max(0, totalOps - batchesCommitted);

      // Record telemetry
      firestoreBatchTelemetry.recordBatch(totalOps, batchesCommitted);

      console.log(
        `[FirestoreBatchWriter] Successfully committed ${totalOps} operations across ${batchesCommitted} atomic batch(es) in ${durationMs}ms. Saved ~${networkRequestsSaved} individual requests.`
      );

      // Clear staged operations
      this.operations = [];

      return {
        success: true,
        totalOperations: totalOps,
        batchesCommitted,
        networkRequestsSaved,
        durationMs
      };
    } catch (err: any) {
      console.error('[FirestoreBatchWriter] Error committing batch chunk:', err);

      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded(err?.message || 'Batch commit quota exceeded');
      }

      return {
        success: false,
        totalOperations: totalOps,
        batchesCommitted,
        networkRequestsSaved: 0,
        durationMs: performance.now() - startTime,
        error: err?.message || String(err)
      };
    }
  }

  private resolveRef(op: BatchOperationDescriptor): DocumentReference | null {
    if (!db) return null;
    if (op.collectionName && op.docId && op.subcollection && op.subDocId) {
      return doc(db, op.collectionName, op.docId, op.subcollection, op.subDocId);
    }
    if (op.collectionName && op.docId) {
      return doc(db, op.collectionName, op.docId);
    }
    return null;
  }
}

/**
 * Factory helper to instantiate a new FirestoreBatchWriter
 */
export function createBatchWriter(maxBatchSize?: number): FirestoreBatchWriter {
  return new FirestoreBatchWriter(maxBatchSize);
}

/**
 * Standalone helper to execute an array of batch operations atomically
 */
export async function executeAtomicBatch(
  operations: BatchOperationDescriptor[],
  maxBatchSize?: number
): Promise<BatchCommitResult> {
  const writer = new FirestoreBatchWriter(maxBatchSize);
  operations.forEach(op => writer.addOperation(op));
  return await writer.commit();
}

/**
 * Micro-Batch Collector / Auto-Debounced Batching Engine
 * Collects individual writes triggered across components within a debounce time window (e.g. 50ms)
 * and commits them in a single aggregated atomic batch.
 */
export class AutoBatchCollector {
  private buffer: {
    op: BatchOperationDescriptor;
    resolve: (res: BatchCommitResult) => void;
    reject: (err: any) => void;
  }[] = [];
  private timer: NodeJS.Timeout | null = null;
  private debounceMs: number;

  constructor(debounceMs = 50) {
    this.debounceMs = debounceMs;
  }

  public schedule(op: BatchOperationDescriptor): Promise<BatchCommitResult> {
    return new Promise((resolve, reject) => {
      this.buffer.push({ op, resolve, reject });

      if (this.buffer.length >= FIRESTORE_BATCH_LIMIT) {
        this.flush();
      } else {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.flush(), this.debounceMs);
      }
    });
  }

  public async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.buffer.length === 0) return;

    const currentBatch = [...this.buffer];
    this.buffer = [];

    const writer = new FirestoreBatchWriter();
    currentBatch.forEach(item => writer.addOperation(item.op));

    try {
      const result = await writer.commit();
      currentBatch.forEach(item => item.resolve(result));
    } catch (err) {
      currentBatch.forEach(item => item.reject(err));
    }
  }
}

export const autoBatchCollector = new AutoBatchCollector(60);
