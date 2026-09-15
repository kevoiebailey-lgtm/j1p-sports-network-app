import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Sparkles, 
  Zap, 
  Flame, 
  Radio, 
  Trophy, 
  ChevronRight, 
  ShieldCheck, 
  Activity, 
  Camera, 
  Users, 
  ExternalLink,
  Film,
  RotateCcw,
  CheckCircle2,
  Tv,
  Star
} from 'lucide-react';
import { MainTab } from '../../types';
import { triggerHaptic } from '../../lib/haptics';

interface HighlightReel {
  id: string;
  vimeoId: string;
  title: string;
  subtitle: string;
  sport: string;
  badge: string;
  featuredAthlete: string;
  measurables: string;
  views: string;
  rating: string;
  posterImage: string;
}

const FEATURED_REELS: HighlightReel[] = [
  {
    id: 'reel-main',
    vimeoId: '1209255734',
    title: 'Just1Play Official 4K National Showcase',
    subtitle: 'Prime-time athleticism, verified combine measurables, and high-stakes championship moments.',
    sport: 'Multi-Sport Elite',
    badge: 'ESPN PRIME BROADCAST',
    featuredAthlete: 'Tri-State All-Stars',
    measurables: '4.38s 40-Yd • 41.5" Vert • 108.4 Passer Rating',
    views: '124.8K',
    rating: '5-Star Recruits',
    posterImage: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'reel-football',
    vimeoId: '1209255734',
    title: 'Friday Night Primetime & 7v7 Mixtape',
    subtitle: 'Explosive deep-ball touchdowns, lockdown pass deflections, and laser red-zone precision.',
    sport: 'Football & 7v7',
    badge: 'GAME FILM VAULT',
    featuredAthlete: 'Kevoie Bailey & Squad',
    measurables: '2,840 Pass Yds • 34 TDs • 74.2% Comp',
    views: '88.4K',
    rating: 'D1 Prospect',
    posterImage: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'reel-hoops',
    vimeoId: '1209255734',
    title: 'EYBL AAU Championship Showcase 🏀',
    subtitle: 'Fastbreak poster dunks, step-back clutch triples, and lockdown rim protection in 4K.',
    sport: 'Basketball',
    badge: 'EYBL SELECT',
    featuredAthlete: 'Jayden Carter • Point Guard',
    measurables: '28.4 PPG • 8.6 APG • 3.8 GPA',
    views: '94.2K',
    rating: 'Top 50 National',
    posterImage: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'reel-flag',
    vimeoId: '1209255734',
    title: "Girls' Flag Football All-American Classic",
    subtitle: 'Championship flag pulls, no-look touchdown strikes, and game-winning pick-6 interceptions.',
    sport: "Girls' Flag Football",
    badge: 'NATIONAL REEL',
    featuredAthlete: 'Maya Sanchez • MVP',
    measurables: '4.46s 40-Yd • 18 INTs • 42 Total TDs',
    views: '76.1K',
    rating: 'All-American',
    posterImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1600&q=80'
  }
];

interface HighImpactVideoHeroProps {
  onNavigateTab: (tab: MainTab) => void;
  onOpenBookingModal?: () => void;
}

export const HighImpactVideoHero: React.FC<HighImpactVideoHeroProps> = ({
  onNavigateTab,
  onOpenBookingModal
}) => {
  const [selectedReelIndex, setSelectedReelIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showTheaterModal, setShowTheaterModal] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);

  const activeReel = FEATURED_REELS[selectedReelIndex] || FEATURED_REELS[0];

  const handleToggleSound = () => {
    triggerHaptic('medium');
    setIsMuted(prev => !prev);
    // Refresh iframe with new muted state
    setIframeKey(prev => prev + 1);
  };

  const handleSelectReel = (index: number) => {
    triggerHaptic('light');
    setSelectedReelIndex(index);
    setIframeKey(prev => prev + 1);
  };

  const vimeoEmbedUrl = `https://player.vimeo.com/video/${activeReel.vimeoId}?autoplay=1&loop=1&muted=${isMuted ? '1' : '0'}&background=1&autopause=0&playsinline=1&title=0&byline=0&portrait=0&badge=0&controls=0&dnt=1`;
  const vimeoInteractiveUrl = `https://player.vimeo.com/video/${activeReel.vimeoId}?autoplay=1&loop=1&muted=0&playsinline=1&title=1&byline=1&portrait=1`;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.85)] border border-white/20 dark:border-white/10 group font-sans bg-[#140802] text-white">
      
      {/* 1. CINEMATIC VIDEO BACKGROUND ENGINE */}
      <div className="relative w-full h-[520px] sm:h-[620px] lg:h-[680px] overflow-hidden">
        
        {/* Background Poster Fallback with High-Quality Contrast */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105"
          style={{ backgroundImage: `url(${activeReel.posterImage})` }}
        />

        {/* Vimeo Autoplay Iframe Layer */}
        {isPlaying && (
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden flex items-center justify-center">
            <iframe
              key={`vimeo-${activeReel.id}-${iframeKey}`}
              src={vimeoEmbedUrl}
              className="w-[125vw] sm:w-[115vw] lg:w-[110vw] h-[125vh] sm:h-[115vh] lg:h-[110vh] min-w-[100%] min-h-[100%] object-cover pointer-events-none scale-110 sm:scale-105"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={activeReel.title}
            />
          </div>
        )}

        {/* Cinematic Multi-Stage Gradient Overlay Masks (ESPN Broadcast Finish) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#140802] via-[#140802]/60 to-[#140802]/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#140802]/90 via-[#140802]/40 to-transparent pointer-events-none" />
        
        {/* Top Radial Stadium Spotlight */}
        <div className="absolute top-0 left-1/3 w-[600px] h-[300px] bg-[#FF6A00]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/4 right-10 w-[400px] h-[300px] bg-[#00B8D4]/15 rounded-full blur-[140px] pointer-events-none" />

        {/* Subtle Scanline Overlay for Broadcast Studio Feel */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* 2. TOP ESPN BROADCAST STATUS HEADER */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-8 right-4 sm:right-8 z-20 flex items-center justify-between gap-3 pointer-events-auto">
          
          {/* Live Network Pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-xl border border-white/20 flex items-center gap-2 shadow-lg">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6A00] opacity-80"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF6A00] shadow-[0_0_10px_rgba(255,106,0,0.9)]"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-black tracking-widest text-white uppercase font-mono">
                JUST1PLAY 4K NETWORK
              </span>
            </div>

            <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FFC857] text-[10px] font-mono font-bold uppercase tracking-wider items-center gap-1 shadow-[0_0_15px_rgba(255,106,0,0.3)]">
              <Tv className="w-3 h-3 text-[#FFC857]" />
              <span>{activeReel.badge}</span>
            </span>

            <span className="hidden md:inline-flex px-2.5 py-1 rounded-full bg-[#00B8D4]/15 border border-[#00B8D4]/40 text-[#00B8D4] text-[10px] font-mono font-bold uppercase">
              UHD 60FPS • DOLBY
            </span>
          </div>

          {/* Floating Media Controls Pill */}
          <div className="flex items-center gap-2">
            {/* Audio Toggle with Visualizer Bars */}
            <button
              onClick={handleToggleSound}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full backdrop-blur-xl border transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                !isMuted 
                  ? 'bg-[#FF6A00] text-white border-[#FFC857] shadow-[0_0_20px_rgba(255,106,0,0.6)]' 
                  : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80 hover:border-white/40'
              }`}
              title={isMuted ? "Unmute Broadcast Audio" : "Mute Broadcast Audio"}
            >
              {!isMuted ? (
                <>
                  <Volume2 className="w-4 h-4 text-white animate-pulse" />
                  <span className="text-[11px] font-mono font-black uppercase tracking-wider hidden sm:inline">SOUND ON</span>
                  {/* Live Soundwave graphic */}
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 h-full bg-white animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-0.5 h-2/3 bg-white animate-bounce" style={{ animationDelay: '0.3s' }} />
                    <span className="w-0.5 h-4/5 bg-white animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-300" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider hidden sm:inline">TAP FOR SOUND</span>
                </>
              )}
            </button>

            {/* Play / Pause */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsPlaying(prev => !prev);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 hover:border-white/40 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
              title={isPlaying ? "Pause Background Video" : "Play Background Video"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            {/* Fullscreen Theater Mode */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                setShowTheaterModal(true);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 hover:border-[#00B8D4] text-[#00B8D4] flex items-center justify-center transition-all cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(0,184,212,0.4)]"
              title="Open Cinema Theater"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. HERO CONTENT & PRIMETIME HEADLINE */}
        <div className="absolute bottom-16 sm:bottom-20 left-4 sm:left-8 right-4 sm:right-8 z-20 space-y-4 sm:space-y-6 pointer-events-auto">
          
          <div className="max-w-3xl space-y-3">
            {/* Sport & Rating Tag */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white text-[11px] font-mono font-black uppercase tracking-wider shadow-[0_0_15px_rgba(255,106,0,0.5)] border border-[#FFC857]/40">
                {activeReel.sport}
              </span>
              <span className="px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-[#00B8D4] text-[11px] font-mono font-bold uppercase flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-[#00B8D4] text-[#00B8D4]" />
                <span>{activeReel.rating}</span>
              </span>
              <span className="px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-slate-300 text-[11px] font-mono">
                {activeReel.views} Verified Plays
              </span>
            </div>

            {/* Massive Hero Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tight text-white leading-[0.95] drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)]">
              {activeReel.title}
            </h1>

            {/* Subtitle & Measurables */}
            <p className="text-xs sm:text-sm lg:text-base text-slate-200 font-normal leading-relaxed max-w-2xl drop-shadow-md">
              {activeReel.subtitle}
            </p>

            {/* Live Combine Measurables Lower-Third Banner */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-xl border border-[#FF6A00]/40 text-xs font-mono text-white shadow-lg">
              <Activity className="w-4 h-4 text-[#FF6A00] shrink-0" />
              <span className="text-slate-400 font-bold">VERIFIED METRICS:</span>
              <span className="text-[#FFC857] font-bold">{activeReel.measurables}</span>
            </div>
          </div>

          {/* CTA Button Cluster */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                triggerHaptic('medium');
                onNavigateTab('athletes');
              }}
              className="px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all transform active:scale-95 flex items-center gap-2.5 cursor-pointer shadow-[0_0_30px_rgba(255,106,0,0.6)] border border-[#FFC857]/50"
            >
              <Zap className="w-4 h-4 text-white fill-white" />
              <span>Launch Recruiter Matrix</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                triggerHaptic('medium');
                setShowTheaterModal(true);
              }}
              className="px-5 sm:px-6 py-3.5 rounded-2xl bg-black/60 hover:bg-white/15 border border-white/25 hover:border-[#00B8D4] text-white font-bold text-xs sm:text-sm uppercase tracking-wider backdrop-blur-xl transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(0,184,212,0.4)]"
            >
              <Play className="w-4 h-4 text-[#00B8D4] fill-[#00B8D4]" />
              <span>Watch in HD Cinema</span>
            </button>

            {onOpenBookingModal && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenBookingModal();
                }}
                className="hidden sm:inline-flex px-5 py-3.5 rounded-2xl bg-black/60 hover:bg-white/15 border border-white/20 text-[#FFC857] hover:border-[#FFC857] font-bold text-xs uppercase tracking-wider backdrop-blur-xl transition-all cursor-pointer shadow-md"
              >
                <Camera className="w-4 h-4" />
                <span>Book 4K Reel Creator</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. BOTTOM SPORTS CHYRON / NEWS TICKER (ESPN STADIUM LOOK) */}
        <div className="absolute bottom-0 inset-x-0 z-20 bg-black/85 backdrop-blur-xl border-t border-white/15 py-2.5 px-4 sm:px-8 flex items-center justify-between gap-4 overflow-hidden pointer-events-auto">
          
          <div className="flex items-center gap-3 shrink-0">
            <span className="px-2.5 py-0.5 rounded bg-[#FF6A00] text-black font-mono font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Flame className="w-3 h-3 fill-black text-black" />
              <span>SCOUT TICKER</span>
            </span>
          </div>

          {/* Marquee Ticker Highlights */}
          <div className="flex items-center gap-8 text-xs font-mono text-slate-300 overflow-x-auto scrollbar-none whitespace-nowrap">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00B8D4]" />
              <span>D1 Radar: <strong className="text-white">450+ College Programs</strong> scouting Tri-State players</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
              <span>Top 40-Yd Dash: <strong className="text-[#FFC857]">4.38s (M. Rivera - Bergen Prep)</strong></span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Offers Generated: <strong className="text-emerald-400">88 D1 Full-Rides</strong> in 2026</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>AAU EYBL: <strong className="text-white">NJ Scholars vs PSA Cardinals Finals Tonight</strong></span>
            </span>
          </div>

          <button
            onClick={() => onNavigateTab('events')}
            className="hidden md:flex items-center gap-1 text-[11px] font-mono font-bold text-[#00B8D4] hover:text-[#00E5FF] uppercase transition-colors shrink-0 cursor-pointer"
          >
            <span>Live Brackets</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

      </div>

      {/* 5. MULTI-REEL PLAYLIST STRIP (FAST SWITCHER TABS) */}
      <div className="p-3 sm:p-4 bg-[#1A0B03] border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {FEATURED_REELS.map((reel, idx) => {
          const isSelected = idx === selectedReelIndex;
          return (
            <button
              key={reel.id}
              onClick={() => handleSelectReel(idx)}
              className={`p-2.5 sm:p-3 rounded-2xl text-left transition-all relative overflow-hidden flex items-start gap-3 cursor-pointer group ${
                isSelected 
                  ? 'bg-white/15 border-2 border-[#FF6A00] shadow-[0_0_20px_rgba(255,106,0,0.35)]' 
                  : 'bg-black/40 hover:bg-white/10 border border-white/10 hover:border-white/20'
              }`}
            >
              {/* Reel Thumbnail */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border border-white/15">
                <img 
                  src={reel.posterImage} 
                  alt={reel.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play className={`w-4 h-4 ${isSelected ? 'text-[#FF6A00] fill-[#FF6A00]' : 'text-white'}`} />
                </div>
              </div>

              {/* Reel Info */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isSelected ? 'text-[#FF6A00]' : 'text-slate-400'}`}>
                    {reel.sport}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-ping" />
                  )}
                </div>
                <h4 className="text-xs font-bold text-white truncate font-sans">
                  {reel.title}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {reel.featuredAthlete}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 6. FULL-SCREEN CINEMA THEATER MODAL (EXPANDED WATCH MODE) */}
      <AnimatePresence>
        {showTheaterModal && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-6 animate-fadeIn">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-6xl rounded-3xl overflow-hidden bg-[#1E282D] border border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col max-h-[95vh]"
            >
              {/* Modal Top Bar */}
              <div className="p-4 sm:p-5 bg-black/60 border-b border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] flex items-center justify-center shadow-md">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-tight">
                      {activeReel.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      4K Broadcast Cinema Player • {activeReel.sport} • {activeReel.views} Views
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowTheaterModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-all cursor-pointer border border-white/15"
                >
                  Close Theater [ESC]
                </button>
              </div>

              {/* Vimeo Cinema Embed */}
              <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                <iframe
                  src={vimeoInteractiveUrl}
                  className="w-full h-full object-cover"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={activeReel.title}
                />
              </div>

              {/* Modal Bottom Controls & Quick Links */}
              <div className="p-4 sm:p-6 bg-black/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-mono text-[#FF6A00] font-bold uppercase">
                    FEATURED RECRUIT PROFILE
                  </p>
                  <p className="text-sm font-bold text-white">
                    {activeReel.featuredAthlete} • {activeReel.measurables}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowTheaterModal(false);
                      onNavigateTab('athletes');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(255,106,0,0.5)] cursor-pointer"
                  >
                    View Recruit Sheet
                  </button>
                  <button
                    onClick={() => {
                      setShowTheaterModal(false);
                      onOpenBookingModal?.();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold cursor-pointer"
                  >
                    Book 4K Media Shoot
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default HighImpactVideoHero;
