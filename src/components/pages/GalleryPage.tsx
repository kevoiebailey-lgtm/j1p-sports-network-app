import React from 'react';
import { MediaGalleryView } from '../RoleViews/Universal/MediaGalleryView';

/**
 * Dedicated Gallery Page Component (/gallery, /media-gallery)
 * Standardized with high-contrast Championship OS Deep Obsidian layout,
 * strict justify-start vertical flow under fixed UniversalHeader, and pb-36 bottom clearance.
 */
export const GalleryPage: React.FC = () => {
  return <MediaGalleryView />;
};

export default GalleryPage;
