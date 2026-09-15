import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Search, 
  Bell, 
  ChevronDown, 
  Check, 
  X, 
  User, 
  Sparkles,
  ShieldCheck,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Radio,
  Tv,
  Calendar,
  Building,
  TrendingUp,
  ArrowRight,
  Mail,
  QrCode,
  Camera,
  Home,
  Users,
  Film,
  Flame,
  BookOpen
} from 'lucide-react';
import { RoleAvatar } from '../Common/RoleAvatar';
import { ThemeToggle } from '../Common/ThemeToggle';
import { RoleTourOverlay } from '../Onboarding/RoleTourOverlay';
import { ProMobileQuickPassModal } from '../Mobile/ProMobileQuickPassModal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { liveStreamService, StandaloneStream } from '../../services/liveStreamService';
import { db } from '../../lib/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { cachedGetDocs } from '../../services/firestoreCacheService';
import { triggerHaptic } from '../../lib/haptics';
import { WriteQueueSyncBadge } from '../Common/WriteQueueSyncBadge';
import { DirectMessageBadge } from './DirectMessageBadge';
import { BrandLogo } from '../Common/BrandLogo';
import { useLogo } from '../../context/LogoContext';
import { LogoSwitcherModal } from './LogoSwitcherModal';

export interface SportOption {
  id: string;
  name: string;
  badge?: string;
  emoji?: string;
}

export interface HeaderNavLink {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
  isLive?: boolean;
}

export const HEADER_NAV_LINKS: HeaderNavLink[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'live', label: 'Live', icon: Radio, path: '/live', isLive: true },
  { id: 'events', label: 'Events', icon: Trophy, path: '/events' },
  { id: 'athletes', label: 'Scout', icon: Users, path: '/athletes' },
  { id: 'media', label: 'Film', icon: Film, path: '/media' },
  { id: 'gallery', label: 'Gallery', icon: Camera, path: '/gallery' },
  { id: 'social', label: 'Social', icon: Flame, path: '/social' },
  { id: 'blog', label: 'News', icon: BookOpen, path: '/blog' },
];

export interface SearchSuggestion {
  id: string;
  type: 'athlete' | 'event' | 'organization';
  title: string;
  subtitle: string;
  badge?: string;
  avatarUrl?: string;
  targetRoute: string;
}

export const DEFAULT_SPORTS: SportOption[] = [
  { id: 'flag-football-girls', name: "Girls' Flag Football", badge: 'POPULAR', emoji: '🏈' },
  { id: 'flag-football-boys', name: "Boys' Flag Football", emoji: '🏈' },
  { id: 'tackle-football', name: 'Tackle Football', emoji: '🏈' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'cheerleading', name: 'Cheer & Dance', emoji: '📣' },
  { id: 'soccer', name: 'Soccer', emoji: '⚽' },
  { id: 'volleyball', name: 'Volleyball', emoji: '🏐' },
];

export interface TopHeaderBarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  selectedSport: SportOption;
  setSelectedSport: (sport: SportOption) => void;
  onOpenNotifications?: () => void;
  onOpenAuthModal?: () => void;
  onOpenWalkthrough?: () => void;
  unreadCount?: number;
  onSearchChange?: (query: string) => void;
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  activeTab,
  setActiveTab,
  selectedSport,
  setSelectedSport,
  onOpenNotifications,
  onOpenAuthModal,
  onOpenWalkthrough,
  unreadCount = 2,
  onSearchChange
}) => {
  const { user, profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { openLogoSwitcher } = useLogo();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTourOverlay, setShowTourOverlay] = useState(false);
  const [showQrPassModal, setShowQrPassModal] = useState(false);
  const [activeStreamCount, setActiveStreamCount] = useState<number>(0);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to live stream activity count
  useEffect(() => {
    const unsub = liveStreamService.subscribeToActiveStreams((streams) => {
      setActiveStreamCount(streams.length);
    });
    return () => unsub();
  }, []);

  // Fetch search suggestions dynamically as user types
  useEffect(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results: SearchSuggestion[] = [];

      try {
        // Query Firestore athletes / users with a quick timeout promise to prevent blocking on network connection errors
        const fetchFirestoreWithTimeout = async () => {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firestore network timeout')), 2500)
          );

          const fetchUsers = async () => {
            const usersRef = collection(db, 'users');
            const userSnap = await cachedGetDocs(
              query(usersRef, limit(20)),
              'header_search_users',
              { strategy: 'stale-while-revalidate', ttlMs: 5 * 60 * 1000 }
            );
            userSnap.forEach((docSnap) => {
              const data = docSnap.data();
              const name = data.displayName || data.name || '';
              const team = data.teamName || data.highSchool || data.sport || '';
              if (name.toLowerCase().includes(trimmed) || team.toLowerCase().includes(trimmed)) {
                results.push({
                  id: docSnap.id,
                  type: 'athlete',
                  title: name || 'Athlete Profile',
                  subtitle: `${data.position || 'Athlete'} • ${team || 'Unattached'}`,
                  badge: data.state || 'Verified',
                  avatarUrl: data.avatarUrl || data.photoURL,
                  targetRoute: `/athletes/${docSnap.id}`
                });
              }
            });

            // Query Firestore events
            const eventsRef = collection(db, 'events');
            const eventSnap = await cachedGetDocs(
              query(eventsRef, limit(20)),
              'header_search_events',
              { strategy: 'stale-while-revalidate', ttlMs: 5 * 60 * 1000 }
            );
            eventSnap.forEach((docSnap) => {
              const data = docSnap.data();
              const title = data.title || '';
              const loc = data.location || data.sport || '';
              if (title.toLowerCase().includes(trimmed) || loc.toLowerCase().includes(trimmed)) {
                results.push({
                  id: docSnap.id,
                  type: 'event',
                  title: title,
                  subtitle: `${data.eventType || 'Event'} • ${data.date || 'Upcoming'}`,
                  badge: data.sport || 'Sports',
                  targetRoute: `/events/${docSnap.id}`
                });
              }
            });
          };

          await Promise.race([fetchUsers(), timeoutPromise]);
        };

        await fetchFirestoreWithTimeout();
      } catch (err) {
        console.warn('Firestore autocomplete search error:', err);
      }

      // Standard organizations fallback
      const orgs = [
        { name: 'Tri-State Girls Flag Alliance', sport: "Girls' Flag Football", id: 'org-1' },
        { name: 'Garden State Prep Athletics', sport: 'Tackle Football', id: 'org-2' },
        { name: 'Northeast Elite Basketball League', sport: 'Basketball', id: 'org-3' }
      ];
      orgs.forEach((org) => {
        if (org.name.toLowerCase().includes(trimmed) || org.sport.toLowerCase().includes(trimmed)) {
          results.push({
            id: org.id,
            type: 'organization',
            title: org.name,
            subtitle: `Official Organization • ${org.sport}`,
            badge: 'Sanctioned',
            targetRoute: `/organization/${org.id}`
          });
        }
      });

      setSuggestions(results.slice(0, 6));
      setIsSearching(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.title);
    setIsSearchOpen(false);
    navigate(suggestion.targetRoute);
  };

  return (
    <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-40 w-full frosted-glass text-[#263238] dark:text-white border-b border-white/15 dark:border-white/10 transition-all duration-200 shadow-lg backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Brand Logo & Quick Context Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center cursor-pointer group"
          >
            <BrandLogo size="sm" showBadge={false} allowSwitch={true} />
          </div>

          {/* Quick Logo Style Switcher Button */}
          <button
            type="button"
            onClick={openLogoSwitcher}
            className="p-1 rounded-lg bg-slate-800/60 hover:bg-[#FF6A00]/20 text-slate-400 hover:text-[#FF6A00] border border-slate-700/50 transition-all cursor-pointer"
            title="Switch brand logo style"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Quick Context Indicator Pill */}
          <span className="text-[10px] font-mono font-bold clear-glass text-[#00B8D4] border border-[#00B8D4]/40 px-2.5 py-0.5 rounded-full uppercase shrink-0 shadow-[0_0_10px_rgba(0,184,212,0.25)]">
            {(activeTab || 'HOME').toUpperCase()}
          </span>
        </div>

        {/* Center: Desktop Navigation Bar with Framer Motion Shared Element Transitions */}
        <nav 
          className="hidden md:flex items-center gap-1 clear-glass border border-white/20 dark:border-white/15 rounded-full p-1 shadow-inner backdrop-blur-xl"
          onMouseLeave={() => setHoveredTab(null)}
        >
          {HEADER_NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            const isHovered = hoveredTab === link.id;

            return (
              <motion.button
                key={link.id}
                onClick={() => {
                  triggerHaptic('light');
                  if (setActiveTab) {
                    setActiveTab(link.id);
                  } else {
                    navigate(link.path);
                  }
                }}
                onMouseEnter={() => setHoveredTab(link.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer select-none ${
                  isActive 
                    ? 'text-white' 
                    : 'text-slate-600 dark:text-[#90A4AE] hover:text-[#263238] dark:hover:text-white'
                }`}
              >
                {/* Framer Motion Active Shared Element Indicator (#FF6A00) */}
                {isActive && (
                  <motion.div
                    layoutId="topHeaderActivePill"
                    className="absolute inset-0 bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] border border-[#FFC857]/40 rounded-full shadow-[0_0_18px_rgba(255,106,0,0.5)]"
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 34,
                      mass: 0.7
                    }}
                  />
                )}

                {/* Framer Motion Hover Shared Element Indicator */}
                {isHovered && !isActive && (
                  <motion.div
                    layoutId="topHeaderHoverPill"
                    className="absolute inset-0 bg-white/10 dark:bg-white/10 border border-white/20 rounded-full"
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 30
                    }}
                  />
                )}

                {/* Icon with active spring bounce */}
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative z-10 flex items-center justify-center"
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white stroke-[2.5]' : 'text-slate-500 dark:text-[#90A4AE] group-hover:text-[#00B8D4] stroke-[1.75]'}`} />
                </motion.div>

                {/* Label */}
                <span className="relative z-10 text-[11px] uppercase tracking-wider font-extrabold">
                  {link.label}
                </span>

                {/* Live pulse dot badge (#00B8D4) */}
                {link.isLive && (
                  <span className="relative z-10 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00B8D4] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00B8D4] shadow-[0_0_8px_rgba(0,184,212,0.8)]"></span>
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Right: Search, Notifications & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Quick Event Photos / Gallery Mobile Button */}
          <button
            onClick={() => {
              if (setActiveTab) setActiveTab('gallery');
              else navigate('/gallery');
            }}
            className={`p-2 rounded-full border transition-all cursor-pointer shadow-xs relative md:hidden ${
              activeTab === 'gallery'
                ? 'bg-[#FF6A00] border-[#FF6A00] text-white font-black shadow-[0_0_12px_rgba(255,106,0,0.4)]'
                : 'clear-glass border-white/20 text-[#00B8D4]'
            }`}
            title="Event Photo Gallery"
          >
            <Camera className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF6A00] text-white text-[9px] font-black flex items-center justify-center border border-white dark:border-[#182025]">
              12
            </span>
          </button>

          {/* Quick QR Pass Button */}
          <button
            onClick={() => setShowQrPassModal(true)}
            className="p-2 rounded-full clear-glass border border-white/20 hover:border-[#00B8D4] text-[#00B8D4] transition-all cursor-pointer shadow-xs hover:scale-105 hover:glow-cyan"
            title="View Digital Player QR Pass"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Firestore Write Queue & Offline Sync Indicator */}
          <div className="hidden sm:flex items-center">
            <WriteQueueSyncBadge variant="compact" />
          </div>
          
          {/* Global Search Bar */}
          <div className={`relative flex items-center transition-all duration-300 ${isSearchOpen ? 'fixed sm:relative inset-x-3 top-3.5 sm:top-auto z-50 sm:z-auto sm:w-48 lg:w-64' : 'w-9 sm:w-48 lg:w-64'}`}>
            <input
              type="text"
              placeholder="Search athletes, events..."
              value={searchQuery}
              onChange={handleSearchInput}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => !searchQuery && setIsSearchOpen(false)}
              className={`w-full h-9 pl-9 pr-8 clear-glass border border-white/20 focus:border-[#00B8D4] rounded-full text-xs text-[#263238] dark:text-white placeholder-slate-400 dark:placeholder-[#90A4AE] outline-none transition-all duration-200 shadow-sm ${
                isSearchOpen 
                  ? 'opacity-100 ring-2 ring-[#00B8D4]/40 bg-white dark:bg-[#263238] shadow-xl' 
                  : 'opacity-0 sm:opacity-100 pointer-events-none sm:pointer-events-auto'
              }`}
            />
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(true);
              }}
              className="absolute left-0 top-0 w-9 h-9 flex items-center justify-center text-slate-400 dark:text-[#90A4AE] hover:text-[#00B8D4] sm:pointer-events-none"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  if (onSearchChange) onSearchChange('');
                  setIsSearchOpen(false);
                }} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#90A4AE] hover:text-red-500 p-1"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {isSearchOpen && (
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                }}
                className="sm:hidden ml-2 px-2.5 py-1.5 rounded-full clear-glass text-xs font-bold text-slate-600 dark:text-[#90A4AE]"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Direct Standalone Live Stream Shortcut (#FF6A00 + #00B8D4) */}
          <button
            onClick={() => navigate('/live')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-mono text-xs font-black tracking-wider uppercase shadow-[0_0_18px_rgba(255,106,0,0.45)] transition-all cursor-pointer transform hover:scale-105 active:scale-95 border border-[#FFC857]/40 shrink-0"
            title="Open Live Broadcast Hub"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00B8D4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00B8D4]"></span>
            </span>
            <Radio className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">LIVE</span>
            {activeStreamCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-[#263238] text-[#FFC857] rounded-full text-[10px]">
                {activeStreamCount}
              </span>
            )}
          </button>

          {/* Theme Mode Toggle Component */}
          <ThemeToggle />

          {/* Real-time Direct Message Badge */}
          <DirectMessageBadge />

          {/* Notification Bell */}
          <button 
            onClick={onOpenNotifications}
            aria-label="Notifications" 
            className="relative w-9 h-9 rounded-full bg-slate-100 dark:bg-[#263238] border border-slate-200 dark:border-[#37474F] hover:border-[#FF6A00] flex items-center justify-center text-slate-500 dark:text-[#90A4AE] hover:text-[#FF6A00] transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF6A00] ring-2 ring-white dark:ring-[#182025] animate-pulse" />
            )}
          </button>

          {/* User Avatar & Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                if ((!user || user.isAnonymous) && !profile) {
                  if (onOpenAuthModal) onOpenAuthModal();
                  else setShowProfileMenu(!showProfileMenu);
                } else {
                  setShowProfileMenu(!showProfileMenu);
                }
              }}
              className="flex items-center gap-2 p-0.5 rounded-full hover:scale-105 transition-all cursor-pointer group"
              aria-label="User Menu"
            >
              <RoleAvatar
                role={role || profile?.role || 'athlete'}
                photoURL={profile?.photoURL || user?.photoURL}
                displayName={profile?.displayName || user?.displayName}
                size="sm"
                showRoleBadge={true}
                animateGlow={true}
              />
            </button>

            {/* User Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-80 py-2 bg-[#081342] backdrop-blur-2xl border border-[#568BDD]/30 rounded-2xl shadow-2xl z-50 max-h-[calc(100vh-80px)] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-[#568BDD]/20 mb-1">
                  <p className="text-xs font-bold text-white truncate">
                    {profile?.displayName || user?.displayName || 'Athlete Account'}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] truncate">
                    {user?.email || 'Logged in'}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[9px] text-[#DFAE1D] font-semibold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3 text-[#DFAE1D]" />
                    <span>Role: {role || 'Athlete'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowTourOverlay(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#DFAE1D] hover:bg-[#DFAE1D]/10 transition-colors text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#DFAE1D]" />
                  <span>Role Feature Tour</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onOpenWalkthrough) onOpenWalkthrough();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#568BDD] hover:bg-[#568BDD]/10 transition-colors text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#568BDD]" />
                  <span>Interactive Walkthrough</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/gmail');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#040D40] hover:text-white transition-colors text-left"
                >
                  <Mail className="w-3.5 h-3.5 text-[#568BDD]" />
                  <span>Gmail Inbox & Recruiting</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onOpenAuthModal) onOpenAuthModal();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-[#040D40] hover:text-white transition-colors text-left"
                >
                  <User className="w-3.5 h-3.5 text-[#DFAE1D]" />
                  <span>Account & Settings</span>
                </button>

                {/* Theme Switcher Row in Dropdown */}
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:bg-[#040D40] hover:text-white transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {theme === 'dark' ? (
                      <Sun className="w-3.5 h-3.5 text-[#DFAE1D]" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>Theme Mode</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#040D40] text-[10px] font-mono font-bold text-[#DFAE1D] uppercase">
                    {theme === 'dark' ? 'Dark 🌙' : 'Light ☀️'}
                  </span>
                </button>

                {user && !user.isAnonymous ? (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onOpenAuthModal) onOpenAuthModal();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#DFAE1D] hover:bg-[#DFAE1D]/10 transition-colors text-left"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In / Register</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Role Feature Tour Overlay */}
      <RoleTourOverlay
        isOpen={showTourOverlay}
        onClose={() => setShowTourOverlay(false)}
      />

      {/* Pro Mobile QR Quick Pass Modal */}
      <ProMobileQuickPassModal
        isOpen={showQrPassModal}
        onClose={() => setShowQrPassModal(false)}
      />

      {/* Brand Logo Switcher Modal */}
      <LogoSwitcherModal />
    </header>
  );
};

export default TopHeaderBar;
