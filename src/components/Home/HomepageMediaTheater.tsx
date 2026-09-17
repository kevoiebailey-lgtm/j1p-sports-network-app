import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Radio, 
  Sparkles, 
  Zap, 
  Flame, 
  Share2, 
  Eye, 
  Heart, 
  Film, 
  ChevronRight, 
  Layers,
  Activity,
  Award
} from 'lucide-react';
import { NativeSportsVideoPlayer } from '../Common/NativeSportsVideoPlayer';
import { VerifiedBadge } from '../Common/VerifiedBadge';

interface VideoChannelItem {
  id: string;
  title: string;
  athleteName: string;
  athleteRole: string;
  sport: string;
  duration: string;
  views: string;
  likes: number;
  streamUrl: string;
  posterUrl: string;
  badge: string;
  isLive?: boolean;
}

const PRIMETIME_CHANNELS: VideoChannelItem[] = [
  {
    id: 'ch-1',
    title: '45-Yard Laser TD Pass into Triple Coverage 🎯',
    athleteName: 'Kevoie Bailey',
    athleteRole: '4-Star Dual-Threat QB • Class of 2027',
    sport: 'Football',
    duration: '0:42',
    views: '48.2K',
    likes: 4210,
    streamUrl: 'https://assets.mixkit.co/videos/preview/mixkit-american-football-player-running-with-the-ball-41549-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1200&q=80',
    badge: 'PLAY OF THE WEEK',
    isLive: false
  },
  {
    id: 'ch-2',
    title: 'Tri-State Championship Semifinals 4K Stream 🏀',
    athleteName: 'Jayden Carter & NJ Scholars',
    athleteRole: 'EYBL Circuit Select • 17U Primetime',
    sport: 'Basketball',
    duration: 'LIVE',
    views: '3.4K LIVE',
    likes: 8930,
    streamUrl: 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-40866-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
    badge: '4K BROADCAST • LIVE',
    isLive: true
  },
  {
    id: 'ch-3',
    title: 'Pick-6 & 65-Yard Touchdown Dash 🔥',
    athleteName: 'Maya Sanchez',
    athleteRole: '2x All-State QB / DB • Class of 2025',
    sport: "Girls' Flag Football",
    duration: '0:35',
    views: '32.1K',
    likes: 3180,
    streamUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-playing-soccer-on-a-field-42939-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    badge: 'VIRAL HIGHLIGHT',
    isLive: false
  },
  {
    id: 'ch-4',
    title: 'Top Corner 92mph Step-Down Missile 🥍',
    athleteName: 'Marcus Vance',
    athleteRole: 'All-American Attack • Delbarton',
    sport: 'Lacrosse',
    duration: '0:29',
    views: '19.4K',
    likes: 1940,
    streamUrl: 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-4043-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
    badge: 'SCOUT CERTIFIED',
    isLive: false
  }
];

interface HomepageMediaTheaterProps {
  onNavigateTab: (tab: any) => void;
  onOpenVideoModal?: (video: any) => void;
}

export const HomepageMediaTheater: React.FC<HomepageMediaTheaterProps> = ({
  onNavigateTab,
  onOpenVideoModal
}) => {
  const [selectedChannel, setSelectedChannel] = useState<VideoChannelItem>(PRIMETIME_CHANNELS[0]);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSelectChannel = (channel: VideoChannelItem) => {
    setSelectedChannel(channel);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(e => console.log('Autoplay handled:', e));
    }
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section id="homepage-media-theater" className="relative space-y-4 pt-2">
      
      {/* HEADER WITH BROADCAST STADIUM BRANDING */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
              <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
              <span>Broadcast Media Center</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
              • Direct 4K In-Feed Player
            </span>
          </div>

          <h2 className="text-xl sm:text-3xl font-black italic uppercase tracking-tight text-[#263238] dark:text-white flex items-center gap-2">
            <span>Live Action & Video Spotlight</span>
            <span className="text-[#FF6A00]">.</span>
          </h2>
        </div>

        <button
          onClick={() => onNavigateTab('media')}
          className="px-3.5 py-1.5 rounded-xl clear-glass hover:border-[#FF6A00] text-[#263238] dark:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:glow-orange self-start sm:self-auto"
          id="open-media-hub-btn"
        >
          <span>Explore All 400+ Clips</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#FF6A00]" />
        </button>
      </div>

      {/* THEATER MAIN GRID: LEFT = DIRECT INLINE VIDEO PLAYER, RIGHT = QUICK SWITCH CHANNELS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* LEFT 68% (lg:col-span-8): DIRECT IN-FEED CINEMA PLAYER */}
        <div className="lg:col-span-8 frosted-glass border border-white/20 dark:border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between relative group">
          
          {/* VIDEO CANVAS CONTAINER */}
          <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              src={selectedChannel.streamUrl}
              poster={selectedChannel.posterUrl}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* BROADCAST CORNER OVERLAYS */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-black/75 backdrop-blur-md text-white border border-white/30 flex items-center gap-1.5 shadow-lg">
                  {selectedChannel.isLive ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="text-red-400">4K LIVE</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-[#FF6A00]" />
                      <span>{selectedChannel.badge}</span>
                    </>
                  )}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-[#00B8D4]/30 text-white backdrop-blur-md border border-[#00B8D4]/40">
                  {selectedChannel.sport}
                </span>
              </div>

              {/* Viewers counter */}
              <div className="px-3 py-1 rounded-full text-[10px] font-mono font-bold text-white bg-black/70 backdrop-blur-md border border-white/20 flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-[#00B8D4]" />
                <span>{selectedChannel.views}</span>
              </div>
            </div>

            {/* CUSTOM VIDEO CONTROLS OVERLAY */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" />

            {/* INTERACTIVE PLAY/PAUSE & SOUND BUTTONS */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF6A00] to-[#E05D00] text-white flex items-center justify-center shadow-[0_0_18px_rgba(255,106,0,0.6)] border border-[#FFC857]/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="px-3 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-mono font-bold flex items-center gap-1.5 border border-white/20 hover:border-[#00B8D4] transition-all cursor-pointer"
                  title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="w-4 h-4 text-rose-400" />
                      <span>UNMUTE</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      <span>SOUND ON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => toggleLike(selectedChannel.id, e)}
                  className={`p-2.5 rounded-xl backdrop-blur-md border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    likedMap[selectedChannel.id]
                      ? 'bg-rose-500/30 text-rose-400 border-rose-400/50'
                      : 'bg-black/60 text-white border-white/20 hover:border-rose-400'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${likedMap[selectedChannel.id] ? 'fill-rose-400' : ''}`} />
                  <span>{selectedChannel.likes + (likedMap[selectedChannel.id] ? 1 : 0)}</span>
                </button>

                <button
                  onClick={() => onNavigateTab('athletes')}
                  className="px-3 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-[#00B8D4] text-xs font-mono font-bold border border-white/20 hover:border-[#00B8D4] transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Scout Matrix</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* LOWER META INFO BAR */}
          <div className="p-4 sm:p-5 bg-white/5 dark:bg-[#1E282D]/90 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black italic uppercase text-[#263238] dark:text-white leading-snug">
                {selectedChannel.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-mono flex items-center gap-1.5">
                <span className="text-[#00B8D4] font-bold">{selectedChannel.athleteName}</span>
                <span>•</span>
                <span>{selectedChannel.athleteRole}</span>
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('media')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white text-xs font-mono font-black uppercase tracking-wider hover:from-[#E05D00] hover:to-[#FF6A00] transition-all shadow-[0_0_15px_rgba(255,106,0,0.4)] border border-[#FFC857]/40 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              Watch in Dedicated Media Hub &rarr;
            </button>
          </div>

        </div>

        {/* RIGHT 32% (lg:col-span-4): QUICK-SWITCH CHANNELS PLAYLIST */}
        <div className="lg:col-span-4 frosted-glass border border-white/20 dark:border-white/15 rounded-3xl p-4 flex flex-col justify-between space-y-3 shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/15 dark:border-white/10 pb-2.5">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-[#00B8D4] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00B8D4]" />
                <span>Featured Broadcast Queue</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">4 Channels</span>
            </div>

            {/* CHANNEL LIST */}
            <div className="space-y-2.5">
              {PRIMETIME_CHANNELS.map((ch) => {
                const isActive = selectedChannel.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectChannel(ch)}
                    className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border ${
                      isActive
                        ? 'bg-gradient-to-r from-[#FF6A00]/20 to-[#00B8D4]/15 border-[#FF6A00] shadow-[0_0_20px_rgba(255,106,0,0.25)]'
                        : 'clear-glass hover:bg-white/10 dark:hover:bg-white/5 border-white/15 dark:border-white/10 hover:border-[#00B8D4]/40'
                    }`}
                  >
                    {/* THUMBNAIL WITH PLAY ICON */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-white/20">
                      <img
                        src={ch.posterUrl}
                        alt={ch.title}
                        className="w-full h-full object-cover"
                      />
                      <div className={`absolute inset-0 flex items-center justify-center ${isActive ? 'bg-[#FF6A00]/60' : 'bg-black/40'}`}>
                        {isActive ? (
                          <Activity className="w-5 h-5 text-white animate-pulse" />
                        ) : (
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* CHANNEL INFO */}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                          {ch.sport}
                        </span>
                        {ch.isLive && (
                          <span className="text-[9px] font-mono font-black uppercase text-red-400 animate-pulse">
                            LIVE
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-[#263238] dark:text-white line-clamp-1 leading-snug">
                        {ch.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        {ch.athleteName}
                      </p>
                    </div>

                    {/* DURATION / ARROW */}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono font-bold text-[#00B8D4]">
                        {ch.duration}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* UPLOAD REEL CTA */}
          <div className="pt-2">
            <button
              onClick={() => onNavigateTab('social')}
              className="w-full py-2.5 rounded-xl clear-glass hover:bg-white/15 dark:hover:bg-white/10 text-[#263238] dark:text-white text-xs font-mono font-bold flex items-center justify-center gap-2 border border-dashed border-white/30 hover:border-[#00B8D4] transition-all cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-[#FF6A00]" />
              <span>Submit Athlete Reel / Clip &rarr;</span>
            </button>
          </div>

        </div>

      </div>

    </section>
  );
};
