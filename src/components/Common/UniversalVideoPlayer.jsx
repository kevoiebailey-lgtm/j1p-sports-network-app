import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, Play, Pause, Volume2, VolumeX, ExternalLink, Film, Radio } from 'lucide-react';
import { usePlayOnViewportIntersection } from '../../hooks/usePlayOnViewportIntersection';

/**
 * Universal video parser utility handling YouTube, Vimeo, Instagram, TikTok, Hudl, and direct video formats
 */
export function parseUniversalVideoUrl(rawUrl) {
  const url = (rawUrl || '').trim();

  if (!url) {
    return {
      type: 'unsupported',
      src: '',
      autoplaySrc: '',
      aspectRatio: '16/9',
      isVertical: false,
      isDirect: false,
      platformName: 'Invalid URL',
      originalUrl: ''
    };
  }

  // 1. YouTube (Watch, Shorts, youtu.be share, Embed)
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    const isShorts = url.includes('/shorts/');
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
    
    if (ytMatch && ytMatch[1]) {
      videoId = ytMatch[1];
    }

    const baseEmbed = videoId
      ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`
      : url;

    const autoplayEmbed = videoId
      ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`
      : url;

    return {
      type: 'youtube',
      src: baseEmbed,
      autoplaySrc: autoplayEmbed,
      aspectRatio: isShorts ? '9/16' : '16/9',
      isVertical: isShorts,
      isDirect: false,
      platformName: isShorts ? 'YouTube Shorts' : 'YouTube',
      originalUrl: url
    };
  }

  // 2. Vimeo (vimeo.com/{id})
  if (url.includes('vimeo.com')) {
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    const videoId = vimeoMatch ? vimeoMatch[1] : '';
    const baseEmbed = videoId
      ? `https://player.vimeo.com/video/${videoId}?dnt=1`
      : url;

    const autoplayEmbed = videoId
      ? `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&dnt=1`
      : url;

    return {
      type: 'vimeo',
      src: baseEmbed,
      autoplaySrc: autoplayEmbed,
      aspectRatio: '16/9',
      isVertical: false,
      isDirect: false,
      platformName: 'Vimeo',
      originalUrl: url
    };
  }

  // 3. Instagram (Posts & Reels: instagram.com/p/{id} or /reel/{id})
  if (url.includes('instagram.com') || url.includes('instagr.am')) {
    const igMatch = url.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
    const videoId = igMatch ? igMatch[1] : '';
    const embedUrl = videoId
      ? `https://www.instagram.com/p/${videoId}/embed`
      : url;

    return {
      type: 'instagram',
      src: embedUrl,
      autoplaySrc: embedUrl,
      aspectRatio: '9/16',
      isVertical: true,
      isDirect: false,
      platformName: 'Instagram',
      originalUrl: url
    };
  }

  // 4. TikTok (tiktok.com/@user/video/{id} or vt.tiktok.com)
  if (url.includes('tiktok.com')) {
    const ttMatch = url.match(/tiktok\.com\/(?:@[a-zA-Z0-9._-]+\/video\/|v\/|embed\/v2\/)(\d+)/i);
    const videoId = ttMatch ? ttMatch[1] : '';
    const embedUrl = videoId
      ? `https://www.tiktok.com/embed/v2/${videoId}`
      : url;

    return {
      type: 'tiktok',
      src: embedUrl,
      autoplaySrc: embedUrl,
      aspectRatio: '9/16',
      isVertical: true,
      isDirect: false,
      platformName: 'TikTok',
      originalUrl: url
    };
  }

  // 5. Hudl Highlights & Film (hudl.com/v/{id} or hudl.com/video/{id} or embed)
  if (url.includes('hudl.com')) {
    let embedUrl = url;
    if (url.includes('/embed/')) {
      embedUrl = url.startsWith('http') ? url : `https://${url}`;
    } else {
      const hudlMatch = url.match(/hudl\.com\/(?:video|embed\/video|v)\/([a-zA-Z0-9_\-\/]+)/i);
      if (hudlMatch && hudlMatch[1]) {
        embedUrl = `https://www.hudl.com/embed/video/${hudlMatch[1]}`;
      }
    }

    return {
      type: 'hudl',
      src: embedUrl,
      autoplaySrc: embedUrl,
      aspectRatio: '16/9',
      isVertical: false,
      isDirect: false,
      platformName: 'Hudl',
      originalUrl: url
    };
  }

  // 6. Google Drive Video Preview & Streaming
  if (url.includes('drive.google.com')) {
    let driveFileId = '';
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (fileMatch && fileMatch[1]) {
      driveFileId = fileMatch[1];
    } else if (idMatch && idMatch[1]) {
      driveFileId = idMatch[1];
    }

    const embedUrl = driveFileId
      ? `https://drive.google.com/file/d/${driveFileId}/preview`
      : url;

    return {
      type: 'google_drive',
      src: embedUrl,
      autoplaySrc: embedUrl,
      aspectRatio: '16/9',
      isVertical: false,
      isDirect: false,
      platformName: 'Google Drive Game Film',
      originalUrl: url
    };
  }

  // 7. Direct Video Fallback (.mp4, .webm, .mov, blob, firebasestorage, etc.)
  const lower = url.toLowerCase();
  const isDirect =
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.includes('.mp4?') ||
    lower.includes('.webm?') ||
    lower.includes('.mov?') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:video/') ||
    lower.includes('firebasestorage.googleapis.com');

  if (isDirect) {
    return {
      type: 'direct',
      src: url,
      autoplaySrc: url,
      aspectRatio: '16/9',
      isVertical: false,
      isDirect: true,
      platformName: 'Direct Video',
      originalUrl: url
    };
  }

  // Fallback for general valid URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return {
      type: 'direct',
      src: url,
      autoplaySrc: url,
      aspectRatio: '16/9',
      isVertical: false,
      isDirect: true,
      platformName: 'Video Stream',
      originalUrl: url
    };
  }

  return {
    type: 'unsupported',
    src: url,
    autoplaySrc: url,
    aspectRatio: '16/9',
    isVertical: false,
    isDirect: false,
    platformName: 'Unsupported Format',
    originalUrl: url
  };
}

/**
 * UniversalVideoPlayer Component
 * 
 * Props:
 * - videoUrl (string): Target video URL (YouTube, Vimeo, Instagram, TikTok, Hudl, or direct MP4/WebM)
 * - src (string, optional): Alias for videoUrl
 * - title (string, optional): Title for the iframe/accessibility
 * - className (string, optional): Additional classes
 * - poster (string, optional): Poster image for direct video
 * - autoPlay (boolean, optional): Autoplay setting
 * - muted (boolean, optional): Muted setting
 * - controls (boolean, optional): Show controls on direct video
 * - playOnViewport (boolean, optional): Automatically plays muted when entering viewport
 * - intersectionThreshold (number, optional): Observer visibility threshold (default: 0.4)
 * - showAutoplayBadge (boolean, optional): Show badge when autoplaying
 * - onLoaded (function, optional): Callback when media loads
 */
export const UniversalVideoPlayer = ({
  videoUrl,
  src,
  title = 'Game Film & Highlights',
  className = '',
  poster,
  autoPlay = false,
  muted = true,
  controls = true,
  playOnViewport = true,
  intersectionThreshold = 0.4,
  showAutoplayBadge = true,
  onLoaded
}) => {
  const targetUrl = videoUrl || src || '';
  const parsed = useMemo(() => parseUniversalVideoUrl(targetUrl), [targetUrl]);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // PlayOnViewportIntersection Hook
  const {
    containerRef,
    videoRef,
    isIntersecting,
    isPlaying,
    isMuted,
    togglePlay,
    toggleMute
  } = usePlayOnViewportIntersection({
    threshold: intersectionThreshold,
    enabled: playOnViewport,
    autoMute: muted,
    pauseOnExit: true
  });

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [targetUrl]);

  const handleMediaLoad = () => {
    setIsLoading(false);
    if (onLoaded) onLoaded();
  };

  const handleMediaError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Determine active iframe source with autoplay params if intersecting
  const activeIframeSrc = useMemo(() => {
    if (playOnViewport && isIntersecting && parsed.autoplaySrc) {
      return parsed.autoplaySrc;
    }
    return parsed.src;
  }, [playOnViewport, isIntersecting, parsed.src, parsed.autoplaySrc]);

  if (!targetUrl || parsed.type === 'unsupported' || hasError) {
    return (
      <div className={`w-full rounded-[12px] bg-[#141B2D] border border-[#24324F] p-6 text-center text-slate-400 flex flex-col items-center justify-center gap-2 ${className}`}>
        <AlertCircle className="w-6 h-6 text-amber-400/80" />
        <p className="text-xs font-mono text-slate-300">
          {hasError ? 'Video stream unavailable or restricted' : 'Invalid or unsupported video URL'}
        </p>
        {targetUrl && (
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#00B8D4] hover:underline flex items-center gap-1 mt-1 font-mono"
          >
            <span>Open external link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  // Dynamic aspect ratio and vertical reel constraints
  const aspectClass = parsed.isVertical
    ? 'aspect-[9/16] max-h-[600px] mx-auto'
    : 'aspect-video w-full';

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-[12px] overflow-hidden bg-[#090D16] border border-[#24324F] shadow-xl group/player ${aspectClass} ${className}`}
      style={{
        maxHeight: parsed.isVertical ? '600px' : undefined
      }}
    >
      {/* Loading Overlay Spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090D16]/90 backdrop-blur-sm transition-opacity duration-300">
          <Loader2 className="w-7 h-7 text-[#00B8D4] animate-spin" />
          <span className="text-[11px] font-mono font-bold text-slate-300 mt-2 uppercase tracking-wider">
            Loading {parsed.platformName}...
          </span>
        </div>
      )}

      {/* Render Direct Video Tag */}
      {parsed.isDirect ? (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            src={parsed.src}
            poster={poster}
            controls={controls}
            autoPlay={autoPlay}
            muted={muted}
            playsInline
            onLoadedData={handleMediaLoad}
            onError={handleMediaError}
            className="w-full h-full object-contain bg-black rounded-[12px]"
          />

          {/* Quick Sound/Mute Toggle Overlay for Direct Video */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 opacity-0 group-hover/player:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-black/80 hover:bg-[#00B8D4] text-white hover:text-slate-950 border border-white/20 transition-all cursor-pointer shadow-lg"
              title={isMuted ? 'Unmute Video' : 'Mute Video'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#00B8D4]" />}
            </button>
          </div>
        </div>
      ) : (
        /* Render Embedded IFrame (YouTube, Vimeo, Instagram, TikTok, Hudl) */
        <iframe
          src={activeIframeSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={handleMediaLoad}
          onError={handleMediaError}
          className="w-full h-full border-0 rounded-[12px]"
        />
      )}

      {/* Autoplay & Platform Badges Overlay */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 pointer-events-none">
        {showAutoplayBadge && isPlaying && (
          <span className="px-2 py-0.5 rounded-md bg-[#161C22]/90 backdrop-blur-md border border-[#00B8D4]/50 text-[10px] font-mono font-bold text-[#00B8D4] uppercase flex items-center gap-1 shadow-lg">
            <Radio className="w-2.5 h-2.5 animate-pulse text-[#00B8D4]" />
            <span>Autoplaying (Muted)</span>
          </span>
        )}
        <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-[#00B8D4] uppercase flex items-center gap-1">
          <Film className="w-2.5 h-2.5" />
          {parsed.platformName}
        </span>
      </div>
    </div>
  );
};

export default UniversalVideoPlayer;
