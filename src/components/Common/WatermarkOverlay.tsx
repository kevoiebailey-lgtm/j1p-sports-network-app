'use client';

import React from 'react';

export interface WatermarkOverlayProps {
  className?: string;
  title?: string;
  subtitle?: string;
  tiledText?: string;
}

export default function WatermarkOverlay({
  className = '',
  title = 'JUST1PLAY',
  subtitle = 'Sign In to Unlock Clean 4K Master',
  tiledText = 'JUST1PLAY ARCHIVAL PROOF'
}: WatermarkOverlayProps = {}) {
  return (
    <div className={`absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center z-10 ${className}`}>
      {/* Center Watermark Emblem */}
      <div className="text-center opacity-75 transform -rotate-12 select-none px-4 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
        <div className="text-4xl sm:text-6xl md:text-7xl font-black tracking-widest text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          {title}
        </div>
        <div className="text-xs sm:text-sm md:text-base font-mono font-black tracking-[0.25em] uppercase text-emerald-400 mt-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] bg-black/40 px-3 py-1 rounded-full border border-emerald-500/30 inline-block">
          {subtitle}
        </div>
      </div>

      {/* Tiled Diagonal Watermarks Across the Grid */}
      <div 
        className="absolute inset-0 opacity-30 flex flex-wrap gap-12 sm:gap-20 items-center justify-around rotate-[-25deg] scale-125"
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="text-base sm:text-xl font-mono font-black tracking-wider text-white/70 whitespace-nowrap drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            {tiledText}
          </span>
        ))}
      </div>
    </div>
  );
}

export { WatermarkOverlay };
