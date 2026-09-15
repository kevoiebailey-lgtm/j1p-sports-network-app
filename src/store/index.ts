import { useAppStore } from './useAppStore';

export * from './useAppStore';

/**
 * Specialized selector hook for Auth & Session management
 */
export const useAuthStore = () => {
  return useAppStore(state => ({
    user: state.user,
    profile: state.profile,
    role: state.role,
    canonicalRole: state.canonicalRole,
    isAuthenticated: state.isAuthenticated,
    authLoading: state.authLoading,
    profileLoading: state.profileLoading,
    isAdmin: state.isAdmin(),
    isScout: state.isScout(),
    isCoach: state.isCoach(),
    isAthlete: state.isAthlete(),
    isDirector: state.isDirector(),
    isViewer: state.isViewer(),
    isSuperAdmin: state.isSuperAdmin(),
    hasCompletedOnboarding: state.hasCompletedOnboarding(),
    setUser: state.setUser,
    setProfile: state.setProfile,
    setRole: state.setRole,
    switchRole: state.switchRole,
    clearAuth: state.clearAuth
  }));
};

/**
 * Specialized selector hook for User Profile & Bookmarks
 */
export const useProfileStore = () => {
  return useAppStore(state => ({
    profile: state.profile,
    profileLoading: state.profileLoading,
    bookmarks: state.bookmarks,
    profileCache: state.profileCache,
    updateProfileState: state.updateProfileState,
    syncProfileWithFirestore: state.syncProfileWithFirestore,
    setBookmarks: state.setBookmarks,
    toggleBookmark: state.toggleBookmark,
    cacheProfile: state.cacheProfile,
    fetchProfileById: state.fetchProfileById
  }));
};

/**
 * Specialized selector hook for Shared Team, Roster & Event data
 */
export const useTeamStore = () => {
  return useAppStore(state => ({
    activeTeamId: state.activeTeamId,
    activeTeam: state.activeTeam,
    userTeams: state.userTeams,
    teamRoster: state.teamRoster,
    teamRosterPlayers: state.teamRosterPlayers,
    teamsLoading: state.teamsLoading,
    rosterLoading: state.rosterLoading,
    setActiveTeamId: state.setActiveTeamId,
    setActiveTeam: state.setActiveTeam,
    setUserTeams: state.setUserTeams,
    setTeamRoster: state.setTeamRoster,
    setTeamRosterPlayers: state.setTeamRosterPlayers,
    addTeam: state.addTeam,
    updateTeamInStore: state.updateTeamInStore,
    removeTeamFromStore: state.removeTeamFromStore,
    fetchUserTeams: state.fetchUserTeams,
    fetchTeamRoster: state.fetchTeamRoster,
    addAthleteToTeam: state.addAthleteToTeam,
    removeAthleteFromTeam: state.removeAthleteFromTeam
  }));
};

/**
 * Specialized selector hook for Global Search & Command Palette
 */
export const useSearchStore = () => {
  return useAppStore(state => ({
    isSearchOpen: state.isSearchOpen,
    searchQuery: state.searchQuery,
    searchResults: state.searchResults,
    isSearching: state.isSearching,
    openSearch: state.openSearch,
    closeSearch: state.closeSearch,
    toggleSearch: state.toggleSearch,
    setSearchQuery: state.setSearchQuery,
    setSearchResults: state.setSearchResults,
    executeGlobalSearch: state.executeGlobalSearch
  }));
};

/**
 * Specialized selector hook for Standardized Modals
 */
export const useModalStore = () => {
  return useAppStore(state => ({
    activeModal: state.activeModal,
    modalProps: state.modalProps,
    activeVideo: state.activeVideo,
    videoQueue: state.videoQueue,
    activeVideoIndex: state.activeVideoIndex,
    theaterMode: state.theaterMode,
    openModal: state.openModal,
    closeModal: state.closeModal,
    openVideoModal: state.openVideoModal,
    closeVideoModal: state.closeVideoModal,
    nextVideo: state.nextVideo,
    prevVideo: state.prevVideo,
    selectVideoFromQueue: state.selectVideoFromQueue,
    setTheaterMode: state.setTheaterMode,
    toggleTheaterMode: state.toggleTheaterMode
  }));
};

/**
 * Specialized selector hook for Full-Screen Video Player Modal & Queue
 */
export const useVideoModalStore = () => {
  return useAppStore(state => ({
    isOpen: state.activeModal === 'video',
    activeVideo: state.activeVideo,
    videoQueue: state.videoQueue,
    activeVideoIndex: state.activeVideoIndex,
    theaterMode: state.theaterMode,
    modalProps: state.modalProps,
    openVideoModal: state.openVideoModal,
    closeVideoModal: state.closeVideoModal,
    nextVideo: state.nextVideo,
    prevVideo: state.prevVideo,
    selectVideoFromQueue: state.selectVideoFromQueue,
    setTheaterMode: state.setTheaterMode,
    toggleTheaterMode: state.toggleTheaterMode
  }));
};

/**
 * Specialized selector hook for Activity Stream & Notifications
 */
export const useActivityStore = () => {
  return useAppStore(state => ({
    unreadNotificationCount: state.unreadNotificationCount,
    isNotificationDrawerOpen: state.isNotificationDrawerOpen,
    recentActivities: state.recentActivities,
    setUnreadNotificationCount: state.setUnreadNotificationCount,
    incrementNotificationCount: state.incrementNotificationCount,
    resetNotificationCount: state.resetNotificationCount,
    openNotifications: state.openNotifications,
    closeNotifications: state.closeNotifications,
    toggleNotifications: state.toggleNotifications,
    setRecentActivities: state.setRecentActivities,
    addRecentActivity: state.addRecentActivity,
    logCrossModuleActivity: state.logCrossModuleActivity
  }));
};

/**
 * Specialized selector hook for Active App Theme & Visual Preferences
 */
export const useThemeStore = () => {
  return useAppStore(state => ({
    theme: state.theme,
    themeMode: state.themeMode,
    systemTheme: state.systemTheme,
    isSystemTheme: state.isSystemTheme,
    logoStyle: state.logoStyle,
    customLogoUrl: state.customLogoUrl,
    accentColor: state.accentColor,
    sportFilter: state.sportFilter,
    hapticsEnabled: state.hapticsEnabled,
    highContrast: state.highContrast,
    setTheme: state.setTheme,
    setThemeMode: state.setThemeMode,
    toggleTheme: state.toggleTheme,
    resetThemeToSystem: state.resetThemeToSystem,
    setSystemTheme: state.setSystemTheme,
    setLogoStyle: state.setLogoStyle,
    setCustomLogoUrl: state.setCustomLogoUrl,
    cycleLogoStyle: state.cycleLogoStyle,
    setAccentColor: state.setAccentColor,
    setSportFilter: state.setSportFilter,
    toggleHaptics: state.toggleHaptics,
    toggleHighContrast: state.toggleHighContrast,
    applyThemeToDom: state.applyThemeToDom
  }));
};

/**
 * Specialized selector hook for Instant Cross-Module Sync
 */
export const useSyncStore = () => {
  return useAppStore(state => ({
    syncSignal: state.syncSignal,
    lastSyncTimestamp: state.lastSyncTimestamp,
    lastSyncChannel: state.lastSyncChannel,
    broadcastSync: state.broadcastSync
  }));
};
