import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Camera,
  Upload,
  ExternalLink,
  DollarSign,
  Tag,
  Calendar,
  MapPin,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Trash2,
  Edit3,
  Copy,
  ChevronRight,
  TrendingUp,
  Image as ImageIcon,
  QrCode,
  Download,
  Share2,
  Check,
  Eye,
  Sliders,
  X
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAuthRole, normalizeRole } from '../../hooks/useAuthRole';
import { useToast } from '../../context/ToastContext';
import { PageContainer } from '../Layout/PageContainer';
import { triggerHaptic } from '../../lib/haptics';

const SPORT_OPTIONS = [
  'Flag Football',
  'Basketball',
  'Track & Field',
  'Cheer',
  'Soccer',
  'Football',
  'Baseball',
  'Volleyball',
  'Other'
];

export interface CreatorAlbumItem {
  id: string;
  creatorId: string;
  creatorEmail: string;
  paypalEmail: string;
  title: string;
  sport: string;
  tags: string[];
  singlePrice: number;
  bundlePrice: number;
  photoCount: number;
  viewsCount: number;
  salesRevenue: number;
  status: 'draft' | 'ingesting' | 'published' | 'archived' | 'active';
  createdAt: any;
  eventDate?: string;
  venueLocation?: string;
  watermarkText?: string;
  watermarkEnabled?: boolean;
  coverPhotoUrl?: string;
  coverUrl?: string;
  description?: string;
  price?: number;
  fullAlbumPrice?: number;
}

export const CreatorPortalDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { role } = useAuthRole();
  const canonicalRole = normalizeRole(role);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const userRoleStr = (canonicalRole as string) || (profile?.role as string) || '';
  const isAdmin = ['admin', 'director', 'tournament_director'].includes(userRoleStr) || user?.email === 'kevoiebailey@gmail.com';

  // Albums state
  const [albums, setAlbums] = useState<CreatorAlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'ingesting' | 'draft' | 'archived'>('all');

  // Modal State for New Album Creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields for Create
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState('Flag Football');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [venueLocation, setVenueLocation] = useState('');
  const [tagsInput, setTagsInput] = useState('14U, Girls Flag, Tournament');
  const [singlePrice, setSinglePrice] = useState('10.00');
  const [bundlePrice, setBundlePrice] = useState('49.00');
  const [paypalEmail, setPaypalEmail] = useState(user?.email || '');
  const [watermarkPreset, setWatermarkPreset] = useState('JUST1PLAY');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [albumStatus, setAlbumStatus] = useState<'published' | 'draft' | 'ingesting'>('published');
  const [description, setDescription] = useState('');

  // Edit Pricing & Album Modal State
  const [editingAlbum, setEditingAlbum] = useState<CreatorAlbumItem | null>(null);
  const [editSinglePrice, setEditSinglePrice] = useState('10.00');
  const [editBundlePrice, setEditBundlePrice] = useState('49.00');
  const [editPaypalEmail, setEditPaypalEmail] = useState('');
  const [editStatus, setEditStatus] = useState<'published' | 'draft' | 'ingesting' | 'archived'>('published');
  const [editWatermarkText, setEditWatermarkText] = useState('JUST1PLAY');
  const [editWatermarkEnabled, setEditWatermarkEnabled] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // QR Code / Share Modal State
  const [qrAlbum, setQrAlbum] = useState<CreatorAlbumItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Delete Confirmation
  const [albumToDelete, setAlbumToDelete] = useState<CreatorAlbumItem | null>(null);

  // Prefill paypal email when user auth is loaded
  useEffect(() => {
    if (user?.email && !paypalEmail) {
      setPaypalEmail(user.email);
    }
  }, [user?.email, paypalEmail]);

  // Subscribe to albums in real-time
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const albumsRef = collection(db, 'albums');
    const q = query(albumsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CreatorAlbumItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const isCreator = user?.uid && (
            data.creatorId === user.uid ||
            data.authorId === user.uid ||
            data.createdBy === user.uid ||
            data.photographerId === user.uid ||
            data.creatorEmail === user.email
          );

          // Admin or owner creator
          if (isAdmin || isCreator) {
            let normalizedStatus: CreatorAlbumItem['status'] = 'published';
            if (data.status === 'draft') normalizedStatus = 'draft';
            else if (data.status === 'ingesting') normalizedStatus = 'ingesting';
            else if (data.status === 'archived') normalizedStatus = 'archived';
            else normalizedStatus = 'published';

            list.push({
              id: docSnap.id,
              creatorId: data.creatorId || data.authorId || data.createdBy || '',
              creatorEmail: data.creatorEmail || '',
              paypalEmail: data.paypalEmail || data.creatorPayPalEmail || '',
              title: data.title || 'Untitled Album',
              sport: data.sport || 'Flag Football',
              tags: Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? data.tags.split(',').map(s => s.trim()) : []),
              singlePrice: typeof data.singlePrice === 'number' ? data.singlePrice : (typeof data.price === 'number' ? data.price : 10.00),
              bundlePrice: typeof data.bundlePrice === 'number' ? data.bundlePrice : (typeof data.fullAlbumPrice === 'number' ? data.fullAlbumPrice : 49.00),
              photoCount: data.photoCount || (Array.isArray(data.mediaUrls) ? data.mediaUrls.length : 0),
              viewsCount: data.viewsCount || data.viewCount || 0,
              salesRevenue: data.salesRevenue || data.totalSales || 0,
              status: normalizedStatus,
              createdAt: data.createdAt,
              eventDate: data.eventDate || '',
              venueLocation: data.venueLocation || '',
              watermarkText: data.watermarkText || 'JUST1PLAY',
              watermarkEnabled: data.watermarkEnabled !== false,
              coverPhotoUrl: data.coverPhotoUrl || data.coverUrl || data.imageUrl || (Array.isArray(data.mediaUrls) ? data.mediaUrls[0] : ''),
              description: data.description || '',
            });
          }
        });

        setAlbums(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Creator albums subscription notice:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.email, isAdmin]);

  // Aggregate Telemetry
  const totalAlbums = albums.length;
  const totalPhotos = albums.reduce((acc, a) => acc + (a.photoCount || 0), 0);
  const totalViews = albums.reduce((acc, a) => acc + (a.viewsCount || 0), 0);
  const totalRevenue = albums.reduce((acc, a) => acc + (a.salesRevenue || 0), 0);

  // Filtered albums
  const filteredAlbums = albums.filter((album) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'published') return album.status === 'published' || album.status === 'active';
    return album.status === statusFilter;
  });

  /**
   * Handle Create Album
   */
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('error', 'Authentication Required', 'Please log in to create a media gallery album.');
      return;
    }

    if (!title.trim()) {
      showToast('error', 'Missing Title', 'Please enter a title for your album.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const parsedSinglePrice = Math.max(1, parseFloat(singlePrice) || 10.0);
      const parsedBundlePrice = Math.max(1, parseFloat(bundlePrice) || 49.0);

      const newAlbumData = {
        creatorId: user.uid,
        creatorEmail: user.email || '',
        paypalEmail: (paypalEmail || user.email || '').trim(),
        title: title.trim(),
        sport,
        tags: parsedTags,
        singlePrice: parsedSinglePrice,
        bundlePrice: parsedBundlePrice,
        photoCount: 0,
        viewsCount: 0,
        salesRevenue: 0,
        status: albumStatus,
        watermarkEnabled: watermarkEnabled,
        watermarkText: watermarkPreset.trim() || 'JUST1PLAY',
        eventDate: eventDate || new Date().toISOString().split('T')[0],
        venueLocation: venueLocation.trim(),
        description: description.trim(),
        
        // Backward-compatibility keys for public gallery & rules
        authorId: user.uid,
        createdBy: user.uid,
        photographerId: user.uid,
        authorName: profile?.displayName || (profile as any)?.fullName || user.displayName || 'Sports Creator',
        authorRole: profile?.role || 'Creator',
        authorAvatar: profile?.photoURL || (profile as any)?.avatarUrl || user.photoURL || '',
        eventName: title.trim(),
        price: parsedSinglePrice,
        fullAlbumPrice: parsedBundlePrice,
        mediaUrls: [],
        watermarkedMediaUrls: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'albums'), newAlbumData);
      triggerHaptic('medium');
      showToast('success', 'Album Created!', `"${title.trim()}" is ready. Now upload your high-res photos.`);

      setShowCreateModal(false);
      resetForm();

      // Automatically navigate to batch upload dropzone with this album pre-selected
      navigate(`/creator/upload/${docRef.id}`);
    } catch (err: any) {
      console.error('Error creating album:', err);
      showToast('error', 'Creation Failed', err?.message || 'Failed to create album in Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSport('Flag Football');
    setVenueLocation('');
    setTagsInput('14U, Girls Flag, Tournament');
    setSinglePrice('10.00');
    setBundlePrice('49.00');
    setDescription('');
    setWatermarkPreset('JUST1PLAY');
    setWatermarkEnabled(true);
    setAlbumStatus('published');
  };

  /**
   * Handle Open Edit Pricing & Details Modal
   */
  const handleOpenEdit = (album: CreatorAlbumItem) => {
    setEditingAlbum(album);
    setEditSinglePrice(album.singlePrice.toFixed(2));
    setEditBundlePrice(album.bundlePrice.toFixed(2));
    setEditPaypalEmail(album.paypalEmail || user?.email || '');
    setEditStatus((album.status === 'active' ? 'published' : album.status) as any);
    setEditWatermarkText(album.watermarkText || 'JUST1PLAY');
    setEditWatermarkEnabled(album.watermarkEnabled !== false);
  };

  /**
   * Handle Save Edit Pricing & Details
   */
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlbum || !db) return;

    setIsSavingEdit(true);
    try {
      const parsedSingle = Math.max(1, parseFloat(editSinglePrice) || 10.0);
      const parsedBundle = Math.max(1, parseFloat(editBundlePrice) || 49.0);

      const albumRef = doc(db, 'albums', editingAlbum.id);
      await updateDoc(albumRef, {
        singlePrice: parsedSingle,
        bundlePrice: parsedBundle,
        price: parsedSingle,
        fullAlbumPrice: parsedBundle,
        paypalEmail: editPaypalEmail.trim(),
        creatorPayPalEmail: editPaypalEmail.trim(),
        status: editStatus,
        watermarkText: editWatermarkText.trim() || 'JUST1PLAY',
        watermarkEnabled: editWatermarkEnabled,
        watermarkStyle: editWatermarkEnabled ? 'full_mesh' : 'off',
        updatedAt: serverTimestamp(),
      });

      // Synchronize directly with the gallery document in Firestore 'galleries' collection
      try {
        const galleryRef = doc(db, 'galleries', editingAlbum.id);
        await setDoc(galleryRef, {
          watermarkEnabled: editWatermarkEnabled,
          watermarkStyle: editWatermarkEnabled ? 'full_mesh' : 'off',
          watermarkText: editWatermarkText.trim() || 'JUST1PLAY',
          singlePrice: parsedSingle,
          bundlePrice: parsedBundle,
          price: parsedSingle,
          fullAlbumPrice: parsedBundle,
          status: editStatus,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (gErr) {
        console.warn('Sync to galleries document notice:', gErr);
      }

      triggerHaptic('medium');
      showToast('success', 'Gallery Settings Saved', `Proof watermarking is ${editWatermarkEnabled ? 'ENABLED' : 'DISABLED'} for "${editingAlbum.title}".`);
      setEditingAlbum(null);
    } catch (err: any) {
      console.error('Error updating album/gallery settings:', err);
      showToast('error', 'Update Failed', err?.message || 'Could not update gallery settings.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  /**
   * Handle Quick Toggle for Enable Proof Watermarking directly on the gallery card
   */
  const handleQuickToggleWatermark = async (album: CreatorAlbumItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db) return;
    const nextVal = !(album.watermarkEnabled !== false);
    triggerHaptic('light');

    // Optimistically update state
    setAlbums(prev => prev.map(a => a.id === album.id ? { ...a, watermarkEnabled: nextVal } : a));

    try {
      // 1. Update albums document
      const albumRef = doc(db, 'albums', album.id);
      await updateDoc(albumRef, {
        watermarkEnabled: nextVal,
        watermarkStyle: nextVal ? 'full_mesh' : 'off',
        updatedAt: serverTimestamp(),
      });

      // 2. Update galleries document
      try {
        const galleryRef = doc(db, 'galleries', album.id);
        await setDoc(galleryRef, {
          watermarkEnabled: nextVal,
          watermarkStyle: nextVal ? 'full_mesh' : 'off',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (_) {}

      showToast('success', nextVal ? 'Watermarking Enabled' : 'Watermarking Disabled', `Proof watermarking is now ${nextVal ? 'active' : 'turned off'} for "${album.title}".`);
    } catch (err: any) {
      console.error('Failed to toggle watermarkEnabled in Firestore:', err);
      showToast('error', 'Toggle Failed', 'Could not update watermark setting.');
      // Revert state
      setAlbums(prev => prev.map(a => a.id === album.id ? { ...a, watermarkEnabled: !nextVal } : a));
    }
  };

  /**
   * Handle Delete Album
   */
  const handleDeleteAlbum = async () => {
    if (!albumToDelete || !db) return;
    try {
      await deleteDoc(doc(db, 'albums', albumToDelete.id));
      triggerHaptic('heavy');
      showToast('success', 'Album Removed', `"${albumToDelete.title}" has been deleted.`);
      setAlbumToDelete(null);
    } catch (err: any) {
      console.error('Error deleting album:', err);
      showToast('error', 'Delete Failed', err?.message || 'Could not delete album.');
    }
  };

  /**
   * Handle Copy Public Gallery Share Link
   */
  const copyShareLink = (albumId: string) => {
    const url = `${window.location.origin}/gallery?albumId=${albumId}`;
    navigator.clipboard.writeText(url);
    triggerHaptic('light');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    showToast('success', 'Link Copied!', 'Public gallery link copied to clipboard.');
  };

  /**
   * Download QR Code as PNG
   */
  const downloadQrCodePng = (albumTitle: string) => {
    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill obsidian background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 25, 25, 550, 550);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${albumTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      URL.revokeObjectURL(blobURL);
      triggerHaptic('medium');
      showToast('success', 'QR Code Downloaded', 'Printable high-res QR code saved.');
    };
    image.src = blobURL;
  };

  return (
    <PageContainer>
      <div id="creator-portal-root" className="space-y-8 max-w-7xl mx-auto pb-20">
        
        {/* 1. Header Banner & Creator Telemetry */}
        <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#00F0D0]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/2 -bottom-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#00F0D0]/20 text-[#00F0D0] border border-[#00F0D0]/40 text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(0,240,208,0.2)]">
                  Creator Media Portal
                </span>
                <span className="text-xs font-mono text-zinc-400">Direct-to-Cloud Ingest • LumaPic Architecture</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                Self-Serve Media Vault & Monetization
              </h1>
              <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed">
                Create event albums, configure automated digital download prices and PayPal revenue splits, and batch-upload high-resolution photography with instant client-side WebP watermarking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="creator-portal-create-album-btn"
                onClick={() => {
                  triggerHaptic('light');
                  setShowCreateModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0D0] to-[#00E5C8] text-slate-950 font-black font-mono text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#00F0D0]/25 hover:brightness-110 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Create New Album
              </button>

              <button
                id="creator-portal-goto-upload-btn"
                onClick={() => {
                  triggerHaptic('light');
                  navigate('/creator/upload');
                }}
                className="px-4 py-2.5 rounded-xl bg-[#141B28] hover:bg-[#1E2638] text-emerald-300 font-bold font-mono text-xs uppercase tracking-wider transition-colors border border-emerald-500/30 flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                Batch Ingest
              </button>

              <button
                id="creator-portal-view-gallery-btn"
                onClick={() => {
                  triggerHaptic('light');
                  navigate('/gallery');
                }}
                className="px-4 py-2.5 rounded-xl bg-[#141B28] hover:bg-[#1E2638] text-zinc-300 font-bold font-mono text-xs uppercase tracking-wider transition-colors border border-white/10 flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Public Gallery
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/[0.08]">
            <div className="p-3.5 rounded-xl bg-[#08090C]/80 border border-white/[0.06]">
              <span className="text-xs font-mono uppercase text-zinc-400 block flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00F0D0]" /> Active Albums
              </span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {loading ? '...' : totalAlbums}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#08090C]/80 border border-white/[0.06]">
              <span className="text-xs font-mono uppercase text-zinc-400 block flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400" /> Total Photos
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                {loading ? '...' : totalPhotos}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#08090C]/80 border border-white/[0.06]">
              <span className="text-xs font-mono uppercase text-zinc-400 block flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" /> Gallery Views
              </span>
              <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                {loading ? '...' : totalViews.toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#08090C]/80 border border-white/[0.06]">
              <span className="text-xs font-mono uppercase text-zinc-400 block flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" /> Gross Sales
              </span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
                {loading ? '...' : `$${totalRevenue.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Main Albums Content & Filters */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#00F0D0]" />
                Event Albums ({filteredAlbums.length})
              </h2>
              <span className="text-xs font-mono text-zinc-400">
                Self-serve direct ingestion • Instant live public availability
              </span>
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 bg-[#0D111A] p-1 rounded-xl border border-white/[0.08] text-xs font-mono">
              {(['all', 'published', 'ingesting', 'draft', 'archived'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-[#00F0D0] text-slate-950 font-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-zinc-400 font-mono text-sm bg-[#0D111A]/60 border border-white/[0.08] rounded-2xl animate-pulse">
              Syncing creator media albums...
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="bg-[#0D111A]/60 border border-white/[0.08] rounded-2xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#00F0D0]/10 border border-[#00F0D0]/30 flex items-center justify-center mx-auto text-[#00F0D0]">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-white font-mono">
                  {statusFilter === 'all' ? 'No Event Albums Created Yet' : `No ${statusFilter} Albums`}
                </h3>
                <p className="text-sm text-zinc-400">
                  Create your first sports event album to configure download pricing, automated watermarking, and team QR codes.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#00F0D0] hover:bg-[#00E5C8] text-slate-950 font-black font-mono text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-[#00F0D0]/20"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Create First Album
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAlbums.map((album) => {
                const statusBadgeColors = {
                  published: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                  ingesting: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse',
                  draft: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                  archived: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/40',
                }[album.status] || 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                return (
                  <div
                    key={album.id}
                    id={`creator-album-card-${album.id}`}
                    className="bg-[#0D111A] border border-white/[0.08] hover:border-[#00F0D0]/40 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between group shadow-xl"
                  >
                    {/* Top Media Cover Banner */}
                    <div className="relative h-44 bg-[#08090C] overflow-hidden">
                      {album.coverPhotoUrl ? (
                        <img
                          src={album.coverPhotoUrl}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                          <ImageIcon className="w-10 h-10 stroke-1" />
                          <span className="text-xs font-mono">Awaiting Photos</span>
                        </div>
                      )}

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0D111A] via-transparent to-black/40" />

                      {/* Top Left Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[#00F0D0] border border-[#00F0D0]/30 text-[11px] font-mono font-bold">
                          {album.sport}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-black uppercase tracking-wider ${statusBadgeColors}`}>
                          {album.status}
                        </span>
                      </div>

                      {/* Photo Count Tag */}
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-zinc-200 border border-white/10 text-[11px] font-mono flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#00F0D0]" />
                        <span>{album.photoCount} Photos</span>
                      </div>

                      {/* Date / Location */}
                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-zinc-300">
                        {album.eventDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#00F0D0]" />
                            {album.eventDate}
                          </span>
                        )}
                        {album.venueLocation && (
                          <span className="flex items-center gap-1 truncate max-w-[160px]" title={album.venueLocation}>
                            <MapPin className="w-3 h-3 text-amber-400" />
                            {album.venueLocation}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Album Body */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-white font-mono group-hover:text-[#00F0D0] transition-colors line-clamp-1" title={album.title}>
                          {album.title}
                        </h3>

                        {album.description && (
                          <p className="text-xs text-zinc-400 line-clamp-2">
                            {album.description}
                          </p>
                        )}

                        {/* Division / Tags Chips */}
                        {album.tags && album.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {album.tags.slice(0, 4).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-[#141B28] text-zinc-300 text-[10px] font-mono border border-white/[0.06]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Monetization & Telemetry Breakdown */}
                      <div className="p-3.5 rounded-xl bg-[#08090C]/90 border border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400">Single Download:</span>
                          <span className="font-bold text-emerald-400 font-mono">${album.singlePrice.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400">Full Album Pass:</span>
                          <span className="font-bold text-[#00F0D0] font-mono">${album.bundlePrice.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-white/[0.06]">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Eye className="w-3 h-3 text-cyan-400" /> Views:
                          </span>
                          <span className="text-zinc-200 font-mono">{album.viewsCount || 0}</span>
                        </div>
                        {album.paypalEmail && (
                          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1 border-t border-white/[0.06]">
                            <span>Payout:</span>
                            <span className="truncate max-w-[150px] text-zinc-300" title={album.paypalEmail}>{album.paypalEmail}</span>
                          </div>
                        )}

                        {/* Direct Gallery Switch: Enable Proof Watermarking */}
                        <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-white/[0.08]">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${album.watermarkEnabled !== false ? 'text-[#00F0D0]' : 'text-zinc-500'}`} />
                            <span className="text-zinc-300 font-bold truncate text-[11px]">Enable Proof Watermarking</span>
                          </div>
                          <label 
                            className="relative inline-flex items-center cursor-pointer shrink-0" 
                            onClick={(e) => e.stopPropagation()}
                            title={`Toggle watermarkEnabled in Firestore gallery document for "${album.title}"`}
                          >
                            <input
                              type="checkbox"
                              id={`switch-watermark-${album.id}`}
                              data-testid={`switch-watermark-${album.id}`}
                              checked={album.watermarkEnabled !== false}
                              onChange={(e) => handleQuickToggleWatermark(album, e as any)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00F0D0]"></div>
                          </label>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 flex items-center gap-2 border-t border-white/[0.08]">
                        <button
                          id={`btn-upload-${album.id}`}
                          onClick={() => {
                            triggerHaptic('light');
                            navigate(`/creator/upload/${album.id}`);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#00F0D0] to-[#00E5C8] hover:brightness-110 text-slate-950 font-black font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                          Batch Ingest
                        </button>

                        <button
                          id={`btn-qr-${album.id}`}
                          onClick={() => {
                            triggerHaptic('light');
                            setQrAlbum(album);
                          }}
                          className="p-2 rounded-xl bg-[#141B28] hover:bg-[#1E2638] text-zinc-300 hover:text-white transition-colors border border-white/[0.08] cursor-pointer"
                          title="Generate QR Code & Share"
                        >
                          <QrCode className="w-4 h-4 text-[#00F0D0]" />
                        </button>

                        <button
                          id={`btn-gallery-${album.id}`}
                          onClick={() => {
                            triggerHaptic('light');
                            navigate(`/gallery?albumId=${album.id}`);
                          }}
                          className="p-2 rounded-xl bg-[#141B28] hover:bg-[#1E2638] text-zinc-300 hover:text-white transition-colors border border-white/[0.08] cursor-pointer"
                          title="View Public Gallery"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        <button
                          id={`btn-edit-${album.id}`}
                          onClick={() => {
                            triggerHaptic('light');
                            handleOpenEdit(album);
                          }}
                          className="p-2 rounded-xl bg-[#141B28] hover:bg-[#1E2638] text-zinc-300 hover:text-white transition-colors border border-white/[0.08] cursor-pointer"
                          title="Edit Pricing & Settings"
                        >
                          <Sliders className="w-4 h-4 text-amber-400" />
                        </button>

                        <button
                          id={`btn-delete-${album.id}`}
                          onClick={() => {
                            triggerHaptic('light');
                            setAlbumToDelete(album);
                          }}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/30 cursor-pointer"
                          title="Delete Album"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Create New Album Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#0D111A] border border-white/[0.1] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
              {/* Modal Header */}
              <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#00F0D0]" />
                    Create New Gallery / Event Album
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Configure your event details, division tags, download monetization, and watermark overlays.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg bg-[#141B28] text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleCreateAlbum} className="p-6 space-y-5">
                {/* Album Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-zinc-300 font-bold">
                    Album Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. West Orange 14U Championship"
                    className="w-full bg-[#08090C] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00F0D0]"
                  />
                </div>

                {/* Sport Category & Event Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono uppercase text-zinc-300 font-bold">
                      Sport Category
                    </label>
                    <select
                      value={sport}
                      onChange={(e) => setSport(e.target.value)}
                      className="w-full bg-[#08090C] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0D0]"
                    >
                      {SPORT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono uppercase text-zinc-300 font-bold">
                      Event Date
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-[#08090C] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0D0]"
                    />
                  </div>
                </div>

                {/* Venue Location & Division / Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono uppercase text-zinc-300 font-bold">
                      Venue Location
                    </label>
                    <input
                      type="text"
                      value={venueLocation}
                      onChange={(e) => setVenueLocation(e.target.value)}
                      placeholder="e.g. West Orange High Stadium, FL"
                      className="w-full bg-[#08090C] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00F0D0]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono uppercase text-zinc-300 font-bold">
                      Division / Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="14U, Girls Flag, Tournament"
                      className="w-full bg-[#08090C] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00F0D0]"
                    />
                  </div>
                </div>

                {/* Initial Status */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-zinc-300 font-bold">
                    Initial Status
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['published', 'ingesting', 'draft'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setAlbumStatus(st)}
                        className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold capitalize transition-all cursor-pointer ${
                          albumStatus === st
                            ? 'bg-[#00F0D0]/20 border-[#00F0D0] text-[#00F0D0]'
                            : 'bg-[#08090C] border-white/[0.08] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monetization Settings Section */}
                <div className="p-4 rounded-xl bg-[#08090C] border border-white/[0.06] space-y-4">
                  <div className="flex items-center gap-2 text-[#00F0D0]">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider">
                      Monetization & Payout Configuration
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-zinc-300">
                        Single Photo Download Price ($ USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-sm">$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="1.00"
                          required
                          value={singlePrice}
                          onChange={(e) => setSinglePrice(e.target.value)}
                          className="w-full bg-[#0D111A] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#00F0D0]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-zinc-300">
                        Full Album Pass Price ($ USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-sm">$</span>
                        <input
                          type="number"
                          step="1.00"
                          min="5.00"
                          required
                          value={bundlePrice}
                          onChange={(e) => setBundlePrice(e.target.value)}
                          className="w-full bg-[#0D111A] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#00F0D0]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-zinc-300">
                      Creator Payout PayPal Email (Revenue split sent directly here)
                    </label>
                    <input
                      type="email"
                      required
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="e.g. creator.payouts@gmail.com"
                      className="w-full bg-[#0D111A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00F0D0]"
                    />
                  </div>
                </div>

                {/* Enable Proof Watermarking Switch */}
                <div className="p-4 rounded-xl bg-[#08090C] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="create-enable-proof-watermarking-switch" className="text-xs font-mono uppercase text-zinc-200 font-bold flex items-center gap-1.5 cursor-pointer">
                        <ShieldCheck className="w-4 h-4 text-[#00F0D0]" />
                        <span>Enable Proof Watermarking</span>
                      </label>
                      <span className="text-[11px] text-zinc-400 font-mono block">
                        Directly sets watermarkEnabled in Firestore gallery document. Applied to public previews; removed for purchased originals.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input
                        id="create-enable-proof-watermarking-switch"
                        data-testid="create-enable-proof-watermarking-switch"
                        type="checkbox"
                        checked={watermarkEnabled}
                        onChange={(e) => setWatermarkEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00F0D0]"></div>
                    </label>
                  </div>

                  {watermarkEnabled && (
                    <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                      <label className="block text-[11px] font-mono text-zinc-400">
                        Watermark Text
                      </label>
                      <input
                        type="text"
                        value={watermarkPreset}
                        onChange={(e) => setWatermarkPreset(e.target.value)}
                        placeholder="JUST1PLAY"
                        className="w-full bg-[#0D111A] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00F0D0]"
                      />
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-[#141B28] hover:bg-[#1E2638] text-zinc-300 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0D0] to-[#00E5C8] hover:brightness-110 text-slate-950 font-black font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-[#00F0D0]/20 cursor-pointer"
                  >
                    {isSubmitting ? 'Creating Album...' : 'Save & Proceed to Batch Ingest'}
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Edit Pricing & Details Modal */}
        {editingAlbum && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#0D111A] border border-white/[0.1] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
              <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#00F0D0]" />
                    Creative Portal / Gallery Settings
                  </h3>
                  <p className="text-xs text-zinc-400 truncate max-w-xs">
                    {editingAlbum.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAlbum(null)}
                  className="p-1.5 rounded-lg bg-[#141B28] text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                {/* Status Switcher */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-zinc-300 font-bold">
                    Album Status
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['published', 'ingesting', 'draft', 'archived'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditStatus(st)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-mono font-bold capitalize transition-all cursor-pointer ${
                          editStatus === st
                            ? 'bg-[#00F0D0]/20 border-[#00F0D0] text-[#00F0D0]'
                            : 'bg-[#08090C] border-white/[0.08] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-mono text-zinc-300">
                      Single Photo ($ USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-sm">$</span>
                      <input
                        type="number"
                        step="0.50"
                        min="1.00"
                        required
                        value={editSinglePrice}
                        onChange={(e) => setEditSinglePrice(e.target.value)}
                        className="w-full bg-[#08090C] border border-white/[0.08] rounded-xl pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#00F0D0]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-mono text-zinc-300">
                      Full Album Pass ($ USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-sm">$</span>
                      <input
                        type="number"
                        step="1.00"
                        min="5.00"
                        required
                        value={editBundlePrice}
                        onChange={(e) => setEditBundlePrice(e.target.value)}
                        className="w-full bg-[#08090C] border border-white/[0.08] rounded-xl pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#00F0D0]"
                      />
                    </div>
                  </div>
                </div>

                {/* PayPal Email */}
                <div className="space-y-1">
                  <label className="block text-xs font-mono text-zinc-300">
                    PayPal Business / Payout Email
                  </label>
                  <input
                    type="email"
                    required
                    value={editPaypalEmail}
                    onChange={(e) => setEditPaypalEmail(e.target.value)}
                    className="w-full bg-[#08090C] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00F0D0]"
                  />
                </div>

                {/* Enable Proof Watermarking Switch */}
                <div className="p-4 rounded-xl bg-[#08090C] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="enable-proof-watermarking-switch" className="text-xs font-mono text-zinc-200 font-bold flex items-center gap-1.5 cursor-pointer">
                        <ShieldCheck className="w-4 h-4 text-[#00F0D0]" />
                        <span>Enable Proof Watermarking</span>
                      </label>
                      <span className="text-[11px] text-zinc-400 font-mono block">
                        Directly syncs with the watermarkEnabled boolean in the Firestore gallery document. When active, public previews render an anti-theft proof overlay.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input
                        id="enable-proof-watermarking-switch"
                        data-testid="enable-proof-watermarking-switch"
                        type="checkbox"
                        checked={editWatermarkEnabled}
                        onChange={(e) => setEditWatermarkEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00F0D0]"></div>
                    </label>
                  </div>
                  {editWatermarkEnabled && (
                    <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                      <label className="block text-[11px] font-mono text-zinc-400">
                        Proof Overlay Watermark Text
                      </label>
                      <input
                        type="text"
                        value={editWatermarkText}
                        onChange={(e) => setEditWatermarkText(e.target.value)}
                        placeholder="JUST1PLAY"
                        className="w-full bg-[#0D111A] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00F0D0]"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setEditingAlbum(null)}
                    className="px-4 py-2 rounded-xl bg-[#141B28] text-zinc-300 font-mono text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2 rounded-xl bg-[#00F0D0] hover:bg-[#00E5C8] text-slate-950 font-black font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. QR Code & Parent/Team Share Modal */}
        {qrAlbum && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="bg-[#0D111A] border border-white/[0.1] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#00F0D0]" />
                    Gallery QR Code & Link
                  </h3>
                  <p className="text-xs text-zinc-400 truncate max-w-xs">
                    {qrAlbum.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQrAlbum(null)}
                  className="p-1.5 rounded-lg bg-[#141B28] text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Printable White Card for maximum scan contrast */}
              <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner space-y-3" ref={qrRef}>
                <QRCodeSVG
                  value={`${window.location.origin}/gallery?albumId=${qrAlbum.id}`}
                  size={220}
                  bgColor="#FFFFFF"
                  fgColor="#08090C"
                  level="H"
                  includeMargin={true}
                />
                <div className="text-center">
                  <span className="text-slate-900 font-mono font-black text-xs uppercase tracking-wider block">
                    Scan for Photo Downloads
                  </span>
                  <span className="text-slate-500 font-mono text-[10px] block">
                    {qrAlbum.title}
                  </span>
                </div>
              </div>

              {/* Direct Link Box */}
              <div className="p-3 rounded-xl bg-[#08090C] border border-white/[0.08] flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-zinc-300 truncate select-all">
                  {`${window.location.origin}/gallery?albumId=${qrAlbum.id}`}
                </span>
                <button
                  type="button"
                  onClick={() => copyShareLink(qrAlbum.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#141B28] hover:bg-[#1E2638] text-[#00F0D0] text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Modal Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => downloadQrCodePng(qrAlbum.title)}
                  className="py-2.5 px-3 rounded-xl bg-[#141B28] hover:bg-[#1E2638] text-white font-mono text-xs font-bold border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Save PNG
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    window.open(`/gallery?albumId=${qrAlbum.id}`, '_blank');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00F0D0] to-[#00E5C8] text-slate-950 font-mono text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110"
                >
                  <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                  Open Gallery
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Delete Confirmation Modal */}
        {albumToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0D111A] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white font-mono">Delete Event Album?</h3>
                <p className="text-xs text-zinc-400">
                  Are you sure you want to delete <strong className="text-white">"{albumToDelete.title}"</strong>? This will remove the gallery entry from public view.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAlbumToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-[#141B28] text-zinc-300 font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAlbum}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold font-mono text-xs cursor-pointer"
                >
                  Delete Album
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageContainer>
  );
};

export default CreatorPortalDashboard;
