import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { RotateCcw, CheckCircle2, AlertCircle, PenTool } from 'lucide-react';

export interface TouchSignatureCanvasRef {
  getSignatureDataUrl: () => string | null;
  hasSignature: () => boolean;
  clear: () => void;
}

interface TouchSignatureCanvasProps {
  onSignatureChange?: (hasSignature: boolean) => void;
  height?: number;
  className?: string;
  penColor?: string;
  disabled?: boolean;
}

export const TouchSignatureCanvas = forwardRef<TouchSignatureCanvasRef, TouchSignatureCanvasProps>(({
  onSignatureChange,
  height = 180,
  className = '',
  penColor = '#0F172A',
  disabled = false,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [hasValidSignature, setHasValidSignature] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize and resize canvas with High-DPI support
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 320;

    // Save existing drawing if any
    let tempCanvas: HTMLCanvasElement | null = null;
    if (pointCount > 0) {
      tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }
    }

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 2.75;

      if (tempCanvas) {
        ctx.drawImage(tempCanvas, 0, 0, width, height);
      }
    }
  }, [height, penColor, pointCount]);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    return () => ro.disconnect();
  }, [resizeCanvas]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastPointRef.current = null;
    setPointCount(0);
    setHasValidSignature(false);
    onSignatureChange?.(false);
  }, [onSignatureChange]);

  useImperativeHandle(ref, () => ({
    getSignatureDataUrl: () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasValidSignature) return null;
      return canvas.toDataURL('image/png');
    },
    hasSignature: () => hasValidSignature,
    clear: clearCanvas,
  }), [hasValidSignature, clearCanvas]);

  // Pointer event handlers
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignored for non-standard pointer events
    }

    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;
    setIsDrawing(true);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = penColor;
      ctx.fill();
    }

    setPointCount(prev => {
      const next = prev + 1;
      if (next >= 15 && !hasValidSignature) {
        setHasValidSignature(true);
        onSignatureChange?.(true);
      }
      return next;
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentCoords = getCanvasCoords(e);
    const lastCoords = lastPointRef.current || currentCoords;

    ctx.beginPath();
    ctx.moveTo(lastCoords.x, lastCoords.y);
    ctx.lineTo(currentCoords.x, currentCoords.y);
    ctx.stroke();

    lastPointRef.current = currentCoords;

    setPointCount(prev => {
      const next = prev + 1;
      if (next >= 15 && !hasValidSignature) {
        setHasValidSignature(true);
        onSignatureChange?.(true);
      }
      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <PenTool className="w-3.5 h-3.5 text-[#FF6A00]" />
          <span className="text-slate-700 dark:text-slate-200">Legal Touch Signature</span>
        </div>

        <div className="flex items-center gap-2">
          {hasValidSignature ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Signed & Valid
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-3 h-3" />
              Signature Required
            </span>
          )}

          <button
            type="button"
            id="clear-signature-btn"
            onClick={clearCanvas}
            disabled={disabled || pointCount === 0}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-inner touch-none select-none"
        style={{ height: `${height}px` }}
      >
        {/* Subtle decorative baseline indicator */}
        <div className="absolute inset-x-6 bottom-8 border-b border-dashed border-slate-300 dark:border-slate-800 pointer-events-none flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-600 select-none">
          <span>Sign above this line</span>
          <span>X</span>
        </div>

        {/* Empty state prompt */}
        {pointCount === 0 && !isDrawing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 dark:text-slate-600 gap-1 select-none">
            <span className="text-xs font-medium">Draw signature here using finger or stylus</span>
            <span className="text-[10px]">Mouse drag is also supported</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
        />
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
        By signing above, you confirm you are the athlete (if 18+) or legal parent/guardian providing binding consent.
      </p>
    </div>
  );
});

TouchSignatureCanvas.displayName = 'TouchSignatureCanvas';
