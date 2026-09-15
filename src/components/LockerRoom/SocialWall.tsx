import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Sparkles,
  Camera,
  Video,
  Send,
  Search,
  Filter,
  MessageSquare,
  Share2,
  Bookmark,
  ShieldCheck,
  Trophy,
  Activity,
  Zap,
  CheckCircle2,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Radio,
  Image as ImageIcon,
  Link2,
  Trash2,
  MoreVertical,
  Plus,
  Compass,
  Grid,
  List,
  TrendingUp,
  Hash,
  Eye,
  RefreshCw,
  Award,
  Users,
  Heart,
  UserPlus,
  UserCheck,
  Check,
  Copy
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  getDocs,
  limit
} from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAuthRole, normalizeRole } from '../../hooks/useAuthRole';
import { useToast } from '../../context/ToastContext';
import { uploadToMediaVault } from '../../services/storageService';
import { detectVideoEmbed, VideoEmbedInfo } from '../../lib/mediaEmbed';
import { LockerPost, SportCategory, ReactionType, EXPANDED_SPORT_CATEGORIES } from './types';
import { LockerCommentsDrawer } from './LockerCommentsDrawer';
import { GuestAuthGateModal } from './GuestAuthGateModal';
import { AuthModal } from '../Auth/AuthModal';
import { saveAthleteHighlight } from '../../services/highlightService';

/**
 * Top Featured Athlete Stories (Instagram/TikTok style top avatar reel)
 */
export interface StoryAthlete {
  id: string;
  name: string;
  avatar: string;
  sport: string;
  school: string;
  hasNewReel: boolean;
  reelUrl?: string;
  verified: boolean;
}

export interface SocialWallProps {
  initialSport?: SportCategory;
  className?: string;
}

export const SocialWall: React.FC<SocialWallProps> = ({
  initialSport = 'All',
  className = ''
}) => {
  const { user, profile } = useAuth();
  const { role } = useAuthRole();
  const canonicalRole = normalizeRole(role);
  const { showToast } = useToast();

  // Data & Real-Time Sync State
  const [posts, setPosts] = useState<LockerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Follows State (Set of authorIds)
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  // Double-tap heart/flame animation triggers per post
  const [burstingPostId, setBurstingPostId] = useState<string | null>(null);

  // Video playback states (muted, active video playing)
  const [muted, setMuted] = useState(true);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Filter & Search State
  const [selectedSport, setSelectedSport] = useState<SportCategory>(initialSport);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'photo' | 'text' | 'verified'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'hype' | 'comments'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'stream' | 'grid'>('stream');

  // Composer Form State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [composerSport, setComposerSport] = useState<string>('🏀 Basketball');
  const [mediaType, setMediaType] = useState<'none' | 'photo' | 'video'>('none');
  const [photoUrl, setPhotoUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMetricInputs, setShowMetricInputs] = useState(false);
  const [metricForty, setMetricForty] = useState('');
  const [metricVert, setMetricVert] = useState('');
  const [metricGpa, setMetricGpa] = useState('');
  const [metricHeight, setMetricHeight] = useState('');

  // Quick inline comments state: { [postId]: string }
  const [inlineComments, setInlineComments] = useState<Record<string, string>>({});
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState<string | null>(null);

  // Interactive Modals & Drawers
  const [activeCommentPost, setActiveCommentPost] = useState<LockerPost | null>(null);
  const [activeTheaterPost, setActiveTheaterPost] = useState<LockerPost | null>(null);
  const [isGuestGateOpen, setIsGuestGateOpen] = useState(false);
  const [gateActionText, setGateActionText] = useState('interact with the social wall');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [watchlistedAthletes, setWatchlistedAthletes] = useState<Set<string>>(new Set());

  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Compute dynamic stories from unique authors in posts who have video/photo highlights
  const dynamicStories = useMemo(() => {
    const storyMap = new Map<string, StoryAthlete>();
    posts.forEach((p) => {
      if (p.authorId && !storyMap.has(p.authorId)) {
        storyMap.set(p.authorId, {
          id: p.authorId,
          name: p.authorName || 'Athlete',
          avatar: p.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          sport: p.sport || 'Sports',
          school: p.authorSchool || 'High School',
          hasNewReel: Boolean(p.videoUrl),
          reelUrl: p.videoUrl || p.imageUrl || undefined,
          verified: Boolean(p.isVerifiedRecruit)
        });
      }
    });
    return Array.from(storyMap.values()).slice(0, 10);
  }, [posts]);

  // 1. Fetch & Subscribe to Firestore 'posts' collection
  useEffect(() => {
    setLoading(true);
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched: LockerPost[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            let parsedCreatedAt = new Date().toISOString();
            if (data.createdAt) {
              if (typeof data.createdAt === 'string') {
                parsedCreatedAt = data.createdAt;
              } else if (data.createdAt?.toDate) {
                parsedCreatedAt = data.createdAt.toDate().toISOString();
              }
            }

            return {
              id: docSnap.id,
              feedType: data.feedType || (data.videoUrl ? 'video' : 'lounge'),
              sport: data.sport || data.authorSport || 'General Sports',
              caption: data.caption || data.text || '',
              videoUrl: data.videoUrl || '',
              imageUrl: data.imageUrl || data.photoUrl || '',
              authorId: data.authorId || data.authorUid || 'athlete-user',
              authorName: data.authorName || 'Athlete',
              authorAvatar: data.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
              authorRole: data.authorRole || 'athlete',
              authorSport: data.authorSport || data.sport || '',
              authorSchool: data.authorSchool || (data as any).school || '',
              authorClassYear: data.authorClassYear || (data as any).classYear || '',
              isVerifiedRecruit: Boolean(data.isVerifiedRecruit || data.isVerified || data.metrics?.verified),
              metrics: data.metrics || {
                fortyYard: data.fortyYardDash || data.fortyYard || '',
                vertical: data.verticalJump || data.vertical || '',
                gpa: data.gpa || '',
                height: data.height || '',
                weight: data.weight || '',
                verified: Boolean(data.isVerified)
              },
              reactions: data.reactions || { hype: 0, sauce: 0, clutch: 0, bigW: 0 },
              userReactions: data.userReactions || {},
              commentsCount: Number(data.commentsCount) || 0,
              createdAt: parsedCreatedAt
            };
          });

          setPosts(fetched);
        } else {
          setPosts([]);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore live listener notice in SocialWall:', error);
        setPosts([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Fetch User Follows from Firestore
  useEffect(() => {
    const handleQuickPost = () => {
      setIsComposerOpen(true);
    };
    window.addEventListener('app:open-quick-post', handleQuickPost);

    if (!user) {
      return () => {
        window.removeEventListener('app:open-quick-post', handleQuickPost);
      };
    }
    const followsRef = collection(db, 'users', user.uid, 'following');
    const unsub = onSnapshot(
      followsRef,
      (snap) => {
        if (!snap.empty) {
          const ids = new Set(snap.docs.map((d) => d.id));
          setFollowingSet(ids);
        }
      },
      (err) => {
        console.warn('Follows sync notice:', err);
      }
    );
    return () => {
      window.removeEventListener('app:open-quick-post', handleQuickPost);
      unsub();
    };
  }, [user]);

  // Manual refresh helper
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const postsRef = collection(db, 'posts');
      const snap = await getDocs(query(postsRef, orderBy('createdAt', 'desc'), limit(30)));
      if (!snap.empty) {
        const fetched: LockerPost[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data()
        })) as LockerPost[];
        setPosts(fetched);
        showToast('success', 'Social Wall Updated', 'Loaded latest locker room posts!');
      }
    } catch (e) {
      console.warn('Refresh notice:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle Photo / Graphic Attachment
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Invalid File', 'Please select a valid photo image file (JPEG, PNG, WebP).');
      return;
    }

    setSelectedFile(file);
    setMediaType('photo');
    setVideoUrl('');
    const preview = URL.createObjectURL(file);
    setFilePreviewUrl(preview);
    setPhotoUrl(preview);
    setIsComposerOpen(true);
    showToast('success', 'Photo Attached', `${file.name} ready to share.`);
  };

  // Handle Video Highlight Attachment
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('error', 'Invalid File', 'Please select a valid video file (MP4, MOV, WebM).');
      return;
    }

    setSelectedFile(file);
    setMediaType('video');
    setPhotoUrl('');
    const preview = URL.createObjectURL(file);
    setFilePreviewUrl(preview);
    setVideoUrl(preview);
    setIsComposerOpen(true);
    showToast('success', 'Video Attached', `${file.name} attached & ready to post.`);
  };

  // Remove attached media
  const handleRemoveMedia = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
    setPhotoUrl('');
    setVideoUrl('');
    setMediaType('none');
    if (photoFileInputRef.current) photoFileInputRef.current.value = '';
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
  };

  // Hashtag quick inserter
  const handleInsertHashtag = (tag: string) => {
    setCaption((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} #${tag} ` : `#${tag} `;
    });
  };

  // 3. Publish New Post to Firestore (STRICTLY SANITIZED - ZERO UNDEFINED)
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setGateActionText('publish a post on the Locker Room Social Wall');
      setIsGuestGateOpen(true);
      return;
    }

    const trimmedCaption = caption.trim();
    if (!trimmedCaption && !photoUrl && !videoUrl && !selectedFile) {
      showToast('info', 'Empty Post', 'Please write a message or attach a photo/video.');
      return;
    }

    setIsUploading(true);

    try {
      let finalPhotoUrl = photoUrl;
      let finalVideoUrl = videoUrl;

      // Detect video URL embeds if present in caption
      const detectedEmbed = detectVideoEmbed(trimmedCaption);
      if (detectedEmbed && !finalVideoUrl) {
        finalVideoUrl = detectedEmbed.originalUrl;
      }

      // Upload file to media vault if a local file was chosen
      if (selectedFile) {
        try {
          const uploadedUrl = await uploadToMediaVault(
            selectedFile,
            selectedFile.type.startsWith('video/') ? 'videos' : 'photos'
          );
          if (selectedFile.type.startsWith('video/')) {
            finalVideoUrl = uploadedUrl;
            finalPhotoUrl = '';
          } else {
            finalPhotoUrl = uploadedUrl;
            finalVideoUrl = '';
          }
        } catch (uploadErr) {
          console.warn('Storage upload fallback (using base64 / local URL):', uploadErr);
        }
      }

      const isVideo = Boolean(finalVideoUrl || (selectedFile && selectedFile.type.startsWith('video/')));
      const isPhoto = Boolean(finalPhotoUrl || (selectedFile && selectedFile.type.startsWith('image/')));

      const authorName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Athlete Member';
      const authorAvatar = profile?.avatarUrl || user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
      const authorRole = profile?.role || role || 'athlete';
      const authorSchool = profile?.highSchool || (profile as any)?.school || 'High School Prep';
      const authorClassYear = profile?.gradYear ? String(profile.gradYear) : '2026';

      // Build safe payload object without any undefined fields
      const rawPayload: any = {
        feedType: isVideo ? 'video' : 'lounge',
        sport: composerSport.replace(/^[^\w\s]+/, '').trim() || 'General Sports',
        caption: trimmedCaption || '',
        imageUrl: isPhoto && finalPhotoUrl ? finalPhotoUrl : '',
        videoUrl: isVideo && finalVideoUrl ? finalVideoUrl : '',
        authorId: user.uid,
        authorName,
        authorAvatar,
        authorRole,
        authorSport: composerSport.replace(/^[^\w\s]+/, '').trim(),
        authorSchool,
        authorClassYear,
        isVerifiedRecruit: Boolean(profile?.isVerified ?? true),
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

      if (showMetricInputs) {
        rawPayload.metrics = {
          fortyYard: metricForty ? `${metricForty}s` : '',
          vertical: metricVert ? `${metricVert}"` : '',
          gpa: metricGpa || '',
          height: metricHeight || '',
          verified: Boolean(profile?.isVerified ?? true)
        };
      }

      // Sanitize recursively so NO undefined is ever sent
      const cleanPayload = sanitizeFirestorePayload(rawPayload);

      // Push to Firestore posts collection
      const postsRef = collection(db, 'posts');
      const docRef = await addDoc(postsRef, cleanPayload);

      // Optimistically prepend to feed state
      const createdPost: LockerPost = {
        id: docRef.id,
        feedType: rawPayload.feedType,
        sport: rawPayload.sport,
        caption: rawPayload.caption,
        imageUrl: rawPayload.imageUrl || undefined,
        videoUrl: rawPayload.videoUrl || undefined,
        authorId: user.uid,
        authorName,
        authorAvatar,
        authorRole,
        authorSport: rawPayload.authorSport,
        authorSchool,
        authorClassYear,
        isVerifiedRecruit: rawPayload.isVerifiedRecruit,
        metrics: rawPayload.metrics,
        reactions: { hype: 1, sauce: 0, clutch: 0, bigW: 0 },
        userReactions: { [user.uid]: 'hype' },
        commentsCount: 0,
        createdAt: new Date().toISOString()
      };

      setPosts((prev) => [createdPost, ...prev.filter((p) => p.id !== docRef.id)]);

      // Dual-index into media_vault & highlights collection for cross-app discovery
      if (rawPayload.videoUrl || rawPayload.imageUrl) {
        try {
          await addDoc(
            collection(db, 'media_vault'),
            sanitizeFirestorePayload({
              title: trimmedCaption || (isVideo ? 'Game Film Clip' : 'Action Shot'),
              originalUrl: isVideo ? rawPayload.videoUrl : rawPayload.imageUrl,
              previewUrl: isVideo ? rawPayload.videoUrl : rawPayload.imageUrl,
              mediaType: isVideo ? 'video' : 'image',
              sport: rawPayload.sport,
              category: isVideo ? 'Game Film' : 'Game Action',
              creatorId: user.uid,
              creatorName: authorName,
              creatorRole: authorRole,
              sourcePostId: docRef.id,
              createdAt: serverTimestamp()
            })
          );

          // If this post contains a video reel, sync to highlight collection
          if (isVideo && rawPayload.videoUrl) {
            await saveAthleteHighlight({
              userId: user.uid,
              userName: authorName,
              userRole: authorRole,
              userAvatar: authorAvatar,
              title: trimmedCaption || `${rawPayload.sport} Highlight Tape`,
              videoUrl: rawPayload.videoUrl,
              sport: rawPayload.sport,
              position: profile?.position || '',
              gradYear: authorClassYear,
              highSchool: authorSchool,
              state: profile?.state || '',
              isFeatured: false,
              highlightId: docRef.id
            });
          }
        } catch (vaultErr) {
          console.warn('Media vault / highlight dual-index notice:', vaultErr);
        }
      }

      // Reset form
      setCaption('');
      handleRemoveMedia();
      setShowMetricInputs(false);
      setMetricForty('');
      setMetricVert('');
      setMetricGpa('');
      setMetricHeight('');
      setIsComposerOpen(false);

      showToast('success', '⚡ Post Live!', 'Your post is now published on the Locker Room Social Wall!');
    } catch (err: any) {
      console.error('Error posting to Social Wall:', err);
      showToast('error', 'Post Error', err?.message || 'Could not publish post. Please retry.');
    } finally {
      setIsUploading(false);
    }
  };

  // 4. Reactions Handler (🔥 HYPE, 🥫 SAUCE, ⚡ CLUTCH, 🏆 BIG W, ❤️ HEART)
  const handleReaction = async (postId: string, reactionType: ReactionType) => {
    if (!user) {
      setGateActionText(`give a ${reactionType.toUpperCase()} reaction`);
      setIsGuestGateOpen(true);
      return;
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const currentReaction = p.userReactions?.[user.uid];
        const newReactions = { ...p.reactions };

        if (currentReaction === reactionType) {
          newReactions[reactionType] = Math.max(0, (newReactions[reactionType] || 1) - 1);
          const updatedUserReactions = { ...p.userReactions };
          delete updatedUserReactions[user.uid];
          return { ...p, reactions: newReactions, userReactions: updatedUserReactions };
        } else {
          if (currentReaction) {
            newReactions[currentReaction] = Math.max(0, (newReactions[currentReaction] || 1) - 1);
          }
          newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;
          return {
            ...p,
            reactions: newReactions,
            userReactions: { ...p.userReactions, [user.uid]: reactionType }
          };
        }
      })
    );

    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(
        postRef,
        sanitizeFirestorePayload({
          [`reactions.${reactionType}`]: increment(1)
        })
      ).catch(() => {});
    } catch (e) {
      // Non-blocking
    }
  };

  // Double-tap on media for instant TikTok/Instagram like animation
  const handleDoubleTap = (postId: string) => {
    setBurstingPostId(postId);
    handleReaction(postId, 'hype');
    setTimeout(() => setBurstingPostId(null), 900);
  };

  // 5. Follow / Unfollow Athlete System
  const handleToggleFollow = async (authorId: string, authorName: string) => {
    if (!user) {
      setGateActionText(`follow ${authorName}`);
      setIsGuestGateOpen(true);
      return;
    }

    if (user.uid === authorId) {
      showToast('info', 'Your Profile', 'This is your own profile!');
      return;
    }

    const isFollowing = followingSet.has(authorId);
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (isFollowing) {
        next.delete(authorId);
        showToast('info', 'Unfollowed', `You unfollowed ${authorName}.`);
      } else {
        next.add(authorId);
        showToast('success', 'Following', `⚡ You are now following ${authorName}!`);
      }
      return next;
    });

    try {
      const followDocRef = doc(db, 'users', user.uid, 'following', authorId);
      if (isFollowing) {
        await deleteDoc(followDocRef);
      } else {
        await setDoc(
          followDocRef,
          sanitizeFirestorePayload({
            followedUserId: authorId,
            followedUserName: authorName,
            followedAt: serverTimestamp()
          })
        );
      }
    } catch (e) {
      console.warn('Follow write notice:', e);
    }
  };

  // 6. Inline Comment Submission
  const handleSendInlineComment = async (postId: string) => {
    if (!user) {
      setGateActionText('leave a comment on this highlight');
      setIsGuestGateOpen(true);
      return;
    }

    const text = (inlineComments[postId] || '').trim();
    if (!text) return;

    setSubmittingCommentPostId(postId);
    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const authorName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Athlete';
      const authorAvatar = profile?.avatarUrl || user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
      const authorRole = profile?.role || role || 'athlete';

      await addDoc(
        commentsRef,
        sanitizeFirestorePayload({
          authorId: user.uid,
          authorName,
          authorAvatar,
          authorRole,
          text,
          createdAt: serverTimestamp()
        })
      );

      // Increment comments count on post
      const postRef = doc(db, 'posts', postId);
      await updateDoc(
        postRef,
        sanitizeFirestorePayload({
          commentsCount: increment(1)
        })
      ).catch(() => {});

      // Optimistically update local post comments count
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p))
      );

      setInlineComments((prev) => ({ ...prev, [postId]: '' }));
      showToast('success', 'Comment Sent', 'Your comment was posted to the discussion!');
    } catch (err: any) {
      console.error('Comment error:', err);
      showToast('error', 'Comment Failed', err.message || 'Could not send comment.');
    } finally {
      setSubmittingCommentPostId(null);
    }
  };

  // 7. Watchlist / Scout Radar Toggle
  const handleToggleWatchlist = (athleteId: string, athleteName: string) => {
    if (!user) {
      setGateActionText('bookmark athletes to your scout radar');
      setIsGuestGateOpen(true);
      return;
    }

    setWatchlistedAthletes((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) {
        next.delete(athleteId);
        showToast('info', 'Removed from Radar', `${athleteName} removed from scout watchlist.`);
      } else {
        next.add(athleteId);
        showToast('success', 'Scout Radar Added', `🎯 ${athleteName} added to your recruiting board!`);
      }
      return next;
    });
  };

  // 8. Share Post / Web Share API / Copy Link
  const handleSharePost = async (post: LockerPost) => {
    const shareUrl = `${window.location.origin}/locker-room?post=${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.authorName} on Just1Play Social Wall`,
          text: post.caption || 'Check out this athlete highlight on Just1Play!',
          url: shareUrl
        });
        showToast('success', 'Shared!', 'Highlight shared successfully.');
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      showToast('success', 'Link Copied', 'Post URL copied to clipboard. Ready to share!');
    }
  };

  // 9. Delete Post (for author or admin)
  const handleDeletePost = async (postId: string, authorId: string) => {
    if (!user) return;
    const isAdmin = canonicalRole === 'admin' || canonicalRole === 'director';
    if (user.uid !== authorId && !isAdmin) {
      showToast('error', 'Permission Denied', 'You can only delete your own posts.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this post from the Social Wall?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'posts', postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast('info', 'Post Deleted', 'The post was removed from the Social Wall.');
    } catch (e: any) {
      console.error('Delete error:', e);
      showToast('error', 'Delete Failed', e.message || 'Could not delete post.');
    }
  };

  // 10. Filter & Sort Computation
  const filteredAndSortedPosts = useMemo(() => {
    return posts
      .filter((post) => {
        // Sport Filter
        if (selectedSport !== 'All') {
          const cleanSport = selectedSport.replace(/^[^\w\s]+/, '').trim().toLowerCase();
          const postSport = (post.sport || '').toLowerCase();
          const authorSport = (post.authorSport || '').toLowerCase();
          if (!postSport.includes(cleanSport) && !authorSport.includes(cleanSport)) {
            return false;
          }
        }

        // Media Filter
        if (mediaFilter === 'video' && !post.videoUrl) return false;
        if (mediaFilter === 'photo' && !post.imageUrl) return false;
        if (mediaFilter === 'text' && (post.videoUrl || post.imageUrl)) return false;
        if (mediaFilter === 'verified' && !post.isVerifiedRecruit) return false;

        // Search Query Match
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCaption = post.caption?.toLowerCase().includes(q);
          const matchName = post.authorName?.toLowerCase().includes(q);
          const matchSchool = post.authorSchool?.toLowerCase().includes(q);
          const matchSport = post.sport?.toLowerCase().includes(q);
          return matchCaption || matchName || matchSchool || matchSport;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'hype') {
          const totalReactionsA = Object.values(a.reactions || {}).reduce((sum, n) => sum + (n || 0), 0);
          const totalReactionsB = Object.values(b.reactions || {}).reduce((sum, n) => sum + (n || 0), 0);
          return totalReactionsB - totalReactionsA;
        }
        if (sortBy === 'comments') {
          return (b.commentsCount || 0) - (a.commentsCount || 0);
        }
        // Default: Newest first
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
  }, [posts, selectedSport, mediaFilter, sortBy, searchQuery]);

  return (
    <div className={`space-y-6 pb-36 ${className}`}>
      
      {/* 1. Header Banner & Quick Stories Carousel (Instagram/TikTok style) */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/95 border border-slate-800 p-5 shadow-2xl backdrop-blur-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-2xl bg-gradient-to-tr from-[#FF6A00] to-rose-500 text-white shadow-lg shadow-orange-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                <span>Unified Locker Social Wall</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#00B8D4]/20 text-[#00B8D4] border border-[#00B8D4]/40 text-[10px] font-mono font-bold tracking-wider">
                  INSTA / REELS SYNC
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              One unified social hub for sharing high school & college highlights, photos, video links, comments, likes & follows.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              title="Refresh Social Wall"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#FF6A00]' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              onClick={() => setIsComposerOpen((prev) => !prev)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6A00] via-rose-500 to-amber-500 hover:brightness-110 text-white text-xs font-black font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-orange-500/25 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Post</span>
            </button>
          </div>
        </div>

        {/* Athlete Stories Reel Carousel */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {/* Create Story / Quick Upload Avatar */}
            <div
              onClick={() => setIsComposerOpen(true)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0"
            >
              <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center">
                  <img
                    src={profile?.avatarUrl || user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                    alt="My Story"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="absolute bottom-0 right-0 p-1 rounded-full bg-[#FF6A00] text-white border-2 border-slate-900 shadow">
                  <Plus className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-300 font-bold truncate max-w-[64px]">
                Your Story
              </span>
            </div>

            {/* Dynamic Athletes Story Avatars */}
            {dynamicStories.map((story) => {
              const isFollowing = followingSet.has(story.id);
              return (
                <div
                  key={story.id}
                  onClick={() => {
                    if (story.reelUrl) {
                      setActiveTheaterPost({
                        id: `story-${story.id}`,
                        feedType: 'video',
                        sport: story.sport,
                        caption: `🔥 Featured spotlight highlight reel from ${story.name} (${story.school})!`,
                        videoUrl: story.reelUrl,
                        authorId: story.id,
                        authorName: story.name,
                        authorAvatar: story.avatar,
                        authorRole: 'athlete',
                        authorSport: story.sport,
                        authorSchool: story.school,
                        isVerifiedRecruit: story.verified,
                        reactions: { hype: 1, sauce: 0, clutch: 0, bigW: 0 },
                        commentsCount: 0,
                        createdAt: new Date().toISOString()
                      });
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0"
                >
                  <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-[#FF6A00] via-rose-500 to-[#00B8D4] animate-pulse-subtle flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden p-0.5">
                      <img
                        src={story.avatar}
                        alt={story.name}
                        className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    {story.verified && (
                      <div className="absolute -top-0.5 -right-0.5 p-0.5 rounded-full bg-cyan-500 text-slate-950 border border-slate-900">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 font-medium truncate max-w-[64px]">
                    {story.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Hashtag Bar */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1 shrink-0">
            <TrendingUp className="w-3 h-3 text-[#FF6A00]" />
            Trending:
          </span>
          {['D1Bound', 'FridayNightLights', 'BuzzerBeater', 'RecruitingTape', 'StateChamps', 'SpeedKills', 'GirlsFlagFootball'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchQuery(tag)}
              className="px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-[#00B8D4] border border-slate-800 hover:border-slate-700 text-[11px] font-mono font-medium transition-all shrink-0 cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Unified Expandable Rich Post Composer (Photos, Videos, Video Links, Text, Stats) */}
      <AnimatePresence>
        {isComposerOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            onSubmit={handlePublishPost}
            className="overflow-hidden rounded-3xl bg-slate-900/95 border border-[#FF6A00]/40 p-5 shadow-2xl space-y-4 ring-1 ring-[#FF6A00]/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={profile?.avatarUrl || user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                  alt="My Avatar"
                  className="w-9 h-9 rounded-2xl object-cover border border-[#FF6A00]/50"
                />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {profile?.displayName || user?.displayName || 'Post as Member'}
                  </h4>
                  <span className="text-[10px] font-mono text-cyan-400 capitalize">
                    {profile?.role || role || 'Athlete'}
                  </span>
                </div>
              </div>

              {/* Sport Selector Pill */}
              <div className="flex items-center gap-1.5">
                <select
                  value={composerSport}
                  onChange={(e) => setComposerSport(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#FF6A00] cursor-pointer"
                >
                  {EXPANDED_SPORT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Caption Textarea */}
            <div className="space-y-2">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Share game film, photos, stats or paste links (YouTube Shorts, Hudl, TikTok, Vimeo, MP4)..."
                rows={3}
                className="w-full p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00] transition-all resize-none"
              />

              {/* Hashtag Insertion Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-slate-500">Quick tags:</span>
                {['D1Bound', 'HighlightTape', 'FridayNightLights', 'CombineResults'].map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => handleInsertHashtag(tag)}
                    className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Media Attachment Previews */}
            {mediaType === 'photo' && photoUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black max-h-64 flex items-center justify-center group">
                <img
                  src={photoUrl}
                  alt="Post preview"
                  className="w-full h-auto max-h-64 object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 text-rose-400 hover:text-white hover:bg-rose-600 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {mediaType === 'video' && videoUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black max-h-72 group">
                {videoUrl.startsWith('blob:') || videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm') || videoUrl.endsWith('.mov') ? (
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full h-auto max-h-72 object-contain mx-auto"
                  />
                ) : (
                  <div className="p-4 text-center space-y-2">
                    <Video className="w-8 h-8 text-[#FF6A00] mx-auto" />
                    <p className="text-xs font-mono text-slate-300 truncate">{videoUrl}</p>
                    <span className="text-[10px] font-mono text-cyan-400">Embedded Video Link Verified</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 text-rose-400 hover:text-white hover:bg-rose-600 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Athletic Combine Metrics Drawer (Optional) */}
            {showMetricInputs && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
              >
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Combine Metrics (Optional Badge)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="40-yd Dash (e.g. 4.38)"
                    value={metricForty}
                    onChange={(e) => setMetricForty(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder='Vert Jump (e.g. 40.5")'
                    value={metricVert}
                    onChange={(e) => setMetricVert(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="GPA (e.g. 3.9)"
                    value={metricGpa}
                    onChange={(e) => setMetricGpa(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Height (e.g. 6'2&quot;)"
                    value={metricHeight}
                    onChange={(e) => setMetricHeight(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-mono"
                  />
                </div>
              </motion.div>
            )}

            {/* Bottom Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              
              {/* Media Attachment Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => photoFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Upload Photo / Graphic from device"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Attach Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => videoFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-[#FF6A00] border border-slate-800 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Upload Video Reel from device"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Attach Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMetricInputs((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    showMetricInputs
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Attach Athlete Combine Stats"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Metrics</span>
                </button>

                {/* Hidden File Inputs */}
                <input
                  ref={photoFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF6A00] to-rose-500 hover:brightness-110 text-white text-xs font-black font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Publishing...' : 'Share to Feed'}</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* 3. Filter, Search & View Controls Bar */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
        
        {/* Top Filter Row: Search & Sport Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search athlete names, schools, sports, tags..."
              className="w-full pl-9.5 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Media Format Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Posts' },
              { id: 'video', label: '🎬 Highlights' },
              { id: 'photo', label: '📸 Photos' },
              { id: 'text', label: '💬 Lounge' },
              { id: 'verified', label: '⭐ Recruits' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setMediaFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap ${
                  mediaFilter === f.id
                    ? 'bg-[#FF6A00] text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View Mode & Sort Dropdowns */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-[#FF6A00] cursor-pointer"
            >
              <option value="newest">Latest Feed</option>
              <option value="hype">Most Hype 🔥</option>
              <option value="comments">Most Discussed 💬</option>
            </select>

            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('stream')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'stream' ? 'bg-slate-800 text-[#00B8D4]' : 'text-slate-500 hover:text-white'
                }`}
                title="Instagram Stream View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-slate-800 text-[#00B8D4]' : 'text-slate-500 hover:text-white'
                }`}
                title="Grid Masonry View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sport Category Pills Carousel */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedSport('All')}
            className={`px-3 py-1 rounded-xl font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedSport === 'All'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Sports
          </button>
          {EXPANDED_SPORT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedSport(cat)}
              className={`px-3 py-1 rounded-xl font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedSport === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Unified Main Feed (Instagram / TikTok Style Stream) */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#FF6A00] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Syncing Locker Room feed with Firebase...</p>
        </div>
      ) : filteredAndSortedPosts.length > 0 ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'max-w-xl mx-auto space-y-6'
          }
        >
          {filteredAndSortedPosts.map((post) => {
            const detectedVideo = post.videoUrl ? detectVideoEmbed(post.videoUrl) : null;
            const isWatchlisted = watchlistedAthletes.has(post.authorId);
            const isFollowing = followingSet.has(post.authorId);
            const userReaction = post.userReactions?.[user?.uid || ''];
            const isBursting = burstingPostId === post.id;
            const hasLiked = userReaction === 'hype';

            return (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-slate-900/95 border border-slate-800 hover:border-slate-700/90 transition-all shadow-2xl overflow-hidden flex flex-col justify-between group"
              >
                {/* Post Top Header (Author info + Follow button + More options) */}
                <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-800/60 bg-slate-950/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                        alt={post.authorName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#FF6A00]/60 p-0.5"
                      />
                      {post.isVerifiedRecruit && (
                        <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-[#00B8D4] text-[#090D16] border border-slate-900">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-xs sm:text-sm text-white truncate">
                          {post.authorName}
                        </h3>
                        <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                          {post.sport || 'Athlete'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {post.authorSchool || 'Prep Academy'}
                        {post.authorClassYear ? ` • Class of '${post.authorClassYear.slice(-2)}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Follow Button & Bookmark */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {user?.uid !== post.authorId && (
                      <button
                        onClick={() => handleToggleFollow(post.authorId, post.authorName)}
                        className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isFollowing
                            ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                            : 'bg-gradient-to-r from-[#FF6A00] to-rose-500 text-white shadow-md shadow-orange-500/20'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleWatchlist(post.authorId, post.authorName)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isWatchlisted
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-white'
                      }`}
                      title={isWatchlisted ? 'On Scout Watchlist' : 'Add to Scout Radar'}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>

                    {user && (user.uid === post.authorId || canonicalRole === 'admin' || canonicalRole === 'director') && (
                      <button
                        onClick={() => handleDeletePost(post.id, post.authorId)}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
                        title="Delete post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Media Container (Double tap triggers like animation!) */}
                {post.videoUrl ? (
                  <div
                    onDoubleClick={() => handleDoubleTap(post.id)}
                    className="relative bg-black aspect-video flex items-center justify-center overflow-hidden select-none"
                  >
                    {detectedVideo ? (
                      <iframe
                        src={detectedVideo.embedUrl}
                        title={`Video from ${post.authorName}`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={post.videoUrl}
                        controls
                        playsInline
                        muted={muted}
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Double-tap burst flame/heart overlay */}
                    <AnimatePresence>
                      {isBursting && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1.3, opacity: 1 }}
                          exit={{ scale: 1.8, opacity: 0 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                        >
                          <div className="p-6 rounded-full bg-black/60 backdrop-blur-md shadow-2xl">
                            <Flame className="w-20 h-20 text-[#FF6A00] drop-shadow-[0_0_20px_#FF6A00]" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Fullscreen Theater Button */}
                    <button
                      onClick={() => setActiveTheaterPost(post)}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md transition-all cursor-pointer"
                      title="Fullscreen Theater"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : post.imageUrl ? (
                  <div
                    onDoubleClick={() => handleDoubleTap(post.id)}
                    onClick={() => setActiveTheaterPost(post)}
                    className="relative bg-black max-h-[500px] overflow-hidden cursor-pointer group/img select-none flex items-center justify-center"
                  >
                    <img
                      src={post.imageUrl}
                      alt={post.caption || 'Post image'}
                      className="w-full h-auto max-h-[500px] object-cover group-hover/img:scale-102 transition-transform duration-500"
                    />

                    {/* Double-tap burst heart overlay */}
                    <AnimatePresence>
                      {isBursting && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1.3, opacity: 1 }}
                          exit={{ scale: 1.8, opacity: 0 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                        >
                          <div className="p-6 rounded-full bg-black/60 backdrop-blur-md shadow-2xl">
                            <Heart className="w-20 h-20 text-rose-500 fill-rose-500 drop-shadow-[0_0_20px_#f43f5e]" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-end p-3">
                      <span className="px-2.5 py-1 rounded-xl bg-black/80 text-white text-[10px] font-mono flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-[#00B8D4]" />
                        <span>View Photo</span>
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Post Body: Actions, Captions, Comments & Quick Input */}
                <div className="p-4 space-y-3">
                  
                  {/* Action Buttons Bar: Likes, Comments, Share, Micro-reactions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      {/* Main Hype / Heart Like Button */}
                      <button
                        onClick={() => handleReaction(post.id, 'hype')}
                        className={`p-2 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer font-mono font-black text-xs ${
                          hasLiked
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-md shadow-rose-500/20'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <Flame className={`w-4 h-4 ${hasLiked ? 'text-rose-400 fill-rose-400' : ''}`} />
                        <span>{post.reactions?.hype || 0}</span>
                      </button>

                      {/* Discussion Comment Button */}
                      <button
                        onClick={() => setActiveCommentPost(post)}
                        className="p-2 rounded-2xl bg-slate-950 text-slate-400 hover:text-cyan-400 border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 text-xs font-mono font-bold transition-all cursor-pointer"
                        title="Open comments drawer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.commentsCount || 0}</span>
                      </button>

                      {/* Share Button */}
                      <button
                        onClick={() => handleSharePost(post)}
                        className="p-2 rounded-2xl bg-slate-950 text-slate-400 hover:text-[#FF6A00] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                        title="Share highlight"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Secondary Sports Reactions (Sauce, Clutch, Big W) */}
                    <div className="flex items-center gap-1">
                      {[
                        { type: 'sauce', label: '🥫', count: post.reactions?.sauce || 0, title: 'Sauce' },
                        { type: 'clutch', label: '⚡', count: post.reactions?.clutch || 0, title: 'Clutch' },
                        { type: 'bigW', label: '🏆', count: post.reactions?.bigW || 0, title: 'Big W' }
                      ].map((r) => {
                        const isSelected = userReaction === r.type;
                        return (
                          <button
                            key={r.type}
                            onClick={() => handleReaction(post.id, r.type as ReactionType)}
                            title={r.title}
                            className={`px-2 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-[#00B8D4]/20 text-[#00B8D4] border border-[#00B8D4]/50'
                                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/80'
                            }`}
                          >
                            <span>{r.label}</span>
                            <span className="text-[10px]">{r.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Athletic Metrics Badge if available */}
                  {post.metrics && (post.metrics.fortyYard || post.metrics.vertical || post.metrics.gpa) && (
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono pt-1">
                      {post.metrics.fortyYard && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                          ⚡ 40YD: {post.metrics.fortyYard}
                        </span>
                      )}
                      {post.metrics.vertical && (
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                          🚀 VERT: {post.metrics.vertical}
                        </span>
                      )}
                      {post.metrics.gpa && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                          🎓 GPA: {post.metrics.gpa}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Post Caption Text with Author Name */}
                  <div className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-line space-y-1">
                    <span className="font-bold text-white mr-1.5">{post.authorName}</span>
                    <span>{post.caption}</span>
                  </div>

                  {/* View Comments Drawer Trigger */}
                  {(post.commentsCount || 0) > 0 && (
                    <button
                      onClick={() => setActiveCommentPost(post)}
                      className="text-xs font-mono text-slate-500 hover:text-[#00B8D4] transition-colors cursor-pointer block"
                    >
                      View all {post.commentsCount} replies & discussions...
                    </button>
                  )}

                  {/* Inline Quick Comment Input Bar */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2">
                    <img
                      src={profile?.avatarUrl || user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                      alt="Avatar"
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                    <input
                      type="text"
                      value={inlineComments[post.id] || ''}
                      onChange={(e) =>
                        setInlineComments((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendInlineComment(post.id);
                        }
                      }}
                      placeholder="Add a comment or scout note..."
                      className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                    {(inlineComments[post.id] || '').trim() && (
                      <button
                        onClick={() => handleSendInlineComment(post.id)}
                        disabled={submittingCommentPostId === post.id}
                        className="text-xs font-mono font-black uppercase text-[#FF6A00] hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        {submittingCommentPostId === post.id ? '...' : 'Post'}
                      </button>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-[10px] font-mono text-slate-600">
                    {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                    {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-3 p-6">
          <Flame className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No posts matching filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Be the first member to share a highlight, photo, or game announcement in this category!
          </p>
          <button
            onClick={() => {
              setSelectedSport('All');
              setMediaFilter('all');
              setSearchQuery('');
              setIsComposerOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#FF6A00] text-white text-xs font-bold font-mono inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Post</span>
          </button>
        </div>
      )}

      {/* 5. Fullscreen Lightbox / Theater Modal */}
      <AnimatePresence>
        {activeTheaterPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setActiveTheaterPost(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={activeTheaterPost.authorAvatar}
                    alt={activeTheaterPost.authorName}
                    className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                  />
                  <div>
                    <h3 className="font-bold text-xs text-white">{activeTheaterPost.authorName}</h3>
                    <p className="text-[10px] font-mono text-slate-400">
                      {activeTheaterPost.sport} • {activeTheaterPost.authorSchool}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTheaterPost(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px]">
                {activeTheaterPost.videoUrl ? (
                  detectVideoEmbed(activeTheaterPost.videoUrl) ? (
                    <iframe
                      src={detectVideoEmbed(activeTheaterPost.videoUrl)!.embedUrl}
                      title="Theater Video"
                      className="w-full h-full min-h-[450px] border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={activeTheaterPost.videoUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full max-h-[60vh] object-contain"
                    />
                  )
                ) : activeTheaterPost.imageUrl ? (
                  <img
                    src={activeTheaterPost.imageUrl}
                    alt="Theater Photo"
                    className="w-full h-full max-h-[65vh] object-contain"
                  />
                ) : null}
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-200 line-clamp-2 max-w-xl">
                  {activeTheaterPost.caption}
                </p>
                <button
                  onClick={() => {
                    const target = activeTheaterPost;
                    setActiveTheaterPost(null);
                    setActiveCommentPost(target);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#00B8D4] text-[#090D16] text-xs font-bold font-mono uppercase flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Discussion</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Comments Drawer */}
      <LockerCommentsDrawer
        isOpen={Boolean(activeCommentPost)}
        onClose={() => setActiveCommentPost(null)}
        postId={activeCommentPost?.id || ''}
        postAuthorName={activeCommentPost?.authorName || 'Athlete'}
        onRequireAuth={() => {
          setGateActionText('join the discussion');
          setIsGuestGateOpen(true);
        }}
      />

      {/* 7. Guest Auth Gate Modal */}
      <GuestAuthGateModal
        isOpen={isGuestGateOpen}
        onClose={() => setIsGuestGateOpen(false)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        actionText={gateActionText}
      />

      {/* 8. Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default SocialWall;
