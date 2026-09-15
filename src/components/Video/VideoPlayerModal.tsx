import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Share2, 
  ExternalLink, 
  Bookmark, 
  BookmarkCheck, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Film, 
  GraduationCap, 
  UserCheck, 
  Sparkles, 
  Eye, 
  Layers, 
  Flame,
  Info,
  Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';
import { useAppStore, VideoModalPayload } from '../../store/useAppStore';
import { useToast } from '../../context/ToastContext';
import { triggerHaptic } from '../../lib/haptics';
import { getVideoProviderBadge, getVideoProviderName, getEmbedUrl } from '../../lib/videoParser';

export interface VideoPlayerModalProps {
  isOpen?: boolean;
  video?: VideoModalPayload | null;
  queue?: VideoModalPayload[];
  currentIndex?: number;
  onClose?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSelectVideo?: (index: number) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen: propIsOpen,
  video: propVideo,
  queue: propQueue,
  currentIndex: propCurrentIndex,
  onClose: propOnClose,
  onNext: propOnNext,
  onPrev: propOnPrev,
  onSelectVideo: propOnSelectVideo
}) => {
  const { showToast } = useToast();

  // Zustand Store Integration
  const storeActiveModal = useAppStore(state => state.activeModal);
  const storeActiveVideo = useAppStore(state => state.activeVideo);
  const storeVideoQueue = useAppStore(state => state.videoQueue);
  const storeActiveIndex = useAppStore(state => state.activeVideoIndex);
  const storeTheaterMode = useAppStore(state => state.theaterMode);
  const bookmarks = useAppStore(state => state.bookmarks);

  const closeVideoModal = useAppStore(state => state.closeVideoModal);
  const nextVideo = useAppStore(state => state.nextVideo);
  const prevVideo = useAppStore(state => state.prevVideo);
  const selectVideoFromQueue = useAppStore(state => state.selectVideoFromQueue);
  const toggleTheaterMode = useAppStore(state => state.toggleTheaterMode);
  const toggleBookmark = useAppStore(state => state.toggleBookmark);

  // Determine active state: Props take precedence, fall back to Zustand store
  const isStoreControlled = propIsOpen === undefined;
  const isOpen = isStoreControlled ? (storeActiveModal === 'video' && Boolean(storeActiveVideo)) : Boolean(propIsOpen);
  const currentVideo = propVideo !== undefined ? propVideo : storeActiveVideo;
  const queue = propQueue !== undefined ? propQueue : storeVideoQueue;
  const activeIndex = propCurrentIndex !== undefined ? propCurrentIndex : storeActiveIndex;

  // Local state
  const [activeTab, setActiveTab] = useState<'info' | 'queue'>('info');
  const [copied, setCopied] = useState<boolean>(false);
  const [isHoveringControls, setIsHoveringControls] = useState<boolean>(false);

  const handleClose = useCallback(() => {
    triggerHaptic('light');
    if (propOnClose) {
      propOnClose();
    } else {
      closeVideoModal();
    }
  }, [propOnClose, closeVideoModal]);

  const handleNext = useCallback(() => {
    triggerHaptic('light');
    if (propOnNext) {
      propOnNext();
    } else {
      nextVideo();
    }
  }, [propOnNext, nextVideo]);

  const handlePrev = useCallback(() => {
    triggerHaptic('light');
    if (propOnPrev) {
      propOnPrev();
    } else {
      prevVideo();
    }
  }, [propOnPrev, prevVideo]);

  const handleSelectQueueItem = useCallback((idx: number) => {
    triggerHaptic('light');
    if (propOnSelectVideo) {
      propOnSelectVideo(idx);
    } else {
      selectVideoFromQueue(idx);
    }
  }, [propOnSelectVideo, selectVideoFromQueue]);

  const videoId = currentVideo?.id || currentVideo?.videoUrl || '';
  const isBookmarked = Boolean(videoId && bookmarks.includes(videoId));

  const handleToggleBookmark = async () => {
    if (!videoId) return;
    triggerHaptic('medium');
    await toggleBookmark(videoId);
    if (isBookmarked) {
      showToast('info', 'Removed Bookmark', 'Video removed from your saved list');
    } else {
      showToast('success', 'Film Bookmarked', 'Highlight added to your scout board');
    }
  };

  const handleCopyLink = async () => {
    if (!currentVideo?.videoUrl) return;
    triggerHaptic('light');
    try {
      const shareUrl = `${window.location.origin}/watch?video=${encodeURIComponent(currentVideo.id || currentVideo.videoUrl)}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('success', 'Link Copied', 'Highlight link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'Copy Failed', 'Unable to copy link to clipboard');
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if typing in an input/textarea
      const activeEl = document.activeElement;
      if (activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheaterMode();
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleBookmark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, handleNext, handlePrev, toggleTheaterMode, handleToggleBookmark]);

  if (!isOpen || !currentVideo) return null;

  const embedInfo = getEmbedUrl(currentVideo.videoUrl);
  const providerBadge = getVideoProviderBadge(embedInfo.provider);
  const providerName = getVideoProviderName(embedInfo.provider);

  const athleteName = currentVideo.athleteName || currentVideo.userName || 'Verified Prospect';
  const sport = currentVideo.sport || 'Multi-Sport';
  const position = currentVideo.position || 'Prospect';
  const gradYear = currentVideo.gradYear || '';
  const highSchool = currentVideo.highSchool || '';
  const state = currentVideo.state || '';
  const profileUrl = currentVideo.userId ? `/profile/${currentVideo.userId}` : (currentVideo.profileUrl || '#');

  const hasMultipleInQueue = queue && queue.length > 1;

  return (
    <AnimatePresence>
      <div 
        id="video-player-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
      >
        {/* Backdrop click listener */}
        <div 
          className="fixed inset-0 cursor-pointer" 
          onClick={handleClose} 
          aria-label="Close video player"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`relative w-full ${
            storeTheaterMode 
              ? 'max-w-7xl h-[94vh]' 
              : 'max-w-6xl h-[90vh] max-h-[850px]'
          } bg-[#0b1120] border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(0,245,212,0.15)] overflow-hidden z-10 flex flex-col`}
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
        >
          {/* Top Bar / Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#0f172a] border-b border-slate-800/80 z-20 flex-shrink-0">
            {/* Athlete Info Left */}
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <Link 
                to={profileUrl} 
                onClick={handleClose}
                className="relative group/avatar flex-shrink-0"
              >
                <img
                  src={currentVideo.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={athleteName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-cyan-500/40 group-hover/avatar:border-cyan-400 transition-colors"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-cyan-500 text-black">
                  <UserCheck className="w-2.5 h-2.5" />
                </div>
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link 
                    to={profileUrl}
                    onClick={handleClose}
                    className="text-sm sm:text-base font-bold text-white hover:text-cyan-400 transition-colors truncate"
                  >
                    {athleteName}
                  </Link>
                  
                  {/* Provider Pill */}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${providerBadge.bg} ${providerBadge.text} ${providerBadge.border} flex items-center gap-1`}>
                    <span>{providerBadge.icon}</span>
                    <span>{providerName}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5 truncate">
                  <span className="text-cyan-300 font-bold">{sport}</span>
                  <span>•</span>
                  <span>{position}</span>
                  {gradYear && (
                    <>
                      <span>•</span>
                      <span className="text-amber-300">Class of '{gradYear.slice(-2)}</span>
                    </>
                  )}
                  {highSchool && (
                    <span className="hidden md:inline text-slate-500">• {highSchool}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Right */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Theater Mode Toggle */}
              <button
                type="button"
                id="video-theater-toggle-btn"
                onClick={toggleTheaterMode}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition-colors cursor-pointer"
                title={storeTheaterMode ? 'Standard View (T)' : 'Theater View (T)'}
              >
                {storeTheaterMode ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Normal</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Theater</span>
                  </>
                )}
              </button>

              {/* Bookmark Button */}
              <button
                type="button"
                id="video-bookmark-btn"
                onClick={handleToggleBookmark}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                }`}
                title={isBookmarked ? 'Saved to Bookmarks' : 'Bookmark Film (B)'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>

              {/* Share / Copy Link Button */}
              <button
                type="button"
                id="video-share-btn"
                onClick={handleCopyLink}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                title="Copy share link (S)"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {/* External Source Link */}
              <a
                href={currentVideo.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition-colors"
                title="Watch on original provider"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Source</span>
              </a>

              {/* Close Button */}
              <button
                type="button"
                id="video-modal-close-btn"
                onClick={handleClose}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/30 transition-all cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Close modal"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body: Video Player & Collapsible Sidebar */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-black">
            
            {/* Video Viewport Area */}
            <div className="relative flex-1 bg-black flex flex-col justify-center items-center overflow-hidden min-h-[300px]">
              
              {/* The Video Embed / Native Player */}
              <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
                <UniversalVideoPlayer
                  url={currentVideo.videoUrl}
                  title={currentVideo.title}
                  autoPlay={true}
                  className="w-full h-full max-h-full"
                  allowFullScreenModal={false}
                />
              </div>

              {/* Floating Carousel Navigation Overlays (When queue has > 1 items) */}
              {hasMultipleInQueue && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/70 hover:bg-cyan-500 text-white hover:text-black border border-white/20 hover:border-cyan-400 backdrop-blur-md transition-all cursor-pointer shadow-xl ${
                      isHoveringControls ? 'opacity-100' : 'opacity-0 md:opacity-40'
                    }`}
                    title="Previous Highlight (Left Arrow)"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/70 hover:bg-cyan-500 text-white hover:text-black border border-white/20 hover:border-cyan-400 backdrop-blur-md transition-all cursor-pointer shadow-xl ${
                      isHoveringControls ? 'opacity-100' : 'opacity-0 md:opacity-40'
                    }`}
                    title="Next Highlight (Right Arrow)"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Bottom Quick Control Bar */}
              <div className="w-full px-4 py-2.5 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-between gap-4 text-xs font-mono text-slate-400 z-10">
                <div className="flex items-center gap-2 truncate">
                  <Film className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="text-white font-bold truncate">{currentVideo.title}</span>
                </div>

                {hasMultipleInQueue && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Previous (Left Arrow)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <span className="text-slate-300 font-bold">
                      {activeIndex + 1} / {queue.length}
                    </span>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Next (Right Arrow)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar / Info Drawer */}
            <div className={`w-full ${storeTheaterMode ? 'lg:w-80' : 'lg:w-96'} bg-[#0f172a] border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col flex-shrink-0 h-auto lg:h-full max-h-[35vh] lg:max-h-full overflow-hidden`}>
              
              {/* Sidebar Tabs */}
              <div className="flex items-center border-b border-slate-800 bg-slate-900/60 p-2 gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'info'
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Scout Dossier</span>
                </button>

                {hasMultipleInQueue && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('queue')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'queue'
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Watch Queue ({queue.length})</span>
                  </button>
                )}
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* 1. INFO TAB */}
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    {/* Reel Title & Description */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                        Reel Title
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {currentVideo.title}
                      </h3>
                      {currentVideo.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {currentVideo.description}
                        </p>
                      )}
                    </div>

                    {/* Scout Attributes Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                      <div className="text-[11px] font-mono text-slate-400 font-bold uppercase flex items-center justify-between">
                        <span>Athlete Card</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-850">
                          <span className="text-[10px] text-slate-500 block">Sport</span>
                          <span className="text-white font-bold">{sport}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-850">
                          <span className="text-[10px] text-slate-500 block">Position</span>
                          <span className="text-white font-bold">{position}</span>
                        </div>
                        {gradYear && (
                          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-850">
                            <span className="text-[10px] text-slate-500 block">Class</span>
                            <span className="text-amber-300 font-bold">{gradYear}</span>
                          </div>
                        )}
                        {highSchool && (
                          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-850">
                            <span className="text-[10px] text-slate-500 block">Program</span>
                            <span className="text-white font-bold truncate block">{highSchool}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Links */}
                    <div className="space-y-2 pt-2">
                      <Link
                        to={profileUrl}
                        onClick={handleClose}
                        className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-cyan-500/10"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>View Full Athlete Profile</span>
                      </Link>

                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-700"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{copied ? 'Link Copied!' : 'Share Film Link'}</span>
                      </button>
                    </div>

                    {/* Keyboard Shortcuts Helper */}
                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850/80 text-[10px] font-mono text-slate-500 space-y-1">
                      <div className="font-bold text-slate-400 mb-1">Keyboard Shortcuts:</div>
                      <div className="flex justify-between">
                        <span>Next / Prev Video</span>
                        <span className="text-slate-300 font-bold">← / →</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Theater Mode</span>
                        <span className="text-slate-300 font-bold">T or F</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bookmark Reel</span>
                        <span className="text-slate-300 font-bold">B</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Close Modal</span>
                        <span className="text-slate-300 font-bold">Esc</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. QUEUE TAB */}
                {activeTab === 'queue' && hasMultipleInQueue && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
                      <span>Up Next in Feed</span>
                      <span className="text-cyan-400 font-bold">{queue.length} Reels</span>
                    </div>

                    {queue.map((item, idx) => {
                      const isCurrent = idx === activeIndex;
                      return (
                        <div
                          key={item.id || idx}
                          onClick={() => handleSelectQueueItem(idx)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                            isCurrent
                              ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md'
                              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                          }`}
                        >
                          {/* Play indicator / Index */}
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold flex-shrink-0 ${
                            isCurrent
                              ? 'bg-cyan-500 text-black'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isCurrent ? <Play className="w-3.5 h-3.5 fill-current" /> : idx + 1}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className={`text-xs font-bold truncate ${
                              isCurrent ? 'text-cyan-300' : 'text-white'
                            }`}>
                              {item.title}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {item.athleteName || item.userName} • {item.sport}
                            </div>
                          </div>

                          {/* Sport Badge */}
                          {item.gradYear && (
                            <span className="text-[10px] font-mono text-amber-400 font-semibold flex-shrink-0">
                              '{item.gradYear.slice(-2)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
