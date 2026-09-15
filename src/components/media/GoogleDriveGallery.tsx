'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Folder,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Lock,
  Unlock,
  Download,
  Share2,
  Tag,
  UserPlus,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Search,
  Sliders,
  DollarSign,
  Camera,
  Layers,
  Eye,
  RefreshCw,
  HelpCircle,
  ShoppingBag,
  Check,
  ArrowRight,
  ZoomIn
} from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

export interface TaggedAthlete {
  id: string;
  name: string;
  jerseyNumber: string;
  teamName: string;
  position?: string;
  avatarUrl?: string;
}

export interface DrivePhoto {
  id: string;
  driveFileId: string;
  title: string;
  albumName: string;
  gameId?: string;
  gameTitle?: string;
  teamName?: string;
  division?: string;
  photographerName?: string;
  price: number;
  uploadedAt: string;
  isPurchased?: boolean;
  taggedAthletes: TaggedAthlete[];
}

export interface GoogleDriveGalleryProps {
  initialFolderUrl?: string;
  gameId?: string;
  gameTitle?: string;
  teamName?: string;
  division?: string;
  photographerName?: string;
  pricePerPhoto?: number;
  initialPhotos?: DrivePhoto[];
  onPhotoPurchased?: (photoId: string, driveFileId: string) => void;
  onAthleteTagged?: (photoId: string, athlete: TaggedAthlete) => void;
}

// Sample Athletes from Just One Play Tournament Rosters
const SAMPLE_ROSTER: TaggedAthlete[] = [
  { id: 'ath-1', name: 'Maya "Flash" Williams', jerseyNumber: '#7', teamName: 'Lady Lightning Elite', position: 'QB / WR', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' },
  { id: 'ath-2', name: 'Zoe Jenkins', jerseyNumber: '#12', teamName: 'Lady Lightning Elite', position: 'Cornerback', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80' },
  { id: 'ath-3', name: 'Kendall Rivera', jerseyNumber: '#21', teamName: 'Jersey Shore Wave', position: 'Safety / Rusher', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80' },
  { id: 'ath-4', name: 'Sasha Morozov', jerseyNumber: '#3', teamName: 'NYC Empire Flag', position: 'Slot Receiver', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80' },
  { id: 'ath-5', name: 'Tiana Clark', jerseyNumber: '#88', teamName: 'Philly Blitz', position: 'Center / Blitzer', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80' }
];

// Sample Initial Google Drive Public Photo Collection
const SAMPLE_PHOTOS: DrivePhoto[] = [
  {
    id: 'p1',
    driveFileId: '1p8T0Q9aWbC_example1',
    title: 'Championship Winning Touchdown Catch in Endzone',
    albumName: '16U Girls Summer Championship',
    gameTitle: 'Lady Lightning vs Jersey Shore Wave',
    teamName: 'Lady Lightning Elite',
    division: '16U Girls Flag',
    photographerName: 'Marcus Vance Media',
    price: 5.00,
    uploadedAt: '2026-08-15',
    taggedAthletes: [SAMPLE_ROSTER[0], SAMPLE_ROSTER[1]]
  },
  {
    id: 'p2',
    driveFileId: '1q9U1R0bXcD_example2',
    title: 'Pre-Snap Audibles & Quarterback Cadence',
    albumName: '16U Girls Summer Championship',
    gameTitle: 'Lady Lightning vs Jersey Shore Wave',
    teamName: 'Lady Lightning Elite',
    division: '16U Girls Flag',
    photographerName: 'Marcus Vance Media',
    price: 5.00,
    uploadedAt: '2026-08-15',
    taggedAthletes: [SAMPLE_ROSTER[0]]
  },
  {
    id: 'p3',
    driveFileId: '1r0V2S1cYeE_example3',
    title: 'Sideline Flag Pull on 4th & Goal',
    albumName: '16U Girls Summer Championship',
    gameTitle: 'Lady Lightning vs Jersey Shore Wave',
    teamName: 'Jersey Shore Wave',
    division: '16U Girls Flag',
    photographerName: 'Marcus Vance Media',
    price: 5.00,
    uploadedAt: '2026-08-15',
    taggedAthletes: [SAMPLE_ROSTER[2]]
  },
  {
    id: 'p4',
    driveFileId: '1s1W3T2dZfF_example4',
    title: 'Celebration Huddle Post-Interception Return',
    albumName: '16U Girls Summer Championship',
    gameTitle: 'Lady Lightning vs NYC Empire',
    teamName: 'NYC Empire Flag',
    division: '16U Girls Flag',
    photographerName: 'Just1Play Media Crew',
    price: 5.00,
    uploadedAt: '2026-08-15',
    taggedAthletes: [SAMPLE_ROSTER[3]]
  },
  {
    id: 'p5',
    driveFileId: '1t2X4U3eAgG_example5',
    title: 'Full Speed Blitzer Pursuit Across Center Line',
    albumName: '16U Girls Summer Championship',
    gameTitle: 'NYC Empire vs Philly Blitz',
    teamName: 'Philly Blitz',
    division: '16U Girls Flag',
    photographerName: 'Just1Play Media Crew',
    price: 5.00,
    uploadedAt: '2026-08-15',
    taggedAthletes: [SAMPLE_ROSTER[4]]
  },
  {
    id: 'p6',
    driveFileId: '1u3Y5V4fBhH_example6',
    title: 'Overhead Trophy Presentation & Medal Ceremony',
    albumName: '16U Girls Summer Championship',
    gameTitle: 'Lady Lightning vs Jersey Shore Wave',
    teamName: 'Lady Lightning Elite',
    division: '16U Girls Flag',
    photographerName: 'Marcus Vance Media',
    price: 5.00,
    uploadedAt: '2026-08-15',
    taggedAthletes: [SAMPLE_ROSTER[0], SAMPLE_ROSTER[1], SAMPLE_ROSTER[2]]
  }
];

// Curated high-res sports fallback images for demo/test Drive IDs
const FALLBACK_SPORTS_IMGS: Record<string, string> = {
  '1p8T0Q9aWbC_example1': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80',
  '1q9U1R0bXcD_example2': 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&auto=format&fit=crop&q=80',
  '1r0V2S1cYeE_example3': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80',
  '1s1W3T2dZfF_example4': 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1200&auto=format&fit=crop&q=80',
  '1t2X4U3eAgG_example5': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80',
  '1u3Y5V4fBhH_example6': 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=1200&auto=format&fit=crop&q=80'
};

/**
 * Extracts Google Drive folder or file ID from URL strings or raw IDs
 */
export function extractDriveId(input: string): { type: 'folder' | 'file' | 'unknown'; id: string } {
  const trimmed = input.trim();
  if (!trimmed) return { type: 'unknown', id: '' };

  // Folder Matchers
  const folderMatch = trimmed.match(/folders\/([a-zA-Z0-9_-]{15,})/);
  if (folderMatch && folderMatch[1]) {
    return { type: 'folder', id: folderMatch[1] };
  }

  // File Matchers
  const fileMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (fileMatch && fileMatch[1]) {
    return { type: 'file', id: fileMatch[1] };
  }

  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (idParamMatch && idParamMatch[1]) {
    return { type: 'file', id: idParamMatch[1] };
  }

  // Raw ID heuristic
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return { type: 'folder', id: trimmed };
  }

  return { type: 'unknown', id: trimmed };
}

/**
 * Constructs Direct Google Edge CDN Image URL
 */
export function getGoogleCdnImageUrl(fileId: string, width: number = 600): string {
  if (FALLBACK_SPORTS_IMGS[fileId]) {
    return FALLBACK_SPORTS_IMGS[fileId];
  }
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}

/**
 * Constructs Full-Resolution Direct Original Download URL
 */
export function getGoogleDirectDownloadUrl(fileId: string): string {
  if (FALLBACK_SPORTS_IMGS[fileId]) {
    return FALLBACK_SPORTS_IMGS[fileId];
  }
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function GoogleDriveGallery({
  initialFolderUrl = '',
  gameId = 'game_champ_16u',
  gameTitle = '16U Flag Championship: Lady Lightning vs Jersey Shore Wave',
  teamName = 'Lady Lightning Elite',
  division = '16U Girls Flag',
  photographerName = 'Just1Play Media Squad',
  pricePerPhoto = 5.00,
  initialPhotos = SAMPLE_PHOTOS,
  onPhotoPurchased,
  onAthleteTagged
}: GoogleDriveGalleryProps) {
  // Gallery state
  const [photos, setPhotos] = useState<DrivePhoto[]>(initialPhotos);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set(['p6']));
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [filterAthleteId, setFilterAthleteId] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Folder Ingestion Modal & Pre-Flight State
  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [driveInputUrl, setDriveInputUrl] = useState<string>(initialFolderUrl);
  const [ingestAlbumName, setIngestAlbumName] = useState<string>('Championship Gameday Album');
  const [ingestTeam, setIngestTeam] = useState<string>(teamName);
  const [ingestDivision, setIngestDivision] = useState<string>(division);
  const [ingestPrice, setIngestPrice] = useState<number>(pricePerPhoto);
  const [batchFileIds, setBatchFileIds] = useState<string>('');

  // Pre-Flight Validation State
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'checking' | 'public' | 'restricted' | 'error'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [testedFileId, setTestedFileId] = useState<string | null>(null);

  // Roster Tagging dropdown state in Lightbox
  const [athleteSearch, setAthleteSearch] = useState<string>('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState<boolean>(false);

  // Touch swipe support for Lightbox
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Filtered Photos List
  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      // Athlete Filter
      if (filterAthleteId !== 'all') {
        const hasAthlete = photo.taggedAthletes.some((a) => a.id === filterAthleteId);
        if (!hasAthlete) return false;
      }
      // Team Filter
      if (filterTeam !== 'all') {
        if (photo.teamName !== filterTeam) return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = photo.title.toLowerCase().includes(q);
        const matchesAlbum = photo.albumName.toLowerCase().includes(q);
        const matchesPhotographer = (photo.photographerName || '').toLowerCase().includes(q);
        const matchesTagged = photo.taggedAthletes.some((a) => a.name.toLowerCase().includes(q) || a.jerseyNumber.includes(q));
        if (!matchesTitle && !matchesAlbum && !matchesPhotographer && !matchesTagged) return false;
      }
      return true;
    });
  }, [photos, filterAthleteId, filterTeam, searchQuery]);

  const currentLightboxPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;
  const isCurrentPurchased = currentLightboxPhoto ? purchasedIds.has(currentLightboxPhoto.id) : false;

  // 1. Pre-Flight Permission Probe using Offscreen Image Test
  const testDrivePermission = useCallback((probeFileId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Sample mock files are automatically granted
      if (probeFileId.startsWith('1p8T') || probeFileId.startsWith('1q9U') || probeFileId.startsWith('sample')) {
        resolve(true);
        return;
      }

      const img = new Image();
      let hasFinished = false;

      const timer = setTimeout(() => {
        if (!hasFinished) {
          hasFinished = true;
          img.src = '';
          resolve(false);
        }
      }, 3800);

      img.onload = () => {
        if (!hasFinished) {
          hasFinished = true;
          clearTimeout(timer);
          resolve(true);
        }
      };

      img.onerror = () => {
        if (!hasFinished) {
          hasFinished = true;
          clearTimeout(timer);
          resolve(false);
        }
      };

      // Direct Google CDN lightweight test probe (w50)
      img.src = `https://lh3.googleusercontent.com/d/${probeFileId}=w50`;
    });
  }, []);

  const handleValidateAndIngest = async () => {
    setIsValidating(true);
    setValidationStatus('checking');
    setValidationError(null);

    const extracted = extractDriveId(driveInputUrl);
    if (!extracted.id && !batchFileIds.trim()) {
      setValidationStatus('error');
      setValidationError('Please provide a valid Google Drive folder link or individual File IDs.');
      setIsValidating(false);
      return;
    }

    // Determine candidate file IDs to probe
    let candidateIds: string[] = [];
    if (batchFileIds.trim()) {
      candidateIds = batchFileIds
        .split(/[\n, ]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);
    }

    // If a folder URL was given, synthesize probe file IDs or use given file ID
    if (candidateIds.length === 0) {
      if (extracted.type === 'file') {
        candidateIds = [extracted.id];
      } else {
        // For folder links, use the primary test ID or fallback sample if demoing
        candidateIds = [`probe_${extracted.id.slice(0, 12)}`];
      }
    }

    const testId = candidateIds[0] || '1p8T0Q9aWbC_example1';
    setTestedFileId(testId);

    try {
      const isPublic = await testDrivePermission(testId);
      if (!isPublic) {
        setValidationStatus('restricted');
        setValidationError('Folder is set to "Restricted". Google CDN blocked preview access.');
      } else {
        setValidationStatus('public');
      }
    } catch {
      setValidationStatus('restricted');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommitIngest = () => {
    let idsToAdd: string[] = [];
    if (batchFileIds.trim()) {
      idsToAdd = batchFileIds
        .split(/[\n, ]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);
    }

    if (idsToAdd.length === 0) {
      const extracted = extractDriveId(driveInputUrl);
      idsToAdd = extracted.id ? [extracted.id] : ['1p8T0Q9aWbC_example1'];
    }

    const newPhotos: DrivePhoto[] = idsToAdd.map((fileId, idx) => ({
      id: `imported-${Date.now()}-${idx}`,
      driveFileId: fileId,
      title: `${ingestAlbumName} - Shot #${idx + 1}`,
      albumName: ingestAlbumName,
      gameTitle,
      teamName: ingestTeam,
      division: ingestDivision,
      photographerName: photographerName || 'Verified Contributor',
      price: ingestPrice,
      uploadedAt: new Date().toISOString().split('T')[0],
      taggedAthletes: []
    }));

    setPhotos((prev) => [...newPhotos, ...prev]);
    setIsIngestModalOpen(false);
    setValidationStatus('idle');
    setDriveInputUrl('');
    setBatchFileIds('');
  };

  // 2. Lightbox Navigation
  const handleOpenLightbox = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const handleCloseLightbox = () => {
    setSelectedPhotoIndex(null);
    setIsTagDropdownOpen(false);
  };

  const handlePrevPhoto = useCallback(() => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    } else if (selectedPhotoIndex === 0) {
      setSelectedPhotoIndex(filteredPhotos.length - 1);
    }
  }, [selectedPhotoIndex, filteredPhotos.length]);

  const handleNextPhoto = useCallback(() => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < filteredPhotos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    } else if (selectedPhotoIndex === filteredPhotos.length - 1) {
      setSelectedPhotoIndex(0);
    }
  }, [selectedPhotoIndex, filteredPhotos.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return;
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'Escape') handleCloseLightbox();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, handlePrevPhoto, handleNextPhoto]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) handleNextPhoto();
    if (isRightSwipe) handlePrevPhoto();

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // 3. Tagging athlete to active photo
  const handleToggleAthleteTag = (athlete: TaggedAthlete) => {
    if (!currentLightboxPhoto) return;

    const photoId = currentLightboxPhoto.id;
    const isAlreadyTagged = currentLightboxPhoto.taggedAthletes.some((a) => a.id === athlete.id);

    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p;
        if (isAlreadyTagged) {
          return {
            ...p,
            taggedAthletes: p.taggedAthletes.filter((a) => a.id !== athlete.id)
          };
        } else {
          return {
            ...p,
            taggedAthletes: [...p.taggedAthletes, athlete]
          };
        }
      })
    );

    if (!isAlreadyTagged) {
      onAthleteTagged?.(photoId, athlete);
    }
  };

  // 4. Instant Purchase / Unlock
  const handleUnlockPhoto = (photoId: string, driveFileId: string) => {
    setPurchasedIds((prev) => new Set([...prev, photoId]));
    onPhotoPurchased?.(photoId, driveFileId);
  };

  return (
    <div className="w-full bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
      
      {/* Top Header & Ingestion Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Folder className="w-3.5 h-3.5 text-teal-400" />
            <span>Google Drive Edge CDN Media Vault</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
            <span>{gameTitle}</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <span>{division}</span>
            <span>&bull;</span>
            <span className="text-teal-400">Zero Serverless Fees &bull; Instant Edge Streaming</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsIngestModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20 active:scale-95 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Drive Album</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by play, jersey #, athlete name, or album..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Athlete Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span>Athlete:</span>
            <select
              value={filterAthleteId}
              onChange={(e) => setFilterAthleteId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-teal-400 cursor-pointer"
            >
              <option value="all">All Athletes ({photos.length})</option>
              {SAMPLE_ROSTER.map((ath) => (
                <option key={ath.id} value={ath.id}>
                  {ath.name} ({ath.jerseyNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Team:</span>
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">All Teams</option>
              <option value="Lady Lightning Elite">Lady Lightning Elite</option>
              <option value="Jersey Shore Wave">Jersey Shore Wave</option>
              <option value="NYC Empire Flag">NYC Empire Flag</option>
              <option value="Philly Blitz">Philly Blitz</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fast CDN Masonry Grid (2 mobile, 3 tablet, 4 desktop) */}
      {filteredPhotos.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl space-y-3">
          <Camera className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-300">No photos match your filter</h4>
          <p className="text-xs text-slate-500 font-mono max-w-sm mx-auto">
            Try adjusting your search keywords, athlete filter, or import additional Google Drive albums.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredPhotos.map((photo, index) => {
            const isPurchased = purchasedIds.has(photo.id);
            const thumbUrl = getGoogleCdnImageUrl(photo.driveFileId, 600);

            return (
              <div
                key={photo.id}
                onClick={() => handleOpenLightbox(index)}
                className="group relative aspect-[4/3] sm:aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-teal-500/60 transition-all duration-300 shadow-lg cursor-pointer flex flex-col justify-between select-none"
              >
                {/* Thumbnail Image with lazy load & blur-up */}
                <img
                  src={thumbUrl}
                  alt={photo.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />

                {/* Diagonal Semi-Transparent Watermark for Unpurchased Photos */}
                {!isPurchased && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10">
                    <div className="transform -rotate-25 bg-black/40 backdrop-blur-[1px] border-y border-white/20 px-8 py-1.5 text-center shadow-2xl w-[140%]">
                      <span className="text-[10px] sm:text-xs font-black uppercase font-mono tracking-widest text-white/70 drop-shadow-md">
                        JUST ONE PLAY • PREVIEW
                      </span>
                    </div>
                  </div>
                )}

                {/* Top Corner Badges */}
                <div className="relative z-20 p-2 sm:p-3 flex items-center justify-between gap-1 pointer-events-none">
                  {isPurchased ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/90 text-slate-950 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-teal-300 text-[10px] font-mono font-black uppercase tracking-wider shadow-md">
                      ${photo.price.toFixed(2)}
                    </span>
                  )}

                  {photo.taggedAthletes.length > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-slate-300 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-400" />
                      <span>{photo.taggedAthletes.length}</span>
                    </span>
                  )}
                </div>

                {/* Hover / Tap Bottom Action Overlay */}
                <div className="relative z-20 p-2 sm:p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between">
                  <div className="truncate max-w-[70%] text-[11px] font-mono font-bold text-white">
                    <span className="truncate block">{photo.title}</span>
                    <span className="text-[9px] text-slate-400 font-normal truncate block">
                      {photo.teamName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="p-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition shadow-md"
                      title="Enlarge Photo"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Fullscreen Modal */}
      {selectedPhotoIndex !== null && currentLightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-2 sm:p-6 select-none animate-in fade-in duration-200"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Lightbox Top Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 px-2 sm:px-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
                {selectedPhotoIndex + 1} of {filteredPhotos.length}
              </span>
              <div className="hidden sm:block">
                <h3 className="text-sm font-bold text-white truncate max-w-md">
                  {currentLightboxPhoto.title}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {currentLightboxPhoto.albumName} &bull; {currentLightboxPhoto.teamName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isCurrentPurchased ? (
                <a
                  href={getGoogleDirectDownloadUrl(currentLightboxPhoto.driveFileId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download High-Res Original</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUnlockPhoto(currentLightboxPhoto.id, currentLightboxPhoto.driveFileId)}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-teal-500/20 transition cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Unlock Original (${currentLightboxPhoto.price.toFixed(2)})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCloseLightbox}
                className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                title="Close Lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Center Stage (Photo + Nav Buttons) */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
            {/* Prev Button */}
            <button
              type="button"
              onClick={handlePrevPhoto}
              className="absolute left-2 sm:left-4 z-30 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 backdrop-blur-md transition shadow-2xl cursor-pointer"
              title="Previous Photo (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* High-Resolution CDN Image */}
            <div className="relative max-w-full max-h-[72vh] flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl">
              <img
                src={getGoogleCdnImageUrl(currentLightboxPhoto.driveFileId, 1600)}
                alt={currentLightboxPhoto.title}
                className="max-w-full max-h-[72vh] object-contain rounded-2xl select-none"
              />

              {/* Watermark in Lightbox if Unpurchased */}
              {!isCurrentPurchased && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                  <div className="transform -rotate-25 bg-black/40 backdrop-blur-[2px] border-y border-white/20 px-12 py-3 text-center shadow-2xl w-[150%]">
                    <span className="text-base sm:text-xl font-black uppercase font-mono tracking-widest text-white/80 drop-shadow-lg">
                      JUST ONE PLAY • OFFICIAL GAME FILM WATERMARK
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNextPhoto}
              className="absolute right-2 sm:right-4 z-30 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 backdrop-blur-md transition shadow-2xl cursor-pointer"
              title="Next Photo (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Bottom Footer & Roster Tagger Controls */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Tagged Athletes Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-400" />
                <span>Tagged Athletes:</span>
              </span>

              {currentLightboxPhoto.taggedAthletes.map((athlete) => (
                <span
                  key={athlete.id}
                  className="px-2.5 py-1 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold flex items-center gap-1.5"
                >
                  <span>{athlete.jerseyNumber} {athlete.name}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleAthleteTag(athlete)}
                    className="hover:text-rose-400 ml-1 text-slate-400"
                    title="Remove Tag"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Add Tag Dropdown Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                  className="px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-300 flex items-center gap-1 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Tag Player</span>
                </button>

                {isTagDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow-2xl z-50 space-y-2">
                    <div className="text-[11px] font-mono font-bold uppercase text-slate-400">
                      Tag Roster Athlete
                    </div>
                    <input
                      type="text"
                      value={athleteSearch}
                      onChange={(e) => setAthleteSearch(e.target.value)}
                      placeholder="Search player name..."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-teal-400"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {SAMPLE_ROSTER.filter((a) =>
                        a.name.toLowerCase().includes(athleteSearch.toLowerCase()) ||
                        a.jerseyNumber.includes(athleteSearch)
                      ).map((athlete) => {
                        const isTagged = currentLightboxPhoto.taggedAthletes.some((a) => a.id === athlete.id);
                        return (
                          <button
                            key={athlete.id}
                            type="button"
                            onClick={() => handleToggleAthleteTag(athlete)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                              isTagged
                                ? 'bg-teal-500/20 text-teal-300 font-bold'
                                : 'text-slate-300 hover:bg-slate-900'
                            }`}
                          >
                            <span>{athlete.jerseyNumber} {athlete.name}</span>
                            {isTagged ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <span className="text-[10px] text-slate-500">{athlete.teamName}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Instant PayPal Checkout Section */}
            {!isCurrentPurchased && (
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="text-right font-mono hidden sm:block">
                  <span className="text-[10px] uppercase text-slate-400 block">Single License</span>
                  <span className="text-sm font-black text-white">${currentLightboxPhoto.price.toFixed(2)}</span>
                </div>

                <PayPalScriptProvider options={{ clientId: 'test', currency: 'USD' }}>
                  <div className="w-40">
                    <PayPalButtons
                      style={{ layout: 'horizontal', height: 35, tagline: false }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: 'CAPTURE',
                          purchase_units: [
                            {
                              description: currentLightboxPhoto.title,
                              amount: {
                                currency_code: 'USD',
                                value: currentLightboxPhoto.price.toFixed(2)
                              }
                            }
                          ]
                        });
                      }}
                      onApprove={async (data, actions) => {
                        if (actions.order) {
                          await actions.order.capture();
                          handleUnlockPhoto(currentLightboxPhoto.id, currentLightboxPhoto.driveFileId);
                        }
                      }}
                    />
                  </div>
                </PayPalScriptProvider>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pre-Flight Folder Ingestion Modal with 4-Step Interactive Fix Walkthrough */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tight text-white">
                    Import Google Drive Album
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Direct Edge CDN streaming &bull; Zero storage costs
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsIngestModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ingestion Form */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5 font-mono">
                  Google Drive Folder Link or Shared URL
                </label>
                <input
                  type="text"
                  value={driveInputUrl}
                  onChange={(e) => {
                    setDriveInputUrl(e.target.value);
                    setValidationStatus('idle');
                  }}
                  placeholder="https://drive.google.com/drive/folders/1wX..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5 font-mono">
                  Batch File IDs (Optional - Paste one per line)
                </label>
                <textarea
                  rows={2}
                  value={batchFileIds}
                  onChange={(e) => {
                    setBatchFileIds(e.target.value);
                    setValidationStatus('idle');
                  }}
                  placeholder="1p8T0Q9aWbC_example1&#10;1q9U1R0bXcD_example2"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5 font-mono">
                    Album Name
                  </label>
                  <input
                    type="text"
                    value={ingestAlbumName}
                    onChange={(e) => setIngestAlbumName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5 font-mono">
                    Default Photo Price ($ USD)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    value={ingestPrice}
                    onChange={(e) => setIngestPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>
            </div>

            {/* Pre-Flight Test Validation Banner */}
            {validationStatus === 'checking' && (
              <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono flex items-center gap-3 animate-pulse">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Pinging Google Edge CDN probe (`lh3.googleusercontent.com/d/{testedFileId}=w50`)...</span>
              </div>
            )}

            {validationStatus === 'public' && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-mono space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Access Confirmed: Google Edge CDN Reachable!</span>
                </div>
                <p className="text-slate-300">
                  Folder is publicly readable. You can publish this album immediately.
                </p>
              </div>
            )}

            {/* 4-Step Interactive Fix Walkthrough for Restricted Folders */}
            {validationStatus === 'restricted' && (
              <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-4 text-xs font-mono">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5" />
                  <span>Google Drive Access Restricted</span>
                </div>
                <p className="text-slate-300">
                  The Google Edge CDN could not load the preview thumbnail. Follow these 4 steps in Google Drive to enable viewer access:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-200">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-teal-400 block">Step 1: Open Share</span>
                    <span className="text-[11px] text-slate-400">Open your Google Drive folder and click the blue <strong>Share</strong> button.</span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-teal-400 block">Step 2: General Access</span>
                    <span className="text-[11px] text-slate-400">Under <em>General access</em>, change <strong>Restricted</strong> to <strong>Anyone with the link</strong>.</span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-teal-400 block">Step 3: Set Role to Viewer</span>
                    <span className="text-[11px] text-slate-400">Ensure the dropdown is set to <strong>Viewer</strong> (no Google sign-in required).</span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-teal-400 block">Step 4: Re-Test</span>
                    <span className="text-[11px] text-slate-400">Copy the updated link and click <strong>Test Permission Again</strong> below.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsIngestModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs uppercase"
              >
                Cancel
              </button>

              {validationStatus === 'public' ? (
                <button
                  type="button"
                  onClick={handleCommitIngest}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Publish Album to Gallery</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleValidateAndIngest}
                  disabled={isValidating}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer"
                >
                  {isValidating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{validationStatus === 'restricted' ? 'Test Permission Again' : 'Validate & Ingest'}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default GoogleDriveGallery;
