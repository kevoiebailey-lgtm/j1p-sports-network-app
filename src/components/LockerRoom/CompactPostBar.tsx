import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Video, 
  Sparkles, 
  Send, 
  X, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Upload, 
  Loader2, 
  Trophy, 
  Check, 
  Flame, 
  Zap, 
  Play,
  FileVideo,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { parseVideoUrl, getVideoProviderBadge, getVideoProviderName } from '../../lib/videoParser';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../../lib/firebase';
import { uploadToMediaVault } from '../../services/storageService';
import { LockerPost, EXPANDED_SPORT_CATEGORIES } from './types';

interface CompactPostBarProps {
  onPostCreated?: (createdPost?: LockerPost) => void;
  onRequireAuth: (actionDescription?: string) => void;
  defaultSport?: string;
}

const MAX_CAPTION_CHARS = 500;

export const CompactPostBar: React.FC<CompactPostBarProps> = ({
  onPostCreated,
  onRequireAuth,
  defaultSport
}) => {
  const { user, profile, role } = useAuth();
  const { showToast } = useToast();
  const isAdmin = Boolean(
    profile?.role === 'admin' || 
    user?.email === 'kevoiebailey@gmail.com' || 
    (user as any)?.role === 'admin' || 
    role === 'admin'
  );

  const [isOpen, setIsOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'photo' | 'none'>('video');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>(
    defaultSport && defaultSport !== 'All' 
      ? defaultSport 
      : '🏀 Basketball'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Optional laser metrics
  const [showMetrics, setShowMetrics] = useState(false);
  const [fortyYard, setFortyYard] = useState('');
  const [verticalLeap, setVerticalLeap] = useState('');
  const [gpa, setGpa] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const parsedVideo = mediaUrl ? parseVideoUrl(mediaUrl) : null;
  const providerBadge = parsedVideo ? getVideoProviderBadge(parsedVideo.provider) : null;

  const handleOpenModal = (initialMediaType: 'video' | 'photo' = 'video') => {
    if (!user) {
      onRequireAuth('drop your game clip, photo, or hype');
      return;
    }
    setMediaType(initialMediaType);
    setIsOpen(true);
    window.dispatchEvent(new CustomEvent('app:hide-dock'));
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('app:show-dock'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 50MB for uploads)
    if (file.size > 50 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Please select a photo or clip under 50MB.');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const isPhoto = file.type.startsWith('image/');

    if (isVideo) {
      setSelectedFile(file);
      setMediaType('video');
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setMediaUrl(result);
        showToast('success', 'Video Attached', `${file.name} ready to publish!`);
      };
      reader.onerror = () => {
        showToast('error', 'Read Failed', 'Could not read video file from device.');
      };
      reader.readAsDataURL(file);
      return;
    }

    if (isPhoto) {
      setSelectedFile(file);
      setMediaType('photo');
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setMediaUrl(result);
        showToast('success', 'Photo Attached', `${file.name} ready to publish!`);
      };
      reader.onerror = () => {
        showToast('error', 'Read Failed', 'Could not read media file from device.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth('publish locker room posts');
      return;
    }

    const trimmedCaption = caption.trim();
    let trimmedMedia = mediaUrl.trim();

    if (!trimmedCaption && !trimmedMedia && !selectedFile) {
      showToast('error', 'Post Incomplete', 'Please provide a caption, video clip, or photo.');
      return;
    }

    setIsSubmitting(true);

    try {
      const isVideo = mediaType === 'video' || Boolean(parsedVideo);
      const isPhoto = mediaType === 'photo' && !isVideo;

      // 1. Upload to Firebase Storage if a native File was selected
      if (selectedFile) {
        try {
          const uploadedUrl = await uploadToMediaVault(
            selectedFile,
            isVideo ? 'videos' : 'photos'
          );
          if (uploadedUrl) {
            trimmedMedia = uploadedUrl;
          }
        } catch (uploadErr: any) {
          console.warn('Storage upload notice (falling back to direct media data):', uploadErr);
        }
      }

      const authorName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Athlete';
      const authorAvatar = profile?.avatarUrl || user.photoURL || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80';
      const cleanSport = selectedSport.replace(/^[^\w\s&]+/, '').trim() || 'Basketball';

      const postData: any = {
        feedType: isVideo ? 'video' : 'lounge',
        sport: cleanSport,
        caption: trimmedCaption || (isVideo ? 'Game Film Reel' : 'Action Photo'),
        authorId: user.uid,
        authorName,
        authorAvatar,
        authorRole: role || profile?.role || 'athlete',
        authorSport: cleanSport,
        authorSchool: (profile as any)?.school || (profile as any)?.organization || '',
        authorClassYear: (profile as any)?.classYear || '',
        isVerifiedRecruit: Boolean((profile as any)?.verified || (profile as any)?.isVerified || role === 'athlete'),
        reactions: {
          hype: 1,
          sauce: 0,
          clutch: 0,
          bigW: 0
        },
        userReactions: {
          [user.uid]: 'hype'
        },
        commentsCount: 0,
        createdAt: serverTimestamp()
      };

      if (isVideo && trimmedMedia) {
        postData.videoUrl = trimmedMedia;
      }
      if (isPhoto && trimmedMedia) {
        postData.imageUrl = trimmedMedia;
      }

      if (fortyYard.trim() || verticalLeap.trim() || gpa.trim()) {
        const metricsObj: any = { verified: true };
        if (fortyYard.trim()) metricsObj.fortyYard = `${fortyYard.trim().replace(/s$/i, '')}s`;
        if (verticalLeap.trim()) metricsObj.vertical = `${verticalLeap.trim().replace(/"$/i, '')}"`;
        if (gpa.trim()) metricsObj.gpa = gpa.trim();
        postData.metrics = metricsObj;
      }

      const docRef = await addDoc(collection(db, 'posts'), sanitizeFirestorePayload(postData));

      // 2. Dual-index media into media_vault collection for cross-app discovery
      if (trimmedMedia) {
        try {
          await addDoc(collection(db, 'media_vault'), sanitizeFirestorePayload({
            title: trimmedCaption || (isVideo ? 'Game Film Clip' : 'Action Shot'),
            originalUrl: trimmedMedia,
            previewUrl: trimmedMedia,
            mediaType: isVideo ? 'video' : 'image',
            sport: cleanSport,
            category: isVideo ? 'Game Film' : 'Game Action',
            creatorId: user.uid,
            creatorName: authorName,
            creatorRole: role || profile?.role || 'athlete',
            sourcePostId: docRef.id,
            createdAt: serverTimestamp()
          }));
        } catch (vaultErr) {
          console.warn('Vault indexing notice:', vaultErr);
        }
      }

      const optimisticPost: LockerPost = {
        ...postData,
        id: docRef.id,
        createdAt: new Date().toISOString()
      };

      if (onPostCreated) {
        onPostCreated(optimisticPost);
      }

      showToast('success', '⚡ Post Dropped!', 'Your game clip & hype are live in the Locker Room!');

      // Reset state & close modal
      setCaption('');
      setMediaUrl('');
      setSelectedFile(null);
      setFortyYard('');
      setVerticalLeap('');
      setGpa('');
      setShowMetrics(false);
      handleCloseModal();
    } catch (err: any) {
      console.error('Error posting to Locker Room:', err);
      const friendlyMessage = err?.code === 'permission-denied'
        ? 'Permission denied: Please ensure you are logged in to post.'
        : err?.message || 'Could not drop post. Please try again.';
      showToast('error', 'Submission Failed', friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAvatar = profile?.avatarUrl || user?.photoURL || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80';

  return (
    <>
      {/* 1. Sleek 56px Trigger Bar */}
      <div 
        id="locker-room-compact-composer-bar"
        className="w-full h-14 bg-[#263238] border border-[#24324F] hover:border-[#00B8D4]/60 rounded-2xl p-2 sm:px-3.5 flex items-center justify-between gap-3 shadow-lg transition-all duration-200 group cursor-pointer"
        onClick={() => handleOpenModal('video')}
      >
        {/* User Avatar + Placeholder Input trigger */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <img
            src={currentAvatar}
            alt={profile?.displayName || 'User avatar'}
            className="w-9 h-9 rounded-xl object-cover border border-slate-600 group-hover:border-[#00B8D4] shrink-0 transition-colors"
          />
          <div className="flex-1 truncate text-xs sm:text-sm text-slate-400 group-hover:text-slate-200 font-medium select-none">
            Drop your game clip, photo, or hype...
          </div>
        </div>

        {/* Quick-action trigger icons */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleOpenModal('photo')}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-[#00B8D4]/20 border border-white/10 hover:border-[#00B8D4]/50 text-[#00B8D4] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
            title="Add Photo"
            aria-label="Upload Photo"
          >
            <Camera className="w-5 h-5 text-[#00B8D4]" />
          </button>

          <button
            type="button"
            onClick={() => handleOpenModal('video')}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-[#FF6A00]/20 border border-white/10 hover:border-[#FF6A00]/50 text-[#FF6A00] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
            title="Add Video Reel"
            aria-label="Upload Video Reel"
          >
            <Video className="w-5 h-5 text-[#FF6A00]" />
          </button>
        </div>
      </div>

      {/* 2. Obsidian Bottom-Sheet Modal (z-[80] with full screen clearance) */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#090D16]/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-[#090D16] border border-[#24324F] sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] max-h-[92dvh] overflow-y-auto text-white flex flex-col pb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Header Bar */}
              <div className="sticky top-0 z-20 bg-[#090D16]/95 backdrop-blur-xl border-b border-[#24324F] px-4 sm:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6A00] to-[#00B8D4] flex items-center justify-center shadow-[0_0_15px_rgba(255,106,0,0.4)]">
                    <Zap className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-[#F4F4F4] tracking-tight uppercase">
                      Create Locker Room Post
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Broadcast to athletes, scouts & fans
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-xl bg-[#263238] hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body with generous bottom padding for mobile clearance */}
              <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 pb-28 sm:pb-8 space-y-4 flex-1">
                
                {/* User Header & Tagline */}
                <div className="flex items-center gap-3">
                  <img
                    src={currentAvatar}
                    alt={profile?.displayName || 'User'}
                    className="w-10 h-10 rounded-2xl object-cover border border-[#00B8D4]/60"
                  />
                  <div>
                    <span className="text-xs font-black text-white block">
                      {profile?.displayName || user?.displayName || 'Active Athlete'}
                    </span>
                    <span className="text-[10px] font-mono text-[#00B8D4] uppercase">
                      {role || 'Recruit'} • Verified Post
                    </span>
                  </div>
                </div>

                {/* Caption / Shoutout Textarea with Character Counter */}
                <div className="space-y-1.5">
                  <div className="relative bg-[#263238] rounded-2xl border border-[#24324F] focus-within:border-[#00B8D4] transition-all p-3">
                    <textarea
                      rows={3}
                      maxLength={MAX_CAPTION_CHARS}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Drop your game clip breakdown, tournament announcement, or shoutout..."
                      className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none resize-none font-medium leading-relaxed"
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-[10px] font-mono text-slate-400">
                      <span>⚡ Keep it hype and authentic</span>
                      <span className={caption.length >= MAX_CAPTION_CHARS ? 'text-[#FF6A00] font-bold' : ''}>
                        {caption.length}/{MAX_CAPTION_CHARS}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Universal Media Input */}
                <div className="bg-[#263238] border border-[#24324F] rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5 font-mono">
                      <FileVideo className="w-3.5 h-3.5 text-[#00B8D4]" />
                      <span>Attach Photo or Video Link</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {providerBadge && (
                        <span className={`px-2 py-0.5 rounded-lg ${providerBadge.bg} ${providerBadge.text} border ${providerBadge.border} text-[10px] font-black font-mono uppercase flex items-center gap-1`}>
                          <span>{providerBadge.icon}</span>
                          <span>{getVideoProviderName(parsedVideo?.provider || 'direct')}</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-[#00B8D4]/15 text-[#00B8D4] border border-[#00B8D4]/40 text-[9px] font-mono font-bold uppercase flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-[#00B8D4]" />
                        <span>All Members: Videos, Photos & Links Allowed</span>
                      </span>
                    </div>
                  </div>

                  {/* Input Box with quick file upload button */}
                  <div className="space-y-2">
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder="Paste YouTube Shorts, Hudl, TikTok, IG Reel, Vimeo, or photo URL..."
                        className="w-full h-10 pl-9 pr-28 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs text-white placeholder-slate-500 font-mono outline-none transition-all"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="px-2 py-1.5 bg-[#00B8D4]/20 hover:bg-[#00B8D4] text-[#00B8D4] hover:text-[#090D16] rounded-lg text-[10px] font-black uppercase font-mono flex items-center gap-1 transition-all cursor-pointer"
                          title="Upload Photo / Graphic"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2 py-1.5 bg-[#FF6A00]/20 hover:bg-[#FF6A00] text-[#FF6A00] hover:text-[#090D16] rounded-lg text-[10px] font-black uppercase font-mono flex items-center gap-1 transition-all cursor-pointer"
                          title="Upload Video Reel / Highlight Clip"
                        >
                          <Video className="w-3 h-3" />
                          <span>Video</span>
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={photoInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="video/*,image/*"
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Real-time media preview badge */}
                  {mediaUrl && (
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 truncate max-w-[80%]">
                        <Check className="w-3.5 h-3.5 text-[#00F5D4] shrink-0" />
                        <span className="truncate text-slate-300 text-[11px]">{selectedFile ? `File: ${selectedFile.name}` : mediaUrl}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMediaUrl('');
                          setSelectedFile(null);
                        }}
                        className="text-slate-400 hover:text-[#FF6A00] text-xs font-bold px-1 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Multi-Sport Tag Selector (Horizontal Scrollable Pill List) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
                    <Trophy className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span>Select Sport Category</span>
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar snap-x">
                    {EXPANDED_SPORT_CATEGORIES.map((sp) => {
                      const isSelected = selectedSport === sp;
                      return (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => setSelectedSport(sp)}
                          className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer select-none snap-start border ${
                            isSelected
                              ? 'bg-[#FF6A00] text-white border-[#FF6A00] shadow-[0_0_12px_rgba(255,106,0,0.4)] font-black'
                              : 'bg-[#263238] border-[#24324F] hover:border-slate-500 text-slate-300 hover:text-white'
                          }`}
                        >
                          {sp}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Laser Metrics Section (Collapsible) */}
                <div className="bg-[#263238]/60 border border-[#24324F] rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMetrics(!showMetrics)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white font-mono uppercase"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#00B8D4]" />
                      <span>Attach Verified Laser Metrics (Optional)</span>
                    </span>
                    {showMetrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showMetrics && (
                    <div className="p-3.5 pt-0 grid grid-cols-3 gap-2.5 border-t border-[#24324F]/60">
                      <div>
                        <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">
                          40-yd Dash
                        </label>
                        <input
                          type="text"
                          value={fortyYard}
                          onChange={(e) => setFortyYard(e.target.value)}
                          placeholder="e.g. 4.38s"
                          className="w-full h-8 px-2 bg-[#090D16] border border-[#24324F] rounded-lg text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-[#00B8D4]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">
                          Vertical Leap
                        </label>
                        <input
                          type="text"
                          value={verticalLeap}
                          onChange={(e) => setVerticalLeap(e.target.value)}
                          placeholder='e.g. 42.0"'
                          className="w-full h-8 px-2 bg-[#090D16] border border-[#24324F] rounded-lg text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-[#00B8D4]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">
                          Academic GPA
                        </label>
                        <input
                          type="text"
                          value={gpa}
                          onChange={(e) => setGpa(e.target.value)}
                          placeholder="e.g. 3.9"
                          className="w-full h-8 px-2 bg-[#090D16] border border-[#24324F] rounded-lg text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-[#00B8D4]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#FF6A00] via-[#FF8C00] to-[#00B8D4] hover:brightness-110 text-white font-black text-sm uppercase tracking-wider font-mono shadow-[0_0_20px_rgba(255,106,0,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Broadcasting Post...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-white" />
                      <span>⚡ Drop Post</span>
                    </>
                  )}
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
