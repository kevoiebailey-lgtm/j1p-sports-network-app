import React, { useEffect, useState, useCallback } from 'react';
import { 
  Play, 
  Film, 
  Plus, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Eye, 
  Tv, 
  UploadCloud,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  HighlightClip, 
  fetchLatestAthleteHighlight, 
  subscribeToLatestAthleteHighlight 
} from '../../services/mediaService';
import { useAppStore, VideoModalPayload } from '../../store/useAppStore';
import { VideoPlayerModal } from '../Video/VideoPlayerModal';
import { PostHighlightModal } from '../Video/PostHighlightModal';
import { triggerHaptic } from '../../lib/haptics';

export interface AthleteHighlightWidgetProps {
  athleteId?: string;
  athlete?: any;
  onUploadFilmClick?: () => void;
  className?: string;
  showViewAllLink?: boolean;
}

export const AthleteHighlightWidget: React.FC<AthleteHighlightWidgetProps> = ({
  athleteId,
  athlete,
  onUploadFilmClick,
  className = '',
  showViewAllLink = true
}) => {
  const navigate = useNavigate();
  const openVideoModal = useAppStore(state => state.openVideoModal);

  const [clip, setClip] = useState<HighlightClip | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Target athlete ID
  const effectiveId = athleteId || athlete?.uid || athlete?.id;

  useEffect(() => {
    setIsLoading(true);
    setImageError(false);

    // Initial load and real-time subscription
    const unsubscribe = subscribeToLatestAthleteHighlight(
      effectiveId,
      athlete,
      (latestClip) => {
        setClip(latestClip);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [effectiveId, athlete]);

  // Handle playing the video clip
  const handlePlayVideo = useCallback(() => {
    if (!clip?.videoUrl) return;
    triggerHaptic('medium');

    const modalPayload: VideoModalPayload = {
      id: clip.id,
      videoUrl: clip.videoUrl,
      playbackUrl: clip.playbackUrl || clip.videoUrl,
      embedUrl: clip.embedUrl,
      title: clip.title || 'Latest Verified Highlight',
      athleteName: clip.authorName || athlete?.displayName || 'Athlete',
      userName: clip.authorName || athlete?.displayName || 'Athlete',
      userId: clip.authorId || effectiveId,
      userAvatar: clip.authorAvatar || athlete?.avatarUrl || athlete?.photoURL,
      sport: clip.sport || athlete?.sport,
      position: athlete?.position,
      gradYear: athlete?.gradYear,
      thumbnailUrl: clip.thumbnailUrl || clip.posterUrl,
      duration: clip.duration,
      tag: clip.tag,
      tags: clip.tags,
      isVerified: clip.isVerified
    };

    // Open via universal Zustand store
    openVideoModal(modalPayload);
    // Also toggle local modal safeguard
    setIsLocalModalOpen(true);
  }, [clip, athlete, effectiveId, openVideoModal]);

  // Trigger media composer or upload flow
  const handleTriggerUpload = useCallback(() => {
    triggerHaptic('light');
    if (onUploadFilmClick) {
      onUploadFilmClick();
      return;
    }

    // Try dispatching global quick-post event
    try {
      window.dispatchEvent(new CustomEvent('app:open-quick-post', {
        detail: { initialSport: athlete?.sport || 'Football' }
      }));
    } catch (_) {}

    // Also open local film highlight modal as direct fallback
    setIsUploadModalOpen(true);
  }, [onUploadFilmClick, athlete]);

  // View all film page handler
  const handleViewAllFilm = useCallback(() => {
    triggerHaptic('light');
    navigate('/dashboard/athlete/film');
  }, [navigate]);

  // 1. Loading State Skeleton
  if (isLoading) {
    return (
      <div 
        id="athlete-highlight-skeleton"
        className={`bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-4 space-y-3 animate-pulse ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-white/[0.08] rounded-md" />
          <div className="h-3 w-20 bg-white/[0.05] rounded-md" />
        </div>
        <div className="relative rounded-xl overflow-hidden bg-black/60 aspect-video max-h-56 flex items-center justify-center border border-white/5">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Film className="w-6 h-6 text-white/20 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Graceful Zero-State (If no film exists anywhere)
  if (!clip || !clip.videoUrl) {
    return (
      <>
        <div 
          id="athlete-highlight-zero-state"
          className={`relative overflow-hidden bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-6 sm:p-7 text-center transition-all ${className}`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#00F0D0]/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          
          <div className="relative z-10 max-w-md mx-auto space-y-4">
            {/* Holographic Film Icon Crest */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#1C2230] to-[#0D1017] border border-white/10 flex items-center justify-center mx-auto shadow-xl">
              <Film className="w-7 h-7 text-[#00F0D0]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white tracking-tight uppercase">
                No Highlight Reel Uploaded Yet
              </h3>
              <p className="text-xs text-[#8E9BB0] leading-relaxed">
                Showcase your speed, playmaking, and varsity game tape to collegiate scouts and verified coaches.
              </p>
            </div>

            {/* Titanium Action Button */}
            <button
              type="button"
              onClick={handleTriggerUpload}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00F0D0] hover:bg-[#00d8bc] text-[#08090C] font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,208,0.25)] active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Upload Game Film</span>
            </button>
          </div>
        </div>

        {/* Highlight Post Composer Modal */}
        {isUploadModalOpen && (
          <PostHighlightModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            initialSport={athlete?.sport || 'Football'}
            onSuccess={() => {
              setIsUploadModalOpen(false);
              fetchLatestAthleteHighlight(effectiveId, athlete).then(setClip);
            }}
          />
        )}
      </>
    );
  }

  // 3. Dynamic Highlight Reel Card
  const fallbackPoster = 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop&q=80';
  const posterSource = !imageError && (clip.thumbnailUrl || clip.posterUrl) ? (clip.thumbnailUrl || clip.posterUrl) : fallbackPoster;

  // Formatting tags / pills
  const displayTags = clip.tags && clip.tags.length > 0 
    ? clip.tags.slice(0, 3) 
    : [clip.tag || (clip.sport ? `#${clip.sport}` : '#Highlight')];

  const videoTitle = clip.title || clip.caption || 'Latest Verified Highlight';

  return (
    <>
      <div 
        id="athlete-highlight-widget"
        className={`bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-4 sm:p-5 space-y-3 transition-all ${className}`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-[#00F0D0]/10 border border-[#00F0D0]/20 flex items-center justify-center shrink-0">
              <Play className="w-3.5 h-3.5 text-[#00F0D0] fill-current" />
            </div>
            <h2 className="text-sm font-black text-white tracking-tight uppercase truncate">
              Latest Highlight Clip
            </h2>
            {clip.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20 text-[10px] font-mono font-bold shrink-0">
                <ShieldCheck className="w-3 h-3" />
                VERIFIED
              </span>
            )}
          </div>

          {showViewAllLink && (
            <button
              type="button"
              onClick={handleViewAllFilm}
              className="text-xs text-[#00F0D0] hover:text-[#5ffff0] hover:underline font-bold font-mono cursor-pointer flex items-center gap-1 shrink-0 active:scale-[0.97] transition-all"
            >
              <span>View All Film</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Video Thumbnail Viewport */}
        <div 
          onClick={handlePlayVideo}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePlayVideo(); }}
          aria-label={`Play highlight: ${videoTitle}`}
          className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-64 group border border-white/10 cursor-pointer shadow-xl hover:border-[#00F0D0]/60 transition-all select-none focus:outline-none focus:ring-2 focus:ring-[#00F0D0]"
        >
          {/* Background Poster Image */}
          <img 
            src={posterSource} 
            alt={videoTitle}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90 group-hover:brightness-100"
          />

          {/* Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#08090C]/90 via-black/20 to-black/30 pointer-events-none" />

          {/* Top Inset Badges (Duration & Source) */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 flex-wrap">
              {displayTags.map((tagItem, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-[#00F0D0]"
                >
                  {tagItem.startsWith('#') ? tagItem : `#${tagItem}`}
                </span>
              ))}
            </div>

            {clip.duration && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-white">
                <Clock className="w-2.5 h-2.5 text-[#00F0D0]" />
                {clip.duration}
              </span>
            )}
          </div>

          {/* Center Glowing Play Crest */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#00F0D0] flex items-center justify-center text-[#08090C] font-black shadow-[0_0_30px_rgba(0,240,208,0.7)] group-hover:scale-110 group-active:scale-95 transition-transform duration-200">
              <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
            </div>
          </div>

          {/* Bottom Info Bar Overlay */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-3 text-xs text-white bg-[#12151C]/90 px-3.5 py-2.5 rounded-xl backdrop-blur-md border border-white/10 shadow-lg pointer-events-none">
            <div className="min-w-0">
              <p className="font-bold text-white text-xs truncate">
                {videoTitle}
              </p>
              {clip.authorName && (
                <p className="text-[10px] text-[#8E9BB0] truncate font-mono">
                  {clip.authorName} {clip.sport ? `• ${clip.sport}` : ''}
                </p>
              )}
            </div>

            {clip.viewsCount !== undefined && clip.viewsCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#8E9BB0] shrink-0">
                <Eye className="w-3 h-3 text-[#00F0D0]" />
                {clip.viewsCount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Local Video Player Modal Safeguard */}
      {isLocalModalOpen && clip?.videoUrl && (
        <VideoPlayerModal
          isOpen={isLocalModalOpen}
          video={{
            id: clip.id,
            videoUrl: clip.videoUrl,
            playbackUrl: clip.playbackUrl || clip.videoUrl,
            embedUrl: clip.embedUrl,
            title: videoTitle,
            athleteName: clip.authorName || athlete?.displayName || 'Athlete',
            userName: clip.authorName || athlete?.displayName || 'Athlete',
            userId: clip.authorId || effectiveId,
            userAvatar: clip.authorAvatar || athlete?.avatarUrl || athlete?.photoURL,
            sport: clip.sport || athlete?.sport,
            position: athlete?.position,
            thumbnailUrl: posterSource,
            duration: clip.duration,
            tag: clip.tag,
            tags: clip.tags
          }}
          onClose={() => setIsLocalModalOpen(false)}
        />
      )}

      {/* Highlight Post Composer Modal */}
      {isUploadModalOpen && (
        <PostHighlightModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          initialSport={athlete?.sport || 'Football'}
          onSuccess={() => {
            setIsUploadModalOpen(false);
            fetchLatestAthleteHighlight(effectiveId, athlete).then(setClip);
          }}
        />
      )}
    </>
  );
};
