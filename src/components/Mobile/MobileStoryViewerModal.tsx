import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Flame, Heart, Share2, Send, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { VerifiedBadge } from '../Common/VerifiedBadge';

export interface MobileStoryItem {
  id: string;
  athleteName: string;
  avatarUrl: string;
  sport: string;
  gradYear: string;
  title: string;
  mediaUrl: string;
  isLive?: boolean;
  views: string;
  flames: number;
}

interface MobileStoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: MobileStoryItem[];
  initialIndex?: number;
}

export const MobileStoryViewerModal: React.FC<MobileStoryViewerModalProps> = ({
  isOpen,
  onClose,
  stories,
  initialIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [flameCount, setFlameCount] = useState(0);

  const activeStory = stories[currentIndex] || stories[0];

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
    setLiked(false);
  }, [initialIndex]);

  useEffect(() => {
    if (activeStory) {
      setFlameCount(activeStory.flames);
    }
  }, [activeStory]);

  // Story progress timer
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentIndex, stories.length, onClose]);

  if (!isOpen || !activeStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setLiked(false);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      setLiked(false);
    }
  };

  const toggleFlame = () => {
    if (liked) {
      setFlameCount((c) => c - 1);
      setLiked(false);
    } else {
      setFlameCount((c) => c + 1);
      setLiked(true);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm h-full max-h-[750px] sm:h-[90vh] sm:rounded-3xl overflow-hidden bg-black flex flex-col justify-between shadow-2xl border border-white/20"
        >
          {/* TOP STORY TIMELINE BARS */}
          <div className="absolute top-3 left-3 right-3 z-30 flex gap-1.5">
            {stories.map((story, idx) => (
              <div
                key={story.id}
                className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-[#E5B868] transition-all duration-100 ease-linear"
                  style={{
                    width:
                      idx < currentIndex
                        ? '100%'
                        : idx === currentIndex
                        ? `${progress}%`
                        : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* TOP HEADER AUTHOR INFO */}
          <div className="absolute top-7 left-4 right-4 z-30 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <img
                src={activeStory.avatarUrl}
                alt={activeStory.athleteName}
                className="w-8 h-8 rounded-full object-cover border-2 border-[#E5B868]"
              />
              <div className="text-left leading-tight">
                <div className="flex items-center gap-1 font-bold text-xs uppercase text-white">
                  <span>{activeStory.athleteName}</span>
                  <VerifiedBadge size="sm" />
                </div>
                <div className="text-[10px] text-slate-300 font-mono">
                  {activeStory.sport} • '{activeStory.gradYear.slice(-2)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-full bg-black/50 border border-white/20 text-white cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/50 border border-white/20 text-white hover:text-rose-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TAP GESTURE TARGETS (LEFT / RIGHT) */}
          <div className="absolute inset-0 z-10 flex">
            <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
            <div
              className="w-1/3 h-full cursor-pointer"
              onClick={() => setIsPlaying(!isPlaying)}
            />
            <div className="w-1/3 h-full cursor-pointer" onClick={handleNext} />
          </div>

          {/* STORY MEDIA BG */}
          <div className="relative w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden">
            <img
              src={activeStory.mediaUrl}
              alt={activeStory.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/40" />
          </div>

          {/* BOTTOM STORY METADATA & QUICK ACTIONS */}
          <div className="absolute bottom-4 left-4 right-4 z-30 space-y-3">
            <div className="text-left space-y-1 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-xs font-black text-[#E5B868] font-mono uppercase">
                {activeStory.isLive && (
                  <span className="px-2 py-0.5 bg-red-600 text-white rounded font-mono text-[9px] animate-pulse">
                    LIVE REEL
                  </span>
                )}
                <span>{activeStory.views} Views</span>
              </div>
              <h4 className="text-sm font-black italic uppercase text-white">
                {activeStory.title}
              </h4>
            </div>

            {/* ACTION BAR */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={toggleFlame}
                className={`flex-1 py-2.5 px-4 rounded-full border text-xs font-black uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  liked
                    ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_20px_rgba(214,28,36,0.6)]'
                    : 'bg-black/70 text-white border-white/20 hover:border-[#E5B868]'
                }`}
              >
                <Flame className={`w-4 h-4 ${liked ? 'text-black fill-black' : 'text-[#E5B868]'}`} />
                <span>{flameCount} FLAMES</span>
              </button>

              <button
                onClick={handleNext}
                className="p-3 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
