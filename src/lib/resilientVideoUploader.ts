import { 
  StorageReference, 
  uploadBytesResumable, 
  getDownloadURL, 
  UploadTask 
} from 'firebase/storage';

export interface ResilientUploadProgressInfo {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  retryCount: number;
  isResuming: boolean;
  statusMessage: string;
}

export interface ResilientUploadOptions {
  storageRef: StorageReference;
  file: File | Blob;
  metadata?: Record<string, any>;
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  onProgress?: (info: ResilientUploadProgressInfo) => void;
  onRetry?: (attempt: number, delayMs: number, error: any) => void;
}

/**
 * Uploads a file/video to Firebase Storage using uploadBytesResumable with automatic
 * exponential backoff retries upon network instability, preserving byte progress on resume.
 */
export async function uploadVideoWithRetry(options: ResilientUploadOptions): Promise<string> {
  const {
    storageRef,
    file,
    metadata,
    maxRetries = 4,
    initialBackoffMs = 1000,
    maxBackoffMs = 16000,
    onProgress,
    onRetry
  } = options;

  let currentAttempt = 0;
  let lastBytesTransferred = 0;
  let uploadTask: UploadTask | null = null;

  return new Promise<string>((resolve, reject) => {
    function startOrResumeUpload() {
      // Create resumable upload task if not created yet
      if (!uploadTask) {
        uploadTask = uploadBytesResumable(storageRef, file, metadata);
      } else {
        // Resume existing task from last saved byte position
        try {
          uploadTask.resume();
        } catch (e) {
          // If task state cannot resume directly, re-instantiate upload task
          uploadTask = uploadBytesResumable(storageRef, file, metadata);
        }
      }

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          lastBytesTransferred = snapshot.bytesTransferred;
          const total = snapshot.totalBytes || file.size || 1;
          const pct = Math.round((lastBytesTransferred / total) * 100);

          if (onProgress) {
            onProgress({
              bytesTransferred: lastBytesTransferred,
              totalBytes: total,
              percentage: Math.min(100, Math.max(0, pct)),
              retryCount: currentAttempt,
              isResuming: currentAttempt > 0,
              statusMessage: currentAttempt > 0
                ? `Resuming upload from ${Math.round(lastBytesTransferred / 1024)} KB...`
                : `Uploading video (${pct}%)...`
            });
          }
        },
        async (error: any) => {
          console.warn(`[ResilientUploader] Upload error on attempt ${currentAttempt + 1}:`, error);

          if (currentAttempt < maxRetries) {
            currentAttempt++;
            // Calculate exponential backoff delay with jitter
            const backoffDelay = Math.min(
              maxBackoffMs,
              Math.pow(2, currentAttempt - 1) * initialBackoffMs + Math.floor(Math.random() * 500)
            );

            console.log(
              `[ResilientUploader] Retrying upload in ${backoffDelay}ms (Attempt ${currentAttempt}/${maxRetries}). Resuming from byte ${lastBytesTransferred}...`
            );

            if (onRetry) {
              onRetry(currentAttempt, backoffDelay, error);
            }

            if (onProgress) {
              onProgress({
                bytesTransferred: lastBytesTransferred,
                totalBytes: file.size || 1,
                percentage: Math.round((lastBytesTransferred / (file.size || 1)) * 100),
                retryCount: currentAttempt,
                isResuming: true,
                statusMessage: `Network instability detected. Auto-retrying in ${Math.ceil(backoffDelay / 1000)}s (Attempt ${currentAttempt}/${maxRetries})...`
              });
            }

            // Pause existing task temporarily before attempting resume
            try {
              uploadTask?.pause();
            } catch (pErr) {
              // Ignore pause errors
            }

            setTimeout(() => {
              startOrResumeUpload();
            }, backoffDelay);
          } else {
            reject(
              new Error(
                `Upload failed after ${maxRetries} automatic retry attempts. ${error?.message || ''}`
              )
            );
          }
        },
        async () => {
          try {
            if (uploadTask) {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } else {
              reject(new Error('Upload task missing after completion.'));
            }
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    }

    startOrResumeUpload();
  });
}
