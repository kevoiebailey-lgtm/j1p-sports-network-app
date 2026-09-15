"use client";

import React from 'react';
import FAQPage from '../../components/pages/FAQPage';

/**
 * Dedicated FAQ & Help Center Route (/faq)
 * Uses high-contrast Championship OS Deep Obsidian layout,
 * strict justify-start vertical flow under fixed UniversalHeader, and pb-36 dock clearance.
 */
export default function Page() {
  return <FAQPage />;
}

export { Page as FAQPage };
