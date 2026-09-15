/**
 * PayPal Payment Success & Asset Unlock Modal
 * Delivers instant post-purchase verification without external CRM email bloat.
 * Features:
 * - Unlocked badge with cyber emerald glow
 * - Unwatermarked high-res thumbnail preview
 * - Direct one-tap "Download High-Res" action
 * - Navigation to "My Locker / Purchases" tab (/profile?tab=locker)
 */

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Sparkles, 
  FolderLock, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  FileCheck,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface PayPalSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  itemTitle: string;
  unwatermarkedUrl: string;
  thumbnailUrl?: string;
  amount: number;
  currency?: string;
  galleryId?: string;
  mediaType?: 'photo' | 'album' | 'video_reel' | 'raw_tape';
  onNavigateToLocker?: () => void;
}

export const PayPalSuccessModal: React.FC<PayPalSuccessModalProps> = ({
  isOpen,
  onClose,
  orderId,
  itemTitle,
  unwatermarkedUrl,
  thumbnailUrl,
  amount,
  currency = 'USD',
  galleryId,
  mediaType = 'photo',
  onNavigateToLocker,
}) => {
  const navigate = useNavigate();
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadCompleted, setDownloadCompleted] = useState(false);

  if (!isOpen) return null;

  const displayImage = unwatermarkedUrl || thumbnailUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=90';

  const handleCopyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleDirectDownload = async () => {
    if (!unwatermarkedUrl && !thumbnailUrl) return;
    setDownloading(true);
    try {
      const targetUrl = unwatermarkedUrl || thumbnailUrl || '';
      const cleanName = `${(itemTitle || 'just1play_photo').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_highres.jpg`;
      
      const response = await fetch(targetUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = cleanName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setDownloadCompleted(true);
    } catch (e) {
      console.warn('[Direct Download Fallback]:', e);
      // Fallback open direct
      window.open(unwatermarkedUrl || thumbnailUrl, '_blank');
      setDownloadCompleted(true);
    } finally {
      setDownloading(false);
    }
  };

  const handleGoToLocker = () => {
    onClose();
    if (onNavigateToLocker) {
      onNavigateToLocker();
    } else {
      navigate('/profile?tab=locker');
    }
  };

  return (
    <div 
      id="paypal-success-modal-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="paypal-success-modal-card"
        className="relative w-full max-w-lg bg-[#0D1520] border border-emerald-500/40 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Accent Header */}
        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-[#00E5FF] to-teal-400 animate-pulse" />

        {/* Close Icon Button */}
        <button
          id="close-paypal-success-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-700/80 transition-all cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Unlocked Confirmation Badge */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Asset Unlocked &bull; Clean Master</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[#00E5FF] text-[11px] font-mono">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>FCM Verified</span>
            </div>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
              <span>Payment Confirmed</span>
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
            </h2>
            <p className="text-sm text-slate-300 mt-1 font-sans">
              Your photo package is ready. The watermark has been removed and your clean high-resolution master is available in your permanent Media Locker.
            </p>
          </div>

          {/* Unwatermarked Asset Preview Box */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 aspect-[16/10] group">
            <img 
              src={displayImage} 
              alt={itemTitle}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* Watermark-Free Certified Tag */}
            <div className="absolute top-3 left-3 bg-[#0B0F17]/85 backdrop-blur-md border border-emerald-500/40 px-3 py-1 rounded-lg text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% UNWATERMARKED</span>
            </div>

            {/* Resolution Badge */}
            <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-mono font-bold text-slate-300 border border-white/10">
              24.2 MP RAW / 4K UHD
            </div>
          </div>

          {/* Order Details Grid */}
          <div className="bg-[#131E2E] border border-white/5 rounded-2xl p-4 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Item:</span>
              <span className="text-white font-bold max-w-[220px] truncate text-right">{itemTitle}</span>
            </div>
            
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Total Paid:</span>
              <span className="text-emerald-400 font-black text-sm">${Number(amount).toFixed(2)} {currency}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-white/5">
              <span className="text-slate-400">Order Ref:</span>
              <button
                type="button"
                onClick={handleCopyOrderId}
                className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold transition-colors cursor-pointer"
                title="Click to copy Order ID"
              >
                <span>{orderId ? `${orderId.substring(0, 16)}...` : 'COMPLETED'}</span>
                {copiedOrderId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1">
              <span>License Granted:</span>
              <span className="text-slate-200 font-sans flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                Full Personal & Social Use
              </span>
            </div>
          </div>

          {/* Push Notification Notice */}
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-300/90 font-sans">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              An FCM payment receipt notification has been dispatched to your active devices. You can re-download this asset anytime in your locker.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-1">
            {/* Primary Action: Direct Download High-Res */}
            <button
              id="download-high-res-btn"
              onClick={handleDirectDownload}
              disabled={downloading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-[#00E5FF] hover:opacity-95 text-neutral-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className={`w-5 h-5 ${downloading ? 'animate-bounce' : ''}`} />
              <span>
                {downloading ? 'Preparing High-Res File...' : downloadCompleted ? 'Download Again' : 'Download High-Res Original'}
              </span>
            </button>

            {/* Secondary Action: Go to Media Locker */}
            <button
              id="go-to-locker-btn"
              onClick={handleGoToLocker}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#15202E] hover:bg-[#1C2C40] border border-cyan-500/30 text-[#00E5FF] font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <FolderLock className="w-4 h-4 text-[#00E5FF]" />
              <span>View in My Media Locker</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
