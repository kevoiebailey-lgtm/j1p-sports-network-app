import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface VideoProgressBarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  buffered?: number; // 0 to 100 percentage
  onSeek?: (time: number) => void;
  className?: string;
  showTimeDisplay?: boolean;
  compact?: boolean;
}

export const formatVideoTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const VideoProgressBar: React.FC<VideoProgressBarProps> = ({
  videoRef,
  currentTime,
  duration,
  buffered = 0,
  onSeek,
  className = '',
  showTimeDisplay = true,
  compact = false
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Calculate progress percentage
  const currentPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const displayPercent = isDragging && dragProgress !== null ? dragProgress : currentPercent;
  const displayTime = isDragging && dragProgress !== null && duration > 0 ? (dragProgress / 100) * duration : currentTime;

  // Calculate time from clientX coordinate
  const getTimeFromClientX = useCallback((clientX: number): { pct: number; time: number } => {
    if (!progressBarRef.current || duration <= 0) return { pct: 0, time: 0 };
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = (offsetX / rect.width) * 100;
    const time = (pct / 100) * duration;
    return { pct, time };
  }, [duration]);

  // Handle Seek execution
  const executeSeek = useCallback((targetTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
    if (onSeek) {
      onSeek(targetTime);
    }
  }, [videoRef, onSeek]);

  // Pointer/Mouse Down
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (duration <= 0) return;

    // Capture pointer so drag events stay attached even if cursor leaves bounds
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    setIsDragging(true);
    const { pct, time } = getTimeFromClientX(e.clientX);
    setDragProgress(pct);
    executeSeek(time);
  };

  // Pointer Move (Dragging or Hovering)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (duration <= 0) return;

    const { pct, time } = getTimeFromClientX(e.clientX);

    if (isDragging) {
      setDragProgress(pct);
      executeSeek(time);
    } else {
      setHoverPosition(pct);
      setHoverTime(time);
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isDragging) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      setIsDragging(false);
      if (dragProgress !== null && duration > 0) {
        executeSeek((dragProgress / 100) * duration);
      }
      setDragProgress(null);
    }
  };

  // Pointer Leave
  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoverPosition(null);
      setHoverTime(null);
    }
  };

  return (
    <div className={`w-full flex items-center gap-2.5 select-none ${className}`}>
      {/* Interactive Progress Bar Track Container */}
      <div
        ref={progressBarRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClick={(e) => e.stopPropagation()}
        className="relative flex-1 py-2 cursor-pointer touch-none group/progressbar"
      >
        {/* Track Bar */}
        <div className={`w-full rounded-full bg-slate-900/80 backdrop-blur-md overflow-hidden relative border border-white/10 transition-all duration-150 ${
          compact ? 'h-1.5 group-hover/progressbar:h-2.5' : 'h-2 group-hover/progressbar:h-3'
        }`}>
          {/* Buffered Bar */}
          {buffered > 0 && (
            <div
              className="absolute top-0 bottom-0 left-0 bg-white/25 rounded-full transition-all duration-300 pointer-events-none"
              style={{ width: `${Math.min(100, Math.max(0, buffered))}%` }}
            />
          )}

          {/* Played Progress Bar */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-red-600 via-red-500 to-amber-500 rounded-full transition-all duration-75 ease-out shadow-[0_0_12px_rgba(239,68,68,0.8)] pointer-events-none"
            style={{ width: `${displayPercent}%` }}
          />

          {/* Hover Preview Line */}
          {hoverPosition !== null && !isDragging && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/60 pointer-events-none z-10"
              style={{ left: `${hoverPosition}%` }}
            />
          )}
        </div>

        {/* Scrubber Knob Thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white border-2 border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.9)] rounded-full transition-transform duration-100 pointer-events-none z-20 ${
            compact ? 'w-3.5 h-3.5' : 'w-4 h-4'
          } ${
            isDragging
              ? 'scale-125 opacity-100 ring-4 ring-red-500/40'
              : 'scale-90 opacity-80 group-hover/progressbar:scale-110 group-hover/progressbar:opacity-100'
          }`}
          style={{ left: `${displayPercent}%` }}
        />

        {/* Floating Hover/Drag Timestamp Tooltip */}
        {(hoverPosition !== null || isDragging) && (
          <div
            className="absolute bottom-full mb-2.5 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-[#212A31]/95 backdrop-blur-md border border-slate-700 text-[10px] font-mono text-white font-black tracking-wider shadow-xl pointer-events-none z-30 flex items-center gap-1"
            style={{
              left: `${isDragging ? displayPercent : (hoverPosition || 0)}%`
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>{formatVideoTime(isDragging ? displayTime : (hoverTime || 0))}</span>
          </div>
        )}
      </div>

      {/* Optional Time Display Badge */}
      {showTimeDisplay && (
        <div className="shrink-0 text-[11px] font-mono font-bold text-slate-200 bg-[#212A31]/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-700/60 shadow-sm flex items-center gap-1">
          <span className="text-white font-black">{formatVideoTime(displayTime)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">{formatVideoTime(duration)}</span>
        </div>
      )}
    </div>
  );
};
