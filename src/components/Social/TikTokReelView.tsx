import React, { useState, useRef } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Trophy, 
  User, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  CheckCircle2,
  Sparkles,
  Flame,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_THUMBNAIL_URL } from '../../lib/constants';
import { VideoProgressBar } from './VideoProgressBar';

export interface ReelVideoItem {
  id: string;
  athleteName: string;
  teamName: string;
  avatarUrl: string;
  videoUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  eventName: string;
  statsSnippet: string;
  isVerified?: boolean;
}

const SAMPLE_REELS: ReelVideoItem[] = [
  {
    id: 'reel-1',
    athleteName: 'Maya "Thunder" Vance',
    teamName: 'East Coast Flag Academy',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-4043-large.mp4',
    caption: '4th Quarter Game Winning 40-Yard Touchdown Bomb! 🏈🔥 Undefeated season continues!',
    likesCount: 1420,
    commentsCount: 184,
    sharesCount: 92,
    eventName: 'Tri-State Flag Championship 2026',
    statsSnippet: '4 Pass TDs | 310 Pass Yds',
    isVerified: true,
  },
  {
    id: 'reel-2',
    athleteName: 'Marcus Carter',
    teamName: 'Newark Ballers',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-basketball-players-in-a-game-4042-large.mp4',
    caption: 'Vertical jump combine breakdown! Dunking from the free throw line in 4K high definition 🏀⚡️',
    likesCount: 2890,
    commentsCount: 312,
    sharesCount: 180,
    eventName: 'Summer Showcase Combine',
    statsSnippet: '41" Vertical | 28 PTS',
    isVerified: true,
  },
  {
    id: 'reel-3',
    athleteName: 'Jordan Lee',
    teamName: 'Lady Spartans Cheer',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-a-young-woman-doing-gymnastics-41315-large.mp4',
    caption: 'Perfect score routine at Nationals! Double full twist landing 📣✨',
    likesCount: 980,
    commentsCount: 88,
    sharesCount: 45,
    eventName: 'National Cheer Showcase',
    statsSnippet: '98.5 Score | 1st Place',
    isVerified: false,
  }
];

export interface TikTokReelViewProps {
  onOpenProfile?: (athleteName: string) => void;
  onOpenComments?: (reelId: string) => void;
}

export const TikTokReelView: React.FC<TikTokReelViewProps> = ({
  onOpenProfile,
  onOpenComments
}) => {
  const [reels, setReels] = useState<ReelVideoItem[]>(SAMPLE_REELS);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [playingId, setPlayingId] = useState<string>(SAMPLE_REELS[0].id);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [reelProgress, setReelProgress] = useState<Record<string, { current: number; duration: number }>>({});

  const handleTimeUpdate = (id: string) => {
    const el = videoRefs.current[id];
    if (el && el.duration) {
      setReelProgress(prev => ({
        ...prev,
        [id]: { current: el.currentTime, duration: el.duration }
      }));
    }
  };

  const togglePlay = (id: string) => {
    const videoEl = videoRefs.current[id];
    if (!videoEl) return;

    if (videoEl.paused) {
      videoEl.play();
      setPlayingId(id);
    } else {
      videoEl.pause();
      setPlayingId('');
    }
  };

  const toggleLike = (id: string) => {
    setLikedMap(prev => {
      const isLiked = !prev[id];
      setReels(reelsList =>
        reelsList.map(r =>
          r.id === id ? { ...r, likesCount: r.likesCount + (isLiked ? 1 : -1) } : r
        )
      );
      return { ...prev, [id]: isLiked };
    });
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center mb-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/10 border border-red-600/30 text-red-500 text-[10px] font-bold uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5 fill-red-500" />
          <span>Vertical Snap-Scroll Reel (Highlights Mode)</span>
        </div>
      </div>

      {/* Snap Scroll Reel Container */}
      <div className="h-[75vh] max-h-[700px] w-full overflow-y-scroll snap-y snap-mandatory rounded-3xl border border-slate-800 bg-[#212A31] shadow-2xl scrollbar-none relative">
        {reels.map((reel) => {
          const isLiked = !!likedMap[reel.id];
          const isBookmarked = !!bookmarkedMap[reel.id];
          const isPlaying = playingId === reel.id;

          return (
            <div
              key={reel.id}
              className="h-full w-full snap-start relative flex items-center justify-center bg-[#212A31] overflow-hidden"
            >
              {/* Video Element */}
              <video
                ref={(el) => { videoRefs.current[reel.id] = el; }}
                src={reel.videoUrl}
                poster={DEFAULT_THUMBNAIL_URL}
                loop
                muted={isMuted}
                playsInline
                autoPlay={reel.id === SAMPLE_REELS[0].id}
                onClick={() => togglePlay(reel.id)}
                onTimeUpdate={() => handleTimeUpdate(reel.id)}
                onError={(e) => {
                  console.warn('⚠️ Reel video failed to load, falling back to sports highlight:', reel.videoUrl);
                  const v = e.currentTarget as HTMLVideoElement;
                  if (!v.dataset.hasFallback) {
                    v.dataset.hasFallback = 'true';
                    v.src = 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-40866-large.mp4';
                    v.play().catch(() => {});
                  }
                }}
                className="w-full h-full object-cover cursor-pointer"
              />

              {/* Dark Gradient Overlays for Text Legibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#212A31]/40 via-transparent to-[#212A31]/90 pointer-events-none" />

              {/* Play / Pause Center Indicator Indicator */}
              {!isPlaying && (
                <div 
                  onClick={() => togglePlay(reel.id)}
                  className="absolute inset-0 flex items-center justify-center bg-[#212A31]/20 backdrop-blur-[2px] cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-red-600/90 text-slate-950 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.8)]">
                    <Play className="w-8 h-8 fill-slate-950 translate-x-0.5" />
                  </div>
                </div>
              )}

              {/* Top Mute Control */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-[#212A31]/60 border border-slate-800 backdrop-blur-md flex items-center justify-center text-slate-200 hover:text-white"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-red-500" />}
              </button>

              {/* RIGHT SIDE FLOATING ACTION OVERLAYS */}
              <div className="absolute right-3 bottom-16 z-20 flex flex-col items-center gap-5">
                
                {/* Profile Avatar Icon */}
                <button
                  onClick={() => onOpenProfile && onOpenProfile(reel.athleteName)}
                  className="relative group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-red-500 to-red-600 shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                    <img
                      src={reel.avatarUrl}
                      alt={reel.athleteName}
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                    +
                  </div>
                </button>

                {/* Like Heart */}
                <button
                  onClick={() => toggleLike(reel.id)}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                    isLiked 
                      ? 'bg-rose-500/20 border border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-110' 
                      : 'bg-[#212A31]/70 border border-slate-800 text-slate-200 hover:text-rose-400'
                  }`}>
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500' : ''}`} />
                  </div>
                  <span className="text-[10px] font-extrabold text-white">
                    {reel.likesCount.toLocaleString()}
                  </span>
                </button>

                {/* Comment Speech Bubble */}
                <button
                  onClick={() => onOpenComments && onOpenComments(reel.id)}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full bg-[#212A31]/70 border border-slate-800 backdrop-blur-md flex items-center justify-center text-slate-200 hover:text-red-500 transition-colors">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-white">
                    {reel.commentsCount}
                  </span>
                </button>

                {/* Bookmark */}
                <button
                  onClick={() => toggleBookmark(reel.id)}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
                    isBookmarked ? 'bg-red-600/20 border border-red-500 text-red-500' : 'bg-[#212A31]/70 border border-slate-800 text-slate-200'
                  }`}>
                    <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-red-500' : ''}`} />
                  </div>
                </button>

                {/* Share Icon */}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: reel.athleteName, text: reel.caption, url: window.location.href });
                    } else {
                      alert('Share link copied to clipboard!');
                    }
                  }}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full bg-[#212A31]/70 border border-slate-800 backdrop-blur-md flex items-center justify-center text-slate-200 hover:text-red-500 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-white">
                    {reel.sharesCount}
                  </span>
                </button>

              </div>

              {/* BOTTOM LEFT OVERLAY DETAILS & EVENT TAG BADGE */}
              <div className="absolute left-4 bottom-5 right-16 z-20 space-y-2">
                
                {/* Event Tag Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/20 border border-red-600/40 text-red-400 text-[10px] font-bold tracking-wider backdrop-blur-md">
                  <Trophy className="w-3 h-3 text-red-500" />
                  <span className="truncate max-w-[200px]">{reel.eventName}</span>
                </div>

                {/* Athlete Name & Verification */}
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white flex items-center gap-1">
                    {reel.athleteName}
                    {reel.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-red-500 fill-red-500" />}
                  </h3>
                  <span className="text-[10px] text-slate-300 font-medium">@{reel.teamName}</span>
                </div>

                {/* Stats Snippet Pill */}
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#212A31]/90 border border-slate-700/80 text-[10px] font-black text-red-500 tracking-wide">
                  ⚡️ {reel.statsSnippet}
                </div>

                {/* Caption */}
                <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-relaxed">
                  {reel.caption}
                </p>

              </div>

              {/* Bottom Edge Custom Video Progress Bar */}
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="absolute bottom-0 left-0 right-0 z-30 px-3 pb-1 pt-2 bg-gradient-to-t from-black/80 to-transparent"
              >
                <VideoProgressBar
                  videoRef={{ current: videoRefs.current[reel.id] }}
                  currentTime={reelProgress[reel.id]?.current || 0}
                  duration={reelProgress[reel.id]?.duration || 0}
                  showTimeDisplay={false}
                  compact={true}
                />
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TikTokReelView;
