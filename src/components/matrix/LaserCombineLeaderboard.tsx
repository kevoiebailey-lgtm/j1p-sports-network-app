import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Trophy, 
  Timer, 
  Search, 
  ShieldCheck, 
  ChevronRight, 
  Crosshair,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';

export interface CombineLeaderboardAthlete {
  id: string;
  name: string;
  nickname: string;
  sport: string;
  position: string;
  gradYear: number | string;
  gradClassShort: string;
  school: string;
  state: string;
  fortyYardNumeric: number | null;
  fortyYardDisplay: string;
  shuttleNumeric: number | null;
  shuttleDisplay: string;
  verticalJumpNumeric: number | null;
  verticalJumpDisplay: string;
  broadJumpDisplay: string;
  benchRepsNumeric: number | null;
  benchRepsDisplay: string;
  compositeScoreNumeric: number;
  compositeScoreDisplay: string;
  verifiedLaser: boolean;
  avatarUrl: string;
  rawDoc?: any;
}

// Normalizer for combine telemetry metrics
function normalizeCombineAthleteDoc(docSnap: any): CombineLeaderboardAthlete {
  const data = docSnap.data ? docSnap.data() : docSnap;
  const id = docSnap.id || data.uid || data.id || `ath-${Math.random().toString(36).substring(2, 8)}`;

  // Display Name & Nickname
  let name = data.displayName || data.name || '';
  if (!name && (data.firstName || data.lastName)) {
    name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
  }
  if (!name) {
    name = 'Prospect Athlete';
  }

  let nickname = data.nickname || data.nickName || '';
  if (!nickname && name.includes('"')) {
    const match = name.match(/"([^"]+)"/);
    if (match && match[1]) {
      nickname = match[1];
      name = name.replace(/"([^"]+)"/, '').replace(/\s+/g, ' ').trim();
    }
  }

  const avatarUrl = data.photoURL || data.avatarUrl || data.avatar || 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&auto=format&fit=crop&q=80';

  // Sport & Position
  const sport = data.sport || data.primarySport || 'Football';
  const position = data.position || data.primaryPosition || data.sportsRole || 'ATH';

  // Grad Year
  let gradYear: number | string = data.gradYear || data.graduationYear || data.class || 2026;
  const numYear = Number(gradYear);
  let gradClassShort = '26';
  if (!isNaN(numYear) && numYear > 2000) {
    gradClassShort = String(numYear).slice(2);
  } else {
    gradClassShort = String(gradYear).replace(/[^0-9]/g, '').slice(-2) || '26';
  }

  // School & State
  const school = data.highSchool || data.school || data.schoolName || data.teamName || '—';
  const state = data.state || data.location || (school.includes('(') ? school.split('(')[1]?.replace(')', '') : 'TX');

  // Verified Laser
  const verifiedLaser = Boolean(
    data.isVerified === true ||
    data.verified === true ||
    data.metrics?.verified === true ||
    data.metrics?.verifiedLaser === true ||
    data.isNCAAPro === true
  );

  // 1. 40-Yard Laser (Lower is better)
  let fortyYardNumeric: number | null = null;
  let fortyYardDisplay = '—';
  const rawForty = data.metrics?.fortyLaser ?? data.metrics?.fortyYard ?? data.metrics?.dash40 ?? data.dash40 ?? data.stats?.dash40;
  if (rawForty !== undefined && rawForty !== null && rawForty !== '' && !isNaN(Number(rawForty))) {
    const val = Number(rawForty);
    if (val > 3.5 && val < 9.0) {
      fortyYardNumeric = val;
      fortyYardDisplay = `${val.toFixed(3)}s`;
    }
  }

  // 2. 5-10-5 Pro Shuttle (Lower is better)
  let shuttleNumeric: number | null = null;
  let shuttleDisplay = '—';
  const rawShuttle = data.metrics?.shuttle ?? data.metrics?.proShuttle ?? data.metrics?.shuttle5105 ?? data.shuttle ?? data.stats?.shuttle;
  if (rawShuttle !== undefined && rawShuttle !== null && rawShuttle !== '' && !isNaN(Number(rawShuttle))) {
    const val = Number(rawShuttle);
    if (val > 2.5 && val < 8.0) {
      shuttleNumeric = val;
      shuttleDisplay = `${val.toFixed(2)}s`;
    }
  }

  // 3. Vertical Jump (Higher is better)
  let verticalJumpNumeric: number | null = null;
  let verticalJumpDisplay = '—';
  const rawVert = data.metrics?.verticalJump ?? data.metrics?.vertLeap ?? data.metrics?.vertical ?? data.vertical ?? data.stats?.vertical;
  if (rawVert !== undefined && rawVert !== null && rawVert !== '' && !isNaN(Number(rawVert))) {
    const val = Number(rawVert);
    if (val > 10 && val < 65) {
      verticalJumpNumeric = val;
      verticalJumpDisplay = `${val.toFixed(1)}"`;
    }
  }

  // 4. Broad Jump (Display string)
  let broadJumpDisplay = '—';
  const rawBroad = data.metrics?.broadJump ?? data.broadJump ?? data.stats?.broadJump;
  if (rawBroad) {
    broadJumpDisplay = String(rawBroad);
  }

  // 5. Bench Reps (Higher is better)
  let benchRepsNumeric: number | null = null;
  let benchRepsDisplay = '—';
  const rawBench = data.metrics?.benchReps ?? data.metrics?.benchPress ?? data.benchReps ?? data.stats?.benchReps;
  if (rawBench !== undefined && rawBench !== null && rawBench !== '' && !isNaN(Number(rawBench))) {
    const val = Number(rawBench);
    if (val >= 0 && val < 60) {
      benchRepsNumeric = val;
      benchRepsDisplay = String(val);
    }
  }

  // 6. Composite Score (Higher is better)
  let compositeScoreNumeric = 0;
  let compositeScoreDisplay = '—';
  const rawComposite = data.metrics?.compositeScore ?? data.metrics?.athleticIndex ?? data.seasonStats?.rating ?? data.compositeScore ?? data.rating;
  if (rawComposite !== undefined && rawComposite !== null && !isNaN(Number(rawComposite))) {
    const val = Number(rawComposite);
    if (val > 0) {
      compositeScoreNumeric = val;
      compositeScoreDisplay = val.toFixed(1);
    }
  } else if (fortyYardNumeric || verticalJumpNumeric) {
    // Calculated synthetic index if telemetry is available
    let score = 90.0;
    if (fortyYardNumeric) score += (4.8 - fortyYardNumeric) * 12;
    if (verticalJumpNumeric) score += (verticalJumpNumeric - 30) * 0.4;
    if (shuttleNumeric) score += (4.4 - shuttleNumeric) * 8;
    score = Math.min(99.8, Math.max(85.0, score));
    compositeScoreNumeric = Number(score.toFixed(1));
    compositeScoreDisplay = score.toFixed(1);
  }

  return {
    id,
    name,
    nickname,
    sport,
    position,
    gradYear,
    gradClassShort,
    school,
    state,
    fortyYardNumeric,
    fortyYardDisplay,
    shuttleNumeric,
    shuttleDisplay,
    verticalJumpNumeric,
    verticalJumpDisplay,
    broadJumpDisplay,
    benchRepsNumeric,
    benchRepsDisplay,
    compositeScoreNumeric,
    compositeScoreDisplay,
    verifiedLaser,
    avatarUrl,
    rawDoc: data
  };
}

export interface LaserCombineLeaderboardProps {
  onSwitchToMatrix?: () => void;
  showHeroBanner?: boolean;
}

export const LaserCombineLeaderboard: React.FC<LaserCombineLeaderboardProps> = ({
  onSwitchToMatrix,
  showHeroBanner = true
}) => {
  const navigate = useNavigate();

  // Real-time Firestore state
  const [athletes, setAthletes] = useState<CombineLeaderboardAthlete[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('All Sports');
  const [selectedGradYear, setSelectedGradYear] = useState<string>('All Grad Classes');
  const [sortBy, setSortBy] = useState<'composite' | 'forty' | 'vertical' | 'shuttle'>('composite');

  // Listen to Firestore collection `/users` where `role == 'athlete'`
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
          const list: CombineLeaderboardAthlete[] = [];
          snapshot.forEach((docSnap) => {
            const normalized = normalizeCombineAthleteDoc(docSnap);
            list.push(normalized);
          });

          setAthletes(list);
          setLoading(false);
          setDbError(null);
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, usersPath);
          } catch (e) {
            // Logged as JSON error
          }
          setDbError('Unable to sync live combine telemetry feed.');
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
      setDbError('Error initializing combine leaderboard query.');
      setLoading(false);
    }
  }, []);

  // Filter & Dynamic Multi-Sort
  const filteredAndSortedAthletes = useMemo(() => {
    const filtered = athletes.filter((ath) => {
      // 1. Sport Filter
      if (selectedSport !== 'All Sports') {
        const targetSport = selectedSport.toLowerCase();
        const athSport = ath.sport.toLowerCase();
        const athPos = ath.position.toLowerCase();

        let matchSport = false;
        if (targetSport === 'football' && (athSport.includes('football') || athPos.includes('qb') || athPos.includes('wr') || athPos.includes('rb') || athPos.includes('cb') || athPos.includes('lb'))) {
          matchSport = true;
        } else if (targetSport === 'flag football' && (athSport.includes('flag') || athSport.includes('7v7'))) {
          matchSport = true;
        } else if (targetSport === 'basketball' && (athSport.includes('basketball') || athPos.includes('guard') || athPos.includes('pg') || athPos.includes('forward'))) {
          matchSport = true;
        } else if (targetSport === 'soccer' && (athSport.includes('soccer') || athSport.includes('futbol') || athPos.includes('forward') || athPos.includes('midfield'))) {
          matchSport = true;
        } else if (athSport.includes(targetSport)) {
          matchSport = true;
        }

        if (!matchSport) return false;
      }

      // 2. Grad Class Filter ('26, '27, '28)
      if (selectedGradYear !== 'All Grad Classes') {
        const targetShort = selectedGradYear.replace(/[^0-9]/g, '');
        if (targetShort && ath.gradClassShort !== targetShort) {
          return false;
        }
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = ath.name.toLowerCase().includes(q);
        const nickMatch = ath.nickname.toLowerCase().includes(q);
        const schoolMatch = ath.school.toLowerCase().includes(q);
        const posMatch = ath.position.toLowerCase().includes(q);
        const sportMatch = ath.sport.toLowerCase().includes(q);

        if (!nameMatch && !nickMatch && !schoolMatch && !posMatch && !sportMatch) {
          return false;
        }
      }

      return true;
    });

    // Sort active selection
    return filtered.sort((a, b) => {
      if (sortBy === 'forty') {
        // Ascending (Fastest first). If unrecorded, place at bottom
        const aVal = a.fortyYardNumeric ?? 999;
        const bVal = b.fortyYardNumeric ?? 999;
        return aVal - bVal;
      }
      if (sortBy === 'shuttle') {
        // Ascending (Fastest first). If unrecorded, place at bottom
        const aVal = a.shuttleNumeric ?? 999;
        const bVal = b.shuttleNumeric ?? 999;
        return aVal - bVal;
      }
      if (sortBy === 'vertical') {
        // Descending (Highest first). If unrecorded, place at bottom
        const aVal = a.verticalJumpNumeric ?? -1;
        const bVal = b.verticalJumpNumeric ?? -1;
        return bVal - aVal;
      }
      // Default: Composite Score Descending
      const aVal = a.compositeScoreNumeric || 0;
      const bVal = b.compositeScoreNumeric || 0;
      return bVal - aVal;
    });
  }, [athletes, selectedSport, selectedGradYear, searchQuery, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSport('All Sports');
    setSelectedGradYear('All Grad Classes');
    setSortBy('composite');
  };

  const handleSwitchView = () => {
    if (onSwitchToMatrix) {
      onSwitchToMatrix();
    } else {
      navigate('/athletes');
    }
  };

  return (
    <div className="space-y-6 select-none animate-fadeIn pb-16">
      
      {/* 1. COMBINE HERO & VIEW SWITCHER BAR */}
      {showHeroBanner && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#0a1120] to-slate-900 border border-slate-800 p-6 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF6A00]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#00B8D4]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6A00]/15 border border-[#FF6A00]/40 text-[#FF6A00] text-xs font-mono font-black uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 animate-pulse" />
                <span>JUST1PLAY COMBINE LASER TELEMETRY</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <Trophy className="w-6 h-6 text-[#FFC857]" />
                <span>Laser Combine Leaderboard</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Certified high-precision optical laser times (1/1000th sec precision) across 40-Yard Dash, Pro Shuttle, Vertical Jump, and Athletic Index.
              </p>
            </div>

            {/* View Switcher Button in Top Right */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="toggle-scout-matrix-btn"
                onClick={handleSwitchView}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#00B8D4] hover:bg-[#00e2c4] text-[#090D16] text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,184,212,0.35)] flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Crosshair className="w-4 h-4" />
                <span>Scout Matrix Roster</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FILTER & SORT CONTROLS BAR */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 backdrop-blur-xl shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="leaderboard-search-input"
              type="text"
              placeholder="Search athlete, position, school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 outline-none focus:border-[#00B8D4] transition-all"
            />
          </div>

          {/* Sport Dropdown (All Sports, Football, Flag Football, Basketball, Soccer) */}
          <div>
            <select
              id="leaderboard-sport-select"
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs font-bold text-white outline-none focus:border-[#00B8D4] cursor-pointer"
            >
              <option value="All Sports">All Sports</option>
              <option value="Football">🏈 Football</option>
              <option value="Flag Football">⚡ Flag Football (7v7)</option>
              <option value="Basketball">🏀 Basketball</option>
              <option value="Soccer">⚽ Soccer</option>
            </select>
          </div>

          {/* Grad Class Dropdown (All Grad Classes, '26, '27, '28) */}
          <div>
            <select
              id="leaderboard-grad-class-select"
              value={selectedGradYear}
              onChange={(e) => setSelectedGradYear(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs font-bold text-white outline-none focus:border-[#00B8D4] cursor-pointer"
            >
              <option value="All Grad Classes">All Grad Classes</option>
              <option value="'26">Class of '26</option>
              <option value="'27">Class of '27</option>
              <option value="'28">Class of '28</option>
            </select>
          </div>

          {/* Sort Metric Dropdown */}
          <div>
            <select
              id="leaderboard-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs font-black text-[#FFC857] outline-none focus:border-[#00B8D4] cursor-pointer"
            >
              <option value="composite">🏆 Composite Score</option>
              <option value="forty">⚡ Fastest 40-YD Laser</option>
              <option value="vertical">🚀 Highest Vertical</option>
              <option value="shuttle">🔄 5-10-5 Shuttle</option>
            </select>
          </div>

        </div>
      </div>

      {/* 3. COMBINE LEADERBOARD TABLE / EMPTY STATES */}
      {loading ? (
        /* Loading Skeleton Table */
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-slate-800 rounded w-1/4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-800/60 rounded-xl" />
            ))}
          </div>
        </div>
      ) : athletes.length === 0 ? (
        /* Mandatory empty-state high-contrast dark card when no athletes exist in Firestore */
        <div className="py-16 px-6 text-center space-y-4 bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/90 border border-slate-700 flex items-center justify-center mx-auto text-[#FF6A00] shadow-lg">
            <Timer className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
            No combine entries recorded yet
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            No combine entries recorded yet. Athletes will appear here once their combine metrics are logged.
          </p>
        </div>
      ) : filteredAndSortedAthletes.length === 0 ? (
        /* Active filter zero results fallback */
        <div className="py-14 px-6 text-center space-y-4 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-white uppercase">
            No Matching Combine Records
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No athletes match the selected sport, graduation class, or search filter.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl bg-[#00B8D4] text-[#090D16] font-black text-xs uppercase tracking-wider cursor-pointer shadow-md hover:brightness-110"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* RANKED LEADERBOARD TABLE */
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black text-[#FF6A00] uppercase tracking-wider flex items-center gap-2">
              <Timer className="w-4 h-4 text-[#FF6A00]" />
              <span>Laser Verified Combine Telemetry ({filteredAndSortedAthletes.length} Athletes)</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>NCAA / NFHS Calibrated</span>
            </span>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 text-center">Rank</th>
                  <th className="py-3.5 px-4">Athlete / School</th>
                  <th className="py-3.5 px-4 text-center">Sport / Pos</th>
                  <th className="py-3.5 px-4 text-center">Class</th>
                  <th className={`py-3.5 px-4 text-center font-black ${sortBy === 'forty' ? 'text-[#00B8D4] underline' : 'text-[#00B8D4]'}`}>
                    40-Yd Laser
                  </th>
                  <th className={`py-3.5 px-4 text-center ${sortBy === 'shuttle' ? 'text-indigo-400 underline font-black' : ''}`}>
                    5-10-5 Shuttle
                  </th>
                  <th className={`py-3.5 px-4 text-center font-black ${sortBy === 'vertical' ? 'text-[#FFC857] underline' : 'text-[#FFC857]'}`}>
                    Vertical
                  </th>
                  <th className="py-3.5 px-4 text-center">Broad Jump</th>
                  <th className="py-3.5 px-4 text-center">Bench</th>
                  <th className={`py-3.5 px-4 text-center font-black ${sortBy === 'composite' ? 'text-[#FF6A00] underline' : 'text-[#FF6A00]'}`}>
                    Composite Index
                  </th>
                  <th className="py-3.5 px-4 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono text-slate-200">
                {filteredAndSortedAthletes.map((ath, idx) => {
                  // Dynamic Rank Badge calculation:
                  // Gold #1, Silver #2, Bronze #3, #4+
                  let rankBadgeClass = 'bg-slate-800/90 text-slate-400 border border-slate-700/60';
                  if (idx === 0) {
                    rankBadgeClass = 'bg-[#FFC857] text-slate-950 font-black shadow-[0_0_12px_rgba(255,200,87,0.5)] border border-[#FFC857]';
                  } else if (idx === 1) {
                    rankBadgeClass = 'bg-slate-200 text-slate-950 font-black shadow-[0_0_10px_rgba(226,232,240,0.4)] border border-slate-300';
                  } else if (idx === 2) {
                    rankBadgeClass = 'bg-[#CD7F32] text-white font-black shadow-[0_0_10px_rgba(205,127,50,0.4)] border border-[#CD7F32]';
                  }

                  return (
                    <tr 
                      key={ath.id} 
                      id={`leaderboard-row-${ath.id}`}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Dynamic Rank Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-xl text-xs ${rankBadgeClass}`}>
                          #{idx + 1}
                        </span>
                      </td>

                      {/* Athlete Name, Avatar, Verification & School */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex items-center gap-3">
                          <img 
                            src={ath.avatarUrl} 
                            alt={ath.name} 
                            className="w-10 h-10 rounded-2xl object-cover border border-slate-700 bg-slate-800 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{ath.name}</span>
                              {ath.nickname && (
                                <span className="text-slate-400 font-normal italic text-[11px]">
                                  "{ath.nickname}"
                                </span>
                              )}
                              {ath.verifiedLaser && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00B8D4]/20 text-[#00B8D4] font-mono font-bold shrink-0">
                                  LASER
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {ath.school} • {ath.state}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Sport & Position */}
                      <td className="py-3.5 px-4 text-center font-sans">
                        <span className="font-bold text-white block">{ath.sport}</span>
                        <span className="text-[10px] text-[#00B8D4] font-mono font-bold">{ath.position}</span>
                      </td>

                      {/* Grad Class */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-300">
                        '{ath.gradClassShort}
                      </td>

                      {/* 40-Yd Laser */}
                      <td className="py-3.5 px-4 text-center font-black text-[#00B8D4] text-sm">
                        {ath.fortyYardDisplay}
                      </td>

                      {/* 5-10-5 Shuttle */}
                      <td className="py-3.5 px-4 text-center text-slate-300">
                        {ath.shuttleDisplay}
                      </td>

                      {/* Vertical Jump */}
                      <td className="py-3.5 px-4 text-center font-black text-[#FFC857] text-sm">
                        {ath.verticalJumpDisplay}
                      </td>

                      {/* Broad Jump */}
                      <td className="py-3.5 px-4 text-center text-slate-300">
                        {ath.broadJumpDisplay}
                      </td>

                      {/* Bench Reps */}
                      <td className="py-3.5 px-4 text-center text-slate-300">
                        {ath.benchRepsDisplay}
                      </td>

                      {/* Composite Score Index */}
                      <td className="py-3.5 px-4 text-center font-black text-[#FF6A00] text-base">
                        {ath.compositeScoreDisplay}
                      </td>

                      {/* Profile CTA */}
                      <td className="py-3.5 px-4 text-right font-sans">
                        <Link
                          to={`/profile/${ath.id}`}
                          id={`leaderboard-profile-btn-${ath.id}`}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-[#00B8D4] hover:text-[#090D16] border border-slate-700 hover:border-[#00B8D4] text-xs font-bold text-white transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                        >
                          <span>Profile</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default LaserCombineLeaderboard;
