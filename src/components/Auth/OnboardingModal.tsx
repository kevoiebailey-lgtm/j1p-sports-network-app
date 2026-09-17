import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  ShieldCheck, 
  Crosshair, 
  Camera, 
  Heart, 
  ArrowRight, 
  CheckCircle2, 
  Search, 
  UserCheck, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useAuthRole } from '../../hooks/useAuthRole';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole, UserProfile } from '../../types';
import { doc, setDoc, getDocs, collection, query, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface RoleCardOption {
  id: UserRole;
  title: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  dashboardUrl: string;
  accentGradient: string;
  glowColor: string;
  borderColor: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
}

// Exactly the 5 requested visual cards (No Admin role)
const PROGRESSIVE_ROLES: RoleCardOption[] = [
  {
    id: 'fan',
    title: 'Fan / Supporter',
    tagline: 'Follow athletes, watch highlights, buy media',
    icon: Heart,
    dashboardUrl: '/dashboard/viewer',
    accentGradient: 'from-violet-600/20 via-purple-500/10 to-transparent',
    glowColor: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]',
    borderColor: 'border-violet-500/30 hover:border-violet-400',
    badge: 'FAN & SUPPORTER',
    badgeBg: 'bg-violet-500/20',
    badgeText: 'text-violet-300 border-violet-500/40',
    iconBg: 'bg-violet-500/15 border-violet-500/30',
    iconColor: 'text-violet-400'
  },
  {
    id: 'athlete',
    title: 'Athlete',
    tagline: 'Build your scout profile, showcase tape, get recruited',
    icon: Trophy,
    dashboardUrl: '/dashboard/athlete',
    accentGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    glowColor: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]',
    borderColor: 'border-emerald-500/30 hover:border-emerald-400',
    badge: 'ATHLETE RECRUIT',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300 border-emerald-500/40',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400'
  },
  {
    id: 'coach',
    title: 'Coach / Organization',
    tagline: 'Manage rosters, run playbooks, schedule events',
    icon: ShieldCheck,
    dashboardUrl: '/dashboard/coach',
    accentGradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    glowColor: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.25)]',
    borderColor: 'border-cyan-500/30 hover:border-cyan-400',
    badge: 'COACH & ORG',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300 border-cyan-500/40',
    iconBg: 'bg-cyan-500/15 border-cyan-500/30',
    iconColor: 'text-cyan-400'
  },
  {
    id: 'scout',
    title: 'Scout / Recruiter',
    tagline: 'Discover talent, evaluate measurables, track prospects',
    icon: Crosshair,
    dashboardUrl: '/dashboard/scout',
    accentGradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    glowColor: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]',
    borderColor: 'border-amber-500/30 hover:border-amber-400',
    badge: 'TALENT SCOUT',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300 border-amber-500/40',
    iconBg: 'bg-amber-500/15 border-amber-500/30',
    iconColor: 'text-amber-400'
  },
  {
    id: 'creator',
    title: 'Content Creator / Media',
    tagline: 'Upload photo galleries, sell prints/cards, cover games',
    icon: Camera,
    dashboardUrl: '/dashboard/creator',
    accentGradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
    glowColor: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.25)]',
    borderColor: 'border-rose-500/30 hover:border-rose-400',
    badge: 'MEDIA CREATOR',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300 border-rose-500/40',
    iconBg: 'bg-rose-500/15 border-rose-500/30',
    iconColor: 'text-rose-400'
  }
];

export const OnboardingModal: React.FC = () => {
  const { user, userDoc, switchRole, isAdmin } = useAuthRole();
  const { profile, updateUserProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [submittingRoleId, setSubmittingRoleId] = useState<UserRole | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Optional Claim Profile Drawer
  const [showClaimDrawer, setShowClaimDrawer] = useState(false);
  const [claimSearch, setClaimSearch] = useState('');
  const [availableProfiles, setAvailableProfiles] = useState<UserProfile[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const isOwnerAdmin = (user?.email || '').toLowerCase().trim() === 'kevoiebailey@gmail.com';

  // Modal displays if authenticated user has not locked in their role / completed onboarding
  const needsOnboarding = Boolean(
    user && 
    !isAdmin &&
    !isOwnerAdmin &&
    (
      (!userDoc?.hasCompletedOnboarding && !profile?.hasCompletedOnboarding && !userDoc?.roleLocked && !profile?.roleLocked) ||
      ((!profile?.role || profile?.role === 'member') && (!userDoc?.role || userDoc?.role === 'member') && !userDoc?.hasCompletedOnboarding)
    )
  );

  // Lazy load claim profiles if claim drawer is opened
  useEffect(() => {
    if (showClaimDrawer && needsOnboarding && availableProfiles.length === 0) {
      const fetchProfilesToClaim = async () => {
        setSearchingProfiles(true);
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, limit(30));
          const snap = await getDocs(q);
          const list: UserProfile[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data() as UserProfile;
            if (data.displayName && data.uid !== user?.uid) {
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
  }, [showClaimDrawer, needsOnboarding, availableProfiles.length, user?.uid]);

  if (!needsOnboarding) {
    return null;
  }

  // 1-Tap Fast Role Selection & Firestore Doc Initialization
  const handleSelectRole = async (roleOption: RoleCardOption) => {
    if (!user || submitting) return;

    setSubmittingRoleId(roleOption.id);
    setSubmitting(true);
    setError(null);

    try {
      const userRef = doc(db, 'users', user.uid);
      const resolvedDisplayName = user.displayName?.trim() || (user.email ? user.email.split('@')[0] : '');

      // Strict Firestore Document Initialization as requested:
      // { uid, email, displayName, role, profileComplete: false, createdAt: serverTimestamp() }
      const initialRecord = {
        uid: user.uid,
        email: user.email || '',
        displayName: resolvedDisplayName,
        role: roleOption.id,
        profileComplete: false,
        profileCompleted: false, // backwards compatibility
        hasCompletedOnboarding: true,
        roleLocked: true,
        createdAt: userDoc?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // 1. Immediately save or merge their record to users/{uid}
      await setDoc(userRef, initialRecord, { merge: true });

      // 2. Update local state in AuthContext
      await updateUserProfile(initialRecord as any);

      // 3. Switch canonical active role
      await switchRole(roleOption.id as any);

      showToast('success', `${roleOption.title} Selected`, 'Welcome to Just1Play! Entering your dashboard...');

      // 4. Route directly to their role-tailored dashboard without blocking with more questions
      navigate(roleOption.dashboardUrl, { replace: true });

    } catch (err: any) {
      console.error('Role initialization error:', err);
      setError(err?.message || 'Failed to select role. Please check your connection and try again.');
      setSubmitting(false);
      setSubmittingRoleId(null);
    }
  };

  // Optional: Claim an existing pre-created roster profile
  const handleClaimProfile = async (targetProfile: UserProfile) => {
    if (!user || submitting) return;
    setClaimingId(targetProfile.uid);
    setSubmitting(true);
    setError(null);

    try {
      const userRef = doc(db, 'users', user.uid);
      const claimedRole: UserRole = targetProfile.role || 'athlete';
      const claimedDashboard = PROGRESSIVE_ROLES.find(r => r.id === claimedRole)?.dashboardUrl || '/dashboard/athlete';

      const mergedPayload = {
        ...targetProfile,
        uid: user.uid,
        email: user.email || targetProfile.email || '',
        displayName: targetProfile.displayName || user.displayName || '',
        claimedFromUid: targetProfile.uid,
        role: claimedRole,
        profileComplete: true,
        profileCompleted: true,
        hasCompletedOnboarding: true,
        roleLocked: true,
        updatedAt: serverTimestamp()
      };

      await setDoc(userRef, mergedPayload, { merge: true });
      await updateUserProfile(mergedPayload as any);
      await switchRole(claimedRole as any);

      showToast('success', 'Profile Linked', `Claimed ${targetProfile.displayName}'s roster profile!`);
      navigate(claimedDashboard, { replace: true });
    } catch (err: any) {
      console.error('Error claiming profile:', err);
      setError(err?.message || 'Failed to link profile.');
      setSubmitting(false);
      setClaimingId(null);
    }
  };

  const filteredClaimProfiles = availableProfiles.filter(p => {
    if (!claimSearch.trim()) return true;
    const term = claimSearch.toLowerCase();
    return (
      (p.displayName && p.displayName.toLowerCase().includes(term)) ||
      (p.highSchool && p.highSchool.toLowerCase().includes(term)) ||
      (p.teamName && p.teamName.toLowerCase().includes(term)) ||
      (p.sport && p.sport.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl bg-[#090D16] border border-white/10 shadow-2xl p-5 sm:p-8 my-auto space-y-6">
        {/* Glow Accent behind card */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-[#FF6A00]/15 via-[#00F0D0]/10 to-transparent blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-mono uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>Just1Play Network • 1-Tap Onboarding</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wider font-sans">
            Choose Your Network Role
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl mx-auto leading-relaxed">
            Select how you want to experience Just1Play. Tap your card to enter your role-tailored dashboard immediately. You can complete advanced profile details anytime later.
          </p>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 max-w-md mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 5 Visual Glassmorphic Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 pt-1">
          {PROGRESSIVE_ROLES.map((option, idx) => {
            const Icon = option.icon;
            const isThisSubmitting = submittingRoleId === option.id;

            return (
              <div
                key={option.id}
                onClick={() => !submitting && handleSelectRole(option)}
                className={`group relative p-5 rounded-2xl bg-gradient-to-b ${option.accentGradient} bg-slate-900/80 border ${option.borderColor} ${option.glowColor} backdrop-blur-xl transition-all duration-300 flex flex-col justify-between cursor-pointer active:scale-[0.98] ${
                  idx === 4 ? 'sm:col-span-2 lg:col-span-1' : ''
                } ${isThisSubmitting ? 'ring-2 ring-[#00F0D0] scale-[1.01]' : ''}`}
              >
                <div className="space-y-3.5">
                  {/* Card Header: Icon + Badge */}
                  <div className="flex items-center justify-between gap-3">
                    <div className={`p-3 rounded-xl border ${option.iconBg} ${option.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${option.badgeBg} ${option.badgeText}`}>
                      {option.badge}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white font-sans tracking-wide group-hover:text-[#00F0D0] transition-colors">
                      {option.title}
                    </h3>
                    <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
                      "{option.tagline}"
                    </p>
                  </div>
                </div>

                {/* 1-Tap CTA Button */}
                <div className="pt-5 mt-2 border-t border-white/5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRole(option);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                      isThisSubmitting
                        ? 'bg-[#00F0D0] text-slate-950 shadow-[0_0_20px_rgba(0,240,208,0.5)]'
                        : 'bg-white/10 hover:bg-[#FF6A00] text-white hover:text-slate-950 group-hover:bg-[#FF6A00] group-hover:text-slate-950'
                    }`}
                  >
                    {isThisSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Entering Dashboard...</span>
                      </>
                    ) : (
                      <>
                        <span>Select & Enter</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Optional Secondary Action: Claim Existing Pre-created Roster Profile */}
        <div className="pt-2 border-t border-white/10 relative z-10">
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowClaimDrawer(!showClaimDrawer)}
              className="text-xs font-mono text-slate-400 hover:text-[#00F0D0] inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Looking to claim a pre-existing roster profile?</span>
              {showClaimDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showClaimDrawer && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3 animate-fadeIn">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={claimSearch}
                  onChange={(e) => setClaimSearch(e.target.value)}
                  placeholder="Search player name, high school, or team to claim..."
                  className="w-full pl-9 pr-4 py-2 bg-[#121824] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00F0D0]"
                />
              </div>

              {searchingProfiles ? (
                <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00F0D0]" />
                  <span>Searching active rosters...</span>
                </div>
              ) : filteredClaimProfiles.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                  {filteredClaimProfiles.slice(0, 5).map((p) => (
                    <div
                      key={p.uid}
                      className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#00F0D0]/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-white">{p.displayName}</p>
                        <p className="text-[11px] text-slate-400">
                          {p.sport || 'Sports'} • {p.position || p.role || 'Athlete'} • {p.highSchool || p.teamName || 'Independent'}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleClaimProfile(p)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[11px] font-bold cursor-pointer transition-colors shrink-0"
                      >
                        {claimingId === p.uid ? 'Claiming...' : 'Claim This Profile'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-slate-500 py-2">
                  No matching unclaimed roster profiles found. You can select one of the 5 roles above to start fresh!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
