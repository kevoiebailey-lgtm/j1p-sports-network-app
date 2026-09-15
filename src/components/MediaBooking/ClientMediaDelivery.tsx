import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BentoCard } from '../BentoCard';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, setDoc } from 'firebase/firestore';
import { 
  Lock, 
  Unlock, 
  Download, 
  CreditCard, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  FileArchive, 
  Share2, 
  Eye, 
  Loader2, 
  AlertCircle,
  Video,
  Camera,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkle
} from 'lucide-react';

export interface GalleryMediaItem {
  id: string;
  title: string;
  type: 'photo' | 'video';
  thumbnailUrl: string;
  highResUrl: string;
  resolution: string;
  fileSize: string;
}

const SAMPLE_MEDIA_ITEMS: GalleryMediaItem[] = [
  {
    id: 'media-1',
    title: '4th Quarter Game-Winning Touchdown Catch',
    type: 'photo',
    thumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=800&q=80',
    highResUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=2400&q=100',
    resolution: '6000 x 4000 4K DSLR Raw',
    fileSize: '18.4 MB'
  },
  {
    id: 'media-2',
    title: 'Fast-Break Dunk Spotlight Drive',
    type: 'photo',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
    highResUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=2400&q=100',
    resolution: '5800 x 3800 4K DSLR Raw',
    fileSize: '16.8 MB'
  },
  {
    id: 'media-3',
    title: 'NCAA Scout Highlight Reel Mix (60 FPS)',
    type: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    highResUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=2400&q=100',
    resolution: '4K Ultra HD (3840x2160) 60FPS Pro-Res',
    fileSize: '480.2 MB'
  },
  {
    id: 'media-4',
    title: 'Sideline Pregame Warmup Focus',
    type: 'photo',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=800&q=80',
    highResUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=2400&q=100',
    resolution: '6100 x 4060 4K DSLR Raw',
    fileSize: '19.1 MB'
  },
  {
    id: 'media-5',
    title: 'Mic’d Up Quarterback Huddle Break',
    type: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    highResUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=2400&q=100',
    resolution: '4K Ultra HD 60FPS Audio Sync',
    fileSize: '320.5 MB'
  },
  {
    id: 'media-6',
    title: 'Post-Game Celebration & Trophy Shot',
    type: 'photo',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
    highResUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=2400&q=100',
    resolution: '6000 x 4000 4K DSLR Raw',
    fileSize: '17.9 MB'
  }
];

export const ClientMediaDelivery: React.FC = () => {
  const { user } = useAuth();

  // Booking & Payment States
  const [bookingId, setBookingId] = useState<string>('bk-demo-2026');
  const [serviceType, setServiceType] = useState<string>('4K Pregame & Game Coverage');
  const [totalAmount, setTotalAmount] = useState<number>(349.00);
  const [depositAmount, setDepositAmount] = useState<number>(174.50);
  const [balanceAmount, setBalanceAmount] = useState<number>(174.50);
  const [paymentStatus, setPaymentStatus] = useState<'Deposit Paid' | 'Balance Pending' | 'Fully Paid'>('Balance Pending');
  const [mediaUnlocked, setMediaUnlocked] = useState<boolean>(false);

  // UI Flow States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<GalleryMediaItem | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Detect URL parameter return from PayPal
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('payment') === 'balance_success' || query.get('unlocked') === 'true') {
      setPaymentStatus('Fully Paid');
      setMediaUnlocked(true);
      setStatusMsg('🎉 Payment Received! High-Res Gallery is 100% Unlocked.');

      // Update Firestore if bookingId exists
      const queryBookingId = query.get('bookingId') || bookingId;
      try {
        const docRef = doc(db, 'bookings', queryBookingId);
        updateDoc(docRef, {
          paymentStatus: 'Fully Paid',
          status: 'Fully Paid',
          mediaUnlocked: true,
          balancePaidAt: new Date().toISOString()
        }).catch(err => console.warn('Firestore update notice:', err));
      } catch (err) {
        console.warn('Firestore notice:', err);
      }
    }
  }, []);

  // Handle Pay Balance Checkout Redirect
  const handlePayBalance = async () => {
    setIsLoading(true);
    setStatusMsg('Initiating PayPal Final Balance Checkout...');

    try {
      const response = await fetch('/api/create-balance-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId,
          userId: user?.uid || 'guest-user',
          balanceAmount,
          serviceType,
          userEmail: user?.email || 'client@example.com',
          albumId: 'album-demo-101'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize final balance checkout session');
      }

      if (data.checkoutUrl || data.url) {
        window.location.href = data.checkoutUrl || data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Error during balance payment:', err);
      setStatusMsg(`Error: ${err.message || 'Server connection failed'}`);
      setIsLoading(false);
    }
  };

  // Simulate ZIP Download
  const handleDownloadZip = () => {
    if (!mediaUnlocked) return;
    setIsDownloadingZip(true);
    setTimeout(() => {
      setIsDownloadingZip(false);
      setDownloadSuccessToast('All 6 High-Res 4K Files Downloaded as ZIP (773.3 MB)!');
      setTimeout(() => setDownloadSuccessToast(null), 6000);
    }, 2000);
  };

  // Toggle State for Dev Testing
  const togglePaymentState = () => {
    if (mediaUnlocked) {
      setPaymentStatus('Balance Pending');
      setMediaUnlocked(false);
      setStatusMsg('Switched to STATE A: Locked Gallery (Balance Pending)');
    } else {
      setPaymentStatus('Fully Paid');
      setMediaUnlocked(true);
      setStatusMsg('Switched to STATE B: Unlocked Gallery (Fully Paid)');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-[#050505] border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-slate-600 text-black rounded-sm">
                CLIENT MEDIA PORTAL
              </span>
              {mediaUnlocked ? (
                <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-[#E5B868] text-black rounded-sm flex items-center gap-1 shadow-[0_0_12px_rgba(214,28,36,0.5)]">
                  <Unlock className="w-3 h-3" /> FULLY PAID & UNLOCKED
                </span>
              ) : (
                <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-amber-400 text-black rounded-sm flex items-center gap-1">
                  <Lock className="w-3 h-3" /> BALANCE PENDING ($174.50)
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black italic tracking-tight text-white uppercase font-sans">
              CLIENT MEDIA GALLERY<span className="text-[#E5B868] drop-shadow-[0_0_10px_#E5B868]">.</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              {mediaUnlocked 
                ? 'Your high-resolution media package is 100% unlocked. Download full raw files and 4K video clips below.'
                : 'Your media photos and videos are processed and ready! Pay the final balance to remove watermarks and unlock high-res downloads.'}
            </p>
          </div>

          {/* Dev Demo State Switcher Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePaymentState}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/15 rounded-2xl text-xs font-mono font-bold text-slate-300 flex items-center gap-2 transition-all cursor-pointer hover:border-[#E5B868]"
              title="Toggle between Locked and Unlocked state for evaluation"
            >
              <Layers className="w-4 h-4 text-[#E5B868]" />
              <span>TEST STATE: {mediaUnlocked ? 'STATE B (UNLOCKED)' : 'STATE A (LOCKED)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* STATUS NOTIFICATION TOAST */}
      {statusMsg && (
        <div className="p-4 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/40 text-[#E5B868] text-xs font-mono font-bold flex items-center justify-between animate-fadeIn shadow-[0_0_15px_rgba(214,28,36,0.2)]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* STATE A: LOCKED BANNER (When paymentStatus == 'Balance Pending' or mediaUnlocked == false) */}
      {!mediaUnlocked && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#0a120b] via-[#050505] to-[#120a00] border-2 border-[#E5B868] p-6 sm:p-8 shadow-[0_0_40px_rgba(214,28,36,0.25)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>STAGE 2 FINAL BALANCE REQUIRED</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight font-sans">
                YOUR MEDIA IS READY! PAY REMAINING BALANCE OF <span className="text-[#E5B868] font-mono">${balanceAmount.toFixed(2)}</span> TO UNLOCK HIGH-RES DOWNLOADS.
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Deposit of <strong className="text-white">${depositAmount.toFixed(2)}</strong> was received. Your videographer has uploaded 6 high-res 4K files. Complete the final balance to remove watermarks and receive full ZIP access.
              </p>
            </div>

            {/* Financial Ledger & Checkout Trigger */}
            <div className="bg-[#050505]/90 border border-white/15 rounded-2xl p-5 space-y-4 shrink-0 min-w-[280px] font-mono">
              <div className="space-y-2 text-xs border-b border-white/10 pb-3">
                <div className="flex justify-between text-slate-400">
                  <span>Total Media Package:</span>
                  <span className="text-white font-bold">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Deposit Paid (50%):</span>
                  <span className="text-[#E5B868] font-bold">-${depositAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-200 pt-1 font-bold">
                  <span>Final Balance Due:</span>
                  <span className="text-[#E5B868] text-sm">${balanceAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* STAGE 2 ACTION BUTTON */}
              <button
                onClick={handlePayBalance}
                disabled={isLoading}
                className="w-full py-4 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_30px_rgba(214,28,36,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>CONNECTING TO PAYPAL...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 stroke-[2.5]" />
                    <span>PAY BALANCE (${balanceAmount.toFixed(2)}) & UNLOCK MEDIA</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE B: UNLOCKED HEADER ACTIONS (When Fully Paid) */}
      {mediaUnlocked && (
        <div className="rounded-3xl bg-[#E5B868]/10 border-2 border-[#E5B868] p-6 shadow-[0_0_30px_rgba(214,28,36,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#E5B868] text-black rounded-2xl shadow-[0_0_15px_rgba(214,28,36,0.5)]">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase text-white font-sans">
                FULL GALLERY UNLOCKED & WATERMARKS REMOVED
              </h3>
              <p className="text-xs text-slate-300">
                100% Fully Paid (${totalAmount.toFixed(2)}). All 4K DSLR photos and high-frame-rate video files are unlocked for instant download.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            className="px-6 py-3.5 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(214,28,36,0.4)] transition-all flex items-center justify-center gap-2.5 cursor-pointer shrink-0 disabled:opacity-50 font-mono"
          >
            {isDownloadingZip ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>COMPRESSING ZIP ARCHIVE...</span>
              </>
            ) : (
              <>
                <FileArchive className="w-4 h-4 stroke-[2.5]" />
                <span>DOWNLOAD ALL MEDIA (ZIP - 773.3 MB)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Download ZIP Toast Confirmation */}
      {downloadSuccessToast && (
        <div className="p-4 rounded-2xl bg-[#E5B868] text-black text-xs font-mono font-black flex items-center justify-between shadow-[0_0_25px_rgba(214,28,36,0.6)] animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{downloadSuccessToast}</span>
          </div>
          <button onClick={() => setDownloadSuccessToast(null)} className="text-black hover:opacity-70 font-bold">✕</button>
        </div>
      )}

      {/* GALLERY GRID SECTION */}
      <BentoCard
        title={`Event Media Gallery (${SAMPLE_MEDIA_ITEMS.length} Items)`}
        subtitle={mediaUnlocked ? "High-res raw downloads available" : "Preview mode with watermark overlay"}
        icon={<Camera className="w-5 h-5 text-[#E5B868]" />}
        glow
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_MEDIA_ITEMS.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl overflow-hidden bg-[#121212] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between shadow-xl"
            >
              {/* Media Container with Watermark Layer if Locked */}
              <div className="relative aspect-video overflow-hidden bg-black">
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                    !mediaUnlocked ? 'blur-[1px] opacity-80 brightness-90' : ''
                  }`}
                  referrerPolicy="no-referrer"
                />

                {/* Media Type Badge */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-white">
                  {item.type === 'video' ? (
                    <>
                      <Video className="w-3 h-3 text-[#E5B868]" />
                      <span>4K VIDEO</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3 h-3 text-slate-300" />
                      <span>RAW PHOTO</span>
                    </>
                  )}
                </div>

                {/* WATERMARK OVERLAY (WHEN LOCKED) */}
                {!mediaUnlocked && (
                  <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[0.5px] flex flex-col items-center justify-center p-4 text-center select-none pointer-events-none">
                    {/* Diagonal Watermark Repeated Banner */}
                    <div className="absolute inset-0 flex items-center justify-center rotate-[-25deg] opacity-25 font-black text-xs text-white uppercase tracking-widest leading-relaxed font-mono whitespace-nowrap overflow-hidden">
                      JUST1PLAY SAMPLE • PROOF ONLY • UNLOCK TO REMOVE WATERMARK • JUST1PLAY SAMPLE • PROOF ONLY
                    </div>

                    <div className="relative z-20 p-2.5 rounded-full bg-black/80 border border-amber-400/50 text-amber-400 mb-2 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                      <Lock className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] font-mono font-black uppercase text-amber-300 tracking-wider bg-black/90 px-2 py-0.5 rounded border border-amber-400/30">
                      WATERMARKED PREVIEW
                    </span>
                  </div>
                )}

                {/* UNLOCKED OVERLAY / HOVER PREVIEW */}
                {mediaUnlocked && (
                  <div className="absolute inset-0 z-10 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                    <button
                      onClick={() => setSelectedPreview(item)}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-[#E5B868]" />
                      <span>View High-Res</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Card Meta & Controls */}
              <div className="p-4 space-y-3 bg-[#0d0d0d] flex-grow flex flex-col justify-between border-t border-white/10">
                <div>
                  <h4 className="text-xs font-black uppercase text-white line-clamp-1 mb-1 font-sans">{item.title}</h4>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{item.resolution}</span>
                    <span>{item.fileSize}</span>
                  </div>
                </div>

                {/* Action Buttons based on Payment Status */}
                <div className="pt-2 border-t border-white/10">
                  {!mediaUnlocked ? (
                    <button
                      onClick={handlePayBalance}
                      className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono font-bold text-[11px] uppercase rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>UNLOCK HIGH-RES ($174.50)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <a
                        href={item.highResUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 bg-[#E5B868]/10 hover:bg-[#E5B868]/20 border border-[#E5B868]/30 text-[#E5B868] font-mono font-bold text-[11px] uppercase rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>DOWNLOAD 4K</span>
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.highResUrl);
                          setDownloadSuccessToast(`Link copied for ${item.title}`);
                          setTimeout(() => setDownloadSuccessToast(null), 3000);
                        }}
                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 rounded-xl transition-colors cursor-pointer"
                        title="Share Media Link"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </BentoCard>

      {/* HIGH-RES LIGHTBOX MODAL */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#212A31] border border-white/20 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl relative font-sans">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#E5B868] bg-[#E5B868]/10 border border-[#E5B868]/30 px-2 py-0.5 rounded">
                  4K UNLOCKED MASTER FILE
                </span>
                <h3 className="text-sm font-black uppercase text-white mt-1">{selectedPreview.title}</h3>
              </div>
              <button
                onClick={() => setSelectedPreview(null)}
                className="text-slate-400 hover:text-white font-mono font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <img
                src={selectedPreview.highResUrl}
                alt={selectedPreview.title}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="p-4 bg-[#050505] flex items-center justify-between border-t border-white/10 font-mono text-xs">
              <div className="text-slate-400">
                <span>Format: {selectedPreview.resolution}</span> • <span>Size: {selectedPreview.fileSize}</span>
              </div>

              <a
                href={selectedPreview.highResUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#E5B868] text-black font-black uppercase rounded-xl flex items-center gap-2"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>DOWNLOAD ORIGINAL 4K</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
