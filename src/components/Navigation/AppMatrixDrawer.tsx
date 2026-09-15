import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Crosshair, 
  Flame, 
  Aperture, 
  Camera, 
  Zap, 
  SlidersHorizontal, 
  X, 
  ArrowRight, 
  Sparkles, 
  Radio, 
  Layers, 
  Users, 
  HelpCircle, 
  MessageSquare, 
  Film, 
  Activity, 
  Search, 
  Check,
  Shield,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';
import { useAuthRole } from '../../hooks/useAuthRole';
import { useUnreadDirectMessages } from '../../hooks/useUnreadDirectMessages';
import { triggerHaptic } from '../../lib/haptics';
import { UserRole } from '../../types/platform';

interface AppMatrixDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type MatrixCategory = 'all' | 'tactics' | 'scout' | 'events' | 'community';

const AVAILABLE_ROLES: { id: UserRole; label: string }[] = [
  { id: 'athlete', label: 'Athlete' },
  { id: 'coach', label: 'Coach' },
  { id: 'scout', label: 'Scout' },
  { id: 'director', label: 'Director' },
  { id: 'creator', label: 'Creator' },
  { id: 'fan', label: 'Fan' },
  { id: 'viewer', label: 'Official / Ref' },
  { id: 'admin', label: 'Admin' }
];

export const AppMatrixDrawer: React.FC<AppMatrixDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, switchRole } = useAuthRole();
  const { unreadCount, hasUnread } = useUnreadDirectMessages();
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MatrixCategory>('all');
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Suppress floating dock when drawer is open so it doesn't block bottom cards
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('app:hide-dock'));
    } else {
      window.dispatchEvent(new CustomEvent('app:show-dock'));
    }
  }, [isOpen]);

  const toggleSectionCollapse = (sectionKey: string) => {
    triggerHaptic('light');
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Top 4 High-Impact Pinned Quick Tiles
  const PINNED_TILES = [
    {
      id: 'pinned-signal-hub',
      category: 'tactics' as MatrixCategory,
      title: 'Signal Hub & Wrist HUD',
      path: '/signal-hub',
      badge: 'LIVE HUD',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-400/50',
      icon: Radio,
      iconColor: 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]',
      cardStyle: 'border-teal-500/50 bg-gradient-to-b from-teal-950/40 to-[#1E293B]/80 shadow-[0_0_20px_rgba(45,212,191,0.25)] hover:border-teal-400 hover:shadow-[0_0_25px_rgba(45,212,191,0.4)]',
      hasPulse: true
    },
    {
      id: 'pinned-playbook',
      category: 'tactics' as MatrixCategory,
      title: 'Playbook Lab & Tactics Engine',
      path: '/playbook',
      badge: 'TACTICS LAB',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      icon: SlidersHorizontal,
      iconColor: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
      cardStyle: 'border-emerald-500/30 bg-[#1E293B]/70 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]',
      hasPulse: false
    },
    {
      id: 'pinned-tournaments',
      category: 'events' as MatrixCategory,
      title: 'Tournaments & Event Brackets',
      path: '/tournaments',
      badge: 'LIVE ENGINE',
      badgeColor: 'bg-[#FFC857]/20 text-[#FFC857] border-[#FFC857]/40',
      icon: Trophy,
      iconColor: 'text-[#FFC857] drop-shadow-[0_0_8px_rgba(255,200,87,0.5)]',
      cardStyle: 'border-amber-500/30 bg-[#1E293B]/70 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      hasPulse: false
    },
    {
      id: 'pinned-watch',
      category: 'scout' as MatrixCategory,
      title: 'Watch Vault & Athlete Film',
      path: '/watch',
      badge: 'SCOUT FILM',
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
      icon: Film,
      iconColor: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]',
      cardStyle: 'border-cyan-500/30 bg-[#1E293B]/70 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,229,255,0.25)]',
      hasPulse: false
    }
  ];

  // Categorized Remaining Tools
  const CATEGORY_SECTIONS = [
    {
      key: 'tactics' as MatrixCategory,
      title: 'Tactics & Sideline',
      items: [
        {
          id: 'signal-hub',
          title: 'Signal Hub & Live Wrist HUD',
          subtitle: 'Real-time sideline play calling, wristwatch signaling & HUD matrix',
          path: '/signal-hub',
          badge: 'LIVE HUD',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-400/50',
          icon: Radio,
          iconColor: 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]',
          borderGlow: 'hover:border-teal-400 hover:shadow-[0_0_20px_rgba(45,212,191,0.25)]'
        },
        {
          id: 'creator-studio',
          title: 'Creator Studio & Google Drive Hub',
          subtitle: 'Direct Drive Media Sync, 4K Pricing & PayPal Revenue Split',
          path: '/dashboard/creator',
          badge: 'MONETIZE',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          icon: Camera,
          iconColor: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
          borderGlow: 'hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]'
        },
        {
          id: 'director',
          title: 'Director Command Desk',
          subtitle: 'Court Delay Offsets, Scorekeeper & Financial Ops',
          path: '/director',
          badge: 'OPERATIONS',
          badgeColor: 'bg-slate-700/60 text-slate-200 border-slate-600',
          icon: SlidersHorizontal,
          iconColor: 'text-[#F4F4F4] drop-shadow-[0_0_8px_rgba(244,244,244,0.4)]',
          borderGlow: 'hover:border-slate-400 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]'
        },
        {
          id: 'google-sheets',
          title: 'Google Sheets Operations Hub',
          subtitle: 'Live Roster Sync, Tournament Brackets & Laser Combine Exporters',
          path: '/sheets',
          badge: 'WORKSPACE',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          icon: FileSpreadsheet,
          iconColor: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
          borderGlow: 'hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]'
        }
      ]
    },
    {
      key: 'scout' as MatrixCategory,
      title: 'Scouting & Recruiting',
      items: [
        {
          id: 'athletes',
          title: 'Athlete Scouting Matrix',
          subtitle: 'Verified Player Cards, Recruiter Hub & Radar',
          path: '/athletes',
          badge: 'SCOUT READY',
          badgeColor: 'bg-[#00B8D4]/20 text-[#00B8D4] border-[#00B8D4]/40',
          icon: Crosshair,
          iconColor: 'text-[#00B8D4] drop-shadow-[0_0_8px_rgba(0,184,212,0.6)]',
          borderGlow: 'hover:border-[#00B8D4] hover:shadow-[0_0_20px_rgba(0,184,212,0.25)]'
        },
        {
          id: 'combine',
          title: 'Combine Laser Leaderboard',
          subtitle: '40-Yd Laser Times, Pro Shuttle & Athletic Index',
          path: '/combine',
          badge: 'LASER TIMED',
          badgeColor: 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40',
          icon: Zap,
          iconColor: 'text-[#FF6A00] drop-shadow-[0_0_8px_rgba(255,106,0,0.6)]',
          borderGlow: 'hover:border-[#FF6A00] hover:shadow-[0_0_20px_rgba(255,106,0,0.25)]'
        },
        {
          id: 'cheer-matrix',
          title: 'CheerMatrix™ Scouting Radar',
          subtitle: 'Cheerleading & STUNT Skill Verification, Video Proof & College Readiness',
          path: '/cheer-matrix',
          badge: 'NCAA D1 / L6',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          icon: Sparkles,
          iconColor: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
          borderGlow: 'hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]'
        },
        {
          id: 'gallery',
          title: '4K Media & Photo Vault',
          subtitle: 'High-Resolution Action Photos & Reel Downloads',
          path: '/gallery',
          badge: '4K VAULT',
          badgeColor: 'bg-[#00B8D4]/20 text-[#00B8D4] border-[#00B8D4]/40',
          icon: Aperture,
          iconColor: 'text-[#00B8D4] drop-shadow-[0_0_8px_rgba(0,184,212,0.6)]',
          borderGlow: 'hover:border-[#00B8D4] hover:shadow-[0_0_20px_rgba(0,184,212,0.25)]'
        }
      ]
    },
    {
      key: 'events' as MatrixCategory,
      title: 'Tournaments & Events',
      items: [
        {
          id: 'activity-stream',
          title: 'Universal Activity Stream',
          subtitle: 'Real-Time Multi-Sport Stream, Film Uploads, Combine Records & Plays',
          path: '/activity',
          badge: 'LIVE STREAM',
          badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
          icon: Activity,
          iconColor: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]',
          borderGlow: 'hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,229,255,0.25)]'
        },
        {
          id: 'events',
          title: 'Events & Showcase Hub',
          subtitle: 'Combines, Lasers, Camps, 7v7 Showcases & Media Days',
          path: '/events',
          badge: 'LIVE RSVP',
          badgeColor: 'bg-[#00B8D4]/20 text-[#00B8D4] border-[#00B8D4]/40',
          icon: Zap,
          iconColor: 'text-[#00B8D4] drop-shadow-[0_0_8px_rgba(0,184,212,0.6)]',
          borderGlow: 'hover:border-[#00B8D4] hover:shadow-[0_0_20px_rgba(0,184,212,0.25)]'
        }
      ]
    },
    {
      key: 'community' as MatrixCategory,
      title: 'Community & DMs',
      items: [
        {
          id: 'direct-messages',
          title: 'Direct Messages & Messenger',
          subtitle: 'Real-time DMs with Athletes, Coaches, Scouts & Directors',
          path: '/messages',
          badge: hasUnread ? `${unreadCount} UNREAD` : 'REAL-TIME',
          badgeColor: hasUnread 
            ? 'bg-[#FF6A00]/30 text-[#FF6A00] border-[#FF6A00] animate-pulse' 
            : 'bg-[#00B8D4]/20 text-[#00B8D4] border-[#00B8D4]/40',
          icon: MessageSquare,
          iconColor: hasUnread ? 'text-[#FF6A00] drop-shadow-[0_0_8px_rgba(255,106,0,0.8)]' : 'text-[#00B8D4] drop-shadow-[0_0_8px_rgba(0,184,212,0.6)]',
          borderGlow: hasUnread ? 'border-[#FF6A00]/80 shadow-[0_0_20px_rgba(255,106,0,0.3)]' : 'hover:border-[#00B8D4] hover:shadow-[0_0_20px_rgba(0,184,212,0.25)]'
        },
        {
          id: 'locker-room',
          title: 'The Locker Room Social Wall',
          subtitle: 'Live Play Discussions, Reactions & Media Posts',
          path: '/locker-room',
          badge: 'HOT FEED',
          badgeColor: 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40',
          icon: Flame,
          iconColor: 'text-[#FF6A00] drop-shadow-[0_0_8px_rgba(255,106,0,0.6)]',
          borderGlow: 'hover:border-[#FF6A00] hover:shadow-[0_0_20px_rgba(255,106,0,0.25)]'
        },
        {
          id: 'members',
          title: 'Member & Athlete Directory',
          subtitle: 'Search Rosters, Verified Profiles, Follow Athletes & Coaches',
          path: '/members',
          badge: 'DIRECTORY',
          badgeColor: 'bg-[#00B8D4]/20 text-[#00B8D4] border-[#00B8D4]/40',
          icon: Users,
          iconColor: 'text-[#00B8D4] drop-shadow-[0_0_8px_rgba(0,184,212,0.6)]',
          borderGlow: 'hover:border-[#00B8D4] hover:shadow-[0_0_20px_rgba(0,184,212,0.25)]'
        },
        {
          id: 'blog',
          title: 'Just1Play Editorial Blog Hub',
          subtitle: 'Tournament Recaps, Recruiting Guides & Athlete Spotlights',
          path: '/blog',
          badge: 'EDITORIAL',
          badgeColor: 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40',
          icon: Trophy,
          iconColor: 'text-[#FF6A00] drop-shadow-[0_0_8px_rgba(255,106,0,0.6)]',
          borderGlow: 'hover:border-[#FF6A00] hover:shadow-[0_0_20px_rgba(255,106,0,0.25)]'
        },
        {
          id: 'faq',
          title: 'Help Center & FAQ Knowledge Base',
          subtitle: 'Answers, Guides, Login/Out, Brackets, Photo Downloads & Support',
          path: '/faq',
          badge: 'SUPPORT & FAQ',
          badgeColor: 'bg-[#00B8D4]/20 text-[#00B8D4] border-[#00B8D4]/40',
          icon: HelpCircle,
          iconColor: 'text-[#00B8D4] drop-shadow-[0_0_8px_rgba(0,184,212,0.6)]',
          borderGlow: 'hover:border-[#00B8D4] hover:shadow-[0_0_20px_rgba(0,184,212,0.25)]'
        }
      ]
    }
  ];

  // Filter calculation
  const query = searchFilter.trim().toLowerCase();

  const filteredPinnedTiles = PINNED_TILES.filter(tile => {
    const matchesCategory = selectedCategory === 'all' || tile.category === selectedCategory;
    if (!query) return matchesCategory;
    const matchesQuery = 
      tile.title.toLowerCase().includes(query) ||
      tile.badge.toLowerCase().includes(query) ||
      tile.path.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  const filteredSections = CATEGORY_SECTIONS.map(section => {
    if (selectedCategory !== 'all' && section.key !== selectedCategory) {
      return { ...section, items: [] };
    }
    const matchingItems = section.items.filter(item => {
      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query) ||
        item.badge.toLowerCase().includes(query) ||
        item.path.toLowerCase().includes(query)
      );
    });
    return { ...section, items: matchingItems };
  }).filter(section => section.items.length > 0);

  const totalMatchingTools = filteredPinnedTiles.length + filteredSections.reduce((acc, s) => acc + s.items.length, 0);

  const handleNavigate = (path: string) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12);
    }
    triggerHaptic('light');
    try {
      onClose();
      navigate(path);
    } catch (err) {
      console.warn('Navigation note:', err);
      window.location.pathname = path;
    }
  };

  const handleRoleSelect = (targetRole: UserRole) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12);
    }
    triggerHaptic('medium');
    switchRole(targetRole);
    setIsRoleSwitcherOpen(false);
  };

  const currentRoleObj = AVAILABLE_ROLES.find(r => r.id === role);
  const formattedRoleName = currentRoleObj ? currentRoleObj.label : ((role || 'athlete').charAt(0).toUpperCase() + (role || 'athlete').slice(1));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden flex justify-end">
          {/* Backdrop Blur Tap Target */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative w-full max-w-lg bg-[#08090C] border-l border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] shadow-2xl flex flex-col h-full z-10"
          >
            {/* Sticky Header */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#08090C]/95 backdrop-blur-md shrink-0 space-y-3 pt-[calc(env(safe-area-inset-top,0px)+16px)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-[#00F0D0]/15 border border-[#00F0D0]/40 text-[#00F0D0] shrink-0 shadow-[0_0_12px_rgba(0,240,208,0.2)]">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2 truncate">
                      <span>JUST1PLAY Matrix</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00F0D0]/20 text-[#00F0D0] border border-[#00F0D0]/40 shrink-0 font-black">
                        LAUNCHER
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium truncate">
                      Tactical Command Center & Universal Navigation
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-[#12151C] text-slate-300 hover:text-white border border-white/[0.08] flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-[0.97] select-none hover:border-white/20 shrink-0"
                  aria-label="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Live Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search tools, signals, playbook, brackets..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full h-10 pl-9 pr-8 rounded-xl bg-[#12151C]/90 border border-white/[0.08] text-xs text-white placeholder-slate-400 focus:border-[#00F0D0] focus:outline-none focus:ring-1 focus:ring-[#00F0D0] transition-all"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Horizontal Filter Strip with Touch Scroll, Touch Pan, and Hidden Scrollbars */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap w-full px-1 scroll-smooth touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] pb-1 pt-0.5">
                {[
                  { id: 'all', label: 'All Hubs' },
                  { id: 'tactics', label: 'Tactics & Sideline' },
                  { id: 'scout', label: 'Scouting & Recruiting' },
                  { id: 'events', label: 'Tournaments & Events' },
                  { id: 'community', label: 'Community & DMs' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                        navigator.vibrate(12);
                      }
                      triggerHaptic('light');
                      setSelectedCategory(cat.id as MatrixCategory);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 whitespace-nowrap transition-all duration-150 active:scale-[0.97] select-none cursor-pointer border ${
                      selectedCategory === cat.id
                        ? 'bg-[#00F0D0]/20 text-[#00F0D0] border-[#00F0D0] shadow-[0_0_14px_rgba(0,240,208,0.3)]'
                        : 'bg-[#12151C]/80 text-slate-400 border-white/[0.08] hover:text-white hover:bg-[#12151C] hover:border-white/20'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Command Center Container with dynamic pb-48 / pb-32 for Mobile Dock Clearance */}
            <div className={`flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 ${isRoleSwitcherOpen ? 'pb-48' : 'pb-32'} max-h-[85vh] overscroll-contain`}>
              {totalMatchingTools === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1E293B] border border-[#24324F] flex items-center justify-center mx-auto text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">No matching hub or tool found</p>
                  <p className="text-xs text-slate-400">Try searching for &quot;wrist&quot;, &quot;playbook&quot;, &quot;brackets&quot;, or &quot;film&quot;.</p>
                  <button
                    onClick={() => {
                      setSearchFilter('');
                      setSelectedCategory('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. TOP 4 PINNED ACTION GRID (2x2 Quick Tiles) */}
                  {filteredPinnedTiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400">
                          Priority Quick Launch
                        </span>
                        <span className="text-[10px] font-mono text-teal-400 font-bold">
                          PINNED
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                        {filteredPinnedTiles.map((tile) => {
                          const Icon = tile.icon;
                          const isActive = location.pathname === tile.path || location.pathname.startsWith(`${tile.path}/`);

                          return (
                            <button
                              key={tile.id}
                              onClick={() => {
                                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                                  navigator.vibrate(10);
                                }
                                handleNavigate(tile.path);
                              }}
                              className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center justify-between group active:scale-[0.97] min-h-[125px] ${tile.cardStyle} ${
                                isActive ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#090D16]' : ''
                              }`}
                            >
                              {/* Status Badge Pill */}
                              <div className="w-full flex justify-center">
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase border shrink-0 ${tile.badgeColor}`}>
                                  {tile.hasPulse && (
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-400" />
                                    </span>
                                  )}
                                  <span>{tile.badge}</span>
                                </div>
                              </div>

                              {/* Centered High-Contrast Icon */}
                              <div className="my-1.5 p-2.5 rounded-xl bg-[#090D16]/90 border border-[#24324F] group-hover:scale-110 transition-transform">
                                <Icon className={`w-5 h-5 ${tile.iconColor}`} />
                              </div>

                              {/* Bold Title */}
                              <span className="text-xs sm:text-[13px] font-black text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                                {tile.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. CATEGORIZED SECTIONS FOR REMAINING TOOLS */}
                  {filteredSections.map((section) => {
                    const isCollapsed = Boolean(collapsedSections[section.key]);

                    return (
                      <div key={section.key} className="space-y-2 pt-1">
                        {/* Section Header with Collapse Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleSectionCollapse(section.key)}
                          className="w-full flex items-center justify-between px-1 py-1 text-left cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 group-hover:text-white transition-colors">
                              {section.title}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {section.items.length}
                            </span>
                          </div>

                          <div className="p-1 rounded text-slate-400 group-hover:text-cyan-400 transition-colors">
                            {isCollapsed ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronUp className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </button>

                        {/* Section Item Cards */}
                        {!isCollapsed && (
                          <div className="space-y-2">
                            {section.items.map((item) => {
                              const Icon = item.icon;
                              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

                              return (
                                <button
                                  key={item.id}
                                  onClick={() => handleNavigate(item.path)}
                                  className={`w-full p-3 sm:p-3.5 rounded-2xl bg-[#1E293B]/70 border transition-all cursor-pointer text-left flex items-center justify-between gap-3 group active:scale-[0.98] ${
                                    isActive 
                                      ? 'border-[#00B8D4] bg-[#263238] shadow-[0_0_20px_rgba(0,184,212,0.3)]' 
                                      : `border-[#24324F] ${item.borderGlow}`
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="p-2 rounded-xl bg-[#090D16] border border-[#24324F] group-hover:border-slate-500 transition-colors shrink-0">
                                      <Icon className={`w-4 h-4 ${item.iconColor}`} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-extrabold text-xs sm:text-sm text-white group-hover:text-cyan-300 transition-colors">
                                          {item.title}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-black uppercase border shrink-0 ${item.badgeColor}`}>
                                          {item.badge}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">
                                        {item.subtitle}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 pl-1">
                                    {isActive ? (
                                      <span className="p-1 rounded-full bg-cyan-500/20 text-cyan-400">
                                        <Check className="w-3.5 h-3.5" />
                                      </span>
                                    ) : (
                                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* 3. STREAMLINED BOTTOM ROLE SWITCHER */}
            <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-[#08090C]/95 backdrop-blur-md shrink-0 space-y-2 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
              {isRoleSwitcherOpen && (
                <div className="p-2.5 rounded-2xl bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in zoom-in-95">
                  {AVAILABLE_ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleSelect(r.id)}
                      className={`px-2.5 py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase transition-all duration-150 active:scale-[0.97] select-none cursor-pointer text-center truncate ${
                        role === r.id 
                          ? 'bg-[#00F0D0] text-[#08090C] shadow-[0_0_12px_rgba(0,240,208,0.5)] font-black' 
                          : 'bg-[#08090C] text-slate-300 hover:text-white hover:bg-white/10 border border-white/[0.06]'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Compact Interactive Pill: [ 🛡️ Active Role: Admin Mode (Tap to Switch) ] */}
              <button
                id="btn-matrix-role-pill"
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                    navigator.vibrate(12);
                  }
                  triggerHaptic('light');
                  setIsRoleSwitcherOpen(!isRoleSwitcherOpen);
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#00F0D0]/10 via-[#12151C] to-[#00F0D0]/10 hover:from-[#00F0D0]/20 hover:to-[#00F0D0]/20 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-[#00F0D0]/50 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] select-none cursor-pointer shadow-lg"
              >
                <Shield className="w-3.5 h-3.5 text-[#00F0D0] shrink-0" />
                <span className="text-slate-300">Active Role:</span>
                <span className="text-[#00F0D0] font-black uppercase tracking-wide">
                  {formattedRoleName} Mode
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Tap to Switch)
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#00F0D0] transition-transform ${isRoleSwitcherOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AppMatrixDrawer;

