import React, { useState } from 'react';
import { 
  Play, 
  ExternalLink, 
  Maximize2, 
  X, 
  AlertCircle, 
  Film,
  Sparkles,
  Volume2
} from 'lucide-react';
import { getEmbedUrl, getVideoProviderBadge, getVideoProviderName } from '../../lib/videoParser';

interface UniversalVideoPlayerProps {
  url: string;
  title?: string;
  posterUrl?: string;
  isVertical?: boolean;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  allowFullScreenModal?: boolean;
  showPlaceholder?: boolean;
}

export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  url,
  title = 'Highlight Film',
  posterUrl,
  isVertical = false,
  className = '',
  autoPlay = false,
  showControls = true,
  allowFullScreenModal = true,
  showPlaceholder = true
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const embedInfo = getEmbedUrl(url);
  const providerBadge = getVideoProviderBadge(embedInfo.provider);
  const providerName = getVideoProviderName(embedInfo.provider);

  if (!url || !embedInfo.isValid) {
    if (!showPlaceholder) {
      return null;
    }

    return (
      <div className={`relative w-full aspect-video bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400 ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mb-2">
          <Film className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-sm font-bold text-slate-300">No Highlight Video Attached</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Add a YouTube, Hudl, Vimeo, TikTok, or direct MP4 link to play highlights.
        </p>
      </div>
    );
  }

  const effectiveAspectRatio = isVertical || embedInfo.isVertical 
    ? 'aspect-[9/16] max-h-[520px]' 
    : 'aspect-video';

  return (
    <>
      <div className={`relative group w-full overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-xl ${effectiveAspectRatio} ${className}`}>
        
        {/* Playback Layer */}
        {embedInfo.isDirectVideo ? (
          <video
            src={embedInfo.embedUrl}
            poster={posterUrl || embedInfo.thumbnailUrl}
            controls={showControls}
            autoPlay={isPlaying}
            playsInline
            className="w-full h-full object-contain bg-black"
            onError={() => setHasError(true)}
          />
        ) : (
          <iframe
            src={embedInfo.embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="w-full h-full border-0"
            onError={() => setHasError(true)}
          />
        )}

        {/* Top Floating Badge Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md border text-[11px] font-mono font-bold ${providerBadge.bg} ${providerBadge.text} ${providerBadge.border}`}>
            <span>{providerBadge.icon}</span>
            <span>{providerName}</span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {allowFullScreenModal && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                title="Watch in Theater Mode"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all"
              title="Open Source Link"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Error Fallback Banner */}
        {hasError && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center z-20">
            <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-xs font-bold text-white mb-1">Playback Restricted by Provider</p>
            <p className="text-[11px] text-slate-400 mb-3">This video can be watched directly on its source site.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Watch on {providerName}</span>
            </a>
          </div>
        )}
      </div>

      {/* Theater / Fullscreen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${providerBadge.bg} ${providerBadge.text} ${providerBadge.border}`}>
                  <span>{providerBadge.icon}</span>
                  <span>{providerName}</span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white truncate max-w-md sm:max-w-xl">
                  {title}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Source</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Player Body */}
            <div className="w-full aspect-video bg-black flex items-center justify-center">
              {embedInfo.isDirectVideo ? (
                <video
                  src={embedInfo.embedUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={embedInfo.embedUrl}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
