import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Video, 
  MessageSquare, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Sparkles, 
  Flame, 
  Check, 
  Loader2,
  Tv,
  Trophy,
  X,
  Plus,
  BarChart2,
  Upload,
  Play
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { parseVideoUrl, getVideoProviderBadge, getVideoProviderName } from '../../lib/videoParser';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../../lib/firebase';
import { uploadToMediaVault } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { LockerPost } from './types';

interface LockerFeedComposerProps {
  currentTab: 'hype' | 'chill';
  selectedSportCategory: string;
  onPostCreated?: (createdPost?: LockerPost) => void;
  onRequireAuth: () => void;
}

type ComposerMode = 'video' | 'photo' | 'link' | 'poll';

const SPORTS_OPTIONS = [
  'Football',
  'Basketball',
  'Soccer',
  'Track & Field',
  'Cheer',
  'Volleyball',
  'Baseball',
  'Lacrosse'
];

const QUICK_TEMPLATES = [
  {
    label: '⚡ 360 Windmill Dunk',
    caption: 'Official 360 Windmill Dunk + 42.0" Laser Vertical Test at the Midwest Regional Showcase! Class of 2026 PG holding 4 D1 offers. Locked in for state playoffs! ⚡️🏀',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-4043-large.mp4',
    sport: 'Basketball',
    mode: 'video' as ComposerMode
  },
  {
    label: '🏈 65-yd Hail Mary TD',
    caption: 'Game-winning 65-yard Hail Mary touchdown with 0:02 left on the clock! Laser 40-yd dash tested at 4.38s during national combine. Recruiting film open for coaches.',
    videoUrl: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
    sport: 'Football',
    mode: 'video' as ComposerMode
  },
  {
    label: '⏱️ 4.38s Laser 40-yd PR',
    caption: 'Official PR update: Dropped my laser-timed 40-yard dash to 4.38s at today\'s regional combine! Grateful for my trainers and coaches. #RecruitMe',
    imageUrl: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=1200',
    sport: 'Track & Field',
    mode: 'photo' as ComposerMode
  },
  {
    label: '💬 Post-Game Reaction',
    caption: 'Double Overtime thriller was one of the most intense battles of the season! How is everyone rating the new court setup and laser timing gates? 🏆💬',
    sport: 'Basketball',
    mode: 'link' as ComposerMode
  }
];

export const LockerFeedComposer: React.FC<LockerFeedComposerProps> = ({
  currentTab,
  selectedSportCategory,
  onPostCreated,
  onRequireAuth
}) => {
  const { user, profile, role } = useAuth();
  const { showToast } = useToast();
  const isAdmin = Boolean(
    profile?.role === 'admin' || 
    user?.email === 'kevoiebailey@gmail.com' || 
    (user as any)?.role === 'admin' || 
    role === 'admin'
  );

  const [activeMode, setActiveMode] = useState<ComposerMode>(currentTab === 'hype' ? 'video' : 'photo');
  const [caption, setCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [sport, setSport] = useState(
    selectedSportCategory && selectedSportCategory !== 'All' 
      ? selectedSportCategory.replace(/[^\w\s&]/gi, '').trim() 
      : 'Basketball'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const parsedVideo = videoUrl ? parseVideoUrl(videoUrl) : null;
  const providerBadge = parsedVideo ? getVideoProviderBadge(parsedVideo.provider) : null;

  const handleInteractionAttempt = () => {
    if (!user) {
      onRequireAuth();
      return false;
    }
    return true;
  };

  const handleApplyTemplate = (tmpl: typeof QUICK_TEMPLATES[0]) => {
    setCaption(tmpl.caption);
    setSport(tmpl.sport);
    setActiveMode(tmpl.mode);
    if (tmpl.videoUrl) setVideoUrl(tmpl.videoUrl);
    if (tmpl.imageUrl) setImageUrl(tmpl.imageUrl);
    setSelectedFile(null);
    setIsExpanded(true);
    showToast('info', 'Template Applied', `Loaded "${tmpl.label}" into composer.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Please select a photo or clip under 50MB.');
      return;
    }

    if (file.type.startsWith('video/')) {
      setSelectedFile(file);
      const blobUrl = URL.createObjectURL(file);
      setVideoUrl(blobUrl);
      setActiveMode('video');
      setIsExpanded(true);
      showToast('success', 'Video Attached', 'Video clip attached and ready to post!');
      return;
    }

    if (file.type.startsWith('image/')) {
      setSelectedFile(file);
      const blobUrl = URL.createObjectURL(file);
      setImageUrl(blobUrl);
      setActiveMode('photo');
      setIsExpanded(true);
      showToast('success', 'Photo Attached', 'Photo graphic attached and ready to post!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInteractionAttempt()) return;

    const trimmedCaption = caption.trim();
    let currentVideoUrl = videoUrl.trim();
    let currentImageUrl = imageUrl.trim();

    if (!trimmedCaption && !currentVideoUrl && !currentImageUrl && !linkUrl.trim() && !selectedFile) {
      showToast('error', 'Empty Post', 'Please add a play description, photo, or highlight link.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload native file to media_vault folder if selected
      if (selectedFile) {
        try {
          const isVid = selectedFile.type.startsWith('video/');
          const uploadedStorageUrl = await uploadToMediaVault(selectedFile, isVid ? 'videos' : 'photos');
          if (uploadedStorageUrl) {
            if (isVid) {
              currentVideoUrl = uploadedStorageUrl;
            } else {
              currentImageUrl = uploadedStorageUrl;
            }
          }
        } catch (uploadErr: any) {
          console.warn('Storage upload notice (falling back to data preview):', uploadErr);
        }
      }

      const authorName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Verified Athlete';
      const authorAvatar = profile?.avatarUrl || user?.photoURL || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80';
      const authorRole = (profile?.role as string) || (role as string) || 'athlete';

      const feedType = (currentVideoUrl || activeMode === 'video' || currentTab === 'hype') ? 'video' : 'lounge';

      const newPostData: any = {
        feedType,
        sport,
        caption: trimmedCaption || (activeMode === 'video' ? 'Game Action Reel' : 'Sports Update'),
        authorId: user!.uid,
        authorName,
        authorAvatar,
        authorRole: authorRole as any,
        authorSport: sport,
        authorSchool: (profile as any)?.school || (profile as any)?.team || 'Varsity Select',
        authorClassYear: '2026',
        isVerifiedRecruit: authorRole === 'athlete',
        reactions: {
          hype: 1,
          sauce: 0,
          clutch: 0,
          bigW: 0
        },
        userReactions: {
          [user!.uid]: 'hype'
        },
        commentsCount: 0,
        createdAt: new Date().toISOString()
      };

      if (currentVideoUrl) newPostData.videoUrl = currentVideoUrl;
      if (currentImageUrl) newPostData.imageUrl = currentImageUrl;
      if (authorRole === 'athlete') {
        newPostData.metrics = {
          fortyYard: '4.42s',
          vertical: '38.0"',
          gpa: '3.85',
          height: "6'2\"",
          weight: '190 lbs',
          verified: true
        };
      }

      // 2. Push to Firestore posts collection
      const postsRef = collection(db, 'posts');
      const docRef = await addDoc(postsRef, sanitizeFirestorePayload({
        ...newPostData,
        createdAt: serverTimestamp()
      }));

      // 3. Index into media_vault if media attached
      const finalMediaUrl = currentVideoUrl || currentImageUrl;
      if (finalMediaUrl) {
        try {
          await addDoc(collection(db, 'media_vault'), sanitizeFirestorePayload({
            title: trimmedCaption || (feedType === 'video' ? 'Game Reel' : 'Sports Photo'),
            originalUrl: finalMediaUrl,
            previewUrl: finalMediaUrl,
            mediaType: feedType === 'video' ? 'video' : 'image',
            sport,
            category: feedType === 'video' ? 'Game Film' : 'Game Action',
            creatorId: user!.uid,
            creatorName: authorName,
            creatorRole: authorRole,
            sourcePostId: docRef.id,
            createdAt: serverTimestamp()
          }));
        } catch (vErr) {
          console.warn('Media vault sync notice:', vErr);
        }
      }

      // 4. Dispatch FCM Push & In-App Notifications for any @mentioned members
      if (docRef && docRef.id && trimmedCaption) {
        notificationService.extractMentionsAndNotify({
          text: trimmedCaption,
          senderUid: user!.uid,
          senderName: authorName,
          senderAvatar: authorAvatar,
          postId: docRef.id,
          isComment: false
        }).catch((err) => console.warn('Mention alert notice:', err));
      }

      const completePost: LockerPost = {
        id: docRef.id,
        ...newPostData
      };

      // Reset form
      setCaption('');
      setVideoUrl('');
      setImageUrl('');
      setLinkUrl('');
      setSelectedFile(null);
      setIsExpanded(false);
      
      showToast('success', '⚡ Post Published', 'Your highlight is live in the Locker Room!');
      if (onPostCreated) onPostCreated(completePost);
    } catch (err: any) {
      console.error('Error creating post:', err);
      const friendlyMessage = err?.code === 'permission-denied'
        ? 'Permission denied: Please ensure you are logged in to publish.'
        : err?.message || 'Failed to publish post to feed.';
      showToast('error', 'Publish Failed', friendlyMessage);
      
      // Fallback for resilient UI display
      const fallbackPost: LockerPost = {
        id: `local-${Date.now()}`,
        feedType: videoUrl ? 'video' : 'lounge',
        sport,
        caption: caption.trim() || 'Highlight reel',
        videoUrl: videoUrl.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        authorId: user?.uid || 'athlete-local',
        authorName: profile?.displayName || 'Verified Athlete',
        authorAvatar: profile?.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
        authorRole: 'athlete',
        isVerifiedRecruit: true,
        reactions: { hype: 1, sauce: 0, clutch: 0, bigW: 0 },
        commentsCount: 0,
        createdAt: new Date().toISOString()
      };
      if (onPostCreated) onPostCreated(fallbackPost);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#263238] border border-[#24324F] rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 text-white">
      
      {/* Top Title Bar & Sport Selector */}
      <div className="flex items-center justify-between gap-2 border-b border-[#24324F] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00B8D4] to-[#00F5D4] p-[1.5px] shadow-[0_0_12px_rgba(0,184,212,0.3)]">
            <div className="w-full h-full bg-[#090D16] rounded-[10px] flex items-center justify-center text-sm">
              ⚡
            </div>
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#F4F4F4] font-mono">
              Locker Room Creator
            </span>
            <p className="text-[11px] text-slate-400">
              Post game action reels, verified combine metrics, and match updates.
            </p>
          </div>
        </div>

        {/* Sport Dropdown */}
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-black/60 border border-[#24324F] text-xs font-bold text-[#00B8D4] font-mono outline-none focus:border-[#00B8D4] cursor-pointer"
        >
          {SPORTS_OPTIONS.map((s) => (
            <option key={s} value={s} className="bg-[#090D16] text-white">
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Quick 1-Click Test Templates */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
          Quick Highlights & Play Presets:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyTemplate(tmpl)}
              className="min-h-[48px] px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-[#00B8D4]/20 border border-slate-700 hover:border-[#00B8D4]/60 text-slate-200 hover:text-[#00B8D4] text-xs font-bold font-mono whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>{tmpl.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Composer Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        
        {/* Caption Text Area */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onFocus={() => {
            if (handleInteractionAttempt()) setIsExpanded(true);
          }}
          placeholder={
            activeMode === 'video'
              ? "Describe this play, matchup score, or scout recruiting update..."
              : "What's happening in your court, game reaction, or recruiting discussion?"
          }
          rows={isExpanded ? 3 : 2}
          className="w-full p-3.5 rounded-2xl bg-black/60 border border-[#24324F] text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#00B8D4] focus:ring-1 focus:ring-[#00B8D4] transition-all resize-none font-sans"
        />

        {/* Media Selector Tabs */}
        <div className="flex items-center gap-2 border-b border-[#24324F] pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveMode('video'); setIsExpanded(true); }}
            className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer ${
              activeMode === 'video' 
                ? 'bg-[#00B8D4] text-[#090D16] shadow-[0_0_12px_rgba(0,184,212,0.4)] font-black' 
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Video Reel</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveMode('photo'); setIsExpanded(true); }}
            className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer ${
              activeMode === 'photo' 
                ? 'bg-[#00B8D4] text-[#090D16] shadow-[0_0_12px_rgba(0,184,212,0.4)] font-black' 
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Photo / Graphic</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveMode('link'); setIsExpanded(true); }}
            className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer ${
              activeMode === 'link' 
                ? 'bg-[#00B8D4] text-[#090D16] shadow-[0_0_12px_rgba(0,184,212,0.4)] font-black' 
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Web Link</span>
          </button>

          {/* File Upload Label button */}
          <label className="min-h-[48px] px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold font-mono flex items-center gap-2 cursor-pointer transition-all">
            <Upload className="w-4 h-4 text-[#00B8D4]" />
            <span>Upload File</span>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Video Mode Input */}
        {activeMode === 'video' && (
          <div className="space-y-2">
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                <Video className="w-4 h-4 text-[#00B8D4]" />
              </div>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste YouTube, Hudl, TikTok, Instagram Reel or direct MP4 link..."
                className="w-full min-h-[48px] pl-10 pr-24 py-2.5 rounded-2xl bg-black/60 border border-[#24324F] text-xs text-white placeholder-slate-500 outline-none focus:border-[#00B8D4] focus:ring-1 focus:ring-[#00B8D4] font-mono transition-all"
              />
              {providerBadge && (
                <div className="absolute right-2.5">
                  <span className={`px-2 py-1 rounded-lg ${providerBadge.bg} ${providerBadge.text} border ${providerBadge.border} text-[10px] font-black font-mono uppercase tracking-wider flex items-center gap-1`}>
                    <span>{providerBadge.icon}</span>
                    <span className="hidden sm:inline">{getVideoProviderName(parsedVideo!.provider)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Instant Live Player Preview if valid video */}
            {parsedVideo && (
              <div className="rounded-2xl overflow-hidden bg-black border border-[#24324F] p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#00B8D4] font-mono font-bold px-1">
                  <span>🎥 Live Stream Preview Ready</span>
                  <button
                    type="button"
                    onClick={() => setVideoUrl('')}
                    className="min-h-[48px] px-3 text-red-400 hover:text-red-300 cursor-pointer font-bold flex items-center"
                  >
                    Remove Video
                  </button>
                </div>
                <div className="aspect-video max-h-52 w-full rounded-xl overflow-hidden bg-black">
                  {parsedVideo.provider === 'direct' ? (
                    <video src={parsedVideo.embedUrl} controls className="w-full h-full object-contain" />
                  ) : (
                    <iframe
                      src={parsedVideo.embedUrl}
                      title="Preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                      className="w-full h-full border-0"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photo Mode Input */}
        {activeMode === 'photo' && (
          <div className="space-y-2">
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                <ImageIcon className="w-4 h-4 text-[#00B8D4]" />
              </div>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste Image URL or use 'Upload File' above..."
                className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-black/60 border border-[#24324F] text-xs text-white placeholder-slate-500 outline-none focus:border-[#00B8D4] focus:ring-1 focus:ring-[#00B8D4] font-mono transition-all"
              />
            </div>

            {imageUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-[#24324F] bg-black max-h-52 w-full flex items-center justify-center p-2">
                <img src={imageUrl} alt="Preview" className="max-h-48 object-contain rounded-xl" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-3 right-3 min-w-[48px] min-h-[48px] rounded-xl bg-red-600/90 text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition-all"
                  aria-label="Remove image"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Link Mode Input */}
        {activeMode === 'link' && (
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <LinkIcon className="w-4 h-4 text-[#00B8D4]" />
            </div>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Paste article, recruit profile, or stats link..."
              className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-black/60 border border-[#24324F] text-xs text-white placeholder-slate-500 outline-none focus:border-[#00B8D4] focus:ring-1 focus:ring-[#00B8D4] font-mono transition-all"
            />
          </div>
        )}

        {/* Action Controls & Submit Button */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <span>⚡ Formats:</span>
            <span className="text-red-400 font-bold">YouTube</span> • 
            <span className="text-amber-400 font-bold">Hudl</span> • 
            <span className="text-cyan-300 font-bold">TikTok</span> • 
            <span className="text-pink-400 font-bold">Insta</span> • 
            <span className="text-emerald-400 font-bold">MP4</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,184,212,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#090D16]" />
            ) : (
              <>
                <Send className="w-4 h-4 text-[#090D16]" />
                <span>Post Highlight</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
