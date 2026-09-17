import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';
import { 
  Search, 
  Star, 
  ShieldCheck, 
  Play, 
  X, 
  ExternalLink, 
  Flame, 
  SlidersHorizontal, 
  RotateCcw, 
  Sparkles, 
  Users, 
  Video, 
  CheckCircle2, 
  Trophy, 
  Award, 
  Zap, 
  GraduationCap,
  LayoutGrid,
  Crosshair
} from 'lucide-react';
import { LaserCombineLeaderboard } from './LaserCombineLeaderboard';

export interface ProspectAthlete {
  id: string;
  uid: string;
  displayName: string;
  nickname: string;
  avatarUrl: string;
  isVerified: boolean;
  isLaserVerified: boolean;
  position: string;
  secondaryPosition?: string;
  jerseyNumber: string;
  gradYear: string | number;
  school: string;
  clubTeam: string;
  teamName: string;
  dash40Display: string;
  dash40Numeric: number | null;
  vertDisplay: string;
  vertNumeric: number | null;
  sizeDisplay: string;
  gpaDisplay: string;
  gpaNumeric: number | null;
  highlightCount: number;
  mediaUrls: Array<{ id?: string; title?: string; url: string; provider?: string }>;
  topReelUrl: string;
  scoutRating: string;
  rawDoc: any;
}

const LOCAL_WATCHLIST_KEY = 'just1play_recruiter_watchlist_v1';

// Helper to convert varied video links into embeddable URLs
function getEmbedVideoUrl(rawUrl: string): { embedUrl: string; isNativeVideo: boolean; directUrl: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
      isNativeVideo: false,
      directUrl: rawUrl || ''
    };
  }

  const url = rawUrl.trim();

  // 1. YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (url.includes('shorts/')) {
      videoId = url.split('shorts/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || '';
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0] || '';
    }
    if (videoId) {
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
        isNativeVideo: false,
        directUrl: url
      };
    }
  }

  // 2. Vimeo
  if (url.includes('vimeo.com')) {
    const parts = url.split('/');
    const vimeoId = parts[parts.length - 1]?.split('?')[0] || '';
    if (vimeoId && !isNaN(Number(vimeoId))) {
      return {
        embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
        isNativeVideo: false,
        directUrl: url
      };
    }
  }

  // 3. Direct MP4 or WebM video
  if (url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('.mp4?') || url.includes('firebasestorage.googleapis.com')) {
    return {
      embedUrl: url,
      isNativeVideo: true,
      directUrl: url
    };
  }

  // 4. Fallback: treat as external embed or direct iframe
  return {
    embedUrl: url,
    isNativeVideo: false,
    directUrl: url
  };
}

// Normalize incoming Firestore document data with defensive fallbacks
function normalizeAthleteDoc(docSnap: any): ProspectAthlete {
  const data = docSnap.data ? docSnap.data() : docSnap;
  const uid = docSnap.id || data.uid || data.id || `ath-${Math.random().toString(36).substring(2, 8)}`;

  // Display Name & Nickname
  let displayName = data.displayName || data.name || '';
  if (!displayName && (data.firstName || data.lastName)) {
    displayName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
  }
  if (!displayName) {
    displayName = 'Prospect Athlete';
  }

  let nickname = data.nickname || data.nickName || '';
  // Check if displayName already contains nickname in quotes e.g. 'Kevon "Flash" Bailey'
  if (!nickname && displayName.includes('"')) {
    const match = displayName.match(/"([^"]+)"/);
    if (match && match[1]) {
      nickname = match[1];
      displayName = displayName.replace(/"([^"]+)"/, '').replace(/\s+/g, ' ').trim();
    }
  }

  // Avatar / Photo
  const avatarUrl = data.photoURL || data.avatarUrl || data.avatar || 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&auto=format&fit=crop&q=80';

  // Verified Status (isVerified || isLaserVerified)
  const isVerified = Boolean(
    data.isVerified === true || 
    data.verified === true || 
    data.isLaserVerified === true ||
    data.metrics?.verified === true ||
    data.metrics?.verifiedLaser === true ||
    data.isNCAAPro === true
  );

  const isLaserVerified = Boolean(
    data.isLaserVerified === true ||
    data.metrics?.verifiedLaser === true ||
    data.combine?.laserVerified === true ||
    data.isVerified === true
  );

  // Position & Secondary Position
  const position = data.position || data.primaryPosition || data.sportsRole || data.combine?.primaryPosition || 'Athlete';
  const secondaryPosition = data.secondaryPosition || data.combine?.secondaryPosition || '';

  // Jersey Number
  let jerseyNumber = '';
  if (data.jerseyNumber !== undefined && data.jerseyNumber !== null && String(data.jerseyNumber).trim()) {
    jerseyNumber = String(data.jerseyNumber).replace('#', '').trim();
  } else if (data.jersey !== undefined && data.jersey !== null && String(data.jersey).trim()) {
    jerseyNumber = String(data.jersey).replace('#', '').trim();
  }

  // Grad Year
  const gradYear = data.gradYear || data.graduationYear || data.class || '2026';

  // High School, Club Team, and Team Name
  const school = data.highSchool || data.school || data.schoolName || data.teamName || '—';
  const clubTeam = data.clubTeam || data.club || data.aauTeam || '';
  const teamName = data.teamName || data.team || data.organization || clubTeam || '';

  // Forty Laser / 40-Yard Dash: athlete?.combine?.fortyLaser ?? "—"
  let dash40Numeric: number | null = null;
  let dash40Display = '—';
  const rawDash = data.combine?.fortyLaser ?? data.combine?.forty ?? data.metrics?.fortyLaser ?? data.metrics?.fortyYard ?? data.metrics?.dash40 ?? data.dash40 ?? data.speed40 ?? data.stats?.dash40;
  if (rawDash !== undefined && rawDash !== null && rawDash !== '' && !isNaN(Number(rawDash))) {
    const val = Number(rawDash);
    if (val > 3.0 && val < 9.0) {
      dash40Numeric = val;
      dash40Display = `${val.toFixed(2)}s`;
    }
  }

  // Vertical Jump: athlete?.combine?.vertical ? athlete.combine.vertical + '"' : "—"
  let vertNumeric: number | null = null;
  let vertDisplay = '—';
  const rawVert = data.combine?.vertical ?? data.combine?.verticalJump ?? data.metrics?.verticalJump ?? data.metrics?.vertLeap ?? data.metrics?.vertical ?? data.vertLeap ?? data.vertical ?? data.stats?.vertical;
  if (rawVert !== undefined && rawVert !== null && rawVert !== '' && !isNaN(Number(rawVert))) {
    const val = Number(rawVert);
    if (val > 10 && val < 60) {
      vertNumeric = val;
      vertDisplay = `${val.toFixed(1)}"`;
    }
  }

  // Size / Height: athlete?.height || athlete?.combine?.sizeHeight || "—"
  let sizeDisplay = '—';
  const rawHeight = data.height || data.combine?.sizeHeight || data.combine?.height || data.metrics?.height || '';
  const rawWeight = data.weight || data.combine?.weight || data.metrics?.weight || '';
  if (rawHeight && rawWeight) {
    sizeDisplay = `${rawHeight} • ${rawWeight}`;
  } else if (rawHeight) {
    sizeDisplay = String(rawHeight);
  } else if (rawWeight) {
    sizeDisplay = String(rawWeight);
  } else if (data.combine?.sizeHeight) {
    sizeDisplay = String(data.combine.sizeHeight);
  }

  // GPA: athlete?.gpa ?? "—"
  let gpaNumeric: number | null = null;
  let gpaDisplay = '—';
  const rawGpa = data.gpa ?? data.combine?.gpa ?? data.metrics?.gpa ?? data.academic?.gpa;
  if (rawGpa !== undefined && rawGpa !== null && rawGpa !== '' && !isNaN(Number(rawGpa))) {
    const val = Number(rawGpa);
    if (val >= 0.0 && val <= 5.0) {
      gpaNumeric = val;
      gpaDisplay = val.toFixed(2);
    }
  }

  // Media / Film clips
  const rawMediaList = Array.isArray(data.mediaUrls) ? data.mediaUrls : [];
  const rawHighlightUrls = Array.isArray(data.highlightUrls) ? data.highlightUrls : [];
  const rawVideoUrls = Array.isArray(data.videoUrls) ? data.videoUrls : [];
  
  const parsedMedia: Array<{ id?: string; title?: string; url: string; provider?: string }> = [];

  rawMediaList.forEach((item: any, idx: number) => {
    if (typeof item === 'string' && item.trim()) {
      parsedMedia.push({ id: `media-${idx}`, title: `Highlight Tape #${idx + 1}`, url: item });
    } else if (item && typeof item === 'object' && item.url) {
      parsedMedia.push({
        id: item.id || `media-${idx}`,
        title: item.title || `Highlight Tape #${idx + 1}`,
        url: item.url,
        provider: item.provider
      });
    }
  });

  rawHighlightUrls.forEach((url: string, idx: number) => {
    if (url && typeof url === 'string' && !parsedMedia.some(m => m.url === url)) {
      parsedMedia.push({ id: `hl-${idx}`, title: `Game Film Reel #${idx + 1}`, url });
    }
  });

  rawVideoUrls.forEach((url: string, idx: number) => {
    if (url && typeof url === 'string' && !parsedMedia.some(m => m.url === url)) {
      parsedMedia.push({ id: `vu-${idx}`, title: `Video Reel #${idx + 1}`, url });
    }
  });

  if (data.featuredHighlightUrl && !parsedMedia.some(m => m.url === data.featuredHighlightUrl)) {
    parsedMedia.unshift({
      id: 'featured-1',
      title: data.featuredHighlightTitle || 'Top Scout Showcase Reel',
      url: data.featuredHighlightUrl
    });
  }

  // Highlight Film Count: athlete?.highlightCount ?? (athlete?.videoUrls?.length || 0)
  const highlightCount = data.highlightCount ?? (
    rawVideoUrls.length > 0 ? rawVideoUrls.length :
    parsedMedia.length > 0 ? parsedMedia.length :
    (data.featuredHighlightUrl || data.videoUrl ? 1 : 0)
  );

  const topReelUrl = parsedMedia[0]?.url || data.featuredHighlightUrl || data.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-american-football-game-under-stadium-lights-42589-large.mp4';

  // Overall Scout Rating
  let scoutRating = '94.5';
  const rawRating = data.seasonStats?.rating ?? data.rating ?? data.scoutRating ?? data.metrics?.rating;
  if (rawRating !== undefined && rawRating !== null && !isNaN(Number(rawRating))) {
    scoutRating = Number(rawRating).toFixed(1);
  } else if (gpaNumeric && dash40Numeric) {
    // Deterministic synthetic calculation if unset
    const score = 90 + (gpaNumeric * 1.5) + (5.0 - dash40Numeric) * 3;
    scoutRating = Math.min(99.4, Math.max(88.0, score)).toFixed(1);
  }

  return {
    id: uid,
    uid,
    displayName,
    nickname,
    avatarUrl,
    isVerified,
    isLaserVerified,
    position,
    secondaryPosition,
    jerseyNumber,
    gradYear,
    school,
    clubTeam,
    teamName,
    dash40Display,
    dash40Numeric,
    vertDisplay,
    vertNumeric,
    sizeDisplay,
    gpaDisplay,
    gpaNumeric,
    highlightCount,
    mediaUrls: parsedMedia,
    topReelUrl,
    scoutRating,
    rawDoc: data
  };
}

export interface ProspectDiscoveryMatrixProps {
  initialView?: 'matrix' | 'leaderboard';
}

export function ProspectDiscoveryMatrix({ initialView = 'matrix' }: ProspectDiscoveryMatrixProps) {
  const { user, profile, bookmarks: authBookmarks, toggleBookmark: authToggleBookmark } = useAuth();
  
  // View Switcher: Matrix Card Grid vs Laser Combine Leaderboard
  const [viewMode, setViewMode] = useState<'matrix' | 'leaderboard'>(initialView);

  // Real-time Firestore state
  const [athletes, setAthletes] = useState<ProspectAthlete[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Local Watchlist fallback/cache sync
  const [localWatchlist, setLocalWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_WATCHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Multi-Filter Engine states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<string>('All');
  const [selectedGradYear, setSelectedGradYear] = useState<string>('All');
  const [selectedSpeed, setSelectedSpeed] = useState<string>('All');
  const [selectedGpa, setSelectedGpa] = useState<string>('All');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  // Video Preview Modal state
  const [previewAthlete, setPreviewAthlete] = useState<ProspectAthlete | null>(null);

  // Merge Watchlist from AuthContext and local state
  const isBookmarked = (id: string) => {
    return (authBookmarks && authBookmarks.includes(id)) || localWatchlist.includes(id);
  };

  // Recruiter Shortlist Hook: Star bookmark updates recruiter's savedAthletes array in Firestore + localStorage
  const handleToggleWatchlist = async (athleteId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    const isAlreadySaved = isBookmarked(athleteId);

    // 1. Toggle in AuthContext
    if (authToggleBookmark) {
      authToggleBookmark(athleteId).catch(() => {});
    }

    // 2. Direct Firestore update on recruiter's doc if logged in
    if (user?.uid) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          savedAthletes: isAlreadySaved ? arrayRemove(athleteId) : arrayUnion(athleteId),
          bookmarkedAthleteIds: isAlreadySaved ? arrayRemove(athleteId) : arrayUnion(athleteId)
        });
      } catch (err) {
        console.warn('Firestore savedAthletes update notice:', err);
      }
    }

    // 3. Local storage fallback for instant offline / guest reliability
    setLocalWatchlist((prev) => {
      const updated = prev.includes(athleteId) ? prev.filter(item => item !== athleteId) : [...prev, athleteId];
      try {
        localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save watchlist to localStorage:', err);
      }
      return updated;
    });
  };

  // 1. Live Real-time Firestore Feed from `/users` where `role == 'athlete'`
  useEffect(() => {
    setLoading(true);
    setDbError(null);

    const usersPath = 'users';
    try {
      const q = query(
        collection(db, usersPath),
        where('role', '==', 'athlete')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const prospectList: ProspectAthlete[] = [];
          snapshot.forEach((docSnap) => {
            const normalized = normalizeAthleteDoc(docSnap);
            prospectList.push(normalized);
          });

          setAthletes(prospectList);
          setLoading(false);
          setDbError(null);
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, usersPath);
          } catch (e) {
            // Logged as JSON error
          }
          setDbError('Unable to sync live prospect database in real time.');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.LIST, usersPath);
      } catch (e) {
        // Logged as JSON error
      }
      setDbError('Error initializing prospect query.');
      setLoading(false);
    }
  }, []);

  // 2. Multi-Filter Engine (Client-side fast filter over live data)
  const filteredAthletes = useMemo(() => {
    return athletes.filter((ath) => {
      // 1. Text Search Query: Filters live athletes by Name, School, Club Team, or Primary Position
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = ath.displayName.toLowerCase().includes(q);
        const nickMatch = ath.nickname.toLowerCase().includes(q);
        const schoolMatch = ath.school.toLowerCase().includes(q);
        const clubMatch = ath.clubTeam.toLowerCase().includes(q);
        const teamMatch = ath.teamName.toLowerCase().includes(q);
        const posMatch = ath.position.toLowerCase().includes(q);
        const secPosMatch = ath.secondaryPosition?.toLowerCase().includes(q);

        if (!nameMatch && !nickMatch && !schoolMatch && !clubMatch && !teamMatch && !posMatch && !secPosMatch) {
          return false;
        }
      }

      // 2. Position Filter: All, Quarterback, Wide Receiver, Point Guard, Linebacker, Rusher, Defensive Back
      if (selectedPosition !== 'All') {
        const targetPos = selectedPosition.toLowerCase();
        const athPos = (ath.position + ' ' + (ath.secondaryPosition || '')).toLowerCase();

        let matchesPosition = false;
        if (targetPos === 'quarterback' && (athPos.includes('qb') || athPos.includes('quarterback') || athPos.includes('passer'))) {
          matchesPosition = true;
        } else if (targetPos === 'wide receiver' && (athPos.includes('wr') || athPos.includes('receiver') || athPos.includes('slot'))) {
          matchesPosition = true;
        } else if (targetPos === 'point guard' && (athPos.includes('pg') || athPos.includes('point guard') || athPos.includes('guard'))) {
          matchesPosition = true;
        } else if (targetPos === 'linebacker' && (athPos.includes('lb') || athPos.includes('linebacker') || athPos.includes('mlb') || athPos.includes('olb'))) {
          matchesPosition = true;
        } else if (targetPos === 'rusher' && (athPos.includes('rush') || athPos.includes('edge') || athPos.includes('de') || athPos.includes('defensive end'))) {
          matchesPosition = true;
        } else if (targetPos === 'defensive back' && (athPos.includes('db') || athPos.includes('cb') || athPos.includes('corner') || athPos.includes('safety') || athPos.includes('defensive back'))) {
          matchesPosition = true;
        } else if (athPos.includes(targetPos)) {
          matchesPosition = true;
        }

        if (!matchesPosition) return false;
      }

      // 3. Class Filter: All, 2026, 2027, 2028+
      if (selectedGradYear !== 'All') {
        const gradNum = Number(ath.gradYear);
        if (selectedGradYear === '2026' && String(ath.gradYear) !== '2026' && gradNum !== 2026) return false;
        if (selectedGradYear === '2027' && String(ath.gradYear) !== '2027' && gradNum !== 2027) return false;
        if (selectedGradYear === '2028+') {
          if (!isNaN(gradNum) && gradNum < 2028) return false;
          if (isNaN(gradNum) && String(ath.gradYear) !== '2028' && String(ath.gradYear) !== '2029' && String(ath.gradYear) !== '2030') return false;
        }
      }

      // 4. Speed Filter: All, < 4.5s, < 4.7s
      if (selectedSpeed === '< 4.5s') {
        if (ath.dash40Numeric === null || ath.dash40Numeric >= 4.5) return false;
      } else if (selectedSpeed === '< 4.7s') {
        if (ath.dash40Numeric === null || ath.dash40Numeric >= 4.7) return false;
      }

      // 5. GPA Filter: All, > 3.5, > 3.8
      if (selectedGpa === '> 3.5') {
        if (ath.gpaNumeric === null || ath.gpaNumeric < 3.5) return false;
      } else if (selectedGpa === '> 3.8') {
        if (ath.gpaNumeric === null || ath.gpaNumeric < 3.8) return false;
      }

      // 6. Verified Toggle: When active, only shows athletes with isVerified === true or isLaserVerified === true
      if (verifiedOnly && !(ath.isVerified || ath.isLaserVerified)) {
        return false;
      }

      return true;
    });
  }, [athletes, searchQuery, selectedPosition, selectedGradYear, selectedSpeed, selectedGpa, verifiedOnly]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPosition('All');
    setSelectedGradYear('All');
    setSelectedSpeed('All');
    setSelectedGpa('All');
    setVerifiedOnly(false);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || 
    selectedPosition !== 'All' || 
    selectedGradYear !== 'All' || 
    selectedSpeed !== 'All' || 
    selectedGpa !== 'All' || 
    verifiedOnly
  );

  return (
    <div className="space-y-6 select-none animate-fadeIn pb-12">
      
      {/* 1. SEARCH & MATRIX HERO BAR */}
      <div className="relative overflow-hidden bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] space-y-4">
        
        {/* Subtle HUD Ambient Glows */}
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-[#FFB703]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-[#00F5D4]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#FFB703]/15 border border-[#FFB703]/30 text-[#FFB703] text-[11px] font-mono font-bold uppercase tracking-wider">
              <Zap className="w-3 h-3 animate-pulse" />
              <span>LIVE FIRESTORE TALENT MATRIX</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              {viewMode === 'matrix' ? (
                <>
                  <Search className="w-5 h-5 text-[#FFB703]" />
                  <span>Prospect Discovery Matrix</span>
                </>
              ) : (
                <>
                  <Trophy className="w-5 h-5 text-[#FFC857]" />
                  <span>Laser Combine Leaderboard</span>
                </>
              )}
            </h1>
            
            <p className="text-xs text-slate-400 font-medium">
              {viewMode === 'matrix' 
                ? 'High-speed multi-attribute recruiting engine powered by verified combine telemetry & live roster feeds.'
                : 'Certified optical laser times across 40-Yard Dash, 5-10-5 Shuttle, Vertical Jump, and Composite Index.'
              }
            </p>
          </div>

          {/* Top Right: View Switcher Toggle & Live Counter */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            
            {/* View Switcher Toggle Button Group */}
            <div className="inline-flex p-1 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
              <button
                id="toggle-view-matrix"
                onClick={() => setViewMode('matrix')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-[#FFB703] text-slate-950 shadow-[0_0_12px_rgba(255,183,3,0.35)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>SCOUT MATRIX ROSTER</span>
              </button>

              <button
                id="toggle-view-leaderboard"
                onClick={() => setViewMode('leaderboard')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'leaderboard'
                    ? 'bg-[#00B8D4] text-[#090D16] shadow-[0_0_12px_rgba(0,184,212,0.35)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>COMBINE LEADERBOARD</span>
              </button>
            </div>

            {/* Live Counter in Top Right (Matrix View) */}
            {viewMode === 'matrix' && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-[#FFB703]/40 shadow-[0_0_15px_rgba(255,183,3,0.15)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono font-black text-[#FFB703]">
                  {loading ? 'SYNCING...' : `${filteredAthletes.length} Prospects Found`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Search Input for Matrix View */}
        {viewMode === 'matrix' && (
          <div className="relative z-10">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="prospect-matrix-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by athlete name, nickname, school, club team, or position..."
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-950 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFB703] focus:ring-1 focus:ring-[#FFB703]/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full bg-slate-800 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* RENDER ACTIVE VIEW: LEADERBOARD TABLE VIEW VS MATRIX CARD GRID VIEW */}
      {viewMode === 'leaderboard' ? (
        <LaserCombineLeaderboard 
          onSwitchToMatrix={() => setViewMode('matrix')} 
          showHeroBanner={false} 
        />
      ) : (
        <>
          {/* 2. MULTI-FILTER ENGINE CHIPS */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-4 sm:p-5 space-y-4 backdrop-blur-xl shadow-lg">
        
        {/* Position Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider shrink-0 min-w-[70px]">
            Position:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {[
              'All', 
              'Quarterback', 
              'Wide Receiver', 
              'Point Guard', 
              'Linebacker', 
              'Rusher', 
              'Defensive Back'
            ].map((pos) => {
              const isActive = selectedPosition === pos;
              return (
                <button
                  key={pos}
                  id={`filter-pos-${pos.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setSelectedPosition(pos)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#FFB703] text-slate-950 shadow-[0_0_12px_rgba(255,183,3,0.35)] font-black border border-[#FFB703]'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {pos}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter Row: Class, Speed, GPA & Verified Toggle */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800/80">
          
          {/* Class Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Class:</span>
            {['All', '2026', '2027', '2028+'].map((yr) => {
              const isActive = selectedGradYear === yr;
              return (
                <button
                  key={yr}
                  id={`filter-class-${yr.toLowerCase().replace('+', '-plus')}`}
                  onClick={() => setSelectedGradYear(yr)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>

          {/* Speed Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Speed:</span>
            {['All', '< 4.5s', '< 4.7s'].map((spd) => {
              const isActive = selectedSpeed === spd;
              return (
                <button
                  key={spd}
                  id={`filter-speed-${spd.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                  onClick={() => setSelectedSpeed(spd)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#00F5D4] text-slate-950 font-black shadow-[0_0_12px_rgba(0,245,212,0.35)]'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                >
                  {spd}
                </button>
              );
            })}
          </div>

          {/* GPA Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">GPA:</span>
            {['All', '> 3.5', '> 3.8'].map((g) => {
              const isActive = selectedGpa === g;
              return (
                <button
                  key={g}
                  id={`filter-gpa-${g.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                  onClick={() => setSelectedGpa(g)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-400 text-slate-950 font-black shadow-[0_0_12px_rgba(129,140,248,0.35)]'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {/* Verified Toggle */}
          <button
            id="filter-toggle-verified"
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              verifiedOnly
                ? 'bg-emerald-400 text-slate-950 font-black shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Only</span>
          </button>

          {/* Reset Filters CTA if active */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="ml-auto min-h-[44px] px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. PROSPECTS GRID / EMPTY STATES */}
      {loading ? (
        /* Loading Skeleton State */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-2xl bg-slate-800" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-800 rounded w-1/2" />
                  <div className="h-3 bg-slate-800 rounded w-1/3" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="h-10 bg-slate-800 rounded-lg" />
                <div className="h-10 bg-slate-800 rounded-lg" />
                <div className="h-10 bg-slate-800 rounded-lg" />
                <div className="h-10 bg-slate-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : athletes.length === 0 ? (
        /* Zero database athletes fallback obsidian-styled card */
        <div className="py-16 px-6 text-center space-y-4 bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-[#FFB703] shadow-lg">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
            No registered athletes found
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            No registered athletes found. As athletes build their recruiting profiles or enter combines, their cards will appear here.
          </p>
        </div>
      ) : filteredAthletes.length === 0 ? (
        /* Active filter zero-results fallback */
        <div className="py-14 px-6 text-center space-y-4 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-white uppercase">
            No Matching Prospects Found
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No prospects match the selected filter criteria. Try adjusting your position, grad year, speed, or GPA filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl bg-[#FFB703] text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md hover:brightness-110"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        /* PROSPECT CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredAthletes.map((ath) => {
            const saved = isBookmarked(ath.id);
            const isGpaHigh = ath.gpaNumeric !== null && ath.gpaNumeric > 3.8;

            return (
              <div
                key={ath.id}
                id={`prospect-card-${ath.id}`}
                className="bg-slate-900/80 border border-slate-700/80 hover:border-slate-600 rounded-3xl p-4 sm:p-5 transition-all shadow-lg hover:shadow-2xl flex flex-col justify-between space-y-3.5 group relative overflow-hidden"
              >
                {/* Top Profile Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Headshot avatar with verified badge checkmark */}
                    <div className="relative shrink-0">
                      <img
                        src={ath.avatarUrl}
                        alt={ath.displayName}
                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border border-slate-700 bg-slate-800 shadow-md"
                        onError={(e) => {
                          // Safe headshot fallback if image fails to load
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                      {ath.isVerified && (
                        <span 
                          className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-950 border border-emerald-400 text-emerald-400 shadow-sm"
                          title="Verified Athlete"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-400 text-slate-950" />
                        </span>
                      )}
                    </div>

                    {/* Name, nickname in quotes, positions, jersey number, grad class, and school */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-sm sm:text-base text-white group-hover:text-[#FFB703] transition-colors truncate">
                          {ath.displayName}
                          {ath.nickname && (
                            <span className="ml-1 text-slate-300 font-normal italic">
                              "{ath.nickname}"
                            </span>
                          )}
                        </h3>
                      </div>

                      <p className="text-xs text-[#FFB703] font-bold truncate">
                        {ath.position} {ath.secondaryPosition ? `/ ${ath.secondaryPosition}` : ''} {ath.jerseyNumber ? `• #${ath.jerseyNumber}` : ''}
                      </p>

                      <p className="text-[11px] text-slate-400 truncate">
                        Class of {ath.gradYear} • {ath.school} {ath.clubTeam ? `• ${ath.clubTeam}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Star Bookmark Button (Persists in Firestore savedAthletes & localStorage) */}
                  <button
                    id={`bookmark-btn-${ath.id}`}
                    onClick={(e) => handleToggleWatchlist(ath.id, e)}
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                      saved 
                        ? 'bg-[#FFB703] text-slate-950 border-[#FFB703] shadow-[0_0_15px_rgba(255,183,3,0.35)]' 
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                    title={saved ? 'Remove from Recruiter Watchlist' : 'Add to Recruiter Watchlist'}
                    aria-label={saved ? 'Remove from Recruiter Watchlist' : 'Add to Recruiter Watchlist'}
                  >
                    <Star className={`w-4 h-4 ${saved ? 'fill-slate-950 stroke-slate-950' : 'fill-none'}`} />
                  </button>
                </div>

                {/* Metric Grid: 40-Dash, Vert, Size/Height, GPA (colored teal/green if > 3.8) */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 py-1 text-center font-mono">
                  
                  {/* 40-Dash */}
                  <div className="bg-slate-950/80 rounded-xl p-2 border border-slate-800/90">
                    <div className="text-[9px] text-slate-400 font-sans uppercase font-bold">40-Dash</div>
                    <div className="text-xs sm:text-sm font-black text-white truncate">
                      {ath.dash40Display}
                    </div>
                  </div>

                  {/* Vertical Leap */}
                  <div className="bg-slate-950/80 rounded-xl p-2 border border-slate-800/90">
                    <div className="text-[9px] text-slate-400 font-sans uppercase font-bold">Vert</div>
                    <div className="text-xs sm:text-sm font-black text-white truncate">
                      {ath.vertDisplay}
                    </div>
                  </div>

                  {/* Size / Height */}
                  <div className="bg-slate-950/80 rounded-xl p-2 border border-slate-800/90">
                    <div className="text-[9px] text-slate-400 font-sans uppercase font-bold">Size</div>
                    <div className="text-xs sm:text-sm font-black text-white truncate">
                      {ath.sizeDisplay}
                    </div>
                  </div>

                  {/* GPA (Colored teal/green if > 3.8) */}
                  <div className="bg-slate-950/80 rounded-xl p-2 border border-slate-800/90">
                    <div className="text-[9px] text-slate-400 font-sans uppercase font-bold">GPA</div>
                    <div className={`text-xs sm:text-sm font-black truncate ${isGpaHigh ? 'text-[#00F5D4] drop-shadow-[0_0_8px_rgba(0,245,212,0.4)]' : 'text-slate-200'}`}>
                      {ath.gpaDisplay}
                    </div>
                  </div>

                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/90 text-xs">
                  
                  {/* "Preview Film (X)" button: Opens embedded video modal */}
                  <button
                    id={`preview-film-${ath.id}`}
                    onClick={() => setPreviewAthlete(ath)}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-[#FFB703] font-bold cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-slate-800/50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-[#FFB703]" />
                    <span>Preview Film ({ath.highlightCount})</span>
                  </button>

                  {/* Overall Scout Rating Badge (e.g. "Rating: 98.4") */}
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                    <span className="text-slate-400">Rating:</span>
                    <strong className="text-white font-black">{ath.scoutRating}</strong>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* 4. EMBEDDED FILM PREVIEW MODAL */}
      <AnimatePresence>
        {previewAthlete && (() => {
          const videoInfo = getEmbedVideoUrl(previewAthlete.topReelUrl);
          const saved = isBookmarked(previewAthlete.id);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#090E17] border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 relative"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-start pb-3 border-b border-slate-800">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-base sm:text-lg">
                        {previewAthlete.displayName}
                      </h3>
                      {previewAthlete.isVerified && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#FFB703] font-medium">
                      {previewAthlete.position} • {previewAthlete.school} • Class of {previewAthlete.gradYear}
                    </p>
                  </div>
                  
                  <button 
                    id="close-film-preview-modal"
                    onClick={() => setPreviewAthlete(null)} 
                    className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80 cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Embedded Video Player */}
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner relative">
                  {videoInfo.isNativeVideo ? (
                    <video 
                      src={videoInfo.embedUrl} 
                      controls 
                      autoPlay 
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <iframe 
                      src={videoInfo.embedUrl} 
                      title={`${previewAthlete.displayName} Highlight Film`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full object-cover border-0"
                    />
                  )}
                </div>

                {/* Modal Footer Info & CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                  <div className="text-slate-400 font-mono space-x-2">
                    <span>40-Dash: <strong className="text-white">{previewAthlete.dash40Display}</strong></span>
                    <span>•</span>
                    <span>GPA: <strong className={previewAthlete.gpaNumeric && previewAthlete.gpaNumeric > 3.8 ? 'text-[#00F5D4]' : 'text-white'}>{previewAthlete.gpaDisplay}</strong></span>
                    <span>•</span>
                    <span>Rating: <strong className="text-amber-400">{previewAthlete.scoutRating}</strong></span>
                  </div>

                  <button
                    id="modal-toggle-watchlist-btn"
                    onClick={() => handleToggleWatchlist(previewAthlete.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                      saved
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-[#FFB703] text-slate-950 font-black hover:brightness-110'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                    <span>{saved ? 'Saved in Watchlist' : '+ Add to Watchlist'}</span>
                  </button>
                </div>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}

export default ProspectDiscoveryMatrix;
