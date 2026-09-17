import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Link2, 
  Tag, 
  Send, 
  Loader2, 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  AlertCircle,
  Users,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAuthRole, normalizeRole } from '../../hooks/useAuthRole';
import { useToast } from '../../context/ToastContext';
import { uploadDirectImage, isValidImageFile } from '../../services/mediaUploadService';
import { detectVideoEmbed, VideoEmbedInfo } from '../../lib/mediaEmbed';
import { triggerHaptic } from '../../lib/haptics';

export interface PostComposerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (postId?: string) => void;
  initialSport?: string;
}

export const PostComposerSheet: React.FC<PostComposerSheetProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialSport = '🏀 Basketball'
}) => {
  const { user, profile } = useAuth();
  const { role } = useAuthRole();
  const canonicalRole = normalizeRole(role);
  const { showToast } = useToast();

  const [content, setContent] = useState('');
  const [sport, setSport] = useState(initialSport);
  const [taggedAthlete, setTaggedAthlete] = useState('');
  const [taggedTeam, setTaggedTeam] = useState('');
  
  // Media states
  const [mediaType, setMediaType] = useState<'none' | 'photo' | 'video'>('none');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [detectedVideo, setDetectedVideo] = useState<VideoEmbedInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check external video provider when URL changes
  useEffect(() => {
    if (!videoUrlInput.trim()) {
      setDetectedVideo(null);
      return;
    }
    const detected = detectVideoEmbed(videoUrlInput.trim());
    setDetectedVideo(detected);
  }, [videoUrlInput]);

  // Clean up object URLs when preview changes
  useEffect(() => {
    return () => {
      if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Reset form when opened or closed
  const resetForm = () => {
    setContent('');
    setSport(initialSport);
    setTaggedAthlete('');
    setTaggedTeam('');
    setMediaType('none');
    setSelectedFile(null);
    if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
    setVideoUrlInput('');
    setDetectedVideo(null);
    setIsUploading(false);
    setUploadProgress(0);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      setError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be under 10MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setMediaType('photo');
    setVideoUrlInput('');
    setDetectedVideo(null);
    const objectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objectUrl);
  };

  const handleClearMedia = () => {
    setSelectedFile(null);
    if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
    setVideoUrlInput('');
    setDetectedVideo(null);
    setMediaType('none');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('error', 'Authentication Required', 'Please sign in to post on The Wall.');
      window.dispatchEvent(new CustomEvent('app:open-auth-modal', { detail: { mode: 'login' } }));
      return;
    }

    if (!content.trim() && !selectedFile && !videoUrlInput.trim()) {
      setError('Please write a caption or attach game media.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
      triggerHaptic('light');

      let uploadedImageUrl = '';
      let uploadedVideoUrl = videoUrlInput.trim();
      let resolvedMediaType: 'text' | 'image' | 'video' = 'text';

      // 1. Upload photo if selected
      if (selectedFile) {
        setIsUploading(true);
        resolvedMediaType = 'image';
        try {
          uploadedImageUrl = await uploadDirectImage(selectedFile, 'social_wall', {
            onProgress: (pct) => setUploadProgress(pct)
          });
        } catch (uploadErr: any) {
          console.error('Failed to upload image:', uploadErr);
          throw new Error(uploadErr?.message || 'Failed to upload photo to media vault.');
        } finally {
          setIsUploading(false);
        }
      } else if (uploadedVideoUrl) {
        resolvedMediaType = 'video';
      }

      // 2. Construct Firestore Post Object
      const authorDisplayName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Athlete Member';
      const authorAvatar = profile?.avatarUrl || user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

      const postPayload: Record<string, any> = {
        authorId: user.uid,
        authorName: authorDisplayName,
        authorAvatar: authorAvatar,
        authorRole: profile?.role || canonicalRole || 'athlete',
        authorSport: sport,
        sport: sport,
        content: content.trim(),
        caption: content.trim(),
        feedType: resolvedMediaType === 'video' ? 'video' : 'lounge',
        mediaType: resolvedMediaType,
        likes: [],
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp()
      };

      if (uploadedImageUrl) {
        postPayload.imageUrl = uploadedImageUrl;
        postPayload.mediaUrl = uploadedImageUrl;
      }

      if (uploadedVideoUrl) {
        postPayload.videoUrl = uploadedVideoUrl;
        postPayload.mediaUrl = uploadedVideoUrl;
      }

      if (taggedAthlete.trim()) {
        postPayload.taggedAthlete = taggedAthlete.trim();
      }

      if (taggedTeam.trim()) {
        postPayload.taggedTeam = taggedTeam.trim();
      }

      const authorSchool = profile?.highSchool || (profile as any)?.school;
      if (authorSchool) {
        postPayload.authorSchool = authorSchool;
      }

      const docRef = await addDoc(collection(db, 'posts'), postPayload);

      showToast('success', 'Post Published!', 'Your highlight is now live on The Wall.');
      triggerHaptic('success');

      handleClose();
      if (onSuccess) {
        onSuccess(docRef.id);
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err?.message || 'Failed to publish post. Please try again.');
      showToast('error', 'Publish Failed', err?.message || 'Failed to publish post.');
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal / Bottom Sheet Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="fixed inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl border-t border-white/10 bg-zinc-950/95 backdrop-blur-2xl p-5 sm:p-6 overflow-y-auto no-scrollbar z-50 sm:max-w-2xl sm:rounded-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border sm:border-white/10 sm:shadow-[0_0_50px_rgba(0,240,208,0.15)] pb-10 sm:pb-6"
        >
          {/* Mobile Top Drag Handle */}
          <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#00F0D0]/15 border border-[#00F0D0]/40 flex items-center justify-center text-[#00F0D0] shadow-[0_0_12px_rgba(0,240,208,0.3)]">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-1.5 font-sans">
                  <span>Post to The Wall</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#00F0D0]/20 text-[#00F0D0] text-[9px] font-mono font-bold tracking-normal">
                    QUICK DISPATCH
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Share game film, photos, and scouting notes with coaches & scouts
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Author Status Bar */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <img
                src={profile?.avatarUrl || user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover border border-[#00F0D0]/40"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {profile?.displayName || user?.displayName || user?.email || 'Anonymous Athlete'}
                </p>
                <p className="text-[10px] text-[#00F0D0] font-mono uppercase tracking-wider">
                  Role: {canonicalRole.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <label htmlFor="post-sheet-content" className="block text-[11px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                Scouting Note / Caption
              </label>
              <textarea
                id="post-sheet-content"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Break down the play, call out a teammate, or share laser combine numbers..."
                className="w-full bg-zinc-900/90 border border-white/10 focus:border-[#00F0D0] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#00F0D0] transition-all resize-none font-sans"
              />
            </div>

            {/* Sport Category Selector & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Sport Selector */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                  Sport
                </label>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 text-white rounded-xl px-2.5 py-2 text-xs font-mono focus:outline-none focus:border-[#00F0D0]"
                >
                  <option value="🏀 Basketball">🏀 Basketball</option>
                  <option value="🏈 Football">🏈 Football</option>
                  <option value="⚡ Girls Flag Football">⚡ Girls Flag Football</option>
                  <option value="⚾ Baseball">⚾ Baseball</option>
                  <option value="🥎 Softball">🥎 Softball</option>
                  <option value="⚽ Soccer">⚽ Soccer</option>
                  <option value="🏃 Track & Field">🏃 Track & Field</option>
                  <option value="🏐 Volleyball">🏐 Volleyball</option>
                  <option value="📣 Cheer & Stunt">📣 Cheer & Stunt</option>
                  <option value="🏆 General Sports">🏆 General Sports</option>
                </select>
              </div>

              {/* Tag Athlete */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                  Tag Athlete
                </label>
                <input
                  type="text"
                  value={taggedAthlete}
                  onChange={(e) => setTaggedAthlete(e.target.value)}
                  placeholder="@athlete name"
                  className="w-full bg-zinc-900 border border-white/10 text-white rounded-xl px-2.5 py-2 text-xs font-mono placeholder-zinc-500 focus:outline-none focus:border-[#00F0D0]"
                />
              </div>

              {/* Tag Team */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                  Tag Team / AAU
                </label>
                <input
                  type="text"
                  value={taggedTeam}
                  onChange={(e) => setTaggedTeam(e.target.value)}
                  placeholder="e.g. West Coast AAU"
                  className="w-full bg-zinc-900 border border-white/10 text-white rounded-xl px-2.5 py-2 text-xs font-mono placeholder-zinc-500 focus:outline-none focus:border-[#00F0D0]"
                />
              </div>
            </div>

            {/* Media Attachment Toggles */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Attach Media
                </span>
                {mediaType !== 'none' && (
                  <button
                    type="button"
                    onClick={handleClearMedia}
                    className="text-[10px] text-zinc-400 hover:text-red-400 font-mono transition-colors cursor-pointer"
                  >
                    Clear Media
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Photo Upload Trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    mediaType === 'photo'
                      ? 'bg-[#00F0D0]/15 border-[#00F0D0] text-[#00F0D0] shadow-[0_0_12px_rgba(0,240,208,0.2)]'
                      : 'bg-zinc-900 border-white/10 text-zinc-300 hover:border-white/20'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Photo / 4K Film</span>
                </button>

                {/* Video Link Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setMediaType('video');
                    if (selectedFile) {
                      setSelectedFile(null);
                      if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(filePreviewUrl);
                      }
                      setFilePreviewUrl(null);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    mediaType === 'video'
                      ? 'bg-[#FF6A00]/15 border-[#FF6A00] text-[#FF6A00] shadow-[0_0_12px_rgba(255,106,0,0.2)]'
                      : 'bg-zinc-900 border-white/10 text-zinc-300 hover:border-white/20'
                  }`}
                >
                  <VideoIcon className="w-4 h-4" />
                  <span>External Video Link</span>
                </button>
              </div>

              {/* Hidden file input for Photo */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {/* Photo Preview Card */}
              {mediaType === 'photo' && filePreviewUrl && (
                <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black/40">
                  <img
                    src={filePreviewUrl}
                    alt="Preview"
                    className="w-full max-h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3">
                    <span className="text-[10px] text-white font-mono bg-black/60 px-2 py-0.5 rounded">
                      {selectedFile?.name} ({(selectedFile ? selectedFile.size / 1024 : 0).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={handleClearMedia}
                      className="p-1 rounded-full bg-red-600/80 hover:bg-red-600 text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Video URL Input Field */}
              {mediaType === 'video' && (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="url"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      placeholder="Paste Hudl, YouTube, TikTok, Vimeo, or Instagram URL"
                      className="w-full bg-zinc-900 border border-white/10 focus:border-[#FF6A00] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all font-mono"
                    />
                    {videoUrlInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setVideoUrlInput('');
                          setDetectedVideo(null);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {detectedVideo && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Detected: {detectedVideo.platform.toUpperCase()} reel</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                  <span>Uploading to Media Vault...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00F0D0] transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-xs font-mono transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {/* Primary High-Visibility Post Button */}
              <button
                id="btn-post-to-the-wall"
                type="submit"
                disabled={submitting || isUploading}
                className="px-6 py-2.5 rounded-xl bg-[#00F0D0] hover:bg-[#00d8b8] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,208,0.4)] active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>POSTING...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>POST TO THE WALL</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PostComposerSheet;
