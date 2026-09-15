import { useState, useEffect } from 'react';
import { firestoreWriteQueue, WriteQueueState, QueuedWriteItem } from '../services/firestoreWriteQueueService';

export function useFirestoreWriteQueue() {
  const [state, setState] = useState<WriteQueueState>(firestoreWriteQueue.getState());

  useEffect(() => {
    const unsubscribe = firestoreWriteQueue.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const syncNow = () => firestoreWriteQueue.syncNow();
  const retryItem = (id: string) => firestoreWriteQueue.retryItem(id);
  const removeItem = (id: string) => firestoreWriteQueue.removeItem(id);
  const clearQueue = () => firestoreWriteQueue.clearQueue();

  return {
    ...state,
    syncNow,
    retryItem,
    removeItem,
    clearQueue,
    hasPending: state.pendingCount > 0,
    hasFailed: state.failedCount > 0
  };
}
