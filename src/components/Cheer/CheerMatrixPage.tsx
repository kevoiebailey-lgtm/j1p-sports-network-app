import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  ShieldCheck, 
  Trophy, 
  Flame, 
  Zap, 
  ArrowRight, 
  ExternalLink, 
  Layers, 
  Play, 
  Share2,
  Users,
  CheckCircle2,
  Sliders,
  Search,
  User,
  GraduationCap,
  MapPin,
  Star,
  Award,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CheerMatrix } from './CheerMatrix';
import { useAuth } from '../../context/AuthContext';
import { ShareButton } from '../ShareButton';
import { UserProfile } from '../../types';

interface FeaturedCheerAthlete {
  uid: string;
  displayName: string;
  sport: string;
  position: string;
  highSchool: string;
  gymClub: string;
  gradYear: string;
  gpa: string;
  state: string;
  avatarUrl: string;
  ncaaId?: string;
  level: string;
  isVerified: boolean;
}

const FEATURED_CHEER_ATHLETES: FeaturedCheerAthlete[] = [
  {
    uid: 'cheer_mia_jenkins',
    displayName: 'Mia Jenkins',
    sport: 'Cheerleading',
    position: 'Flyer & Tumbler',
    highSchool: 'Dunwoody High School',
    gymClub: 'Top Gun All-Stars (L6)',
    gradYear: '2026',
    gpa: '3.9',
    state: 'GA',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    ncaaId: 'NCAA-948201',
    level: 'NCAA D1 / Level 6',
    isVerified: true
  },
  {
    uid: 'cheer_taylor_reed',
    displayName: 'Taylor Reed',
    sport: 'Cheerleading & STUNT',
    position: 'Main Base',
    highSchool: 'Centennial High School',
    gymClub: 'Cheer Athletics Panthers',
    gradYear: '2025',
    gpa: '3.8',
    state: 'TX',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    ncaaId: 'NCAA-783921',
    level: 'NCAA D1 Recruit',
    isVerified: true
  },
  {
    uid: 'cheer_jordan_davis',
    displayName: 'Jordan Davis',
    sport: 'STUNT & Gymnastics',
    position: 'Backspot & Tumbler',
    highSchool: 'Mater Dei High School',
    gymClub: 'California All Stars SMOED',
    gradYear: '2027',
    gpa: '4.0',
    state: 'CA',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    ncaaId: 'NCAA-629104',
    level: 'STUNT Elite Ready',
    isVerified: true
  }
];

export const CheerMatrixPage: React.FC = () => {
  const { userId: urlUserId } = useParams<{ userId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile: authProfile, role } = useAuth();

  const queryAthleteId = searchParams.get('athleteId') || searchParams.get('user') || urlUserId;

  const [activeTab, setActiveTab] = useState<'matrix' | 'rubric' | 'standards'>('matrix');
  const [selectedAthlete, setSelectedAthlete] = useState<FeaturedCheerAthlete | UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Determine active profile to display
  useEffect(() => {
    let isMounted = true;

    const loadTargetProfile = async () => {
      setProfileLoading(true);
      const targetUid = queryAthleteId || user?.uid || 'cheer_mia_jenkins';

      // Check if matching featured presets first
      const featured = FEATURED_CHEER_ATHLETES.find(a => a.uid === targetUid);
      if (featured) {
        if (isMounted) {
          setSelectedAthlete(featured);
          setProfileLoading(false);
        }
        return;
      }

      // Check if matches authenticated user
      if (user && user.uid === targetUid && authProfile) {
        if (isMounted) {
          setSelectedAthlete(authProfile);
          setProfileLoading(false);
        }
        return;
      }

      // Query Firestore for real user profile
      try {
        if (db) {
          const userDocRef = doc(db, 'users', targetUid);
          const snap = await getDoc(userDocRef);
          if (snap.exists() && isMounted) {
            const data = snap.data() as UserProfile;
            setSelectedAthlete({
              ...data,
              uid: snap.id
            });
            setProfileLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Error fetching athlete profile from Firestore:', err);
      }

      // Fallback to primary demo cheerleader
      if (isMounted) {
        setSelectedAthlete(FEATURED_CHEER_ATHLETES[0]);
        setProfileLoading(false);
      }
    };

    loadTargetProfile();

    return () => {
      isMounted = false;
    };
  }, [queryAthleteId, user?.uid, authProfile]);

  // Handle athlete search across Firestore
  const handleSearchAthletes = async (queryText: string) => {
    setSearchQuery(queryText);
    if (!queryText.trim() || queryText.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      if (db) {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('role', '==', 'athlete'),
          limit(6)
        );
        const snapshot = await getDocs(q);
        const found = snapshot.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter((u: any) => 
            (u.displayName && u.displayName.toLowerCase().includes(queryText.toLowerCase())) ||
            (u.sport && u.sport.toLowerCase().includes(queryText.toLowerCase())) ||
            (u.highSchool && u.highSchool.toLowerCase().includes(queryText.toLowerCase()))
          );
        setSearchResults(found);
      }
    } catch (err) {
      console.warn('CheerMatrix athlete search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectAthlete = (athlete: any) => {
    setSelectedAthlete(athlete);
    setSearchParams({ athleteId: athlete.uid });
    setSearchQuery('');
    setSearchResults([]);
  };

  const currentUid = selectedAthlete?.uid || user?.uid || 'guest_cheer';
  const isOwner = Boolean(user && user.uid === currentUid);
  const isAthleteSelf = Boolean(user && authProfile && authProfile.uid === currentUid);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                Just1Play Scouting Radar
              </span>
              <span className="text-neutral-600">&bull;</span>
              <span className="text-xs font-mono text-sky-400 font-bold">Cheerleading & STUNT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>CheerMatrix</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                NCAA & All-Star Radar
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {user && !isOwner && (
              <button
                type="button"
                onClick={() => {
                  if (authProfile) {
                    setSelectedAthlete(authProfile);
                    setSearchParams({ athleteId: user.uid });
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>My Cheer Dossier</span>
              </button>
            )}

            <ShareButton
              path="cheer-matrix"
              title="Just1Play CheerMatrix - Skill Verification Radar"
              text={`Explore ${selectedAthlete?.displayName || 'Cheer Athlete'}'s verified skills, tumbling passes, and college recruiting readiness on Just1Play.`}
            />
          </div>
        </div>

        {/* Athlete Selection & Search Command Bar */}
        <div className="bg-[#11161f] border border-neutral-800 rounded-3xl p-4 sm:p-6 space-y-4 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search athlete by name, gym, or school..."
                value={searchQuery}
                onChange={(e) => handleSearchAthletes(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-900/90 border border-neutral-700/80 rounded-2xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />

              {/* Search dropdown results */}
              {searchResults.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-neutral-900 border border-neutral-700 rounded-2xl p-2 shadow-2xl space-y-1 max-h-60 overflow-y-auto">
                  {searchResults.map((ath) => (
                    <button
                      key={ath.uid}
                      type="button"
                      onClick={() => selectAthlete(ath)}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-neutral-800 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={ath.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={ath.displayName}
                          className="w-7 h-7 rounded-full object-cover border border-emerald-500/40"
                        />
                        <div>
                          <p className="text-xs font-bold text-white">{ath.displayName}</p>
                          <p className="text-[10px] font-mono text-neutral-400">{ath.sport || 'Cheerleading'} &bull; {ath.highSchool || ath.teamName || 'Athlete'}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Pick Featured Athlete Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[11px] font-mono text-neutral-400 uppercase font-bold shrink-0">
                Featured Recruits:
              </span>
              {FEATURED_CHEER_ATHLETES.map((fa) => {
                const isFaActive = selectedAthlete?.uid === fa.uid;
                return (
                  <button
                    key={fa.uid}
                    type="button"
                    onClick={() => selectAthlete(fa)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer border ${
                      isFaActive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-neutral-900/80 text-neutral-400 hover:text-white hover:bg-neutral-800 border-neutral-700/60'
                    }`}
                  >
                    <img
                      src={fa.avatarUrl}
                      alt={fa.displayName}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span>{fa.displayName}</span>
                    <span className="text-[10px] opacity-75">({fa.position.split(' ')[0]})</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Active Athlete Banner Card */}
          {selectedAthlete && (
            <div className="mt-4 pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <img
                    src={selectedAthlete.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                    alt={selectedAthlete.displayName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#11161f]" title="Active Profile" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white tracking-tight">
                      {selectedAthlete.displayName}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                      {'level' in selectedAthlete ? selectedAthlete.level : 'Verified Recruit'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-neutral-400">
                    <span className="text-neutral-300 font-bold">{selectedAthlete.position || 'Cheer Athlete'}</span>
                    <span>&bull;</span>
                    <span>{'gymClub' in selectedAthlete ? selectedAthlete.gymClub : selectedAthlete.highSchool || 'Just1Play Athlete'}</span>
                    <span>&bull;</span>
                    <span>Class of {selectedAthlete.gradYear || '2026'}</span>
                    {selectedAthlete.gpa && (
                      <>
                        <span>&bull;</span>
                        <span className="text-sky-400 font-bold">{selectedAthlete.gpa} GPA</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <Link
                  to={`/profile/${selectedAthlete.uid}`}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span>Full Sports Profile</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs (Matrix Radar / College Rubric / Recruiting Standards) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-neutral-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Interactive Skill Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('standards')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'standards'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-neutral-950 shadow-[0_0_20px_rgba(56,189,248,0.35)]'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>NCAA D1 & D2 Recruiting Standards</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rubric')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'rubric'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-neutral-950 shadow-[0_0_20px_rgba(168,85,247,0.35)]'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Verification Criteria & Floor Types</span>
          </button>
        </div>

        {/* Tab 1: Interactive Matrix Component */}
        {activeTab === 'matrix' && (
          <CheerMatrix
            userId={selectedAthlete?.uid || currentUid}
            athleteName={selectedAthlete?.displayName || 'Cheer Athlete'}
            athleteAvatar={(selectedAthlete as any)?.avatarUrl || (selectedAthlete as any)?.photoURL}
            gradYear={(selectedAthlete as any)?.gradYear || '2026'}
            position={(selectedAthlete as any)?.position || 'Flyer / Tumbler'}
            gpa={(selectedAthlete as any)?.gpa || '3.85'}
            schoolGym={
              (selectedAthlete as any)?.highSchool && (selectedAthlete as any)?.gymClub
                ? `${(selectedAthlete as any)?.highSchool} / ${(selectedAthlete as any)?.gymClub}`
                : (selectedAthlete as any)?.highSchool || (selectedAthlete as any)?.gymClub || 'East Orange Jaguar Cheer'
            }
            isOwner={isOwner}
            readOnly={!isOwner && role !== 'admin'}
          />
        )}

        {/* Tab 2: NCAA Standards Rubric */}
        {activeTab === 'standards' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* NCAA Division 1 Elite */}
              <div className="bg-neutral-900/80 border border-emerald-500/30 rounded-3xl p-6 space-y-4 backdrop-blur-xl shadow-[0_0_25px_rgba(16,185,129,0.1)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    NCAA D1 / STUNT Elite
                  </span>
                  <Trophy className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Division 1 Collegiate Standard</h3>
                <ul className="space-y-2.5 text-xs text-neutral-300 font-mono">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Standing Tumbling: Standing Tuck, Standing Full, 2 BHS to Full</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Running Tumbling: RO BHS Double Full, Whip Full combinations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Stunts: Rewinds, Hand-in-Hand, Inverted Releases, Double-Up to Stretch</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Floor Surface: Verified execution on Dead Floor</span>
                  </li>
                </ul>
              </div>

              {/* NCAA Division 2 / Competitive STUNT */}
              <div className="bg-neutral-900/80 border border-sky-500/30 rounded-3xl p-6 space-y-4 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40">
                    NCAA D2 / NAIA / STUNT
                  </span>
                  <Flame className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Division 2 & STUNT Standard</h3>
                <ul className="space-y-2.5 text-xs text-neutral-300 font-mono">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>Standing Tumbling: Standing Tuck, Standing BHS Layout</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>Running Tumbling: RO BHS Full Layout</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>Stunts: Full-Up to Extension, Switch-Up Liberty, High-to-High Tic Tocs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>Jumps: Hyper-extended Triple Toe Touch & Jump to Tuck</span>
                  </li>
                </ul>
              </div>

              {/* All-Star Premier (Level 6) */}
              <div className="bg-neutral-900/80 border border-purple-500/30 rounded-3xl p-6 space-y-4 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40">
                    USASF Level 6 / Premier
                  </span>
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white">All-Star Worlds Division</h3>
                <ul className="space-y-2.5 text-xs text-neutral-300 font-mono">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>Standing: Standing BHS Full, Jump to Tuck</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>Running: Specialty Passes (Whip to Full, Arabian punch)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>Stunts: 1.5 Up to Lib, Inverted Flip Dismounts, Needle / Scorpion pulls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>Floor Surface: Spring Floor / Competition Mats</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Verification Criteria & Floor Surface Guidance */}
        {activeTab === 'rubric' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 space-y-4 backdrop-blur-xl">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Floor Surface Classification</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                College recruiters prioritize skills verified on hard surfaces (dead floor) due to NCAA basketball court and turf requirements.
              </p>
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-2xl bg-neutral-950 border border-amber-500/20 text-neutral-300">
                  <span className="text-amber-400 font-bold">1. Dead Floor (No Springs):</span> High collegiate value. Indicates raw power, landing safety, and gameday readiness.
                </div>
                <div className="p-3 rounded-2xl bg-neutral-950 border border-sky-500/20 text-neutral-300">
                  <span className="text-sky-400 font-bold">2. Spring Floor:</span> Standard All-Star competitive floor. Demonstrates peak rotational height and twisting agility.
                </div>
                <div className="p-3 rounded-2xl bg-neutral-950 border border-emerald-500/20 text-neutral-300">
                  <span className="text-emerald-400 font-bold">3. Grass / Turf:</span> Sideline gameday surface for football games, pep rallies, and field demos.
                </div>
              </div>
            </div>

            <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 space-y-4 backdrop-blur-xl">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">How Skill Verification Works</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Athletes submit external video links (YouTube, Hudl, Vimeo, Instagram) with precise timestamps. Scouts review execution:
              </p>
              <ul className="space-y-2.5 text-xs text-neutral-300 font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span><strong>Tuck / Layout:</strong> Chest high upon landing with zero knee buckle</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span><strong>Twisting Passes:</strong> Complete twist before mat contact</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span><strong>Flyer Flexibility:</strong> 180°+ hyperextension, locked base knee</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span><strong>Stunt Stability:</strong> 3-second hold without wobble or step</span>
                </li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
