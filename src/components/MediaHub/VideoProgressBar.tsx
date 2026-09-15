import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

export interface VideoProgressBarProps {
  currentTime: number; // in seconds
  duration: number; // in seconds
  bufferedPercent?: number; // 0 to 100
  isBuffering?: boolean;
  onSeek: (targetTime: number) => void;
  className?: string;
  showTimeLabels?: boolean;
  compact?: boolean;
}

/**
 * Format time in seconds to MM:SS or HH:MM:SS format
 */
export function formatVideoTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const VideoProgressBar: React.FC<VideoProgressBarProps> = ({
  currentTime,
  duration,
  bufferedPercent = 0,
  isBuffering = false,
  onSeek,
  className = '',
  showTimeLabels = true,
  compact = false
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const safeBufferedPercent = Math.min(100, Math.max(0, bufferedPercent));

  const calculateTimeFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!progressBarRef.current || !duration) return null;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = clickX / rect.width;
    const targetTime = percentage * duration;
    return { percentage, targetTime };
  }, [duration]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const calculated = calculateTimeFromEvent(e);
    if (calculated) {
      setHoverPosition(calculated.percentage * 100);
      setHoverTime(calculated.targetTime);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const calculated = calculateTimeFromEvent(e);
    if (calculated) {
      onSeek(calculated.targetTime);
    }

    const handleGlobalMouseMove = (moveEvent: MouseEvent) => {
      const moveCalculated = calculateTimeFromEvent(moveEvent);
      if (moveCalculated) {
        setHoverPosition(moveCalculated.percentage * 100);
        setHoverTime(moveCalculated.targetTime);
        onSeek(moveCalculated.targetTime);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  };

  return (
    <div className={`w-full flex items-center gap-3 select-none ${className}`}>
      {/* Current Time Display */}
      {showTimeLabels && (
        <span className="text-[11px] font-mono font-bold text-slate-300 min-w-[38px] text-right">
          {formatVideoTime(currentTime)}
        </span>
      )}

      {/* Main Track Container */}
      <div
        ref={progressBarRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setHoverPosition(null);
          setHoverTime(null);
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        className={`relative flex-1 flex items-center cursor-pointer group py-2 ${
          compact ? 'h-6' : 'h-8'
        }`}
      >
        {/* Background Track */}
        <div className="w-full h-1.5 sm:h-2 rounded-full bg-slate-800/80 overflow-hidden relative transition-all duration-200 group-hover:h-2.5">
          {/* Buffering Track (Translucent White) */}
          <motion.div
            className="absolute top-0 bottom-0 left-0 bg-white/20 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${safeBufferedPercent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />

          {/* Played Progress Track (Brand Neon Green) */}
          <motion.div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#E5B868]/80 via-[#E5B868] to-[#60FF7A] rounded-full shadow-[0_0_10px_rgba(214,28,36,0.6)]"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: isDragging ? 0 : 0.1, ease: 'linear' }}
          />

          {/* Hover Position Indicator Line */}
          {isHovering && hoverPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/60 pointer-events-none"
              style={{ left: `${hoverPosition}%` }}
            />
          )}
        </div>

        {/* Scrubber Pin Knob (Framer Motion) */}
        <motion.div
          className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white shadow-[0_0_12px_#E5B868] border-2 border-[#E5B868] pointer-events-none"
          initial={false}
          animate={{
            left: `${progressPercent}%`,
            scale: isHovering || isDragging ? 1.3 : 0.8,
            opacity: isHovering || isDragging ? 1 : 0.85
          }}
          transition={{ duration: isDragging ? 0 : 0.1 }}
          style={{ transform: 'translateX(-50%)' }}
        />

        {/* Hover Time Tooltip */}
        <AnimatePresence>
          {isHovering && hoverTime !== null && hoverPosition !== null && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2.5 px-2 py-1 rounded-md bg-black/90 border border-[#E5B868]/40 text-white font-mono text-[10px] font-bold shadow-xl pointer-events-none backdrop-blur-md"
              style={{
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%)'
              }}
            >
              {formatVideoTime(hoverTime)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Duration & Buffering Indicator */}
      {showTimeLabels && (
        <div className="flex items-center gap-1.5 min-w-[42px]">
          {isBuffering && (
            <span title="Buffering...">
              <Loader2 className="w-3 h-3 text-[#E5B868] animate-spin" />
            </span>
          )}
          <span className="text-[11px] font-mono font-bold text-slate-400">
            {formatVideoTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
};
