import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderPlus,
  Image as ImageIcon,
  Search,
  Filter,
  Trash2,
  Edit3,
  Plus,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Layers,
  Sparkles,
  Share2,
  Download,
  Eye,
  Camera,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Maximize2,
  Upload,
  Film,
  DollarSign,
  ShoppingBag,
  Check,
  Printer,
  ShoppingCart,
  MessageSquare,
  Copy,
  Send
} from 'lucide-react';
import { usePrintCart } from '../../../context/PrintCartContext';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useAuthRole, normalizeRole } from '../../../hooks/useAuthRole';
import { useToast } from '../../../context/ToastContext';
import { Album } from '../../../types';
import { SportsGalleryImage } from './SportsGalleryImage';
import { 
  resolvePhotoDocument, 
  isGoogleDriveUrlOrId, 
  resolveGoogleDriveImageUrl,
  extractGoogleDriveFileId,
  resolveDirectGoogleDriveDownloadUrl
} from '../../../utils/storageUrlResolver';
import { 
  uploadDirectImage, 
  uploadGalleryPhotoWithWatermark, 
  isValidImageFile 
} from '../../../services/mediaUploadService';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createWatermarkedImage } from '../../../lib/watermarkGenerator';
import PhotoDownloadButton from '../../PhotoDownloadButton';
import WatermarkOverlay from '../../Common/WatermarkOverlay';
import { UniversalVideoPlayer } from '../../Common/UniversalVideoPlayer';
import { PageContainer } from '../../Layout/PageContainer';
import { AlbumPassPurchaseModal } from '../../checkout/AlbumPassPurchaseModal';
import { downloadPhotoFile, requestSignedPhotoDownloadUrl } from '../../../utils/downloadHelper';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { getPayPalClientId } from '../../../app/providers';

const ProdigiPrintOrderModal = React.lazy(() => import('../../MediaHub/ProdigiPrintOrderModal').then(m => ({ default: m.ProdigiPrintOrderModal })));

const SPORT_OPTIONS = [
  'All Sports',
  '🏈 Football',
  '🏀 Basketball',
  '⚽ Soccer',
  '🏃 Track & Field',
  '📣 Cheer',
  '🏐 Volleyball',
  '⚾ Baseball',
  '🥍 Lacrosse'
];

const CATEGORY_OPTIONS = [
  'All Categories',
  'Tournaments',
  'Game Action',
  'Combine / Laser',
  'Team Portraits',
  'Showcase Highlights',
  'Ceremonies & Awards'
];

interface UploadQueueItem {
  id: string;
  file: File;
  preview: string;
  progress: number;
  uploadedUrl?: string;
  uploadedWatermarkedUrl?: string;
  error?: string;
}

export const MediaGalleryView: React.FC = () => {
  const { user, profile } = useAuth();
  const { role } = useAuthRole();
  const canonicalRole = normalizeRole(role);
  const { showToast } = useToast();

  const userRoleStr = (canonicalRole as string) || (profile?.role as string) || '';
  const isAdmin = ['admin', 'director', 'tournament_director'].includes(userRoleStr) || user?.email === 'kevoiebailey@gmail.com';

  // Live Albums State from Firestore
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Detail View (Selected Album)
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);

  // Active Media Lightbox (within active album)
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [activeMediaUrl, setActiveMediaUrl] = useState<string | null>(null);
  const { addToCart, openCart, totalCount: printCartCount } = usePrintCart();

  // User Purchased Media IDs & URLs Set for instantaneous unlocking
  const [purchasedPhotoIds, setPurchasedPhotoIds] = useState<Set<string>>(new Set());
  const [purchasedUrls, setPurchasedUrls] = useState<Set<string>>(new Set());

  // Full Album Digital Pass state
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [purchasedAlbumIds, setPurchasedAlbumIds] = useState<Set<string>>(new Set());
  const [albumPassTarget, setAlbumPassTarget] = useState<Album | null>(null);

  // PayPal Checkout Modal State (Single Photo & Full Event Pass)
  const [paypalCheckout, setPaypalCheckout] = useState<{
    purchaseType: 'single_photo' | 'full_pass';
    galleryId: string;
    photoId?: string;
    photoTitle?: string;
    price: number;
    itemTitle: string;
  } | null>(null);
  const [isCapturingOrder, setIsCapturingOrder] = useState<boolean>(false);
  const [paypalModalError, setPaypalModalError] = useState<string | null>(null);

  // Helper callbacks to open PayPal checkout modal
  const openFullPassCheckout = () => {
    if (!activeAlbum) return;

    // Admin Free Bypass Guarantee: bypass modal and unlock immediately
    if (isAdmin) {
      setPurchasedAlbumIds((prev) => new Set(prev).add(activeAlbum.id));
      showToast('success', 'Admin Bypass', `Full event access active for ${activeAlbum.title}.`);
      return;
    }

    const bundlePriceNum = typeof activeAlbum.bundlePrice === 'number'
      ? activeAlbum.bundlePrice
      : (typeof activeAlbum.fullAlbumPrice === 'number'
          ? activeAlbum.fullAlbumPrice
          : (typeof activeAlbum.price === 'number' && activeAlbum.price > 20 ? activeAlbum.price : 200.00));

    setPaypalModalError(null);
    setPaypalCheckout({
      purchaseType: 'full_pass',
      galleryId: activeAlbum.id,
      price: bundlePriceNum,
      itemTitle: `Full Event Pass: ${activeAlbum.title}`,
    });
  };

  const openSinglePhotoCheckout = (photoId?: string, photoTitle?: string, price?: number) => {
    if (!activeAlbum) return;

    const targetPhotoId = photoId || `${activeAlbum.id}_0`;
    const targetTitle = photoTitle || `${activeAlbum.title} Photo`;

    // Admin Free Bypass Guarantee: bypass modal and unlock immediately
    if (isAdmin) {
      setPurchasedPhotoIds((prev) => new Set(prev).add(targetPhotoId));
      showToast('success', 'Admin Bypass', '4K High-Res unlocked.');
      return;
    }

    const singlePriceNum = typeof price === 'number'
      ? price
      : (typeof activeAlbum.singlePrice === 'number'
          ? activeAlbum.singlePrice
          : (typeof activeAlbum.price === 'number' && activeAlbum.price <= 20 ? activeAlbum.price : 2.00));

    setPaypalModalError(null);
    setPaypalCheckout({
      purchaseType: 'single_photo',
      galleryId: activeAlbum.id,
      photoId: targetPhotoId,
      photoTitle: targetTitle,
      price: singlePriceNum,
      itemTitle: targetTitle,
    });
  };

  // High-performance subcollection photos: albums/{albumId}/photos
  const [subcollectionPhotos, setSubcollectionPhotos] = useState<any[]>([]);
  const [loadingSubcollectionPhotos, setLoadingSubcollectionPhotos] = useState<boolean>(false);
  const [displayLimit, setDisplayLimit] = useState<number>(36);

  // Prodigi Physical Print Order Target
  const [prodigiPrintTarget, setProdigiPrintTarget] = useState<{
    photo?: {
      id?: string;
      previewUrl?: string;
      url?: string;
      highResUrl?: string;
      title?: string;
      driveFileId?: string;
      [key: string]: any;
    };
    url: string;
    previewUrl?: string;
    highResUrl?: string;
    title: string;
    subtitle?: string;
    sku?: string;
    creatorId?: string;
    creatorPayPalEmail?: string;
    creatorName?: string;
  } | null>(null);

  // Client-side cache for dynamically watermarked previews when backend storage thumbnail isn't yet cached
  const [watermarkCache, setWatermarkCache] = useState<Record<string, string>>({});

  // Prevent background scroll and ensure window stays stable while lightbox is active
  useEffect(() => {
    if (activePhotoIndex !== null || activeMediaUrl !== null) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activePhotoIndex, activeMediaUrl]);

  // Create Album Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newSport, setNewSport] = useState('Basketball');
  const [newCategory, setNewCategory] = useState('Game Action');
  const [newPrice, setNewPrice] = useState('2.00');
  
  // Direct File Upload State for Create Modal
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [createPhotoQueue, setCreatePhotoQueue] = useState<UploadQueueItem[]>([]);
  const [createOverallProgress, setCreateOverallProgress] = useState(0);

  // Edit Album Modal State
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEventName, setEditEventName] = useState('');
  const [editSport, setEditSport] = useState('Basketball');
  const [editCategory, setEditCategory] = useState('Game Action');
  const [editPrice, setEditPrice] = useState('2.00');
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editExistingMediaUrls, setEditExistingMediaUrls] = useState<string[]>([]);
  const [editExistingWatermarkedUrls, setEditExistingWatermarkedUrls] = useState<string[]>([]);
  const [editPhotoQueue, setEditPhotoQueue] = useState<UploadQueueItem[]>([]);

  // Delete Confirmation State
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Add Media inside Active Album Modal
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [additionalPhotoQueue, setAdditionalPhotoQueue] = useState<UploadQueueItem[]>([]);
  const [isAddingMedia, setIsAddingMedia] = useState(false);

  // Share with Parents Modal State
  const [showShareParentsModal, setShowShareParentsModal] = useState(false);
  const [shareAlbumTarget, setShareAlbumTarget] = useState<Album | null>(null);
  const [isCopiedShareLink, setIsCopiedShareLink] = useState(false);
  const [isCopiedInviteText, setIsCopiedInviteText] = useState(false);
  const [isUpdatingParentPricing, setIsUpdatingParentPricing] = useState(false);

  // File input refs
  const createCoverInputRef = useRef<HTMLInputElement>(null);
  const createPhotosInputRef = useRef<HTMLInputElement>(null);
  const editCoverInputRef = useRef<HTMLInputElement>(null);
  const editPhotosInputRef = useRef<HTMLInputElement>(null);
  const addPhotosInputRef = useRef<HTMLInputElement>(null);

  // 1. Live Firestore listener on user's purchased photos subcollection
  useEffect(() => {
    if (!db || !user?.uid) {
      setPurchasedPhotoIds(new Set());
      setPurchasedUrls(new Set());
      return;
    }

    const purchasedRef = collection(db, 'users', user.uid, 'purchased_photos');
    const unsubscribePhotos = onSnapshot(purchasedRef, (snapshot) => {
      const ids = new Set<string>();
      const urls = new Set<string>();
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() || {};
        ids.add(docSnap.id);
        if (d.photoId) ids.add(String(d.photoId));
        if (d.mediaId) ids.add(String(d.mediaId));
        if (d.storageFilePath) urls.add(d.storageFilePath);
        if (d.storagePath) urls.add(d.storagePath);
        if (d.originalUrl) urls.add(d.originalUrl);
      });
      setPurchasedPhotoIds(ids);
      setPurchasedUrls(urls);
    }, (err) => {
      console.warn('Notice listening to purchased_photos:', err);
    });

    const mediaRef = collection(db, 'users', user.uid, 'purchased_media');
    const unsubscribeMedia = onSnapshot(mediaRef, (snapshot) => {
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() || {};
        setPurchasedPhotoIds((prev) => {
          const next = new Set(prev);
          next.add(docSnap.id);
          if (d.photoId) next.add(String(d.photoId));
          if (d.mediaId) next.add(String(d.mediaId));
          return next;
        });
        if (d.albumId) {
          setPurchasedAlbumIds((prev) => new Set(prev).add(String(d.albumId)));
        }
        if (d.storagePath || d.originalUrl) {
          setPurchasedUrls((prev) => {
            const next = new Set(prev);
            if (d.storagePath) next.add(d.storagePath);
            if (d.originalUrl) next.add(d.originalUrl);
            return next;
          });
        }
      });
    }, (err) => {
      console.warn('Notice listening to purchased_media:', err);
    });

    const albumsPurchasedRef = collection(db, 'users', user.uid, 'purchased_albums');
    const unsubscribePurchasedAlbums = onSnapshot(albumsPurchasedRef, (snapshot) => {
      const ids = new Set<string>();
      snapshot.forEach((docSnap) => {
        ids.add(docSnap.id);
        const d = docSnap.data() || {};
        if (d.albumId) ids.add(String(d.albumId));
      });
      setPurchasedAlbumIds((prev) => new Set([...prev, ...ids]));
    }, (err) => {
      console.warn('Notice listening to purchased_albums:', err);
    });

    return () => {
      unsubscribePhotos();
      unsubscribeMedia();
      unsubscribePurchasedAlbums();
    };
  }, [user?.uid]);

  // Synchronize URL query albumId with activeAlbum state
  const queryAlbumId = searchParams.get('albumId');
  useEffect(() => {
    if (!queryAlbumId) return;

    // 1. Try finding in loaded albums array
    if (albums.length > 0) {
      const match = albums.find((a) => a.id === queryAlbumId);
      if (match && (!activeAlbum || activeAlbum.id !== match.id)) {
        setActiveAlbum(match);
        return;
      }
    }

    // 2. Direct Firestore fetch fallback if album opened directly from link (e.g. parents opening shared link)
    if (db && (!activeAlbum || activeAlbum.id !== queryAlbumId)) {
      getDoc(doc(db, 'albums', queryAlbumId))
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as any;
            setActiveAlbum({
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
            } as Album);
          }
        })
        .catch((err) => {
          console.warn('Direct album link fetch notice:', err);
        });
    }
  }, [queryAlbumId, albums, activeAlbum?.id]);

  // Real-time listener for album subcollection photos: albums/{activeAlbum.id}/photos & Albums/{activeAlbum.id}/Photos
  useEffect(() => {
    if (!db || !activeAlbum?.id) {
      setSubcollectionPhotos([]);
      setDisplayLimit(36);
      return;
    }

    setLoadingSubcollectionPhotos(true);
    setDisplayLimit(36);
    let isMounted = true;

    const lowerRef = collection(db, 'albums', activeAlbum.id, 'photos');
    const upperRef = collection(db, 'Albums', activeAlbum.id, 'Photos');
    const galleryRef = collection(db, 'gallery');

    let lowerDocs: any[] = [];
    let upperDocs: any[] = [];
    let galleryDocs: any[] = [];

    const reconcileAndSet = async () => {
      if (!isMounted) return;
      const combinedMap = new Map<string, any>();

      // 1. Lower subcollection
      lowerDocs.forEach((d) => {
        if (d?.id) combinedMap.set(d.id, d);
      });

      // 2. Upper subcollection
      upperDocs.forEach((d) => {
        if (d?.id && !combinedMap.has(d.id)) combinedMap.set(d.id, d);
      });

      // 3. Match from gallery collection
      const selId = (activeAlbum.id || '').trim().toLowerCase();
      const selTitle = (activeAlbum.title || '').trim().toLowerCase();
      const selEvent = ((activeAlbum as any).eventName || '').trim().toLowerCase();

      galleryDocs.forEach((gp) => {
        const pAlbumId = (gp.albumId || '').trim().toLowerCase();
        const pAlbumTitle = (gp.albumTitle || gp.albumName || '').trim().toLowerCase();
        const pEventName = (gp.eventName || '').trim().toLowerCase();

        const matches =
          (pAlbumId && (pAlbumId === selId || pAlbumId === `temp-${selId}`)) ||
          (pAlbumTitle && pAlbumTitle === selTitle) ||
          (selEvent && pEventName && pEventName === selEvent) ||
          (selTitle && pEventName && pEventName === selTitle);

        if (matches && gp.id && !combinedMap.has(gp.id)) {
          combinedMap.set(gp.id, gp);
        }
      });

      // 4. Also merge embedded photos from activeAlbum if any
      if (Array.isArray(activeAlbum.photos)) {
        activeAlbum.photos.forEach((p: any, idx: number) => {
          if (p) {
            const pid = p.id || `${activeAlbum.id}_embedded_${idx}`;
            if (!combinedMap.has(pid)) {
              combinedMap.set(pid, { ...p, id: pid, albumId: activeAlbum.id });
            }
          }
        });
      }

      // 5. Also merge embedded mediaUrls from activeAlbum if any
      if (Array.isArray(activeAlbum.mediaUrls)) {
        activeAlbum.mediaUrls.forEach((url: string, idx: number) => {
          if (url && typeof url === 'string') {
            const alreadyExists = Array.from(combinedMap.values()).some(
              (existing) =>
                existing.originalUrl === url ||
                existing.previewUrl === url ||
                existing.cleanMasterUrl === url ||
                existing.thumbUrl === url
            );
            if (!alreadyExists) {
              const pid = `${activeAlbum.id}_media_${idx}`;
              const wmUrl = Array.isArray(activeAlbum.watermarkedMediaUrls) ? activeAlbum.watermarkedMediaUrls[idx] : undefined;
              combinedMap.set(pid, {
                id: pid,
                albumId: activeAlbum.id,
                originalUrl: url,
                cleanMasterUrl: url,
                previewUrl: wmUrl || url,
                thumbUrl: wmUrl || url,
                watermarkedUrl: wmUrl || url,
                title: `${activeAlbum.title || 'Photo'} #${idx + 1}`
              });
            }
          }
        });
      }

      // 6. If map is empty and coverPhotoUrl exists, include cover photo
      if (combinedMap.size === 0) {
        const cover = activeAlbum.coverPhotoUrl || activeAlbum.coverUrl || activeAlbum.imageUrl;
        if (cover) {
          const pid = `${activeAlbum.id}_cover`;
          combinedMap.set(pid, {
            id: pid,
            albumId: activeAlbum.id,
            originalUrl: cover,
            cleanMasterUrl: cover,
            previewUrl: activeAlbum.watermarkedCoverUrl || cover,
            thumbUrl: activeAlbum.watermarkedCoverUrl || cover,
            watermarkedUrl: activeAlbum.watermarkedCoverUrl || cover,
            title: `${activeAlbum.title || 'Photo'} Cover`
          });
        }
      }

      const rawItems = Array.from(combinedMap.values());
      rawItems.sort((a, b) => {
        const timeA = a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : new Date(a.createdAt || a.uploadTimestamp || 0).getTime();
        const timeB = b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : new Date(b.createdAt || b.uploadTimestamp || 0).getTime();
        return timeB - timeA;
      });

      try {
        const resolved = await Promise.all(
          rawItems.map(async (item) => {
            try {
              return await resolvePhotoDocument(item);
            } catch {
              return item;
            }
          })
        );
        if (isMounted) {
          setSubcollectionPhotos(resolved);
          setLoadingSubcollectionPhotos(false);
        }
      } catch {
        if (isMounted) {
          setSubcollectionPhotos(rawItems);
          setLoadingSubcollectionPhotos(false);
        }
      }
    };

    const unsubLower = onSnapshot(
      lowerRef,
      (snap) => {
        lowerDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        reconcileAndSet();
      },
      () => {
        reconcileAndSet();
      }
    );

    const unsubUpper = onSnapshot(
      upperRef,
      (snap) => {
        upperDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        reconcileAndSet();
      },
      () => {
        reconcileAndSet();
      }
    );

    const unsubGallery = onSnapshot(
      galleryRef,
      (snap) => {
        galleryDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        reconcileAndSet();
      },
      () => {
        reconcileAndSet();
      }
    );

    return () => {
      isMounted = false;
      unsubLower();
      unsubUpper();
      unsubGallery();
    };
  }, [activeAlbum?.id, activeAlbum?.mediaUrls?.length, activeAlbum?.photos?.length]);

  // 2. Live Firestore listener on 'albums' collection (Real User-Created Albums)
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
      async (snapshot) => {
        const fetchedAlbums: Album[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          
          let mediaUrls: string[] = [];
          if (Array.isArray(data.mediaUrls)) {
            mediaUrls = data.mediaUrls.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
          } else if (typeof data.mediaUrls === 'string' && data.mediaUrls.trim()) {
            mediaUrls = data.mediaUrls.split('\n').map((u: string) => u.trim()).filter(Boolean);
          } else if (data.imageUrl) {
            mediaUrls = [data.imageUrl];
          }

          let watermarkedMediaUrls: string[] = [];
          if (Array.isArray(data.watermarkedMediaUrls)) {
            watermarkedMediaUrls = data.watermarkedMediaUrls.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
          }

          const coverPhotoUrl = data.coverPhotoUrl || data.coverUrl || data.imageUrl || mediaUrls[0] || '';
          const watermarkedCoverUrl = data.watermarkedCoverUrl || data.coverWatermarkedUrl || (watermarkedMediaUrls.length > 0 ? watermarkedMediaUrls[0] : '');

          return {
            id: docSnap.id,
            title: data.title || 'Untitled Album',
            description: data.description || '',
            coverPhotoUrl: coverPhotoUrl,
            coverUrl: coverPhotoUrl,
            imageUrl: data.imageUrl || coverPhotoUrl,
            watermarkedCoverUrl: watermarkedCoverUrl,
            mediaUrls: mediaUrls,
            watermarkedMediaUrls: watermarkedMediaUrls,
            photos: Array.isArray(data.photos) ? data.photos : [],
            price: typeof data.singlePrice === 'number' ? data.singlePrice : (typeof data.price === 'number' ? data.price : 2.00),
            singlePrice: typeof data.singlePrice === 'number' ? data.singlePrice : (typeof data.price === 'number' ? data.price : 2.00),
            bundlePrice: typeof data.bundlePrice === 'number' ? data.bundlePrice : (typeof data.fullAlbumPrice === 'number' ? data.fullAlbumPrice : 45.00),
            fullAlbumPrice: typeof data.bundlePrice === 'number' ? data.bundlePrice : (typeof data.fullAlbumPrice === 'number' ? data.fullAlbumPrice : 45.00),
            paypalEmail: data.paypalEmail || data.creatorPayPalEmail || '',
            creatorPayPalEmail: data.paypalEmail || data.creatorPayPalEmail || '',
            creatorId: data.creatorId || data.authorId || data.createdBy || '',
            creatorEmail: data.creatorEmail || '',
            eventDate: data.eventDate || '',
            venueLocation: data.venueLocation || '',
            tags: Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? data.tags.split(',').map((s: string) => s.trim()) : []),
            watermarkText: data.watermarkText || 'JUST1PLAY',
            sport: data.sport || 'Basketball',
            category: data.category || 'Game Action',
            eventName: data.eventName || data.event || '',
            authorId: data.authorId || data.creatorId || data.createdBy || data.userId || '',
            authorName: data.authorName || data.creatorName || data.photographerName || 'Athlete Creator',
            authorRole: data.authorRole || data.creatorRole || 'Athlete',
            authorAvatar: data.authorAvatar || '',
            photoCount: typeof data.photoCount === 'number' ? data.photoCount : (mediaUrls.length || (coverPhotoUrl ? 1 : 0)),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
          };
        });

        let resolvedAlbums = fetchedAlbums;
        try {
          resolvedAlbums = await Promise.all(
            fetchedAlbums.map(async (album) => {
              try {
                return await resolvePhotoDocument(album);
              } catch (assetErr) {
                console.warn(`[MediaGalleryView] Unresolvable asset in album "${album.id}" (${album.title}):`, assetErr);
                // Fallback to placeholder/raw URLs for failing items rather than rejecting the entire snapshot
                return album;
              }
            })
          );
        } catch (resolveErr) {
          console.warn('[MediaGalleryView] Real-time photo documents resolution notice:', resolveErr);
          resolvedAlbums = fetchedAlbums;
        } finally {
          // Ensure setLoading(false) is ALWAYS called, guaranteeing UI never hangs
          setLoading(false);
        }

        setAlbums(resolvedAlbums);

        // Keep active album synchronized if it was updated
        setActiveAlbum((currentActive) => {
          if (!currentActive) return null;
          const updated = resolvedAlbums.find((a) => a.id === currentActive.id);
          return updated || null;
        });
      },
      (error) => {
        console.warn('Real-time albums sync notice:', error?.message || error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered Albums according to sport, category, and search query
  const filteredAlbums = useMemo(() => {
    return albums.filter((alb) => {
      const cleanSport = alb.sport?.toLowerCase() || '';
      const cleanCat = alb.category?.toLowerCase() || '';
      const cleanTitle = alb.title?.toLowerCase() || '';
      const cleanDesc = alb.description?.toLowerCase() || '';
      const cleanEvent = alb.eventName?.toLowerCase() || '';
      const cleanAuthor = alb.authorName?.toLowerCase() || '';

      // Sport filter
      if (selectedSport !== 'All Sports') {
        const normalizedSport = selectedSport.replace(/^[^\w\s&]+/, '').trim().toLowerCase();
        if (!cleanSport.includes(normalizedSport)) return false;
      }

      // Category filter
      if (selectedCategory !== 'All Categories') {
        const normalizedCat = selectedCategory.toLowerCase();
        if (!cleanCat.includes(normalizedCat)) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          cleanTitle.includes(q) ||
          cleanDesc.includes(q) ||
          cleanEvent.includes(q) ||
          cleanAuthor.includes(q) ||
          cleanSport.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [albums, selectedSport, selectedCategory, searchQuery]);

  // Helper to determine if current user owns the album or is an Admin
  const canModifyAlbum = (alb: Album) => {
    if (!user) return false;
    if (isAdmin) return true;
    return (
      alb.authorId === user.uid ||
      alb.creatorId === user.uid ||
      alb.photographerId === user.uid ||
      (alb.createdBy && alb.createdBy === user.uid)
    );
  };

  // Helper to determine if a specific photo is purchased / unlocked for the current user
  const isMediaUnlocked = (alb: Album | null, photoIdx: number, originalUrl?: string, photoId?: string): boolean => {
    if (!alb) return false;
    // Admins and tournament directors always have full unlocked master access
    if (isAdmin) return true;
    // The creator/photographer of the album always has unlocked master access to their assets
    if (user && (
      alb.authorId === user.uid ||
      alb.creatorId === user.uid ||
      alb.photographerId === user.uid ||
      (alb.createdBy && alb.createdBy === user.uid) ||
      (profile && (alb.authorName === profile.displayName || alb.creatorEmail === profile.email))
    )) return true;

    // Full Event / Album Pass unlock
    if (purchasedAlbumIds.has(alb.id)) return true;

    // Free albums / watermark off
    if (alb.isFree || (typeof alb.singlePrice === 'number' && alb.singlePrice === 0) || (typeof alb.price === 'number' && alb.price === 0)) return true;

    if (!user) return false;

    // Check if purchased by photoId or index key
    const targetId = photoId || `${alb.id}_${photoIdx}`;
    if (purchasedPhotoIds.has(targetId) || (photoId && purchasedPhotoIds.has(photoId))) return true;
    if (originalUrl && (purchasedUrls.has(originalUrl) || purchasedPhotoIds.has(originalUrl))) return true;

    return false;
  };

  // Helper to get the display URL (low-resolution watermarked thumbnail from /photos/thumbnails/watermarked vs original)
  const getDisplayMediaUrl = (alb: Album, photoIdx: number, originalUrl: string, photoId?: string): string => {
    if (!originalUrl || typeof originalUrl !== 'string') return '';
    const unlocked = isMediaUnlocked(alb, photoIdx, originalUrl, photoId);
    if (unlocked) {
      return originalUrl;
    }

    // 1. Check if album has dedicated watermarked thumbnail uploaded at photos/thumbnails/watermarked
    if (alb.watermarkedMediaUrls && alb.watermarkedMediaUrls[photoIdx]) {
      return alb.watermarkedMediaUrls[photoIdx];
    }
    if (alb.photos && alb.photos[photoIdx]?.watermarkedUrl) {
      return alb.photos[photoIdx].watermarkedUrl!;
    }
    if (alb.photos && alb.photos[photoIdx]?.previewUrl) {
      return alb.photos[photoIdx].previewUrl!;
    }

    // 2. Return client-side cached watermark if generated
    if (watermarkCache[originalUrl]) {
      return watermarkCache[originalUrl];
    }

    return originalUrl;
  };

  // Helper to get album cover photo URL (watermarked thumbnail if unpurchased, clean master if owner/admin)
  const getAlbumCoverUrl = (alb: Album): string => {
    const isOwnerOrAdmin = isAdmin || (user && (
      alb.authorId === user.uid ||
      alb.creatorId === user.uid ||
      alb.photographerId === user.uid ||
      (alb.createdBy && alb.createdBy === user.uid)
    ));
    if (isOwnerOrAdmin) {
      return alb.coverPhotoUrl || alb.coverUrl || alb.imageUrl || (alb.mediaUrls && alb.mediaUrls[0]) || '';
    }

    // If full album pass or first photo is unlocked for the user, show clean original
    if (purchasedAlbumIds.has(alb.id) || isMediaUnlocked(alb, 0, alb.mediaUrls?.[0] || alb.coverPhotoUrl)) {
      return alb.coverPhotoUrl || alb.coverUrl || alb.imageUrl || (alb.mediaUrls && alb.mediaUrls[0]) || '';
    }

    return alb.watermarkedCoverUrl || 
      (alb.watermarkedMediaUrls && alb.watermarkedMediaUrls[0]) || 
      watermarkCache[alb.coverPhotoUrl || ''] || 
      alb.coverPhotoUrl || 
      alb.coverUrl || 
      '';
  };

  // Helper to reconcile all photos belonging to an album from subcollections, embedded arrays, and media URLs
  const getReconciledAlbumPhotos = (alb: Album | null, subPhotos: any[]): any[] => {
    if (!alb) return [];
    const map = new Map<string, any>();

    // 1. Subcollection photos (from albums/{id}/photos)
    if (Array.isArray(subPhotos)) {
      subPhotos.forEach((p) => {
        if (p && p.id) {
          map.set(p.id, p);
        }
      });
    }

    // 2. Embedded photos array (alb.photos)
    if (Array.isArray(alb.photos)) {
      alb.photos.forEach((p: any, i: number) => {
        if (p) {
          const pid = p?.id || `${alb.id}_embedded_${i}`;
          if (!map.has(pid)) {
            map.set(pid, { ...p, id: pid, albumId: alb.id });
          }
        }
      });
    }

    // 3. Media URLs array (alb.mediaUrls)
    if (Array.isArray(alb.mediaUrls)) {
      alb.mediaUrls.forEach((url: string, i: number) => {
        if (url && typeof url === 'string') {
          const alreadyExists = Array.from(map.values()).some(
            (existing) =>
              existing.originalUrl === url ||
              existing.previewUrl === url ||
              existing.cleanMasterUrl === url ||
              existing.thumbUrl === url
          );
          if (!alreadyExists) {
            const pid = `${alb.id}_media_${i}`;
            const wmUrl = Array.isArray(alb.watermarkedMediaUrls) ? alb.watermarkedMediaUrls[i] : undefined;
            map.set(pid, {
              id: pid,
              albumId: alb.id,
              originalUrl: url,
              cleanMasterUrl: url,
              previewUrl: wmUrl || url,
              thumbUrl: wmUrl || url,
              watermarkedUrl: wmUrl || url,
              title: `${alb.title || 'Photo'} #${i + 1}`
            });
          }
        }
      });
    }

    // 4. If no photos found yet, fallback to cover photo
    if (map.size === 0) {
      const cover = alb.coverPhotoUrl || alb.coverUrl || alb.imageUrl;
      if (cover) {
        const pid = `${alb.id}_cover`;
        map.set(pid, {
          id: pid,
          albumId: alb.id,
          originalUrl: cover,
          cleanMasterUrl: cover,
          previewUrl: alb.watermarkedCoverUrl || cover,
          thumbUrl: alb.watermarkedCoverUrl || cover,
          watermarkedUrl: alb.watermarkedCoverUrl || cover,
          title: `${alb.title || 'Photo'} Cover`
        });
      }
    }

    return Array.from(map.values());
  };

  // Trigger Share with Parents modal and auto-copy link
  const handleShareWithParents = async (alb: Album) => {
    setShareAlbumTarget(alb);
    const shareUrl = `${window.location.origin}/gallery?albumId=${alb.id}`;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setIsCopiedShareLink(true);
        setTimeout(() => setIsCopiedShareLink(false), 2500);
      } catch {
        // ignore clipboard error
      }
    }
    setShowShareParentsModal(true);
  };

  // Dynamically generate watermark preview on the client for legacy unwatermarked photos
  useEffect(() => {
    if (isAdmin) return; // Admins don't need client watermarks
    const urlsToWatermark: string[] = [];

    albums.forEach((alb) => {
      const isOwner = user && (alb.authorId === user.uid || alb.createdBy === user.uid);
      if (isOwner) return;

      alb.mediaUrls?.forEach((url, idx) => {
        if (
          !isGoogleDriveUrlOrId(url) &&
          !alb.watermarkedMediaUrls?.[idx] && 
          !watermarkCache[url] && 
          !isMediaUnlocked(alb, idx, url)
        ) {
          urlsToWatermark.push(url);
        }
      });
    });

    if (urlsToWatermark.length === 0) return;

    // Process up to 4 images at a time for performance
    const batch = urlsToWatermark.slice(0, 4);
    batch.forEach(async (url) => {
      try {
        const wm = await createWatermarkedImage(url, 'JUST1PLAY • OFFICIAL MEDIA');
        setWatermarkCache((prev) => ({ ...prev, [url]: wm }));
      } catch {
        // Safe fallback
      }
    });
  }, [albums, isAdmin, user, purchasedPhotoIds, purchasedUrls]);

  // Open Create Modal
  const handleOpenCreate = () => {
    if (!user) {
      showToast('error', 'Authentication Required', 'Please log in to create and publish albums.');
      return;
    }
    setNewTitle('');
    setNewDescription('');
    setNewEventName('');
    setNewSport(selectedSport !== 'All Sports' ? selectedSport.replace(/^[^\w\s&]+/, '').trim() : 'Basketball');
    setNewCategory(selectedCategory !== 'All Categories' ? selectedCategory : 'Game Action');
    setCoverPhotoFile(null);
    setCoverPhotoPreview(null);
    setCreatePhotoQueue([]);
    setCreateOverallProgress(0);
    setShowCreateModal(true);
  };

  // Handle Cover Photo Selection for Create Modal
  const handleCoverPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      showToast('error', 'Invalid Format', 'Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Cover image must be under 10MB.');
      return;
    }

    setCoverPhotoFile(file);
    const preview = URL.createObjectURL(file);
    setCoverPhotoPreview(preview);
  };

  // Handle Multiple Photos Selection for Create Modal
  const handlePhotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: UploadQueueItem[] = [];

    for (const f of files) {
      if (!isValidImageFile(f)) {
        showToast('error', 'Invalid File Ignored', `"${f.name}" is not a valid JPEG/PNG/WebP image.`);
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        showToast('error', 'File Too Large', `"${f.name}" exceeds the 10MB limit.`);
        continue;
      }

      validFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        file: f,
        preview: URL.createObjectURL(f),
        progress: 0
      });
    }

    setCreatePhotoQueue((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveQueuedPhoto = (id: string) => {
    setCreatePhotoQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Create Album & Upload Direct Files with Watermarked Thumbnails
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('error', 'Authentication Required', 'Please sign in to create an album.');
      return;
    }

    if (!newTitle.trim()) {
      showToast('error', 'Title Required', 'Please enter an album title.');
      return;
    }

    setIsCreating(true);
    setCreateOverallProgress(10);

    try {
      // Pre-generate unique Album Doc Ref & ID
      const newAlbumDocRef = doc(collection(db, 'albums'));
      const newAlbumId = newAlbumDocRef.id;

      // 1. Upload Cover Photo to galleries/{newAlbumId}/previews and thumbs
      let uploadedCoverUrl = '';
      let uploadedCoverWatermarkedUrl = '';
      if (coverPhotoFile) {
        const coverResult = await uploadGalleryPhotoWithWatermark(
          coverPhotoFile,
          {
            onProgress: (p) => setCreateOverallProgress(Math.min(30, Math.round(p * 0.3)))
          },
          newAlbumId
        );
        uploadedCoverUrl = coverResult.originalUrl;
        uploadedCoverWatermarkedUrl = coverResult.watermarkedUrl;
      }

      // 2. Upload all queued photos to galleries/{newAlbumId}/previews and thumbs
      const uploadedMediaUrls: string[] = [];
      const uploadedWatermarkedUrls: string[] = [];
      const photosArray: any[] = [];
      const totalPhotos = createPhotoQueue.length;

      for (let i = 0; i < totalPhotos; i++) {
        const item = createPhotoQueue[i];
        const result = await uploadGalleryPhotoWithWatermark(
          item.file,
          {
            onProgress: (p) => {
              const stepFraction = 70 / (totalPhotos || 1);
              const currentStepBase = 30 + i * stepFraction;
              setCreateOverallProgress(Math.round(currentStepBase + (p / 100) * stepFraction));
            }
          },
          newAlbumId
        );
        uploadedMediaUrls.push(result.originalUrl);
        uploadedWatermarkedUrls.push(result.watermarkedUrl);
        photosArray.push({
          id: `${Date.now()}_${i}`,
          albumId: newAlbumId,
          originalUrl: result.originalUrl,
          cleanMasterUrl: result.originalUrl,
          previewUrl: result.watermarkedUrl,
          thumbUrl: result.watermarkedUrl,
          watermarkedUrl: result.watermarkedUrl,
          storagePath: result.storagePath,
          watermarkedStoragePath: result.watermarkedStoragePath,
          price: parseFloat(newPrice) || 2.00,
          title: item.file.name
        });
      }

      const finalCoverUrl = uploadedCoverUrl || uploadedMediaUrls[0] || '';
      const finalCoverWatermarkedUrl = uploadedCoverWatermarkedUrl || uploadedWatermarkedUrls[0] || finalCoverUrl;

      const authorName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Athlete Member';
      const authorRole = profile?.role || canonicalRole || 'Athlete';
      const authorAvatar = profile?.avatarUrl || profile?.photoURL || user.photoURL || '';

      const albumData = {
        title: newTitle.trim(),
        description: newDescription.trim(),
        coverPhotoUrl: finalCoverUrl,
        coverUrl: finalCoverUrl,
        imageUrl: finalCoverUrl,
        watermarkedCoverUrl: finalCoverWatermarkedUrl,
        mediaUrls: uploadedMediaUrls,
        watermarkedMediaUrls: uploadedWatermarkedUrls,
        photos: photosArray,
        price: parseFloat(newPrice) || 2.00,
        singlePrice: parseFloat(newPrice) || 2.00,
        bundlePrice: 45.00,
        sport: newSport,
        category: newCategory,
        eventName: newEventName.trim(),
        authorId: user.uid,
        createdBy: user.uid,
        authorName: authorName,
        authorRole: authorRole,
        authorAvatar: authorAvatar,
        visibilityStatus: 'public',
        photoCount: uploadedMediaUrls.length || (finalCoverUrl ? 1 : 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(newAlbumDocRef, albumData);

      // Write individual photos to subcollection albums/{newAlbumId}/photos for fast subcollection queries
      for (const photo of photosArray) {
        try {
          await setDoc(doc(db, 'albums', newAlbumId, 'photos', photo.id), {
            ...photo,
            authorId: user.uid,
            createdAt: serverTimestamp()
          });
        } catch (subErr) {
          console.warn('Subcollection photo save notice:', subErr);
        }
      }

      showToast('success', 'Album Created', `"${newTitle.trim()}" published with ${uploadedMediaUrls.length} photos!`);
      setShowCreateModal(false);

      // Instantly open the newly created album for the user
      const createdAlbumObj = {
        id: newAlbumId,
        ...albumData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Album;
      setActiveAlbum(createdAlbumObj);
      setSearchParams({ albumId: newAlbumId });
    } catch (err: any) {
      console.error('Error creating album with direct uploads:', err);
      showToast('error', 'Creation Failed', err?.message || 'Failed to upload media to Firebase Storage.');
    } finally {
      setIsCreating(false);
      setCreateOverallProgress(0);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (alb: Album, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canModifyAlbum(alb)) {
      showToast('error', 'Permission Denied', 'You can only edit your own albums.');
      return;
    }
    setEditingAlbum(alb);
    setEditTitle(alb.title || '');
    setEditDescription(alb.description || '');
    setEditEventName(alb.eventName || '');
    setEditSport(alb.sport || 'Basketball');
    setEditCategory(alb.category || 'Game Action');
    setEditPrice(alb.price ? String(alb.price) : '2.00');
    setEditCoverFile(null);
    setEditCoverPreview(alb.coverPhotoUrl || alb.coverUrl || null);
    setEditExistingMediaUrls(alb.mediaUrls || []);
    setEditExistingWatermarkedUrls(alb.watermarkedMediaUrls || []);
    setEditPhotoQueue([]);
  };

  // Update Album
  const handleUpdateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlbum || !user) return;

    if (!canModifyAlbum(editingAlbum)) {
      showToast('error', 'Permission Denied', 'You can only edit your own albums.');
      return;
    }

    if (!editTitle.trim()) {
      showToast('error', 'Title Required', 'Album title cannot be empty.');
      return;
    }

    setIsUpdating(true);

    try {
      let resolvedCover = editCoverPreview || editingAlbum.coverPhotoUrl || '';
      let resolvedCoverWatermarked = editingAlbum.watermarkedCoverUrl || resolvedCover;

      // Upload new cover file if changed
      if (editCoverFile) {
        const coverResult = await uploadGalleryPhotoWithWatermark(editCoverFile, undefined, editingAlbum.id);
        resolvedCover = coverResult.originalUrl;
        resolvedCoverWatermarked = coverResult.watermarkedUrl;
      }

      // Upload any new photos in queue with watermarks
      const newlyUploadedUrls: string[] = [];
      const newlyUploadedWatermarkedUrls: string[] = [];
      for (const item of editPhotoQueue) {
        const res = await uploadGalleryPhotoWithWatermark(item.file, undefined, editingAlbum.id);
        newlyUploadedUrls.push(res.originalUrl);
        newlyUploadedWatermarkedUrls.push(res.watermarkedUrl);
      }

      const mergedMediaUrls = [...editExistingMediaUrls, ...newlyUploadedUrls];
      const mergedWatermarkedUrls = [...editExistingWatermarkedUrls, ...newlyUploadedWatermarkedUrls];
      if (!resolvedCover && mergedMediaUrls.length > 0) {
        resolvedCover = mergedMediaUrls[0];
        resolvedCoverWatermarked = mergedWatermarkedUrls[0] || resolvedCover;
      }

      const albumRef = doc(db, 'albums', editingAlbum.id);
      await updateDoc(albumRef, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        coverPhotoUrl: resolvedCover,
        coverUrl: resolvedCover,
        imageUrl: resolvedCover,
        watermarkedCoverUrl: resolvedCoverWatermarked,
        mediaUrls: mergedMediaUrls,
        watermarkedMediaUrls: mergedWatermarkedUrls,
        price: parseFloat(editPrice) || 2.00,
        sport: editSport,
        category: editCategory,
        eventName: editEventName.trim(),
        photoCount: mergedMediaUrls.length || (resolvedCover ? 1 : 0),
        updatedAt: serverTimestamp()
      });

      showToast('success', 'Album Updated', `"${editTitle.trim()}" changes saved.`);
      setEditingAlbum(null);
    } catch (err: any) {
      console.error('Error updating album:', err);
      showToast('error', 'Update Failed', err?.message || 'Failed to update album in Firestore.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Trigger Delete Confirmation Modal
  const handleRequestDelete = (alb: Album, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canModifyAlbum(alb)) {
      showToast('error', 'Permission Denied', 'You can only delete your own albums.');
      return;
    }
    setAlbumToDelete(alb);
  };

  // Confirm Delete Album (deleteDoc)
  const handleConfirmDelete = async () => {
    if (!albumToDelete || !user) return;

    if (!canModifyAlbum(albumToDelete)) {
      showToast('error', 'Permission Denied', 'You can only delete your own albums.');
      return;
    }

    setIsDeleting(true);

    try {
      await deleteDoc(doc(db, 'albums', albumToDelete.id));

      showToast('success', 'Album Deleted', `"${albumToDelete.title}" was permanently removed.`);
      if (activeAlbum?.id === albumToDelete.id) {
        setActiveAlbum(null);
      }
      setAlbumToDelete(null);
    } catch (err: any) {
      console.error('Error deleting album:', err);
      showToast('error', 'Deletion Failed', err?.message || 'Could not delete album from Firestore.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Append Media to Current Active Album via Direct Upload with Watermarks
  const handleAddPhotosToActiveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlbum || !user) return;

    if (!canModifyAlbum(activeAlbum)) {
      showToast('error', 'Permission Denied', 'Only the album creator can add media.');
      return;
    }

    if (additionalPhotoQueue.length === 0) {
      showToast('error', 'No Photos Selected', 'Please select at least one photo to upload.');
      return;
    }

    setIsAddingMedia(true);

    try {
      const uploadedUrls: string[] = [];
      const uploadedWatermarkedUrls: string[] = [];
      for (let i = 0; i < additionalPhotoQueue.length; i++) {
        const item = additionalPhotoQueue[i];
        const res = await uploadGalleryPhotoWithWatermark(item.file, undefined, activeAlbum.id);
        uploadedUrls.push(res.originalUrl);
        uploadedWatermarkedUrls.push(res.watermarkedUrl);

        // Also save to subcollection albums/{activeAlbum.id}/photos
        const photoId = `${Date.now()}_add_${i}`;
        try {
          await setDoc(doc(db, 'albums', activeAlbum.id, 'photos', photoId), {
            id: photoId,
            albumId: activeAlbum.id,
            originalUrl: res.originalUrl,
            cleanMasterUrl: res.originalUrl,
            previewUrl: res.watermarkedUrl,
            thumbUrl: res.watermarkedUrl,
            watermarkedUrl: res.watermarkedUrl,
            storagePath: res.storagePath,
            watermarkedStoragePath: res.watermarkedStoragePath,
            price: typeof activeAlbum.singlePrice === 'number' ? activeAlbum.singlePrice : 2.00,
            title: item.file.name,
            authorId: user.uid,
            createdAt: serverTimestamp()
          });
        } catch (subErr) {
          console.warn('Subcollection photo add notice:', subErr);
        }
      }

      const existingMedia = activeAlbum.mediaUrls || [];
      const existingWatermarked = activeAlbum.watermarkedMediaUrls || [];
      const mergedMedia = [...existingMedia, ...uploadedUrls];
      const mergedWatermarked = [...existingWatermarked, ...uploadedWatermarkedUrls];
      const resolvedCover = activeAlbum.coverPhotoUrl || mergedMedia[0] || '';
      const resolvedCoverWatermarked = activeAlbum.watermarkedCoverUrl || mergedWatermarked[0] || resolvedCover;

      const albumRef = doc(db, 'albums', activeAlbum.id);
      await updateDoc(albumRef, {
        mediaUrls: mergedMedia,
        watermarkedMediaUrls: mergedWatermarked,
        coverPhotoUrl: resolvedCover,
        coverUrl: resolvedCover,
        imageUrl: resolvedCover,
        watermarkedCoverUrl: resolvedCoverWatermarked,
        photoCount: mergedMedia.length,
        updatedAt: serverTimestamp()
      });

      // Update activeAlbum state so the UI reflects the new photos immediately
      setActiveAlbum((prev) => prev ? {
        ...prev,
        mediaUrls: mergedMedia,
        watermarkedMediaUrls: mergedWatermarked,
        coverPhotoUrl: resolvedCover,
        photoCount: mergedMedia.length
      } : null);

      showToast('success', 'Media Uploaded', `Added ${uploadedUrls.length} new photo(s) to album!`);
      setShowAddMediaModal(false);
      setAdditionalPhotoQueue([]);
    } catch (err: any) {
      console.error('Error adding media:', err);
      showToast('error', 'Upload Error', err?.message || 'Failed to upload additional photos.');
    } finally {
      setIsAddingMedia(false);
    }
  };

  return (
    <PageContainer maxWidth="max-w-7xl">
      
      {/* 1. Top Hero & Filter Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#24324F]/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white font-mono">
              Tournament Media Gallery
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#00F0D0]/15 border border-[#00F0D0]/40 text-[#00F0D0] text-[10px] font-bold uppercase tracking-wider font-mono">
              Direct Storage Cloud
            </span>
          </div>
          <p className="text-xs text-slate-400">
            High-resolution photo albums & event highlights uploaded directly to Firebase Storage
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F0D0] to-[#00B8D4] text-[#08090C] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,208,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer font-mono shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Direct Photo Upload</span>
          </button>
        </div>
      </div>

      {/* 2. Detailed Album View OR Grid View */}
      {activeAlbum ? (
        /* Detailed Album View */
        <div className="w-full space-y-6 animate-fadeIn">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between border-b border-[#24324F] pb-4 flex-wrap gap-2">
            <button
              onClick={() => {
                setActiveAlbum(null);
                setSearchParams({});
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141B2D] hover:bg-[#24324F] border border-[#24324F] text-slate-300 hover:text-white transition-all text-xs font-mono cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-[#00B8D4]" />
              <span>Back to Albums</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Share with Parents Button */}
              <button
                type="button"
                onClick={() => handleShareWithParents(activeAlbum)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00F0D0] to-[#00B8D4] hover:brightness-110 text-[#090D16] text-xs font-mono font-black flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,240,208,0.25)] cursor-pointer"
                title="Send Album Link to Parents"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share with Parents</span>
              </button>

              {/* Creator Ingest Link */}
              {canModifyAlbum(activeAlbum) && (
                <Link
                  to={`/creator/upload?albumId=${activeAlbum.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-[#00F0D0]/15 hover:bg-[#00F0D0]/25 border border-[#00F0D0]/40 text-[#00F0D0] text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Batch Ingest 500+ Photos</span>
                </Link>
              )}

              {canModifyAlbum(activeAlbum) && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowAddMediaModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#00B8D4]/10 hover:bg-[#00B8D4]/20 border border-[#00B8D4]/30 text-[#00B8D4] text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Upload</span>
                  </button>
                  <button
                    onClick={(e) => handleOpenEdit(activeAlbum, e)}
                    className="p-1.5 rounded-xl bg-[#141B2D] hover:bg-[#24324F] border border-[#24324F] text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Edit Album"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleRequestDelete(activeAlbum, e)}
                    className="p-1.5 rounded-xl bg-[#141B2D] hover:bg-rose-950/40 border border-[#24324F] text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Album"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Album Title Header Banner */}
          {(() => {
            const isCreatorOfAlbum = Boolean(user && (
              activeAlbum.authorId === user.uid ||
              activeAlbum.creatorId === user.uid ||
              activeAlbum.photographerId === user.uid ||
              activeAlbum.createdBy === user.uid
            ));

            const hasAlbumPass = Boolean(
              purchasedAlbumIds.has(activeAlbum.id) ||
              isCreatorOfAlbum ||
              isAdmin
            );

            const singlePriceNum = typeof activeAlbum.singlePrice === 'number'
              ? activeAlbum.singlePrice
              : (typeof activeAlbum.price === 'number' ? activeAlbum.price : 10.00);

            const bundlePriceNum = typeof activeAlbum.bundlePrice === 'number'
              ? activeAlbum.bundlePrice
              : (typeof activeAlbum.fullAlbumPrice === 'number' ? activeAlbum.fullAlbumPrice : 45.00);

            const totalDisplayCount = subcollectionPhotos.length > 0
              ? subcollectionPhotos.length
              : (activeAlbum.photos?.length || activeAlbum.mediaUrls?.length || activeAlbum.photoCount || 0);

            return (
              <div className="bg-[#141B2D] border border-[#24324F] rounded-2xl p-6 relative overflow-hidden shadow-xl space-y-5">
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#00B8D4]/20 border border-[#00B8D4]/40 text-[#00B8D4] text-xs font-black uppercase font-mono">
                    {activeAlbum.sport || 'Sports'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold font-mono">
                    {activeAlbum.category || 'Game Action'}
                  </span>
                  {activeAlbum.eventName && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {activeAlbum.eventName}
                    </span>
                  )}
                  {activeAlbum.eventDate && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      {activeAlbum.eventDate}
                    </span>
                  )}
                  {activeAlbum.venueLocation && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono">
                      📍 {activeAlbum.venueLocation}
                    </span>
                  )}
                  {Array.isArray(activeAlbum.tags) && activeAlbum.tags.map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-[#00B8D4]/10 text-[#00B8D4] text-[11px] font-mono">
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Title & Description */}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white font-mono uppercase tracking-wide">
                    {activeAlbum.title}
                  </h2>
                  {activeAlbum.description && (
                    <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                      {activeAlbum.description}
                    </p>
                  )}
                </div>

                {/* Monetization & Access Action Bar */}
                <div className="pt-4 border-t border-[#24324F] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-xs font-mono text-slate-400 flex-wrap">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#00B8D4]" />
                      <span>Creator: <strong className="text-white">{activeAlbum.authorName || 'Sports Photographer'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#00B8D4]">
                      <Camera className="w-4 h-4" />
                      <span className="font-bold">{totalDisplayCount} Photos</span>
                    </div>
                  </div>

                  {/* Album Pass Access Action Buttons */}
                  <div className="shrink-0 flex items-center gap-2.5 w-full md:w-auto flex-wrap">
                    {hasAlbumPass ? (
                      <span className="px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-mono text-xs font-bold flex items-center gap-2 shadow-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>FULL ALBUM PASS ACTIVE • ALL 4K UNLOCKED</span>
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          id="action-bar-single-photo-btn"
                          onClick={() => openSinglePhotoCheckout()}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-[#00B8D4] text-white font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                        >
                          <Camera className="w-4 h-4 text-[#00B8D4]" />
                          <span>Single Photo: ${singlePriceNum.toFixed(2)}</span>
                        </button>
                        <button
                          type="button"
                          id="action-bar-full-pass-btn"
                          onClick={() => openFullPassCheckout()}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Full Event Pass: ${bundlePriceNum.toFixed(2)}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Media Stream Grid */}
          {(() => {
            const isCreatorOfAlbum = canModifyAlbum(activeAlbum) || Boolean(user && (
              activeAlbum.authorId === user.uid ||
              activeAlbum.creatorId === user.uid ||
              activeAlbum.photographerId === user.uid ||
              activeAlbum.createdBy === user.uid
            ));

            const hasAlbumPass = Boolean(
              purchasedAlbumIds.has(activeAlbum.id) ||
              isCreatorOfAlbum ||
              isAdmin
            );

            const singlePriceNum = typeof activeAlbum.singlePrice === 'number'
              ? activeAlbum.singlePrice
              : (typeof activeAlbum.price === 'number' && activeAlbum.price <= 20 ? activeAlbum.price : 2.00);

            const bundlePriceNum = typeof activeAlbum.bundlePrice === 'number'
              ? activeAlbum.bundlePrice
              : (typeof activeAlbum.fullAlbumPrice === 'number'
                  ? activeAlbum.fullAlbumPrice
                  : (typeof activeAlbum.price === 'number' && activeAlbum.price > 20 ? activeAlbum.price : 200.00));

            // Reconcile photos from subcollections, embedded activeAlbum.photos, and activeAlbum.mediaUrls
            const photoItems: any[] = getReconciledAlbumPhotos(activeAlbum, subcollectionPhotos);

            if (photoItems.length === 0) {
              return (
                <div className="bg-[#141B2D]/60 border border-[#24324F] rounded-2xl p-12 text-center space-y-3">
                  <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                  <h3 className="text-base font-bold text-white font-mono">No Photos In This Album</h3>
                  <p className="text-xs text-slate-400">Add high-resolution game photos to populate this album.</p>
                  {canModifyAlbum(activeAlbum) && (
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <Link
                        to={`/creator/upload?albumId=${activeAlbum.id}`}
                        className="px-4 py-2 rounded-xl bg-[#00F0D0] text-black text-xs font-mono font-black uppercase hover:brightness-110 cursor-pointer shadow-md"
                      >
                        ⚡ High-Speed Batch Ingest (500+ Photos)
                      </Link>
                      <button
                        onClick={() => setShowAddMediaModal(true)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-mono font-bold uppercase hover:bg-slate-700 cursor-pointer"
                      >
                        Quick Upload
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            const displayedPhotoItems = photoItems.slice(0, displayLimit);

            return (
              <div className="space-y-4">
                {/* Full Event Pass Banner & Quick Access */}
                {!isAdmin && !hasAlbumPass && (
                  <div
                    id="full-event-pass-banner"
                    onClick={() => openFullPassCheckout()}
                    className="group relative p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-[#141B2D] to-teal-950/70 border border-emerald-500/40 hover:border-emerald-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono shadow-xl transition-all cursor-pointer overflow-hidden select-none"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                        <Sparkles className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                            VIP Event Access
                          </span>
                          <h4 className="text-white font-black text-sm sm:text-base uppercase tracking-wide">
                            Full Event Pass: ${bundlePriceNum.toFixed(2)}
                          </h4>
                        </div>
                        <p className="text-slate-300 text-xs mt-1 leading-relaxed max-w-2xl">
                          Watermarked proof gallery. Purchase single photos for ${singlePriceNum.toFixed(2)} or unlock every uncompressed 4K master photo in this event with clean downloads.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end flex-wrap">
                      <button
                        type="button"
                        id="banner-single-photo-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSinglePhotoCheckout();
                        }}
                        className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-[#00B8D4] text-white font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#00B8D4]" />
                        <span>Single Photo: ${singlePriceNum.toFixed(2)}</span>
                      </button>
                      <button
                        type="button"
                        id="banner-full-pass-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openFullPassCheckout();
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Full Event Pass: ${bundlePriceNum.toFixed(2)}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayedPhotoItems.map((item: any, idx: number) => {
                    const itemIsString = typeof item === 'string';
                    const photo = itemIsString
                      ? { id: `${activeAlbum.id}_${idx}`, thumbnailUrl: item, watermarkedUrl: item, url: item }
                      : item;
                    const photoDocId = photo.id || photo.photoId || `${activeAlbum.id}_${idx}`;
                    
                    // 1. Extract photo.thumbnailUrl (or photo.watermarkedUrl) unique to each item, NOT photos[0] or cover
                    const itemThumbnailUrl =
                      photo.thumbnailUrl ||
                      photo.watermarkedUrl ||
                      photo.thumbUrl ||
                      photo.previewUrl ||
                      photo.imageUrl ||
                      photo.originalUrl ||
                      photo.url ||
                      '';

                    const itemOriginalUrl =
                      photo.cleanMasterUrl ||
                      photo.originalUrl ||
                      photo.imageUrl ||
                      photo.url ||
                      photo.highResDownloadUrl ||
                      photo.previewUrl ||
                      '';

                    // 2. Dynamic badge: "UNLOCKED 4K" only if actually purchased or hasFullAlbumPass, otherwise "PREVIEW"
                    const hasFullAlbumPass = Boolean(
                      hasAlbumPass ||
                      purchasedAlbumIds.has(activeAlbum.id)
                    );

                    const isPhotoPurchased = Boolean(
                      purchasedPhotoIds.has(photoDocId) ||
                      (!itemIsString && item.id && purchasedPhotoIds.has(item.id)) ||
                      (!itemIsString && item.photoId && purchasedPhotoIds.has(item.photoId)) ||
                      (itemOriginalUrl && (purchasedUrls.has(itemOriginalUrl) || purchasedPhotoIds.has(itemOriginalUrl)))
                    );

                    const isUnlocked4K = Boolean(isPhotoPurchased || hasFullAlbumPass);

                    // Display source unique to this photo item
                    const rawDisplaySrc = isUnlocked4K
                      ? (itemOriginalUrl || itemThumbnailUrl)
                      : (itemThumbnailUrl || itemOriginalUrl);

                    const displayUrl = isGoogleDriveUrlOrId(rawDisplaySrc)
                      ? resolveGoogleDriveImageUrl(rawDisplaySrc, isUnlocked4K ? 'full' : 'preview')
                      : rawDisplaySrc;

                    const rawFallbackSrc = itemThumbnailUrl || itemOriginalUrl;
                    const fallbackUrl = isGoogleDriveUrlOrId(rawFallbackSrc)
                      ? resolveGoogleDriveImageUrl(rawFallbackSrc, 'thumb')
                      : rawFallbackSrc;

                    const photoTitle = photo.title || photo.filename || photo.caption || `${activeAlbum.title} #${idx + 1}`;
                    const photoItemPrice = typeof photo.price === 'number' ? photo.price : singlePriceNum;
                    const cleanMasterDownloadTarget = photo.cleanMasterUrl || itemOriginalUrl;

                    return (
                      <div
                        key={photoDocId}
                        id={`gallery-photo-${photoDocId}`}
                        onClick={() => {
                          setActivePhotoIndex(idx);
                          setActiveMediaUrl(null);
                        }}
                        style={{ aspectRatio: '4 / 3' }}
                        className="group relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-[#24324F] hover:border-[#00B8D4] transition-all cursor-pointer shadow-lg select-none"
                      >
                        {/* 3 & 4. Image element with loading="lazy", decoding="async", and fixed aspect ratio container */}
                        <img
                          src={displayUrl || fallbackUrl}
                          alt={photoTitle}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            if (fallbackUrl && e.currentTarget.src !== fallbackUrl) {
                              e.currentTarget.src = fallbackUrl;
                            }
                          }}
                        />

                        {/* Top Access Badge: "UNLOCKED 4K" if purchased or hasFullAlbumPass, else "PREVIEW" */}
                        <div className="absolute top-2 left-2 z-10 pointer-events-none">
                          {isUnlocked4K ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1 backdrop-blur-sm shadow">
                              <Unlock className="w-3 h-3 text-emerald-400" />
                              <span>UNLOCKED 4K</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-black/85 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1 backdrop-blur-sm shadow">
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>PREVIEW</span>
                            </span>
                          )}
                        </div>

                        {/* Bottom Info Bar on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5 sm:p-3 justify-between pointer-events-none">
                          <div className="space-y-0.5 truncate max-w-[120px] sm:max-w-[140px]">
                            <span className="text-[11px] font-mono font-bold text-white truncate block">
                              {photoTitle}
                            </span>
                            <span className="text-[9px] font-mono text-slate-300 block">
                              {isUnlocked4K ? 'Clean 4K Master' : `$${photoItemPrice.toFixed(2)} USD`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 pointer-events-auto">
                            {isUnlocked4K ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadPhotoFile(cleanMasterDownloadTarget || itemOriginalUrl, `${activeAlbum.title}_photo_${idx + 1}_4K.jpg`);
                                }}
                                title="Download Clean 4K Master"
                                className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-[10px] font-black uppercase flex items-center gap-1 transition shadow cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download 4K</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSinglePhotoCheckout(photoDocId, photoTitle, photoItemPrice);
                                }}
                                title="Buy Single Photo"
                                className="px-2 py-1 rounded-lg bg-[#00B8D4] hover:bg-[#00F0D0] text-slate-950 font-mono text-[10px] font-black uppercase flex items-center gap-1 transition shadow cursor-pointer"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Buy ${photoItemPrice.toFixed(2)}</span>
                              </button>
                            )}
                            <div className="p-1 rounded-lg bg-black/60 text-[#00B8D4]">
                              <Maximize2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination / Load More Bar when photo count exceeds displayLimit */}
                {photoItems.length > displayLimit && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#141B2D]/90 border border-[#24324F] mt-4 shadow-lg">
                    <span className="text-xs font-mono text-slate-300">
                      Showing <strong className="text-white">{displayedPhotoItems.length}</strong> of <strong className="text-[#00B8D4]">{photoItems.length.toLocaleString()}</strong> photos
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDisplayLimit((prev) => Math.min(prev + 36, photoItems.length))}
                        className="px-4 py-2 rounded-lg bg-[#00B8D4] hover:bg-[#00F0D0] text-[#08090C] text-xs font-mono font-bold uppercase transition-all shadow-md cursor-pointer"
                      >
                        Load Next 36 Photos
                      </button>
                      {photoItems.length - displayLimit > 36 && (
                        <button
                          type="button"
                          onClick={() => setDisplayLimit(photoItems.length)}
                          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold uppercase border border-slate-700 transition-all cursor-pointer"
                        >
                          Show All ({photoItems.length.toLocaleString()})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        /* Albums Overview Grid */
        <div className="w-full space-y-6">
          {/* Search, Sport Pills & Category Filter Controls */}
          <div className="space-y-3 mb-6">
            {/* Quick Sport Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {SPORT_OPTIONS.map((sp) => {
                const isSelected = selectedSport === sp;
                return (
                  <button
                    key={sp}
                    onClick={() => setSelectedSport(sp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00F0D0] text-[#08090C] shadow-[0_0_15px_rgba(0,240,208,0.35)]'
                        : 'bg-[#141B2D] border border-[#24324F] text-slate-300 hover:text-white hover:border-[#00F0D0]/40'
                    }`}
                  >
                    {sp}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#12151C] border border-white/[0.08] p-3.5 sm:p-4 rounded-2xl shadow-lg">
              {/* Search Input */}
              <div className="md:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="gallery-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search albums by tournament, event, sport, title, or creator..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-[#24324F] text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-[#00F0D0]"
                />
              </div>

              {/* Category Select */}
              <div className="md:col-span-4">
                <select
                  id="gallery-category-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-[#24324F] text-xs font-mono text-slate-200 focus:outline-none focus:border-[#00F0D0]"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Creator Ingest Callout Banner */}
          <div className="bg-gradient-to-r from-[#141B2D] via-[#1A233A] to-[#141B2D] border border-[#24324F] hover:border-[#00F0D0]/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#00F0D0]/20 text-[#00F0D0] text-[10px] font-mono font-bold uppercase tracking-wider">
                  Self-Serve Media Platform
                </span>
                <h3 className="text-sm font-bold font-mono text-white">Creator Media Portal & High-Speed Batch Ingest</h3>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl">
                Sports photographers & videographers: Create branded event albums, set custom single/full-pass download pricing, and batch-upload 500+ photos in minutes.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <Link
                to="/creator/portal"
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#00B8D4] hover:bg-[#00F0D0] text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Creator Portal</span>
              </Link>
              <Link
                to="/creator/upload"
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-[#00F0D0]" />
                <span>Batch Ingest</span>
              </Link>
            </div>
          </div>

          {/* Albums Status Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Showing {filteredAlbums.length} Live Firestore Album{filteredAlbums.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Grid of Albums */}
          {loading ? (
            <div className="py-24 text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#00B8D4] mx-auto" />
              <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                Syncing real-time Firestore albums...
              </p>
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="bg-[#141B2D]/80 border border-[#24324F] rounded-2xl p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#00B8D4]/10 border border-[#00B8D4]/20 flex items-center justify-center mx-auto text-[#00B8D4]">
                <Camera className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-white font-mono">No Albums Found</h3>
                <p className="text-xs text-slate-400">
                  {albums.length === 0
                    ? 'No user-created albums exist in the Firestore database yet. Direct upload a photo set to create the first album!'
                    : 'No albums match your search query or filter selection.'}
                </p>
              </div>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] text-xs font-black font-mono uppercase shadow-[0_0_15px_rgba(0,184,212,0.3)] hover:brightness-110 cursor-pointer"
              >
                + Create New Album
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAlbums.map((album) => {
                const count = album.mediaUrls?.length || (album.coverPhotoUrl ? 1 : 0);
                const isOwner = canModifyAlbum(album);
                const displayCover = getAlbumCoverUrl(album);
                const isFirstUnlocked = isMediaUnlocked(album, 0, album.coverPhotoUrl || album.mediaUrls?.[0]);

                return (
                  <div
                    key={album.id}
                    id={`album-card-${album.id}`}
                    onClick={() => {
                      setActiveAlbum(album);
                      setSearchParams({ albumId: album.id });
                    }}
                    className="bg-[#141B2D] border border-[#24324F] hover:border-[#00B8D4] rounded-2xl overflow-hidden shadow-xl hover:shadow-[0_0_25px_rgba(0,184,212,0.2)] transition-all duration-300 flex flex-col group cursor-pointer"
                  >
                    {/* Album Cover & Media Counter */}
                    <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                      <SportsGalleryImage
                        src={displayCover}
                        alt={album.title}
                        sport={album.sport}
                        title={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Sport Badge & Unlock Status Badge */}
                      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
                        <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-[#00B8D4]/40 text-[#00B8D4] text-[11px] font-black uppercase font-mono">
                          {album.sport || 'Sports'}
                        </span>
                        {isFirstUnlocked ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1 backdrop-blur-sm">
                            <Unlock className="w-2.5 h-2.5 text-emerald-400" />
                            <span>UNLOCKED</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-black/85 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1 backdrop-blur-sm">
                            <Lock className="w-2.5 h-2.5 text-amber-400" />
                            <span>PRO PROOF • ${album.price ? Number(album.price).toFixed(2) : '2.00'}</span>
                          </span>
                        )}
                      </div>

                      {/* Media Count Badge */}
                      <div className="absolute bottom-3 right-3 z-10">
                        <span className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md text-white text-[11px] font-mono font-bold border border-white/10 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-[#00B8D4]" />
                          {count} Photo{count === 1 ? '' : 's'}
                        </span>
                      </div>

                      {/* Quick Share / Edit / Delete Buttons on Card */}
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareWithParents(album);
                          }}
                          title="Share Album with Parents"
                          className="p-1.5 rounded-lg bg-black/80 hover:bg-[#00F0D0] text-[#00F0D0] hover:text-[#090D16] border border-white/20 transition-colors shadow-lg cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        {isOwner && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(album, e)}
                              title="Edit Album"
                              className="p-1.5 rounded-lg bg-black/80 hover:bg-[#00B8D4] text-slate-200 hover:text-[#090D16] border border-white/20 transition-colors shadow-lg cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleRequestDelete(album, e)}
                              title="Delete Album"
                              className="p-1.5 rounded-lg bg-black/80 hover:bg-rose-600 text-slate-200 hover:text-white border border-white/20 transition-colors shadow-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400 hover:text-white" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Album Metadata Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="text-sm font-black text-white group-hover:text-[#00B8D4] transition-colors line-clamp-1 font-mono">
                          {album.title}
                        </h3>

                        {album.eventName && (
                          <p className="text-xs text-slate-400 mt-1 truncate flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{album.eventName}</span>
                          </p>
                        )}

                        {album.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                            {album.description}
                          </p>
                        )}
                      </div>

                      {/* Curator Signature & Pricing */}
                      <div className="pt-2.5 border-t border-[#24324F]/60 space-y-1.5 text-[11px] font-mono">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="truncate">
                            By <strong className="text-slate-300">{album.authorName || 'Creator'}</strong>
                          </span>
                          <span className="text-[#00B8D4] font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            View <span className="hidden sm:inline">Album</span> →
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/60 px-2 py-1 rounded-lg border border-[#24324F]/40">
                          <span>Single: <strong className="text-white">${typeof album.singlePrice === 'number' ? album.singlePrice.toFixed(2) : (album.price ? Number(album.price).toFixed(2) : '10.00')}</strong></span>
                          <span className="text-slate-600">•</span>
                          <span className="text-emerald-400 font-bold">Pass: ${typeof album.bundlePrice === 'number' ? album.bundlePrice.toFixed(2) : (album.fullAlbumPrice ? Number(album.fullAlbumPrice).toFixed(2) : '45.00')}</span>
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

      {/* 3. Create Album Modal with Direct File Upload */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141B2D] border border-[#24324F] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#24324F]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#00B8D4]/20 text-[#00B8D4]">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white font-mono uppercase tracking-wider">
                    Create New Album
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Direct local file upload to Firebase Storage
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                  Album Title *
                </label>
                <input
                  id="create-album-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  placeholder="e.g. State Championship Finals 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                    Sport
                  </label>
                  <select
                    id="create-album-sport"
                    value={newSport}
                    onChange={(e) => setNewSport(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4]"
                  >
                    <option value="Basketball">🏀 Basketball</option>
                    <option value="Football">🏈 Football</option>
                    <option value="Soccer">⚽ Soccer</option>
                    <option value="Track">🏃 Track & Field</option>
                    <option value="Volleyball">🏐 Volleyball</option>
                    <option value="Baseball">⚾ Baseball</option>
                    <option value="Cheer">📣 Cheer</option>
                    <option value="Lacrosse">🥍 Lacrosse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    id="create-album-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4]"
                  >
                    <option value="Game Action">Game Action</option>
                    <option value="Tournaments">Tournaments</option>
                    <option value="Combine / Laser">Combine / Laser</option>
                    <option value="Team Portraits">Team Portraits</option>
                    <option value="Showcase Highlights">Showcase Highlights</option>
                    <option value="Ceremonies & Awards">Ceremonies & Awards</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                    Event Name
                  </label>
                  <input
                    id="create-album-event"
                    type="text"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    placeholder="e.g. West Coast Invitational"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                    Photo Price ($ USD)
                  </label>
                  <input
                    id="create-album-price"
                    type="number"
                    step="0.50"
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="2.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  id="create-album-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Tell the story behind this tournament album or match..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4] resize-none"
                />
              </div>

              {/* Cover Photo Direct File Picker */}
              <div>
                <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                  Cover Photo (Direct Local File, &lt; 10MB)
                </label>
                <input
                  ref={createCoverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverPhotoSelect}
                  className="hidden"
                />
                <div
                  onClick={() => createCoverInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#24324F] hover:border-[#00B8D4] rounded-xl p-3.5 text-center cursor-pointer transition-colors bg-slate-900/60"
                >
                  {coverPhotoPreview ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={coverPhotoPreview}
                        alt="Cover Preview"
                        className="w-14 h-14 rounded-lg object-cover border border-[#00B8D4]"
                      />
                      <div className="text-left">
                        <p className="text-xs font-bold text-white font-mono">{coverPhotoFile?.name}</p>
                        <p className="text-[11px] text-[#00B8D4]">Click to change cover photo</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2 text-slate-400">
                      <ImageIcon className="w-6 h-6 text-[#00B8D4] mb-1" />
                      <span className="text-xs font-mono text-slate-200">Click to select Album Cover (JPEG, PNG, WebP)</span>
                      <span className="text-[10px] text-slate-500">Max size 10MB</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Photo Direct File Picker */}
              <div>
                <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                  Album Photos (Select Multiple Images, &lt; 10MB each)
                </label>
                <input
                  ref={createPhotosInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotosSelect}
                  className="hidden"
                />
                <div
                  onClick={() => createPhotosInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#24324F] hover:border-[#00B8D4] rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-900/60 mb-2"
                >
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Upload className="w-6 h-6 text-[#00B8D4] mb-1" />
                    <span className="text-xs font-mono text-slate-200">Click to Choose Photos from Device</span>
                    <span className="text-[10px] text-slate-500">Supports multi-file selection</span>
                  </div>
                </div>

                {/* Queued Photos Preview Grid */}
                {createPhotoQueue.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>{createPhotoQueue.length} Photo{createPhotoQueue.length === 1 ? '' : 's'} Selected</span>
                      <button
                        type="button"
                        onClick={() => setCreatePhotoQueue([])}
                        className="text-rose-400 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-900/80 rounded-xl border border-[#24324F]">
                      {createPhotoQueue.map((item) => (
                        <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 group">
                          <img src={item.preview} alt="Queued" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveQueuedPhoto(item.id)}
                            className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 text-white hover:bg-rose-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress Bar */}
              {isCreating && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono text-slate-300">
                    <span>Uploading direct media to Firebase Storage...</span>
                    <span>{createOverallProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] transition-all duration-300"
                      style={{ width: `${createOverallProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider font-mono shadow-[0_0_15px_rgba(0,184,212,0.3)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading Media...</span>
                    </>
                  ) : (
                    <span>Create &amp; Upload</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Album Modal with Direct File Upload */}
      {editingAlbum && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141B2D] border border-[#24324F] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#24324F]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#00B8D4]/20 text-[#00B8D4]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <h2 className="text-base font-black text-white font-mono uppercase tracking-wider">
                  Edit Album Details
                </h2>
              </div>
              <button
                onClick={() => setEditingAlbum(null)}
                className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAlbum} className="space-y-4">
              <div>
                <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                  Album Title *
                </label>
                <input
                  id="edit-album-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                    Sport
                  </label>
                  <select
                    id="edit-album-sport"
                    value={editSport}
                    onChange={(e) => setEditSport(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4]"
                  >
                    <option value="Basketball">🏀 Basketball</option>
                    <option value="Football">🏈 Football</option>
                    <option value="Soccer">⚽ Soccer</option>
                    <option value="Track">🏃 Track & Field</option>
                    <option value="Volleyball">🏐 Volleyball</option>
                    <option value="Baseball">⚾ Baseball</option>
                    <option value="Cheer">📣 Cheer</option>
                    <option value="Lacrosse">🥍 Lacrosse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    id="edit-album-category"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4]"
                  >
                    <option value="Game Action">Game Action</option>
                    <option value="Tournaments">Tournaments</option>
                    <option value="Combine / Laser">Combine / Laser</option>
                    <option value="Team Portraits">Team Portraits</option>
                    <option value="Showcase Highlights">Showcase Highlights</option>
                    <option value="Ceremonies & Awards">Ceremonies & Awards</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                    Event Name
                  </label>
                  <input
                    id="edit-album-event"
                    type="text"
                    value={editEventName}
                    onChange={(e) => setEditEventName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                    Photo Price ($ USD)
                  </label>
                  <input
                    id="edit-album-price"
                    type="number"
                    step="0.50"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="2.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                  Replace Cover Photo
                </label>
                <input
                  ref={editCoverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setEditCoverFile(f);
                    setEditCoverPreview(URL.createObjectURL(f));
                  }}
                  className="hidden"
                />
                <div
                  onClick={() => editCoverInputRef.current?.click()}
                  className="w-full border border-[#24324F] hover:border-[#00B8D4] rounded-xl p-3 flex items-center gap-3 cursor-pointer bg-slate-900"
                >
                  {editCoverPreview && (
                    <img src={editCoverPreview} alt="Cover" className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-white font-mono">
                      {editCoverFile ? editCoverFile.name : 'Click to Upload New Cover Image'}
                    </p>
                    <p className="text-[10px] text-slate-400">JPEG, PNG, WebP under 10MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold font-mono uppercase text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  id="edit-album-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[#24324F] text-white text-xs font-medium focus:outline-none focus:border-[#00B8D4] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAlbum(null)}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !editTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider font-mono shadow-[0_0_15px_rgba(0,184,212,0.3)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Album</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add Photos Modal (Directly in Active Album) */}
      {showAddMediaModal && activeAlbum && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141B2D] border border-[#24324F] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#24324F]">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#00B8D4]" />
                <h2 className="text-base font-black text-white font-mono uppercase tracking-wider">
                  Add Photos to Album
                </h2>
              </div>
              <button
                onClick={() => setShowAddMediaModal(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPhotosToActiveAlbum} className="space-y-4">
              <div>
                <input
                  ref={addPhotosInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const items: UploadQueueItem[] = files
                      .filter((f) => isValidImageFile(f) && f.size <= 10 * 1024 * 1024)
                      .map((f) => ({
                        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                        file: f,
                        preview: URL.createObjectURL(f),
                        progress: 0
                      }));
                    setAdditionalPhotoQueue((prev) => [...prev, ...items]);
                  }}
                  className="hidden"
                />
                <div
                  onClick={() => addPhotosInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#24324F] hover:border-[#00B8D4] rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-900"
                >
                  <Upload className="w-6 h-6 text-[#00B8D4] mx-auto mb-1" />
                  <span className="text-xs font-mono text-white block">Click to select photos from device</span>
                  <span className="text-[10px] text-slate-500 font-mono">Direct upload to Firebase Storage</span>
                </div>

                {additionalPhotoQueue.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3 max-h-36 overflow-y-auto p-1 bg-slate-900 rounded-xl border border-[#24324F]">
                    {additionalPhotoQueue.map((item) => (
                      <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden">
                        <img src={item.preview} alt="Queued" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setAdditionalPhotoQueue((prev) => prev.filter((i) => i.id !== item.id))}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMediaModal(false)}
                  disabled={isAddingMedia}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMedia || additionalPhotoQueue.length === 0}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider font-mono shadow-[0_0_15px_rgba(0,184,212,0.3)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  {isAddingMedia ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload {additionalPhotoQueue.length} Photo{additionalPhotoQueue.length === 1 ? '' : 's'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Confirmation Dialog */}
      {albumToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141B2D] border border-rose-500/30 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white font-mono uppercase">Delete Album?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to permanently delete <strong className="text-white">"{albumToDelete.title}"</strong>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAlbumToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Delete Album</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Interactive Lightbox Modal with Watermark Protection & Master Unlock */}
      {(activePhotoIndex !== null && activeAlbum) && (() => {
        // Reconcile photos from subcollection, activeAlbum.photos, and activeAlbum.mediaUrls
        const photoItems: any[] = getReconciledAlbumPhotos(activeAlbum, subcollectionPhotos);

        const currentIndex = activePhotoIndex;
        const currentItem = photoItems[currentIndex];
        const itemIsString = typeof currentItem === 'string';

        const photoDocId = itemIsString
          ? `${activeAlbum.id}_${currentIndex}`
          : (currentItem?.id || `${activeAlbum.id}_${currentIndex}`);

        const isCreatorOfAlbum = canModifyAlbum(activeAlbum) || Boolean(user && (
          activeAlbum.authorId === user.uid ||
          activeAlbum.creatorId === user.uid ||
          activeAlbum.photographerId === user.uid ||
          activeAlbum.createdBy === user.uid
        ));

        const hasAlbumPass = Boolean(
          purchasedAlbumIds.has(activeAlbum.id) ||
          isCreatorOfAlbum ||
          isAdmin
        );

        const singlePriceNum = typeof activeAlbum.singlePrice === 'number'
          ? activeAlbum.singlePrice
          : (typeof activeAlbum.price === 'number' && activeAlbum.price <= 20 ? activeAlbum.price : 2.00);

        const bundlePriceNum = typeof activeAlbum.bundlePrice === 'number'
          ? activeAlbum.bundlePrice
          : (typeof activeAlbum.fullAlbumPrice === 'number'
              ? activeAlbum.fullAlbumPrice
              : (typeof activeAlbum.price === 'number' && activeAlbum.price > 20 ? activeAlbum.price : 200.00));

        const isPhotoFree = Boolean(
          (!itemIsString && (currentItem?.isFreeForMembers || currentItem?.isFree)) ||
          activeAlbum.isFree ||
          activeAlbum.watermarkEnabled === false ||
          activeAlbum.watermarkStyle === 'off' ||
          (typeof singlePriceNum === 'number' && singlePriceNum === 0)
        );

        const originalUrl = itemIsString
          ? currentItem
          : (currentItem?.cleanMasterUrl || currentItem?.originalUrl || currentItem?.imageUrl || currentItem?.url || currentItem?.previewUrl || '');

        const previewUrl = itemIsString
          ? (activeAlbum.watermarkedMediaUrls?.[currentIndex] || currentItem)
          : (currentItem?.previewUrl || currentItem?.watermarkedUrl || currentItem?.thumbUrl || originalUrl);

        const thumbUrl = itemIsString
          ? (activeAlbum.watermarkedMediaUrls?.[currentIndex] || currentItem)
          : (currentItem?.thumbUrl || currentItem?.thumbnailUrl || previewUrl || originalUrl);

        const isUnlocked = Boolean(
          isPhotoFree ||
          hasAlbumPass ||
          isCreatorOfAlbum ||
          isAdmin ||
          isMediaUnlocked(activeAlbum, currentIndex, originalUrl, photoDocId) ||
          (user && (
            purchasedPhotoIds.has(photoDocId) ||
            (!itemIsString && currentItem?.id && purchasedPhotoIds.has(currentItem.id)) ||
            (originalUrl && (purchasedUrls.has(originalUrl) || purchasedPhotoIds.has(originalUrl)))
          ))
        );

        const isDownloadRoute = Boolean(originalUrl && originalUrl.startsWith('/api/media/download'));
        const currentDisplayUrl = isUnlocked
          ? (!isDownloadRoute && originalUrl ? originalUrl : (previewUrl || thumbUrl))
          : (previewUrl || thumbUrl || getDisplayMediaUrl(activeAlbum, currentIndex, originalUrl, photoDocId));

        const photoVault = (!itemIsString ? currentItem?.vaultPath : null) || `galleries/${activeAlbum.id}/vault/${photoDocId}.jpg`;
        const cleanFileName = `${activeAlbum.title.replace(/\s+/g, '_')}_photo_${currentIndex + 1}_4K.jpg`;
        const cleanMasterDownloadTarget = activeAlbum.id
          ? `/api/media/download?albumId=${encodeURIComponent(activeAlbum.id)}&photoId=${encodeURIComponent(photoDocId)}&vaultPath=${encodeURIComponent(photoVault)}&filename=${encodeURIComponent(cleanFileName)}&url=${encodeURIComponent(originalUrl || previewUrl)}`
          : (originalUrl || previewUrl);

        const photoItemPrice = singlePriceNum;

        const driveFileId =
          (!itemIsString ? currentItem?.driveFileId : '') ||
          extractGoogleDriveFileId(originalUrl) ||
          extractGoogleDriveFileId(previewUrl) ||
          '';

        const highResUrl = driveFileId
          ? `https://drive.google.com/uc?export=download&id=${driveFileId}`
          : (cleanMasterDownloadTarget || originalUrl || currentDisplayUrl);

        const photoTitle =
          (!itemIsString ? (currentItem?.title || currentItem?.filename || currentItem?.caption) : null) ||
          `Photo ${currentIndex + 1} of ${photoItems.length}`;

        const photoForPrint = {
          id: photoDocId,
          previewUrl,
          url: cleanMasterDownloadTarget || originalUrl || currentDisplayUrl,
          highResUrl,
          title: photoTitle,
          driveFileId: driveFileId || undefined
        };

        const resolvedCleanDownload =
          cleanMasterDownloadTarget ||
          (driveFileId ? `https://drive.google.com/uc?export=download&id=${driveFileId}` : '') ||
          (isGoogleDriveUrlOrId(originalUrl) ? resolveGoogleDriveImageUrl(originalUrl, 'full') : originalUrl);

        const photoDownloadItem = {
          id: photoDocId,
          title: photoTitle,
          galleryId: activeAlbum.id,
          albumId: activeAlbum.id,
          price: photoItemPrice,
          originalStoragePath: photoVault,
          cleanMasterUrl: resolvedCleanDownload,
          cleanUrl: resolvedCleanDownload,
          highResDownloadUrl: resolvedCleanDownload,
          previewUrl: currentDisplayUrl,
          mediaUrl: resolvedCleanDownload || originalUrl,
          photographerName: activeAlbum.authorName || 'Just1Play Media',
          isFree: isPhotoFree,
          isFreeForMembers: isPhotoFree
        };

        const handlePrev = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (currentIndex > 0) {
            setActivePhotoIndex(currentIndex - 1);
          } else {
            setActivePhotoIndex(photoItems.length - 1);
          }
        };

        const handleNext = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (currentIndex < photoItems.length - 1) {
            setActivePhotoIndex(currentIndex + 1);
          } else {
            setActivePhotoIndex(0);
          }
        };

        const resolvedDownloadUrl = isGoogleDriveUrlOrId(originalUrl)
          ? resolveGoogleDriveImageUrl(originalUrl, 'full')
          : originalUrl;

        const handleDirectDownload = async () => {
          let downloadTarget = resolvedCleanDownload || originalUrl || resolvedDownloadUrl;

          try {
            const token = user ? await user.getIdToken().catch(() => undefined) : undefined;
            const signedRes = await requestSignedPhotoDownloadUrl({
              photoId: photoDocId,
              galleryId: activeAlbum.id,
              albumId: activeAlbum.id,
              authToken: token,
              userId: user?.uid,
              originalUrl: resolvedCleanDownload || originalUrl || resolvedDownloadUrl,
              watermarkedUrl: previewUrl || currentDisplayUrl,
              filename: cleanFileName,
            });
            if (signedRes?.downloadUrl) {
              downloadTarget = signedRes.downloadUrl;
            }
          } catch (_) {
            // fallback gracefully to resolved direct URL
          }

          await downloadPhotoFile(downloadTarget, cleanFileName);
        };

        return (
          <div
            onClick={() => setActivePhotoIndex(null)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-4 animate-fadeIn select-none h-screen h-[100dvh] max-h-[100dvh] w-screen overflow-hidden"
          >
            {/* Top Lightbox Nav Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-6xl flex items-center justify-between py-2 px-3 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md z-20 shrink-0"
            >
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-[#00B8D4]/20 border border-[#00B8D4]/40 text-[#00B8D4] text-xs font-mono font-bold">
                  {currentIndex + 1} / {photoItems.length}
                </span>
                <span className="text-xs sm:text-sm font-black text-white font-mono uppercase truncate max-w-[200px] sm:max-w-md">
                  {activeAlbum.title}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {isUnlocked ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-mono font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>MASTER UNLOCKED</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>🔒 PREVIEW PROOF (WATERMARKED)</span>
                  </span>
                )}
                <button
                  onClick={() => setActivePhotoIndex(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-white hover:text-black text-slate-300 transition-colors cursor-pointer"
                  title="Close Lightbox"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Central Media Viewer with Navigation Arrows */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-6xl flex-1 min-h-0 h-full flex items-center justify-center my-auto overflow-hidden px-2"
            >
              {/* Prev Button */}
              {photoItems.length > 1 && (
                <button
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-black/70 hover:bg-[#00B8D4] text-white hover:text-black border border-white/20 hover:border-[#00B8D4] transition-all cursor-pointer shadow-xl"
                  title="Previous Photo"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Main Photo Image Container */}
              <div className="relative w-full h-full max-h-[calc(100dvh-170px)] sm:max-h-[calc(100dvh-150px)] flex items-center justify-center overflow-hidden rounded-2xl">
                <SportsGalleryImage
                  src={currentDisplayUrl || previewUrl || thumbUrl || originalUrl}
                  fallbackSrc={previewUrl || thumbUrl || (!isDownloadRoute ? originalUrl : '')}
                  alt={`${activeAlbum.title} item ${currentIndex + 1}`}
                  sport={activeAlbum.sport || 'Sports'}
                  title={photoTitle}
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/10 select-none pointer-events-none"
                  containerClassName="relative w-full h-full flex items-center justify-center overflow-hidden"
                />

                {/* WatermarkOverlay: positioned directly inside photo wrapper div with relative container and absolute inset-0 z-20 */}
                {/* Only rendered when photo is locked/unpurchased; hidden completely when unlocked */}
                {!isUnlocked && <WatermarkOverlay className="z-20" />}

                {/* Proof Watermark Floating Indicator if locked */}
                {!isUnlocked && (
                  <div className="absolute bottom-3 left-3 z-30 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>WATERMARKED PROOF • LOW RES</span>
                  </div>
                )}
              </div>

              {/* Next Button */}
              {photoItems.length > 1 && (
                <button
                  onClick={handleNext}
                  className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-black/70 hover:bg-[#00B8D4] text-white hover:text-black border border-white/20 hover:border-[#00B8D4] transition-all cursor-pointer shadow-xl"
                  title="Next Photo"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Bottom Actions & Purchase Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl p-3 sm:p-4 rounded-2xl bg-[#141B2D]/95 border border-[#24324F] backdrop-blur-md shadow-2xl z-20 space-y-3 shrink-0"
            >
              {isUnlocked ? (
                /* Unlocked Master Actions */
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>You own full 4K master uncompressed access to this photo.</span>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
                    <button
                      onClick={handleDirectDownload}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:brightness-110 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Clean 4K Master</span>
                    </button>
                    <button
                      id="order-print-unlocked-btn"
                      onClick={() => {
                        setProdigiPrintTarget({
                          photo: photoForPrint,
                          url: highResUrl,
                          previewUrl: previewUrl,
                          highResUrl: highResUrl,
                          title: photoTitle,
                          subtitle: activeAlbum?.title ? `${activeAlbum.title} • Photo #${currentIndex + 1}` : `Official Lab Print • Photo #${currentIndex + 1}`,
                          sku: 'PACKAGE-MVP-STARTER',
                          creatorId: (activeAlbum as any)?.photographerId || (activeAlbum as any)?.directorUid,
                          creatorPayPalEmail: (activeAlbum as any)?.photographerEmail || (activeAlbum as any)?.directorPayPalEmail,
                          creatorName: (activeAlbum as any)?.photographerName || (activeAlbum as any)?.directorName
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-[#00F5D4]/40 text-[#00F5D4] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all hover:border-[#00F5D4] cursor-pointer shadow-md"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Order Physical Print & Wall Art</span>
                    </button>
                    <a
                      href={resolvedDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center justify-center gap-1.5 border border-white/10"
                    >
                      <span>Open Tab</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                /* Locked / Watermarked Proof Purchase Section */
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                        Protected Low-Res Proof
                      </span>
                      <span className="text-white text-xs font-black font-mono">
                        Unlock Original 4K Master Photo
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono leading-relaxed">
                      Sign in as a member to download clean 4K photos.
                    </p>
                  </div>

                  <div className="w-full md:w-auto flex items-center gap-3 flex-wrap">
                    {!user ? (
                      <button
                        onClick={() => {
                          const authBtn = document.getElementById('navbar-auth-btn') || 
                                          document.getElementById('login-modal-trigger') || 
                                          document.querySelector('[data-auth-trigger]');
                          if (authBtn instanceof HTMLElement) {
                            authBtn.click();
                          } else {
                            window.location.hash = '#login';
                          }
                          showToast('info', 'Sign In Required', 'Sign in as a member to download clean 4K photos.');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold uppercase tracking-wider transition shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Sign In to Download Free</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          id="lightbox-single-photo-btn"
                          onClick={() => openSinglePhotoCheckout(photoDocId, photoTitle, photoItemPrice)}
                          className="px-4 py-2.5 rounded-xl bg-[#00B8D4] hover:bg-[#00F0D0] text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,184,212,0.3)] transition cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Single Photo: ${photoItemPrice.toFixed(2)}</span>
                        </button>
                        <button
                          type="button"
                          id="lightbox-full-pass-btn"
                          onClick={() => openFullPassCheckout()}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:brightness-110 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Full Event Pass: ${bundlePriceNum.toFixed(2)}</span>
                        </button>
                      </div>
                    )}
                    {/* Quick Add to Cart Button */}
                    <button
                      id="lightbox-quick-add-cart-btn"
                      type="button"
                      onClick={() => {
                        const driveId = photoForPrint?.driveFileId || extractGoogleDriveFileId(highResUrl || previewUrl);
                        addToCart({
                          photoId: photoForPrint?.id || `photo-${currentIndex}`,
                          title: photoTitle,
                          previewUrl: previewUrl,
                          highResUrl: highResUrl,
                          driveFileId: driveId || undefined,
                          sku: 'GLOBAL-CAN-12x16',
                          formatName: 'Archival Canvas Wrap (12x16")',
                          price: 49.99,
                          copies: 1,
                          wholesaleCost: 18.00,
                          creatorId: (activeAlbum as any)?.photographerId || (activeAlbum as any)?.directorUid,
                          creatorPayPalEmail: (activeAlbum as any)?.photographerEmail || (activeAlbum as any)?.directorPayPalEmail,
                          creatorName: (activeAlbum as any)?.photographerName || (activeAlbum as any)?.directorName,
                          dimensions: '12x16 inches'
                        });
                        showToast('success', 'Added to Cart', `${photoTitle} (12x16" Canvas Wrap) added to Print Cart!`);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-400/50 hover:border-emerald-400 text-emerald-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                      title="Quick Add 12x16 Canvas Wrap to Cart"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Add to Cart ($49.99)</span>
                    </button>

                    <button
                      id="order-print-locked-btn"
                      onClick={() => {
                        setProdigiPrintTarget({
                          photo: photoForPrint,
                          url: highResUrl,
                          previewUrl: previewUrl,
                          highResUrl: highResUrl,
                          title: photoTitle,
                          subtitle: activeAlbum?.title ? `${activeAlbum.title} • Photo #${currentIndex + 1}` : `Official Lab Print • Photo #${currentIndex + 1}`,
                          sku: 'PACKAGE-MVP-STARTER',
                          creatorId: (activeAlbum as any)?.photographerId || (activeAlbum as any)?.directorUid,
                          creatorPayPalEmail: (activeAlbum as any)?.photographerEmail || (activeAlbum as any)?.directorPayPalEmail,
                          creatorName: (activeAlbum as any)?.photographerName || (activeAlbum as any)?.directorName
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-[#00F5D4]/40 text-[#00F5D4] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all hover:border-[#00F5D4] cursor-pointer shadow-md"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Select Print Options & Packages</span>
                    </button>

                    {printCartCount > 0 && (
                      <button
                        id="lightbox-view-cart-btn"
                        type="button"
                        onClick={() => openCart()}
                        className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition shadow-md"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>View Cart ({printCartCount})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Fallback Simple URL Lightbox Modal */}
      {activeMediaUrl && activePhotoIndex === null && (
        <div
          onClick={() => setActiveMediaUrl(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
        >
          <button
            onClick={() => setActiveMediaUrl(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-white hover:text-black transition-colors z-10 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl max-h-[85vh] flex flex-col items-center justify-center relative"
          >
            <div className="relative overflow-hidden rounded-xl">
              <img
                src={activeMediaUrl}
                alt="High resolution gallery photo"
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10 select-none pointer-events-none"
              />
              <WatermarkOverlay className="z-20" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <a
                href={activeMediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#141B2D] border border-[#24324F] hover:border-[#00B8D4] text-[#00B8D4] text-xs font-mono flex items-center gap-1.5 shadow"
              >
                <span>Open Full Resolution</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => {
                  const driveId = extractGoogleDriveFileId(activeMediaUrl);
                  const hrUrl = driveId ? `https://drive.google.com/uc?export=download&id=${driveId}` : activeMediaUrl;
                  const photoItem = {
                    previewUrl: activeMediaUrl,
                    url: activeMediaUrl,
                    highResUrl: hrUrl,
                    title: 'Championship Showcase Photo',
                    driveFileId: driveId || undefined
                  };
                  setProdigiPrintTarget({
                    photo: photoItem,
                    url: hrUrl,
                    previewUrl: activeMediaUrl,
                    highResUrl: hrUrl,
                    title: 'Championship Showcase Photo',
                    subtitle: 'Archival Physical Print',
                    sku: 'PACKAGE-MVP-STARTER'
                  });
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-850 border border-[#00F5D4]/40 text-[#00F5D4] hover:text-white text-xs font-mono flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Physical Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prodigi Print-on-Demand Modal */}
      {prodigiPrintTarget && (
        <React.Suspense fallback={null}>
          <ProdigiPrintOrderModal
            isOpen={Boolean(prodigiPrintTarget)}
            onClose={() => setProdigiPrintTarget(null)}
            photo={prodigiPrintTarget.photo}
            imageUrl={prodigiPrintTarget.url}
            previewUrl={prodigiPrintTarget.previewUrl || prodigiPrintTarget.url}
            highResUrl={prodigiPrintTarget.highResUrl || prodigiPrintTarget.url}
            itemTitle={prodigiPrintTarget.title}
            itemSubtitle={prodigiPrintTarget.subtitle}
            defaultSku={prodigiPrintTarget.sku || 'PACKAGE-MVP-STARTER'}
            creatorId={prodigiPrintTarget.creatorId || (activeAlbum as any)?.photographerId}
            creatorPayPalEmail={prodigiPrintTarget.creatorPayPalEmail || (activeAlbum as any)?.photographerEmail}
            creatorName={prodigiPrintTarget.creatorName || (activeAlbum as any)?.photographerName}
            metadata={{
              albumId: activeAlbum?.id,
              albumTitle: activeAlbum?.title,
              photoIndex: activePhotoIndex,
              photoTitle: prodigiPrintTarget.title,
              driveFileId: prodigiPrintTarget.photo?.driveFileId
            }}
          />
        </React.Suspense>
      )}

      {/* 8. Full Event Album Pass Checkout Modal */}
      {albumPassTarget && (
        <AlbumPassPurchaseModal
          album={albumPassTarget}
          isOpen={Boolean(albumPassTarget)}
          onClose={() => setAlbumPassTarget(null)}
          onSuccess={(albumId) => {
            setPurchasedAlbumIds((prev) => new Set(prev).add(albumId));
            setAlbumPassTarget(null);
            showToast('success', 'Album Pass Unlocked', `Full 4K digital pass active for ${albumPassTarget.title}!`);
          }}
        />
      )}

      {/* 9. Share with Parents Modal */}
      {(showShareParentsModal || Boolean(shareAlbumTarget)) && shareAlbumTarget && (
        <div
          onClick={() => {
            setShowShareParentsModal(false);
            setShareAlbumTarget(null);
          }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#141B2D] border border-[#00F0D0]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#24324F]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00F0D0]/15 border border-[#00F0D0]/30 flex items-center justify-center text-[#00F0D0]">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-mono uppercase">Share Album with Parents</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Send direct link to players, parents & fans</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowShareParentsModal(false);
                  setShareAlbumTarget(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Album Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 flex items-center gap-3">
              {shareAlbumTarget.coverPhotoUrl && (
                <img
                  src={shareAlbumTarget.coverPhotoUrl}
                  alt={shareAlbumTarget.title}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-lg object-cover shrink-0 border border-white/10"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate font-mono">{shareAlbumTarget.title}</h4>
                <p className="text-[11px] text-slate-400 truncate">
                  {shareAlbumTarget.sport || 'Sports'} • {shareAlbumTarget.eventName || 'Tournament Gallery'}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#00B8D4]/20 text-[#00B8D4] font-bold">
                  {shareAlbumTarget.photoCount || shareAlbumTarget.mediaUrls?.length || 1} Photos Ready
                </span>
              </div>
            </div>

            {/* Direct Link Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-300 font-bold uppercase tracking-wider">
                Direct Album Link:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/gallery?albumId=${shareAlbumTarget.id}`
                      : `https://app.just1play.com/gallery?albumId=${shareAlbumTarget.id}`
                  }
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-[#24324F] text-xs font-mono text-slate-200 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = typeof window !== 'undefined'
                      ? `${window.location.origin}/gallery?albumId=${shareAlbumTarget.id}`
                      : `https://app.just1play.com/gallery?albumId=${shareAlbumTarget.id}`;
                    navigator.clipboard.writeText(url);
                    setIsCopiedShareLink(true);
                    setTimeout(() => setIsCopiedShareLink(false), 2500);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    isCopiedShareLink
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-gradient-to-r from-[#00F0D0] to-[#00B8D4] text-[#090D16] hover:brightness-110'
                  }`}
                >
                  {isCopiedShareLink ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Sharing Options */}
            <div className="space-y-2 pt-2 border-t border-[#24324F]">
              <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                Quick Send Options:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {/* SMS Link */}
                <a
                  href={`sms:?&body=${encodeURIComponent(
                    `Check out photos from ${shareAlbumTarget.title} on Just1Play: ${
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/gallery?albumId=${shareAlbumTarget.id}`
                        : `https://app.just1play.com/gallery?albumId=${shareAlbumTarget.id}`
                    }`
                  )}`}
                  className="px-3 py-2 rounded-xl bg-[#1A233A] hover:bg-[#24324F] border border-[#24324F] text-slate-200 hover:text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition"
                >
                  <span>📱 Text to Parents</span>
                </a>

                {/* Email Link */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(
                    `Photos from ${shareAlbumTarget.title} - Just1Play`
                  )}&body=${encodeURIComponent(
                    `Hi,\n\nHere is the link to view the photos from ${shareAlbumTarget.title}:\n${
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/gallery?albumId=${shareAlbumTarget.id}`
                        : `https://app.just1play.com/gallery?albumId=${shareAlbumTarget.id}`
                    }\n\nEnjoy the memories!\nJust1Play Team`
                  )}`}
                  className="px-3 py-2 rounded-xl bg-[#1A233A] hover:bg-[#24324F] border border-[#24324F] text-slate-200 hover:text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition"
                >
                  <span>✉️ Email Parents</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated PayPal Checkout Modal for Single Photo and Full Event Pass */}
      {paypalCheckout && (
        <div
          id="paypal-checkout-modal"
          onClick={() => {
            if (!isCapturingOrder) {
              setPaypalCheckout(null);
              setPaypalModalError(null);
            }
          }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#141B2D] border border-[#24324F] rounded-2xl p-6 shadow-2xl space-y-5 relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#24324F] pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${paypalCheckout.purchaseType === 'full_pass' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#00B8D4]/20 text-[#00B8D4]'}`}>
                  {paypalCheckout.purchaseType === 'full_pass' ? (
                    <Sparkles className="w-5 h-5" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                    {paypalCheckout.purchaseType === 'full_pass' ? 'Unlock Full Event Pass' : 'Single Photo 4K Master'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Instant PayPal Checkout
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="close-paypal-modal-btn"
                disabled={isCapturingOrder}
                onClick={() => {
                  setPaypalCheckout(null);
                  setPaypalModalError(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item Details Summary */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Item:</span>
                <span className="text-white font-bold text-right truncate max-w-[220px]">{paypalCheckout.itemTitle}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Access:</span>
                <span className="text-emerald-400 font-bold">
                  {paypalCheckout.purchaseType === 'full_pass' ? 'All 4K Photos in Event' : '1 Clean 4K Uncompressed Master'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono border-t border-slate-800 pt-2">
                <span className="text-slate-300 font-bold">Total Due:</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  ${paypalCheckout.price.toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Capturing / Loading Overlay */}
            {isCapturingOrder ? (
              <div className="p-6 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex flex-col items-center justify-center space-y-3 text-center">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white font-mono">Verifying & Unlocking Access...</p>
                  <p className="text-xs text-slate-400 font-mono">Securing your permanent 4K license.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {paypalModalError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{paypalModalError}</span>
                  </div>
                )}

                <div className="relative z-10 min-h-[140px]">
                  <PayPalButtons
                    style={{
                      layout: 'vertical',
                      color: 'gold',
                      shape: 'rect',
                      label: 'paypal',
                      height: 44,
                    }}
                    createOrder={async () => {
                      setPaypalModalError(null);
                      try {
                        const idToken = user ? await user.getIdToken(true).catch(() => '') : '';
                        const headers: Record<string, string> = {
                          'Content-Type': 'application/json',
                        };
                        if (idToken) {
                          headers['Authorization'] = `Bearer ${idToken}`;
                        }

                        const res = await fetch('/api/paypal/create-order', {
                          method: 'POST',
                          headers,
                          body: JSON.stringify({
                            galleryId: paypalCheckout.galleryId,
                            photoId: paypalCheckout.photoId,
                            purchaseType: paypalCheckout.purchaseType,
                          }),
                        });

                        const data = await res.json().catch(() => ({}));
                        if (!res.ok || !data.orderId) {
                          throw new Error(data.error || 'Failed to initialize PayPal order.');
                        }
                        return data.orderId;
                      } catch (err: any) {
                        const msg = err.message || 'Failed to create PayPal order.';
                        setPaypalModalError(msg);
                        throw err;
                      }
                    }}
                    onApprove={async (data) => {
                      setIsCapturingOrder(true);
                      setPaypalModalError(null);
                      try {
                        const idToken = user ? await user.getIdToken(true).catch(() => '') : '';
                        const headers: Record<string, string> = {
                          'Content-Type': 'application/json',
                        };
                        if (idToken) {
                          headers['Authorization'] = `Bearer ${idToken}`;
                        }

                        const res = await fetch('/api/paypal/capture-order', {
                          method: 'POST',
                          headers,
                          body: JSON.stringify({ orderId: data.orderID }),
                        });

                        const captureData = await res.json().catch(() => ({}));
                        if (!res.ok || (captureData.status !== 'COMPLETED' && captureData.success !== true)) {
                          throw new Error(captureData.error || 'Payment capture failed.');
                        }

                        // Execute verification call to /api/verify-paypal-order
                        const customId = `${user?.uid || 'guest'}__${paypalCheckout.purchaseType === 'full_pass' ? 'album_pass' : 'photo'}__${paypalCheckout.photoId || paypalCheckout.galleryId}`;
                        await fetch('/api/verify-paypal-order', {
                          method: 'POST',
                          headers,
                          body: JSON.stringify({
                            orderId: data.orderID,
                            captureId: captureData.captureId || data.orderID,
                            customId,
                            userId: user?.uid || 'guest',
                            itemType: paypalCheckout.purchaseType === 'full_pass' ? 'album_pass' : 'photo',
                            itemId: paypalCheckout.photoId || paypalCheckout.galleryId,
                            photoId: paypalCheckout.photoId,
                            galleryId: paypalCheckout.galleryId,
                            amount: paypalCheckout.price,
                            itemTitle: paypalCheckout.itemTitle,
                          }),
                        }).catch((err) => console.warn('[Verification call note]:', err));

                        // Immediately refresh unlock state without requiring a full page reload
                        if (paypalCheckout.purchaseType === 'full_pass') {
                          setPurchasedAlbumIds((prev) => new Set(prev).add(paypalCheckout.galleryId));
                          showToast('success', 'Full Event Pass Unlocked!', 'Every 4K master photo in this event is now unlocked for clean download.');
                        } else {
                          if (paypalCheckout.photoId) {
                            setPurchasedPhotoIds((prev) => new Set(prev).add(paypalCheckout.photoId!));
                          }
                          showToast('success', 'Photo Master Unlocked!', 'Your clean 4K uncompressed master photo is now unlocked.');
                        }

                        setPaypalCheckout(null);
                      } catch (err: any) {
                        const msg = err.message || 'Payment capture failed.';
                        setPaypalModalError(msg);
                      } finally {
                        setIsCapturingOrder(false);
                      }
                    }}
                    onError={(err) => {
                      console.error('[PayPal Checkout Error]:', err);
                      setPaypalModalError('PayPal experienced a processing error. Please try again or select another payment method.');
                    }}
                    onCancel={() => {
                      // user closed the paypal popup
                    }}
                  />
                </div>
              </div>
            )}

            {/* Footer Trust Guarantee */}
            <div className="flex items-center justify-center gap-2 pt-2 text-[11px] font-mono text-slate-400 border-t border-[#24324F]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Official Just1Play 256-Bit Encrypted Master Vault Unlock</span>
            </div>
          </div>
        </div>
      )}

    </PageContainer>
  );
};

export default MediaGalleryView;
