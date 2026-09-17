import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Sparkles, 
  Filter, 
  MessageSquare, 
  TrendingUp, 
  Video, 
  UserCheck, 
  Users, 
  ShieldAlert,
  Loader2,
  Trophy,
  Activity,
  Plus,
  Zap,
  Film,
  Star,
  CheckCircle2,
  RotateCcw,
  Compass,
  Bookmark
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc,
  arrayUnion, 
  arrayRemove,
  getDocs
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  safeSetDoc, 
  safeAddDoc, 
  safeUpdateDoc, 
  safeDeleteDoc, 
  isFirestoreQuotaExceeded, 
  isQuotaError, 
  markFirestoreQuotaExceeded 
} from '../../lib/firestoreQuotaGuard';
import { firestoreWriteQueue } from '../../services/firestoreWriteQueueService';
import { WriteQueueSyncBadge } from '../Common/WriteQueueSyncBadge';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { SocialPost, UserRole, SportType } from '../../types';
import { PostCard } from './PostCard';
import { CreatePostBox } from './CreatePostBox';
import { DirectMessagesModal } from './DirectMessagesModal';
import { TopAthletesSpotlightSlider } from './TopAthletesSpotlightSlider';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { detectVideoEmbed } from '../../lib/mediaEmbed';
import { getEmbedThumbnailUrl } from '../../lib/videoThumbnailGenerator';
import { DEFAULT_THUMBNAIL_URL } from '../../lib/constants';
import { getProductionData } from '../../lib/productionMode';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { SwipeNavigationHint } from '../Common/SwipeNavigationHint';

export type FeedMode = 'For You' | 'Following' | 'Top Recruits' | 'Verified Film';
export const FEED_MODES: { label: FeedMode; icon: React.ReactNode; desc: string }[] = [
  { label: 'For You', icon: <Sparkles className="w-3.5 h-3.5" />, desc: 'Algorithmic discovery' },
  { label: 'Following', icon: <Users className="w-3.5 h-3.5" />, desc: 'Athletes & scouts you follow' },
  { label: 'Top Recruits', icon: <Trophy className="w-3.5 h-3.5" />, desc: '5-star talent & D1 prospects' },
  { label: 'Verified Film', icon: <Film className="w-3.5 h-3.5" />, desc: 'Coach & combine verified tape' },
];

export const SPORT_PILLS = [
  'All Sports',
  'Basketball',
  "Girls' Flag Football",
  'Lacrosse',
  'Volleyball',
  'Soccer',
  'Track & Field'
];

const LOCAL_POSTS_KEY = 'j1p_local_social_posts';

export const deduplicatePosts = (postsArray: SocialPost[]): SocialPost[] => {
  const seen = new Set<string>();
  return postsArray.filter(post => {
    if (!post || !post.id || seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
};

export const getStoredLocalPosts = (): SocialPost[] => {
  try {
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error reading local posts from storage:', err);
    return [];
  }
};

export const saveLocalPost = (post: SocialPost): SocialPost[] => {
  try {
    const existing = getStoredLocalPosts();
    const updated = deduplicatePosts([post, ...existing]);
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('j1p-posts-updated'));
    return updated;
  } catch (err) {
    console.warn('Error saving local post to storage:', err);
    return [];
  }
};

export const updateStoredPost = (postId: string, updater: (post: SocialPost) => SocialPost): SocialPost[] => {
  try {
    const existing = getStoredLocalPosts();
    const updated = existing.map(p => p.id === postId ? updater(p) : p);
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Error updating stored post:', err);
    return [];
  }
};

interface SocialFeedViewProps {
  onOpenDM?: (targetUid: string, targetName: string) => void;
  refreshKey?: number;
  onRefreshComplete?: () => void;
  onOpenCreateModal?: () => void;
  selectedSportFilter?: string;
  onSportFilterChange?: (sport: string) => void;
}

export const SocialFeedView: React.FC<SocialFeedViewProps> = ({ 
  onOpenDM: externalOpenDM,
  refreshKey = 0,
  onRefreshComplete,
  onOpenCreateModal,
  selectedSportFilter,
  onSportFilterChange
}) => {
  const { user, profile } = useAuth();
  const currentUid = user?.uid || profile?.uid || 'demo-user';
  const currentName = user?.displayName || profile?.displayName || 'Sports Athlete';
  const currentAvatar = user?.photoURL || profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
  const currentRole = profile?.role || 'athlete';

  // State: Posts & Dual-Tier Filters
  const [posts, setPosts] = useState<SocialPost[]>(() => {
    const local = getStoredLocalPosts();
    return deduplicatePosts(local);
  });

  const [feedMode, setFeedMode] = useState<FeedMode>('For You');
  const [filterSport, setFilterSport] = useState<string>('All Sports');
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Swipe navigation across sport pills on mobile
  const { bindSwipeProps, swipeHint } = useSwipeGesture({
    categories: SPORT_PILLS,
    activeCategory: filterSport,
    onCategoryChange: (newCat) => handleSportChange(newCat)
  });

  const [isDMOpen, setIsDMOpen] = useState(false);
  const [dmTargetUser, setDmTargetUser] = useState<{
    uid: string;
    name: string;
    avatar?: string;
    role?: UserRole;
  } | null>(null);

  // Sync external filter changes
  useEffect(() => {
    if (selectedSportFilter) {
      setFilterSport(selectedSportFilter === 'All' ? 'All Sports' : selectedSportFilter);
    }
  }, [selectedSportFilter]);

  const handleSportChange = (sport: string) => {
    setFilterSport(sport);
    if (onSportFilterChange) {
      onSportFilterChange(sport);
    }
  };

  // Sync with local storage updates
  useEffect(() => {
    const handleLocalUpdate = () => {
      const local = getStoredLocalPosts();
      setPosts(prev => deduplicatePosts([...local, ...prev]));
    };

    window.addEventListener('j1p-posts-updated', handleLocalUpdate);
    return () => window.removeEventListener('j1p-posts-updated', handleLocalUpdate);
  }, []);

  // Firestore Social Posts Subscription
  useEffect(() => {
    if (refreshKey > 0) {
      setLoadingPosts(true);
    }

    try {
      const q = query(
        collection(db, 'socialPosts'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const local = getStoredLocalPosts();
        if (!snapshot.empty) {
          const fetchedPosts: SocialPost[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          })) as SocialPost[];
          setPosts(deduplicatePosts([...local, ...fetchedPosts]));
        } else {
          setPosts(deduplicatePosts(local));
        }
        setLoadingPosts(false);
        if (onRefreshComplete) onRefreshComplete();
      }, (error) => {
        console.warn('Firestore subscription error for socialPosts, using local feed state:', error);
        const local = getStoredLocalPosts();
        setPosts(prev => deduplicatePosts([...local, ...prev]));
        setLoadingPosts(false);
        if (onRefreshComplete) onRefreshComplete();
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error connecting to socialPosts collection:', err);
      const local = getStoredLocalPosts();
      setPosts(prev => deduplicatePosts([...local, ...prev]));
      setLoadingPosts(false);
      if (onRefreshComplete) onRefreshComplete();
    }
  }, [refreshKey]);

  // Fetch following list
  useEffect(() => {
    if (!currentUid) return;
    try {
      const q = query(
        collection(db, 'followers'),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const followedList: string[] = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.followerUid === currentUid) {
            followedList.push(data.targetUid);
          }
        });
        setFollowingUids(followedList);
      }, (err) => {
        console.warn('Followers listener fallback:', err);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('Followers setup error:', err);
    }
  }, [currentUid]);

  // Handle Post Creation
  const handleCreatePost = async (caption: string, imageUrl?: string, videoUrl?: string) => {
    const localPostId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const detectedVideoUrl = !videoUrl && caption ? detectVideoEmbed(caption)?.originalUrl : null;
    const finalVideoUrl = (videoUrl || detectedVideoUrl || '').trim();
    const finalThumbnailUrl = (finalVideoUrl ? getEmbedThumbnailUrl(finalVideoUrl) : null) || imageUrl || DEFAULT_THUMBNAIL_URL;

    const newPostData: SocialPost = {
      id: localPostId,
      authorUid: currentUid,
      authorName: currentName,
      authorAvatar: currentAvatar,
      authorRole: currentRole,
      authorSport: profile?.sport || 'Basketball',
      caption,
      imageUrl: imageUrl || '',
      videoUrl: finalVideoUrl,
      videoThumbnailUrl: finalThumbnailUrl,
      likes: [],
      likesCount: 0,
      comments: [],
      commentsCount: 0,
      sharesCount: 0,
      createdAt: new Date().toISOString()
    };

    saveLocalPost(newPostData);
    setPosts(prev => deduplicatePosts([newPostData, ...prev]));

    const postPayload = {
      authorUid: currentUid,
      authorName: currentName,
      authorAvatar: currentAvatar,
      authorRole: currentRole,
      authorSport: profile?.sport || 'Basketball',
      caption,
      imageUrl: imageUrl || '',
      videoUrl: finalVideoUrl,
      videoThumbnailUrl: finalThumbnailUrl,
      likes: [],
      likesCount: 0,
      comments: [],
      commentsCount: 0,
      sharesCount: 0,
      createdAt: new Date().toISOString()
    };

    firestoreWriteQueue.enqueuePost(localPostId, postPayload);
  };

  // Handle Like
  const handleLike = async (postId: string) => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const isLiked = targetPost.likes.includes(currentUid);
    const updatedLikes = isLiked
      ? targetPost.likes.filter(uid => uid !== currentUid)
      : [...targetPost.likes, currentUid];

    const updatedLikesCount = updatedLikes.length;

    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: updatedLikes, likesCount: updatedLikesCount } : p));
    updateStoredPost(postId, p => ({ ...p, likes: updatedLikes, likesCount: updatedLikesCount }));

    try {
      firestoreWriteQueue.enqueueLike(postId, updatedLikes, updatedLikesCount);

      if (!isLiked && targetPost.authorUid !== currentUid) {
        notificationService.sendLikeAlert({
          recipientUid: targetPost.authorUid,
          senderUid: currentUid,
          senderName: currentName,
          senderAvatar: currentAvatar,
          postId,
          postTitle: targetPost.caption?.slice(0, 40)
        }).catch(err => console.warn('Notification notice:', err));
      }
    } catch (err) {
      console.warn('Firestore like notice:', err);
    }
  };

  // Handle Reaction
  const handleReaction = async (postId: string, emoji: string) => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const currentReactions: Record<string, string[]> = targetPost.reactions || {};
    const existingUids = currentReactions[emoji] || [];
    const hasReacted = existingUids.includes(currentUid);

    const updatedUids = hasReacted
      ? existingUids.filter(uid => uid !== currentUid)
      : [...existingUids, currentUid];

    const updatedReactions = {
      ...currentReactions,
      [emoji]: updatedUids
    };

    if (updatedUids.length === 0) {
      delete updatedReactions[emoji];
    }

    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: updatedReactions } : p));
    updateStoredPost(postId, p => ({ ...p, reactions: updatedReactions }));

    try {
      firestoreWriteQueue.enqueueReaction(postId, updatedReactions);
    } catch (err) {
      console.warn('Firestore reaction notice:', err);
    }
  };

  // Handle Comment
  const handleComment = async (postId: string, text: string) => {
    const targetPost = posts.find(p => p.id === postId);
    const newComment = {
      id: `comment-${Date.now()}`,
      authorUid: currentUid,
      authorName: currentName,
      authorAvatar: currentAvatar,
      authorRole: currentRole,
      authorIsVerified: profile?.isVerified ?? false,
      text,
      createdAt: new Date().toISOString()
    };

    const currentComments = targetPost?.comments || [];
    const updatedComments = [...currentComments, newComment];

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: updatedComments,
          commentsCount: updatedComments.length
        };
      }
      return p;
    }));

    updateStoredPost(postId, p => ({
      ...p,
      comments: updatedComments,
      commentsCount: updatedComments.length
    }));

    try {
      firestoreWriteQueue.enqueueComment(postId, newComment);
    } catch (err) {
      console.warn('Firestore comment notice:', err);
    }
  };

  const handleLikeComment = async (postId: string, commentId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId && p.comments) {
        const updatedComments = p.comments.map(c => {
          if (c.id === commentId) {
            const likes = c.likes || [];
            const isLiked = likes.includes(currentUid);
            const newLikes = isLiked ? likes.filter(u => u !== currentUid) : [...likes, currentUid];
            return {
              ...c,
              likes: newLikes,
              likesCount: newLikes.length
            };
          }
          return c;
        });
        return { ...p, comments: updatedComments };
      }
      return p;
    }));
  };

  // Handle Follow
  const handleFollow = async (targetUid: string) => {
    const isCurrentlyFollowing = followingUids.includes(targetUid);
    const updated = isCurrentlyFollowing
      ? followingUids.filter(u => u !== targetUid)
      : [...followingUids, targetUid];

    setFollowingUids(updated);

    try {
      const followDocId = `${currentUid}_${targetUid}`;
      if (isCurrentlyFollowing) {
        safeDeleteDoc(doc(db, 'followers', followDocId)).catch(err => console.warn('Follow delete notice:', err));
      } else {
        safeSetDoc(doc(db, 'followers', followDocId), {
          followerUid: currentUid,
          followerName: currentName,
          targetUid,
          createdAt: new Date().toISOString()
        }).catch(err => console.warn('Follow add notice:', err));
      }
    } catch (err) {
      console.warn('Follow update notice:', err);
    }
  };

  const handleOpenDM = (targetUid: string, targetName: string, targetAvatar?: string, targetRole?: UserRole) => {
    if (externalOpenDM) {
      externalOpenDM(targetUid, targetName);
    } else {
      setDmTargetUser({
        uid: targetUid,
        name: targetName,
        avatar: targetAvatar,
        role: targetRole
      });
      setIsDMOpen(true);
    }
  };

  // DUAL-TIER FILTERING LOGIC
  const filteredPosts = posts.filter(post => {
    // Tier 1: Feed Mode
    if (feedMode === 'Following') {
      const isFollowed = followingUids.includes(post.authorUid) || post.authorUid === currentUid;
      if (!isFollowed) return false;
    } else if (feedMode === 'Top Recruits') {
      const captionText = (post.caption || '').toLowerCase();
      const isTop = post.isTopRecruit || 
                    post.authorIsVerified || 
                    (post.scoutRating && post.scoutRating >= 4) ||
                    captionText.includes('top recruit') || 
                    captionText.includes('5-star') || 
                    captionText.includes('d1') ||
                    captionText.includes('combine');
      if (!isTop) return false;
    } else if (feedMode === 'Verified Film') {
      const captionText = (post.caption || '').toLowerCase();
      const hasFilm = !!post.videoUrl || 
                      post.isVerifiedFilm || 
                      captionText.includes('film') ||
                      captionText.includes('tape') ||
                      captionText.includes('hudl') ||
                      captionText.includes('highlight');
      if (!hasFilm) return false;
    }

    // Tier 2: Sport Filter
    if (filterSport === 'All' || filterSport === 'All Sports') {
      return true;
    }

    const cleanFilter = filterSport.toLowerCase().replace(/['\s-]/g, '');
    const postSport = (post.authorSport || '').toLowerCase().replace(/['\s-]/g, '');
    const captionText = (post.caption || '').toLowerCase();

    return postSport.includes(cleanFilter) || 
           cleanFilter.includes(postSport) ||
           captionText.includes(filterSport.toLowerCase()) ||
           captionText.includes(cleanFilter);
  });

  const resetAllFilters = () => {
    setFeedMode('For You');
    handleSportChange('All Sports');
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-32">
      
      {/* Top Athletes Horizontal Spotlight */}
      <TopAthletesSpotlightSlider onOpenDM={handleOpenDM} />

      {/* STICKY TOP FILTER BAR WITH TWO DISTINCT FILTER TIERS */}
      <div className="sticky top-0 z-30 bg-[#161C22]/95 backdrop-blur-xl border border-[#2D3748] rounded-2xl p-2.5 sm:p-3 space-y-2.5 shadow-2xl transition-all">
        
        {/* TIER 1: FEED MODES ("For You", "Following", "Top Recruits", "Verified Film") */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-0.5">
          <div className="flex items-center gap-1.5 p-1 bg-[#1E2630] rounded-xl border border-[#2D3748] w-full sm:w-auto">
            {FEED_MODES.map((mode) => {
              const isActive = feedMode === mode.label;
              return (
                <button
                  key={mode.label}
                  onClick={() => setFeedMode(mode.label)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex-1 sm:flex-initial justify-center ${
                    isActive
                      ? 'bg-[#F59E0B] text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title={mode.desc}
                >
                  {mode.icon}
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <WriteQueueSyncBadge variant="compact" />
            <div className="text-[11px] text-slate-400 font-mono">
              <span className="text-[#00F2FE] font-bold">{filteredPosts.length}</span> Clips Active
            </div>
          </div>
        </div>

        {/* TIER 2: SPORT PILLS (All Sports, Basketball, Girls' Flag Football, Lacrosse, Volleyball, Soccer, Track & Field) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          {SPORT_PILLS.map((sport) => {
            const isActive = filterSport === sport;
            return (
              <button
                key={sport}
                onClick={() => handleSportChange(sport)}
                className={`min-h-[32px] px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.25)] font-black'
                    : 'bg-[#1E2630] border border-[#2D3748] text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {sport}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Create Post + Feed Column vs Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Main Feed Column (Full width on mobile, 2 cols on desktop) */}
        <div className="lg:col-span-2 space-y-5 w-full">
          
          {/* Streamlined Compact Create Post Input Bar */}
          <CreatePostBox onCreatePost={handleCreatePost} onOpenModal={onOpenCreateModal} />

          {/* Continuous Athletic Posts Feed */}
          <div className="min-h-[300px]">
            {loadingPosts ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3 bg-[#1E2630] rounded-2xl border border-[#2D3748]">
                <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
                <p className="text-xs font-mono uppercase tracking-widest text-slate-300">Syncing Athletic Feed & Film...</p>
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-5">
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    onComment={handleComment}
                    onLikeComment={handleLikeComment}
                    onReact={handleReaction}
                    onFollow={handleFollow}
                    isFollowing={followingUids.includes(post.authorUid)}
                    onOpenDM={handleOpenDM}
                  />
                ))}
              </div>
            ) : (
              /* ATHLETIC EMPTY STATE & POSTING FALLBACK BANNER */
              <div className="p-8 sm:p-12 rounded-3xl bg-[#1E2630] border border-[#2D3748] text-center text-slate-300 space-y-5 shadow-2xl relative overflow-hidden">
                <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(245,158,11,0.3)]">
                  <Film className="w-8 h-8 text-[#F59E0B]" />
                </div>
                
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="font-black text-white text-lg sm:text-xl uppercase italic tracking-tight font-sans">
                    Be the first athlete to upload film in <span className="text-[#F59E0B] not-italic">{filterSport}</span> today!
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">
                    College recruiters, high school coaches, and verified scouts are actively scouting talent. Upload your latest Hudl clip, combine tape, or workout reel to gain recruitment visibility.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (onOpenCreateModal) onOpenCreateModal();
                    }}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ UPLOAD GAME TAPE</span>
                  </button>

                  <button
                    onClick={resetAllFilters}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#161C22] hover:bg-[#2D3748] text-slate-300 hover:text-white border border-[#2D3748] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Sidebar: Active Network Stats & Scout Radar */}
        <div className="hidden lg:block space-y-6">
          
          {/* Active Network Stats Bento Card */}
          <div className="p-6 rounded-3xl bg-[#1E2630] border border-[#2D3748] shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
              <span className="font-mono uppercase tracking-wider">ATHLETIC NETWORK PULSE</span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="p-3 rounded-2xl bg-[#161C22] border border-[#2D3748] text-center">
                <div className="text-2xl font-black text-[#00F2FE]">1,480+</div>
                <div className="text-[10px] text-slate-400 uppercase mt-0.5">Active Prospects</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#161C22] border border-[#2D3748] text-center">
                <div className="text-2xl font-black text-[#F59E0B]">420+</div>
                <div className="text-[10px] text-slate-400 uppercase mt-0.5">Verified Scouts</div>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-300 leading-relaxed border-t border-[#2D3748]">
              ⚡ <strong className="text-white">Hudl & Combine Video Engine:</strong> Paste any Hudl, YouTube, or MP4 reel URL to showcase your speed and athletic metrics.
            </div>
          </div>

          {/* Featured Recruiter Spotlight */}
          <div className="p-6 rounded-3xl bg-[#1E2630] border border-[#2D3748] shadow-xl space-y-4">
            <div className="flex items-center justify-between text-white font-bold text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#10B981]" />
                <span className="font-mono uppercase tracking-wider">ACTIVE SCOUTS ON RADAR</span>
              </div>
              <span className="text-[10px] font-mono text-[#10B981] uppercase font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span>ONLINE</span>
              </span>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Coach Marcus Vance', role: 'Head Scout - D1 Talent', sport: 'Basketball', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', uid: 'coach-marcus' },
                { name: 'Maya Lin', role: 'Regional Talent Evaluator', sport: "Girls' Flag Football", avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80', uid: 'scout-maya' },
                { name: 'David Sterling', role: 'NCAA Recruiting Advisor', sport: 'Lacrosse', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', uid: 'scout-david' }
              ].map((recruiter) => (
                <div key={recruiter.uid} className="p-3 rounded-2xl bg-[#161C22] border border-[#2D3748] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={recruiter.avatar} alt={recruiter.name} className="w-10 h-10 rounded-xl object-cover border border-[#2D3748]" />
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1">
                        <span>{recruiter.name}</span>
                        <VerifiedBadge size="sm" />
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{recruiter.role}</div>
                      <div className="text-[10px] text-[#00F2FE] font-mono">{recruiter.sport}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDM(recruiter.uid, recruiter.name, recruiter.avatar, 'scout')}
                    className="p-2.5 rounded-xl bg-[#F59E0B]/20 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-slate-950 border border-[#F59E0B]/40 transition-all text-xs font-bold cursor-pointer"
                    title={`Send message to ${recruiter.name}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Direct Messaging Modal */}
      <DirectMessagesModal
        isOpen={isDMOpen}
        onClose={() => setIsDMOpen(false)}
        targetUser={dmTargetUser}
      />

      {/* FLOATING ACTION BUTTON FOR INSTANT FILM POSTING ON MOBILE & DESKTOP */}
      <button
        onClick={() => onOpenCreateModal && onOpenCreateModal()}
        className="fixed bottom-20 right-6 z-40 p-4 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black shadow-[0_0_25px_rgba(245,158,11,0.5)] border-2 border-slate-950 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 group"
        title="Upload Game Film & Highlights"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
        <span className="hidden sm:inline font-mono text-xs uppercase tracking-wider font-black">Upload Tape</span>
      </button>

    </div>
  );
};
