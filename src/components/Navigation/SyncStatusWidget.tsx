import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudOff, ArrowUpRight } from 'lucide-react';
import { indexedDbSyncBridge, SyncEngineStatus } from '../../lib/indexedDbSyncBridge';
import { firestoreWriteQueue, WriteQueueState } from '../../services/firestoreWriteQueueService';

export const SyncStatusWidget: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>(() => indexedDbSyncBridge.getStatus());
  const [queueState, setQueueState] = useState<WriteQueueState>(() => firestoreWriteQueue.getState());
  const [manualSyncing, setManualSyncing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const unsubSync = indexedDbSyncBridge.subscribe((status) => {
      setSyncStatus(status);
    });

    const unsubQueue = firestoreWriteQueue.subscribe((state) => {
      setQueueState(state);
    });

    return () => {
      unsubSync();
      unsubQueue();
    };
  }, []);

  // Show a momentary banner when network goes offline or restores
  useEffect(() => {
    if (!syncStatus.isOnline) {
      setToastMessage('Offline mode active: changes safely cached in local IndexedDB.');
      setShowToast(true);
    } else if (syncStatus.isOnline && queueState.pendingCount === 0) {
      setToastMessage('All offline changes synced with Firebase.');
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus.isOnline, queueState.pendingCount]);

  const handleManualSync = async () => {
    if (manualSyncing) return;
    setManualSyncing(true);
    try {
      await indexedDbSyncBridge.reconcileAllStores();
    } catch (err) {
      console.warn('Manual sync error:', err);
    } finally {
      setManualSyncing(false);
    }
  };

  const isPending = queueState.pendingCount > 0;
  const isSyncing = syncStatus.isSyncing || queueState.isSyncing || manualSyncing;

  return (
    <>
      {/* Toast Notification for Network State Changes */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-16 right-4 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur-md shadow-xl border ${
              !syncStatus.isOnline
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
            }`}
          >
            {!syncStatus.isOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            )}
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setShowToast(false)}
              className="ml-1 text-slate-400 hover:text-white"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Status Button in Header Bar */}
      <button
        type="button"
        id="j1p-sync-status-btn"
        onClick={handleManualSync}
        aria-label="Database sync status. Click to trigger manual synchronization."
        title={
          !syncStatus.isOnline
            ? 'Offline: IndexedDB storage active. Click to retry connection.'
            : isPending
            ? `${queueState.pendingCount} pending write(s) queued for Firestore. Click to sync now.`
            : isSyncing
            ? 'Synchronizing local cache with cloud...'
            : 'IndexedDB & Firestore synchronized (Realtime Parity). Click to re-check.'
        }
        className={`relative flex items-center justify-center h-9 w-9 sm:h-9 sm:w-auto sm:px-3 py-1.5 rounded-lg text-xs font-mono select-none cursor-pointer transition-all duration-150 shrink-0 sm:gap-2 active:scale-[0.97] border ${
          !syncStatus.isOnline
            ? 'bg-amber-500/10 text-[#FFB800] border-amber-500/40 shadow-[0_0_12px_rgba(255,184,0,0.15)] hover:bg-amber-500/20'
            : isSyncing
            ? 'bg-[#00F0D0]/10 text-[#00F0D0] border-[#00F0D0]/40 shadow-[0_0_14px_rgba(0,240,208,0.2)]'
            : isPending
            ? 'bg-orange-500/10 text-orange-400 border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.2)] hover:bg-orange-500/20'
            : 'bg-slate-850 sm:bg-[#12151C]/90 text-slate-300 sm:text-[#8E9BB0] border-slate-700/60 sm:border-white/[0.08] shadow-sm sm:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:text-[#00F0D0] hover:border-[#00F0D0]/40 hover:bg-[#12151C]'
        }`}
      >
        {isSyncing ? (
          <RefreshCw className="w-4 h-4 animate-spin text-[#00F0D0] shrink-0" />
        ) : !syncStatus.isOnline ? (
          <WifiOff className="w-4 h-4 text-[#FFB800] shrink-0" />
        ) : isPending ? (
          <CloudOff className="w-4 h-4 text-orange-400 animate-pulse shrink-0" />
        ) : (
          <Wifi className="w-4 h-4 text-[#00F0D0]/80 group-hover:text-[#00F0D0] shrink-0" />
        )}

        <span className="hidden md:inline font-bold tracking-tight whitespace-nowrap">
          {!syncStatus.isOnline
            ? 'Offline'
            : isSyncing
            ? 'Syncing...'
            : isPending
            ? `${queueState.pendingCount} Queued`
            : 'Synced'}
        </span>

        {/* Live sync pulse indicator */}
        {isPending ? (
          <span className="flex h-2 w-2 rounded-full bg-orange-400 animate-ping absolute -top-0.5 -right-0.5" />
        ) : !syncStatus.isOnline ? (
          <span className="flex h-1.5 w-1.5 rounded-full bg-[#FFB800] absolute top-1.5 right-1.5" />
        ) : null}
      </button>
    </>
  );
};
