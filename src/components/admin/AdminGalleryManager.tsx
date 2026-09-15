import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  DollarSign, 
  Sparkles, 
  Save, 
  Check, 
  RefreshCw, 
  Layers, 
  Eye, 
  Camera, 
  Sliders, 
  AlertCircle, 
  FolderPlus, 
  CheckCircle2, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Search,
  Table,
  CheckCheck,
  Tag,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc,
  serverTimestamp, 
  query, 
  limit 
} from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { renderProtectedPreview } from '../../utils/watermark';
import { BulkSetPhotoPricingModal } from './BulkSetPhotoPricingModal';

export type WatermarkStyleType = 'full_mesh' | 'badge_only' | 'off';

export interface GalleryConfigItem {
  id: string;
  title: string;
  eventName?: string;
  sport?: string;
  isFree: boolean;
  isPaid: boolean;
  singlePhotoPrice: number;
  fullAlbumPrice: number;
  watermarkStyle: WatermarkStyleType;
  watermarkEnabled: boolean;
  coverPhotoUrl?: string;
  photoCount?: number;
  isFreeForMembers?: boolean;
  priceCents?: number;
  photos?: any[];
  updatedAt?: any;
  hasUnsavedChanges?: boolean;
}

const SAMPLE_PREVIEW_PHOTO = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1200';

export const AdminGalleryManager: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [galleries, setGalleries] = useState<GalleryConfigItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'table' | 'studio'>('table');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');

  // Row-level saving state for inline edits
  const [savingRowIds, setSavingRowIds] = useState<Set<string>>(new Set());
  const [savedRowIds, setSavedRowIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState<boolean>(false);

  // Form State for Active Selected Gallery (Studio View)
  const [isFree, setIsFree] = useState<boolean>(true);
  const [singlePhotoPrice, setSinglePhotoPrice] = useState<number>(9.99);
  const [fullAlbumPrice, setFullAlbumPrice] = useState<number>(39.99);
  const [watermarkStyle, setWatermarkStyle] = useState<WatermarkStyleType>('full_mesh');
  const [studioSaving, setStudioSaving] = useState<boolean>(false);
  const [studioSaveSuccess, setStudioSaveSuccess] = useState<boolean>(false);

  // Live Watermark Canvas Preview State
  const [previewImageUrl, setPreviewImageUrl] = useState<string>(SAMPLE_PREVIEW_PHOTO);
  const [renderingPreview, setRenderingPreview] = useState<boolean>(false);

  // Bulk Set Photo Pricing Modal State
  const [bulkPricingModalGallery, setBulkPricingModalGallery] = useState<GalleryConfigItem | null>(null);
  const [isBulkPricingModalOpen, setIsBulkPricingModalOpen] = useState<boolean>(false);

  // Fetch galleries & albums from Firestore
  const fetchGalleries = useCallback(async () => {
    setLoading(true);
    try {
      if (!db) return;

      const loadedList: GalleryConfigItem[] = [];

      // 1. Fetch from 'galleries' collection
      try {
        const galleriesSnap = await getDocs(query(collection(db, 'galleries'), limit(100)));
        galleriesSnap.forEach((d) => {
          const data = d.data();
          const paid = data.isPaid === true || data.isFree === false;
          loadedList.push({
            id: d.id,
            title: data.title || data.eventName || `Gallery #${d.id.slice(0, 6)}`,
            eventName: data.eventName || '',
            sport: data.sport || 'Multi-Sport',
            isFree: !paid,
            isPaid: paid,
            singlePhotoPrice: typeof data.singlePhotoPrice === 'number' ? data.singlePhotoPrice : (data.price || 9.99),
            fullAlbumPrice: typeof data.fullAlbumPrice === 'number' ? data.fullAlbumPrice : 39.99,
            watermarkStyle: data.watermarkStyle || (data.watermarkEnabled === false ? 'off' : 'full_mesh'),
            watermarkEnabled: data.watermarkEnabled !== false,
            coverPhotoUrl: data.coverPhotoUrl || data.coverUrl || '',
            photoCount: data.photos?.length || data.photoCount || 0,
            isFreeForMembers: data.isFreeForMembers !== undefined ? data.isFreeForMembers : !paid,
            priceCents: typeof data.priceCents === 'number' ? data.priceCents : Math.round((typeof data.singlePhotoPrice === 'number' ? data.singlePhotoPrice : (data.price || 9.99)) * 100),
            photos: data.photos || [],
            updatedAt: data.updatedAt,
            hasUnsavedChanges: false
          });
        });
      } catch (err) {
        console.warn('Notice reading galleries collection:', err);
      }

      // 2. Fetch from 'albums' collection
      try {
        const albumsSnap = await getDocs(query(collection(db, 'albums'), limit(100)));
        albumsSnap.forEach((d) => {
          if (loadedList.some((g) => g.id === d.id)) return;
          const data = d.data();
          const paid = data.isPaid === true || data.isFree === false;
          loadedList.push({
            id: d.id,
            title: data.title || `Album #${d.id.slice(0, 6)}`,
            eventName: data.eventName || '',
            sport: data.sport || 'Multi-Sport',
            isFree: !paid,
            isPaid: paid,
            singlePhotoPrice: typeof data.singlePhotoPrice === 'number' ? data.singlePhotoPrice : (data.price || 9.99),
            fullAlbumPrice: typeof data.fullAlbumPrice === 'number' ? data.fullAlbumPrice : 39.99,
            watermarkStyle: data.watermarkStyle || 'full_mesh',
            watermarkEnabled: data.watermarkEnabled !== false,
            coverPhotoUrl: data.coverThumbnail || data.coverPhoto || data.coverPhotoUrl || '',
            photoCount: data.photoCount || data.photos?.length || data.mediaUrls?.length || 0,
            isFreeForMembers: data.isFreeForMembers !== undefined ? data.isFreeForMembers : !paid,
            priceCents: typeof data.priceCents === 'number' ? data.priceCents : Math.round((typeof data.singlePhotoPrice === 'number' ? data.singlePhotoPrice : (data.price || 9.99)) * 100),
            photos: data.photos || [],
            updatedAt: data.updatedAt,
            hasUnsavedChanges: false
          });
        });
      } catch (err) {
        console.warn('Notice reading albums collection:', err);
      }

      // Fallback starter showcase if completely empty
      if (loadedList.length === 0) {
        loadedList.push({
          id: 'default-championship-showcase',
          title: 'West Coast Showcase - Championship Game',
          eventName: 'Varsity Invitational 2026',
          sport: 'Basketball',
          isFree: false,
          isPaid: true,
          singlePhotoPrice: 9.99,
          fullAlbumPrice: 49.99,
          watermarkStyle: 'full_mesh',
          watermarkEnabled: true,
          coverPhotoUrl: SAMPLE_PREVIEW_PHOTO,
          photoCount: 42,
          hasUnsavedChanges: false
        });
      }

      setGalleries(loadedList);
      if (!selectedGalleryId && loadedList.length > 0) {
        selectGallery(loadedList[0]);
      }
    } catch (err) {
      console.error('Error loading gallery documents:', err);
      showToast('error', 'Sync Issue', 'Could not load galleries from Firestore.');
    } finally {
      setLoading(false);
    }
  }, [selectedGalleryId, showToast]);

  useEffect(() => {
    fetchGalleries();
  }, []);

  // Update Studio form state when gallery selected
  const selectGallery = (g: GalleryConfigItem) => {
    setSelectedGalleryId(g.id);
    setIsFree(g.isFree);
    setSinglePhotoPrice(g.singlePhotoPrice);
    setFullAlbumPrice(g.fullAlbumPrice);
    setWatermarkStyle(g.watermarkStyle);
    setStudioSaveSuccess(false);
  };

  const selectedGallery = useMemo(() => {
    return galleries.find((g) => g.id === selectedGalleryId) || galleries[0] || null;
  }, [galleries, selectedGalleryId]);

  // Update live preview whenever watermarkStyle changes in studio view
  useEffect(() => {
    let isMounted = true;
    const baseSource = selectedGallery?.coverPhotoUrl || SAMPLE_PREVIEW_PHOTO;

    if (watermarkStyle === 'off') {
      setPreviewImageUrl(baseSource);
      return;
    }

    setRenderingPreview(true);
    renderProtectedPreview(baseSource, {
      style: watermarkStyle,
      text: 'JUST1PLAY PHOTOS • PREVIEW',
      badgeText: '⚡ JUST1PLAY PHOTOS',
      opacity: 0.15,
      gridSpacing: 120
    })
      .then((watermarkedDataUrl) => {
        if (isMounted) {
          setPreviewImageUrl(watermarkedDataUrl || baseSource);
        }
      })
      .catch((err) => {
        console.warn('Preview rendering fallback:', err);
        if (isMounted) setPreviewImageUrl(baseSource);
      })
      .finally(() => {
        if (isMounted) setRenderingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [watermarkStyle, selectedGallery?.coverPhotoUrl]);

  // INLINE EDIT: Modify local state for a specific gallery
  const handleInlineChange = (galleryId: string, field: keyof GalleryConfigItem, value: any) => {
    setGalleries((prev) =>
      prev.map((item) => {
        if (item.id !== galleryId) return item;

        const updated = { ...item, [field]: value, hasUnsavedChanges: true };

        // Keep isFree and isPaid in sync
        if (field === 'isFree') {
          updated.isPaid = !value;
        } else if (field === 'isPaid') {
          updated.isFree = !value;
        }

        // If updating the currently selected gallery in studio view, keep local states in sync
        if (galleryId === selectedGalleryId) {
          if (field === 'isFree') setIsFree(Boolean(value));
          if (field === 'singlePhotoPrice') setSinglePhotoPrice(Number(value) || 0);
          if (field === 'fullAlbumPrice') setFullAlbumPrice(Number(value) || 0);
          if (field === 'watermarkStyle') setWatermarkStyle(value as WatermarkStyleType);
        }

        return updated;
      })
    );
  };

  // INLINE EDIT: Toggle Free / Paid status with one click
  const handleInlineToggleFree = (galleryId: string) => {
    const target = galleries.find((g) => g.id === galleryId);
    if (!target) return;
    const newIsFree = !target.isFree;
    handleInlineChange(galleryId, 'isFree', newIsFree);
  };

  // INLINE EDIT: Direct Save of a specific gallery to Firestore
  const handleSaveRow = async (galleryId: string) => {
    const target = galleries.find((g) => g.id === galleryId);
    if (!target || !db) return;

    setSavingRowIds((prev) => new Set(prev).add(galleryId));

    try {
      const isPaid = !target.isFree;
      const watermarkEnabled = target.watermarkStyle !== 'off';
      const singlePrice = Number(target.singlePhotoPrice) || 0;
      const albumPrice = Number(target.fullAlbumPrice) || 0;

      const payload = {
        isFree: target.isFree,
        isPaid: isPaid,
        singlePhotoPrice: singlePrice,
        fullAlbumPrice: albumPrice,
        price: singlePrice, // Legacy compatibility
        watermarkStyle: target.watermarkStyle,
        watermarkEnabled: watermarkEnabled,
        updatedAt: serverTimestamp()
      };

      // 1. Update 'galleries' doc
      const galleryDocRef = doc(db, 'galleries', galleryId);
      await setDoc(galleryDocRef, sanitizeFirestorePayload(payload), { merge: true });

      // 2. Also mirror to 'albums' doc
      try {
        const albumDocRef = doc(db, 'albums', galleryId);
        await setDoc(albumDocRef, sanitizeFirestorePayload(payload), { merge: true });
      } catch (albumErr) {
        console.warn('Albums mirror notice:', albumErr);
      }

      // Mark row as saved
      setGalleries((prev) =>
        prev.map((g) => (g.id === galleryId ? { ...g, hasUnsavedChanges: false } : g))
      );

      setSavedRowIds((prev) => new Set(prev).add(galleryId));
      setTimeout(() => {
        setSavedRowIds((prev) => {
          const next = new Set(prev);
          next.delete(galleryId);
          return next;
        });
      }, 2500);

      showToast('success', 'Pricing Saved', `Saved pricing for "${target.title}" to Firestore.`);
    } catch (err) {
      console.error('Save gallery pricing error:', err);
      showToast('error', 'Save Failed', 'Could not save gallery pricing to Firestore.');
    } finally {
      setSavingRowIds((prev) => {
        const next = new Set(prev);
        next.delete(galleryId);
        return next;
      });
    }
  };

  // BATCH: Save all galleries with unsaved changes
  const handleSaveAll = async () => {
    const modifiedGalleries = galleries.filter((g) => g.hasUnsavedChanges);
    if (modifiedGalleries.length === 0 || !db) return;

    setSavingAll(true);
    try {
      await Promise.all(
        modifiedGalleries.map(async (item) => {
          const isPaid = !item.isFree;
          const watermarkEnabled = item.watermarkStyle !== 'off';
          const singlePrice = Number(item.singlePhotoPrice) || 0;
          const albumPrice = Number(item.fullAlbumPrice) || 0;

          const payload = {
            isFree: item.isFree,
            isPaid: isPaid,
            singlePhotoPrice: singlePrice,
            fullAlbumPrice: albumPrice,
            price: singlePrice,
            watermarkStyle: item.watermarkStyle,
            watermarkEnabled: watermarkEnabled,
            updatedAt: serverTimestamp()
          };

          const galleryDocRef = doc(db, 'galleries', item.id);
          await setDoc(galleryDocRef, sanitizeFirestorePayload(payload), { merge: true });

          try {
            const albumDocRef = doc(db, 'albums', item.id);
            await setDoc(albumDocRef, sanitizeFirestorePayload(payload), { merge: true });
          } catch (_) {}
        })
      );

      setGalleries((prev) => prev.map((g) => ({ ...g, hasUnsavedChanges: false })));
      showToast('success', 'Batch Saved', `Saved pricing updates for ${modifiedGalleries.length} galleries.`);
    } catch (err) {
      console.error('Batch save error:', err);
      showToast('error', 'Batch Save Failed', 'Some galleries could not be saved.');
    } finally {
      setSavingAll(false);
    }
  };

  // Studio Save handler
  const handleSaveStudioConfiguration = async () => {
    if (!selectedGalleryId) return;
    setStudioSaving(true);
    setStudioSaveSuccess(false);

    try {
      const isPaid = !isFree;
      const watermarkEnabled = watermarkStyle !== 'off';
      const singlePrice = Number(singlePhotoPrice) || 0;
      const albumPrice = Number(fullAlbumPrice) || 0;

      const updatePayload = {
        isFree: isFree,
        isPaid: isPaid,
        singlePhotoPrice: singlePrice,
        fullAlbumPrice: albumPrice,
        price: singlePrice,
        watermarkStyle: watermarkStyle,
        watermarkEnabled: watermarkEnabled,
        updatedAt: serverTimestamp()
      };

      if (db) {
        const galleryDocRef = doc(db, 'galleries', selectedGalleryId);
        await setDoc(galleryDocRef, sanitizeFirestorePayload(updatePayload), { merge: true });

        try {
          const albumDocRef = doc(db, 'albums', selectedGalleryId);
          await setDoc(albumDocRef, sanitizeFirestorePayload(updatePayload), { merge: true });
        } catch (_) {}
      }

      setGalleries((prev) =>
        prev.map((g) =>
          g.id === selectedGalleryId
            ? {
                ...g,
                isFree,
                isPaid,
                singlePhotoPrice: singlePrice,
                fullAlbumPrice: albumPrice,
                watermarkStyle,
                watermarkEnabled,
                hasUnsavedChanges: false
              }
            : g
        )
      );

      setStudioSaveSuccess(true);
      showToast(
        'success',
        'Gallery Protection Saved',
        `Saved configuration for "${selectedGallery?.title || 'Gallery'}" directly to Firestore.`
      );
      setTimeout(() => setStudioSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save gallery configuration failed:', err);
      showToast('error', 'Save Failed', 'Could not save gallery settings to Firestore.');
    } finally {
      setStudioSaving(false);
    }
  };

  // Filtered galleries list
  const filteredGalleries = useMemo(() => {
    return galleries.filter((g) => {
      const matchesSearch = 
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.eventName && g.eventName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (g.sport && g.sport.toLowerCase().includes(searchQuery.toLowerCase())) ||
        g.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'free' ? g.isFree :
        !g.isFree;

      const matchesSport = 
        sportFilter === 'all' ? true :
        (g.sport || '').toLowerCase() === sportFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSport;
    });
  }, [galleries, searchQuery, statusFilter, sportFilter]);

  // Sports list for filter dropdown
  const uniqueSports = useMemo(() => {
    const set = new Set<string>();
    galleries.forEach((g) => {
      if (g.sport) set.add(g.sport);
    });
    return Array.from(set);
  }, [galleries]);

  const totalUnsavedCount = useMemo(() => {
    return galleries.filter((g) => g.hasUnsavedChanges).length;
  }, [galleries]);

  return (
    <div id="admin-gallery-manager" className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner & Mode Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-[#0A121E] to-slate-950 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F0D0]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-[#00F0D0] text-xs font-mono font-bold tracking-wider uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Asset Protection & Pricing Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Gallery Pricing & Watermark Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Directly modify <code className="text-[#00F0D0] font-mono">isFree</code> status and numeric price fields per gallery in Firestore with instant inline controls.
          </p>
        </div>

        {/* View Mode Switcher + Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto z-10">
          <div className="p-1 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-1 w-full md:w-auto">
            <button
              type="button"
              data-testid="view-table-btn"
              onClick={() => setActiveView('table')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeView === 'table'
                  ? 'bg-[#00F0D0] text-slate-950 font-black shadow-[0_0_15px_rgba(0,240,208,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Inline Pricing Table</span>
            </button>

            <button
              type="button"
              data-testid="view-studio-btn"
              onClick={() => setActiveView('studio')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeView === 'studio'
                  ? 'bg-[#00F0D0] text-slate-950 font-black shadow-[0_0_15px_rgba(0,240,208,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Canvas Watermark Studio</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchGalleries}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
            title="Refresh from Firestore"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00F0D0]' : ''}`} />
          </button>
        </div>
      </div>

      {/* VIEW 1: INLINE PRICING TABLE (DIRECT INLINE EDITING) */}
      {activeView === 'table' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Controls Bar: Search, Filters, and Batch Save */}
          <div className="p-4 rounded-2xl bg-[#0D121F] border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search galleries by title, sport, event, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#00F0D0]"
              />
            </div>

            {/* Status & Sport Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                    statusFilter === 'all' ? 'bg-[#00F0D0]/20 text-[#00F0D0] border border-[#00F0D0]/40' : 'text-slate-400'
                  }`}
                >
                  All ({galleries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('free')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                    statusFilter === 'free' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400'
                  }`}
                >
                  Free ({galleries.filter((g) => g.isFree).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                    statusFilter === 'paid' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400'
                  }`}
                >
                  Paid ({galleries.filter((g) => !g.isFree).length})
                </button>
              </div>

              {uniqueSports.length > 0 && (
                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-300 font-mono focus:outline-hidden focus:border-[#00F0D0]"
                >
                  <option value="all">All Sports</option>
                  {uniqueSports.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}

              {/* Bulk Set Gallery Photos Button */}
              <button
                type="button"
                data-testid="bulk-set-photos-header-btn"
                onClick={() => {
                  const target = selectedGallery || filteredGalleries[0] || galleries[0];
                  if (target) {
                    setBulkPricingModalGallery(target);
                    setIsBulkPricingModalOpen(true);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-[#00F0D0]/20 hover:text-[#00F0D0] hover:border-[#00F0D0]/40 text-slate-200 border border-white/10 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                title="Bulk set isFreeForMembers and priceCents for photos in a gallery"
              >
                <Tag className="w-3.5 h-3.5 text-[#00F0D0]" />
                <span>Bulk Set Photos</span>
              </button>

              {/* Batch Save All Unsaved */}
              {totalUnsavedCount > 0 && (
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={savingAll}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F0D0] to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,240,208,0.3)] hover:brightness-110 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  {savingAll ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Save All ({totalUnsavedCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Inline Pricing Data Table */}
          <div className="rounded-3xl bg-[#0D121F] border border-white/10 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-black/40 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-bold">Gallery / Event</th>
                    <th className="py-3.5 px-3 font-bold w-36">Status (isFree)</th>
                    <th className="py-3.5 px-3 font-bold w-32">Photo Price ($)</th>
                    <th className="py-3.5 px-3 font-bold w-32">Album Price ($)</th>
                    <th className="py-3.5 px-3 font-bold w-40">Watermark Style</th>
                    <th className="py-3.5 px-4 font-bold text-right w-28">Firestore Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00F0D0]" />
                        Loading galleries and pricing from Firestore...
                      </td>
                    </tr>
                  ) : filteredGalleries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                        No galleries found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredGalleries.map((gallery) => {
                      const isSavingRow = savingRowIds.has(gallery.id);
                      const isSavedRow = savedRowIds.has(gallery.id);

                      return (
                        <tr
                          key={gallery.id}
                          className={`transition-colors hover:bg-white/[0.02] ${
                            gallery.hasUnsavedChanges ? 'bg-teal-500/[0.04]' : ''
                          }`}
                        >
                          {/* 1. Gallery Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 flex items-center justify-center">
                                {gallery.coverPhotoUrl ? (
                                  <img
                                    src={gallery.coverPhotoUrl}
                                    alt={gallery.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Camera className="w-4 h-4 text-slate-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-white text-xs truncate max-w-xs sm:max-w-sm">
                                    {gallery.title}
                                  </h3>
                                  {gallery.hasUnsavedChanges && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-mono font-bold">
                                      Unsaved
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                  <span className="text-[#00F0D0] font-bold">{gallery.sport}</span>
                                  {gallery.eventName && <span>• {gallery.eventName}</span>}
                                  <span>• {gallery.photoCount || 0} items</span>
                                  <span className="text-slate-500 hidden sm:inline">• ID: {gallery.id.slice(0, 8)}...</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. isFree Status Toggle Button */}
                          <td className="py-3.5 px-3">
                            <button
                              type="button"
                              data-testid={`toggle-status-${gallery.id}`}
                              onClick={() => handleInlineToggleFree(gallery.id)}
                              className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                                gallery.isFree
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                              }`}
                              title="Click to toggle between Free and Paid"
                            >
                              {gallery.isFree ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>FREE</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>PAID</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* 3. Single Photo Numeric Price Input */}
                          <td className="py-3.5 px-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                                $
                              </span>
                              <input
                                type="number"
                                step="0.50"
                                min="0"
                                disabled={gallery.isFree}
                                value={gallery.isFree ? 0 : gallery.singlePhotoPrice}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  handleInlineChange(gallery.id, 'singlePhotoPrice', val);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRow(gallery.id);
                                }}
                                className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-mono transition-colors focus:outline-hidden ${
                                  gallery.isFree
                                    ? 'bg-black/30 border-white/5 text-slate-500 cursor-not-allowed'
                                    : 'bg-black/60 border-white/15 text-white focus:border-[#00F0D0]'
                                }`}
                                placeholder="9.99"
                              />
                            </div>
                          </td>

                          {/* 4. Full Album Numeric Price Input */}
                          <td className="py-3.5 px-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                                $
                              </span>
                              <input
                                type="number"
                                step="1.00"
                                min="0"
                                disabled={gallery.isFree}
                                value={gallery.isFree ? 0 : gallery.fullAlbumPrice}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  handleInlineChange(gallery.id, 'fullAlbumPrice', val);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRow(gallery.id);
                                }}
                                className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-mono transition-colors focus:outline-hidden ${
                                  gallery.isFree
                                    ? 'bg-black/30 border-white/5 text-slate-500 cursor-not-allowed'
                                    : 'bg-black/60 border-white/15 text-white focus:border-[#00F0D0]'
                                }`}
                                placeholder="39.99"
                              />
                            </div>
                          </td>

                          {/* 5. Watermark Style Dropdown */}
                          <td className="py-3.5 px-3">
                            <select
                              value={gallery.watermarkStyle}
                              onChange={(e) => {
                                handleInlineChange(
                                  gallery.id,
                                  'watermarkStyle',
                                  e.target.value as WatermarkStyleType
                                );
                              }}
                              className="w-full py-1.5 px-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-[#00F0D0]"
                            >
                              <option value="full_mesh">Full Mesh Grid</option>
                              <option value="badge_only">Corner Badge</option>
                              <option value="off">Off (Clean)</option>
                            </select>
                          </td>

                          {/* 6. Row Actions: Bulk Photos & Save */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 ml-auto">
                              <button
                                type="button"
                                data-testid={`bulk-set-photos-${gallery.id}`}
                                onClick={() => {
                                  setBulkPricingModalGallery(gallery);
                                  setIsBulkPricingModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-white/10 hover:bg-[#00F0D0]/20 hover:text-[#00F0D0] hover:border-[#00F0D0]/40 text-slate-300 border border-white/10 shrink-0"
                                title="Bulk-set isFreeForMembers and priceCents for all photos in this gallery"
                              >
                                <Tag className="w-3.5 h-3.5 text-[#00F0D0]" />
                                <span className="hidden sm:inline">Bulk Photos</span>
                              </button>

                              <button
                                type="button"
                                data-testid={`save-row-${gallery.id}`}
                                onClick={() => handleSaveRow(gallery.id)}
                                disabled={isSavingRow}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                                  isSavedRow
                                    ? 'bg-emerald-500 text-slate-950 font-black'
                                    : gallery.hasUnsavedChanges
                                    ? 'bg-[#00F0D0] hover:brightness-110 text-slate-950 font-black shadow-[0_0_12px_rgba(0,240,208,0.35)]'
                                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                                }`}
                              >
                                {isSavingRow ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : isSavedRow ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Saved</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-4 border-t border-white/10 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#00F0D0]" />
                <span>
                  Showing {filteredGalleries.length} of {galleries.length} total galleries. Changes persist directly to Firestore <code className="text-slate-300">/galleries/{`{id}`}</code>.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold">
                  {galleries.filter((g) => g.isFree).length} Free
                </span>
                <span>•</span>
                <span className="text-amber-400 font-bold">
                  {galleries.filter((g) => !g.isFree).length} Paid
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CANVAS WATERMARK STUDIO (LIVE VISUAL CANVAS & DENSE CONFIG) */}
      {activeView === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Left Column: Gallery Selector with Inline Price Cards (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Select Gallery ({galleries.length})
              </span>
            </div>

            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  Loading galleries from Firestore...
                </div>
              ) : (
                galleries.map((g) => {
                  const isSelected = g.id === selectedGalleryId;
                  return (
                    <div
                      key={g.id}
                      onClick={() => selectGallery(g)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                        isSelected
                          ? 'bg-teal-500/10 border-[#00F0D0] shadow-[0_0_20px_rgba(0,240,208,0.15)]'
                          : 'bg-[#0D121F] border-white/10 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h4 className="text-xs font-bold text-white truncate">{g.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span className="text-[#00F0D0]">{g.sport}</span>
                            <span>•</span>
                            <span>{g.isFree ? 'FREE' : `PAID ($${g.singlePhotoPrice})`}</span>
                          </div>
                        </div>

                        {/* Quick inline status badge click toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInlineToggleFree(g.id);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                            g.isFree
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                          }`}
                          title="Click to toggle Free/Paid"
                        >
                          {g.isFree ? 'FREE' : 'PAID'}
                        </button>
                      </div>

                      {/* Quick inline price edit within card */}
                      {!g.isFree && (
                        <div
                          className="flex items-center gap-2 pt-2 border-t border-white/10 text-[10px] font-mono"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex-1 flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
                            <span className="text-slate-400">$</span>
                            <input
                              type="number"
                              step="0.50"
                              min="0"
                              value={g.singlePhotoPrice}
                              onChange={(e) => {
                                handleInlineChange(
                                  g.id,
                                  'singlePhotoPrice',
                                  parseFloat(e.target.value) || 0
                                );
                              }}
                              className="w-full bg-transparent text-white focus:outline-hidden"
                              placeholder="Photo"
                            />
                            <span className="text-slate-500 text-[9px]">/pic</span>
                          </div>

                          <div className="flex-1 flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
                            <span className="text-slate-400">$</span>
                            <input
                              type="number"
                              step="1.00"
                              min="0"
                              value={g.fullAlbumPrice}
                              onChange={(e) => {
                                handleInlineChange(
                                  g.id,
                                  'fullAlbumPrice',
                                  parseFloat(e.target.value) || 0
                                );
                              }}
                              className="w-full bg-transparent text-white focus:outline-hidden"
                              placeholder="Album"
                            />
                            <span className="text-slate-500 text-[9px]">/all</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSaveRow(g.id)}
                            className="p-1 rounded-lg bg-[#00F0D0]/20 hover:bg-[#00F0D0] hover:text-black text-[#00F0D0] transition-colors cursor-pointer"
                            title="Save Pricing"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Configuration & Live Watermark Preview (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedGallery ? (
              <div className="p-6 rounded-3xl bg-[#0D121F] border border-white/10 space-y-6 shadow-2xl">
                {/* Selected Gallery Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-teal-400 font-bold tracking-wider">
                      Configuring Gallery
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      {selectedGallery.title}
                    </h2>
                  </div>

                  <div className="text-xs font-mono text-slate-400">
                    ID: <span className="text-slate-300">{selectedGallery.id}</span>
                  </div>
                </div>

                {/* Setting 1: Gallery Status [Free] or [Paid - $USD] */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <DollarSign className="w-4 h-4 text-[#00F0D0]" />
                      <span>Gallery Pricing Status (isFree)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {isFree ? 'Free Instant High-Res Downloads' : 'Asset Locked Behind Payment'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-black/50 border border-white/10">
                    {/* Status: Free */}
                    <button
                      type="button"
                      data-testid="status-free-btn"
                      onClick={() => {
                        setIsFree(true);
                        handleInlineChange(selectedGallery.id, 'isFree', true);
                      }}
                      className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isFree
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>[Free Gallery]</span>
                    </button>

                    {/* Status: Paid */}
                    <button
                      type="button"
                      data-testid="status-paid-btn"
                      onClick={() => {
                        setIsFree(false);
                        handleInlineChange(selectedGallery.id, 'isFree', false);
                      }}
                      className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        !isFree
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      <span>[Paid - $USD]</span>
                    </button>
                  </div>

                  {/* Pricing Numeric Inputs */}
                  {!isFree && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-mono">
                          Single Photo Unlock ($USD)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">$</span>
                          <input
                            type="number"
                            step="0.50"
                            min="0"
                            value={singlePhotoPrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setSinglePhotoPrice(val);
                              handleInlineChange(selectedGallery.id, 'singlePhotoPrice', val);
                            }}
                            className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:border-amber-400 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-mono">
                          Full Album Pass ($USD)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">$</span>
                          <input
                            type="number"
                            step="1.00"
                            min="0"
                            value={fullAlbumPrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setFullAlbumPrice(val);
                              handleInlineChange(selectedGallery.id, 'fullAlbumPrice', val);
                            }}
                            className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:border-amber-400 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Setting 2: Watermark Style [Full Mesh Protection] | [Corner Badge Only] | [Off] */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-4 h-4 text-[#00F0D0]" />
                      <span>Watermark Style & Protection</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Live Anti-Theft Grid & Corner Badge
                    </span>
                  </div>

                  {/* Enable Proof Watermarking Switch */}
                  <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between">
                    <div>
                      <label htmlFor="admin-enable-proof-watermarking-switch" className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono cursor-pointer">
                        <ShieldCheck className="w-4 h-4 text-[#00F0D0]" />
                        <span>Enable Proof Watermarking</span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        Directly connected to the <code className="text-[#00F0D0]">watermarkEnabled</code> boolean in Firestore gallery document.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input
                        id="admin-enable-proof-watermarking-switch"
                        data-testid="admin-enable-proof-watermarking-switch"
                        type="checkbox"
                        checked={watermarkStyle !== 'off' && selectedGallery.watermarkEnabled !== false}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          const newStyle = enabled ? (watermarkStyle === 'off' ? 'full_mesh' : watermarkStyle) : 'off';
                          setWatermarkStyle(newStyle);
                          handleInlineChange(selectedGallery.id, 'watermarkStyle', newStyle);
                          handleInlineChange(selectedGallery.id, 'watermarkEnabled', enabled);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00F0D0]"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      data-testid="watermark-full-mesh-btn"
                      onClick={() => {
                        setWatermarkStyle('full_mesh');
                        handleInlineChange(selectedGallery.id, 'watermarkStyle', 'full_mesh');
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        watermarkStyle === 'full_mesh'
                          ? 'bg-[#00F0D0]/15 border-[#00F0D0] text-white shadow-[0_0_20px_rgba(0,240,208,0.25)]'
                          : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-white">
                          Full Mesh Protection
                        </span>
                        {watermarkStyle === 'full_mesh' && <Check className="w-4 h-4 text-[#00F0D0]" />}
                      </div>
                      <p className="text-[10px] text-slate-300">
                        Repeating -40° diagonal text grid across full canvas + anchored corner badge.
                      </p>
                    </button>

                    <button
                      type="button"
                      data-testid="watermark-badge-only-btn"
                      onClick={() => {
                        setWatermarkStyle('badge_only');
                        handleInlineChange(selectedGallery.id, 'watermarkStyle', 'badge_only');
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        watermarkStyle === 'badge_only'
                          ? 'bg-[#00F0D0]/15 border-[#00F0D0] text-white shadow-[0_0_20px_rgba(0,240,208,0.25)]'
                          : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-white">
                          Corner Badge Only
                        </span>
                        {watermarkStyle === 'badge_only' && <Check className="w-4 h-4 text-[#00F0D0]" />}
                      </div>
                      <p className="text-[10px] text-slate-300">
                        Clean photo body with anchored bottom-right "⚡ JUST1PLAY PHOTOS" pill.
                      </p>
                    </button>

                    <button
                      type="button"
                      data-testid="watermark-off-btn"
                      onClick={() => {
                        setWatermarkStyle('off');
                        handleInlineChange(selectedGallery.id, 'watermarkStyle', 'off');
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        watermarkStyle === 'off'
                          ? 'bg-rose-500/15 border-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                          : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-white">
                          Off (No Watermark)
                        </span>
                        {watermarkStyle === 'off' && <Check className="w-4 h-4 text-rose-400" />}
                      </div>
                      <p className="text-[10px] text-slate-300">
                        Unprotected clean preview. Ideal for public PR releases & free team albums.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Bulk Set Photo Pricing & Member Access Panel */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-black/60 to-[#00F0D0]/5 border border-[#00F0D0]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#00F0D0]" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Bulk Set Photo Pricing & Member Access
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      Bulk-set <code className="text-[#00F0D0]">isFreeForMembers</code> and <code className="text-[#00F0D0]">priceCents</code> across all photos in <span className="text-white font-bold">"{selectedGallery.title}"</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkPricingModalGallery(selectedGallery);
                      setIsBulkPricingModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#00F0D0]/15 hover:bg-[#00F0D0]/25 border border-[#00F0D0]/40 text-[#00F0D0] hover:text-white text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(0,240,208,0.15)]"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Configure Photos ({selectedGallery.photoCount || 0})</span>
                  </button>
                </div>

                {/* Live Interactive Watermark Preview Stage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[#00F0D0]" />
                      <span>Real-Time Watermark Canvas Preview</span>
                    </span>
                    <span className="text-[10px] font-mono text-teal-300">
                      {renderingPreview ? 'Rendering off-screen canvas...' : 'HTML5 Canvas Engine'}
                    </span>
                  </div>

                  <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black border border-white/15 flex items-center justify-center">
                    <img
                      src={previewImageUrl}
                      alt="Watermark Preview"
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />

                    <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-white text-[10px] font-mono font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00F0D0] animate-pulse" />
                      <span>STYLE: {watermarkStyle.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button: Save Directly to Firestore */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                    <Info className="w-4 h-4 text-slate-400" />
                    <span>Saves directly to Firestore: /galleries/{selectedGallery.id}</span>
                  </div>

                  <button
                    type="button"
                    data-testid="save-gallery-config-btn"
                    onClick={handleSaveStudioConfiguration}
                    disabled={studioSaving}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-[#00F0D0] to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_24px_rgba(0,240,208,0.35)] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {studioSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Saving to Firestore...</span>
                      </>
                    ) : studioSaveSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-slate-950" />
                        <span>Configuration Saved!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-slate-950" />
                        <span>Save Gallery Configuration</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-mono text-xs border border-dashed border-white/10 rounded-2xl">
                Select a gallery from the left to configure watermark protection.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Set Photo Pricing Modal */}
      <BulkSetPhotoPricingModal
        isOpen={isBulkPricingModalOpen}
        onClose={() => setIsBulkPricingModalOpen(false)}
        gallery={bulkPricingModalGallery}
        onSuccess={(result) => {
          setGalleries((prev) =>
            prev.map((g) => {
              if (g.id === result.galleryId) {
                const safeFree = result.isFreeForMembers || result.priceCents === 0;
                return {
                  ...g,
                  isFreeForMembers: result.isFreeForMembers,
                  priceCents: result.priceCents,
                  singlePhotoPrice: result.priceCents / 100,
                  isFree: safeFree,
                  isPaid: !safeFree,
                  hasUnsavedChanges: false
                };
              }
              return g;
            })
          );
          if (selectedGallery?.id === result.galleryId) {
            const safeFree = result.isFreeForMembers || result.priceCents === 0;
            setIsFree(safeFree);
            setSinglePhotoPrice(result.priceCents / 100);
          }
        }}
      />
    </div>
  );
};

export default AdminGalleryManager;
