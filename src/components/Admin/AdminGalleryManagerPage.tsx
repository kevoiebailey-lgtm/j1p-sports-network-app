import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, 
  Trash2, 
  Edit3, 
  Plus, 
  Upload, 
  Layers, 
  FolderPlus, 
  Search, 
  Filter, 
  CheckCircle2, 
  X, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  Loader2, 
  Image as ImageIcon, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw,
  FolderMinus,
  Save,
  Check,
  Tag,
  Trophy,
  Zap,
  ExternalLink,
  DollarSign,
  Lock
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  setDoc,
  addDoc, 
  serverTimestamp, 
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { GalleryMediaItem } from '../../types';
import { uploadMediaAsset, STORAGE_FOLDERS, verifyStorageBucketPermissions } from '../../services/storageService';
import { SportsGalleryImage } from '../RoleViews/Universal/SportsGalleryImage';
import { MediaGalleryClearUtility } from './MediaGalleryClearUtility';
import { GoogleDriveSyncModal } from './GoogleDriveSyncModal';
import { AdminGalleryManager } from '../admin/AdminGalleryManager';
import { BulkSetPhotoPricingModal } from '../admin/BulkSetPhotoPricingModal';
import { HardDrive } from 'lucide-react';

export const AdminGalleryManagerPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'albums' | 'photos' | 'watermark' | 'gdrive' | 'new-media' | 'cleaner'>('albums');
  const [items, setItems] = useState<GalleryMediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Multi-Selection for Batch Deletion
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState<boolean>(false);

  // Bulk Set Photo Pricing Modal State
  const [bulkPricingModalAlbum, setBulkPricingModalAlbum] = useState<any | null>(null);
  const [isBulkPricingModalOpen, setIsBulkPricingModalOpen] = useState<boolean>(false);

  // Album Inspection State (View and manage photos inside an album)
  const [inspectingAlbum, setInspectingAlbum] = useState<{
    albumTitle: string;
    eventName: string;
    sport: string;
    photos: GalleryMediaItem[];
    coverUrl?: string;
  } | null>(null);

  // Edit Photo / Media Modal State
  const [editingItem, setEditingItem] = useState<GalleryMediaItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEventName, setEditEventName] = useState('');
  const [editAlbumName, setEditAlbumName] = useState('');
  const [editSport, setEditSport] = useState('Basketball');
  const [editCategory, setEditCategory] = useState('Game Action');
  const [editPrice, setEditPrice] = useState<number>(9.99);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [editWatermarkedUrl, setEditWatermarkedUrl] = useState('');

  // Edit Album Modal State (Batch updates all photos in an album)
  const [editingAlbum, setEditingAlbum] = useState<{ oldTitle: string; eventName: string; sport: string; count: number } | null>(null);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumEvent, setNewAlbumEvent] = useState('');
  const [newAlbumSport, setNewAlbumSport] = useState('Basketball');
  const [newAlbumCoverUrl, setNewAlbumCoverUrl] = useState('');

  // Single / Batch Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSport, setUploadSport] = useState('Basketball');
  const [uploadCategory, setUploadCategory] = useState('Game Action');
  const [uploadEventName, setUploadEventName] = useState('West Coast Showcase');
  const [uploadAlbumName, setUploadAlbumName] = useState('Championship Finals');
  const [uploadPrice, setUploadPrice] = useState('9.99');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch Firestore Gallery collection
  const fetchGalleryItems = async () => {
    setLoading(true);
    try {
      if (!db) return;
      const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(150));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const list: GalleryMediaItem[] = snap.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            originalUrl: data.originalUrl || data.imageUrl || data.url || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1200',
            watermarkedUrl: data.watermarkedUrl || data.previewUrl || data.imageUrl || data.originalUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1200',
            isWatermarked: !!data.isWatermarked,
            photographerId: data.photographerId || '',
            photographerName: data.photographerName || data.photographer || 'Official Media Team',
            eventName: data.eventName || data.event || 'Tournament Showcase',
            albumName: data.albumName || data.album || 'General Action Shots',
            category: data.category || 'Game Action',
            sport: data.sport || 'Basketball',
            teams: Array.isArray(data.teams) ? data.teams : [],
            title: data.title || 'Action Shot',
            caption: data.caption || '',
            hypesCount: typeof data.hypesCount === 'number' ? data.hypesCount : 0,
            userHypes: data.userHypes || {},
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
            resolution: data.resolution || '4K Ultra-HD',
            tags: Array.isArray(data.tags) ? data.tags : [],
            price: typeof data.price === 'number' ? data.price : 9.99
          };
        });
        setItems(list);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.warn('Error fetching gallery items:', err);
      showToast('error', 'Sync Issue', 'Could not load gallery items from Firebase. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedSport !== 'All') {
        const s = item.sport.toLowerCase();
        const sel = selectedSport.toLowerCase();
        if (!s.includes(sel) && !sel.includes(s)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (item.title || '').toLowerCase().includes(q);
        const matchesEvent = (item.eventName || '').toLowerCase().includes(q);
        const matchesAlbum = (item.albumName || '').toLowerCase().includes(q);
        const matchesSport = (item.sport || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesEvent && !matchesAlbum && !matchesSport) return false;
      }
      return true;
    });
  }, [items, selectedSport, searchQuery]);

  // Grouped by Album
  const albumGroups = useMemo(() => {
    const map = new Map<string, GalleryMediaItem[]>();
    items.forEach(item => {
      const albumTitle = item.albumName || 'General Action Shots';
      const eventName = item.eventName || 'Tournament Showcase';
      const key = `${albumTitle}:::${eventName}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });

    return Array.from(map.entries()).map(([key, photoList]) => {
      const [albumTitle, eventName] = key.split(':::');
      const firstPhoto = photoList[0];
      const isFree = photoList.some(p => (p as any).isFree === true) || photoList.every(p => (p.price || 0) === 0);
      const price = typeof firstPhoto?.price === 'number' ? firstPhoto.price : 9.99;
      return {
        key,
        albumTitle,
        eventName,
        sport: photoList[0]?.sport || 'Basketball',
        photos: photoList,
        coverUrl: photoList[0]?.watermarkedUrl || photoList[0]?.originalUrl,
        totalHypes: photoList.reduce((acc, p) => acc + (p.hypesCount || 0), 0),
        isFree,
        price
      };
    });
  }, [items]);

  const filteredAlbums = useMemo(() => {
    return albumGroups.filter(album => {
      if (selectedSport !== 'All') {
        const s = album.sport.toLowerCase();
        const sel = selectedSport.toLowerCase();
        if (!s.includes(sel) && !sel.includes(s)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = album.albumTitle.toLowerCase().includes(q);
        const matchEvent = album.eventName.toLowerCase().includes(q);
        const matchSport = album.sport.toLowerCase().includes(q);
        if (!matchTitle && !matchEvent && !matchSport) return false;
      }
      return true;
    });
  }, [albumGroups, selectedSport, searchQuery]);

  // INLINE ALBUM PRICING STATE & HANDLERS
  const [albumPricingEdits, setAlbumPricingEdits] = useState<Record<string, { isFree: boolean; price: number; isFreeForMembers?: boolean; priceCents?: number; hasChanged?: boolean; saving?: boolean }>>({});

  const handleOpenBulkModalForAlbum = (album: {
    albumTitle: string;
    eventName: string;
    sport: string;
    photos: GalleryMediaItem[];
    coverUrl?: string;
    price?: number;
    isFree?: boolean;
    key?: string;
  }) => {
    const firstPhoto = album.photos?.[0];
    const targetId = (firstPhoto as any)?.albumId || (firstPhoto as any)?.galleryId || album.key || album.albumTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const isFree = album.isFree ?? ((firstPhoto as any)?.isFree === true || (firstPhoto?.price || 0) === 0);
    const priceDollars = album.price ?? (firstPhoto?.price || 9.99);

    setBulkPricingModalAlbum({
      id: targetId,
      title: album.albumTitle,
      eventName: album.eventName,
      sport: album.sport,
      coverPhotoUrl: album.coverUrl || firstPhoto?.watermarkedUrl || firstPhoto?.originalUrl,
      photoCount: album.photos.length,
      isFree,
      isFreeForMembers: (firstPhoto as any)?.isFreeForMembers !== undefined ? (firstPhoto as any).isFreeForMembers : isFree,
      priceCents: typeof (firstPhoto as any)?.priceCents === 'number' ? (firstPhoto as any).priceCents : Math.round(priceDollars * 100),
      singlePhotoPrice: priceDollars,
      photos: album.photos
    });
    setIsBulkPricingModalOpen(true);
  };

  const handleToggleAlbumFree = (albumKey: string, initialIsFree: boolean, initialPrice: number) => {
    setAlbumPricingEdits(prev => {
      const current = prev[albumKey] || { isFree: initialIsFree, price: initialPrice };
      const nextIsFree = !current.isFree;
      return {
        ...prev,
        [albumKey]: {
          ...current,
          isFree: nextIsFree,
          isFreeForMembers: nextIsFree,
          priceCents: nextIsFree ? 0 : Math.round((current.price || 9.99) * 100),
          hasChanged: true
        }
      };
    });
  };

  const handleAlbumPriceChange = (albumKey: string, newPrice: number, currentIsFree: boolean) => {
    setAlbumPricingEdits(prev => {
      const current = prev[albumKey] || { isFree: currentIsFree, price: newPrice };
      return {
        ...prev,
        [albumKey]: {
          ...current,
          price: newPrice,
          priceCents: Math.round(newPrice * 100),
          hasChanged: true
        }
      };
    });
  };

  const handleSaveAlbumPricing = async (albumKey: string, albumTitle: string, eventName: string, photos: GalleryMediaItem[]) => {
    const edit = albumPricingEdits[albumKey];
    const targetIsFree = edit !== undefined ? edit.isFree : (photos.some(p => (p as any).isFree === true) || photos.every(p => (p.price || 0) === 0));
    const targetPrice = edit !== undefined ? edit.price : (photos[0]?.price || 9.99);
    const targetPriceCents = typeof edit?.priceCents === 'number'
      ? edit.priceCents
      : Math.round((targetIsFree ? 0 : Number(targetPrice) || 0) * 100);
    const targetIsFreeForMembers = edit?.isFreeForMembers !== undefined
      ? edit.isFreeForMembers
      : targetIsFree;

    setAlbumPricingEdits(prev => ({
      ...prev,
      [albumKey]: { ...(prev[albumKey] || { isFree: targetIsFree, price: targetPrice }), saving: true }
    }));

    try {
      if (db && photos.length > 0) {
        const batch = writeBatch(db);
        photos.forEach(p => {
          batch.update(doc(db, 'gallery', p.id), {
            isFree: targetIsFree,
            isPaid: !targetIsFree,
            price: targetIsFree ? 0 : Number(targetPrice) || 0,
            priceCents: targetPriceCents,
            isFreeForMembers: targetIsFreeForMembers,
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();

        // Also update galleries / albums doc if matching
        try {
          const matchingSnap = await getDocs(query(collection(db, 'galleries'), limit(30)));
          matchingSnap.forEach(d => {
            const data = d.data();
            if (data.title === albumTitle || data.eventName === eventName) {
              setDoc(doc(db, 'galleries', d.id), {
                isFree: targetIsFree,
                isPaid: !targetIsFree,
                singlePhotoPrice: targetIsFree ? 0 : Number(targetPrice) || 0,
                price: targetIsFree ? 0 : Number(targetPrice) || 0,
                priceCents: targetPriceCents,
                isFreeForMembers: targetIsFreeForMembers,
                updatedAt: serverTimestamp()
              }, { merge: true });
            }
          });
        } catch (_) {}
      }

      setItems(prev => prev.map(p => {
        if ((p.albumName || 'General Action Shots') === albumTitle && (p.eventName || 'Tournament Showcase') === eventName) {
          return {
            ...p,
            isFree: targetIsFree,
            price: targetIsFree ? 0 : Number(targetPrice) || 0,
            priceCents: targetPriceCents,
            isFreeForMembers: targetIsFreeForMembers
          };
        }
        return p;
      }));

      if (inspectingAlbum && inspectingAlbum.albumTitle === albumTitle) {
        setInspectingAlbum(prev => prev ? {
          ...prev,
          photos: prev.photos.map(p => ({
            ...p,
            isFree: targetIsFree,
            price: targetIsFree ? 0 : Number(targetPrice) || 0,
            priceCents: targetPriceCents,
            isFreeForMembers: targetIsFreeForMembers
          }))
        } : null);
      }

      setAlbumPricingEdits(prev => ({
        ...prev,
        [albumKey]: { isFree: targetIsFree, price: targetPrice, isFreeForMembers: targetIsFreeForMembers, priceCents: targetPriceCents, hasChanged: false, saving: false }
      }));

      showToast('success', 'Album Pricing Saved', `Updated "${albumTitle}" (${photos.length} photos) to ${targetIsFree ? 'Free' : `$${targetPrice}`} (${targetPriceCents}¢, FreeForMembers: ${targetIsFreeForMembers ? 'Yes' : 'No'}).`);
    } catch (err) {
      console.error('Save album pricing error:', err);
      showToast('error', 'Save Failed', 'Could not update pricing in Firestore.');
      setAlbumPricingEdits(prev => ({
        ...prev,
        [albumKey]: { ...(prev[albumKey] || { isFree: targetIsFree, price: targetPrice }), saving: false }
      }));
    }
  };

  // DELETE SINGLE PHOTO IN FIREBASE
  const handleDeletePhoto = async (item: GalleryMediaItem) => {
    const photoTitle = item.title || 'this photo';
    if (!confirm(`Are you sure you want to permanently delete "${photoTitle}" from Firebase and public galleries? This cannot be undone.`)) {
      return;
    }

    setActionLoadingId(item.id);
    try {
      if (db) {
        await deleteDoc(doc(db, 'gallery', item.id));
      }

      // Immediate UI state refresh
      setItems(prev => prev.filter(p => p.id !== item.id));

      // Also refresh inspecting album state if open
      if (inspectingAlbum) {
        setInspectingAlbum(prev => {
          if (!prev) return null;
          const updatedPhotos = prev.photos.filter(p => p.id !== item.id);
          return {
            ...prev,
            photos: updatedPhotos,
            coverUrl: updatedPhotos[0]?.watermarkedUrl || updatedPhotos[0]?.originalUrl || prev.coverUrl
          };
        });
      }

      // If photo was in edit modal, close it
      if (editingItem && editingItem.id === item.id) {
        setEditingItem(null);
      }

      // Remove from selected set
      setSelectedPhotoIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });

      showToast('success', 'Media Deleted', `"${photoTitle}" was permanently removed from Firebase.`);
    } catch (err: any) {
      console.error('Delete photo error:', err);
      showToast('error', 'Delete Failed', err?.message || 'Could not delete item from Firebase.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // DELETE ENTIRE ALBUM IN FIREBASE (CASCADE)
  const handleDeleteAlbum = async (albumTitle: string, eventName: string, photos: GalleryMediaItem[]) => {
    const confirmPrompt = `Are you sure you want to permanently delete the entire album "${albumTitle}" and all ${photos.length} photos inside it from Firebase? This action cannot be undone.`;
    if (!confirm(confirmPrompt)) {
      return;
    }

    setLoading(true);
    try {
      if (db && photos.length > 0) {
        // Use batch deletion for atomic execution
        const batch = writeBatch(db);
        photos.forEach(photo => {
          batch.delete(doc(db, 'gallery', photo.id));
        });
        await batch.commit();
      }

      // Immediate local state update
      const deletedIds = new Set(photos.map(p => p.id));
      setItems(prev => prev.filter(p => !deletedIds.has(p.id)));

      // Close inspecting modal or edit album modal if they matched this album
      if (inspectingAlbum && inspectingAlbum.albumTitle === albumTitle) {
        setInspectingAlbum(null);
      }
      if (editingAlbum && editingAlbum.oldTitle === albumTitle) {
        setEditingAlbum(null);
      }

      // Clear from selection set
      setSelectedPhotoIds(prev => {
        const next = new Set(prev);
        deletedIds.forEach(id => next.delete(id));
        return next;
      });

      showToast('success', 'Album Deleted from Firebase', `Album "${albumTitle}" and ${photos.length} linked photo(s) deleted successfully.`);
    } catch (err: any) {
      console.error('Delete album batch error:', err);
      showToast('error', 'Batch Delete Failed', err?.message || 'Could not delete all album media from Firebase.');
    } finally {
      setLoading(false);
    }
  };

  // MULTI-SELECT BATCH DELETE IN FIREBASE
  const handleBatchDeleteSelected = async () => {
    if (selectedPhotoIds.size === 0) return;

    const count = selectedPhotoIds.size;
    if (!confirm(`Are you sure you want to permanently delete ${count} selected photo(s) from Firebase? This action cannot be undone.`)) {
      return;
    }

    setBatchDeleting(true);
    try {
      if (db) {
        const batch = writeBatch(db);
        selectedPhotoIds.forEach(id => {
          batch.delete(doc(db, 'gallery', id));
        });
        await batch.commit();
      }

      const idsToDelete = new Set(selectedPhotoIds);
      // Immediately refresh items state
      setItems(prev => prev.filter(p => !idsToDelete.has(p.id)));

      if (inspectingAlbum) {
        setInspectingAlbum(prev => {
          if (!prev) return null;
          const updatedPhotos = prev.photos.filter(p => !idsToDelete.has(p.id));
          return {
            ...prev,
            photos: updatedPhotos,
            coverUrl: updatedPhotos[0]?.watermarkedUrl || updatedPhotos[0]?.originalUrl || prev.coverUrl
          };
        });
      }

      setSelectedPhotoIds(new Set());
      showToast('success', 'Batch Delete Complete', `Successfully removed ${count} photo(s) from Firebase.`);
    } catch (err: any) {
      console.error('Batch delete error:', err);
      showToast('error', 'Batch Delete Failed', err?.message || 'Could not delete selected items from Firebase.');
    } finally {
      setBatchDeleting(false);
    }
  };

  const togglePhotoSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPhotoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const allVisibleIds = filteredItems.map(p => p.id);
    setSelectedPhotoIds(prev => {
      const allSelected = allVisibleIds.every(id => prev.has(id));
      if (allSelected) {
        // Deselect all visible
        const next = new Set(prev);
        allVisibleIds.forEach(id => next.delete(id));
        return next;
      } else {
        // Select all visible
        const next = new Set(prev);
        allVisibleIds.forEach(id => next.add(id));
        return next;
      }
    });
  };

  // EDIT SINGLE PHOTO
  const openEditPhoto = (item: GalleryMediaItem) => {
    setEditingItem(item);
    setEditTitle(item.title || '');
    setEditEventName(item.eventName || '');
    setEditAlbumName(item.albumName || '');
    setEditSport(item.sport || 'Basketball');
    setEditCategory(item.category || 'Game Action');
    setEditPrice(typeof item.price === 'number' ? item.price : 9.99);
    setEditThumbnailUrl(item.watermarkedUrl || item.originalUrl || '');
    setEditWatermarkedUrl(item.watermarkedUrl || '');
  };

  const handleSavePhotoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setActionLoadingId(editingItem.id);
    try {
      const updatedFields: any = {
        title: editTitle.trim(),
        eventName: editEventName.trim(),
        albumName: editAlbumName.trim(),
        sport: editSport,
        category: editCategory,
        price: Number(editPrice) || 9.99
      };

      if (editThumbnailUrl.trim()) {
        updatedFields.watermarkedUrl = editThumbnailUrl.trim();
        // Also update originalUrl if empty
        if (!editingItem.originalUrl) {
          updatedFields.originalUrl = editThumbnailUrl.trim();
        }
      }

      if (db) {
        await updateDoc(doc(db, 'gallery', editingItem.id), updatedFields);
      }

      setItems(prev => prev.map(p => p.id === editingItem.id ? { ...p, ...updatedFields } : p));
      showToast('success', 'Media & Thumbnail Updated', 'Changes saved to Firebase.');
      setEditingItem(null);
    } catch (err: any) {
      console.error('Update photo error:', err);
      showToast('error', 'Update Failed', err?.message || 'Could not save photo updates.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // EDIT ENTIRE ALBUM (BATCH RENAME/UPDATE)
  const openEditAlbum = (album: { albumTitle: string; eventName: string; sport: string; photos: GalleryMediaItem[]; coverUrl?: string }) => {
    setEditingAlbum({
      oldTitle: album.albumTitle,
      eventName: album.eventName,
      sport: album.sport,
      count: album.photos.length
    });
    setNewAlbumTitle(album.albumTitle);
    setNewAlbumEvent(album.eventName);
    setNewAlbumSport(album.sport);
    setNewAlbumCoverUrl(album.coverUrl || album.photos[0]?.watermarkedUrl || album.photos[0]?.originalUrl || '');
  };

  const handleSaveAlbumEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlbum) return;

    setLoading(true);
    try {
      const albumPhotos = items.filter(
        p => (p.albumName || 'General Action Shots') === editingAlbum.oldTitle && 
             (p.eventName || 'Tournament Showcase') === editingAlbum.eventName
      );

      if (db && albumPhotos.length > 0) {
        const batch = writeBatch(db);
        albumPhotos.forEach((p, idx) => {
          const updatePayload: any = {
            albumName: newAlbumTitle.trim(),
            eventName: newAlbumEvent.trim(),
            sport: newAlbumSport
          };
          if (idx === 0 && newAlbumCoverUrl.trim()) {
            updatePayload.watermarkedUrl = newAlbumCoverUrl.trim();
          }
          batch.update(doc(db, 'gallery', p.id), updatePayload);
        });
        await batch.commit();
      }

      setItems(prev => prev.map(p => {
        if ((p.albumName || 'General Action Shots') === editingAlbum.oldTitle && 
            (p.eventName || 'Tournament Showcase') === editingAlbum.eventName) {
          return {
            ...p,
            albumName: newAlbumTitle.trim(),
            eventName: newAlbumEvent.trim(),
            sport: newAlbumSport
          };
        }
        return p;
      }));

      showToast('success', 'Album Updated', `Renamed "${editingAlbum.oldTitle}" to "${newAlbumTitle.trim()}" across ${albumPhotos.length} photos.`);
      setEditingAlbum(null);
    } catch (err: any) {
      console.error('Update album error:', err);
      showToast('error', 'Album Update Failed', err?.message || 'Could not update album.');
    } finally {
      setLoading(false);
    }
  };

  // UPLOAD NEW MEDIA / ALBUM PHOTO TO FIREBASE
  const handleUploadFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Please select a photo or clip under 50MB.');
      return;
    }

    setUploadFile(file);
    setUploadPreviewUrl(URL.createObjectURL(file));
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('error', 'No File Selected', 'Please choose a photo or video to upload.');
      return;
    }

    const bucketCheck = verifyStorageBucketPermissions();
    if (!bucketCheck.valid) {
      showToast('error', 'Storage Unavailable', bucketCheck.error || 'Firebase Storage bucket configuration error.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      const isVideo = uploadFile.type.startsWith('video/');
      const targetFolder = isVideo ? STORAGE_FOLDERS.MEDIA_VAULT_VIDEOS : STORAGE_FOLDERS.MEDIA_VAULT_PHOTOS;

      const permanentDownloadUrl = await uploadMediaAsset(
        uploadFile,
        targetFolder,
        (progress) => setUploadProgress(progress)
      );

      const authorName = profile?.displayName || user?.displayName || 'Super Admin Media Team';
      const cleanSport = uploadSport.replace(/^[^\w\s&]+/, '').trim() || 'Basketball';
      const nowIso = new Date().toISOString();

      const galleryItem: Omit<GalleryMediaItem, 'id'> = {
        originalUrl: permanentDownloadUrl,
        watermarkedUrl: permanentDownloadUrl,
        isWatermarked: false,
        photographerId: user?.uid || 'super-admin',
        photographerName: authorName,
        eventName: uploadEventName.trim() || 'Official Showcase',
        albumName: uploadAlbumName.trim() || 'Tournament Action',
        category: uploadCategory,
        sport: cleanSport,
        teams: [],
        title: uploadTitle.trim() || (isVideo ? 'Game Film Reel' : 'Action Shot'),
        caption: `${uploadCategory} in ${cleanSport}`,
        hypesCount: 0,
        userHypes: {},
        createdAt: nowIso,
        resolution: '4K Ultra-HD',
        tags: [cleanSport.toLowerCase(), uploadCategory.toLowerCase(), 'official'],
        price: parseFloat(uploadPrice) || 9.99
      };

      const docRef = await addDoc(collection(db, 'gallery'), {
        ...galleryItem,
        createdAt: serverTimestamp()
      });

      const newItem: GalleryMediaItem = {
        ...galleryItem,
        id: docRef.id
      };

      setItems(prev => [newItem, ...prev]);
      showToast('success', 'Media Published to Firebase', `"${galleryItem.title}" is now live in the gallery and available for users.`);
      
      // Reset form
      setUploadFile(null);
      setUploadPreviewUrl(null);
      setUploadTitle('');
      setActiveTab('albums');
    } catch (err: any) {
      console.error('Upload media error:', err);
      showToast('error', 'Upload Failed', err?.message || 'Could not upload media to Firebase.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* Top Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#212A31]/90 border border-slate-800 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F2FE]/5 rounded-full blur-[100px] pointer-events-none" />

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] text-xs font-mono font-bold uppercase tracking-widest mb-3">
            <Camera className="w-3.5 h-3.5 text-[#00F2FE]" />
            <span>Super Admin Gallery Command</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-white font-sans tracking-tight">
            GALLERY & ALBUM <span className="text-[#00F2FE]">MANAGEMENT</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mt-1 font-sans">
            Directly create, edit, customize, or permanently delete albums and 4K media items directly inside Firebase Firestore and Storage.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchGalleryItems}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
            title="Refresh Firebase Gallery Items"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00F2FE]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setActiveTab('new-media')}
            className="px-5 py-2.5 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Upload New 4K Media</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Filters */}
      <div className="p-4 rounded-2xl bg-[#212A31]/90 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Tab Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('albums')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'albums'
                ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.3)] font-black'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Albums & Collections ({albumGroups.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.3)] font-black'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>All Photos ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('watermark')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'watermark'
                ? 'bg-gradient-to-r from-[#00F0D0] to-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(0,240,208,0.4)] font-black'
                : 'bg-teal-950/40 border border-teal-500/30 text-teal-300 hover:text-white hover:bg-teal-900/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Watermark & Protection Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('gdrive')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'gdrive'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,184,212,0.4)] font-black'
                : 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-900/50'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Google Drive Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('new-media')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'new-media'
                ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.3)] font-black'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Direct Uploader</span>
          </button>

          <button
            onClick={() => setActiveTab('cleaner')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'cleaner'
                ? 'bg-rose-500 text-slate-950 shadow-[0_0_15px_rgba(244,63,94,0.4)] font-black'
                : 'bg-slate-800/80 text-slate-400 hover:text-rose-300'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Storage & Gallery Cleaner</span>
          </button>
        </div>

        {/* Search & Sport Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search albums, events..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE]"
            />
          </div>

          <select
            value={selectedSport}
            onChange={e => setSelectedSport(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
          >
            <option value="All">All Sports</option>
            <option value="Basketball">🏀 Basketball</option>
            <option value="Football">🏈 Football</option>
            <option value="Soccer">⚽ Soccer</option>
            <option value="Track">🏃 Track & Field</option>
            <option value="Cheer">📣 Cheer</option>
            <option value="Volleyball">🏐 Volleyball</option>
            <option value="Baseball">⚾ Baseball</option>
            <option value="Lacrosse">🥍 Lacrosse</option>
          </select>
        </div>

      </div>

      {/* 1. ALBUMS TAB */}
      {activeTab === 'albums' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
            <span>SHOWING {filteredAlbums.length} ALBUMS IN FIREBASE</span>
            <span className="text-[#00F2FE]">⚡ Edit or delete albums to cascade changes to all photos</span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 font-mono text-xs flex flex-col justify-center items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#00F2FE] animate-spin" />
              <span>Fetching Albums from Firebase Firestore...</span>
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#212A31]/90 border border-slate-800 text-slate-400 space-y-3">
              <FolderMinus className="w-12 h-12 text-slate-500 mx-auto" />
              <div className="text-base font-bold text-white">No Albums Found</div>
              <p className="text-xs max-w-md mx-auto">
                No photo albums match your search filters or no media has been uploaded yet.
              </p>
              <button
                onClick={() => setActiveTab('new-media')}
                className="mt-2 px-4 py-2 rounded-xl bg-[#00F2FE] text-slate-950 font-bold text-xs uppercase"
              >
                Upload First Album
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAlbums.map((album, idx) => (
                <div
                  key={idx}
                  className="rounded-3xl bg-[#212A31]/90 border border-slate-800 hover:border-[#00F2FE]/50 overflow-hidden shadow-xl transition-all flex flex-col justify-between group"
                >
                  {/* Cover Image */}
                  <div className="relative aspect-[16/9] bg-slate-950 overflow-hidden">
                    <SportsGalleryImage
                      src={album.coverUrl}
                      alt={album.albumTitle}
                      sport={album.sport}
                      title={album.albumTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-[#00F2FE]/40 text-[#00F2FE] text-xs font-black uppercase">
                        {album.sport}
                      </span>
                    </div>

                    <div className="absolute bottom-3 right-3 z-10">
                      <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-white text-xs font-mono font-bold">
                        📸 {album.photos.length} Photo{album.photos.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  {/* Album Info & Action Controls */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-base font-black text-white group-hover:text-[#00F2FE] transition-colors line-clamp-1">
                        {album.albumTitle}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        Event: <span className="text-slate-300 font-medium">{album.eventName}</span>
                      </p>
                      <div className="text-[11px] text-slate-500 font-mono mt-2 flex items-center justify-between">
                        <span>Total Hypes: {album.totalHypes}</span>
                        <span>Sport: {album.sport}</span>
                      </div>
                    </div>

                    {/* Inline Album Pricing UI */}
                    <div className="pt-3 border-t border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1 font-bold text-slate-300">
                          <DollarSign className="w-3.5 h-3.5 text-[#00F2FE]" />
                          Inline Pricing:
                        </span>
                        <span>
                          {(albumPricingEdits[album.key]?.isFree ?? album.isFree) ? 'FREE ACCESS' : `$${((albumPricingEdits[album.key]?.price ?? album.price) || 0).toFixed(2)}/photo`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* isFree Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleAlbumFree(album.key, album.isFree, album.price)}
                          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1 border shrink-0 ${
                            (albumPricingEdits[album.key]?.isFree ?? album.isFree)
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                          }`}
                          title="Click to toggle Free/Paid"
                        >
                          {(albumPricingEdits[album.key]?.isFree ?? album.isFree) ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>FREE</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>PAID</span>
                            </>
                          )}
                        </button>

                        {/* Numeric Price Input */}
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">$</span>
                          <input
                            type="number"
                            step="0.50"
                            min="0"
                            disabled={albumPricingEdits[album.key]?.isFree ?? album.isFree}
                            value={(albumPricingEdits[album.key]?.isFree ?? album.isFree) ? 0 : (albumPricingEdits[album.key]?.price ?? album.price)}
                            onChange={(e) => handleAlbumPriceChange(album.key, parseFloat(e.target.value) || 0, albumPricingEdits[album.key]?.isFree ?? album.isFree)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveAlbumPricing(album.key, album.albumTitle, album.eventName, album.photos);
                              }
                            }}
                            className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-mono transition-colors focus:outline-hidden ${
                              (albumPricingEdits[album.key]?.isFree ?? album.isFree)
                                ? 'bg-black/30 border-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-black/60 border-slate-700 text-white focus:border-[#00F2FE]'
                            }`}
                            placeholder="9.99"
                          />
                        </div>

                        {/* Save Pricing Button */}
                        <button
                          type="button"
                          disabled={albumPricingEdits[album.key]?.saving}
                          onClick={() => handleSaveAlbumPricing(album.key, album.albumTitle, album.eventName, album.photos)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                            albumPricingEdits[album.key]?.hasChanged
                              ? 'bg-[#00F2FE] hover:brightness-110 text-slate-950 font-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="Save price to Firebase Firestore"
                        >
                          {albumPricingEdits[album.key]?.saving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Admin Action Buttons */}
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <button
                        onClick={() => setInspectingAlbum(album)}
                        className="w-full px-3 py-2 rounded-xl bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 border border-[#00F2FE]/30 text-[#00F2FE] font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage Photos in Album ({album.photos.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenBulkModalForAlbum(album)}
                        className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-[#00F2FE]/15 to-emerald-500/15 hover:from-[#00F2FE]/25 hover:to-emerald-500/25 border border-[#00F2FE]/30 text-[#00F2FE] hover:text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,242,254,0.15)]"
                        title="Bulk-set isFreeForMembers and priceCents for all photos in this gallery/album"
                      >
                        <Tag className="w-3.5 h-3.5 text-[#00F2FE]" />
                        <span>Bulk Set Photo Pricing</span>
                      </button>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => openEditAlbum(album)}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#00F2FE]" />
                          <span>Edit Album</span>
                        </button>

                        <button
                          onClick={() => handleDeleteAlbum(album.albumTitle, album.eventName, album.photos)}
                          className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          title="Delete Entire Album from Firebase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Album</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. ALL PHOTOS TAB */}
      {activeTab === 'photos' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header & Multi-Select Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono font-bold text-slate-400">
            <div className="flex items-center gap-3">
              <span>SHOWING {filteredItems.length} MEDIA ITEMS IN FIREBASE</span>
              {selectedPhotoIds.size > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#00F2FE]/15 border border-[#00F2FE]/40 text-[#00F2FE] text-[11px] font-bold">
                  {selectedPhotoIds.size} Selected
                </span>
              )}
            </div>

            {/* Batch Action Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSelectAllVisible}
                disabled={filteredItems.length === 0}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-[#00F2FE]" />
                <span>{filteredItems.every(p => selectedPhotoIds.has(p.id)) && filteredItems.length > 0 ? 'Deselect All' : 'Select All Visible'}</span>
              </button>

              {selectedPhotoIds.size > 0 && (
                <button
                  onClick={handleBatchDeleteSelected}
                  disabled={batchDeleting}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all cursor-pointer"
                >
                  {batchDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Delete Selected ({selectedPhotoIds.size})</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 font-mono text-xs flex flex-col justify-center items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#00F2FE] animate-spin" />
              <span>Fetching Photos from Firebase...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#212A31]/90 border border-slate-800 text-slate-400">
              <Camera className="w-12 h-12 text-slate-500 mx-auto mb-2" />
              <div className="text-base font-bold text-white">No Photos Found</div>
              <p className="text-xs max-w-sm mx-auto mt-1">No items found matching your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((photo) => {
                const isSelected = selectedPhotoIds.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    className={`rounded-2xl bg-[#212A31]/90 border ${
                      isSelected ? 'border-[#00F2FE] ring-2 ring-[#00F2FE]/30' : 'border-slate-800 hover:border-[#00F2FE]/50'
                    } overflow-hidden shadow-lg transition-all flex flex-col justify-between group relative`}
                  >
                    {/* Top Checkbox for Batch Selection */}
                    <button
                      type="button"
                      onClick={(e) => togglePhotoSelection(photo.id, e)}
                      className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_10px_rgba(0,242,254,0.5)]' 
                          : 'bg-black/70 text-transparent hover:text-slate-400 border border-slate-700'
                      }`}
                      title={isSelected ? 'Deselect photo' : 'Select photo for batch actions'}
                    >
                      <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'text-slate-950' : 'opacity-0 group-hover:opacity-100 text-white'}`} />
                    </button>

                    <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                      <SportsGalleryImage
                        src={photo.watermarkedUrl || photo.originalUrl}
                        alt={photo.title || photo.eventName}
                        sport={photo.sport}
                        category={photo.category}
                        title={photo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      <div className="absolute top-2 left-10 flex items-center gap-1 z-10">
                        <span className="px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-black text-[#00F2FE] uppercase">
                          {photo.sport}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2 z-10">
                        <span className="px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-mono font-bold text-amber-400">
                          ${typeof photo.price === 'number' ? photo.price.toFixed(2) : '9.99'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#00F2FE] transition-colors">
                          {photo.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {photo.albumName} • {photo.eventName}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => openEditPhoto(photo)}
                          disabled={actionLoadingId === photo.id}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 text-[#00F2FE]" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={actionLoadingId === photo.id}
                          className="py-1.5 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-[11px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          title="Delete permanently from Firebase"
                        >
                          {actionLoadingId === photo.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
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

      {/* 3. DIRECT UPLOADER TAB */}
      {activeTab === 'new-media' && (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-[#212A31]/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/20 flex items-center justify-center text-[#00F2FE]">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase text-white font-sans tracking-wide">
                Upload New 4K Media to Firebase
              </h3>
              <p className="text-xs text-slate-400">
                Directly publish high-res photos and tournament highlight clips to /media_vault/ & gallery.
              </p>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* File Drop Area */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Select Photo or Video File (Max 50MB)
              </label>

              {!uploadPreviewUrl ? (
                <label className="border-2 border-dashed border-slate-700 hover:border-[#00F2FE] bg-slate-900/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                  <Upload className="w-10 h-10 text-slate-400 group-hover:text-[#00F2FE] mb-2 transition-colors" />
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                    Click to browse or drag & drop high-res file
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Supports JPG, PNG, WEBP, and MP4 video
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleUploadFileSelect}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center">
                  {uploadFile?.type.startsWith('video/') ? (
                    <video src={uploadPreviewUrl} controls className="w-full h-full object-contain" />
                  ) : (
                    <img src={uploadPreviewUrl} alt="Upload Preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUploadFile(null);
                      setUploadPreviewUrl(null);
                    }}
                    disabled={isUploading}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-black/80 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Change File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                Title / Action Shot Headline
              </label>
              <input
                type="text"
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="e.g. Game-Winning Dunk Over Double Coverage"
                required
                disabled={isUploading}
                className="w-full h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            {/* Sport & Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Sport
                </label>
                <select
                  value={uploadSport}
                  onChange={e => setUploadSport(e.target.value)}
                  disabled={isUploading}
                  className="w-full h-11 px-3 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none"
                >
                  <option value="Basketball">🏀 Basketball</option>
                  <option value="Football">🏈 Football</option>
                  <option value="Soccer">⚽ Soccer</option>
                  <option value="Track & Field">🏃 Track & Field</option>
                  <option value="Cheer">📣 Cheer</option>
                  <option value="Volleyball">🏐 Volleyball</option>
                  <option value="Baseball">⚾ Baseball</option>
                  <option value="Lacrosse">🥍 Lacrosse</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  disabled={isUploading}
                  className="w-full h-11 px-3 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none"
                >
                  <option value="Game Action">Game Action</option>
                  <option value="Tournaments">Tournaments</option>
                  <option value="Combine / Laser">Combine / Laser</option>
                  <option value="Team Portraits">Team Portraits</option>
                </select>
              </div>
            </div>

            {/* Event Name & Album Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Event / Tournament Name
                </label>
                <input
                  type="text"
                  value={uploadEventName}
                  onChange={e => setUploadEventName(e.target.value)}
                  placeholder="e.g. Tri-State Elite Championship"
                  disabled={isUploading}
                  className="w-full h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Album Name / Collection
                </label>
                <input
                  type="text"
                  value={uploadAlbumName}
                  onChange={e => setUploadAlbumName(e.target.value)}
                  placeholder="e.g. Q4 Highlights & Buzzer Beater"
                  disabled={isUploading}
                  className="w-full h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                Download Price ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={uploadPrice}
                onChange={e => setUploadPrice(e.target.value)}
                disabled={isUploading}
                className="w-full h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 py-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-[#00F2FE]">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>UPLOADING TO FIREBASE STORAGE...</span>
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('albums')}
                disabled={isUploading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isUploading || !uploadFile}
                className="px-6 py-2.5 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,242,254,0.4)] disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>Publish Media to Firebase</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2B. WATERMARK & ASSET PROTECTION STUDIO TAB */}
      {activeTab === 'watermark' && (
        <div className="space-y-6 animate-fadeIn">
          <AdminGalleryManager />
        </div>
      )}

      {/* 3. GOOGLE DRIVE SYNC TAB */}
      {activeTab === 'gdrive' && (
        <div className="space-y-6 animate-fadeIn">
          <GoogleDriveSyncModal 
            onSuccess={() => {
              fetchGalleryItems();
              setActiveTab('albums');
            }}
            onClose={() => setActiveTab('albums')}
          />
        </div>
      )}

      {/* 4. CLEANER & STORAGE UTILITY TAB */}
      {activeTab === 'cleaner' && (
        <div className="space-y-6 animate-fadeIn">
          <MediaGalleryClearUtility onCleared={fetchGalleryItems} />
        </div>
      )}

      {/* EDIT SINGLE PHOTO MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#212A31] border border-slate-700 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE]">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Edit Photo Details</h3>
                <p className="text-xs text-slate-400">Update title, album, event, and sport categorization in Firebase</p>
              </div>
            </div>

            <form onSubmit={handleSavePhotoEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                    Sport
                  </label>
                  <select
                    value={editSport}
                    onChange={e => setEditSport(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none"
                  >
                    <option value="Basketball">🏀 Basketball</option>
                    <option value="Football">🏈 Football</option>
                    <option value="Soccer">⚽ Soccer</option>
                    <option value="Track & Field">🏃 Track & Field</option>
                    <option value="Cheer">📣 Cheer</option>
                    <option value="Volleyball">🏐 Volleyball</option>
                    <option value="Baseball">⚾ Baseball</option>
                    <option value="Lacrosse">🥍 Lacrosse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none"
                  >
                    <option value="Game Action">Game Action</option>
                    <option value="Tournaments">Tournaments</option>
                    <option value="Combine / Laser">Combine / Laser</option>
                    <option value="Team Portraits">Team Portraits</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Event Name
                </label>
                <input
                  type="text"
                  value={editEventName}
                  onChange={e => setEditEventName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Album Name
                </label>
                <input
                  type="text"
                  value={editAlbumName}
                  onChange={e => setEditAlbumName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Thumbnail / Watermarked Image URL
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://... image URL"
                      value={editThumbnailUrl}
                      onChange={e => setEditThumbnailUrl(e.target.value)}
                      className="flex-1 h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none font-mono"
                    />
                    {editThumbnailUrl && (
                      <button
                        type="button"
                        onClick={() => setEditThumbnailUrl('')}
                        className="px-3 h-11 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title="Clear thumbnail"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {editThumbnailUrl && (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      <img
                        src={editThumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-12 h-12 object-cover rounded-lg border border-white/10"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="text-[11px] text-slate-400 truncate">
                        <span className="text-emerald-400 font-bold">✓ Active Thumbnail</span>
                        <p className="truncate">{editThumbnailUrl}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Price ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={e => setEditPrice(parseFloat(e.target.value) || 0)}
                  className="w-full h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(editingItem)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Delete this photo from Firebase"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Photo</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId === editingItem.id}
                    className="px-6 py-2.5 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-black text-xs uppercase flex items-center gap-2 cursor-pointer"
                  >
                    {actionLoadingId === editingItem.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ALBUM MODAL (BATCH) */}
      {editingAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#212A31] border border-slate-700 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative text-white">
            <button
              onClick={() => setEditingAlbum(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Edit Album Collection</h3>
                <p className="text-xs text-slate-400">
                  Updates title & metadata for all {editingAlbum.count} photo(s) in this album in Firebase
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAlbumEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Album Name / Collection
                </label>
                <input
                  type="text"
                  value={newAlbumTitle}
                  onChange={e => setNewAlbumTitle(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Event / Tournament Name
                </label>
                <input
                  type="text"
                  value={newAlbumEvent}
                  onChange={e => setNewAlbumEvent(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Album Cover Thumbnail URL (Optional)
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://... cover thumbnail image URL"
                      value={newAlbumCoverUrl}
                      onChange={e => setNewAlbumCoverUrl(e.target.value)}
                      className="flex-1 h-11 px-3.5 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none font-mono"
                    />
                    {newAlbumCoverUrl && (
                      <button
                        type="button"
                        onClick={() => setNewAlbumCoverUrl('')}
                        className="px-3 h-11 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title="Clear cover thumbnail"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {newAlbumCoverUrl && (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      <img
                        src={newAlbumCoverUrl}
                        alt="Album Cover preview"
                        className="w-12 h-12 object-cover rounded-lg border border-white/10"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="text-[11px] text-slate-400 truncate">
                        <span className="text-emerald-400 font-bold">✓ Album Cover Thumbnail</span>
                        <p className="truncate">{newAlbumCoverUrl}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Sport
                </label>
                <select
                  value={newAlbumSport}
                  onChange={e => setNewAlbumSport(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-900 border border-slate-700 focus:border-[#00F2FE] rounded-xl text-xs text-white outline-none"
                >
                  <option value="Basketball">🏀 Basketball</option>
                  <option value="Football">🏈 Football</option>
                  <option value="Soccer">⚽ Soccer</option>
                  <option value="Track & Field">🏃 Track & Field</option>
                  <option value="Cheer">📣 Cheer</option>
                  <option value="Volleyball">🏐 Volleyball</option>
                  <option value="Baseball">⚾ Baseball</option>
                  <option value="Lacrosse">🥍 Lacrosse</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const albumGroup = albumGroups.find(a => a.albumTitle === editingAlbum.oldTitle);
                    if (albumGroup) {
                      handleDeleteAlbum(albumGroup.albumTitle, albumGroup.eventName, albumGroup.photos);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Delete this entire album and its photos from Firebase"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Album</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAlbum(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-black text-xs uppercase flex items-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save Album</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT ALBUM MODAL (VIEW & MANAGE PHOTOS IN A SPECIFIC ALBUM) */}
      {inspectingAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#212A31] border border-slate-700 w-full max-w-5xl rounded-3xl p-6 sm:p-8 shadow-2xl relative text-white max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-white">{inspectingAlbum.albumTitle}</h2>
                    <span className="px-2 py-0.5 rounded-md bg-[#00F2FE]/15 text-[#00F2FE] text-[10px] font-mono font-bold uppercase">
                      {inspectingAlbum.sport}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Event: <span className="text-slate-200 font-medium">{inspectingAlbum.eventName}</span> • {inspectingAlbum.photos.length} Photo(s) in Firebase
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenBulkModalForAlbum(inspectingAlbum)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#00F2FE]/15 to-emerald-500/15 hover:from-[#00F2FE]/25 hover:to-emerald-500/25 border border-[#00F2FE]/30 text-[#00F2FE] hover:text-white font-bold text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_10px_rgba(0,242,254,0.15)]"
                  title="Bulk set isFreeForMembers and priceCents for all photos in this album"
                >
                  <Tag className="w-3.5 h-3.5 text-[#00F2FE]" />
                  <span>Bulk Set Pricing</span>
                </button>

                <button
                  onClick={() => handleDeleteAlbum(inspectingAlbum.albumTitle, inspectingAlbum.eventName, inspectingAlbum.photos)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Delete all media in this album from Firebase"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Entire Album</span>
                </button>

                <button
                  onClick={() => setInspectingAlbum(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photos inside this album */}
            <div className="flex-1 overflow-y-auto py-6 space-y-4">
              {inspectingAlbum.photos.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                  <div className="font-bold text-white">All photos in this album have been deleted.</div>
                  <p className="text-xs text-slate-400">The album is now empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {inspectingAlbum.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-[#00F2FE]/40 overflow-hidden shadow-md flex flex-col justify-between group"
                    >
                      <div className="relative aspect-[4/3] bg-black overflow-hidden">
                        <SportsGalleryImage
                          src={photo.watermarkedUrl || photo.originalUrl}
                          alt={photo.title || photo.eventName}
                          sport={photo.sport}
                          category={photo.category}
                          title={photo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 right-2 z-10">
                          <span className="px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-mono font-bold text-amber-400">
                            ${typeof photo.price === 'number' ? photo.price.toFixed(2) : '9.99'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#00F2FE] transition-colors">
                            {photo.title || 'Untitled Action Photo'}
                          </h4>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {photo.category} • {photo.sport}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                          <button
                            onClick={() => openEditPhoto(photo)}
                            disabled={actionLoadingId === photo.id}
                            className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-[#00F2FE]" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeletePhoto(photo)}
                            disabled={actionLoadingId === photo.id}
                            className="py-1.5 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-[11px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            title="Delete this photo permanently from Firebase"
                          >
                            {actionLoadingId === photo.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-800 pt-4 flex items-center justify-end">
              <button
                onClick={() => setInspectingAlbum(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Set Photo Pricing Modal */}
      <BulkSetPhotoPricingModal
        isOpen={isBulkPricingModalOpen}
        onClose={() => setIsBulkPricingModalOpen(false)}
        gallery={bulkPricingModalAlbum}
        onSuccess={(result) => {
          setItems((prev) =>
            prev.map((p) => {
              const isMatching =
                (p as any).albumId === result.galleryId ||
                (p as any).galleryId === result.galleryId ||
                (bulkPricingModalAlbum &&
                  (p.albumName === bulkPricingModalAlbum.title ||
                    (p as any).albumTitle === bulkPricingModalAlbum.title));

              if (isMatching) {
                const dollarPrice = result.priceCents / 100;
                return {
                  ...p,
                  isFreeForMembers: result.isFreeForMembers,
                  priceCents: result.priceCents,
                  price: dollarPrice,
                  isFree: result.isFreeForMembers || result.priceCents === 0,
                  isPaid: !(result.isFreeForMembers || result.priceCents === 0)
                };
              }
              return p;
            })
          );

          if (inspectingAlbum) {
            const dollarPrice = result.priceCents / 100;
            setInspectingAlbum((prev) =>
              prev
                ? {
                    ...prev,
                    photos: prev.photos.map((p) => ({
                      ...p,
                      isFreeForMembers: result.isFreeForMembers,
                      priceCents: result.priceCents,
                      price: dollarPrice,
                      isFree: result.isFreeForMembers || result.priceCents === 0,
                      isPaid: !(result.isFreeForMembers || result.priceCents === 0)
                    }))
                  }
                : null
            );
          }
        }}
      />

    </div>
  );
};

export default AdminGalleryManagerPage;
export { AdminGalleryManager } from '../admin/AdminGalleryManager';
