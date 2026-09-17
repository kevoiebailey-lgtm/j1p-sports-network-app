import React, { useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Plus, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Eye, 
  EyeOff, 
  Download, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Lock, 
  Globe, 
  Search, 
  Sparkles, 
  Check, 
  AlertCircle,
  FolderPlus,
  Share2,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  Star,
  Copy,
  Send,
  MessageCircle,
  ExternalLink,
  ListChecks,
  CheckSquare,
  Square,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Grid,
  ShieldCheck,
  Shield,
  Heart,
  Play,
  Pause,
  Bookmark,
  FileText,
  Tag,
  Filter,
  Layers,
  SlidersHorizontal,
  Flame,
  LayoutGrid
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Album, Photo } from '../../types';
import { compressImage } from '../../lib/imageCompressor';
import { processImageForGallery } from '../../utils/imageCompressor';
import { AdminBulkUploadForm } from '../Admin/AdminBulkUploadForm';
import { uploadPhotosToExistingAlbum, PhotoUploadQueueManager, UploadQueueState } from '../../services/galleryService';
import { isCleanSlateMode } from '../../lib/productionMode';
import { isFirestoreQuotaExceeded, markFirestoreQuotaExceeded, isQuotaError } from '../../lib/firestoreQuotaGuard';
import { MaxPrepsGalleryHero } from './MaxPrepsGalleryHero';
import { TopActionShotsCarousel, ActionShotItem } from './TopActionShotsCarousel';
import { FindMyPhotosSearch } from './FindMyPhotosSearch';
import { MaxPrepsGalleryCard } from './MaxPrepsGalleryCard';
import { downloadPhotoWithPreference, WatermarkOptions } from '../../utils/watermarkService';
import { DownloadProgressHUD, GalleryDownloadState } from './DownloadProgressHUD';
import { SportsGalleryImage } from '../RoleViews/Universal/SportsGalleryImage';
import { resolvePhotoDocument } from '../../utils/storageUrlResolver';

// Sample Default Albums for Initial Seed (Clean Slate)
const DEFAULT_ALBUMS: Omit<Album, 'id'>[] = [];

const DEFAULT_PHOTOS: Record<string, Omit<Photo, 'id' | 'albumId'>[]> = {};

// Curated Top Action Shots for MaxPreps Photography Showcase (Clean Slate)
const CURATED_ACTION_SHOTS: ActionShotItem[] = [];

export const EventGalleryView: React.FC = () => {
  const { user, profile, role } = useAuth();

  // Role check: Admin or Content Creator ONLY
  const currentRole = (role || profile?.role || '').toLowerCase();
  const isAdminOrCreator = currentRole === 'admin' || currentRole === 'content_creator' || currentRole === 'creator';

  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState<boolean>(true);
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'private'>('all');
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>('all');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Watermark Visibility & Toggle State (Turn ON or REMOVE watermarks anytime)
  const [watermarksEnabled, setWatermarksEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('just1play_watermarks_active');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleWatermarks = () => {
    const nextVal = !watermarksEnabled;
    setWatermarksEnabled(nextVal);
    try {
      localStorage.setItem('just1play_watermarks_active', String(nextVal));
    } catch (e) {
      console.warn('LocalStorage watermark save warning:', e);
    }
    showToast(nextVal ? 'Watermarks turned ON (Branded Protection)' : 'Watermarks REMOVED (Clean High-Res View)');
  };

  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<GalleryDownloadState | null>(null);
  const downloadDismissTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Album Inner Grid Layout
  const [albumGridLayout, setAlbumGridLayout] = useState<'masonry' | 'grid3' | 'grid4'>('masonry');

  // Modal States
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState<string>('');
  const [newCoverPhotoUrl, setNewCoverPhotoUrl] = useState<string>('');
  const [newVisibility, setNewVisibility] = useState<'public' | 'private'>('public');
  const [creatingAlbum, setCreatingAlbum] = useState<boolean>(false);

  // Lightbox & Gesture State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStartPos, setPanStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showFilmstrip, setShowFilmstrip] = useState<boolean>(true);
  const [isImmersiveMode, setIsImmersiveMode] = useState<boolean>(false);

  // Touch gesture refs
  const initialPinchDistRef = React.useRef<number | null>(null);
  const initialPinchScaleRef = React.useRef<number>(1);
  const touchStartXRef = React.useRef<number | null>(null);
  const touchStartYRef = React.useRef<number | null>(null);
  const lastTapTimeRef = React.useRef<number>(0);

  // Batch Selection & Deletion State
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState<boolean>(false);
  const [watermarkStyle, setWatermarkStyle] = useState<'full_protection' | 'badge' | 'none'>('badge');
  const [adminDownloadClean, setAdminDownloadClean] = useState<boolean>(false);

  // Media Kit Saved Photos State
  const [savedPhotos, setSavedPhotos] = useState<Photo[]>([]);
  const [showMediaKitDrawer, setShowMediaKitDrawer] = useState<boolean>(false);

  // Lightbox Auto-Slideshow & Clean Scout View State
  const [isSlideshowActive, setIsSlideshowActive] = useState<boolean>(false);
  const [isCleanView, setIsCleanView] = useState<boolean>(false);

  // Photo Tag & Jersey Filter State inside selected album
  const [photoTagFilter, setPhotoTagFilter] = useState<string>('all');

  // Load saved Media Kit photos on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('just1play_saved_photos');
      if (saved) setSavedPhotos(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to parse saved media kit photos:', e);
    }
  }, []);

  // Save/Unsave Photo Handler
  const toggleSavePhoto = (photo: Photo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const exists = savedPhotos.some(p => p.id === photo.id || p.imageUrl === photo.imageUrl);
    let updated: Photo[];
    if (exists) {
      updated = savedPhotos.filter(p => p.id !== photo.id && p.imageUrl !== photo.imageUrl);
      showToast('Removed from Scout Media Kit');
    } else {
      updated = [photo, ...savedPhotos];
      showToast('Saved to Scout Media Kit!');
    }
    setSavedPhotos(updated);
    try {
      localStorage.setItem('just1play_saved_photos', JSON.stringify(updated));
    } catch (err) {
      console.warn('Error storing saved media kit photos:', err);
    }
  };

  // Lightbox Auto-Slideshow Timer
  useEffect(() => {
    if (!isSlideshowActive || lightboxIndex === null || photos.length === 0) return;
    const timer = setInterval(() => {
      setLightboxIndex(prev => (prev !== null ? (prev + 1) % photos.length : 0));
    }, 3500);
    return () => clearInterval(timer);
  }, [isSlideshowActive, lightboxIndex, photos.length]);

  // Social Share Modal State
  const [shareModalData, setShareModalData] = useState<{
    type: 'album' | 'photo';
    title: string;
    url: string;
    imageUrl?: string;
    subtitle?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Social Share Action Handler
  const handleOpenShareModal = (
    type: 'album' | 'photo',
    title: string,
    url: string,
    imageUrl?: string,
    subtitle?: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();

    const shareUrl = url || window.location.href;
    const shareText = subtitle || `Check out game photos from ${title} on Just1Play Sports Platform!`;

    if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      navigator.share({
        title: `JUST1PLAY - ${title}`,
        text: shareText,
        url: shareUrl,
      }).then(() => {
        showToast('Shared successfully!');
      }).catch(() => {
        setShareModalData({ type, title, url: shareUrl, imageUrl, subtitle: shareText });
      });
      return;
    }

    setShareModalData({ type, title, url: shareUrl, imageUrl, subtitle: shareText });
  };

  // ----------------------------------------------------
  // 1. Fetch & Real-time Listen to Albums Collection (both uppercase & lowercase collections)
  // ----------------------------------------------------
  useEffect(() => {
    setLoadingAlbums(true);
    let uppercaseAlbums: Album[] = [];
    let lowercaseAlbums: Album[] = [];

    const reconcileAlbums = () => {
      const mergedMap = new Map<string, Album>();

      uppercaseAlbums.forEach(a => mergedMap.set(a.id, a));
      lowercaseAlbums.forEach(a => {
        if (!mergedMap.has(a.id)) {
          mergedMap.set(a.id, a);
        } else {
          // Merge non-empty fields
          const existing = mergedMap.get(a.id)!;
          mergedMap.set(a.id, {
            ...existing,
            title: existing.title || a.title,
            coverPhotoUrl: existing.coverPhotoUrl || a.coverPhotoUrl,
            thumbnailUrl: existing.thumbnailUrl || a.thumbnailUrl,
            photoCount: Math.max(existing.photoCount || 0, a.photoCount || 0)
          });
        }
      });

      const result = Array.from(mergedMap.values());
      if (result.length === 0) {
        if (!isCleanSlateMode()) {
          const inMemoryDemoAlbums: Album[] = DEFAULT_ALBUMS.map((demoAlbum, idx) => ({
            id: `demo_album_${idx + 1}`,
            title: demoAlbum.title || `Demo Album ${idx + 1}`,
            ...demoAlbum,
            coverPhotoUrl: demoAlbum.coverPhotoUrl || '',
            thumbnailUrl: demoAlbum.thumbnailUrl || ''
          }));
          setAlbums(inMemoryDemoAlbums);
        } else {
          setAlbums([]);
        }
      } else {
        result.sort((a, b) => new Date(b.date || (b as any).createdAt || 0).getTime() - new Date(a.date || (a as any).createdAt || 0).getTime());
        setAlbums(result);
      }
      setLoadingAlbums(false);
    };

    const unsubUpper = onSnapshot(collection(db, 'Albums'), (snapshot) => {
      uppercaseAlbums = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        let cachedCover = '';
        try {
          cachedCover = localStorage.getItem(`just1play_album_cover_${docSnap.id}`) || '';
        } catch (e) {
          // ignore
        }
        const finalCover = cachedCover || data.coverPhotoUrl || data.coverUrl || data.thumbnailUrl || '';
        return {
          id: docSnap.id,
          title: data.title || data.albumName || data.name || 'Untitled Album',
          date: data.date || data.eventDate || data.createdAt?.split?.('T')[0] || new Date().toISOString().split('T')[0],
          description: data.description || '',
          visibilityStatus: data.visibilityStatus || 'public',
          coverPhotoUrl: finalCover,
          thumbnailUrl: finalCover,
          photoCount: data.photoCount || 0,
          sport: data.sport || data.category || 'Football',
          eventName: data.eventName || data.event || data.title || '',
          ...data
        } as Album;
      });
      reconcileAlbums();
    }, (err) => {
      console.warn('Albums uppercase listener notice:', err);
      reconcileAlbums();
    });

    const unsubLower = onSnapshot(collection(db, 'albums'), (snapshot) => {
      lowercaseAlbums = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        const finalCover = data.coverUrl || data.coverPhotoUrl || data.thumbnailUrl || '';
        return {
          id: docSnap.id,
          title: data.title || data.albumName || data.name || 'Untitled Album',
          date: data.date || data.eventDate || data.createdAt?.split?.('T')[0] || new Date().toISOString().split('T')[0],
          description: data.description || '',
          visibilityStatus: data.visibilityStatus || 'public',
          coverPhotoUrl: finalCover,
          thumbnailUrl: finalCover,
          photoCount: data.photoCount || 0,
          sport: data.sport || data.category || 'Football',
          eventName: data.eventName || data.event || data.title || '',
          ...data
        } as Album;
      });
      reconcileAlbums();
    }, (err) => {
      console.warn('albums lowercase listener notice:', err);
      reconcileAlbums();
    });

    return () => {
      unsubUpper();
      unsubLower();
    };
  }, []);

  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);

  // ----------------------------------------------------
  // 1b. Real-time Listener for top-level 'gallery' collection
  // ----------------------------------------------------
  useEffect(() => {
    try {
      const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const photosList = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const resolvedUrl = data.imageUrl || data.originalUrl || data.watermarkedUrl || data.previewUrl || data.mediaUrl || data.url || '';
          const resolvedThumb = data.thumbUrl || data.previewUrl || data.watermarkedUrl || data.imageUrl || data.originalUrl || data.mediaUrl || resolvedUrl;
          return {
            id: docSnap.id,
            albumId: data.albumId || '',
            albumTitle: data.albumTitle || data.albumName || '',
            albumName: data.albumName || data.albumTitle || '',
            eventName: data.eventName || data.event || '',
            imageUrl: resolvedUrl,
            thumbUrl: resolvedThumb,
            originalUrl: data.originalUrl || resolvedUrl,
            watermarkedUrl: data.watermarkedUrl || resolvedUrl,
            uploadTimestamp: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
            isPremium: false,
            title: data.title || 'Untitled Photo',
            uploadedBy: data.uploadedBy || 'admin',
            type: data.type || 'photo',
            sport: data.sport || 'Sports',
            category: data.category || 'Game Action',
            ...data
          };
        });
        setGalleryPhotos(photosList);
      }, (error) => {
        console.error('Error fetching gallery photos real-time with onSnapshot:', error);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('Failed to setup real-time gallery listener:', err);
    }
  }, []);

  // ----------------------------------------------------
  // 2. Fetch Photos when inside an Album
  // ----------------------------------------------------
  useEffect(() => {
    if (!selectedAlbum) {
      setPhotos([]);
      return;
    }

    setLoadingPhotos(true);
    let subcollectionPhotos: Photo[] = [];
    let lowerSubPhotos: Photo[] = [];

    const reconcileAlbumPhotos = () => {
      const combinedMap = new Map<string, Photo>();

      // 1. Add subcollection photos
      [...subcollectionPhotos, ...lowerSubPhotos].forEach(p => {
        const url = p.imageUrl || (p as any).originalUrl || (p as any).watermarkedUrl || (p as any).thumbUrl || '';
        if (url) {
          combinedMap.set(p.id, {
            ...p,
            imageUrl: url,
            thumbUrl: p.thumbUrl || url
          });
        }
      });

      // 2. Add matching gallery photos
      const selId = (selectedAlbum.id || '').trim().toLowerCase();
      const selTitle = (selectedAlbum.title || '').trim().toLowerCase();
      const selEvent = ((selectedAlbum as any).eventName || '').trim().toLowerCase();

      const galleryMatching = galleryPhotos.filter(p => {
        const pAlbumId = (p.albumId || '').trim().toLowerCase();
        const pAlbumTitle = (p.albumTitle || '').trim().toLowerCase();
        const pAlbumName = (p.albumName || '').trim().toLowerCase();
        const pEventName = (p.eventName || '').trim().toLowerCase();

        return (pAlbumId && (pAlbumId === selId || pAlbumId === `temp-${selId}`)) ||
               (pAlbumTitle && pAlbumTitle === selTitle) ||
               (pAlbumName && pAlbumName === selTitle) ||
               (selEvent && pEventName && pEventName === selEvent) ||
               (selTitle && pEventName && pEventName === selTitle);
      });

      galleryMatching.forEach(gp => {
        const url = gp.imageUrl || gp.originalUrl || gp.watermarkedUrl || gp.thumbUrl;
        if (url && !combinedMap.has(gp.id)) {
          // Check for duplicate URL
          const exists = Array.from(combinedMap.values()).some(existing => existing.imageUrl === url);
          if (!exists) {
            combinedMap.set(gp.id, {
              id: gp.id,
              albumId: selectedAlbum.id,
              imageUrl: url,
              thumbUrl: gp.thumbUrl || url,
              uploadTimestamp: gp.uploadTimestamp || new Date().toISOString(),
              isPremium: false,
              title: gp.title || 'Game Photo',
              uploadedBy: gp.uploadedBy || 'admin'
            });
          }
        }
      });

      // 3. Demo fallback if empty
      if (combinedMap.size === 0) {
        const samplePhotos = DEFAULT_PHOTOS[selectedAlbum.title];
        if (samplePhotos && samplePhotos.length > 0) {
          samplePhotos.forEach((sp, idx) => {
            combinedMap.set(`demo_${idx}_${selectedAlbum.id}`, {
              id: `demo_${idx}_${selectedAlbum.id}`,
              albumId: selectedAlbum.id,
              ...sp
            });
          });
        }
      }

      const finalList = Array.from(combinedMap.values());
      finalList.sort((a, b) => new Date(b.uploadTimestamp || 0).getTime() - new Date(a.uploadTimestamp || 0).getTime());
      setPhotos(finalList);

      // Auto-reconcile photoCount on selectedAlbum in UI local state
      const actualCount = finalList.length;
      if (selectedAlbum.photoCount !== actualCount) {
        setSelectedAlbum(prev => prev ? { ...prev, photoCount: actualCount } : null);
        setAlbums(prev => prev.map(a => a.id === selectedAlbum.id ? { ...a, photoCount: actualCount } : a));
      }

      setLoadingPhotos(false);
    };

    const photosSubRef = collection(db, 'Albums', selectedAlbum.id, 'Photos');
    const unsubUpper = onSnapshot(photosSubRef, async (snapshot) => {
      try {
        const rawPhotos = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Photo, 'id'>)
        }));
        subcollectionPhotos = await Promise.all(
          rawPhotos.map(async (p) => {
            try {
              return await resolvePhotoDocument(p);
            } catch (err) {
              console.warn('[EventGalleryView] Upper subcollection unresolvable asset:', p.id, err);
              return p;
            }
          })
        );
      } catch (batchErr) {
        console.warn('[EventGalleryView] Upper subcollection resolution notice:', batchErr);
      } finally {
        reconcileAlbumPhotos();
      }
    }, (err) => {
      console.warn('Photos upper subcollection notice:', err);
      reconcileAlbumPhotos();
    });

    const lowerSubRef = collection(db, 'albums', selectedAlbum.id, 'photos');
    const unsubLower = onSnapshot(lowerSubRef, async (snapshot) => {
      try {
        const rawPhotos = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Photo, 'id'>)
        }));
        lowerSubPhotos = await Promise.all(
          rawPhotos.map(async (p) => {
            try {
              return await resolvePhotoDocument(p);
            } catch (err) {
              console.warn('[EventGalleryView] Lower subcollection unresolvable asset:', p.id, err);
              return p;
            }
          })
        );
      } catch (batchErr) {
        console.warn('[EventGalleryView] Lower subcollection resolution notice:', batchErr);
      } finally {
        reconcileAlbumPhotos();
      }
    }, (err) => {
      // ignore
      reconcileAlbumPhotos();
    });

    return () => {
      unsubUpper();
      unsubLower();
    };
  }, [selectedAlbum, galleryPhotos]);

  // ----------------------------------------------------
  // 3. Create New Album Handler
  // ----------------------------------------------------
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreatingAlbum(true);
    try {
      const defaultCover = newCoverPhotoUrl.trim();

      const newAlbumData: Omit<Album, 'id'> = {
        title: newTitle.trim(),
        date: newDate || new Date().toISOString().split('T')[0],
        coverPhotoUrl: defaultCover,
        description: newDescription.trim() || 'Client delivery photo gallery for athletic event coverage.',
        visibilityStatus: newVisibility,
        photoCount: 0,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || profile?.uid || 'admin'
      };

      const docRef = await addDoc(collection(db, 'Albums'), newAlbumData);
      showToast(`Album "${newTitle}" created successfully!`);

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewCoverPhotoUrl('');
      setNewVisibility('public');
      setShowCreateAlbumModal(false);

      // Open the newly created album directly
      setSelectedAlbum({ id: docRef.id, ...newAlbumData } as Album);
    } catch (err) {
      console.error('Error creating album:', err);
      showToast('Failed to create album. Please try again.');
    } finally {
      setCreatingAlbum(false);
    }
  };

  // ----------------------------------------------------
  // 4. Toggle Album Visibility (Public / Private)
  // ----------------------------------------------------
  const handleToggleVisibility = async (album: Album, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdminOrCreator) return;

    const nextStatus = album.visibilityStatus === 'public' ? 'private' : 'public';
    try {
      await updateDoc(doc(db, 'Albums', album.id), {
        visibilityStatus: nextStatus
      });
      showToast(`Album marked as ${nextStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Error updating album visibility:', err);
    }
  };

  // ----------------------------------------------------
  // 5. Delete Album Handler
  // ----------------------------------------------------
  const handleDeleteAlbum = async (albumId: string, albumTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdminOrCreator) return;

    if (!window.confirm(`Are you sure you want to delete the album "${albumTitle}" and all its photos?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'Albums', albumId));
      if (selectedAlbum?.id === albumId) {
        setSelectedAlbum(null);
      }
      showToast(`Album "${albumTitle}" deleted.`);
    } catch (err) {
      console.error('Error deleting album:', err);
      showToast('Error deleting album.');
    }
  };

  // ----------------------------------------------------
  // 6. Bulk Photo Upload Zone with PhotoUploadQueueManager
  // ----------------------------------------------------
  const [uploadQueueState, setUploadQueueState] = useState<UploadQueueState | null>(null);
  const activeQueueRef = React.useRef<PhotoUploadQueueManager | null>(null);

  // Prevent accidental window close or refresh while photos are actively uploading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploadQueueState && !uploadQueueState.isComplete && !uploadQueueState.isCancelled) {
        e.preventDefault();
        e.returnValue = 'Photos are currently uploading. Leaving this page will cancel unfinished uploads.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploadQueueState]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedAlbum || acceptedFiles.length === 0) return;

    const queue = new PhotoUploadQueueManager({
      albumId: selectedAlbum.id,
      albumTitle: selectedAlbum.title,
      files: acceptedFiles,
      userId: user?.uid || profile?.uid || 'admin',
      concurrency: 2,
      watermarkOptions: {
        watermark: watermarkStyle !== 'none',
        style: watermarkStyle === 'none' ? 'full_protection' : watermarkStyle
      }
    });

    activeQueueRef.current = queue;

    const unsubscribe = queue.subscribe((state) => {
      setUploadQueueState(state);
    });

    try {
      const uploaded = await queue.start();
      const successCount = uploaded.length;

      // Update album photoCount & cover photo if needed
      try {
        const updatedCount = photos.length + successCount;
        const albumUpdates: Partial<Album> = { photoCount: updatedCount };
        if (photos.length === 0 && uploaded.length > 0) {
          albumUpdates.coverPhotoUrl = uploaded[0].imageUrl || uploaded[0].thumbUrl;
          albumUpdates.thumbnailUrl = uploaded[0].thumbUrl || uploaded[0].imageUrl;
        }
        await updateDoc(doc(db, 'Albums', selectedAlbum.id), albumUpdates);
      } catch (e) {
        console.warn('Error updating album metadata after photo upload:', e);
      }

      showToast(`Batch complete: ${successCount} photo${successCount !== 1 ? 's' : ''} saved to Firebase!`);
    } catch (err) {
      console.error('Error during queue photo upload in EventGalleryView:', err);
      showToast('Error uploading photos. Please check network connection.');
    } finally {
      unsubscribe();
    }
  }, [selectedAlbum, photos, user, profile, watermarkStyle]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic'] },
    disabled: !isAdminOrCreator || (!!uploadQueueState && !uploadQueueState.isComplete),
    multiple: true
  } as any);

  // ----------------------------------------------------
  // 7. Delete Photo Handler
  // ----------------------------------------------------
  const handleDeletePhoto = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdminOrCreator || !selectedAlbum) return;

    if (!window.confirm('Delete this photo from the album?')) return;

    try {
      await deleteDoc(doc(db, 'Albums', selectedAlbum.id, 'Photos', photoId));
      showToast('Photo deleted.');
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  // ----------------------------------------------------
  // 7a. Batch Photo Selection & Deletion Handlers
  // ----------------------------------------------------
  const togglePhotoSelection = (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPhotoIds(prev =>
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    );
  };

  const handleSelectAllPhotos = () => {
    if (selectedPhotoIds.length === photos.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(photos.map(p => p.id));
    }
  };

  const handleBatchDeletePhotos = async () => {
    if (!isAdminOrCreator || !selectedAlbum || selectedPhotoIds.length === 0) return;

    const count = selectedPhotoIds.length;
    if (!window.confirm(`Are you sure you want to delete ${count} selected photo${count > 1 ? 's' : ''} from this album? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingBatch(true);
    try {
      const deletePromises = selectedPhotoIds.map(photoId =>
        deleteDoc(doc(db, 'Albums', selectedAlbum.id, 'Photos', photoId))
      );
      await Promise.all(deletePromises);

      // Update album photoCount in Firestore
      const newCount = Math.max(0, (selectedAlbum.photoCount || photos.length) - count);
      await updateDoc(doc(db, 'Albums', selectedAlbum.id), {
        photoCount: newCount
      });

      setSelectedAlbum(prev => prev ? { ...prev, photoCount: newCount } : null);
      showToast(`Successfully deleted ${count} photo${count > 1 ? 's' : ''}.`);
      setSelectedPhotoIds([]);
      setIsSelectionMode(false);
    } catch (err) {
      console.error('Error batch deleting photos:', err);
      showToast('Failed to delete selected photos.');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // ----------------------------------------------------
  // 7b. Set Photo as Album Thumbnail / Cover Photo
  // ----------------------------------------------------
  const handleSetAsCoverPhoto = async (photo: Photo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedAlbum) return;

    const newCoverUrl = photo.imageUrl || photo.thumbUrl;
    if (!newCoverUrl) return;

    try {
      // 1. Update Firestore Album Record using setDoc with merge: true
      await setDoc(doc(db, 'Albums', selectedAlbum.id), {
        coverPhotoUrl: newCoverUrl,
        thumbnailUrl: newCoverUrl
      }, { merge: true });

      // 2. Persist in Local Storage cache for immediate persistence
      try {
        localStorage.setItem(`just1play_album_cover_${selectedAlbum.id}`, newCoverUrl);
      } catch (lsErr) {
        console.warn('LocalStorage cover cache write warning:', lsErr);
      }

      // 3. Update selected album local state
      setSelectedAlbum(prev => prev ? {
        ...prev,
        coverPhotoUrl: newCoverUrl,
        thumbnailUrl: newCoverUrl
      } : null);

      // 4. Update overall albums list state array so list cards update immediately
      setAlbums(prevAlbums => prevAlbums.map(album => 
        album.id === selectedAlbum.id 
          ? { ...album, coverPhotoUrl: newCoverUrl, thumbnailUrl: newCoverUrl }
          : album
      ));

      showToast('Successfully set as album cover thumbnail!');
    } catch (err) {
      console.error('Error setting album cover thumbnail:', err);

      // Fallback: update local state & cache even if Firestore update fails
      try {
        localStorage.setItem(`just1play_album_cover_${selectedAlbum.id}`, newCoverUrl);
      } catch (lsErr) {
        // ignore
      }

      setSelectedAlbum(prev => prev ? {
        ...prev,
        coverPhotoUrl: newCoverUrl,
        thumbnailUrl: newCoverUrl
      } : null);

      setAlbums(prevAlbums => prevAlbums.map(album => 
        album.id === selectedAlbum.id 
          ? { ...album, coverPhotoUrl: newCoverUrl, thumbnailUrl: newCoverUrl }
          : album
      ));

      showToast('Set photo as album cover thumbnail!');
    }
  };

  // ----------------------------------------------------
  // 8. Download Photo Handler (Digital Download supporting clean or watermarked with Progress HUD)
  // ----------------------------------------------------
  const handleDownloadPhoto = async (photo: Photo, overrideWatermark?: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (downloadDismissTimeoutRef.current) {
      clearTimeout(downloadDismissTimeoutRef.current);
    }

    const applyWatermark = overrideWatermark !== undefined ? overrideWatermark : watermarksEnabled;
    const albumName = selectedAlbum?.title || 'Game_Media';
    const photoTitle = photo.title || `Action Shot #${photo.id.substring(0, 6)}`;
    setDownloadingPhotoId(photo.id);

    setDownloadState({
      isActive: true,
      progress: 10,
      status: 'Establishing high-definition media stream...',
      title: photoTitle,
      thumbnailUrl: photo.imageUrl || photo.thumbUrl,
      isWatermarked: applyWatermark,
      isComplete: false
    });

    try {
      showToast(applyWatermark ? 'Exporting 4K image with Just1Play watermark...' : 'Exporting clean unwatermarked 4K image...');
      await downloadPhotoWithPreference(
        photo.imageUrl,
        `${albumName}_${photoTitle}`,
        applyWatermark,
        { style: watermarkStyle === 'none' ? 'badge' : watermarkStyle },
        (percent, statusText) => {
          setDownloadState(prev => prev ? {
            ...prev,
            progress: percent,
            status: statusText
          } : null);
        }
      );

      setDownloadState(prev => prev ? {
        ...prev,
        progress: 100,
        status: '4K file successfully saved to your device!',
        isComplete: true,
        isActive: false
      } : null);

      showToast(`Downloaded "${photoTitle}"!`);

      downloadDismissTimeoutRef.current = setTimeout(() => {
        setDownloadState(null);
      }, 3500);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadState(prev => prev ? {
        ...prev,
        isComplete: false,
        isActive: false,
        error: 'Cross-origin direct download initiated in new tab.'
      } : null);
      window.open(photo.imageUrl, '_blank');
    } finally {
      setDownloadingPhotoId(null);
    }
  };

  const handleDownloadEntireAlbum = async (album: Album, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (downloadDismissTimeoutRef.current) {
      clearTimeout(downloadDismissTimeoutRef.current);
    }

    const photosToDownload = (selectedAlbum?.id === album.id && photos.length > 0)
      ? photos
      : (album.coverPhotoUrl ? [{
          id: `cover-${album.id}`,
          albumId: album.id,
          imageUrl: album.coverPhotoUrl,
          uploadTimestamp: album.date,
          title: `${album.title} (Cover Showcase)`
        }] : []);

    if (photosToDownload.length === 0) {
      showToast('No photos found in this album to download.');
      return;
    }

    setDownloadState({
      isActive: true,
      progress: 5,
      status: `Initializing bulk download for ${photosToDownload.length} photos...`,
      title: album.title,
      thumbnailUrl: album.coverPhotoUrl || photosToDownload[0]?.imageUrl,
      itemCount: { current: 1, total: photosToDownload.length },
      isWatermarked: watermarksEnabled,
      isComplete: false
    });

    try {
      showToast(`Downloading ${photosToDownload.length} photos for "${album.title}"...`);
      for (let i = 0; i < photosToDownload.length; i++) {
        const p = photosToDownload[i];
        const baseProgress = (i / photosToDownload.length) * 100;
        const sliceProgress = (1 / photosToDownload.length) * 100;

        setDownloadState(prev => prev ? {
          ...prev,
          itemCount: { current: i + 1, total: photosToDownload.length },
          thumbnailUrl: p.imageUrl,
          status: `Processing ${i + 1} of ${photosToDownload.length}: ${p.title || `Photo #${i + 1}`}...`,
          progress: Math.min(98, Math.round(baseProgress + 5))
        } : null);

        await downloadPhotoWithPreference(
          p.imageUrl,
          `${album.title}_${p.title || p.id}`,
          watermarksEnabled,
          { style: watermarkStyle === 'none' ? 'badge' : watermarkStyle },
          (percent, statusText) => {
            const overall = Math.min(99, Math.round(baseProgress + (percent / 100) * sliceProgress));
            setDownloadState(prev => prev ? {
              ...prev,
              progress: overall,
              status: `[${i + 1}/${photosToDownload.length}] ${statusText}`
            } : null);
          }
        );

        await new Promise(res => setTimeout(res, 180));
      }

      setDownloadState(prev => prev ? {
        ...prev,
        progress: 100,
        status: `Completed export of all ${photosToDownload.length} high-res photos!`,
        isComplete: true,
        isActive: false
      } : null);

      showToast(`Completed download of ${photosToDownload.length} photos!`);

      downloadDismissTimeoutRef.current = setTimeout(() => {
        setDownloadState(null);
      }, 4000);
    } catch (err) {
      console.error('Album download error:', err);
      setDownloadState(prev => prev ? {
        ...prev,
        isComplete: false,
        isActive: false,
        error: 'Album download encountered an issue.'
      } : null);
    }
  };

  const handleBatchDownloadSelected = async (overrideWatermark?: boolean) => {
    const selected = photos.filter(p => selectedPhotoIds.includes(p.id));
    if (selected.length === 0) {
      showToast('Please select at least one photo to download.');
      return;
    }

    if (downloadDismissTimeoutRef.current) {
      clearTimeout(downloadDismissTimeoutRef.current);
    }

    const applyWatermark = overrideWatermark !== undefined ? overrideWatermark : watermarksEnabled;
    const albumTitle = selectedAlbum?.title || 'Selected_Photos';

    setDownloadState({
      isActive: true,
      progress: 5,
      status: `Preparing to download ${selected.length} selected photos...`,
      title: `${selected.length} Selected Photos`,
      thumbnailUrl: selected[0]?.imageUrl,
      itemCount: { current: 1, total: selected.length },
      isWatermarked: applyWatermark,
      isComplete: false
    });

    try {
      showToast(`Downloading ${selected.length} selected photos...`);
      for (let i = 0; i < selected.length; i++) {
        const p = selected[i];
        const baseProgress = (i / selected.length) * 100;
        const sliceProgress = (1 / selected.length) * 100;

        setDownloadState(prev => prev ? {
          ...prev,
          itemCount: { current: i + 1, total: selected.length },
          thumbnailUrl: p.imageUrl || p.thumbUrl,
          status: `Processing ${i + 1} of ${selected.length}: ${p.title || `Photo #${i + 1}`}...`,
          progress: Math.min(98, Math.round(baseProgress + 5))
        } : null);

        await downloadPhotoWithPreference(
          p.imageUrl,
          `${albumTitle}_${p.title || p.id}`,
          applyWatermark,
          { style: watermarkStyle === 'none' ? 'badge' : watermarkStyle },
          (percent, statusText) => {
            const overall = Math.min(99, Math.round(baseProgress + (percent / 100) * sliceProgress));
            setDownloadState(prev => prev ? {
              ...prev,
              progress: overall,
              status: `[${i + 1}/${selected.length}] ${statusText}`
            } : null);
          }
        );

        await new Promise(res => setTimeout(res, 180));
      }

      setDownloadState(prev => prev ? {
        ...prev,
        progress: 100,
        status: `All ${selected.length} selected photos downloaded successfully!`,
        isComplete: true,
        isActive: false
      } : null);

      showToast(`Successfully downloaded ${selected.length} photos!`);

      downloadDismissTimeoutRef.current = setTimeout(() => {
        setDownloadState(null);
      }, 4000);
    } catch (err) {
      console.error('Batch download error:', err);
      setDownloadState(prev => prev ? {
        ...prev,
        isComplete: false,
        isActive: false,
        error: 'Batch download interrupted.'
      } : null);
    }
  };

  // Reset zoom & pan offset when switching active lightbox photo
  useEffect(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsPanning(false);
  }, [lightboxIndex]);

  // Zoom control helpers
  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsPanning(false);
  };

  const handleToggleDoubleTapZoom = () => {
    if (zoomScale > 1) {
      handleResetZoom();
    } else {
      setZoomScale(2.5);
    }
  };

  // Mouse pan handlers when zoomed in
  const handleMouseDownPan = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    setIsPanning(true);
    setPanStartPos({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMovePan = (e: React.MouseEvent) => {
    if (!isPanning || zoomScale <= 1) return;
    setPanOffset({
      x: e.clientX - panStartPos.x,
      y: e.clientY - panStartPos.y,
    });
  };

  const handleMouseUpPan = () => {
    setIsPanning(false);
  };

  // Touch handlers for swipe navigation, pinch-to-zoom, and double-tap
  const handleTouchStartLightbox = (e: React.TouchEvent) => {
    const now = Date.now();
    if (e.touches.length === 1) {
      // Double-tap detection (<300ms)
      if (now - lastTapTimeRef.current < 300) {
        handleToggleDoubleTapZoom();
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;

      if (zoomScale > 1) {
        setIsPanning(true);
        setPanStartPos({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
      }
    } else if (e.touches.length === 2) {
      // Start pinch-to-zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchScaleRef.current = zoomScale;
    }
  };

  const handleTouchMoveLightbox = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / initialPinchDistRef.current;
      const newScale = Math.min(Math.max(initialPinchScaleRef.current * ratio, 1), 4);
      setZoomScale(newScale);
      if (newScale === 1) setPanOffset({ x: 0, y: 0 });
    } else if (e.touches.length === 1) {
      if (zoomScale > 1 && isPanning) {
        setPanOffset({
          x: e.touches[0].clientX - panStartPos.x,
          y: e.touches[0].clientY - panStartPos.y,
        });
      }
    }
  };

  const handleTouchEndLightbox = (e: React.TouchEvent) => {
    initialPinchDistRef.current = null;
    setIsPanning(false);

    // Handle horizontal swipe navigation if zoom is 1x
    if (zoomScale === 1 && touchStartXRef.current !== null && touchStartYRef.current !== null && e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - touchStartXRef.current;
      const deltaY = endY - touchStartYRef.current;

      if (Math.abs(deltaX) > 40 && Math.abs(deltaY) < 100) {
        if (deltaX < 0) {
          // Swipe left -> Next
          setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
        } else {
          // Swipe right -> Previous
          setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
        }
      }
      touchStartXRef.current = null;
      touchStartYRef.current = null;
    }
  };

  // Lightbox keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') {
        if (zoomScale > 1) {
          handleResetZoom();
        } else {
          setLightboxIndex(null);
        }
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0' || e.key.toLowerCase() === 'r') {
        handleResetZoom();
      } else if (e.key.toLowerCase() === 'f') {
        setShowFilmstrip(prev => !prev);
      } else if (e.key.toLowerCase() === 'i') {
        setIsImmersiveMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos.length, zoomScale]);

  // Filtered albums incorporating State, Category, Sport, and Search
  const filteredAlbums = albums.filter(album => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      album.title.toLowerCase().includes(query) ||
      album.description?.toLowerCase().includes(query);

    const matchesSport = selectedSportFilter === 'all' || 
      album.title.toLowerCase().includes(selectedSportFilter.toLowerCase()) ||
      album.description?.toLowerCase().includes(selectedSportFilter.toLowerCase());

    const matchesState = selectedStateFilter === 'all' ||
      album.title.toLowerCase().includes(selectedStateFilter.toLowerCase()) ||
      album.description?.toLowerCase().includes(selectedStateFilter.toLowerCase());

    // Members can only see public albums, Admin/Creator can see all or filter
    if (!isAdminOrCreator && album.visibilityStatus === 'private') {
      return false;
    }

    if (filterVisibility === 'public' && album.visibilityStatus !== 'public') return false;
    if (filterVisibility === 'private' && album.visibilityStatus !== 'private') return false;

    return matchesSearch && matchesSport && matchesState;
  });

  return (
    <div className="space-y-10 pb-16">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-4 sm:right-8 z-50 px-4 py-3 rounded-2xl bg-[#FF6A00] text-black font-black text-xs uppercase shadow-[0_0_25px_rgba(255,106,0,0.6)] flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* VIEW LEVEL 1: ALBUM INDEX VIEW (WHEN NO ALBUM IS SELECTED) */}
      {!selectedAlbum ? (
        <div className="space-y-10">
          
          {/* MaxPreps Cinematic Featured Hero */}
          <MaxPrepsGalleryHero
            featuredAlbums={albums}
            onSelectAlbum={(alb) => setSelectedAlbum(alb)}
            onOpenMediaKit={() => setShowMediaKitDrawer(true)}
            savedPhotosCount={savedPhotos.length}
            isAdminOrCreator={isAdminOrCreator}
            onCreateAlbum={() => setShowCreateAlbumModal(true)}
          />

          {/* Top Action Shots Curated Spotlight Carousel */}
          <TopActionShotsCarousel
            actionShots={CURATED_ACTION_SHOTS}
            onOpenPhoto={(shot) => {
              const photoObj: Photo = {
                id: shot.id,
                albumId: shot.albumId,
                imageUrl: shot.imageUrl,
                uploadTimestamp: shot.date,
                title: `${shot.title} • ${shot.athlete} (${shot.school})`,
                isPremium: true
              };
              setPhotos([photoObj]);
              setLightboxIndex(0);
            }}
            onDownloadPhoto={(shot) => {
              const photoObj: Photo = {
                id: shot.id,
                albumId: shot.albumId,
                imageUrl: shot.imageUrl,
                uploadTimestamp: shot.date,
                title: `${shot.title} • ${shot.athlete} (${shot.school})`,
                isPremium: true
              };
              handleDownloadPhoto(photoObj);
            }}
          />

          {/* Find My Photos Multi-Dimension Search & Sports Filter */}
          <FindMyPhotosSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedSport={selectedSportFilter}
            onSportChange={setSelectedSportFilter}
            selectedState={selectedStateFilter}
            onStateChange={setSelectedStateFilter}
            selectedCategory={selectedCategoryFilter}
            onCategoryChange={setSelectedCategoryFilter}
            totalGalleriesCount={filteredAlbums.length}
          />

          {/* Album Cover Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black italic uppercase text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#FF6A00]" />
                  <span>GAME & EVENT GALLERIES</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Showing {filteredAlbums.length} Official Tri-State Coverage Albums
                </p>
              </div>

              {/* Watermark Toggle & Admin Visibility Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={toggleWatermarks}
                  title={watermarksEnabled ? 'Click to remove watermarks' : 'Click to enable watermarks'}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer border ${
                    watermarksEnabled
                      ? 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/50 shadow-[0_0_12px_rgba(255,106,0,0.3)]'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                  }`}
                >
                  {watermarksEnabled ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span>{watermarksEnabled ? 'WATERMARKS: ON' : 'WATERMARKS: REMOVED'}</span>
                </button>

                {isAdminOrCreator && (
                  <div className="flex items-center gap-1 bg-black/60 p-1 rounded-2xl border border-white/10">
                    <button
                      onClick={() => setFilterVisibility('all')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-all ${
                        filterVisibility === 'all' ? 'bg-[#FF6A00] text-black font-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({albums.length})
                    </button>
                    <button
                      onClick={() => setFilterVisibility('public')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-all ${
                        filterVisibility === 'public' ? 'bg-[#FF6A00] text-black font-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Public
                    </button>
                    <button
                      onClick={() => setFilterVisibility('private')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-all ${
                        filterVisibility === 'private' ? 'bg-[#FF6A00] text-black font-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Private (Admin)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {loadingAlbums ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-10 h-10 text-[#FF6A00] animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono uppercase">Loading Event Gallery Albums...</p>
              </div>
            ) : filteredAlbums.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-black/60 border border-white/10 space-y-4">
                <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white uppercase">No Event Albums Found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No matching albums available under current filters. Try searching for another team or selecting "All Sports".
                </p>
                {isAdminOrCreator && (
                  <button
                    onClick={() => setShowCreateAlbumModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-[#FF6A00] text-black font-bold text-xs uppercase mt-2 hover:bg-orange-500 cursor-pointer"
                  >
                    Create First Album
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAlbums.map((album) => (
                  <MaxPrepsGalleryCard
                    key={album.id}
                    album={album}
                    onClick={() => setSelectedAlbum(album)}
                    onShare={(e) => {
                      e.stopPropagation();
                      handleOpenShareModal(
                        'album',
                        album.title,
                        `${window.location.origin}/gallery?albumId=${album.id}`,
                        album.coverPhotoUrl,
                        `Official photo gallery for ${album.title} (${album.date})`,
                        e
                      );
                    }}
                    onDownloadAlbum={(e) => handleDownloadEntireAlbum(album, e)}
                    isAdminOrCreator={isAdminOrCreator}
                    onToggleVisibility={(e) => {
                      e.stopPropagation();
                      handleToggleVisibility(album, e);
                    }}
                    onDeleteAlbum={(e) => {
                      e.stopPropagation();
                      handleDeleteAlbum(album.id, album.title, e);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Floating Action Button (FAB) for Admin/Content Creator */}
          {isAdminOrCreator && (
            <button
              onClick={() => setShowCreateAlbumModal(true)}
              title="Create New Album"
              className="fixed bottom-20 md:bottom-8 right-6 z-40 p-4 rounded-full bg-[#FF6A00] hover:bg-orange-500 text-black shadow-[0_0_30px_rgba(255,106,0,0.7)] transition-all transform hover:scale-110 cursor-pointer flex items-center justify-center font-black"
            >
              <Plus className="w-7 h-7 stroke-[3]" />
            </button>
          )}

        </div>
      ) : (
        /* VIEW LEVEL 2: INSIDE SELECTED ALBUM (FULL MASONRY GALLERY & UPLOAD) */
        <div className="space-y-8">
          
          {/* Top Bar with Navigation Back Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-black/80 border border-white/15 backdrop-blur-xl">
            <div className="space-y-2">
              <button
                onClick={() => {
                  setSelectedAlbum(null);
                  setIsSelectionMode(false);
                  setSelectedPhotoIds([]);
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase transition-colors cursor-pointer border border-white/10 mb-2"
              >
                <ArrowLeft className="w-4 h-4 text-[#E5B868]" />
                <span>BACK TO ALL ALBUMS</span>
              </button>

              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-4xl font-black italic uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]">
                  {selectedAlbum.title}
                </h1>
                
                {selectedAlbum.visibilityStatus === 'private' ? (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>PRIVATE</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-[#E5B868]/20 border border-[#E5B868]/40 text-[#E5B868] text-xs font-mono font-bold uppercase flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>PUBLIC</span>
                  </span>
                )}

                <button
                  onClick={(e) => handleOpenShareModal(
                    'album',
                    selectedAlbum.title,
                    window.location.href,
                    selectedAlbum.coverPhotoUrl,
                    `Official photo gallery for ${selectedAlbum.title} (${selectedAlbum.date})`,
                    e
                  )}
                  className="px-3 py-1 rounded-full bg-[#FF6A00]/10 hover:bg-[#FF6A00]/20 border border-[#FF6A00]/30 text-[#FF6A00] text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_12px_rgba(255,106,0,0.2)]"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>SHARE ALBUM</span>
                </button>

                {/* Watermark Toggle Control in Album */}
                <button
                  onClick={toggleWatermarks}
                  title={watermarksEnabled ? 'Click to remove watermarks' : 'Click to enable watermarks'}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer border ${
                    watermarksEnabled
                      ? 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/50 hover:bg-[#FF6A00] hover:text-black'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500 hover:text-black'
                  }`}
                >
                  {watermarksEnabled ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span>{watermarksEnabled ? 'WATERMARKS: ON' : 'WATERMARKS: REMOVED'}</span>
                </button>

                {/* Download Album */}
                <button
                  onClick={() => handleDownloadEntireAlbum(selectedAlbum)}
                  className="px-3.5 py-1 rounded-full bg-white hover:bg-slate-200 text-black font-black text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>DOWNLOAD ALBUM</span>
                </button>

                {isAdminOrCreator && (
                  <button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedPhotoIds([]);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isSelectionMode
                        ? 'bg-[#FF6A00] text-black border-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.6)]'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>{isSelectionMode ? 'EXIT SELECTION' : 'BATCH SELECT'}</span>
                  </button>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed font-sans">
                {selectedAlbum.description}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5 border-t sm:border-t-0 sm:border-l border-white/15 pt-3 sm:pt-0 sm:pl-6 text-xs text-slate-400 font-mono">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#E5B868]" />
                <span>Date: {selectedAlbum.date}</span>
              </span>
              <span className="text-[#E5B868] font-bold">
                {photos.length} High-Res Photo{photos.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* BATCH SELECTION & ACTION TOOLBAR */}
          {isSelectionMode && (
            <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-[#E5B868]/40 shadow-[0_0_30px_rgba(214,28,36,0.15)] flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#E5B868] uppercase block font-bold tracking-wider">
                    Batch Selection Mode Active
                  </span>
                  <span className="text-sm font-black text-white italic uppercase tracking-wide">
                    {selectedPhotoIds.length} of {photos.length} photos selected
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleSelectAllPhotos}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer border border-white/15"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#E5B868]" />
                  <span>{selectedPhotoIds.length === photos.length && photos.length > 0 ? 'DESELECT ALL' : 'SELECT ALL'}</span>
                </button>

                <button
                  onClick={() => handleBatchDownloadSelected()}
                  disabled={selectedPhotoIds.length === 0 || (downloadState?.isActive ?? false)}
                  className="px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs font-mono uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,106,0,0.4)]"
                >
                  {downloadState?.isActive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                  <span>DOWNLOAD SELECTED ({selectedPhotoIds.length})</span>
                </button>

                <button
                  onClick={handleBatchDeletePhotos}
                  disabled={selectedPhotoIds.length === 0 || isDeletingBatch}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                >
                  {isDeletingBatch ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>DELETE SELECTED ({selectedPhotoIds.length})</span>
                </button>

                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedPhotoIds([]);
                  }}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-mono font-bold uppercase transition-colors cursor-pointer border border-white/10"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* ADMIN & CONTENT CREATOR BULK DRAG-AND-DROP UPLOAD ZONE */}
          {isAdminOrCreator ? (
            <div className="space-y-3">
              {/* WATERMARK PROTECTION CONFIG TOOLBAR */}
              <div className="p-3.5 rounded-2xl bg-[#212A31] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-white font-bold block text-xs uppercase">Photo Watermark Configuration</span>
                    <span className="text-[10px] text-slate-400 block">Controls branding overlays during upload & admin downloads</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setWatermarkStyle('badge')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                      watermarkStyle === 'badge'
                        ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_12px_rgba(229,184,104,0.5)]'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    Footer Badge (Clean Body)
                  </button>

                  <button
                    type="button"
                    onClick={() => setWatermarkStyle('none')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                      watermarkStyle === 'none'
                        ? 'bg-amber-400 text-black border-amber-400'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    No Watermark (Clean)
                  </button>

                  <button
                    type="button"
                    onClick={() => setWatermarkStyle('full_protection')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                      watermarkStyle === 'full_protection'
                        ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_12px_rgba(229,184,104,0.5)]'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    Full Protection (Grid + Footer)
                  </button>
                </div>
              </div>

              {uploadQueueState && !uploadQueueState.isComplete ? (
                <div className="p-6 rounded-3xl bg-[#121212] border border-[#E5B868]/40 shadow-[0_0_40px_rgba(229,184,104,0.15)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-[#E5B868]/15 text-[#E5B868] border border-[#E5B868]/30">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-2">
                          <span>Queue Processing Batch Upload</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#E5B868]/20 text-[#E5B868]">
                            {uploadQueueState.completed} / {uploadQueueState.total} Photos
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 font-mono truncate max-w-md">
                          {uploadQueueState.currentTaskName ? `Syncing: ${uploadQueueState.currentTaskName}` : uploadQueueState.statusMessage}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-[#E5B868] font-mono">{uploadQueueState.overallPercentage}%</span>
                      <button
                        type="button"
                        onClick={() => activeQueueRef.current?.cancel()}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Progress track */}
                  <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-[#E5B868] to-[#B8141B] transition-all duration-300 rounded-full"
                      style={{ width: `${uploadQueueState.overallPercentage}%` }}
                    />
                  </div>

                  {/* Live Mini Queue Tasks Preview */}
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                    {uploadQueueState.tasks.slice(0, 8).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-slate-300"
                      >
                        <span className="truncate max-w-[60%] flex items-center gap-1.5">
                          {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          {task.status === 'processing' && <Loader2 className="w-3.5 h-3.5 text-[#E5B868] animate-spin shrink-0" />}
                          {task.status === 'uploading' && <Upload className="w-3.5 h-3.5 text-sky-400 animate-bounce shrink-0" />}
                          {task.status === 'saving' && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />}
                          {task.status === 'pending' && <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0 mx-1" />}
                          {task.status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                          <span className="truncate">{task.name}</span>
                        </span>

                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {task.status === 'completed' && <span className="text-emerald-400 font-bold">Saved</span>}
                          {task.status === 'processing' && <span className="text-[#E5B868]">Compressing</span>}
                          {task.status === 'uploading' && <span className="text-sky-400">Storage</span>}
                          {task.status === 'saving' && <span className="text-amber-400">Firestore</span>}
                          {task.status === 'pending' && <span className="text-slate-500">Queued</span>}
                          {task.status === 'failed' && <span className="text-rose-400">Error</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={`p-8 rounded-3xl border-2 border-dashed transition-all text-center cursor-pointer relative overflow-hidden ${
                    isDragActive
                      ? 'border-[#E5B868] bg-[#E5B868]/10 shadow-[0_0_30px_rgba(229,184,104,0.2)]'
                      : 'border-white/20 bg-black/60 hover:border-[#E5B868]/60 hover:bg-black/80'
                  }`}
                >
                  <input {...getInputProps()} />
                  
                  <div className="space-y-3 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(229,184,104,0.3)]">
                      <Upload className="w-7 h-7" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-black uppercase text-white tracking-wide">
                        {isDragActive ? 'Drop photos here to upload batch...' : 'Bulk Drag & Drop Photo Upload Zone'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Supports 50+ photos with managed concurrency. Uploads high-res images directly with automatic <span className="text-[#E5B868] font-bold">Just1Play</span> protection.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider hover:bg-[#B8141B] transition-colors cursor-pointer shadow-[0_0_15px_rgba(229,184,104,0.25)]"
                    >
                      SELECT PHOTOS FROM COMPUTER
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* FULL-WIDTH MASONRY GRID OF PHOTOS */}
          {loadingPhotos ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#E5B868] animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-mono">Loading album high-res photos...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-black/40 border border-white/10 space-y-3">
              <Camera className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white uppercase">Album is currently empty</h3>
              <p className="text-xs text-slate-400">
                {isAdminOrCreator ? 'Drag and drop photos into the upload zone above to populate this album.' : 'No photos have been uploaded to this album yet.'}
              </p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {photos.map((photo, index) => {
                const isSelected = selectedPhotoIds.includes(photo.id);

                return (
                  <div
                    key={photo.id}
                    onClick={(e) => {
                      if (isSelectionMode) {
                        togglePhotoSelection(photo.id, e);
                      } else {
                        setLightboxIndex(index);
                      }
                    }}
                    className={`group relative rounded-2xl overflow-hidden bg-black border transition-all duration-300 cursor-pointer shadow-xl break-inside-avoid ${
                      isSelectionMode && isSelected
                        ? 'border-[#E5B868] ring-2 ring-[#E5B868] shadow-[0_0_25px_rgba(214,28,36,0.5)] bg-[#E5B868]/10'
                        : 'border-white/10 hover:border-[#E5B868]'
                    }`}
                  >
                    {/* Selection Checkbox Badge */}
                    {isSelectionMode && (
                      <div
                        onClick={(e) => togglePhotoSelection(photo.id, e)}
                        className={`absolute top-3 left-3 z-30 p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.9)] scale-110'
                            : 'bg-black/80 text-slate-400 border-white/20 hover:text-white hover:border-[#E5B868]'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </div>
                    )}

                    <SportsGalleryImage
                      src={photo.imageUrl || photo.thumbUrl || ''}
                      alt={photo.title || `Photo ${index + 1}`}
                      sport={selectedAlbum?.sport || 'Sports'}
                      title={photo.title}
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                      containerClassName="w-full h-auto relative overflow-hidden bg-black"
                    />

                    {/* Cover Photo Badge if current album cover (hidden in selection mode to avoid overlap) */}
                    {!isSelectionMode && selectedAlbum?.coverPhotoUrl === photo.imageUrl && (
                      <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-[#E5B868] text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_12px_rgba(214,28,36,0.8)] border border-black">
                        <Star className="w-3 h-3 fill-black text-black" />
                        <span>THUMBNAIL</span>
                      </div>
                    )}

                  {/* Dark Glass Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between">
                    
                    {/* Top Right Buttons */}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => toggleSavePhoto(photo, e)}
                        title={savedPhotos.some(p => p.id === photo.id || p.imageUrl === photo.imageUrl) ? 'Remove from Scout Media Kit' : 'Save to Scout Media Kit'}
                        className={`p-2 rounded-xl transition-all cursor-pointer border ${
                          savedPhotos.some(p => p.id === photo.id || p.imageUrl === photo.imageUrl)
                            ? 'bg-rose-600 text-white border-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.8)]'
                            : 'bg-black/80 hover:bg-rose-600 text-slate-300 hover:text-white border-white/20'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${savedPhotos.some(p => p.id === photo.id || p.imageUrl === photo.imageUrl) ? 'fill-white' : 'fill-none'}`} />
                      </button>

                      {isAdminOrCreator && (
                        <>
                          <button
                            onClick={(e) => handleSetAsCoverPhoto(photo, e)}
                            title={selectedAlbum?.coverPhotoUrl === photo.imageUrl ? 'Current Album Cover' : 'Set as Album Cover Thumbnail'}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 border ${
                              selectedAlbum?.coverPhotoUrl === photo.imageUrl
                                ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_12px_rgba(214,28,36,0.6)]'
                                : 'bg-black/80 hover:bg-[#E5B868] text-slate-300 hover:text-black border-white/20 hover:border-[#E5B868]'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${selectedAlbum?.coverPhotoUrl === photo.imageUrl ? 'fill-black' : 'fill-none'}`} />
                            <span>{selectedAlbum?.coverPhotoUrl === photo.imageUrl ? 'COVER' : 'SET COVER'}</span>
                          </button>

                          <button
                            onClick={(e) => handleDeletePhoto(photo.id, e)}
                            title="Delete Photo"
                            className="p-2 rounded-xl bg-black/80 hover:bg-red-500 text-white transition-colors cursor-pointer border border-white/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Bottom Info & Download CTA */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-white uppercase truncate">
                        {photo.title || `Photo #${index + 1}`}
                      </p>

                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/20">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleOpenShareModal(
                              'photo',
                              photo.title || selectedAlbum?.title || 'Game Photo',
                              photo.imageUrl,
                              photo.imageUrl,
                              `Check out this high-res game action photo from ${selectedAlbum?.title || 'Just1Play Sports'}!`,
                              e
                            )}
                            title="Share Photo"
                            className="px-2 py-1.5 rounded-lg bg-black/80 hover:bg-[#FF6A00] text-slate-300 hover:text-black border border-white/20 hover:border-[#FF6A00] text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Share2 className="w-3 h-3 text-[#FF6A00]" />
                            <span>Share</span>
                          </button>

                          <button
                            onClick={(e) => handleDownloadPhoto(photo, false, e)}
                            title="Download Clean (No Watermark)"
                            className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-emerald-500 text-slate-300 hover:text-black border border-white/20 text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <ShieldAlert className="w-3 h-3 text-emerald-400" />
                            <span>Clean</span>
                          </button>
                        </div>

                        <button
                          onClick={(e) => handleDownloadPhoto(photo, undefined, e)}
                          disabled={downloadingPhotoId === photo.id}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FF6A00] hover:bg-orange-500 text-black font-black text-[10px] uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(255,106,0,0.5)] cursor-pointer whitespace-nowrap"
                        >
                          {downloadingPhotoId === photo.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3 stroke-[3]" />
                          )}
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}

        </div>
      )}

      {/* FULL-SCREEN IMMERSIVE IMAGE LIGHTBOX MODAL */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/98 backdrop-blur-2xl flex flex-col justify-between p-2 sm:p-6 select-none animate-fadeIn overflow-hidden">
          
          {/* Lightbox Header Bar */}
          <div className={`flex items-center justify-between text-white border-b border-white/10 pb-3 transition-all duration-300 ${
            isImmersiveMode ? 'opacity-20 hover:opacity-100' : 'opacity-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black italic uppercase text-white flex items-center gap-2">
                  <span>{selectedAlbum?.title || 'Event Gallery'}</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Photo {lightboxIndex + 1} of {photos.length} • {photos[lightboxIndex]?.title || 'Action Shot'}
                </p>
              </div>
            </div>

            {/* Quick Controls in Header */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleWatermarks}
                title={watermarksEnabled ? 'Watermark is ACTIVE. Click to remove.' : 'Watermark is REMOVED. Click to enable.'}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                  watermarksEnabled
                    ? 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40 shadow-[0_0_12px_rgba(255,106,0,0.3)]'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}
              >
                {watermarksEnabled ? <ShieldCheck className="w-4 h-4 text-[#FF6A00]" /> : <ShieldAlert className="w-4 h-4 text-emerald-400" />}
                <span className="hidden sm:inline">{watermarksEnabled ? 'Watermark: ON' : 'Watermark: REMOVED'}</span>
              </button>

              <button
                onClick={() => setIsSlideshowActive(!isSlideshowActive)}
                title={isSlideshowActive ? 'Pause Auto Slideshow' : 'Start Auto Slideshow'}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                  isSlideshowActive
                    ? 'bg-[#E5B868] text-slate-950 border-[#E5B868] shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                {isSlideshowActive ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-white" />}
                <span className="hidden md:inline">{isSlideshowActive ? 'Slideshow On' : 'Auto Play'}</span>
              </button>

              <button
                onClick={(e) => toggleSavePhoto(photos[lightboxIndex], e)}
                title="Save to Scout Media Kit"
                className={`p-2 rounded-xl transition-all border cursor-pointer ${
                  savedPhotos.some(p => p.id === photos[lightboxIndex].id || p.imageUrl === photos[lightboxIndex].imageUrl)
                    ? 'bg-rose-600 text-white border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.8)]'
                    : 'bg-white/10 hover:bg-rose-600 text-white border-white/20'
                }`}
              >
                <Heart className={`w-5 h-5 ${savedPhotos.some(p => p.id === photos[lightboxIndex].id || p.imageUrl === photos[lightboxIndex].imageUrl) ? 'fill-white' : 'fill-none'}`} />
              </button>

              <button
                onClick={() => setIsImmersiveMode(!isImmersiveMode)}
                title={isImmersiveMode ? 'Exit Immersive Mode' : 'Enter Immersive Mode'}
                className={`p-2 rounded-xl transition-all border cursor-pointer ${
                  isImmersiveMode
                    ? 'bg-[#E5B868] text-black border-[#E5B868]'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                {isImmersiveMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setShowFilmstrip(!showFilmstrip)}
                title={showFilmstrip ? 'Hide Filmstrip' : 'Show Filmstrip'}
                className={`p-2 rounded-xl transition-all border cursor-pointer hidden sm:flex ${
                  showFilmstrip
                    ? 'bg-white/20 text-white border-white/30'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>

              <button
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white transition-all cursor-pointer border border-white/20"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Center Image View with Arrow Controls & Zoom Overlay */}
          <div
            className="relative flex-1 flex items-center justify-center my-2 overflow-hidden touch-none"
            onMouseDown={handleMouseDownPan}
            onMouseMove={handleMouseMovePan}
            onMouseUp={handleMouseUpPan}
            onMouseLeave={handleMouseUpPan}
            onTouchStart={handleTouchStartLightbox}
            onTouchMove={handleTouchMoveLightbox}
            onTouchEnd={handleTouchEndLightbox}
          >
            {/* Previous Photo Arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
              }}
              className="absolute left-2 sm:left-6 z-20 p-3 sm:p-4 rounded-2xl bg-black/75 hover:bg-[#E5B868] text-white hover:text-black transition-all border border-white/20 cursor-pointer shadow-2xl group"
              title="Previous Photo (Left Arrow / Swipe Right)"
            >
              <ChevronLeft className="w-6 h-6 stroke-[3] group-hover:-translate-x-1 transition-transform" />
            </button>

            {/* Display High-Res Photo with Scale & Pan Transforms */}
            <div
              className={`relative max-h-[80vh] max-w-full flex items-center justify-center transition-transform duration-150 ${
                isPanning ? 'cursor-grabbing' : zoomScale > 1 ? 'cursor-grab' : 'cursor-zoom-in'
              }`}
              style={{
                transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                transformOrigin: 'center center',
              }}
              onDoubleClick={handleToggleDoubleTapZoom}
            >
              <img
                src={photos[lightboxIndex]?.imageUrl || photos[lightboxIndex]?.thumbUrl || ''}
                alt={photos[lightboxIndex]?.title || 'High-res image'}
                draggable={false}
                className="max-h-[75vh] max-w-full object-contain mx-auto rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.95)] border border-white/15 select-none pointer-events-none"
              />
            </div>

            {/* Next Photo Arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-2 sm:right-6 z-20 p-3 sm:p-4 rounded-2xl bg-black/75 hover:bg-[#E5B868] text-white hover:text-black transition-all border border-white/20 cursor-pointer shadow-2xl group"
              title="Next Photo (Right Arrow / Swipe Left)"
            >
              <ChevronRight className="w-6 h-6 stroke-[3] group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Floating Zoom Control Bar Overlay */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl text-white">
              <button
                onClick={handleZoomIn}
                disabled={zoomScale >= 4}
                className="p-2 rounded-xl bg-white/10 hover:bg-[#E5B868] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <span className="px-2 font-mono text-xs font-bold text-[#E5B868]">
                {Math.round(zoomScale * 100)}%
              </span>

              <button
                onClick={handleZoomOut}
                disabled={zoomScale <= 1}
                className="p-2 rounded-xl bg-white/10 hover:bg-[#E5B868] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {zoomScale > 1 && (
                <button
                  onClick={handleResetZoom}
                  className="p-2 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-black transition-all cursor-pointer text-amber-400"
                  title="Reset Zoom (0 / Esc)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Pinch & Swipe Touch Gesture Hint Badge */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] text-slate-300 font-mono uppercase tracking-wider pointer-events-none opacity-60 hover:opacity-100 transition-opacity hidden sm:block">
              Swipe to navigate • Pinch / Double-tap to zoom
            </div>
          </div>

          {/* BOTTOM THUMBNAILS FILMSTRIP BAR */}
          {showFilmstrip && !isImmersiveMode && (
            <div className="w-full my-2 overflow-x-auto no-scrollbar py-2 border-t border-white/10">
              <div className="flex items-center gap-2 max-w-max mx-auto px-4">
                {photos.map((p, idx) => (
                  <button
                    key={p.id || idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                      idx === lightboxIndex
                        ? 'border-[#E5B868] ring-2 ring-[#E5B868]/50 scale-105 shadow-[0_0_15px_rgba(214,28,36,0.6)]'
                        : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/60'
                    }`}
                  >
                    <SportsGalleryImage
                      src={p.thumbUrl || p.imageUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      sport={selectedAlbum?.sport || 'Sports'}
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full relative overflow-hidden bg-black"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lightbox Footer Bar with Neon-Green Download CTA */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-3 bg-black/80 backdrop-blur-xl rounded-2xl p-4 transition-all duration-300 ${
            isImmersiveMode ? 'opacity-20 hover:opacity-100' : 'opacity-100'
          }`}>
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-xs font-bold text-white uppercase">
                {photos[lightboxIndex].title || `Photo #${lightboxIndex + 1}`}
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                Uploaded: {new Date(photos[lightboxIndex].uploadTimestamp).toLocaleDateString()} • Full 4K Resolution
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
              <button
                onClick={(e) => handleOpenShareModal(
                  'photo',
                  photos[lightboxIndex].title || selectedAlbum?.title || 'Game Photo',
                  photos[lightboxIndex].imageUrl,
                  photos[lightboxIndex].imageUrl,
                  `Check out this high-res game action photo from ${selectedAlbum?.title || 'Just1Play Sports'}!`,
                  e
                )}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20"
              >
                <Share2 className="w-4 h-4 text-[#FF6A00]" />
                <span>SHARE</span>
              </button>

              {/* Clean 4K Download */}
              <button
                onClick={() => handleDownloadPhoto(photos[lightboxIndex], false)}
                disabled={downloadingPhotoId === photos[lightboxIndex].id}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-emerald-500 hover:text-black text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20 disabled:opacity-50"
                title="Download Clean High-Resolution Photo without Watermark"
              >
                {downloadingPhotoId === photos[lightboxIndex].id && !watermarksEnabled ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <Download className="w-4 h-4 text-emerald-400" />
                )}
                <span>CLEAN 4K</span>
              </button>

              {isAdminOrCreator && (
                <button
                  onClick={() => handleSetAsCoverPhoto(photos[lightboxIndex])}
                  className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    selectedAlbum?.coverPhotoUrl === photos[lightboxIndex].imageUrl
                      ? 'bg-[#FF6A00] text-black border-[#FF6A00] shadow-[0_0_20px_rgba(255,106,0,0.6)]'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                >
                  <Star className={`w-4 h-4 ${selectedAlbum?.coverPhotoUrl === photos[lightboxIndex].imageUrl ? 'fill-black text-black' : 'text-[#FF6A00]'}`} />
                  <span>{selectedAlbum?.coverPhotoUrl === photos[lightboxIndex].imageUrl ? 'COVER' : 'SET COVER'}</span>
                </button>
              )}

              {/* Main Download Button */}
              <button
                onClick={() => handleDownloadPhoto(photos[lightboxIndex])}
                disabled={downloadingPhotoId === photos[lightboxIndex].id}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#FF6A00] hover:bg-orange-500 disabled:opacity-70 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,106,0,0.5)] cursor-pointer"
              >
                {downloadingPhotoId === photos[lightboxIndex].id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>EXPORTING 4K ({downloadState?.progress || 0}%)...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 stroke-[3]" />
                    <span>{watermarksEnabled ? 'DOWNLOAD 4K (WATERMARKED)' : 'DOWNLOAD 4K (CLEAN)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* CREATE NEW ALBUM MODAL (ADMIN & CONTENT CREATOR ONLY) */}
      {showCreateAlbumModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#000000] border border-white/20 p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#E5B868]" />
                <h3 className="text-lg font-black italic uppercase text-white">Create Event Album</h3>
              </div>
              <button
                onClick={() => setShowCreateAlbumModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <AdminBulkUploadForm
              onSuccess={() => {
                showToast('Album created & bulk photos uploaded successfully!');
                setShowCreateAlbumModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* ATHLETE SOCIAL SHARE MODAL */}
      {shareModalData && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-[#080808] border border-white/20 p-6 sm:p-8 space-y-6 shadow-[0_0_50px_rgba(214,28,36,0.2)] relative overflow-hidden">
            
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black italic uppercase text-white">Share Game Media</h3>
                  <p className="text-[10px] text-slate-400 font-mono">JUST1PLAY Athlete Showcase Card</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShareModalData(null);
                  setCopiedLink(false);
                }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Card Preview */}
            <div className="rounded-2xl bg-black border border-white/15 overflow-hidden relative group">
              {shareModalData.imageUrl && !shareModalData.imageUrl.includes('unsplash.com') ? (
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={shareModalData.imageUrl}
                    alt={shareModalData.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#E5B868]/50 text-[#E5B868] text-[10px] font-mono font-bold uppercase flex items-center gap-1 shadow-[0_0_12px_rgba(214,28,36,0.4)]">
                    <Sparkles className="w-3 h-3" />
                    <span>JUST1PLAY OFFICIAL</span>
                  </div>
                </div>
              ) : null}

              <div className="p-4 space-y-1">
                <h4 className="text-sm font-black italic uppercase text-white tracking-wide">
                  {shareModalData.title}
                </h4>
                <p className="text-xs text-slate-300 font-sans line-clamp-2">
                  {shareModalData.subtitle}
                </p>
              </div>
            </div>

            {/* Quick Copy Link Box */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                Shareable Game Link
              </label>
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/15">
                <input
                  type="text"
                  readOnly
                  value={shareModalData.url}
                  className="w-full bg-transparent px-3 py-1.5 text-xs text-slate-300 font-mono outline-none truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareModalData.url);
                    setCopiedLink(true);
                    showToast('Link copied to clipboard!');
                    setTimeout(() => setCopiedLink(false), 3000);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    copiedLink
                      ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'COPIED!' : 'COPY'}</span>
                </button>
              </div>
            </div>

            {/* Direct Platform Social Share Grid */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                Direct Platform Blast
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* X / Twitter */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareModalData.subtitle || '')}&url=${encodeURIComponent(shareModalData.url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#E5B868] transition-all flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group"
                >
                  <Send className="w-4 h-4 text-[#E5B868] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-white uppercase">X / Twitter</span>
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareModalData.subtitle} ${shareModalData.url}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#E5B868] transition-all flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group"
                >
                  <MessageCircle className="w-4 h-4 text-[#E5B868] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-white uppercase">WhatsApp</span>
                </a>

                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareModalData.url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#E5B868] transition-all flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group"
                >
                  <ExternalLink className="w-4 h-4 text-[#E5B868] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-white uppercase">Facebook</span>
                </a>

                {/* SMS / iMessage */}
                <a
                  href={`sms:?&body=${encodeURIComponent(`${shareModalData.subtitle} ${shareModalData.url}`)}`}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#E5B868] transition-all flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group"
                >
                  <Send className="w-4 h-4 text-[#E5B868] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-white uppercase">SMS / Text</span>
                </a>
              </div>
            </div>

            {/* Direct Image Copy Option if photo */}
            {shareModalData.imageUrl && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareModalData.imageUrl || '');
                  showToast('Direct photo image URL copied to clipboard!');
                }}
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white text-xs font-mono font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4 text-[#FF6A00]" />
                <span>COPY DIRECT IMAGE URL (FOR INSTAGRAM / HUDL)</span>
              </button>
            )}

          </div>
        </div>
      )}

      {/* SCOUT MEDIA KIT DRAWER MODAL */}
      {showMediaKitDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.2)] text-white space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#E5B868]/15 text-[#E5B868] border border-[#E5B868]/30">
                  <Bookmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black italic uppercase text-white tracking-wide">
                    Scout Media Kit Portfolio
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {savedPhotos.length} Saved Action Photos for College Recruiters & Social Media
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowMediaKitDrawer(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {savedPhotos.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <Heart className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white uppercase">Your Media Kit is Empty</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click the heart icon on any event photo to save it here for bulk downloading and recruiter portfolio sharing.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Saved Photos Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                  {savedPhotos.map((photo, idx) => (
                    <div key={photo.id || idx} className="relative group rounded-xl overflow-hidden bg-black border border-white/15 h-32">
                      <img
                        src={photo.imageUrl || photo.thumbUrl}
                        alt={photo.title || 'Saved Photo'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-2 flex flex-col justify-between opacity-90 group-hover:opacity-100">
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => toggleSavePhoto(photo, e)}
                            className="p-1 rounded-lg bg-black/80 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] font-bold text-white uppercase truncate">
                          {photo.title || `Photo #${idx + 1}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Media Kit Action Buttons */}
                <div className="flex flex-wrap gap-2.5 pt-2 border-t border-white/10">
                  <button
                    onClick={async () => {
                      if (savedPhotos.length === 0) return;
                      if (downloadDismissTimeoutRef.current) clearTimeout(downloadDismissTimeoutRef.current);

                      setDownloadState({
                        isActive: true,
                        progress: 5,
                        status: `Exporting ${savedPhotos.length} Scout Media Kit photos...`,
                        title: `Scout Media Kit (${savedPhotos.length} Photos)`,
                        thumbnailUrl: savedPhotos[0]?.imageUrl,
                        itemCount: { current: 1, total: savedPhotos.length },
                        isWatermarked: watermarksEnabled,
                        isComplete: false
                      });

                      try {
                        showToast(`Exporting ${savedPhotos.length} Scout Media Kit photos...`);
                        for (let i = 0; i < savedPhotos.length; i++) {
                          const p = savedPhotos[i];
                          const baseProgress = (i / savedPhotos.length) * 100;
                          const sliceProgress = (1 / savedPhotos.length) * 100;

                          setDownloadState(prev => prev ? {
                            ...prev,
                            itemCount: { current: i + 1, total: savedPhotos.length },
                            thumbnailUrl: p.imageUrl || p.thumbUrl,
                            status: `Processing ${i + 1} of ${savedPhotos.length}: ${p.title || `Action Shot #${i + 1}`}...`,
                            progress: Math.min(98, Math.round(baseProgress + 5))
                          } : null);

                          await downloadPhotoWithPreference(
                            p.imageUrl,
                            `ScoutMediaKit_${p.title || p.id}`,
                            watermarksEnabled,
                            { style: watermarkStyle === 'none' ? 'badge' : watermarkStyle },
                            (percent, statusText) => {
                              const overall = Math.min(99, Math.round(baseProgress + (percent / 100) * sliceProgress));
                              setDownloadState(prev => prev ? {
                                ...prev,
                                progress: overall,
                                status: `[${i + 1}/${savedPhotos.length}] ${statusText}`
                              } : null);
                            }
                          );
                          await new Promise(res => setTimeout(res, 180));
                        }

                        setDownloadState(prev => prev ? {
                          ...prev,
                          progress: 100,
                          status: `All ${savedPhotos.length} Scout Media Kit photos saved!`,
                          isComplete: true,
                          isActive: false
                        } : null);

                        showToast(`Downloaded all ${savedPhotos.length} Scout Media Kit photos!`);
                        downloadDismissTimeoutRef.current = setTimeout(() => {
                          setDownloadState(null);
                        }, 4000);
                      } catch (err) {
                        console.error('Media kit download error:', err);
                      }
                    }}
                    disabled={downloadState?.isActive}
                    className="flex-1 min-h-[44px] px-4 py-2.5 bg-[#FF6A00] hover:bg-orange-500 disabled:opacity-50 text-black font-black text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,106,0,0.4)]"
                  >
                    {downloadState?.isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>Download All ({savedPhotos.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      const text = `JUST1PLAY SCOUT MEDIA KIT:\n` + savedPhotos.map((p, i) => `${i + 1}. ${p.title || 'Game Photo'}: ${p.imageUrl}`).join('\n');
                      navigator.clipboard.writeText(text);
                      showToast('Media Kit summary copied to clipboard!');
                    }}
                    className="flex-1 min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-xl border border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-[#FF6A00]" />
                    <span>Copy Recruiter Link</span>
                  </button>

                  <button
                    onClick={() => {
                      setSavedPhotos([]);
                      localStorage.removeItem('just1play_saved_photos');
                      showToast('Cleared Scout Media Kit.');
                    }}
                    className="min-h-[44px] px-4 py-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-bold text-xs uppercase rounded-xl border border-rose-800 transition-all cursor-pointer"
                  >
                    Clear Kit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING REAL-TIME DOWNLOAD PROGRESS HUD INDICATOR */}
      <DownloadProgressHUD
        downloadState={downloadState}
        onDismiss={() => setDownloadState(null)}
      />

    </div>
  );
};
