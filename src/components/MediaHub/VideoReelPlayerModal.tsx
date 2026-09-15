import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Bookmark, 
  Share2, 
  Check, 
  Calendar, 
  MapPin, 
  Film, 
  Tv, 
  User, 
  CheckCircle2, 
  ChevronRight, 
  RotateCcw, 
  Maximize, 
  Sparkles,
  Gauge,
  Heart,
  MessageSquare,
  Clock,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaVaultItem } from '../../types/mediaVault';
import { parseVideoUrl } from '../../lib/videoEmbedUtils';

interface VideoReelPlayerModalProps {
  item: MediaVaultItem | null;
  onClose: () => void;
  onTogglePin: (item: MediaVaultItem) => void;
  onToggleLike?: (itemId: string) => void;
  isLiked?: boolean;
  onNavigateTab?: (tab: string) => void;
}

export const VideoReelPlayerModal: React.FC<VideoReelPlayerModalProps> = ({
  item,
  onClose,
  onTogglePin,
  onToggleLike,
  isLiked = false,
  onNavigateTab
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [comments, setComments] = useState<{ name: string; role: string; text: string; time: string }[]>([
    { name: 'Coach Williams', role: 'D1 Scout', text: 'Elite change of direction and burst off the edge.', time: '2h ago' },
    { name: 'Jordan Hayes', role: 'Varsity Athlete', text: 'Great footwork on that 2nd clip!', time: '4h ago' }
  ]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Speed options for athletic mechanics breakdown
  const speedOptions = [
    { speed: 0.5, label: '0.5x Slow-Mo' },
    { speed: 0.75, label: '0.75x' },
    { speed: 1.0, label: '1.0x Normal' },
    { speed: 1.25, label: '1.25x' },
    { speed: 1.5, label: '1.5x' },
    { speed: 2.0, label: '2.0x Fast' }
  ];

  // Parse video source
  const videoInfo = item ? parseVideoUrl(item.mediaUrl) : null;
  const isDirectNative = videoInfo?.isDirectFile || videoInfo?.type === 'native';

  // Apply playback speed to video element
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' && isDirectNative) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isDirectNative]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.muted = isMuted;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const totalDuration = videoRef.current.duration;
      if (totalDuration > 0) {
        setBufferedPercent(Math.min(100, Math.round((bufferedEnd / totalDuration) * 100)));
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyShareLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/media?v=${encodeURIComponent(item?.id || '')}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setComments(prev => [
      {
        name: 'You (Verified Prospect)',
        role: 'Athlete Member',
        text: commentText.trim(),
        time: 'Just now'
      },
      ...prev
    ]);
    setCommentText('');
  };

  if (!item) return null;

  const isPinned = !!item.isPinnedToProfile;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl">
        {/* Top Header */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 sm:p-5 bg-gradient-to-b from-black/90 to-transparent">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-xl bg-[#00F2FE]/20 border border-[#00F2FE]/40 text-[#00F2FE] text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              {item.type === 'video_reel' ? <Film className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
              <span>{item.type === 'video_reel' ? 'HIGHLIGHT REEL' : 'RAW GAME TAPE'}</span>
            </div>
            <span className="text-xs font-mono text-slate-300 hidden md:inline truncate max-w-sm">
              {item.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onTogglePin(item)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isPinned
                  ? 'bg-[#F59E0B] text-slate-950 border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-[#1E2630] text-slate-300 hover:text-white border-[#2D3748]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isPinned ? 'fill-slate-950' : ''}`} />
              <span className="hidden sm:inline">{isPinned ? 'Pinned to Profile' : 'Pin to Profile'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1E2630] hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-[#2D3748] transition-all cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="w-full h-full pt-16 flex flex-col lg:flex-row overflow-hidden">
          {/* Video Player Column */}
          <div className="flex-1 relative flex flex-col items-center justify-center p-3 sm:p-6 bg-black/40">
            <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-[#161C22] border border-[#2D3748] shadow-2xl relative group">
              {isDirectNative ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoInfo.embedUrl || item.mediaUrl}
                    poster={item.thumbnailUrl}
                    playsInline
                    autoPlay
                    muted={isMuted}
                    loop
                    preload="metadata"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onProgress={handleProgress}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => {
                      setIsBuffering(false);
                      setIsPlaying(true);
                    }}
                    onPause={() => setIsPlaying(false)}
                    onError={(e) => {
                      console.warn('⚠️ MediaHub video encountered load issue, playing fallback stream.');
                      const v = e.currentTarget as HTMLVideoElement;
                      if (!v.dataset.hasFallback) {
                        v.dataset.hasFallback = 'true';
                        v.src = 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-40866-large.mp4';
                        v.play().catch(() => {});
                      }
                    }}
                    onClick={togglePlay}
                    className="w-full h-full object-contain cursor-pointer"
                  />

                  {/* Buffering Spinner */}
                  {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                      <div className="w-10 h-10 border-4 border-[#00F2FE]/30 border-t-[#00F2FE] rounded-full animate-spin" />
                    </div>
                  )}

                  {/* On-Screen Video Controls Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-95 group-hover:opacity-100 transition-opacity space-y-2">
                    {/* Scrubber Bar */}
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        step={0.1}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
                      />
                    </div>

                    {/* Bottom Controls Row */}
                    <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlay}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-[#00F2FE] hover:text-slate-950 text-white transition-colors cursor-pointer"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>

                        <button
                          onClick={toggleMute}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
                        >
                          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#00F2FE]" />}
                        </button>

                        <span className="text-[11px] text-slate-300">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      {/* Speed Badge */}
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded bg-[#00F2FE]/20 text-[#00F2FE] text-[10px] font-bold">
                          {playbackSpeed}x Speed
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Embedded Video Player (YouTube, Vimeo, Hudl) */
                <iframe
                  src={`${videoInfo?.embedUrl}?autoplay=1`}
                  title={item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              )}
            </div>

            {/* ATHLETIC MECHANICS SPEED CONTROLS TOOLBAR */}
            <div className="w-full max-w-5xl mt-3 p-3 rounded-2xl bg-[#1E2630] border border-[#2D3748] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <Gauge className="w-4 h-4 text-[#00F2FE]" />
                <span className="font-bold text-white uppercase">Mechanics Analysis Speed:</span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">(Slow-mo footwork & release breakdown)</span>
              </div>

              {/* Speed Buttons Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {speedOptions.map((opt) => (
                  <button
                    key={opt.speed}
                    onClick={() => handleSpeedChange(opt.speed)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                      playbackSpeed === opt.speed
                        ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.4)] scale-[1.03]'
                        : 'bg-[#161C22] text-slate-300 hover:text-white hover:bg-[#283340] border border-[#2D3748]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Video Details, Tagged Prospects & Notes */}
          <div className="w-full lg:w-96 bg-[#161C22] border-t lg:border-t-0 lg:border-l border-[#2D3748] h-full overflow-y-auto p-5 space-y-5 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#00F2FE]/20 text-[#00F2FE] text-xs font-mono font-bold uppercase">
                    {item.sport}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-black/50 text-[#F59E0B] border border-[#F59E0B]/30 text-xs font-mono font-bold">
                    {item.resolution}
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                  {item.title}
                </h2>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Event & Venue Info */}
              <div className="p-3.5 rounded-2xl bg-[#1E2630] border border-[#2D3748] space-y-2 text-xs font-mono">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Showcase Event</div>
                    <div className="text-slate-200">{item.eventName}</div>
                    <div className="text-[11px] text-slate-400">{item.eventDate}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2 border-t border-[#2D3748]">
                  <MapPin className="w-4 h-4 text-[#00F2FE] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Venue / Matchup</div>
                    <div className="text-slate-200">{item.venue}</div>
                    {item.opponents && (
                      <div className="text-[11px] text-slate-400 italic">{item.opponents}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tagged Prospects */}
              {item.taggedAthletes && item.taggedAthletes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#00F2FE]" />
                    <span>Featured Prospects</span>
                  </div>

                  <div className="space-y-1.5">
                    {item.taggedAthletes.map((athlete, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#1E2630] border border-[#2D3748]"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={athlete.avatar}
                            alt={athlete.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-[#2D3748]"
                          />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1">
                              <span>{athlete.name}</span>
                              <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {athlete.position} • {athlete.school} • '{athlete.gradYear}
                            </div>
                          </div>
                        </div>

                        {onNavigateTab && (
                          <button
                            onClick={() => {
                              onClose();
                              onNavigateTab('athletes');
                            }}
                            className="text-[10px] font-mono text-[#F59E0B] hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Profile</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scout & Recruiter Film Notes */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Scout Evaluation Notes & Chat</span>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto no-scrollbar pr-1">
                  {comments.map((c, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#1E2630] border border-[#2D3748] text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-white">{c.name} <span className="text-[#00F2FE]">({c.role})</span></span>
                        <span className="text-slate-400">{c.time}</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{c.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Add scout observation..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#1E2630] border border-[#2D3748] text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#00F2FE]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-[#00F2FE] hover:bg-[#00D2DD] text-slate-950 font-bold text-xs font-mono cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-[#2D3748] flex items-center gap-2">
              <button
                onClick={() => onTogglePin(item)}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isPinned
                    ? 'bg-[#F59E0B] text-slate-950 border-[#F59E0B]'
                    : 'bg-[#1E2630] text-slate-300 hover:text-white border-[#2D3748]'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isPinned ? 'fill-slate-950' : ''}`} />
                <span>{isPinned ? 'Pinned to Profile' : 'Pin to Profile'}</span>
              </button>

              <button
                onClick={handleCopyShareLink}
                className="py-2.5 px-3 rounded-xl bg-[#1E2630] hover:bg-[#283340] text-slate-300 hover:text-white border border-[#2D3748] text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    <span className="text-[#10B981]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
