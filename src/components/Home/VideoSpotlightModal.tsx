import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame, Share2, ExternalLink, ShieldCheck, Zap, Award } from 'lucide-react';
import { MediaFeedItem } from './ProgressiveMediaCard';
import { NativeSportsVideoPlayer } from '../Common/NativeSportsVideoPlayer';

interface VideoSpotlightModalProps {
  item: MediaFeedItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoSpotlightModal: React.FC<VideoSpotlightModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  // Lock background body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          {/* GLASS Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#212A31]/90 backdrop-blur-xl"
          />

          {/* MODAL CONTAINER */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-5xl bg-[#212A31]/95 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[90vh]"
          >
            {/* CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-[#212A31]/80 border border-slate-800 text-slate-300 hover:text-white hover:border-[#E5B868] flex items-center justify-center transition-all cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* LEFT SIDE: NATIVE SPORTS VIDEO PLAYER (65% Width) */}
            <div className="lg:w-2/3 bg-black flex items-center justify-center relative aspect-video lg:aspect-auto">
              <NativeSportsVideoPlayer
                streamUrl={item.videoUrl}
                posterUrl={item.thumbnailUrl}
                athleteName={item.athleteName}
                athleteStats={`${item.sport.toUpperCase()} • CLASS OF ${item.classYear}`}
                autoPlay={true}
                className="w-full h-full rounded-none border-0 min-h-[300px] lg:min-h-[500px]"
              />
            </div>

            {/* RIGHT SIDE: SCOUT NOTES & RECRUIT METRICS OVERLAY (35% Width) */}
            <div className="lg:w-1/3 p-6 flex flex-col justify-between space-y-6 overflow-y-auto max-h-[400px] lg:max-h-none border-t lg:border-t-0 lg:border-l border-slate-800">
              <div className="space-y-5">
                {/* Header Tag */}
                <div className="flex items-center justify-between">
                  <span className="bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-[#E5B868]" />
                    <span>{item.sport.toUpperCase()} SPOTLIGHT</span>
                  </span>
                  <span className="text-xs font-mono text-slate-400">{item.classYear}</span>
                </div>

                {/* Athlete Profile Info */}
                <div className="flex items-center gap-3">
                  <img
                    src={item.athleteAvatar}
                    alt={item.athleteName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-[#E5B868]"
                  />
                  <div>
                    <h3 className="text-lg font-black uppercase text-white flex items-center gap-1.5">
                      <span>{item.athleteName}</span>
                      <ShieldCheck className="w-4 h-4 text-[#E5B868]" />
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{item.teamName}</p>
                  </div>
                </div>

                {/* Scout Evaluation Note Card */}
                {item.scoutNotes && (
                  <div className="p-4 rounded-2xl bg-[#212A31] border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#E5B868]">
                      <Award className="w-4 h-4" />
                      <span>SCOUT EVALUATION</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.scoutNotes}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons & Footer */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-3">
                  <button className="flex-1 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(214,28,36,0.3)]">
                    View Full Athlete Profile
                  </button>
                  <button className="p-3 bg-[#212A31] border border-slate-800 hover:border-slate-700 rounded-2xl text-slate-300 hover:text-white transition-all cursor-pointer">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {item.videoUrl && (
                  <a
                    href={item.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-slate-400 hover:text-[#E5B868] font-mono flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Open in source player</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
