import React, { useState, useEffect } from 'react';
import { Download, Lock, Loader2, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';
import { executeCleanPhotoDownload, checkPhotoPurchased, isUserAdmin } from '../../utils/galleryDownloadService';
import { PhotoDownloadButton } from '../PhotoDownloadButton';

export interface GalleryDownloadButtonProps {
  photo: {
    id: string;
    title?: string;
    previewUrl?: string;
    cleanMasterUrl?: string;
    highResUrl?: string;
    vaultPath?: string;
    albumId?: string;
    price?: number;
    [key: string]: any;
  };
  currentUser?: any;
  onOpenAuthModal?: () => void;
  onOpenPurchaseModal?: (photo: any) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'glass';
}

/**
 * GalleryDownloadButton
 * Implements exact gallery download architecture:
 * 1. Display preview image from gallery/previews/.
 * 2. When clicked:
 *    - If user not logged in: Prompt login modal.
 *    - If user is Admin OR purchases/${user.uid}_${photoId} exists:
 *      Fetch clean image from gallery/originals/${photoId} via getDownloadURL() and trigger instant download.
 *    - If user has NOT purchased: Open payment modal.
 * 3. Handles storage/unauthorized with: "Please purchase this photo to unlock the high-res download without watermark."
 */
export const GalleryDownloadButton: React.FC<GalleryDownloadButtonProps> = ({
  photo,
  currentUser,
  onOpenAuthModal,
  onOpenPurchaseModal,
  className = '',
  size = 'md',
  variant = 'primary',
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const isAdmin = isUserAdmin(currentUser);

  // Check purchase status in Firestore: purchases/${user.uid}_${photo.id}
  useEffect(() => {
    let isMounted = true;
    if (currentUser?.uid && photo?.id) {
      if (isAdmin) {
        setHasPurchased(true);
      } else {
        checkPhotoPurchased(currentUser.uid, photo.id).then((purchased) => {
          if (isMounted) setHasPurchased(purchased);
        });
      }
    } else {
      setHasPurchased(false);
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, photo?.id, isAdmin]);

  const handleDownloadClick = async () => {
    setErrorMessage(null);

    // 1. If user is not logged in: Prompt login modal
    if (!currentUser || !currentUser.uid) {
      if (onOpenAuthModal) {
        onOpenAuthModal();
      } else {
        setErrorMessage('Please sign in to download the clean high-res photo.');
      }
      return;
    }

    // 2. If user is Admin OR document exists in purchases:
    // Execute clean image fetch from gallery/originals/${photo.id}
    if (isAdmin || hasPurchased) {
      setIsDownloading(true);
      try {
        const result = await executeCleanPhotoDownload({
          photoId: photo.id,
          photoTitle: photo.title,
          user: currentUser,
          fallbackCleanUrl: photo.cleanMasterUrl || photo.highResUrl,
          albumId: photo.albumId || photo.galleryId,
          vaultPath: photo.vaultPath,
        });

        if (!result.success) {
          if (result.isUnauthorized || result.needsPurchase) {
            setErrorMessage('Please purchase this photo to unlock the high-res download without watermark.');
            if (onOpenPurchaseModal) {
              onOpenPurchaseModal(photo);
            } else {
              setShowCheckoutModal(true);
            }
          } else {
            setErrorMessage(result.error || 'Failed to download original photo.');
          }
        }
      } catch (err: any) {
        if (err?.code === 'storage/unauthorized') {
          setErrorMessage('Please purchase this photo to unlock the high-res download without watermark.');
          if (onOpenPurchaseModal) {
            onOpenPurchaseModal(photo);
          } else {
            setShowCheckoutModal(true);
          }
        } else {
          setErrorMessage(err?.message || 'Download error. Please try again.');
        }
      } finally {
        setIsDownloading(false);
      }
      return;
    }

    // 3. If user has NOT purchased: Open payment modal
    if (onOpenPurchaseModal) {
      onOpenPurchaseModal(photo);
    } else {
      setShowCheckoutModal(true);
    }
  };

  const sizeClasses = {
    sm: 'text-xs py-1.5 px-3 gap-1.5',
    md: 'text-xs font-bold py-2.5 px-4 gap-2',
    lg: 'text-sm font-bold py-3 px-5 gap-2.5',
  }[size];

  const variantClasses = {
    primary: 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-900/30',
    secondary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30',
    glass: 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md',
  }[variant];

  return (
    <div className="flex flex-col items-center">
      <button
        id={`gallery-download-btn-${photo.id}`}
        type="button"
        onClick={handleDownloadClick}
        disabled={isDownloading}
        className={`inline-flex items-center justify-center font-bold rounded-full uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
        title="Download high-resolution image without watermark"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Downloading Clean File...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4 shrink-0" />
            <span>Download (No Logo / High-Res)</span>
          </>
        )}
      </button>

      {/* Error / Feedback Message */}
      {errorMessage && (
        <div className="mt-2 p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2 max-w-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Integrated PayPal Checkout Modal if external modal handler not supplied */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 text-white relative shadow-2xl">
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Clean Unwatermarked Photo</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Unlock Original 4K Photo</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Instant digital download of the full-resolution file without watermark or logo.
            </p>
            <PhotoDownloadButton
              photo={photo}
              onDownloadSuccess={() => {
                setHasPurchased(true);
                setShowCheckoutModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryDownloadButton;
