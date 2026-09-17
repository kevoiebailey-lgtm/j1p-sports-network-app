import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Lock, 
  ShieldCheck, 
  Eye, 
  Check, 
  Loader2, 
  Camera, 
  Calendar,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShoppingCart,
  DollarSign,
  Share2,
  Info
} from 'lucide-react';
import { WatermarkStyle } from '../../utils/watermarkRenderer';
import { useWatermarkedPreview } from '../../hooks/useWatermarkedPreview';
import WatermarkOverlay from './WatermarkOverlay';
import { downloadPhotoFile } from '../../utils/downloadHelper';

export interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: {
    id: string;
    originalUrl?: string;
    watermarkedUrl?: string;
    imageUrl?: string;
    thumbUrl?: string;
    thumbnailUrl?: string;
    url?: string;
    highResDownloadUrl?: string;
    title?: string;
    caption?: string;
    price?: number;
    sport?: string;
    eventName?: string;
    eventDate?: string;
    venue?: string;
    photographerName?: string;
    photographer?: string;
    isPurchased?: boolean;
    isFree?: boolean;
    resolution?: string;
    cameraExif?: {
      camera?: string;
      lens?: string;
      shutter?: string;
      iso?: string;
    };
    [key: string]: any;
  } | null;
  gallery?: {
    id?: string;
    title?: string;
    isFree?: boolean;
    isPaid?: boolean;
    watermarkStyle?: WatermarkStyle | string;
    singlePhotoPrice?: number;
    fullAlbumPrice?: number;
    [key: string]: any;
  };
  isPurchased?: boolean;
  watermarkStyle?: WatermarkStyle;
  label?: string;
  onUnlock?: (photo: any) => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  currentIndex?: number;
  totalPhotos?: number;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  photo,
  gallery,
  isPurchased = false,
  watermarkStyle,
  label = 'JUST1PLAY PHOTOS',
  onUnlock,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  currentIndex,
  totalPhotos
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showMetadata, setShowMetadata] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Reset zoom on photo change
  useEffect(() => {
    setZoomLevel(1);
    setDownloadSuccess(false);
  }, [photo?.id]);

  // Keyboard navigation & escape listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && onNext && hasNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && onPrev && hasPrev) {
        onPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrev, hasNext, hasPrev]);

  if (!isOpen || !photo) return null;

  // Pricing & purchase status
  const isFree = Boolean(
    photo.isFree === true ||
    gallery?.isFree === true ||
    (!gallery?.isPaid && (photo.price === 0 || photo.price === undefined) && photo.isFree !== false)
  );
  const hasPurchased = Boolean(isPurchased || photo.isPurchased);

  const activeStyle: WatermarkStyle = watermarkStyle || 
    ((gallery?.watermarkStyle as WatermarkStyle) || 'shield_center');

  // Master un-watermarked source URL (kept safely in JavaScript closure)
  const cleanSourceUrl =
    photo.cleanMasterUrl ||
    photo.highResDownloadUrl ||
    photo.originalUrl ||
    (photo.vaultPath || (photo.albumId && photo.id)
      ? `/api/media/download?albumId=${photo.albumId || gallery?.id || ''}&photoId=${photo.id}&vaultPath=${encodeURIComponent(photo.vaultPath || '')}&filename=${encodeURIComponent((photo.title || 'photo') + '_4K.jpg')}`
      : '') ||
    photo.imageUrl ||
    photo.url ||
    '';

  // Reactive canvas watermark hook with in-memory caching
  const { previewUrl, isWatermarked, loading, corsFallback } = useWatermarkedPreview(
    cleanSourceUrl,
    isFree,
    hasPurchased,
    activeStyle,
    label
  );

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.35, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.35, 1));
  const handleZoomReset = () => setZoomLevel(1);

  // Clean Download for Free / Purchased items
  const handleCleanDownload = async () => {
    if (isWatermarked || !cleanSourceUrl) return;

    setDownloading(true);
    try {
      const sanitizedTitle = (photo.title || 'Just1Play_Photo').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadPhotoFile(cleanSourceUrl, `${sanitizedTitle}_4K_Clean.jpg`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Download clean master failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/gallery?photo=${encodeURIComponent(photo.id)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const effectivePrice = photo.price ?? gallery?.singlePhotoPrice ?? 9.99;
  const photoTitle = photo.title || photo.caption || 'Action Photo';
  const sportName = photo.sport || 'Sports Media';
  const photographer = photo.photographerName || photo.photographer || 'Just1Play Media';

  // Protect DOM attributes: NEVER write un-watermarked source URL if isWatermarked is true
  const displaySrc = previewUrl || photo.thumbUrl || photo.thumbnailUrl || (isWatermarked ? '' : cleanSourceUrl);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl overflow-hidden select-none"
      onContextMenu={(e) => {
        if (isWatermarked) e.preventDefault();
      }}
    >
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/60 to-transparent">
        <div className="flex items-center gap-3">
          {isWatermarked ? (
            <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-md">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>PROTECTED PREVIEW PROOF</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>CLEAN 4K MASTER VAULT</span>
            </div>
          )}

          {typeof currentIndex === 'number' && typeof totalPhotos === 'number' && (
            <span className="text-xs font-mono text-slate-400 font-bold hidden sm:inline">
              {currentIndex + 1} / {totalPhotos}
            </span>
          )}

          <span className="text-xs font-mono text-slate-200 hidden md:inline truncate max-w-sm">
            {photoTitle}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-[#1E2630]/90 border border-[#2D3748] rounded-xl p-1 text-slate-300">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="p-1.5 hover:text-white disabled:opacity-40 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 font-bold text-[#00F0D0]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.5}
              className="p-1.5 hover:text-white disabled:opacity-40 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={handleZoomReset}
                className="p-1.5 hover:text-white border-l border-[#2D3748] ml-1 cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Metadata */}
          <button
            type="button"
            onClick={() => setShowMetadata(!showMetadata)}
            className={`p-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              showMetadata
                ? 'bg-[#00F0D0]/20 text-[#00F0D0] border-[#00F0D0]/50'
                : 'bg-[#1E2630] text-slate-300 border-[#2D3748]'
            }`}
            title="Toggle Details Drawer"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1E2630] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-[#2D3748] hover:border-rose-500/40 transition-all cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport + Drawer */}
      <div className="w-full h-full pt-16 flex overflow-hidden">
        {/* Photo Viewport Area */}
        <div 
          className="flex-1 relative flex items-center justify-center p-4 overflow-hidden select-none"
          onContextMenu={(e) => {
            if (isWatermarked) e.preventDefault();
          }}
        >
          {/* Navigation Arrows */}
          {hasPrev && onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-4 z-30 p-3 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 shadow-2xl transition-all cursor-pointer"
              title="Previous Photo (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {hasNext && onNext && (
            <button
              type="button"
              onClick={onNext}
              className="absolute right-4 z-30 p-3 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 shadow-2xl transition-all cursor-pointer"
              title="Next Photo (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Scalable Container */}
          <div 
            className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200 ease-out"
            style={{ transform: `scale(${zoomLevel})` }}
            onContextMenu={(e) => {
              if (isWatermarked) e.preventDefault();
            }}
          >
            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-xs rounded-xl">
                <Loader2 className="w-10 h-10 text-[#00F0D0] animate-spin" />
              </div>
            )}

            {displaySrc ? (
              <img
                src={displaySrc}
                alt={isWatermarked ? 'Watermarked Proof' : photoTitle}
                draggable={false}
                onContextMenu={(e) => {
                  if (isWatermarked) e.preventDefault();
                }}
                className="max-h-[80vh] max-w-[82vw] object-contain rounded-xl shadow-2xl border border-white/10 select-none pointer-events-none"
              />
            ) : (
              <div className="w-96 h-64 flex items-center justify-center text-slate-500 font-mono text-xs">
                Photo preview unavailable
              </div>
            )}

            {/* WatermarkOverlay: clearly visible across center and diagonally */}
            <WatermarkOverlay className="z-20" />

            {/* Fallback CSS Watermark Overlay if Canvas rendering fails or CORS is blocked */}
            {isWatermarked && corsFallback && (
              <div className="absolute inset-0 pointer-events-none select-none z-20 flex items-center justify-center overflow-hidden rounded-xl">
                {activeStyle === 'shield_center' && (
                  <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-[#121316]/70 border-[3px] border-[#2FD35D]/75 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
                    <span className="text-white font-black text-base sm:text-lg tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      ⚡ JUST1PLAY
                    </span>
                    <span className="text-[#00F0D0] font-mono font-extrabold text-xs tracking-widest mt-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                      PREVIEW PROOF
                    </span>
                  </div>
                )}

                {activeStyle === 'diagonal_text' && (
                  <div className="w-[180%] -rotate-[35deg] flex flex-col gap-8 items-center justify-center">
                    {[...Array(8)].map((_, idx) => (
                      <div
                        key={idx}
                        className="whitespace-nowrap text-white/20 font-black text-sm sm:text-base tracking-widest uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                      >
                        {label} • PREVIEW ONLY • {label} • PREVIEW ONLY
                      </div>
                    ))}
                  </div>
                )}

                {activeStyle === 'corner_badge' && (
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
          </div>
        </div>

        {/* Right Metadata & Action Sidebar */}
        {showMetadata && (
          <div className="w-80 sm:w-96 bg-[#121824] border-l border-slate-800 h-full overflow-y-auto p-5 space-y-6 shrink-0 shadow-2xl flex flex-col justify-between pb-24 sm:pb-6 z-30">
            <div className="space-y-5">
              {/* Sport & Resolution Badges */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-[#FF6A00]/20 text-[#FF6A00] text-xs font-mono font-bold uppercase border border-[#FF6A00]/30">
                  {sportName}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-black/60 text-[#00F0D0] border border-[#00F0D0]/30 text-xs font-mono font-bold">
                  {photo.resolution || '4K ULTRA-HD'}
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white leading-snug">
                  {photoTitle}
                </h2>
                {photo.caption && (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {photo.caption}
                  </p>
                )}
              </div>

              {/* Event / Matchup Info */}
              <div className="p-3.5 rounded-2xl bg-[#1A2232] border border-slate-800 space-y-2.5 text-xs font-mono">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-[#FF6A00] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Event & Date</div>
                    <div className="text-slate-200 font-medium">{photo.eventName || 'Official League Play'}</div>
                    {photo.eventDate && (
                      <div className="text-[11px] text-slate-400">{photo.eventDate}</div>
                    )}
                  </div>
                </div>

                {photo.venue && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Venue</div>
                    <div className="text-slate-200">{photo.venue}</div>
                  </div>
                )}
              </div>

              {/* Photographer / EXIF Details */}
              <div className="p-3.5 rounded-2xl bg-[#1A2232] border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#00F0D0]" />
                    <span>Creator Credit</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-400">Photographer:</span> {photographer}
                </div>

                {photo.cameraExif && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                    {photo.cameraExif.camera && <div><strong className="text-slate-200">Body:</strong> {photo.cameraExif.camera}</div>}
                    {photo.cameraExif.lens && <div><strong className="text-slate-200">Lens:</strong> {photo.cameraExif.lens}</div>}
                    {photo.cameraExif.shutter && <div><strong className="text-slate-200">Shutter:</strong> {photo.cameraExif.shutter}</div>}
                    {photo.cameraExif.iso && <div><strong className="text-slate-200">ISO:</strong> {photo.cameraExif.iso}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              {/* Clean Download or Purchase Unlock */}
              {isWatermarked ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onUnlock) onUnlock(photo);
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-amber-500 hover:from-amber-500 hover:to-[#FF6A00] text-black font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,106,0,0.35)] transition-all cursor-pointer transform hover:scale-[1.01]"
                  >
                    <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                    <span>Unlock High-Res Download (${effectivePrice.toFixed(2)})</span>
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Watermark removed instantly upon purchase</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {cleanSourceUrl ? (
                    <button
                      type="button"
                      onClick={handleCleanDownload}
                      disabled={downloading}
                      className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
                    >
                      {downloadSuccess ? (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>4K Master File Saved!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 stroke-[2.5]" />
                          <span>Download Clean 4K Master</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3.5 rounded-xl bg-slate-800 text-slate-500 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <span>Master Asset Processing</span>
                    </button>
                  )}

                  <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-emerald-400">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Full commercial & personal rights unlocked</span>
                  </div>
                </div>
              )}

              {/* Secondary Share Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-3 rounded-xl bg-[#1A2232] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Share Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Photo Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoLightboxModal;
