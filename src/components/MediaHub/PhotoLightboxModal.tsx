import React, { useState, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  ShoppingCart, 
  Bookmark, 
  Share2, 
  Check, 
  Calendar, 
  MapPin, 
  Camera, 
  Sliders, 
  User, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Info,
  Maximize2,
  Minimize2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MediaVaultItem } from '../../types/mediaVault';
import { useResolvedStorageUrl } from '../../utils/storageUrlResolver';
import { useWatermarkedPreview } from '../../hooks/useWatermarkedPreview';
import WatermarkOverlay from './WatermarkOverlay';

interface PhotoLightboxModalProps {
  item: MediaVaultItem | null;
  onClose: () => void;
  onOpenPurchase: (item: MediaVaultItem) => void;
  onTogglePin: (item: MediaVaultItem) => void;
  onNavigateTab?: (tab: string) => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  item,
  onClose,
  onOpenPurchase,
  onTogglePin,
  onNavigateTab
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showMetadataDrawer, setShowMetadataDrawer] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Reset zoom on item change
  useEffect(() => {
    setZoomLevel(1);
    setCopiedLink(false);
  }, [item?.id]);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const isPurchased = !!item.isPurchased;
  const isPinned = !!item.isPinnedToProfile;

  const targetMediaSource = isPurchased ? (item.highResDownloadUrl || item.mediaUrl) : item.mediaUrl;
  const { resolvedUrl: resolvedImageSrc, isLoading: isImageResolving } = useResolvedStorageUrl(targetMediaSource);

  const cleanSourceUrl = resolvedImageSrc || targetMediaSource || '';
  const isFree = (item as any).isFree === true || item.price === 0;
  const { previewUrl, isWatermarked, loading: isWatermarking, corsFallback } = useWatermarkedPreview(
    cleanSourceUrl,
    isFree,
    isPurchased,
    'shield_center',
    'JUST1PLAY PHOTOS'
  );

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.35, 2.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.35, 1));
  const handleZoomReset = () => setZoomLevel(1);

  const handleCopyShareLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/media?photo=${encodeURIComponent(item.id)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownload = () => {
    // In preview, simulate instant download of 4K RAW file
    setDownloadSuccess(true);
    const link = document.createElement('a');
    link.href = item.highResDownloadUrl || item.mediaUrl;
    link.download = `Just1Play_${item.sport}_${item.id}_4K_RAW.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl overflow-y-auto pb-40 sm:pb-0">
        {/* Top Control Bar */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 sm:p-5 bg-gradient-to-b from-black/90 to-transparent">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-[#F59E0B] text-xs font-mono font-black uppercase flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              <span>HIGH-RES PRO VAULT</span>
            </div>
            <span className="text-xs font-mono text-slate-300 hidden md:inline truncate max-w-sm">
              {item.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-[#1E2630]/90 border border-[#2D3748] rounded-xl p-1 text-slate-300">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className="p-1.5 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-2 font-bold text-[#00F2FE]">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2.5}
                className="p-1.5 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {zoomLevel > 1 && (
                <button
                  onClick={handleZoomReset}
                  className="p-1.5 hover:text-white border-l border-[#2D3748] ml-1 cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Toggle Drawer */}
            <button
              onClick={() => setShowMetadataDrawer(!showMetadataDrawer)}
              className={`p-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                showMetadataDrawer
                  ? 'bg-[#00F2FE]/20 text-[#00F2FE] border-[#00F2FE]/50'
                  : 'bg-[#1E2630] text-slate-300 border-[#2D3748]'
              }`}
              title="Toggle Details Drawer"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1E2630] hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-[#2D3748] hover:border-red-500/40 transition-all cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body: Photo Viewport + Right Metadata Drawer */}
        <div className="w-full h-full pt-16 flex overflow-hidden">
          {/* Photo Viewport */}
          <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden select-none">
            <div 
              className="relative max-w-full max-h-full transition-transform duration-200 ease-out flex items-center justify-center"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {(isImageResolving || isWatermarking) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs rounded-xl z-20">
                  <div className="w-10 h-10 rounded-full border-2 border-[#00B8D4]/40 border-t-[#00B8D4] animate-spin" />
                </div>
              )}

              <img
                src={previewUrl || (isWatermarked ? '' : cleanSourceUrl)}
                alt={isWatermarked ? 'Protected Photo Proof' : item.title}
                draggable={false}
                onContextMenu={(e) => {
                  if (isWatermarked) e.preventDefault();
                }}
                className="max-h-[82vh] max-w-[85vw] object-contain rounded-xl shadow-2xl border border-white/10 select-none pointer-events-none"
              />

              {/* WatermarkOverlay: clearly visible across center and diagonally */}
              <WatermarkOverlay className="z-20" />

              {/* Watermark Fallback on Preview */}
              {isWatermarked && corsFallback && (
                <div className="absolute inset-0 pointer-events-none select-none z-10 flex items-center justify-center overflow-hidden rounded-xl">
                  <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-[#121316]/70 border-[3px] border-[#2FD35D]/75 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
                    <span className="text-white font-black text-base sm:text-lg tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      ⚡ JUST1PLAY
                    </span>
                    <span className="text-[#00F0D0] font-mono font-extrabold text-xs tracking-widest mt-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                      PREVIEW PROOF
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Metadata Drawer */}
          <AnimatePresence>
            {showMetadataDrawer && (
              <motion.div
                initial={{ x: 340, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 340, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="w-80 sm:w-96 bg-[#161C22] border-l border-[#2D3748] h-full overflow-y-auto p-5 space-y-6 shrink-0 shadow-2xl flex flex-col justify-between pb-40 sm:pb-5"
              >
                <div className="space-y-5">
                  {/* Header Title & Tags */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-[#F59E0B] text-xs font-mono font-bold uppercase">
                        {item.sport}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-black/50 text-[#00F2FE] border border-[#00F2FE]/30 text-xs font-mono font-bold">
                        {item.resolution}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                      {item.title}
                    </h2>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Event & Venue Info */}
                  <div className="p-3.5 rounded-2xl bg-[#1E2630] border border-[#2D3748] space-y-2.5 text-xs font-mono">
                    <div className="flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase text-slate-400 font-bold">Event & Date</div>
                        <div className="text-slate-200 font-medium">{item.eventName}</div>
                        <div className="text-[11px] text-slate-400">{item.eventDate}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 pt-2 border-t border-[#2D3748]">
                      <MapPin className="w-4 h-4 text-[#00F2FE] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase text-slate-400 font-bold">Venue & Opponents</div>
                        <div className="text-slate-200">{item.venue}</div>
                        {item.opponents && (
                          <div className="text-[11px] text-slate-400 italic">{item.opponents}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Camera EXIF / Photographer Credit */}
                  <div className="p-3.5 rounded-2xl bg-[#1E2630] border border-[#2D3748] space-y-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>Camera EXIF & Credit</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">PRO SHOT</span>
                    </div>

                    {item.photographer && (
                      <div className="text-[11px] text-slate-300">
                        <span className="text-slate-400">Photographer:</span> {item.photographer}
                      </div>
                    )}

                    {item.cameraExif && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2D3748] text-[10px] text-slate-400">
                        <div><strong className="text-slate-200">Body:</strong> {item.cameraExif.camera}</div>
                        <div><strong className="text-slate-200">Lens:</strong> {item.cameraExif.lens}</div>
                        <div><strong className="text-slate-200">Shutter:</strong> {item.cameraExif.shutter}</div>
                        <div><strong className="text-slate-200">ISO:</strong> {item.cameraExif.iso}</div>
                      </div>
                    )}
                  </div>

                  {/* Tagged Athletes */}
                  {item.taggedAthletes && item.taggedAthletes.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#00F2FE]" />
                        <span>Tagged Prospects & Athletes</span>
                      </div>

                      <div className="space-y-1.5">
                        {item.taggedAthletes.map((athlete, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#1E2630] border border-[#2D3748] hover:border-[#F59E0B]/40 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={athlete.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                                alt={athlete.name}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-[#2D3748]"
                              />
                              <div>
                                <div className="text-xs font-bold text-white flex items-center gap-1">
                                  <span>{athlete.name}</span>
                                  <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  {athlete.position} • {athlete.school} • '{athlete.gradYear}
                                </div>
                              </div>
                            </div>

                            {onNavigateTab && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onNavigateTab('athletes');
                                }}
                                className="text-[10px] font-mono text-[#F59E0B] hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <span>Profile</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Drawer */}
                <div className="pt-4 border-t border-[#2D3748] space-y-2.5">
                  {/* Digital Purchase or Download */}
                  {isPurchased ? (
                    <button
                      onClick={handleDownload}
                      className="w-full py-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>{downloadSuccess ? '4K File Saved!' : 'Download 4K RAW File'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenPurchase(item)}
                      className="w-full py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all transform hover:scale-[1.01] cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                      <span>Buy High-Res Download (${item.price.toFixed(2)})</span>
                    </button>
                  )}

                  {/* Secondary Actions: Pin to Profile & Share Link */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onTogglePin(item)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isPinned
                          ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]'
                          : 'bg-[#1E2630] text-slate-300 hover:text-white border-[#2D3748]'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isPinned ? 'fill-[#F59E0B]' : ''}`} />
                      <span>{isPinned ? 'Pinned' : 'Pin to Profile'}</span>
                    </button>

                    <button
                      onClick={handleCopyShareLink}
                      className="py-2.5 px-3 rounded-xl bg-[#1E2630] hover:bg-[#283340] text-slate-300 hover:text-white border border-[#2D3748] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#10B981]" />
                          <span className="text-[#10B981]">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AnimatePresence>
  );
};
