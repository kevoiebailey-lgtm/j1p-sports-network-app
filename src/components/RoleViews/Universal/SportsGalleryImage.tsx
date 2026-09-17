import React, { useState, useEffect, useMemo } from 'react';
import { Camera, Sparkles, Image as ImageIcon, Zap, AlertCircle, ExternalLink, Download } from 'lucide-react';
import { 
  useResolvedStorageUrl, 
  isGoogleDriveUrlOrId, 
  getGoogleDriveFallbackUrls,
  resolveGoogleDriveImageUrl 
} from '../../../utils/storageUrlResolver';

export const getSportEmoji = (sportName?: string): string => {
  if (!sportName) return '🏆';
  const s = sportName.toLowerCase();
  if (s.includes('football') || s.includes('flag')) return '🏈';
  if (s.includes('basket')) return '🏀';
  if (s.includes('soccer')) return '⚽';
  if (s.includes('track') || s.includes('combine') || s.includes('laser')) return '🏃';
  if (s.includes('cheer')) return '📣';
  if (s.includes('volley')) return '🏐';
  if (s.includes('base') || s.includes('softball')) return '⚾';
  if (s.includes('lacrosse')) return '🥍';
  return '🏆';
};

interface SportsGalleryImageProps {
  src?: string | null;
  alt: string;
  sport?: string;
  category?: string;
  title?: string;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  fallbackSrc?: string;
  showDirectDownloadAction?: boolean;
}

export const SportsGalleryImage: React.FC<SportsGalleryImageProps> = ({
  src,
  alt,
  sport = 'Basketball',
  category,
  title,
  className = 'w-full h-full object-cover',
  containerClassName = 'w-full h-full relative overflow-hidden bg-[#141B2D]',
  priority = false,
  fallbackSrc,
  showDirectDownloadAction = false
}) => {
  // Asynchronously resolve raw Firebase Storage path or Google Drive URL
  const { resolvedUrl, isLoading: isResolvingUrl } = useResolvedStorageUrl(src, fallbackSrc || '');
  
  const [hasImgFailed, setHasImgFailed] = useState(false);
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [attemptIndex, setAttemptIndex] = useState(0);

  // Compute all potential CDN mirror URLs (especially for Google Drive photos)
  const candidateMirrors = useMemo(() => {
    const list: string[] = [];
    const rawInput = (src || '').trim();
    const resolved = (resolvedUrl || '').trim();

    if (resolved && !list.includes(resolved)) list.push(resolved);

    if (rawInput) {
      if (isGoogleDriveUrlOrId(rawInput)) {
        const gFallbacks = getGoogleDriveFallbackUrls(rawInput);
        gFallbacks.forEach((url) => {
          if (!list.includes(url)) list.push(url);
        });
      } else if (!list.includes(rawInput)) {
        list.push(rawInput);
      }
    }

    if (fallbackSrc && !list.includes(fallbackSrc)) {
      list.push(fallbackSrc);
    }

    return list.filter(Boolean);
  }, [src, resolvedUrl, fallbackSrc]);

  // Current active attempt URL
  const activeSrc = candidateMirrors[attemptIndex] || candidateMirrors[0] || null;

  // Reset state when input source changes
  useEffect(() => {
    setAttemptIndex(0);
    setHasImgFailed(false);
    setIsImgLoaded(false);
  }, [src]);

  const handleImgError = () => {
    if (attemptIndex + 1 < candidateMirrors.length) {
      // Try next mirror
      setAttemptIndex((prev) => prev + 1);
      setIsImgLoaded(false);
    } else {
      // All mirrors exhausted
      setHasImgFailed(true);
      setIsImgLoaded(false);
    }
  };

  const handleImgLoad = () => {
    setIsImgLoaded(true);
    setHasImgFailed(false);
  };

  const sportEmoji = getSportEmoji(sport);
  const isDisplayLoading = isResolvingUrl || (Boolean(activeSrc) && !isImgLoaded && !hasImgFailed);

  // Direct download / open link for fallback
  const directLink = activeSrc || (src && isGoogleDriveUrlOrId(src) ? resolveGoogleDriveImageUrl(src, 'full') : src);

  if (!activeSrc || hasImgFailed) {
    // Stylized Clean Athletic Branded Card with Direct View/Download Button
    return (
      <div className={`${containerClassName} flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#090D16] via-[#141B2D] to-[#1E293B] text-center select-none border border-[#24324F]/50`}>
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#00B8D4]/20 via-[#FF6A00]/20 to-transparent border border-[#00B8D4]/40 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(0,184,212,0.2)]">
          <span className="text-xl sm:text-2xl">{sportEmoji}</span>
        </div>
        <div className="space-y-1 max-w-[90%]">
          <span className="px-2 py-0.5 rounded-md bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] text-[9px] sm:text-[10px] font-black uppercase tracking-wider inline-block">
            {sport}
          </span>
          <p className="text-xs font-bold text-white truncate max-w-full">
            {title || alt}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[9px] font-mono text-[#00B8D4]">
            <Sparkles className="w-2.5 h-2.5" />
            <span>JUST1PLAY OFFICIAL MEDIA</span>
          </div>

          {directLink && (
            <div className="pt-2">
              <a
                href={directLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#00B8D4]/20 hover:bg-[#00B8D4] border border-[#00B8D4]/50 text-[#00B8D4] hover:text-[#090D16] text-[10px] font-mono font-bold uppercase transition-all shadow"
              >
                <Download className="w-3 h-3" />
                <span>Open Photo</span>
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      {/* Subtle Skeleton Pulse during URL resolution & image load for Zero Layout Shift */}
      {isDisplayLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 animate-pulse flex items-center justify-center z-10 pointer-events-none">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-[#00B8D4]/40 border-t-[#00B8D4] animate-spin opacity-80" />
        </div>
      )}

      <img
        src={activeSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={handleImgLoad}
        onError={handleImgError}
        className={`${className} transition-opacity duration-300 ${isImgLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

export default SportsGalleryImage;
