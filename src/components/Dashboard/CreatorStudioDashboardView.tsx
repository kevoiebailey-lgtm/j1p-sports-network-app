import React, { useState, useEffect } from 'react';
import {
  Camera,
  HardDrive,
  DollarSign,
  Plus,
  Tag,
  Sparkles,
  CheckCircle2,
  Trash2,
  Play,
  Image as ImageIcon,
  Film,
  Eye,
  Share2,
  Flame,
  Award,
  CreditCard,
  TrendingUp,
  Percent,
  Wallet,
  ExternalLink,
  ShieldCheck,
  FolderPlus,
  RefreshCw,
  ShoppingBag,
  Sliders,
  UploadCloud,
  Calendar,
  ChevronDown,
  ArrowRight,
  X
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  getDocs,
  getDocsFromServer,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserProfile, GalleryMediaItem } from '../../types';
import { GoogleDriveSyncModal } from '../Admin/GoogleDriveSyncModal';
import { CreatorPayoutConfigModule } from '../Creator/CreatorPayoutConfigModule';
import { CreatorDriveDropzone } from '../Creator/CreatorDriveDropzone';
import { GoogleDriveVideoUploadModal } from '../Drive/GoogleDriveVideoUploadModal';
import { CreatorManageBookings } from '../booking/CreatorManageBookings';
import { 
  getDriveAccessToken, 
  fetchCreatorDriveFolders, 
  checkDrivePermissions 
} from '../../lib/googleDriveService';
import { resetFirestoreQuotaState } from '../../lib/firestoreQuotaGuard';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

export interface CreatorSaleRecord {
  id: string;
  orderId: string;
  mediaId: string;
  mediaTitle: string;
  grossAmount: number;
  creatorPayout: number;
  platformFee: number;
  platformFeePercent: number;
  buyerEmail?: string;
  currency: string;
  status: string;
  createdAt?: any;
}

export type CreatorSubNavTab = 'portfolio' | 'bookings' | 'ledger' | 'cloud_sync';

export const CreatorStudioDashboardView: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // 4 Consolidated Focused Sub-Navigation Categories
  const [activeTab, setActiveTab] = useState<CreatorSubNavTab>('portfolio');
  
  // Sub-tabs for consolidated categories
  const [ledgerSubTab, setLedgerSubTab] = useState<'transactions' | 'splits'>('transactions');
  const [cloudSyncSubTab, setCloudSyncSubTab] = useState<'dropzone' | 'drive_album'>('dropzone');

  // Add Media Dropdown Menu State & Unified Modal State
  const [isAddMediaOpen, setIsAddMediaOpen] = useState<boolean>(false);
  const [showUnifiedUploadModal, setShowUnifiedUploadModal] = useState<boolean>(false);

  // Handle URL deep-linking to specific tabs (backwards-compatible with old query params)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'bookings' || tabParam === 'gamedays' || tabParam === 'schedule' || location.pathname.includes('/bookings')) {
      setActiveTab('bookings');
    } else if (tabParam === 'payouts' || tabParam === 'rates' || tabParam === 'pricing' || location.pathname.includes('/payout')) {
      setActiveTab('ledger');
      setLedgerSubTab('splits');
    } else if (tabParam === 'sales' || tabParam === 'ledger') {
      setActiveTab('ledger');
      setLedgerSubTab('transactions');
    } else if (tabParam === 'upload' || tabParam === 'dropzone') {
      setActiveTab('cloud_sync');
      setCloudSyncSubTab('dropzone');
    } else if (tabParam === 'gdrive' || tabParam === 'import') {
      setActiveTab('cloud_sync');
      setCloudSyncSubTab('drive_album');
    } else if (tabParam === 'portfolio' || tabParam === 'inventory') {
      setActiveTab('portfolio');
    }
  }, [searchParams, location.pathname]);

  // Data State
  const [creatorMedia, setCreatorMedia] = useState<GalleryMediaItem[]>([]);
  const [creatorSales, setCreatorSales] = useState<CreatorSaleRecord[]>([]);
  const [athletesList, setAthletesList] = useState<UserProfile[]>([]);
  const [showDriveImportModal, setShowDriveImportModal] = useState<boolean>(false);
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);
  const [showDriveVideoModal, setShowDriveVideoModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isResyncing, setIsResyncing] = useState<boolean>(false);
  const [lastResyncedTime, setLastResyncedTime] = useState<string | null>(null);

  // Function to force a fresh pull from Firestore servers & Google Drive (Only 1 primary sync trigger)
  const handleForceResyncData = async () => {
    if (!db || !user?.uid) {
      showToast('error', 'Authentication Required', 'Please ensure you are signed in to re-sync data.');
      return;
    }

    setIsResyncing(true);
    try {
      // 1. Reset Firestore quota/offline state flag in session
      resetFirestoreQuotaState();

      // 2. Fetch fresh gallery items authored by this creator directly from Firestore server (bypassing local cache)
      const galleryRef = collection(db, 'gallery');
      const qPhotographer = query(galleryRef, where('photographerId', '==', user.uid));
      const qAuthor = query(galleryRef, where('authorId', '==', user.uid));

      const [snapPhotographer, snapAuthor] = await Promise.allSettled([
        getDocsFromServer(qPhotographer).catch(() => getDocs(qPhotographer)),
        getDocsFromServer(qAuthor).catch(() => getDocs(qAuthor))
      ]);

      const freshItemsMap = new Map<string, GalleryMediaItem>();

      if (snapPhotographer.status === 'fulfilled' && snapPhotographer.value) {
        snapPhotographer.value.docs.forEach((docSnap) => {
          freshItemsMap.set(docSnap.id, {
            id: docSnap.id,
            ...docSnap.data()
          } as GalleryMediaItem);
        });
      }

      if (snapAuthor.status === 'fulfilled' && snapAuthor.value) {
        snapAuthor.value.docs.forEach((docSnap) => {
          freshItemsMap.set(docSnap.id, {
            id: docSnap.id,
            ...docSnap.data()
          } as GalleryMediaItem);
        });
      }

      const freshMediaList = Array.from(freshItemsMap.values());
      setCreatorMedia(freshMediaList);

      // 3. Fetch fresh creator sales records from server
      const salesRef = collection(db, 'users', user.uid, 'creator_sales');
      try {
        const snapSales = await getDocsFromServer(salesRef).catch(() => getDocs(salesRef));
        const freshSales = snapSales.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        } as CreatorSaleRecord));
        setCreatorSales(freshSales);
      } catch (salesErr) {
        console.warn('Fresh sales fetch warning:', salesErr);
      }

      // 4. Also check Google Drive connectivity and fresh folder sync if token is active
      let driveSyncNote = '';
      const driveToken = getDriveAccessToken();
      if (driveToken) {
        try {
          const [quotaInfo, driveFolders] = await Promise.all([
            checkDrivePermissions(driveToken),
            fetchCreatorDriveFolders(driveToken)
          ]);
          driveSyncNote = ` • Google Drive connected (${driveFolders.length} folders detected, ${quotaInfo.percentUsed}% storage used)`;
        } catch (driveErr) {
          console.warn('Google Drive ping on re-sync:', driveErr);
        }
      }

      // 5. Broadcast app-wide sync event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('just1play:gallery-updated', {
          detail: { forceRefresh: true, timestamp: Date.now() }
        }));
      }

      const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastResyncedTime(nowFormatted);

      showToast(
        'success', 
        'Data Successfully Re-synced!', 
        `Loaded ${freshMediaList.length} media assets directly from Firestore server.${driveSyncNote}`
      );
    } catch (err: any) {
      console.error('Error during data re-sync:', err);
      showToast('error', 'Re-sync Incomplete', err?.message || 'Could not bypass local cache completely.');
    } finally {
      setIsResyncing(false);
      setLoading(false);
    }
  };

  // Video embed form state
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSport, setVideoSport] = useState('Basketball');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState('');
  const [videoPrice, setVideoPrice] = useState('14.99');
  const [selectedAthleteUids, setSelectedAthleteUids] = useState<string[]>([]);
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);

  // Platform cut constant: 15% to platform / 85% to Creator
  const PLATFORM_CUT_PERCENT = 15;
  const CREATOR_CUT_PERCENT = 85;

  // 1. Fetch Creator's published media from Firestore
  useEffect(() => {
    if (!db || !user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const galleryRef = collection(db, 'gallery');
    const q = query(
      galleryRef, 
      where('photographerId', '==', user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items: GalleryMediaItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        } as GalleryMediaItem));
        setCreatorMedia(items);
        setLoading(false);
      },
      (err) => {
        console.warn('Creator gallery fetch note:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // 2. Fetch Creator's sales records
  useEffect(() => {
    if (!db || !user?.uid) return;

    const salesRef = collection(db, 'users', user.uid, 'creator_sales');
    const unsub = onSnapshot(
      salesRef,
      (snapshot) => {
        const sales: CreatorSaleRecord[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        } as CreatorSaleRecord));
        setCreatorSales(sales);
      },
      (err) => {
        console.warn('Creator sales fetch note:', err);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // 3. Fetch athlete directory for tagging
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        if (!snap.empty) {
          setAthletesList(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        }
      },
      (err) => console.warn('Athletes list error:', err)
    );
    return () => unsub();
  }, []);

  // Compute Financial Metrics
  const totalGrossRevenue = creatorSales.reduce((acc, sale) => acc + (sale.grossAmount || 0), 0);
  const totalCreatorPayout = creatorSales.reduce((acc, sale) => acc + (sale.creatorPayout || 0), 0);
  const totalPlatformCut = creatorSales.reduce((acc, sale) => acc + (sale.platformFee || 0), 0);

  const handleToggleAthleteTag = (uid: string) => {
    setSelectedAthleteUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Submit Video Highlights
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user?.uid) return;
    if (!videoTitle.trim() || !videoUrl.trim()) {
      showToast('error', 'Missing Information', 'Please provide a title and video link.');
      return;
    }

    setIsSubmittingVideo(true);
    try {
      const taggedAthletes = athletesList
        .filter((a) => selectedAthleteUids.includes(a.uid))
        .map((a) => ({ uid: a.uid, displayName: a.displayName, sport: a.sport || 'Sports' }));

      const newDocRef = doc(collection(db, 'gallery'));
      const videoDocData = {
        title: videoTitle.trim(),
        caption: `${videoTitle.trim()} (Highlight Reel)`,
        sport: videoSport,
        category: 'Game Highlights',
        eventName: 'Creator Showcase Reel',
        albumName: 'Creator Highlights',
        photographerId: user.uid,
        photographerName: profile?.displayName || user.displayName || 'Official Creator',
        originalUrl: videoUrl.trim(),
        watermarkedUrl: videoThumbnailUrl.trim() || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
        coverUrl: videoThumbnailUrl.trim() || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
        videoUrl: videoUrl.trim(),
        isWatermarked: false,
        price: parseFloat(videoPrice) || 14.99,
        taggedAthletes,
        tags: [videoSport.toLowerCase(), 'creator-highlight', 'video'],
        hypesCount: 0,
        userHypes: {},
        createdAt: serverTimestamp()
      };

      await setDoc(newDocRef, videoDocData);
      showToast('success', 'Highlight Video Published!', 'Video has been listed on the public Just1Play gallery.');
      setShowVideoModal(false);

      // Reset
      setVideoTitle('');
      setVideoUrl('');
      setVideoThumbnailUrl('');
      setSelectedAthleteUids([]);
    } catch (err: any) {
      console.error('Error saving video:', err);
      showToast('error', 'Publication Failed', err?.message || 'Could not publish video.');
    } finally {
      setIsSubmittingVideo(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!db || !confirm('Are you sure you want to remove this media asset?')) return;
    try {
      await deleteDoc(doc(db, 'gallery', mediaId));
      showToast('info', 'Item Removed', 'Media item was removed from your store.');
    } catch (err: any) {
      showToast('error', 'Delete Failed', err?.message || 'Could not delete item.');
    }
  };

  return (
    <div className="space-y-8 font-sans text-slate-100 max-w-7xl mx-auto px-4 py-6 pb-36">
      
      {/* 1. CREATOR STUDIO HERO HEADER */}
      <div className="relative rounded-3xl bg-[#12151C] border border-white/[0.08] p-6 sm:p-8 overflow-hidden backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F0D0]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F0D0]/15 border border-[#00F0D0]/30 text-[#00F0D0] text-xs font-mono font-bold uppercase tracking-wider">
                <Camera className="w-4 h-4 text-[#00F0D0]" />
                <span>CONTENT CREATOR &amp; PHOTOGRAPHER PORTAL</span>
              </div>
              {lastResyncedTime && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Synced at {lastResyncedTime}</span>
                </div>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight text-white font-sans">
              Creator <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0D0] via-teal-300 to-amber-300">Media Studio</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-mono max-w-2xl leading-relaxed">
              Connect your personal Google Drive account to import SD card photo folders in bulk, set custom prices per photo, tag athlete profiles, and receive instant <span className="text-amber-300 font-bold">85% payouts</span> via PayPal.
            </p>
          </div>

          {/* Objective 1: Top Header Action Row (Only ONE Re-Sync Trigger Kept) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleForceResyncData}
              disabled={isResyncing}
              title="Force a fresh pull from Firestore and Google Drive, clearing stale local cache"
              className={`px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 border transition-all cursor-pointer active:scale-[0.97] ${
                isResyncing 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 opacity-80 cursor-wait' 
                  : 'bg-[#181D26] hover:bg-[#1E2532] text-slate-200 hover:text-white border-white/20 hover:border-[#00F0D0]/50 shadow-lg'
              }`}
            >
              <RefreshCw className={`w-4 h-4 text-[#00F0D0] ${isResyncing ? 'animate-spin' : ''}`} />
              <span>{isResyncing ? 'Re-syncing Server...' : 'Re-sync Data'}</span>
            </button>

            <button
              onClick={() => setShowDriveImportModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-[#00F0D0] to-teal-400 hover:from-[#00d6b9] hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_25px_rgba(0,240,208,0.3)] flex items-center justify-center gap-2 transition-all active:scale-[0.97] cursor-pointer"
            >
              <HardDrive className="w-4 h-4 stroke-[2.5]" />
              <span>Import from Google Drive</span>
            </button>

            <button
              onClick={() => setShowVideoModal(true)}
              className="px-5 py-3 bg-[#181D26] hover:bg-[#1E2532] text-white font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/10 hover:border-white/25 flex items-center justify-center gap-2 transition-all active:scale-[0.97] cursor-pointer"
            >
              <Film className="w-4 h-4 text-[#00F0D0]" />
              <span>Embed Video Highlight</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. REVENUE & PERFORMANCE METRIC BENTO CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Creator Net Payout */}
        <div className="p-5 rounded-2xl bg-[#12151C] border border-emerald-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-400 uppercase font-bold">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4" /> Creator Net Earnings
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px]">85% Payout</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            ${totalCreatorPayout.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            {creatorSales.length} total photo/video sales fulfilled
          </p>
        </div>

        {/* Total Gross Volume */}
        <div className="p-5 rounded-2xl bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300 uppercase font-bold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400" /> Gross Media Sales
            </span>
            <span className="text-[10px] text-slate-400 font-mono">100% Vol</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
            ${totalGrossRevenue.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Platform Cut (15%): ${totalPlatformCut.toFixed(2)}
          </p>
        </div>

        {/* Media Inventory */}
        <div className="p-5 rounded-2xl bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300 uppercase font-bold">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#00F0D0]" /> Active Assets
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Storefront</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            {creatorMedia.length}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Available on Just1Play Public Gallery
          </p>
        </div>

        {/* Revenue Split Ratio */}
        <div className="p-5 rounded-2xl bg-[#12151C] border border-teal-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-teal-300 uppercase font-bold">
            <span className="flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-[#00F0D0]" /> Revenue Share Model
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">Auto-Split</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            85% / 15%
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            85% Creator • 15% Platform Host Fee
          </p>
        </div>
      </div>

      {/* Objective 3: CONSOLIDATED SUB-NAVIGATION TABS (4 Focused Categories) */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto no-scrollbar">
        {/* Tab 1: My Portfolio */}
        <button
          type="button"
          onClick={() => setActiveTab('portfolio')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-[0.97] ${
            activeTab === 'portfolio'
              ? 'bg-[#00F0D0]/15 border border-[#00F0D0]/60 text-[#00F0D0] shadow-[0_0_15px_rgba(0,240,208,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>My Portfolio</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'portfolio'
              ? 'bg-[#00F0D0]/20 text-[#00F0D0]'
              : 'bg-white/10 text-slate-300'
          }`}>
            {creatorMedia.length}
          </span>
        </button>

        {/* Tab 2: Gameday Bookings */}
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-[0.97] ${
            activeTab === 'bookings'
              ? 'bg-[#00F0D0]/15 border border-[#00F0D0]/60 text-[#00F0D0] shadow-[0_0_15px_rgba(0,240,208,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#00F0D0]" />
          <span>Gameday Bookings</span>
        </button>

        {/* Tab 3: PayPal Ledger & Splits */}
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-[0.97] ${
            activeTab === 'ledger'
              ? 'bg-[#00F0D0]/15 border border-[#00F0D0]/60 text-[#00F0D0] shadow-[0_0_15px_rgba(0,240,208,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>PayPal Ledger &amp; Splits</span>
        </button>

        {/* Tab 4: Cloud Sync & Storage */}
        <button
          type="button"
          onClick={() => setActiveTab('cloud_sync')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-[0.97] ${
            activeTab === 'cloud_sync'
              ? 'bg-[#00F0D0]/15 border border-[#00F0D0]/60 text-[#00F0D0] shadow-[0_0_15px_rgba(0,240,208,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Cloud Sync &amp; Storage</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: MY PORTFOLIO & PUBLISHED ASSETS */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Objective 2: Consolidated Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tight text-white font-sans flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#00F0D0]" />
                <span>Published Media &amp; Sellable Assets</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Manage your live tournament photos, set download prices, and preview watermarked public assets.
              </p>
            </div>

            {/* Consolidated Action Toolbar Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Primary Action: High-Contrast Hyper Teal Dropdown `+ Add Media` */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAddMediaOpen(!isAddMediaOpen)}
                  className="px-4 py-2.5 rounded-xl bg-[#00F0D0] hover:bg-[#00d6b9] text-slate-950 font-black text-xs uppercase font-mono flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,208,0.35)] transition-all active:scale-[0.97] cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Add Media</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isAddMediaOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAddMediaOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsAddMediaOpen(false)} />
                    <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-64 rounded-2xl bg-[#12151C] border border-white/15 shadow-2xl p-1.5 z-30 space-y-1 font-mono text-xs backdrop-blur-xl animate-fadeIn">
                      <button
                        onClick={() => {
                          setIsAddMediaOpen(false);
                          setActiveTab('cloud_sync');
                          setCloudSyncSubTab('dropzone');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4 text-[#00F0D0]" />
                        <div>
                          <p className="font-bold">Direct Upload (Dropzone)</p>
                          <p className="text-[10px] text-slate-400">Drag & drop raw photos & clips</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setIsAddMediaOpen(false);
                          setShowDriveImportModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <HardDrive className="w-4 h-4 text-amber-400" />
                        <div>
                          <p className="font-bold">Sync from Google Drive Album</p>
                          <p className="text-[10px] text-slate-400">Bulk import SD card folders</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setIsAddMediaOpen(false);
                          setShowVideoModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Film className="w-4 h-4 text-rose-400" />
                        <div>
                          <p className="font-bold">Embed 4K Video Highlight</p>
                          <p className="text-[10px] text-slate-400">Hudl, YouTube, Vimeo reels</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setIsAddMediaOpen(false);
                          setShowDriveVideoModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-slate-200 hover:text-white hover:bg-white/10 transition-colors border-t border-white/10 pt-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="font-bold">Upload 4K Video (Drive)</p>
                          <p className="text-[10px] text-slate-400">Direct master film upload</p>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Secondary Action: Titanium Outline Button `View Public Storefront ↗` */}
              <Link
                to="/gallery"
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-[#12151C] hover:bg-[#181D26] text-slate-300 hover:text-white hover:border-white/25 font-bold text-xs uppercase font-mono flex items-center gap-1.5 transition-all active:scale-[0.97]"
              >
                <span>View Public Storefront</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Progressive Profile Completion Banner for Creators */}
          {user && (!profile?.profileComplete && !profile?.profileCompleted && (!profile?.equipment || !profile?.brandName)) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-slate-900 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white">Creator Setup Incomplete</p>
                  <p className="text-slate-400 text-[11px] font-sans">
                    Add your camera gear, specialty, and brand name to your profile so athletes and directors can credit and book you.
                  </p>
                </div>
              </div>

              <Link
                to="/profile"
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                <span>Complete Creator Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Asset Grid or Objective 4: Polished Zero-State */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#00F0D0]" />
              <span>Loading your media portfolio...</span>
            </div>
          ) : creatorMedia.length === 0 ? (
            <div className="p-12 sm:p-16 rounded-3xl bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] text-center space-y-5">
              {/* Sleek Titanium Camera Icon */}
              <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/10 text-slate-300 flex items-center justify-center mx-auto shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
                <Camera className="w-10 h-10 text-slate-200" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white uppercase font-mono tracking-tight">
                  No Media Assets Published Yet
                </h3>
                <p className="text-xs text-slate-400 font-mono max-w-md mx-auto leading-relaxed">
                  Import game photo albums directly from your Google Drive, drop raw photos via browser dropzone, or embed video highlights to start earning 85% payouts.
                </p>
              </div>

              {/* Single Prominent Primary Button */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowUnifiedUploadModal(true)}
                  className="px-8 py-3.5 rounded-2xl bg-[#00F0D0] hover:bg-[#00d6b9] text-slate-950 font-black text-xs uppercase tracking-wider font-mono shadow-[0_0_25px_rgba(0,240,208,0.35)] cursor-pointer flex items-center gap-2.5 transition-all active:scale-[0.97]"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Import First Album or Video</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {creatorMedia.map((item) => {
                const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price as any) || 9.99;
                const estimatedPayout = Math.round(itemPrice * (CREATOR_CUT_PERCENT / 100) * 100) / 100;

                return (
                  <div
                    key={item.id}
                    className="group rounded-2xl bg-[#12151C] border border-white/[0.08] hover:border-[#00F0D0]/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="relative aspect-square bg-slate-950 overflow-hidden">
                      <img
                        src={item.watermarkedUrl || item.originalUrl || item.coverUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-transparent to-transparent opacity-80" />

                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-white uppercase">
                        {item.sport || 'Sports'}
                      </div>

                      <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-mono font-black shadow-lg">
                        ${itemPrice.toFixed(2)}
                      </div>

                      {item.googleDriveFileId && (
                        <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-blue-900/80 border border-blue-400/40 text-[9px] font-mono text-blue-300 flex items-center gap-1">
                          <HardDrive className="w-3 h-3" /> GDrive Synced
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-white line-clamp-1 group-hover:text-[#00F0D0] transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[10px] font-mono text-slate-400 line-clamp-1">
                          Album: {item.albumName || 'General Showcase'}
                        </p>
                      </div>

                      {/* Revenue Payout Split Callout */}
                      <div className="p-2.5 rounded-xl bg-[#08090C] border border-white/[0.05] space-y-1 text-[10px] font-mono">
                        <div className="flex justify-between text-slate-400">
                          <span>Your Payout (85%):</span>
                          <span className="text-emerald-400 font-bold">${estimatedPayout.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Platform Cut (15%):</span>
                          <span>${(itemPrice - estimatedPayout).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                        <Link
                          to={`/checkout?type=creator_media&mediaId=${item.id}&mediaTitle=${encodeURIComponent(item.title)}&amount=${itemPrice}&creatorId=${user?.uid}&creatorName=${encodeURIComponent(profile?.displayName || 'Creator')}`}
                          className="text-[10px] font-mono text-[#00F0D0] hover:text-teal-300 font-bold flex items-center gap-1"
                        >
                          <ShoppingBag className="w-3 h-3" /> Buy Link
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GAMEDAY BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-6 animate-fadeIn">
          <CreatorManageBookings />
        </div>
      )}

      {/* TAB 3: PAYPAL LEDGER & SPLITS */}
      {activeTab === 'ledger' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tight text-white font-sans flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>PayPal Ledger &amp; Revenue Splits</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Automated 85% creator payout accounting, customer orders, and payout preferences.
              </p>
            </div>

            {/* Sub-toggle between Transaction Ledger & Payout Configuration */}
            <div className="flex items-center gap-2 p-1 bg-[#12151C] border border-white/[0.08] rounded-xl font-mono text-xs">
              <button
                type="button"
                onClick={() => setLedgerSubTab('transactions')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  ledgerSubTab === 'transactions'
                    ? 'bg-[#00F0D0] text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Transactions ({creatorSales.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerSubTab('splits')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  ledgerSubTab === 'splits'
                    ? 'bg-[#00F0D0] text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Payout Settings &amp; Splits
              </button>
            </div>
          </div>

          {ledgerSubTab === 'transactions' ? (
            creatorSales.length === 0 ? (
              <div className="p-12 rounded-3xl bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <Wallet className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white uppercase font-mono">No Sales Completed Yet</h3>
                <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
                  Share your photo albums and highlights with athletes and tournament attendees. Once they purchase via PayPal or Card, orders will populate this ledger instantly.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#08090C] text-slate-400 uppercase font-bold border-b border-white/[0.08]">
                      <tr>
                        <th className="p-4">Order ID</th>
                        <th className="p-4">Asset Title</th>
                        <th className="p-4">Gross Price</th>
                        <th className="p-4">Platform Fee (15%)</th>
                        <th className="p-4 text-emerald-400">Creator Payout (85%)</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] text-slate-300">
                      {creatorSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="p-4 font-mono font-bold text-white">{sale.orderId}</td>
                          <td className="p-4 max-w-[200px] truncate">{sale.mediaTitle}</td>
                          <td className="p-4 font-bold text-amber-400">${(sale.grossAmount || 0).toFixed(2)}</td>
                          <td className="p-4 text-slate-400">${(sale.platformFee || 0).toFixed(2)}</td>
                          <td className="p-4 font-black text-emerald-400 text-sm">
                            ${(sale.creatorPayout || 0).toFixed(2)}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase">
                              {sale.status || 'COMPLETED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <CreatorPayoutConfigModule 
              onSettingsSaved={() => {
                showToast('success', 'Configurations Synchronized', 'Creator payout parameters successfully updated.');
              }}
            />
          )}
        </div>
      )}

      {/* TAB 4: CLOUD SYNC & STORAGE (Combines Drive Sync + Upload Dropzone) */}
      {activeTab === 'cloud_sync' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tight text-white font-sans flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[#00F0D0]" />
                <span>Cloud Sync &amp; Storage Center</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Bulk import SD card photo folders from Google Drive, or upload directly via browser dropzone.
              </p>
            </div>

            {/* Sub-toggle between Dropzone and Drive Album Sync */}
            <div className="flex items-center gap-2 p-1 bg-[#12151C] border border-white/[0.08] rounded-xl font-mono text-xs">
              <button
                type="button"
                onClick={() => setCloudSyncSubTab('dropzone')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  cloudSyncSubTab === 'dropzone'
                    ? 'bg-[#00F0D0] text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Upload Dropzone
              </button>
              <button
                type="button"
                onClick={() => setCloudSyncSubTab('drive_album')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  cloudSyncSubTab === 'drive_album'
                    ? 'bg-[#00F0D0] text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Google Drive Sync
              </button>
            </div>
          </div>

          {cloudSyncSubTab === 'dropzone' ? (
            <CreatorDriveDropzone 
              onSuccess={() => {
                showToast('success', 'Upload Synchronized', 'Media published and visible in My Portfolio.');
                setActiveTab('portfolio');
              }}
            />
          ) : (
            <GoogleDriveSyncModal 
              creatorId={user?.uid}
              creatorName={profile?.displayName || user?.displayName || 'Creator'}
              isCreatorPortal={true}
              onSuccess={() => {
                showToast('success', 'Albums Synchronized', 'Google Drive folder imported to your portfolio.');
                setActiveTab('portfolio');
              }}
            />
          )}
        </div>
      )}

      {/* UNIFIED ADD MEDIA MODAL (Triggered by Zero-State Button "Import First Album or Video") */}
      {showUnifiedUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#12151C] border border-white/20 rounded-3xl p-6 shadow-2xl text-white space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00F0D0]/15 border border-[#00F0D0]/30 text-[#00F0D0] flex items-center justify-center">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white font-sans">
                    Import Media &amp; Sellable Assets
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Select your preferred media ingestion method
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowUnifiedUploadModal(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowUnifiedUploadModal(false);
                  setShowDriveImportModal(true);
                }}
                className="w-full p-4 rounded-2xl bg-[#181D26] hover:bg-[#1E2532] border border-white/10 hover:border-amber-400/50 text-left flex items-center gap-4 transition-all cursor-pointer group"
              >
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 group-hover:scale-105 transition-transform">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-white group-hover:text-amber-300">
                      Sync from Google Drive Album
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">Fastest</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Connect your personal Drive, scan SD card folder batches, and import watermarked photos with 1 click.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowUnifiedUploadModal(false);
                  setActiveTab('cloud_sync');
                  setCloudSyncSubTab('dropzone');
                }}
                className="w-full p-4 rounded-2xl bg-[#181D26] hover:bg-[#1E2532] border border-white/10 hover:border-[#00F0D0]/50 text-left flex items-center gap-4 transition-all cursor-pointer group"
              >
                <div className="p-3 rounded-xl bg-[#00F0D0]/10 border border-[#00F0D0]/30 text-[#00F0D0] group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-white group-hover:text-[#00F0D0]">
                      Direct Upload (Dropzone)
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#00F0D0]/20 text-[#00F0D0] font-bold">Direct</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Drag and drop raw photo files or match clips right from your local machine.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowUnifiedUploadModal(false);
                  setShowVideoModal(true);
                }}
                className="w-full p-4 rounded-2xl bg-[#181D26] hover:bg-[#1E2532] border border-white/10 hover:border-rose-400/50 text-left flex items-center gap-4 transition-all cursor-pointer group"
              >
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 group-hover:scale-105 transition-transform">
                  <Film className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-white group-hover:text-rose-300">
                      Embed 4K Video Highlight
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold">Social</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Publish highlight links from Hudl, YouTube, Vimeo, TikTok, or Instagram and tag athletes.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: GOOGLE DRIVE SYNC */}
      {showDriveImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <GoogleDriveSyncModal 
              creatorId={user?.uid}
              creatorName={profile?.displayName || user?.displayName || 'Creator'}
              isCreatorPortal={true}
              onClose={() => setShowDriveImportModal(false)}
              onSuccess={() => {
                setShowDriveImportModal(false);
                setActiveTab('portfolio');
              }}
            />
          </div>
        </div>
      )}

      {/* 6. MODAL: EMBED VIDEO HIGHLIGHT */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#12151C] border border-white/20 rounded-3xl p-6 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00F0D0]/15 border border-[#00F0D0]/30 text-[#00F0D0] flex items-center justify-center">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white font-sans">
                    Publish Highlight Reel &amp; Tag Athletes
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Embed YouTube, Vimeo, TikTok, Instagram or Hudl links
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowVideoModal(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVideo} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-400 uppercase mb-1 block">
                  Reel Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tri-State High School Championship Highlights"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#00F0D0] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase mb-1 block">
                    Sport
                  </label>
                  <select
                    value={videoSport}
                    onChange={(e) => setVideoSport(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-[#00F0D0] font-mono"
                  >
                    <option value="Basketball">Basketball</option>
                    <option value="Flag Football">Flag Football</option>
                    <option value="Lacrosse">Lacrosse</option>
                    <option value="Soccer">Soccer</option>
                    <option value="Track & Field">Track & Field</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase mb-1 block">
                    Sale Price ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="1.00"
                    value={videoPrice}
                    onChange={(e) => setVideoPrice(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-[#00F0D0] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold font-mono text-slate-400 uppercase mb-1 block">
                  Video Embed URL (Hudl, YouTube, Vimeo, TikTok, Instagram)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#00F0D0] font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold font-mono text-slate-400 uppercase mb-1 block">
                  Thumbnail / Cover Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={videoThumbnailUrl}
                  onChange={(e) => setVideoThumbnailUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#00F0D0] font-mono"
                />
              </div>

              {/* Tag Athletes Selection */}
              <div>
                <label className="text-[10px] font-bold font-mono text-amber-400 uppercase mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Select Athletes to Tag:
                  </span>
                  <span>({selectedAthleteUids.length} Selected)</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-black/60 border border-white/10 rounded-xl">
                  {athletesList.length > 0 ? (
                    athletesList.map((ath) => {
                      const isTagged = selectedAthleteUids.includes(ath.uid);
                      return (
                        <button
                          key={ath.uid}
                          type="button"
                          onClick={() => handleToggleAthleteTag(ath.uid)}
                          className={`px-3 py-2 rounded-xl text-left text-xs font-mono flex items-center justify-between border transition-all cursor-pointer ${
                            isTagged
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                              : 'bg-[#181D26] border-white/10 text-slate-300 hover:border-white/30'
                          }`}
                        >
                          <span className="truncate">{ath.displayName}</span>
                          {isTagged && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <p className="col-span-2 text-[11px] text-slate-500 font-mono p-2">Loading member directory...</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingVideo}
                className="w-full py-3 bg-gradient-to-r from-[#00F0D0] to-teal-400 hover:from-[#00d6b9] hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(0,240,208,0.4)] cursor-pointer active:scale-[0.97] transition-all"
              >
                {isSubmittingVideo ? 'Publishing Video...' : 'Publish Highlight to Gallery'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Google Drive Raw Video Uploader Modal */}
      {showDriveVideoModal && (
        <GoogleDriveVideoUploadModal
          isOpen={showDriveVideoModal}
          onClose={() => setShowDriveVideoModal(false)}
          onUploadSuccess={() => {
            setShowDriveVideoModal(false);
            showToast('success', '4K Video Live', 'Game film uploaded to Google Drive and indexed to your portfolio.');
          }}
        />
      )}

    </div>
  );
};

export default CreatorStudioDashboardView;
