import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  doc, 
  query, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { AdminVideoUploader } from './AdminVideoUploader';
import { SportSelector } from '../Common/SportSelector';
import { getSportEmoji } from '../../lib/sports';
import { 
  Film, 
  Video, 
  Play, 
  Plus, 
  Trash2, 
  Pin, 
  CheckCircle2, 
  Search, 
  Filter, 
  Eye, 
  Sparkles, 
  X, 
  ExternalLink, 
  Clock, 
  User, 
  Tag,
  AlertCircle,
  Loader2,
  Edit3,
  Image as ImageIcon,
  Save
} from 'lucide-react';

export interface VideoVaultItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  sport: string;
  category?: string;
  duration?: string;
  athleteId?: string;
  athleteName?: string;
  isPinned?: boolean;
  viewsCount?: number;
  uploadedBy?: string;
  createdAt: string;
  description?: string;
}

export const AdminVideoManagerPage: React.FC = () => {
  const { profile } = useAuth();

  const [videos, setVideos] = useState<VideoVaultItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sportFilter, setSportFilter] = useState<string>('all');
  
  // Modals & Upload State
  const [showAddEmbedModal, setShowAddEmbedModal] = useState<boolean>(false);
  const [showRawUploader, setShowRawUploader] = useState<boolean>(false);
  const [previewVideo, setPreviewVideo] = useState<VideoVaultItem | null>(null);

  // Edit Video Modal State
  const [editingVideo, setEditingVideo] = useState<VideoVaultItem | null>(null);
  const [editVideoForm, setEditVideoForm] = useState({
    title: '',
    videoUrl: '',
    thumbnailUrl: '',
    sport: 'Basketball',
    category: 'Game Highlights',
    duration: '02:30',
    athleteName: '',
    description: '',
    isPinned: false
  });
  const [isUpdatingVideo, setIsUpdatingVideo] = useState<boolean>(false);

  // New Embed Form State
  const [newEmbedForm, setNewEmbedForm] = useState({
    title: '',
    videoUrl: '',
    thumbnailUrl: '',
    sport: 'Basketball',
    category: 'Game Highlights',
    duration: '02:30',
    athleteName: '',
    description: '',
    isPinned: false
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync videos with Firestore
  const fetchVideos = async () => {
    setLoading(true);
    try {
      if (!db) {
        setVideos([]);
        return;
      }
      const snap = await getDocs(query(collection(db, 'videos'), limit(50)));
      if (!snap.empty) {
        const list: VideoVaultItem[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as VideoVaultItem);
        });
        setVideos(list);
      } else {
        setVideos([]);
      }
    } catch (e) {
      console.warn('Firestore video fetch note:', e);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Action: Toggle Pin/Spotlight
  const handleTogglePin = async (vid: VideoVaultItem) => {
    const nextPin = !vid.isPinned;
    try {
      if (db) {
        try {
          await updateDoc(doc(db, 'videos', vid.id), { isPinned: nextPin });
        } catch (e) {
          console.warn('Firestore pin update fallback:', e);
        }
      }
      setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, isPinned: nextPin } : v));
      showToast(nextPin ? `Spotlighted "${vid.title}" to Top Feed` : `Unpinned "${vid.title}"`);
    } catch (err) {
      console.error('Toggle pin error:', err);
    }
  };

  // Action: Open Edit Video Modal
  const openEditVideo = (vid: VideoVaultItem) => {
    setEditingVideo(vid);
    setEditVideoForm({
      title: vid.title || '',
      videoUrl: vid.videoUrl || '',
      thumbnailUrl: vid.thumbnailUrl || '',
      sport: vid.sport || 'Basketball',
      category: vid.category || 'Game Highlights',
      duration: vid.duration || '02:30',
      athleteName: vid.athleteName || '',
      description: vid.description || '',
      isPinned: !!vid.isPinned
    });
  };

  // Action: Save Video Edit to Firebase
  const handleSaveVideoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;

    setIsUpdatingVideo(true);
    try {
      const updatedData: Partial<VideoVaultItem> = {
        title: editVideoForm.title.trim(),
        videoUrl: editVideoForm.videoUrl.trim(),
        thumbnailUrl: editVideoForm.thumbnailUrl.trim(),
        sport: editVideoForm.sport,
        category: editVideoForm.category,
        duration: editVideoForm.duration.trim() || '02:00',
        athleteName: editVideoForm.athleteName.trim() || 'Featured Athlete',
        description: editVideoForm.description.trim() || '',
        isPinned: editVideoForm.isPinned
      };

      if (db) {
        await updateDoc(doc(db, 'videos', editingVideo.id), updatedData);
      }

      setVideos(prev => prev.map(v => v.id === editingVideo.id ? { ...v, ...updatedData } : v));
      showToast(`Updated video & thumbnail for "${editVideoForm.title}"`);
      setEditingVideo(null);
    } catch (err: any) {
      console.error('Update video error:', err);
      showToast(`Failed to update video: ${err?.message || 'Error'}`);
    } finally {
      setIsUpdatingVideo(false);
    }
  };

  // Action: Delete Video
  const handleDeleteVideo = async (vid: VideoVaultItem) => {
    if (!confirm(`Are you sure you want to permanently delete "${vid.title}"?`)) return;
    try {
      if (db) {
        try {
          await deleteDoc(doc(db, 'videos', vid.id));
        } catch (e) {
          console.warn('Firestore delete fallback:', e);
        }
      }
      setVideos(prev => prev.filter(v => v.id !== vid.id));
      showToast(`Deleted video reel "${vid.title}"`);
    } catch (err) {
      console.error('Delete video error:', err);
    }
  };

  // Action: Create Video via Embed or Direct URL
  const handleCreateEmbedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmbedForm.title || !newEmbedForm.videoUrl) return;

    try {
      const newVidId = `vid-${Date.now()}`;
      const newObj: VideoVaultItem = {
        id: newVidId,
        title: newEmbedForm.title.trim(),
        videoUrl: newEmbedForm.videoUrl.trim(),
        thumbnailUrl: newEmbedForm.thumbnailUrl.trim() || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80',
        sport: newEmbedForm.sport,
        category: newEmbedForm.category,
        duration: newEmbedForm.duration || '02:00',
        athleteName: newEmbedForm.athleteName.trim() || 'Featured Athlete',
        description: newEmbedForm.description.trim() || 'Official Just1Play Video Highlight',
        isPinned: newEmbedForm.isPinned,
        viewsCount: 0,
        uploadedBy: profile?.displayName || 'Super Admin',
        createdAt: new Date().toISOString()
      };

      if (db) {
        try {
          await addDoc(collection(db, 'videos'), newObj);
        } catch (e) {
          console.warn('Firestore video add note:', e);
        }
      }

      setVideos(prev => [newObj, ...prev]);
      showToast(`Added video reel "${newObj.title}"`);
      setShowAddEmbedModal(false);
      setNewEmbedForm({
        title: '',
        videoUrl: '',
        thumbnailUrl: '',
        sport: 'Basketball',
        category: 'Game Highlights',
        duration: '02:30',
        athleteName: '',
        description: '',
        isPinned: false
      });
    } catch (err) {
      console.error('Add video error:', err);
      showToast('Error adding video.');
    }
  };

  const filteredVideos = videos.filter(v => {
    const matchesSearch = 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.athleteName && v.athleteName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSport = sportFilter === 'all' || v.sport.toLowerCase() === sportFilter.toLowerCase();

    return matchesSearch && matchesSport;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 p-4 rounded-2xl bg-black/90 border border-[#00F2FE] text-white shadow-[0_0_30px_rgba(0,242,254,0.3)] backdrop-blur-2xl flex items-center gap-3 animate-bounceIn">
          <CheckCircle2 className="w-5 h-5 text-[#00F2FE]" />
          <span className="text-xs font-bold font-sans uppercase">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] text-xs font-mono font-bold uppercase tracking-widest mb-2">
            <Film className="w-3.5 h-3.5" />
            <span>Video Broadcast & Reel Vault</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-white font-sans tracking-tight">
            VIDEO REELS & <span className="text-[#00F2FE]">MEDIA UPLOADER</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage 4K raw game tape, YouTube / Vimeo highlights, athlete reels, and pinned video broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowRawUploader(!showRawUploader)}
            className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
          >
            <Video className="w-4 h-4 text-[#00F2FE]" />
            <span>{showRawUploader ? 'Hide Storage Uploader' : 'Raw 4K Video Uploader'}</span>
          </button>

          <button
            onClick={() => setShowAddEmbedModal(true)}
            className="px-5 py-3 rounded-2xl bg-[#00F2FE] hover:bg-[#00F2FE]/90 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Video Reel / Embed</span>
          </button>
        </div>
      </div>

      {/* Raw 4K Storage Uploader Dropzone */}
      {showRawUploader && (
        <div className="animate-fadeIn">
          <AdminVideoUploader onUploadSuccess={() => fetchVideos()} />
        </div>
      )}

      {/* Search and Sport Filter */}
      <div className="p-4 rounded-2xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search videos by title, sport, or athlete..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          <select
            value={sportFilter}
            onChange={e => setSportFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-bold uppercase cursor-pointer focus:outline-none focus:border-[#00F2FE]"
          >
            <option value="all" className="bg-[#212A31]">All Sports</option>
            <option value="basketball" className="bg-[#212A31]">Basketball</option>
            <option value="football" className="bg-[#212A31]">Football</option>
            <option value="flag football" className="bg-[#212A31]">Flag Football</option>
            <option value="soccer" className="bg-[#212A31]">Soccer</option>
            <option value="track & field" className="bg-[#212A31]">Track & Field</option>
          </select>
        </div>
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-xs flex justify-center items-center gap-2">
          <Loader2 className="w-6 h-6 text-[#00F2FE] animate-spin" />
          <span>Syncing Video Vault from Firestore...</span>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="p-12 text-center text-slate-400 font-mono text-xs rounded-3xl bg-[#212A31]/90 border border-white/10">
          No video records found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map(vid => (
            <div 
              key={vid.id} 
              className="rounded-3xl bg-[#212A31]/90 border border-white/10 overflow-hidden group hover:border-[#00F2FE]/50 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail / Player Preview */}
                <div 
                  className="relative h-48 w-full bg-slate-900 overflow-hidden cursor-pointer"
                  onClick={() => setPreviewVideo(vid)}
                >
                  <img 
                    src={vid.thumbnailUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80'} 
                    alt={vid.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <div className="p-3.5 rounded-full bg-[#00F2FE] text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.6)] group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current" />
                    </div>
                  </div>

                  {/* Badges Overlay */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[#00F2FE] border border-[#00F2FE]/30 text-[9px] font-mono font-bold uppercase">
                      {getSportEmoji(vid.sport)} {vid.sport}
                    </span>
                    {vid.isPinned && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/80 text-black text-[9px] font-mono font-black uppercase flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" />
                        PINNED
                      </span>
                    )}
                  </div>

                  {vid.duration && (
                    <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/80 text-white font-mono text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{vid.duration}</span>
                    </div>
                  )}
                </div>

                {/* Video Meta Info */}
                <div className="p-5 space-y-2.5">
                  <h3 className="font-bold text-white text-sm font-sans line-clamp-2 uppercase italic tracking-tight">
                    {vid.title}
                  </h3>

                  {vid.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {vid.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-slate-300">
                      <User className="w-3 h-3 text-[#00F2FE]" />
                      <span>{vid.athleteName || 'Just1Play Athlete'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-slate-500" />
                      <span>{vid.viewsCount || 0} views</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTogglePin(vid)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all border ${
                    vid.isPinned 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>{vid.isPinned ? 'Unpin' : 'Spotlight'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditVideo(vid)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-[#00F2FE] cursor-pointer"
                    title="Edit Video & Thumbnail"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setPreviewVideo(vid)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                    title="Watch Video"
                  >
                    <Play className="w-3.5 h-3.5 text-[#00F2FE]" />
                  </button>

                  <button
                    onClick={() => handleDeleteVideo(vid)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 cursor-pointer"
                    title="Delete Video"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* POPUP VIDEO PREVIEW PLAYER MODAL */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-4xl rounded-3xl bg-[#212A31] border border-white/20 overflow-hidden shadow-2xl space-y-4 p-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-black uppercase text-white italic">
                  {previewVideo.title}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {previewVideo.sport} • {previewVideo.athleteName || 'Athlete Highlight'}
                </p>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
              <video
                src={previewVideo.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Direct Link: {previewVideo.videoUrl.substring(0, 45)}...</span>
              <a
                href={previewVideo.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#00F2FE] hover:underline flex items-center gap-1 font-bold"
              >
                <span>Open in New Window</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>
        </div>
      )}

      {/* ADD EMBED / VIDEO REEL MODAL */}
      {showAddEmbedModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <form 
            onSubmit={handleCreateEmbedSubmit} 
            className="w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-[#212A31] border border-white/15 shadow-2xl space-y-4 my-8 text-white"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black italic uppercase text-white font-sans">
                    ADD VIDEO REEL / EMBED
                  </h3>
                  <p className="text-xs text-slate-400">
                    Publish MP4 cloud streams, YouTube highlights, or scouting game film.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEmbedModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Video Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Combine 4K 40-Yard Dash Highlights"
                  value={newEmbedForm.title}
                  onChange={e => setNewEmbedForm({ ...newEmbedForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00F2FE]"
                />
              </div>

              <div>
                <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Video Stream URL (MP4, HLS, or Embed) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://...mp4 or YouTube embed"
                  value={newEmbedForm.videoUrl}
                  onChange={e => setNewEmbedForm({ ...newEmbedForm, videoUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00F2FE] font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SportSelector
                    label="Sport"
                    value={newEmbedForm.sport}
                    onChange={sp => setNewEmbedForm({ ...newEmbedForm, sport: sp })}
                    allowCustom={true}
                  />
                </div>

                <div>
                  <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Athlete Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Marcus Carter"
                    value={newEmbedForm.athleteName}
                    onChange={e => setNewEmbedForm({ ...newEmbedForm, athleteName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Thumbnail Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={newEmbedForm.thumbnailUrl}
                    onChange={e => setNewEmbedForm({ ...newEmbedForm, thumbnailUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00F2FE] font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Duration Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. 02:45"
                    value={newEmbedForm.duration}
                    onChange={e => setNewEmbedForm({ ...newEmbedForm, duration: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00F2FE] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Description & Scouting Notes</label>
                <textarea
                  rows={2}
                  placeholder="Scouting commentary, combine metrics, or game quarter notes..."
                  value={newEmbedForm.description}
                  onChange={e => setNewEmbedForm({ ...newEmbedForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00F2FE]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pin-video-check"
                  checked={newEmbedForm.isPinned}
                  onChange={e => setNewEmbedForm({ ...newEmbedForm, isPinned: e.target.checked })}
                  className="rounded border-white/20 bg-white/5 text-[#00F2FE] focus:ring-[#00F2FE] cursor-pointer"
                />
                <label htmlFor="pin-video-check" className="text-xs text-slate-300 font-medium cursor-pointer flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pin / Spotlight to the top of Athlete & Scout Video Feed</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddEmbedModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-slate-300 font-bold text-xs uppercase hover:bg-white/20 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-[#00F2FE] text-slate-950 font-black text-xs uppercase hover:bg-[#00F2FE]/90 shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Film className="w-4 h-4" />
                <span>Publish Video</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT VIDEO & THUMBNAIL MODAL */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <form 
            onSubmit={handleSaveVideoEdit}
            className="w-full max-w-xl rounded-3xl bg-[#212A31] border border-slate-700 overflow-hidden shadow-2xl p-6 sm:p-8 space-y-5 text-white"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white tracking-wide">
                    Edit Video & Thumbnail
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Update video URL, cover thumbnail, or scouting notes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Video Title *</label>
                <input
                  type="text"
                  required
                  value={editVideoForm.title}
                  onChange={e => setEditVideoForm({ ...editVideoForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F2FE]"
                />
              </div>

              <div>
                <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Video Stream URL *</label>
                <input
                  type="url"
                  required
                  value={editVideoForm.videoUrl}
                  onChange={e => setEditVideoForm({ ...editVideoForm, videoUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F2FE] font-mono"
                />
              </div>

              {/* Thumbnail URL Section with Add / Edit / Delete */}
              <div>
                <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">
                  Thumbnail Image URL (Add / Edit / Delete)
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://... cover thumbnail image URL"
                      value={editVideoForm.thumbnailUrl}
                      onChange={e => setEditVideoForm({ ...editVideoForm, thumbnailUrl: e.target.value })}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F2FE] font-mono text-[11px]"
                    />
                    {editVideoForm.thumbnailUrl && (
                      <button
                        type="button"
                        onClick={() => setEditVideoForm({ ...editVideoForm, thumbnailUrl: '' })}
                        className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold transition-colors cursor-pointer"
                        title="Delete / Clear thumbnail"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {editVideoForm.thumbnailUrl ? (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <img
                        src={editVideoForm.thumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-14 h-14 object-cover rounded-lg border border-white/10"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="text-[11px] text-slate-400 truncate">
                        <span className="text-emerald-400 font-bold">✓ Active Video Thumbnail</span>
                        <p className="truncate">{editVideoForm.thumbnailUrl}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      No thumbnail configured. A sport placeholder will be used automatically.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SportSelector
                    label="Sport"
                    value={editVideoForm.sport}
                    onChange={sp => setEditVideoForm({ ...editVideoForm, sport: sp })}
                    allowCustom={true}
                  />
                </div>

                <div>
                  <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Athlete Name</label>
                  <input
                    type="text"
                    value={editVideoForm.athleteName}
                    onChange={e => setEditVideoForm({ ...editVideoForm, athleteName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Category</label>
                  <select
                    value={editVideoForm.category}
                    onChange={e => setEditVideoForm({ ...editVideoForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F2FE]"
                  >
                    <option value="Game Highlights">Game Highlights</option>
                    <option value="Combine Drill">Combine Drill</option>
                    <option value="Interview">Interview</option>
                    <option value="Scouting Reel">Scouting Reel</option>
                    <option value="Championship">Championship</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Duration</label>
                  <input
                    type="text"
                    value={editVideoForm.duration}
                    onChange={e => setEditVideoForm({ ...editVideoForm, duration: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F2FE] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Description</label>
                <textarea
                  rows={2}
                  value={editVideoForm.description}
                  onChange={e => setEditVideoForm({ ...editVideoForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F2FE]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-pin-video-check"
                  checked={editVideoForm.isPinned}
                  onChange={e => setEditVideoForm({ ...editVideoForm, isPinned: e.target.checked })}
                  className="rounded border-white/20 bg-white/5 text-[#00F2FE] focus:ring-[#00F2FE] cursor-pointer"
                />
                <label htmlFor="edit-pin-video-check" className="text-xs text-slate-300 font-medium cursor-pointer flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Spotlight / Pin to top</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  if (editingVideo) {
                    handleDeleteVideo(editingVideo);
                    setEditingVideo(null);
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Video</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingVideo}
                  className="px-6 py-2.5 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-black text-xs uppercase flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.4)]"
                >
                  {isUpdatingVideo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
