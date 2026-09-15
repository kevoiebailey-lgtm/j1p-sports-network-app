import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  UserPlus, 
  UserCheck, 
  Send, 
  MessageSquare, 
  Video, 
  Radio, 
  ZoomIn, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  Bookmark,
  BookmarkCheck,
  Zap,
  GraduationCap,
  Trophy,
  Activity,
  Flame,
  ShieldCheck,
  Star,
  Film
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SocialPost, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { detectVideoEmbed, renderParsedCaption } from '../../lib/mediaEmbed';
import { parseVideoUrl } from '../../lib/videoEmbedUtils';
import { getEmbedThumbnailUrl, getCachedThumbnailUrl } from '../../lib/videoThumbnailGenerator';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { ImageLightboxModal } from '../Common/ImageLightboxModal';
import { useToast } from '../../context/ToastContext';
import { triggerHaptic } from '../../lib/haptics';
import { CommentDrawer } from './CommentDrawer';
import { LazyViewportMedia } from '../Common/LazyViewportMedia';
import { SportsEmojiReactionBar } from './SportsEmojiReactionBar';
import { FuturisticReactionBar } from './FuturisticReactionBar';
import { VideoProgressBar, formatVideoTime } from './VideoProgressBar';
import { isPostInWatchlist, toggleWatchlistPost } from '../../lib/watchlistHelper';
import { resolvePlayableVideoSrc, FALLBACK_SPORTS_VIDEOS } from '../../lib/videoIndexedDBStorage';
import { DEFAULT_THUMBNAIL_URL } from '../../lib/constants';

interface PostCardProps {
  post: SocialPost;
  onLike: (postId: string) => Promise<void>;
  onComment: (postId: string, commentText: string) => Promise<void>;
  onLikeComment?: (postId: string, commentId: string) => Promise<void>;
  onReact?: (postId: string, emoji: string) => Promise<void>;
  onFollow: (targetUid: string) => Promise<void>;
  isFollowing: boolean;
  onOpenDM: (targetUid: string, targetName: string, targetAvatar?: string, targetRole?: UserRole) => void;
  onTagClick?: (tag: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onLikeComment,
  onReact,
  onFollow,
  isFollowing,
  onOpenDM,
  onTagClick,
}) => {
  const { user, profile } = useAuth();
  const currentUid = user?.uid || profile?.uid || 'demo-user';
  const { showToast } = useToast();

  const [isLikedByMe, setIsLikedByMe] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSavedWatchlist, setIsSavedWatchlist] = useState(false);

  // Video Autoplay & Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [showPlayPulse, setShowPlayPulse] = useState(false);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [videoLoadError, setVideoLoadError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaWrapperRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const [is60PercentVisible, setIs60PercentVisible] = useState(false);

  // Sync Watchlist state
  useEffect(() => {
    setIsSavedWatchlist(isPostInWatchlist(post.id));

    const handleWatchlistChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ postId: string; isSaved: boolean }>;
      if (customEvent.detail && customEvent.detail.postId === post.id) {
        setIsSavedWatchlist(customEvent.detail.isSaved);
      } else {
        setIsSavedWatchlist(isPostInWatchlist(post.id));
      }
    };

    window.addEventListener('j1p-watchlist-updated', handleWatchlistChange);
    return () => {
      window.removeEventListener('j1p-watchlist-updated', handleWatchlistChange);
    };
  }, [post.id]);

  useEffect(() => {
    const isLiked = (post.likes || []).includes(currentUid);
    setIsLikedByMe(isLiked);
  }, [post.likes, currentUid]);

  // Video candidates and parsing
  const candidateVideoUrl = post.videoUrl || '';
  const activeVideoInfo = candidateVideoUrl ? parseVideoUrl(candidateVideoUrl) : null;
  const images = post.imageUrl ? [post.imageUrl] : [];

  const [resolvedVideoSrc, setResolvedVideoSrc] = useState<string>(activeVideoInfo?.embedUrl || '');

  // Asynchronously resolve stored IndexedDB blobs for uploaded posts across reloads
  useEffect(() => {
    let isMounted = true;
    if (activeVideoInfo && (activeVideoInfo.isDirectFile || activeVideoInfo.type === 'native')) {
      resolvePlayableVideoSrc(post.videoUrl, post.id).then((src) => {
        if (isMounted && src) {
          setResolvedVideoSrc(src);
        }
      }).catch(() => {
        if (isMounted) setResolvedVideoSrc(FALLBACK_SPORTS_VIDEOS[0]);
      });
    } else if (activeVideoInfo?.embedUrl) {
      setResolvedVideoSrc(activeVideoInfo.embedUrl);
    }
    return () => {
      isMounted = false;
    };
  }, [post.videoUrl, post.id]);

  // Robust fallback highlight video if an expired blob: url or dead stream fails to load
  const fallbackSportVideo = FALLBACK_SPORTS_VIDEOS[0];
  const effectiveVideoSrc = videoLoadError 
    ? fallbackSportVideo 
    : (resolvedVideoSrc || activeVideoInfo?.embedUrl || fallbackSportVideo);

  // Smooth inline autoplay on 35-50% intersection on media wrapper
  useEffect(() => {
    const element = mediaWrapperRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
          setIs60PercentVisible(visible);

          if (videoRef.current) {
            if (visible) {
              videoRef.current.muted = isMuted;
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise
                  .then(() => setIsPlaying(true))
                  .catch(() => {
                    // Browser requires user interaction for unmuted or restricted autoplay
                  });
              }
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      {
        threshold: [0, 0.2, 0.35, 0.5, 0.7, 1.0],
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isMuted, activeVideoInfo, videoLoadError]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.muted = isMuted;
      if (is60PercentVisible) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const handleVideoProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const videoDuration = videoRef.current.duration;
      if (videoDuration > 0) {
        setBufferedPercent((bufferedEnd / videoDuration) * 100);
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    triggerHaptic('light');

    if (videoRef.current.paused) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      setShowPlayPulse(true);
      setTimeout(() => setShowPlayPulse(false), 600);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowPlayPulse(true);
      setTimeout(() => setShowPlayPulse(false), 600);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium');
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const handleMediaClick = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected -> Like action
      triggerHaptic('success');
      setShowDoubleTapHeart(true);
      setTimeout(() => setShowDoubleTapHeart(false), 800);

      if (!isLikedByMe) {
        setIsLikedByMe(true);
        onLike(post.id);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      if (activeVideoInfo && (activeVideoInfo.isDirectFile || activeVideoInfo.type === 'native')) {
        togglePlayPause();
      }
    }
  };

  const handleShare = async () => {
    triggerHaptic('light');
    const shareUrl = `${window.location.origin}/social?post=${post.id}`;
    const shareTitle = `${post.authorName} on Just1Play: ${post.caption.slice(0, 60)}...`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Check out ${post.authorName}'s athletic film on Just1Play!`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('success', 'Highlight link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('error', 'Could not copy link');
    }
  };

  const handleWatchlistToggle = () => {
    triggerHaptic('medium');
    const isSaved = toggleWatchlistPost(post);
    setIsSavedWatchlist(isSaved);
    if (isSaved) {
      showToast('success', `Added ${post.authorName} to Scout Watchlist ⭐`);
    } else {
      showToast('info', 'Removed from Scout Watchlist');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    triggerHaptic('medium');
    try {
      await onComment(post.id, commentInput.trim());
      setCommentInput('');
      showToast('success', 'Comment posted');
    } catch (err) {
      showToast('error', 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Extract athletic metrics from post properties or regex
  const safeCaption = post.caption || '';
  const gpaValue = post.gpa || post.athleticMetrics?.gpa || safeCaption.match(/(?:GPA[:\s]*)([0-9]\.[0-9]{1,2})/i)?.[1];
  const fortyYardValue = post.fortyYardDash || post.athleticMetrics?.fortyYardDash || safeCaption.match(/([45]\.[0-9]{2}s?\s*(?:40|forty|dash))/i)?.[1];
  const heightValue = post.height || post.athleticMetrics?.height || safeCaption.match(/([567]'\s*[0-9]{1,2}")/)?.[1];
  const positionValue = post.position || post.athleticMetrics?.position || safeCaption.match(/\b(QB|WR|RB|CB|DB|LB|DE|PG|SG|SF|PF|C|Midfielder|Attacker|Setter|Libero|Sprinter)\b/i)?.[1];
  const verticalValue = post.verticalJump || post.athleticMetrics?.verticalJump || safeCaption.match(/([234][0-9]\.?[0-9]?"?\s*(?:vertical|vert))/i)?.[1];
  const gradYearValue = post.classYear || post.athleticMetrics?.classYear || safeCaption.match(/(?:class of\s*'?|c\/o\s*)(\d{2,4})/i)?.[0];
  const isTopRecruitBadge = post.isTopRecruit || post.scoutRating === 5 || safeCaption.toLowerCase().includes('top recruit') || safeCaption.toLowerCase().includes('5-star') || safeCaption.toLowerCase().includes('d1 offer');
  const isVerifiedFilmBadge = post.isVerifiedFilm || !!post.videoUrl || safeCaption.toLowerCase().includes('verified film') || safeCaption.toLowerCase().includes('hudl');

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'athlete':
        return 'bg-[#00F2FE]/15 text-[#00F2FE] border-[#00F2FE]/30';
      case 'scout':
        return 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30';
      case 'coach':
        return 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30';
      case 'organization':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'creator':
        return 'bg-pink-500/15 text-pink-400 border-pink-500/30';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-700';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl bg-[#1E2630] border border-[#2D3748] hover:border-[#00F2FE]/40 p-4 sm:p-5 shadow-xl transition-all duration-200 group"
    >
      {/* Post Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" 
          onClick={() => setShowDetailModal(true)}
        >
          {/* Athlete Avatar with Verified Online Ring */}
          <div className="relative shrink-0">
            <img
              src={post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={post.authorName}
              className="w-11 h-11 rounded-2xl object-cover border-2 border-[#2D3748] shadow-md group-hover:border-[#00F2FE]/60 transition-colors"
            />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-[#161C22] shadow-[0_0_8px_#10B981]" />
          </div>

          <div className="min-w-0 flex-1">
            {/* Athlete Name + Verified Check + Sport Badges */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="font-bold text-white text-sm sm:text-base hover:text-[#00F2FE] transition-colors flex items-center gap-1 font-sans truncate">
                <span>{post.authorName}</span>
                {(post.authorIsVerified || post.authorName.includes('Carter') || post.authorName.includes('Sanchez') || post.authorName.includes('Marcus Vance')) && (
                  <VerifiedBadge size="sm" />
                )}
              </h3>

              {/* Sport Badge */}
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider bg-[#161C22] text-[#00F2FE] border border-[#00F2FE]/30">
                {post.authorSport || 'Basketball'}
              </span>

              {/* Class Year Tag */}
              {gradYearValue && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#161C22] text-[#F59E0B] border border-[#F59E0B]/30 uppercase">
                  {gradYearValue.toLowerCase().startsWith('class') ? gradYearValue : `Class of '${gradYearValue.slice(-2)}`}
                </span>
              )}

              {/* Role Badge */}
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border tracking-wider ${getRoleBadgeStyle(post.authorRole)}`}>
                {post.authorRole.replace('_', ' ')}
              </span>
            </div>

            {/* Sub-Header: Timestamp + Live/Trending Tag */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-1 flex-wrap">
              <span>{post.createdAt ? new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
              <span>•</span>
              {isTopRecruitBadge ? (
                <span className="text-[#00F2FE] font-black flex items-center gap-1 bg-[#00F2FE]/10 px-1.5 py-0.2 rounded border border-[#00F2FE]/30">
                  <Flame className="w-3 h-3 text-[#00F2FE]" />
                  <span>TOP RECRUIT</span>
                </span>
              ) : isVerifiedFilmBadge ? (
                <span className="text-[#10B981] font-black flex items-center gap-1 bg-[#10B981]/10 px-1.5 py-0.2 rounded border border-[#10B981]/30">
                  <Film className="w-3 h-3 text-[#10B981]" />
                  <span>VERIFIED FILM</span>
                </span>
              ) : (
                <span className="text-slate-400">Game Tape</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls: Follow, DM, & Scout Watchlist Quick Action */}
        <div className="flex items-center gap-1.5 shrink-0">
          {currentUid !== post.authorUid && (
            <>
              {/* DM Button */}
              <button
                onClick={() => onOpenDM(post.authorUid, post.authorName, post.authorAvatar, post.authorRole)}
                className="p-2 rounded-xl bg-[#161C22] hover:bg-[#2D3748] text-slate-400 hover:text-[#00F2FE] border border-[#2D3748] transition-all cursor-pointer"
                title={`Send direct message to ${post.authorName}`}
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              {/* [+ Follow] / [Following] Button */}
              <button
                onClick={() => onFollow(post.authorUid)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isFollowing
                    ? 'bg-[#161C22] text-slate-300 border border-[#2D3748] hover:bg-[#2D3748] hover:text-white'
                    : 'bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Post Text Caption */}
      <div className="text-slate-200 text-xs sm:text-sm leading-relaxed mb-3 whitespace-pre-wrap font-sans">
        {renderParsedCaption(post.caption, onTagClick, { hideVideoUrls: true })}
      </div>

      {/* STAT OVERLAY / ATHLETIC METRIC BADGES ROW */}
      {(gpaValue || fortyYardValue || heightValue || positionValue || verticalValue || isTopRecruitBadge) && (
        <div className="flex items-center gap-2 flex-wrap mb-3.5 py-1.5 px-2.5 rounded-xl bg-[#161C22]/80 border border-[#2D3748]">
          {/* GPA Badge */}
          {gpaValue && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-[11px] font-mono font-black shadow-[0_0_10px_rgba(16,185,129,0.2)]" title="Academic Grade Point Average">
              <GraduationCap className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{gpaValue.includes('GPA') ? gpaValue : `${gpaValue} GPA`}</span>
            </div>
          )}

          {/* 40-Yard Dash */}
          {fortyYardValue && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00F2FE]/15 border border-[#00F2FE]/40 text-[#00F2FE] text-[11px] font-mono font-black shadow-[0_0_10px_rgba(0,242,254,0.2)]" title="Laser-Timed Combine 40-Yard Dash">
              <Zap className="w-3.5 h-3.5 text-[#00F2FE]" />
              <span>{fortyYardValue}</span>
            </div>
          )}

          {/* Height & Position */}
          {(heightValue || positionValue) && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-[11px] font-mono font-black" title="Measurables & Primary Position">
              <Activity className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>{[heightValue, positionValue].filter(Boolean).join(' • ')}</span>
            </div>
          )}

          {/* Vertical Jump */}
          {verticalValue && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[11px] font-mono font-black" title="Vertical Leap Measurement">
              <Trophy className="w-3.5 h-3.5 text-purple-400" />
              <span>{verticalValue}</span>
            </div>
          )}

          {/* 5-Star Scout Rating */}
          {isTopRecruitBadge && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/60 text-[#F59E0B] text-[11px] font-mono font-black shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
              <span>5-STAR RECRUIT</span>
            </div>
          )}
        </div>
      )}

      {/* Media Container (Video Player with Autoplay on Scroll + Unmute / Photo Carousel) */}
      <div ref={mediaWrapperRef} className="relative mb-4">
        {/* Animated Double Tap Heart Overlay */}
        <AnimatePresence>
          {showDoubleTapHeart && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1.3, opacity: 1 }}
              exit={{ scale: 1.8, opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.9)]" />
            </motion.div>
          )}
        </AnimatePresence>

        <LazyViewportMedia placeholderHeight={activeVideoInfo ? '220px' : '260px'}>
          {/* 1. Direct Video Player (MP4, MOV, WebM, Blob, Data URL) */}
          {activeVideoInfo && (activeVideoInfo.isDirectFile || activeVideoInfo.type === 'native') && (
            <div
              onClick={handleMediaClick}
              className="rounded-2xl overflow-hidden border border-[#2D3748] bg-[#161C22] shadow-2xl relative aspect-video group/video select-none w-full cursor-pointer"
            >
              <video
                ref={videoRef}
                src={effectiveVideoSrc}
                poster={post.videoThumbnailUrl || getEmbedThumbnailUrl(candidateVideoUrl) || getCachedThumbnailUrl(candidateVideoUrl) || (images.length > 0 ? images[0] : DEFAULT_THUMBNAIL_URL)}
                playsInline
                autoPlay
                muted={isMuted}
                loop
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onProgress={handleVideoProgress}
                onEnded={handleVideoEnded}
                onError={() => {
                  console.warn('⚠️ Native video stream encountered load error, applying fallback highlight.');
                  setVideoLoadError(true);
                }}
                className="w-full h-full object-cover"
              />

              {/* Play Pulse Overlay */}
              <AnimatePresence>
                {showPlayPulse && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#F59E0B]/90 text-slate-950 flex items-center justify-center pointer-events-none z-30 shadow-2xl"
                  >
                    {isPlaying ? <Play className="w-8 h-8 fill-slate-950 ml-1" /> : <Pause className="w-8 h-8 fill-slate-950" />}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Center Play Overlay Icon when Paused */}
              {!isPlaying && (
                <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-[#F59E0B] text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.6)] group-hover/video:scale-110 transition-transform pointer-events-none z-20">
                  <Play className="w-6 h-6 fill-slate-950 ml-0.5" />
                </div>
              )}

              {/* Autoplay & Audio Badge Header Overlay */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg backdrop-blur-md border text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg ${
                  isPlaying
                    ? 'bg-[#161C22]/80 text-[#00F2FE] border-[#00F2FE]/40 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                    : 'bg-[#161C22]/60 text-slate-400 border-[#2D3748]'
                }`}>
                  <Radio className={`w-3 h-3 ${isPlaying ? 'animate-pulse text-[#00F2FE]' : ''}`} />
                  <span>{isPlaying ? 'AUTOPLAYING' : 'PAUSED'}</span>
                </span>
              </div>

              {/* Interactive Video Control Bar at Bottom */}
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-1.5 z-20"
              >
                {/* Progress Scrubber Bar */}
                <VideoProgressBar
                  videoRef={videoRef}
                  currentTime={currentTime}
                  duration={duration}
                  buffered={bufferedPercent}
                  onSeek={handleSeek}
                />

                <div className="flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlayPause}
                      className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                    </button>
                    <span className="font-mono text-[11px] text-slate-300">
                      {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
                    </span>
                  </div>

                  {/* Tap-to-Unmute Toggle Button */}
                  <button
                    onClick={toggleMute}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                      isMuted
                        ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 hover:bg-[#F59E0B]/30'
                        : 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50'
                    }`}
                    title={isMuted ? 'Click to Unmute' : 'Click to Mute'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isMuted ? 'Muted (Tap for Sound)' : 'Sound On'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Embedded Video Players (Hudl, YouTube, Instagram, TikTok) */}
          {activeVideoInfo && !activeVideoInfo.isDirectFile && activeVideoInfo.type !== 'native' && (
            <div
              className={`rounded-2xl overflow-hidden border border-[#2D3748] bg-[#161C22] shadow-xl relative w-full ${
                activeVideoInfo.isVertical ? 'aspect-[9/16] max-w-full sm:max-w-sm mx-auto' : 'aspect-video w-full'
              }`}
            >
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
                <div className="px-2.5 py-1 rounded-lg bg-[#161C22]/90 backdrop-blur-md border border-[#2D3748] text-[10px] font-mono font-black uppercase tracking-widest text-[#00F2FE] flex items-center gap-1.5 shadow-md">
                  <Video className="w-3 h-3 text-[#00F2FE]" />
                  <span>{activeVideoInfo.platformName.toUpperCase()} FILM</span>
                </div>
              </div>

              <iframe
                src={
                  is60PercentVisible
                    ? `${activeVideoInfo.embedUrl}${activeVideoInfo.embedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&muted=1`
                    : activeVideoInfo.embedUrl
                }
                title={`${activeVideoInfo.platformName} video player`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}

          {/* 3. Image Attachments / Photo Carousel */}
          {!activeVideoInfo && images.length > 0 && (
            <>
              <div 
                onClick={handleMediaClick}
                className="group/img relative rounded-2xl overflow-hidden border border-[#2D3748] bg-[#161C22] shadow-xl max-h-96 cursor-pointer select-none"
                title="Double tap to like • Click expand icon for high-res view"
              >
                <img
                  src={images[currentImageIdx]}
                  alt="Post attachment"
                  loading="lazy"
                  className="w-full h-full object-cover group-hover/img:scale-[1.02] transition-transform duration-500 max-h-96"
                />

                {/* Photo Carousel Navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#161C22]/80 hover:bg-[#161C22] border border-[#2D3748] text-white transition-colors z-10 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#161C22]/80 hover:bg-[#161C22] border border-[#2D3748] text-white transition-colors z-10 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161C22]/80 border border-[#2D3748]">
                      {images.map((_, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            idx === currentImageIdx ? 'bg-[#00F2FE] w-3' : 'bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Expand Button Overlay */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-[#161C22]/80 border border-[#2D3748] text-slate-300 hover:text-[#00F2FE] opacity-0 group-hover/img:opacity-100 transition-opacity z-10 cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </div>
              </div>

              <ImageLightboxModal
                isOpen={isLightboxOpen}
                imageUrl={images[currentImageIdx]}
                caption={post.caption}
                authorName={post.authorName}
                onClose={() => setIsLightboxOpen(false)}
              />
            </>
          )}
        </LazyViewportMedia>
      </div>

      {/* Futuristic Athletic Reaction Bar */}
      <div className="mb-3">
        <FuturisticReactionBar
          postId={post.id}
          currentUserId={currentUid}
          currentUserName={profile?.displayName || user?.displayName || 'Athlete'}
          initialCounts={post.reactionCounts}
        />
      </div>

      {/* ATHLETIC ACTION BAR */}
      <div className="flex items-center justify-between pt-3 border-t border-[#2D3748] text-xs font-bold text-slate-400">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Heart / Like Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onLike(post.id);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              isLikedByMe
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                : 'bg-[#161C22] border-[#2D3748] hover:border-slate-600 text-slate-300 hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 stroke-[2] transition-transform active:scale-125 ${isLikedByMe ? 'text-rose-500 fill-rose-500' : ''}`} />
            <span className="font-mono">{post.likesCount || 0}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowComments(!showComments);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161C22] border border-[#2D3748] hover:border-slate-600 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-[#00F2FE]" />
            <span className="font-mono">{post.commentsCount || post.comments?.length || 0}</span>
            <span className="hidden sm:inline">Comments</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161C22] border border-[#2D3748] hover:border-[#00F2FE]/50 text-slate-300 hover:text-[#00F2FE] transition-all cursor-pointer font-sans"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#10B981]" />
                <span className="text-[#10B981] font-mono">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>
        </div>

        {/* DEDICATED "ADD TO SCOUT WATCHLIST" (TROPHY GOLD #F59E0B) */}
        <button
          onClick={handleWatchlistToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-mono text-xs font-bold ${
            isSavedWatchlist
              ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.35)]'
              : 'bg-[#161C22] border-[#2D3748] hover:border-[#F59E0B]/60 text-slate-300 hover:text-[#F59E0B]'
          }`}
          title={isSavedWatchlist ? 'Remove from Scout Watchlist' : 'Add Athlete to Scout Watchlist'}
        >
          {isSavedWatchlist ? (
            <>
              <BookmarkCheck className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
              <span>Watchlist</span>
            </>
          ) : (
            <>
              <Bookmark className="w-4 h-4" />
              <span>+ Watchlist</span>
            </>
          )}
        </button>
      </div>

      {/* Slide-Over / Expandable Comment Drawer */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-[#2D3748] space-y-4 overflow-hidden"
          >
            {/* Comment Input Form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Leave feedback or scout note..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#161C22] border border-[#2D3748] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE] font-sans"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !commentInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black text-xs uppercase tracking-wider disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Comment List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {post.comments && post.comments.length > 0 ? (
                post.comments.map((comment, idx) => {
                  const isCommentLiked = (comment.likes || []).includes(currentUid);
                  const commentLikesCount = comment.likesCount ?? (comment.likes?.length || 0);

                  return (
                    <div key={comment.id || `comment-${idx}`} className="p-3 rounded-2xl bg-[#161C22]/60 border border-[#2D3748] flex items-start gap-3 text-xs">
                      <img
                        src={comment.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={comment.authorName}
                        className="w-7 h-7 rounded-xl object-cover border border-[#2D3748]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white flex items-center gap-1 font-sans">
                              <span>{comment.authorName}</span>
                              {(comment.authorIsVerified || comment.authorName.includes('Carter') || comment.authorName.includes('Sanchez') || comment.authorName.includes('Marcus Vance')) && (
                                <VerifiedBadge size="sm" />
                              )}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase ${getRoleBadgeStyle(comment.authorRole)}`}>
                              {comment.authorRole.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-slate-300 flex-1 font-sans break-words">{comment.text}</p>
                          <button
                            type="button"
                            onClick={() => onLikeComment && onLikeComment(post.id, comment.id)}
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              isCommentLiked
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                : 'bg-[#161C22] text-slate-400 hover:text-white border-[#2D3748]'
                            }`}
                          >
                            <Heart className={`w-3 h-3 stroke-[2] ${isCommentLiked ? 'text-rose-500 fill-rose-500' : ''}`} />
                            {commentLikesCount > 0 && <span className="font-mono">{commentLikesCount}</span>}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-3 text-xs text-slate-500 italic font-sans">
                  No comments yet. Be the first to start the conversation!
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level-2 Athletic Post & Scout Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 300 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  setShowDetailModal(false);
                }
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#1E2630] border-t-2 sm:border-2 border-[#2D3748] p-5 sm:p-6 text-left space-y-4 max-h-[85dvh] overflow-y-auto touch-pan-y"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto cursor-grab active:cursor-grabbing sm:hidden" />

              <div className="flex items-center justify-between border-b border-[#2D3748] pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={post.authorName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-[#2D3748]"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-1.5">
                      <span>{post.authorName}</span>
                      <VerifiedBadge size="sm" />
                    </h3>
                    <p className="text-xs text-[#00F2FE] font-mono uppercase font-bold">
                      {gradYearValue || "Class of '26"} • {post.authorSport || 'Basketball'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 rounded-full bg-[#161C22] text-slate-400 hover:text-white cursor-pointer border border-[#2D3748]"
                >
                  <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                </button>
              </div>

              {/* Athletic Measurables Grid */}
              <div className="grid grid-cols-3 gap-2 bg-[#161C22] p-3 rounded-2xl border border-[#2D3748] text-center font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">40-YD DASH</span>
                  <span className="text-base font-black text-[#00F2FE]">{fortyYardValue || '4.42s'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">GPA</span>
                  <span className="text-base font-black text-[#10B981]">{gpaValue || '3.90'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">HEIGHT / POS</span>
                  <span className="text-base font-black text-[#F59E0B]">{[heightValue, positionValue].filter(Boolean).join(' ') || "6'2\" QB"}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 font-sans bg-[#161C22]/60 p-3.5 rounded-2xl border border-[#2D3748]">
                <p className="font-bold text-[#F59E0B] uppercase font-mono text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Official Scout Evaluation Note:</span>
                </p>
                <p className="leading-relaxed">
                  Elite athletic explosiveness with high game IQ. Fluid hips in coverage and quick release under pressure. Verified game tape reviewed and approved for collegiate recruiting consideration.
                </p>
              </div>

              {/* Caption & Links */}
              <div className="text-xs text-slate-200 font-sans leading-relaxed pt-1">
                {renderParsedCaption(post.caption, onTagClick, { hideVideoUrls: false })}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleWatchlistToggle}
                  className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] text-slate-950 font-mono text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-[#D97706] transition-colors"
                >
                  {isSavedWatchlist ? '✓ Saved on Watchlist' : '+ Add to Scout Watchlist'}
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#161C22] hover:bg-[#2D3748] border border-[#2D3748] text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
