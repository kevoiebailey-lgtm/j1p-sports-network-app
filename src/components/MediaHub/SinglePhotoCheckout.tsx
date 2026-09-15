import React, { useState } from 'react';
import { PhotoDownloadButton, PhotoAsset } from '../PhotoDownloadButton';
import { Sparkles, ShieldCheck, Download, X } from 'lucide-react';

export interface SinglePhotoCheckoutProps {
  photo: PhotoAsset;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: (downloadUrl: string) => void;
  className?: string;
}

/**
 * SinglePhotoCheckout
 * Modal & inline checkout for purchasing single 4K master unwatermarked photos.
 * Features safe bottom clearance (pb-40) so the PayPal actions and checkout buttons
 * scroll fully above the mobile navigation dock.
 */
export const SinglePhotoCheckout: React.FC<SinglePhotoCheckoutProps> = ({
  photo,
  isOpen = false,
  onClose = () => {},
  onSuccess,
  className = '',
}) => {
  return (
    <div className={`single-photo-checkout-container pb-40 sm:pb-6 ${className}`}>
      <PhotoDownloadButton
        photo={photo}
        onDownloadSuccess={onSuccess}
        className="w-full"
      />
    </div>
  );
};

export default SinglePhotoCheckout;
