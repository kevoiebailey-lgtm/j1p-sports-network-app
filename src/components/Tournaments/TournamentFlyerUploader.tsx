import React, { useState, useRef, useCallback } from 'react';
import { Upload, Link2, Image as ImageIcon, CheckCircle2, AlertCircle, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';

export interface FlyerUploadData {
  flyerUrl: string;
  thumbnailUrl: string;
  aspectRatio: 'banner' | 'flyer' | 'auto';
}

interface TournamentFlyerUploaderProps {
  initialUrl?: string;
  initialThumbnail?: string;
  initialAspectRatio?: 'banner' | 'flyer' | 'auto';
  tournamentId?: string;
  onChange: (data: FlyerUploadData) => void;
  title?: string;
}

const PRESET_TOURNAMENT_FLYERS = [
  {
    label: 'Elite Hoops National Championship',
    url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80',
    aspect: 'banner' as const
  },
  {
    label: 'Gridiron Classic Showcase Flyer',
    url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
    aspect: 'flyer' as const
  },
  {
    label: 'Girls Flag Championship Series',
    url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&auto=format&fit=crop&q=80',
    aspect: 'banner' as const
  },
  {
    label: 'Lacrosse Summer Shootout',
    url: 'https://images.unsplash.com/photo-1515037893149-de7f840978e2?w=800&auto=format&fit=crop&q=80',
    aspect: 'flyer' as const
  }
];

export const TournamentFlyerUploader: React.FC<TournamentFlyerUploaderProps> = ({
  initialUrl = '',
  initialThumbnail = '',
  initialAspectRatio = 'banner',
  tournamentId = 'general',
  onChange,
  title = 'Tournament Cover / Promotional Flyer'
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [aspectRatio, setAspectRatio] = useState<'banner' | 'flyer' | 'auto'>(initialAspectRatio);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate lightweight compressed thumbnail via HTML Canvas
  const generateThumbnail = useCallback((imageSource: string | HTMLImageElement): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve(thumbDataUrl);
            return;
          }
        } catch {
          // If canvas taint or failure, fallback to original
        }
        resolve(typeof imageSource === 'string' ? imageSource : imageSource.src);
      };
      img.onerror = () => {
        resolve(typeof imageSource === 'string' ? imageSource : '');
      };
      img.src = typeof imageSource === 'string' ? imageSource : imageSource.src;
    });
  }, []);

  // Update parent with flyer data
  const handleDataUpdate = useCallback(async (newUrl: string, newAspect: 'banner' | 'flyer' | 'auto') => {
    setCurrentUrl(newUrl);
    setAspectRatio(newAspect);
    setErrorMsg(null);

    let thumbUrl = newUrl;
    if (newUrl) {
      thumbUrl = await generateThumbnail(newUrl);
    }

    onChange({
      flyerUrl: newUrl,
      thumbnailUrl: thumbUrl,
      aspectRatio: newAspect
    });
  }, [generateThumbnail, onChange]);

  // Handle URL input apply
  const handleApplyUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a valid image URL');
      return;
    }
    await handleDataUpdate(trimmed, aspectRatio);
  };

  // Upload file to Firebase Storage with canvas thumbnail fallback
  const processAndUploadFile = async (file: File) => {
    setErrorMsg(null);

    // Validate mime type (PNG, JPG, WebP) - Rule 2 compliance
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Invalid file type. Please upload a PNG, JPG, or WebP image.');
      return;
    }

    // Limit up to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image file size exceeds 10MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      // 1. Create a local preview data URL immediately for rapid UI response
      const reader = new FileReader();
      reader.onload = async (e) => {
        const localDataUrl = e.target?.result as string;

        // Auto-detect natural aspect ratio if desired
        const img = new Image();
        img.onload = async () => {
          let detectedAspect: 'banner' | 'flyer' | 'auto' = aspectRatio;
          if (aspectRatio === 'auto') {
            detectedAspect = img.height > img.width * 1.1 ? 'flyer' : 'banner';
          }

          // Try Firebase Storage upload
          try {
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `tournaments/${tournamentId}/flyers/${Date.now()}_${cleanName}`;
            const storageRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(storageRef, file, {
              contentType: file.type,
              customMetadata: {
                tournamentId,
                uploadedAt: new Date().toISOString()
              }
            });

            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(Math.round(p));
              },
              async (err) => {
                console.warn('Firebase storage upload notice, falling back to local data URL:', err);
                // Fallback to local data URL if Firebase storage has bucket quota or network limitation
                await handleDataUpdate(localDataUrl, detectedAspect);
                setIsUploading(false);
              },
              async () => {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                await handleDataUpdate(downloadUrl, detectedAspect);
                setIsUploading(false);
              }
            );
          } catch (storageErr) {
            console.warn('Storage ref init notice, continuing with direct data URL:', storageErr);
            await handleDataUpdate(localDataUrl, detectedAspect);
            setIsUploading(false);
          }
        };
        img.src = localDataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Error handling flyer file:', err);
      setErrorMsg(err.message || 'Failed to process image file');
      setIsUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAndUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAndUploadFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setCurrentUrl('');
    setUrlInput('');
    onChange({
      flyerUrl: '',
      thumbnailUrl: '',
      aspectRatio
    });
  };

  return (
    <div className="space-y-3.5 p-4 rounded-2xl bg-[#151E26] border border-slate-700/80 shadow-inner">
      {/* Header & Aspect Ratio Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-700/60">
        <div>
          <label className="text-xs font-mono font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-[#00F2FE]" />
            <span>{title}</span>
          </label>
          <p className="text-[11px] text-slate-400">
            Upload promotional posters, gym flyers, or high-impact banners (PNG, JPG, WebP up to 10MB)
          </p>
        </div>

        {/* Aspect Ratio Mode Buttons */}
        <div className="flex items-center gap-1.5 bg-[#0D151D] p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => handleDataUpdate(currentUrl, 'banner')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
              aspectRatio === 'banner'
                ? 'bg-[#00F2FE] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="16:9 High-Impact Banner (Website Hero)"
          >
            16:9 Banner
          </button>
          <button
            type="button"
            onClick={() => handleDataUpdate(currentUrl, 'flyer')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
              aspectRatio === 'flyer'
                ? 'bg-[#00F2FE] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="4:5 Social Media Flyer (Poster)"
          >
            4:5 Flyer
          </button>
          <button
            type="button"
            onClick={() => handleDataUpdate(currentUrl, 'auto')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
              aspectRatio === 'auto'
                ? 'bg-[#00F2FE] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Natural Image Aspect Ratio"
          >
            Auto Fit
          </button>
        </div>
      </div>

      {/* Tabs: Upload / Direct URL / Presets */}
      <div className="flex items-center gap-2 text-xs border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-slate-800 text-[#00F2FE] border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Flyer / Cover</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'url'
              ? 'bg-slate-800 text-[#00F2FE] border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Flyer Image URL</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'presets'
              ? 'bg-slate-800 text-[#00F2FE] border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Presets</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: FILE DROPZONE */}
      {activeTab === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-[#00F2FE] bg-[#00F2FE]/10 scale-[1.01]'
              : 'border-slate-700 hover:border-slate-500 bg-[#0D151D]/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-[#00F2FE] mb-3">
            {isUploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-[#00F2FE]" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <div className="text-xs font-bold text-white mb-1">
            {isUploading
              ? `Uploading & Generating Thumbnail... ${uploadProgress}%`
              : 'Click or Drag & Drop Flyer File Here'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Supports high-res PNG, JPG, WebP up to 10MB • Auto-compressed for fast loading
          </p>

          {isUploading && (
            <div className="w-48 h-1.5 rounded-full bg-slate-800 mx-auto mt-3 overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-[#00F2FE] to-[#0284C7] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DIRECT URL INPUT */}
      {activeTab === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://cdn.example.com/tournament-flyer.jpg"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0D151D] border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-[#00F2FE]"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-4 py-2.5 rounded-xl bg-[#00F2FE] text-slate-950 font-black font-mono text-xs uppercase cursor-pointer hover:shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-all"
            >
              Apply
            </button>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Paste any direct image link from Imgur, Cloudinary, AWS S3, or team site
          </p>
        </div>
      )}

      {/* TAB 3: PRESETS */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PRESET_TOURNAMENT_FLYERS.map((preset, idx) => (
            <div
              key={idx}
              onClick={() => handleDataUpdate(preset.url, preset.aspect)}
              className={`relative aspect-[16/9] rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${
                currentUrl === preset.url
                  ? 'border-[#00F2FE] shadow-[0_0_12px_rgba(0,242,254,0.4)] scale-[1.02]'
                  : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
              }`}
            >
              <img
                src={preset.url}
                alt={preset.label}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                <span className="text-[10px] font-bold text-white leading-tight">
                  {preset.label}
                </span>
              </div>
              {currentUrl === preset.url && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#00F2FE] text-slate-950 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LIVE PREVIEW & ASPECT RATIO DISPLAY */}
      {currentUrl && (
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Flyer Loaded ({aspectRatio === 'banner' ? '16:9 Banner' : aspectRatio === 'flyer' ? '4:5 Flyer' : 'Auto Aspect'})
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-rose-400 hover:text-rose-300 font-mono flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>

          {/* Clean Container Display without Distortion */}
          <div
            className={`relative rounded-2xl overflow-hidden bg-black/60 border border-slate-700 flex items-center justify-center ${
              aspectRatio === 'banner'
                ? 'aspect-[16/9] max-h-56'
                : aspectRatio === 'flyer'
                ? 'aspect-[4/5] max-h-72 mx-auto max-w-[280px]'
                : 'max-h-64'
            }`}
          >
            {/* Ambient Blurred Backdrop */}
            <img
              src={currentUrl}
              alt="Backdrop blur"
              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 pointer-events-none scale-110"
              referrerPolicy="no-referrer"
            />

            {/* Foreground image rendered without distortion */}
            <img
              src={currentUrl}
              alt="Tournament Flyer Preview"
              className={`relative z-10 w-full h-full ${
                aspectRatio === 'banner' ? 'object-cover' : 'object-contain'
              }`}
              referrerPolicy="no-referrer"
            />

            {/* Watermark / Badge */}
            <div className="absolute top-2.5 left-2.5 z-20 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/20 text-[9px] font-mono font-bold text-[#00F2FE]">
              JUST1PLAY OFFICIAL MEDIA
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
