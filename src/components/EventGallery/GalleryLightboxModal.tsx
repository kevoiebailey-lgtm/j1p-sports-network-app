import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Share2, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Camera, 
  Calendar, 
  Tag, 
  ShieldCheck, 
  Check, 
  Sparkles,
  ExternalLink,
  MessageSquare,
  ShoppingBag
} from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { GalleryMediaItem } from '../../types';
import { SportsGalleryImage } from '../RoleViews/Universal/SportsGalleryImage';
import { isGoogleDriveUrlOrId, resolveGoogleDriveImageUrl } from '../../utils/storageUrlResolver';
import PhotoDownloadButton from '../PhotoDownloadButton';
import { UniversalVideoPlayer } from '../Common/UniversalVideoPlayer';

interface GalleryLightboxModalProps {
  item: GalleryMediaItem | null;
  itemsList: GalleryMediaItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  currentIndex: number;
}

export const GalleryLightboxModal: React.FC<GalleryLightboxModalProps> = ({
  item,
  itemsList,
  isOpen,
  onClose,
  onSelectIndex,
  currentIndex
}) => {
  const { user, profile, role } = useAuth();
  const { showToast } = useToast();

  const [zoomLevel, setZoomLevel] = useState(1);
  const [hasHyped, setHasHyped] = useState(false);
  const [localHypes, setLocalHypes] = useState(item?.hypesCount || 0);
  const [copied, setCopied] = useState(false);
  const [showCleanMaster, setShowCleanMaster] = useState(false);

  const userRoleStr = (role as string) || (profile?.role as string) || '';
  const isAdminOrDirector = ['admin', 'director', 'tournament_director'].includes(userRoleStr);

  // Sync state when active item changes
  useEffect(() => {
    if (item) {
      setLocalHypes(item.hypesCount || 0);
      const alreadyHyped = user && item.userHypes ? !!item.userHypes[user.uid] : false;
      setHasHyped(alreadyHyped);
      setZoomLevel(1);
      setShowCleanMaster(false);
    }
  }, [item, user]);

  // Keyboard navigation (Arrow keys & Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < itemsList.length - 1) {
          onSelectIndex(currentIndex + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          onSelectIndex(currentIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, itemsList.length, onClose, onSelectIndex]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onSelectIndex(currentIndex - 1);
    }
  }, [currentIndex, onSelectIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < itemsList.length - 1) {
      onSelectIndex(currentIndex + 1);
    }
  }, [currentIndex, itemsList.length, onSelectIndex]);

  const handleHype = async () => {
    if (!item) return;

    if (!user) {
      showToast('info', 'Sign In Required', 'Create a free account or sign in to hype gallery action shots.');
      return;
    }

    if (hasHyped) return;

    // Optimistic update
    setHasHyped(true);
    setLocalHypes((prev) => prev + 1);

    try {
      if (item.id && !item.id.startsWith('demo-')) {
        const itemRef = doc(db, 'gallery', item.id);
        await updateDoc(itemRef, {
          hypesCount: increment(1),
          [`userHypes.${user.uid}`]: true
        });
      }
      showToast('success', '⚡ Hyped!', 'Added your boost to this tournament action shot.');
    } catch (err) {
      console.warn('Hype sync note:', err);
    }
  };

  const handleShareToLockerRoom = () => {
    if (!item) return;

    const shareUrl = `${window.location.origin}/gallery?photoId=${item.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showToast('success', '🔗 Link Copied', 'Photo link copied to clipboard. Ready to paste in the Locker Room!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!item) return;

    const rawUrl = (isAdminOrDirector || showCleanMaster) 
      ? item.originalUrl 
      : (item.watermarkedUrl || item.originalUrl);

    const downloadUrl = isGoogleDriveUrlOrId(rawUrl)
      ? resolveGoogleDriveImageUrl(rawUrl, 'full')
      : rawUrl;

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `JUST1PLAY_${item.sport}_${item.id || 'photo'}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast('success', '📥 Download Started', 'Saving high-resolution sports action shot to your device.');
  };

  if (!isOpen || !item) return null;

  const currentDisplayUrl = (isAdminOrDirector && showCleanMaster) 
    ? item.originalUrl 
    : (item.watermarkedUrl || item.originalUrl);

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#090D16]/95 backdrop-blur-2xl p-2 sm:p-4 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Control Bar */}
        <div className="absolute top-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-b from-[#090D16] via-[#090D16]/80 to-transparent flex items-center justify-between px-4 sm:px-6 z-20">
          {/* Photographer & Event Header */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#00B8D4]/20 border border-[#00B8D4]/50 flex items-center justify-center text-[#00B8D4] shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-white truncate">
                  {item.photographerName || 'Official Media Partner'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#00B8D4]/20 text-[#00B8D4] text-[10px] font-mono font-black uppercase">
                  Verified Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {item.eventName} {item.albumName ? `• ${item.albumName}` : ''}
              </p>
            </div>
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-800/80 border border-slate-700 rounded-xl p-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-slate-400 px-2">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                aria-label="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Admin Clean Master Toggle */}
            {isAdminOrDirector && item.isWatermarked && (
              <button
                onClick={() => setShowCleanMaster(!showCleanMaster)}
                className={`min-h-[48px] px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  showCleanMaster 
                    ? 'bg-[#00B8D4]/20 border-[#00B8D4] text-[#00B8D4]' 
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden md:inline">{showCleanMaster ? 'Clean Master' : 'Watermark Proof'}</span>
              </button>
            )}

            {/* Close Modal Button (Min 48px target) */}
            <button
              onClick={onClose}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-white transition-all cursor-pointer shadow-lg active:scale-95"
              aria-label="Close fullscreen lightbox"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Previous Navigation Button (Min 48px target) */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 min-h-[48px] min-w-[48px] z-30 flex items-center justify-center rounded-2xl bg-slate-900/80 hover:bg-[#00B8D4] border border-slate-700 hover:border-[#00B8D4] text-white hover:text-[#090D16] transition-all cursor-pointer shadow-2xl active:scale-90"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Navigation Button (Min 48px target) */}
        {currentIndex < itemsList.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 min-h-[48px] min-w-[48px] z-30 flex items-center justify-center rounded-2xl bg-slate-900/80 hover:bg-[#00B8D4] border border-slate-700 hover:border-[#00B8D4] text-white hover:text-[#090D16] transition-all cursor-pointer shadow-2xl active:scale-90"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Main Photo / Video Display Stage */}
        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-16 pt-20 pb-28 select-none">
          {(() => {
            const isVideoItem = Boolean(
              item.videoUrl || 
              item.googleDriveFileId ||
              item.category === 'Game Film' ||
              item.category === 'Game Highlights' ||
              item.category === 'Video Reels' ||
              (typeof item.originalUrl === 'string' && (item.originalUrl.includes('drive.google.com') || item.originalUrl.match(/\.(mp4|mov|webm|m4v)/i)))
            );

            const videoTargetUrl = item.videoUrl || 
              (item.googleDriveFileId ? `https://drive.google.com/file/d/${item.googleDriveFileId}/preview` : item.originalUrl);

            if (isVideoItem && videoTargetUrl) {
              return (
                <div className="w-full max-w-4xl max-h-[75vh] flex items-center justify-center z-10">
                  <UniversalVideoPlayer
                    videoUrl={videoTargetUrl}
                    title={item.title || item.eventName || 'Tournament Game Film'}
                    autoPlay={true}
                    controls={true}
                    className="w-full max-h-[75vh] rounded-2xl shadow-[0_0_60px_rgba(0,184,212,0.3)] border border-[#00B8D4]/40"
                  />
                </div>
              );
            }

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
                className="max-w-full max-h-full flex items-center justify-center overflow-hidden rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#24324F]"
              >
                <SportsGalleryImage
                  src={currentDisplayUrl}
                  alt={item.title || item.eventName}
                  sport={item.sport}
                  category={item.category}
                  title={item.title}
                  priority={true}
                  className="max-h-[70vh] sm:max-h-[75vh] w-auto max-w-full object-contain rounded-xl"
                  containerClassName="max-h-[70vh] sm:max-h-[75vh] max-w-full flex items-center justify-center bg-[#141B2D] rounded-xl overflow-hidden"
                />
              </motion.div>
            );
          })()}
        </div>

        {/* Bottom Floating Action Dock */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/90 to-transparent p-4 sm:p-6 pb-36 sm:pb-6 z-20">
          <div className="max-w-4xl mx-auto bg-[#263238]/90 border border-[#24324F] rounded-2xl p-3 sm:p-4 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Metadata Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] text-xs font-black uppercase tracking-wider">
                {item.sport}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">
                {item.category}
              </span>
              {item.teams && item.teams.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hidden md:inline">
                  {item.teams.join(' vs ')}
                </span>
              )}
              <span className="text-xs font-mono text-slate-400">
                Photo {currentIndex + 1} of {itemsList.length}
              </span>
            </div>

            {/* Interactive Actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {/* ⚡ Hype Reaction Button (Min 48px target) */}
              <button
                onClick={handleHype}
                className={`min-h-[48px] px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  hasHyped
                    ? 'bg-[#FF6A00] text-white shadow-[0_0_15px_rgba(255,106,0,0.5)] scale-105'
                    : 'bg-slate-800 hover:bg-[#FF6A00]/20 text-slate-200 hover:text-[#FF6A00] border border-slate-700'
                }`}
              >
                <Zap className={`w-4 h-4 ${hasHyped ? 'fill-white animate-pulse' : 'text-[#FF6A00]'}`} />
                <span>{localHypes} Hype{localHypes === 1 ? '' : 's'}</span>
              </button>

              {/* Share to Locker Room (Min 48px target) */}
              <button
                onClick={handleShareToLockerRoom}
                className="min-h-[48px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#00B8D4]" />
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share to Locker Room'}</span>
              </button>

              {/* Download / Purchase High-Res CTA with PayPal Integration */}
              <PhotoDownloadButton
                photo={{
                  id: item.id,
                  title: `${item.sport} - ${item.category}`,
                  galleryId: item.category,
                  originalStoragePath: item.originalUrl,
                  storageFilePath: item.originalUrl,
                  previewUrl: item.watermarkedUrl || item.originalUrl,
                  mediaUrl: item.originalUrl,
                  price: 2.00,
                }}
                className="min-h-[48px] rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
