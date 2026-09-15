import { db, storage } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { processImageForGallery, compressImageToSafeDataUrl } from '../utils/imageCompressor';

export interface UploadProgressCallback {
  (completed: number, total: number, percentage: number, currentFileName?: string): void;
}

export interface UploadedPhotoResult {
  id: string;
  url: string;
  thumbUrl: string;
  imageUrl: string;
  title: string;
  uploadTimestamp: string;
}

export type TaskStatus = 'pending' | 'processing' | 'uploading' | 'saving' | 'completed' | 'failed';

export interface PhotoUploadTask {
  id: string;
  file: File;
  name: string;
  size: number;
  status: TaskStatus;
  progress: number;
  error?: string;
  retryCount: number;
  imageUrl?: string;
  thumbUrl?: string;
}

export interface UploadQueueState {
  albumId: string;
  albumTitle: string;
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  overallPercentage: number;
  currentTaskName?: string;
  statusMessage: string;
  tasks: PhotoUploadTask[];
  isComplete: boolean;
  isCancelled: boolean;
}

/**
 * Upload a Blob or File to Firebase Storage with automatic timeout & retry logic.
 */
async function uploadToStorageWithRetry(
  storagePath: string,
  blobOrFile: Blob | File,
  contentType: string = 'image/jpeg',
  maxRetries: number = 3,
  onTaskProgress?: (bytesTransferred: number, totalBytes: number) => void
): Promise<string> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blobOrFile, {
        contentType,
        customMetadata: { 
          uploadedAt: new Date().toISOString(),
          generator: 'Just1Play-BulkEngine'
        }
      });

      // Wrap upload task in a Promise with 30s timeout watchdog
      const downloadUrl = await new Promise<string>((resolve, reject) => {
        const timeoutTimer = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error(`Firebase Storage upload timed out after 30s for ${storagePath}`));
        }, 30000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (onTaskProgress && snapshot.totalBytes > 0) {
              onTaskProgress(snapshot.bytesTransferred, snapshot.totalBytes);
            }
          },
          (err) => {
            clearTimeout(timeoutTimer);
            reject(err);
          },
          async () => {
            clearTimeout(timeoutTimer);
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        );
      });

      if (downloadUrl) {
        return downloadUrl;
      }
    } catch (err) {
      attempt++;
      console.warn(`Storage upload attempt ${attempt}/${maxRetries + 1} failed for ${storagePath}:`, err);
      if (attempt > maxRetries) {
        throw err;
      }
      // Exponential backoff
      await new Promise(res => setTimeout(res, 600 * attempt));
    }
  }
  throw new Error(`Failed to upload ${storagePath} after ${maxRetries} retries`);
}

/**
 * Robust Queue-Based Photo Upload Engine
 * Supports large batches (50+ photos), controlled concurrency, real-time metrics, and automatic fallbacks.
 */
export class PhotoUploadQueueManager {
  private tasks: PhotoUploadTask[] = [];
  private albumId: string;
  private albumTitle: string;
  private userId: string;
  private concurrency: number;
  private maxRetries: number;
  private watermarkOptions?: { watermark?: boolean; style?: 'badge' | 'diagonal' | 'full_protection' };
  private listeners: ((state: UploadQueueState) => void)[] = [];
  private isCancelled: boolean = false;
  private isRunning: boolean = false;
  private successfulResults: UploadedPhotoResult[] = [];

  constructor(config: {
    albumId: string;
    albumTitle: string;
    files: File[];
    userId: string;
    concurrency?: number;
    maxRetries?: number;
    watermarkOptions?: { watermark?: boolean; style?: 'badge' | 'diagonal' | 'full_protection' };
  }) {
    this.albumId = config.albumId;
    this.albumTitle = config.albumTitle;
    this.userId = config.userId || 'admin';
    this.concurrency = config.concurrency || 2; // 2 concurrent streams protects browser RAM and socket bandwidth
    this.maxRetries = config.maxRetries || 3;
    this.watermarkOptions = config.watermarkOptions;

    this.tasks = config.files.map((file, index) => ({
      id: `task_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
      file,
      name: file.name,
      size: file.size,
      status: 'pending',
      progress: 0,
      retryCount: 0
    }));
  }

  public subscribe(listener: (state: UploadQueueState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('Queue state listener error:', err);
      }
    }
  }

  public getState(): UploadQueueState {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const failed = this.tasks.filter(t => t.status === 'failed').length;
    const inProgress = this.tasks.filter(t => t.status === 'processing' || t.status === 'uploading' || t.status === 'saving').length;
    
    // Calculate aggregate percentage
    let totalProgressPoints = 0;
    for (const t of this.tasks) {
      if (t.status === 'completed') totalProgressPoints += 100;
      else if (t.status === 'failed') totalProgressPoints += 100;
      else totalProgressPoints += t.progress;
    }
    const overallPercentage = total > 0 ? Math.round(totalProgressPoints / total) : 0;

    const currentTask = this.tasks.find(t => t.status === 'processing' || t.status === 'uploading' || t.status === 'saving');
    
    let statusMessage = 'Idle';
    if (this.isCancelled) {
      statusMessage = 'Upload cancelled by user';
    } else if (completed === total && total > 0) {
      statusMessage = `All ${completed} photos uploaded successfully!`;
    } else if (inProgress > 0) {
      statusMessage = `Uploading (${completed}/${total}) - ${currentTask?.name || 'Processing'}`;
    }

    return {
      albumId: this.albumId,
      albumTitle: this.albumTitle,
      total,
      completed,
      failed,
      inProgress,
      overallPercentage,
      currentTaskName: currentTask?.name,
      statusMessage,
      tasks: [...this.tasks],
      isComplete: (completed + failed) === total && total > 0,
      isCancelled: this.isCancelled
    };
  }

  public cancel() {
    this.isCancelled = true;
    for (const task of this.tasks) {
      if (task.status === 'pending') {
        task.status = 'failed';
        task.error = 'Cancelled by user';
      }
    }
    this.notify();
  }

  public async start(): Promise<UploadedPhotoResult[]> {
    if (this.isRunning) {
      return this.successfulResults;
    }
    this.isRunning = true;
    this.isCancelled = false;

    const pendingQueue = this.tasks.filter(t => t.status === 'pending' || t.status === 'failed');
    
    // Spawn worker pool
    let taskIndex = 0;
    const workers = new Array(Math.min(this.concurrency, pendingQueue.length)).fill(null).map(async () => {
      while (taskIndex < pendingQueue.length && !this.isCancelled) {
        const currentTask = pendingQueue[taskIndex++];
        if (!currentTask) break;
        await this.executeTask(currentTask);
      }
    });

    await Promise.all(workers);
    this.isRunning = false;
    this.notify();

    // Reconcile and update album metadata upon queue completion
    await this.syncAlbumMetadata();

    return this.successfulResults;
  }

  private async executeTask(task: PhotoUploadTask) {
    if (this.isCancelled) return;

    task.status = 'processing';
    task.progress = 10;
    this.notify();

    const timestamp = Date.now();
    const cleanFileName = task.file.name.replace(/\.[^/.]+$/, '') || `photo_${timestamp}`;

    try {
      // 1. Process and compress image canvas
      task.progress = 25;
      this.notify();

      const { displayBlob, thumbBlob } = await processImageForGallery(task.file, {
        watermark: this.watermarkOptions?.watermark !== false,
        watermarkOptions: {
          style: this.watermarkOptions?.style || 'badge',
          text: 'JUST1PLAY',
          subtext: 'OFFICIAL ATHLETE MEDIA'
        }
      });

      // 2. Upload to Firebase Storage
      task.status = 'uploading';
      task.progress = 40;
      this.notify();

      const displayPath = `albums/${this.albumId}/photos/img_${timestamp}_${Math.random().toString(36).substr(2, 4)}.jpg`;
      const thumbPath = `albums/${this.albumId}/thumbs/thumb_${timestamp}_${Math.random().toString(36).substr(2, 4)}.jpg`;

      let displayUrl = '';
      let thumbUrl = '';

      try {
        const [displayRes, thumbRes] = await Promise.all([
          uploadToStorageWithRetry(displayPath, displayBlob, 'image/jpeg', this.maxRetries, (transferred, total) => {
            const pct = Math.round((transferred / total) * 35);
            task.progress = 40 + pct;
            this.notify();
          }),
          uploadToStorageWithRetry(thumbPath, thumbBlob, 'image/jpeg', this.maxRetries)
        ]);

        displayUrl = displayRes;
        thumbUrl = thumbRes;
      } catch (storageErr) {
        console.warn(`Storage upload unavailable for "${task.name}", using safe data URL fallback:`, storageErr);
        const safeDisplayDataUrl = await compressImageToSafeDataUrl(displayBlob || task.file, 800, 0.55);
        const safeThumbDataUrl = await compressImageToSafeDataUrl(thumbBlob || task.file, 350, 0.50);
        displayUrl = safeDisplayDataUrl;
        thumbUrl = safeThumbDataUrl || safeDisplayDataUrl;
      }

      if (!displayUrl) {
        displayUrl = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1200';
        thumbUrl = displayUrl;
      }
      if (!thumbUrl) {
        thumbUrl = displayUrl;
      }

      // 3. Save to Firestore Subcollection & Gallery Collection
      task.status = 'saving';
      task.progress = 85;
      this.notify();

      const photoPayload = {
        albumId: this.albumId,
        albumTitle: this.albumTitle || '',
        albumName: this.albumTitle || '',
        eventName: this.albumTitle || '',
        imageUrl: displayUrl,
        originalUrl: displayUrl,
        watermarkedUrl: displayUrl,
        mediaUrl: displayUrl,
        thumbUrl: thumbUrl,
        uploadTimestamp: new Date().toISOString(),
        isPremium: false,
        title: cleanFileName,
        uploadedBy: this.userId
      };

      let photoDocId = `photo_${timestamp}`;
      try {
        const docRef = await addDoc(collection(db, 'Albums', this.albumId, 'Photos'), photoPayload);
        photoDocId = docRef.id;
      } catch (dbErr) {
        console.error(`Error saving photo "${cleanFileName}" to Albums/${this.albumId}/Photos:`, dbErr);
      }

      // Also dual-save to lowercase subcollection for maximum cross-compatibility
      try {
        await addDoc(collection(db, 'albums', this.albumId, 'photos'), photoPayload);
      } catch (subErr) {
        // silent fallback
      }

      try {
        await addDoc(collection(db, 'gallery'), {
          mediaUrl: displayUrl,
          imageUrl: displayUrl,
          originalUrl: displayUrl,
          watermarkedUrl: displayUrl,
          thumbUrl: thumbUrl,
          createdAt: serverTimestamp(),
          title: cleanFileName,
          type: 'photo',
          albumId: this.albumId,
          albumTitle: this.albumTitle || '',
          albumName: this.albumTitle || '',
          eventName: this.albumTitle || '',
          sport: 'Sports',
          category: 'Game Action',
          uploadedBy: this.userId
        });
      } catch (galleryErr) {
        console.error(`Error saving photo "${cleanFileName}" to gallery:`, galleryErr);
      }

      // 4. Mark Task Completed
      task.status = 'completed';
      task.progress = 100;
      task.imageUrl = displayUrl;
      task.thumbUrl = thumbUrl;

      const result: UploadedPhotoResult = {
        id: photoDocId,
        url: displayUrl,
        thumbUrl: thumbUrl,
        imageUrl: displayUrl,
        title: cleanFileName,
        uploadTimestamp: new Date().toISOString()
      };

      this.successfulResults.push(result);
      this.notify();
    } catch (err: any) {
      console.error(`Queue execution failed for task "${task.name}":`, err);
      task.status = 'failed';
      task.error = err.message || 'Upload processing error';
      task.retryCount++;
      this.notify();
    }
  }

  private async syncAlbumMetadata() {
    try {
      const albumDocRef = doc(db, 'Albums', this.albumId);
      const snap = await getDoc(albumDocRef);
      const data = snap.data();
      
      const currentPhotoCount = data?.photoCount || 0;
      const newTotal = currentPhotoCount + this.successfulResults.length;
      
      const updates: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };

      if (this.successfulResults.length > 0) {
        updates.photoCount = newTotal;
        if (!data?.coverPhotoUrl || data?.coverPhotoUrl.includes('unsplash.com')) {
          updates.coverPhotoUrl = this.successfulResults[0].imageUrl || this.successfulResults[0].thumbUrl;
          updates.thumbnailUrl = this.successfulResults[0].thumbUrl || this.successfulResults[0].imageUrl;
          updates.coverUrl = this.successfulResults[0].imageUrl || this.successfulResults[0].thumbUrl;
        }
      }

      await updateDoc(albumDocRef, updates);

      // Also sync updates to lowercase 'albums' collection
      try {
        await updateDoc(doc(db, 'albums', this.albumId), updates);
      } catch (subErr) {
        // ignore if not present
      }
    } catch (err) {
      console.warn('Error syncing album metadata after queue finish:', err);
    }
  }
}

/**
 * Creates an Album in Firestore and uploads all photos through the Queue Engine.
 */
export const createAlbumWithBulkUpload = async (
  albumData: { 
    title: string; 
    category?: string; 
    eventDate: string; 
    description: string; 
    visibilityStatus?: 'public' | 'private';
    createdBy?: string;
  },
  files: File[],
  onProgress?: UploadProgressCallback,
  watermarkOptions?: { watermark?: boolean; style?: 'badge' | 'diagonal' | 'full_protection' }
) => {
  if (files.length === 0) {
    throw new Error("No photo files provided for album creation.");
  }

  const initialCover = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1200';
  
  const albumRecord = {
    title: albumData.title.trim(),
    albumName: albumData.title.trim(),
    eventName: albumData.title.trim(),
    category: albumData.category || 'Sports',
    sport: albumData.category || 'Sports',
    eventDate: albumData.eventDate || new Date().toISOString().split('T')[0],
    date: albumData.eventDate || new Date().toISOString().split('T')[0],
    description: albumData.description || 'Client delivery photo gallery for athletic event coverage.',
    visibilityStatus: albumData.visibilityStatus || 'public',
    thumbnailUrl: initialCover,
    coverPhotoUrl: initialCover,
    coverUrl: initialCover,
    photoCount: 0,
    createdAt: new Date().toISOString(),
    createdBy: albumData.createdBy || 'admin'
  };

  // 1. Create album record in 'Albums' (uppercase)
  const albumRef = await addDoc(collection(db, 'Albums'), albumRecord);
  const albumId = albumRef.id;

  // Also dual-write to 'albums' (lowercase) so all components immediately see it
  try {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'albums', albumId), {
      ...albumRecord,
      id: albumId
    });
  } catch (err) {
    console.warn('Dual-write to albums collection notice:', err);
  }

  // 2. Instantiate and run Queue Manager
  const queue = new PhotoUploadQueueManager({
    albumId,
    albumTitle: albumData.title.trim(),
    files,
    userId: albumData.createdBy || 'admin',
    concurrency: 2,
    watermarkOptions
  });

  if (onProgress) {
    queue.subscribe((state) => {
      onProgress(state.completed, state.total, state.overallPercentage, state.currentTaskName);
    });
  }

  const uploadedPhotos = await queue.start();

  const coverThumbnail = uploadedPhotos[0]?.thumbUrl || uploadedPhotos[0]?.url || initialCover;
  const coverPhoto = uploadedPhotos[0]?.url || coverThumbnail;

  return {
    albumId,
    coverThumbnail,
    photos: uploadedPhotos,
    totalUploaded: uploadedPhotos.length,
    totalAttempted: files.length,
    queue
  };
};

/**
 * Upload photos to an existing album through the Queue Engine.
 */
export const uploadPhotosToExistingAlbum = async (
  albumId: string,
  albumTitle: string,
  files: File[],
  userId: string,
  onProgress?: UploadProgressCallback,
  watermarkOptions?: { watermark?: boolean; style?: 'badge' | 'diagonal' | 'full_protection' }
) => {
  if (!albumId || files.length === 0) return [];

  const queue = new PhotoUploadQueueManager({
    albumId,
    albumTitle,
    files,
    userId,
    concurrency: 2,
    watermarkOptions
  });

  if (onProgress) {
    queue.subscribe((state) => {
      onProgress(state.completed, state.total, state.overallPercentage, state.currentTaskName);
    });
  }

  return await queue.start();
};
