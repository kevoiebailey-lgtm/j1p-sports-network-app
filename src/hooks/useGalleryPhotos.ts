import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Photo, GalleryMediaItem } from '../types';
import { resolvePhotoDocument, resolveStorageUrl } from '../utils/storageUrlResolver';

export interface UseGalleryPhotosOptions {
  albumId?: string;
  collectionName?: 'photos' | 'gallery' | 'Albums';
  pageSize?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  sport?: string;
  category?: string;
  realtime?: boolean;
}

export interface UseGalleryPhotosResult {
  photos: Photo[];
  galleryItems: GalleryMediaItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  observerTargetRef: (node: HTMLElement | null) => void;
  totalLoaded: number;
}

/**
 * Enterprise Gallery Photos Fetching Hook
 * Queries the `photos` collection (or album subcollection / gallery collection) with
 * automatic dynamic Storage path resolution (resolving `photos/thumbnails/xyz.jpg` or `gs://...` to HTTPS URLs).
 */
export function useGalleryPhotos({
  albumId,
  collectionName = 'photos',
  pageSize = 20,
  orderByField = 'createdAt',
  orderDirection = 'desc',
  sport,
  category,
  realtime = false
}: UseGalleryPhotosOptions = {}): UseGalleryPhotosResult {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryMediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingMoreRef = useRef<boolean>(false);
  const hasMoreRef = useRef<boolean>(true);

  loadingMoreRef.current = loadingMore;
  hasMoreRef.current = hasMore;

  // Build query constraints
  const buildConstraints = useCallback((): QueryConstraint[] => {
    const list: QueryConstraint[] = [];
    if (albumId && collectionName === 'photos') {
      list.push(where('albumId', '==', albumId));
    }
    if (sport && sport !== 'All Sports') {
      list.push(where('sport', '==', sport));
    }
    if (category && category !== 'All') {
      list.push(where('category', '==', category));
    }
    return list;
  }, [albumId, collectionName, sport, category]);

  // Transform and resolve a single Firestore snapshot document
  const transformAndResolve = useCallback(async (docSnap: QueryDocumentSnapshot<DocumentData>): Promise<{ photo: Photo; galleryItem: GalleryMediaItem }> => {
    const data = docSnap.data() || {};
    
    // Extract potential raw thumbnail & original image fields
    const rawThumb = data.thumbnailUrl || data.thumbUrl || data.watermarkedUrl || data.previewUrl || data.imageUrl || data.originalUrl || data.url || '';
    const rawOriginal = data.originalUrl || data.imageUrl || data.url || rawThumb;

    // Resolve asynchronously if they are storage paths or gs:// references
    const [resolvedThumb, resolvedOriginal] = await Promise.all([
      resolveStorageUrl(rawThumb),
      resolveStorageUrl(rawOriginal)
    ]);

    const photoObj: Photo = {
      id: docSnap.id,
      albumId: data.albumId || albumId || '',
      imageUrl: resolvedOriginal || resolvedThumb,
      thumbUrl: resolvedThumb || resolvedOriginal,
      uploadTimestamp: data.uploadTimestamp || data.createdAt || new Date().toISOString(),
      isPremium: !!data.isPremium || !!data.isWatermarked,
      title: data.title || data.caption || 'Gallery Photo',
      caption: data.caption || '',
      uploadedBy: data.uploadedBy || data.authorName || data.photographerName || 'Just1Play Media'
    };

    const galleryItemObj: GalleryMediaItem = {
      id: docSnap.id,
      originalUrl: resolvedOriginal || resolvedThumb,
      watermarkedUrl: resolvedThumb || resolvedOriginal,
      isWatermarked: !!data.isWatermarked,
      photographerId: data.photographerId || data.authorId || '',
      photographerName: data.photographerName || data.authorName || 'Official Media Partner',
      eventName: data.eventName || data.event || data.title || 'Tournament Media',
      albumName: data.albumName || data.album || 'Event Gallery',
      category: data.category || 'Game Action',
      sport: data.sport || 'Basketball',
      teams: Array.isArray(data.teams) ? data.teams.filter((t: any) => typeof t === 'string') : [],
      title: data.title || data.caption || 'Tournament Action Shot',
      caption: data.caption || '',
      hypesCount: typeof data.hypesCount === 'number' ? data.hypesCount : 0,
      userHypes: data.userHypes || {},
      createdAt: data.createdAt || data.uploadTimestamp || new Date().toISOString(),
      resolution: data.resolution || '4K Ultra-HD',
      tags: Array.isArray(data.tags) ? data.tags.filter((t: any) => typeof t === 'string') : [],
      price: typeof data.price === 'number' ? data.price : 2.00
    };

    return { photo: photoObj, galleryItem: galleryItemObj };
  }, [albumId]);

  // Initial Load Handler
  const loadInitialBatch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let colRef;
      if (albumId && (collectionName === 'Albums' || collectionName === 'photos')) {
        colRef = collection(db, 'Albums', albumId, 'Photos');
      } else {
        colRef = collection(db, collectionName);
      }

      const constraints = buildConstraints();
      let q;
      try {
        q = query(
          colRef,
          ...constraints,
          orderBy(orderByField, orderDirection),
          limit(pageSize)
        );
      } catch {
        // Fallback without orderBy in case composite index is not built yet
        q = query(
          colRef,
          ...constraints,
          limit(pageSize)
        );
      }

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const results = await Promise.all(snapshot.docs.map(transformAndResolve));
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];

        setPhotos(results.map(r => r.photo));
        setGalleryItems(results.map(r => r.galleryItem));
        setLastVisibleDoc(lastDoc);
        setHasMore(snapshot.docs.length >= pageSize);
      } else {
        // If empty and querying Albums/{id}/Photos, fallback check lowercase 'albums/{id}/photos' or main 'photos'
        if (albumId) {
          try {
            const fallbackSubRef = collection(db, 'albums', albumId, 'photos');
            const fallbackSnap = await getDocs(query(fallbackSubRef, limit(pageSize)));
            if (!fallbackSnap.empty) {
              const results = await Promise.all(fallbackSnap.docs.map(transformAndResolve));
              setPhotos(results.map(r => r.photo));
              setGalleryItems(results.map(r => r.galleryItem));
              setLastVisibleDoc(fallbackSnap.docs[fallbackSnap.docs.length - 1]);
              setHasMore(fallbackSnap.docs.length >= pageSize);
              setLoading(false);
              return;
            }
          } catch {
            // Ignore fallback error
          }
        }

        setPhotos([]);
        setGalleryItems([]);
        setLastVisibleDoc(null);
        setHasMore(false);
      }
    } catch (err: any) {
      console.warn('[useGalleryPhotos] Initial query notice:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setPhotos([]);
      setGalleryItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [albumId, collectionName, buildConstraints, orderByField, orderDirection, pageSize, transformAndResolve]);

  // Load More (Pagination)
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current || !lastVisibleDoc) return;

    setLoadingMore(true);
    loadingMoreRef.current = true;

    try {
      let colRef;
      if (albumId && (collectionName === 'Albums' || collectionName === 'photos')) {
        colRef = collection(db, 'Albums', albumId, 'Photos');
      } else {
        colRef = collection(db, collectionName);
      }

      const constraints = buildConstraints();
      let q;
      try {
        q = query(
          colRef,
          ...constraints,
          orderBy(orderByField, orderDirection),
          startAfter(lastVisibleDoc),
          limit(pageSize)
        );
      } catch {
        q = query(
          colRef,
          ...constraints,
          startAfter(lastVisibleDoc),
          limit(pageSize)
        );
      }

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const results = await Promise.all(snapshot.docs.map(transformAndResolve));
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];

        setPhotos((prev) => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPhotos = results.map(r => r.photo).filter(p => !existingIds.has(p.id));
          return [...prev, ...newPhotos];
        });

        setGalleryItems((prev) => {
          const existingIds = new Set(prev.map(g => g.id));
          const newItems = results.map(r => r.galleryItem).filter(g => !existingIds.has(g.id));
          return [...prev, ...newItems];
        });

        setLastVisibleDoc(lastDoc);
        setHasMore(snapshot.docs.length >= pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.warn('[useGalleryPhotos] Load more error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [lastVisibleDoc, albumId, collectionName, buildConstraints, orderByField, orderDirection, pageSize, transformAndResolve]);

  // Realtime subscription mode if enabled
  useEffect(() => {
    if (!realtime) {
      loadInitialBatch();
      return;
    }

    setLoading(true);
    let colRef;
    if (albumId && (collectionName === 'Albums' || collectionName === 'photos')) {
      colRef = collection(db, 'Albums', albumId, 'Photos');
    } else {
      colRef = collection(db, collectionName);
    }

    const constraints = buildConstraints();
    let q;
    try {
      q = query(
        colRef,
        ...constraints,
        orderBy(orderByField, orderDirection),
        limit(pageSize)
      );
    } catch {
      q = query(colRef, ...constraints, limit(pageSize));
    }

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const results = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              try {
                return await transformAndResolve(docSnap);
              } catch (docErr) {
                console.warn(`[useGalleryPhotos] Unresolvable photo item ${docSnap.id}:`, docErr);
                // Fallback to minimal raw photo representation
                const raw = docSnap.data() || {};
                const fallbackPhoto: Photo = {
                  id: docSnap.id,
                  albumId: raw.albumId || albumId || '',
                  imageUrl: raw.imageUrl || raw.originalUrl || raw.url || '',
                  thumbUrl: raw.thumbUrl || raw.thumbnailUrl || raw.imageUrl || '',
                  uploadTimestamp: raw.createdAt || new Date().toISOString(),
                  isPremium: !!raw.isPremium,
                  title: raw.title || 'Photo',
                  caption: raw.caption || '',
                  uploadedBy: raw.uploadedBy || 'Just1Play'
                };
                const fallbackGalleryItem: GalleryMediaItem = {
                  id: docSnap.id,
                  originalUrl: fallbackPhoto.imageUrl,
                  watermarkedUrl: fallbackPhoto.thumbUrl,
                  isWatermarked: !!raw.isWatermarked,
                  photographerId: raw.photographerId || '',
                  photographerName: raw.photographerName || 'Media Staff',
                  eventName: raw.eventName || 'Event',
                  albumName: raw.albumName || 'Album',
                  category: raw.category || 'Action',
                  sport: raw.sport || 'Sports',
                  teams: [],
                  title: fallbackPhoto.title,
                  caption: fallbackPhoto.caption,
                  hypesCount: 0,
                  userHypes: {},
                  createdAt: fallbackPhoto.uploadTimestamp,
                  resolution: 'Standard',
                  tags: [],
                  price: typeof raw.price === 'number' ? raw.price : 2.00
                };
                return { photo: fallbackPhoto, galleryItem: fallbackGalleryItem };
              }
            })
          );
          setPhotos(results.map(r => r.photo));
          setGalleryItems(results.map(r => r.galleryItem));
          setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1] || null);
          setHasMore(snapshot.docs.length >= pageSize);
        } catch (snapErr) {
          console.warn('[useGalleryPhotos] Realtime snapshot processing notice:', snapErr);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.warn('[useGalleryPhotos] Realtime snapshot error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [realtime, loadInitialBatch, albumId, collectionName, buildConstraints, orderByField, orderDirection, pageSize, transformAndResolve]);

  // Infinite Scroll IntersectionObserver target callback
  const observerTargetRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
            loadMore();
          }
        },
        { threshold: 0.1, rootMargin: '200px' }
      );

      if (node) observerRef.current.observe(node);
    },
    [loading, loadingMore, loadMore]
  );

  return {
    photos,
    galleryItems,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh: loadInitialBatch,
    observerTargetRef,
    totalLoaded: photos.length
  };
}

export default useGalleryPhotos;
