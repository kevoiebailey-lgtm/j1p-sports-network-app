import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, Film, Image as ImageIcon, AlertCircle } from 'lucide-react';

export interface PendingUploadItem {
  id: string;
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  progress: number; // 0 to 100
  statusMessage: string;
}

interface PendingUploadCardProps {
  upload: PendingUploadItem;
  onCancel: (uploadId: string) => void;
}

export const PendingUploadCard: React.FC<PendingUploadCardProps> = ({ upload, onCancel }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="p-4 sm:p-5 rounded-3xl bg-[#212A31]/90 border-2 border-red-600/40 backdrop-blur-xl shadow-[0_0_25px_rgba(16,185,129,0.15)] relative overflow-hidden my-4"
    >
      {/* Top Animated Processing Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-red-600 via-cyan-400 to-red-500"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(100, Math.max(0, upload.progress))}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      <div className="flex items-start justify-between gap-4">
        {/* Main Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Media Thumbnail or Icon Preview */}
          <div className="relative w-14 h-14 rounded-2xl bg-[#212A31] border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {upload.imageUrl ? (
              <img
                src={upload.imageUrl}
                alt="Uploading Media"
                className="w-full h-full object-cover opacity-80"
              />
            ) : upload.videoUrl ? (
              <div className="flex flex-col items-center justify-center text-red-500">
                <Film className="w-6 h-6 animate-pulse" />
                <span className="text-[8px] font-mono font-bold uppercase mt-0.5">Video</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-red-500">
                <ImageIcon className="w-6 h-6" />
                <span className="text-[8px] font-mono font-bold uppercase mt-0.5">Text</span>
              </div>
            )}

            {/* Spinner Overlay */}
            <div className="absolute inset-0 bg-[#212A31]/40 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/20 text-red-500 text-[10px] font-mono font-bold uppercase border border-red-600/30">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Upload Pending
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {upload.progress}% Complete
              </span>
            </div>

            <p className="text-xs font-bold text-white truncate max-w-md">
              {upload.caption || 'New Media Broadcast'}
            </p>

            <p className="text-[11px] font-mono text-red-500/90 flex items-center gap-1.5">
              <span>{upload.statusMessage || 'Processing media & syncing to Social Wall...'}</span>
            </p>
          </div>
        </div>

        {/* CANCEL BUTTON */}
        <button
          onClick={() => onCancel(upload.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/40 transition-all cursor-pointer font-mono text-xs font-bold shrink-0 shadow-sm"
          title="Cancel upload and prevent duplicate submission"
        >
          <X className="w-4 h-4" />
          <span>Cancel</span>
        </button>
      </div>

      {/* Progress Bar Container */}
      <div className="mt-3 space-y-1">
        <div className="w-full h-2 rounded-full bg-[#212A31] overflow-hidden border border-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-red-600 via-[#E5B868] to-cyan-400 shadow-[0_0_10px_rgba(214,28,36,0.5)]"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(100, Math.max(0, upload.progress))}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
            Click Cancel to stop publication and avoid duplicates
          </span>
          <span>Just1Play Broadcast Engine</span>
        </div>
      </div>
    </motion.div>
  );
};
