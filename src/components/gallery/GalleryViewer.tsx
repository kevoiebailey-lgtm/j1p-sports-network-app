'use client';

import React, { useState, useEffect } from 'react';
import WatermarkOverlay from './WatermarkOverlay';
import { GalleryDownloadButton } from './GalleryDownloadButton';
import { checkPhotoPurchased, isUserAdmin } from '../../utils/galleryDownloadService';

export interface GalleryViewerProps {
  photo: {
    id: string;
    title: string;
    previewUrl?: string;
    cleanMasterUrl?: string;
    highResUrl?: string;
    vaultPath?: string;
    albumId?: string;
    url?: string;
    driveFileId?: string;
    price?: number;
    [key: string]: any;
  };
  currentUser?: any;
  onOpenAuthModal?: () => void;
  onOpenPrintModal?: () => void;
  onOpenPurchaseModal?: (photo: any) => void;
}

export default function GalleryViewer({
  photo,
  currentUser,
  onOpenAuthModal = () => {},
  onOpenPrintModal = () => {},
  onOpenPurchaseModal
}: GalleryViewerProps) {
  const isLoggedIn = Boolean(currentUser && currentUser.uid);
  const isAdmin = isUserAdmin(currentUser);
  const [hasPurchased, setHasPurchased] = useState(false);

  // Check purchase status in Firestore: purchases/${currentUser.uid}_${photo.id}
  useEffect(() => {
    let isMounted = true;
    if (isLoggedIn && photo?.id) {
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
  }, [currentUser?.uid, photo?.id, isAdmin, isLoggedIn]);

  // Preview image URL from gallery/previews/
  const previewSource = 
    photo.previewUrl || 
    photo.url || 
    `https://firebasestorage.googleapis.com/v0/b/just1play26.firebasestorage.app/o/previews%2F${photo.id}.jpg?alt=media`;

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center">
      {/* Top Header Bar */}
      <div className="w-full flex justify-between items-center px-4 py-2 bg-[#0e131f] rounded-t-2xl border-t border-x border-white/10">
        <span className="text-xs text-neutral-400 font-mono">{photo.title || `Photo #${photo.id}`}</span>
        
        {/* Status Badge */}
        {isAdmin ? (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full">
            ★ Admin Access (Clean 4K Unlocked)
          </span>
        ) : hasPurchased ? (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full">
            ✓ Clean 4K Unlocked (Purchased)
          </span>
        ) : isLoggedIn ? (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full">
            Watermarked Preview
          </span>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full hover:bg-amber-500/30 transition cursor-pointer"
          >
            🔒 Sign In to Unlock
          </button>
        )}
      </div>

      {/* Photo Container - displays preview image from gallery/previews/ */}
      <div className="relative w-full aspect-[4/5] md:aspect-[3/2] bg-black overflow-hidden flex items-center justify-center border-x border-white/10">
        <img
          src={previewSource}
          alt={photo.title || 'Gallery Preview'}
          className="w-full h-full object-contain select-none pointer-events-none"
          onContextMenu={(e) => e.preventDefault()} // Blocks standard right-click save
        />

        {/* Show Watermark Layer if user is not admin and has not purchased */}
        {!isAdmin && !hasPurchased && <WatermarkOverlay />}
      </div>

      {/* Bottom Action Dock */}
      <div className="w-full p-4 bg-[#0e131f] border border-white/10 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-neutral-400">
          {isAdmin || hasPurchased ? (
            <span className="text-emerald-400 font-medium">✓ Clean original 4K file available for instant download.</span>
          ) : isLoggedIn ? (
            <span>High-resolution original available without watermarks or logo.</span>
          ) : (
            <span>Sign in to purchase and download clean original without watermarks.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Exact Download (No Logo / High-Res) Button */}
          <GalleryDownloadButton
            photo={photo}
            currentUser={currentUser}
            onOpenAuthModal={onOpenAuthModal}
            onOpenPurchaseModal={onOpenPurchaseModal}
          />

          {/* Physical Print Order Button */}
          <button
            onClick={onOpenPrintModal}
            className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            Order Prints • From $12.99
          </button>
        </div>
      </div>
    </div>
  );
}

export { GalleryViewer };
