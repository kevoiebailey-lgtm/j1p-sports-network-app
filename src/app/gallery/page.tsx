"use client";

import React from 'react';
import GalleryPage from '../../components/pages/GalleryPage';

/**
 * Dedicated Tournament Media Gallery Route (/gallery, /media-gallery)
 * Uses high-contrast Championship OS Deep Obsidian layout,
 * strict justify-start vertical flow under fixed UniversalHeader, and pb-36 dock clearance.
 */
export default function Page() {
  return <GalleryPage />;
}

export { Page as GalleryPage };
