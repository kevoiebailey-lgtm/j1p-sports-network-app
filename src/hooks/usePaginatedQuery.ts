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

export interface PaginatedQueryOptions<T> {
  collectionName: string;
  pageSize?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  constraints?: QueryConstraint[];
  filterFn?: (item: T) => boolean;
  transformDoc?: (doc: QueryDocumentSnapshot<DocumentData>) => Promise<T> | T;
}

export interface PaginatedQueryResult<T> {
  data: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  observerTargetRef: (node: HTMLElement | null) => void;
  totalLoaded: number;
}

/**
 * Enterprise Paginated Query Hook for Firestore
 * Fetches data in batches (default: 15 items) using limit(pageSize) and startAfter(lastDoc).
 * Provides an IntersectionObserver ref callback for zero-overhead infinite scrolling.
 */
export function usePaginatedQuery<T = any>({
  collectionName,
  pageSize = 15,
  orderByField = 'createdAt',
  orderDirection = 'desc',
  constraints = [],
  transformDoc
}: PaginatedQueryOptions<T>): PaginatedQueryResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingMoreRef = useRef<boolean>(false);
  const hasMoreRef = useRef<boolean>(true);
  const transformerRef = useRef(transformDoc);
  const constraintsRef = useRef(constraints);

  transformerRef.current = transformDoc;
  constraintsRef.current = constraints;

  // Sync ref values for intersection observer callback
  loadingMoreRef.current = loadingMore;
  hasMoreRef.current = hasMore;

  const defaultTransform = useCallback((docSnap: QueryDocumentSnapshot<DocumentData>): T => {
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as unknown as T;
  }, []);

  // Initial batch load
  const loadInitialBatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const transformer = transformerRef.current || defaultTransform;
    const currentConstraints = constraintsRef.current || [];

    try {
      const colRef = collection(db, collectionName);
      const q = query(
        colRef,
        orderBy(orderByField, orderDirection),
        ...currentConstraints,
        limit(pageSize)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const fetchedItems = await Promise.all(snapshot.docs.map(transformer));
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        setLastVisibleDoc(lastDoc);
        setData(fetchedItems);
        setHasMore(snapshot.docs.length >= pageSize);
      } else {
        setData([]);
        setHasMore(false);
      }
    } catch (err: any) {
      console.warn(`Firestore paginated query [${collectionName}] error:`, err);
      setError(err);
      setData([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [collectionName, pageSize, orderByField, orderDirection, defaultTransform]);

  // Load next batch
  const loadMore = useCallback(async () => {
    if (loading || loadingMoreRef.current || !hasMoreRef.current || !lastVisibleDoc) {
      return;
    }

    setLoadingMore(true);
    const transformer = transformerRef.current || defaultTransform;
    const currentConstraints = constraintsRef.current || [];

    try {
      const colRef = collection(db, collectionName);
      const q = query(
        colRef,
        orderBy(orderByField, orderDirection),
        ...currentConstraints,
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const nextItems = await Promise.all(snapshot.docs.map(transformer));
        const newLastDoc = snapshot.docs[snapshot.docs.length - 1];
        setLastVisibleDoc(newLastDoc);

        setData((prev) => {
          const existingIds = new Set(prev.map((item: any) => item.id || item.title));
          const uniqueNew = nextItems.filter((item: any) => !existingIds.has(item.id || item.title));
          return [...prev, ...uniqueNew];
        });

        setHasMore(snapshot.docs.length >= pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.warn(`Firestore loadMore [${collectionName}] error:`, err);
      setError(err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [collectionName, pageSize, orderByField, orderDirection, lastVisibleDoc, loading, defaultTransform]);

  // Reset and reload
  const refresh = useCallback(async () => {
    setLastVisibleDoc(null);
    setHasMore(true);
    await loadInitialBatch();
  }, [loadInitialBatch]);

  // Execute initial load on mount
  useEffect(() => {
    loadInitialBatch();
  }, [loadInitialBatch]);

  // Infinite scroll intersection observer target callback
  const observerTargetRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
            loadMore();
          }
        },
        {
          root: null,
          rootMargin: '200px', // trigger 200px before reaching the bottom
          threshold: 0.1
        }
      );

      observerRef.current.observe(node);
    },
    [loadMore]
  );

  return {
    data,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    setData,
    observerTargetRef,
    totalLoaded: data.length
  };
}
