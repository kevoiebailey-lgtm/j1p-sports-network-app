import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Gauge,
  Flame,
  ShieldCheck,
  Zap,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseVideoUrl } from '../../lib/videoEmbedUtils';

export interface NativeSportsVideoPlayerProps {
  streamUrl?: string; // Video URL or embed URL or direct file
  posterUrl?: string;
  athleteName?: string;
  athleteStats?: string;
  autoPlay?: boolean;
  className?: string;
}

export const NativeSportsVideoPlayer: React.FC<NativeSportsVideoPlayerProps> = ({
  streamUrl,
  posterUrl,
  athleteName,
  athleteStats,
  autoPlay = false,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showPlayPulse, setShowPlayPulse] = useState<boolean>(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse video stream info
  const videoInfo = streamUrl ? parseVideoUrl(streamUrl) : null;
  const isDirectFile = !videoInfo || videoInfo.isDirectFile || videoInfo.type === 'native';

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isDirectFile) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    if (autoPlay) {
      video.play().catch(() => {
        // Fallback with muted autoplay
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [streamUrl, isDirectFile, autoPlay]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    setShowPlayPulse(true);
    setTimeout(() => setShowPlayPulse(false), 600);

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn('Playback error:', err);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      Math.max(videoRef.current.currentTime + seconds, 0),
      duration || 100
    );
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`relative w-full aspect-video bg-[#0F172A] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group select-none ${className}`}
    >
      {/* IFRAME EMBED PLAYER (YouTube, Vimeo, Twitch, Kick, Hudl, TikTok, etc.) */}
      {!isDirectFile && videoInfo ? (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <iframe
            src={videoInfo.embedUrl}
            title={athleteName || 'Sports Highlight'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
          <div className="absolute bottom-2 right-2 z-20">
            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-[#E5B868] text-slate-300 hover:text-black text-xs font-mono font-bold transition-all border border-slate-700 shadow-md"
            >
              <span>Source Film</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* HTML5 NATIVE VIDEO PLAYER */}
          <video
            ref={videoRef}
            src={streamUrl}
            poster={posterUrl}
            playsInline
            loop
            onClick={togglePlay}
            className="w-full h-full object-cover cursor-pointer"
          />

          {/* OVERLAY HEADER: ATHLETE NAME & STATS BANNER */}
          <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-[#0F172A]/90 via-[#0F172A]/40 to-transparent z-20 flex items-center justify-between pointer-events-none">
            {(athleteName || athleteStats) && (
              <div className="flex items-center gap-3 pointer-events-auto">
                <div className="w-2.5 h-2.5 rounded-full bg-[#E5B868] animate-ping" />
                <div>
                  {athleteName && (
                    <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-1.5 leading-none">
                      <span>{athleteName}</span>
                      <ShieldCheck className="w-4 h-4 text-[#E5B868]" />
                    </h3>
                  )}
                  {athleteStats && (
                    <p className="text-[11px] font-mono text-[#E5B868] mt-1 font-semibold">
                      {athleteStats}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pointer-events-auto">
              <span className="bg-[#0F172A]/80 border border-slate-800 text-[#E5B868] text-[10px] font-mono font-bold px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>HD PRO REEL</span>
              </span>
            </div>
          </div>

          {/* PLAY/PAUSE CENTER PULSE ANIMATION */}
          <AnimatePresence>
            {showPlayPulse && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#E5B868]/90 text-black flex items-center justify-center pointer-events-none z-30 shadow-2xl"
              >
                {isPlaying ? <Play className="w-8 h-8 fill-black ml-1" /> : <Pause className="w-8 h-8 fill-black" />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* BIG PLAY OVERLAY BUTTON (WHEN PAUSED) */}
          {!isPlaying && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#E5B868] text-black flex items-center justify-center shadow-[0_0_30px_rgba(229,184,104,0.6)] hover:scale-110 transition-transform cursor-pointer z-20"
            >
              <Play className="w-7 h-7 fill-black ml-1" />
            </motion.button>
          )}

          {/* CONTROLS BAR OVERLAY */}
          <AnimatePresence>
            {(showControls || !isPlaying) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#0F172A]/95 via-[#0F172A]/80 to-transparent z-20 space-y-2.5"
              >
                {/* SCRUBBER SEEK BAR */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-800 accent-[#E5B868] rounded-lg cursor-pointer hover:h-2 transition-all"
                  />
                  <span className="text-[11px] font-mono text-slate-300 min-w-[70px] text-right">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* CONTROLS BUTTONS */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Play / Pause */}
                    <button
                      onClick={togglePlay}
                      className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white hover:text-[#E5B868] hover:border-[#E5B868]/50 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>

                    {/* Seek Back 5s */}
                    <button
                      onClick={() => skipTime(-5)}
                      className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Rewind 5s"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Seek Forward 5s */}
                    <button
                      onClick={() => skipTime(5)}
                      className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Forward 5s"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    {/* Mute & Volume Slider */}
                    <div className="flex items-center gap-2 group/vol">
                      <button
                        onClick={toggleMute}
                        className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#E5B868]" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-14 sm:w-16 h-1.5 bg-slate-800 accent-[#E5B868] rounded-lg cursor-pointer opacity-70 group-hover/vol:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative">
                    {/* Speed Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono font-bold text-[#E5B868] hover:border-[#E5B868]/50 flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Gauge className="w-3.5 h-3.5" />
                        <span>{playbackSpeed}x</span>
                      </button>

                      {showSpeedMenu && (
                        <div className="absolute bottom-10 right-0 bg-[#0F172A] border border-slate-700 rounded-xl p-1 shadow-2xl flex flex-col gap-1 z-30 min-w-[80px]">
                          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                            <button
                              key={s}
                              onClick={() => handleSpeedChange(s)}
                              className={`px-3 py-1 rounded-lg text-xs font-mono text-left transition-colors cursor-pointer ${
                                playbackSpeed === s
                                  ? 'bg-[#E5B868] text-black font-bold'
                                  : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {s}x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

