'use client';

import React, { useState } from 'react';

export interface ShareButtonProps {
  path: string; // e.g., "profile/123" or "play/456"
  title: string;
  text?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  path,
  title,
  text = 'Check this out on Just One Play!',
  variant = 'primary',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${cleanPath}` : `/${cleanPath}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const baseStyles = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 cursor-pointer select-none';
  const primaryStyles = copied
    ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20 font-bold'
    : 'bg-emerald-400 hover:bg-emerald-300 text-neutral-950 shadow-md shadow-emerald-500/10 font-bold';
  const secondaryStyles = copied
    ? 'bg-emerald-500 text-neutral-950 font-bold'
    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700';

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`${baseStyles} ${variant === 'primary' ? primaryStyles : secondaryStyles} ${className}`}
      aria-label="Share link"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span>Link Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share</span>
        </>
      )}
    </button>
  );
};

export default ShareButton;
