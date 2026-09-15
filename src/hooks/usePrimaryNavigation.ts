import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Flame, 
  Film, 
  BookOpen, 
  Users, 
  Activity, 
  Trophy, 
  Camera, 
  DollarSign, 
  Crosshair, 
  Star, 
  Calendar, 
  ShieldCheck, 
  Compass, 
  Sparkles,
  Zap,
  User
} from 'lucide-react';
import { UserRole } from '../types/platform';
import { useAuthRole, normalizeRole } from './useAuthRole';
import { preloadModule } from '../lib/lazyWithRetry';
import { triggerHaptic } from '../lib/haptics';

export interface PrimaryTab {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  iconClass?: string;
  accentColor: string;
  activeBorder?: string;
  badge?: string;
  isAuthTrigger?: boolean;
}

export interface RoleTabsMapping {
  tab3: PrimaryTab;
  tab4: PrimaryTab;
}

export const ROLE_DYNAMIC_TABS: Record<string, RoleTabsMapping> = {
  coach: {
    tab3: {
      id: 'coach_playbook',
      label: 'Playbook',
      path: '/playbook',
      icon: BookOpen,
      iconClass: 'w-4 h-4 text-[#00B8D4] drop-shadow-[0_0_6px_rgba(0,184,212,0.6)]',
      accentColor: '#00B8D4',
      activeBorder: 'border-[#00B8D4] bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_rgba(0,184,212,0.3)]',
      badge: 'TACTICS'
    },
    tab4: {
      id: 'coach_roster',
      label: 'Roster',
      path: '/members',
      icon: Users,
      iconClass: 'w-4 h-4 text-[#00F5D4] drop-shadow-[0_0_6px_rgba(0,245,212,0.6)]',
      accentColor: '#00F5D4',
      activeBorder: 'border-[#00F5D4] bg-teal-950/40 text-teal-300 shadow-[0_0_12px_rgba(0,245,212,0.3)]',
      badge: 'ROSTER'
    }
  },
  athlete: {
    tab3: {
      id: 'athlete_stats_film',
      label: 'My Stats & Film',
      path: '/dashboard/athlete/film',
      icon: Activity,
      iconClass: 'w-4 h-4 text-[#00F5D4] drop-shadow-[0_0_6px_rgba(0,245,212,0.6)]',
      accentColor: '#00F5D4',
      activeBorder: 'border-[#00F5D4] bg-teal-950/40 text-teal-300 shadow-[0_0_12px_rgba(0,245,212,0.3)]',
      badge: 'FILM'
    },
    tab4: {
      id: 'athlete_scout_card',
      label: 'Scout Card',
      path: '/profile',
      icon: Trophy,
      iconClass: 'w-4 h-4 text-[#FF6A00] drop-shadow-[0_0_6px_rgba(255,106,0,0.6)]',
      accentColor: '#FF6A00',
      activeBorder: 'border-[#FF6A00] bg-orange-950/40 text-orange-300 shadow-[0_0_12px_rgba(255,106,0,0.3)]',
      badge: 'SCOUT CARD'
    }
  },
  creator: {
    tab3: {
      id: 'creator_vault',
      label: 'Media Vault',
      path: '/dashboard/creator',
      icon: Camera,
      iconClass: 'w-4 h-4 text-[#00B8D4] drop-shadow-[0_0_6px_rgba(0,184,212,0.6)]',
      accentColor: '#00B8D4',
      activeBorder: 'border-[#00B8D4] bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_rgba(0,184,212,0.3)]',
      badge: 'DRIVE 4K'
    },
    tab4: {
      id: 'creator_client_hub',
      label: 'Client Hub',
      path: '/creator/payouts',
      icon: DollarSign,
      iconClass: 'w-4 h-4 text-[#FFC857] drop-shadow-[0_0_6px_rgba(255,200,87,0.6)]',
      accentColor: '#FFC857',
      activeBorder: 'border-[#FFC857] bg-amber-950/40 text-amber-300 shadow-[0_0_12px_rgba(255,200,87,0.3)]',
      badge: 'CLIENTS'
    }
  },
  scout: {
    tab3: {
      id: 'scout_prospect_board',
      label: 'Prospect Board',
      path: '/athletes',
      icon: Crosshair,
      iconClass: 'w-4 h-4 text-[#FFC857] drop-shadow-[0_0_6px_rgba(255,200,87,0.6)]',
      accentColor: '#FFC857',
      activeBorder: 'border-[#FFC857] bg-amber-950/40 text-amber-300 shadow-[0_0_12px_rgba(255,200,87,0.3)]',
      badge: 'RADAR'
    },
    tab4: {
      id: 'scout_watchlist',
      label: 'Watchlist',
      path: '/dashboard/scout/watchlist',
      icon: Star,
      iconClass: 'w-4 h-4 text-[#FB8500] drop-shadow-[0_0_6px_rgba(251,133,0,0.6)]',
      accentColor: '#FB8500',
      activeBorder: 'border-[#FB8500] bg-orange-950/40 text-orange-300 shadow-[0_0_12px_rgba(251,133,0,0.3)]',
      badge: 'WATCHLIST'
    }
  },
  fan: {
    tab3: {
      id: 'fan_schedule',
      label: 'Schedule & Scores',
      path: '/tournaments',
      icon: Calendar,
      iconClass: 'w-4 h-4 text-[#818CF8] drop-shadow-[0_0_6px_rgba(129,140,248,0.6)]',
      accentColor: '#818CF8',
      activeBorder: 'border-[#818CF8] bg-indigo-950/40 text-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.3)]',
      badge: 'LIVE'
    },
    tab4: {
      id: 'fan_community',
      label: 'Community',
      path: '/members',
      icon: Users,
      iconClass: 'w-4 h-4 text-[#6366F1] drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]',
      accentColor: '#6366F1',
      activeBorder: 'border-[#6366F1] bg-indigo-950/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]',
      badge: 'MEMBERS'
    }
  },
  viewer: {
    tab3: {
      id: 'viewer_schedule',
      label: 'Schedule & Scores',
      path: '/tournaments',
      icon: Calendar,
      iconClass: 'w-4 h-4 text-[#818CF8] drop-shadow-[0_0_6px_rgba(129,140,248,0.6)]',
      accentColor: '#818CF8',
      activeBorder: 'border-[#818CF8] bg-indigo-950/40 text-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.3)]',
      badge: 'LIVE'
    },
    tab4: {
      id: 'viewer_community',
      label: 'Community',
      path: '/members',
      icon: Users,
      iconClass: 'w-4 h-4 text-[#6366F1] drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]',
      accentColor: '#6366F1',
      activeBorder: 'border-[#6366F1] bg-indigo-950/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]',
      badge: 'MEMBERS'
    }
  },
  member: {
    tab3: {
      id: 'member_schedule',
      label: 'Schedule & Scores',
      path: '/tournaments',
      icon: Calendar,
      iconClass: 'w-4 h-4 text-[#818CF8] drop-shadow-[0_0_6px_rgba(129,140,248,0.6)]',
      accentColor: '#818CF8',
      activeBorder: 'border-[#818CF8] bg-indigo-950/40 text-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.3)]',
      badge: 'LIVE'
    },
    tab4: {
      id: 'member_community',
      label: 'Community',
      path: '/members',
      icon: Users,
      iconClass: 'w-4 h-4 text-[#6366F1] drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]',
      accentColor: '#6366F1',
      activeBorder: 'border-[#6366F1] bg-indigo-950/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]',
      badge: 'MEMBERS'
    }
  },
  director: {
    tab3: {
      id: 'director_schedule',
      label: 'Events & Brackets',
      path: '/tournaments',
      icon: Trophy,
      iconClass: 'w-4 h-4 text-[#00B8D4] drop-shadow-[0_0_6px_rgba(0,184,212,0.6)]',
      accentColor: '#00B8D4',
      activeBorder: 'border-[#00B8D4] bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_rgba(0,184,212,0.3)]',
      badge: 'BRACKETS'
    },
    tab4: {
      id: 'director_command',
      label: 'Command Desk',
      path: '/dashboard/director',
      icon: Users,
      iconClass: 'w-4 h-4 text-[#00F5D4] drop-shadow-[0_0_6px_rgba(0,245,212,0.6)]',
      accentColor: '#00F5D4',
      activeBorder: 'border-[#00F5D4] bg-teal-950/40 text-teal-300 shadow-[0_0_12px_rgba(0,245,212,0.3)]',
      badge: 'DESK'
    }
  },
  admin: {
    tab3: {
      id: 'admin_command',
      label: 'Master Command',
      path: '/dashboard/admin',
      icon: Activity,
      iconClass: 'w-4 h-4 text-[#EC4899] drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]',
      accentColor: '#EC4899',
      activeBorder: 'border-pink-400 bg-gradient-to-r from-pink-950/70 to-purple-950/70 text-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.5)] ring-1 ring-pink-500/40',
      badge: 'HQ'
    },
    tab4: {
      id: 'admin_users',
      label: 'User Hub',
      path: '/dashboard/admin/users',
      icon: ShieldCheck,
      iconClass: 'w-4 h-4 text-[#8B5CF6] drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]',
      accentColor: '#8B5CF6',
      activeBorder: 'border-[#8B5CF6] bg-purple-950/40 text-purple-300 shadow-[0_0_12px_rgba(139,92,246,0.3)]',
      badge: 'USERS'
    }
  },
  guest: {
    tab3: {
      id: 'guest_explore',
      label: 'Explore',
      path: '/events',
      icon: Compass,
      iconClass: 'w-4 h-4 text-[#00B8D4] drop-shadow-[0_0_6px_rgba(0,184,212,0.6)]',
      accentColor: '#00B8D4',
      activeBorder: 'border-[#00B8D4] bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_rgba(0,184,212,0.3)]',
      badge: 'EVENTS'
    },
    tab4: {
      id: 'guest_join',
      label: 'Join',
      path: '#join',
      icon: Sparkles,
      iconClass: 'w-4 h-4 text-[#FF6A00] drop-shadow-[0_0_6px_rgba(255,106,0,0.6)]',
      accentColor: '#FF6A00',
      activeBorder: 'border-[#FF6A00] bg-orange-950/40 text-orange-300 shadow-[0_0_12px_rgba(255,106,0,0.3)]',
      badge: 'GET ACCESS',
      isAuthTrigger: true
    }
  }
};

const PRELOAD_MAP: Record<string, () => Promise<any>> = {
  '/wall': () => import('../components/RoleViews/Universal/LockerRoomView'),
  '/locker-room': () => import('../components/RoleViews/Universal/LockerRoomView'),
  '/gallery': () => import('../components/RoleViews/Universal/MediaGalleryView'),
  '/playbook': () => import('../components/Playbook/PlaybookLabPage'),
  '/members': () => import('../components/Community/MemberDirectoryView'),
  '/dashboard/athlete/film': () => import('../components/RoleViews/AthleteView/AthleteFilmTab'),
  '/profile': () => import('../components/Profile/SportsProfilePage'),
  '/dashboard/creator': () => import('../components/Dashboard/CreatorStudioDashboardView'),
  '/creator/payouts': () => import('../components/Dashboard/CreatorStudioDashboardView'),
  '/athletes': () => import('../components/RoleViews/ScoutView/ScoutDiscoverTab'),
  '/dashboard/scout/watchlist': () => import('../components/RoleViews/ScoutView/ScoutWatchlistTab'),
  '/tournaments': () => import('../components/Tournaments/TournamentCenterView'),
  '/events': () => import('../components/RoleViews/Universal/EventsHubView'),
  '/dashboard/admin': () => import('../components/RoleViews/AdminView/AdminMasterCommandTab'),
  '/dashboard/admin/users': () => import('../components/RoleViews/AdminView/AdminUserHubTab')
};

export const usePrimaryNavigation = () => {
  const { user, userDoc, role } = useAuthRole();
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve dynamic role mapping
  const roleMapping = useMemo(() => {
    if (!user) {
      return ROLE_DYNAMIC_TABS.guest;
    }
    const userRoleKey = (userDoc?.role || role || 'athlete').toLowerCase();
    if (ROLE_DYNAMIC_TABS[userRoleKey]) {
      return ROLE_DYNAMIC_TABS[userRoleKey];
    }
    const normalized = normalizeRole(userRoleKey);
    return ROLE_DYNAMIC_TABS[normalized] || ROLE_DYNAMIC_TABS.athlete;
  }, [user, userDoc?.role, role]);

  // Tab 1: The Wall
  const tab1Wall: PrimaryTab = useMemo(() => ({
    id: 'wall',
    label: 'The Wall',
    path: '/wall',
    icon: Flame,
    iconClass: 'w-4 h-4 text-[#FF6A00] drop-shadow-[0_0_6px_rgba(255,106,0,0.6)]',
    accentColor: '#FF6A00',
    activeBorder: 'border-[#FF6A00] bg-orange-950/40 text-orange-400 shadow-[0_0_12px_rgba(255,106,0,0.3)]',
    badge: 'LIVE'
  }), []);

  // Tab 2: Gallery
  const tab2Gallery: PrimaryTab = useMemo(() => ({
    id: 'gallery',
    label: 'Gallery',
    path: '/gallery',
    icon: Film,
    iconClass: 'w-4 h-4 text-[#00E5FF] drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]',
    accentColor: '#00E5FF',
    activeBorder: 'border-[#00E5FF] bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
  }), []);

  // Strictly 4 Primary Navigation Tabs: [0: The Wall, 1: Gallery, 2: Dynamic Tab A, 3: Dynamic Tab B]
  const primaryTabs: PrimaryTab[] = useMemo(() => [
    tab1Wall,
    tab2Gallery,
    roleMapping.tab3,
    roleMapping.tab4
  ], [tab1Wall, tab2Gallery, roleMapping]);

  const isTabActive = (tab: PrimaryTab): boolean => {
    const currentPath = location.pathname;
    
    if (tab.id === 'wall') {
      return (
        currentPath === '/wall' ||
        currentPath === '/locker-room' ||
        currentPath === '/feed' ||
        currentPath === '/social' ||
        currentPath === '/social-wall' ||
        currentPath.startsWith('/play/') ||
        currentPath.startsWith('/highlight/')
      );
    }
    
    if (tab.id === 'gallery') {
      return (
        currentPath === '/gallery' ||
        currentPath === '/media-gallery' ||
        currentPath === '/media' ||
        currentPath === '/studio'
      );
    }

    if (tab.path === '#join') {
      return false;
    }

    if (tab.path === '/profile') {
      return currentPath === '/profile' || currentPath.startsWith('/profile/');
    }

    if (tab.path === '/members') {
      return currentPath === '/members' || currentPath === '/directory' || currentPath === '/roster';
    }

    if (tab.path === '/playbook') {
      return currentPath.startsWith('/playbook') || currentPath.startsWith('/matrix');
    }

    if (tab.path === '/tournaments') {
      return currentPath.startsWith('/tournaments') || currentPath.startsWith('/tournament');
    }

    if (tab.path === '/events') {
      return currentPath.startsWith('/events') || currentPath.startsWith('/showcase') || currentPath.startsWith('/camps');
    }

    if (tab.path === '/athletes') {
      return currentPath.startsWith('/athletes') || currentPath.startsWith('/athlete');
    }

    return currentPath === tab.path || currentPath.startsWith(tab.path + '/');
  };

  const activeTabIndex = useMemo(() => {
    const idx = primaryTabs.findIndex((tab) => isTabActive(tab));
    return idx !== -1 ? idx : 0;
  }, [primaryTabs, location.pathname]);

  const preloadTab = (tabIndex: number) => {
    const tab = primaryTabs[tabIndex];
    if (tab && tab.path && tab.path !== '#join') {
      const loader = PRELOAD_MAP[tab.path];
      if (loader) preloadModule(loader);
    }
  };

  const goToTab = (index: number) => {
    const targetIdx = Math.max(0, Math.min(index, primaryTabs.length - 1));
    const targetTab = primaryTabs[targetIdx];
    if (targetTab) {
      triggerHaptic('light');
      if (targetTab.isAuthTrigger || targetTab.path === '#join') {
        window.dispatchEvent(new CustomEvent('app:open-auth-modal', { detail: { mode: 'signup' } }));
        return;
      }
      if (targetTab.path !== location.pathname) {
        navigate(targetTab.path);
      }
    }
  };

  const goToNextTab = () => {
    if (activeTabIndex < primaryTabs.length - 1) {
      goToTab(activeTabIndex + 1);
    }
  };

  const goToPrevTab = () => {
    if (activeTabIndex > 0) {
      goToTab(activeTabIndex - 1);
    }
  };

  return {
    primaryTabs,
    activeTabIndex,
    isTabActive,
    goToTab,
    goToNextTab,
    goToPrevTab,
    preloadTab
  };
};
