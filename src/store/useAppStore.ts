import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from 'firebase/auth';
import { 
  UserProfile, 
  UserRole as LegacyUserRole, 
  TeamItem, 
  RosterPlayer, 
  EventItem 
} from '../types';
import { UserRole as PlatformUserRole } from '../types/platform';
import { normalizeRole } from '../hooks/useAuthRole';
import { ActivityItem, ActivityType, logActivity } from '../services/activityStreamService';
import { db, auth, sanitizeFirestorePayload } from '../lib/firebase';
import { indexedDbSyncBridge, STORE_NAMES } from '../lib/indexedDbSyncBridge';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  limit
} from 'firebase/firestore';

export type UserRole = LegacyUserRole | PlatformUserRole;

export interface GlobalSearchResult {
  id: string;
  type: 'athlete' | 'video' | 'play' | 'tournament' | 'team';
  title: string;
  subtitle: string;
  url: string;
  badge?: string;
  badgeColor?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

export type ModalType = 
  | 'video' 
  | 'share' 
  | 'roleSwitch' 
  | 'highlightEditor' 
  | 'playbookPreview' 
  | 'commandPalette'
  | 'rosterEntry'
  | 'gameDayPrint'
  | null;

// ==========================================
// STORE INTERFACE DEFINITIONS
// ==========================================

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  canonicalRole: 'member' | 'athlete' | 'coach' | 'scout' | 'director' | 'creator' | 'fan' | 'viewer' | 'admin';
  isAuthenticated: boolean;
  authLoading: boolean;
  profileLoading: boolean;
  bookmarks: string[];
  profileCache: Record<string, UserProfile>;
  
  // Computed permission checks
  isAdmin: () => boolean;
  isScout: () => boolean;
  isCoach: () => boolean;
  isAthlete: () => boolean;
  isDirector: () => boolean;
  isViewer: () => boolean;
  isSuperAdmin: () => boolean;
  hasCompletedOnboarding: () => boolean;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  updateProfileState: (updatedFields: Partial<UserProfile>) => void;
  syncProfileWithFirestore: (updatedFields: Partial<UserProfile>) => Promise<boolean>;
  setRole: (role: UserRole) => void;
  switchRole: (newRole: UserRole) => Promise<void>;
  setBookmarks: (bookmarks: string[]) => void;
  toggleBookmark: (athleteUid: string) => Promise<void>;
  cacheProfile: (profile: UserProfile) => void;
  fetchProfileById: (uid: string) => Promise<UserProfile | null>;
  clearAuth: () => void;
}

export interface TeamState {
  activeTeamId: string | null;
  activeTeam: TeamItem | null;
  userTeams: TeamItem[];
  teamRoster: UserProfile[];
  teamRosterPlayers: RosterPlayer[];
  teamsLoading: boolean;
  rosterLoading: boolean;

  // Actions
  setActiveTeamId: (teamId: string | null) => void;
  setActiveTeam: (team: TeamItem | null) => void;
  setUserTeams: (teams: TeamItem[]) => void;
  setTeamRoster: (roster: UserProfile[]) => void;
  setTeamRosterPlayers: (players: RosterPlayer[]) => void;
  addTeam: (team: TeamItem) => void;
  updateTeamInStore: (teamId: string, partial: Partial<TeamItem>) => void;
  removeTeamFromStore: (teamId: string) => void;
  fetchUserTeams: (userId?: string, role?: string) => Promise<TeamItem[]>;
  fetchTeamRoster: (teamId: string, athleteUids?: string[]) => Promise<UserProfile[]>;
  addAthleteToTeam: (teamId: string, athleteUid: string, playerDetails?: Partial<RosterPlayer>) => Promise<boolean>;
  removeAthleteFromTeam: (teamId: string, athleteUid: string) => Promise<boolean>;
}

export interface SearchState {
  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: GlobalSearchResult[];
  isSearching: boolean;

  // Actions
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: GlobalSearchResult[]) => void;
  executeGlobalSearch: (q: string) => Promise<void>;
}

export interface VideoModalPayload {
  id?: string;
  videoUrl: string;
  title: string;
  athleteName?: string;
  userName?: string;
  userId?: string;
  userAvatar?: string;
  sport?: string;
  position?: string;
  gradYear?: string;
  highSchool?: string;
  state?: string;
  profileUrl?: string;
  viewsCount?: number;
  likesCount?: number;
  embedUrl?: string;
  platform?: string;
  thumbnailUrl?: string;
  stats?: Record<string, any>;
  [key: string]: any;
}

export interface ModalState {
  activeModal: ModalType;
  modalProps: Record<string, any>;
  activeVideo: VideoModalPayload | null;
  videoQueue: VideoModalPayload[];
  activeVideoIndex: number;
  theaterMode: boolean;

  // Actions
  openModal: (type: ModalType, props?: Record<string, any>) => void;
  closeModal: () => void;
  openVideoModal: (video: VideoModalPayload, queue?: VideoModalPayload[]) => void;
  closeVideoModal: () => void;
  nextVideo: () => void;
  prevVideo: () => void;
  selectVideoFromQueue: (index: number) => void;
  setTheaterMode: (enabled: boolean) => void;
  toggleTheaterMode: () => void;
}

export interface ActivityAndNotificationState {
  unreadNotificationCount: number;
  isNotificationDrawerOpen: boolean;
  recentActivities: ActivityItem[];

  // Actions
  setUnreadNotificationCount: (count: number) => void;
  incrementNotificationCount: () => void;
  resetNotificationCount: () => void;
  openNotifications: () => void;
  closeNotifications: () => void;
  toggleNotifications: () => void;
  setRecentActivities: (activities: ActivityItem[]) => void;
  addRecentActivity: (activity: ActivityItem) => void;
  logCrossModuleActivity: (payload: {
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
}

export type AppTheme = 'dark' | 'light';
export type AppThemeMode = 'system' | 'dark' | 'light';
export type AppLogoStyle = 'crest' | 'cyber' | 'minimal' | 'custom';
export type AccentColor = 'orange' | 'cyan' | 'gold' | 'emerald' | 'purple';

export interface ThemePreferenceState {
  theme: AppTheme;
  themeMode: AppThemeMode;
  systemTheme: AppTheme;
  isSystemTheme: boolean;
  logoStyle: AppLogoStyle;
  customLogoUrl: string | null;
  accentColor: AccentColor;
  sportFilter: string;
  hapticsEnabled: boolean;
  highContrast: boolean;

  // Actions
  setTheme: (theme: AppTheme) => void;
  setThemeMode: (mode: AppThemeMode) => void;
  toggleTheme: () => void;
  resetThemeToSystem: () => void;
  setSystemTheme: (theme: AppTheme) => void;
  setLogoStyle: (style: AppLogoStyle) => void;
  setCustomLogoUrl: (url: string | null) => void;
  cycleLogoStyle: () => void;
  setAccentColor: (accent: AccentColor) => void;
  setSportFilter: (sport: string) => void;
  toggleHaptics: () => void;
  toggleHighContrast: () => void;
  applyThemeToDom: () => void;
}

export interface SyncState {
  syncSignal: number;
  lastSyncTimestamp: number;
  lastSyncChannel: string | null;

  // Actions
  broadcastSync: (channel?: string) => void;
}

export type AppStore = AuthState & TeamState & SearchState & ModalState & ActivityAndNotificationState & ThemePreferenceState & SyncState;

// ==========================================
// ZUSTAND STORE CREATION
// ==========================================

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ----------------------------------------------------
      // 1. AUTH & PROFILE STATE
      // ----------------------------------------------------
      user: null,
      profile: null,
      role: 'athlete',
      canonicalRole: 'athlete',
      isAuthenticated: false,
      authLoading: true,
      profileLoading: false,
      bookmarks: [],
      profileCache: {},

      isAdmin: () => get().canonicalRole === 'admin' || get().user?.email === 'kevoiebailey@gmail.com',
      isScout: () => get().canonicalRole === 'scout',
      isCoach: () => get().canonicalRole === 'scout' || get().canonicalRole === 'director' || get().role === 'coach',
      isAthlete: () => get().canonicalRole === 'athlete',
      isDirector: () => get().canonicalRole === 'director',
      isViewer: () => get().canonicalRole === 'viewer',
      isSuperAdmin: () => get().user?.email === 'kevoiebailey@gmail.com',
      hasCompletedOnboarding: () => {
        const p = get().profile;
        if (!p) return false;
        return p.hasCompletedOnboarding !== false && Boolean(p.displayName || p.email);
      },

      setUser: (user) => {
        const canonical = normalizeRole(get().role);
        set({ 
          user, 
          isAuthenticated: Boolean(user),
          authLoading: false,
          canonicalRole: canonical
        });
      },

      setProfile: (profile) => {
        if (!profile) {
          set({ profile: null, profileLoading: false });
          return;
        }
        const updatedCache = { ...get().profileCache, [profile.uid]: profile };
        set({ profile, profileCache: updatedCache, profileLoading: false });
      },

      updateProfileState: (updatedFields) => {
        const current = get().profile;
        if (!current) return;
        const merged: UserProfile = {
          ...current,
          ...updatedFields,
          updatedAt: new Date().toISOString()
        };
        const updatedCache = { ...get().profileCache, [merged.uid]: merged };
        set({ profile: merged, profileCache: updatedCache });
        get().broadcastSync('profile');
      },

      syncProfileWithFirestore: async (updatedFields) => {
        const current = get().profile;
        const user = get().user;
        const uid = current?.uid || user?.uid;
        if (!uid) return false;

        const merged: UserProfile = {
          ...(current || {} as UserProfile),
          ...updatedFields,
          uid,
          updatedAt: new Date().toISOString()
        };

        // 1. Immediately update store and IndexedDB bridge for zero-lag local consistency
        get().updateProfileState(updatedFields);
        await indexedDbSyncBridge.putLocal(STORE_NAMES.PROFILES, uid, merged, 'users', true);

        try {
          const userRef = doc(db, 'users', uid);
          const sanitized = sanitizeFirestorePayload({
            ...updatedFields,
            updatedAt: new Date().toISOString()
          });

          await setDoc(userRef, sanitized, { merge: true });
          return true;
        } catch (error) {
          console.warn('[useAppStore] Firestore direct write deferred, held in local IndexedDB sync queue:', error);
          return false;
        }
      },

      setRole: (rawRole) => {
        const canonical = normalizeRole(rawRole);
        set({ role: rawRole, canonicalRole: canonical });
        try {
          localStorage.setItem('just1play_active_role', canonical);
          localStorage.setItem('just1play_user_role', rawRole);
        } catch (e) {
          console.warn('Failed to persist active role to storage:', e);
        }
      },

      switchRole: async (newRole) => {
        const canonical = normalizeRole(newRole);
        set({ role: newRole, canonicalRole: canonical });
        
        try {
          localStorage.setItem('just1play_active_role', canonical);
          localStorage.setItem('just1play_user_role', newRole);
          
          const uid = get().user?.uid || get().profile?.uid;
          if (uid) {
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, { role: newRole, activePerspective: canonical }, { merge: true });
          }
        } catch (e) {
          console.warn('Error in switchRole Firestore update:', e);
        }

        get().broadcastSync('role');
      },

      setBookmarks: (bookmarks) => {
        set({ bookmarks });
        try {
          localStorage.setItem('just1play_bookmarks', JSON.stringify(bookmarks));
        } catch (e) {
          console.warn('Failed to persist bookmarks:', e);
        }
      },

      toggleBookmark: async (athleteUid) => {
        const currentBookmarks = [...get().bookmarks];
        const index = currentBookmarks.indexOf(athleteUid);
        let updated: string[];
        
        if (index > -1) {
          updated = currentBookmarks.filter(id => id !== athleteUid);
        } else {
          updated = [...currentBookmarks, athleteUid];
        }

        get().setBookmarks(updated);

        // Sync with Firestore if logged in
        const user = get().user;
        if (user) {
          try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { bookmarkedAthleteIds: updated }, { merge: true });
          } catch (e) {
            console.warn('Failed to sync bookmarks to Firestore:', e);
          }
        }

        get().broadcastSync('bookmarks');
      },

      cacheProfile: (profile) => {
        if (!profile?.uid) return;
        set(state => ({
          profileCache: {
            ...state.profileCache,
            [profile.uid]: profile
          }
        }));
      },

      fetchProfileById: async (uid) => {
        if (!uid) return null;
        
        // Return from cache if recent
        const cached = get().profileCache[uid];
        if (cached) return cached;

        // Check local IndexedDB storage
        try {
          const idbProfile = await indexedDbSyncBridge.getLocal(STORE_NAMES.PROFILES, uid);
          if (idbProfile) {
            get().cacheProfile(idbProfile);
            return idbProfile;
          }
        } catch (idbErr) {
          // Non-blocking
        }

        try {
          const userRef = doc(db, 'users', uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            get().cacheProfile(data);
            indexedDbSyncBridge.putLocal(STORE_NAMES.PROFILES, uid, data, 'users', false).catch(() => {});
            return data;
          }
        } catch (err) {
          console.warn(`Failed to fetch profile ${uid}:`, err);
        }
        return null;
      },

      clearAuth: () => {
        set({
          user: null,
          profile: null,
          role: 'athlete',
          canonicalRole: 'athlete',
          isAuthenticated: false,
          authLoading: false,
          profileLoading: false,
          activeTeamId: null,
          activeTeam: null,
          userTeams: [],
          teamRoster: [],
          teamRosterPlayers: []
        });
        try {
          localStorage.removeItem('just1play_user_profile');
          localStorage.removeItem('just1play_active_role');
          localStorage.removeItem('just1play_user_role');
        } catch (e) {
          console.warn('Failed to clear auth storage:', e);
        }
        get().broadcastSync('auth');
      },

      // ----------------------------------------------------
      // 2. SHARED TEAM & ROSTER STATE
      // ----------------------------------------------------
      activeTeamId: null,
      activeTeam: null,
      userTeams: [],
      teamRoster: [],
      teamRosterPlayers: [],
      teamsLoading: false,
      rosterLoading: false,

      setActiveTeamId: (teamId) => {
        const found = get().userTeams.find(t => t.id === teamId) || null;
        set({ activeTeamId: teamId, activeTeam: found });
        if (teamId) {
          get().fetchTeamRoster(teamId);
        }
      },

      setActiveTeam: (team) => {
        set({ 
          activeTeam: team, 
          activeTeamId: team?.id || null 
        });
        if (team?.id) {
          get().fetchTeamRoster(team.id, team.roster);
        }
      },

      setUserTeams: (teams) => {
        set({ userTeams: teams });
        const currentActiveId = get().activeTeamId;
        if (currentActiveId) {
          const matching = teams.find(t => t.id === currentActiveId);
          if (matching) {
            set({ activeTeam: matching });
          }
        } else if (teams.length > 0 && !get().activeTeam) {
          set({ activeTeam: teams[0], activeTeamId: teams[0].id });
        }
      },

      setTeamRoster: (roster) => {
        set({ teamRoster: roster });
      },

      setTeamRosterPlayers: (players) => {
        set({ teamRosterPlayers: players });
      },

      addTeam: (team) => {
        const existing = get().userTeams;
        const exists = existing.some(t => t.id === team.id);
        const updated = exists 
          ? existing.map(t => t.id === team.id ? team : t)
          : [team, ...existing];
        
        set({ 
          userTeams: updated,
          activeTeam: team,
          activeTeamId: team.id
        });

        // Sync to localStorage
        try {
          localStorage.setItem(`just1play_teams_${team.eventId || 'global'}`, JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to cache teams locally:', e);
        }

        get().broadcastSync('teams');
      },

      updateTeamInStore: (teamId, partial) => {
        const currentTeams = get().userTeams;
        const updated = currentTeams.map(team => {
          if (team.id === teamId) {
            return { ...team, ...partial, updatedAt: new Date().toISOString() };
          }
          return team;
        });

        const currentActive = get().activeTeam;
        const updatedActive = currentActive?.id === teamId
          ? { ...currentActive, ...partial, updatedAt: new Date().toISOString() }
          : currentActive;

        set({ userTeams: updated, activeTeam: updatedActive });
        get().broadcastSync('teams');
      },

      removeTeamFromStore: (teamId) => {
        const filtered = get().userTeams.filter(t => t.id !== teamId);
        const nextActive = get().activeTeamId === teamId ? (filtered[0] || null) : get().activeTeam;
        set({ 
          userTeams: filtered, 
          activeTeam: nextActive, 
          activeTeamId: nextActive?.id || null 
        });
        get().broadcastSync('teams');
      },

      fetchUserTeams: async (userId, role) => {
        const uid = userId || get().user?.uid;
        if (!uid) return [];

        set({ teamsLoading: true });
        const teamsList: TeamItem[] = [];

        try {
          // Query Firestore teams where coachId == uid or roster array contains uid
          const teamsRef = collection(db, 'teams');
          
          let coachQuery = query(teamsRef, where('coachId', '==', uid));
          const coachSnap = await getDocs(coachQuery);
          coachSnap.forEach(docSnap => {
            teamsList.push({ id: docSnap.id, ...docSnap.data() } as TeamItem);
          });

          // Also check athlete roster inclusion if role is athlete
          if (role === 'athlete' || get().isAthlete()) {
            const rosterQuery = query(teamsRef, where('roster', 'array-contains', uid));
            const rosterSnap = await getDocs(rosterQuery);
            rosterSnap.forEach(docSnap => {
              if (!teamsList.some(t => t.id === docSnap.id)) {
                teamsList.push({ id: docSnap.id, ...docSnap.data() } as TeamItem);
              }
            });
          }

          // Fallback from localStorage if empty
          if (teamsList.length === 0) {
            const saved = localStorage.getItem('just1play_user_teams');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) {
                teamsList.push(...parsed);
              }
            }
          }

          get().setUserTeams(teamsList);
          set({ teamsLoading: false });
          return teamsList;
        } catch (err: any) {
          if (err?.code !== 'permission-denied') {
            console.warn('Teams Firestore query notice, falling back to local cache:', err?.message || err);
          }
          const saved = localStorage.getItem('just1play_user_teams');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              get().setUserTeams(parsed);
            } catch (e) {
              // Ignore local parse errors
            }
          }
          set({ teamsLoading: false });
          return teamsList;
        }
      },

      fetchTeamRoster: async (teamId, athleteUids) => {
        if (!teamId) return [];
        set({ rosterLoading: true });

        try {
          let uidsToFetch = athleteUids;

          // If uids not provided, find team from state or fetch
          if (!uidsToFetch) {
            const team = get().userTeams.find(t => t.id === teamId) || get().activeTeam;
            if (team && team.roster) {
              uidsToFetch = team.roster;
            } else {
              const teamDoc = await getDoc(doc(db, 'teams', teamId));
              if (teamDoc.exists()) {
                const data = teamDoc.data() as TeamItem;
                uidsToFetch = data.roster || [];
              }
            }
          }

          if (!uidsToFetch || uidsToFetch.length === 0) {
            set({ teamRoster: [], rosterLoading: false });
            return [];
          }

          const rosterProfiles: UserProfile[] = [];
          
          // Fetch each athlete profile using cache first
          for (const athleteId of uidsToFetch) {
            const prof = await get().fetchProfileById(athleteId);
            if (prof) {
              rosterProfiles.push(prof);
            } else {
              // Minimal stub profile
              rosterProfiles.push({
                uid: athleteId,
                displayName: `Athlete #${athleteId.slice(0, 4)}`,
                email: '',
                role: 'athlete',
                sport: 'Basketball',
                gradYear: '2027',
                highSchool: 'Varsity Squad',
                state: 'TX',
                position: 'Guard',
                height: '6-1',
                weight: '175',
                gpa: '3.5',
                bio: 'Just1Play Roster Athlete',
                social: {},
                stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
                mediaUrls: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          }

          set({ teamRoster: rosterProfiles, rosterLoading: false });
          return rosterProfiles;
        } catch (err) {
          console.warn('Failed to fetch team roster:', err);
          set({ rosterLoading: false });
          return [];
        }
      },

      addAthleteToTeam: async (teamId, athleteUid, playerDetails) => {
        if (!teamId || !athleteUid) return false;

        try {
          const team = get().userTeams.find(t => t.id === teamId) || get().activeTeam;
          const currentRoster = team?.roster || [];
          if (currentRoster.includes(athleteUid)) return true;

          const updatedRoster = [...currentRoster, athleteUid];
          
          // Create roster player entry
          const newPlayer: RosterPlayer = {
            athleteUid,
            athleteName: playerDetails?.athleteName || 'Athlete',
            jerseyNumber: playerDetails?.jerseyNumber || '',
            position: playerDetails?.position || 'ATH',
            verificationStatus: playerDetails?.verificationStatus || 'Verified',
            waiverSigned: playerDetails?.waiverSigned ?? true,
            waiverSignedAt: new Date().toISOString()
          };

          const currentRosterPlayers = team?.rosterPlayers || [];
          const updatedRosterPlayers = [...currentRosterPlayers, newPlayer];

          // Optimistically update store
          get().updateTeamInStore(teamId, {
            roster: updatedRoster,
            rosterPlayers: updatedRosterPlayers
          });

          // Sync to Firestore
          const teamRef = doc(db, 'teams', teamId);
          await setDoc(teamRef, {
            roster: updatedRoster,
            rosterPlayers: updatedRosterPlayers,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Re-fetch populated roster
          get().fetchTeamRoster(teamId, updatedRoster);
          return true;
        } catch (err) {
          console.error('Failed to add athlete to team:', err);
          return false;
        }
      },

      removeAthleteFromTeam: async (teamId, athleteUid) => {
        if (!teamId || !athleteUid) return false;

        try {
          const team = get().userTeams.find(t => t.id === teamId) || get().activeTeam;
          if (!team) return false;

          const updatedRoster = (team.roster || []).filter(id => id !== athleteUid);
          const updatedRosterPlayers = (team.rosterPlayers || []).filter(p => p.athleteUid !== athleteUid);

          get().updateTeamInStore(teamId, {
            roster: updatedRoster,
            rosterPlayers: updatedRosterPlayers
          });

          const teamRef = doc(db, 'teams', teamId);
          await setDoc(teamRef, {
            roster: updatedRoster,
            rosterPlayers: updatedRosterPlayers,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          set(state => ({
            teamRoster: state.teamRoster.filter(p => p.uid !== athleteUid)
          }));

          return true;
        } catch (err) {
          console.error('Failed to remove athlete from team:', err);
          return false;
        }
      },

      // ----------------------------------------------------
      // 3. GLOBAL SEARCH & COMMAND CENTER
      // ----------------------------------------------------
      isSearchOpen: false,
      searchQuery: '',
      searchResults: [],
      isSearching: false,

      openSearch: () => set({ isSearchOpen: true }),
      closeSearch: () => set({ isSearchOpen: false, searchQuery: '', searchResults: [] }),
      toggleSearch: () => set(state => ({ isSearchOpen: !state.isSearchOpen })),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),

      executeGlobalSearch: async (q: string) => {
        if (!q || !q.trim()) {
          set({ searchResults: [], isSearching: false });
          return;
        }

        const queryLower = q.trim().toLowerCase();
        set({ isSearching: true });

        const results: GlobalSearchResult[] = [];

        try {
          // 1. Search cached profiles & Firestore athletes
          const usersRef = collection(db, 'users');
          const athleteQuery = query(usersRef, where('role', '==', 'athlete'), limit(20));
          const athleteSnap = await getDocs(athleteQuery);

          athleteSnap.forEach(docSnap => {
            const data = docSnap.data() as UserProfile;
            const name = data.displayName || '';
            const sport = data.sport || '';
            const pos = data.position || '';
            const school = data.highSchool || '';

            if (
              name.toLowerCase().includes(queryLower) ||
              sport.toLowerCase().includes(queryLower) ||
              pos.toLowerCase().includes(queryLower) ||
              school.toLowerCase().includes(queryLower)
            ) {
              results.push({
                id: docSnap.id,
                type: 'athlete',
                title: name || 'Verified Athlete',
                subtitle: `${sport} • ${pos} • Class of ${data.gradYear || '2026'} (${school})`,
                url: `/profile/${docSnap.id}`,
                badge: 'ATHLETE',
                badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
                thumbnailUrl: data.photoURL || data.avatarUrl,
                metadata: data
              });
            }
          });

          // 2. Search Tournaments & Events
          const tournIds = new Set<string>();
          const tournRef = collection(db, 'tournaments');
          const eventsRef = collection(db, 'events');
          
          const [tournSnap, eventsSnap] = await Promise.all([
            getDocs(query(tournRef, limit(20))).catch(() => ({ forEach: () => {} } as any)),
            getDocs(query(eventsRef, limit(20))).catch(() => ({ forEach: () => {} } as any))
          ]);

          const processTournamentDoc = (docSnap: any, isEvent: boolean) => {
            if (tournIds.has(docSnap.id)) return;
            tournIds.add(docSnap.id);

            const data = docSnap.data() as any;
            const title = data.title || data.name || data.eventName || '';
            const sport = data.sport || '';
            const loc = data.location || data.venueName || data.venue || '';
            const city = data.city || '';
            const state = data.state || '';
            const divisions: string[] = Array.isArray(data.divisions) ? data.divisions : [];
            const divisionStr = divisions.join(' ');
            const format = data.format || '';
            const feeStr = data.entryFee || (data.teamFee ? `$${data.teamFee}` : (data.price ? `$${data.price}` : 'Free'));

            const matchesQuery = 
              title.toLowerCase().includes(queryLower) ||
              sport.toLowerCase().includes(queryLower) ||
              loc.toLowerCase().includes(queryLower) ||
              city.toLowerCase().includes(queryLower) ||
              state.toLowerCase().includes(queryLower) ||
              divisionStr.toLowerCase().includes(queryLower) ||
              format.toLowerCase().includes(queryLower);

            if (matchesQuery) {
              const thumb = data.thumbnailUrl || data.flyerUrl || data.coverUrl || data.bannerUrl;
              results.push({
                id: docSnap.id,
                type: 'tournament',
                title: title || (isEvent ? 'Showcase Event' : 'Tournament'),
                subtitle: `${sport} • ${data.startDate || data.date || 'Upcoming'} • ${loc || city || 'Athletic Facility'} • ${feeStr}`,
                url: isEvent ? `/events?id=${docSnap.id}` : `/tournaments?id=${docSnap.id}`,
                badge: isEvent ? (data.category?.toUpperCase() || 'EVENT') : 'TOURNAMENT',
                badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                thumbnailUrl: thumb,
                metadata: data
              });
            }
          };

          tournSnap.forEach((d: any) => processTournamentDoc(d, false));
          eventsSnap.forEach((d: any) => processTournamentDoc(d, true));

          // 3. Search Teams in store
          get().userTeams.forEach(team => {
            if (
              team.teamName.toLowerCase().includes(queryLower) ||
              team.division.toLowerCase().includes(queryLower)
            ) {
              results.push({
                id: team.id,
                type: 'team',
                title: team.teamName,
                subtitle: `Division: ${team.division} • ${team.roster?.length || 0} Players`,
                url: `/coach-check-in`,
                badge: 'TEAM',
                badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              });
            }
          });

          // 4. Fallback search on Activities
          get().recentActivities.forEach(act => {
            if (
              act.title.toLowerCase().includes(queryLower) ||
              act.description.toLowerCase().includes(queryLower)
            ) {
              results.push({
                id: act.id,
                type: act.type === 'highlight_added' ? 'video' : act.type === 'play_published' ? 'play' : 'athlete',
                title: act.title,
                subtitle: `${act.sport || 'Multi-Sport'} • By ${act.authorName}`,
                url: act.targetUrl,
                badge: act.type.toUpperCase().replace('_', ' '),
                badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                thumbnailUrl: act.thumbnailUrl
              });
            }
          });

          set({ searchResults: results, isSearching: false });
        } catch (err) {
          console.warn('Search execution encountered error:', err);
          set({ searchResults: results, isSearching: false });
        }
      },

      // ----------------------------------------------------
      // 4. STANDARDIZED MODAL HUB & VIDEO THEATER
      // ----------------------------------------------------
      activeModal: null,
      modalProps: {},
      activeVideo: null,
      videoQueue: [],
      activeVideoIndex: 0,
      theaterMode: false,

      openModal: (type, props = {}) => {
        set({ activeModal: type, modalProps: props });
      },

      closeModal: () => {
        set({ activeModal: null, modalProps: {}, activeVideo: null });
      },

      openVideoModal: (video, queue = []) => {
        const fullQueue = queue.length > 0 ? queue : [video];
        const initialIdx = fullQueue.findIndex(v => (v.id && v.id === video.id) || (v.videoUrl === video.videoUrl));
        const activeIdx = initialIdx >= 0 ? initialIdx : 0;
        
        set({
          activeModal: 'video',
          activeVideo: video,
          videoQueue: fullQueue,
          activeVideoIndex: activeIdx,
          modalProps: {
            ...video,
            videoUrl: video.videoUrl,
            title: video.title,
            athleteName: video.athleteName || video.userName
          }
        });
      },

      closeVideoModal: () => {
        set({
          activeModal: null,
          activeVideo: null,
          modalProps: {},
          theaterMode: false
        });
      },

      nextVideo: () => {
        const queue = get().videoQueue;
        const currentIdx = get().activeVideoIndex;
        if (queue.length === 0) return;
        const nextIdx = (currentIdx + 1) % queue.length;
        const nextVid = queue[nextIdx];
        set({
          activeVideoIndex: nextIdx,
          activeVideo: nextVid,
          modalProps: {
            ...nextVid,
            videoUrl: nextVid.videoUrl,
            title: nextVid.title,
            athleteName: nextVid.athleteName || nextVid.userName
          }
        });
      },

      prevVideo: () => {
        const queue = get().videoQueue;
        const currentIdx = get().activeVideoIndex;
        if (queue.length === 0) return;
        const prevIdx = (currentIdx - 1 + queue.length) % queue.length;
        const prevVid = queue[prevIdx];
        set({
          activeVideoIndex: prevIdx,
          activeVideo: prevVid,
          modalProps: {
            ...prevVid,
            videoUrl: prevVid.videoUrl,
            title: prevVid.title,
            athleteName: prevVid.athleteName || prevVid.userName
          }
        });
      },

      selectVideoFromQueue: (index) => {
        const queue = get().videoQueue;
        if (index < 0 || index >= queue.length) return;
        const targetVid = queue[index];
        set({
          activeVideoIndex: index,
          activeVideo: targetVid,
          modalProps: {
            ...targetVid,
            videoUrl: targetVid.videoUrl,
            title: targetVid.title,
            athleteName: targetVid.athleteName || targetVid.userName
          }
        });
      },

      setTheaterMode: (enabled) => {
        set({ theaterMode: enabled });
      },

      toggleTheaterMode: () => {
        set(s => ({ theaterMode: !s.theaterMode }));
      },

      // ----------------------------------------------------
      // 5. ACTIVITY STREAM & NOTIFICATIONS
      // ----------------------------------------------------
      unreadNotificationCount: 0,
      isNotificationDrawerOpen: false,
      recentActivities: [],

      setUnreadNotificationCount: (count) => set({ unreadNotificationCount: count }),
      incrementNotificationCount: () => set(s => ({ unreadNotificationCount: s.unreadNotificationCount + 1 })),
      resetNotificationCount: () => set({ unreadNotificationCount: 0 }),
      openNotifications: () => set({ isNotificationDrawerOpen: true }),
      closeNotifications: () => set({ isNotificationDrawerOpen: false }),
      toggleNotifications: () => set(s => ({ isNotificationDrawerOpen: !s.isNotificationDrawerOpen })),

      setRecentActivities: (activities) => set({ recentActivities: activities }),
      addRecentActivity: (activity) => set(s => ({ recentActivities: [activity, ...s.recentActivities].slice(0, 50) })),

      logCrossModuleActivity: async (payload) => {
        const currentUser = get().user;
        const currentProfile = get().profile;
        const authorId = currentUser?.uid || 'guest';
        const authorName = currentProfile?.displayName || currentUser?.displayName || 'Just1Play Athlete';
        const authorAvatar = currentProfile?.photoURL || currentUser?.photoURL || '';
        const authorRole = get().canonicalRole;

        const id = await logActivity({
          ...payload,
          authorId,
          authorName,
          authorAvatar,
          authorRole
        });

        // Broadcast sync to notify all components
        get().broadcastSync('activity');
        return id;
      },

      // ----------------------------------------------------
      // 6. APP THEME & VISUAL PREFERENCES STATE
      // ----------------------------------------------------
      theme: (typeof window !== 'undefined' && (localStorage.getItem('j1p_theme') === 'light' || localStorage.getItem('j1p_theme_mode') === 'light')) ? 'light' : 'dark',
      themeMode: (typeof window !== 'undefined' && (localStorage.getItem('j1p_theme_mode') as AppThemeMode)) || 'system',
      systemTheme: typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      isSystemTheme: (typeof window !== 'undefined' ? localStorage.getItem('j1p_theme_mode') !== 'dark' && localStorage.getItem('j1p_theme_mode') !== 'light' : true),
      logoStyle: (typeof window !== 'undefined' && (localStorage.getItem('j1p_logo_style') as AppLogoStyle)) || 'crest',
      customLogoUrl: typeof window !== 'undefined' ? localStorage.getItem('j1p_custom_logo_url') : null,
      accentColor: (typeof window !== 'undefined' && (localStorage.getItem('j1p_accent_color') as AccentColor)) || 'orange',
      sportFilter: (typeof window !== 'undefined' && localStorage.getItem('j1p_sport_filter')) || 'All',
      hapticsEnabled: true,
      highContrast: false,

      setTheme: (newTheme: AppTheme) => {
        const mode = newTheme;
        set({ 
          theme: newTheme, 
          themeMode: mode, 
          isSystemTheme: false 
        });

        try {
          localStorage.setItem('j1p_theme', newTheme);
          localStorage.setItem('j1p_theme_mode', mode);
        } catch (e) {
          console.warn('Unable to persist theme to localStorage:', e);
        }

        get().applyThemeToDom();
        get().broadcastSync('theme');
      },

      setThemeMode: (mode: AppThemeMode) => {
        const currentSys = get().systemTheme;
        const resolvedTheme: AppTheme = mode === 'system' ? currentSys : mode;

        set({
          themeMode: mode,
          theme: resolvedTheme,
          isSystemTheme: mode === 'system'
        });

        try {
          if (mode === 'system') {
            localStorage.setItem('j1p_theme_mode', 'system');
            localStorage.removeItem('j1p_theme');
          } else {
            localStorage.setItem('j1p_theme_mode', mode);
            localStorage.setItem('j1p_theme', mode);
          }
        } catch (e) {
          console.warn('Unable to persist theme mode to localStorage:', e);
        }

        get().applyThemeToDom();
        get().broadcastSync('theme');
      },

      toggleTheme: () => {
        const current = get().theme;
        const next: AppTheme = current === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },

      resetThemeToSystem: () => {
        get().setThemeMode('system');
      },

      setSystemTheme: (sysTheme: AppTheme) => {
        const isSys = get().themeMode === 'system';
        set({
          systemTheme: sysTheme,
          theme: isSys ? sysTheme : get().theme
        });

        if (isSys) {
          get().applyThemeToDom();
          get().broadcastSync('theme');
        }
      },

      setLogoStyle: (style: AppLogoStyle) => {
        set({ logoStyle: style });
        try {
          localStorage.setItem('j1p_logo_style', style);
          window.dispatchEvent(new CustomEvent('j1p:logo-changed', { detail: { style } }));
        } catch (e) {
          console.warn('Unable to persist logo style:', e);
        }
        get().broadcastSync('logo');
      },

      setCustomLogoUrl: (url: string | null) => {
        set({ customLogoUrl: url });
        try {
          if (url) {
            localStorage.setItem('j1p_custom_logo_url', url);
          } else {
            localStorage.removeItem('j1p_custom_logo_url');
          }
        } catch (e) {
          console.warn('Unable to persist custom logo URL:', e);
        }
        get().broadcastSync('logo');
      },

      cycleLogoStyle: () => {
        const customUrl = get().customLogoUrl;
        const styles: AppLogoStyle[] = customUrl ? ['crest', 'cyber', 'minimal', 'custom'] : ['crest', 'cyber', 'minimal'];
        const currentIdx = styles.indexOf(get().logoStyle);
        const nextIdx = (currentIdx + 1) % styles.length;
        get().setLogoStyle(styles[nextIdx]);
      },

      setAccentColor: (accent: AccentColor) => {
        set({ accentColor: accent });
        try {
          localStorage.setItem('j1p_accent_color', accent);
          document.documentElement.setAttribute('data-accent', accent);
        } catch (e) {
          console.warn('Unable to persist accent color:', e);
        }
        get().broadcastSync('theme');
      },

      setSportFilter: (sport: string) => {
        set({ sportFilter: sport });
        try {
          localStorage.setItem('j1p_sport_filter', sport);
        } catch (e) {
          console.warn('Unable to persist sport filter:', e);
        }
        get().broadcastSync('filter');
      },

      toggleHaptics: () => {
        set(state => ({ hapticsEnabled: !state.hapticsEnabled }));
      },

      toggleHighContrast: () => {
        set(state => {
          const next = !state.highContrast;
          if (typeof document !== 'undefined') {
            if (next) {
              document.documentElement.classList.add('high-contrast');
            } else {
              document.documentElement.classList.remove('high-contrast');
            }
          }
          return { highContrast: next };
        });
      },

      applyThemeToDom: () => {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        const currentTheme = get().theme;
        const currentMode = get().themeMode;
        const root = document.documentElement;
        const body = document.body;

        if (currentTheme === 'light') {
          root.classList.remove('dark');
          root.classList.add('light');
          body.classList.remove('dark');
          body.classList.add('light');
        } else {
          root.classList.remove('light');
          root.classList.add('dark');
          body.classList.remove('light');
          body.classList.add('dark');
        }

        root.style.colorScheme = currentTheme;
        root.setAttribute('data-theme', currentTheme);
        root.setAttribute('data-theme-mode', currentMode);
      },

      // ----------------------------------------------------
      // 7. CROSS-MODULE INSTANT SYNC ENGINE
      // ----------------------------------------------------
      syncSignal: Date.now(),
      lastSyncTimestamp: Date.now(),
      lastSyncChannel: null,

      broadcastSync: (channel) => {
        const now = Date.now();
        set({ 
          syncSignal: now, 
          lastSyncTimestamp: now, 
          lastSyncChannel: channel || 'global' 
        });

        // Dispatch browser-level event for non-React or cross-module boundaries
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('just1play:sync', { 
              detail: { channel: channel || 'global', timestamp: now } 
            })
          );
        }
      }
    }),
    {
      name: 'just1play_zustand_app_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        role: state.role,
        canonicalRole: state.canonicalRole,
        bookmarks: state.bookmarks,
        activeTeamId: state.activeTeamId,
        userTeams: state.userTeams,
        theme: state.theme,
        themeMode: state.themeMode,
        logoStyle: state.logoStyle,
        customLogoUrl: state.customLogoUrl,
        accentColor: state.accentColor,
        sportFilter: state.sportFilter
      })
    }
  )
);
