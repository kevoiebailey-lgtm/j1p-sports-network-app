'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ExternalLink,
  Share2,
  AlertCircle,
  Film,
  Sparkles,
  RotateCcw,
  FastForward,
  Rewind,
  Eye,
  Check,
  ChevronDown,
  Gauge,
  Sliders,
  Radio
} from 'lucide-react';
import { parseVideoUrl, getEmbedUrl, getVideoProviderBadge, getVideoProviderName, type VideoProvider } from '@/src/lib/videoParser';

export interface UniversalVideoPlayerProps {
  url: string;
  title?: string;
  athleteName?: string;
  sport?: string;
  posterUrl?: string;
  isVertical?: boolean;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  showControls?: boolean;
  allowFullScreenModal?: boolean;
  playOnViewport?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export function UniversalVideoPlayer({
  url,
  title = 'Game Film & Highlight Reel',
  athleteName,
  sport,
  posterUrl,
  isVertical = false,
  className = '',
  autoPlay = false,
  muted = true,
  loop = false,
  showControls = true,
  allowFullScreenModal = true,
  playOnViewport = true,
  onEnded,
  onTimeUpdate,
  onPlayStateChange
}: UniversalVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isMuted, setIsMuted] = useState<boolean>(muted);
  const [volume, setVolume] = useState<number>(muted ? 0 : 1);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedEnd, setBufferedEnd] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parsing video provider & embed metadata
  const embedInfo = useMemo(() => {
    return getEmbedUrl(url);
  }, [url]);

  const parsedData = useMemo(() => {
    return parseVideoUrl(url);
  }, [url]);

  const providerBadge = useMemo(() => {
    return getVideoProviderBadge(embedInfo.provider);
  }, [embedInfo.provider]);

  const providerName = useMemo(() => {
    return getVideoProviderName(embedInfo.provider);
  }, [embedInfo.provider]);

  const effectiveIsVertical = isVertical || embedInfo.isVertical || parsedData?.isVertical || false;

  // Viewport Intersection Auto-Play for direct videos
  useEffect(() => {
    if (!playOnViewport || !containerRef.current || !embedInfo.isDirectVideo) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && videoRef.current) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            videoRef.current
              .play()
              .then(() => {
                setIsPlaying(true);
                onPlayStateChange?.(true);
              })
              .catch(() => {
                // Auto-play was prevented by browser policy
              });
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
            onPlayStateChange?.(false);
          }
        }
      },
      { threshold: [0.1, 0.5, 0.9] }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [playOnViewport, embedInfo.isDirectVideo, onPlayStateChange]);

  // Video direct events
  const handleTogglePlay = useCallback(() => {
    if (!embedInfo.isDirectVideo) return;
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        onPlayStateChange?.(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          onPlayStateChange?.(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    }
  }, [embedInfo.isDirectVideo, isPlaying, onPlayStateChange]);

  const handleToggleMute = useCallback(() => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (nextMuted) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((newVol: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      setVolume(newVol);
      const isNowMuted = newVol === 0;
      videoRef.current.muted = isNowMuted;
      setIsMuted(isNowMuted);
    }
  }, []);

  const handleSpeedChange = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  }, []);

  const handleStepFrame = useCallback((seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleMouseMove = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3000);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Fallback if no URL
  if (!url || !embedInfo.isValid) {
    return (
      <div
        className={`relative w-full aspect-video bg-slate-900/95 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-slate-400 shadow-2xl ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mb-3 shadow-inner">
          <Film className="w-7 h-7 text-teal-400" />
        </div>
        <h4 className="text-base font-bold text-white mb-1">No Video Stream Attached</h4>
        <p className="text-xs text-slate-400 max-w-sm font-mono leading-relaxed">
          Provide a link from YouTube, Hudl, Vimeo, TikTok, Instagram Reels, Google Drive, or a direct MP4 file.
        </p>
      </div>
    );
  }

  const containerAspectClass = effectiveIsVertical
    ? 'aspect-[9/16] max-h-[680px] mx-auto'
    : 'aspect-video w-full';

  return (
    <>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setControlsVisible(false)}
        className={`relative group overflow-hidden rounded-3xl bg-black border border-slate-800 shadow-2xl flex items-center justify-center select-none ${containerAspectClass} ${className}`}
      >
        {/* Native / Direct HTML5 Video Player */}
        {embedInfo.isDirectVideo ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              src={embedInfo.embedUrl}
              poster={posterUrl || embedInfo.thumbnailUrl}
              playsInline
              loop={loop}
              muted={isMuted}
              autoPlay={autoPlay}
              onTimeUpdate={() => {
                if (videoRef.current && !isScrubbing) {
                  setCurrentTime(videoRef.current.currentTime);
                  onTimeUpdate?.(videoRef.current.currentTime, videoRef.current.duration || 0);
                  if (videoRef.current.buffered.length > 0) {
                    setBufferedEnd(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
                  }
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onPlay={() => {
                setIsPlaying(true);
                onPlayStateChange?.(true);
              }}
              onPause={() => {
                setIsPlaying(false);
                onPlayStateChange?.(false);
              }}
              onEnded={() => {
                setIsPlaying(false);
                onEnded?.();
                onPlayStateChange?.(false);
              }}
              onError={() => setHasError(true)}
              onClick={handleTogglePlay}
              className="w-full h-full object-contain cursor-pointer"
            />

            {/* Centered Large Play Button Overlay when paused */}
            {!isPlaying && (
              <button
                type="button"
                onClick={handleTogglePlay}
                className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-teal-500/90 hover:bg-teal-400 text-black flex items-center justify-center shadow-2xl transition-all transform hover:scale-110 active:scale-95 z-20 cursor-pointer backdrop-blur-md"
                aria-label="Play Video"
              >
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
              </button>
            )}

            {/* Custom Control Overlay Bar */}
            {showControls && (
              <div
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 sm:p-5 pt-8 z-30 transition-opacity duration-300 ${
                  controlsVisible || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Scrubbing Bar */}
                <div className="relative flex items-center mb-3 group/scrub">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                    {/* Buffered Progress */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-slate-600/60 rounded-full"
                      style={{ width: `${duration > 0 ? (bufferedEnd / duration) * 100 : 0}%` }}
                    />
                    {/* Played Progress */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onMouseDown={() => setIsScrubbing(true)}
                    onMouseUp={() => setIsScrubbing(false)}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Control Actions Row */}
                <div className="flex items-center justify-between text-white text-xs font-mono">
                  {/* Left Controls: Play/Pause, Frame Steps, Timecode */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer text-teal-400"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStepFrame(-5)}
                      className="p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer text-slate-300 hidden sm:inline-flex"
                      title="Rewind 5s"
                    >
                      <Rewind className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStepFrame(5)}
                      className="p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer text-slate-300 hidden sm:inline-flex"
                      title="Forward 5s"
                    >
                      <FastForward className="w-4 h-4" />
                    </button>

                    {/* Audio Volume */}
                    <div className="flex items-center gap-1.5 group/vol">
                      <button
                        type="button"
                        onClick={handleToggleMute}
                        className="p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer text-slate-300"
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="w-16 h-1 bg-slate-700 accent-teal-400 rounded-lg opacity-0 group-hover/vol:opacity-100 transition cursor-pointer hidden sm:block"
                      />
                    </div>

                    <span className="text-slate-300 font-bold ml-1">
                      {formatTime(currentTime)} <span className="text-slate-500">/</span> {formatTime(duration)}
                    </span>
                  </div>

                  {/* Right Controls: Slow-Mo Scout Speed, Fullscreen, External */}
                  <div className="flex items-center gap-2">
                    {/* Speed Selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-teal-300 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Gauge className="w-3.5 h-3.5" />
                        <span>{playbackRate}x</span>
                      </button>

                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-40 flex flex-col gap-1 min-w-[100px]">
                          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => handleSpeedChange(rate)}
                              className={`px-3 py-1.5 text-left rounded-xl text-xs font-mono transition cursor-pointer ${
                                playbackRate === rate ? 'bg-teal-500 text-black font-bold' : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {rate === 1.0 ? '1.0x (Normal)' : `${rate}x Scout`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {allowFullScreenModal && (
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer text-slate-300"
                        title="Cinema Fullscreen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Third-Party Iframe Embed Layer (YouTube, Hudl, TikTok, Vimeo, etc.) */
          <div className="relative w-full h-full bg-black">
            <iframe
              src={embedInfo.embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              className="w-full h-full border-0"
              onError={() => setHasError(true)}
            />
          </div>
        )}

        {/* Top Header Floating Status Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-30">
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Provider Chip */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl backdrop-blur-md border text-xs font-mono font-bold shadow-lg ${providerBadge.bg} ${providerBadge.text} ${providerBadge.border}`}
            >
              <span>{providerBadge.icon}</span>
              <span>{providerName}</span>
            </div>

            {athleteName && (
              <span className="hidden sm:inline-flex px-3 py-1 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-xs font-mono font-bold text-slate-200">
                {athleteName} {sport ? `• ${sport}` : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition cursor-pointer"
              title="Copy Video URL"
            >
              {isCopied ? <Check className="w-4 h-4 text-teal-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {allowFullScreenModal && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition cursor-pointer"
                title="Watch in Theater Mode"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition cursor-pointer"
              title="Open Source Video"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Error Fallback Banner */}
        {hasError && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Playback Restricted by Provider</h4>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm">
                This film is protected from third-party embedding. Watch directly on {providerName}.
              </p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-mono font-bold text-xs transition shadow-lg shadow-teal-500/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Watch on {providerName}</span>
            </a>
          </div>
        )}
      </div>

      {/* Cinema / Theater Mode Fullscreen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold ${providerBadge.bg} ${providerBadge.text} ${providerBadge.border}`}
                >
                  <span>{providerBadge.icon}</span>
                  <span>{providerName}</span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-md sm:max-w-xl">
                    {title}
                  </h3>
                  {athleteName && (
                    <span className="text-xs text-slate-400 font-mono">
                      {athleteName} {sport ? `• ${sport}` : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Source</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition cursor-pointer"
                  title="Close Theater"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Video Body */}
            <div className="relative w-full flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[400px]">
              {embedInfo.isDirectVideo ? (
                <video
                  src={embedInfo.embedUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full max-h-[75vh] object-contain"
                />
              ) : (
                <iframe
                  src={embedInfo.embedUrl}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full min-h-[480px] border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UniversalVideoPlayer;
