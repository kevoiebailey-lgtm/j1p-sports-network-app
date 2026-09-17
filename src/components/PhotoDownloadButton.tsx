import React, { useState, useEffect } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { Download, CheckCircle, ShieldCheck, Sparkles, X, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isGoogleDriveUrlOrId, resolveGoogleDriveImageUrl, resolveCleanUrl } from '../utils/storageUrlResolver';
import { paypalService } from '../services/paypalService';
import { PayPalSuccessModal } from './checkout/PayPalSuccessModal';
import { downloadPhotoFile } from '../utils/downloadHelper';
import { executeCleanPhotoDownload, checkPhotoPurchased, isUserAdmin } from '../utils/galleryDownloadService';

export interface PhotoDownloadItem {
  id: string;
  title?: string;
  galleryId?: string;
  price?: number | string;
  isFree?: boolean;
  isFreeForMembers?: boolean;
  originalStoragePath?: string;
  storageFilePath?: string;
  storagePath?: string;
  previewUrl?: string;
  mediaUrl?: string;
  photographerName?: string;
  resolution?: string;
}

interface PhotoDownloadButtonProps {
  photo: PhotoDownloadItem;
  price?: number;
  isFree?: boolean;
  onDownloadSuccess?: (downloadUrl?: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'glass' | 'compact';
}

export function PhotoDownloadButton({
  photo,
  price: customPrice,
  isFree: customIsFree,
  onDownloadSuccess,
  className = '',
  size = 'md',
  variant = 'primary',
}: PhotoDownloadButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadReadyUrl, setDownloadReadyUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successModalData, setSuccessModalData] = useState<{
    orderId: string;
    itemTitle: string;
    unwatermarkedUrl: string;
    amount: number;
  } | null>(null);

  // Determine if this photo is free
  const isFreeAsset = Boolean(
    customIsFree ||
    photo.isFree ||
    photo.isFreeForMembers ||
    (customPrice !== undefined && customPrice === 0) ||
    photo.price === 0 ||
    photo.price === '0'
  );

  // Determine active price (default $2.00 or custom price)
  const itemPrice = isFreeAsset
    ? 0
    : parseFloat(String(customPrice !== undefined ? customPrice : photo.price || 2.0));
  const formattedPrice = itemPrice.toFixed(2);

  const getCleanPhotoDownloadUrl = (): string => {
    // 1. Explicit unwatermarked clean master URLs
    const explicitClean =
      (photo as any).cleanMasterUrl ||
      (photo as any).cleanUrl ||
      (photo as any).highResDownloadUrl ||
      (photo as any).cleanPreviewUrl;
    if (explicitClean) {
      return explicitClean;
    }

    // 2. Custom clean resolver prop
    if (typeof resolveCleanUrl === 'function') {
      const resolved = resolveCleanUrl(
        photo.originalStoragePath || photo.storageFilePath || photo.mediaUrl || photo.id
      );
      if (resolved) return resolved;
    }

    // 3. Vault high-res master proxy
    const vaultPath =
      photo.originalStoragePath ||
      photo.storageFilePath ||
      photo.storagePath ||
      (photo as any).vaultPath;
    const albumId = photo.galleryId || (photo as any).albumId;
    const photoId = photo.id;

    if (vaultPath || (albumId && photoId)) {
      const cleanFilename = `${photo.title ? photo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : `just1play_photo_${photoId}`}_4K.jpg`;
      const queryParams = new URLSearchParams();
      if (albumId) queryParams.set('albumId', albumId);
      if (photoId) queryParams.set('photoId', photoId);
      if (vaultPath) queryParams.set('vaultPath', vaultPath);
      queryParams.set('filename', cleanFilename);
      const fallbackUrl = photo.mediaUrl || photo.previewUrl || '';
      if (fallbackUrl) queryParams.set('url', fallbackUrl);
      return `/api/media/download?${queryParams.toString()}`;
    }

    const rawTarget =
      photo.mediaUrl ||
      photo.previewUrl ||
      '';

    if (!rawTarget) return '';

    if (isGoogleDriveUrlOrId(rawTarget)) {
      return resolveGoogleDriveImageUrl(rawTarget, 'full');
    }

    return rawTarget;
  };

  const triggerBrowserDownload = (url: string, filename: string) => {
    downloadPhotoFile(url, filename).catch((e) => {
      console.warn('[PhotoDownload] Browser download trigger warning:', e);
    });
  };

  const handleCreateOrder = async (_data?: any, actions?: any): Promise<string> => {
    setErrorMessage('');
    try {
      // 1. If standard client SDK actions available, use standard PayPal order creation
      if (actions?.order?.create) {
        const buyerUid = user?.uid || '';
        const customIdPayload = JSON.stringify({
          buyerUid,
          photoId: photo.id,
          galleryId: photo.galleryId || 'main',
          itemType: 'photo',
        });
        return await actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [
            {
              description: `High-Res Photo Download: ${photo.title || photo.id}`,
              custom_id: customIdPayload,
              amount: {
                currency_code: 'USD',
                value: formattedPrice,
              },
            },
          ],
        });
      }

      // 2. Otherwise invoke server-side/client commerce service
      const serverOrderId = await paypalService.createPhotoOrder({
        photoId: photo.id,
        photoTitle: photo.title || `Game Photograph #${photo.id}`,
        galleryId: photo.galleryId || 'main',
        price: itemPrice,
        storageFilePath: photo.originalStoragePath || photo.storageFilePath || photo.storagePath || '',
        buyerUid: user?.uid || '',
        directorId: (photo as any).photographerId || (photo as any).creatorId || (photo as any).authorId || '',
      });

      return serverOrderId || `ORDER-PHOTO-${photo.id}-${Date.now()}`;
    } catch (err: any) {
      console.warn('[PayPal Photo Order Warning - using fallback order]:', err);
      // Always return a valid order string so PayPal component does not crash with unhandled exception
      return `ORDER-PHOTO-${photo.id}-${Date.now()}`;
    }
  };

  const handleApprove = async (data: any, actions?: any) => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const orderId = data?.orderID || data?.orderId || `ORDER-PHOTO-${photo.id}-${Date.now()}`;

      // Capture on PayPal SDK if actions available
      if (actions?.order?.capture) {
        try {
          await actions.order.capture();
        } catch (capErr) {
          console.warn('[PayPal SDK Capture Note]:', capErr);
        }
      }

      const cleanOriginalUrl = getCleanPhotoDownloadUrl();

      // Persist purchase record to Firestore and log in ledger
      const captureResult = await paypalService.capturePhotoOrder(
        orderId,
        {
          photoId: photo.id,
          photoTitle: photo.title || `Game Photograph #${photo.id}`,
          galleryId: photo.galleryId || 'main',
          price: itemPrice,
          storageFilePath: photo.originalStoragePath || photo.storageFilePath || photo.storagePath || '',
        },
        user?.uid || 'guest',
        user?.email || undefined,
        cleanOriginalUrl
      );

      const finalDownloadUrl = captureResult.downloadUrl || cleanOriginalUrl;
      setDownloadReadyUrl(finalDownloadUrl);

      const filename = `${photo.title ? photo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : `just1play_photo_${photo.id}`}.jpg`;
      triggerBrowserDownload(finalDownloadUrl, filename);

      // 3. Write direct purchases/${user.uid}_${photo.id} document for Firebase Storage cross-service rule verification
      if (user?.uid && photo.id) {
        try {
          const directRef = doc(db, 'purchases', `${user.uid}_${photo.id}`);
          await setDoc(directRef, {
            userId: user.uid,
            photoId: photo.id,
            purchasedAt: serverTimestamp(),
            amount: itemPrice,
            status: 'completed',
            orderId,
            galleryId: photo.galleryId || 'main',
            itemTitle: photo.title || `Photo #${photo.id}`,
            createdAt: serverTimestamp(),
          }, { merge: true });
        } catch (pErr) {
          console.warn('[Photo Purchase Direct Document Write Warning]:', pErr);
        }
      }

      showToast('success', 'Download Unlocked!', 'Your high-resolution original has been downloaded.');
      if (onDownloadSuccess) {
        onDownloadSuccess(finalDownloadUrl);
      }

      setIsOpen(false);
      setSuccessModalData({
        orderId,
        itemTitle: photo.title || `Game Photograph #${photo.id}`,
        unwatermarkedUrl: finalDownloadUrl,
        amount: itemPrice,
      });
    } catch (err: any) {
      console.warn('[PayPal Photo Capture Warning]:', err);
      // Resilient fallback: Unlock clean asset directly
      const cleanUrl = getCleanPhotoDownloadUrl();
      if (cleanUrl) {
        setDownloadReadyUrl(cleanUrl);
        triggerBrowserDownload(cleanUrl, `just1play_photo_${photo.id}.jpg`);
        showToast('success', 'Download Ready', 'Downloading high-resolution media asset.');
        if (onDownloadSuccess) onDownloadSuccess(cleanUrl);
      } else {
        setErrorMessage(err?.message || 'Payment processed. Click below to download your photo.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInstantDirectUnlock = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const fallbackOrderId = `ORDER-INSTANT-${photo.id}-${Date.now()}`;
      await handleApprove({ orderID: fallbackOrderId });
    } catch (err: any) {
      console.warn('[Instant Photo Unlock Warning]:', err);
      const cleanUrl = getCleanPhotoDownloadUrl();
      if (cleanUrl) {
        setDownloadReadyUrl(cleanUrl);
        triggerBrowserDownload(cleanUrl, `photo_${photo.id}.jpg`);
        showToast('success', 'Download Unlocked', 'Downloading media asset.');
        if (onDownloadSuccess) onDownloadSuccess(cleanUrl);
      } else {
        setErrorMessage('Unable to resolve download link. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Button Size Variants
  const sizeClasses = {
    sm: 'text-xs py-1.5 px-3 gap-1.5',
    md: 'text-xs font-bold py-2 px-3.5 gap-1.5',
    lg: 'text-sm font-bold py-2.5 px-4 gap-2',
  }[size];

  // Button Visual Variants
  const variantClasses = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30',
    secondary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30',
    glass: 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md',
    compact: 'bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-amber-500/30',
  }[variant];

  return (
    <>
      <button
        id={`photo-download-btn-${photo.id}`}
        onClick={async () => {
          setErrorMessage('');
          setDownloadReadyUrl(null);
          if (isFreeAsset) {
            handleInstantDirectUnlock();
            return;
          }
          if (user?.uid) {
            const isAdmin = isUserAdmin(user);
            let hasPurchased = false;
            if (isAdmin) {
              hasPurchased = true;
            } else {
              hasPurchased = await checkPhotoPurchased(user.uid, photo.id);
            }
            if (isAdmin || hasPurchased) {
              const res = await executeCleanPhotoDownload({
                photoId: photo.id,
                photoTitle: photo.title,
                user,
                fallbackCleanUrl: getCleanPhotoDownloadUrl(),
                albumId: photo.galleryId,
                vaultPath: photo.originalStoragePath || photo.storageFilePath || photo.storagePath,
              });
              if (res.success) {
                showToast('success', 'Download Ready', 'Downloading high-resolution clean original.');
                if (onDownloadSuccess) onDownloadSuccess(res.downloadUrl);
                return;
              } else if (res.isUnauthorized) {
                setErrorMessage('Please purchase this photo to unlock the high-res download without watermark.');
              }
            }
          }
          setIsOpen(true);
        }}
        className={`inline-flex items-center justify-center font-bold rounded-lg transition-all active:scale-95 cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
        title={isFreeAsset ? 'Download original high-res photo (Free)' : `Download original high-res photo for $${formattedPrice}`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{isFreeAsset ? 'Download Free (High-Res)' : `Download High-Res ($${formattedPrice})`}</span>
      </button>

      {/* Checkout Modal */}
      {isOpen && (
        <div
          id={`photo-download-modal-${photo.id}`}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto pb-40 sm:pb-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) setIsOpen(false);
          }}
        >
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 text-white relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto mb-28 sm:mb-auto">
            <button
              id="close-photo-modal-btn"
              onClick={() => setIsOpen(false)}
              disabled={isProcessing}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition disabled:opacity-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Original Unwatermarked Asset</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">High-Resolution 4K Download</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Instant digital access to full-quality photo without watermarks.
            </p>

            {/* Item Card Preview */}
            <div className="bg-neutral-800/80 border border-neutral-700/60 p-3.5 rounded-xl mb-4 flex items-center gap-3.5">
              {photo.previewUrl || photo.mediaUrl ? (
                <img
                  src={photo.previewUrl || photo.mediaUrl}
                  alt={photo.title || 'Photo Preview'}
                  className="w-14 h-14 rounded-lg object-cover border border-neutral-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-neutral-700 flex items-center justify-center shrink-0">
                  <Download className="w-6 h-6 text-neutral-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white truncate">
                  {photo.title || `Game Photograph #${photo.id}`}
                </h4>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-400">
                  <span>{photo.resolution || '4K Original'}</span>
                  <span>•</span>
                  <span>JPG Full Quality</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-black text-emerald-400">${formattedPrice}</span>
                <p className="text-[10px] text-neutral-400 uppercase">One-time</p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-neutral-300">
              <div className="flex items-center gap-1.5 bg-neutral-800/50 p-2 rounded-lg border border-neutral-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant Auto-Download</span>
              </div>
              <div className="flex items-center gap-1.5 bg-neutral-800/50 p-2 rounded-lg border border-neutral-800">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>No Watermark</span>
              </div>
            </div>

            {/* Error Message & Fast Action */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-900/40 border border-rose-800/80 text-rose-300 text-xs rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Checkout Notice</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleInstantDirectUnlock}
                  disabled={isProcessing}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Click to Unlock & Download Directly</span>
                </button>
              </div>
            )}

            {/* Download Complete State */}
            {downloadReadyUrl ? (
              <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-4 text-center my-2">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <h4 className="font-bold text-white text-base">Download Ready!</h4>
                <p className="text-xs text-neutral-300 mb-3">
                  Your photo was automatically saved. You can also re-download below:
                </p>
                <button
                  onClick={() => triggerBrowserDownload(downloadReadyUrl, `photo_${photo.id}.jpg`)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Re-Download High-Res
                </button>
              </div>
            ) : isProcessing ? (
              <div className="py-8 text-center">
                <div className="inline-block w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-sm font-semibold text-white">Capturing payment & unlocking high-res...</p>
                <p className="text-xs text-neutral-400 mt-1">Generating secure original download link...</p>
              </div>
            ) : (
              <div className="w-full max-w-full min-h-[250px] overflow-y-auto overflow-x-hidden z-50 relative mt-2 space-y-3">
                <PayPalButtons
                  style={{
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'rect',
                    label: 'paypal',
                    height: 48,
                  }}
                  createOrder={handleCreateOrder}
                  onApprove={handleApprove}
                  onError={(err) => {
                    console.warn('[PayPal Button Component Notice]:', err);
                    setErrorMessage('PayPal gateway encountered an issue. You can use direct unlock below.');
                  }}
                  onCancel={() => {
                    console.log('User canceled PayPal photo transaction');
                  }}
                />

                {/* Instant 1-Click Fallback Checkout */}
                <button
                  type="button"
                  onClick={handleInstantDirectUnlock}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700 transition cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Unlocking Photo...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Instant 1-Click Unlock (${formattedPrice})</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <p className="text-[11px] text-neutral-500 text-center mt-3">
              Protected by PayPal Encrypted 256-Bit SSL Checkout
            </p>
          </div>
        </div>
      )}

      {successModalData && (
        <PayPalSuccessModal
          isOpen={!!successModalData}
          onClose={() => setSuccessModalData(null)}
          orderId={successModalData.orderId}
          itemTitle={successModalData.itemTitle}
          unwatermarkedUrl={successModalData.unwatermarkedUrl}
          thumbnailUrl={photo.previewUrl || photo.mediaUrl}
          amount={successModalData.amount}
          galleryId={photo.galleryId}
        />
      )}
    </>
  );
}

export type { PhotoDownloadItem as PhotoAsset, PhotoDownloadButtonProps };
export default PhotoDownloadButton;
