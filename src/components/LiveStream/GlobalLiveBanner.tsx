import React, { useState, useEffect } from 'react';
import { liveStreamService, StandaloneStream } from '../../services/liveStreamService';
import { Radio, Tv, ArrowRight, X, Sparkles, Zap, Smartphone, Laptop } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalLiveBannerProps {
  onNavigateToLive: () => void;
}

export const GlobalLiveBanner: React.FC<GlobalLiveBannerProps> = ({ onNavigateToLive }) => {
  const [activeStreams, setActiveStreams] = useState<StandaloneStream[]>([]);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = liveStreamService.subscribeToActiveStreams((streams) => {
      const liveOnly = streams.filter(s => s.isBroadcasting || s.status === 'live');
      setActiveStreams(liveOnly);
    });

    return () => unsubscribe();
  }, []);

  const featuredStream = activeStreams[0];

  if (!featuredStream || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="w-full z-40 bg-gradient-to-r from-[#212A31] via-[#212A31] to-[#212A31] border-b border-[#E5B868]/50 shadow-[0_4px_25px_rgba(0,242,254,0.2)] relative overflow-hidden shrink-0"
      >
        {/* Glowing ambient pulse */}
        <div className="absolute inset-0 bg-[#E5B868]/5 animate-pulse pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 relative z-10">
          
          {/* Left: Live Indicator & Stream Metadata */}
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 text-white rounded-full text-[10px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(0,242,254,0.6)] shrink-0 animate-pulse font-mono">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              LIVE BROADCAST NOW
            </span>

            <div className="flex items-center gap-2 text-xs text-slate-200 truncate font-mono">
              <span className="font-black text-white truncate">
                {featuredStream.title}
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#212A31] border border-slate-700 text-[#E5B868] font-bold text-[10px]">
                {featuredStream.deviceType === 'mobile' ? (
                  <Smartphone className="w-3 h-3 text-[#E5B868]" />
                ) : (
                  <Laptop className="w-3 h-3 text-[#E5B868]" />
                )}
                <span>{featuredStream.broadcasterName}</span>
              </span>

              {featuredStream.homeScore !== undefined && featuredStream.awayScore !== undefined && (
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-white font-bold text-[10px] border border-slate-700">
                  <span>{featuredStream.homeTeamName} {featuredStream.homeScore}</span>
                  <span className="text-slate-400">-</span>
                  <span>{featuredStream.awayScore} {featuredStream.awayTeamName}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: CTA & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToLive}
              className="px-3.5 py-1.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(0,242,254,0.3)] flex items-center gap-1.5 cursor-pointer transform hover:scale-105"
            >
              <Tv className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>WATCH LIVE ({featuredStream.viewerCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

