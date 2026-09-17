import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Plus, 
  Link, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Trash2, 
  ExternalLink, 
  Video, 
  Film, 
  Tv, 
  Layers,
  X,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { parseVideoUrl, ProcessedVideoInfo } from '../../lib/videoEmbedUtils';
import { VideoClip } from '../../types/platform';

interface VideoEmbedManagerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSaveClip: (clip: VideoClip) => void;
  initialClip?: VideoClip | null;
  existingClips?: VideoClip[];
}

export const VideoEmbedManager: React.FC<VideoEmbedManagerProps> = ({
  isOpen = true,
  onClose,
  onSaveClip,
  initialClip,
  existingClips = []
}) => {
  const [url, setUrl] = useState<string>(initialClip?.url || '');
  const [title, setTitle] = useState<string>(initialClip?.title || '');
  const [tag, setTag] = useState<string>(initialClip?.tag || '#Highlights');
  const [description, setDescription] = useState<string>(initialClip?.description || '');
  const [videoInfo, setVideoInfo] = useState<ProcessedVideoInfo | null>(null);
  const [customThumbnail, setCustomThumbnail] = useState<string>(initialClip?.thumbnailUrl || '');
  const [isVertical, setIsVertical] = useState<boolean>(initialClip?.isVertical || false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Suggested preset tags for athletic film
  const PRESET_TAGS = [
    '#Highlights',
    '#GameFilm',
    '#Dunks',
    '#Shooting',
    '#Defense',
    '#Clutch',
    '#Playmaking',
    '#Combine',
    '#Mixtape'
  ];

  // Quick provider example presets
  const PROVIDER_TEMPLATES = [
    { name: 'YouTube', icon: '🎬', example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { name: 'Hudl', icon: '🏈', example: 'https://www.hudl.com/embed/video/3/12345/abcde' },
    { name: 'Instagram', icon: '📸', example: 'https://www.instagram.com/reel/C8xyz123' },
    { name: 'TikTok', icon: '🎵', example: 'https://www.tiktok.com/@athlete/video/7123456789' },
    { name: 'Vimeo', icon: '🎥', example: 'https://vimeo.com/1209255734' }
  ];

  // Detect and parse URL changes dynamically
  useEffect(() => {
    if (!url.trim()) {
      setVideoInfo(null);
      setError(null);
      return;
    }

    try {
      const parsed = parseVideoUrl(url);
      setVideoInfo(parsed);
      setIsVertical(!!parsed.isVertical);
      setError(null);

      // Auto-populate Title if empty and valid video parsed
      if (!title && parsed.platformName) {
        setTitle(`Game Film Highlight (${parsed.platformName})`);
      }

      // Auto-extract thumbnail for YouTube if not manually set
      if (parsed.type === 'youtube' && parsed.videoId && !customThumbnail) {
        setCustomThumbnail(`https://img.youtube.com/vi/${parsed.videoId}/hqdefault.jpg`);
      }
    } catch (e) {
      console.warn('Video URL parse exception:', e);
      setError('Could not automatically parse video link. Please verify URL format.');
    }
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please paste a valid video URL.');
      return;
    }

    const parsed = parseVideoUrl(url.trim());
    
    // Determine provider
    let resolvedProvider: VideoClip['provider'] = 'other';
    if (['youtube', 'vimeo', 'hudl', 'instagram', 'tiktok'].includes(parsed.type)) {
      resolvedProvider = parsed.type as VideoClip['provider'];
    } else if (parsed.isDirectFile) {
      resolvedProvider = 'mp4';
    }

    // Default thumbnail fallback based on sport film
    const finalThumb = customThumbnail.trim() || 
      (parsed.type === 'youtube' && parsed.videoId ? `https://img.youtube.com/vi/${parsed.videoId}/hqdefault.jpg` : '') ||
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80';

    const newClip: VideoClip = {
      id: initialClip?.id || `clip-${Date.now()}`,
      title: title.trim() || `Official ${parsed.platformName} Reel`,
      url: url.trim(),
      embedUrl: parsed.embedUrl,
      provider: resolvedProvider,
      tag: tag.startsWith('#') ? tag : `#${tag}`,
      thumbnailUrl: finalThumb,
      duration: isVertical ? '0:45' : '2:15',
      views: initialClip?.views || 1,
      isVertical: isVertical,
      description: description.trim(),
      createdAt: initialClip?.createdAt || new Date().toISOString()
    };

    onSaveClip(newClip);
    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);
      if (onClose) onClose();
    }, 600);
  };

  const getPlatformBadge = (type?: string) => {
    switch (type) {
      case 'youtube':
        return { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'YouTube' };
      case 'hudl':
        return { bg: 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/30', label: 'Hudl Official' };
      case 'instagram':
        return { bg: 'bg-pink-500/20 text-pink-400 border-pink-500/30', label: 'Instagram Reel' };
      case 'tiktok':
        return { bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', label: 'TikTok Clip' };
      case 'vimeo':
        return { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Vimeo Pro' };
      default:
        return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Direct Video Stream' };
    }
  };

  return (
    <div className="bg-[#1E282D] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 text-white font-sans max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF6A00] to-[#FF8C00] flex items-center justify-center shadow-lg shadow-[#FF6A00]/30">
              <Film className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-black italic uppercase tracking-tight text-white">
              {initialClip ? 'Edit Highlight Reel' : 'Video Embed Manager'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Embed game tapes, scout reels & mixtapes from YouTube, Hudl, Instagram, TikTok & Vimeo
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Provider Suggestions */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#FF6A00]" />
          Supported Video Providers
        </label>
        <div className="flex flex-wrap gap-2">
          {PROVIDER_TEMPLATES.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                if (!url) setUrl(p.example);
              }}
              className="px-2.5 py-1 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-[#FF6A00]/50 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer font-mono"
            >
              <span>{p.icon}</span>
              <span className="font-bold">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Embed Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* URL Input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider mb-1.5">
            Video Reel / Highlight URL <span className="text-[#FF6A00]">*</span>
          </label>
          <div className="relative">
            <Link className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste link: https://youtube.com/..., hudl.com/..., instagram.com/reel/..., tiktok.com/..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00] transition-colors"
            />
            {videoInfo && (
              <span className={`absolute right-2.5 top-2 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase font-mono ${getPlatformBadge(videoInfo.type).bg}`}>
                {getPlatformBadge(videoInfo.type).label}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Video Live Preview Container */}
        {videoInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 space-y-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Valid Stream Source Detected
              </span>
              <span className="text-slate-400 text-[10px]">
                {videoInfo.isVertical ? 'Vertical 9:16 Feed' : 'Landscape 16:9 Cinema'}
              </span>
            </div>

            {/* Embedded Live Player Preview Frame */}
            <div className={`relative w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner ${videoInfo.isVertical ? 'aspect-[9/16] max-h-72 mx-auto' : 'aspect-video'}`}>
              {videoInfo.embedUrl ? (
                <iframe
                  src={videoInfo.embedUrl}
                  title="Video Preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full object-cover border-0"
                />
              ) : videoInfo.isDirectFile ? (
                <video
                  src={videoInfo.rawUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-400">
                  <Play className="w-8 h-8 text-slate-600 mb-1" />
                  <p className="text-[11px] font-mono">Stream preview will render on athlete showcase</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Title Input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider mb-1.5">
            Clip Title <span className="text-[#FF6A00]">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 2026 AAU State Championship Highlights vs Jersey Shore Elite"
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00] transition-colors"
          />
        </div>

        {/* Tag Category Selector & Custom Tag */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">
            Scouting Tag Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono ${
                  tag === t
                    ? 'bg-[#FF6A00] text-white shadow-md shadow-[#FF6A00]/30 border border-[#FF8C00]'
                    : 'bg-black/40 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Description */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider mb-1.5">
            Game Notes / Opponent Details (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 28 Points, 7 Assists, 4 Steals in Quarterfinals. Scouts in attendance."
            className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00] transition-colors resize-none"
          />
        </div>

        {/* Error / Feedback */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#FF6A00]/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            {success ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Reel Saved!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{initialClip ? 'Update Highlight' : 'Save & Publish Reel'}</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};

export default VideoEmbedManager;
