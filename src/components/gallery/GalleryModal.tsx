import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Lock, 
  ShieldCheck, 
  Check, 
  Loader2, 
  Camera, 
  Calendar,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { downloadCleanMaster } from '../../utils/watermark';
import { WatermarkStyle } from '../../utils/watermarkRenderer';
import { useWatermarkedPreview } from '../../hooks/useWatermarkedPreview';

export interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: {
    id: string;
    originalUrl?: string;
    watermarkedUrl?: string;
    imageUrl?: string;
    thumbUrl?: string;
    url?: string;
    title?: string;
    caption?: string;
    price?: number;
    sport?: string;
    eventName?: string;
    photographerName?: string;
    isPurchased?: boolean;
    createdAt?: any;
    resolution?: string;
    [key: string]: any;
  } | null;
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
  onUnlock?: (photo: any) => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  currentIndex?: number;
  totalPhotos?: number;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
  isOpen,
  onClose,
  photo,
  gallery,
  isPurchased = false,
  onUnlock,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  currentIndex,
  totalPhotos
}) => {
  if (!isOpen || !photo) return null;

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

  // Clean master file URL (kept strictly in React closure, NEVER printed to DOM if protected)
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
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Reset zoom on photo change
  useEffect(() => {
    setZoomLevel(1);
  }, [photo?.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, hasNext, hasPrev]);

  // Clean High-Res Download Action
  const handleCleanDownload = useCallback(async () => {
    if (isProtected || !cleanSourceUrl) return;

    setDownloading(true);
    try {
      const sanitized = (photo.title || 'Just1Play_Photo').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadCleanMaster(cleanSourceUrl, `${sanitized}_4K_Clean.jpg`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Clean download error:', err);
    } finally {
      setDownloading(false);
    }
  }, [isProtected, cleanSourceUrl, photo.title]);

  const effectivePrice = photo.price ?? gallery?.singlePhotoPrice ?? 9.99;
  const photoTitle = photo.title || photo.caption || 'Championship Action Shot';

  // Strict DOM Protection:
  // If protected: ONLY watermarked previewUrl is used as src. Clean source URL is never printed.
  const modalImageSrc = isProtected 
    ? (previewUrl || photo.watermarkedUrl || photo.thumbUrl || photo.thumbnailUrl || '')
    : cleanSourceUrl;

  return (
    <div
      id="gallery-lightbox-modal"
      data-testid="gallery-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      onContextMenu={(e) => {
        e.preventDefault();
        return false;
      }}
    >
      {/* Top Bar Header */}
      <div className="absolute top-0 left-0 right-0 h-16 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 bg-slate-950/80 backdrop-blur-lg z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00F0D0]/10 border border-[#00F0D0]/30 flex items-center justify-center text-[#00F0D0]">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight line-clamp-1">
              {photoTitle}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              {photo.sport && <span className="text-[#00F0D0] font-bold">{photo.sport}</span>}
              {photo.eventName && <span>• {photo.eventName}</span>}
              {currentIndex !== undefined && totalPhotos !== undefined && (
                <span>• {currentIndex + 1} of {totalPhotos}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls for Clean Images */}
          {!isProtected && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-white/5 border border-white/10 mr-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-slate-300 w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            data-testid="modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div 
        className="relative w-full h-full flex items-center justify-center p-4 pt-20 pb-24 overflow-hidden"
        onContextMenu={(e) => {
          e.preventDefault();
          return false;
        }}
        onDragStart={(e) => {
          e.preventDefault();
          return false;
        }}
      >
        {/* Navigation Chevrons */}
        {hasPrev && onPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition-all hover:scale-110 cursor-pointer shadow-2xl"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {hasNext && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition-all hover:scale-110 cursor-pointer shadow-2xl"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* The Display Image */}
        <div 
          className="relative max-w-full max-h-full flex items-center justify-center"
          style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease-out' }}
        >
          {modalImageSrc ? (
            <img
              src={modalImageSrc}
              alt={isProtected ? 'Watermarked Proof' : photoTitle}
              draggable={false}
              onContextMenu={(e) => {
                if (isProtected) {
                  e.preventDefault();
                  return false;
                }
              }}
              className="max-h-[72vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-white/10 select-none pointer-events-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400 p-12 bg-white/5 rounded-2xl border border-white/10">
              <Camera className="w-10 h-10 animate-pulse text-[#00F0D0]" />
              <span className="text-xs font-mono">Loading Photo Asset...</span>
            </div>
          )}

          {/* Fallback CSS Watermark Overlay if Canvas is tainted or CORS fails */}
          {isProtected && corsFallback && (
            <div className="absolute inset-0 pointer-events-none select-none z-15 flex items-center justify-center overflow-hidden rounded-xl">
              {mappedStyle === 'shield_center' && (
                <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-[#121316]/70 border-[3px] border-[#2FD35D]/75 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
                  <span className="text-white font-black text-base sm:text-lg tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    ⚡ JUST1PLAY
                  </span>
                  <span className="text-[#00F0D0] font-mono font-extrabold text-xs tracking-widest mt-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    PREVIEW PROOF
                  </span>
                </div>
              )}

              {mappedStyle === 'diagonal_text' && (
                <div className="w-[180%] -rotate-[35deg] flex flex-col gap-8 items-center justify-center">
                  {[...Array(8)].map((_, idx) => (
                    <div
                      key={idx}
                      className="whitespace-nowrap text-white/20 font-black text-sm sm:text-base tracking-widest uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    >
                      JUST1PLAY PHOTOS • PREVIEW ONLY
                    </div>
                  ))}
                </div>
              )}

              {mappedStyle === 'corner_badge' && (
                <div className="absolute bottom-6 right-6 pointer-events-none select-none">
                  <div className="px-4 py-2 rounded-full bg-[#121316]/85 border border-[#2FD35D]/60 flex items-center gap-2 shadow-2xl backdrop-blur-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2FD35D] shadow-[0_0_8px_#2FD35D]" />
                    <span className="text-white font-bold text-xs tracking-wide">
                      ⚡ JUST1PLAY PHOTOS
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transparent Touch / Click Shield against drag-to-desktop and right-click */}
          {isProtected && (
            <div 
              className="absolute inset-0 z-20 bg-transparent select-none"
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

          {/* Spinner during dynamic watermark rendering */}
          {isWatermarking && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl z-25">
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900 border border-teal-500/40 text-teal-300 text-xs font-mono shadow-2xl">
                <Loader2 className="w-4 h-4 animate-spin text-[#00F0D0]" />
                <span>Generating Anti-Theft Watermark...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 px-6 border-t border-white/10 bg-slate-950/85 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 z-30">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isProtected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Full-Canvas Protected Proof • Uncompressed 4K Locked</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Pristine 4K Master Asset Available</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Unlock (Protected) or Download High-Res (Clean) */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {isProtected ? (
            <button
              type="button"
              data-testid="unlock-purchase-btn"
              onClick={() => {
                if (onUnlock) onUnlock(photo);
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Unlock Pristine 4K • ${Number(effectivePrice).toFixed(2)} USD</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="download-high-res-btn"
              onClick={handleCleanDownload}
              disabled={downloading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0D0] to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,240,208,0.3)] cursor-pointer flex items-center justify-center gap-2"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Preparing Master File...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Clean Master Saved!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Download High-Res (Clean 4K)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryModal;
