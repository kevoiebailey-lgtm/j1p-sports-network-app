import React, { useState } from 'react';
import { 
  Play, 
  Video, 
  Sparkles, 
  ExternalLink, 
  Plus, 
  X, 
  Check, 
  Film, 
  Eye, 
  Flame,
  Share2,
  Trash2
} from 'lucide-react';
import { VideoHighlight } from '../../types';
import { useToast } from '../../context/ToastContext';
import { detectVideoEmbed } from '../../lib/mediaEmbed';

interface MediaHubProps {
  mediaUrls?: VideoHighlight[];
  isOwner?: boolean;
  onAddMedia?: (video: VideoHighlight) => void;
  onRemoveMedia?: (video: VideoHighlight) => void;
}

export const MediaHub: React.FC<MediaHubProps> = ({
  mediaUrls = [],
  isOwner = false,
  onAddMedia,
  onRemoveMedia
}) => {
  const { showToast } = useToast();
  const [selectedVideo, setSelectedVideo] = useState<VideoHighlight | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const videos = mediaUrls || [];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    const detected = detectVideoEmbed(newUrl.trim());
    const platform = detected ? detected.platform : 'other';

    const newHighlight: VideoHighlight = {
      id: `vid-${Date.now()}`,
      title: newTitle.trim(),
      url: newUrl.trim(),
      platform: platform as any,
      thumbnailUrl: '',
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (onAddMedia) {
      onAddMedia(newHighlight);
    }
    showToast('success', 'Highlight Added', 'Your game highlight video was added to your profile!');
    setNewTitle('');
    setNewUrl('');
    setShowAddModal(false);
  };

  const handleRemoveClick = (e: React.MouseEvent, vid: VideoHighlight) => {
    e.stopPropagation();
    if (!isOwner || !onRemoveMedia) return;
    if (window.confirm(`Are you sure you want to remove "${vid.title}" from your profile?`)) {
      onRemoveMedia(vid);
      if (selectedVideo?.id === vid.id || selectedVideo?.url === vid.url) {
        setSelectedVideo(null);
      }
    }
  };

  const getActiveEmbed = (video: VideoHighlight | null) => {
    if (!video) return { embedUrl: '', isDirectVideo: false };
    const detected = detectVideoEmbed(video.url);
    if (detected) {
      return { embedUrl: detected.embedUrl, isDirectVideo: false };
    }
    if (
      video.url.startsWith('data:video') || 
      video.url.startsWith('blob:') || 
      /\.(mp4|webm|mov)(\?.*)?$/i.test(video.url)
    ) {
      return { embedUrl: video.url, isDirectVideo: true };
    }
    return { embedUrl: video.url, isDirectVideo: false };
  };

  const activeEmbedInfo = getActiveEmbed(selectedVideo);

  return (
    <div className="rounded-3xl bg-[#131B26] border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-[#00E5FF]" />
            <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
              Recruiting Highlight Reels & Game Film
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Verified Scouting Videos, Hudl Tapes & Match Highlights
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] text-[#0B0F17] font-black text-xs font-mono uppercase tracking-wider hover:brightness-110 flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Reel / Highlight</span>
          </button>
        )}
      </div>

      {/* Video Highlights Grid or Empty State */}
      {videos.length === 0 ? (
        <div className="rounded-2xl bg-[#0B0F17]/60 border border-white/5 p-8 text-center flex flex-col items-center justify-center">
          <Film className="w-10 h-10 text-slate-600 mb-3" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">No Highlight Videos Added Yet</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
            Add your Hudl, YouTube, TikTok, Vimeo, or Instagram highlight reels to showcase your game to college scouts.
          </p>
          {isOwner && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#00E5FF] text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Highlight Link</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((vid) => (
            <div
              key={vid.id}
              onClick={() => setSelectedVideo(vid)}
              className="group relative rounded-2xl bg-[#0B0F17] border border-white/10 overflow-hidden cursor-pointer hover:border-[#00E5FF]/50 transition-all shadow-lg flex flex-col"
            >
              {/* Video Thumbnail */}
              <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                {vid.thumbnailUrl ? (
                  <img
                    src={vid.thumbnailUrl}
                    alt={vid.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
                    <Video className="w-8 h-8 text-cyan-400 mb-2 opacity-80" />
                    <span className="text-[11px] font-mono text-slate-400 text-center truncate max-w-[80%]">
                      {vid.title}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#00E5FF]/90 text-[#0B0F17] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.6)] group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                  </div>
                </div>

                {/* Platform Tag */}
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold uppercase text-[#00E5FF] border border-white/10">
                  {vid.platform || 'Highlight'}
                </div>

                {/* Quick Remove Button for Owner on Top Right */}
                {isOwner && onRemoveMedia && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveClick(e, vid)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/70 hover:bg-red-500/90 text-slate-300 hover:text-white border border-white/10 hover:border-red-400 transition-all cursor-pointer shadow-lg z-10"
                    title="Remove this highlight URL"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Title & Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <h4 className="text-sm font-bold text-white group-hover:text-[#00E5FF] transition-colors line-clamp-2">
                  {vid.title}
                </h4>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-3 pt-2 border-t border-white/5">
                  <span>{vid.createdAt || 'Recent Film'}</span>
                  <div className="flex items-center gap-2">
                    {isOwner && onRemoveMedia && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveClick(e, vid)}
                        className="text-red-400 hover:text-red-300 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        title="Remove highlight"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                    <span className="text-[#39FF14] font-bold flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Watch Video
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-4xl bg-[#0F172A] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0B0F17]">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-[#00E5FF]" />
                <h3 className="text-sm sm:text-base font-black text-white truncate max-w-lg">
                  {selectedVideo.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              {activeEmbedInfo.isDirectVideo ? (
                <video
                  src={activeEmbedInfo.embedUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : activeEmbedInfo.embedUrl ? (
                <iframe
                  src={activeEmbedInfo.embedUrl}
                  title={selectedVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <p>Unable to embed video directly.</p>
                  <a
                    href={selectedVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold"
                  >
                    <ExternalLink className="w-4 h-4" /> Open External Link
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#0B0F17] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-400 truncate max-w-xs sm:max-w-md">
                URL: <a href={selectedVideo.url} target="_blank" rel="noopener noreferrer" className="text-[#00E5FF] hover:underline">{selectedVideo.url}</a>
              </span>
              <div className="flex items-center gap-2">
                {isOwner && onRemoveMedia && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveClick(e, selectedVideo)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-mono text-red-400 hover:text-red-300 border border-red-500/30 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove from Profile</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedVideo.url);
                    showToast('success', 'Link Copied', 'Video URL copied to clipboard');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-mono text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Highlight Reel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0F172A] border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-[#00E5FF]" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Add Highlight Reel
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Highlight Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Senior Season Mixtape • 28 PPG"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Video URL (Hudl, YouTube, TikTok, Vimeo, etc.)
                </label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://www.hudl.com/video/... or YouTube / TikTok"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5FF]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-mono font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] text-[#0B0F17] font-black text-xs font-mono uppercase tracking-wider hover:brightness-110 shadow-[0_0_15px_rgba(0,229,255,0.3)] cursor-pointer"
                >
                  Save Highlight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

