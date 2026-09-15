import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  X, 
  Film, 
  Link as LinkIcon, 
  RefreshCw,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { compressImage } from '../../lib/imageCompressor';
import { generateMultipleVideoFrames, ThumbnailResult } from '../../lib/videoThumbnailGenerator';
import { triggerHaptic } from '../../lib/haptics';

export interface ThumbnailSelectorProps {
  selectedThumbnailUrl: string | null;
  selectedThumbnailFile: File | null;
  videoFile?: File | null;
  videoUrl?: string | null;
  onThumbnailChange: (thumbnailUrl: string, thumbnailFile?: File | null) => void;
  label?: string;
  helperText?: string;
  className?: string;
}

export const ThumbnailSelector: React.FC<ThumbnailSelectorProps> = ({
  selectedThumbnailUrl,
  selectedThumbnailFile,
  videoFile,
  videoUrl,
  onThumbnailChange,
  label = 'Highlight Cover / Thumbnail Photo',
  helperText = 'Select or upload a custom photo to represent this highlight in the feed and reels',
  className = ''
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'frames' | 'url'>('upload');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [extractedFrames, setExtractedFrames] = useState<ThumbnailResult[]>([]);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When a video file is attached or changed, extract multiple frames automatically
  useEffect(() => {
    if (!videoFile) {
      setExtractedFrames([]);
      return;
    }

    let isMounted = true;
    setIsExtractingFrames(true);

    generateMultipleVideoFrames(videoFile, 5)
      .then((frames) => {
        if (!isMounted) return;
        setExtractedFrames(frames);
        setIsExtractingFrames(false);

        // If no thumbnail selected yet and we found frames, default to the 1st frame
        if (!selectedThumbnailUrl && frames.length > 0) {
          onThumbnailChange(frames[0].dataUrl, frames[0].file);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Frame extraction notice:', err);
        setIsExtractingFrames(false);
      });

    return () => {
      isMounted = false;
    };
  }, [videoFile]);

  // Handle local photo file upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('light');
    try {
      // Fast high-quality compression for thumbnail (800x450 16:9 target)
      const compressed = await compressImage(file, { maxWidth: 960, maxHeight: 960, quality: 0.85 });
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onThumbnailChange(dataUrl, compressed);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.warn('Fallback photo reader:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onThumbnailChange(dataUrl, file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle URL submit
  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrlInput.trim()) {
      triggerHaptic('light');
      onThumbnailChange(customUrlInput.trim(), null);
      setCustomUrlInput('');
    }
  };

  return (
    <div className={`p-4 rounded-2xl bg-[#161C22] border border-[#2D3748] space-y-3.5 ${className}`}>
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="text-[11px] font-mono font-bold uppercase text-[#FF6A00] flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            <span>{label}</span>
          </label>
          <p className="text-[10px] text-slate-400 mt-0.5">{helperText}</p>
        </div>

        {/* Action source buttons */}
        <div className="flex items-center gap-1 bg-[#1E2630] p-1 rounded-xl border border-[#2D3748] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setActiveMode('upload'); triggerHaptic('light'); }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
              activeMode === 'upload'
                ? 'bg-[#FF6A00] text-white shadow-[0_0_10px_rgba(255,106,0,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upload Photo
          </button>

          {videoFile && (
            <button
              type="button"
              onClick={() => { setActiveMode('frames'); triggerHaptic('light'); }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                activeMode === 'frames'
                  ? 'bg-[#FF6A00] text-white shadow-[0_0_10px_rgba(255,106,0,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Video Frames {extractedFrames.length > 0 && `(${extractedFrames.length})`}
            </button>
          )}

          <button
            type="button"
            onClick={() => { setActiveMode('url'); triggerHaptic('light'); }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
              activeMode === 'url'
                ? 'bg-[#FF6A00] text-white shadow-[0_0_10px_rgba(255,106,0,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Image Link
          </button>
        </div>
      </div>

      {/* Main Selected Thumbnail Preview Card */}
      {selectedThumbnailUrl ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-[#FF6A00]/50 bg-black/60 shadow-lg group">
          <div className="relative aspect-video w-full max-h-48 overflow-hidden flex items-center justify-center bg-slate-950">
            <img
              src={selectedThumbnailUrl}
              alt="Selected Custom Thumbnail"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Selected Badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white font-mono text-[9px] font-black uppercase tracking-wider backdrop-blur-sm shadow-md">
              <CheckCircle2 className="w-3 h-3" />
              <span>Custom Photo Selected</span>
            </div>

            {/* Change photo quick overlay buttons */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-[#FF6A00] text-white text-[10px] font-bold font-mono border border-white/20 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Replace Photo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onThumbnailChange('', null);
                }}
                className="p-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition-all cursor-pointer"
                title="Remove custom thumbnail"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State / Photo Selection Box */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-[#FF6A00] bg-[#1E2630]/60 hover:bg-[#1E2630] rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
        >
          <div className="w-10 h-10 rounded-full bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white group-hover:text-[#FF6A00] transition-colors">
              Click to select a custom photo for the thumbnail
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Select any game action photo or high-res graphic from your device
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input for native device photo picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Frame Selection Strip (when video file is loaded) */}
      {activeMode === 'frames' && videoFile && (
        <div className="space-y-2 pt-1 border-t border-[#2D3748]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-300 flex items-center gap-1">
              <Film className="w-3 h-3 text-[#FF6A00]" />
              <span>Extracted Video Frames (Tap to set as cover)</span>
            </span>
            {isExtractingFrames && (
              <span className="text-[9px] font-mono text-[#00F2FE] animate-pulse">
                Extracting high-res frames...
              </span>
            )}
          </div>

          {extractedFrames.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {extractedFrames.map((frame, idx) => {
                const isSelected = selectedThumbnailUrl === frame.dataUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onThumbnailChange(frame.dataUrl, frame.file);
                    }}
                    className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer group ${
                      isSelected
                        ? 'border-[#FF6A00] shadow-[0_0_12px_rgba(255,106,0,0.6)] scale-[1.03]'
                        : 'border-slate-700 hover:border-slate-400 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={frame.dataUrl} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#FF6A00]/20 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 text-[8px] font-mono font-bold text-white bg-black/70 px-1 rounded">
                      F{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : !isExtractingFrames ? (
            <p className="text-[10px] text-slate-500 font-mono">No frames available. Upload a photo above.</p>
          ) : null}
        </div>
      )}

      {/* URL Input Form (when activeMode === 'url') */}
      {activeMode === 'url' && (
        <form onSubmit={handleApplyUrl} className="flex gap-2 pt-1 border-t border-[#2D3748]">
          <div className="relative flex-1">
            <input
              type="url"
              placeholder="Paste image URL (https://...)"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-[#1E2630] border border-[#2D3748] text-xs text-white placeholder-slate-500 focus:border-[#FF6A00] focus:outline-none font-mono"
            />
            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          </div>
          <button
            type="submit"
            disabled={!customUrlInput.trim()}
            className="px-3 h-8 rounded-lg bg-[#FF6A00] hover:bg-[#E55F00] disabled:opacity-50 text-white font-mono text-[10px] font-bold uppercase transition-all cursor-pointer"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
};
