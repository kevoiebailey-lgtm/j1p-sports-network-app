import React from 'react';
import { PhotoLightboxModal } from './PhotoLightboxModal';
import { MediaVaultItem } from '../../types/mediaVault';

export interface PhotoViewerModalProps {
  item: MediaVaultItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPurchase?: (item: MediaVaultItem) => void;
  onTogglePin?: (item: MediaVaultItem) => void;
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

/**
 * PhotoViewerModal
 * High-Resolution Lightbox Viewer with safe inset bottom clearance (pb-40)
 * ensuring all master download and interaction controls sit above the mobile dock.
 */
export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  item,
  isOpen,
  onClose,
  onOpenPurchase = () => {},
  onTogglePin = () => {},
  onNavigateTab,
  className = '',
}) => {
  if (!isOpen || !item) return null;

  return (
    <div className={`photo-viewer-modal-wrapper pb-40 sm:pb-0 ${className}`}>
      <PhotoLightboxModal
        item={item}
        onClose={onClose}
        onOpenPurchase={onOpenPurchase}
        onTogglePin={onTogglePin}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
};

export default PhotoViewerModal;

