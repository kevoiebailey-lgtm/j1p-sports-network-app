import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserPlus,
  ShieldCheck,
  CheckSquare,
  Square,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  Save,
  Copy,
  Check,
  Trash2,
  Plus,
  ChevronDown,
  Sparkles,
  Layers,
  AlertCircle,
  ExternalLink,
  Download,
  X,
  Trophy,
  Activity,
  Award,
  Hash,
  Database,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { TournamentDoc, PoolStanding } from '../../types/platform';
import { UserProfile, TeamItem } from '../../types';
import { INITIAL_TOURNAMENT_DOC, INITIAL_POOL_STANDINGS, INITIAL_ATHLETE_DOCS } from '../../lib/platformData';
import { 
  SAMPLE_ATHLETE_DIRECTORY, 
  lookupAthleteByProfileId, 
  computeTeamAggregateStats, 
  TeamAggregateStats 
} from '../../services/bracketRosterSyncService';
import { verifyAthleteEligibility, calculateAgeOnDate } from '../../services/tournamentHubService';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export interface TournamentRosterTeam {
  id: string;
  name: string;
  division: string;
  headCoach?: string;
  coachPhone?: string;
  seed?: number;
  pool?: string;
  color?: string;
  profileIds: string[]; // Linked athlete Profile IDs (e.g. J1P-849201)
  playerUids: string[]; // Linked user UIDs
  players: UserProfile[]; // Hydrated profile records
  stats?: TeamAggregateStats;
  updatedAt?: string;
}

export interface TournamentRosterManagerProps {
  tournamentId?: string;
  initialTournament?: TournamentDoc;
  initialDivision?: string;
  onTournamentUpdated?: (updatedTournament: TournamentDoc) => void;
  isOpenAsModal?: boolean;
  onCloseModal?: () => void;
  className?: string;
}

/**
 * Ensures any partial profile data is strictly typed as a full UserProfile object
 */
export const ensureFullUserProfile = (partial: Partial<UserProfile> & { uid: string; displayName: string }): UserProfile => {
  return {
    uid: partial.uid,
    email: partial.email || `${partial.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}@just1play.com`,
    displayName: partial.displayName,
    role: partial.role || 'athlete',
    sport: partial.sport || 'Basketball',
    gradYear: partial.gradYear || '2027',
    highSchool: partial.highSchool || 'High School Academy',
    state: partial.state || 'CA',
    city: partial.city || 'Los Angeles',
    location: partial.location || 'Los Angeles, CA',
    position: partial.position || 'Athlete',
    primaryPosition: partial.primaryPosition || partial.position || 'ATH',
    jerseyNumber: partial.jerseyNumber || '0',
    teamName: partial.teamName || 'Unassigned',
    height: partial.height || "6'0\"",
    weight: partial.weight || '175 lbs',
    gpa: partial.gpa || '3.5',
    bio: partial.bio || 'Verified athlete prospect on Just1Play platform.',
    avatarUrl: partial.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80',
    athleteId: partial.athleteId || `J1P-${partial.uid.replace('ath-', '80').substring(0, 6).toUpperCase()}`,
    dateOfBirth: partial.dateOfBirth || '2008-09-15',
    isVerified: partial.isVerified ?? true,
    social: partial.social || {
      instagram: `@${partial.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      twitter: `@${partial.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}_sports`
    },
    stats: partial.stats || {
      points: 18,
      rebounds: 6,
      assists: 4,
      steals: 2,
      blocks: 1,
      gamesPlayed: 15
    },
    performanceMetrics: partial.performanceMetrics || {
      speed: 88,
      agility: 90,
      strength: 82,
      vertical: 34,
      stamina: 90,
      iq: 94
    },
    mediaUrls: partial.mediaUrls || [],
    createdAt: partial.createdAt || '2026-01-01T00:00:00Z',
    updatedAt: partial.updatedAt || new Date().toISOString()
  };
};

const DEFAULT_INITIAL_TEAMS: TournamentRosterTeam[] = [
  {
    id: 'team-viper-01',
    name: 'SoCal Elite Vipers',
    division: 'Varsity Gold',
    headCoach: 'Coach Marcus Vance Sr.',
    coachPhone: '(310) 555-0192',
    seed: 1,
    pool: 'Pool A',
    color: '#00B8D4',
    profileIds: ['J1P-849201', 'J1P-920412', 'J1P-381920'],
    playerUids: ['ath-101', 'ath-102', 'ath-103'],
    players: [
      SAMPLE_ATHLETE_DIRECTORY[0],
      SAMPLE_ATHLETE_DIRECTORY[1],
      SAMPLE_ATHLETE_DIRECTORY[2]
    ]
  },
  {
    id: 'team-lightning-02',
    name: 'Las Vegas Lightning',
    division: 'Varsity Gold',
    headCoach: 'Coach Derrick Hall',
    coachPhone: '(702) 555-4819',
    seed: 4,
    pool: 'Pool A',
    color: '#FF6A00',
    profileIds: ['J1P-502914', 'J1P-619204'],
    playerUids: ['ath-104', 'ath-105'],
    players: [
      SAMPLE_ATHLETE_DIRECTORY[3],
      SAMPLE_ATHLETE_DIRECTORY[4]
    ]
  },
  {
    id: 'team-cal-bears-03',
    name: 'California Golden Bears',
    division: 'Varsity Gold',
    headCoach: 'Coach Antonio Ruiz',
    seed: 2,
    pool: 'Pool B',
    color: '#E5B868',
    profileIds: ['J1P-748192', 'J1P-839102'],
    playerUids: ['ath-106', 'ath-107'],
    players: [
      SAMPLE_ATHLETE_DIRECTORY[5],
      SAMPLE_ATHLETE_DIRECTORY[6]
    ]
  },
  {
    id: 'team-texas-outlaws-04',
    name: 'Texas Outlaws Flag',
    division: 'Varsity Gold',
    headCoach: 'Coach Travis Miller',
    seed: 3,
    pool: 'Pool B',
    color: '#EF4444',
    profileIds: ['J1P-194820'],
    playerUids: ['ath-108'],
    players: [
      SAMPLE_ATHLETE_DIRECTORY[7]
    ]
  },
  {
    id: 'team-rising-stars-05',
    name: 'Bay Area Flight 16U',
    division: '16U Showcase',
    headCoach: 'Coach Kevin Sterling',
    seed: 1,
    pool: 'Pool 1',
    color: '#8B5CF6',
    profileIds: ['J1P-849201', 'J1P-502914'],
    playerUids: ['ath-101', 'ath-104'],
    players: [
      SAMPLE_ATHLETE_DIRECTORY[0],
      SAMPLE_ATHLETE_DIRECTORY[3]
    ]
  }
];

export const TournamentRosterManager: React.FC<TournamentRosterManagerProps> = ({
  tournamentId = 'tourn-101',
  initialTournament = INITIAL_TOURNAMENT_DOC,
  initialDivision = 'Varsity Gold',
  onTournamentUpdated,
  isOpenAsModal = false,
  onCloseModal,
  className = ''
}) => {
  const { user, profile } = useAuth();

  // Tournament & Division State
  const [tournament, setTournament] = useState<TournamentDoc>(initialTournament);
  const [selectedDivision, setSelectedDivision] = useState<string>(initialDivision);
  const [teams, setTeams] = useState<TournamentRosterTeam[]>(() => {
    try {
      const cached = localStorage.getItem(`just1play_tournament_rosters_${tournamentId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Could not parse cached tournament rosters', e);
    }
    return DEFAULT_INITIAL_TEAMS;
  });

  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    const defaultTeam = DEFAULT_INITIAL_TEAMS.find(t => t.division === initialDivision) || DEFAULT_INITIAL_TEAMS[0];
    return defaultTeam ? defaultTeam.id : '';
  });

  // Athlete Pool & Directory State
  const [athleteDirectory, setAthleteDirectory] = useState<UserProfile[]>(() => {
    const map = new Map<string, UserProfile>();
    SAMPLE_ATHLETE_DIRECTORY.forEach(a => map.set(a.uid, a));

    INITIAL_ATHLETE_DOCS.forEach(docItem => {
      if (!map.has(docItem.id)) {
        map.set(
          docItem.id,
          ensureFullUserProfile({
            uid: docItem.id,
            athleteId: `J1P-${docItem.id.replace('ath-', '80')}`,
            displayName: docItem.displayName,
            sport: docItem.sport,
            position: docItem.position,
            jerseyNumber: docItem.jerseyNumber.replace('#', ''),
            teamName: docItem.teamName,
            gradYear: docItem.gradYear.toString(),
            dateOfBirth: '2008-09-15',
            highSchool: docItem.school,
            state: 'CA',
            city: docItem.cityState.split(',')[0] || 'Los Angeles',
            height: docItem.metrics.height,
            weight: docItem.metrics.weight,
            gpa: docItem.metrics.gpa.toString(),
            bio: docItem.bio,
            avatarUrl: docItem.avatarUrl,
            isVerified: docItem.metrics.verified,
            stats: {
              points: Math.round(docItem.seasonStats.pointsOrYards / Math.max(1, docItem.seasonStats.gamesPlayed)),
              rebounds: Math.round(docItem.seasonStats.assistsOrTackles / Math.max(1, docItem.seasonStats.gamesPlayed)),
              assists: Math.round(docItem.seasonStats.assistsOrTackles / 2 / Math.max(1, docItem.seasonStats.gamesPlayed)),
              steals: 2,
              blocks: 1,
              gamesPlayed: docItem.seasonStats.gamesPlayed
            },
            performanceMetrics: {
              speed: Math.min(99, Math.round(100 - (docItem.metrics.dash40 - 4.2) * 50)),
              agility: 92,
              strength: 85,
              vertical: docItem.metrics.vertLeap || 32,
              stamina: 94,
              iq: 96
            }
          })
        );
      }
    });

    return Array.from(map.values());
  });

  // Multi-Select State
  const [selectedAthleteUids, setSelectedAthleteUids] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sportFilter, setSportFilter] = useState<string>('All');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'unassigned' | 'current_team' | 'verified_only'>('all');

  // UI Feedback & Action State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Team Modal / Form State
  const [showCreateTeamModal, setShowCreateTeamModal] = useState<boolean>(false);
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [newTeamDivision, setNewTeamDivision] = useState<string>(selectedDivision);
  const [newTeamHeadCoach, setNewTeamHeadCoach] = useState<string>('');
  const [newTeamSeed, setNewTeamSeed] = useState<number>(1);
  const [newTeamColor, setNewTeamColor] = useState<string>('#00B8D4');

  // Load live Firestore tournament & roster data on mount
  useEffect(() => {
    let isMounted = true;

    async function loadTournamentDoc() {
      if (!db || !tournamentId) return;

      try {
        const tournRef = doc(db, 'tournaments', tournamentId);
        const snap = await getDoc(tournRef);

        if (snap.exists() && isMounted) {
          const data = snap.data() as any;
          if (data) {
            setTournament(prev => ({
              ...prev,
              ...data,
              id: snap.id
            }));

            // If tournament doc contains saved rosters, sync teams state
            if (data.rosters && typeof data.rosters === 'object') {
              const loadedTeams: TournamentRosterTeam[] = Object.values(data.rosters);
              if (loadedTeams.length > 0) {
                setTeams(loadedTeams);
                localStorage.setItem(`just1play_tournament_rosters_${tournamentId}`, JSON.stringify(loadedTeams));
              }
            }
          }
        }

        // Also fetch any users from Firestore 'users' collection to enrich athlete directory
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        if (!usersSnap.empty && isMounted) {
          const firestoreAthletes: UserProfile[] = [];
          usersSnap.forEach(d => {
            const u = d.data() as Partial<UserProfile>;
            if (u.role === 'athlete' || !u.role) {
              firestoreAthletes.push(
                ensureFullUserProfile({
                  uid: d.id,
                  athleteId: u.athleteId || `J1P-${d.id.substring(0, 6).toUpperCase()}`,
                  displayName: u.displayName || 'Athletic Prospect',
                  email: u.email || 'athlete@just1play.com',
                  role: 'athlete',
                  sport: u.sport || tournament.sport || 'Basketball',
                  position: u.position || 'Athlete',
                  jerseyNumber: u.jerseyNumber || '0',
                  teamName: u.teamName || 'Unassigned',
                  gradYear: u.gradYear || '2027',
                  dateOfBirth: u.dateOfBirth || '2009-01-01',
                  highSchool: u.highSchool || 'Prep Academy',
                  state: u.state || 'NJ',
                  city: u.city || 'Metro',
                  height: u.height || "6'0\"",
                  weight: u.weight || '175 lbs',
                  gpa: u.gpa || '3.75',
                  bio: u.bio || 'Verified athlete prospect on Just1Play platform.',
                  avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80',
                  isVerified: u.isVerified ?? true
                })
              );
            }
          });

          if (firestoreAthletes.length > 0) {
            setAthleteDirectory(prev => {
              const map = new Map<string, UserProfile>();
              prev.forEach(a => map.set(a.uid, a));
              firestoreAthletes.forEach(a => map.set(a.uid, a));
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.warn('Firestore load notice:', err);
      }
    }

    loadTournamentDoc();

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  // Current Division Teams
  const divisionTeams = useMemo(() => {
    return teams.filter(t => t.division === selectedDivision);
  }, [teams, selectedDivision]);

  // Ensure an active team is selected whenever division changes
  useEffect(() => {
    if (divisionTeams.length > 0) {
      if (!divisionTeams.some(t => t.id === selectedTeamId)) {
        setSelectedTeamId(divisionTeams[0].id);
      }
    } else {
      setSelectedTeamId('');
    }
  }, [divisionTeams, selectedTeamId]);

  // Selected Team Object
  const activeTeam = useMemo(() => {
    return teams.find(t => t.id === selectedTeamId) || null;
  }, [teams, selectedTeamId]);

  // Active Team Roster Profiles
  const activeTeamPlayers: UserProfile[] = useMemo(() => {
    if (!activeTeam) return [];
    return activeTeam.playerUids.map(uid => {
      const found = athleteDirectory.find(a => a.uid === uid);
      if (found) return found;
      const fallback = activeTeam.players?.find(p => p.uid === uid);
      if (fallback) return fallback;
      return ensureFullUserProfile({
        uid,
        athleteId: activeTeam.profileIds.find(p => p.includes(uid.substring(0, 4))) || `J1P-${uid.substring(0, 6)}`,
        displayName: `Athlete #${uid.substring(0, 4)}`,
        role: 'athlete'
      });
    });
  }, [activeTeam, athleteDirectory]);

  // Active Team Aggregate Stats
  const activeTeamStats = useMemo(() => {
    return computeTeamAggregateStats(activeTeamPlayers, selectedDivision);
  }, [activeTeamPlayers, selectedDivision]);

  // Filtered Athlete Pool for Multi-Select
  const filteredAthletes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return athleteDirectory.filter(athlete => {
      // 1. Search Query Match across ID, Name, Jersey, School, Email
      const matchId = athlete.athleteId?.toLowerCase().includes(q);
      const matchName = athlete.displayName?.toLowerCase().includes(q);
      const matchUid = athlete.uid?.toLowerCase().includes(q);
      const matchSchool = athlete.highSchool?.toLowerCase().includes(q);
      const matchEmail = athlete.email?.toLowerCase().includes(q);
      const matchJersey = athlete.jerseyNumber?.toString() === q;
      const matchPosition = athlete.position?.toLowerCase().includes(q);

      const matchesSearch = !q || matchId || matchName || matchUid || matchSchool || matchEmail || matchJersey || matchPosition;
      if (!matchesSearch) return false;

      // 2. Sport Filter
      if (sportFilter !== 'All' && athlete.sport && !athlete.sport.toLowerCase().includes(sportFilter.toLowerCase())) {
        return false;
      }

      // 3. Assignment Filter
      const isCurrentlyInTeam = activeTeam?.playerUids.includes(athlete.uid);
      const isInAnyTeam = teams.some(t => t.playerUids.includes(athlete.uid));

      if (assignmentFilter === 'current_team' && !isCurrentlyInTeam) return false;
      if (assignmentFilter === 'unassigned' && isInAnyTeam) return false;
      if (assignmentFilter === 'verified_only' && !athlete.isVerified) return false;

      return true;
    });
  }, [athleteDirectory, searchQuery, sportFilter, assignmentFilter, activeTeam, teams]);

  // Toggle Single Athlete Selection
  const toggleAthleteSelection = (uid: string) => {
    setSelectedAthleteUids(prev => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  // Select All Filtered Athletes
  const selectAllFiltered = () => {
    setSelectedAthleteUids(new Set(filteredAthletes.map(a => a.uid)));
  };

  // Clear Selection
  const clearSelection = () => {
    setSelectedAthleteUids(new Set());
  };

  // Copy Profile ID to clipboard
  const handleCopyProfileId = (profileId: string) => {
    navigator.clipboard.writeText(profileId);
    setCopiedId(profileId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // BATCH ACTION 1: Link & Assign Selected Athletes to Active Team and Division
  const handleAssignSelectedToActiveTeam = async () => {
    if (!activeTeam) {
      setStatusMessage({ text: 'Please select or create a team first.', type: 'error' });
      return;
    }

    if (selectedAthleteUids.size === 0) {
      setStatusMessage({ text: 'Please select at least 1 athlete to assign.', type: 'info' });
      return;
    }

    const selectedList = athleteDirectory.filter(a => selectedAthleteUids.has(a.uid));
    const newUids = new Set(activeTeam.playerUids);
    const newProfileIds = new Set(activeTeam.profileIds);
    const newPlayersMap = new Map<string, UserProfile>();

    activeTeam.players?.forEach(p => newPlayersMap.set(p.uid, p));

    selectedList.forEach(athlete => {
      newUids.add(athlete.uid);
      if (athlete.athleteId) {
        newProfileIds.add(athlete.athleteId);
      }
      newPlayersMap.set(athlete.uid, athlete);
    });

    const updatedPlayers = Array.from(newPlayersMap.values());
    const updatedTeam: TournamentRosterTeam = {
      ...activeTeam,
      profileIds: Array.from(newProfileIds),
      playerUids: Array.from(newUids),
      players: updatedPlayers,
      stats: computeTeamAggregateStats(updatedPlayers, selectedDivision),
      updatedAt: new Date().toISOString()
    };

    const updatedTeams = teams.map(t => (t.id === activeTeam.id ? updatedTeam : t));
    setTeams(updatedTeams);

    // Save changes to Firestore
    await persistTournamentRostersToFirestore(updatedTeams, `Linked ${selectedList.length} athletes to ${activeTeam.name}!`);

    // Reset selection
    setSelectedAthleteUids(new Set());
  };

  // BATCH ACTION 2: Remove / Unlink Selected Athletes from Active Team
  const handleRemoveSelectedFromActiveTeam = async () => {
    if (!activeTeam) return;

    const remainingUids = activeTeam.playerUids.filter(uid => !selectedAthleteUids.has(uid));
    const remainingPlayers = (activeTeam.players || []).filter(p => !selectedAthleteUids.has(p.uid));
    const remainingProfileIds = remainingPlayers.map(p => p.athleteId).filter(Boolean) as string[];

    const updatedTeam: TournamentRosterTeam = {
      ...activeTeam,
      profileIds: remainingProfileIds,
      playerUids: remainingUids,
      players: remainingPlayers,
      stats: computeTeamAggregateStats(remainingPlayers, selectedDivision),
      updatedAt: new Date().toISOString()
    };

    const updatedTeams = teams.map(t => (t.id === activeTeam.id ? updatedTeam : t));
    setTeams(updatedTeams);

    await persistTournamentRostersToFirestore(updatedTeams, `Removed selected athletes from ${activeTeam.name}.`);
    setSelectedAthleteUids(new Set());
  };

  // Remove single player from active team
  const handleRemoveSinglePlayer = async (uid: string) => {
    if (!activeTeam) return;

    const remainingUids = activeTeam.playerUids.filter(u => u !== uid);
    const remainingPlayers = (activeTeam.players || []).filter(p => p.uid !== uid);
    const remainingProfileIds = remainingPlayers.map(p => p.athleteId).filter(Boolean) as string[];

    const updatedTeam: TournamentRosterTeam = {
      ...activeTeam,
      profileIds: remainingProfileIds,
      playerUids: remainingUids,
      players: remainingPlayers,
      stats: computeTeamAggregateStats(remainingPlayers, selectedDivision),
      updatedAt: new Date().toISOString()
    };

    const updatedTeams = teams.map(t => (t.id === activeTeam.id ? updatedTeam : t));
    setTeams(updatedTeams);

    await persistTournamentRostersToFirestore(updatedTeams, `Removed athlete from roster.`);
  };

  // Create New Team in Division
  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const newTeamId = `team-${Date.now().toString().slice(-6)}`;
    const newTeamObj: TournamentRosterTeam = {
      id: newTeamId,
      name: newTeamName.trim(),
      division: newTeamDivision,
      headCoach: newTeamHeadCoach.trim() || 'Head Coach',
      seed: newTeamSeed || (divisionTeams.length + 1),
      pool: `Pool ${String.fromCharCode(65 + Math.floor(divisionTeams.length / 4))}`,
      color: newTeamColor,
      profileIds: [],
      playerUids: [],
      players: [],
      stats: computeTeamAggregateStats([], newTeamDivision),
      updatedAt: new Date().toISOString()
    };

    const updatedTeams = [...teams, newTeamObj];
    setTeams(updatedTeams);
    setSelectedDivision(newTeamDivision);
    setSelectedTeamId(newTeamId);
    setShowCreateTeamModal(false);
    setNewTeamName('');
    setNewTeamHeadCoach('');

    await persistTournamentRostersToFirestore(updatedTeams, `Created new team "${newTeamObj.name}" in ${newTeamDivision}!`);
  };

  // Persist updated team rosters to Firestore tournament document
  const persistTournamentRostersToFirestore = async (
    teamsToPersist: TournamentRosterTeam[],
    successMessage?: string
  ) => {
    setIsSaving(true);

    try {
      const rostersMap: Record<string, TournamentRosterTeam> = {};
      const divisionTeamsMap: Record<string, string[]> = {};

      teamsToPersist.forEach(t => {
        rostersMap[t.id] = t;
        if (!divisionTeamsMap[t.division]) {
          divisionTeamsMap[t.division] = [];
        }
        divisionTeamsMap[t.division].push(t.id);
      });

      const allLinkedProfileIds = new Set<string>();
      teamsToPersist.forEach(t => t.profileIds.forEach(id => allLinkedProfileIds.add(id)));

      if (db && tournamentId) {
        const tournRef = doc(db, 'tournaments', tournamentId);
        await setDoc(
          tournRef,
          {
            rosters: rostersMap,
            divisionTeams: divisionTeamsMap,
            teamsCount: teamsToPersist.length,
            linkedProfilesCount: allLinkedProfileIds.size,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      }

      localStorage.setItem(`just1play_tournament_rosters_${tournamentId}`, JSON.stringify(teamsToPersist));

      try {
        const savedTourns = localStorage.getItem('just1play_tournaments');
        if (savedTourns) {
          const list: TournamentDoc[] = JSON.parse(savedTourns);
          const idx = list.findIndex(t => t.id === tournamentId);
          if (idx !== -1) {
            list[idx].teamsCount = teamsToPersist.length;
            localStorage.setItem('just1play_tournaments', JSON.stringify(list));
          }
        }
      } catch (e) {
        console.warn('LocalStorage tournament sync notice', e);
      }

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSavedTimestamp(now);

      if (successMessage) {
        setStatusMessage({ text: successMessage, type: 'success' });
        setTimeout(() => setStatusMessage(null), 3500);
      }

      if (onTournamentUpdated) {
        onTournamentUpdated({
          ...tournament,
          teamsCount: teamsToPersist.length
        });
      }
    } catch (err) {
      console.error('Error saving tournament rosters to Firestore:', err);
      setStatusMessage({ text: 'Saved locally. Firestore sync queued.', type: 'info' });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Export Roster CSV
  const handleExportRosterCSV = () => {
    if (!activeTeam || activeTeamPlayers.length === 0) {
      setStatusMessage({ text: 'No players in active team to export.', type: 'info' });
      return;
    }

    const headers = ['Profile ID,Player Name,Jersey,Position,Grad Year,School,GPA,Height,Weight,Verified,Email\n'];
    const rows = activeTeamPlayers.map(p => {
      return `"${p.athleteId || ''}","${p.displayName || ''}","${p.jerseyNumber || ''}","${p.position || ''}","${p.gradYear || ''}","${p.highSchool || ''}","${p.gpa || ''}","${p.height || ''}","${p.weight || ''}","${p.isVerified ? 'YES' : 'NO'}","${p.email || ''}"\n`;
    });

    const blob = new Blob([headers.concat(rows).join('')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTeam.name.replace(/\s+/g, '_')}_Roster_${selectedDivision}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStatusMessage({ text: `Exported ${activeTeam.name} roster CSV!`, type: 'success' });
    setTimeout(() => setStatusMessage(null), 2500);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header Banner with Live Firestore Sync Indicator */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-2xl bg-[#FF6A00]/10 border border-[#FF6A00]/30 text-[#FF6A00]">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Tournament Roster & Profile ID Linker</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold uppercase">
                  Director Sync
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Link registered athlete profile IDs to tournament teams & divisions. Updates Firestore document in real-time.
            </p>
          </div>

          {/* Sync Status Badge & Action Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300">
              <Database className={`w-3.5 h-3.5 ${isSaving ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
              <span>
                {isSaving
                  ? 'Saving to Firestore...'
                  : lastSavedTimestamp
                  ? `Firestore Synced: ${lastSavedTimestamp}`
                  : `Doc: tournaments/${tournamentId}`}
              </span>
            </div>

            <button
              onClick={() => persistTournamentRostersToFirestore(teams, 'Firestore document updated successfully!')}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-amber-500 hover:from-[#e55f00] hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Document</span>
            </button>

            {isOpenAsModal && onCloseModal && (
              <button
                onClick={onCloseModal}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Toast Alert */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`p-3 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                  : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{statusMessage.text}</span>
              </div>
              <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Division Selector Pills & Add Team Button */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-bold whitespace-nowrap">
              Division:
            </span>
            {tournament.divisions.map(div => {
              const countInDiv = teams.filter(t => t.division === div).length;
              const isSelected = selectedDivision === div;
              return (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#FF6A00] to-amber-500 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{div}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {countInDiv} Teams
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              setNewTeamDivision(selectedDivision);
              setShowCreateTeamModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Team in {selectedDivision}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Workflow Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (5 Cols): Active Team Roster & Aggregates */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Team Selector Header */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span>Target Team ({selectedDivision})</span>
              </label>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                {divisionTeams.length} Teams in Division
              </span>
            </div>

            {divisionTeams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {divisionTeams.map(t => {
                  const isCur = t.id === selectedTeamId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeamId(t.id)}
                      className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                        isCur
                          ? 'bg-slate-800 border-[#FF6A00] shadow-md ring-1 ring-[#FF6A00]/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: t.color || '#00B8D4' }}
                          />
                          <h4 className="font-bold text-xs text-white truncate">{t.name}</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono truncate">
                          Seed #{t.seed} • {t.headCoach || 'No Coach'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono font-bold text-cyan-400 shrink-0">
                        {t.playerUids.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-400">No teams created in {selectedDivision} yet.</p>
                <button
                  onClick={() => {
                    setNewTeamDivision(selectedDivision);
                    setShowCreateTeamModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#FF6A00] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Team</span>
                </button>
              </div>
            )}
          </div>

          {/* Active Team Detail Card & Aggregate Projected Stats */}
          {activeTeam && (
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: activeTeam.color || '#00B8D4' }}
                    />
                    <h3 className="text-base font-black text-white">{activeTeam.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedDivision} • Head Coach: {activeTeam.headCoach || 'Unassigned'} • Seed #{activeTeam.seed}
                  </p>
                </div>

                <button
                  onClick={handleExportRosterCSV}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                  title="Export Roster as CSV"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
              </div>

              {/* Team Aggregated Averages Widget */}
              <div className="grid grid-cols-4 gap-2 text-center font-mono">
                <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block">Roster</span>
                  <span className="text-xs font-black text-cyan-400">{activeTeamPlayers.length} Players</span>
                </div>
                <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block">Team PPG</span>
                  <span className="text-xs font-black text-emerald-400">{activeTeamStats.avgPpg}</span>
                </div>
                <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block">Avg GPA</span>
                  <span className="text-xs font-black text-amber-400">{activeTeamStats.avgGpa}</span>
                </div>
                <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block">Verified</span>
                  <span className="text-xs font-black text-blue-400">{activeTeamStats.verifiedCount}</span>
                </div>
              </div>

              {/* Active Linked Roster Player List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 font-bold uppercase text-[10px]">
                    Linked Profile IDs ({activeTeamPlayers.length})
                  </span>
                  <span className="text-[10px] text-slate-500">Tap ID to copy</span>
                </div>

                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {activeTeamPlayers.length > 0 ? (
                    activeTeamPlayers.map((player, idx) => {
                      const profileId = player.athleteId || `J1P-${player.uid.substring(0, 6)}`;
                      const isCopied = copiedId === profileId;
                      const elig = verifyAthleteEligibility(player.dateOfBirth, selectedDivision);

                      return (
                        <div
                          key={player.uid || idx}
                          className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={player.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100&auto=format&fit=crop&q=80'}
                              alt={player.displayName}
                              className="w-7 h-7 rounded-xl object-cover border border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-white truncate">
                                  {player.displayName}
                                </span>
                                {player.jerseyNumber && (
                                  <span className="text-[10px] font-mono text-amber-400 font-bold">
                                    #{player.jerseyNumber}
                                  </span>
                                )}
                                {player.isVerified && (
                                  <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                <span>{player.position || 'ATH'}</span>
                                <span>•</span>
                                <button
                                  onClick={() => handleCopyProfileId(profileId)}
                                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5 cursor-pointer"
                                  title="Click to copy Profile ID"
                                >
                                  <span>{profileId}</span>
                                  {isCopied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${
                                elig.eligible ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {elig.eligible ? 'Eligible' : 'Age Flag'}
                            </span>
                            <button
                              onClick={() => handleRemoveSinglePlayer(player.uid)}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-all cursor-pointer"
                              title="Unlink athlete from team"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-1">
                      <Users className="w-6 h-6 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-medium">No athletes assigned to this team.</p>
                      <p className="text-[10px] text-slate-500">
                        Select athletes from the right column to link their Profile IDs.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (7 Cols): Multi-Select Athlete Directory Pool & Linking Engine */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search, Filter Bar & Multi-Select Action Panel */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search athlete by Profile ID (e.g. J1P-849201), Name, Jersey #, or School..."
                className="w-full pl-9.5 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Filter:</span>
                {[
                  { id: 'all', label: 'All Pool' },
                  { id: 'unassigned', label: 'Free / Unassigned' },
                  { id: 'current_team', label: 'In Current Team' },
                  { id: 'verified_only', label: 'Verified D1' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setAssignmentFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      assignmentFilter === f.id
                        ? 'bg-slate-800 text-[#FF6A00] border border-[#FF6A00]/40'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Select All / Clear Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={selectAllFiltered}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <CheckSquare className="w-3 h-3 text-cyan-400" />
                  <span>Select All ({filteredAthletes.length})</span>
                </button>
                {selectedAthleteUids.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-mono transition-all cursor-pointer"
                  >
                    Clear ({selectedAthleteUids.size})
                  </button>
                )}
              </div>
            </div>

            {/* BATCH ACTION BAR: Appears when 1 or more athletes are selected */}
            <AnimatePresence>
              {selectedAthleteUids.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-2xl bg-gradient-to-r from-[#FF6A00]/20 via-amber-500/20 to-cyan-500/20 border border-[#FF6A00]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 overflow-hidden"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#FF6A00] text-white text-xs font-mono font-black flex items-center justify-center">
                      {selectedAthleteUids.size}
                    </span>
                    <span className="text-xs font-bold text-white">
                      Athletes selected for multi-action
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleAssignSelectedToActiveTeam}
                      disabled={!activeTeam}
                      className="px-3.5 py-1.5 rounded-xl bg-[#FF6A00] hover:bg-[#e55f00] text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Link to {activeTeam ? activeTeam.name : 'Selected Team'}</span>
                    </button>

                    <button
                      onClick={handleRemoveSelectedFromActiveTeam}
                      disabled={!activeTeam}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Unlink</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Athletes Multi-Select Scrollable Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredAthletes.length > 0 ? (
              filteredAthletes.map(athlete => {
                const isSelected = selectedAthleteUids.has(athlete.uid);
                const isCurrentlyAssigned = activeTeam?.playerUids.includes(athlete.uid);
                const assignedTeam = teams.find(t => t.playerUids.includes(athlete.uid));
                const profileId = athlete.athleteId || `J1P-${athlete.uid.substring(0, 6)}`;
                const isCopied = copiedId === profileId;
                const elig = verifyAthleteEligibility(athlete.dateOfBirth, selectedDivision);

                return (
                  <div
                    key={athlete.uid}
                    onClick={() => toggleAthleteSelection(athlete.uid)}
                    className={`p-3.5 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800/95 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg'
                        : isCurrentlyAssigned
                        ? 'bg-slate-900/80 border-emerald-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                    }`}
                  >
                    {/* Top Row: Checkbox, Avatar, Name & Profile ID */}
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 text-cyan-400 shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 fill-cyan-400/20" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <img
                        src={athlete.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100&auto=format&fit=crop&q=80'}
                        alt={athlete.displayName}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-700 shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-xs text-white truncate">{athlete.displayName}</h4>
                          {athlete.jerseyNumber && (
                            <span className="text-[10px] font-mono text-amber-400 font-bold">
                              #{athlete.jerseyNumber}
                            </span>
                          )}
                          {athlete.isVerified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          )}
                        </div>

                        {/* Profile ID with Quick Copy */}
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] font-mono font-black text-cyan-300 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/50">
                            {profileId}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyProfileId(profileId);
                            }}
                            className="text-slate-400 hover:text-cyan-300 p-0.5 rounded cursor-pointer"
                            title="Copy Profile ID"
                          >
                            {isCopied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: School, Position, Metrics */}
                    <div className="pt-2 border-t border-slate-800/60 grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
                      <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <span className="text-[8px] text-slate-500 block">POS</span>
                        <span className="font-bold text-slate-300 truncate block">
                          {athlete.position || athlete.primaryPosition || 'ATH'}
                        </span>
                      </div>
                      <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <span className="text-[8px] text-slate-500 block">GPA</span>
                        <span className="font-bold text-amber-400">{athlete.gpa || '3.5'}</span>
                      </div>
                      <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <span className="text-[8px] text-slate-500 block">HT / WT</span>
                        <span className="font-bold text-slate-300">
                          {athlete.height || "6'0\""}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Current Assignment Badge & Eligibility Status */}
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                      {assignedTeam ? (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 truncate max-w-[150px]">
                          Team: <strong className="text-white">{assignedTeam.name}</strong>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-950/50 text-cyan-300 border border-cyan-800/40">
                          Unassigned
                        </span>
                      )}

                      <span
                        className={`px-1.5 py-0.5 rounded-md ${
                          elig.eligible ? 'text-emerald-400 bg-emerald-950/60' : 'text-amber-400 bg-amber-950/60'
                        }`}
                      >
                        {elig.eligible ? 'Age Verified' : 'Age Flag'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 p-10 rounded-3xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-2">
                <Search className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No athletes match your filter</h4>
                <p className="text-xs text-slate-400">
                  Try adjusting your search query or reset the filter to view all athletes in the database.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setAssignmentFilter('all');
                    setSportFilter('All');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Create Team Modal */}
      <AnimatePresence>
        {showCreateTeamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#FF6A00]" />
                  <h3 className="text-base font-black text-white">Create Team in Division</h3>
                </div>
                <button
                  onClick={() => setShowCreateTeamModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
                {user && (!profile?.profileComplete && !profile?.profileCompleted && (!profile?.teamName || !profile?.schoolName)) && (
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-mono flex items-center justify-between gap-2">
                    <span>💡 Tip: Set up your Coach/Organization Profile to auto-brand rosters and uniforms.</span>
                    <Link to="/profile" className="underline font-bold text-white shrink-0 hover:text-[#00F0D0]">Edit Profile</Link>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                    Team Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    placeholder="e.g. Phoenix Rising Select"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                      Division:
                    </label>
                    <select
                      value={newTeamDivision}
                      onChange={e => setNewTeamDivision(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
                    >
                      {tournament.divisions.map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                      Bracket Seed:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={32}
                      value={newTeamSeed}
                      onChange={e => setNewTeamSeed(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                    Head Coach Name:
                  </label>
                  <input
                    type="text"
                    value={newTeamHeadCoach}
                    onChange={e => setNewTeamHeadCoach(e.target.value)}
                    placeholder="e.g. Coach David Sterling"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase block mb-1.5">
                    Team Accent Color:
                  </label>
                  <div className="flex items-center gap-2">
                    {['#00B8D4', '#FF6A00', '#10B981', '#8B5CF6', '#EF4444', '#E5B868', '#EC4899'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewTeamColor(c)}
                        className={`w-7 h-7 rounded-xl border transition-all cursor-pointer ${
                          newTeamColor === c ? 'ring-2 ring-white scale-110' : 'border-slate-700 opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateTeamModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#e55f00] text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Create & Add to Roster
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TournamentRosterManager;
