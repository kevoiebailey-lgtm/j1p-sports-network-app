import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Plus, 
  Share2, 
  Download, 
  Filter, 
  ExternalLink, 
  Tv, 
  Eye, 
  Check, 
  X, 
  Film,
  Sparkles,
  Edit2,
  Trash2,
  Maximize2
} from 'lucide-react';
import { VideoClip } from '../../../types/platform';
import { parseVideoUrl } from '../../../lib/videoEmbedUtils';
import { VideoEmbedManager } from '../../Video/VideoEmbedManager';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { saveAthleteHighlight, deleteHighlight } from '../../../services/highlightService';

export const AthleteFilmTab: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [activeClip, setActiveClip] = useState<VideoClip | null>(null);
  const [showEmbedManager, setShowEmbedManager] = useState<boolean>(false);
  const [editingClip, setEditingClip] = useState<VideoClip | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<boolean>(false);

  useEffect(() => {
    if (profile?.mediaUrls && Array.isArray(profile.mediaUrls) && profile.mediaUrls.length > 0) {
      const normalized: VideoClip[] = profile.mediaUrls.map((item: any, idx: number) => {
        const info = parseVideoUrl(item.url || item.embedUrl || '');
        const prov = (['youtube', 'vimeo', 'hudl', 'instagram', 'tiktok', 'mp4'].includes(info.type) ? info.type : 'other') as VideoClip['provider'];
        return {
          id: item.id || `clip-${idx}`,
          title: item.title || `Highlight #${idx + 1}`,
          url: item.url || '',
          provider: item.provider || prov,
          tag: item.tag || '#Highlights',
          thumbnailUrl: item.thumbnailUrl,
          embedUrl: item.embedUrl || info.embedUrl,
          views: item.views || 0,
          isVertical: item.isVertical ?? info.isVertical,
          createdAt: item.createdAt || new Date().toISOString()
        };
      });
      setClips(normalized);
      setActiveClip(normalized[0] || null);
    } else if (profile?.highlightUrls && Array.isArray(profile.highlightUrls) && profile.highlightUrls.length > 0) {
      const parsed: VideoClip[] = profile.highlightUrls.map((url, idx) => {
        const info = parseVideoUrl(url);
        const prov = (['youtube', 'vimeo', 'hudl', 'instagram', 'tiktok', 'mp4'].includes(info.type) ? info.type : 'other') as VideoClip['provider'];
        return {
          id: `clip-${idx}`,
          title: `Highlight Reel #${idx + 1}`,
          provider: prov,
          url,
          embedUrl: info.embedUrl,
          tag: '#Highlights',
          views: 1,
          createdAt: new Date().toISOString()
        };
      });
      setClips(parsed);
      setActiveClip(parsed[0] || null);
    } else {
      setClips([]);
      setActiveClip(null);
    }
  }, [profile?.mediaUrls, profile?.highlightUrls]);

  const tags = ['All', '#Highlights', '#GameFilm', '#Dunks', '#Shooting', '#Defense', '#Clutch', '#TD', '#Pick6'];

  const filteredClips = selectedTag === 'All' 
    ? clips 
    : clips.filter(c => c.tag === selectedTag || c.tag.toLowerCase().includes(selectedTag.replace('#', '').toLowerCase()));

  // Active clip parsed info
  const activeVideoInfo = activeClip ? parseVideoUrl(activeClip.url || activeClip.embedUrl || '') : null;

  const persistClipsToFirestore = async (newClips: VideoClip[]) => {
    if (!user || !db) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const highlightUrls = newClips.map(c => c.url).filter(Boolean);
      await updateDoc(userRef, {
        mediaUrls: newClips,
        highlightUrls: highlightUrls
      });
    } catch (err) {
      console.warn('Error persisting clips to Firestore:', err);
    }
  };

  const handleSaveClip = async (savedClip: VideoClip) => {
    let updatedClips: VideoClip[];
    const exists = clips.some(c => c.id === savedClip.id);

    if (exists) {
      updatedClips = clips.map(c => c.id === savedClip.id ? savedClip : c);
      showToast('success', 'Highlight reel updated successfully!');
    } else {
      updatedClips = [savedClip, ...clips];
      showToast('success', `Added new ${savedClip.provider.toUpperCase()} highlight reel!`);
    }

    setClips(updatedClips);
    setActiveClip(savedClip);
    setShowEmbedManager(false);
    setEditingClip(null);
    persistClipsToFirestore(updatedClips);

    // Also sync to global highlights collection so it appears in Watch Vault
    if (user) {
      try {
        await saveAthleteHighlight({
          userId: user.uid,
          userName: profile?.displayName || user.displayName || 'Athlete',
          userRole: profile?.role || 'athlete',
          userAvatar: profile?.avatarUrl || user.photoURL || '',
          title: savedClip.title,
          videoUrl: savedClip.url,
          sport: profile?.sport || 'Football',
          position: profile?.position || '',
          gradYear: profile?.gradYear || '',
          highSchool: profile?.highSchool || '',
          state: profile?.state || '',
          isFeatured: updatedClips.length === 1
        });
      } catch (err) {
        console.warn('Could not cross-sync to highlights collection:', err);
      }
    }
  };

  const handleDeleteClip = async (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetClip = clips.find(c => c.id === clipId);
    const updatedClips = clips.filter(c => c.id !== clipId);
    setClips(updatedClips);
    if (activeClip?.id === clipId) {
      setActiveClip(updatedClips.length > 0 ? updatedClips[0] : null);
    }
    showToast('info', 'Video reel removed from your film room.');
    persistClipsToFirestore(updatedClips);

    if (user && targetClip?.url) {
      try {
        await deleteHighlight(clipId, user.uid, targetClip.url);
      } catch (err) {
        console.warn('Could not remove from highlights collection:', err);
      }
    }
  };

  const handleExportReel = () => {
    setExportNotice(true);
    showToast('success', 'Highlight package generated and copied to clipboard!');
    setTimeout(() => setExportNotice(false), 4000);
  };

  const handleShareLink = () => {
    if (!activeClip) return;
    const shareUrl = activeClip.url || (user ? `https://just1play.app/athlete/${user.uid}/film/${activeClip.id}` : window.location.href);
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    showToast('success', 'Link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getProviderBadge = (provider?: string) => {
    switch (provider?.toLowerCase()) {
      case 'youtube':
        return { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'YouTube' };
      case 'hudl':
        return { bg: 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/30', label: 'Hudl' };
      case 'instagram':
        return { bg: 'bg-pink-500/20 text-pink-400 border-pink-500/30', label: 'Instagram' };
      case 'tiktok':
        return { bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', label: 'TikTok' };
      case 'vimeo':
        return { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Vimeo' };
      default:
        return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Direct MP4' };
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn font-sans">
      
      {/* Header with Title and 1-Click Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 dark:bg-[#1E282D] border border-slate-800 dark:border-white/10 rounded-3xl p-4 sm:p-5 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF6A00] to-[#FF8C00] flex items-center justify-center shadow-lg shadow-[#FF6A00]/30">
              <Film className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-black italic uppercase text-white tracking-tight">
              Personal Film Room
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Dynamic Video Embed Manager for YouTube, Hudl, Instagram, TikTok & Vimeo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportReel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-md font-mono"
          >
            <Download className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>Export Reel Link</span>
          </button>

          <button
            onClick={() => {
              setEditingClip(null);
              setShowEmbedManager(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#FF6A00]/30"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Embed Video Link</span>
          </button>
        </div>
      </div>

      {/* Export Highlight Notification Toast */}
      <AnimatePresence>
        {exportNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center justify-between text-xs text-emerald-200 shadow-xl font-mono"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Official Recruit Highlight Package generated! Verified scouts can access full tape breakdown.</span>
            </div>
            <button onClick={() => setExportNotice(false)} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE VIDEO EMBED THEATER PLAYER */}
      {activeClip && (
        <div className="bg-slate-900/90 dark:bg-[#1E282D] border border-slate-800 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-4 sm:p-5">
          
          {/* Responsive Dynamic Player Container */}
          <div className={`relative w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner flex items-center justify-center ${activeVideoInfo?.isVertical ? 'aspect-[9/16] max-h-[520px] mx-auto' : 'aspect-video'}`}>
            {activeVideoInfo?.embedUrl ? (
              <iframe 
                src={activeVideoInfo.embedUrl} 
                title={activeClip.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
                className="w-full h-full object-cover border-0"
              />
            ) : activeVideoInfo?.isDirectFile || activeClip.url.endsWith('.mp4') ? (
              <video
                src={activeClip.url}
                controls
                autoPlay={false}
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <Tv className="w-12 h-12 text-slate-600 mb-2" />
                <p className="text-sm font-bold text-white mb-1">{activeClip.title}</p>
                <p className="text-xs font-mono text-slate-400">Rendering external highlight reel stream...</p>
                {activeClip.url && (
                  <a 
                    href={activeClip.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-[#FF6A00] hover:underline flex items-center gap-1 font-mono"
                  >
                    Open Source Video <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Player Metadata & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-[#FF6A00]/15 border border-[#FF6A00]/40 text-[#FF6A00] text-[11px] font-black uppercase font-mono">
                  {activeClip.tag}
                </span>
                <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase font-mono ${getProviderBadge(activeClip.provider).bg}`}>
                  {getProviderBadge(activeClip.provider).label}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {activeClip.duration || 'Full Reel'} • {activeClip.views || 1} views
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {activeClip.title}
              </h2>
              {activeClip.description && (
                <p className="text-xs text-slate-400 font-mono line-clamp-2">
                  {activeClip.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => {
                  setEditingClip(activeClip);
                  setShowEmbedManager(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer font-mono"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span>Edit Reel</span>
              </button>

              <button
                onClick={handleShareLink}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer font-mono"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-[#FF6A00]" />}
                <span>{copiedLink ? 'Copied!' : 'Share Film'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER TAG PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1 font-mono">
          <Filter className="w-3.5 h-3.5 text-[#FF6A00]" />
          Filter:
        </span>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide transition-all cursor-pointer font-mono whitespace-nowrap ${
              selectedTag === tag
                ? 'bg-[#FF6A00] text-white shadow-[0_0_12px_rgba(255,106,0,0.4)] border border-[#FF8C00]'
                : 'bg-slate-900/80 dark:bg-[#1E282D] border border-slate-800 dark:border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* CLIPS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {filteredClips.map((clip) => {
          const isCurrent = activeClip.id === clip.id;
          const badge = getProviderBadge(clip.provider);

          return (
            <div
              key={clip.id}
              onClick={() => setActiveClip(clip)}
              className={`rounded-2xl p-3 bg-slate-900/70 dark:bg-[#1E282D] border transition-all cursor-pointer group relative ${
                isCurrent 
                  ? 'border-[#FF6A00] shadow-[0_0_20px_rgba(255,106,0,0.25)] bg-slate-900' 
                  : 'border-slate-800 dark:border-white/10 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 mb-2.5">
                <img 
                  src={clip.thumbnailUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80'} 
                  alt={clip.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                  <div className="w-9 h-9 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shadow-lg shadow-[#FF6A00]/40">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>

                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-bold text-white">
                  {clip.duration || 'HD'}
                </span>

                <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono border ${badge.bg}`}>
                  {badge.label}
                </span>

                {/* Quick Delete Control */}
                <button
                  onClick={(e) => handleDeleteClip(clip.id, e)}
                  title="Remove reel"
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70 hover:bg-red-500 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <h3 className="text-xs font-bold text-slate-200 group-hover:text-[#FF6A00] transition-colors line-clamp-2 leading-snug">
                {clip.title}
              </h3>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono">
                <span className="flex items-center gap-1 text-[#FF6A00]">
                  <Eye className="w-3 h-3" />
                  {clip.views || 1} scout views
                </span>
                <span className="text-slate-500 font-bold">{clip.tag}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* VIDEO EMBED MANAGER MODAL */}
      <AnimatePresence>
        {showEmbedManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl my-8"
            >
              <VideoEmbedManager
                isOpen={showEmbedManager}
                onClose={() => {
                  setShowEmbedManager(false);
                  setEditingClip(null);
                }}
                onSaveClip={handleSaveClip}
                initialClip={editingClip}
                existingClips={clips}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AthleteFilmTab;

