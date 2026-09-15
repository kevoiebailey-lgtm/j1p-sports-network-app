import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  BookOpen, 
  Camera, 
  Crosshair, 
  Heart, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Lock, 
  ShieldCheck,
  User,
  School,
  Calendar,
  MapPin,
  FileText,
  Search,
  Check,
  Zap,
  Flame,
  Layers,
  Building,
  Globe,
  Instagram,
  Youtube,
  Briefcase,
  Award
} from 'lucide-react';
import { doc, setDoc, getDocs, collection, query, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthRole } from '../../hooks/useAuthRole';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../Common/BrandLogo';
import { UserRole } from '../../types/platform';
import { UserProfile } from '../../types';

interface RoleCardOption {
  id: UserRole;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  icon: React.ElementType;
  redirectUrl: string;
  badge: string;
  badgeColor: string;
  accentGradient: string;
  borderColor: string;
}

const ONBOARDING_ROLES: RoleCardOption[] = [
  {
    id: 'athlete',
    title: 'Athlete',
    subtitle: 'Player Profile, Stats & Highlight Clips',
    description: 'Build your verified digital recruiting card, upload Hudl/video clips, track combine metrics, and get scouted.',
    features: ['Dynamic Scout Card & QR', 'Game Film & Clip Vault', 'Combine Metrics Radar'],
    icon: Trophy,
    redirectUrl: '/dashboard/athlete',
    badge: 'ATHLETE ACCESS',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    accentGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400'
  },
  {
    id: 'coach',
    title: 'Coach',
    subtitle: 'Team Rosters, Schedules, Evaluations & Film',
    description: 'Manage team rosters, coordinate game schedules, evaluate player talent, and design route trees and film breakdowns.',
    features: ['Team Roster Management', 'Player Evaluation Cards', 'Playbook Lab & Film Review'],
    icon: BookOpen,
    redirectUrl: '/dashboard/coach',
    badge: 'COACH ACCESS',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    accentGradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    borderColor: 'border-cyan-500/40 hover:border-cyan-400'
  },
  {
    id: 'scout',
    title: 'Scout / Recruiter',
    subtitle: 'Player Watchlists, Scouting Reports & Radar',
    description: 'Track top high school and AAU prospects, generate scouting evaluation reports, and monitor verified combine metrics.',
    features: ['Prospect Watchlists & Radar', 'In-Depth Scouting Reports', 'Verified Combine Metrics'],
    icon: Crosshair,
    redirectUrl: '/dashboard/scout',
    badge: 'SCOUT / RECRUITER ACCESS',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    accentGradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    borderColor: 'border-amber-500/40 hover:border-amber-400'
  },
  {
    id: 'creator',
    title: 'Content Creator / Media',
    subtitle: 'Media Vault, Google Drive Sync & 4K Sales',
    description: 'Upload 4K sports photos and reels directly to Google Drive/Cloud Storage, showcase albums, and accept client booking requests.',
    features: ['4K Direct Media Uploads', 'Photo & Video Album Showcase', 'Direct Client Bookings & Sales'],
    icon: Camera,
    redirectUrl: '/dashboard/creator',
    badge: 'CREATOR & MEDIA ACCESS',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    accentGradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
    borderColor: 'border-rose-500/40 hover:border-rose-400'
  },
  {
    id: 'director',
    title: 'Organization / Club / League',
    subtitle: 'Tournament Command, Registrations & Standings',
    description: 'Run sanctioned tournaments, manage team registrations, update division standings, and curate official media hubs.',
    features: ['Tournament Command Center', 'Team Registrations & Rosters', 'Division Standings & Live Score Desk'],
    icon: Building,
    redirectUrl: '/dashboard/director',
    badge: 'ORGANIZATION & LEAGUE ACCESS',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    accentGradient: 'from-orange-500/20 via-red-500/10 to-transparent',
    borderColor: 'border-orange-500/40 hover:border-orange-400'
  },
  {
    id: 'fan',
    title: 'Fan / Parent / Supporter',
    subtitle: 'Live Stream Wall, Team Follows & Game Scores',
    description: 'Follow your favorite teams and athletes, watch live court streams, track game scores, and purchase high-res gallery photos.',
    features: ['Live Stream Arena & Scores', 'Team & Athlete Follows', 'Media Gallery Photo Access'],
    icon: Heart,
    redirectUrl: '/dashboard/viewer',
    badge: 'FAN & SUPPORTER ACCESS',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
    accentGradient: 'from-indigo-500/20 via-purple-500/10 to-transparent',
    borderColor: 'border-indigo-500/40 hover:border-indigo-400'
  }
];

const SPORTS_LIST = [
  'Basketball',
  'Flag Football',
  '7v7 Football',
  'Tackle Football',
  'Track & Field',
  'Lacrosse',
  'Cheer & Dance',
  'Soccer',
  'Baseball',
  'Volleyball',
  'Multi-Sport / Other'
];

export const OnboardingModal: React.FC = () => {
  const { user, userDoc, switchRole, isAdmin } = useAuthRole();
  const { profile, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'create' | 'claim'>('create');
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>('athlete');
  
  // Common State
  const [displayName, setDisplayName] = useState(user?.displayName || userDoc?.displayName || profile?.displayName || '');
  const [state, setState] = useState((userDoc as any)?.state || profile?.state || 'NJ');
  const [bio, setBio] = useState((userDoc as any)?.bio || profile?.bio || '');
  const [sport, setSport] = useState((userDoc as any)?.sport || profile?.sport || 'Basketball');

  // Athlete specific
  const [position, setPosition] = useState((userDoc as any)?.position || profile?.position || '');
  const [highSchool, setHighSchool] = useState((userDoc as any)?.highSchool || profile?.highSchool || '');
  const [gradYear, setGradYear] = useState((userDoc as any)?.gradYear || profile?.gradYear || '2026');
  const [jerseyNumber, setJerseyNumber] = useState((userDoc as any)?.jerseyNumber || profile?.jerseyNumber || '');

  // Coach specific
  const [coachOrg, setCoachOrg] = useState((userDoc as any)?.organization || (profile as any)?.schoolName || '');
  const [programLevel, setProgramLevel] = useState((profile as any)?.programLevel || 'High School');
  const [coachTitle, setCoachTitle] = useState((profile as any)?.coachTitle || 'Head Coach');

  // Scout specific
  const [scoutOrg, setScoutOrg] = useState((userDoc as any)?.organization || (profile as any)?.agency || '');
  const [scoutingCoverage, setScoutingCoverage] = useState((profile as any)?.scoutingCoverage || 'High School');

  // Creator specific
  const [brandName, setBrandName] = useState((profile as any)?.brandName || '');
  const [mediaSpecialization, setMediaSpecialization] = useState((profile as any)?.mediaSpecialization || 'Sports Photography');
  const [portfolioUrl, setPortfolioUrl] = useState((profile as any)?.portfolioUrl || '');
  const [instagram, setInstagram] = useState((profile as any)?.social?.instagram || '');
  const [youtube, setYoutube] = useState((profile as any)?.social?.youtube || '');
  const [equipment, setEquipment] = useState((profile as any)?.equipment || '');

  // Organization specific
  const [orgName, setOrgName] = useState((profile as any)?.organizationName || '');
  const [orgType, setOrgType] = useState((profile as any)?.orgType || 'Club Program');
  const [ageDivisions, setAgeDivisions] = useState((profile as any)?.ageDivisions || 'High School 15U-18U');
  const [website, setWebsite] = useState((profile as any)?.website || '');
  const [primaryContact, setPrimaryContact] = useState((profile as any)?.primaryContact || '');

  // Fan specific
  const [favoriteTeams, setFavoriteTeams] = useState(((profile as any)?.favoriteTeams || []).join(', ') || '');

  // Claim Search State
  const [claimSearch, setClaimSearch] = useState('');
  const [availableProfiles, setAvailableProfiles] = useState<UserProfile[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const needsOnboarding = Boolean(
    user && 
    !isAdmin &&
    !userDoc?.profileCompleted &&
    !userDoc?.hasCompletedOnboarding &&
    !userDoc?.roleLocked && 
    !userDoc?.profileLocked &&
    !profile?.profileCompleted &&
    !profile?.hasCompletedOnboarding &&
    !profile?.roleLocked &&
    !profile?.profileLocked
  );

  // Fetch available profiles for claiming
  useEffect(() => {
    if (mode === 'claim' && needsOnboarding) {
      const fetchProfilesToClaim = async () => {
        setSearchingProfiles(true);
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, limit(40));
          const snap = await getDocs(q);
          const list: UserProfile[] = [];
          snap.forEach(docSnap => {
            const data = docSnap.data() as UserProfile;
            if (data.displayName && (!data.profileLocked || !data.uid || data.uid === docSnap.id)) {
              list.push({ ...data, uid: docSnap.id });
            }
          });
          setAvailableProfiles(list);
        } catch (e) {
          console.warn('Could not fetch existing profiles for claim:', e);
        } finally {
          setSearchingProfiles(false);
        }
      };
      fetchProfilesToClaim();
    }
  }, [mode, needsOnboarding]);

  if (!needsOnboarding) {
    return null;
  }

  const activeCard = ONBOARDING_ROLES.find(r => r.id === selectedRole) || ONBOARDING_ROLES[0];

  const handleNextStep = () => {
    setStep(2);
  };

  // Claim existing athlete / creator profile
  const handleClaimProfile = async (targetProfile: UserProfile) => {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    try {
      const userRef = doc(db, 'users', user.uid);
      const claimedData: UserProfile = {
        ...targetProfile,
        uid: user.uid,
        email: user.email || targetProfile.email,
        role: targetProfile.role || 'athlete',
        roleLocked: true,
        profileLocked: true,
        hasCompletedOnboarding: true,
        profileCompleted: true,
        isVerified: Boolean(targetProfile.isVerified),
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, {
        ...claimedData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      try {
        await updateUserProfile(claimedData);
      } catch (profileErr) {
        console.warn('Could not update profile state:', profileErr);
      }

      await switchRole(claimedData.role as UserRole || 'athlete');
      navigate('/locker-room');
    } catch (err: any) {
      console.error('Failed to claim profile:', err);
      setError(err?.message || 'Failed to claim profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Create & Lock New Profile dynamically tailored by role
  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);

    const resolvedName = displayName.trim() || user.displayName || (user.email ? user.email.split('@')[0] : 'Athletic Member');

    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Base Common Payload
      const userPayload: Record<string, any> = {
        uid: user.uid,
        email: user.email || '',
        displayName: resolvedName,
        role: selectedRole,
        roleLocked: true,
        profileLocked: true,
        hasCompletedOnboarding: true,
        profileCompleted: true,
        state: state.trim() || 'NJ',
        bio: bio.trim() || `${resolvedName} on Just1Play.`,
        isVerified: false,
        updatedAt: serverTimestamp(),
        createdAt: userDoc?.createdAt || new Date().toISOString()
      };

      // Tailor payload strictly by chosen role
      if (selectedRole === 'athlete') {
        userPayload.sport = sport;
        userPayload.position = position.trim() || 'Athlete';
        userPayload.primaryPosition = position.trim() || 'Athlete';
        userPayload.highSchool = highSchool.trim() || 'Tri-State Athletics';
        userPayload.teamName = highSchool.trim() || 'Tri-State Athletics';
        userPayload.gradYear = gradYear.trim() || '2026';
        if (jerseyNumber.trim()) {
          userPayload.jerseyNumber = jerseyNumber.trim();
        }
      } else if (selectedRole === 'coach') {
        userPayload.organization = coachOrg.trim() || 'Varsity Program';
        userPayload.schoolName = coachOrg.trim() || 'Varsity Program';
        userPayload.highSchool = coachOrg.trim() || 'Varsity Program';
        userPayload.programLevel = programLevel;
        userPayload.coachTitle = coachTitle;
        userPayload.position = coachTitle;
        userPayload.sport = sport;
        userPayload.sportsCoached = [sport];
        userPayload.coachingPhilosophy = bio.trim();
      } else if (selectedRole === 'scout') {
        userPayload.organization = scoutOrg.trim() || 'Independent Scouting';
        userPayload.agency = scoutOrg.trim() || 'Independent Scouting';
        userPayload.scoutingCoverage = scoutingCoverage;
        userPayload.sport = sport;
        userPayload.sportsEvaluated = [sport];
        userPayload.scoutingRegion = state.trim();
        userPayload.credentials = bio.trim();
      } else if (selectedRole === 'creator') {
        userPayload.brandName = brandName.trim() || resolvedName;
        userPayload.mediaSpecialization = mediaSpecialization;
        userPayload.portfolioUrl = portfolioUrl.trim();
        userPayload.social = {
          instagram: instagram.trim(),
          youtube: youtube.trim(),
          website: portfolioUrl.trim()
        };
        userPayload.equipment = equipment.trim();
        userPayload.bookingInfo = bio.trim();
      } else if (selectedRole === 'director') {
        userPayload.organizationName = orgName.trim() || resolvedName;
        userPayload.organization = orgName.trim() || resolvedName;
        userPayload.orgType = orgType;
        userPayload.sport = sport;
        userPayload.sportsOffered = [sport];
        userPayload.ageDivisions = ageDivisions;
        userPayload.website = website.trim();
        userPayload.primaryContact = primaryContact.trim() || resolvedName;
        userPayload.directorName = primaryContact.trim() || resolvedName;
        userPayload.aboutOrg = bio.trim();
      } else if (selectedRole === 'fan') {
        userPayload.favoriteTeams = favoriteTeams ? favoriteTeams.split(',').map(s => s.trim()).filter(Boolean) : [];
        userPayload.sport = sport;
        userPayload.sportsFollowed = [sport];
      }

      await setDoc(userRef, userPayload, { merge: true });

      // Update AuthContext profile
      try {
        await updateUserProfile(userPayload as any);
      } catch (profileErr) {
        console.warn('Could not update profile state:', profileErr);
      }

      // Switch active role
      await switchRole(selectedRole);

      // Direct navigation to tailored dashboard
      navigate(activeCard.redirectUrl || '/dashboard/athlete');
    } catch (err: any) {
      console.error('Failed to save profile and complete onboarding:', err);
      setError(err?.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClaimProfiles = availableProfiles.filter(p => {
    if (!claimSearch.trim()) return true;
    const term = claimSearch.toLowerCase().trim();
    return (
      (p.displayName || '').toLowerCase().includes(term) ||
      (p.highSchool || '').toLowerCase().includes(term) ||
      (p.sport || '').toLowerCase().includes(term) ||
      (p.jerseyNumber || '').toString().includes(term) ||
      (p.position || '').toLowerCase().includes(term)
    );
  });

  return (
    <AnimatePresence>
      <div 
        id="onboarding-role-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#090D16]/95 backdrop-blur-2xl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl w-full my-auto space-y-6 text-white"
        >
          {/* Header Branding */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-2">
              <BrandLogo size="md" layout="horizontal" showBadge={true} />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-xs font-mono font-bold text-[#FF6A00]">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
              <span>POST-LOGIN PROFILE SETUP & LOCK-IN</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white font-sans">
              Setup Your <span className="text-[#FF6A00] drop-shadow-[0_0_15px_rgba(255,106,0,0.5)]">Member Profile</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 font-mono max-w-xl mx-auto leading-relaxed">
              Select your membership role and complete your profile. Your dashboard and tools will be instantly customized to your selection.
            </p>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-700 max-w-md mx-auto">
              <button
                onClick={() => { setMode('create'); setStep(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase transition-all cursor-pointer ${
                  mode === 'create'
                    ? 'bg-[#FF6A00] text-white shadow-[0_0_15px_rgba(255,106,0,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Create New Profile
              </button>
              <button
                onClick={() => setMode('claim')}
                className={`px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase transition-all cursor-pointer ${
                  mode === 'claim'
                    ? 'bg-[#00B8D4] text-black font-black shadow-[0_0_15px_rgba(0,184,212,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Claim Existing Profile
              </button>
            </div>

            {/* Role Locking Security Notice */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 max-w-lg mx-auto flex items-center gap-2.5 text-left backdrop-blur-md">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-[11px] font-mono text-amber-200/90 leading-tight">
                <strong>Immutable Account Lock:</strong> Once claimed or created, this profile will be permanently locked to your authenticated credentials.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs font-mono text-rose-300 text-center">
              {error}
            </div>
          )}

          {/* CLAIM EXISTING PROFILE MODE */}
          {mode === 'claim' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={claimSearch}
                  onChange={(e) => setClaimSearch(e.target.value)}
                  placeholder="Search by Athlete Name, High School, Jersey #, or Sport..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                />
              </div>

              {searchingProfiles ? (
                <div className="p-8 text-center text-xs font-mono text-slate-400 animate-pulse">
                  Searching directory profiles...
                </div>
              ) : filteredClaimProfiles.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
                  <p className="text-xs font-mono text-slate-400">No matching unclaimed profiles found.</p>
                  <button
                    onClick={() => { setMode('create'); setStep(1); }}
                    className="px-4 py-2 rounded-xl bg-[#FF6A00] text-white text-xs font-bold font-mono uppercase"
                  >
                    Create New Profile Instead
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {filteredClaimProfiles.map((prof) => (
                    <div
                      key={prof.uid}
                      className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-[#00B8D4] transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#00B8D4]/20 border border-[#00B8D4]/40 flex items-center justify-center text-[#00B8D4] font-black shrink-0">
                          {prof.displayName ? prof.displayName[0].toUpperCase() : 'A'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{prof.displayName}</p>
                          <p className="text-[11px] font-mono text-slate-400 truncate">
                            {prof.sport || 'Sports'} • {prof.highSchool || 'High School'} {prof.jerseyNumber ? `(#${prof.jerseyNumber})` : ''}
                          </p>
                          <span className="text-[9px] font-mono uppercase text-[#00B8D4]">
                            {prof.position || prof.role || 'Athlete'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleClaimProfile(prof)}
                        disabled={submitting}
                        className="px-3 py-1.5 rounded-lg bg-[#00B8D4] text-black font-black text-[11px] font-mono uppercase hover:bg-[#00F5D4] transition-all shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? 'Linking...' : 'Claim Profile'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREATE NEW PROFILE: STEP 1 (ROLE SELECTION) */}
          {mode === 'create' && step === 1 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {ONBOARDING_ROLES.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedRole === option.id;

                  return (
                    <div
                      key={option.id}
                      id={`onboarding-role-card-${option.id}`}
                      onClick={() => setSelectedRole(option.id)}
                      className={`relative group rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden border ${
                        isSelected
                          ? 'bg-slate-900/90 border-[#FF6A00] shadow-[0_0_25px_rgba(255,106,0,0.35)] -translate-y-1'
                          : 'bg-slate-950/60 border-white/10 hover:border-white/30 hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Top Bar: Icon Badge + Selection Checkmark */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${option.accentGradient} border ${option.borderColor} text-white`}>
                            <Icon className="w-5 h-5 stroke-[2.2]" />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full border uppercase ${option.badgeColor}`}>
                              {option.badge}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shadow-[0_0_8px_rgba(255,106,0,0.8)]">
                                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Titles */}
                        <div>
                          <h3 className="text-base font-black italic uppercase tracking-tight text-white group-hover:text-[#FF6A00] transition-colors">
                            {option.title}
                          </h3>
                          <p className="text-[11px] font-mono font-bold text-cyan-400 mt-0.5">
                            {option.subtitle}
                          </p>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-400 font-mono leading-relaxed">
                          {option.description}
                        </p>

                        {/* Feature Bullets */}
                        <ul className="space-y-1 pt-1">
                          {option.features.map((feat, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                              <span className="text-[#00F5D4] text-xs">▸</span>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Radio Indicator */}
                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                        <span className={isSelected ? 'text-[#FF6A00] font-bold' : 'text-slate-500'}>
                          {isSelected ? '✓ SELECTED' : 'CLICK TO SELECT'}
                        </span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-[#FF6A00] bg-[#FF6A00]' : 'border-slate-600'
                        }`}>
                          {isSelected && <div className="w-1 h-1 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Step 1 Action Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0F172A]/90 border border-white/15 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6A00]/20 border border-[#FF6A00]/40 flex items-center justify-center text-[#FF6A00] shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                      Selected Role
                    </div>
                    <div className="text-sm sm:text-base font-black uppercase text-white font-sans flex items-center gap-2">
                      <span>{activeCard.title}</span>
                    </div>
                  </div>
                </div>

                <button
                  id="btn-onboarding-continue"
                  onClick={handleNextStep}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(255,106,0,0.45)] border border-[#FFC857]/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue to Step 2: Profile Details</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </>
          )}

          {/* CREATE NEW PROFILE: STEP 2 (DYNAMIC PROFILE DETAILS BY ROLE) */}
          {mode === 'create' && step === 2 && (
            <form onSubmit={handleFinishOnboarding} className="space-y-4">
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-[#00B8D4]/40 shadow-[0_0_30px_rgba(0,184,212,0.15)] space-y-4">
                
                {/* Role Badge Indicator */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 uppercase">Configuring Profile For:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold uppercase">
                      {activeCard.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">Step 2 of 2</span>
                </div>

                {/* 1. ATHLETE FORM FIELDS */}
                {selectedRole === 'athlete' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Full Name *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Jaylen Harris"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Primary Sport *</span>
                        </label>
                        <select
                          value={sport}
                          onChange={(e) => setSport(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                        >
                          {SPORTS_LIST.map((s) => (
                            <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Position *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={position}
                          onChange={(e) => setPosition(e.target.value)}
                          placeholder="e.g. Point Guard, WR/CB, Midfielder"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Team / High School / Club *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={highSchool}
                          onChange={(e) => setHighSchool(e.target.value)}
                          placeholder="e.g. Camden High Knights / NJ Scholars AAU"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Graduation Year / Class *</span>
                        </label>
                        <select
                          value={gradYear}
                          onChange={(e) => setGradYear(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                        >
                          {['2025', '2026', '2027', '2028', '2029', '2030'].map(yr => (
                            <option key={yr} value={yr} className="bg-slate-900 text-white">Class of {yr}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#00B8D4]" />
                            <span>State *</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="e.g. NJ"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-[#00B8D4]" />
                            <span>Jersey #</span>
                          </label>
                          <input
                            type="text"
                            value={jerseyNumber}
                            onChange={(e) => setJerseyNumber(e.target.value)}
                            placeholder="e.g. 23"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#00B8D4]" />
                        <span>Bio / Athletic Summary</span>
                      </label>
                      <textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Athletic accolades, GPA, stats, or recruiting goals..."
                        className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                      />
                    </div>
                  </div>
                )}

                {/* 2. COACH FORM FIELDS */}
                {selectedRole === 'coach' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Full Name *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Coach Kevin Bailey"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Organization / School Name *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={coachOrg}
                          onChange={(e) => setCoachOrg(e.target.value)}
                          placeholder="e.g. St. Benedict's Prep / Tri-State Elite"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Program Level *</span>
                        </label>
                        <select
                          value={programLevel}
                          onChange={(e) => setProgramLevel(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                        >
                          <option value="Youth (8U-14U)">Youth (8U-14U)</option>
                          <option value="High School / Varsity">High School / Varsity</option>
                          <option value="AAU / Club Circuit">AAU / Club Circuit</option>
                          <option value="College / Junior College">College / Junior College</option>
                          <option value="Semi-Pro / Training Academy">Semi-Pro / Training Academy</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Title / Role *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={coachTitle}
                          onChange={(e) => setCoachTitle(e.target.value)}
                          placeholder="e.g. Head Coach, Offensive Coordinator, Skill Trainer"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Sports Coached *</span>
                        </label>
                        <select
                          value={sport}
                          onChange={(e) => setSport(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                        >
                          {SPORTS_LIST.map((s) => (
                            <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>State / Region *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="e.g. NJ / NY Tri-State"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#00B8D4]" />
                        <span>Bio / Coaching Philosophy</span>
                      </label>
                      <textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Coaching philosophy, team achievements, route schemes, or player development focus..."
                        className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                      />
                    </div>
                  </div>
                )}

                {/* 3. SCOUT / RECRUITER FORM FIELDS */}
                {selectedRole === 'scout' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Full Name *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Marcus Vance"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Organization / Agency / Independent *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={scoutOrg}
                          onChange={(e) => setScoutOrg(e.target.value)}
                          placeholder="e.g. East Coast Recruiting Report / Independent"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Crosshair className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Scouting Coverage *</span>
                        </label>
                        <select
                          value={scoutingCoverage}
                          onChange={(e) => setScoutingCoverage(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                        >
                          <option value="High School / Prep">High School / Prep</option>
                          <option value="AAU / Grassroots Circuit">AAU / Grassroots Circuit</option>
                          <option value="College / NCAA Transfer Portal">College / NCAA Transfer Portal</option>
                          <option value="Pro / International Showcase">Pro / International Showcase</option>
                          <option value="All Levels">All Levels</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Sports Evaluated *</span>
                        </label>
                        <select
                          value={sport}
                          onChange={(e) => setSport(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                        >
                          {SPORTS_LIST.map((s) => (
                            <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Region / Territory Covered *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="e.g. Mid-Atlantic, Northeast, National"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#00B8D4]" />
                        <span>Bio / Credentials & Evaluation Focus</span>
                      </label>
                      <textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Evaluation criteria, scouting credentials, media affiliations, or combine coverage history..."
                        className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                      />
                    </div>
                  </div>
                )}

                {/* 4. CONTENT CREATOR / MEDIA FORM FIELDS */}
                {selectedRole === 'creator' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Full Name / Brand Name *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Apex Visuals / Jordan Reed"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Media Specialization *</span>
                        </label>
                        <select
                          value={mediaSpecialization}
                          onChange={(e) => setMediaSpecialization(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                        >
                          <option value="Sports Photography">Sports Photography</option>
                          <option value="Videography & 4K Game Film">Videography & 4K Game Film</option>
                          <option value="Mix / Highlight Reels & Edits">Mix / Highlight Reels & Edits</option>
                          <option value="Graphic Design & Player Cards">Graphic Design & Player Cards</option>
                          <option value="Sports Journalism & Interviews">Sports Journalism & Interviews</option>
                          <option value="Multi-Media Creator">Multi-Media Creator</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Portfolio / Website Link</span>
                        </label>
                        <input
                          type="url"
                          value={portfolioUrl}
                          onChange={(e) => setPortfolioUrl(e.target.value)}
                          placeholder="https://myportfoliomedia.com"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>City & State *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="e.g. Philadelphia, PA"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Instagram className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Instagram Handle</span>
                        </label>
                        <input
                          type="text"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          placeholder="@apexvisuals_sports"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Youtube className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>YouTube / TikTok Channel</span>
                        </label>
                        <input
                          type="text"
                          value={youtube}
                          onChange={(e) => setYoutube(e.target.value)}
                          placeholder="youtube.com/@apexvisuals"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#00B8D4]" />
                        <span>Equipment, Bio & Booking Info</span>
                      </label>
                      <textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Camera bodies, 4K 120fps slow-mo capabilities, pricing packages, or booking turnaround..."
                        className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                      />
                    </div>
                  </div>
                )}

                {/* 5. ORGANIZATION / CLUB / LEAGUE FORM FIELDS */}
                {selectedRole === 'director' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Organization / League Name *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => {
                            setDisplayName(e.target.value);
                            setOrgName(e.target.value);
                          }}
                          placeholder="e.g. Garden State Super League"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Organization Type *</span>
                        </label>
                        <select
                          value={orgType}
                          onChange={(e) => setOrgType(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                        >
                          <option value="Club / AAU Program">Club / AAU Program</option>
                          <option value="Tournament Host / Circuit">Tournament Host / Circuit</option>
                          <option value="Sanctioned League">Sanctioned League</option>
                          <option value="School District / Athletic Dept">School District / Athletic Dept</option>
                          <option value="Training Facility / Complex">Training Facility / Complex</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Primary Sports Offered *</span>
                        </label>
                        <select
                          value={sport}
                          onChange={(e) => setSport(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                        >
                          {SPORTS_LIST.map((s) => (
                            <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Age Groups / Divisions *</span>
                        </label>
                        <select
                          value={ageDivisions}
                          onChange={(e) => setAgeDivisions(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                        >
                          <option value="8U - 14U Youth">8U - 14U Youth</option>
                          <option value="High School 15U - 18U">High School 15U - 18U</option>
                          <option value="Open / Adult Competitions">Open / Adult Competitions</option>
                          <option value="All Age Divisions">All Age Divisions</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Director / Primary Contact *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={primaryContact}
                          onChange={(e) => setPrimaryContact(e.target.value)}
                          placeholder="e.g. Director Marcus Bailey"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>State / Region *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="e.g. NJ / NY Metro"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#00B8D4]" />
                        <span>About Organization & Tournaments</span>
                      </label>
                      <textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Mission, tournament venues, seasonal circuits, registration info..."
                        className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                      />
                    </div>
                  </div>
                )}

                {/* 6. FAN / PARENT / SUPPORTER FORM FIELDS */}
                {selectedRole === 'fan' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Full Name *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Danielle Washington"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Sports Followed *</span>
                        </label>
                        <select
                          value={sport}
                          onChange={(e) => setSport(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                        >
                          {SPORTS_LIST.map((s) => (
                            <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>Favorite Teams / Athletes</span>
                        </label>
                        <input
                          type="text"
                          value={favoriteTeams}
                          onChange={(e) => setFavoriteTeams(e.target.value)}
                          placeholder="e.g. Camden High, Jaylen Harris"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#00B8D4]" />
                          <span>City & State *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="e.g. Newark, NJ"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#00B8D4]" />
                        <span>Supporter Bio (Optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Proud basketball parent, high school athletics supporter..."
                        className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Step 2 Action Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0F172A]/90 border border-white/15 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-xs font-mono font-bold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Role Selection</span>
                </button>

                <button
                  id="btn-confirm-lock-role"
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(0,184,212,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{submitting ? 'Saving Profile & Launching...' : `Complete Profile & Enter ${activeCard.title} Hub`}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OnboardingModal;
