import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Share2, 
  MessageSquare, 
  Volume2, 
  VolumeX, 
  X, 
  Clock, 
  Eye, 
  Flame, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Video, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getStoredLocalPosts } from '../Social/SocialFeedView';
import { getEmbedThumbnailUrl, getCachedThumbnailUrl } from '../../lib/videoThumbnailGenerator';
import { resolvePlayableVideoSrc, FALLBACK_SPORTS_VIDEOS } from '../../lib/videoIndexedDBStorage';

import { DEFAULT_THUMBNAIL_URL } from '../../lib/constants';

export interface ReelVideo {
  id: string;
  title: string;
  athleteName: string;
  athleteClass: string;
  athleteRole: string;
  sport: string;
  thumbnailUrl: string;
  videoUrl: string;
  views: string;
  likes: number;
  commentsCount: number;
  duration: string;
  uploadedAt: string;
  verified: boolean;
  avatarUrl: string;
  isUserUploaded?: boolean;
}

const DEFAULT_SAMPLE_REELS: ReelVideo[] = [
  {
    id: 'sample-reel-1',
    title: '45-Yard Laser TD Pass into Triple Coverage 🎯',
    athleteName: 'Marcus Vance',
    athleteClass: 'Class of 2026',
    athleteRole: '4-Star Quarterback',
    sport: 'Football',
    thumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-american-football-player-running-with-the-ball-41549-large.mp4',
    views: '24.8K',
    likes: 3420,
    commentsCount: 184,
    duration: '0:42',
    uploadedAt: '12m ago',
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'sample-reel-2',
    title: 'Windmill Dunk in State Semifinals 🔥🏀',
    athleteName: 'DeAndre Brooks',
    athleteClass: 'Class of 2025',
    athleteRole: '5-Star Shooting Guard',
    sport: 'Basketball',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-40866-large.mp4',
    views: '41.2K',
    likes: 6890,
    commentsCount: 412,
    duration: '0:28',
    uploadedAt: '35m ago',
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'sample-reel-3',
    title: 'Curving Free Kick Top Corner Strike ⚽⚡',
    athleteName: 'Elena Rostova',
    athleteClass: 'Class of 2026',
    athleteRole: 'All-American Forward',
    sport: 'Soccer',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-playing-soccer-on-a-field-42939-large.mp4',
    views: '18.9K',
    likes: 2150,
    commentsCount: 96,
    duration: '0:35',
    uploadedAt: '1h ago',
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'sample-reel-4',
    title: 'Sub-10.4s 100m Sprint Sprinting Masterclass 🏃💨',
    athleteName: 'Tariq Johnson',
    athleteClass: 'Class of 2025',
    athleteRole: 'Sprint Champion',
    sport: 'Track & Field',
    thumbnailUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-runners-on-a-track-field-41539-large.mp4',
    views: '32.1K',
    likes: 4910,
    commentsCount: 230,
    duration: '0:18',
    uploadedAt: '2h ago',
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'sample-reel-5',
    title: 'Over-the-Fence Home Run Slam ⚾💥',
    athleteName: 'Jackson Miller',
    athleteClass: 'Class of 2027',
    athleteRole: 'Power Hitter',
    sport: 'Baseball',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508802279458-944a958a74e7?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-baseball-player-hitting-a-ball-41552-large.mp4',
    views: '15.4K',
    likes: 1840,
    commentsCount: 88,
    duration: '0:31',
    uploadedAt: '3h ago',
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
  }
];

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}` : null;
}

function getYouTubeThumbnail(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function postToReel(post: any): ReelVideo | null {
  if (!post) return null;
  const rawVideoUrl = post.videoUrl || (typeof post.imageUrl === 'string' && post.imageUrl.match(/\.(mp4|webm|mov)$/i) ? post.imageUrl : '');
  if (!rawVideoUrl && !post.videoThumbnailUrl) return null;

  const ytThumb = getYouTubeThumbnail(rawVideoUrl) || getEmbedThumbnailUrl(rawVideoUrl);
  const cachedThumb = getCachedThumbnailUrl(rawVideoUrl);
  const thumb = post.videoThumbnailUrl || cachedThumb || (post.imageUrl && !post.imageUrl.startsWith('data:video') ? post.imageUrl : null) || ytThumb || DEFAULT_THUMBNAIL_URL;

  let timeAgo = 'Just now';
  if (post.createdAt) {
    try {
      const diffMs = Date.now() - new Date(post.createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) timeAgo = 'Just now';
      else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
      else if (diffMins < 1440) timeAgo = `${Math.floor(diffMins / 60)}h ago`;
      else timeAgo = `${Math.floor(diffMins / 1440)}d ago`;
    } catch (e) {
      timeAgo = 'Recently';
    }
  }

  return {
    id: post.id || `uploaded-reel-${Math.random().toString(36).substring(2, 7)}`,
    title: post.caption || 'New Highlight Reel Broadcast 🎯',
    athleteName: post.authorName || 'Sports Athlete',
    athleteClass: post.authorSport ? `${post.authorSport}` : 'Class of 2026',
    athleteRole: post.authorRole ? `${post.authorRole.toUpperCase()} • ${post.authorSport || 'Athlete'}` : 'Student Athlete',
    sport: post.authorSport || 'Sports',
    thumbnailUrl: thumb,
    videoUrl: rawVideoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-american-football-player-running-with-the-ball-41549-large.mp4',
    views: post.sharesCount ? `${post.sharesCount * 14 + 120}` : '1.8K',
    likes: typeof post.likesCount === 'number' ? post.likesCount : (Array.isArray(post.likes) ? post.likes.length : 14),
    commentsCount: post.commentsCount || (Array.isArray(post.comments) ? post.comments.length : 2),
    duration: '0:30',
    uploadedAt: timeAgo,
    verified: post.isRoleVerified ?? true,
    avatarUrl: post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    isUserUploaded: true
  };
}

interface RecentVideoReelsProps {
  onNavigateTab?: (tab: string) => void;
  onOpenCreateModal?: () => void;
}

export const RecentVideoReels: React.FC<RecentVideoReelsProps> = ({ 
  onNavigateTab,
  onOpenCreateModal 
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [feedFilter, setFeedFilter] = useState<'recently_uploaded' | 'all' | 'top_metrics'>('recently_uploaded');
  const [reelsList, setReelsList] = useState<ReelVideo[]>(DEFAULT_SAMPLE_REELS);
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [resolvedModalVideoSrc, setResolvedModalVideoSrc] = useState<string>('');

  const currentActiveReel = activeReelIndex !== null ? reelsList[activeReelIndex] : null;

  useEffect(() => {
    let isMounted = true;
    if (currentActiveReel?.videoUrl) {
      resolvePlayableVideoSrc(currentActiveReel.videoUrl, currentActiveReel.id).then((src) => {
        if (isMounted) setResolvedModalVideoSrc(src || currentActiveReel.videoUrl);
      }).catch(() => {
        if (isMounted) setResolvedModalVideoSrc(currentActiveReel.videoUrl || FALLBACK_SPORTS_VIDEOS[0]);
      });
    } else {
      setResolvedModalVideoSrc('');
    }
    return () => {
      isMounted = false;
    };
  }, [currentActiveReel?.videoUrl, currentActiveReel?.id]);

  // Combine local posts and Firestore real posts into the video reel feed
  const syncRealUploadedVideos = (firestorePosts: any[] = []) => {
    try {
      const localPosts = getStoredLocalPosts();
      const allPosts = [...firestorePosts, ...localPosts];

      const userReels: ReelVideo[] = [];
      const seenIds = new Set<string>();

      allPosts.forEach((post) => {
        if (!post || !post.id || seenIds.has(post.id)) return;
        const converted = postToReel(post);
        if (converted) {
          seenIds.add(converted.id);
          userReels.push(converted);
        }
      });

      // User uploaded reels come FIRST, followed by sample reels marked as recent
      const sampleReelsProcessed = DEFAULT_SAMPLE_REELS.map((r, idx) => ({
        ...r,
        isUserUploaded: idx === 0 || idx === 1 // mark recent samples as recent uploads
      }));

      const combined = [...userReels, ...sampleReelsProcessed.filter((r) => !seenIds.has(r.id))];
      setReelsList(combined);

      // Initialize like counts
      setLikeCounts((prev) => {
        const next = { ...prev };
        combined.forEach((r) => {
          if (next[r.id] === undefined) {
            next[r.id] = r.likes;
          }
        });
        return next;
      });
    } catch (err) {
      console.warn('Error syncing real video reels:', err);
    }
  };

  useEffect(() => {
    // Initial sync with local storage
    syncRealUploadedVideos();

    // Listen to local post changes
    const handleLocalUpdate = () => {
      syncRealUploadedVideos();
    };
    window.addEventListener('j1p-posts-updated', handleLocalUpdate);

    // Listen to Firestore real-time post updates
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'socialPosts'), orderBy('createdAt', 'desc'), limit(20));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const firestoreDocs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          syncRealUploadedVideos(firestoreDocs);
        },
        (err) => {
          console.warn('Firestore reels subscription fallback:', err);
          syncRealUploadedVideos();
        }
      );
    } catch (err) {
      console.warn('Firestore reels setup error:', err);
    }

    return () => {
      window.removeEventListener('j1p-posts-updated', handleLocalUpdate);
      unsubscribe();
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const toggleLike = (reelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLikedReels((prev) => {
      const isCurrentlyLiked = !!prev[reelId];
      const newLiked = !isCurrentlyLiked;
      setLikeCounts((c) => ({
        ...c,
        [reelId]: (c[reelId] || 0) + (newLiked ? 1 : -1)
      }));
      return { ...prev, [reelId]: newLiked };
    });
  };

  const handleNextReel = () => {
    if (activeReelIndex !== null && activeReelIndex < reelsList.length - 1) {
      setActiveReelIndex(activeReelIndex + 1);
    }
  };

  const handlePrevReel = () => {
    if (activeReelIndex !== null && activeReelIndex > 0) {
      setActiveReelIndex(activeReelIndex - 1);
    }
  };

  // Filter reels based on selected feed filter tab
  const displayedReels = reelsList.filter((reel) => {
    if (feedFilter === 'recently_uploaded') {
      return reel.isUserUploaded || reel.uploadedAt.includes('m ago') || reel.uploadedAt.includes('Just now') || reel.uploadedAt.includes('1h ago') || reel.uploadedAt.includes('2h ago');
    }
    return true;
  }).sort((a, b) => {
    if (feedFilter === 'top_metrics') {
      return (b.likes || 0) - (a.likes || 0);
    }
    return 0;
  });

  return (
    <div className="bg-white dark:bg-[#263238] border border-slate-200 dark:border-[#37474F] rounded-3xl p-4 sm:p-6 backdrop-blur-md relative overflow-hidden shadow-md transition-colors">
      {/* Background Accent glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF6A00]/5 dark:bg-[#FF6A00]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00B8D4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00B8D4]"></span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF6A00] font-bold">
              LIVE RECENTLY UPLOADED VIDEO REELS
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-[#263238] dark:text-white tracking-tight flex items-center gap-2">
            <span>Live Scrolling Video Feed</span>
            <Flame className="w-5 h-5 text-[#FF6A00] animate-pulse" />
          </h3>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#E05D00] text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,106,0,0.35)] active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Upload Video</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1E282D] p-1 rounded-xl border border-slate-200 dark:border-[#37474F]">
            <button
              onClick={() => scroll('left')}
              className="min-h-[44px] min-w-[44px] p-2.5 text-slate-600 dark:text-slate-300 hover:text-[#263238] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#37474F] rounded-lg transition-all flex items-center justify-center cursor-pointer"
              title="Scroll Left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="min-h-[44px] min-w-[44px] p-2.5 text-slate-600 dark:text-slate-300 hover:text-[#263238] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#37474F] rounded-lg transition-all flex items-center justify-center cursor-pointer"
              title="Scroll Right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Feed Category Filter Selector */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-4 pt-1">
        <button
          onClick={() => setFeedFilter('recently_uploaded')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
            feedFilter === 'recently_uploaded'
              ? 'bg-[#FF6A00] text-white border-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.4)]'
              : 'bg-slate-100 dark:bg-[#1E282D] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#37474F] hover:border-[#FF6A00] hover:text-[#263238] dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Recently Uploaded Videos ({reelsList.filter(r => r.isUserUploaded || r.uploadedAt.includes('m ago') || r.uploadedAt.includes('Just now')).length})</span>
        </button>

        <button
          onClick={() => setFeedFilter('all')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
            feedFilter === 'all'
              ? 'bg-[#FF6A00] text-white border-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.4)]'
              : 'bg-slate-100 dark:bg-[#1E282D] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#37474F] hover:border-[#FF6A00] hover:text-[#263238] dark:hover:text-white'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>All Video Reels ({reelsList.length})</span>
        </button>

        <button
          onClick={() => setFeedFilter('top_metrics')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
            feedFilter === 'top_metrics'
              ? 'bg-[#FF6A00] text-white border-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.4)]'
              : 'bg-slate-100 dark:bg-[#1E282D] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#37474F] hover:border-[#FF6A00] hover:text-[#263238] dark:hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4 text-[#FFC857]" />
          <span>Top Video Meters</span>
        </button>
      </div>

      {/* Horizontal Swiping / Scrolling Video List */}
      {displayedReels.length > 0 ? (
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-none pb-3 pt-1 scroll-smooth snap-x snap-mandatory touch-pan-x overscroll-x-contain"
        >
          {displayedReels.map((reel, index) => {
            const isLiked = likedReels[reel.id];
            const likesCount = likeCounts[reel.id] ?? reel.likes;
            const originalIndex = reelsList.findIndex(r => r.id === reel.id);

            return (
              <div
                role="button"
                tabIndex={0}
                key={reel.id}
                onClick={() => setActiveReelIndex(originalIndex >= 0 ? originalIndex : index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveReelIndex(originalIndex >= 0 ? originalIndex : index);
                  }
                }}
                className="group relative flex-none w-[230px] sm:w-[270px] h-[370px] min-h-[44px] rounded-2xl overflow-hidden border border-slate-200 dark:border-[#37474F] hover:border-[#FF6A00] focus:outline-none focus:ring-2 focus:ring-[#FF6A00] transition-all duration-300 cursor-pointer snap-start bg-[#182025] shadow-lg text-left active:scale-[0.98]"
              >
                {/* Thumbnail / Video Preview */}
                {reel.videoUrl && (reel.videoUrl.startsWith('data:video') || reel.videoUrl.startsWith('blob:') || reel.videoUrl.endsWith('.mp4')) ? (
                  <video
                    src={reel.videoUrl}
                    preload="none"
                    poster={reel.thumbnailUrl || DEFAULT_THUMBNAIL_URL}
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <img
                    src={reel.thumbnailUrl || DEFAULT_THUMBNAIL_URL}
                    alt={reel.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_THUMBNAIL_URL;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30 group-hover:via-black/20 transition-all" />

                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                  <span className="bg-black/75 backdrop-blur-md text-[10px] font-mono text-white font-bold px-2.5 py-1 rounded-full border border-slate-700/80 flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00B8D4] animate-ping" />
                    <span>{reel.sport}</span>
                  </span>

                  {reel.isUserUploaded ? (
                    <span className="bg-[#FF6A00] text-white font-black text-[9px] font-mono px-2.5 py-1 rounded-full uppercase tracking-wider shadow-[0_0_12px_rgba(255,106,0,0.5)]">
                      NEW
                    </span>
                  ) : (
                    <span className="bg-black/75 backdrop-blur-md text-[10px] font-mono text-slate-300 px-2 py-1 rounded-full flex items-center gap-1 border border-slate-700/80">
                      <Clock className="w-3 h-3 text-[#FFC857]" />
                      <span>{reel.duration}</span>
                    </span>
                  )}
                </div>

                {/* Center Play Button Icon on hover */}
                <div className="absolute inset-0 flex items-center justify-center z-10 opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-all">
                  <div className="w-12 h-12 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shadow-[0_0_20px_rgba(255,106,0,0.5)]">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Bottom Information Overlay */}
                <div className="absolute bottom-0 inset-x-0 p-3.5 z-10 flex flex-col justify-end">
                  {/* Athlete Header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <img
                      src={reel.avatarUrl}
                      alt={reel.athleteName}
                      className="w-7 h-7 rounded-full border border-[#FF6A00]/60 object-cover shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white truncate">{reel.athleteName}</span>
                        {reel.verified && <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />}
                      </div>
                      <span className="text-[10px] text-slate-300 block truncate font-mono">{reel.athleteRole}</span>
                    </div>
                  </div>

                  {/* Video Caption */}
                  <p className="text-xs font-bold text-white line-clamp-2 leading-tight mb-2.5">
                    {reel.title}
                  </p>

                  {/* Video Metric Meters Bar */}
                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-2 border-t border-white/20 font-mono bg-black/60 backdrop-blur-sm -mx-3.5 -mb-3.5 p-2.5 rounded-b-2xl">
                    <span className="flex items-center gap-1 text-slate-300 min-h-[44px]">
                      <Eye className="w-4 h-4 text-[#00B8D4]" />
                      <span>{reel.views}</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => toggleLike(reel.id, e)}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 transition-all cursor-pointer px-2.5 py-2 rounded-xl active:scale-95 ${
                        isLiked ? 'text-rose-400 font-bold bg-rose-500/20 border border-rose-500/40' : 'hover:text-rose-300 text-slate-300 bg-black/40 border border-white/20'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{likesCount}</span>
                    </button>

                    <span className="text-[10px] text-[#FFC857] font-bold flex items-center gap-1 min-h-[44px]">
                      <Clock className="w-3.5 h-3.5 text-[#FFC857]" />
                      <span>{reel.uploadedAt}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-50 dark:bg-[#1E282D] border border-slate-200 dark:border-[#37474F] text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FF6A00]/15 border border-[#FF6A00]/30 flex items-center justify-center mx-auto">
            <Video className="w-6 h-6 text-[#FF6A00]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#263238] dark:text-white uppercase font-mono">
              Be the first athlete to upload film today!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-300 max-w-sm mx-auto">
              Share your game tape, combine testing, or workout drills with recruiters.
            </p>
          </div>
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#FF6A00] text-white font-black text-xs uppercase tracking-wider shadow-md hover:bg-[#E05D00] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Upload Video Reel</span>
            </button>
          )}
        </div>
      )}

      {/* Fullscreen Swipe / Strolling Video Modal */}
      {currentActiveReel !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4">
          <div className="relative w-full max-w-md h-[92vh] max-h-[820px] bg-[#182025] rounded-3xl border border-slate-700 overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Top Bar */}
            <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/50 text-[#FF6A00] text-[10px] font-mono font-bold uppercase">
                  REEL {activeReelIndex! + 1} OF {reelsList.length}
                </span>
                <span className="text-xs text-slate-300 font-mono truncate max-w-[140px]">
                  {currentActiveReel.sport}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 bg-black/70 rounded-full text-white hover:bg-slate-800 transition-all cursor-pointer border border-slate-700"
                  title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-[#FF6A00]" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveReelIndex(null)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 bg-black/70 rounded-full text-white hover:bg-slate-800 transition-all cursor-pointer border border-slate-700"
                  title="Close Reel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Player Container */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              {(() => {
                const ytEmbed = getYouTubeEmbedUrl(currentActiveReel.videoUrl);
                if (ytEmbed) {
                  return (
                    <iframe
                      src={ytEmbed}
                      title={currentActiveReel.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }

                if (currentActiveReel.videoUrl || resolvedModalVideoSrc) {
                  return (
                    <video
                      src={resolvedModalVideoSrc || currentActiveReel.videoUrl}
                      poster={currentActiveReel.thumbnailUrl}
                      autoPlay
                      loop
                      playsInline
                      controls
                      muted={isMuted}
                      className="w-full h-full object-cover"
                    />
                  );
                }

                return (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <img
                      src={currentActiveReel.thumbnailUrl}
                      alt={currentActiveReel.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <a
                        href={currentActiveReel.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#FF6A00] text-white font-bold text-xs flex items-center gap-2 hover:bg-[#E05D00]"
                      >
                        <span>Open Video Link</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })()}

              {/* Side Floating Action Bar */}
              <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-20">
                {/* Like Button */}
                <button
                  onClick={() => toggleLike(currentActiveReel.id)}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className={`p-3 rounded-full bg-black/60 border border-slate-700 group-hover:scale-110 transition-all ${
                    likedReels[currentActiveReel.id] ? 'text-red-500 bg-red-500/10 border-red-500/50' : 'text-white'
                  }`}>
                    <Heart className={`w-6 h-6 ${likedReels[currentActiveReel.id] ? 'fill-red-500' : ''}`} />
                  </div>
                  <span className="text-xs font-bold text-white">
                    {likeCounts[currentActiveReel.id] ?? currentActiveReel.likes}
                  </span>
                </button>

                {/* Comment Button */}
                <button 
                  onClick={() => {
                    alert(`Comments on "${currentActiveReel.title}":\n\n1. "Elite performance! Very smooth mechanics 🔥"\n2. "Insane footwork and speed! Keep grinding, pure athleticism 💪🌟"`);
                  }}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="p-3 rounded-full bg-black/60 border border-slate-700 text-white group-hover:scale-110 transition-all">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white">
                    {currentActiveReel.commentsCount}
                  </span>
                </button>

                {/* Share Button */}
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: currentActiveReel.title,
                        url: currentActiveReel.videoUrl || window.location.href
                      }).catch(() => {});
                    } else {
                      navigator.clipboard?.writeText(currentActiveReel.videoUrl || window.location.href);
                      alert('Reel link copied to clipboard!');
                    }
                  }}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="p-3 rounded-full bg-black/60 border border-slate-700 text-white group-hover:scale-110 transition-all">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white">Share</span>
                </button>
              </div>

              {/* Vertical Navigation (Prev / Next Reel) Buttons */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
                <button
                  type="button"
                  disabled={activeReelIndex === 0}
                  onClick={handlePrevReel}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-full bg-black/70 border border-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-all cursor-pointer shadow-lg"
                  title="Previous Reel"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  disabled={activeReelIndex === reelsList.length - 1}
                  onClick={handleNextReel}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-full bg-black/70 border border-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FF6A00] hover:text-white transition-all cursor-pointer shadow-lg"
                  title="Next Reel"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              {/* Bottom Details Overlay inside Modal */}
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex flex-col justify-end pr-16">
                <div className="flex items-center gap-2.5 mb-2">
                  <img
                    src={currentActiveReel.avatarUrl}
                    alt={currentActiveReel.athleteName}
                    className="w-10 h-10 rounded-full border-2 border-[#FF6A00] object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black text-white">{currentActiveReel.athleteName}</h4>
                      {currentActiveReel.verified && <CheckCircle2 className="w-4 h-4 text-[#FF6A00]" />}
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {currentActiveReel.athleteRole} • <span className="text-[#FFC857] font-mono">{currentActiveReel.athleteClass}</span>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-100 font-medium line-clamp-2 leading-snug mb-3">
                  {currentActiveReel.title}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Eye className="w-3.5 h-3.5 text-[#00B8D4]" />
                      {currentActiveReel.views} views
                    </span>
                    <span className="text-slate-400 font-mono">
                      {currentActiveReel.uploadedAt}
                    </span>
                  </div>

                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReelIndex(null);
                        onNavigateTab('athletes');
                      }}
                      className="min-h-[44px] bg-[#FF6A00] text-white font-black px-4 py-2.5 rounded-xl text-xs hover:bg-[#E05D00] transition-colors cursor-pointer flex items-center justify-center"
                    >
                      View Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
