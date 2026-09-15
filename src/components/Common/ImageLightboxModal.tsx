import React, { useEffect } from 'react';
import { X, Download, ZoomIn, Maximize2 } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  caption?: string;
  authorName?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  imageUrl,
  caption,
  authorName,
  onClose
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 transition-opacity animate-fadeIn"
      onClick={onClose}
    >
      {/* Top Header Controls */}
      <div 
        className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none"
      >
        <div className="bg-black/60 backdrop-blur-md border border-white/15 px-4 py-2 rounded-2xl pointer-events-auto flex items-center gap-3">
          <Maximize2 className="w-4 h-4 text-[#E5B868]" />
          <div>
            {authorName && (
              <span className="font-bold text-xs text-white block">{authorName}</span>
            )}
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              High-Res Image Inspection
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-3 rounded-2xl bg-black/70 hover:bg-white/20 border border-white/20 text-white hover:text-[#E5B868] transition-all pointer-events-auto shadow-2xl flex items-center gap-2 group"
          title="Close Lightbox (Esc)"
        >
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Close</span>
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      {/* Main Image View */}
      <div 
        className="relative max-w-5xl max-h-[85vh] flex flex-col items-center justify-center z-0"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={caption || 'Enlarged Social Feed Image'}
          className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.9)]"
        />

        {caption && (
          <div className="mt-4 px-5 py-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 max-w-2xl text-center">
            <p className="text-xs sm:text-sm text-slate-200 line-clamp-3 font-medium">
              {caption}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
