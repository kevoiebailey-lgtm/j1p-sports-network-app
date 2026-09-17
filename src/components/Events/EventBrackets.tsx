import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { EventBracket, BracketNodeMatch, Tournament, EventItem } from '../../types';
import { isFirestoreQuotaExceeded, markFirestoreQuotaExceeded, isQuotaError } from '../../lib/firestoreQuotaGuard';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Crown, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Edit3, 
  Layers, 
  RefreshCw,
  PlusCircle,
  Clock,
  MapPin,
  Trash2,
  X,
  AlertTriangle,
  Target,
  Award,
  Check,
  Plus,
  Share2,
  BookOpen,
  HelpCircle,
  Users,
  UserCheck
} from 'lucide-react';
import { TournamentGuideWalkthroughModal } from '../Tournaments/TournamentGuideWalkthroughModal';
import { BracketTeamRosterManagerModal } from '../Tournaments/BracketTeamRosterManagerModal';

interface EventBracketsProps {
  canManageOverride?: boolean;
  canManage?: boolean;
  tournaments?: Tournament[];
  events?: EventItem[];
  selectedBracketId?: string;
  selectedTournamentId?: string;
  onSelectTournamentId?: (id: string) => void;
  onSelectBracketId?: (id: string) => void;
  onDeleteBracket?: (id: string) => void;
  onEditBracket?: (bracket: EventBracket) => void;
}

// Helper to convert Tournament to EventBracket
const convertTournamentToBracket = (t: Tournament): EventBracket => {
  const teams = t.participatingTeams && t.participatingTeams.length > 0 
    ? t.participatingTeams 
    : ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Epsilon', 'Team Zeta', 'Team Eta', 'Team Theta'];
  
  const count = teams.length;
  const t1 = teams[0] || 'Team 1';
  const t2 = teams[1] || 'Team 2';
  const t3 = teams[2] || 'Team 3';
  const t4 = teams[3] || 'Team 4';
  const t5 = teams[4] || 'Team 5';
  const t6 = teams[5] || 'Team 6';
  const t7 = teams[6] || 'Team 7';
  const t8 = teams[7] || 'Team 8';

  return {
    id: t.id,
    name: `${t.name} Bracket Tree`,
    eventName: t.name,
    sport: (t.sport as any) || 'Basketball',
    type: t.format || 'Single Elimination',
    participantCount: count,
    currentStage: 'Quarterfinals',
    status: t.status === 'Completed' ? 'Finalized' : 'In Progress',
    lastUpdated: t.createdAt || new Date().toISOString(),
    matches: [
      { id: `${t.id}-m1`, round: 1, matchNumber: 1, homeTeam: t1, awayTeam: t8, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '09:00 AM', subLocation: 'Court 1', nextMatchId: `${t.id}-m5`, nextMatchSlot: 'home' },
      { id: `${t.id}-m2`, round: 1, matchNumber: 2, homeTeam: t4, awayTeam: t5, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '10:15 AM', subLocation: 'Court 2', nextMatchId: `${t.id}-m5`, nextMatchSlot: 'away' },
      { id: `${t.id}-m3`, round: 1, matchNumber: 3, homeTeam: t2, awayTeam: t7, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '11:30 AM', subLocation: 'Court 1', nextMatchId: `${t.id}-m6`, nextMatchSlot: 'home' },
      { id: `${t.id}-m4`, round: 1, matchNumber: 4, homeTeam: t3, awayTeam: t6, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '12:45 PM', subLocation: 'Court 2', nextMatchId: `${t.id}-m6`, nextMatchSlot: 'away' },
      { id: `${t.id}-m5`, round: 2, matchNumber: 5, homeTeam: 'Winner M1', awayTeam: 'Winner M2', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '02:30 PM', subLocation: 'Court 1 (Main)', nextMatchId: `${t.id}-m7`, nextMatchSlot: 'home' },
      { id: `${t.id}-m6`, round: 2, matchNumber: 6, homeTeam: 'Winner M3', awayTeam: 'Winner M4', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '03:45 PM', subLocation: 'Court 2', nextMatchId: `${t.id}-m7`, nextMatchSlot: 'away' },
      { id: `${t.id}-m7`, round: 3, matchNumber: 7, homeTeam: 'Winner Semifinal 1', awayTeam: 'Winner Semifinal 2', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '06:00 PM', subLocation: 'Championship Court' }
    ]
  };
};

// Helper to convert EventItem to EventBracket
const convertEventToBracket = (e: EventItem): EventBracket => {
  const eventName = e.title || e.name || 'Event Bracket';
  const prefix = eventName.replace(/[^a-zA-Z0-9 ]/g, '').split(' ')[0] || 'Club';

  return {
    id: e.id,
    name: `${eventName} Bracket Matrix`,
    eventName: eventName,
    sport: (e.sport as any) === 'All Sports' ? 'Basketball' : (e.sport as any) || 'Basketball',
    type: 'Single Elimination',
    participantCount: e.capacity || 8,
    currentStage: 'Quarterfinals',
    status: 'In Progress',
    lastUpdated: new Date().toISOString(),
    matches: [
      { id: `${e.id}-m1`, round: 1, matchNumber: 1, homeTeam: `${prefix} Select A`, awayTeam: `${prefix} Force`, homeScore: 64, awayScore: 58, winner: `${prefix} Select A`, status: 'Completed', scheduledTime: '09:00 AM', subLocation: 'Arena 1', nextMatchId: `${e.id}-m5`, nextMatchSlot: 'home' },
      { id: `${e.id}-m2`, round: 1, matchNumber: 2, homeTeam: `${prefix} Vipers`, awayTeam: `${prefix} Thunder`, homeScore: 71, awayScore: 69, winner: `${prefix} Vipers`, status: 'Completed', scheduledTime: '10:15 AM', subLocation: 'Arena 2', nextMatchId: `${e.id}-m5`, nextMatchSlot: 'away' },
      { id: `${e.id}-m3`, round: 1, matchNumber: 3, homeTeam: `${prefix} Wildcats`, awayTeam: `${prefix} Knights`, homeScore: 80, awayScore: 75, winner: `${prefix} Wildcats`, status: 'Completed', scheduledTime: '11:30 AM', subLocation: 'Arena 1', nextMatchId: `${e.id}-m6`, nextMatchSlot: 'home' },
      { id: `${e.id}-m4`, round: 1, matchNumber: 4, homeTeam: `${prefix} Express`, awayTeam: `${prefix} Elite B`, homeScore: 62, awayScore: 59, winner: `${prefix} Express`, status: 'Completed', scheduledTime: '12:45 PM', subLocation: 'Arena 2', nextMatchId: `${e.id}-m6`, nextMatchSlot: 'away' },
      { id: `${e.id}-m5`, round: 2, matchNumber: 5, homeTeam: `${prefix} Select A`, awayTeam: `${prefix} Vipers`, homeScore: 0, awayScore: 0, winner: '', status: 'Live', scheduledTime: '02:30 PM', subLocation: 'Main Court', nextMatchId: `${e.id}-m7`, nextMatchSlot: 'home' },
      { id: `${e.id}-m6`, round: 2, matchNumber: 6, homeTeam: `${prefix} Wildcats`, awayTeam: `${prefix} Express`, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '03:45 PM', subLocation: 'Arena 2', nextMatchId: `${e.id}-m7`, nextMatchSlot: 'away' },
      { id: `${e.id}-m7`, round: 3, matchNumber: 7, homeTeam: 'Winner Semifinal 1', awayTeam: 'Winner Semifinal 2', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '06:00 PM', subLocation: 'Championship Arena' }
    ]
  };
};

// Initial seed brackets if Firestore collection is empty
const SEED_EVENT_BRACKETS: EventBracket[] = [
  {
    id: 'bracket-101',
    name: 'Tri-State Elite Showcase Bracket',
    eventName: '2026 Tri-State Summer Invitational',
    sport: 'Basketball',
    type: 'Single Elimination',
    participantCount: 8,
    currentStage: 'Semifinals',
    status: 'In Progress',
    lastUpdated: new Date().toISOString(),
    matches: [
      { id: 'm1', round: 1, matchNumber: 1, homeTeam: 'Jersey City Ballers', awayTeam: 'Newark Express', homeScore: 68, awayScore: 61, winner: 'Jersey City Ballers', status: 'Completed', scheduledTime: '09:00 AM', subLocation: 'Court 1', nextMatchId: 'm5', nextMatchSlot: 'home' },
      { id: 'm2', round: 1, matchNumber: 2, homeTeam: 'Bergen Catholic Elite', awayTeam: 'Paterson Vipers', homeScore: 74, awayScore: 79, winner: 'Paterson Vipers', status: 'Completed', scheduledTime: '10:15 AM', subLocation: 'Court 2', nextMatchId: 'm5', nextMatchSlot: 'away' },
      { id: 'm3', round: 1, matchNumber: 3, homeTeam: 'St. Anthony Select', awayTeam: 'Trenton Thunder', homeScore: 82, awayScore: 76, winner: 'St. Anthony Select', status: 'Completed', scheduledTime: '11:30 AM', subLocation: 'Court 1', nextMatchId: 'm6', nextMatchSlot: 'home' },
      { id: 'm4', round: 1, matchNumber: 4, homeTeam: 'Camden Wildcats', awayTeam: 'Elizabeth Hoops', homeScore: 65, awayScore: 71, winner: 'Elizabeth Hoops', status: 'Completed', scheduledTime: '12:45 PM', subLocation: 'Court 2', nextMatchId: 'm6', nextMatchSlot: 'away' },
      { id: 'm5', round: 2, matchNumber: 5, homeTeam: 'Jersey City Ballers', awayTeam: 'Paterson Vipers', homeScore: 78, awayScore: 75, winner: 'Jersey City Ballers', status: 'Completed', scheduledTime: '02:30 PM', subLocation: 'Court 1 (Main)', nextMatchId: 'm7', nextMatchSlot: 'home' },
      { id: 'm6', round: 2, matchNumber: 6, homeTeam: 'St. Anthony Select', awayTeam: 'Elizabeth Hoops', homeScore: 81, awayScore: 84, winner: 'Elizabeth Hoops', status: 'Completed', scheduledTime: '03:45 PM', subLocation: 'Court 2', nextMatchId: 'm7', nextMatchSlot: 'away' },
      { id: 'm7', round: 3, matchNumber: 7, homeTeam: 'Jersey City Ballers', awayTeam: 'Elizabeth Hoops', homeScore: 0, awayScore: 0, winner: '', status: 'Live', scheduledTime: '06:00 PM', subLocation: 'Court 1 (Championship Arena)' }
    ]
  },
  {
    id: 'bracket-102',
    name: 'Girls Flag Football State Championship',
    eventName: '2026 NJ Flag Football Classic',
    sport: 'Flag Football',
    type: 'Single Elimination',
    participantCount: 4,
    currentStage: 'Semifinals',
    status: 'In Progress',
    lastUpdated: new Date().toISOString(),
    matches: [
      { id: 'fb1', round: 1, matchNumber: 1, homeTeam: 'Philly Blitz', awayTeam: 'Edison Valkyries', homeScore: 28, awayScore: 21, winner: 'Philly Blitz', status: 'Completed', scheduledTime: '10:00 AM', subLocation: 'Field A', nextMatchId: 'fb3', nextMatchSlot: 'home' },
      { id: 'fb2', round: 1, matchNumber: 2, homeTeam: 'Shoreline Cougars', awayTeam: 'South Jersey Force', homeScore: 14, awayScore: 20, winner: 'South Jersey Force', status: 'Completed', scheduledTime: '11:15 AM', subLocation: 'Field B', nextMatchId: 'fb3', nextMatchSlot: 'away' },
      { id: 'fb3', round: 2, matchNumber: 3, homeTeam: 'Philly Blitz', awayTeam: 'South Jersey Force', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '02:00 PM', subLocation: 'Stadium Field' }
    ]
  }
];

export const EventBrackets: React.FC<EventBracketsProps> = ({ 
  canManageOverride,
  tournaments = [],
  events = [],
  selectedBracketId: propSelectedBracketId,
  onSelectBracketId,
  onDeleteBracket,
  onEditBracket
}) => {
  const { role, user, profile } = useAuth();
  const [firestoreBrackets, setFirestoreBrackets] = useState<EventBracket[]>(SEED_EVENT_BRACKETS);
  const [localSelectedId, setLocalSelectedId] = useState<string>('bracket-101');
  const [activeNodeMatch, setActiveNodeMatch] = useState<BracketNodeMatch | null>(null);
  const [editHomeTeam, setEditHomeTeam] = useState<string>('');
  const [editAwayTeam, setEditAwayTeam] = useState<string>('');
  const [homeScoreInput, setHomeScoreInput] = useState<number>(0);
  const [awayScoreInput, setAwayScoreInput] = useState<number>(0);
  const [selectedWinnerTeam, setSelectedWinnerTeam] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Bracket View Mode State: 'live' tree or 'prediction' challenge mode
  const [bracketMode, setBracketMode] = useState<'live' | 'prediction'>('live');

  // User Bracket Prediction Picks (matchId -> pickedTeamName)
  const [userPicks, setUserPicks] = useState<Record<string, string>>({});

  // Custom Bracket Builder Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newBracketName, setNewBracketName] = useState<string>('');
  const [newEventName, setNewEventName] = useState<string>('');
  const [newSport, setNewSport] = useState<string>('Basketball');
  const [newTeamCount, setNewTeamCount] = useState<number>(8);
  const [newTeamsList, setNewTeamsList] = useState<string[]>([
    'Jersey City Ballers', 'Newark Express', 'Bergen Catholic Elite', 'Paterson Vipers',
    'St. Anthony Select', 'Trenton Thunder', 'Camden Wildcats', 'Elizabeth Hoops'
  ]);

  // Admin Edit Bracket Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editBracketName, setEditBracketName] = useState<string>('');
  const [editEventName, setEditEventName] = useState<string>('');
  const [editSport, setEditSport] = useState<string>('Basketball');

  // Admin Delete Confirmation Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Tournament, Division & Team Guide / FAQ Modal State
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Tournament Bracket Team Roster & Profile ID Sync Manager Modal State
  const [showRosterManagerModal, setShowRosterManagerModal] = useState<boolean>(false);
  const [rosterManagerDivision, setRosterManagerDivision] = useState<string>('All Divisions');
  const [rosterManagerSelectedTeamId, setRosterManagerSelectedTeamId] = useState<string | undefined>(undefined);

  // Check RBAC role permission for Admin, Organization, Coach, or Member
  const canManage = canManageOverride ?? true;

  // Active bracket ID is either passed from parent or managed locally
  const activeBracketId = propSelectedBracketId || localSelectedId;

  // Load user prediction picks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bracket_picks_${activeBracketId}`);
      if (saved) {
        setUserPicks(JSON.parse(saved));
      } else {
        // Default initial predictions for demo
        setUserPicks({
          'm1': 'Jersey City Ballers',
          'm2': 'Paterson Vipers',
          'm7': 'Jersey City Ballers'
        });
      }
    } catch (e) {
      console.warn('Failed to parse saved bracket picks:', e);
    }
  }, [activeBracketId]);

  // Save pick prediction
  const handleMakePrediction = (matchId: string, teamName: string) => {
    const updated = { ...userPicks, [matchId]: teamName };
    setUserPicks(updated);
    try {
      localStorage.setItem(`bracket_picks_${activeBracketId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save bracket picks:', e);
    }
  };

  // Clear predictions for active bracket
  const handleClearPredictions = () => {
    setUserPicks({});
    try {
      localStorage.removeItem(`bracket_picks_${activeBracketId}`);
    } catch (e) {
      console.warn('Failed to clear bracket picks:', e);
    }
  };

  // Load initial cached brackets from localStorage if available
  useEffect(() => {
    try {
      const cached = localStorage.getItem('just1play_event_brackets_cache');
      if (cached) {
        const parsed: EventBracket[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFirestoreBrackets(prev => {
            const map = new Map<string, EventBracket>();
            prev.forEach(b => map.set(b.id, b));
            parsed.forEach(b => map.set(b.id, b));
            return Array.from(map.values());
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached event brackets:', e);
    }
  }, []);

  // Real-time Firestore synchronization for 'EventBrackets' collection
  useEffect(() => {
    if (!db) return;

    const unsub = onSnapshot(
      collection(db, 'EventBrackets'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedBrackets: EventBracket[] = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as EventBracket));
          setFirestoreBrackets(loadedBrackets);
          try {
            localStorage.setItem('just1play_event_brackets_cache', JSON.stringify(loadedBrackets));
          } catch (e) {
            console.warn('LocalStorage save error:', e);
          }
        } else {
          // Use in-memory seed brackets without burning Firestore write quota
          setFirestoreBrackets(SEED_EVENT_BRACKETS);
        }
      },
      (err) => {
        if (isQuotaError(err)) {
          markFirestoreQuotaExceeded('EventBrackets listener quota notice');
        }
        console.warn('Firestore EventBrackets listener notice:', err.message);
        setFirestoreBrackets(SEED_EVENT_BRACKETS);
      }
    );

    return () => unsub();
  }, []);

  // Merge Firestore brackets + prop tournaments + prop events into a unified brackets list
  const allBracketsMap = new Map<string, EventBracket>();

  // 1. Seed / Firestore Brackets
  firestoreBrackets.forEach(b => allBracketsMap.set(b.id, b));

  // 2. Convert Tournaments to Brackets & sync participating teams if updated
  tournaments.forEach(t => {
    const existing = allBracketsMap.get(t.id);
    if (!existing) {
      allBracketsMap.set(t.id, convertTournamentToBracket(t));
    } else if (t.participatingTeams && t.participatingTeams.length > 0) {
      const freshConverted = convertTournamentToBracket(t);
      // Preserve scores/status for completed or live matches, but sync new team names
      const mergedMatches = freshConverted.matches.map(fm => {
        const existingMatch = existing.matches.find(m => m.id === fm.id);
        if (existingMatch && (existingMatch.status === 'Completed' || existingMatch.status === 'Live' || existingMatch.winner)) {
          return existingMatch;
        }
        return fm;
      });

      allBracketsMap.set(t.id, {
        ...existing,
        name: `${t.name} Bracket Tree`,
        eventName: t.name,
        sport: (t.sport as any) || 'Basketball',
        matches: mergedMatches
      });
    }
  });

  // 3. Convert Events to Brackets if not already present
  events.forEach(e => {
    if (!allBracketsMap.has(e.id)) {
      allBracketsMap.set(e.id, convertEventToBracket(e));
    }
  });

  const allBrackets: EventBracket[] = Array.from(allBracketsMap.values());

  const currentBracket = allBrackets.find(b => b.id === activeBracketId) || allBrackets[0] || SEED_EVENT_BRACKETS[0];

  const handleSwitchBracket = (newId: string) => {
    setLocalSelectedId(newId);
    if (onSelectBracketId) {
      onSelectBracketId(newId);
    }
  };

  // Group matches by round number
  const roundNumbers: number[] = Array.from(new Set<number>(currentBracket.matches.map(m => m.round))).sort((a, b) => a - b);

  // Prediction accuracy & score metrics
  let totalPredictionPoints = 0;
  let correctPicksCount = 0;
  let completedMatchesWithPicksCount = 0;

  currentBracket.matches.forEach(m => {
    if (m.status === 'Completed' && m.winner) {
      completedMatchesWithPicksCount++;
      const userPick = userPicks[m.id];
      if (userPick && userPick === m.winner) {
        correctPicksCount++;
        const ptsForRound = m.round === 1 ? 10 : m.round === 2 ? 20 : 40;
        totalPredictionPoints += ptsForRound;
      }
    }
  });

  const predictionAccuracy = completedMatchesWithPicksCount > 0 
    ? Math.round((correctPicksCount / completedMatchesWithPicksCount) * 100) 
    : 100;

  // Custom Bracket Creation Handler
  const handleCreateCustomBracket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBracketName.trim()) return;

    const newId = `bracket-${Date.now()}`;
    const matches: BracketNodeMatch[] = [];

    if (newTeamCount === 4) {
      matches.push(
        { id: `${newId}-m1`, round: 1, matchNumber: 1, homeTeam: newTeamsList[0] || 'Team 1', awayTeam: newTeamsList[3] || 'Team 4', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '10:00 AM', subLocation: 'Court 1', nextMatchId: `${newId}-m3`, nextMatchSlot: 'home' },
        { id: `${newId}-m2`, round: 1, matchNumber: 2, homeTeam: newTeamsList[1] || 'Team 2', awayTeam: newTeamsList[2] || 'Team 3', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '11:15 AM', subLocation: 'Court 2', nextMatchId: `${newId}-m3`, nextMatchSlot: 'away' },
        { id: `${newId}-m3`, round: 2, matchNumber: 3, homeTeam: 'Winner Semifinal 1', awayTeam: 'Winner Semifinal 2', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '02:00 PM', subLocation: 'Main Championship Court' }
      );
    } else {
      const t = newTeamsList;
      matches.push(
        { id: `${newId}-m1`, round: 1, matchNumber: 1, homeTeam: t[0] || 'Seed 1', awayTeam: t[7] || 'Seed 8', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '09:00 AM', subLocation: 'Court 1', nextMatchId: `${newId}-m5`, nextMatchSlot: 'home' },
        { id: `${newId}-m2`, round: 1, matchNumber: 2, homeTeam: t[3] || 'Seed 4', awayTeam: t[4] || 'Seed 5', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '10:15 AM', subLocation: 'Court 2', nextMatchId: `${newId}-m5`, nextMatchSlot: 'away' },
        { id: `${newId}-m3`, round: 1, matchNumber: 3, homeTeam: t[1] || 'Seed 2', awayTeam: t[6] || 'Seed 7', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '11:30 AM', subLocation: 'Court 1', nextMatchId: `${newId}-m6`, nextMatchSlot: 'home' },
        { id: `${newId}-m4`, round: 1, matchNumber: 4, homeTeam: t[2] || 'Seed 3', awayTeam: t[5] || 'Seed 6', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '12:45 PM', subLocation: 'Court 2', nextMatchId: `${newId}-m6`, nextMatchSlot: 'away' },
        { id: `${newId}-m5`, round: 2, matchNumber: 5, homeTeam: 'Winner M1', awayTeam: 'Winner M2', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '02:30 PM', subLocation: 'Court 1 (Main)', nextMatchId: `${newId}-m7`, nextMatchSlot: 'home' },
        { id: `${newId}-m6`, round: 2, matchNumber: 6, homeTeam: 'Winner M3', awayTeam: 'Winner M4', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '03:45 PM', subLocation: 'Court 2', nextMatchId: `${newId}-m7`, nextMatchSlot: 'away' },
        { id: `${newId}-m7`, round: 3, matchNumber: 7, homeTeam: 'Winner Semifinal 1', awayTeam: 'Winner Semifinal 2', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '06:00 PM', subLocation: 'Championship Arena' }
      );
    }

    const createdBracket: EventBracket = {
      id: newId,
      name: newBracketName.trim(),
      eventName: newEventName.trim() || newBracketName.trim(),
      sport: newSport as any,
      type: 'Single Elimination',
      participantCount: newTeamCount,
      currentStage: newTeamCount === 4 ? 'Semifinals' : 'Quarterfinals',
      status: 'In Progress',
      lastUpdated: new Date().toISOString(),
      matches
    };

    // Update local state immediately
    setFirestoreBrackets(prev => [createdBracket, ...prev]);

    // Save to localStorage for instant mobile response
    try {
      const saved = localStorage.getItem('just1play_event_brackets_cache');
      let list: EventBracket[] = saved ? JSON.parse(saved) : [];
      list = [createdBracket, ...list];
      localStorage.setItem('just1play_event_brackets_cache', JSON.stringify(list));
    } catch (err) {
      console.warn('LocalStorage bracket create save error:', err);
    }

    if (db) {
      try {
        await setDoc(doc(db, 'EventBrackets', newId), createdBracket);
      } catch (err) {
        console.warn('Error saving new bracket to Firestore:', err);
      }
    }

    handleSwitchBracket(newId);
    setShowCreateModal(false);
    setNewBracketName('');
    setNewEventName('');
  };

  const getRoundLabel = (roundNum: number, maxRound: number) => {
    if (roundNum === maxRound) return 'CHAMPIONSHIP FINAL';
    if (roundNum === maxRound - 1) return 'SEMIFINALS';
    if (roundNum === maxRound - 2) return 'QUARTERFINALS';
    return `ROUND ${roundNum}`;
  };

  // Open Node Update Modal on click if user has Admin/Organization role
  const handleNodeClick = (match: BracketNodeMatch) => {
    if (!canManage) return;
    setActiveNodeMatch(match);
    setEditHomeTeam(match.homeTeam || '');
    setEditAwayTeam(match.awayTeam || '');
    setHomeScoreInput(match.homeScore || 0);
    setAwayScoreInput(match.awayScore || 0);
    setSelectedWinnerTeam(match.winner || match.homeTeam || '');
  };

  // Update Game Matchup Teams, Winner & Advance Winner in Bracket Tree
  const handleConfirmWinnerUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNodeMatch || !currentBracket) return;
    setIsUpdating(true);

    try {
      const finalHomeTeam = editHomeTeam.trim() || activeNodeMatch.homeTeam || 'TBD';
      const finalAwayTeam = editAwayTeam.trim() || activeNodeMatch.awayTeam || 'TBD';
      const winner = selectedWinnerTeam || (homeScoreInput >= awayScoreInput ? finalHomeTeam : finalAwayTeam);

      // 1. Clone matches array
      const updatedMatches = currentBracket.matches.map(m => {
        if (m.id === activeNodeMatch.id) {
          return {
            ...m,
            homeTeam: finalHomeTeam,
            awayTeam: finalAwayTeam,
            homeScore: homeScoreInput,
            awayScore: awayScoreInput,
            winner: winner,
            status: 'Completed' as const
          };
        }
        return m;
      });

      // 2. Advance winner to next match if defined
      if (activeNodeMatch.nextMatchId && activeNodeMatch.nextMatchSlot) {
        const targetMatchIndex = updatedMatches.findIndex(m => m.id === activeNodeMatch.nextMatchId);
        if (targetMatchIndex !== -1) {
          const target = updatedMatches[targetMatchIndex];
          if (activeNodeMatch.nextMatchSlot === 'home') {
            updatedMatches[targetMatchIndex] = { ...target, homeTeam: winner };
          } else {
            updatedMatches[targetMatchIndex] = { ...target, awayTeam: winner };
          }
        }
      }

      // Check overall bracket stage/status
      const allCompleted = updatedMatches.every(m => m.status === 'Completed');
      const updatedBracketObj: EventBracket = {
        ...currentBracket,
        matches: updatedMatches,
        status: allCompleted ? 'Finalized' : 'In Progress',
        lastUpdated: new Date().toISOString()
      };

      // Update state immediately
      setFirestoreBrackets(prev => {
        const idx = prev.findIndex(b => b.id === currentBracket.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = updatedBracketObj;
          return next;
        }
        return [updatedBracketObj, ...prev];
      });

      // Update localStorage immediately
      try {
        const saved = localStorage.getItem('just1play_event_brackets_cache');
        let list: EventBracket[] = saved ? JSON.parse(saved) : [];
        const idx = list.findIndex(b => b.id === currentBracket.id);
        if (idx !== -1) {
          list[idx] = updatedBracketObj;
        } else {
          list.push(updatedBracketObj);
        }
        localStorage.setItem('just1play_event_brackets_cache', JSON.stringify(list));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }

      // Real-time Firestore document update
      if (db) {
        const bracketRef = doc(db, 'EventBrackets', currentBracket.id);
        await setDoc(bracketRef, updatedBracketObj, { merge: true });
      }

      // Dispatch real-time scheduled event update notification alert to users
      notificationService.sendEventUpdateAlert({
        recipientUid: user?.uid || profile?.uid || 'demo-user',
        eventTitle: currentBracket.eventName,
        updateDetails: `Match #${activeNodeMatch.matchNumber} update: ${finalHomeTeam} vs ${finalAwayTeam}. Winner: ${winner}!`,
        eventId: currentBracket.id,
        senderName: 'Bracket Operations'
      }).catch(err => console.warn('Failed to send event update alert:', err));

      setActiveNodeMatch(null);
    } catch (err) {
      console.error('Failed to update bracket node winner:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Edit Bracket Modal
  const handleOpenEditBracket = () => {
    setEditBracketName(currentBracket.name);
    setEditEventName(currentBracket.eventName);
    setEditSport(currentBracket.sport);
    setShowEditModal(true);
  };

  // Save Edit Bracket
  const handleSaveEditBracket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBracketName.trim()) return;

    const updatedBracket: EventBracket = {
      ...currentBracket,
      name: editBracketName.trim(),
      eventName: editEventName.trim() || currentBracket.eventName,
      sport: editSport as any,
      lastUpdated: new Date().toISOString()
    };

    if (onEditBracket) {
      onEditBracket(updatedBracket);
    }

    if (db) {
      try {
        await setDoc(doc(db, 'EventBrackets', updatedBracket.id), updatedBracket, { merge: true });
      } catch (err) {
        console.warn('Error saving edited bracket to Firestore:', err);
      }
    }

    setShowEditModal(false);
  };

  // Confirm Delete Bracket
  const handleConfirmDeleteBracket = async () => {
    const targetId = currentBracket.id;

    if (onDeleteBracket) {
      onDeleteBracket(targetId);
    }

    if (db) {
      try {
        await deleteDoc(doc(db, 'EventBrackets', targetId));
        await deleteDoc(doc(db, 'tournaments', targetId));
        await deleteDoc(doc(db, 'events', targetId));
      } catch (err) {
        console.warn('Error deleting bracket from Firestore:', err);
      }
    }

    setShowDeleteConfirm(false);

    // Switch to another bracket if available
    const remaining = allBrackets.filter(b => b.id !== targetId);
    if (remaining.length > 0) {
      handleSwitchBracket(remaining[0].id);
    }
  };

  // Find overall champion if finals completed
  const maxRound = Math.max(...roundNumbers, 1);
  const finalMatch = currentBracket.matches.find(m => m.round === maxRound);
  const championName = finalMatch && finalMatch.status === 'Completed' ? finalMatch.winner : null;

  return (
    <div className="space-y-6">
      {/* Top Header Controls & Bracket Selector */}
      <div className="bg-[#212A31] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-black uppercase text-[#E5B868] tracking-widest px-2.5 py-0.5 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 font-mono">
              REAL-TIME BRACKET ENGINE
            </span>
            {canManage && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> ADMIN EDIT & MANAGE MODE
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-wide">
            {currentBracket.name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Event: <span className="text-slate-200 font-semibold">{currentBracket.eventName}</span> • {currentBracket.sport} • {currentBracket.participantCount} Teams ({currentBracket.type})
          </p>
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Tournament Dropdown Selector */}
          <div className="space-y-1 min-w-[260px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Select Tournament Bracket ({allBrackets.length} Available)
            </label>
            <select
              value={currentBracket.id}
              onChange={(e) => handleSwitchBracket(e.target.value)}
              className="w-full bg-black border border-[#F59E0B]/40 rounded-xl px-4 py-3 min-h-[44px] text-xs text-white font-bold focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] cursor-pointer"
            >
              {allBrackets.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.sport})
                </option>
              ))}
            </select>
          </div>

          {/* Admin Management Buttons (Edit & Delete) */}
          {canManage && (
            <div className="flex items-center gap-2 pt-4 sm:pt-4">
              <button
                onClick={handleOpenEditBracket}
                className="px-4 py-3 min-h-[44px] min-w-[44px] bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer border border-white/15"
                title="Edit Bracket Title & Details"
              >
                <Edit3 className="w-4 h-4 text-[#F59E0B]" />
                <span className="hidden lg:inline">Edit</span>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-3 min-h-[44px] min-w-[44px] bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer border border-rose-500/30"
                title="Delete Tournament Bracket"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="hidden lg:inline">Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mode Switcher Bar & Custom Bracket Builder Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1E2630] border border-slate-700/80 p-3 sm:p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setBracketMode('live')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              bracketMode === 'live'
                ? 'bg-[#F59E0B] text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Live Bracket Tree</span>
          </button>

          <button
            type="button"
            onClick={() => setBracketMode('prediction')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              bracketMode === 'prediction'
                ? 'bg-[#F59E0B] text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Prediction Challenge ({Object.keys(userPicks).length} Picks)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setRosterManagerDivision('All Divisions');
              setRosterManagerSelectedTeamId(undefined);
              setShowRosterManagerModal(true);
            }}
            className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/50 text-cyan-300 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
            title="Manage division rosters and sync player profile IDs and stats"
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span>👥 Team & Division Rosters</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200 text-[10px] font-mono font-black border border-cyan-500/40">
              Auto Sync
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="min-h-[44px] px-3.5 py-2 bg-gradient-to-r from-[#00E5FF]/20 to-[#39FF14]/20 hover:from-[#00E5FF]/30 hover:to-[#39FF14]/30 border border-[#00E5FF]/50 text-[#00E5FF] font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Learn how to create tournaments, divisions & add teams"
          >
            <BookOpen className="w-4 h-4 text-[#00E5FF]" />
            <span>📖 Division & Teams Guide</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Bracket</span>
          </button>

          <span className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Firestore Synced
          </span>
        </div>
      </div>

      {/* PREDICTION CHALLENGE SCORECARD BANNER */}
      {bracketMode === 'prediction' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 sm:p-6 bg-gradient-to-r from-amber-950/80 via-[#1E2630] to-slate-900 border-2 border-[#F59E0B]/60 rounded-3xl shadow-2xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="text-lg font-black text-white uppercase tracking-wide">
                  Bracket Prediction Challenge
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Predict winners for each matchup node. Earn points as live games finish!
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 font-mono text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Prediction Points</span>
                <span className="text-lg font-black text-[#F59E0B]">{totalPredictionPoints} PTS</span>
              </div>
              <div className="border-x border-slate-800 px-3">
                <span className="text-[10px] text-slate-400 uppercase block">Correct Picks</span>
                <span className="text-lg font-black text-emerald-400">{correctPicksCount} / {completedMatchesWithPicksCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Accuracy</span>
                <span className="text-lg font-black text-sky-400">{predictionAccuracy}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
            <span className="font-mono text-[11px]">
              💡 Tip: Click team buttons inside any matchup node to make or adjust your pick!
            </span>
            <button
              type="button"
              onClick={handleClearPredictions}
              className="min-h-[36px] px-3 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 text-xs rounded-lg transition-colors cursor-pointer"
            >
              Reset Picks
            </button>
          </div>
        </motion.div>
      )}
      {championName && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-3xl bg-gradient-to-r from-[#E5B868]/20 via-emerald-950/60 to-[#E5B868]/20 border-2 border-[#E5B868] shadow-[0_0_35px_rgba(0,242,254,0.3)] text-center relative overflow-hidden"
        >
          <Crown className="w-10 h-10 text-amber-400 mx-auto mb-2 animate-bounce" />
          <span className="text-xs font-black uppercase tracking-widest text-[#E5B868]">OFFICIAL TOURNAMENT CHAMPION</span>
          <h3 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight mt-1">
            🏆 {championName} 🏆
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Congratulations to {championName} for taking the championship title in {currentBracket.eventName}!
          </p>
        </motion.div>
      )}

      {/* VISUAL BRACKET GRID LAYOUT */}
      <div className="relative overflow-x-auto pb-6 bg-[#000000] border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div 
          className="grid gap-6 min-w-[880px]"
          style={{ gridTemplateColumns: `repeat(${roundNumbers.length}, minmax(260px, 1fr))` }}
        >
          {roundNumbers.map((roundNum) => {
            const roundMatches = currentBracket.matches.filter(m => m.round === roundNum);
            const isFinalRound = roundNum === maxRound;

            return (
              <div key={roundNum} className="space-y-4">
                {/* Round Header */}
                <div className={`flex items-center justify-between pb-2 border-b ${
                  isFinalRound ? 'border-amber-400/40' : 'border-white/10'
                }`}>
                  <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 font-mono ${
                    isFinalRound ? 'text-amber-400' : 'text-[#E5B868]'
                  }`}>
                    {isFinalRound ? <Trophy className="w-4 h-4 text-amber-400" /> : <span className="w-2 h-2 rounded-full bg-[#E5B868]" />}
                    {getRoundLabel(roundNum, maxRound)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {roundMatches.length} {roundMatches.length === 1 ? 'Match' : 'Matches'}
                  </span>
                </div>

                  {/* Bracket Node List */}
                  <div className="flex flex-col justify-around h-full space-y-6 pt-2">
                    {roundMatches.map((match) => {
                      const isCompleted = match.status === 'Completed';
                      const isLive = match.status === 'Live';
                      const isHomeWinner = match.winner === match.homeTeam && isCompleted;
                      const isAwayWinner = match.winner === match.awayTeam && isCompleted;

                      const userPickedTeam = userPicks[match.id];
                      const isHomePicked = userPickedTeam === match.homeTeam && match.homeTeam;
                      const isAwayPicked = userPickedTeam === match.awayTeam && match.awayTeam;

                      return (
                        <div
                          key={match.id}
                          className={`w-full text-left min-h-[44px] relative p-4 rounded-2xl border transition-all duration-300 ${
                            isLive 
                              ? 'bg-[#F59E0B]/10 border-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.25)]' 
                              : isCompleted
                              ? 'bg-white/5 border-white/15'
                              : 'bg-[#212A31] border-white/10 hover:border-[#F59E0B]/50'
                          }`}
                        >
                          {/* Node Badge Header */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 font-mono">
                            <span className="text-[#F59E0B] font-bold">MATCH #{match.matchNumber}</span>
                            <span className="truncate max-w-[120px]">{match.subLocation || 'Court A'}</span>
                          </div>

                          {/* Home Team Node Slot */}
                          <div
                            onClick={(e) => {
                              if (bracketMode === 'prediction' && match.homeTeam) {
                                e.stopPropagation();
                                handleMakePrediction(match.id, match.homeTeam);
                              }
                            }}
                            className={`flex items-center justify-between p-2.5 min-h-[40px] rounded-xl mb-2 transition-all cursor-pointer ${
                              isHomeWinner 
                                ? 'bg-[#F59E0B]/20 border border-[#F59E0B]/50 text-white font-black' 
                                : isHomePicked
                                ? 'bg-sky-500/20 border border-sky-400/60 text-white font-bold'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isHomeWinner && <Crown className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />}
                              {isHomePicked && <Target className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                              <span className="text-xs font-bold truncate">{match.homeTeam || 'TBD'}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {bracketMode === 'prediction' && isHomePicked && (
                                <span className="text-[9px] font-mono font-bold bg-sky-500 text-slate-950 px-1.5 py-0.5 rounded">
                                  {isCompleted ? (isHomeWinner ? '✅ +20 PTS' : '❌ Missed') : '🎯 YOUR PICK'}
                                </span>
                              )}
                              <span className="text-sm font-mono font-bold text-white ml-1">{match.homeScore ?? '-'}</span>
                            </div>
                          </div>

                          {/* Away Team Node Slot */}
                          <div
                            onClick={(e) => {
                              if (bracketMode === 'prediction' && match.awayTeam) {
                                e.stopPropagation();
                                handleMakePrediction(match.id, match.awayTeam);
                              }
                            }}
                            className={`flex items-center justify-between p-2.5 min-h-[40px] rounded-xl transition-all cursor-pointer ${
                              isAwayWinner 
                                ? 'bg-[#F59E0B]/20 border border-[#F59E0B]/50 text-white font-black' 
                                : isAwayPicked
                                ? 'bg-sky-500/20 border border-sky-400/60 text-white font-bold'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isAwayWinner && <Crown className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />}
                              {isAwayPicked && <Target className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                              <span className="text-xs font-bold truncate">{match.awayTeam || 'TBD'}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {bracketMode === 'prediction' && isAwayPicked && (
                                <span className="text-[9px] font-mono font-bold bg-sky-500 text-slate-950 px-1.5 py-0.5 rounded">
                                  {isCompleted ? (isAwayWinner ? '✅ +20 PTS' : '❌ Missed') : '🎯 YOUR PICK'}
                                </span>
                              )}
                              <span className="text-sm font-mono font-bold text-white ml-1">{match.awayScore ?? '-'}</span>
                            </div>
                          </div>

                          {/* Node Footer Controls */}
                          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {match.scheduledTime || 'TBD'}
                            </span>
                            {canManage && bracketMode === 'live' ? (
                              <button
                                type="button"
                                onClick={() => handleNodeClick(match)}
                                className="text-[#F59E0B] font-bold flex items-center gap-1 hover:underline cursor-pointer min-h-[32px]"
                              >
                                <Edit3 className="w-3 h-3" /> Select Winner
                              </button>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                isLive ? 'bg-[#F59E0B] text-slate-950' : isCompleted ? 'bg-white/10 text-slate-300' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {match.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* INTERACTIVE WINNER SELECTION MODAL (ADMIN / ORG ONLY) */}
      <AnimatePresence>
        {activeNodeMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#000000] border-2 border-[#E5B868] rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,242,254,0.3)] text-white space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-[#E5B868] flex items-center gap-1.5 font-mono">
                  <Zap className="w-4 h-4 text-[#E5B868] stroke-[2]" />
                  UPDATE BRACKET GAME WINNER
                </span>
                <button
                  type="button"
                  onClick={() => setActiveNodeMatch(null)}
                  className="p-1 rounded-full bg-white/10 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="text-center py-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">
                  MATCH #{activeNodeMatch.matchNumber} • ROUND {activeNodeMatch.round}
                </span>
                <h3 className="text-base font-black text-white uppercase tracking-wide mt-1">
                  {editHomeTeam || 'TBD'} vs {editAwayTeam || 'TBD'}
                </h3>
              </div>

              <form onSubmit={handleConfirmWinnerUpdate} className="space-y-4">
                {/* EDIT MATCHUP TEAMS */}
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#E5B868] uppercase font-mono block">
                      1. Choose Teams Playing in this Bracket Slot:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRosterManagerModal(true)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <Users className="w-3 h-3" />
                      <span>Roster Manager</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-mono text-slate-400 uppercase block mb-1">
                        Home Team Name
                      </label>
                      <input
                        type="text"
                        value={editHomeTeam}
                        onChange={(e) => {
                          setEditHomeTeam(e.target.value);
                          if (selectedWinnerTeam === editHomeTeam) {
                            setSelectedWinnerTeam(e.target.value);
                          }
                        }}
                        placeholder="e.g. 'NJ Raptors U17'"
                        className="w-full bg-black border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#E5B868] focus:outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-slate-400 uppercase block mb-1">
                        Away Team Name
                      </label>
                      <input
                        type="text"
                        value={editAwayTeam}
                        onChange={(e) => {
                          setEditAwayTeam(e.target.value);
                          if (selectedWinnerTeam === editAwayTeam) {
                            setSelectedWinnerTeam(e.target.value);
                          }
                        }}
                        placeholder="e.g. 'Philly Titans U17'"
                        className="w-full bg-black border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#E5B868] focus:outline-none font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* SELECT WINNER */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                    2. Click to Select Winning Team to Advance:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedWinnerTeam(editHomeTeam)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        selectedWinnerTeam === editHomeTeam && editHomeTeam !== ''
                          ? 'bg-[#E5B868]/20 border-[#E5B868] text-white shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono text-slate-400">HOME TEAM</span>
                        {selectedWinnerTeam === editHomeTeam && editHomeTeam !== '' && <Crown className="w-4 h-4 text-[#E5B868]" />}
                      </div>
                      <span className="text-xs font-black truncate">{editHomeTeam || 'TBD'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedWinnerTeam(editAwayTeam)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        selectedWinnerTeam === editAwayTeam && editAwayTeam !== ''
                          ? 'bg-[#E5B868]/20 border-[#E5B868] text-white shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono text-slate-400">AWAY TEAM</span>
                        {selectedWinnerTeam === editAwayTeam && editAwayTeam !== '' && <Crown className="w-4 h-4 text-[#E5B868]" />}
                      </div>
                      <span className="text-xs font-black truncate">{editAwayTeam || 'TBD'}</span>
                    </button>
                  </div>
                </div>

                {/* ENTER SCORES */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 truncate">
                      {editHomeTeam || 'Home'} Score
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={homeScoreInput}
                      onChange={(e) => setHomeScoreInput(parseInt(e.target.value) || 0)}
                      className="w-full text-center bg-black border border-[#E5B868]/50 rounded-xl py-2 text-xl font-mono font-black text-white focus:outline-none focus:border-[#E5B868]"
                    />
                  </div>

                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 truncate">
                      {editAwayTeam || 'Away'} Score
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={awayScoreInput}
                      onChange={(e) => setAwayScoreInput(parseInt(e.target.value) || 0)}
                      className="w-full text-center bg-black border border-cyan-400/50 rounded-xl py-2 text-xl font-mono font-black text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#E5B868]/10 border border-[#E5B868]/30 text-[10px] text-slate-300 text-center font-mono">
                  ⚡ Winner automatically advances to the next match slot in the tournament tree and syncs to Firestore!
                </div>

                <button
                  type="submit"
                  disabled={isUpdating || !selectedWinnerTeam}
                  className="w-full py-3.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{isUpdating ? 'SAVING BRACKET...' : 'CONFIRM WINNER & ADVANCE NODE'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN EDIT BRACKET MODAL */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/80 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#000000] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-[#E5B868] flex items-center gap-1.5 font-mono">
                  <Edit3 className="w-4 h-4" />
                  EDIT BRACKET DETAILS
                </span>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditBracket} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Bracket Name</label>
                  <input
                    type="text"
                    required
                    value={editBracketName}
                    onChange={(e) => setEditBracketName(e.target.value)}
                    className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Event Name</label>
                  <input
                    type="text"
                    value={editEventName}
                    onChange={(e) => setEditEventName(e.target.value)}
                    className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sport</label>
                  <select
                    value={editSport}
                    onChange={(e) => setEditSport(e.target.value)}
                    className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  >
                    <option value="Basketball">🏀 Basketball</option>
                    <option value="Flag Football">🏈 Flag Football</option>
                    <option value="Lacrosse">🥍 Lacrosse</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.4)]"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#000000] border-2 border-rose-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.3)] text-white space-y-4 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center mx-auto text-rose-500">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase text-white tracking-wide">
                  DELETE TOURNAMENT BRACKET?
                </h3>
                <p className="text-xs text-slate-300 font-sans">
                  Are you sure you want to delete <strong className="text-white">"{currentBracket.name}"</strong>? This will permanently erase this bracket tree and match node history.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteBracket}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Bracket</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* CUSTOM BRACKET BUILDER MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#000000] border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.3)] text-white space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5 font-mono">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  BUILD CUSTOM TOURNAMENT BRACKET
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-full bg-white/10 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCustomBracket} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Bracket Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026 East Coast Fall Showcase"
                    value={newBracketName}
                    onChange={(e) => setNewBracketName(e.target.value)}
                    className="w-full bg-[#1E2630] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-400 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Host Event / Tournament Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tri-State Metro Classic"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="w-full bg-[#1E2630] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Sport
                    </label>
                    <select
                      value={newSport}
                      onChange={(e) => setNewSport(e.target.value)}
                      className="w-full bg-[#1E2630] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="Basketball">🏀 Basketball</option>
                      <option value="Flag Football">🏈 Flag Football</option>
                      <option value="Lacrosse">🥍 Lacrosse</option>
                      <option value="Soccer">⚽ Soccer</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Bracket Size
                    </label>
                    <select
                      value={newTeamCount}
                      onChange={(e) => setNewTeamCount(Number(e.target.value))}
                      className="w-full bg-[#1E2630] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    >
                      <option value={4}>4 Teams (Semifinals + Final)</option>
                      <option value={8}>8 Teams (Quarterfinals + Semis + Final)</option>
                    </select>
                  </div>
                </div>

                {/* Team Seeds Input */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-emerald-400 uppercase font-mono">
                      Seed Team Names ({newTeamCount} Teams)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTeamsList([
                          'NJ Raptors U17', 'Philly Titans U17', 'NYC Heights EYBL', 'Brooklyn Knights',
                          'Jersey Express', 'Metro Select', 'Hudson Vipers', 'Garden State Elite'
                        ]);
                      }}
                      className="text-[10px] text-sky-400 hover:underline font-mono"
                    >
                      ⚡ Auto-fill Demo Teams
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {Array.from({ length: newTeamCount }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-500 w-5 text-right">#{idx + 1}</span>
                        <input
                          type="text"
                          required
                          value={newTeamsList[idx] || ''}
                          onChange={(e) => {
                            const updated = [...newTeamsList];
                            updated[idx] = e.target.value;
                            setNewTeamsList(updated);
                          }}
                          placeholder={`Team #${idx + 1}`}
                          className="w-full bg-[#1E2630] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-emerald-400 focus:outline-none font-bold"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Generate Bracket</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tournament, Division & Team Guide / FAQ Modal */}
      <TournamentGuideWalkthroughModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onOpenCreateTournament={() => {
          setShowGuideModal(false);
          setShowCreateModal(true);
        }}
      />

      {/* Tournament Bracket Team Roster & Profile ID Auto-Sync Manager Modal */}
      <BracketTeamRosterManagerModal
        isOpen={showRosterManagerModal}
        onClose={() => setShowRosterManagerModal(false)}
        bracket={currentBracket}
        event={events?.find(e => e.id === currentBracket.id) || null}
        initialDivision={rosterManagerDivision}
        initialSelectedTeamId={rosterManagerSelectedTeamId}
        onBracketUpdated={(updated) => {
          setFirestoreBrackets(prev => prev.map(b => b.id === updated.id ? updated : b));
        }}
      />
    </div>
  );
};

