import { 
  collection, 
  getDocs, 
  writeBatch, 
  query, 
  limit, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  ref, 
  listAll, 
  deleteObject, 
  StorageReference 
} from 'firebase/storage';
import { db } from '../lib/firebase';
import { storage } from './firebaseStorage';
import { STORAGE_FOLDERS } from './storageService';

export interface ScanTargetCollection {
  name: string;
  count: number;
  sampleIds: string[];
  description: string;
}

export interface ScanTargetStoragePath {
  path: string;
  fileCount: number;
  sampleFiles: string[];
  description: string;
}

export interface MediaGalleryScanResult {
  timestamp: string;
  collections: ScanTargetCollection[];
  storagePaths: ScanTargetStoragePath[];
  totalFirestoreDocs: number;
  totalStorageFiles: number;
}

export interface CleanerProgressUpdate {
  phase: 'scanning' | 'firestore' | 'storage' | 'completed' | 'error';
  current: number;
  total: number;
  log: string;
  type: 'info' | 'success' | 'warn' | 'error';
  timestamp: string;
}

export interface ClearMediaGalleryOptions {
  collectionsToClear: string[];
  storagePathsToClear: string[];
  onProgress?: (update: CleanerProgressUpdate) => void;
}

export interface ClearMediaGallerySummary {
  success: boolean;
  deletedDocsCount: number;
  deletedStorageFilesCount: number;
  clearedCollections: string[];
  clearedStoragePaths: string[];
  errors: string[];
  durationMs: number;
}

export const DEFAULT_GALLERY_COLLECTIONS: { name: string; description: string }[] = [
  { name: 'gallery', description: 'Primary action photos, watermarked media, and showcase assets' },
  { name: 'albums', description: 'Event, tournament, and game albums metadata collection' },
  { name: 'Albums', description: 'Legacy capitalized albums collection' },
  { name: 'media_vault', description: 'Direct media vault uploads and high-res source items' },
  { name: 'media_vault_meta', description: 'Vault indexing and photographer attribution records' },
  { name: 'tournament_gallery', description: 'Tournament-specific photo feeds and brackets media' },
  { name: 'photos', description: 'Legacy action photo records collection' }
];

export const DEFAULT_GALLERY_STORAGE_PATHS: { path: string; description: string }[] = [
  { path: STORAGE_FOLDERS.MEDIA_VAULT_PHOTOS, description: '4K action photos and compressed gallery uploads (/media_vault/photos)' },
  { path: STORAGE_FOLDERS.MEDIA_VAULT_VIDEOS, description: 'Vault video clips and highlight reels (/media_vault/videos)' },
  { path: STORAGE_FOLDERS.GALLERY_COVERS, description: 'Album cover photos and showcase banners (/media_vault/gallery/covers)' },
  { path: STORAGE_FOLDERS.GALLERY_ALBUMS, description: 'Album media archives and sub-collections (/media_vault/gallery/albums)' },
  { path: STORAGE_FOLDERS.EVENT_FLYERS, description: 'Event and tournament promotional flyers (/media_vault/flyers/events)' },
  { path: STORAGE_FOLDERS.TOURNAMENT_FLYERS, description: 'Tournament bracket showcase banners (/media_vault/flyers/tournaments)' },
  { path: STORAGE_FOLDERS.POST_MEDIA, description: 'Post media uploads and social feed captures (/media_vault/posts/media)' },
  { path: 'gallery', description: 'Legacy root gallery folder (/gallery)' },
  { path: 'albums', description: 'Legacy root albums folder (/albums)' }
];

/**
 * Scan all relevant Firestore collections and Firebase Storage paths to inventory items
 */
export async function scanMediaGalleryInventory(
  targetCollections: string[] = DEFAULT_GALLERY_COLLECTIONS.map(c => c.name),
  targetPaths: string[] = DEFAULT_GALLERY_STORAGE_PATHS.map(p => p.path),
  onLog?: (msg: string) => void
): Promise<MediaGalleryScanResult> {
  const collectionsResult: ScanTargetCollection[] = [];
  const storageResult: ScanTargetStoragePath[] = [];

  let totalDocs = 0;
  let totalFiles = 0;

  // 1. Scan Firestore Collections
  if (db) {
    for (const colName of targetCollections) {
      onLog?.(`Scanning Firestore collection: ${colName}...`);
      try {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        const count = snap.size;
        totalDocs += count;

        const sampleIds = snap.docs.slice(0, 5).map(d => {
          const data = d.data() || {};
          const title = data.title || data.albumName || data.name || data.fileName || d.id;
          return `${d.id} ("${title}")`;
        });

        const desc = DEFAULT_GALLERY_COLLECTIONS.find(c => c.name === colName)?.description || `Firestore collection "${colName}"`;

        collectionsResult.push({
          name: colName,
          count,
          sampleIds,
          description: desc
        });
      } catch (err: any) {
        console.warn(`Error scanning collection ${colName}:`, err);
        collectionsResult.push({
          name: colName,
          count: 0,
          sampleIds: [],
          description: `Failed to read collection: ${err?.message || 'Permission denied'}`
        });
      }
    }
  }

  // 2. Scan Firebase Storage Paths
  if (storage) {
    for (const folderPath of targetPaths) {
      onLog?.(`Scanning Firebase Storage path: ${folderPath}...`);
      try {
        const folderRef = ref(storage, folderPath);
        const listResult = await listAll(folderRef);
        const fileCount = listResult.items.length;
        totalFiles += fileCount;

        const sampleFiles = listResult.items.slice(0, 5).map(item => item.name);

        const desc = DEFAULT_GALLERY_STORAGE_PATHS.find(p => p.path === folderPath)?.description || `Firebase Storage path "${folderPath}"`;

        storageResult.push({
          path: folderPath,
          fileCount,
          sampleFiles,
          description: desc
        });
      } catch (err: any) {
        // Folder might not exist yet or empty, which is normal in Firebase Storage
        storageResult.push({
          path: folderPath,
          fileCount: 0,
          sampleFiles: [],
          description: `Folder empty or inactive (${err?.message || 'no files'})`
        });
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    collections: collectionsResult,
    storagePaths: storageResult,
    totalFirestoreDocs: totalDocs,
    totalStorageFiles: totalFiles
  };
}

/**
 * Recursively deletes all items inside a Firebase Storage reference path
 */
async function deleteStorageFolderRecursively(
  folderRef: StorageReference,
  onFileDeleted?: (filePath: string) => void
): Promise<{ deletedCount: number; errors: string[] }> {
  let deletedCount = 0;
  const errors: string[] = [];

  try {
    const res = await listAll(folderRef);

    // Delete all files in current folder
    for (const itemRef of res.items) {
      try {
        await deleteObject(itemRef);
        deletedCount++;
        onFileDeleted?.(itemRef.fullPath);
      } catch (err: any) {
        console.error(`Failed to delete storage file ${itemRef.fullPath}:`, err);
        errors.push(`File ${itemRef.fullPath}: ${err?.message || 'Delete error'}`);
      }
    }

    // Recursively delete subfolders (prefixes)
    for (const prefixRef of res.prefixes) {
      const subResult = await deleteStorageFolderRecursively(prefixRef, onFileDeleted);
      deletedCount += subResult.deletedCount;
      errors.push(...subResult.errors);
    }
  } catch (err: any) {
    if (err?.code !== 'storage/object-not-found') {
      errors.push(`Folder ${folderRef.fullPath}: ${err?.message || 'List error'}`);
    }
  }

  return { deletedCount, errors };
}

/**
 * Execute the clearing of selected Firestore collections and Firebase Storage paths
 */
export async function executeMediaGalleryClear(
  options: ClearMediaGalleryOptions
): Promise<ClearMediaGallerySummary> {
  const startTime = Date.now();
  const errors: string[] = [];
  let deletedDocsCount = 0;
  let deletedStorageFilesCount = 0;

  const emitProgress = (
    phase: CleanerProgressUpdate['phase'],
    current: number,
    total: number,
    log: string,
    type: CleanerProgressUpdate['type'] = 'info'
  ) => {
    options.onProgress?.({
      phase,
      current,
      total,
      log,
      type,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  emitProgress('scanning', 0, 1, 'Starting Media Gallery cleaner utility...', 'info');

  // 1. CLEAR FIRESTORE COLLECTIONS
  if (db && options.collectionsToClear.length > 0) {
    emitProgress('firestore', 0, options.collectionsToClear.length, 'Beginning Firestore collections deletion...', 'info');

    for (let cIdx = 0; cIdx < options.collectionsToClear.length; cIdx++) {
      const colName = options.collectionsToClear[cIdx];
      emitProgress('firestore', cIdx, options.collectionsToClear.length, `Inspecting collection: ${colName}...`, 'info');

      try {
        const colRef = collection(db, colName);
        let hasMore = true;
        let colDeletedTotal = 0;

        while (hasMore) {
          const snap = await getDocs(query(colRef, limit(350)));
          if (snap.empty) {
            hasMore = false;
            break;
          }

          const batch = writeBatch(db);
          snap.docs.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });

          await batch.commit();
          colDeletedTotal += snap.docs.length;
          deletedDocsCount += snap.docs.length;

          emitProgress(
            'firestore',
            cIdx + 1,
            options.collectionsToClear.length,
            `Deleted batch of ${snap.docs.length} docs from "${colName}" (Total in collection: ${colDeletedTotal})`,
            'info'
          );

          // If fewer than requested limit were returned, we reached the end
          if (snap.docs.length < 350) {
            hasMore = false;
          }
        }

        emitProgress(
          'firestore',
          cIdx + 1,
          options.collectionsToClear.length,
          `Collection "${colName}" cleared: ${colDeletedTotal} documents removed.`,
          colDeletedTotal > 0 ? 'success' : 'info'
        );
      } catch (err: any) {
        console.error(`Error clearing Firestore collection ${colName}:`, err);
        const errMsg = `Firestore "${colName}": ${err?.message || 'Write failed'}`;
        errors.push(errMsg);
        emitProgress('firestore', cIdx + 1, options.collectionsToClear.length, `Failed to clear "${colName}": ${err?.message}`, 'error');
      }
    }
  }

  // 2. CLEAR FIREBASE STORAGE PATHS
  if (storage && options.storagePathsToClear.length > 0) {
    emitProgress('storage', 0, options.storagePathsToClear.length, 'Beginning Firebase Storage folders purge...', 'info');

    for (let sIdx = 0; sIdx < options.storagePathsToClear.length; sIdx++) {
      const folderPath = options.storagePathsToClear[sIdx];
      emitProgress('storage', sIdx, options.storagePathsToClear.length, `Scanning Storage folder: ${folderPath}...`, 'info');

      try {
        const folderRef = ref(storage, folderPath);
        const { deletedCount, errors: folderErrors } = await deleteStorageFolderRecursively(
          folderRef,
          (fullPath) => {
            emitProgress('storage', sIdx, options.storagePathsToClear.length, `Deleted storage object: ${fullPath}`, 'info');
          }
        );

        deletedStorageFilesCount += deletedCount;
        if (folderErrors.length > 0) {
          errors.push(...folderErrors);
        }

        emitProgress(
          'storage',
          sIdx + 1,
          options.storagePathsToClear.length,
          `Storage folder "${folderPath}" cleared: ${deletedCount} files removed.`,
          deletedCount > 0 ? 'success' : 'info'
        );
      } catch (err: any) {
        console.error(`Error clearing storage path ${folderPath}:`, err);
        const errMsg = `Storage "${folderPath}": ${err?.message || 'Access error'}`;
        errors.push(errMsg);
        emitProgress('storage', sIdx + 1, options.storagePathsToClear.length, `Failed to clear storage path "${folderPath}": ${err?.message}`, 'error');
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const isSuccess = errors.length === 0;

  emitProgress(
    'completed',
    1,
    1,
    `Media Gallery Reset Completed in ${(durationMs / 1000).toFixed(1)}s! Deleted ${deletedDocsCount} Firestore records and ${deletedStorageFilesCount} Storage files.`,
    isSuccess ? 'success' : 'warn'
  );

  return {
    success: isSuccess,
    deletedDocsCount,
    deletedStorageFilesCount,
    clearedCollections: options.collectionsToClear,
    clearedStoragePaths: options.storagePathsToClear,
    errors,
    durationMs
  };
}
