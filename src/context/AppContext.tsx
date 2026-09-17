import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useAuthRole, normalizeRole } from '../hooks/useAuthRole';
import { UserProfile } from '../types';
import { UserRole } from '../types/platform';
import { collection, query, where, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActivityItem, subscribeToActivityStream, ActivityType } from '../services/activityStreamService';
import { useAppStore, ModalType, GlobalSearchResult } from '../store/useAppStore';

export type { ModalType, GlobalSearchResult };

export interface AppContextType {
  // 1. Auth & Canonical Role State
  user: any | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isScout: boolean;
  isCoach: boolean;
  isAthlete: boolean;
  isDirector: boolean;
  isViewer: boolean;
  profileCompleted: boolean;

  // 2. Active Team & Roster Context
  activeTeamId: string | null;
  activeTeam: any | null;
  setActiveTeamId: (teamId: string | null) => void;
  userTeams: any[];
  refreshTeams: () => Promise<void>;

  // 3. Global Search & Command Center
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: GlobalSearchResult[];
  isSearching: boolean;
  executeGlobalSearch: (q: string) => Promise<void>;

  // 4. Standardized Modal Hub
  activeModal: ModalType;
  modalProps: Record<string, any>;
  openModal: (type: ModalType, props?: Record<string, any>) => void;
  closeModal: () => void;

  // 5. Live Notification Center
  unreadNotificationCount: number;
  isNotificationDrawerOpen: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  toggleNotifications: () => void;

  // 6. Cross-Module Activity Stream
  recentActivities: ActivityItem[];
  logSystemActivity: (payload: {
    type: ActivityType;
    title: string;
    description: string;
    sport?: string;
    targetId?: string;
    targetUrl: string;
    thumbnailUrl?: string;
    embedUrl?: string;
    mediaType?: 'video' | 'image' | 'play' | 'stat';
  }) => Promise<string>;

  // 7. Instant Sync Signal
  syncSignal: number;
  broadcastSync: (channel?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { role } = useAuthRole();
  const canonicalRole = normalizeRole(role);

  // Zustand Store selectors & actions
  const activeTeamId = useAppStore(state => state.activeTeamId);
  const activeTeam = useAppStore(state => state.activeTeam);
  const userTeams = useAppStore(state => state.userTeams);
  const isSearchOpen = useAppStore(state => state.isSearchOpen);
  const searchQuery = useAppStore(state => state.searchQuery);
  const searchResults = useAppStore(state => state.searchResults);
  const isSearching = useAppStore(state => state.isSearching);
  const activeModal = useAppStore(state => state.activeModal);
  const modalProps = useAppStore(state => state.modalProps);
  const unreadNotificationCount = useAppStore(state => state.unreadNotificationCount);
  const isNotificationDrawerOpen = useAppStore(state => state.isNotificationDrawerOpen);
  const recentActivities = useAppStore(state => state.recentActivities);
  const syncSignal = useAppStore(state => state.syncSignal);

  const setActiveTeamId = useAppStore(state => state.setActiveTeamId);
  const openSearch = useAppStore(state => state.openSearch);
  const closeSearch = useAppStore(state => state.closeSearch);
  const toggleSearch = useAppStore(state => state.toggleSearch);
  const setSearchQuery = useAppStore(state => state.setSearchQuery);
  const openModal = useAppStore(state => state.openModal);
  const closeModal = useAppStore(state => state.closeModal);
  const openNotifications = useAppStore(state => state.openNotifications);
  const closeNotifications = useAppStore(state => state.closeNotifications);
  const toggleNotifications = useAppStore(state => state.toggleNotifications);
  const broadcastSync = useAppStore(state => state.broadcastSync);
  const logCrossModuleActivity = useAppStore(state => state.logCrossModuleActivity);
  const executeGlobalSearch = useAppStore(state => state.executeGlobalSearch);

  // Derived role flags
  const isAdmin = canonicalRole === 'admin';
  const isScout = canonicalRole === 'scout';
  const isCoach = canonicalRole === 'scout' || canonicalRole === 'director';
  const isAthlete = canonicalRole === 'athlete';
  const isDirector = canonicalRole === 'director';
  const isViewer = canonicalRole === 'viewer';
  const profileCompleted = Boolean(profile && profile.hasCompletedOnboarding !== false && (profile.displayName || profile.email));

  // Sync user & profile into Zustand store when context updates
  useEffect(() => {
    useAppStore.getState().setUser(user);
    if (profile) {
      useAppStore.getState().setProfile(profile);
    }
  }, [user, profile]);

  // Keyboard shortcut listener for Global Search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSearch]);

  // Listen for Unread Notifications
  useEffect(() => {
    if (!user?.uid) {
      useAppStore.getState().setUnreadNotificationCount(0);
      return;
    }

    const notifQuery = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', user.uid),
      where('read', '==', false),
      limit(20)
    );

    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      useAppStore.getState().setUnreadNotificationCount(snapshot.docs.length);
    }, () => {
      // Fallback
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Subscribe to real-time Cross-Module Activity Stream
  useEffect(() => {
    const unsubscribe = subscribeToActivityStream(
      { limitCount: 20 },
      (items) => useAppStore.getState().setRecentActivities(items),
      () => {}
    );
    return () => unsubscribe();
  }, []);

  // Refresh user teams
  const refreshTeams = useCallback(async () => {
    if (!user?.uid) {
      useAppStore.getState().setUserTeams([]);
      return;
    }
    await useAppStore.getState().fetchUserTeams(user.uid, canonicalRole);
  }, [user?.uid, canonicalRole]);

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  const logSystemActivity = useCallback(async (payload: {
    type: ActivityType;
    title: string;
    description: string;
    sport?: string;
    targetId?: string;
    targetUrl: string;
    thumbnailUrl?: string;
    embedUrl?: string;
    mediaType?: 'video' | 'image' | 'play' | 'stat';
  }) => {
    return await logCrossModuleActivity(payload);
  }, [logCrossModuleActivity]);

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        role: canonicalRole,
        isAdmin,
        isScout,
        isCoach,
        isAthlete,
        isDirector,
        isViewer,
        profileCompleted,
        activeTeamId,
        activeTeam,
        setActiveTeamId,
        userTeams,
        refreshTeams,
        isSearchOpen,
        openSearch,
        closeSearch,
        toggleSearch,
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        executeGlobalSearch,
        activeModal,
        modalProps,
        openModal,
        closeModal,
        unreadNotificationCount,
        isNotificationDrawerOpen,
        openNotifications,
        closeNotifications,
        toggleNotifications,
        recentActivities,
        logSystemActivity,
        syncSignal,
        broadcastSync
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
