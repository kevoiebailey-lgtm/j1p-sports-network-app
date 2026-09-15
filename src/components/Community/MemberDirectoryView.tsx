import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Users, 
  UserCheck, 
  UserPlus, 
  ShieldCheck, 
  Sparkles, 
  Trophy, 
  GraduationCap, 
  MapPin, 
  Video, 
  MessageSquare, 
  ExternalLink, 
  Grid, 
  List, 
  RefreshCw, 
  CheckCircle2, 
  Flame, 
  SlidersHorizontal,
  Zap,
  ArrowUpDown,
  User,
  Share2,
  Award,
  Eye,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  limit, 
  onSnapshot, 
  doc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  safeSetDoc, 
  safeDeleteDoc, 
  isQuotaError, 
  markFirestoreQuotaExceeded 
} from '../../lib/firestoreQuotaGuard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserProfile, UserRole, SportType } from '../../types';
import { MemberProfileModal } from './MemberProfileModal';
import { DirectMessagesModal } from '../Social/DirectMessagesModal';
import { AuthModal } from '../Auth/AuthModal';
import { useSocialConnections } from '../../hooks/useSocialConnections';
import { isRecruiterRole, isAthleteRole } from '../../services/socialConnectionService';
import { RecruiterAthleteRadar } from './RecruiterAthleteRadar';
import { SocialConnectionsModal } from './SocialConnectionsModal';

export const SPORT_CATEGORIES: string[] = [
  'All Sports',
  'Basketball',
  'Football',
  "Girls' Flag Football",
  'Soccer',
  'Lacrosse',
  'Volleyball',
  'Track & Field',
  'Baseball',
  'Softball'
];

export const ROLE_TABS: { label: string; role: string }[] = [
  { label: 'All Members', role: 'all' },
  { label: 'Athletes', role: 'athlete' },
  { label: 'Coaches', role: 'coach' },
  { label: 'Scouts / Recruiters', role: 'scout' },
  { label: 'Directors', role: 'director' },
  { label: 'Parents / Fans', role: 'viewer' }
];

export const getMemberConnections = (member: UserProfile, liveFollowCount: number = 0): number => {
  let seed = 0;
  if (member.uid) {
    for (let i = 0; i < member.uid.length; i++) {
      seed = (seed * 31 + member.uid.charCodeAt(i)) % 1000;
    }
  }

  let baseConnections = 45;
  const role = member.role?.toLowerCase() || '';
  if (role === 'athlete') baseConnections = 140 + (seed % 280);
  else if (role === 'coach') baseConnections = 260 + (seed % 340);
  else if (role === 'scout' || role === 'recruiter') baseConnections = 390 + (seed % 460);
  else if (role === 'director') baseConnections = 410 + (seed % 320);
  else baseConnections = 35 + (seed % 65);

  if (member.isVerified) baseConnections += 160;
  if (member.mediaUrls && member.mediaUrls.length > 0) baseConnections += member.mediaUrls.length * 20;

  return baseConnections + liveFollowCount;
};

export const formatConnectionCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toLocaleString();
};

export const getMemberInitials = (name?: string): string => {
  if (!name || !name.trim()) return 'J1';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getRoleBadgeConfig = (role: string = '') => {
  const normalized = role?.toLowerCase() || '';
  switch (normalized) {
    case 'athlete':
      return {
        label: 'ATHLETE',
        shortLabel: 'Athlete',
        icon: Zap,
        badgeStyle: 'bg-[#00B8D4]/20 text-[#00B8D4] border-[#00B8D4]/50 shadow-[0_0_10px_rgba(0,184,212,0.25)]',
        cardBorder: 'hover:border-[#00B8D4]/60 hover:shadow-[0_0_22px_rgba(0,184,212,0.2)]',
        avatarRing: 'border-[#00B8D4]/50',
        tagBg: 'bg-[#00B8D4]',
        tagText: 'text-slate-950',
        highlightText: 'text-[#00B8D4]'
      };
    case 'scout':
    case 'recruiter':
      return {
        label: 'SCOUT / RECRUITER',
        shortLabel: 'Scout',
        icon: Trophy,
        badgeStyle: 'bg-gradient-to-r from-amber-500/25 to-yellow-500/25 text-[#FFC857] border-[#FFC857]/60 shadow-[0_0_12px_rgba(255,200,87,0.35)]',
        cardBorder: 'hover:border-[#FFC857]/70 hover:shadow-[0_0_24px_rgba(255,200,87,0.25)]',
        avatarRing: 'border-[#FFC857]/70',
        tagBg: 'bg-[#FFC857]',
        tagText: 'text-slate-950',
        highlightText: 'text-[#FFC857]'
      };
    case 'coach':
      return {
        label: 'COACH / STAFF',
        shortLabel: 'Coach',
        icon: Flame,
        badgeStyle: 'bg-gradient-to-r from-orange-500/25 to-amber-600/25 text-[#FF6A00] border-[#FF6A00]/60 shadow-[0_0_12px_rgba(255,106,0,0.35)]',
        cardBorder: 'hover:border-[#FF6A00]/70 hover:shadow-[0_0_24px_rgba(255,106,0,0.25)]',
        avatarRing: 'border-[#FF6A00]/70',
        tagBg: 'bg-[#FF6A00]',
        tagText: 'text-slate-950',
        highlightText: 'text-[#FF6A00]'
      };
    case 'director':
      return {
        label: 'TOURNAMENT DIRECTOR',
        shortLabel: 'Director',
        icon: Award,
        badgeStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.25)]',
        cardBorder: 'hover:border-purple-500/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]',
        avatarRing: 'border-purple-500/50',
        tagBg: 'bg-purple-500',
        tagText: 'text-white',
        highlightText: 'text-purple-400'
      };
    case 'admin':
      return {
        label: 'SUPER ADMIN',
        shortLabel: 'Admin',
        icon: ShieldCheck,
        badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.25)]',
        cardBorder: 'hover:border-rose-500/60 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]',
        avatarRing: 'border-rose-500/50',
        tagBg: 'bg-rose-500',
        tagText: 'text-white',
        highlightText: 'text-rose-400'
      };
    case 'viewer':
    case 'fan':
    default:
      return {
        label: 'PARENT / FAN',
        shortLabel: 'Fan',
        icon: Users,
        badgeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.2)]',
        cardBorder: 'hover:border-indigo-500/50 hover:shadow-[0_0_18px_rgba(99,102,241,0.15)]',
        avatarRing: 'border-indigo-500/40',
        tagBg: 'bg-indigo-500',
        tagText: 'text-white',
        highlightText: 'text-indigo-400'
      };
  }
};

export const MemberDirectoryView: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const currentUid = user?.uid || profile?.uid || '';
  const currentName = user?.displayName || profile?.displayName || 'Sports Member';

  // Members & Followers State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({});

  // Social Connections & Cross-Role Tracking Hook
  const {
    allConnections,
    currentUserFollowingIds,
    toggleFollow: hookToggleFollow,
    getRecruitersFollowing,
    getAthletesFollowedBy,
    recruitersWithAthletes,
    athletesWithRecruiters
  } = useSocialConnections();

  const isViewerRecruiter = isRecruiterRole(profile?.role);
  const isViewerAthlete = isAthleteRole(profile?.role);

  // Cross-Role Social Filter States
  const [activeTabMode, setActiveTabMode] = useState<'directory' | 'radar'>('directory');
  const [filterByAthleteFollowed, setFilterByAthleteFollowed] = useState<string>('all');
  const [filterByRecruiterFollower, setFilterByRecruiterFollower] = useState<string>('all');
  const [socialModalUser, setSocialModalUser] = useState<UserProfile | null>(null);
  const [socialModalTab, setSocialModalTab] = useState<'followers' | 'following'>('followers');

  const effectiveFollowingUids = useMemo(() => {
    return Array.from(new Set([...followingUids, ...currentUserFollowingIds]));
  }, [followingUids, currentUserFollowingIds]);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [selectedGradYear, setSelectedGradYear] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [hasFilmOnly, setHasFilmOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'gradYear' | 'followers' | 'connections'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDMModalOpen, setIsDMModalOpen] = useState(false);
  const [dmTarget, setDmTarget] = useState<{ uid: string; name: string; avatar?: string; role?: UserRole } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Real-time Fetch: Users Collection
  useEffect(() => {
    setLoading(true);
    if (!db) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      const usersQuery = query(collection(db, 'users'), limit(150));
      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        if (!snapshot.empty) {
          const fetchedList: UserProfile[] = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              uid: docSnap.id,
              displayName: data.displayName || data.name || (data.email ? data.email.split('@')[0] : 'Member'),
              email: data.email || '',
              role: data.role || 'athlete',
              sport: data.sport || 'Basketball',
              isVerified: data.isVerified || false,
              avatarUrl: data.avatarUrl || data.photoURL || '',
              highSchool: data.highSchool || data.school || '',
              state: data.state || '',
              position: data.position || '',
              gradYear: data.gradYear || '',
              jerseyNumber: data.jerseyNumber || '',
              teamName: data.teamName || '',
              bio: data.bio || '',
              height: data.height || '',
              weight: data.weight || '',
              gpa: data.gpa || '',
              social: data.social || {},
              mediaUrls: data.mediaUrls || [],
              performanceMetrics: data.performanceMetrics,
              gameLogs: data.gameLogs,
              createdAt: data.createdAt || new Date().toISOString(),
              ...data
            } as UserProfile;
          });

          setUsers(fetchedList);
        } else {
          setUsers([]);
        }
        setLoading(false);
      }, (err) => {
        console.warn('Users listener notice:', err);
        setUsers([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Users subscription error:', e);
      setUsers([]);
      setLoading(false);
    }
  }, []);

  // Real-time Fetch: Followers collection
  useEffect(() => {
    if (!db) return;

    try {
      const followersQuery = query(collection(db, 'followers'), limit(500));
      const unsubscribe = onSnapshot(followersQuery, (snapshot) => {
        const myFollowed: string[] = [];
        const counts: Record<string, number> = {};

        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          const targetUid = data.targetUid;
          const followerUid = data.followerUid;

          if (targetUid) {
            counts[targetUid] = (counts[targetUid] || 0) + 1;
          }

          if (followerUid === currentUid && targetUid) {
            myFollowed.push(targetUid);
          }
        });

        setFollowingUids(myFollowed);
        setFollowerCounts(counts);
      }, (err) => {
        console.warn('Followers listener fallback:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Followers subscription error:', e);
    }
  }, [currentUid]);

  // Follow / Unfollow Handler
  const handleToggleFollow = async (targetUid: string) => {
    if (!currentUid) {
      setIsAuthModalOpen(true);
      return;
    }

    if (targetUid === currentUid) {
      showToast('info', 'Notice', "You cannot follow your own profile.");
      return;
    }

    const isCurrentlyFollowing = followingUids.includes(targetUid);
    const updated = isCurrentlyFollowing
      ? followingUids.filter(id => id !== targetUid)
      : [...followingUids, targetUid];

    // Optimistic UI Update
    setFollowingUids(updated);
    setFollowerCounts(prev => ({
      ...prev,
      [targetUid]: Math.max(0, (prev[targetUid] || 0) + (isCurrentlyFollowing ? -1 : 1))
    }));

    const targetUserObj = users.find(u => u.uid === targetUid);
    const targetName = targetUserObj?.displayName || 'Member';

    if (isCurrentlyFollowing) {
      showToast('info', 'Unfollowed', `You unfollowed ${targetName}.`);
    } else {
      showToast('success', 'Following Member', `You are now following ${targetName}! Updates will appear in your feed.`);
    }

    // Persist via hook (handles dual write to user_follows and followers, plus notifications)
    if (targetUserObj) {
      try {
        await hookToggleFollow(targetUserObj);
      } catch (err) {
        console.warn('Follow hook error:', err);
      }
    }
  };

  // Open Member Profile Modal
  const handleOpenProfile = (member: UserProfile) => {
    setSelectedMember(member);
    setIsProfileModalOpen(true);
  };

  // Open Direct Messages
  const handleOpenDM = (targetUid: string, targetName: string) => {
    if (!currentUid) {
      setIsAuthModalOpen(true);
      return;
    }
    const target = users.find(u => u.uid === targetUid);
    setDmTarget({
      uid: targetUid,
      name: targetName,
      avatar: target?.avatarUrl || target?.photoURL,
      role: target?.role
    });
    setIsDMModalOpen(true);
  };

  // Filtered & Sorted Members
  const filteredMembers = useMemo(() => {
    return users.filter(member => {
      // 1. Search Query Match
      if (searchQuery.trim()) {
        const queryClean = searchQuery.toLowerCase();
        const matchesName = (member.displayName || '').toLowerCase().includes(queryClean);
        const matchesEmail = (member.email || '').toLowerCase().includes(queryClean);
        const matchesSchool = (member.highSchool || '').toLowerCase().includes(queryClean);
        const matchesTeam = (member.teamName || '').toLowerCase().includes(queryClean);
        const matchesPosition = (member.position || '').toLowerCase().includes(queryClean);
        const matchesState = (member.state || '').toLowerCase().includes(queryClean);
        const matchesSport = (member.sport || '').toLowerCase().includes(queryClean);

        if (!matchesName && !matchesEmail && !matchesSchool && !matchesTeam && !matchesPosition && !matchesState && !matchesSport) {
          return false;
        }
      }

      // 2. Role Filter
      if (selectedRole !== 'all') {
        if (selectedRole === 'viewer' && member.role !== 'viewer' && (member.role as any) !== 'fan') return false;
        if (selectedRole !== 'viewer' && member.role !== selectedRole) return false;
      }

      // 3. Sport Filter
      if (selectedSport !== 'All Sports') {
        if ((member.sport || '').toLowerCase() !== selectedSport.toLowerCase()) return false;
      }

      // 4. Grad Year Filter
      if (selectedGradYear !== 'all') {
        if (member.gradYear !== selectedGradYear) return false;
      }

      // 5. State Filter
      if (selectedState !== 'all') {
        if ((member.state || '').toUpperCase() !== selectedState.toUpperCase()) return false;
      }

      // 6. Quick Toggles
      if (verifiedOnly && !member.isVerified) return false;
      if (followingOnly && !effectiveFollowingUids.includes(member.uid)) return false;
      if (hasFilmOnly && (!member.mediaUrls || member.mediaUrls.length === 0)) return false;

      // 7. Recruiter-by-Athlete-Followed Filter (filter recruiters by athletes they follow)
      if (filterByAthleteFollowed !== 'all') {
        const isRecruiter = isRecruiterRole(member.role);
        if (!isRecruiter) return false;

        const athletesFollowed = getAthletesFollowedBy(member.uid);
        if (filterByAthleteFollowed === 'my_follows') {
          // Recruiter must follow current user (logged-in athlete)
          if (!athletesFollowed.some(a => a.targetId === currentUid)) return false;
        } else if (filterByAthleteFollowed === 'any_athlete') {
          // Recruiter must follow at least 1 athlete
          if (athletesFollowed.length === 0) return false;
        } else {
          // Recruiter must follow specific athlete targetId
          if (!athletesFollowed.some(a => a.targetId === filterByAthleteFollowed)) return false;
        }
      }

      // 8. Athlete-by-Recruiter-Follower Filter (filter athletes by recruiters who follow them)
      if (filterByRecruiterFollower !== 'all') {
        const isAthlete = isAthleteRole(member.role);
        if (!isAthlete) return false;

        const recruitersFollowing = getRecruitersFollowing(member.uid);
        if (filterByRecruiterFollower === 'my_watchlist') {
          // Athlete must be followed by current user (logged-in scout/recruiter)
          if (!recruitersFollowing.some(r => r.followerId === currentUid)) return false;
        } else if (filterByRecruiterFollower === 'any_recruiter') {
          // Athlete must have at least 1 recruiter following them
          if (recruitersFollowing.length === 0) return false;
        } else {
          // Athlete must be followed by specific recruiter followerId
          if (!recruitersFollowing.some(r => r.followerId === filterByRecruiterFollower)) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortBy === 'gradYear') {
        return (a.gradYear || '9999').localeCompare(b.gradYear || '9999');
      }
      if (sortBy === 'followers' || sortBy === 'connections') {
        const countA = getMemberConnections(a, followerCounts[a.uid] || 0);
        const countB = getMemberConnections(b, followerCounts[b.uid] || 0);
        return countB - countA;
      }
      // 'recent' by default
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [users, searchQuery, selectedRole, selectedSport, selectedGradYear, selectedState, verifiedOnly, followingOnly, hasFilmOnly, sortBy, effectiveFollowingUids, followerCounts, filterByAthleteFollowed, filterByRecruiterFollower, getAthletesFollowedBy, getRecruitersFollowing, currentUid]);

  // List of athletes who are followed by at least 1 recruiter (for the recruiter filter dropdown)
  const followedAthletesOptions = useMemo(() => {
    const athleteIds = new Set<string>();
    allConnections.forEach(c => {
      if (c.isRecruiterFollowingAthlete || (isRecruiterRole(c.followerRole) && isAthleteRole(c.targetRole))) {
        athleteIds.add(c.targetId);
      }
    });
    return users.filter(u => athleteIds.has(u.uid));
  }, [users, allConnections]);

  // List of recruiters who follow at least 1 athlete (for the athlete filter dropdown)
  const activeRecruitersOptions = useMemo(() => {
    const recruiterIds = new Set<string>();
    allConnections.forEach(c => {
      if (c.isRecruiterFollowingAthlete || (isRecruiterRole(c.followerRole) && isAthleteRole(c.targetRole))) {
        recruiterIds.add(c.followerId);
      }
    });
    return users.filter(u => recruiterIds.has(u.uid));
  }, [users, allConnections]);

  // Distinct States from member dataset
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    users.forEach(u => {
      if (u.state && u.state.trim().length > 0) {
        states.add(u.state.trim().toUpperCase());
      }
    });
    return Array.from(states).sort();
  }, [users]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = users.length;
    const athletes = users.filter(u => u.role === 'athlete').length;
    const coachesAndScouts = users.filter(u => u.role === 'coach' || u.role === 'scout').length;
    const verified = users.filter(u => u.isVerified).length;
    const totalConnections = users.reduce((acc, u) => acc + getMemberConnections(u, followerCounts[u.uid] || 0), 0);
    return { total, athletes, coachesAndScouts, verified, totalConnections };
  }, [users, followerCounts]);

  return (
    <div className="min-h-screen bg-[#090D16] text-white pb-36">
      
      {/* 1. Header Hero Banner */}
      <div className="relative border-b border-[#24324F] bg-gradient-to-b from-[#0F172A] via-[#090D16] to-[#090D16] px-4 sm:px-6 pt-6 pb-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono uppercase tracking-wider bg-[#00B8D4]/15 text-[#00B8D4] border border-[#00B8D4]/40 flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  COMMUNITY DIRECTORY
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono uppercase tracking-wider bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/40">
                  REAL-TIME NETWORK
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Member & Athlete Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Connect with verified student-athletes, coaches, recruiters, directors, and fans across the nation. Search rosters, discover highlight reels, and follow members to personalize your live feed.
              </p>
            </div>

            {/* Quick Metrics HUD */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#090D16]/90 border border-[#24324F] p-3 rounded-2xl shadow-xl">
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Members</span>
                <span className="text-base font-black text-white font-mono">{stats.total}</span>
              </div>
              <div className="px-3 py-1.5 border-l border-[#24324F]">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Athletes</span>
                <span className="text-base font-black text-[#00B8D4] font-mono">{stats.athletes}</span>
              </div>
              <div className="px-3 py-1.5 border-l border-[#24324F]">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Coaches/Scouts</span>
                <span className="text-base font-black text-[#FFC857] font-mono">{stats.coachesAndScouts}</span>
              </div>
              <div className="px-3 py-1.5 border-l border-[#24324F]">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Verified</span>
                <span className="text-base font-black text-emerald-400 font-mono">{stats.verified}</span>
              </div>
              <div className="px-3 py-1.5 border-l border-[#24324F]">
                <span className="text-[10px] font-mono uppercase text-[#00B8D4] font-bold block">Connections</span>
                <span className="text-base font-black text-[#00B8D4] font-mono">{formatConnectionCount(stats.totalConnections)}</span>
              </div>
            </div>
          </div>

          {/* 2. Main Search Bar & View Mode Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, school, team, position, city, state, or sport..."
                className="w-full h-11 pl-10 pr-4 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] focus:ring-1 focus:ring-[#00B8D4] rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-white"
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Sort & Layout Toggles */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-11 px-3 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs font-mono text-slate-300 outline-none cursor-pointer"
                >
                  <option value="recent">Sort: Recently Joined</option>
                  <option value="name">Sort: Alphabetical (A-Z)</option>
                  <option value="gradYear">Sort: Class Year</option>
                  <option value="followers">Sort: Most Connections</option>
                </select>
              </div>

              <div className="flex items-center bg-[#090D16] border border-[#24324F] p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-[#00B8D4] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-[#00B8D4] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Table / List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & View Mode Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        
        {/* Mode Switch: Standard Directory vs Recruiter ⇄ Athlete Radar */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-[#131C2E] border border-[#24324F] rounded-2xl shadow-lg">
            <button
              onClick={() => setActiveTabMode('directory')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTabMode === 'directory'
                  ? 'bg-[#00B8D4] text-slate-950 font-black shadow-[0_0_15px_rgba(0,184,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Standard Directory</span>
            </button>

            <button
              onClick={() => setActiveTabMode('radar')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTabMode === 'radar'
                  ? 'bg-gradient-to-r from-amber-400 to-[#00F0D0] text-slate-950 font-black shadow-[0_0_20px_rgba(255,184,0,0.3)]'
                  : 'text-[#FFC857] hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Recruiter ⇄ Athlete Radar</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-black/40 text-amber-300">
                {allConnections.length}
              </span>
            </button>
          </div>

          {(filterByAthleteFollowed !== 'all' || filterByRecruiterFollower !== 'all') && (
            <button
              onClick={() => {
                setFilterByAthleteFollowed('all');
                setFilterByRecruiterFollower('all');
              }}
              className="text-xs font-mono text-[#00B8D4] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Clear Social Filters ✕</span>
            </button>
          )}
        </div>

        {/* Role Tabs (only in directory mode) */}
        {activeTabMode === 'directory' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.role}
                onClick={() => setSelectedRole(tab.role)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  selectedRole === tab.role
                    ? 'bg-[#00B8D4] text-slate-950 font-black shadow-[0_0_12px_rgba(0,184,212,0.4)]'
                    : 'bg-[#131C2E] text-slate-400 hover:text-white border border-[#24324F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Multi-Dimensional Filter Dropdowns & Quick Pills (only in directory mode) */}
        {activeTabMode === 'directory' && (
          <div className="bg-[#131C2E]/60 border border-[#24324F] p-2.5 sm:p-3 rounded-2xl">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full whitespace-nowrap">
              {/* Sport Dropdown */}
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="h-9 px-3 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs font-mono text-slate-300 outline-none cursor-pointer shrink-0"
              >
                {SPORT_CATEGORIES.map(sport => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>

              {/* Class Year Dropdown */}
              <select
                value={selectedGradYear}
                onChange={(e) => setSelectedGradYear(e.target.value)}
                className="h-9 px-3 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs font-mono text-slate-300 outline-none cursor-pointer shrink-0"
              >
                <option value="all">Class: All Years</option>
                <option value="2025">Class of 2025</option>
                <option value="2026">Class of 2026</option>
                <option value="2027">Class of 2027</option>
                <option value="2028">Class of 2028</option>
                <option value="2029">Class of 2029+</option>
              </select>

              {/* State Filter */}
              {availableStates.length > 0 && (
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="h-9 px-3 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs font-mono text-slate-300 outline-none cursor-pointer shrink-0"
                >
                  <option value="all">State: All</option>
                  {availableStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              )}

              {/* Social Filter: Recruiters by Athlete Followed (visible when role is scout or all) */}
              {(selectedRole === 'scout' || selectedRole === 'all') && (
                <select
                  value={filterByAthleteFollowed}
                  onChange={(e) => {
                    setFilterByAthleteFollowed(e.target.value);
                    if (e.target.value !== 'all' && selectedRole !== 'scout') {
                      setSelectedRole('scout');
                    }
                  }}
                  className={`h-9 px-3 border rounded-xl text-xs font-mono outline-none cursor-pointer shrink-0 transition-colors ${
                    filterByAthleteFollowed !== 'all'
                      ? 'bg-amber-500/20 text-[#FFC857] border-amber-500/60 font-bold'
                      : 'bg-[#090D16] border-[#24324F] text-slate-300 focus:border-[#00B8D4]'
                  }`}
                >
                  <option value="all">Recruiters: All</option>
                  {isViewerAthlete && (
                    <option value="my_follows">🎯 Tracking Me ({getRecruitersFollowing(currentUid).length})</option>
                  )}
                  <option value="any_athlete">Active (Tracking 1+ Athletes)</option>
                  {followedAthletesOptions.map(ath => (
                    <option key={ath.uid} value={ath.uid}>
                      Follows: {ath.displayName} ({ath.position || ath.sport || 'Prospect'})
                    </option>
                  ))}
                </select>
              )}

              {/* Social Filter: Athletes by Recruiter Tracking (visible when role is athlete or all) */}
              {(selectedRole === 'athlete' || selectedRole === 'all') && (
                <select
                  value={filterByRecruiterFollower}
                  onChange={(e) => {
                    setFilterByRecruiterFollower(e.target.value);
                    if (e.target.value !== 'all' && selectedRole !== 'athlete') {
                      setSelectedRole('athlete');
                    }
                  }}
                  className={`h-9 px-3 border rounded-xl text-xs font-mono outline-none cursor-pointer shrink-0 transition-colors ${
                    filterByRecruiterFollower !== 'all'
                      ? 'bg-teal-500/20 text-[#00F0D0] border-teal-500/60 font-bold'
                      : 'bg-[#090D16] border-[#24324F] text-slate-300 focus:border-[#00B8D4]'
                  }`}
                >
                  <option value="all">Athletes: All</option>
                  {isViewerRecruiter && (
                    <option value="my_watchlist">⭐ On My Watchlist ({getAthletesFollowedBy(currentUid).length})</option>
                  )}
                  <option value="any_recruiter">🎯 Recruiter-Tracked Only (1+ Scouts)</option>
                  {activeRecruitersOptions.map(rec => (
                    <option key={rec.uid} value={rec.uid}>
                      Tracked by: {rec.displayName} ({rec.highSchool || (rec as any).school || rec.teamName || 'College Scout'})
                    </option>
                  ))}
                </select>
              )}

              {/* Quick Filter Toggles */}
              <button
                type="button"
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
                  verifiedOnly
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-[#090D16] text-slate-400 border border-[#24324F] hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Only</span>
              </button>

              <button
                type="button"
                onClick={() => setFollowingOnly(!followingOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
                  followingOnly
                    ? 'bg-[#00B8D4]/20 text-[#00B8D4] border border-[#00B8D4]/50'
                    : 'bg-[#090D16] text-slate-400 border border-[#24324F] hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Following ({effectiveFollowingUids.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setHasFilmOnly(!hasFilmOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
                  hasFilmOnly
                    ? 'bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/50'
                    : 'bg-[#090D16] text-slate-400 border border-[#24324F] hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>With Film</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Social Filter Notification Bar */}
        {activeTabMode === 'directory' && (filterByAthleteFollowed !== 'all' || filterByRecruiterFollower !== 'all') && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-[#090D16] border border-[#24324F] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400">Active Social Filter:</span>
              {filterByAthleteFollowed !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-[#FFC857] border border-amber-500/40 font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#FFB800]" />
                  {filterByAthleteFollowed === 'my_follows'
                    ? 'Recruiters tracking my profile'
                    : filterByAthleteFollowed === 'any_athlete'
                    ? 'Recruiters with active athlete follows'
                    : `Recruiters following ${users.find(u => u.uid === filterByAthleteFollowed)?.displayName || 'Athlete'}`}
                  <button onClick={() => setFilterByAthleteFollowed('all')} className="ml-1 hover:text-white">✕</button>
                </span>
              )}
              {filterByRecruiterFollower !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-[#00F0D0] border border-teal-500/40 font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#00F0D0]" />
                  {filterByRecruiterFollower === 'my_watchlist'
                    ? 'Athletes on my watchlist'
                    : filterByRecruiterFollower === 'any_recruiter'
                    ? 'Athletes tracked by scouts'
                    : `Athletes tracked by ${users.find(u => u.uid === filterByRecruiterFollower)?.displayName || 'Recruiter'}`}
                  <button onClick={() => setFilterByRecruiterFollower('all')} className="ml-1 hover:text-white">✕</button>
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setFilterByAthleteFollowed('all');
                setFilterByRecruiterFollower('all');
              }}
              className="text-slate-400 hover:text-white underline text-[11px] cursor-pointer"
            >
              Reset Social Filters
            </button>
          </div>
        )}
      </div>

      {/* 4. Results Directory: Radar Mode vs Grid/Table View */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {activeTabMode === 'radar' ? (
          <RecruiterAthleteRadar
            allUsers={users}
            onOpenProfile={handleOpenProfile}
            onOpenDM={handleOpenDM}
            onFilterAthleteInDirectory={(athleteUid) => {
              setFilterByAthleteFollowed(athleteUid);
              setSelectedRole('scout');
              setActiveTabMode('directory');
            }}
            onFilterRecruiterInDirectory={(recruiterUid) => {
              setFilterByRecruiterFollower(recruiterUid);
              setSelectedRole('athlete');
              setActiveTabMode('directory');
            }}
          />
        ) : (
          <>
            {/* Results Counter */}
            <div className="flex items-center justify-between py-2 text-xs font-mono text-slate-400">
              <span>Showing <strong className="text-white">{filteredMembers.length}</strong> matching members</span>
              {(searchQuery || selectedRole !== 'all' || selectedSport !== 'All Sports' || selectedGradYear !== 'all' || selectedState !== 'all' || verifiedOnly || followingOnly || hasFilmOnly || filterByAthleteFollowed !== 'all' || filterByRecruiterFollower !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRole('all');
                    setSelectedSport('All Sports');
                    setSelectedGradYear('all');
                    setSelectedState('all');
                    setVerifiedOnly(false);
                    setFollowingOnly(false);
                    setHasFilmOnly(false);
                    setFilterByAthleteFollowed('all');
                    setFilterByRecruiterFollower('all');
                  }}
                  className="text-[#00B8D4] hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <RefreshCw className="w-8 h-8 text-[#00B8D4] animate-spin mx-auto mb-3" />
                <p className="text-sm font-mono text-slate-400">Loading Member Directory...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-20 text-center bg-[#131C2E]/40 border border-[#24324F] rounded-3xl p-8">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">No Members Found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  We couldn't find any members matching your current search and filter criteria.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRole('all');
                    setSelectedSport('All Sports');
                    setSelectedGradYear('all');
                    setSelectedState('all');
                    setVerifiedOnly(false);
                    setFollowingOnly(false);
                    setHasFilmOnly(false);
                    setFilterByAthleteFollowed('all');
                    setFilterByRecruiterFollower('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#00B8D4] text-slate-950 font-bold text-xs font-mono cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View Mode */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMembers.map((member) => {
                  const isFollowing = effectiveFollowingUids.includes(member.uid);
                  const followers = followerCounts[member.uid] || 0;
                  const connections = getMemberConnections(member, followers);
                  const connectionsFormatted = formatConnectionCount(connections);
                  const avatar = member.avatarUrl || member.photoURL || '';
                  const hasPhoto = Boolean(avatar);
                  const roleConfig = getRoleBadgeConfig(member.role);
                  const RoleIcon = roleConfig.icon;
                  
                  const isAthlete = isAthleteRole(member.role);
                  const isRecruiter = isRecruiterRole(member.role);
                  const recruiterFollowers = isAthlete ? getRecruitersFollowing(member.uid) : [];
                  const athletesFollowed = isRecruiter ? getAthletesFollowedBy(member.uid) : [];

                  return (
                    <div
                      key={member.uid}
                      className={`group relative bg-[#131C2E] border border-[#24324F] ${roleConfig.cardBorder} rounded-2xl p-4 transition-all flex flex-col justify-between`}
                    >
                      <div>
                        {/* Top Pill Bar: Sport Category + Prominent Visual Role Badge */}
                        <div className="flex items-center justify-between gap-2 mb-3.5">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black font-mono uppercase tracking-wider bg-[#090D16] text-slate-300 border border-[#24324F] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00B8D4]"></span>
                            {member.sport || 'Sports'}
                          </span>

                          {/* Visual Role Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono uppercase tracking-wider border flex items-center gap-1.5 ${roleConfig.badgeStyle}`}>
                            <RoleIcon className="w-3 h-3 flex-shrink-0" />
                            <span>{roleConfig.label}</span>
                          </span>
                        </div>

                        {/* Member Profile Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div 
                            onClick={() => handleOpenProfile(member)}
                            className="relative cursor-pointer flex-shrink-0"
                          >
                            {hasPhoto ? (
                              <img
                                src={avatar}
                                alt={member.displayName}
                                className={`w-14 h-14 rounded-2xl object-cover border-2 ${roleConfig.avatarRing} group-hover:scale-105 transition-all bg-slate-800 shadow-md`}
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 text-teal-300 font-mono font-black text-xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-all shrink-0">
                                {getMemberInitials(member.displayName)}
                              </div>
                            )}
                            {member.isVerified && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00B8D4] text-slate-950 flex items-center justify-center shadow">
                                <ShieldCheck className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 
                              onClick={() => handleOpenProfile(member)}
                              className="font-bold text-white text-sm truncate hover:text-[#00B8D4] transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <span>{member.displayName}</span>
                            </h3>
                            <p className={`text-xs font-mono font-bold truncate ${roleConfig.highlightText}`}>
                              {member.position || roleConfig.shortLabel} {member.jerseyNumber ? `• #${member.jerseyNumber}` : ''}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              {member.highSchool && <span>{member.highSchool}</span>}
                              {member.teamName && !member.highSchool && <span>{member.teamName}</span>}
                              {member.state && <span>({member.state})</span>}
                            </p>
                          </div>
                        </div>

                        {/* Connections Social Proof Indicator Pill */}
                        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#090D16]/90 border border-[#24324F] mb-2.5 group/conn hover:border-[#00B8D4]/40 transition-colors">
                          <button
                            type="button"
                            onClick={() => {
                              setSocialModalUser(member);
                              setSocialModalTab('followers');
                            }}
                            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer text-left"
                            title="Click to view followers"
                          >
                            <div className="w-5 h-5 rounded-lg bg-[#00B8D4]/15 text-[#00B8D4] flex items-center justify-center flex-shrink-0">
                              <Users className="w-3 h-3" />
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs font-black font-mono text-[#00B8D4]">{connectionsFormatted}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-tight">Connections</span>
                            </div>
                          </button>
                          <span className="text-[10px] font-mono font-bold text-slate-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Active
                          </span>
                        </div>

                        {/* Role-Specific Cross-Tracking Badge: Scout or Prospect */}
                        {isAthlete && recruiterFollowers.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSocialModalUser(member);
                              setSocialModalTab('followers');
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-mono font-bold text-[#FFC857] mb-2.5 transition-colors cursor-pointer"
                            title="Click to view all college scouts tracking this athlete"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <Trophy className="w-3.5 h-3.5 text-[#FFB800] shrink-0" />
                              <span className="truncate">Tracked by {recruiterFollowers.length} {recruiterFollowers.length === 1 ? 'Scout' : 'Scouts'}</span>
                            </span>
                            <span className="text-[10px] text-amber-300/80 hover:text-white underline shrink-0">View Scouts →</span>
                          </button>
                        )}

                        {isRecruiter && athletesFollowed.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSocialModalUser(member);
                              setSocialModalTab('following');
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-[11px] font-mono font-bold text-[#00F0D0] mb-2.5 transition-colors cursor-pointer"
                            title="Click to view all prospects tracked by this recruiter"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <Zap className="w-3.5 h-3.5 text-[#00F0D0] shrink-0" />
                              <span className="truncate">Tracking {athletesFollowed.length} {athletesFollowed.length === 1 ? 'Prospect' : 'Prospects'}</span>
                            </span>
                            <span className="text-[10px] text-teal-300/80 hover:text-white underline shrink-0">Watchlist →</span>
                          </button>
                        )}

                        {/* Highlights & Measurables Snippet */}
                        <div className="grid grid-cols-3 gap-1.5 bg-[#090D16]/80 p-2 rounded-xl border border-[#24324F] mb-3 text-center">
                          <div>
                            <span className="block text-[9px] font-mono text-slate-500 uppercase">Class</span>
                            <span className="text-[11px] font-bold font-mono text-[#FFC857]">{member.gradYear ? `'${member.gradYear.slice(-2)}` : '--'}</span>
                          </div>
                          <div className="border-l border-[#24324F]">
                            <span className="block text-[9px] font-mono text-slate-500 uppercase">Height</span>
                            <span className="text-[11px] font-bold font-mono text-white">{member.height || '--'}</span>
                          </div>
                          <div className="border-l border-[#24324F]">
                            <span className="block text-[9px] font-mono text-slate-500 uppercase">Role</span>
                            <span className="text-[11px] font-bold font-mono text-[#00B8D4] truncate block">
                              {roleConfig.shortLabel}
                            </span>
                          </div>
                        </div>

                        {/* Bio / Philosophy Quote */}
                        {member.bio && (
                          <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                            {member.bio}
                          </p>
                        )}
                      </div>

                      {/* Actions: Follow + Message + View Profile */}
                      <div className="pt-2 border-t border-[#24324F]/80 flex items-center justify-between gap-2 mt-auto">
                        <button
                          type="button"
                          onClick={() => handleToggleFollow(member.uid)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                            isFollowing
                              ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-rose-700/60 hover:text-rose-400'
                              : 'bg-[#00B8D4]/15 hover:bg-[#00B8D4] text-[#00B8D4] hover:text-slate-950 border border-[#00B8D4]/40 font-black'
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-[#00B8D4]" />
                              <span>{isViewerRecruiter && isAthlete ? 'Tracking' : isViewerAthlete && isRecruiter ? 'Connected' : 'Following'}</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>{isViewerRecruiter && isAthlete ? '+ Track' : isViewerAthlete && isRecruiter ? '+ Connect' : '+ Follow'}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDM(member.uid, member.displayName)}
                          className="p-1.5 rounded-xl bg-[#090D16] hover:bg-slate-800 border border-[#24324F] text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Send Direct Message"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenProfile(member)}
                          className="p-1.5 rounded-xl bg-[#090D16] hover:bg-slate-800 border border-[#24324F] text-slate-400 hover:text-[#00B8D4] transition-colors cursor-pointer"
                          title="View Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Table / List View Mode */
              <div className="bg-[#131C2E] border border-[#24324F] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#090D16] text-slate-400 font-mono uppercase tracking-wider border-b border-[#24324F]">
                      <tr>
                        <th className="py-3 px-4">Member</th>
                        <th className="py-3 px-4">Role Badge</th>
                        <th className="py-3 px-4">Sport</th>
                        <th className="py-3 px-4">School / Team</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Position / Ht</th>
                        <th className="py-3 px-4">Connections / Radar</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#24324F]">
                      {filteredMembers.map((member) => {
                        const isFollowing = effectiveFollowingUids.includes(member.uid);
                        const followers = followerCounts[member.uid] || 0;
                        const connections = getMemberConnections(member, followers);
                        const connectionsFormatted = formatConnectionCount(connections);
                        const avatar = member.avatarUrl || member.photoURL || '';
                        const hasPhoto = Boolean(avatar);
                        const roleConfig = getRoleBadgeConfig(member.role);
                        const RoleIcon = roleConfig.icon;

                        const isAthlete = isAthleteRole(member.role);
                        const isRecruiter = isRecruiterRole(member.role);
                        const recruiterFollowers = isAthlete ? getRecruitersFollowing(member.uid) : [];
                        const athletesFollowed = isRecruiter ? getAthletesFollowedBy(member.uid) : [];

                        return (
                          <tr key={member.uid} className="hover:bg-[#1A253D]/50 transition-colors">
                            <td className="py-3 px-4">
                              <div 
                                onClick={() => handleOpenProfile(member)}
                                className="flex items-center gap-2.5 cursor-pointer group"
                              >
                                {hasPhoto ? (
                                  <img
                                    src={avatar}
                                    alt={member.displayName}
                                    className={`w-9 h-9 rounded-lg object-cover border ${roleConfig.avatarRing} bg-slate-800`}
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 text-teal-300 font-mono font-black text-xs flex items-center justify-center shadow-inner shrink-0">
                                    {getMemberInitials(member.displayName)}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-white group-hover:text-[#00B8D4] flex items-center gap-1.5">
                                    {member.displayName}
                                    {member.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-[#00B8D4]" />}
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono">{member.email || `@${member.displayName.toLowerCase().replace(/\s+/g, '')}`}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono uppercase tracking-wider border ${roleConfig.badgeStyle}`}>
                                <RoleIcon className="w-3 h-3 flex-shrink-0" />
                                <span>{roleConfig.label}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black font-mono uppercase bg-[#090D16] text-slate-300 border border-[#24324F]">
                                {member.sport || 'Sports'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              <div>{member.highSchool || member.teamName || '--'}</div>
                              {member.state && <span className="text-[10px] text-slate-500 font-mono">{member.state}</span>}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-[#FFC857]">
                              {member.gradYear ? `'${member.gradYear.slice(-2)}` : '--'}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {member.position || '--'} {member.height ? `(${member.height})` : ''}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-[#00B8D4]">
                              <div className="flex flex-col gap-1 items-start">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSocialModalUser(member);
                                    setSocialModalTab('followers');
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#00B8D4]/10 border border-[#00B8D4]/30 hover:bg-[#00B8D4]/20 cursor-pointer"
                                  title="View connection details"
                                >
                                  <Users className="w-3 h-3 text-[#00B8D4]" />
                                  <span className="text-[11px]">{connectionsFormatted}</span>
                                </button>
                                {isAthlete && recruiterFollowers.length > 0 && (
                                  <span className="text-[10px] text-[#FFB800] bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                                    ★ {recruiterFollowers.length} {recruiterFollowers.length === 1 ? 'Scout' : 'Scouts'}
                                  </span>
                                )}
                                {isRecruiter && athletesFollowed.length > 0 && (
                                  <span className="text-[10px] text-[#00F0D0] bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.2 rounded font-bold">
                                    ⚡ {athletesFollowed.length} {athletesFollowed.length === 1 ? 'Prospect' : 'Prospects'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFollow(member.uid)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                    isFollowing
                                      ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-rose-400'
                                      : 'bg-[#00B8D4] text-slate-950 font-black hover:opacity-90'
                                  }`}
                                >
                                  {isFollowing ? (isViewerRecruiter && isAthlete ? 'Tracking' : 'Following') : (isViewerRecruiter && isAthlete ? '+ Track' : isViewerAthlete && isRecruiter ? '+ Connect' : '+ Follow')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDM(member.uid, member.displayName)}
                                  className="p-1.5 rounded-lg bg-[#090D16] border border-[#24324F] text-slate-400 hover:text-white cursor-pointer"
                                  title="Message"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenProfile(member)}
                                  className="p-1.5 rounded-lg bg-[#090D16] border border-[#24324F] text-slate-400 hover:text-[#00B8D4] cursor-pointer"
                                  title="View"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile Detail Showcase Modal */}
      <MemberProfileModal
        member={selectedMember}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        isFollowing={selectedMember ? effectiveFollowingUids.includes(selectedMember.uid) : false}
        onToggleFollow={handleToggleFollow}
        onOpenDM={handleOpenDM}
        followerCount={selectedMember ? followerCounts[selectedMember.uid] || 0 : 0}
        connectionsCount={selectedMember ? getMemberConnections(selectedMember, followerCounts[selectedMember.uid] || 0) : 0}
      />

      {/* Social Connections (Followers & Following) Modal */}
      {socialModalUser && (
        <SocialConnectionsModal
          isOpen={Boolean(socialModalUser)}
          onClose={() => setSocialModalUser(null)}
          userId={socialModalUser.uid}
          userName={socialModalUser.displayName}
          userRole={socialModalUser.role}
          initialTab={socialModalTab}
          onSelectMember={(userId) => {
            const found = users.find(u => u.uid === userId);
            if (found) {
              setSocialModalUser(null);
              setSelectedMember(found);
              setIsProfileModalOpen(true);
            }
          }}
          onOpenDM={handleOpenDM}
        />
      )}

      {/* Direct Messaging Modal */}
      {isDMModalOpen && (
        <DirectMessagesModal
          isOpen={isDMModalOpen}
          onClose={() => setIsDMModalOpen(false)}
          targetUser={dmTarget}
        />
      )}

      {/* Auth Modal for Guests */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MemberDirectoryView;
