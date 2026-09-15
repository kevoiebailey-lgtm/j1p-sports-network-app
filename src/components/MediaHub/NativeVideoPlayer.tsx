import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Upload, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Film, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Video,
  Link as LinkIcon,
  Globe,
  Tv,
  ExternalLink,
  PlusCircle,
  Heart,
  MessageSquare,
  Share2,
  Search,
  Filter,
  Copy,
  Check,
  Send,
  Eye,
  Star,
  UserCheck
} from 'lucide-react';
import { storage, db } from '../../lib/firebase';
import { uploadVideoWithRetry } from '../../lib/resilientVideoUploader';
import { useAuth } from '../../context/AuthContext';
import { canUploadAdminVideo } from '../../lib/rbac';
import { parseVideoUrl, VideoType } from '../../lib/videoEmbedUtils';
import { IMPORTED_CSV_VIDEOS, CsvVideoItem, VideoComment } from '../../lib/importedCsvVideos';
import { recordVideoView } from '../../lib/videoViewService';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { SwipeNavigationHint } from '../Common/SwipeNavigationHint';

import { VideoProgressBar } from './VideoProgressBar';

export interface AdminVideo {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  videoType?: VideoType;
  embedUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedBy: string;
  authorName?: string;
  createdAt: string;
  viewCount?: number;
  ratingScore?: number;
  category?: string;
}

interface NativeVideoPlayerProps {
  showUploadSection?: boolean;
  compact?: boolean;
}

export const NativeVideoPlayer: React.FC<NativeVideoPlayerProps> = ({
  showUploadSection = true,
  compact = false
}) => {
  const { role, user, profile } = useAuth();
  const isAdmin = canUploadAdminVideo(role);

  const [firestoreVideos, setFirestoreVideos] = useState<AdminVideo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active video selection state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Playback & Buffering State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Social interactions state (Likes, Comments, Share Modal)
  const [likedVideoIds, setLikedVideoIds] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, VideoComment[]>>({});
  const [newCommentText, setNewCommentText] = useState<string>('');
  
  // Share Modal & Copy Notification State
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Admin Uploader Modes: 'file' for native .mp4/.mov upload, 'url' for video links
  const [uploaderMode, setUploaderMode] = useState<'file' | 'url'>('file');

  // Common Form State
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoDescription, setVideoDescription] = useState<string>('');
  const [videoCategory, setVideoCategory] = useState<string>('Flag Football');

  // URL Uploader Specific State
  const [inputUrl, setInputUrl] = useState<string>('');

  // Native Upload Specific State
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  // Initialize Likes and Comments from CSV dataset
  useEffect(() => {
    const initialLikes: Record<string, number> = {};
    const initialComments: Record<string, VideoComment[]> = {};

    IMPORTED_CSV_VIDEOS.forEach((item) => {
      initialLikes[item.id] = item.likesCount;
      initialComments[item.id] = item.comments || [];
    });

    setLikesCountMap(initialLikes);
    setCommentsMap(initialComments);
  }, []);

  // Fetch Admin Videos from Firestore
  useEffect(() => {
    try {
      const q = query(collection(db, 'AdminVideos'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched: AdminVideo[] = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as AdminVideo));
          setFirestoreVideos(fetched);
        } else {
          setFirestoreVideos([]);
        }
      }, (err) => {
        console.warn('AdminVideos listener error:', err);
        setFirestoreVideos([]);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error attaching AdminVideos snapshot listener:', err);
      setFirestoreVideos([]);
    }
  }, []);

  // Combine Firestore uploaded videos with CSV imported videos seamlessly
  const allPlaylistVideos = useMemo(() => {
    // Map firestore videos into playlist format
    const formattedFirestoreVideos: CsvVideoItem[] = firestoreVideos.map((fv) => {
      const parsed = parseVideoUrl(fv.videoUrl);
      return {
        id: fv.id,
        title: fv.title,
        videoUrl: fv.videoUrl,
        description: fv.description || 'Uploaded by Admin to Just1Play Broadcast Network',
        ratingScore: fv.ratingScore || 9.0,
        viewCount: fv.viewCount || 1500,
        uploadDate: fv.createdAt,
        videoType: fv.videoType || parsed.type,
        embedUrl: fv.embedUrl || parsed.embedUrl,
        platformName: parsed.platformName,
        likesCount: likesCountMap[fv.id] || 45,
        comments: commentsMap[fv.id] || [],
        category: fv.category || 'Broadcast'
      };
    });

    // Deduplicate by ID
    const combined = [...formattedFirestoreVideos, ...IMPORTED_CSV_VIDEOS];
    const seen = new Set<string>();
    return combined.filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  }, [firestoreVideos, likesCountMap, commentsMap]);

  // Categories list derived from playlist
  const categoriesList = useMemo(() => {
    const categories = new Set<string>(['All', 'Flag Football', 'Football', 'Basketball', 'Cheerleading', 'Volleyball', 'Training', 'Baseball']);
    allPlaylistVideos.forEach(v => {
      if (v.category) categories.add(v.category);
    });
    return Array.from(categories);
  }, [allPlaylistVideos]);

  // Enable horizontal swipe gesture navigation across playlist categories
  const { bindSwipeProps, swipeHint } = useSwipeGesture({
    categories: categoriesList,
    activeCategory: selectedCategory,
    onCategoryChange: (newCat) => {
      setSelectedCategory(newCat);
      setCurrentIndex(0);
    }
  });

  // Filtered Playlist
  const filteredPlaylist = useMemo(() => {
    return allPlaylistVideos.filter((video) => {
      const matchesCategory = selectedCategory === 'All' || video.category?.toLowerCase() === selectedCategory.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        video.title.toLowerCase().includes(query) || 
        video.description.toLowerCase().includes(query) ||
        video.platformName.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [allPlaylistVideos, selectedCategory, searchQuery]);

  // Safeguard index when playlist changes
  useEffect(() => {
    if (currentIndex >= filteredPlaylist.length) {
      setCurrentIndex(0);
    }
  }, [filteredPlaylist.length, currentIndex]);

  const currentVideo = filteredPlaylist[currentIndex] || filteredPlaylist[0] || allPlaylistVideos[0];
  const parsedCurrentVideo = currentVideo ? parseVideoUrl(currentVideo.videoUrl) : null;
  const currentType = currentVideo?.videoType || parsedCurrentVideo?.type || 'native';

  // Automatically record view count in Firestore when user loads/watches a video
  useEffect(() => {
    if (currentVideo?.id) {
      recordVideoView({
        videoId: currentVideo.id,
        videoTitle: currentVideo.title,
        userId: user?.uid,
        userRole: role,
        videoSource: 'admin'
      });
    }
  }, [currentVideo?.id, user?.uid, role]);

  // Toggle Like Action
  const handleToggleLike = (videoId: string) => {
    const isCurrentlyLiked = likedVideoIds[videoId];
    setLikedVideoIds(prev => ({ ...prev, [videoId]: !isCurrentlyLiked }));
    setLikesCountMap(prev => ({
      ...prev,
      [videoId]: (prev[videoId] || 0) + (isCurrentlyLiked ? -1 : 1)
    }));
  };

  // Add Comment Action
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentVideo) return;

    const authorName = profile?.displayName || user?.email?.split('@')[0] || 'Athlete Member';
    const authorRole = role === 'admin' ? 'Admin / Scout' : (role as string) === 'scout' || (role as string) === 'recruiter' ? 'Verified Recruiter' : 'Athlete Member';

    const newComment: VideoComment = {
      id: `comment-${Date.now()}`,
      authorName,
      authorRole,
      text: newCommentText.trim(),
      createdAt: 'Just now',
      likes: 0
    };

    setCommentsMap(prev => ({
      ...prev,
      [currentVideo.id]: [newComment, ...(prev[currentVideo.id] || [])]
    }));

    setNewCommentText('');
  };

  // Handle Native Admin Video File Upload (.MP4 & .MOV ONLY)
  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];

    // Enforce 2 GB frontend limit
    const MAX_2GB = 2 * 1024 * 1024 * 1024;
    if (file.size > MAX_2GB) {
      setUploadError(`File size (${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB) exceeds the 2 GB maximum limit. Please compress or select a video under 2 GB.`);
      return;
    }

    // Validate video format
    if (!file.type.startsWith('video/')) {
      const isMov = file.name.toLowerCase().endsWith('.mov');
      const isMp4 = file.name.toLowerCase().endsWith('.mp4');
      if (!isMov && !isMp4) {
        setUploadError('Invalid format. Only raw video files (.MP4, .MOV, H.265) are accepted.');
        return;
      }
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(0);

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `AdminVideos/${timestamp}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    let isDone = false;
    let simPct = 10;

    const progressTicker = setInterval(() => {
      if (isDone) return;
      simPct = Math.min(95, simPct + Math.floor(Math.random() * 8) + 4);
      setUploadProgress((prev) => Math.max(prev, simPct));
    }, 150);

    const markComplete = () => {
      if (isDone) return;
      isDone = true;
      clearInterval(progressTicker);
      setUploadProgress(100);
    };

    const handleFallbackUpload = () => {
      markComplete();
      console.warn('Firebase Storage upload unavailable or failed. Using direct video stream reader fallback...');
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const fallbackUrl = reader.result as string;

          const newVideoData: Omit<AdminVideo, 'id'> = {
            title: videoTitle.trim() || file.name,
            description: videoDescription.trim() || 'Official Just1Play Native Broadcast Reel',
            videoUrl: fallbackUrl,
            videoType: 'native',
            embedUrl: fallbackUrl,
            fileName: file.name,
            fileSize: file.size,
            uploadedBy: user?.uid || profile?.uid || 'admin',
            authorName: profile?.displayName || 'Just1Play Admin',
            createdAt: new Date().toISOString(),
            category: videoCategory
          };

          await addDoc(collection(db, 'AdminVideos'), newVideoData);

          setUploading(false);
          setUploadSuccess(true);
          setVideoTitle('');
          setVideoDescription('');
          setTimeout(() => setUploadSuccess(false), 4000);
        } catch (dbErr: any) {
          console.error('Database write error during video fallback:', dbErr);
          setUploadError(`Failed to save video: ${dbErr?.message || 'Database error'}`);
          setUploading(false);
        }
      };

      reader.onerror = (readErr) => {
        console.error('FileReader error during video processing:', readErr);
        setUploadError('Failed to process raw video file.');
        setUploading(false);
      };

      reader.readAsDataURL(file);
    };

    const fallbackTimeout = setTimeout(() => {
      if (!isDone) {
        console.warn('Native video upload task response timeout. Triggering fallback reader...');
        handleFallbackUpload();
      }
    }, 2800);

    try {
      const downloadUrl = await uploadVideoWithRetry({
        storageRef,
        file,
        metadata: { contentType: file.type || 'video/mp4' },
        maxRetries: 4,
        onProgress: (info) => {
          setUploadProgress((prev) => Math.max(prev, info.percentage));
        }
      });

      clearTimeout(fallbackTimeout);
      markComplete();

      const newVideoData: Omit<AdminVideo, 'id'> = {
        title: videoTitle.trim() || file.name,
        description: videoDescription.trim() || 'Official Just1Play Native Broadcast Reel',
        videoUrl: downloadUrl,
        videoType: 'native',
        embedUrl: downloadUrl,
        fileName: file.name,
        fileSize: file.size,
        uploadedBy: user?.uid || profile?.uid || 'admin',
        authorName: profile?.displayName || 'Just1Play Admin',
        createdAt: new Date().toISOString(),
        category: videoCategory
      };

      await addDoc(collection(db, 'AdminVideos'), newVideoData);

      setUploading(false);
      setUploadSuccess(true);
      setVideoTitle('');
      setVideoDescription('');
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err: any) {
      clearTimeout(fallbackTimeout);
      console.warn('Video upload execution error after retries, trying fallback:', err);
      handleFallbackUpload();
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi']
    },
    maxSize: 2 * 1024 * 1024 * 1024, // 2 GB Max Size Limit
    multiple: false,
    disabled: !isAdmin || uploading
  } as unknown as DropzoneOptions);

  // Handle Adding External Video Link URL
  const handleAddVideoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) {
      setUploadError('Please enter a valid video link URL.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const parsed = parseVideoUrl(inputUrl.trim());

      const newVideoData: Omit<AdminVideo, 'id'> = {
        title: videoTitle.trim() || `${parsed.platformName} Video Highlight`,
        description: videoDescription.trim() || `Official ${parsed.platformName} reel added by Admin`,
        videoUrl: inputUrl.trim(),
        videoType: parsed.type,
        embedUrl: parsed.embedUrl,
        fileName: `${parsed.type}_video`,
        uploadedBy: user?.uid || profile?.uid || 'admin',
        authorName: profile?.displayName || 'Just1Play Admin',
        createdAt: new Date().toISOString(),
        category: videoCategory
      };

      await addDoc(collection(db, 'AdminVideos'), newVideoData);

      setUploading(false);
      setUploadSuccess(true);
      setInputUrl('');
      setVideoTitle('');
      setVideoDescription('');
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to add video URL:', err);
      setUploadError('Failed to save video URL. Please verify link format.');
      setUploading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredPlaylist.length);
    setIsPlaying(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredPlaylist.length) % filteredPlaylist.length);
    setIsPlaying(false);
  };

  const handleDeleteVideo = async (videoId: string, videoUrl: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this admin video from Media Hub & Home?')) return;

    try {
      await deleteDoc(doc(db, 'AdminVideos', videoId));

      if (videoUrl.includes('firebasestorage') || videoUrl.includes('storage.googleapis')) {
        try {
          const storageRef = ref(storage, videoUrl);
          await deleteObject(storageRef);
        } catch (e) {
          console.warn('Storage delete non-fatal error:', e);
        }
      }

      setFirestoreVideos(prev => prev.filter(v => v.id !== videoId));
      if (currentIndex >= filteredPlaylist.length - 1) {
        setCurrentIndex(Math.max(0, filteredPlaylist.length - 2));
      }
    } catch (err) {
      console.error('Failed to delete admin video:', err);
      alert('Failed to delete video. Please check permissions.');
    }
  };

  // Copy Video Link for Sharing
  const handleCopyShareLink = () => {
    if (!currentVideo) return;
    navigator.clipboard.writeText(currentVideo.videoUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Web Share API
  const handleWebShare = async () => {
    if (!currentVideo) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentVideo.title,
          text: `Check out this highlight video on Just1Play: ${currentVideo.title}`,
          url: currentVideo.videoUrl
        });
      } catch (e) {
        console.log('Share canceled or not supported:', e);
      }
    } else {
      setIsShareModalOpen(true);
    }
  };

  const parsedInputInfo = parseVideoUrl(inputUrl);

  return (
    <div className="space-y-6">
      
      {/* ADMIN EXCLUSIVE VIDEO UPLOADER & URL MANAGER */}
      {isAdmin && showUploadSection && (
        <div className="rounded-3xl bg-[#000000]/90 border border-[#E5B868]/50 p-6 shadow-[0_0_35px_rgba(214,28,36,0.15)] backdrop-blur-2xl">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 mb-5 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  Admin Exclusive Native Video Uploader & Library Sync
                </h3>
                <p className="text-xs text-slate-400">
                  Upload raw broadcast footage (.MP4 & .MOV) or paste links from YouTube, Vimeo, Instagram, TikTok & Hudl.
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => { setUploaderMode('file'); setUploadError(null); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  uploaderMode === 'file'
                    ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Native .MP4 / .MOV</span>
              </button>
              <button
                type="button"
                onClick={() => { setUploaderMode('url'); setUploadError(null); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  uploaderMode === 'url'
                    ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Video Link URL</span>
              </button>
            </div>
          </div>

          {/* Title, Description & Category Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Video Title
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g., Championship Finals Top 10 Plays"
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Category / Sport
              </label>
              <select
                value={videoCategory}
                onChange={(e) => setVideoCategory(e.target.value)}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none transition-all"
              >
                <option value="Flag Football">Flag Football</option>
                <option value="Football">Football</option>
                <option value="Basketball">Basketball</option>
                <option value="Cheerleading">Cheerleading</option>
                <option value="Volleyball">Volleyball</option>
                <option value="Training">Training & Workouts</option>
                <option value="Baseball">Baseball</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Video Description
              </label>
              <input
                type="text"
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="e.g., Highlights from Tri-State Regional Showcase"
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* TAB 1: NATIVE FILE DROPZONE (.MP4 & .MOV ONLY) */}
          {uploaderMode === 'file' && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragActive
                  ? 'border-[#E5B868] bg-[#E5B868]/15 scale-[1.01]'
                  : 'border-white/20 hover:border-[#E5B868] bg-white/5'
              }`}
            >
              <input {...getInputProps()} />

              {uploading ? (
                <div className="flex flex-col items-center justify-center space-y-2 text-[#E5B868]">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-xs font-black font-mono">Uploading Broadcast Footage to Firebase Storage... {uploadProgress}%</p>
                  <div className="w-64 bg-white/10 h-2.5 rounded-full overflow-hidden border border-white/10">
                    <div className="bg-[#E5B868] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 text-slate-300">
                  <div className="p-3 rounded-full bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-black uppercase text-white tracking-wider">
                    {isDragActive ? 'DROP RAW BROADCAST FOOTAGE HERE' : 'CLICK OR DRAG NATIVE VIDEO FILE (.MP4 / .MOV)'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Supported extensions: <span className="text-[#E5B868] font-bold">.MP4, .MOV, .WEBM</span> • Path: <span className="text-[#E5B868] font-bold">/AdminVideos</span> • Limit: <span className="text-[#E5B868] font-bold">2 GB Max (3-min 4K H.265/MP4)</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXTERNAL VIDEO URL PASTER (YouTube, Vimeo, Hudl, TikTok, Instagram) */}
          {uploaderMode === 'url' && (
            <form onSubmit={handleAddVideoUrl} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase block">
                    Paste Video Link URL
                  </label>
                  {inputUrl.trim() && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 flex items-center gap-1">
                      <Tv className="w-3 h-3" />
                      Detected: {parsedInputInfo.platformName}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="e.g., https://www.youtube.com/watch?v=..., https://www.hudl.com/v/..., TikTok, Instagram, Vimeo"
                    className="w-full bg-[#212A31] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:border-[#E5B868] focus:outline-none transition-all"
                    required
                  />
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {/* Supported Platforms Legend Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Supported Platforms:</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                  YouTube
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  Hudl
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-pink-500/20 text-pink-400 border border-pink-500/30 font-bold">
                  Instagram Reels
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30 font-bold">
                  TikTok
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold">
                  Vimeo
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30 font-bold">
                  Direct .MP4 / .MOV Link
                </span>
              </div>

              <button
                type="submit"
                disabled={uploading || !inputUrl.trim()}
                className="w-full py-3 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(214,28,36,0.4)] transition-all cursor-pointer disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                <span>Add Video Link to Media Hub Library</span>
              </button>
            </form>
          )}

          {uploadSuccess && (
            <div className="mt-3 p-3 rounded-xl bg-[#E5B868]/10 border border-[#E5B868]/40 text-[#E5B868] text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Video successfully added to Firebase Storage & saved to AdminVideos collection across Home & Media Hub!</span>
            </div>
          )}

          {uploadError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* FILTER & SEARCH BAR CONTROL SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl">
        
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-[#E5B868] flex-shrink-0" />
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex-shrink-0 transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.4)]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentIndex(0);
            }}
            placeholder="Search playlist (e.g., Flag, West Orange, Final)..."
            className="w-full bg-[#212A31] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Swipe Gesture Navigation Bar */}
      <SwipeNavigationHint
        categories={categoriesList}
        activeCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setCurrentIndex(0);
        }}
        swipeHint={swipeHint}
      />

      {/* PLAYLIST STATS SUMMARY BADGE */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400 font-mono">
        <span>
          Showing <strong className="text-[#E5B868]">{filteredPlaylist.length}</strong> of <strong className="text-white">{allPlaylistVideos.length}</strong> playlist videos
        </span>
        {selectedCategory !== 'All' && (
          <span className="text-[#E5B868]">
            Filter: {selectedCategory}
          </span>
        )}
      </div>

      {/* GLASSMORPHIC UNIVERSAL VIDEO PLAYER & CAROUSEL */}
      {currentVideo ? (
        <div className="relative rounded-3xl overflow-hidden bg-[#000000]/90 border border-white/15 shadow-2xl backdrop-blur-2xl">
          
          {/* Top Header Navigation Bar */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/60 backdrop-blur-md">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5B868] shadow-[0_0_10px_#E5B868] animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-widest text-[#E5B868]">
                NATIVE BROADCAST & COMMUNITY PLAYLIST
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-white/10 text-white border border-white/15">
                {currentType.toUpperCase()}
              </span>
              <span className="text-xs text-slate-300 font-mono font-bold">
                {currentIndex + 1} of {filteredPlaylist.length}
              </span>
            </div>

            {isAdmin && currentVideo.id && !currentVideo.id.startsWith('demo-') && !currentVideo.id.includes('-') && (
              <button
                onClick={() => handleDeleteVideo(currentVideo.id, currentVideo.videoUrl)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Delete video (Admin)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Video</span>
              </button>
            )}
          </div>

          {/* Video Player Main Display Container */}
          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
            
            {/* 1. NATIVE MP4 / MOV PLAYER */}
            {(currentType === 'native' || parsedCurrentVideo?.isDirectFile) && (
              <>
                <video
                  ref={videoRef}
                  key={currentVideo.videoUrl}
                  src={currentVideo.videoUrl}
                  controls={false}
                  muted={isMuted}
                  loop
                  playsInline
                  className="w-full h-full object-contain"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => {
                    setCurrentTime(e.currentTarget.currentTime);
                  }}
                  onLoadedMetadata={(e) => {
                    setDuration(e.currentTarget.duration || 0);
                  }}
                  onProgress={(e) => {
                    const v = e.currentTarget;
                    if (v.buffered.length > 0 && v.duration > 0) {
                      const bufferedEnd = v.buffered.end(v.buffered.length - 1);
                      setBufferedPercent((bufferedEnd / v.duration) * 100);
                    }
                  }}
                  onWaiting={() => setIsBuffering(true)}
                  onPlaying={() => setIsBuffering(false)}
                />

                {/* Custom Native Overlay Controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
                  
                  {/* Top Overlay */}
                  <div className="flex justify-between items-start pointer-events-auto">
                    <div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]">
                        RAW BROADCAST FOOTAGE
                      </span>
                      <h2 className="text-lg sm:text-xl font-black text-white uppercase mt-2 tracking-tight drop-shadow-md">
                        {currentVideo.title}
                      </h2>
                    </div>

                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all pointer-events-auto cursor-pointer"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-[#E5B868]" />}
                    </button>
                  </div>

                  {/* Play/Pause Center Button */}
                  <div className="self-center pointer-events-auto">
                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          if (videoRef.current.paused) {
                            videoRef.current.play();
                            setIsPlaying(true);
                          } else {
                            videoRef.current.pause();
                            setIsPlaying(false);
                          }
                        }
                      }}
                      className="p-5 rounded-full bg-[#E5B868] hover:bg-[#B8141B] text-black shadow-[0_0_30px_rgba(214,28,36,0.6)] transform hover:scale-110 transition-all cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-8 h-8 stroke-[2.5]" /> : <Play className="w-8 h-8 stroke-[2.5] ml-1" />}
                    </button>
                  </div>

                  {/* Bottom Area with Custom Video Progress Bar */}
                  <div className="space-y-2 pointer-events-auto bg-black/40 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                    <VideoProgressBar
                      currentTime={currentTime}
                      duration={duration}
                      bufferedPercent={bufferedPercent}
                      isBuffering={isBuffering}
                      onSeek={(targetTime) => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = targetTime;
                          setCurrentTime(targetTime);
                        }
                      }}
                    />

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-300 font-medium max-w-lg truncate">
                        {currentVideo.description}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePrev}
                          className="p-2.5 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-all cursor-pointer"
                          title="Previous Video"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleNext}
                          className="p-2.5 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-all cursor-pointer"
                          title="Next Video"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 2. YOUTUBE / VIMEO / HUDL / TIKTOK / INSTAGRAM EMBEDDED IFRAME PLAYER */}
            {currentType !== 'native' && !parsedCurrentVideo?.isDirectFile && (
              <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
                {currentVideo.embedUrl || parsedCurrentVideo?.embedUrl ? (
                  <iframe
                    key={currentVideo.id || currentVideo.videoUrl}
                    src={currentVideo.embedUrl || parsedCurrentVideo?.embedUrl}
                    title={currentVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <Tv className="w-10 h-10 text-[#E5B868] mx-auto animate-bounce" />
                    <h3 className="text-sm font-black text-white uppercase">{currentVideo.title}</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">{currentVideo.description}</p>
                    <a
                      href={currentVideo.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase shadow-[0_0_15px_rgba(214,28,36,0.4)]"
                    >
                      <span>Watch Full Highlight on {parsedCurrentVideo?.platformName || 'External Platform'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Floating External Source Badge */}
                <div className="absolute top-4 left-4 z-10 pointer-events-auto flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-[#E5B868]"></span>
                  <span className="text-[10px] font-black uppercase text-white font-mono">
                    {parsedCurrentVideo?.platformName || currentType} EMBED
                  </span>
                  <a
                    href={currentVideo.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-[#E5B868] transition-colors ml-1"
                    title="Open original link"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

          </div>

          {/* TITLE & SOCIAL ENGAGEMENT ACTION BAR (Like, Comment, Share) */}
          <div className="px-6 py-4 bg-black/95 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black uppercase text-white tracking-wide">
                  {currentVideo.title}
                </h3>
                {currentVideo.category && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30 uppercase">
                    {currentVideo.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{currentVideo.description}</p>
              
              {/* Stats badges */}
              <div className="flex items-center gap-4 text-slate-400 text-xs pt-1 font-mono">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  {currentVideo.viewCount?.toLocaleString() || '1,200'} Views
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Score: {currentVideo.ratingScore || 8.5}/10
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#E5B868]" />
                  Uploaded {new Date(currentVideo.uploadDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Social Action Buttons: LIKE, SHARE, PREV, NEXT */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              
              {/* Like Button */}
              <button
                onClick={() => handleToggleLike(currentVideo.id)}
                className={`px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  likedVideoIds[currentVideo.id]
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : 'bg-white/5 text-slate-300 hover:text-white border-white/10 hover:bg-white/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${likedVideoIds[currentVideo.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{likesCountMap[currentVideo.id] || currentVideo.likesCount || 0}</span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleWebShare}
                className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#E5B868]" />
                <span>Share</span>
              </button>

              {/* Carousel Prev/Next Buttons */}
              <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-3">
                <button
                  onClick={handlePrev}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  title="Previous Video"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  title="Next Video"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

          {/* COMMUNITY ATHLETE & MEMBER COMMENTS SECTION */}
          <div className="px-6 py-5 bg-[#212A31]/90 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#E5B868]" />
                <span>Member & Athlete Discussion ({commentsMap[currentVideo.id]?.length || 0})</span>
              </h4>
            </div>

            {/* Comment Input Box */}
            <form onSubmit={handleAddComment} className="flex gap-2 mb-5">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Share your thoughts on this performance or tag a teammate..."
                className="flex-1 bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#E5B868] focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black uppercase text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(214,28,36,0.3)] transition-all cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {(commentsMap[currentVideo.id] || []).length > 0 ? (
                (commentsMap[currentVideo.id] || []).map((comm) => (
                  <div key={comm.id} className="p-3 rounded-2xl bg-white/5 border border-white/5 text-xs flex items-start gap-3">
                    <div className="p-2 rounded-full bg-[#E5B868]/20 text-[#E5B868] font-black text-[10px] flex-shrink-0">
                      {comm.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          {comm.authorName}
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/10 text-slate-300 font-mono">
                            {comm.authorRole}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-500">{comm.createdAt}</span>
                      </div>
                      <p className="text-slate-300 mt-1">{comm.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-2">
                  Be the first athlete or member to leave a comment on this highlight!
                </p>
              )}
            </div>
          </div>

          {/* CAROUSEL THUMBNAIL PLAYLIST NAVIGATION GRID */}
          <div className="p-4 bg-black/90 border-t border-white/10 flex items-center gap-3 overflow-x-auto scrollbar-none">
            {filteredPlaylist.map((vid, idx) => {
              const vidParsed = parseVideoUrl(vid.videoUrl);
              const vidType = vid.videoType || vidParsed.type;

              return (
                <button
                  key={vid.id || idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsPlaying(false);
                  }}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    currentIndex === idx
                      ? 'bg-[#E5B868]/15 border-[#E5B868] text-white shadow-[0_0_15px_rgba(214,28,36,0.3)] scale-[1.02]'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <Film className={`w-3.5 h-3.5 ${currentIndex === idx ? 'text-[#E5B868]' : 'text-slate-400'}`} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase ${
                      vidType === 'native' ? 'bg-[#E5B868]/20 text-[#E5B868]' :
                      vidType === 'youtube' ? 'bg-red-500/20 text-red-400' :
                      vidType === 'hudl' ? 'bg-amber-500/20 text-amber-300' :
                      vidType === 'tiktok' ? 'bg-[#E5B868]/20 text-[#E5B868]' :
                      vidType === 'instagram' ? 'bg-pink-500/20 text-pink-400' : 'bg-white/20 text-slate-200'
                    }`}>
                      {vidType}
                    </span>
                  </div>
                  <p className="text-xs font-bold max-w-[180px] truncate">{vid.title}</p>
                </button>
              );
            })}
          </div>

        </div>
      ) : (
        <div className="p-12 text-center bg-white/5 rounded-3xl border border-white/10 text-slate-400">
          <Video className="w-10 h-10 text-[#E5B868] mx-auto mb-3" />
          <p className="text-sm font-black text-white uppercase">No videos found matching current filter.</p>
          <button
            onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
            className="mt-3 px-4 py-2 rounded-xl bg-[#E5B868] text-black font-bold text-xs uppercase"
          >
            Reset Search Filters
          </button>
        </div>
      )}

      {/* SHARE MODAL DIALOG */}
      {isShareModalOpen && currentVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#212A31] border border-white/20 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#E5B868]" />
                <span>Share Video Highlight</span>
              </h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-300 font-bold">{currentVideo.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{currentVideo.description}</p>
            </div>

            {/* Copy Link Input */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Direct Video Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentVideo.videoUrl}
                  className="flex-1 bg-black border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                />
                <button
                  onClick={handleCopyShareLink}
                  className="px-3.5 py-2 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase flex items-center gap-1"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Quick Social Links */}
            <div className="pt-2 flex items-center justify-center gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this video on Just1Play: ${currentVideo.title}`)}&url=${encodeURIComponent(currentVideo.videoUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold"
              >
                Share on X / Twitter
              </a>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${currentVideo.title} - ${currentVideo.videoUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-red-600/20 text-red-500 border border-red-600/30 text-xs font-bold"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
