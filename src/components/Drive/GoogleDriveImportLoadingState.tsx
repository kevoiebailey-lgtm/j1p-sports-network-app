import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FolderSync, 
  Cloud, 
  Layers, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  X, 
  Clock, 
  Image as ImageIcon,
  HardDrive
} from 'lucide-react';

export type ImportStage = 
  | 'idle' 
  | 'authorizing' 
  | 'scanning' 
  | 'processing' 
  | 'syncing' 
  | 'complete' 
  | 'error';

export interface GoogleDriveImportLoadingStateProps {
  stage: ImportStage;
  progress?: number; // 0 - 100
  currentCount?: number;
  totalCount?: number;
  currentBatch?: number;
  totalBatches?: number;
  statusMessage?: string;
  folderName?: string;
  albumName?: string;
  isCreatorPortal?: boolean;
  recentThumbnails?: Array<{ id: string; name?: string }>;
  onCancel?: () => void;
  onRetry?: () => void;
  errorMessage?: string;
  compact?: boolean;
}

const STAGE_STEPS: Array<{ key: ImportStage; label: string; description: string }> = [
  { key: 'authorizing', label: 'OAuth 2.0 Identity', description: 'Verifying Google Drive access token' },
  { key: 'scanning', label: 'Folder Scan', description: 'Indexing high-resolution sports photos' },
  { key: 'processing', label: 'Link & Watermark Generation', description: 'Preparing preview & download endpoints' },
  { key: 'syncing', label: 'Firestore Ingestion', description: 'Writing batch records to Gallery & Albums' },
];

export const GoogleDriveImportLoadingState: React.FC<GoogleDriveImportLoadingStateProps> = ({
  stage,
  progress = 0,
  currentCount = 0,
  totalCount = 0,
  currentBatch = 1,
  totalBatches = 1,
  statusMessage,
  folderName,
  albumName,
  isCreatorPortal = false,
  recentThumbnails = [],
  onCancel,
  onRetry,
  errorMessage,
  compact = false
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer while active
  useEffect(() => {
    if (stage === 'idle' || stage === 'complete' || stage === 'error') {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [stage]);

  // Reset timer on stage restart
  useEffect(() => {
    if (stage === 'scanning' || stage === 'authorizing') {
      setElapsedSeconds(0);
    }
  }, [stage]);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const getStageIndex = (currentStage: ImportStage) => {
    switch (currentStage) {
      case 'authorizing': return 0;
      case 'scanning': return 1;
      case 'processing': return 2;
      case 'syncing': return 3;
      case 'complete': return 4;
      default: return -1;
    }
  };

  const currentStageIdx = getStageIndex(stage);
  const themeAccent = isCreatorPortal ? 'rose' : 'cyan';

  if (stage === 'idle') {
    return null;
  }

  // Error State Display
  if (stage === 'error') {
    return (
      <div className={`p-5 rounded-2xl ${isCreatorPortal ? 'bg-rose-950/40 border-rose-500/40' : 'bg-red-950/40 border-red-500/40'} border space-y-4 animate-fadeIn`}>
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black font-sans uppercase tracking-tight text-red-300">
              Import Pipeline Interrupted
            </h4>
            <p className="text-xs text-red-200/80 mt-1 leading-relaxed break-words font-mono">
              {errorMessage || 'Google Drive synchronization encountered an unexpected response. Please verify folder permissions or re-authenticate.'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-red-500/20">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition-all"
            >
              Dismiss
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`px-4 py-1.5 rounded-xl ${isCreatorPortal ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'} text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg cursor-pointer`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Retry Ingestion</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Complete State Display
  if (stage === 'complete') {
    return (
      <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3 animate-fadeIn">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black font-sans uppercase tracking-tight text-emerald-300">
              Import Successful
            </h4>
            <p className="text-xs text-emerald-200/80 mt-0.5 font-mono">
              {totalCount > 0 
                ? `Synchronized ${totalCount} photos to "${albumName || folderName || 'Gallery'}" in ${formatElapsed(elapsedSeconds)}.`
                : `Completed album synchronization in ${formatElapsed(elapsedSeconds)}.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active Loading & Progress State
  return (
    <div className={`p-5 rounded-2xl ${isCreatorPortal ? 'bg-slate-900/90 border-rose-500/30' : 'bg-slate-900/90 border-cyan-500/30'} border space-y-5 shadow-2xl backdrop-blur-md animate-fadeIn`}>
      
      {/* Header Info & Timer */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${isCreatorPortal ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'} border flex items-center justify-center shrink-0`}>
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black font-sans uppercase tracking-tight text-white">
                {stage === 'authorizing' && 'Authenticating with Google Drive...'}
                {stage === 'scanning' && 'Scanning Google Drive Folder...'}
                {stage === 'processing' && 'Preparing Photo Endpoints...'}
                {stage === 'syncing' && 'Synchronizing to Live Gallery...'}
              </h4>
              <span className={`px-2 py-0.5 rounded-full ${isCreatorPortal ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'} border font-mono text-[10px] font-bold uppercase`}>
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
              {statusMessage || (folderName ? `Folder: "${folderName}"` : 'Indexing remote media storage')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatElapsed(elapsedSeconds)}</span>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Cancel sync"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar with Percentage and Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            {stage === 'syncing' && totalBatches > 1 && (
              <span className="text-slate-400">
                Batch {currentBatch} of {totalBatches} • 
              </span>
            )}
            <span>
              {totalCount > 0 
                ? `${currentCount} / ${totalCount} Photos Processed`
                : 'Indexing high-res assets...'}
            </span>
          </span>
          <span className={`font-black ${isCreatorPortal ? 'text-rose-400' : 'text-cyan-400'}`}>
            {Math.round(progress)}%
          </span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden relative">
          <div 
            className={`h-full transition-all duration-300 rounded-full ${
              isCreatorPortal 
                ? 'bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400' 
                : 'bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-300'
            }`}
            style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
          />
          {/* Animated Sheen Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 animate-pulse pointer-events-none" />
        </div>
      </div>

      {/* Pipeline Step Sequence Tracker */}
      {!compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {STAGE_STEPS.map((step, idx) => {
            const isFinished = currentStageIdx > idx;
            const isCurrent = currentStageIdx === idx;

            return (
              <div 
                key={step.key}
                className={`p-2.5 rounded-xl border transition-all ${
                  isFinished
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : isCurrent
                    ? isCreatorPortal
                      ? 'bg-rose-950/30 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                      : 'bg-cyan-950/30 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(0,184,212,0.15)]'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {isFinished ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${isCreatorPortal ? 'text-rose-400' : 'text-cyan-400'}`} />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[9px] font-mono shrink-0">
                      {idx + 1}
                    </div>
                  )}
                  <span className="text-[11px] font-bold font-sans tracking-tight truncate">
                    {step.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1 font-mono">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Thumbnail Ticker (if thumbnails provided) */}
      {recentThumbnails.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3 text-cyan-400" />
              <span>Ingested Photo Stream</span>
            </span>
            <span>{recentThumbnails.length} loaded</span>
          </div>

          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin">
            {recentThumbnails.slice(-10).map((file, i) => (
              <div 
                key={file.id || i}
                className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shrink-0 relative group"
              >
                <img
                  src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w100`}
                  alt={file.name || 'Photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Non-blocking Safety Advice */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Non-blocking background ingest • Auto-saves to albums</span>
        </span>
        <span className="text-slate-500 hidden sm:inline">
          SD card &amp; Drive assets preserved
        </span>
      </div>

    </div>
  );
};

export default GoogleDriveImportLoadingState;
