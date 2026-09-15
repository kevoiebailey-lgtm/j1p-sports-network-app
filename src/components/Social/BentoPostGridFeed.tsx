import React, { useState } from 'react';
import { 
  Flame, 
  Users, 
  Sparkles, 
  Heart, 
  MessageSquare, 
  Share2, 
  CheckCircle2, 
  Trophy, 
  Play, 
  TrendingUp,
  Bookmark
} from 'lucide-react';
import { motion } from 'framer-motion';
import { DEFAULT_THUMBNAIL_URL } from '../../lib/constants';
import { FuturisticReactionBar } from './FuturisticReactionBar';

export interface BentoPostItem {
  id: string;
  playerName: string;
  teamName: string;
  avatarUrl: string;
  isVerified?: boolean;
  mediaType: 'video' | 'image';
  mediaUrl: string;
  statsSnippet: string; // e.g. "4 Pass TDs | 250 Yds"
  caption: string;
  likesCount: number;
  commentsCount: number;
  timeAgo: string;
  category: 'trending' | 'following' | 'all';
}

const SAMPLE_BENTO_POSTS: BentoPostItem[] = [
  {
    id: 'b1',
    playerName: 'Maya Lin',
    teamName: 'East Elite QB',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    isVerified: true,
    mediaType: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-4043-large.mp4',
    statsSnippet: '4 Pass TDs | 280 Pass Yds',
    caption: 'Clean pocket protection and 4th quarter touchdown drive during state quarterfinals!',
    likesCount: 540,
    commentsCount: 42,
    timeAgo: '2h ago',
    category: 'trending'
  },
  {
    id: 'b2',
    playerName: 'Marcus Carter',
    teamName: 'Newark Ballers',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    isVerified: true,
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
    statsSnippet: '32 PTS | 8 AST | 5 REB',
    caption: 'Tournament MVP honors in the Tri-State Championship! Massive respect to the team.',
    likesCount: 890,
    commentsCount: 61,
    timeAgo: '4h ago',
    category: 'trending'
  },
  {
    id: 'b3',
    playerName: 'Coach Vance',
    teamName: 'Tri-State Academy',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    isVerified: false,
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=800&auto=format&fit=crop&q=80',
    statsSnippet: '12-0 Undefeated Season',
    caption: 'Film breakdown session locked in for Friday. Scouting report shared in drive.',
    likesCount: 310,
    commentsCount: 19,
    timeAgo: '6h ago',
    category: 'following'
  },
  {
    id: 'b4',
    playerName: 'Jordan Lee',
    teamName: 'Gators WR',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    isVerified: true,
    mediaType: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-basketball-players-in-a-game-4042-large.mp4',
    statsSnippet: '180 Rec Yds | 2 TDs',
    caption: 'One-handed catch on 3rd & long! Highlighting the athleticism.',
    likesCount: 670,
    commentsCount: 34,
    timeAgo: '1d ago',
    category: 'following'
  }
];

export interface BentoPostGridFeedProps {
  onOpenCommentModal?: (postId: string) => void;
}

export const BentoPostGridFeed: React.FC<BentoPostGridFeedProps> = ({ onOpenCommentModal }) => {
  const [filter, setFilter] = useState<'all' | 'trending' | 'following'>('all');
  const [posts, setPosts] = useState<BentoPostItem[]>(SAMPLE_BENTO_POSTS);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  const filteredPosts = posts.filter(p => {
    if (filter === 'all') return true;
    return p.category === filter;
  });

  const toggleLike = (id: string) => {
    setLikedPosts(prev => {
      const isLiked = !prev[id];
      setPosts(list =>
        list.map(p =>
          p.id === id ? { ...p, likesCount: p.likesCount + (isLiked ? 1 : -1) } : p
        )
      );
      return { ...prev, [id]: isLiked };
    });
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Filter Horizontal Pills */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-red-600 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-[#212A31] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Feed
          </button>

          <button
            onClick={() => setFilter('trending')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'trending'
                ? 'bg-red-600 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-[#212A31] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Trending</span>
          </button>

          <button
            onClick={() => setFilter('following')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'following'
                ? 'bg-red-600 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-[#212A31] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Following</span>
          </button>
        </div>

        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
          {filteredPosts.length} Highlights
        </span>
      </div>

      {/* Glassmorphic Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {filteredPosts.map((post, idx) => {
          const isLiked = !!likedPosts[post.id];
          const isFeatured = idx === 0 && filter === 'all'; // Span larger for first card

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              className={`rounded-3xl bg-[#212A31]/60 border border-slate-800/80 backdrop-blur-xl p-4 sm:p-5 flex flex-col justify-between hover:border-red-600/40 transition-all shadow-lg group ${
                isFeatured ? 'md:col-span-2' : ''
              }`}
            >
              <div>
                {/* Header: Player Name & Team */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={post.avatarUrl}
                      alt={post.playerName}
                      className="w-10 h-10 rounded-full object-cover border border-red-600/40"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="text-xs font-black text-white flex items-center gap-1 group-hover:text-red-500 transition-colors">
                        {post.playerName}
                        {post.isVerified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                        )}
                      </h4>
                      <p className="text-[10px] font-medium text-slate-400">
                        @{post.teamName} • {post.timeAgo}
                      </p>
                    </div>
                  </div>

                  {/* Stats Snippet Pill */}
                  <div className="px-2.5 py-1 rounded-full bg-red-600/10 border border-red-600/30 text-red-500 text-[10px] font-bold tracking-tight shadow-inner">
                    ⚡️ {post.statsSnippet}
                  </div>
                </div>

                {/* Caption */}
                <p className="text-xs text-slate-200 mb-3 font-medium leading-relaxed">
                  {post.caption}
                </p>

                {/* Media Container */}
                <div className="relative rounded-2xl overflow-hidden bg-[#212A31] border border-slate-800 mb-4 max-h-[380px] flex items-center justify-center">
                  {post.mediaType === 'video' ? (
                    <div className="relative w-full h-full group/video">
                      <video
                        src={post.mediaUrl}
                        poster={DEFAULT_THUMBNAIL_URL}
                        controls
                        playsInline
                        onError={(e) => {
                          const v = e.currentTarget as HTMLVideoElement;
                          if (!v.dataset.hasFallback) {
                            v.dataset.hasFallback = 'true';
                            v.src = 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-40866-large.mp4';
                          }
                        }}
                        className="w-full max-h-[340px] object-cover"
                      />
                    </div>
                  ) : (
                    <img
                      src={post.mediaUrl || DEFAULT_THUMBNAIL_URL}
                      alt={post.playerName}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_THUMBNAIL_URL;
                      }}
                      className="w-full max-h-[340px] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>

                {/* Futuristic Athletic Reaction Bar */}
                <div className="mb-3">
                  <FuturisticReactionBar
                    postId={post.id}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Quick Interaction Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-slate-400 text-xs">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                      isLiked ? 'text-rose-500' : 'hover:text-rose-400'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500' : ''}`} />
                    <span>{post.likesCount}</span>
                  </button>

                  <button
                    onClick={() => onOpenCommentModal && onOpenCommentModal(post.id)}
                    className="flex items-center gap-1.5 font-bold hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.commentsCount}</span>
                  </button>

                  <button
                    onClick={async () => {
                      const shareUrl = `${window.location.origin}/social#post-${post.id}`;
                      const shareData = {
                        title: `${post.playerName} on Just1Play`,
                        text: post.caption || `Check out ${post.playerName}'s post on Just1Play!`,
                        url: shareUrl
                      };
                      if (navigator.share) {
                        try {
                          await navigator.share(shareData);
                          return;
                        } catch (err: any) {
                          if (err.name === 'AbortError') return;
                        }
                      }
                      if (navigator.clipboard) {
                        try {
                          await navigator.clipboard.writeText(shareUrl);
                          alert('Post link copied to clipboard!');
                        } catch {
                          // ignore
                        }
                      }
                    }}
                    className="flex items-center gap-1.5 font-bold hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>

                <button className="text-slate-500 hover:text-red-500 transition-colors cursor-pointer">
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BentoPostGridFeed;
