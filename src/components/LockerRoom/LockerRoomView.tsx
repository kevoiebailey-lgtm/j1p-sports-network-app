import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc,
  arrayUnion, 
  arrayRemove,
  Timestamp 
} from 'firebase/firestore';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  FileText, 
  Send, 
  Trash2, 
  Sparkles, 
  Flame, 
  ArrowLeft, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Loader2,
  User,
  Plus,
  Upload,
  X,
  Maximize2
} from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAuthRole, normalizeRole } from '../../hooks/useAuthRole';
import { useToast } from '../../context/ToastContext';
import { AuthModal } from '../Auth/AuthModal';
import { uploadDirectImage, isValidImageFile } from '../../services/mediaUploadService';
import { UniversalVideoPlayer } from '../Common/UniversalVideoPlayer';
import { notificationService } from '../../services/notificationService';
import { triggerGuestActionGate } from '../Auth/GuestActionGateModal';
import { GraphicsPromoBanner } from '../PlayCard/GraphicsPromoBanner';
import { GraphicStudioModal } from '../PlayCard/GraphicStudioModal';

export interface UnifiedLockerPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  sport?: string;
  content: string;
  mediaUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType: 'text' | 'image' | 'video';
  likes?: string[];
  commentsCount?: number;
  createdAt?: any;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt?: any;
}

export const LockerRoomView: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { role } = useAuthRole();
  const canonicalRole = normalizeRole(role);
  const { showToast } = useToast();

  const [posts, setPosts] = useState<UnifiedLockerPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  
  // Publisher Form State
  const [content, setContent] = useState('');
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video'>('text');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [sportTag, setSportTag] = useState(profile?.sport || 'Basketball');
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Lightbox State for Image Posts
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Active Expanded Comments Drawer / Modal
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, PostComment[]>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Guest Auth Trigger
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Futuristic Athlete Graphic Studio Modal
  const [isGraphicStudioOpen, setIsGraphicStudioOpen] = useState(false);

  useEffect(() => {
    const handleOpenStudio = () => setIsGraphicStudioOpen(true);
    window.addEventListener('app:open-graphic-studio', handleOpenStudio);
    return () => window.removeEventListener('app:open-graphic-studio', handleOpenStudio);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = user || auth.currentUser;

  // Real-time Feed Listener (onSnapshot)
  useEffect(() => {
    if (!db) {
      setLoadingPosts(false);
      return;
    }

    setLoadingPosts(true);
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const livePosts = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let likesArr: string[] = [];
          if (Array.isArray(data.likes)) {
            likesArr = data.likes;
          } else if (data.reactions && typeof data.reactions === 'object') {
            likesArr = Object.keys(data.userReactions || {});
          }

          let mType: 'text' | 'image' | 'video' = data.mediaType || 'text';
          if (!data.mediaType) {
            if (data.videoUrl || data.feedType === 'video') mType = 'video';
            else if (data.imageUrl || data.feedType === 'lounge') mType = 'image';
          }

          const resolvedImageUrl = data.imageUrl || (mType === 'image' ? data.mediaUrl : '');
          const resolvedVideoUrl = data.videoUrl || (mType === 'video' ? data.mediaUrl : '');
          const resolvedMediaUrl = data.mediaUrl || resolvedImageUrl || resolvedVideoUrl || '';
          const resolvedContent = data.content || data.caption || '';

          return {
            id: docSnap.id,
            authorId: data.authorId || '',
            authorName: data.authorName || 'Athlete Member',
            authorAvatar: data.authorAvatar || data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            authorRole: data.authorRole || 'athlete',
            sport: data.sport || 'Sports',
            content: resolvedContent,
            mediaUrl: resolvedMediaUrl,
            imageUrl: resolvedImageUrl,
            videoUrl: resolvedVideoUrl,
            mediaType: mType,
            likes: likesArr,
            commentsCount: data.commentsCount || 0,
            createdAt: data.createdAt
          } as UnifiedLockerPost;
        });

        setPosts(livePosts);
        setLoadingPosts(false);
      },
      (error) => {
        console.error('Error fetching live posts from Firestore:', error);
        setLoadingPosts(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Comments Subcollection Listener for expanded post
  useEffect(() => {
    if (!expandedCommentsPostId || !db) return;

    const commentsQuery = query(
      collection(db, 'posts', expandedCommentsPostId, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const liveComments = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as PostComment[];

        setCommentsMap((prev) => ({
          ...prev,
          [expandedCommentsPostId]: liveComments
        }));
      },
      (err) => {
        console.warn('Comments snapshot notice:', err);
      }
    );

    return () => unsubscribe();
  }, [expandedCommentsPostId]);

  // Image Selection Handler (Direct File)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      showToast('error', 'Invalid File Type', 'Please choose a JPEG, PNG, or WebP photo.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Social Wall photos must be under 5MB.');
      return;
    }

    setSelectedImageFile(file);
    const preview = URL.createObjectURL(file);
    setSelectedImagePreview(preview);
    setMediaType('image');
  };

  const handleClearImageFile = () => {
    setSelectedImageFile(null);
    setSelectedImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (mediaType === 'image') setMediaType('text');
  };

  // Publisher Handler
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !selectedImageFile && !videoUrlInput.trim()) {
      showToast('error', 'Content Required', 'Please enter text, upload an image, or provide a video link.');
      return;
    }

    if (!currentUser) {
      triggerGuestActionGate('Create a Post', 'Locker Room Feed');
      return;
    }

    setPublishing(true);
    setUploadProgress(10);

    try {
      const displayName = profile?.displayName || currentUser.displayName || 'Athlete Member';
      const avatarUrl = profile?.avatarUrl || currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
      const userRole = profile?.role || 'athlete';

      let finalImageUrl = '';
      let finalVideoUrl = '';
      let finalMediaType = mediaType;

      // 1. Direct Image File Upload to Firebase Storage with resilient fallback
      if (selectedImageFile) {
        try {
          finalImageUrl = await uploadDirectImage(selectedImageFile, 'social_wall', {
            onProgress: (p) => setUploadProgress(p),
            allowFallback: true
          });
          finalMediaType = 'image';
        } catch (uploadErr: any) {
          console.warn('Storage direct upload note, using local preview fallback:', uploadErr);
          finalImageUrl = selectedImagePreview || '';
          finalMediaType = 'image';
        }
      } else if (mediaType === 'video' && videoUrlInput.trim()) {
        finalVideoUrl = videoUrlInput.trim();
        finalMediaType = 'video';
      }

      const newDoc = await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        authorName: displayName,
        authorAvatar: avatarUrl,
        authorRole: userRole,
        sport: sportTag,
        content: content.trim(),
        mediaUrl: finalImageUrl || finalVideoUrl || '',
        imageUrl: finalImageUrl || '',
        videoUrl: finalVideoUrl || '',
        mediaType: finalMediaType,
        likes: [],
        commentsCount: 0,
        createdAt: serverTimestamp()
      });

      // Automatically notify any @mentioned users via FCM Push and in-app alerts
      if (newDoc && newDoc.id) {
        notificationService.extractMentionsAndNotify({
          text: content.trim(),
          senderUid: currentUser.uid,
          senderName: displayName,
          senderAvatar: avatarUrl,
          postId: newDoc.id,
          isComment: false
        }).catch((err) => console.warn('Mention alert notice:', err));
      }

      setContent('');
      setSelectedImageFile(null);
      setSelectedImagePreview(null);
      setVideoUrlInput('');
      setMediaType('text');
      if (fileInputRef.current) fileInputRef.current.value = '';

      showToast('success', 'Post Published', 'Your update is now live on the Locker Room feed!');
    } catch (err: any) {
      console.error('Error creating post in Firestore:', err);
      showToast('error', 'Failed to Post', err.message || 'Could not publish your post.');
    } finally {
      setPublishing(false);
      setUploadProgress(0);
    }
  };

  // Like Toggle Handler using arrayUnion & arrayRemove
  const handleToggleLike = async (postId: string, currentLikes: string[] = []) => {
    if (!currentUser) {
      triggerGuestActionGate('Like & React to Highlights', 'Locker Room Feed');
      return;
    }

    const postRef = doc(db, 'posts', postId);
    const hasLiked = currentLikes.includes(currentUser.uid);

    // Optimistic local update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLikes = hasLiked
          ? (p.likes || []).filter((uid) => uid !== currentUser.uid)
          : [...(p.likes || []), currentUser.uid];
        return { ...p, likes: nextLikes };
      })
    );

    try {
      await updateDoc(postRef, {
        likes: hasLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });

      if (!hasLiked) {
        const targetPost = posts.find((p) => p.id === postId);
        if (targetPost && targetPost.authorId && targetPost.authorId !== currentUser.uid) {
          notificationService.sendLikeAlert({
            recipientUid: targetPost.authorId,
            senderUid: currentUser.uid,
            senderName: profile?.displayName || currentUser.displayName || 'Athlete Member',
            senderAvatar: profile?.avatarUrl || currentUser.photoURL || undefined,
            postId,
            postTitle: targetPost.content?.slice(0, 40)
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // Delete Post Handler
  const handleDeletePost = async (postId: string, authorId: string) => {
    if (!currentUser) return;
    const isSuperAdmin = canonicalRole === 'admin' || currentUser.email === 'kevoiebailey@gmail.com';
    if (authorId !== currentUser.uid && !isSuperAdmin) {
      showToast('error', 'Unauthorized', 'You can only delete your own posts.');
      return;
    }

    if (!window.confirm('Are you sure you want to permanently delete this post?')) return;

    try {
      await deleteDoc(doc(db, 'posts', postId));
      showToast('success', 'Post Deleted', 'Your post was removed from the feed.');
    } catch (err: any) {
      console.error('Error deleting post:', err);
      showToast('error', 'Delete Failed', err.message || 'Could not delete post.');
    }
  };

  // Add Comment Handler
  const handleAddComment = async (postId: string) => {
    if (!newCommentText.trim()) return;
    if (!currentUser) {
      triggerGuestActionGate('Comment on Highlights', 'Locker Room Feed');
      return;
    }

    setSubmittingComment(true);
    try {
      const displayName = profile?.displayName || currentUser.displayName || 'Member';
      const avatarUrl = profile?.avatarUrl || currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

      await addDoc(collection(db, 'posts', postId, 'comments'), {
        postId,
        authorId: currentUser.uid,
        authorName: displayName,
        authorAvatar: avatarUrl,
        content: newCommentText.trim(),
        createdAt: serverTimestamp()
      });

      // Update parent comment count
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: (posts.find((p) => p.id === postId)?.commentsCount || 0) + 1
      }).catch(() => {});

      setNewCommentText('');
    } catch (err: any) {
      console.error('Error adding comment:', err);
      showToast('error', 'Comment Error', 'Failed to publish comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Share post link helper
  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/locker-room#${postId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('success', 'Link Copied', 'Post link copied to your clipboard!');
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
    return 'Just now';
  };

  return (
    <div className="w-full min-h-screen bg-[#090D16] text-[#F4F4F4] font-sans pb-40">
      
      {/* Top Header Bar */}
      <div className="border-b border-[#24324F] bg-[#090D16]/90 backdrop-blur-md sticky top-0 z-20 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/dashboard/${canonicalRole}`)}
              className="p-2 rounded-xl bg-[#1A2234] hover:bg-[#24324F] border border-[#24324F] text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-[#00B8D4]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black uppercase tracking-wider text-white">
                  The Wall
                </h1>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00F0D0]/15 border border-[#00F0D0]/40 text-[#00F0D0] text-[10px] font-bold uppercase tracking-wider font-mono shadow-[0_0_10px_rgba(0,240,208,0.2)]">
                  <Flame className="w-3 h-3 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Locker Room Social Feed • Member highlights & scouting film
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Post Action Trigger Pinned at Top-Right of Wall Header */}
            <button
              id="wall-header-quick-post-btn"
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('app:open-quick-post'));
              }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-[#00F0D0] hover:bg-[#00d8b8] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,240,208,0.4)] transition-all active:scale-[0.97] cursor-pointer font-mono"
              title="Open Quick Post Composer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden xs:inline">Quick Post</span>
              <span className="xs:hidden">Post</span>
            </button>

            {!currentUser && (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] text-white text-xs font-bold shadow-md hover:brightness-110 transition-all cursor-pointer font-mono"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-6 space-y-6">

        {/* Futuristic Athlete Graphic & Play Card Studio Promo Banner */}
        <GraphicsPromoBanner onOpenStudio={() => setIsGraphicStudioOpen(true)} />

        {/* 1. Publisher Form with Direct Upload Pipeline */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={profile?.avatarUrl || currentUser?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt="Your avatar"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-[#24324F]"
            />
            <div>
              <span className="text-sm font-bold text-white block">
                {profile?.displayName || currentUser?.displayName || 'Post an Update'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentUser ? `Sharing as ${profile?.role || 'athlete'}` : 'Guest Preview Mode'}
              </span>
            </div>
          </div>

          <form onSubmit={handleCreatePost} className="space-y-3">
            <textarea
              id="post-content-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening on the court, field, or recruiting trail? Share stats, highlights, or announcements..."
              rows={3}
              className="w-full bg-[#27272a]/80 focus:bg-[#27272a] border border-[#3f3f46] focus:border-[#00B8D4] text-white placeholder-slate-400 rounded-xl p-3 text-sm focus:outline-none transition-all resize-none"
            />

            {/* Hidden Direct File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageFileChange}
              className="hidden"
            />

            {/* Image Preview Banner */}
            {selectedImagePreview && (
              <div className="relative rounded-xl overflow-hidden border border-[#00B8D4]/40 bg-black/60 p-2 flex items-center gap-3">
                <img
                  src={selectedImagePreview}
                  alt="Selected upload"
                  className="w-16 h-16 rounded-lg object-cover border border-slate-700"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white font-mono truncate">
                    {selectedImageFile?.name}
                  </p>
                  <p className="text-[11px] text-[#00B8D4] font-mono">
                    Direct local upload to Firebase Storage (&lt; 5MB)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearImageFile}
                  className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 hover:text-white transition-colors cursor-pointer"
                  title="Remove Image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Media Type Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 bg-[#27272a] p-1 rounded-xl border border-[#3f3f46]">
                <button
                  type="button"
                  onClick={() => {
                    setMediaType('text');
                    handleClearImageFile();
                    setVideoUrlInput('');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mediaType === 'text'
                      ? 'bg-[#00B8D4] text-[#090D16] font-bold shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Text</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMediaType('image');
                    setVideoUrlInput('');
                    fileInputRef.current?.click();
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mediaType === 'image'
                      ? 'bg-[#00B8D4] text-[#090D16] font-bold shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Direct Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMediaType('video');
                    handleClearImageFile();
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mediaType === 'video'
                      ? 'bg-[#FF6A00] text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <VideoIcon className="w-3.5 h-3.5" />
                  <span>Video Link</span>
                </button>
              </div>

              {/* Video URL Input */}
              {mediaType === 'video' && (
                <div className="flex-1 relative">
                  <input
                    id="post-video-url-input"
                    type="url"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="Paste video URL (YouTube, Hudl, TikTok, Vimeo, Instagram, MP4)"
                    className="w-full bg-[#27272a] border border-[#3f3f46] focus:border-[#FF6A00] text-white placeholder-slate-400 rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-all font-mono"
                  />
                </div>
              )}
            </div>

            {/* Upload Progress Bar */}
            {publishing && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-300">
                  <span>Uploading to Firebase Storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00B8D4] transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Sport Tag Selector and Submit */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#27272a]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">Sport:</span>
                <select
                  value={sportTag}
                  onChange={(e) => setSportTag(e.target.value)}
                  className="bg-[#27272a] border border-[#3f3f46] text-xs text-slate-200 rounded-lg px-2 py-1 font-mono focus:outline-none"
                >
                  <option value="Basketball">🏀 Basketball</option>
                  <option value="Football">🏈 Football</option>
                  <option value="Girls Flag Football">⚡ Girls Flag Football</option>
                  <option value="Baseball">⚾ Baseball</option>
                  <option value="Softball">🥎 Softball</option>
                  <option value="Soccer">⚽ Soccer</option>
                  <option value="Track & Field">🏃 Track & Field</option>
                  <option value="Volleyball">🏐 Volleyball</option>
                  <option value="General">🏆 General Sports</option>
                </select>
              </div>

              <button
                id="post-submit-btn"
                type="submit"
                disabled={publishing}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50 font-mono shrink-0 ml-auto xs:ml-0"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Post to Feed</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 2. Real-time Feed Stream */}
        {loadingPosts ? (
          <div className="space-y-4 py-8">
            <div className="p-8 rounded-2xl bg-[#18181b] border border-[#27272a] flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#00B8D4] animate-spin" />
              <p className="text-xs font-mono text-slate-400">Connecting to real-time Locker Room feed...</p>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#18181b] border border-[#27272a] text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#27272a] flex items-center justify-center text-[#FF6A00]">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black uppercase tracking-wider text-white">
              The Locker Room Feed is Ready
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Be the first athlete, coach, or fan to post a game highlight, photo, or status update!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const isLiked = currentUser ? post.likes?.includes(currentUser.uid) : false;
              const isAuthor = currentUser?.uid === post.authorId;
              const isSuperAdmin = canonicalRole === 'admin' || currentUser?.email === 'kevoiebailey@gmail.com';
              const canDelete = isAuthor || isSuperAdmin;
              const comments = commentsMap[post.id] || [];
              
              const imageSrc = post.imageUrl || (post.mediaType === 'image' ? post.mediaUrl : '');
              const videoSrc = post.videoUrl || (post.mediaType === 'video' ? post.mediaUrl : '');

              return (
                <article
                  key={post.id}
                  id={`post-${post.id}`}
                  className="bg-[#18181b] rounded-2xl border border-[#27272a] hover:border-[#3f3f46] p-4 sm:p-5 space-y-3.5 transition-all shadow-lg"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={post.authorName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-[#27272a] shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 
                            className="text-sm font-bold text-white hover:text-[#00B8D4] transition-colors cursor-pointer"
                            onClick={() => post.authorId && navigate(`/profile/${post.authorId}`)}
                          >
                            {post.authorName}
                          </h4>
                          {post.authorRole && (
                            <span className="px-1.5 py-0.2 rounded bg-[#00B8D4]/10 border border-[#00B8D4]/30 text-[#00B8D4] text-[9px] font-mono font-bold uppercase">
                              {post.authorRole}
                            </span>
                          )}
                          {post.sport && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px] font-mono">
                              {post.sport}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block">
                          {formatTimestamp(post.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Delete button for author/admin */}
                    {canDelete && (
                      <button
                        onClick={() => handleDeletePost(post.id, post.authorId)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Post Text Content */}
                  {post.content && (
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>
                  )}

                  {/* Post Image Media with Lightbox Trigger */}
                  {imageSrc && (
                    <div 
                      onClick={() => setLightboxImageUrl(imageSrc)}
                      className="group relative rounded-xl overflow-hidden border border-[#27272a] bg-black max-h-[500px] flex items-center justify-center cursor-pointer shadow-md"
                    >
                      <img
                        src={imageSrc}
                        alt="Post media attachment"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto max-h-[500px] object-cover group-hover:scale-[1.01] transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-mono flex items-center gap-1.5 border border-white/20">
                          <Maximize2 className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>View Full Photo</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Post Video Media with UniversalVideoPlayer */}
                  {videoSrc && (
                    <div className="pt-1 w-full overflow-hidden">
                      <UniversalVideoPlayer 
                        videoUrl={videoSrc}
                        title={`${post.authorName}'s Highlight`}
                      />
                    </div>
                  )}

                  {/* Post Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#27272a] text-xs font-mono">
                    <div className="flex items-center gap-4">
                      {/* Like Button */}
                      <button
                        onClick={() => handleToggleLike(post.id, post.likes)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                          isLiked
                            ? 'bg-rose-950/40 border border-rose-500/40 text-rose-400'
                            : 'bg-[#27272a]/60 hover:bg-[#27272a] text-slate-300 hover:text-white'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400'
                          }`}
                        />
                        <span>{post.likes?.length || 0}</span>
                      </button>

                      {/* Comment Button */}
                      <button
                        onClick={() =>
                          setExpandedCommentsPostId((prev) => (prev === post.id ? null : post.id))
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#27272a]/60 hover:bg-[#27272a] text-slate-300 hover:text-white transition-all cursor-pointer font-bold"
                      >
                        <MessageCircle className="w-4 h-4 text-slate-400" />
                        <span>{comments.length > 0 ? comments.length : post.commentsCount || 0}</span>
                      </button>
                    </div>

                    {/* Share Post */}
                    <button
                      onClick={() => handleShare(post.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#00B8D4] hover:bg-[#27272a] transition-all cursor-pointer"
                      title="Share Post Link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expandable Comments Drawer */}
                  {expandedCommentsPostId === post.id && (
                    <div className="pt-3 border-t border-[#27272a] space-y-3">
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {comments.length === 0 ? (
                          <p className="text-[11px] text-slate-400 font-mono text-center py-2">
                            No comments yet. Start the conversation!
                          </p>
                        ) : (
                          comments.map((cmt) => (
                            <div
                              key={cmt.id}
                              className="p-2.5 rounded-xl bg-[#27272a]/50 border border-[#3f3f46]/40 flex items-start gap-2.5 text-xs"
                            >
                              <img
                                src={cmt.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                alt={cmt.authorName}
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white text-[11px]">
                                    {cmt.authorName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {formatTimestamp(cmt.createdAt)}
                                  </span>
                                </div>
                                <p className="text-slate-300 text-xs mt-0.5">{cmt.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Comment Field */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                          placeholder="Write a comment..."
                          className="flex-1 bg-[#27272a] border border-[#3f3f46] focus:border-[#00B8D4] text-white placeholder-slate-400 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={submittingComment || !newCommentText.trim()}
                          className="px-3 py-1.5 rounded-xl bg-[#00B8D4] hover:bg-[#00a0b8] text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-40 transition-all font-mono"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}

                </article>
              );
            })}
          </div>
        )}

      </div>

      {/* Full Resolution Image Lightbox */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
        >
          <button
            onClick={() => setLightboxImageUrl(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-white hover:text-black transition-colors z-10 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center"
          >
            <img
              src={lightboxImageUrl}
              alt="Full size preview"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
            />
            <div className="mt-3">
              <a
                href={lightboxImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#141B2D] border border-[#24324F] text-[#00B8D4] text-xs font-mono flex items-center gap-1.5 shadow"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Guest Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Futuristic Athlete Graphic Studio Modal */}
      <GraphicStudioModal
        isOpen={isGraphicStudioOpen}
        onClose={() => setIsGraphicStudioOpen(false)}
      />

    </div>
  );
};

export default LockerRoomView;
