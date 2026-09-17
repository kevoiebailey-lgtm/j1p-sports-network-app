import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  RotateCcw, 
  Share2, 
  Zap, 
  Trophy, 
  MessageSquare,
  Sparkles,
  ExternalLink,
  Flame,
  Check
} from 'lucide-react';
import { LockerPost, ReactionType } from './types';
import { parseVideoUrl, getVideoProviderBadge, getVideoProviderName } from '../../lib/videoParser';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface VideoTheaterModalProps {
  post: LockerPost | null;
  isOpen: boolean;
  onClose: () => void;
  onReact?: (postId: string, type: ReactionType) => void;
}

export const VideoTheaterModal: React.FC<VideoTheaterModalProps> = ({
  post,
  isOpen,
  onClose,
  onReact
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const parsedVideo = post.videoUrl ? parseVideoUrl(post.videoUrl) : null;
  const providerBadge = parsedVideo ? getVideoProviderBadge(parsedVideo.provider) : null;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(post.videoUrl || window.location.href);
      setCopied(true);
      showToast('success', 'Link Copied', 'Video link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#090D16]/95 backdrop-blur-2xl p-2 sm:p-6 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Control Bar */}
        <div className="absolute top-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-b from-[#090D16] via-[#090D16]/80 to-transparent flex items-center justify-between px-4 sm:px-6 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={post.authorAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'}
              alt={post.authorName}
              className="w-10 h-10 rounded-xl object-cover border border-[#00B8D4]/50 shadow-md shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black text-white truncate">
                  {post.authorName}
                </span>
                {providerBadge && (
                  <span className={`px-2 py-0.5 rounded-lg ${providerBadge.bg} ${providerBadge.text} text-[10px] font-mono font-bold uppercase`}>
                    {getVideoProviderName(parsedVideo!.provider)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {(post.authorRole || 'ATHLETE').toUpperCase()} {post.authorSchool ? `• ${post.authorSchool}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="min-h-[48px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>

            <button
              onClick={onClose}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-white transition-all cursor-pointer shadow-lg active:scale-95"
              aria-label="Close video theater"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Video Display Stage */}
        <div className="relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-12 pt-20 pb-28">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl max-h-[72vh] flex items-center justify-center bg-black rounded-3xl overflow-hidden border border-[#24324F] shadow-2xl relative"
          >
            {parsedVideo ? (
              parsedVideo.provider === 'direct' ? (
                <video
                  src={parsedVideo.embedUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-[70vh] object-contain bg-black"
                />
              ) : (
                <div className={`w-full ${parsedVideo.isVertical ? 'aspect-[9/16] max-h-[70vh] max-w-sm mx-auto' : 'aspect-video w-full'}`}>
                  <iframe
                    src={`${parsedVideo.embedUrl}${parsedVideo.embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
                    title={`Highlight by ${post.authorName}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )
            ) : post.imageUrl ? (
              <img
                src={post.imageUrl}
                alt={post.caption}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            ) : (
              <div className="p-12 text-center text-slate-400">
                <p>No playable media stream found.</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom Floating Info Dock */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/90 to-transparent p-4 sm:p-6 z-20">
          <div className="max-w-4xl mx-auto bg-[#263238]/90 border border-[#24324F] rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[#F4F4F4] line-clamp-2">
                {post.caption}
              </p>
              {post.metrics && (
                <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-[#FFC857]">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>40-yd: {post.metrics.fortyYard || '4.45s'}</span>
                  <span>• Vert: {post.metrics.vertical || '38"'}</span>
                  <span>• GPA: {post.metrics.gpa || '3.8'}</span>
                </div>
              )}
            </div>

            {onReact && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onReact(post.id, 'hype')}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#FF8C00] text-white font-black text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,106,0,0.4)] active:scale-95 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>⚡ Hype ({post.reactions.hype || 0})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
