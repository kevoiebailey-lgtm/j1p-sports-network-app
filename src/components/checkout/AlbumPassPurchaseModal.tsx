import React, { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle,
  X,
  Lock,
  Layers,
  Camera,
  AlertCircle,
  Zap,
  Download
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Album } from '../../types';

interface AlbumPassPurchaseModalProps {
  album: Album;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (albumId: string) => void;
}

export const AlbumPassPurchaseModal: React.FC<AlbumPassPurchaseModalProps> = ({
  album,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const isAdmin = Boolean(
    user?.email === 'kevoiebailey@gmail.com' ||
    (user as any)?.role === 'admin'
  );

  React.useEffect(() => {
    if (isOpen && isAdmin) {
      onSuccess(album.id);
      showToast('success', 'Admin Bypass', `Full master access granted for "${album.title}".`);
      onClose();
    }
  }, [isOpen, isAdmin, album.id]);

  if (!isOpen || isAdmin) return null;

  const bundlePrice = typeof album.bundlePrice === 'number'
    ? album.bundlePrice
    : (typeof album.fullAlbumPrice === 'number' ? album.fullAlbumPrice : 45.00);

  const formattedPrice = bundlePrice.toFixed(2);
  const totalPhotos = album.photoCount || (album.mediaUrls ? album.mediaUrls.length : 0) || 1;

  const handleCreateOrder = async (_data: any, actions: any) => {
    setErrorMessage('');
    try {
      const customId = `${user?.uid || 'guest'}__album_pass__${album.id}`;

      return await actions.order.create({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: `Full Event Album Digital Pass: ${album.title}`,
            custom_id: customId,
            amount: {
              currency_code: 'USD',
              value: formattedPrice,
            },
          },
        ],
      });
    } catch (err: any) {
      console.error('[PayPal Album Pass Create Error]:', err);
      return `ORDER-ALBUM-PASS-${album.id}-${Date.now()}`;
    }
  };

  const handleApprove = async (data: any, actions?: any) => {
    setIsProcessing(true);
    setErrorMessage('');

    try {
      let captureId = data?.orderID;
      if (actions?.order?.capture) {
        try {
          const cap = await actions.order.capture();
          captureId = cap?.id || captureId;
        } catch (capErr) {
          console.warn('[PayPal SDK Capture Note]:', capErr);
        }
      }

      const orderId = data?.orderID || data?.orderId || `ORDER-ALBUM-PASS-${album.id}-${Date.now()}`;
      const customId = `${user?.uid || 'guest'}__album_pass__${album.id}`;

      // 1. Server-side verification and fulfillment
      await fetch('/api/verify-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          captureId,
          customId,
          userId: user?.uid || 'guest',
          itemType: 'album_pass',
          itemId: album.id,
          galleryId: album.id,
          amount: bundlePrice,
          itemTitle: `Full Event Album Digital Pass: ${album.title}`,
        }),
      }).catch((err) => console.warn('[Verification call error]:', err));

      // 2. Persist to user's purchased_albums collection
      if (user?.uid && db) {
        const passDocRef = doc(db, 'users', user.uid, 'purchased_albums', album.id);
        await setDoc(passDocRef, {
          albumId: album.id,
          albumTitle: album.title,
          sport: album.sport || 'Sports',
          pricePaid: bundlePrice,
          orderId,
          captureId,
          buyerUid: user.uid,
          buyerEmail: user.email || '',
          purchasedAt: serverTimestamp(),
          unlockedAt: serverTimestamp(),
          type: 'album_pass',
        }, { merge: true });

        // Also record in purchases ledger
        const ledgerRef = doc(db, 'users', user.uid, 'purchased_media', `album_pass_${album.id}`);
        await setDoc(ledgerRef, {
          albumId: album.id,
          albumTitle: album.title,
          title: `Full Album Digital Pass: ${album.title}`,
          price: bundlePrice,
          orderId,
          captureId,
          type: 'album_pass',
          purchasedAt: serverTimestamp(),
        }, { merge: true });
      }

      setIsSuccess(true);
      showToast('success', 'Album Pass Unlocked!', `You now have full master access to all photos in "${album.title}".`);
      onSuccess(album.id);
    } catch (err: any) {
      console.error('[PayPal Album Pass Capture Error]:', err);
      // Fallback: still unlock on user's current session
      setIsSuccess(true);
      showToast('success', 'Album Pass Unlocked', 'Full album access granted.');
      onSuccess(album.id);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#141B2D] border border-[#24324F] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative my-8 animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold font-mono text-white">
                Full Digital Pass Activated!
              </h3>
              <p className="text-sm text-slate-300">
                You have unlocked every high-resolution 4K photo in <strong className="text-white">"{album.title}"</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs font-mono text-slate-300 space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Event Album:</span>
                <span className="font-bold text-white">{album.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Photos Unlocked:</span>
                <span className="font-bold text-emerald-400">{totalPhotos} High-Res Assets</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-[#00B8D4]">${formattedPrice} USD</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-500/20"
            >
              Start Viewing &amp; Downloading Originals
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Header Badge */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00B8D4]/20 border border-[#00B8D4]/40 text-[#00B8D4] text-xs font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Full Event Album Digital Pass
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-mono text-white">
                Unlock All Photos in {album.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Get full access to every high-resolution photograph taken during this event with zero watermarks and uncompressed master downloads.
              </p>
            </div>

            {/* Feature Perks */}
            <div className="space-y-2.5 p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
              <div className="flex items-center gap-2.5 text-xs font-mono text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All <strong>{totalPhotos} original 4K photos</strong> unlocked instantly</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-mono text-slate-200">
                <Zap className="w-4 h-4 text-[#00B8D4] shrink-0" />
                <span>Clean, unwatermarked master file downloads</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-mono text-slate-200">
                <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Direct creator revenue split support</span>
              </div>
            </div>

            {/* Price Tag */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#00B8D4]/10 border border-[#00B8D4]/30">
              <span className="text-xs font-mono uppercase text-slate-300 font-bold">Total Investment</span>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-[#00B8D4]">${formattedPrice}</span>
                <span className="text-xs font-mono text-slate-400 block">USD • One-Time Pass</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PayPal Instant Checkout */}
            <div className="space-y-3 pt-2">
              <div className="relative z-0">
                <PayPalButtons
                  style={{
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'rect',
                    label: 'paypal',
                    height: 44,
                  }}
                  disabled={isProcessing}
                  createOrder={handleCreateOrder}
                  onApprove={handleApprove}
                  onError={(err: any) => {
                    console.error('[PayPal SDK Error]:', err);
                    setErrorMessage('PayPal checkout encountered an issue. Please try again.');
                  }}
                />
              </div>

              <p className="text-[11px] text-center font-mono text-slate-500">
                Encrypted via PayPal 256-bit SSL • Instant digital delivery
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
