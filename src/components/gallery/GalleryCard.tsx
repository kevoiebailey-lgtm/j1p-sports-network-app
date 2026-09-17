import React, { useState, useCallback } from 'react';
import { 
  Download, 
  Lock, 
  ShieldCheck, 
  Eye, 
  Check, 
  Loader2, 
  Camera,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { downloadCleanMaster } from '../../utils/watermark';
import { WatermarkStyle } from '../../utils/watermarkRenderer';
import { useWatermarkedPreview } from '../../hooks/useWatermarkedPreview';

export interface GalleryCardProps {
  photo: {
    id: string;
    originalUrl?: string;
    watermarkedUrl?: string;
    imageUrl?: string;
    thumbUrl?: string;
    thumbnailUrl?: string;
    url?: string;
    title?: string;
    caption?: string;
    price?: number;
    sport?: string;
    eventName?: string;
    photographerName?: string;
    isPurchased?: boolean;
    [key: string]: any;
  };
  gallery?: {
    id?: string;
    title?: string;
    isFree?: boolean; // false = paid gallery
    isPaid?: boolean; // true = paid gallery
    watermarkStyle?: WatermarkStyle | 'full_mesh' | 'badge_only' | 'off' | string;
    watermarkEnabled?: boolean;
    singlePhotoPrice?: number;
    fullAlbumPrice?: number;
    [key: string]: any;
  };
  isPurchased?: boolean;
  onSelect?: (photo: any) => void;
  onClick?: () => void;
  onDownloadClean?: (photo: any) => void;
  onUnlock?: (photo: any) => void;
  className?: string;
  aspectRatioClass?: string;
}

export const GalleryCard: React.FC<GalleryCardProps> = ({
  photo,
  gallery,
  isPurchased = false,
  onSelect,
  onClick,
  onDownloadClean,
  onUnlock,
  className = '',
  aspectRatioClass = 'aspect-[4/3]'
}) => {
  if (!photo) return null;

  // Determine if gallery requires paid purchase
  const isPaidGallery = gallery 
    ? (gallery.isFree === false || gallery.isPaid === true) 
    : false;
  
  const hasPurchased = Boolean(isPurchased || photo.isPurchased);

  // Map legacy watermark styles to standard WatermarkStyle
  const rawStyle = gallery?.watermarkStyle || 'shield_center';
  let mappedStyle: WatermarkStyle = 'shield_center';
  if (rawStyle === 'off' || gallery?.watermarkEnabled === false) {
    mappedStyle = 'none';
  } else if (rawStyle === 'full_mesh' || rawStyle === 'diagonal' || rawStyle === 'diagonal_text') {
    mappedStyle = 'diagonal_text';
  } else if (rawStyle === 'badge_only' || rawStyle === 'corner_badge') {
    mappedStyle = 'corner_badge';
  } else if (rawStyle === 'shield_center') {
    mappedStyle = 'shield_center';
  }

  // The un-watermarked clean source URL (kept in closure, NEVER printed in DOM if protected)
  const cleanSourceUrl = photo.originalUrl || photo.imageUrl || photo.url || '';
  
  // Use reactive caching hook for watermarked preview
  const { previewUrl, isWatermarked, loading: isWatermarking, corsFallback } = useWatermarkedPreview(
    cleanSourceUrl,
    !isPaidGallery,
    hasPurchased,
    mappedStyle,
    'JUST1PLAY PHOTOS'
  );

  const isProtected = isWatermarked;
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Handle Clean Download for Free / Purchased items
  const handleCleanDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProtected || !cleanSourceUrl) return;

    if (onDownloadClean) {
      onDownloadClean(photo);
      return;
    }

    setDownloading(true);
    try {
      const sanitizedTitle = (photo.title || 'Just1Play_Photo').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadCleanMaster(cleanSourceUrl, `${sanitizedTitle}_4K_Clean.jpg`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Download clean master failed:', err);
    } finally {
      setDownloading(false);
    }
  }, [isProtected, cleanSourceUrl, onDownloadClean, photo]);

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (onSelect) {
      onSelect(photo);
    }
  };

  const photoTitle = photo.title || photo.caption || 'Action Capture';
  const effectivePrice = photo.price ?? gallery?.singlePhotoPrice ?? 9.99;

  // Render Source URL based strictly on protection state:
  // When protected: ONLY display watermarked URL or data URL. Never expose clean source.
  const displayImageSrc = isProtected 
    ? (previewUrl || photo.watermarkedUrl || photo.thumbUrl || photo.thumbnailUrl || '')
    : cleanSourceUrl;

  return (
    <div
      id={`gallery-card-${photo.id}`}
      data-testid="gallery-card"
      onClick={handleCardClick}
      className={`group relative w-full bg-[#0D121F] border border-white/10 hover:border-[#00F0D0]/60 rounded-2xl overflow-hidden shadow-xl hover:shadow-[0_0_24px_rgba(0,240,208,0.2)] transition-all duration-300 cursor-pointer flex flex-col justify-between select-none ${className}`}
    >
      {/* Visual Image Container with Anti-Theft Protection */}
      <div 
        className={`relative w-full ${aspectRatioClass} overflow-hidden bg-black/80 flex items-center justify-center`}
        onContextMenu={(e) => {
          if (isProtected) {
            e.preventDefault();
            return false;
          }
        }}
        onDragStart={(e) => {
          if (isProtected) {
            e.preventDefault();
            return false;
          }
        }}
      >
        {displayImageSrc ? (
          <img
            src={displayImageSrc}
            alt={isProtected ? 'Watermarked Proof' : photoTitle}
            draggable={false}
            loading="lazy"
            onContextMenu={(e) => {
              if (isProtected) {
                e.preventDefault();
                return false;
              }
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
            <Camera className="w-8 h-8 opacity-40 animate-pulse" />
            <span className="text-[11px] font-mono">Loading Asset...</span>
          </div>
        )}

        {/* Fallback CSS Watermark Overlay if Canvas is tainted or CORS fails */}
        {isProtected && corsFallback && (
          <div className="absolute inset-0 pointer-events-none select-none z-15 flex items-center justify-center overflow-hidden">
            {mappedStyle === 'shield_center' && (
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#121316]/70 border-[3px] border-[#2FD35D]/75 shadow-[0_0_24px_rgba(0,0,0,0.85)] backdrop-blur-xs flex flex-col items-center justify-center text-center p-3">
                <span className="text-white font-black text-sm tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  ⚡ JUST1PLAY
                </span>
                <span className="text-[#00F0D0] font-mono font-extrabold text-[10px] tracking-widest mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  PREVIEW PROOF
                </span>
              </div>
            )}

            {mappedStyle === 'diagonal_text' && (
              <div className="w-[180%] -rotate-[35deg] flex flex-col gap-6 items-center justify-center">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="whitespace-nowrap text-white/20 font-black text-xs sm:text-sm tracking-widest uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  >
                    JUST1PLAY PHOTOS • PREVIEW ONLY
                  </div>
                ))}
              </div>
            )}

            {mappedStyle === 'corner_badge' && (
              <div className="absolute bottom-4 right-4 pointer-events-none select-none">
                <div className="px-3.5 py-1.5 rounded-full bg-[#121316]/85 border border-[#2FD35D]/60 flex items-center gap-2 shadow-xl backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-[#2FD35D] shadow-[0_0_8px_#2FD35D]" />
                  <span className="text-white font-bold text-xs tracking-wide">
                    ⚡ JUST1PLAY PHOTOS
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transparent Click Shield: Prevents right-click and dragging on touch devices */}
        {isProtected && (
          <div 
            className="absolute inset-0 z-10 bg-transparent select-none"
            onContextMenu={(e) => {
              e.preventDefault();
              return false;
            }}
            onDragStart={(e) => {
              e.preventDefault();
              return false;
            }}
          />
        )}

        {/* Watermarking Render Spinner indicator */}
        {isWatermarking && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs z-20">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-teal-500/30 text-teal-300 text-xs font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00F0D0]" />
              <span>Watermarking Asset...</span>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-20">
          {photo.sport && (
            <span className="px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-white text-[9.5px] font-black uppercase tracking-wider shadow-md">
              {photo.sport}
            </span>
          )}

          {isProtected ? (
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-amber-500/50 text-amber-300 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Lock className="w-2.5 h-2.5 text-amber-400" />
              <span>Watermarked Proof</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-emerald-500/50 text-emerald-400 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
              <span>4K Clean Master</span>
            </span>
          )}
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3 pointer-events-none z-20">
          <span className="text-xs font-black text-[#00F0D0] flex items-center gap-1.5 font-mono">
            <Eye className="w-3.5 h-3.5" />
            <span>Open Lightbox Preview</span>
          </span>
        </div>
      </div>

      {/* Card Details & Actions */}
      <div className="p-3.5 flex flex-col justify-between gap-2 bg-[#0D121F] border-t border-white/5">
        <div>
          <h3 className="text-xs font-bold text-white tracking-tight line-clamp-1 group-hover:text-[#00F0D0] transition-colors">
            {photoTitle}
          </h3>
          {photo.eventName && (
            <p className="text-[10.5px] text-slate-400 line-clamp-1 mt-0.5">
              {photo.eventName}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
          {isProtected ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1 text-amber-300 font-mono font-black text-xs">
                <span>${Number(effectivePrice).toFixed(2)}</span>
                <span className="text-[9.5px] text-slate-400 font-normal">USD</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUnlock) onUnlock(photo);
                  else if (onClick) onClick();
                }}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-[10.5px] tracking-wider uppercase transition-all shadow-md cursor-pointer flex items-center gap-1"
              >
                <Lock className="w-3 h-3 text-black" />
                <span>Unlock</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1 text-emerald-400 font-mono text-[10px] font-bold">
                <Check className="w-3 h-3" />
                <span>Clean 4K Asset</span>
              </div>

              <button
                type="button"
                data-testid="download-clean-btn"
                onClick={handleCleanDownload}
                disabled={downloading}
                className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-[10.5px] tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    <span>Saving...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3 text-emerald-400" />
                    <span>Download High-Res</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryCard;
