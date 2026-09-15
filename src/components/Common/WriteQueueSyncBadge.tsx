import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  RotateCw, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Layers, 
  Clock, 
  Sparkles,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useFirestoreWriteQueue } from '../../hooks/useFirestoreWriteQueue';
import { QueuedWriteItem } from '../../services/firestoreWriteQueueService';

interface WriteQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WriteQueueModal: React.FC<WriteQueueModalProps> = ({ isOpen, onClose }) => {
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    syncedCount, 
    failedCount, 
    coalescedCount,
    lastSyncTime,
    items, 
    syncNow, 
    retryItem, 
    removeItem, 
    clearQueue 
  } = useFirestoreWriteQueue();

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'failed'>('all');

  if (!isOpen) return null;

  const filteredItems = items.filter(item => {
    if (activeFilter === 'pending') return item.status === 'pending' || item.status === 'syncing';
    if (activeFilter === 'failed') return item.status === 'failed';
    return true;
  });

  const getActionBadgeColor = (category: string) => {
    switch (category) {
      case 'post': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'comment': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'reaction': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'like': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-[#161C22] border border-[#2D3748] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#2D3748] flex items-center justify-between bg-[#1E2630]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black italic uppercase font-sans text-white tracking-wide">
                  Offline Write Queue & Sync
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  isOnline 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Local-first mutation buffer saving posts & interactions during offline states.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-[#12171D] border-b border-[#2D3748]">
          <div className="p-3 rounded-2xl bg-[#1E2630]/70 border border-white/5">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Pending Writes</div>
            <div className="text-lg font-black font-mono text-[#00F2FE]">{pendingCount}</div>
            <div className="text-[9px] text-slate-500 font-mono">Held in LocalStorage</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#1E2630]/70 border border-white/5">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Total Synced</div>
            <div className="text-lg font-black font-mono text-[#10B981]">{syncedCount}</div>
            <div className="text-[9px] text-slate-500 font-mono">Successfully flushed</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#1E2630]/70 border border-white/5">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Coalesced (Saved)</div>
            <div className="text-lg font-black font-mono text-[#F59E0B]">{coalescedCount}</div>
            <div className="text-[9px] text-slate-500 font-mono">Writes saved from billing</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#1E2630]/70 border border-white/5">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Failed</div>
            <div className={`text-lg font-black font-mono ${failedCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
              {failedCount}
            </div>
            <div className="text-[9px] text-slate-500 font-mono">Permanent errors</div>
          </div>
        </div>

        {/* Controls and Filters */}
        <div className="px-5 py-3 border-b border-[#2D3748] flex flex-wrap items-center justify-between gap-3 bg-[#161C22]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                activeFilter === 'all' 
                  ? 'bg-white/15 text-white border border-white/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                activeFilter === 'pending' 
                  ? 'bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/40' 
                  : 'text-slate-400 hover:text-[#00F2FE]'
              }`}
            >
              Pending ({pendingCount})
            </button>
            {failedCount > 0 && (
              <button
                onClick={() => setActiveFilter('failed')}
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeFilter === 'failed' 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                Failed ({failedCount})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearQueue}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Clear all items in queue"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}

            <button
              onClick={syncNow}
              disabled={isSyncing || !isOnline || pendingCount === 0}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-sm ${
                isSyncing 
                  ? 'bg-[#00F2FE]/20 text-[#00F2FE] cursor-wait'
                  : !isOnline || pendingCount === 0
                  ? 'bg-[#2D3748] text-slate-500 cursor-not-allowed'
                  : 'bg-[#00F2FE] hover:bg-[#38bdf8] text-slate-950 cursor-pointer'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 min-h-[220px]">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/80 mb-1" />
              <p className="text-sm font-bold text-white font-sans">Queue is Empty</p>
              <p className="text-xs text-slate-400 max-w-sm">
                All outgoing posts, comments, and reactions are in sync with Firestore servers.
              </p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div 
                key={item.id}
                className="p-3.5 rounded-2xl bg-[#1E2630]/90 border border-[#2D3748] hover:border-white/20 transition-all flex items-start justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${getActionBadgeColor(item.actionCategory)}`}>
                      {item.actionCategory}
                    </span>
                    <span className="text-xs font-bold text-white font-sans truncate">
                      {item.metadata?.title || `${item.type.toUpperCase()} /${item.collectionName}`}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {item.metadata?.summary && (
                    <p className="text-xs text-slate-300 font-sans line-clamp-1 italic">
                      "{item.metadata.summary}"
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-0.5">
                    <span>Target: <code className="text-slate-300">{item.collectionName}{item.docId ? `/${item.docId.slice(0, 12)}...` : ''}</code></span>
                    {item.dedupKey && (
                      <span className="text-[#F59E0B] font-semibold">Coalesced Mode</span>
                    )}
                    {item.retryCount > 0 && (
                      <span className="text-amber-400">Retries: {item.retryCount}/{item.maxRetries}</span>
                    )}
                  </div>

                  {item.lastError && (
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-mono mt-1">
                      {item.lastError}
                    </div>
                  )}
                </div>

                {/* Item Actions */}
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  {item.status === 'failed' && (
                    <button
                      onClick={() => retryItem(item.id)}
                      className="p-1.5 rounded-lg bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 text-[#00F2FE] transition-colors"
                      title="Retry write now"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-[#2D3748] bg-[#12171D] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00F2FE]" />
            <span>Automatic sync triggers immediately when network reconnects.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const WriteQueueSyncBadge: React.FC<{ variant?: 'compact' | 'full' }> = ({ variant = 'compact' }) => {
  const { isOnline, isSyncing, pendingCount, failedCount } = useFirestoreWriteQueue();
  const [modalOpen, setModalOpen] = useState(false);

  // If online and 0 pending items, render a lightweight in-sync state
  if (isOnline && pendingCount === 0 && failedCount === 0) {
    if (variant === 'compact') {
      return (
        <>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1E2630] hover:bg-[#2D3748] border border-[#2D3748] text-slate-300 text-[11px] font-mono transition-colors cursor-pointer"
            title="Firestore Write Queue: All changes in sync"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
            <span className="hidden sm:inline font-bold">Synced</span>
          </button>
          <WriteQueueModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
        </>
      );
    }
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold transition-all shadow-md cursor-pointer ${
          !isOnline 
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 animate-pulse'
            : isSyncing
            ? 'bg-[#00F2FE]/15 border-[#00F2FE]/40 text-[#00F2FE] hover:bg-[#00F2FE]/25'
            : failedCount > 0
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
            : 'bg-[#00F2FE]/15 border-[#00F2FE]/40 text-[#00F2FE] hover:bg-[#00F2FE]/25'
        }`}
        title="View Offline Write Queue & Sync Status"
      >
        {isSyncing ? (
          <RotateCw className="w-3.5 h-3.5 animate-spin text-[#00F2FE]" />
        ) : !isOnline ? (
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Zap className="w-3.5 h-3.5 text-[#00F2FE]" />
        )}

        <span>
          {isSyncing 
            ? `Syncing (${pendingCount})` 
            : !isOnline 
            ? `${pendingCount} Queued (Offline)` 
            : failedCount > 0
            ? `${failedCount} Failed • ${pendingCount} Queued`
            : `${pendingCount} Queued`}
        </span>
      </button>

      <WriteQueueModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
