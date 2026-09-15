import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Flame, 
  Sparkles, 
  MessageSquare, 
  Share2, 
  UserPlus, 
  Check, 
  Trophy, 
  ExternalLink,
  ShieldCheck,
  Play,
  Maximize2,
  Tv
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LockerPost, ReactionType } from './types';
import { parseVideoUrl, getVideoProviderBadge, getVideoProviderName } from '../../lib/videoParser';
import { LockerReactionBar } from './LockerReactionBar';
import { LockerCommentsDrawer } from './LockerCommentsDrawer';
import { VideoTheaterModal } from './VideoTheaterModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface LockerVideoCardProps {
  post: LockerPost;
  onReact: (postId: string, type: ReactionType) => void;
  onAddToWatchlist?: (athleteId: string, athleteName: string) => void;
  isWatchlisted?: boolean;
  onRequireAuth: () => void;
}

export const LockerVideoCard: React.FC<LockerVideoCardProps> = ({
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
  const [isPlayingInline, setIsPlayingInline] = useState(false);

  const parsedVideo = parseVideoUrl(post.videoUrl);
  const providerBadge = parsedVideo ? getVideoProviderBadge(parsedVideo.provider) : null;
  const userRoleStr = (role as string) || (profile?.role as string) || '';
  const isScoutOrDirector = ['scout', 'coach', 'director', 'tournament_director', 'admin', 'organization'].includes(userRoleStr);

  const userReaction = user && post.userReactions ? post.userReactions[user.uid] : undefined;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(post.videoUrl || window.location.href);
      setCopied(true);
      showToast('success', 'Link Copied', 'Highlight link copied to your clipboard!');
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
      
      {/* 1. Author Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div 
          onClick={handleAuthorClick}
          className="flex items-center gap-3 min-w-0 cursor-pointer group"
        >
          <img
            src={post.authorAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'}
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
              {(post.authorRole || 'ATHLETE').toUpperCase()} {post.authorSchool ? `• ${post.authorSchool}` : ''} {post.authorClassYear ? `• Class of ${post.authorClassYear}` : ''}
            </p>
          </div>
        </div>

        {/* Scout Action: + Add to Watchlist */}
        {isScoutOrDirector && onAddToWatchlist && (
          <button
            onClick={() => onAddToWatchlist(post.authorId, post.authorName)}
            className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 ${
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

      {/* 2. Verified Laser Metrics Tag Pill */}
      {post.metrics && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 border border-[#FFC857]/40 text-[#FFC857] text-xs font-mono font-bold flex-wrap shadow-inner">
          <span className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-[#FFC857]" />
            <span>Laser Metrics:</span>
          </span>
          {post.metrics.fortyYard && (
            <span className="text-[#F4F4F4]">40-yd: <strong>{post.metrics.fortyYard}</strong></span>
          )}
          {post.metrics.vertical && (
            <span className="text-[#F4F4F4]">• Vert: <strong>{post.metrics.vertical}</strong></span>
          )}
          {post.metrics.height && (
            <span className="text-slate-300">• {post.metrics.height}</span>
          )}
          {post.metrics.weight && (
            <span className="text-slate-300">• {post.metrics.weight}</span>
          )}
          {post.metrics.gpa && (
            <span className="text-emerald-400">• GPA: {post.metrics.gpa}</span>
          )}
        </div>
      )}

      {/* 3. Post Caption */}
      <p className="text-xs sm:text-sm text-[#F4F4F4] leading-relaxed whitespace-pre-wrap">
        {post.caption}
      </p>

      {/* 4. Responsive Video / Highlight Embed */}
      {parsedVideo ? (
        <div className="relative rounded-2xl overflow-hidden bg-black border border-[#24324F] shadow-2xl group">
          
          {/* Provider Badge Tag */}
          {providerBadge && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <span className={`px-2 py-0.5 rounded-lg ${providerBadge.bg} ${providerBadge.text} border ${providerBadge.border} text-[10px] font-black font-mono uppercase tracking-wider backdrop-blur-md flex items-center gap-1 shadow-md`}>
                <span>{providerBadge.icon}</span>
                <span>{getVideoProviderName(parsedVideo.provider)}</span>
              </span>
            </div>
          )}

          {/* Fullscreen Theater Button on Video (48px Touch Target) */}
          <button
            onClick={() => setShowTheater(true)}
            className="absolute top-2.5 left-2.5 z-10 min-h-[48px] px-3.5 py-2.5 rounded-xl bg-black/80 hover:bg-[#00B8D4] text-white hover:text-[#090D16] border border-white/20 text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
            aria-label="Open Theater Mode"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Theater Mode</span>
          </button>

          {/* Video Player */}
          {parsedVideo.provider === 'direct' ? (
            <div className="relative w-full bg-black">
              <video
                src={parsedVideo.embedUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[480px] bg-black object-contain rounded-2xl"
              />
            </div>
          ) : (
            <div className={`w-full overflow-hidden bg-black ${parsedVideo.isVertical ? 'aspect-[9/16] max-h-[580px] max-w-sm mx-auto' : 'aspect-video'}`}>
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
          onClick={() => setShowTheater(true)}
          className="rounded-2xl overflow-hidden border border-[#24324F] max-h-96 bg-black cursor-pointer group relative"
        >
          <img
            src={post.imageUrl}
            alt="Highlight graphic"
            className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="px-3 py-1.5 rounded-xl bg-[#00B8D4] text-[#090D16] font-black text-xs font-mono uppercase flex items-center gap-1.5 shadow-lg">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>View Full Photo</span>
            </span>
          </div>
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

      {/* 6. Action Footer: Comment Drawer Trigger & Share Link */}
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
          title="Share Highlight"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copied ? 'Copied!' : 'Share'}</span>
        </button>
      </div>

      {/* Real-time Comments Drawer */}
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
