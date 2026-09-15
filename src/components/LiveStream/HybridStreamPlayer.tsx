import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Layers, 
  Users, 
  Radio, 
  Camera, 
  Tv,
  Share2,
  Check,
  Link2
} from 'lucide-react';
import { ScoreBugHUD } from './ScoreBugHUD';
import { BuiltInStreamPlayer } from './BuiltInStreamPlayer';
import { ExternalEmbedPlayer } from './ExternalEmbedPlayer';
import { StreamPosterCard } from './StreamPosterCard';

export interface HybridStreamPlayerProps {
  isLive: boolean;
  isNativeBroadcastActive: boolean;
  streamUrl: string;
  homeTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logoUrl?: string;
  };
  awayTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logoUrl?: string;
  };
  period: string;
  gameClock: string;
  sport: string;
  title: string;
  thumbnailUrl?: string;
  showScoreOverlay: boolean;
  viewerCount: number;
  isMuted: boolean;
  isPlaying: boolean;
  activeCamAngle: string;
  floatingEmojis: Array<{ id: string; emoji: string; x: number }>;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleScoreOverlay: () => void;
  onToggleFullscreen: () => void;
  onTriggerCheer: (emoji: string) => void;
  onToggleNativeBroadcast: () => void;
  onCopyShareLink?: () => void;
  copiedLink?: boolean;
}

export const HybridStreamPlayer: React.FC<HybridStreamPlayerProps> = ({
  isLive,
  isNativeBroadcastActive,
  streamUrl,
  homeTeam,
  awayTeam,
  period,
  gameClock,
  sport,
  title,
  thumbnailUrl,
  showScoreOverlay,
  viewerCount,
  isMuted,
  isPlaying,
  activeCamAngle,
  floatingEmojis,
  onTogglePlay,
  onToggleMute,
  onToggleScoreOverlay,
  onToggleFullscreen,
  onTriggerCheer,
  onToggleNativeBroadcast,
  onCopyShareLink,
  copiedLink = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  // FAIL-SAFE STREAM VISIBILITY ENGINE:
  // Determine source:
  // 1. Prioritize Built-in Native Camera Feed if isNativeBroadcastActive is true
  // 2. Otherwise check for streamUrl
  // 3. Otherwise show StreamPosterCard with "Initializing Game Feed Broadcast..." status
  let PlayerContent: React.ReactNode;

  if (isLive) {
    if (isNativeBroadcastActive) {
      PlayerContent = (
        <BuiltInStreamPlayer
          isMuted={isMuted}
          activeCamAngle={activeCamAngle}
        />
      );
    } else if (streamUrl && streamUrl.trim().length > 0) {
      PlayerContent = (
        <ExternalEmbedPlayer
          streamUrl={streamUrl}
          isMuted={isMuted}
          isPlaying={isPlaying}
          title={title}
        />
      );
    } else {
      PlayerContent = (
        <StreamPosterCard
          status="initializing"
          title={title}
          thumbnailUrl={thumbnailUrl}
        />
      );
    }
  } else {
    PlayerContent = (
      <StreamPosterCard
        status="upcoming"
        title={title}
        thumbnailUrl={thumbnailUrl}
      />
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video rounded-2xl overflow-hidden border border-red-600/30 bg-[#212A31] shadow-[0_0_50px_rgba(16,185,129,0.2)] group flex items-center justify-center select-none"
    >
      
      {/* 1. FLOATING CHEER PARTICLES OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        <AnimatePresence>
          {floatingEmojis.map(item => (
            <motion.div
              key={item.id}
              initial={{ y: '100%', opacity: 1, scale: 0.8 }}
              animate={{ y: '-20%', opacity: 0, scale: 1.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              style={{ left: `${item.x}%` }}
              className="absolute text-3xl sm:text-5xl drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]"
            >
              {item.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 2. FAIL-SAFE ACTIVE STREAM / PLAYER CANVAS */}
      {PlayerContent}

      {/* 3. TV BROADCAST FLOATING SCORE OVERLAY (TOP ANCHORED SCOREBUG) */}
      {showScoreOverlay && (
        <ScoreBugHUD
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period={period}
          gameClock={gameClock}
          sport={sport}
          isLive={isLive}
        />
      )}

      {/* 4. SPECTATOR COUNT & STREAM TYPE BADGES (TOP RIGHT BELOW SCOREBUG) */}
      <div className="absolute top-12 right-2 sm:top-14 sm:right-3 z-10 flex items-center gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[#212A31]/80 backdrop-blur-md rounded-lg border border-slate-800 text-[10px] sm:text-xs font-mono font-bold text-white shadow-lg">
          <Users className="w-3 h-3 text-[#E5B868]" />
          <span>{viewerCount} Viewers</span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[#212A31]/80 backdrop-blur-md rounded-lg border border-slate-800 text-[9px] sm:text-[10px] font-mono font-bold uppercase">
          {isNativeBroadcastActive ? (
            <span className="flex items-center gap-1 text-[#E5B868]">
              <Camera className="w-3 h-3" /> NATIVE
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#E2E8F0]">
              <Tv className="w-3 h-3" /> EMBED
            </span>
          )}
        </div>
      </div>

      {/* 5. BOTTOM PLAYER HUD CONTROLS BAR */}
      <div className="absolute bottom-2 left-2 right-2 z-10 bg-[#212A31]/85 backdrop-blur-md p-1.5 sm:p-2 rounded-xl border border-slate-800/90 pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none px-1.5 pb-1 w-full shrink-0">
          
          {/* Play/Pause & Mute & Score Toggle */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onTogglePlay}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer border border-slate-700/50"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Square className="w-3.5 h-3.5 text-rose-400" /> : <Play className="w-3.5 h-3.5 text-[#E5B868]" />}
            </button>

            <button
              onClick={onToggleMute}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer border border-slate-700/50"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-200" />}
            </button>

            <button
              onClick={onToggleScoreOverlay}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer hidden sm:flex items-center gap-1 text-[10px] font-bold border border-slate-700/50"
              title="Toggle TV Score Bug"
            >
              <Layers className={`w-3.5 h-3.5 ${showScoreOverlay ? 'text-[#E5B868]' : 'text-slate-400'}`} />
              <span className="uppercase tracking-wider text-slate-300">TV HUD</span>
            </button>
          </div>

          {/* INTERACTIVE EMOJI CHEER BUTTONS */}
          <div className="flex items-center gap-0.5 bg-[#212A31]/80 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => onTriggerCheer('🔥')}
              className="px-1.5 py-0.5 rounded bg-slate-800/60 hover:bg-orange-500/30 text-sm sm:text-base transition-transform active:scale-125 cursor-pointer"
              title="Fire Play!"
            >
              🔥
            </button>
            <button
              onClick={() => onTriggerCheer('🏀')}
              className="px-1.5 py-0.5 rounded bg-slate-800/60 hover:bg-amber-500/30 text-sm sm:text-base transition-transform active:scale-125 cursor-pointer"
              title="Bucket!"
            >
              🏀
            </button>
            <button
              onClick={() => onTriggerCheer('💯')}
              className="px-1.5 py-0.5 rounded bg-slate-800/60 hover:bg-red-600/30 text-sm sm:text-base transition-transform active:scale-125 cursor-pointer"
              title="100!"
            >
              💯
            </button>
            <button
              onClick={() => onTriggerCheer('⚡')}
              className="px-1.5 py-0.5 rounded bg-slate-800/60 hover:bg-yellow-500/30 text-sm sm:text-base transition-transform active:scale-125 cursor-pointer"
              title="Electric Speed!"
            >
              ⚡
            </button>
          </div>

          {/* Right Controls: Copy Share Link, Stream Mode Switcher & Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
            {onCopyShareLink && (
              <button
                onClick={onCopyShareLink}
                className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border cursor-pointer whitespace-nowrap ${
                  copiedLink
                    ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_10px_rgba(214,28,36,0.5)]'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/80 hover:border-[#E5B868]/50'
                }`}
                title="Copy Deep Share Link to Stream Room"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-black stroke-[3]" />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3 h-3 text-[#E5B868]" />
                    <span className="hidden sm:inline">COPY SHARE LINK</span>
                    <span className="sm:hidden">SHARE</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onToggleNativeBroadcast}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border cursor-pointer whitespace-nowrap ${
                isNativeBroadcastActive
                  ? 'bg-[#E5B868] text-slate-950 border-[#E5B868] shadow-[0_0_10px_rgba(214,28,36,0.4)]'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="Toggle Built-in Native Camera vs External URL Embed"
            >
              <Radio className="w-3 h-3" />
              <span>{isNativeBroadcastActive ? 'Native' : 'EMBED'}</span>
            </button>

            <button
              onClick={onToggleFullscreen || handleFullscreen}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer border border-slate-700/50 shrink-0"
              title="Fullscreen"
            >
              <Maximize className="w-3.5 h-3.5 text-slate-200" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
