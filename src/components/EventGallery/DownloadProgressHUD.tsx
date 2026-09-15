import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  Sparkles,
  ShieldCheck,
  Layers,
  FileDown
} from 'lucide-react';

export interface GalleryDownloadState {
  isActive: boolean;
  progress: number; // 0 - 100
  status: string; // e.g. "Fetching high-res data...", "Applying 4K Watermark..."
  title: string; // e.g. "North Jersey Lightning" or "Photo #4"
  thumbnailUrl?: string;
  itemCount?: { current: number; total: number };
  isWatermarked?: boolean;
  isComplete: boolean;
  error?: string;
}

interface DownloadProgressHUDProps {
  downloadState: GalleryDownloadState | null;
  onDismiss: () => void;
}

export const DownloadProgressHUD: React.FC<DownloadProgressHUDProps> = ({
  downloadState,
  onDismiss
}) => {
  if (!downloadState || (!downloadState.isActive && !downloadState.isComplete && !downloadState.error)) {
    return null;
  }

  const {
    progress,
    status,
    title,
    thumbnailUrl,
    itemCount,
    isWatermarked,
    isComplete,
    error
  } = downloadState;

  const displayPercent = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed bottom-6 right-6 z-[9999] max-w-md w-[calc(100vw-3rem)] sm:w-96 rounded-2xl bg-zinc-950/95 border-2 border-white/20 hover:border-[#FF6A00]/70 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(255,106,0,0.25)] p-4 text-white overflow-hidden"
      >
        {/* Glow Ambient Light */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#FF6A00]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${
              isComplete
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : error
                ? 'bg-red-500/20 text-red-400 border-red-500/50'
                : 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40 shadow-[0_0_15px_rgba(255,106,0,0.3)]'
            }`}>
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              ) : error ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider font-black text-slate-300">
                  {isComplete ? 'DOWNLOAD FINISHED' : error ? 'DOWNLOAD ERROR' : 'EXPORTING DIGITAL MEDIA'}
                </span>
                {isWatermarked !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                    isWatermarked ? 'bg-[#FF6A00]/20 text-[#FF6A00]' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {isWatermarked ? 'Watermarked' : 'Clean'}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-black text-white italic uppercase truncate max-w-[200px]">
                {title || 'High-Resolution Media'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base font-black font-mono text-[#FF6A00]">
              {displayPercent}%
            </span>
            <button
              onClick={onDismiss}
              title="Close notification"
              className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Thumbnail & Status Strip */}
        <div className="flex items-center gap-3 bg-black/60 rounded-xl p-2.5 border border-white/10 mb-3">
          {thumbnailUrl ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/20 shrink-0 bg-zinc-900">
              <img
                src={thumbnailUrl}
                alt="Download preview"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center shrink-0 text-slate-400">
              <FileDown className="w-5 h-5 text-[#FF6A00]" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-200 font-sans truncate flex items-center gap-1.5">
              <span>{status || 'Preparing high-resolution asset...'}</span>
            </p>
            {itemCount && (
              <p className="text-[10px] font-mono text-slate-400">
                Batch Progress: item {itemCount.current} of {itemCount.total}
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-all duration-200 ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                : error
                ? 'bg-red-500'
                : 'bg-gradient-to-r from-[#FF6A00] via-orange-400 to-[#FF6A00] shadow-[0_0_12px_rgba(255,106,0,0.8)]'
            }`}
            style={{ width: `${displayPercent}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${displayPercent}%` }}
          />
        </div>

        {/* Bottom Micro Footer */}
        <div className="flex items-center justify-between pt-2 mt-2 text-[10px] font-mono text-slate-400 border-t border-white/5">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#FF6A00]" />
            <span>4K Master Output</span>
          </span>
          <span className="text-slate-300">
            {isComplete ? 'Saved to Downloads' : 'Processing...'}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
