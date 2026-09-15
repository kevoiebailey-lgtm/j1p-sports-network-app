import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Video, 
  Image as ImageIcon, 
  MessageSquare, 
  Link2, 
  Sparkles, 
  Upload, 
  CheckCircle2, 
  Trophy,
  AlertCircle,
  Loader2,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc } from 'firebase/firestore';
import { safeSetDoc, isFirestoreQuotaExceeded } from '../../lib/firestoreQuotaGuard';
import { ref } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { saveLocalPost, updateStoredPost } from './SocialFeedView';
import { validateRoleConsistency } from '../../services/roleConsistencyValidator';
import { RoleConsistencyBanner } from './RoleConsistencyBanner';
import { compressImage } from '../../lib/imageCompressor';
import { compressVideo } from '../../lib/videoCompressor';
import { uploadVideoWithRetry } from '../../lib/resilientVideoUploader';
import { detectVideoEmbed } from '../../lib/mediaEmbed';
import {
  generateVideoThumbnailFromFile,
  getEmbedThumbnailUrl,
  uploadThumbnailToStorage,
  cacheThumbnailUrl
} from '../../lib/videoThumbnailGenerator';
import { saveVideoBlobToIndexedDB } from '../../lib/videoIndexedDBStorage';
import { PendingUploadCard, PendingUploadItem } from './PendingUploadCard';
import { SocialPost } from '../../types';
import { SportSelector } from '../Common/SportSelector';

import { DEFAULT_THUMBNAIL_URL } from '../../lib/constants';
import { ThumbnailSelector } from '../Common/ThumbnailSelector';

export interface CreatePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (postData: any) => void;
}

export const CreatePublishModal: React.FC<CreatePublishModalProps> = ({
  isOpen,
  onClose,
  onPostCreated
}) => {
  const { user, profile } = useAuth();
  const currentUid = user?.uid || profile?.uid || 'demo-user';
  const currentName = user?.displayName || profile?.displayName || 'Sports Athlete';
  const currentAvatar = user?.photoURL || profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
  const currentRole = profile?.role || 'athlete';
  const isAdmin = profile?.role === 'admin' || user?.email === 'kevoiebailey@gmail.com' || (user as any)?.role === 'admin';

  const [activeOption, setActiveOption] = useState<'video' | 'photos' | 'status'>('video');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [generatedThumbDataUrl, setGeneratedThumbDataUrl] = useState<string | null>(null);
  const [generatedThumbFile, setGeneratedThumbFile] = useState<File | null>(null);
  const [selectedThumbnailUrl, setSelectedThumbnailUrl] = useState<string | null>(null);
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [statsSnippet, setStatsSnippet] = useState('');
  const [sportCategory, setSportCategory] = useState("Basketball");
  const [classYear, setClassYear] = useState('2026');
  const [position, setPosition] = useState('');
  const [height, setHeight] = useState('');
  const [gpa, setGpa] = useState('');
  const [fortyYardDash, setFortyYardDash] = useState('');
  const [verticalJump, setVerticalJump] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dismissValidationBanner, setDismissValidationBanner] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUploadItem | null>(null);
  const cancelRequestedRef = useRef<boolean>(false);

  const handleCancelUpload = (uploadId: string) => {
    cancelRequestedRef.current = true;
    setPendingUpload(null);
    setIsSubmitting(false);
    setErrorMessage('Media upload was canceled. Publication aborted.');
  };

  const validationResult = validateRoleConsistency({
    role: currentRole as any,
    caption,
    postOption: activeOption,
    hasVideo: !!videoUrl || !!selectedVideoFile,
    hasPhoto: !!photoPreview || !!imageUrl,
    hasStatsSnippet: !!statsSnippet
  });

  const handleValidationAction = (actionId: 'relabel' | 'disclaimer' | 'switch_role') => {
    if (actionId === 'disclaimer' && validationResult.disclaimerTag) {
      setCaption((prev) => `[${validationResult.disclaimerTag}]\n\n${prev}`.trim());
    } else if (actionId === 'relabel') {
      const cleanedCaption = caption
        .replace(/scout report/gi, 'game highlight')
        .replace(/ncaa evaluation/gi, 'player update')
        .replace(/official sanction/gi, 'event announcement');
      setCaption(`[Game Highlight] ${cleanedCaption}`.trim());
    }
    setDismissValidationBanner(true);
  };

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('app:hide-dock'));
    } else {
      window.dispatchEvent(new CustomEvent('app:show-dock'));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('app:show-dock'));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedVideoFile(file);
      setVideoFileName(file.name);
      // Instant object URL for zero-latency local playback preview
      const objectUrl = URL.createObjectURL(file);
      setVideoUrl(objectUrl);
      setErrorMessage(null);

      // Extract compressed frame thumbnail in background
      generateVideoThumbnailFromFile(file)
        .then((res) => {
          setGeneratedThumbDataUrl(res.dataUrl);
          setGeneratedThumbFile(res.file);
        })
        .catch((err) => {
          console.warn('⚡ Video frame thumbnail auto-generation bypassed:', err);
        });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        console.warn('Photo compression fallback:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Auto-detect embedded video link if user typed or pasted in caption
    let targetVideoUrl = videoUrl.trim();
    if (!targetVideoUrl && caption) {
      const detected = detectVideoEmbed(caption);
      if (detected?.originalUrl) {
        targetVideoUrl = detected.originalUrl;
      }
    }

    // Validation per active mode
    if (activeOption === 'video') {
      if (!selectedVideoFile && !targetVideoUrl) {
        setErrorMessage('Please select a video file or enter a valid video link (YouTube, Hudl, Shorts, Reel).');
        return;
      }
    } else if (activeOption === 'photos') {
      if (!photoPreview && !imageUrl.trim()) {
        setErrorMessage('Please upload a photo or provide an image URL for your photo post.');
        return;
      }
    } else if (activeOption === 'status') {
      if (!caption.trim() && !statsSnippet.trim() && !targetVideoUrl) {
        setErrorMessage('Please enter a status message, scouting note, or video link.');
        return;
      }
    }

    setIsSubmitting(true);
    cancelRequestedRef.current = false;

    try {
      const fullCaption = [
        caption.trim(),
        statsSnippet ? `📊 Stats: ${statsSnippet.trim()}` : '',
        sportCategory ? `#${sportCategory.replace(/\s+/g, '')}` : ''
      ].filter(Boolean).join('\n\n');

      const localPostId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const imageUrlToSave = activeOption === 'photos' ? (photoPreview || imageUrl.trim() || '') : '';
      let videoUrlToSave = targetVideoUrl || videoUrl.trim();

      // Determine initial compressed video thumbnail (custom chosen photo, dataUrl or embed thumbnail or default)
      let initialVideoThumbnail = selectedThumbnailUrl || imageUrlToSave || DEFAULT_THUMBNAIL_URL;
      if (!selectedThumbnailUrl) {
        if (selectedVideoFile) {
          if (generatedThumbDataUrl) {
            initialVideoThumbnail = generatedThumbDataUrl;
          }
        } else if (videoUrlToSave) {
          const embedThumb = getEmbedThumbnailUrl(videoUrlToSave);
          if (embedThumb) {
            initialVideoThumbnail = embedThumb;
          }
        }
      }

      // Create instant post structure for feed (Instagram style: instant local post rendering)
      const newPostObj: SocialPost = {
        id: localPostId,
        authorUid: currentUid,
        authorName: currentName,
        authorAvatar: currentAvatar,
        authorRole: currentRole,
        authorSport: sportCategory || profile?.sport || 'Basketball',
        authorIsVerified: profile?.isVerified ?? false,
        classYear: classYear || '2026',
        position: position || undefined,
        height: height || undefined,
        gpa: gpa || undefined,
        fortyYardDash: fortyYardDash || undefined,
        verticalJump: verticalJump || undefined,
        isVerifiedFilm: !!videoUrlToSave || !!selectedVideoFile,
        isTopRecruit: profile?.role === 'athlete' && (!!gpa || !!fortyYardDash),
        caption: fullCaption || (videoUrlToSave || selectedVideoFile ? 'Check out my new highlight tape! 🎥' : 'New post on Just1Play! 🔥'),
        imageUrl: imageUrlToSave,
        videoUrl: videoUrlToSave,
        videoThumbnailUrl: initialVideoThumbnail,
        roleConsistencyFlag: validationResult.disclaimerTag || null,
        isRoleVerified: validationResult.isAligned,
        contentType: validationResult.detectedContentType,
        likes: [],
        likesCount: 0,
        comments: [],
        commentsCount: 0,
        sharesCount: 0,
        createdAt: new Date().toISOString()
      };

      // 1. Instantly save to LocalStorage so post appears on feed with 0 delay!
      saveLocalPost(newPostObj);
      if (onPostCreated) {
        onPostCreated(newPostObj);
      }

      // If a native video file was selected, persist blob to IndexedDB for persistent offline/reload playback
      if (selectedVideoFile) {
        saveVideoBlobToIndexedDB(localPostId, selectedVideoFile).catch((e) => {
          console.warn('⚡ Local IndexedDB video cache warning:', e);
        });
      }

      // 2. If a native video file was selected, execute fast background upload & client-side compression
      if (selectedVideoFile) {
        setPendingUpload({
          id: localPostId,
          caption: fullCaption || 'Uploading Native Video Film',
          videoUrl: videoUrlToSave,
          progress: 10,
          statusMessage: 'Optimizing & downsampling video stream...'
        });

        // Fast client-side downsampling/compression
        let fileToUpload = selectedVideoFile;
        try {
          fileToUpload = await compressVideo(selectedVideoFile, { timeoutMs: 6000 });
        } catch (cErr) {
          console.warn('Video compression fallback:', cErr);
        }

        if (cancelRequestedRef.current) return;

        setPendingUpload((prev) =>
          prev ? { ...prev, progress: 25, statusMessage: 'Uploading video & generating cached thumbnail...' } : null
        );

        // Upload compressed thumbnail frame to Firebase Storage
        let finalThumbnailUrl = initialVideoThumbnail;
        try {
          let thumbFileToUpload = selectedThumbnailFile || generatedThumbFile;
          if (!thumbFileToUpload && selectedVideoFile) {
            const thumbRes = await generateVideoThumbnailFromFile(selectedVideoFile);
            thumbFileToUpload = thumbRes.file;
          }
          if (thumbFileToUpload) {
            finalThumbnailUrl = await uploadThumbnailToStorage(thumbFileToUpload, currentUid, 'post');
          } else if (selectedThumbnailUrl) {
            finalThumbnailUrl = selectedThumbnailUrl;
          }
        } catch (thumbErr) {
          console.warn('⚠️ Thumbnail storage upload warning:', thumbErr);
        }

        const sanitizedFileName = `${Date.now()}_${fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const storageRef = ref(storage, `social_videos/${currentUid}/${sanitizedFileName}`);

        let downloadUrl = videoUrlToSave;
        try {
          downloadUrl = await uploadVideoWithRetry({
            storageRef,
            file: fileToUpload,
            maxRetries: 3,
            initialBackoffMs: 500,
            onProgress: (p) => {
              setPendingUpload((prev) =>
                prev ? { ...prev, progress: Math.min(95, Math.max(15, p.percentage)), statusMessage: p.statusMessage } : null
              );
            }
          });

          // Cache thumbnail locally mapped to the storage download URL
          if (finalThumbnailUrl) {
            cacheThumbnailUrl(downloadUrl, finalThumbnailUrl);
          }

          // Update videoUrl & videoThumbnailUrl in local storage and post object
          videoUrlToSave = downloadUrl;
          newPostObj.videoUrl = downloadUrl;
          newPostObj.videoThumbnailUrl = finalThumbnailUrl;
          updateStoredPost(localPostId, (p) => ({ ...p, videoUrl: downloadUrl, videoThumbnailUrl: finalThumbnailUrl }));
        } catch (uploadErr) {
          console.warn('[CreatePublishModal] Firebase Storage upload warning (post live locally):', uploadErr);
        }

        if (cancelRequestedRef.current) return;

        // Persist to Firestore
        try {
          if (!isFirestoreQuotaExceeded()) {
            await safeSetDoc(doc(db, 'socialPosts', localPostId), {
              authorUid: currentUid,
              authorName: currentName,
              authorAvatar: currentAvatar,
              authorRole: currentRole,
              authorSport: sportCategory || profile?.sport || 'Basketball',
              caption: fullCaption || 'Check out my new highlight tape! 🎥',
              imageUrl: imageUrlToSave,
              videoUrl: downloadUrl,
              videoThumbnailUrl: finalThumbnailUrl,
              roleConsistencyFlag: validationResult.disclaimerTag || null,
              isRoleVerified: validationResult.isAligned,
              contentType: validationResult.detectedContentType,
              likes: [],
              likesCount: 0,
              comments: [],
              commentsCount: 0,
              sharesCount: 0,
              createdAt: new Date().toISOString()
            });
          }
        } catch (firestoreErr) {
          console.warn('[CreatePublishModal] Firestore doc save notice:', firestoreErr);
        }
      } else {
        // Non-file post (video link or image or status update)
        try {
          if (!isFirestoreQuotaExceeded()) {
            await safeSetDoc(doc(db, 'socialPosts', localPostId), {
              authorUid: currentUid,
              authorName: currentName,
              authorAvatar: currentAvatar,
              authorRole: currentRole,
              authorSport: sportCategory || profile?.sport || 'Basketball',
              caption: fullCaption || (videoUrlToSave ? 'Check out my new highlight tape! 🎥' : 'New post on Just1Play! 🔥'),
              imageUrl: imageUrlToSave,
              videoUrl: videoUrlToSave,
              videoThumbnailUrl: initialVideoThumbnail,
              roleConsistencyFlag: validationResult.disclaimerTag || null,
              isRoleVerified: validationResult.isAligned,
              contentType: validationResult.detectedContentType,
              likes: [],
              likesCount: 0,
              comments: [],
              commentsCount: 0,
              sharesCount: 0,
              createdAt: new Date().toISOString()
            });
          }
        } catch (firestoreErr) {
          console.warn('[CreatePublishModal] Firestore doc save notice:', firestoreErr);
        }
      }

      if (cancelRequestedRef.current) return;

      setPendingUpload((prev) =>
        prev ? { ...prev, progress: 100, statusMessage: 'Highlight Published!' } : null
      );

      await new Promise((r) => setTimeout(r, 200));

      setIsSubmitting(false);
      setSuccessMessage(true);
      setPendingUpload(null);

      // Reset form state immediately
      setVideoUrl('');
      setVideoFileName(null);
      setSelectedVideoFile(null);
      setSelectedThumbnailUrl(null);
      setSelectedThumbnailFile(null);
      setGeneratedThumbDataUrl(null);
      setGeneratedThumbFile(null);
      setImageUrl('');
      setPhotoPreview(null);
      setCaption('');
      setStatsSnippet('');

      setTimeout(() => {
        setSuccessMessage(false);
        onClose();
      }, 800);
    } catch (err: any) {
      if (cancelRequestedRef.current) return;
      console.error('[CreatePublishModal] Error saving post:', err);
      setIsSubmitting(false);
      setPendingUpload(null);
      setErrorMessage(err.message || 'Failed to save post. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="w-full max-w-lg bg-[#161C22] border border-slate-700/80 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh] max-h-[92dvh] overflow-hidden relative"
      >
        {/* Header - Fixed Top */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 shrink-0 bg-[#161C22]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 border border-red-600/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Publish to Just1Play
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">Highlight reels, photos & combine metrics</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Message Banner */}
        {successMessage ? (
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-red-600 text-slate-950 flex items-center justify-center shadow-[0_0_25px_rgba(229,184,104,0.6)] animate-bounce">
              <CheckCircle2 className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-base font-black text-white uppercase">Published Successfully!</h4>
            <p className="text-xs text-slate-400">Your update is now live on the Social Wall.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 space-y-4">
              
              {/* 3 Creation Mode Buttons */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => { setActiveOption('video'); setErrorMessage(null); }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    activeOption === 'video'
                      ? 'bg-red-600/15 border-red-600 text-red-500 shadow-[0_0_15px_rgba(214,28,36,0.3)]'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Video className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Video URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveOption('photos'); setErrorMessage(null); }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    activeOption === 'photos'
                      ? 'bg-red-600/15 border-red-600 text-red-500 shadow-[0_0_15px_rgba(214,28,36,0.3)]'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ImageIcon className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Upload Photos</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveOption('status'); setErrorMessage(null); }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    activeOption === 'status'
                      ? 'bg-red-600/15 border-red-600 text-red-500 shadow-[0_0_15px_rgba(214,28,36,0.3)]'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Status Update</span>
                </button>
              </div>

              {/* Input fields depending on option */}
              {activeOption === 'video' && (
                <div className="space-y-3">
                  {isAdmin ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-bold uppercase text-slate-400">
                            Upload Direct Video File (.mp4, .mov, .webm)
                          </label>
                          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                            Admin Direct File Access
                          </span>
                        </div>
                        <div className="p-3.5 rounded-2xl border-2 border-dashed border-slate-800 bg-[#212A31]/60 text-center relative cursor-pointer hover:border-red-600/50 transition-colors">
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleVideoFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                            <Upload className="w-5 h-5 text-red-500" />
                            {videoFileName ? (
                              <span className="text-xs text-red-400 font-bold font-mono">
                                Selected Video: {videoFileName}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">
                                Click or drag raw video file here to upload to Storage
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="relative flex items-center gap-2">
                        <div className="flex-1 h-px bg-slate-800" />
                        <span className="text-[10px] text-slate-500 font-mono uppercase">OR PASTE STREAM LINK</span>
                        <div className="flex-1 h-px bg-slate-800" />
                      </div>
                    </>
                  ) : (
                    <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-1">
                      <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Instant High-Definition Video Streaming</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Paste your highlight link from Hudl, YouTube, Vimeo, TikTok, or Instagram for instant 4K playback with zero buffering.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Video Stream URL (YouTube, Hudl, Shorts, Reel, Vimeo, MP4 Link)
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://www.hudl.com/video/... or YouTube, Vimeo, TikTok"
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          setVideoFileName(null);
                        }}
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#212A31] border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-red-600 focus:outline-none"
                      />
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    </div>

                    {/* Supported platform quick tags */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[9px] font-mono text-slate-500 uppercase">Supported:</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#E5B868]/15 text-[#E5B868] border border-[#E5B868]/30">Hudl</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-600/15 text-red-400 border border-red-600/30">YouTube</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">Vimeo</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-pink-500/15 text-pink-400 border border-pink-500/30">Instagram Reels</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">TikTok</span>
                    </div>
                  </div>

                  {/* Custom Photo Thumbnail Selector */}
                  <ThumbnailSelector
                    selectedThumbnailUrl={selectedThumbnailUrl || generatedThumbDataUrl}
                    selectedThumbnailFile={selectedThumbnailFile || generatedThumbFile}
                    videoFile={selectedVideoFile}
                    videoUrl={videoUrl}
                    onThumbnailChange={(thumbUrl, thumbFile) => {
                      setSelectedThumbnailUrl(thumbUrl);
                      setSelectedThumbnailFile(thumbFile || null);
                    }}
                    label="Highlight Thumbnail Photo"
                    helperText="Upload any photo or select an extracted video frame to use as the thumbnail"
                  />
                </div>
              )}

              {/* Error Message Banner */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {activeOption === 'photos' && (
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Upload Photo or Paste Image URL
                  </label>
                  <div className="p-4 rounded-2xl border-2 border-dashed border-slate-800 bg-[#212A31]/60 text-center space-y-2 relative cursor-pointer hover:border-red-600/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <Upload className="w-6 h-6 text-red-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-200">Click or Drag & Drop Game Photo</p>
                    <p className="text-[10px] text-slate-400">PNG, JPG, WebP supported</p>
                  </div>

                  {photoPreview && (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-700 max-h-48 bg-black/40">
                      <img src={photoPreview} alt="Upload Preview" className="w-full h-48 object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:bg-rose-600 transition-colors shadow-lg cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <input
                    type="url"
                    placeholder="Or paste photo URL: https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-[#212A31] border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-red-600 focus:outline-none"
                  />
                </div>
              )}

              {/* Sport Category & Graduation Year Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SportSelector
                    label="Sport / Category (All Sports & Custom Type)"
                    value={sportCategory}
                    onChange={(newSport) => setSportCategory(newSport)}
                    allowCustom={true}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Graduation Class
                  </label>
                  <select
                    value={classYear}
                    onChange={(e) => setClassYear(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#161C22] border border-[#2D3748] text-xs text-white focus:border-[#E5B868] focus:outline-none cursor-pointer font-mono"
                  >
                    <option value="2025">Class of 2025 (Senior)</option>
                    <option value="2026">Class of 2026 (Junior)</option>
                    <option value="2027">Class of 2027 (Sophomore)</option>
                    <option value="2028">Class of 2028 (Freshman)</option>
                    <option value="2029">Class of 2029 (Middle School)</option>
                    <option value="2030">Class of 2030</option>
                  </select>
                </div>
              </div>

              {/* Athletic Combine Metrics Row */}
              <div className="p-3.5 rounded-2xl bg-[#161C22] border border-[#2D3748] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#00F2FE] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Athletic Metrics & Combine Stats</span>
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Optional for Scouts</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 mb-0.5">Position</label>
                    <input
                      type="text"
                      placeholder="e.g. PG / QB"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-[#1E2630] border border-[#2D3748] text-xs text-white placeholder-slate-600 focus:border-[#E5B868] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 mb-0.5">Height</label>
                    <input
                      type="text"
                      placeholder="e.g. 6'2&quot;"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-[#1E2630] border border-[#2D3748] text-xs text-white placeholder-slate-600 focus:border-[#E5B868] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 mb-0.5">GPA</label>
                    <input
                      type="text"
                      placeholder="e.g. 3.90"
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-[#1E2630] border border-[#2D3748] text-xs text-white placeholder-slate-600 focus:border-[#E5B868] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 mb-0.5">40-Yard Dash</label>
                    <input
                      type="text"
                      placeholder="e.g. 4.45s"
                      value={fortyYardDash}
                      onChange={(e) => setFortyYardDash(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-[#1E2630] border border-[#2D3748] text-xs text-white placeholder-slate-600 focus:border-[#E5B868] focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Stats Snippet Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Game Stats Snippet (e.g., 28.4 PPG | 8 Ast or 4 Pass TDs)
                </label>
                <input
                  type="text"
                  placeholder="28.4 PPG | 8 Ast"
                  value={statsSnippet}
                  onChange={(e) => setStatsSnippet(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#161C22] border border-[#2D3748] text-xs text-white placeholder-slate-500 focus:border-[#E5B868] focus:outline-none font-mono"
                />
              </div>

              {/* Caption TextArea */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Post Caption & Tags
                </label>
                <textarea
                  rows={3}
                  placeholder="Share game highlight details, athletic combine scores, or scouting notes..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#161C22] border border-[#2D3748] text-xs text-white placeholder-slate-500 focus:border-[#E5B868] focus:outline-none resize-none"
                />
              </div>

              {/* ROLE CONSISTENCY VALIDATOR BANNER */}
              {!dismissValidationBanner && validationResult.severity !== 'none' && (
                <RoleConsistencyBanner
                  validationResult={validationResult}
                  onActionSelect={handleValidationAction}
                  onDismiss={() => setDismissValidationBanner(true)}
                />
              )}

              {/* Inline Upload Pending Card in Modal */}
              {pendingUpload && (
                <div className="pt-2">
                  <PendingUploadCard
                    upload={pendingUpload}
                    onCancel={handleCancelUpload}
                  />
                </div>
              )}

            </div>

            {/* Sticky / Fixed Bottom Action Footer - Always Visible */}
            <div className="p-4 sm:px-6 border-t border-slate-800 bg-[#11161B] shrink-0">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-[#E5B868] hover:bg-[#D4A350] active:scale-[0.98] text-slate-950 font-black font-mono text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(229,184,104,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Publishing Film & Stats...</span>
                  </>
                ) : (
                  <span>
                    {activeOption === 'video' ? 'Post Highlight Tape' : activeOption === 'photos' ? 'Publish Game Photos' : 'Publish Status Update'}
                  </span>
                )}
              </button>
            </div>

          </form>
        )}

      </motion.div>
    </div>
  );
};

export default CreatePublishModal;
