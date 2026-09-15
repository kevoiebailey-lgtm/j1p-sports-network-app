import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Share2, 
  UserPlus, 
  Check, 
  Trophy, 
  Sparkles, 
  Flame,
  Radio,
  Maximize2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LockerPost, ReactionType } from './types';
import { LockerReactionBar } from './LockerReactionBar';
import { LockerCommentsDrawer } from './LockerCommentsDrawer';
import { VideoTheaterModal } from './VideoTheaterModal';
import { parseVideoUrl } from '../../lib/videoParser';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface LockerChillCardProps {
  post: LockerPost;
  onReact: (postId: string, type: ReactionType) => void;
  onAddToWatchlist?: (athleteId: string, athleteName: string) => void;
  isWatchlisted?: boolean;
  onRequireAuth: () => void;
}

export const LockerChillCard: React.FC<LockerChillCardProps> = ({
  post,
  onReact,
  onAddToWatchlist,
  isWatchlisted = false,
  onRequireAuth
}) => {
  const { user, profile, role } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [showComments, setShowComments] = useState(false);
  const [showTheater, setShowTheater] = useState(false);
  const [copied, setCopied] = useState(false);

  const userRoleStr = (role as string) || (profile?.role as string) || '';
  const isScoutOrDirector = ['scout', 'coach', 'director', 'tournament_director', 'admin', 'organization'].includes(userRoleStr);
  const userReaction = user && post.userReactions ? post.userReactions[user.uid] : undefined;
  const parsedVideo = post.videoUrl ? parseVideoUrl(post.videoUrl) : null;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast('success', 'Link Copied', 'Discussion link copied to your clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAuthorClick = () => {
    if (post.authorId) {
      navigate(`/dashboard/athlete/profile`);
    }
  };

  return (
    <article className="w-full bg-[#263238] border border-[#24324F] rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5 transition-all duration-200 hover:border-[#00B8D4]/40 text-white">
      
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div 
          onClick={handleAuthorClick}
          className="flex items-center gap-3 min-w-0 cursor-pointer group"
        >
          <img
            src={post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
            alt={post.authorName}
            className="w-11 h-11 rounded-2xl object-cover border border-slate-600 group-hover:border-[#00B8D4] shadow-md shrink-0 transition-colors"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-black text-[#F4F4F4] group-hover:text-[#00B8D4] tracking-tight truncate transition-colors">
                {post.authorName}
              </span>
              {post.isVerifiedRecruit && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[#FFC857]/15 border border-[#FFC857]/50 text-[#FFC857] text-[10px] font-black uppercase tracking-wider">
                  ★ Verified
                </span>
              )}
              <span className="px-1.5 py-0.2 rounded bg-black/40 text-[10px] font-mono font-bold text-slate-300 border border-white/10">
                {post.sport}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono truncate">
              {(post.authorRole || 'ATHLETE').toUpperCase()} {post.authorSchool ? `• ${post.authorSchool}` : ''}
            </p>
          </div>
        </div>

        {/* Scout Action */}
        {isScoutOrDirector && onAddToWatchlist && post.authorRole === 'athlete' && (
          <button
            onClick={() => onAddToWatchlist(post.authorId, post.authorName)}
            className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 ${
              isWatchlisted
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'bg-[#FFC857]/15 hover:bg-[#FFC857]/25 text-[#FFC857] border border-[#FFC857]/40 hover:scale-[1.02]'
            }`}
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

      {/* 2. Verified Metrics Pill if available */}
      {post.metrics && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-black/50 border border-[#FFC857]/40 text-[#FFC857] text-xs font-mono font-bold flex-wrap shadow-inner">
          <Trophy className="w-3.5 h-3.5 text-[#FFC857]" />
          <span>Laser:</span>
          {post.metrics.fortyYard && <span className="text-[#F4F4F4]">40-yd: <strong>{post.metrics.fortyYard}</strong></span>}
          {post.metrics.vertical && <span className="text-[#F4F4F4]">• Vert: <strong>{post.metrics.vertical}</strong></span>}
          {post.metrics.gpa && <span className="text-emerald-400">• GPA: {post.metrics.gpa}</span>}
        </div>
      )}

      {/* 3. Post Content / Discussion Body */}
      <div className="text-sm text-[#F4F4F4] leading-relaxed whitespace-pre-wrap font-sans">
        {post.caption}
      </div>

      {/* 4. Embedded Media If Present */}
      {parsedVideo ? (
        <div className="relative rounded-2xl overflow-hidden bg-black border border-[#24324F] aspect-video group">
          <button
            onClick={() => setShowTheater(true)}
            className="absolute top-2.5 left-2.5 z-10 min-h-[48px] px-3.5 py-2.5 rounded-xl bg-black/80 hover:bg-[#00B8D4] text-white hover:text-[#090D16] border border-white/20 text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
            aria-label="Open Theater Mode"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Theater Mode</span>
          </button>
          <iframe
            src={parsedVideo.embedUrl}
            title="Embedded clip"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full object-cover border-0"
          />
        </div>
      ) : post.imageUrl ? (
        <div 
          onClick={() => setShowTheater(true)}
          className="rounded-2xl overflow-hidden border border-[#24324F] max-h-96 bg-black cursor-pointer group relative"
        >
          <img
            src={post.imageUrl}
            alt="Discussion graphic"
            className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300"
          />
        </div>
      ) : null}

      {/* 5. 4 Sports Micro-Reactions Bar */}
      <LockerReactionBar
        reactions={post.reactions}
        userReaction={userReaction}
        onReact={(type) => {
          if (!user) {
            onRequireAuth();
            return;
          }
          onReact(post.id, type);
        }}
      />

      {/* 6. Footer Actions */}
      <div className="flex items-center justify-between pt-1 text-xs text-slate-400 font-mono">
        <button
          onClick={() => setShowComments(true)}
          className="min-h-[48px] flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-[#00B8D4]" />
          <span>{post.commentsCount || 0} Replies</span>
        </button>

        <button
          onClick={handleShare}
          className="min-h-[48px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Share Discussion"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copied ? 'Copied!' : 'Share'}</span>
        </button>
      </div>

      {/* Comments Drawer */}
      <LockerCommentsDrawer
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        postId={post.id}
        postAuthorName={post.authorName}
        onRequireAuth={onRequireAuth}
      />

      {/* Video / Photo Theater Modal */}
      <VideoTheaterModal
        isOpen={showTheater}
        onClose={() => setShowTheater(false)}
        post={post}
        onReact={onReact}
      />

    </article>
  );
};
