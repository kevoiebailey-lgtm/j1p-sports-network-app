import React, { useCallback, useState } from 'react';
import { 
  Download, 
  Lock, 
  ShieldCheck, 
  Eye, 
  Check, 
  Loader2, 
  Camera, 
  Sparkles, 
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { WatermarkStyle } from '../../utils/watermarkRenderer';
import { useWatermarkedPreview } from '../../hooks/useWatermarkedPreview';
import { downloadPhotoFile } from '../../utils/downloadHelper';

export interface PhotoCardProps {
  photo?: {
    id?: string;
    originalUrl?: string;
    watermarkedUrl?: string;
    imageUrl?: string;
    thumbUrl?: string;
    thumbnailUrl?: string;
    cleanMasterUrl?: string;
    previewUrl?: string;
    url?: string;
    title?: string;
    caption?: string;
    price?: number;
    sport?: string;
    eventName?: string;
    photographerName?: string;
    photographer?: string;
    isPurchased?: boolean;
    isFree?: boolean;
    [key: string]: any;
  };
  photoId?: string;
  imageUrl?: string;
  isUnlocked?: boolean;
  status?: string;
  gallery?: {
    id?: string;
    title?: string;
    isFree?: boolean;
    isPaid?: boolean;
    watermarkStyle?: WatermarkStyle | string;
    singlePhotoPrice?: number;
    fullAlbumPrice?: number;
    sport?: string;
    [key: string]: any;
  };
  isPurchased?: boolean;
  watermarkStyle?: WatermarkStyle;
  label?: string;
  onSelect?: (photo: any) => void;
  onClick?: (photo?: any) => void;
  onDownloadClean?: (photo: any) => void;
  onUnlock?: (photo: any) => void;
  className?: string;
  aspectRatioClass?: string;
  showDetails?: boolean;
  priority?: boolean;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  photoId,
  imageUrl,
  isUnlocked,
  status,
  gallery,
  isPurchased = false,
  watermarkStyle,
  label = 'JUST1PLAY PHOTOS',
  onSelect,
  onClick,
  onDownloadClean,
  onUnlock,
  className = '',
  aspectRatioClass = 'aspect-[4/3]',
  showDetails = true,
  priority = false,
}) => {
  if (!photo && !imageUrl && !photoId) return null;

  const resolvedPhotoId = photoId || photo?.id || 'photo';
  const resolvedSpecificUrl =
    imageUrl ||
    photo?.thumbnailUrl ||
    photo?.previewUrl ||
    photo?.watermarkedUrl ||
    photo?.thumbUrl ||
    photo?.imageUrl ||
    photo?.originalUrl ||
    photo?.url ||
    '';

  const normalizedPhoto: Record<string, any> = {
    id: resolvedPhotoId,
    title: photo?.title || photo?.caption || 'Photo',
    imageUrl: resolvedSpecificUrl,
    thumbnailUrl: resolvedSpecificUrl,
    thumbUrl: resolvedSpecificUrl,
    previewUrl: resolvedSpecificUrl,
    watermarkedUrl: photo?.watermarkedUrl || resolvedSpecificUrl,
    originalUrl: photo?.originalUrl || photo?.cleanMasterUrl || resolvedSpecificUrl,
    cleanMasterUrl: photo?.cleanMasterUrl || photo?.originalUrl || resolvedSpecificUrl,
    price: photo?.price,
    sport: photo?.sport || gallery?.sport || 'Action Sports',
    eventName: photo?.eventName || gallery?.title,
    photographer: photo?.photographerName || photo?.photographer || 'Just1Play Media',
    ...photo
  };

  // Determine pricing & entitlement
  const isFree = Boolean(
    normalizedPhoto.isFree === true ||
    gallery?.isFree === true ||
    (!gallery?.isPaid && (normalizedPhoto.price === 0 || normalizedPhoto.price === undefined) && normalizedPhoto.isFree !== false)
  );
  const hasPurchased = Boolean(
    isUnlocked !== undefined
      ? isUnlocked
      : (isPurchased || normalizedPhoto.isPurchased || isFree)
  );

  // Active watermark style
  const activeStyle: WatermarkStyle = watermarkStyle || 
    ((gallery?.watermarkStyle as WatermarkStyle) || 'shield_center');

  // Master un-watermarked source URL (kept safely in JavaScript closure)
  const cleanSourceUrl =
    normalizedPhoto.cleanMasterUrl ||
    normalizedPhoto.highResDownloadUrl ||
    normalizedPhoto.originalUrl ||
    (normalizedPhoto.vaultPath || (normalizedPhoto.albumId && normalizedPhoto.id)
      ? `/api/media/download?albumId=${normalizedPhoto.albumId || gallery?.id || ''}&photoId=${normalizedPhoto.id}&vaultPath=${encodeURIComponent(normalizedPhoto.vaultPath || '')}&filename=${encodeURIComponent((normalizedPhoto.title || 'photo') + '_4K.jpg')}`
      : '') ||
    normalizedPhoto.imageUrl ||
    resolvedSpecificUrl;

  // Reactive canvas watermark hook with in-memory caching
  const { previewUrl, isWatermarked, loading, corsFallback } = useWatermarkedPreview(
    cleanSourceUrl,
    isFree,
    hasPurchased,
    activeStyle,
    label
  );

  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Clean Download for Free / Purchased items
  const handleCleanDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWatermarked || !cleanSourceUrl) return;

    if (onDownloadClean) {
      onDownloadClean(normalizedPhoto);
      return;
    }

    setDownloading(true);
    try {
      const sanitizedTitle = (normalizedPhoto.title || 'Just1Play_Photo').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadPhotoFile(cleanSourceUrl, `${sanitizedTitle}_4K_Clean.jpg`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Download clean master failed:', err);
    } finally {
      setDownloading(false);
    }
  }, [isWatermarked, cleanSourceUrl, onDownloadClean, normalizedPhoto]);

  const handleUnlockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnlock) {
      onUnlock(normalizedPhoto);
    } else if (onClick) {
      onClick(normalizedPhoto);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(normalizedPhoto);
    } else if (onSelect) {
      onSelect(normalizedPhoto);
    }
  };

  const photoTitle = normalizedPhoto.title || normalizedPhoto.caption || 'Action Capture';
  const effectivePrice = normalizedPhoto.price ?? gallery?.singlePhotoPrice ?? 9.99;
  const sportName = normalizedPhoto.sport || 'Action Sports';
  const photographer = normalizedPhoto.photographerName || normalizedPhoto.photographer || 'Just1Play Media';

  // Protect DOM attributes: Never expose cleanSourceUrl in DOM if isWatermarked is true
  const displaySrc = hasPurchased
    ? (resolvedSpecificUrl || cleanSourceUrl || previewUrl)
    : (previewUrl || resolvedSpecificUrl || normalizedPhoto.thumbUrl || normalizedPhoto.thumbnailUrl);

  return (
    <div
      id={`photo-card-${resolvedPhotoId}`}
      data-testid="photo-card"
      onClick={handleCardClick}
      onContextMenu={(e) => {
        if (isWatermarked) e.preventDefault();
      }}
      className={`group relative w-full bg-[#0D121F] border border-white/10 hover:border-[#00F0D0]/60 rounded-2xl overflow-hidden shadow-xl hover:shadow-[0_0_24px_rgba(0,240,208,0.2)] transition-all duration-300 cursor-pointer flex flex-col justify-between select-none ${className}`}
    >
      {/* 1. Visual Image Container */}
      <div 
        className={`relative w-full ${aspectRatioClass} overflow-hidden bg-[#070A12] flex items-center justify-center`}
        onContextMenu={(e) => {
          if (isWatermarked) e.preventDefault();
        }}
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <Loader2 className="w-6 h-6 text-[#00F0D0] animate-spin" />
          </div>
        )}

        {/* Display Image */}
        {displaySrc && (
          <img
            src={displaySrc}
            alt={isWatermarked ? 'Protected Photo Preview' : photoTitle}
            draggable={false}
            onContextMenu={(e) => {
              if (isWatermarked) e.preventDefault();
            }}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
          />
        )}

        {/* Fallback CSS Watermark Overlay if Canvas is tainted or CORS fails */}
        {isWatermarked && corsFallback && (
          <div className="absolute inset-0 pointer-events-none select-none z-20 flex items-center justify-center overflow-hidden">
            {activeStyle === 'shield_center' && (
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#121316]/70 border-[3px] border-[#2FD35D]/75 shadow-[0_0_24px_rgba(0,0,0,0.85)] backdrop-blur-xs flex flex-col items-center justify-center text-center p-3">
                <span className="text-white font-black text-sm tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  ⚡ JUST1PLAY
                </span>
                <span className="text-[#00F0D0] font-mono font-extrabold text-[10px] tracking-widest mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  PREVIEW PROOF
                </span>
              </div>
            )}

            {activeStyle === 'diagonal_text' && (
              <div className="w-[180%] -rotate-[35deg] flex flex-col gap-6 items-center justify-center">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="whitespace-nowrap text-white/20 font-black text-xs sm:text-sm tracking-widest uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  >
                    {label} • PREVIEW ONLY • {label} • PREVIEW ONLY
                  </div>
                ))}
              </div>
            )}

            {activeStyle === 'corner_badge' && (
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

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-30">
          <span className="px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-[#FF6A00]/40 text-[#FF6A00] text-[9px] font-black uppercase tracking-wider shadow-md">
            {sportName}
          </span>

          {status ? (
            <span className={`px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border ${hasPurchased ? 'border-emerald-500/50 text-emerald-400' : 'border-amber-500/50 text-amber-300'} text-[8px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-md`}>
              {hasPurchased ? <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" /> : <Lock className="w-2.5 h-2.5 text-amber-400" />}
              <span>{status}</span>
            </span>
          ) : isWatermarked ? (
            <span className="px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-amber-500/50 text-amber-300 text-[8px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Lock className="w-2.5 h-2.5 text-amber-400" />
              <span>Protected Proof</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-emerald-500/50 text-emerald-400 text-[8px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
              <span>Clean 4K Master</span>
            </span>
          )}
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090D16]/95 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-3 z-30 pointer-events-none">
          <span className="text-xs font-black text-[#00F0D0] flex items-center gap-1.5 font-mono">
            <Eye className="w-3.5 h-3.5" />
            <span>{isWatermarked ? 'Inspect Preview Proof' : 'View Clean 4K Master'}</span>
          </span>

          {/* Quick Action in Hover: Unlock or Download */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            {isWatermarked ? (
              <button
                type="button"
                onClick={handleUnlockClick}
                className="px-2.5 py-1 rounded-lg bg-[#FF6A00] hover:bg-[#FF8533] text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg cursor-pointer transition-transform active:scale-95"
              >
                <ShoppingCart className="w-3 h-3 stroke-[2.5]" />
                <span>Unlock ${effectivePrice.toFixed(2)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCleanDownload}
                disabled={downloading}
                className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg cursor-pointer transition-transform active:scale-95"
                title="Download Clean High-Res Photo"
              >
                {downloadSuccess ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Card Details */}
      {showDetails && (
        <div className="p-3 flex-1 flex flex-col justify-between space-y-2 bg-[#0B0F19]">
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight line-clamp-1 group-hover:text-[#00F0D0] transition-colors">
              {photoTitle}
            </h3>
            {normalizedPhoto.eventName && normalizedPhoto.eventName !== photoTitle && (
              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-medium">
                {normalizedPhoto.eventName}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
            <span className="truncate max-w-[60%] text-slate-300">
              📷 {photographer.split('•')[0]?.trim()}
            </span>

            {isWatermarked ? (
              <button
                type="button"
                onClick={handleUnlockClick}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Unlock ${effectivePrice.toFixed(2)}</span>
              </button>
            ) : (
              <span className="text-[#00F0D0] font-bold flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Unlocked</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoCard;
