import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TeamItem, 
  UserProfile, 
  EventBracket, 
  BracketNodeMatch, 
  EventItem, 
  SportType 
} from '../../types';
import { 
  SAMPLE_ATHLETE_DIRECTORY, 
  lookupAthleteByProfileId, 
  generateAthleteProfileId, 
  computeTeamAggregateStats, 
  TeamAggregateStats,
  saveTeamRosterWithProfiles 
} from '../../services/bracketRosterSyncService';
import { 
  verifyAthleteEligibility, 
  calculateAgeOnDate, 
  getDivisionMaxAge, 
  registerTeamToFirestore 
} from '../../services/tournamentHubService';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  Edit2, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Trophy, 
  Sparkles, 
  Layers, 
  Copy, 
  Check, 
  Activity, 
  TrendingUp, 
  Star, 
  GraduationCap, 
  Calendar, 
  RefreshCw, 
  Share2, 
  Printer, 
  ExternalLink,
  ChevronRight,
  Flame,
  Award,
  Zap
} from 'lucide-react';

interface BracketTeamRosterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bracket?: EventBracket | null;
  event?: EventItem | null;
  onBracketUpdated?: (updatedBracket: EventBracket) => void;
  onTeamUpdated?: (updatedTeam: TeamItem) => void;
  initialDivision?: string;
  initialSelectedTeamId?: string;
}

const DEFAULT_DIVISIONS = [
  'All Divisions',
  '10U (Coed)',
  '12U (Boys)',
  '14U (Elite)',
  '16U (Junior)',
  'High School Varsity',
  'Open Adult'
];

export const BracketTeamRosterManagerModal: React.FC<BracketTeamRosterManagerModalProps> = ({
  isOpen,
  onClose,
  bracket,
  event,
  onBracketUpdated,
  onTeamUpdated,
  initialDivision = 'All Divisions',
  initialSelectedTeamId
}) => {
  const { user, role } = useAuth();
  const isAdminOrCoach = (role as string) === 'admin' || (role as string) === 'coach' || (role as string) === 'director' || (role as string) === 'organization' || !role;

  // Divisions State
  const [divisions, setDivisions] = useState<string[]>(DEFAULT_DIVISIONS);
  const [selectedDivision, setSelectedDivision] = useState<string>(initialDivision);
  const [showAddDivisionModal, setShowAddDivisionModal] = useState<boolean>(false);
  const [newDivisionName, setNewDivisionName] = useState<string>('');
  const [newDivisionMaxAge, setNewDivisionMaxAge] = useState<number>(14);

  // Teams State
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamItem | null>(null);
  const [showAddTeamModal, setShowAddTeamModal] = useState<boolean>(false);

  // New Team Form State
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [newTeamDivision, setNewTeamDivision] = useState<string>('14U (Elite)');
  const [newCoachName, setNewCoachName] = useState<string>(user?.displayName || 'Coach');
  const [newCoachEmail, setNewCoachEmail] = useState<string>(user?.email || '');
  const [newTeamSeed, setNewTeamSeed] = useState<number>(1);

  // Athlete Search & Profile Sync State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom Quick Player Creation Modal
  const [showCreatePlayerModal, setShowCreatePlayerModal] = useState<boolean>(false);
  const [customPlayerName, setCustomPlayerName] = useState<string>('');
  const [customJerseyNumber, setCustomJerseyNumber] = useState<string>('10');
  const [customPosition, setCustomPosition] = useState<string>('PG');
  const [customDob, setCustomDob] = useState<string>('2011-05-15');
  const [customGpa, setCustomGpa] = useState<string>('3.8');
  const [customPpg, setCustomPpg] = useState<number>(18.5);

  // Detail Modal State for Individual Athlete Scout Card
  const [scoutAthlete, setScoutAthlete] = useState<UserProfile | null>(null);

  // Bracket Seed Assignment Modal
  const [showSeedModal, setShowSeedModal] = useState<boolean>(false);
  const [targetMatchId, setTargetMatchId] = useState<string>('');
  const [targetSlot, setTargetSlot] = useState<'home' | 'away'>('home');

  // Toasts
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reference Event Date for Age Verification
  const referenceEventDate = event?.startDate || event?.date || new Date().toISOString().split('T')[0];

  // Initialize and load teams for this event/bracket
  useEffect(() => {
    if (!isOpen) return;

    // Load teams from localStorage or seed teams
    const eventId = event?.id || bracket?.id || 'bracket-general';
    const key = `just1play_teams_${eventId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed: TeamItem[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setTeams(parsed);
          if (initialSelectedTeamId) {
            const found = parsed.find(t => t.id === initialSelectedTeamId);
            if (found) setSelectedTeam(found);
          } else if (!selectedTeam && parsed.length > 0) {
            setSelectedTeam(parsed[0]);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Error reading teams from storage:', err);
    }

    // Seed default tournament teams if none exist
    const seedTeams: TeamItem[] = [
      {
        id: 'team-jc-ballers',
        eventId: eventId,
        teamName: 'Jersey City Ballers',
        division: '14U (Elite)',
        coachId: 'coach-1',
        coachName: 'Coach Marcus Sr.',
        coachEmail: 'coach.marcus@jcballers.org',
        paymentStatus: 'Paid',
        seed: 1,
        roster: ['ath-101', 'ath-102'],
        rosterDetails: [SAMPLE_ATHLETE_DIRECTORY[0], SAMPLE_ATHLETE_DIRECTORY[1]],
        createdAt: new Date().toISOString()
      },
      {
        id: 'team-paterson-vipers',
        eventId: eventId,
        teamName: 'Paterson Vipers',
        division: '14U (Elite)',
        coachId: 'coach-2',
        coachName: 'Coach Darryl Jenkins',
        coachEmail: 'darryl@patersonvipers.com',
        paymentStatus: 'Paid',
        seed: 2,
        roster: ['ath-103'],
        rosterDetails: [SAMPLE_ATHLETE_DIRECTORY[2]],
        createdAt: new Date().toISOString()
      },
      {
        id: 'team-bergen-elite',
        eventId: eventId,
        teamName: 'Bergen Catholic Elite',
        division: 'High School Varsity',
        coachId: 'coach-3',
        coachName: 'Coach Frank Moretti',
        coachEmail: 'fmoretti@bergencatholic.org',
        paymentStatus: 'Paid',
        seed: 3,
        roster: ['ath-104'],
        rosterDetails: [SAMPLE_ATHLETE_DIRECTORY[3]],
        createdAt: new Date().toISOString()
      },
      {
        id: 'team-newark-express',
        eventId: eventId,
        teamName: 'Newark Express',
        division: '12U (Boys)',
        coachId: 'coach-4',
        coachName: 'Coach Antoine Rivers',
        coachEmail: 'arivers@newarkexpress.com',
        paymentStatus: 'Paid',
        seed: 4,
        roster: ['ath-105'],
        rosterDetails: [SAMPLE_ATHLETE_DIRECTORY[4]],
        createdAt: new Date().toISOString()
      },
      {
        id: 'team-philly-blitz',
        eventId: eventId,
        teamName: 'Philly Blitz',
        division: '14U (Elite)',
        coachId: 'coach-5',
        coachName: 'Coach Terrence Cole',
        coachEmail: 'tcole@phillyblitz.org',
        paymentStatus: 'Paid',
        seed: 5,
        roster: ['ath-106'],
        rosterDetails: [SAMPLE_ATHLETE_DIRECTORY[5]],
        createdAt: new Date().toISOString()
      },
      {
        id: 'team-edison-valkyries',
        eventId: eventId,
        teamName: 'Edison Valkyries',
        division: 'High School Varsity',
        coachId: 'coach-6',
        coachName: 'Coach Elena Ramos',
        coachEmail: 'eramos@valkyriessports.com',
        paymentStatus: 'Paid',
        seed: 6,
        roster: ['ath-107'],
        rosterDetails: [SAMPLE_ATHLETE_DIRECTORY[6]],
        createdAt: new Date().toISOString()
      }
    ];

    setTeams(seedTeams);
    setSelectedTeam(seedTeams[0]);
    try {
      localStorage.setItem(key, JSON.stringify(seedTeams));
    } catch (e) {
      console.warn('Failed saving initial seed teams:', e);
    }
  }, [isOpen, event?.id, bracket?.id]);

  // Handle Athlete Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await lookupAthleteByProfileId(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered teams list based on active division tab
  const filteredTeams = selectedDivision === 'All Divisions'
    ? teams
    : teams.filter(t => t.division.toLowerCase().includes(selectedDivision.toLowerCase().replace(' (coed)', '').replace(' (boys)', '').replace(' (elite)', '').replace(' (junior)', '').trim()));

  // Active Team Aggregate Stats
  const activeTeamStats: TeamAggregateStats = selectedTeam 
    ? computeTeamAggregateStats(selectedTeam.rosterDetails || [], selectedTeam.division, referenceEventDate)
    : {
      totalPlayers: 0,
      avgPpg: 0,
      totalPpg: 0,
      avgRebounds: 0,
      avgAssists: 0,
      avgSteals: 0,
      avgBlocks: 0,
      avgHeightInches: 0,
      avgHeightDisplay: '--',
      avgGpa: 0,
      avgAge: 0,
      verifiedCount: 0,
      eligibilityPassCount: 0,
      flaggedCount: 0,
      speedRating: 0,
      iqRating: 0
    };

  // Add new Division
  const handleAddDivision = () => {
    if (!newDivisionName.trim()) {
      showToast('Please enter a valid division title.', true);
      return;
    }

    const formatted = `${newDivisionName.trim()}`;
    if (divisions.includes(formatted)) {
      showToast('Division already exists.', true);
      return;
    }

    setDivisions([...divisions, formatted]);
    setSelectedDivision(formatted);
    setNewDivisionDivisionForTeam(formatted);
    setShowAddDivisionModal(false);
    setNewDivisionName('');
    showToast(`Division "${formatted}" successfully created!`);
  };

  const setNewDivisionDivisionForTeam = (divName: string) => {
    setNewTeamDivision(divName);
  };

  // Add New Team
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      showToast('Please enter a team name.', true);
      return;
    }

    const eventId = event?.id || bracket?.id || 'bracket-general';
    const newTeam: TeamItem = {
      id: `team-${Date.now()}`,
      eventId,
      teamName: newTeamName.trim(),
      division: newTeamDivision,
      coachId: user?.uid || 'coach-local',
      coachName: newCoachName.trim() || 'Coach',
      coachEmail: newCoachEmail.trim() || 'coach@just1play.com',
      paymentStatus: 'Paid',
      seed: newTeamSeed,
      roster: [],
      rosterDetails: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...teams, newTeam];
    setTeams(updated);
    setSelectedTeam(newTeam);
    setShowAddTeamModal(false);
    setNewTeamName('');

    // Persist to local & Firestore
    try {
      localStorage.setItem(`just1play_teams_${eventId}`, JSON.stringify(updated));
      await registerTeamToFirestore(newTeam);
    } catch (err) {
      console.warn('Error saving new team to Firestore:', err);
    }

    if (onTeamUpdated) {
      onTeamUpdated(newTeam);
    }

    showToast(`Team "${newTeam.teamName}" added to ${newTeam.division}!`);
  };

  // Delete Team
  const handleDeleteTeam = (teamId: string) => {
    if (!confirm('Are you sure you want to remove this team from the tournament?')) return;

    const eventId = event?.id || bracket?.id || 'bracket-general';
    const updated = teams.filter(t => t.id !== teamId);
    setTeams(updated);
    if (selectedTeam?.id === teamId) {
      setSelectedTeam(updated.length > 0 ? updated[0] : null);
    }

    try {
      localStorage.setItem(`just1play_teams_${eventId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }

    showToast('Team deleted.');
  };

  // Add Athlete to Active Team Roster
  const handleAddAthleteToTeam = async (athlete: UserProfile) => {
    if (!selectedTeam) {
      showToast('Please select a team first.', true);
      return;
    }

    const currentRoster = selectedTeam.roster || [];
    const currentDetails = selectedTeam.rosterDetails || [];

    if (currentRoster.includes(athlete.uid)) {
      showToast(`${athlete.displayName} is already on the roster.`, true);
      return;
    }

    // Automated Division Eligibility & Age Check
    const eligibility = verifyAthleteEligibility(
      athlete.dateOfBirth || '2011-05-10',
      selectedTeam.division,
      referenceEventDate
    );

    const updatedUids = [...currentRoster, athlete.uid];
    const updatedDetails = [...currentDetails, athlete];

    const updatedTeam: TeamItem = {
      ...selectedTeam,
      roster: updatedUids,
      rosterDetails: updatedDetails,
      updatedAt: new Date().toISOString()
    };

    // Update in state
    setSelectedTeam(updatedTeam);
    setTeams(teams.map(t => t.id === updatedTeam.id ? updatedTeam : t));
    setSearchQuery('');
    setSearchResults([]);

    // Save to Firestore and local cache
    await saveTeamRosterWithProfiles(
      updatedTeam.id,
      updatedUids,
      updatedDetails,
      event?.id || bracket?.id
    );

    if (onTeamUpdated) {
      onTeamUpdated(updatedTeam);
    }

    if (!eligibility.eligible) {
      showToast(`⚠️ Added with Age Flag: ${eligibility.reason}`, true);
    } else {
      showToast(`✅ ${athlete.displayName} synced with Profile ID (${athlete.athleteId || athlete.uid})!`);
    }
  };

  // Quick Create & Register Custom Athlete
  const handleCreateCustomAthlete = async () => {
    if (!customPlayerName.trim()) {
      showToast('Please enter athlete name.', true);
      return;
    }

    if (!selectedTeam) {
      showToast('Please select a team.', true);
      return;
    }

    const newProfileId = generateAthleteProfileId();
    const newUid = `ath-${Date.now()}`;

    const newAthlete: UserProfile = {
      uid: newUid,
      athleteId: newProfileId,
      email: `${customPlayerName.toLowerCase().replace(/\s+/g, '.')}@athlete.just1play.com`,
      displayName: customPlayerName.trim(),
      role: 'athlete',
      sport: (bracket?.sport as SportType) || (event?.sport as SportType) || 'Basketball',
      position: customPosition,
      primaryPosition: customPosition,
      jerseyNumber: customJerseyNumber,
      teamName: selectedTeam.teamName,
      gradYear: '2028',
      dateOfBirth: customDob,
      highSchool: 'Tri-State Sports Academy',
      state: 'NJ',
      height: "6'1\"",
      weight: '175 lbs',
      gpa: customGpa,
      bio: 'Verified tournament prospect with active athletic profile ID.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      isVerified: true,
      social: {},
      stats: {
        points: customPpg,
        rebounds: 5.5,
        assists: 4.2,
        steals: 1.8,
        blocks: 0.9,
        gamesPlayed: 16
      },
      performanceMetrics: {
        speed: 88,
        agility: 90,
        strength: 84,
        vertical: 88,
        stamina: 90,
        iq: 92
      },
      mediaUrls: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to Sample Directory for immediate subsequent search
    SAMPLE_ATHLETE_DIRECTORY.push(newAthlete);

    await handleAddAthleteToTeam(newAthlete);
    setShowCreatePlayerModal(false);
    setCustomPlayerName('');
    showToast(`Created & Synced Profile ID: ${newProfileId}`);
  };

  // Remove Athlete from Roster
  const handleRemoveAthlete = async (athleteUid: string) => {
    if (!selectedTeam) return;

    const updatedUids = (selectedTeam.roster || []).filter(id => id !== athleteUid);
    const updatedDetails = (selectedTeam.rosterDetails || []).filter(a => a.uid !== athleteUid);

    const updatedTeam: TeamItem = {
      ...selectedTeam,
      roster: updatedUids,
      rosterDetails: updatedDetails,
      updatedAt: new Date().toISOString()
    };

    setSelectedTeam(updatedTeam);
    setTeams(teams.map(t => t.id === updatedTeam.id ? updatedTeam : t));

    await saveTeamRosterWithProfiles(
      updatedTeam.id,
      updatedUids,
      updatedDetails,
      event?.id || bracket?.id
    );

    if (onTeamUpdated) {
      onTeamUpdated(updatedTeam);
    }

    showToast('Athlete removed from roster.');
  };

  // Copy Profile ID
  const handleCopyId = (idString: string) => {
    navigator.clipboard.writeText(idString);
    setCopiedId(idString);
    setTimeout(() => setCopiedId(null), 2500);
    showToast(`Copied Profile ID: ${idString}`);
  };

  // Assign Active Team to a Bracket Match Slot
  const handleAssignToBracket = () => {
    if (!selectedTeam || !bracket || !targetMatchId) {
      showToast('Select a target match to seed this team.', true);
      return;
    }

    const updatedMatches = bracket.matches.map(m => {
      if (m.id === targetMatchId) {
        return {
          ...m,
          homeTeam: targetSlot === 'home' ? selectedTeam.teamName : m.homeTeam,
          awayTeam: targetSlot === 'away' ? selectedTeam.teamName : m.awayTeam
        };
      }
      return m;
    });

    const updatedBracket: EventBracket = {
      ...bracket,
      matches: updatedMatches,
      lastUpdated: new Date().toISOString()
    };

    if (onBracketUpdated) {
      onBracketUpdated(updatedBracket);
    }

    setShowSeedModal(false);
    showToast(`✅ "${selectedTeam.teamName}" assigned to Match #${targetMatchId} (${targetSlot.toUpperCase()})!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div 
        id="bracket-roster-manager-modal"
        className="w-full max-w-7xl bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,229,255,0.15)] flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.3)]">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black tracking-tight text-white uppercase font-sans">
                  Tournament Team & Roster Manager
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Auto Stat Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Event: <strong className="text-slate-200">{bracket?.eventName || event?.title || 'Tournament Championship'}</strong></span>
                <span>•</span>
                <span>Sport: <strong className="text-cyan-400">{bracket?.sport || event?.sport || 'Basketball'}</strong></span>
                <span>•</span>
                <span>Reference Date: <strong className="text-slate-200">{referenceEventDate}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {bracket && (
              <button
                onClick={() => setShowSeedModal(true)}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Trophy className="w-4 h-4 text-cyan-400" />
                <span>Seed to Bracket</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700"
              title="Close Roster Manager"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DIVISION CHIPS BAR */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Divisions:</span>
            </span>

            {divisions.map((div) => {
              const count = div === 'All Divisions' 
                ? teams.length 
                : teams.filter(t => t.division.toLowerCase().includes(div.toLowerCase().replace(' (coed)', '').replace(' (boys)', '').replace(' (elite)', '').replace(' (junior)', '').trim())).length;
              const isSelected = selectedDivision === div;

              return (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  <span>{div}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-slate-950/40 text-slate-950 font-bold' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {isAdminOrCoach && (
              <button
                onClick={() => setShowAddDivisionModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 hover:text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Add new competition division or age group"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Division</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-400 font-mono">
              Age Limit: <strong className="text-cyan-400">{getDivisionMaxAge(selectedDivision)} & Under</strong>
            </span>
          </div>
        </div>

        {/* MAIN BODY: SPLIT VIEW (TEAMS LIST & ROSTER EDITOR) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* LEFT COLUMN: TEAMS IN DIVISION (col-span-4) */}
          <div className="lg:col-span-4 bg-slate-900/90 border-r border-slate-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Registered Teams ({filteredTeams.length})
                </h3>
                <p className="text-[11px] text-slate-500">Select a team to edit player roster & sync profile stats</p>
              </div>

              {isAdminOrCoach && (
                <button
                  onClick={() => setShowAddTeamModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Team</span>
                </button>
              )}
            </div>

            {/* TEAMS LIST */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredTeams.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No teams found for division <span className="text-cyan-400">{selectedDivision}</span>.</p>
                  <button
                    onClick={() => setShowAddTeamModal(true)}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Team in this Division</span>
                  </button>
                </div>
              ) : (
                filteredTeams.map((team) => {
                  const isSelected = selectedTeam?.id === team.id;
                  const rosterCount = team.roster?.length || 0;
                  const teamAggregate = computeTeamAggregateStats(team.rosterDetails || [], team.division, referenceEventDate);

                  return (
                    <div
                      key={team.id}
                      onClick={() => setSelectedTeam(team)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 relative overflow-hidden ${
                        isSelected
                          ? 'bg-slate-800/95 border-cyan-500/70 shadow-[0_0_20px_rgba(0,229,255,0.15)] ring-1 ring-cyan-500/50'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-850/60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 text-[10px] font-black font-mono flex items-center justify-center border border-cyan-500/30">
                              #{team.seed || 1}
                            </span>
                            <h4 className="font-bold text-sm text-white">{team.teamName}</h4>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Division: <span className="text-cyan-300 font-semibold">{team.division}</span>
                          </p>
                          <p className="text-[10px] text-slate-500">Coach: {team.coachName}</p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                            {team.paymentStatus || 'Paid'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {rosterCount} Players
                          </span>
                        </div>
                      </div>

                      {/* Mini Stats Bar */}
                      <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Scoring Avg: <strong className="text-white">{teamAggregate.avgPpg} PPG</strong></span>
                        <span>Avg GPA: <strong className="text-emerald-400">{teamAggregate.avgGpa}</strong></span>
                        <span>Speed: <strong className="text-cyan-400">{teamAggregate.speedRating}</strong></span>
                      </div>

                      {isSelected && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_#00E5FF]"></div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: ACTIVE TEAM ROSTER & STAT SYNC ENGINE (col-span-8) */}
          <div className="lg:col-span-8 bg-slate-950/40 flex flex-col overflow-hidden">
            {selectedTeam ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* ACTIVE TEAM HEADER & AGGREGATE STATS RADAR */}
                <div className="p-5 bg-gradient-to-r from-slate-900/95 via-slate-850/90 to-slate-900/95 border-b border-slate-800 space-y-4">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-lg font-black text-white font-sans uppercase">
                          {selectedTeam.teamName}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono">
                          {selectedTeam.division}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          Seed #{selectedTeam.seed || 1}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>Coach: <strong className="text-slate-200">{selectedTeam.coachName}</strong> ({selectedTeam.coachEmail})</span>
                        <span>•</span>
                        <span>Roster Size: <strong className="text-cyan-400">{selectedTeam.roster?.length || 0} Athletes</strong></span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setShowSeedModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Seed into Bracket Node"
                      >
                        <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Assign to Bracket</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTeam(selectedTeam.id)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer"
                        title="Delete Team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* TEAM AGGREGATE STATS METRICS ROW */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Projected PPG</span>
                      <span className="text-base font-black font-mono text-cyan-400">{activeTeamStats.avgPpg}</span>
                      <span className="text-[9px] text-slate-500 block">per player avg</span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Avg Rebounds</span>
                      <span className="text-base font-black font-mono text-emerald-400">{activeTeamStats.avgRebounds}</span>
                      <span className="text-[9px] text-slate-500 block">RPG aggregate</span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Avg Assists</span>
                      <span className="text-base font-black font-mono text-amber-400">{activeTeamStats.avgAssists}</span>
                      <span className="text-[9px] text-slate-500 block">APG aggregate</span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Avg Height</span>
                      <span className="text-base font-black font-mono text-purple-400">{activeTeamStats.avgHeightDisplay}</span>
                      <span className="text-[9px] text-slate-500 block">roster wingspan</span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Team GPA</span>
                      <span className="text-base font-black font-mono text-emerald-400">{activeTeamStats.avgGpa}</span>
                      <span className="text-[9px] text-slate-500 block">academic standing</span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Eligibility</span>
                      <span className={`text-base font-black font-mono ${
                        activeTeamStats.flaggedCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {activeTeamStats.eligibilityPassCount}/{activeTeamStats.totalPlayers}
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        {activeTeamStats.flaggedCount > 0 ? `${activeTeamStats.flaggedCount} Flagged` : '100% Eligible'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PROFILE ID LOOKUP & SYNC SEARCH BAR */}
                <div className="p-4 bg-slate-900/50 border-b border-slate-800 relative space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Athlete by Profile ID (e.g. J1P-849201), Athlete Name, or UID..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                      />
                      {isSearching && (
                        <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>

                    <button
                      onClick={() => setShowCreatePlayerModal(true)}
                      className="px-3.5 py-2.5 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Create & Generate Profile ID</span>
                    </button>
                  </div>

                  {/* QUICK DEMO PROFILE ID CHIPS */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>Quick Sync Profile IDs:</span>
                    </span>
                    {SAMPLE_ATHLETE_DIRECTORY.slice(0, 4).map((ath) => (
                      <button
                        key={ath.uid}
                        onClick={() => handleAddAthleteToTeam(ath)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-slate-700 hover:border-cyan-500/50 flex items-center gap-1.5 transition-all cursor-pointer"
                        title={`Sync ${ath.displayName} (${ath.athleteId})`}
                      >
                        <span className="text-cyan-400 font-bold">{ath.athleteId}</span>
                        <span>•</span>
                        <span>{ath.displayName}</span>
                        <span className="text-slate-500 text-[9px]">({(ath.stats as any)?.points || 20} PPG)</span>
                      </button>
                    ))}
                  </div>

                  {/* AUTOCOMPLETE DROPDOWN SEARCH RESULTS */}
                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-4 right-4 top-[105%] z-30 bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
                      >
                        <div className="p-2 bg-slate-950/80 border-b border-slate-800 text-[10px] font-mono text-slate-400 flex justify-between">
                          <span>MATCHED ATHLETES ({searchResults.length})</span>
                          <span>Click to auto-sync stats to roster</span>
                        </div>
                        {searchResults.map((ath) => {
                          const isAlreadyOnRoster = selectedTeam.roster?.includes(ath.uid);
                          const elig = verifyAthleteEligibility(ath.dateOfBirth, selectedTeam.division, referenceEventDate);

                          return (
                            <div
                              key={ath.uid}
                              onClick={() => !isAlreadyOnRoster && handleAddAthleteToTeam(ath)}
                              className={`p-3 border-b border-slate-800/60 flex items-center justify-between gap-3 transition-all ${
                                isAlreadyOnRoster 
                                  ? 'opacity-50 cursor-not-allowed bg-slate-950/40' 
                                  : 'hover:bg-cyan-500/10 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={ath.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100&auto=format&fit=crop&q=80'}
                                  alt={ath.displayName}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-xs text-white">{ath.displayName}</h5>
                                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-mono text-[9px] font-bold border border-cyan-500/40">
                                      {ath.athleteId || ath.uid}
                                    </span>
                                    {ath.isVerified && (
                                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400">
                                    #{ath.jerseyNumber || '0'} • {ath.position || 'Athlete'} • {ath.highSchool || 'Academy'} • Class of {ath.gradYear || '2028'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right font-mono text-[10px]">
                                  <span className="text-cyan-400 font-bold block">
                                    {(ath.stats as any)?.points || 0} PPG / {(ath.stats as any)?.assists || 0} APG
                                  </span>
                                  <span className={`text-[9px] ${elig.eligible ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {elig.eligible ? `Eligible (Age ${elig.age})` : `Flag: Age ${elig.age}`}
                                  </span>
                                </div>

                                <button
                                  disabled={isAlreadyOnRoster}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono ${
                                    isAlreadyOnRoster
                                      ? 'bg-slate-800 text-slate-500'
                                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black'
                                  }`}
                                >
                                  {isAlreadyOnRoster ? 'Added' : 'Sync Roster'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ROSTER TABLE / GRID */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span>Active Team Roster ({selectedTeam.rosterDetails?.length || 0} Athletes)</span>
                    </h4>

                    <span className="text-[11px] text-slate-400 font-mono">
                      Division Limit: <strong className="text-cyan-400">{selectedTeam.division}</strong>
                    </span>
                  </div>

                  {!selectedTeam.rosterDetails || selectedTeam.rosterDetails.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                      <UserPlus className="w-10 h-10 text-slate-600 mx-auto" />
                      <h5 className="text-sm font-bold text-white">No Athletes On Roster Yet</h5>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Use the search bar above to enter an athlete's Profile ID (e.g. <span className="font-mono text-cyan-400 font-bold">J1P-849201</span>) to automatically pull and sync their profile stats, position, and age verification!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedTeam.rosterDetails.map((athlete) => {
                        const elig = verifyAthleteEligibility(
                          athlete.dateOfBirth,
                          selectedTeam.division,
                          referenceEventDate
                        );

                        return (
                          <div
                            key={athlete.uid}
                            className={`p-4 rounded-2xl border transition-all space-y-3 relative overflow-hidden ${
                              elig.eligible
                                ? 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/40'
                                : 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={athlete.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=120&auto=format&fit=crop&q=80'}
                                  alt={athlete.displayName}
                                  className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shrink-0"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h5 className="font-bold text-sm text-white">{athlete.displayName}</h5>
                                    {athlete.isVerified && (
                                      <span title="Verified Prospect">
                                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                      </span>
                                    )}
                                  </div>

                                  {/* Profile ID with Quick Copy */}
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 font-mono font-bold text-[10px] border border-cyan-500/30">
                                      {athlete.athleteId || athlete.uid}
                                    </span>
                                    <button
                                      onClick={() => handleCopyId(athlete.athleteId || athlete.uid)}
                                      className="p-1 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
                                      title="Copy Profile ID"
                                    >
                                      {copiedId === (athlete.athleteId || athlete.uid) ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>

                                  <p className="text-[10px] text-slate-400 mt-1">
                                    #{athlete.jerseyNumber || '0'} • {athlete.position || 'Athlete'} • {athlete.height || "6'1\""} • GPA {athlete.gpa || '3.5'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1.5">
                                {elig.eligible ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    <span>Age {elig.age} (Pass)</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    <span>Age {elig.age} &gt; {elig.maxAge}</span>
                                  </span>
                                )}

                                <button
                                  onClick={() => handleRemoveAthlete(athlete.uid)}
                                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                                  title="Remove from roster"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* AUTO-SYNCED STATS MATRIX */}
                            <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-4 gap-1.5 text-center font-mono">
                              <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
                                <span className="text-[9px] text-slate-500 block">PPG</span>
                                <span className="text-xs font-black text-cyan-400">{(athlete.stats as any)?.points || (athlete.stats as any)?.passingYards || 0}</span>
                              </div>
                              <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
                                <span className="text-[9px] text-slate-500 block">RPG</span>
                                <span className="text-xs font-black text-emerald-400">{(athlete.stats as any)?.rebounds || (athlete.stats as any)?.tackles || 0}</span>
                              </div>
                              <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
                                <span className="text-[9px] text-slate-500 block">APG</span>
                                <span className="text-xs font-black text-amber-400">{(athlete.stats as any)?.assists || (athlete.stats as any)?.passingTds || 0}</span>
                              </div>
                              <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
                                <span className="text-[9px] text-slate-500 block">SPEED</span>
                                <span className="text-xs font-black text-purple-400">{athlete.performanceMetrics?.speed || 88}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-slate-500">
                                DOB: <strong className="text-slate-400 font-mono">{athlete.dateOfBirth || '2011-05-10'}</strong>
                              </span>

                              <button
                                onClick={() => setScoutAthlete(athlete)}
                                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                              >
                                <span>View Scout Card</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div className="max-w-md space-y-3">
                  <Users className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="text-base font-bold text-white">No Team Selected</h4>
                  <p className="text-xs text-slate-400">
                    Select a team from the left sidebar or click "+ Add Team" to start managing division rosters and syncing player statistics.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Profile ID Sync Engine active • All roster edits sync in real-time</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Roster Sheet</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] cursor-pointer"
            >
              Done & Save
            </button>
          </div>
        </div>

      </div>

      {/* SUB-MODAL 1: ADD DIVISION */}
      {showAddDivisionModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-sans uppercase flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Add Tournament Division</span>
              </h3>
              <button
                onClick={() => setShowAddDivisionModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Division Title / Tier Name
                </label>
                <input
                  type="text"
                  value={newDivisionName}
                  onChange={(e) => setNewDivisionName(e.target.value)}
                  placeholder="e.g. 15U Showcase, Girls Varsity, 8U Rookies"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Maximum Athlete Age Limit
                </label>
                <input
                  type="number"
                  value={newDivisionMaxAge}
                  onChange={(e) => setNewDivisionMaxAge(Number(e.target.value))}
                  min={6}
                  max={25}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAddDivisionModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDivision}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs uppercase"
              >
                Create Division
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: ADD TEAM */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-sans uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Register Team to Division</span>
              </h3>
              <button
                onClick={() => setShowAddTeamModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Jersey City Ballers, Newark Express"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Division
                  </label>
                  <select
                    value={newTeamDivision}
                    onChange={(e) => setNewTeamDivision(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {divisions.filter(d => d !== 'All Divisions').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Seed Number
                  </label>
                  <input
                    type="number"
                    value={newTeamSeed}
                    onChange={(e) => setNewTeamSeed(Number(e.target.value))}
                    min={1}
                    max={32}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Coach Name
                  </label>
                  <input
                    type="text"
                    value={newCoachName}
                    onChange={(e) => setNewCoachName(e.target.value)}
                    placeholder="Coach Full Name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Coach Email / Contact
                  </label>
                  <input
                    type="email"
                    value={newCoachEmail}
                    onChange={(e) => setNewCoachEmail(e.target.value)}
                    placeholder="coach@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAddTeamModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
              >
                Add Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: CREATE & GENERATE ATHLETE PROFILE */}
      {showCreatePlayerModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-sans uppercase flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                <span>Create & Sync Athlete Profile</span>
              </h3>
              <button
                onClick={() => setShowCreatePlayerModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Athlete Full Name
                </label>
                <input
                  type="text"
                  value={customPlayerName}
                  onChange={(e) => setCustomPlayerName(e.target.value)}
                  placeholder="e.g. Cameron Anthony, Tyler Herro"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Jersey Number
                  </label>
                  <input
                    type="text"
                    value={customJerseyNumber}
                    onChange={(e) => setCustomJerseyNumber(e.target.value)}
                    placeholder="e.g. 23"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Position
                  </label>
                  <select
                    value={customPosition}
                    onChange={(e) => setCustomPosition(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="PG">Point Guard (PG)</option>
                    <option value="SG">Shooting Guard (SG)</option>
                    <option value="SF">Small Forward (SF)</option>
                    <option value="PF">Power Forward (PF)</option>
                    <option value="C">Center (C)</option>
                    <option value="QB">Quarterback (QB)</option>
                    <option value="WR">Wide Receiver (WR)</option>
                    <option value="CB">Cornerback (CB)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Date of Birth (DOB)
                  </label>
                  <input
                    type="date"
                    value={customDob}
                    onChange={(e) => setCustomDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Scoring PPG Avg
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={customPpg}
                    onChange={(e) => setCustomPpg(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCreatePlayerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomAthlete}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs uppercase cursor-pointer"
              >
                Generate ID & Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 4: ATHLETE SCOUT & STAT CARD */}
      {scoutAthlete && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-sans uppercase">
                  Athlete Scout Profile
                </h3>
              </div>
              <button
                onClick={() => setScoutAthlete(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={scoutAthlete.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=200&auto=format&fit=crop&q=80'}
                alt={scoutAthlete.displayName}
                className="w-16 h-16 rounded-2xl object-cover border border-cyan-500/40"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-black text-white">{scoutAthlete.displayName}</h4>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold">
                    {scoutAthlete.athleteId || scoutAthlete.uid}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  #{scoutAthlete.jerseyNumber || '1'} • {scoutAthlete.position} • {scoutAthlete.highSchool}
                </p>
                <p className="text-[11px] text-emerald-400 font-mono">
                  DOB: {scoutAthlete.dateOfBirth || 'N/A'} • GPA: {scoutAthlete.gpa || '3.8'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              "{scoutAthlete.bio || 'Verified prospect with active tournament film and verified stats profile.'}"
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[9px] text-slate-500 block">PPG</span>
                <span className="text-base font-black text-cyan-400">{(scoutAthlete.stats as any)?.points || (scoutAthlete.stats as any)?.passingYards || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[9px] text-slate-500 block">REBOUNDS</span>
                <span className="text-base font-black text-emerald-400">{(scoutAthlete.stats as any)?.rebounds || (scoutAthlete.stats as any)?.tackles || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[9px] text-slate-500 block">ASSISTS</span>
                <span className="text-base font-black text-amber-400">{(scoutAthlete.stats as any)?.assists || (scoutAthlete.stats as any)?.passingTds || 0}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setScoutAthlete(null)}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
              >
                Close Scout Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 5: SEED TEAM INTO BRACKET NODE */}
      {showSeedModal && bracket && selectedTeam && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-sans uppercase flex items-center gap-2">
                <Trophy className="w-4 h-4 text-cyan-400" />
                <span>Seed Team into Bracket Slot</span>
              </h3>
              <button
                onClick={() => setShowSeedModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Assign <strong className="text-cyan-400">{selectedTeam.teamName}</strong> (Seed #{selectedTeam.seed}) to a specific match in the bracket tree:
              </p>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Target Bracket Match
                </label>
                <select
                  value={targetMatchId}
                  onChange={(e) => setTargetMatchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="">Select a match slot...</option>
                  {bracket.matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      Match #{m.matchNumber || m.id} (Round {m.round}): {m.homeTeam} vs {m.awayTeam}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Slot Position
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetSlot('home')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      targetSlot === 'home'
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    Home Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetSlot('away')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      targetSlot === 'away'
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    Away Slot
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowSeedModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignToBracket}
                disabled={!targetMatchId}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs uppercase cursor-pointer disabled:opacity-40"
              >
                Confirm Seeding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-70 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 ${
              toastMessage.isError
                ? 'bg-red-950/90 text-red-200 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                : 'bg-slate-900/95 text-cyan-300 border-cyan-500/50 shadow-[0_0_20px_rgba(0,229,255,0.4)]'
            }`}
          >
            {toastMessage.isError ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
