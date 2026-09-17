import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text' | 'card' | 'avatar';
  width?: string | number;
  height?: string | number;
}

/**
 * Base shimmer skeleton element
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
  width,
  height,
}) => {
  let shapeClass = 'rounded-xl';
  if (variant === 'circle' || variant === 'avatar') {
    shapeClass = 'rounded-full';
  } else if (variant === 'text') {
    shapeClass = 'rounded-md h-3';
  }

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-[#212A31]/80 border border-slate-800/60 ${shapeClass} ${className}`}
    >
      {/* Animated shimmer gradient effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-slate-700/20 to-transparent" />
    </div>
  );
};

/**
 * Bento Grid Card Skeleton Placeholder
 */
export const BentoCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-3xl bg-[#212A31]/80 border border-slate-800/80 backdrop-blur-xl space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton variant="avatar" className="w-12 h-12" />
              <div className="space-y-2">
                <Skeleton variant="text" className="w-28 h-4" />
                <Skeleton variant="text" className="w-20 h-3" />
              </div>
            </div>
            <Skeleton variant="rect" className="w-14 h-6 rounded-lg" />
          </div>

          <Skeleton variant="rect" className="w-full h-40 rounded-2xl" />

          <div className="space-y-2">
            <Skeleton variant="text" className="w-3/4 h-3" />
            <Skeleton variant="text" className="w-1/2 h-3" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-900">
            <Skeleton variant="rect" className="w-20 h-7 rounded-xl" />
            <Skeleton variant="rect" className="w-24 h-7 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Scout / Athlete Matrix Skeleton Placeholder
 */
export const ScoutMatrixSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-3xl bg-[#212A31]/90 border border-slate-800/80 space-y-4 shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton variant="avatar" className="w-12 h-12" />
              <div className="space-y-1.5">
                <Skeleton variant="text" className="w-32 h-4" />
                <Skeleton variant="text" className="w-20 h-3" />
              </div>
            </div>
            <Skeleton variant="circle" className="w-8 h-8" />
          </div>

          {/* Radar chart placeholder */}
          <div className="flex justify-center my-2">
            <Skeleton variant="circle" className="w-28 h-28 opacity-40" />
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 bg-[#212A31]/60 p-2.5 rounded-2xl border border-slate-800/50">
            <div className="space-y-1 text-center">
              <Skeleton variant="text" className="w-10 mx-auto h-2" />
              <Skeleton variant="text" className="w-12 mx-auto h-3" />
            </div>
            <div className="space-y-1 text-center">
              <Skeleton variant="text" className="w-10 mx-auto h-2" />
              <Skeleton variant="text" className="w-12 mx-auto h-3" />
            </div>
            <div className="space-y-1 text-center">
              <Skeleton variant="text" className="w-10 mx-auto h-2" />
              <Skeleton variant="text" className="w-12 mx-auto h-3" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Skeleton variant="rect" className="w-24 h-8 rounded-xl" />
            <Skeleton variant="rect" className="w-20 h-8 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Obsidian Minimal Route Skeleton Fallback
 * Provides a minimal, zero-layout-shift and zero-flicker placeholder for React.lazy route transitions
 */
export const ObsidianSkeletonFallback: React.FC = () => {
  return (
    <div className="w-full space-y-4 p-2 animate-pulse">
      {/* Top Banner Placeholder */}
      <div className="w-full h-20 rounded-2xl bg-[#12151C]/60 border border-white/[0.04]" />

      {/* Main Grid Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 h-72 rounded-2xl bg-[#12151C]/50 border border-white/[0.04]" />
        <div className="h-72 rounded-2xl bg-[#12151C]/50 border border-white/[0.04]" />
      </div>
    </div>
  );
};

export default Skeleton;
