import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ScoutHubFilters } from './ScoutHubFilters';
import { MatrixFilterSidebar, MatrixFilterState, DEFAULT_FILTER_STATE } from './MatrixFilterSidebar';
import { ProScoutBentoCard } from './ProScoutBentoCard';
import { ScoutBentoAdCard } from './ScoutBentoAdCard';
import { ScoutLeaderboardAdBanner } from './ScoutLeaderboardAdBanner';
import { AthleteDetailShowcaseModal } from './AthleteDetailShowcaseModal';
import { AthleteBenchmarkRadar } from './AthleteBenchmarkRadar';
import { RecruiterWatchlistHub } from './RecruiterWatchlistHub';
import { RecruiterInquiriesHubModal } from './RecruiterInquiriesHubModal';
import { SubscriptionTierModal } from '../Pricing/SubscriptionTierModal';
import { GatePassScannerModal } from './GatePassScannerModal';
import { SlotA_CinematicBanner } from '../Ads/SlotA_CinematicBanner';
import { ScoutMatrixSkeleton } from '../Common/SkeletonLoader';
import { ScoutMatrixOrbBadge } from './ScoutMatrixOrbBadge';
import { HeadToHeadComparisonDock } from './HeadToHeadComparisonDock';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Trophy, 
  ShieldCheck, 
  Sparkles, 
  Search, 
  Bookmark, 
  ExternalLink,
  Flame,
  Zap,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  Filter,
  QrCode,
  Scale,
  Activity,
  Radio,
  TrendingUp,
  Cpu
} from 'lucide-react';

const MATRIX_FILTER_STORAGE_KEY = 'j1p_matrix_filters_v2';

const loadSavedFilters = (): MatrixFilterState => {
  try {
    const saved = localStorage.getItem(MATRIX_FILTER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        searchQuery: parsed.searchQuery || '',
        selectedSports: Array.isArray(parsed.selectedSports) ? parsed.selectedSports : [],
        selectedGradYears: Array.isArray(parsed.selectedGradYears) ? parsed.selectedGradYears : [],
        selectedStates: Array.isArray(parsed.selectedStates) ? parsed.selectedStates : [],
        selectedPosition: parsed.selectedPosition || 'ALL',
        verifiedOnly: Boolean(parsed.verifiedOnly)
      };
    }
  } catch (err) {
    console.warn('Failed to load saved matrix filters:', err);
  }
  return DEFAULT_FILTER_STATE;
};

export const RecruiterMatrixView: React.FC = () => {
  const navigate = useNavigate();
  const { bookmarks, toggleBookmark } = useAuth();

  // Firestore & Athlete data states
  const [firestoreAthletes, setFirestoreAthletes] = useState<UserProfile[]>([]);
  const [loadingFirestore, setLoadingFirestore] = useState<boolean>(true);

  // Tab state: 'scout' (Athlete Matrix), 'saved' (Saved Bookmarks), or 'pipeline' (Recruiter Pipeline & Alerts)
  const [activeTab, setActiveTab] = useState<'scout' | 'saved' | 'pipeline'>('scout');

  // Comparison Holodeck state (up to 3 athletes)
  const [comparedAthletes, setComparedAthletes] = useState<UserProfile[]>([]);

  // Persistent Filter State
  const [filters, setFilters] = useState<MatrixFilterState>(loadSavedFilters);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [showCoachPassModal, setShowCoachPassModal] = useState<boolean>(false);
  const [showGateScanner, setShowGateScanner] = useState<boolean>(false);
  const [showInquiriesHubModal, setShowInquiriesHubModal] = useState<boolean>(false);

  // Save filter choices to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(MATRIX_FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch (err) {
      console.warn('Failed to save matrix filters:', err);
    }
  }, [filters]);

  // Modal State (Showcase)
  const [selectedAthleteForModal, setSelectedAthleteForModal] = useState<UserProfile | null>(null);
  const [showBenchmarkRadar, setShowBenchmarkRadar] = useState<boolean>(false);

  // Fetch athletes from Firestore if available
  useEffect(() => {
    if (!db) {
      setLoadingFirestore(false);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedAthletes: UserProfile[] = [];
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as UserProfile;
            if (data.role === 'athlete' || !data.role) {
              loadedAthletes.push({
                uid: docSnap.id,
                ...data
              });
            }
          });
          if (loadedAthletes.length > 0) {
            setFirestoreAthletes(loadedAthletes);
          }
        }
        setLoadingFirestore(false);
      },
      (err) => {
        console.warn('ScoutHub Firestore listener warning:', err.message);
        setLoadingFirestore(false);
      }
    );

    return () => unsub();
  }, []);

  // Firestore Athletes list
  const allAthletes = firestoreAthletes;

  // Available Sports list
  const availableSports = useMemo(() => {
    const set = new Set<string>(['All']);
    allAthletes.forEach(a => {
      if (a.sport) set.add(a.sport);
    });
    return Array.from(set);
  }, [allAthletes]);

  // Calculate Active Filters Count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.selectedSports.length > 0) count += filters.selectedSports.length;
    if (filters.selectedGradYears.length > 0) count += filters.selectedGradYears.length;
    if (filters.selectedStates.length > 0) count += filters.selectedStates.length;
    if (filters.selectedPosition !== 'ALL') count++;
    if (filters.verifiedOnly) count++;
    return count;
  }, [filters]);

  // Filtered Athletes list
  const filteredAthletes = useMemo(() => {
    return allAthletes.filter((ath) => {
      // Saved tab filter
      if (activeTab === 'saved' && !bookmarks.includes(ath.uid)) {
        return false;
      }

      // NCAA / Matrix Verified toggle
      if (filters.verifiedOnly && !(ath.isVerified ?? true)) {
        return false;
      }

      // Sport filter (multi-select or single)
      if (filters.selectedSports.length > 0) {
        const sportMatch = filters.selectedSports.some(
          (s) => s.toLowerCase() === ath.sport?.toLowerCase()
        );
        if (!sportMatch) return false;
      }

      // Position filter
      if (
        filters.selectedPosition !== 'ALL' &&
        !ath.position?.toUpperCase().includes(filters.selectedPosition.toUpperCase())
      ) {
        return false;
      }

      // Grad Year filter (multi-select)
      if (filters.selectedGradYears.length > 0) {
        if (!filters.selectedGradYears.includes(ath.gradYear)) {
          return false;
        }
      }

      // State filter (multi-select)
      if (filters.selectedStates.length > 0) {
        const stateMatch = filters.selectedStates.some(
          (st) => st.toUpperCase() === ath.state?.toUpperCase()
        );
        if (!stateMatch) return false;
      }

      // Search query (Name, High School, Position, State, Sport)
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchName = ath.displayName.toLowerCase().includes(q);
        const matchSchool = ath.highSchool?.toLowerCase().includes(q);
        const matchPos = ath.position?.toLowerCase().includes(q);
        const matchState = ath.state?.toLowerCase().includes(q);
        const matchSport = ath.sport?.toLowerCase().includes(q);
        if (!matchName && !matchSchool && !matchPos && !matchState && !matchSport) {
          return false;
        }
      }

      return true;
    });
  }, [allAthletes, activeTab, bookmarks, filters]);

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
    try {
      localStorage.removeItem(MATRIX_FILTER_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear matrix filters:', err);
    }
  };

  const handleToggleBookmark = (uid: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    toggleBookmark(uid);
  };

  // Compare Holodeck handlers
  const handleToggleCompare = (athlete: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (comparedAthletes.some(a => a.uid === athlete.uid)) {
      setComparedAthletes(prev => prev.filter(a => a.uid !== athlete.uid));
    } else {
      if (comparedAthletes.length >= 3) {
        // Shift first and add new
        setComparedAthletes(prev => [...prev.slice(1), athlete]);
      } else {
        setComparedAthletes(prev => [...prev, athlete]);
      }
    }
  };

  const handleRemoveCompareAthlete = (uid: string) => {
    setComparedAthletes(prev => prev.filter(a => a.uid !== uid));
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-white relative font-sans select-none">
      
      {/* 1. Dynamic Cyber-Athletic Matrix Radial Grids */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-[#00F2FE]/8 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/3 left-10 w-[500px] h-[500px] bg-[#39FF14]/5 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#00f2fe_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]" />
      </div>

      {/* 2. TIER 2: MAIN CONTENT VIEWPORT WRAPPER WITH MANDATORY pb-40 PADDING */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-40 space-y-8">
        
        {/* HERO TITLE HEADER WITH 3D HOLOGRAPHIC SCOUT MATRIX ORB */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#090E17]/95 via-[#0C1420]/90 to-[#090E17]/95 border border-[#00F2FE]/25 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(0,242,254,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden">
          
          {/* Specular Edge Line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent" />

          {/* Left Title & Live Telemetry Info */}
          <div className="flex items-start sm:items-center gap-5 z-10">
            {/* 3D Holographic Kinetic Scout Matrix Orb */}
            <ScoutMatrixOrbBadge size="lg" />

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#080C14]/90 border border-[#00F2FE]/40 text-[#00F2FE] text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(0,242,254,0.25)]">
                <Cpu className="w-3.5 h-3.5 text-[#39FF14] animate-pulse" />
                <span>CYBER-ATHLETIC SCOUT MATRIX • HOLO-RADAR v3.2</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                <span>ATHLETE SCOUT HUB</span>
                <span className="text-[#00F2FE] drop-shadow-[0_0_20px_#00F2FE]">.</span>
              </h1>

              <div className="flex items-center gap-3 flex-wrap text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  1,420 PROSPECTS SYNCED
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-300">84 RECRUITERS ACTIVE</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400 font-bold">5-POINT PRO RADAR</span>
              </div>
            </div>
          </div>

          {/* Right Action Header Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 z-10 w-full md:w-auto">
            <button
              onClick={() => setShowInquiriesHubModal(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider bg-[#FF6A00]/20 hover:bg-[#FF6A00]/30 text-[#FF6A00] border border-[#FF6A00]/40 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,106,0,0.2)]"
            >
              <Sparkles className="w-4 h-4 text-[#FF6A00]" />
              <span>RECRUITER OUTREACH HUB</span>
            </button>

            <button
              onClick={() => setShowGateScanner(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>GATE PASS SCANNER</span>
            </button>

            <button
              onClick={() => setShowCoachPassModal(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.4)]"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>COACH PASS PRO</span>
            </button>
          </div>

        </div>

        {/* VIEW TAB SELECTOR */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#090E17]/90 border border-slate-800 shrink-0 flex-wrap">
          <button
            onClick={() => setActiveTab('scout')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'scout'
                ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ALL ATHLETES</span>
            <span className="px-2 py-0.5 text-[9px] rounded-md bg-black/25 font-mono font-black">
              {allAthletes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'saved'
                ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bookmark className="w-4 h-4 fill-current" />
            <span>SAVED PROSPECTS</span>
            <span className="px-2 py-0.5 text-[9px] rounded-md bg-black/25 font-mono font-black">
              {bookmarks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pipeline'
                ? 'bg-[#39FF14] text-slate-950 shadow-[0_0_15px_rgba(57,255,20,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>RECRUITER PIPELINE & ALERTS</span>
          </button>
        </div>

        {/* SLOT A: TOP CINEMATIC SPONSOR BANNER */}
        <section>
          <SlotA_CinematicBanner 
            customHeadline="OFFICIAL RECRUITER MATRIX & LASER COMBINE PARTNER"
            onOpenAdvertiseModal={() => navigate('/advertise')} 
          />
        </section>

        {activeTab === 'pipeline' ? (
          /* RECRUITER PIPELINE & ALERTS HUB */
          <RecruiterWatchlistHub />
        ) : (
          <>
            {/* COMPONENT A: HUB SUB-HEADER & GLOBAL FILTERS */}
            <section className="p-4 sm:p-6 rounded-3xl bg-[#090E17]/85 border border-[#00F2FE]/20 backdrop-blur-xl shadow-2xl space-y-4">
              <ScoutHubFilters
                searchQuery={filters.searchQuery}
                onSearchChange={(q) => setFilters((prev) => ({ ...prev, searchQuery: q }))}
                selectedSport={filters.selectedSports[0] || 'All'}
                onSportChange={(s) => setFilters((prev) => ({ ...prev, selectedSports: s === 'All' ? [] : [s] }))}
                selectedPosition={filters.selectedPosition}
                onPositionChange={(pos) => setFilters((prev) => ({ ...prev, selectedPosition: pos }))}
                selectedGradYear={filters.selectedGradYears[0] || 'ALL'}
                onGradYearChange={(y) => setFilters((prev) => ({ ...prev, selectedGradYears: y === 'ALL' ? [] : [y] }))}
                selectedState={filters.selectedStates[0] || 'ALL'}
                onStateChange={(st) => setFilters((prev) => ({ ...prev, selectedStates: st === 'ALL' ? [] : [st] }))}
                ncaaVerifiedOnly={filters.verifiedOnly}
                onToggleNcaaVerified={() => setFilters((prev) => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
                resultCount={filteredAthletes.length}
                availableSports={availableSports}
              />
            </section>

            {/* MOBILE FILTER TOGGLE BAR */}
            <div className="lg:hidden flex items-center justify-between p-4 rounded-2xl bg-[#090E17] border border-cyan-500/30 shadow-lg">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#00F2FE] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.4)] cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
                <span>Filter Matrix</span>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-black text-[#00F2FE] text-[10px] font-mono font-black">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <span className="text-xs font-mono font-bold text-slate-300">
                Found <strong className="text-[#00F2FE] font-black">{filteredAthletes.length}</strong> Prospects
              </span>
            </div>

            {/* MAIN BODY: SIDEBAR + BENTO GRID FEED */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* PERSISTENT FILTERING SIDEBAR */}
              <MatrixFilterSidebar
                filters={filters}
                onFilterChange={setFilters}
                onResetFilters={handleResetFilters}
                activeFilterCount={activeFilterCount}
                totalResults={filteredAthletes.length}
                allAthletes={allAthletes}
                isOpenMobile={isMobileFilterOpen}
                onCloseMobile={() => setIsMobileFilterOpen(false)}
              />

              {/* BENTO GRID FEED & ATHLETE CARDS */}
              <div className="flex-1 min-w-0 w-full space-y-8">
                {loadingFirestore ? (
                  <ScoutMatrixSkeleton count={6} />
                ) : filteredAthletes.length === 0 ? (
                  <div className="py-20 text-center space-y-4 bg-[#090E17]/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                      <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black uppercase italic text-white">NO ATHLETES FOUND MATCHING FILTERS</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Try expanding your graduation year, sport, state, or position search criteria, or turn off the NCAA Verified filter to see all prospects.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="px-6 py-2.5 rounded-xl bg-[#00F2FE] text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.4)]"
                    >
                      RESET ALL ACTIVE FILTERS
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                    {filteredAthletes.map((athlete, index) => {
                      // Insert COMPONENT B Bento Ad Slot `[SLOT ID: AD-SCOUT-SQ]` at index 2
                      const showBentoAd = index === 2;
                      // Insert COMPONENT B Leaderboard Banner `[SLOT ID: AD-SCOUT-LEADERBOARD]` at index 5
                      const showLeaderboardAd = index === 5;
                      const isCompared = comparedAthletes.some(a => a.uid === athlete.uid);

                      return (
                        <React.Fragment key={athlete.uid}>
                          {/* ATHLETE BENTO CARD WITH HOLODECK TRIGGER */}
                          <ProScoutBentoCard
                            athlete={athlete}
                            isBookmarked={bookmarks.includes(athlete.uid)}
                            onToggleBookmark={handleToggleBookmark}
                            onOpenDetailModal={setSelectedAthleteForModal}
                            onToggleCompare={handleToggleCompare}
                            isCompared={isCompared}
                          />

                          {/* SLOT ID: AD-SCOUT-SQ (1:1 Bento Ad Card) */}
                          {showBentoAd && (
                            <ScoutBentoAdCard 
                              onOpenAdvertiseModal={() => navigate('/advertise')} 
                            />
                          )}

                          {/* SLOT ID: AD-SCOUT-LEADERBOARD (Wide Banner inline) */}
                          {showLeaderboardAd && (
                            <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-3">
                              <ScoutLeaderboardAdBanner 
                                onOpenAdvertiseModal={() => navigate('/advertise')} 
                              />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </main>

      {/* COMPONENT D: ATHLETE DETAIL SHOWCASE MODAL */}
      {selectedAthleteForModal && (
        <AthleteDetailShowcaseModal
          athlete={selectedAthleteForModal}
          onClose={() => setSelectedAthleteForModal(null)}
          isBookmarked={bookmarks.includes(selectedAthleteForModal.uid)}
          onToggleBookmark={(uid) => toggleBookmark(uid)}
        />
      )}

      {/* COMPONENT E: COACH PASS SAAS SUBSCRIPTION MODAL */}
      <SubscriptionTierModal
        isOpen={showCoachPassModal}
        onClose={() => setShowCoachPassModal(false)}
        defaultTier="recruiter"
      />

      {/* COMPONENT F: FIELD GATE PASS SCANNER MODAL */}
      <GatePassScannerModal
        isOpen={showGateScanner}
        onClose={() => setShowGateScanner(false)}
      />

      {/* COMPONENT G: RECRUITER INQUIRIES & OUTREACH HUB MODAL */}
      {showInquiriesHubModal && (
        <RecruiterInquiriesHubModal
          isOpen={showInquiriesHubModal}
          onClose={() => setShowInquiriesHubModal(false)}
          currentUser={null}
        />
      )}

      {/* COMPONENT H: HEAD-TO-HEAD SCOUT COMPARISON HOLODECK DOCK */}
      <HeadToHeadComparisonDock
        athletes={comparedAthletes}
        onRemoveAthlete={handleRemoveCompareAthlete}
        onClearAll={() => setComparedAthletes([])}
        onOpenDetailModal={setSelectedAthleteForModal}
      />

    </div>
  );
};
