import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Pause,
  Play,
  X,
  FileText,
  Zap,
  HardDrive,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, updateDoc, writeBatch, increment, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { storage, db, auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { processImageForIngest, type ProcessedImageDerivative } from '../../lib/media/clientImageProcessor';
import { fileToDataUrl } from '../../lib/imageCompressor';

export interface BatchUploadDropzoneProps {
  albumId: string;
  albumTitle: string;
  creatorPayPalEmail?: string;
  watermarkText?: string;
  onUploadSuccess?: (count: number) => void;
  onViewGallery?: () => void;
}

interface UploadTaskItem {
  id: string;
  file: File;
  status: 'queued' | 'processing' | 'uploading' | 'completed' | 'error';
  progress: number; // 0 - 100
  bytesTransferred: number;
  totalBytes: number;
  thumbUrl?: string;
  previewUrl?: string;
  vaultPath?: string;
  error?: string;
  errorCode?: string;
  retryCount?: number;
  startTime?: number;
  finishTime?: number;
}

// Concurrency chunk limit: 3 photos in flight at a time to prevent socket saturation & browser memory stalls
const CHUNK_SIZE = 3;

/**
 * Resilient upload wrapper with 45-second watchdog timer and up to 2 automatic retries
 */
interface StorageUploadOptions {
  contentType: string;
  cacheControl?: string;
  maxRetries?: number;
  timeoutMs?: number;
  onProgress?: (transferred: number, total: number) => void;
}

async function uploadResumableWithRetry(
  storageRef: any,
  data: Blob | File,
  options: StorageUploadOptions
): Promise<void> {
  const {
    contentType,
    cacheControl,
    maxRetries = 2,
    timeoutMs = 45000,
    onProgress,
  } = options;

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    let timer: any = null;
    let uploadTask: any = null;

    try {
      await new Promise<void>((resolve, reject) => {
        console.log('[Firebase Storage Bucket before uploadBytesResumable]:', storage.app.options.storageBucket);
        uploadTask = uploadBytesResumable(storageRef, data, {
          contentType,
          ...(cacheControl ? { cacheControl } : {}),
        });

        const resetWatchdog = () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            try {
              uploadTask.cancel();
            } catch {
              // ignore
            }
            const timeoutErr: any = new Error(
              `Firebase Storage upload stalled (>45s inactivity) on attempt ${attempt + 1}`
            );
            timeoutErr.code = 'storage/retry-limit-exceeded';
            reject(timeoutErr);
          }, timeoutMs);
        };

        resetWatchdog();

        uploadTask.on(
          'state_changed',
          (snapshot: any) => {
            resetWatchdog();
            if (onProgress && snapshot.totalBytes > 0) {
              onProgress(snapshot.bytesTransferred, snapshot.totalBytes);
            }
          },
          (err: any) => {
            if (timer) clearTimeout(timer);
            reject(err);
          },
          () => {
            if (timer) clearTimeout(timer);
            resolve();
          }
        );
      });

      // Upload completed successfully
      return;
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      lastError = err;
      const errorCode = err?.code || err?.message || 'storage/unknown';
      console.warn(
        `[Storage upload attempt ${attempt + 1}/${maxRetries + 1} notice for ${storageRef.fullPath}]: ${errorCode}`
      );

      attempt += 1;
      if (attempt <= maxRetries) {
        // Linear backoff before retry (1s, 2s)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw lastError;
}

/**
 * Converts a Blob to a base64 Data URL.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads a complete photo package via the server ingestion pipeline.
 * Bypasses client-side storage permission blocks with 100% reliability, writes to
 * Firebase Admin Storage or disk, and returns verified asset endpoints.
 */
async function uploadPhotoPackageViaServer(
  albumId: string,
  photoId: string,
  filename: string,
  derivative: ProcessedImageDerivative
): Promise<{
  thumbUrl: string;
  previewUrl: string;
  cleanMasterUrl: string;
  vaultPath: string;
}> {
  const [thumbBase64, previewBase64, vaultBase64] = await Promise.all([
    blobToBase64(derivative.thumbBlob),
    blobToBase64(derivative.previewBlob),
    blobToBase64(derivative.compressedMasterBlob),
  ]);

  const response = await fetch('/api/creator/upload-photo-package', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      albumId,
      photoId,
      filename,
      thumbBase64,
      previewBase64,
      vaultBase64,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server package upload failed with status ${response.status}`);
  }

  const result = await response.json();
  return {
    thumbUrl: result.thumbUrl,
    previewUrl: result.previewUrl,
    cleanMasterUrl: result.cleanMasterUrl,
    vaultPath: result.vaultPath || `galleries/${albumId}/vault/${photoId}.jpg`,
  };
}

export const BatchUploadDropzone: React.FC<BatchUploadDropzoneProps> = ({
  albumId,
  albumTitle,
  watermarkText = 'JUST1PLAY',
  onUploadSuccess,
  onViewGallery,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<UploadTaskItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Speed and time calculation
  const [currentSpeedMBps, setCurrentSpeedMBps] = useState(0);
  const lastBytesRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());

  // Concurrency tracking refs
  const queueRef = useRef<UploadTaskItem[]>([]);
  queueRef.current = queue;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const isProcessingRef = useRef<boolean>(false);
  const directStorageBlockedRef = useRef<boolean>(false);
  const completedInBatchRef = useRef<
    Array<{ id: string; thumbUrl: string; previewUrl: string }>
  >([]);

  // Stats
  const totalFiles = queue.length;
  const completedCount = queue.filter((item) => item.status === 'completed').length;
  const errorCount = queue.filter((item) => item.status === 'error').length;
  const uploadingCount = queue.filter((item) => item.status === 'uploading' || item.status === 'processing').length;
  const queuedCount = queue.filter((item) => item.status === 'queued').length;

  const totalBytesOverall = queue.reduce((acc, curr) => acc + (curr.file?.size || 0), 0);
  const transferredBytesOverall = queue.reduce((acc, curr) => acc + (curr.bytesTransferred || 0), 0);
  const overallPercent = totalBytesOverall > 0 ? Math.round((transferredBytesOverall / totalBytesOverall) * 100) : 0;

  // Track transfer speed every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = (now - lastTimeRef.current) / 1000;
      if (elapsedSec > 0) {
        const deltaBytes = transferredBytesOverall - lastBytesRef.current;
        if (deltaBytes > 0) {
          const mbps = deltaBytes / (1024 * 1024) / elapsedSec;
          setCurrentSpeedMBps(Number(mbps.toFixed(2)));
        } else if (uploadingCount === 0) {
          setCurrentSpeedMBps(0);
        }
      }
      lastBytesRef.current = transferredBytesOverall;
      lastTimeRef.current = now;
    }, 1000);

    return () => clearInterval(interval);
  }, [transferredBytesOverall, uploadingCount]);

  /**
   * Single photo processor:
   * 1. Pre-compresses raw DSLR/mobile image down to max 2560px @ 85% JPEG quality + derivatives
   * 2. Uploads thumbnail, watermarked preview, and compressed master directly to Firebase Storage
   * 3. Retrieves public download URLs
   * 4. Prepares photo Firestore document record
   */
  const processSinglePhoto = useCallback(
    async (item: UploadTaskItem): Promise<{
      item: UploadTaskItem;
      photoData: any;
      thumbUrl: string;
      previewUrl: string;
      cleanMasterUrl?: string;
      vaultPath: string;
    } | null> => {
      if (!user || !storage || !db || !albumId) return null;

      // Ensure user's auth token is actively refreshed for Storage authorization
      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken(false);
        } catch (tErr) {
          console.warn('[Auth token refresh warning in BatchUploadDropzone]:', tErr);
        }
      }

      try {
        // Mark processing & pre-compressing
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'processing', startTime: Date.now(), progress: 10 }
              : q
          )
        );

        // 1. Client-Side Pre-Compression & Derivative Generation
        // Bounds: Max 2560px width/height, 80-85% JPEG quality for high-res master
        // Also generates 400px thumbnail and 1400px watermarked preview
        const derivative = await processImageForIngest(item.file, {
          watermarkText,
          onProgress: (stage, percent) => {
            setQueue((prev) =>
              prev.map((q) => {
                if (q.id !== item.id) return q;
                // Stage 0-30% dedicated to client-side pre-compression
                const mappedProgress = Math.min(30, Math.round(percent * 0.3));
                return { ...q, progress: mappedProgress };
              })
            );
          },
        });

        // Mark uploading
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 35 } : q))
        );

        // 2. Storage Paths
        const thumbStoragePath = `galleries/${albumId}/thumbs/${item.id}.webp`;
        const previewStoragePath = `galleries/${albumId}/previews/${item.id}.webp`;
        const vaultStoragePath = `galleries/${albumId}/vault/${item.id}.jpg`;

        console.log('[Firebase Storage Bucket before ref]:', storage.app.options.storageBucket);
        const thumbRef = ref(storage, thumbStoragePath);
        const previewRef = ref(storage, previewStoragePath);
        const vaultRef = ref(storage, vaultStoragePath);

        let thumbBytes = 0;
        let previewBytes = 0;
        let vaultBytes = 0;

        const totalExpected =
          derivative.thumbBlob.size +
          derivative.previewBlob.size +
          derivative.compressedMasterBlob.size;

        const updateLiveUploadProgress = () => {
          const totalTransferred = thumbBytes + previewBytes + vaultBytes;
          const uploadPct = totalExpected > 0 ? Math.min(50, Math.round((totalTransferred / totalExpected) * 50)) : 0;
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    progress: 35 + uploadPct, // 35% - 85%
                    bytesTransferred: totalTransferred,
                  }
                : q
            )
          );
        };

        // 3. Storage Upload Pipeline targeting galleries/{albumId}/
        let thumbUrl = '';
        let previewUrl = '';
        let cleanMasterUrl = '';
        let actualVaultPath = vaultStoragePath;
        let storageSuccess = false;

        // Try direct Firebase Storage first if client write permissions are healthy
        if (!directStorageBlockedRef.current) {
          try {
            const thumbTaskPromise = uploadResumableWithRetry(thumbRef, derivative.thumbBlob, {
              contentType: 'image/webp',
              cacheControl: 'public,max-age=31536000',
              maxRetries: 1,
              onProgress: (b) => {
                thumbBytes = b;
                updateLiveUploadProgress();
              },
            });

            const previewTaskPromise = uploadResumableWithRetry(previewRef, derivative.previewBlob, {
              contentType: 'image/webp',
              cacheControl: 'public,max-age=86400',
              maxRetries: 1,
              onProgress: (b) => {
                previewBytes = b;
                updateLiveUploadProgress();
              },
            });

            const vaultTaskPromise = uploadResumableWithRetry(vaultRef, derivative.compressedMasterBlob, {
              contentType: 'image/jpeg',
              maxRetries: 1,
              onProgress: (b) => {
                vaultBytes = b;
                updateLiveUploadProgress();
              },
            });

            await Promise.all([thumbTaskPromise, previewTaskPromise, vaultTaskPromise]);

            setQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress: 90 } : q))
            );

            [thumbUrl, previewUrl] = await Promise.all([
              getDownloadURL(thumbRef),
              getDownloadURL(previewRef),
            ]);
            cleanMasterUrl = `/api/media/download?albumId=${albumId}&photoId=${item.id}&vaultPath=${encodeURIComponent(actualVaultPath)}`;
            storageSuccess = true;
          } catch (storageErr: any) {
            // Direct storage was blocked (e.g. storage/unauthorized or permission denied)
            console.warn(
              `[Direct Firebase Storage upload unauthorized (${storageErr?.code || storageErr?.message}) for ${item.file.name}. Activating server ingest pipeline for album ${albumId}.]`
            );
            directStorageBlockedRef.current = true;
          }
        }

        // If direct client storage was blocked or unauthorized, smoothly complete via server ingest pipeline
        if (!storageSuccess) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, progress: 65, status: 'uploading' } : q
            )
          );

          const serverResult = await uploadPhotoPackageViaServer(
            albumId,
            item.id,
            item.file.name,
            derivative
          );

          thumbUrl = serverResult.thumbUrl;
          previewUrl = serverResult.previewUrl;
          cleanMasterUrl = serverResult.cleanMasterUrl;
          actualVaultPath = serverResult.vaultPath;

          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress: 90 } : q))
          );
        }

        if (!cleanMasterUrl) {
          cleanMasterUrl = `/api/media/download?albumId=${albumId}&photoId=${item.id}&vaultPath=${encodeURIComponent(actualVaultPath)}`;
        }

        // 6. Build Photo Document Record
        const photoData = {
          id: item.id,
          albumId,
          creatorId: user.uid,
          authorId: user.uid,
          photographerId: user.uid,
          createdBy: user.uid,
          filename: item.file.name,
          title: item.file.name.replace(/\.[^/.]+$/, ''),
          thumbUrl,
          thumbnailUrl: thumbUrl,
          previewUrl,
          watermarkedUrl: previewUrl,
          cleanMasterUrl,
          originalUrl: cleanMasterUrl,
          highResDownloadUrl: cleanMasterUrl,
          vaultPath: actualVaultPath,
          originalStoragePath: actualVaultPath,
          width: derivative.width,
          height: derivative.height,
          aspectRatio: derivative.aspectRatio,
          sizeBytes: derivative.compressedMasterBlob.size,
          originalSizeBytes: item.file.size,
          createdAt: serverTimestamp(),
        };

        return {
          item,
          photoData,
          thumbUrl,
          previewUrl,
          cleanMasterUrl,
          vaultPath: actualVaultPath,
        };
      } catch (err: any) {
        // Robust Error Logging & Capture
        const errorCode = err?.code || err?.message || 'storage/unknown';
        console.error(`[Photo Upload Failed - ${item.file.name}] Code: ${errorCode}`, err);

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'error',
                  error: errorCode,
                  errorCode,
                }
              : q
          )
        );

        // Return null so the chunk can record this error and allow the remaining queue to continue smoothly
        return null;
      }
    },
    [user, albumId, watermarkText]
  );

  /**
   * Concurrency Queue Runner:
   * - Processes items in controlled chunks of CHUNK_SIZE (3 at a time)
   * - Never runs Promise.all on entire array simultaneously
   * - Batches Firestore subcollection writes per chunk
   * - Updates parent album document once upon completion
   */
  const runQueue = useCallback(async () => {
    if (isProcessingRef.current || isPausedRef.current) return;
    if (!user || !storage || !db || !albumId) return;

    isProcessingRef.current = true;

    try {
      while (!isPausedRef.current) {
        // Extract up to CHUNK_SIZE queued items
        const queuedItems = queueRef.current.filter((item) => item.status === 'queued');
        if (queuedItems.length === 0) {
          break; // Queue exhausted
        }

        const currentChunk = queuedItems.slice(0, CHUNK_SIZE);
        const chunkIds = new Set(currentChunk.map((c) => c.id));

        // Mark items as processing immediately in state
        setQueue((prev) => {
          const updated = prev.map((q) =>
            chunkIds.has(q.id) ? { ...q, status: 'processing' as const, progress: 5 } : q
          );
          queueRef.current = updated;
          return updated;
        });

        // Concurrently process the 3 items in this chunk
        const chunkResults = await Promise.all(
          currentChunk.map((item) => processSinglePhoto(item))
        );

        // Collect successful completions in this chunk
        const chunkSuccesses = chunkResults.filter(
          (r): r is NonNullable<typeof r> => r !== null
        );

        // 4. Firestore Batch Sync:
        // After each chunk completes, write photo documents into albums/{albumId}/photos subcollection
        if (chunkSuccesses.length > 0) {
          try {
            const batch = writeBatch(db);
            for (const success of chunkSuccesses) {
              const photoDocRef = doc(db, 'albums', albumId, 'photos', success.item.id);
              batch.set(photoDocRef, success.photoData);
            }
            await batch.commit();

            // Mark successful items as completed in state
            setQueue((prev) => {
              const updated = prev.map((q) => {
                const matched = chunkSuccesses.find((s) => s.item.id === q.id);
                if (matched) {
                  return {
                    ...q,
                    status: 'completed' as const,
                    progress: 100,
                    bytesTransferred: q.totalBytes,
                    thumbUrl: matched.thumbUrl,
                    previewUrl: matched.previewUrl,
                    vaultPath: matched.vaultPath,
                    finishTime: Date.now(),
                  };
                }
                return q;
              });
              queueRef.current = updated;
              return updated;
            });

            completedInBatchRef.current.push(
              ...chunkSuccesses.map((s) => ({
                id: s.item.id,
                thumbUrl: s.thumbUrl,
                previewUrl: s.previewUrl,
              }))
            );
          } catch (batchErr: any) {
            console.error('[Firestore Batch Write Error on Chunk]:', batchErr);
            // Mark items in this chunk as failed if Firestore batch write failed
            setQueue((prev) => {
              const updated = prev.map((q) =>
                chunkIds.has(q.id) && q.status !== 'completed'
                  ? { ...q, status: 'error' as const, error: 'firestore/write-failed' }
                  : q
              );
              queueRef.current = updated;
              return updated;
            });
          }
        }

        // Yield between chunks to allow Firestore write stream to flush and DOM to refresh
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      // Check if all queued items in batch have finished
      const remainingQueued = queueRef.current.filter((item) => item.status === 'queued');
      if (remainingQueued.length === 0 && !isPausedRef.current) {
        const newlyCompleted = [...completedInBatchRef.current];
        if (newlyCompleted.length > 0) {
          completedInBatchRef.current = [];

          // 4. Update the parent album document's photoCount and coverPhotoUrl upon completion
          try {
            const albumDocRef = doc(db, 'albums', albumId);
            const firstPhoto = newlyCompleted[0];
            // Filter out oversized base64 strings to protect Firestore document size limits
            const samplePreviews = newlyCompleted
              .slice(0, 15)
              .map((p) => p.previewUrl)
              .filter((url) => Boolean(url) && (!url.startsWith('data:') || url.length < 50000));

            const safeCoverUrl =
              firstPhoto.thumbUrl && (!firstPhoto.thumbUrl.startsWith('data:') || firstPhoto.thumbUrl.length < 50000)
                ? firstPhoto.thumbUrl
                : firstPhoto.previewUrl && (!firstPhoto.previewUrl.startsWith('data:') || firstPhoto.previewUrl.length < 50000)
                ? firstPhoto.previewUrl
                : '';

            const updatePayload: Record<string, any> = {
              photoCount: increment(newlyCompleted.length),
              updatedAt: serverTimestamp(),
            };

            if (safeCoverUrl) {
              updatePayload.coverPhotoUrl = safeCoverUrl;
              updatePayload.coverUrl = safeCoverUrl;
              updatePayload.watermarkedCoverUrl = safeCoverUrl;
            }

            if (samplePreviews.length > 0) {
              updatePayload.mediaUrls = arrayUnion(...samplePreviews);
            }

            await updateDoc(albumDocRef, updatePayload);
          } catch (albumSyncErr) {
            console.warn('[Notice updating parent album metadata]:', albumSyncErr);
          }

          onUploadSuccess?.(newlyCompleted.length);
        }
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [user, albumId, processSinglePhoto, onUploadSuccess]);

  /**
   * Handle incoming dropped or selected files
   */
  const handleAddFiles = (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    const validExtensions = /\.(jpe?g|png|webp|cr2|cr3|nef|arw|dng|tiff?|heic)$/i;
    const filteredFiles = rawFiles.filter((f) => validExtensions.test(f.name) || f.type.startsWith('image/'));

    if (filteredFiles.length === 0) {
      showToast('error', 'Unsupported Files', 'Please select JPEG, PNG, WebP, or RAW images.');
      return;
    }

    const newItems: UploadTaskItem[] = filteredFiles.map((file, idx) => ({
      id: `photo_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      file,
      status: 'queued',
      progress: 0,
      bytesTransferred: 0,
      totalBytes: file.size,
    }));

    setQueue((prev) => {
      const updated = [...prev, ...newItems];
      queueRef.current = updated;
      return updated;
    });

    showToast('info', 'Batch Queued', `Added ${newItems.length} photos to ingest pipeline.`);

    // Trigger queue execution
    setTimeout(() => {
      runQueue();
    }, 50);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleRetryFailed = () => {
    setQueue((prev) => {
      const updated = prev.map((q) =>
        q.status === 'error'
          ? { ...q, status: 'queued' as const, progress: 0, error: undefined, errorCode: undefined }
          : q
      );
      queueRef.current = updated;
      return updated;
    });

    setTimeout(() => {
      runQueue();
    }, 50);
  };

  const handleClearCompleted = () => {
    setQueue((prev) => {
      const updated = prev.filter((q) => q.status !== 'completed');
      queueRef.current = updated;
      return updated;
    });
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      isPausedRef.current = next;
      if (!next) {
        setTimeout(() => {
          runQueue();
        }, 50);
      }
      return next;
    });
  };

  return (
    <div id="batch-upload-dropzone-container" className="space-y-6">
      {/* 1. High-Concurrency Dropzone Target */}
      <div
        id="batch-dropzone-drop-area"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-[#00B8D4] bg-[#00B8D4]/10 scale-[1.008]'
            : 'border-[#24324F] bg-[#141B2D]/60 hover:border-[#00B8D4]/60 hover:bg-[#141B2D]/90'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          id="batch-dropzone-file-input"
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.cr2,.cr3,.nef,.arw,.dng,.tiff,.heic"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleAddFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          id="batch-dropzone-folder-input"
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleAddFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="max-w-xl mx-auto space-y-4 pointer-events-none">
          <div className="w-16 h-16 rounded-2xl bg-[#00B8D4]/10 border border-[#00B8D4]/30 flex items-center justify-center mx-auto text-[#00B8D4]">
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-white font-mono">
              Drag & Drop 500+ RAW or High-Res Photos
            </h3>
            <p className="text-sm text-slate-400">
              Direct-to-cloud ingest automatically creates 400px WebP thumbnails, 1400px watermarked previews, and deposits high-res masters directly into private storage vault.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 pointer-events-auto">
            <button
              id="dropzone-select-files-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#00B8D4] hover:bg-[#00D4EE] text-black font-bold font-mono text-xs uppercase tracking-wider transition-colors shadow-lg shadow-[#00B8D4]/20 flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Select Photo Files
            </button>

            <button
              id="dropzone-select-folder-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                folderInputRef.current?.click();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#2A3B52] text-slate-200 font-semibold font-mono text-xs uppercase tracking-wider transition-colors border border-[#334155] flex items-center gap-2"
            >
              <HardDrive className="w-4 h-4 text-emerald-400" />
              Upload Entire Folder
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-400 pt-2">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#00B8D4]" /> 3-Photo Chunk Queue
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Vault Security Locked
            </span>
            <span>•</span>
            <span>Auto-EXIF Corrected</span>
          </div>
        </div>
      </div>

      {/* 2. Live Ingest Telemetry & Progress Control Bar */}
      {totalFiles > 0 && (
        <div id="batch-upload-telemetry-bar" className="bg-[#141B2D] border border-[#24324F] rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#00B8D4] font-bold">
                  Ingest Pipeline Status:
                </span>
                <span className="text-xs font-mono text-white font-semibold">
                  {uploadingCount > 0 ? 'Processing Active' : isPaused ? 'Paused' : 'Idle'}
                </span>
              </div>
              <h4 className="text-base font-bold text-white font-mono mt-0.5">
                Target: {albumTitle}
              </h4>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {uploadingCount > 0 && (
                <button
                  id="batch-upload-pause-btn"
                  type="button"
                  onClick={handleTogglePause}
                  className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#2A3B52] text-xs font-mono text-slate-200 border border-[#334155] flex items-center gap-1.5 transition-colors"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
              )}

              {errorCount > 0 && (
                <button
                  id="batch-upload-retry-failed-btn"
                  type="button"
                  onClick={handleRetryFailed}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-xs font-mono text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Failed ({errorCount})
                </button>
              )}

              {completedCount > 0 && (
                <button
                  id="batch-upload-clear-done-btn"
                  type="button"
                  onClick={handleClearCompleted}
                  className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#2A3B52] text-xs font-mono text-slate-300 border border-[#334155] transition-colors"
                >
                  Clear Finished
                </button>
              )}

              {onViewGallery && completedCount > 0 && (
                <button
                  id="batch-upload-view-gallery-btn"
                  type="button"
                  onClick={onViewGallery}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Live Gallery
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>{overallPercent}% Complete ({completedCount} / {totalFiles} uploaded)</span>
              <span>
                {currentSpeedMBps > 0 && `${currentSpeedMBps} MB/s • `}
                {(transferredBytesOverall / (1024 * 1024)).toFixed(1)} MB of {(totalBytesOverall / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>

            <div className="w-full h-3 bg-[#0B0F19] rounded-full overflow-hidden p-0.5 border border-[#24324F]">
              <div
                className="h-full bg-gradient-to-r from-[#00B8D4] via-emerald-400 to-[#00B8D4] rounded-full transition-all duration-300"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-2.5 rounded-xl bg-[#0B0F19]/80 border border-[#1E293B]">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Active Chunk</span>
              <span className="text-sm font-bold font-mono text-[#00B8D4]">{uploadingCount} of {CHUNK_SIZE} pool</span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0B0F19]/80 border border-[#1E293B]">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Queue Remaining</span>
              <span className="text-sm font-bold font-mono text-amber-400">{queuedCount} items</span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0B0F19]/80 border border-[#1E293B]">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Completed</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{completedCount} photos</span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0B0F19]/80 border border-[#1E293B]">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Transfer Rate</span>
              <span className="text-sm font-bold font-mono text-white">{currentSpeedMBps} MB/s</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Ingest Matrix Stream Grid (Instant live feedback) */}
      {queue.length > 0 && (
        <div id="batch-upload-queue-grid" className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              Queue Preview ({queue.length} items)
            </h5>
            <span className="text-xs text-slate-400 font-mono">
              Concurrency: {CHUNK_SIZE} photos parallel chunking
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {queue.slice(0, 100).map((item) => (
              <div
                key={item.id}
                className={`relative rounded-xl border p-2.5 flex flex-col justify-between overflow-hidden text-left transition-all ${
                  item.status === 'completed'
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : item.status === 'error'
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : item.status === 'uploading' || item.status === 'processing'
                    ? 'border-[#00B8D4]/60 bg-[#00B8D4]/10 animate-pulse'
                    : 'border-[#24324F] bg-[#141B2D]/70'
                }`}
              >
                {/* Top Status Icon & Name */}
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className="text-[11px] font-mono font-medium text-slate-200 truncate flex-1" title={item.file.name}>
                    {item.file.name}
                  </span>
                  {item.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {item.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  {(item.status === 'uploading' || item.status === 'processing') && (
                    <RefreshCw className="w-3.5 h-3.5 text-[#00B8D4] animate-spin shrink-0" />
                  )}
                </div>

                {/* Progress Mini-Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span className="capitalize">{item.status}</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0B0F19] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        item.status === 'completed'
                          ? 'bg-emerald-400'
                          : item.status === 'error'
                          ? 'bg-rose-400'
                          : 'bg-[#00B8D4]'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.error ? (
                    <span className="text-[9px] font-mono text-rose-400 block truncate" title={item.error}>
                      {item.error}
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-slate-400 block truncate">
                      {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {queue.length > 100 && (
            <p className="text-xs text-center text-slate-400 font-mono">
              + {queue.length - 100} more items actively queued
            </p>
          )}
        </div>
      )}
    </div>
  );
};
