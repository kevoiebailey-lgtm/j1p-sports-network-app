import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  Zap, 
  MessageSquare, 
  Share2, 
  UserPlus, 
  Check, 
  Trophy, 
  Camera, 
  Video, 
  Play, 
  Maximize2, 
  Crosshair, 
  Sparkles,
  ExternalLink,
  Loader2,
  Filter,
  CheckCircle2,
  Film
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  LockerPost, 
  ReactionType, 
  EXPANDED_SPORT_CATEGORIES, 
  FeedFilterType, 
  SportCategory 
} from './types';
import { parseVideoUrl, getVideoProviderBadge, getVideoProviderName } from '../../lib/videoParser';
import { LockerCommentsDrawer } from './LockerCommentsDrawer';
import { VideoTheaterModal } from './VideoTheaterModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface LockerFeedProps {
  posts: LockerPost[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  observerTargetRef?: ((node: HTMLElement | null) => void) | React.RefObject<HTMLDivElement>;
  onReact: (postId: string, type: ReactionType) => void;
  onAddToWatchlist?: (athleteId: string, athleteName: string) => void;
  watchlistedAthletes?: Set<string>;
  onRequireAuth: (actionDescription?: string) => void;
  selectedSportCategory?: SportCategory;
  onSelectSportCategory?: (sport: SportCategory) => void;
}

const FORMAT_FILTERS: { id: FeedFilterType; label: string; icon: string }[] = [
  { id: 'all', label: 'All Hype', icon: '🔥' },
  { id: 'reels', label: '9:16 Reels', icon: '⚡' },
  { id: 'photos', label: 'Photos', icon: '📸' },
  { id: 'highlights', label: 'Game Highlights', icon: '🏆' },
];

export const LockerFeed: React.FC<LockerFeedProps> = ({
  posts,
  loading = false,
  loadingMore = false,
  hasMore = false,
  observerTargetRef,
  onReact,
  onAddToWatchlist,
  watchlistedAthletes = new Set(),
  onRequireAuth,
  selectedSportCategory = 'All',
  onSelectSportCategory
}) => {
  const { user, profile, role } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Active filter state
  const [activeFormatFilter, setActiveFormatFilter] = useState<FeedFilterType>('all');
  const [selectedSport, setSelectedSport] = useState<SportCategory>(selectedSportCategory);

  // Active interaction modals
  const [activeCommentPost, setActiveCommentPost] = useState<LockerPost | null>(null);
  const [activeTheaterPost, setActiveTheaterPost] = useState<LockerPost | null>(null);

  // Double-tap heart/hype animations map: postId -> timestamp
  const [hypeBurstMap, setHypeBurstMap] = useState<Record<string, number>>({});
  const lastTapRef = useRef<Record<string, number>>({});

  const handleSportChange = (sport: SportCategory) => {
    setSelectedSport(sport);
    if (onSelectSportCategory) {
      onSelectSportCategory(sport);
    }
  };

  // Filter posts based on format filter & sport
  const filteredPosts = posts.filter((post) => {
    const parsedVideo = post.videoUrl ? parseVideoUrl(post.videoUrl) : null;
    const isVertical = Boolean(parsedVideo?.isVertical);
    const hasVideo = Boolean(post.videoUrl && post.videoUrl.trim().length > 0);
    const hasPhoto = Boolean(post.imageUrl && post.imageUrl.trim().length > 0) && !hasVideo;

    // 1. Format Filter
    if (activeFormatFilter === 'reels') {
      if (!isVertical && post.feedType !== 'video') return false;
    } else if (activeFormatFilter === 'photos') {
      if (!hasPhoto && !post.imageUrl) return false;
    } else if (activeFormatFilter === 'highlights') {
      if (!hasVideo && post.feedType !== 'video') return false;
    }

    // 2. Sport Filter
    if (selectedSport !== 'All') {
      const cleanFilter = selectedSport.replace(/^[^\w\s&]+/, '').trim().toLowerCase();
      const postSport = (post.sport || '').toLowerCase();
      if (!postSport.includes(cleanFilter) && !cleanFilter.includes(postSport)) {
        return false;
      }
    }

    return true;
  });

  // Double-tap media handler for instant hype reaction burst
  const handleMediaTap = (postId: string) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[postId] || 0;
    
    if (now - lastTap < 350) {
      // Double tap detected!
      triggerHypeBurst(postId);
      lastTapRef.current[postId] = 0;
    } else {
      lastTapRef.current[postId] = now;
    }
  };

  const triggerHypeBurst = (postId: string) => {
    if (!user) {
      onRequireAuth('double-tap to hype plays');
      return;
    }
    setHypeBurstMap((prev) => ({ ...prev, [postId]: Date.now() }));
    onReact(postId, 'hype');
  };

  const handleShare = (post: LockerPost) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(post.videoUrl || post.imageUrl || window.location.href);
      showToast('success', 'Link Copied', 'Locker Room highlight link copied to clipboard!');
    }
  };

  const isScoutOrDirector = ['scout', 'coach', 'director', 'tournament_director', 'admin', 'organization'].includes(
    (role as string) || (profile?.role as string) || ''
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      
      {/* 1. Sticky Top Filter Bar (Obsidian Frosted Glass) */}
      <div className="sticky top-16 z-30 bg-[#090D16]/95 backdrop-blur-xl border border-[#24324F] rounded-2xl p-2 sm:p-2.5 shadow-xl space-y-2">
        
        {/* Format Selector Pills (🔥 All Hype, ⚡ 9:16 Reels, 📸 Photos, 🏆 Game Highlights) */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
          {FORMAT_FILTERS.map((filter) => {
            const isSelected = activeFormatFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFormatFilter(filter.id)}
                className={`min-h-[44px] px-1.5 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider font-mono flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#FF6A00] to-[#00B8D4] text-white shadow-[0_0_15px_rgba(0,184,212,0.4)] scale-[1.02]'
                    : 'bg-[#263238]/60 hover:bg-[#263238] text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                <span>{filter.icon}</span>
                <span className="truncate">{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Expanded Multi-Sport Tag Selector (Horizontal Scrollable Pill List) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar snap-x">
          <button
            onClick={() => handleSportChange('All')}
            className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-black uppercase font-mono whitespace-nowrap transition-all cursor-pointer snap-start border ${
              selectedSport === 'All'
                ? 'bg-[#00B8D4] text-[#090D16] border-[#00B8D4] shadow-[0_0_10px_rgba(0,184,212,0.3)] font-black'
                : 'bg-[#263238] border-[#24324F] hover:border-slate-500 text-slate-400 hover:text-white'
            }`}
          >
            All Sports
          </button>
          {EXPANDED_SPORT_CATEGORIES.map((sport) => {
            const isSelected = selectedSport === sport;
            return (
              <button
                key={sport}
                onClick={() => handleSportChange(sport)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer snap-start border ${
                  isSelected
                    ? 'bg-[#00B8D4] text-[#090D16] border-[#00B8D4] shadow-[0_0_10px_rgba(0,184,212,0.3)] font-black'
                    : 'bg-[#263238] border-[#24324F] hover:border-slate-500 text-slate-300 hover:text-white'
                }`}
              >
                {sport}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Feed Posts Stream */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-[#263238] border border-[#24324F] rounded-3xl p-8 space-y-3">
            <Trophy className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-200">No posts matching filter</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Drop the first highlight reel, photo, or post in {selectedSport}!
            </p>
            <button
              onClick={() => {
                setActiveFormatFilter('all');
                handleSportChange('All');
              }}
              className="mt-2 px-4 py-2 bg-[#00B8D4]/20 hover:bg-[#00B8D4] text-[#00B8D4] hover:text-[#090D16] border border-[#00B8D4]/40 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const parsedVideo = post.videoUrl ? parseVideoUrl(post.videoUrl) : null;
            const isVertical = Boolean(parsedVideo?.isVertical);
            const providerBadge = parsedVideo ? getVideoProviderBadge(parsedVideo.provider) : null;
            const isWatchlisted = watchlistedAthletes.has(post.authorId);
            const userReaction = user && post.userReactions ? post.userReactions[user.uid] : undefined;
            const burstTimestamp = hypeBurstMap[post.id];

            return (
              <article 
                key={post.id}
                className="w-full bg-[#263238] border border-[#24324F] rounded-3xl p-3.5 sm:p-5 shadow-xl space-y-3 transition-all duration-200 hover:border-[#00B8D4]/50 text-white"
              >
                {/* 1. Post Author Header */}
                <div className="flex items-center justify-between gap-3">
                  <div 
                    onClick={() => navigate('/dashboard/athlete/profile')}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                  >
                    <img
                      src={post.authorAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'}
                      alt={post.authorName}
                      className="w-10 h-10 rounded-2xl object-cover border border-slate-600 group-hover:border-[#00B8D4] shadow-md shrink-0 transition-colors"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-[#F4F4F4] group-hover:text-[#00B8D4] tracking-tight truncate transition-colors">
                          {post.authorName}
                        </span>
                        {post.isVerifiedRecruit && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[#FFC857]/15 border border-[#FFC857]/50 text-[#FFC857] text-[10px] font-black uppercase tracking-wider">
                            ★ Verified
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded bg-black/40 text-[10px] font-mono font-bold text-[#00B8D4] border border-[#00B8D4]/20">
                          {post.sport}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {(post.authorRole || 'ATHLETE').toUpperCase()} {post.authorSchool ? `• ${post.authorSchool}` : ''} {post.authorClassYear ? `• Class of ${post.authorClassYear}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Scout Action: + Watchlist */}
                  {isScoutOrDirector && onAddToWatchlist && (
                    <button
                      onClick={() => onAddToWatchlist(post.authorId, post.authorName)}
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-black uppercase font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 ${
                        isWatchlisted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'bg-[#FFC857]/15 hover:bg-[#FFC857]/25 text-[#FFC857] border border-[#FFC857]/40 hover:scale-[1.02]'
                      }`}
                      title="Recruiter Watchlist"
                    >
                      {isWatchlisted ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span className="hidden sm:inline">Watchlisted</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5 text-[#FFC857]" />
                          <span className="hidden sm:inline">+ Watchlist</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* 2. Optional Verified Laser Metrics */}
                {post.metrics && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-black/50 border border-[#FFC857]/30 text-[#FFC857] text-xs font-mono font-bold flex-wrap shadow-inner">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-[#FFC857]" />
                      <span>Laser:</span>
                    </span>
                    {post.metrics.fortyYard && (
                      <span className="text-[#F4F4F4]">40yd: <strong>{post.metrics.fortyYard}</strong></span>
                    )}
                    {post.metrics.vertical && (
                      <span className="text-[#F4F4F4]">• Vert: <strong>{post.metrics.vertical}</strong></span>
                    )}
                    {post.metrics.gpa && (
                      <span className="text-emerald-400">• GPA: {post.metrics.gpa}</span>
                    )}
                  </div>
                )}

                {/* 3. Caption / Shoutout text */}
                {post.caption && (
                  <p className="text-xs sm:text-sm text-[#F4F4F4] leading-relaxed whitespace-pre-wrap font-medium">
                    {post.caption}
                  </p>
                )}

                {/* 4. Standardized Media Container (Vertical Reels 9:16 vs Photo 4:5 or 1:1) with Double-Tap */}
                {parsedVideo ? (
                  <div 
                    className="relative rounded-2xl overflow-hidden bg-black border border-[#24324F] shadow-2xl select-none group"
                    onClick={() => handleMediaTap(post.id)}
                  >
                    {/* Double-tap animated glowing ⚡ Hype Icon */}
                    <AnimatePresence>
                      {burstTimestamp && (
                        <motion.div
                          key={burstTimestamp}
                          initial={{ scale: 0, opacity: 0, y: 0 }}
                          animate={{ scale: [0, 1.4, 1.1, 0], opacity: [0, 1, 1, 0], y: [0, -25] }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                        >
                          <div className="w-20 h-20 rounded-full bg-[#00B8D4]/30 backdrop-blur-md border border-[#00B8D4] flex items-center justify-center shadow-[0_0_40px_rgba(0,184,212,0.8)]">
                            <Zap className="w-12 h-12 text-[#00B8D4] fill-[#00B8D4] drop-shadow-[0_0_15px_#00B8D4]" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Provider Badge Tag */}
                    {providerBadge && (
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span className={`px-2 py-0.5 rounded-lg ${providerBadge.bg} ${providerBadge.text} border ${providerBadge.border} text-[10px] font-black font-mono uppercase tracking-wider backdrop-blur-md flex items-center gap-1 shadow-md`}>
                          <span>{providerBadge.icon}</span>
                          <span>{getVideoProviderName(parsedVideo.provider)}</span>
                        </span>
                      </div>
                    )}

                    {/* Fullscreen Theater Button on Video */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTheaterPost(post);
                      }}
                      className="absolute top-2.5 left-2.5 z-10 min-h-[38px] px-3 py-1.5 rounded-xl bg-black/80 hover:bg-[#00B8D4] text-white hover:text-[#090D16] border border-white/20 text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
                      aria-label="Open Theater Mode"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Theater</span>
                    </button>

                    {/* Standardized Aspect Ratio Video Embed */}
                    {parsedVideo.provider === 'direct' ? (
                      <div className={`relative w-full bg-black ${isVertical ? 'aspect-[9/16] max-h-[580px] mx-auto' : 'aspect-video'}`}>
                        <video
                          src={parsedVideo.embedUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-contain rounded-2xl bg-black"
                        />
                      </div>
                    ) : (
                      <div className={`w-full overflow-hidden bg-black ${isVertical ? 'aspect-[9/16] max-h-[580px] max-w-sm mx-auto' : 'aspect-video'}`}>
                        <iframe
                          src={parsedVideo.embedUrl}
                          title={`Highlight by ${post.authorName}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full object-cover border-0"
                        />
                      </div>
                    )}
                  </div>
                ) : post.imageUrl ? (
                  <div 
                    onClick={() => {
                      handleMediaTap(post.id);
                    }}
                    className="relative rounded-2xl overflow-hidden border border-[#24324F] bg-black cursor-pointer select-none group aspect-[4/5] sm:aspect-[1/1] max-h-[480px]"
                  >
                    {/* Double-tap animated glowing ⚡ Hype Icon */}
                    <AnimatePresence>
                      {burstTimestamp && (
                        <motion.div
                          key={burstTimestamp}
                          initial={{ scale: 0, opacity: 0, y: 0 }}
                          animate={{ scale: [0, 1.4, 1.1, 0], opacity: [0, 1, 1, 0], y: [0, -25] }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                        >
                          <div className="w-20 h-20 rounded-full bg-[#00B8D4]/30 backdrop-blur-md border border-[#00B8D4] flex items-center justify-center shadow-[0_0_40px_rgba(0,184,212,0.8)]">
                            <Zap className="w-12 h-12 text-[#00B8D4] fill-[#00B8D4] drop-shadow-[0_0_15px_#00B8D4]" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <img
                      src={post.imageUrl}
                      alt="Locker Room highlight photo"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />

                    {/* View Photo Theater Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTheaterPost(post);
                      }}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-[#00B8D4] text-white hover:text-[#090D16] border border-white/20 text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Full Photo</span>
                    </button>
                  </div>
                ) : null}

                {/* 5. Interactive Micro-Engagement Action Bar: ⚡ Hype ({count}), 💬 Comments ({count}), ↗️ Share */}
                <div className="pt-2 border-t border-[#24324F]/80 flex items-center justify-between gap-2 flex-wrap text-xs font-mono">
                  
                  {/* Left: Reaction Triggers */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Primary ⚡ Hype Button */}
                    <button
                      onClick={() => onReact(post.id, 'hype')}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl font-black font-mono transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border ${
                        userReaction === 'hype'
                          ? 'bg-[#00B8D4]/20 border-[#00B8D4] text-[#00B8D4] shadow-[0_0_15px_rgba(0,184,212,0.4)]'
                          : 'bg-black/30 hover:bg-black/60 border-white/5 text-slate-300 hover:text-white'
                      }`}
                      title="⚡ Hype this highlight"
                    >
                      <motion.div animate={userReaction === 'hype' ? { scale: [1, 1.3, 1] } : { scale: 1 }}>
                        <Zap className={`w-4 h-4 ${userReaction === 'hype' ? 'text-[#00B8D4] fill-[#00B8D4]' : 'text-[#00B8D4]'}`} />
                      </motion.div>
                      <span>Hype</span>
                      <span className="font-bold text-[#00B8D4]">({post.reactions?.hype || 0})</span>
                    </button>

                    {/* Secondary 🔥 Sauce Button */}
                    <button
                      onClick={() => onReact(post.id, 'sauce')}
                      className={`min-h-[44px] px-3 py-2 rounded-xl font-bold font-mono transition-all flex items-center gap-1 cursor-pointer active:scale-95 border ${
                        userReaction === 'sauce'
                          ? 'bg-[#FF6A00]/20 border-[#FF6A00] text-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.4)]'
                          : 'bg-black/30 hover:bg-black/60 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                      title="🔥 Sauce"
                    >
                      <Flame className="w-3.5 h-3.5 text-[#FF6A00]" />
                      <span className="hidden sm:inline">Sauce</span>
                      <span>({post.reactions?.sauce || 0})</span>
                    </button>

                    {/* Tertiary 🎯 Clutch Button */}
                    <button
                      onClick={() => onReact(post.id, 'clutch')}
                      className={`min-h-[44px] px-3 py-2 rounded-xl font-bold font-mono transition-all flex items-center gap-1 cursor-pointer active:scale-95 border ${
                        userReaction === 'clutch'
                          ? 'bg-[#00F5D4]/20 border-[#00F5D4] text-[#00F5D4] shadow-[0_0_15px_rgba(0,245,212,0.4)]'
                          : 'bg-black/30 hover:bg-black/60 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                      title="🎯 Clutch"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-[#00F5D4]" />
                      <span className="hidden sm:inline">Clutch</span>
                      <span>({post.reactions?.clutch || 0})</span>
                    </button>
                  </div>

                  {/* Right: Comments & Share */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveCommentPost(post)}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer border border-white/5"
                    >
                      <MessageSquare className="w-4 h-4 text-[#00B8D4]" />
                      <span>Comments ({post.commentsCount || 0})</span>
                    </button>

                    <button
                      onClick={() => handleShare(post)}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer border border-white/5"
                      title="Share link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>

                </div>

              </article>
            );
          })
        )}

        {/* 6. Infinite Scroll Observer Target */}
        <div ref={observerTargetRef} className="py-6 flex justify-center items-center">
          {loadingMore && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#263238] border border-[#00B8D4]/40 text-[#00B8D4] text-xs font-bold font-mono tracking-wider animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-[#00B8D4]" />
              <span>STREAMING MORE REELS & HIGHLIGHTS...</span>
            </div>
          )}
          {!hasMore && filteredPosts.length > 0 && (
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
              ✓ All {filteredPosts.length} locker room posts loaded
            </span>
          )}
        </div>
      </div>

      {/* 3. Real-time Comments Drawer */}
      {activeCommentPost && (
        <LockerCommentsDrawer
          isOpen={Boolean(activeCommentPost)}
          onClose={() => setActiveCommentPost(null)}
          postId={activeCommentPost.id}
          postAuthorName={activeCommentPost.authorName}
          onRequireAuth={() => onRequireAuth('comment on locker room discussions')}
        />
      )}

      {/* 4. Fullscreen Video / Photo Theater Modal */}
      {activeTheaterPost && (
        <VideoTheaterModal
          isOpen={Boolean(activeTheaterPost)}
          onClose={() => setActiveTheaterPost(null)}
          post={activeTheaterPost}
          onReact={onReact}
        />
      )}

    </div>
  );
};
