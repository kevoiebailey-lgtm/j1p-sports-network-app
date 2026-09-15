import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Trophy, 
  Flame, 
  Eye, 
  Star, 
  Upload, 
  Play, 
  PlusCircle, 
  Search, 
  Filter, 
  Heart, 
  MessageSquare, 
  Share2, 
  Sparkles, 
  ShieldCheck, 
  Film, 
  Tv, 
  Camera, 
  UserCheck, 
  TrendingUp, 
  Link as LinkIcon, 
  Globe, 
  CheckCircle2, 
  Award, 
  ChevronRight, 
  ExternalLink,
  X,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Volume2,
  VolumeX,
  User,
  Zap,
  Bookmark,
  ShoppingCart,
  Calendar,
  Grid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { storage, db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { parseVideoUrl, VideoType } from '../../lib/videoEmbedUtils';
import { compressVideo } from '../../lib/videoCompressor';
import { uploadVideoWithRetry } from '../../lib/resilientVideoUploader';
import { IMPORTED_CSV_VIDEOS } from '../../lib/importedCsvVideos';
import { recordVideoView } from '../../lib/videoViewService';
import { MediaVaultItem, MediaVaultType, DigitalPurchaseOrder } from '../../types/mediaVault';
import { INITIAL_MEDIA_VAULT_ITEMS, MAJOR_EVENTS_LIST } from '../../lib/mediaVaultData';
import { MediaFilterBar } from './MediaFilterBar';
import { MediaCard } from './MediaCard';
import { PhotoLightboxModal } from './PhotoLightboxModal';
import { VideoReelPlayerModal } from './VideoReelPlayerModal';
import { DigitalPurchaseModal } from './DigitalPurchaseModal';
import { PinnedMediaDrawer } from './PinnedMediaDrawer';
import { AiHighlightClipperModal } from './AiHighlightClipperModal';
import { VerticalReelStudioModal } from './VerticalReelStudioModal';

interface DedicatedVideoPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const DedicatedVideoPage: React.FC<DedicatedVideoPageProps> = ({ onNavigateTab }) => {
  const { user, profile, role } = useAuth();
  const isAdmin = role === 'admin' || profile?.role === 'admin' || user?.email === 'kevoiebailey@gmail.com';

  // 1. Filtering & Discovery State
  const [activeMediaType, setActiveMediaType] = useState<MediaVaultType>('all');
  const [selectedSport, setSelectedSport] = useState<string>('All Sports');
  const [selectedEvent, setSelectedEvent] = useState<string>('All Events / Showcases');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 2. Active Modals & Drawers State
  const [activePhoto, setActivePhoto] = useState<MediaVaultItem | null>(null);
  const [activeVideoItem, setActiveVideoItem] = useState<MediaVaultItem | null>(null);
  const [purchaseItem, setPurchaseItem] = useState<MediaVaultItem | null>(null);
  const [isPinnedDrawerOpen, setIsPinnedDrawerOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isClipperModalOpen, setIsClipperModalOpen] = useState<boolean>(false);
  const [isReelStudioOpen, setIsReelStudioOpen] = useState<boolean>(false);

  // 3. Persistent Purchases & Pinned Items
  const [purchasedMediaIds, setPurchasedMediaIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('just1play_purchased_media');
      return saved ? JSON.parse(saved) : { 'photo-flag-02': true, 'reel-bball-01': true, 'reel-fb-03': true };
    } catch {
      return { 'photo-flag-02': true, 'reel-bball-01': true, 'reel-fb-03': true };
    }
  });

  const [pinnedMediaIds, setPinnedMediaIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('just1play_pinned_media');
      return saved ? JSON.parse(saved) : { 'photo-flag-02': true, 'reel-bball-01': true };
    } catch {
      return { 'photo-flag-02': true, 'reel-bball-01': true };
    }
  });

  const [likedMediaIds, setLikedMediaIds] = useState<Record<string, boolean>>({});

  // 4. Firestore & Dynamic Media Items
  const [firestoreItems, setFirestoreItems] = useState<MediaVaultItem[]>([]);

  // 5. Toast Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync with Firestore Admin & Member uploaded videos
  useEffect(() => {
    try {
      const q = query(collection(db, 'AdminVideos'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched: MediaVaultItem[] = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const parsed = parseVideoUrl(data.videoUrl || '');
            return {
              id: docSnap.id,
              type: 'video_reel',
              title: data.title || 'Athlete Highlight Reel',
              description: data.description || 'Member-submitted athlete highlight video.',
              sport: data.category || 'Football',
              eventName: data.eventName || 'North Jersey Lightning Tryouts',
              eventDate: data.createdAt ? data.createdAt.split('T')[0] : '2026-07-25',
              mediaUrl: data.videoUrl || '',
              thumbnailUrl: data.thumbnailUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800',
              resolution: '1080p 60fps HD',
              price: 9.99,
              venue: data.venue || 'Sportika Sports Complex, NJ',
              opponents: data.opponents || 'Select Tournament Bracket',
              photographer: data.authorName || 'Community Creator',
              taggedAthletes: [
                {
                  name: data.athleteName || data.authorName || 'Featured Prospect',
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
                  school: data.athleteSchool || 'High School Prep',
                  gradYear: '2026',
                  position: 'Athlete',
                  sport: data.category || 'Football'
                }
              ],
              duration: '03:15',
              isPurchased: false,
              isPinnedToProfile: false,
              viewCount: data.viewCount || 1850,
              likesCount: data.likesCount || 64,
              ratingScore: data.ratingScore || 9.2,
              isOfficial: false,
              isMemberSubmission: true,
              videoType: data.videoType || parsed.type,
              embedUrl: data.embedUrl || parsed.embedUrl,
              createdAt: data.createdAt || new Date().toISOString()
            };
          });
          setFirestoreItems(fetched);
        } else {
          setFirestoreItems([]);
        }
      }, (err) => {
        console.warn('Firestore media listener notice:', err);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error fetching media from Firestore:', err);
    }
  }, []);

  // Combine Seed Media Vault, CSV videos, and Firestore uploads
  const allMediaItems: MediaVaultItem[] = useMemo(() => {
    // Map CSV videos to MediaVaultItems
    const csvMapped: MediaVaultItem[] = IMPORTED_CSV_VIDEOS.map(v => ({
      id: v.id,
      type: v.category === 'Training' ? 'raw_tape' : 'video_reel',
      title: v.title,
      description: v.description,
      sport: v.category === 'Flag Football' ? "Girls' Flag Football" : (v.category || 'Football'),
      eventName: 'Tri-State Elite 7v7 Championship',
      eventDate: v.uploadDate ? v.uploadDate.split('T')[0] : '2026-07-20',
      mediaUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailImage || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800',
      resolution: '4K Broadcast HD',
      price: 9.99,
      venue: 'Iron Peak Sports Complex, NJ',
      opponents: v.title,
      photographer: 'Just1Play Media Network',
      taggedAthletes: [
        {
          name: v.title.split(' vs ')[0] || 'Varsity Prospect',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
          school: 'New Jersey Prep Circuit',
          gradYear: '2026',
          position: 'Prospect',
          sport: v.category || 'Football'
        }
      ],
      duration: '02:45',
      isPurchased: false,
      isPinnedToProfile: false,
      viewCount: v.viewCount || 2400,
      likesCount: v.likesCount || 120,
      ratingScore: v.ratingScore || 9.4,
      isOfficial: true,
      videoType: v.videoType,
      embedUrl: v.embedUrl,
      createdAt: v.uploadDate || new Date().toISOString()
    }));

    const combined = [...INITIAL_MEDIA_VAULT_ITEMS, ...firestoreItems, ...csvMapped];

    // Deduplicate and apply purchase & pinned states
    const seen = new Set<string>();
    return combined.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).map(item => ({
      ...item,
      isPurchased: !!purchasedMediaIds[item.id] || item.isPurchased,
      isPinnedToProfile: !!pinnedMediaIds[item.id]
    }));
  }, [firestoreItems, purchasedMediaIds, pinnedMediaIds]);

  // Deep Link URL Detection - Automatically open media item from query param
  useEffect(() => {
    if (allMediaItems.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const photoId = params.get('photo') || params.get('p');
      const videoId = params.get('id') || params.get('v');

      if (photoId) {
        const match = allMediaItems.find(m => m.id === photoId);
        if (match) setActivePhoto(match);
      } else if (videoId) {
        const match = allMediaItems.find(m => m.id === videoId);
        if (match) setActiveVideoItem(match);
      }
    }
  }, [allMediaItems]);

  // Record view count when a video or photo is opened
  useEffect(() => {
    const activeItem = activeVideoItem || activePhoto;
    if (activeItem?.id) {
      recordVideoView({
        videoId: activeItem.id,
        videoTitle: activeItem.title,
        userId: user?.uid,
        userRole: role,
        videoSource: activeItem.isMemberSubmission ? 'member' : 'admin'
      });
    }
  }, [activeVideoItem?.id, activePhoto?.id, user?.uid, role]);

  // Filter Media Vault Items
  const filteredMediaItems = useMemo(() => {
    let list = [...allMediaItems];

    // 1. Media Type Filter
    if (activeMediaType !== 'all') {
      list = list.filter(item => item.type === activeMediaType);
    }

    // 2. Sport Filter
    if (selectedSport !== 'All Sports') {
      list = list.filter(item => item.sport.toLowerCase() === selectedSport.toLowerCase());
    }

    // 3. Event Showcase Filter
    if (selectedEvent !== 'All Events / Showcases') {
      list = list.filter(item => item.eventName.toLowerCase() === selectedEvent.toLowerCase());
    }

    // 4. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        item.eventName.toLowerCase().includes(q) ||
        item.sport.toLowerCase().includes(q) ||
        item.venue.toLowerCase().includes(q) ||
        (item.taggedAthletes && item.taggedAthletes.some(a => a.name.toLowerCase().includes(q) || a.school.toLowerCase().includes(q)))
      );
    }

    return list;
  }, [allMediaItems, activeMediaType, selectedSport, selectedEvent, searchQuery]);

  // Top 3 Most Watched Highlight Reels for the Podium
  const podiumTopReels = useMemo(() => {
    return allMediaItems
      .filter(item => item.type === 'video_reel' || item.type === 'raw_tape')
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 3);
  }, [allMediaItems]);

  // Pinned Items list
  const pinnedItems = useMemo(() => {
    return allMediaItems.filter(item => !!pinnedMediaIds[item.id]);
  }, [allMediaItems, pinnedMediaIds]);

  // Toggle Pin Item to Profile
  const handleTogglePin = (item: MediaVaultItem) => {
    const isCurrentlyPinned = !!pinnedMediaIds[item.id];
    const updated = { ...pinnedMediaIds, [item.id]: !isCurrentlyPinned };
    if (isCurrentlyPinned) {
      delete updated[item.id];
    }
    setPinnedMediaIds(updated);
    try {
      localStorage.setItem('just1play_pinned_media', JSON.stringify(updated));
    } catch {}

    if (!isCurrentlyPinned) {
      showToast(`⭐ Pinned "${item.title.slice(0, 24)}..." to your Scout Profile!`);
    } else {
      showToast(`Unpinned from your Scout Profile.`);
    }
  };

  // Toggle Like Item
  const handleToggleLike = (itemId: string) => {
    setLikedMediaIds(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Handle Item Click (Open Lightbox for Photo or Player for Video)
  const handleOpenItem = (item: MediaVaultItem) => {
    if (item.type === 'photo') {
      setActivePhoto(item);
    } else {
      setActiveVideoItem(item);
    }
  };

  // Handle Successful Digital Purchase
  const handlePurchaseSuccess = (order: DigitalPurchaseOrder) => {
    const updatedPurchases = { ...purchasedMediaIds, [order.mediaId]: true };
    setPurchasedMediaIds(updatedPurchases);
    try {
      localStorage.setItem('just1play_purchased_media', JSON.stringify(updatedPurchases));
    } catch {}

    showToast(`⚡ High-Res 4K Download Unlocked! Watermark removed.`);
  };

  // Member Upload Form State
  const [uploaderMode, setUploaderMode] = useState<'url' | 'file'>('url');
  const [inputTitle, setInputTitle] = useState<string>('');
  const [inputDescription, setInputDescription] = useState<string>('');
  const [inputCategory, setInputCategory] = useState<string>("Girls' Flag Football");
  const [inputEventName, setInputEventName] = useState<string>('Tri-State Elite 7v7 Championship');
  const [inputAthleteName, setInputAthleteName] = useState<string>('');
  const [inputAthleteSchool, setInputAthleteSchool] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const handleMemberSubmitHighlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) {
      setUploadError('Please provide a title for the highlight video.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const authorName = profile?.displayName || user?.displayName || 'Community Member';
      const authorRole = role.replace('_', ' ').toUpperCase();

      if (uploaderMode === 'url') {
        if (!inputUrl.trim()) {
          setUploadError('Please enter a valid video link (YouTube, Vimeo, Hudl, TikTok, Instagram).');
          setIsUploading(false);
          return;
        }

        const parsed = parseVideoUrl(inputUrl.trim());

        const newDoc = {
          title: inputTitle.trim(),
          description: inputDescription.trim() || `Submitted by ${authorName}`,
          videoUrl: inputUrl.trim(),
          videoType: parsed.type,
          embedUrl: parsed.embedUrl,
          category: inputCategory,
          eventName: inputEventName,
          athleteName: inputAthleteName.trim() || authorName,
          athleteSchool: inputAthleteSchool.trim() || 'High School Prep',
          authorName,
          uploadedByRole: authorRole,
          uploadedBy: user?.uid || profile?.uid || 'member-guest',
          createdAt: new Date().toISOString(),
          viewCount: 150,
          ratingScore: 9.2,
          isMemberSubmission: true
        };

        await addDoc(collection(db, 'AdminVideos'), newDoc);
      } else {
        if (!uploadFile) {
          setUploadError('Please select a video file (.MP4 or .MOV).');
          setIsUploading(false);
          return;
        }

        let fileToUpload = uploadFile;
        if (uploadFile.size > 8 * 1024 * 1024) {
          try {
            fileToUpload = await compressVideo(uploadFile, {
              maxResolution: '720p',
              maxSizeMB: 40,
              onProgress: (pct) => setUploadProgress(Math.round(pct * 0.4))
            });
          } catch (cErr) {
            fileToUpload = uploadFile;
          }
        }

        const timestamp = Date.now();
        const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `member-videos/${timestamp}_${safeName}`;
        const storageRef = ref(storage, storagePath);

        try {
          const downloadUrl = await uploadVideoWithRetry({
            storageRef,
            file: fileToUpload,
            metadata: { contentType: fileToUpload.type || 'video/mp4' },
            maxRetries: 3,
            onProgress: (info) => {
              const pct = 40 + Math.round((info.bytesTransferred / info.totalBytes) * 60);
              setUploadProgress(prev => Math.max(prev, pct));
            }
          });

          const newDoc = {
            title: inputTitle.trim(),
            description: inputDescription.trim() || `Native video reel uploaded by ${authorName}`,
            videoUrl: downloadUrl,
            videoType: 'native',
            embedUrl: downloadUrl,
            category: inputCategory,
            eventName: inputEventName,
            athleteName: inputAthleteName.trim() || authorName,
            athleteSchool: inputAthleteSchool.trim() || 'High School Prep',
            authorName,
            uploadedByRole: authorRole,
            uploadedBy: user?.uid || profile?.uid || 'member-guest',
            createdAt: new Date().toISOString(),
            viewCount: 220,
            ratingScore: 9.4,
            isMemberSubmission: true
          };

          await addDoc(collection(db, 'AdminVideos'), newDoc);
        } catch (err) {
          console.warn('Native video storage upload fallback triggered:', err);
        }
      }

      setIsUploading(false);
      setUploadSuccess(true);
      setInputTitle('');
      setInputDescription('');
      setInputUrl('');
      setUploadFile(null);
      setInputAthleteName('');
      setInputAthleteSchool('');

      setTimeout(() => {
        setUploadSuccess(false);
        setIsUploadModalOpen(false);
      }, 2000);
    } catch (err) {
      console.error('Highlight submission error:', err);
      setUploadError('An error occurred during submission. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 min-h-screen bg-[#161C22]">
      
      {/* Toast Notification Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-[#1E2630] border border-[#F59E0B] text-white shadow-[0_0_30px_rgba(245,158,11,0.3)] text-xs font-mono font-bold flex items-center gap-2.5 backdrop-blur-xl"
          >
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HERO HEADER BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#161C22] via-[#1E2630] to-[#161C22] border border-[#2D3748] p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#00F2FE]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-xs font-mono font-black uppercase tracking-widest">
              <Film className="w-3.5 h-3.5" />
              <span>MEDIA VAULT & HIGHLIGHT HUB</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black uppercase text-white tracking-tight font-sans">
              OFFICIAL 4K GAME FILM & <span className="text-[#F59E0B]">PRO HIGHLIGHTS</span><span className="text-[#00F2FE]">.</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Explore high-resolution action photography, cinematic video reels, and uncut coaching tape from major prep tournaments. Analyze athletic mechanics with slow-motion controls, purchase full-resolution digital downloads, and pin media directly to your recruiting profile.
            </p>

            {/* Quick Metrics Strip */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161C22] border border-[#2D3748] text-slate-200">
                <Camera className="w-4 h-4 text-[#F59E0B]" />
                <span><strong className="text-white font-bold">24.2 MP</strong> Pro RAW Photos</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161C22] border border-[#2D3748] text-slate-200">
                <Film className="w-4 h-4 text-[#00F2FE]" />
                <span><strong className="text-white font-bold">4K 60fps</strong> Video Reels</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161C22] border border-[#2D3748] text-slate-200">
                <Tv className="w-4 h-4 text-purple-400" />
                <span><strong className="text-white font-bold">All-22</strong> Coaching Tape</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161C22] border border-[#2D3748] text-slate-200">
                <Eye className="w-4 h-4 text-[#10B981]" />
                <span><strong className="text-white font-bold">320,000+</strong> Total Views</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 self-start lg:self-center shrink-0">
            <button
              onClick={() => setIsReelStudioOpen(true)}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-black uppercase tracking-wider font-mono text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(236,72,153,0.4)] transition-all transform hover:scale-[1.02] cursor-pointer"
            >
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
              <span>AI 9:16 Vertical Reel Studio</span>
            </button>

            <button
              onClick={() => setIsClipperModalOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#00F2FE] to-[#0284C7] hover:from-[#38BDF8] hover:to-[#0369A1] text-black font-black uppercase tracking-wider font-mono text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,242,254,0.4)] transition-all transform hover:scale-[1.02] cursor-pointer"
            >
              <Film className="w-4 h-4 stroke-[2.5]" />
              <span>AI Highlight Auto-Clipper</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black uppercase tracking-wider font-mono text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all transform hover:scale-[1.02] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Submit Media / Highlight Tape</span>
            </button>

            <button
              onClick={() => setIsPinnedDrawerOpen(true)}
              className="px-6 py-3 rounded-2xl bg-[#1E2630] hover:bg-[#283340] text-slate-200 border border-[#2D3748] font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Bookmark className="w-4 h-4 text-[#F59E0B]" />
              <span>View My Pinned Profile Media ({pinnedItems.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOP WATCHED PODIUM LEADERBOARD */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-[#F59E0B] border border-amber-500/40">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black uppercase text-white font-sans tracking-tight flex items-center gap-2">
                <span>TOP WATCHED RECRUITING REELS</span>
                <span className="text-[#F59E0B]">.</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Most streamed prospect tape across the Just1Play Media Network.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-[#00F2FE] font-bold hidden sm:inline">
            ⚡ Real-Time Scout Engagement
          </span>
        </div>

        {/* Podium Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {podiumTopReels.map((reel, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;

            return (
              <div
                key={reel.id}
                onClick={() => handleOpenItem(reel)}
                className={`group relative rounded-3xl overflow-hidden border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isFirst
                    ? 'bg-gradient-to-b from-amber-500/15 via-[#1E2630] to-[#1E2630] border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.25)] md:-translate-y-1.5'
                    : isSecond
                    ? 'bg-gradient-to-b from-slate-400/15 via-[#1E2630] to-[#1E2630] border-slate-400/40'
                    : 'bg-gradient-to-b from-amber-700/15 via-[#1E2630] to-[#1E2630] border-amber-700/40'
                }`}
              >
                {/* Media Aspect Container */}
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  <img
                    src={reel.thumbnailUrl || reel.mediaUrl}
                    alt={reel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1E2630] via-transparent to-black/40" />

                  {/* Rank Crown Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono uppercase flex items-center gap-1.5 shadow-lg ${
                      isFirst
                        ? 'bg-[#F59E0B] text-slate-950'
                        : isSecond
                        ? 'bg-slate-300 text-slate-950'
                        : 'bg-amber-700 text-white'
                    }`}>
                      <Trophy className="w-3.5 h-3.5" />
                      <span>#{idx + 1} Reel</span>
                    </div>
                  </div>

                  {/* Electric Cyan Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-[#00F2FE]/90 text-slate-950 flex items-center justify-center shadow-[0_0_25px_rgba(0,242,254,0.6)] group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-slate-950 ml-0.5 stroke-[2]" />
                    </div>
                  </div>

                  <div className="absolute bottom-2 right-3 text-[10px] font-mono text-[#00F2FE] font-bold">
                    {reel.duration}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#F59E0B] font-bold uppercase">{reel.sport}</span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-slate-400" />
                      <span>{reel.viewCount.toLocaleString()} views</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-[#F59E0B] transition-colors line-clamp-1">
                    {reel.title}
                  </h3>

                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {reel.description}
                  </p>

                  <div className="pt-2 border-t border-[#2D3748] flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="truncate max-w-[170px]">{reel.eventName}</span>
                    <span className="text-[#00F2FE] font-bold">{reel.ratingScore}/10 Score</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. STICKY TOP FILTERING & DISCOVERY BAR */}
      <MediaFilterBar
        activeType={activeMediaType}
        onTypeChange={setActiveMediaType}
        selectedSport={selectedSport}
        onSportChange={setSelectedSport}
        selectedEvent={selectedEvent}
        onEventChange={setSelectedEvent}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenPinnedDrawer={() => setIsPinnedDrawerOpen(true)}
        pinnedCount={pinnedItems.length}
        totalCount={filteredMediaItems.length}
      />

      {/* 4. MEDIA VAULT CARD GRID */}
      <div className="space-y-4">
        {filteredMediaItems.length === 0 ? (
          <div className="py-20 text-center space-y-4 rounded-3xl bg-[#1E2630] border border-[#2D3748] p-8">
            <div className="w-16 h-16 rounded-2xl bg-[#161C22] border border-[#2D3748] text-slate-500 flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white">No media matched your filters</h3>
              <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto">
                Try switching the media type tab, clearing your search query, or selecting "All Sports".
              </p>
            </div>
            <button
              onClick={() => {
                setActiveMediaType('all');
                setSelectedSport('All Sports');
                setSelectedEvent('All Events / Showcases');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-xl bg-[#F59E0B] text-slate-950 text-xs font-mono font-black uppercase tracking-wider cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredMediaItems.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onOpenItem={handleOpenItem}
                onOpenPurchase={(it) => setPurchaseItem(it)}
                onTogglePin={handleTogglePin}
                onToggleLike={handleToggleLike}
                isLiked={likedMediaIds[item.id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. FULLSCREEN PHOTO LIGHTBOX MODAL */}
      <PhotoLightboxModal
        item={activePhoto}
        onClose={() => setActivePhoto(null)}
        onOpenPurchase={(it) => {
          setActivePhoto(null);
          setPurchaseItem(it);
        }}
        onTogglePin={handleTogglePin}
        onNavigateTab={onNavigateTab}
      />

      {/* 6. FULLSCREEN VIDEO REEL & RAW TAPE PLAYER MODAL */}
      <VideoReelPlayerModal
        item={activeVideoItem}
        onClose={() => setActiveVideoItem(null)}
        onTogglePin={handleTogglePin}
        onToggleLike={handleToggleLike}
        isLiked={activeVideoItem ? likedMediaIds[activeVideoItem.id] : false}
        onNavigateTab={onNavigateTab}
      />

      {/* 7. DIGITAL PURCHASE & HIGH-RES CHECKOUT MODAL */}
      <DigitalPurchaseModal
        item={purchaseItem}
        onClose={() => setPurchaseItem(null)}
        onSuccess={handlePurchaseSuccess}
      />

      {/* 8. PINNED MEDIA DRAWER */}
      <PinnedMediaDrawer
        isOpen={isPinnedDrawerOpen}
        onClose={() => setIsPinnedDrawerOpen(false)}
        pinnedItems={pinnedItems}
        onOpenItem={handleOpenItem}
        onUnpinItem={handleTogglePin}
        onNavigateTab={onNavigateTab}
      />

      {/* 9. MEMBER UPLOAD MODAL */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl bg-[#161C22] border border-[#2D3748] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#2D3748] bg-[#1E2630]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-[#F59E0B] border border-amber-500/40">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase text-white font-sans">
                      SUBMIT HIGHLIGHT REEL OR GAME FILM
                    </h2>
                    <p className="text-xs font-mono text-slate-400">
                      Showcase your film to verified college coaches and scouts
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-2 rounded-xl bg-[#161C22] hover:bg-slate-800 text-slate-400 hover:text-white border border-[#2D3748] transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {uploadSuccess ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-[#10B981]/20 border-2 border-[#10B981] text-[#10B981] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                      <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                    </div>
                    <h3 className="text-lg font-black uppercase text-white font-sans">
                      Highlight Tape Submitted!
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Your media tape is now active in the Just1Play Network feed and searchable by recruiters.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleMemberSubmitHighlight} className="space-y-4">
                    {uploadError && (
                      <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-mono flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {/* Mode Toggle: URL vs File */}
                    <div className="flex rounded-xl bg-[#1E2630] p-1 border border-[#2D3748]">
                      <button
                        type="button"
                        onClick={() => setUploaderMode('url')}
                        className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                          uploaderMode === 'url' ? 'bg-[#F59E0B] text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Web Link (YouTube / Hudl / Vimeo)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploaderMode('file')}
                        className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                          uploaderMode === 'file' ? 'bg-[#F59E0B] text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Upload .MP4 / .MOV Video
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-slate-300 font-bold">Highlight Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Maya Sanchez 2026 Junior Season Tape"
                        value={inputTitle}
                        onChange={(e) => setInputTitle(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2630] border border-[#2D3748] text-white text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                      />
                    </div>

                    {uploaderMode === 'url' ? (
                      <div className="space-y-1">
                        <label className="text-xs font-mono uppercase text-slate-300 font-bold">Video URL *</label>
                        <input
                          type="url"
                          placeholder="https://youtu.be/... or https://vimeo.com/..."
                          value={inputUrl}
                          onChange={(e) => setInputUrl(e.target.value)}
                          required={uploaderMode === 'url'}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2630] border border-[#2D3748] text-white text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-xs font-mono uppercase text-slate-300 font-bold">Select Video File *</label>
                        <input
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          required={uploaderMode === 'file'}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#1E2630] border border-[#2D3748] text-white text-xs font-mono file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-mono file:font-bold file:bg-[#F59E0B] file:text-slate-950 cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-mono uppercase text-slate-300 font-bold">Sport</label>
                        <select
                          value={inputCategory}
                          onChange={(e) => setInputCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2630] border border-[#2D3748] text-white text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                        >
                          <option value="Basketball">Basketball</option>
                          <option value="Girls' Flag Football">Girls' Flag Football</option>
                          <option value="Lacrosse">Lacrosse</option>
                          <option value="Volleyball">Volleyball</option>
                          <option value="Soccer">Soccer</option>
                          <option value="Track & Field">Track & Field</option>
                          <option value="Football">Football</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-mono uppercase text-slate-300 font-bold">Showcase Event</label>
                        <select
                          value={inputEventName}
                          onChange={(e) => setInputEventName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2630] border border-[#2D3748] text-white text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                        >
                          {MAJOR_EVENTS_LIST.filter(e => e !== 'All Events / Showcases').map(evt => (
                            <option key={evt} value={evt}>{evt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-mono uppercase text-slate-300 font-bold">Athlete Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Maya Sanchez"
                          value={inputAthleteName}
                          onChange={(e) => setInputAthleteName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2630] border border-[#2D3748] text-white text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-mono uppercase text-slate-300 font-bold">High School / Club</label>
                        <input
                          type="text"
                          placeholder="e.g. West Orange High"
                          value={inputAthleteSchool}
                          onChange={(e) => setInputAthleteSchool(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2630] border border-[#2D3748] text-white text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-slate-300 font-bold">Description / Scout Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Key stats, combine measurements, game situation..."
                        value={inputDescription}
                        onChange={(e) => setInputDescription(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#1E2630] border border-[#2D3748] text-white text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                      />
                    </div>

                    {isUploading && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                          <span>Uploading & Processing...</span>
                          <span className="text-[#F59E0B] font-bold">{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#1E2630] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#F59E0B] to-[#00F2FE] transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isUploading}
                      className="w-full py-3.5 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Publishing to Network...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 stroke-[2.5]" />
                          <span>Publish Highlight Reel</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Highlight Auto-Clipper Modal */}
      <AiHighlightClipperModal
        isOpen={isClipperModalOpen}
        onClose={() => setIsClipperModalOpen(false)}
        gameTitle="Tri-State Championship Game 1"
        sport={selectedSport !== 'All Sports' ? selectedSport : "Girls' Flag Football"}
      />

      {/* AI 9:16 Vertical Reel Studio Modal */}
      <VerticalReelStudioModal
        isOpen={isReelStudioOpen}
        onClose={() => setIsReelStudioOpen(false)}
        sport={selectedSport !== 'All Sports' ? selectedSport : 'Basketball'}
        videoTitle="Tri-State Game of the Week Viral Highlights"
      />
    </div>
  );
};
