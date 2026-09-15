import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, TournamentMatch, Venue, AthleteCheckIn, EventItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StandaloneEventsTab } from './StandaloneEventsTab';
import { TournamentsTab } from './TournamentsTab';
import { EventBrackets } from './EventBrackets';
import { ScheduleTab } from './ScheduleTab';
import { CheckInsTab } from './CheckInsTab';
import { VenuesTab } from './VenuesTab';
import { MyEventsTab } from './MyEventsTab';
import { TournamentAnalytics } from './TournamentAnalytics';
import { LiveGamesSection } from '../LiveGames/LiveGamesSection';
import { SportOption, DEFAULT_SPORTS } from '../Navigation/TopHeaderBar';
import { 
  Trophy, 
  Calendar, 
  Layers, 
  UserCheck, 
  Radio, 
  Building2, 
  Ticket, 
  Sparkles,
  BarChart3,
  ShieldCheck,
  Filter,
  ChevronDown,
  Activity,
  CheckCircle2,
  Compass,
  PlayCircle,
  SlidersHorizontal,
  Plus,
  Zap,
  X,
  Tv,
  Megaphone,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuickAddEventModal, QuickAddMode } from './QuickAddEventModal';
import { GameDayDispatchModal } from '../Admin/GameDayDispatchModal';
import { AiScoresheetScannerModal } from '../Scorekeeper/AiScoresheetScannerModal';
import { TeamRegistrationModal } from './TeamRegistrationModal';
import { EmbeddableWidgetModal } from './EmbeddableWidgetModal';
import { OfficialsScheduleDeskModal } from '../Scorekeeper/OfficialsScheduleDeskModal';
import { publishEventToEventsCollection } from '../../services/eventPipelineService';

export type EventHubTab = 
  | 'Events Central' 
  | 'Tournaments' 
  | 'Venues' 
  | 'Schedule' 
  | 'Interactive Brackets' 
  | 'Live Scoring' 
  | 'Check-Ins' 
  | 'Analytics' 
  | 'My Events';

export interface TabGroup {
  category: string;
  badge: string;
  tabs: {
    id: EventHubTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    isLiveBadge?: boolean;
  }[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    category: 'Group 1: Discover',
    badge: 'DISCOVER',
    tabs: [
      { id: 'Events Central', label: 'Events Central', icon: Sparkles },
      { id: 'Tournaments', label: 'Tournaments', icon: Trophy },
      { id: 'Venues', label: 'Venues', icon: Building2 },
    ]
  },
  {
    category: 'Group 2: Play & Track',
    badge: 'PLAY & TRACK',
    tabs: [
      { id: 'Schedule', label: 'Schedule', icon: Calendar },
      { id: 'Interactive Brackets', label: 'Interactive Brackets', icon: Layers },
      { id: 'Live Scoring', label: 'Live Scoring', icon: Radio, isLiveBadge: true },
    ]
  },
  {
    category: 'Group 3: Operations',
    badge: 'OPERATIONS',
    tabs: [
      { id: 'Check-Ins', label: 'Check-Ins', icon: UserCheck },
      { id: 'Analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'My Events', label: 'My Events', icon: Ticket },
    ]
  }
];

export interface EventsSectionProps {
  selectedSport?: SportOption;
}

export const EventsSection: React.FC<EventsSectionProps> = ({ selectedSport: externalSelectedSport }) => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<EventHubTab>('Events Central');

  // Internal sport selector state (defaults to external prop if passed)
  const [currentSport, setCurrentSport] = useState<SportOption>(externalSelectedSport || DEFAULT_SPORTS[0]);
  const [isSportDropdownOpen, setIsSportDropdownOpen] = useState(false);

  // Sync with prop when changed externally
  useEffect(() => {
    if (externalSelectedSport) {
      setCurrentSport(externalSelectedSport);
    }
  }, [externalSelectedSport]);

  // Real-time collections state
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [checkIns, setCheckIns] = useState<AthleteCheckIn[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');

  // Quick Add Event / Tournament state
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickAddModalMode, setQuickAddModalMode] = useState<QuickAddMode>('regular');
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isHeaderQuickMenuOpen, setIsHeaderQuickMenuOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isTeamRegisterModalOpen, setIsTeamRegisterModalOpen] = useState(false);
  const [isEmbedWidgetModalOpen, setIsEmbedWidgetModalOpen] = useState(false);
  const [isOfficialsDeskOpen, setIsOfficialsDeskOpen] = useState(false);

  // Roles allowed full write access
  const canManage = role === 'admin' || role === 'organization' || role === 'coach';

  // Hydrate local cache on mount
  useEffect(() => {
    try {
      const cachedEvents = localStorage.getItem('just1play_events_cache');
      if (cachedEvents) {
        const parsed = JSON.parse(cachedEvents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEvents(parsed);
        }
      }
      const cachedMatches = localStorage.getItem('just1play_matches_cache');
      if (cachedMatches) {
        const parsed = JSON.parse(cachedMatches);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMatches(parsed);
        }
      }
    } catch (e) {
      console.warn('Cache hydration notice:', e);
    }
  }, []);

  // 0. Listen to Firestore Standalone Events
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, 'events'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: EventItem[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as EventItem));
          setEvents(loaded);
          try {
            localStorage.setItem('just1play_events_cache', JSON.stringify(loaded));
          } catch (e) {}
        }
      },
      (err) => console.log('Events Firestore sync notice:', err.message)
    );
    return () => unsub();
  }, []);

  // 1. Listen to Firestore Tournaments
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, 'tournaments'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Tournament[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as Tournament));
          setTournaments(loaded);
        }
      },
      (err) => console.log('Tournaments Firestore sync notice:', err.message)
    );
    return () => unsub();
  }, []);

  // 2. Listen to Firestore Matches
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, 'tournamentMatches'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: TournamentMatch[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as TournamentMatch));
          setMatches(loaded);
          try {
            localStorage.setItem('just1play_matches_cache', JSON.stringify(loaded));
          } catch (e) {}
        }
      },
      (err) => console.log('Matches Firestore sync notice:', err.message)
    );
    return () => unsub();
  }, []);

  // 3. Listen to Firestore Venues
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, 'venues'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Venue[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as Venue));
          setVenues(loaded);
        }
      },
      (err) => console.log('Venues Firestore sync notice:', err.message)
    );
    return () => unsub();
  }, []);

  // 4. Listen to Firestore Check-Ins
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, 'checkIns'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: AthleteCheckIn[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as AthleteCheckIn));
          setCheckIns(loaded);
        }
      },
      (err) => console.log('CheckIns Firestore sync notice:', err.message)
    );
    return () => unsub();
  }, []);

  // Filtering helper based on selected sport category
  const matchesSport = (itemSport?: string) => {
    if (!currentSport || currentSport.name === 'All Sports' || currentSport.id === 'all') return true;
    if (!itemSport) return true;
    const s1 = itemSport.toLowerCase();
    const s2 = currentSport.name.toLowerCase();
    return s1.includes(s2) || s2.includes(s1) || 
           (s2.includes('flag') && s1.includes('flag')) ||
           (s2.includes('tackle') && s1.includes('tackle')) ||
           (s2.includes('basketball') && s1.includes('basketball')) ||
           (s2.includes('cheer') && s1.includes('cheer'));
  };

  const filteredEvents = events.filter(e => matchesSport(e.sport));
  const filteredTournaments = tournaments.filter(t => matchesSport(t.sport));
  const filteredMatches = matches.filter(m => {
    const tourn = tournaments.find(t => t.id === m.tournamentId);
    return matchesSport(tourn?.sport);
  });
  const filteredCheckIns = checkIns.filter(c => matchesSport(c.sport));

  // Handlers for Firestore Mutations
  const handleCreateTournament = async (newTournData: Omit<Tournament, 'id' | 'createdAt'>) => {
    const newId = `tourn-${Date.now()}`;
    const newTourn: Tournament = {
      ...newTournData,
      id: newId,
      createdAt: new Date().toISOString()
    };

    const teams = newTournData.participatingTeams || [];
    const t1 = teams[0] || 'Team 1';
    const t2 = teams[1] || 'Team 2';
    const t3 = teams[2] || 'Team 3';
    const t4 = teams[3] || 'Team 4';
    const t5 = teams[4] || 'Team 5';
    const t6 = teams[5] || 'Team 6';
    const t7 = teams[6] || 'Team 7';
    const t8 = teams[7] || 'Team 8';

    const generatedMatches: TournamentMatch[] = [
      { id: `m-${newId}-101`, tournamentId: newId, round: 1, matchNumber: 1, homeTeam: t1, awayTeam: t8, homeScore: 0, awayScore: 0, status: 'Scheduled', venueName: newTournData.venueName, subLocation: 'Court A', scheduledTime: `${newTournData.startDate} 09:00 AM`, nextMatchId: `m-${newId}-201`, nextMatchSlot: 'home' },
      { id: `m-${newId}-102`, tournamentId: newId, round: 1, matchNumber: 2, homeTeam: t4, awayTeam: t5, homeScore: 0, awayScore: 0, status: 'Scheduled', venueName: newTournData.venueName, subLocation: 'Court B', scheduledTime: `${newTournData.startDate} 10:30 AM`, nextMatchId: `m-${newId}-201`, nextMatchSlot: 'away' },
      { id: `m-${newId}-103`, tournamentId: newId, round: 1, matchNumber: 3, homeTeam: t2, awayTeam: t7, homeScore: 0, awayScore: 0, status: 'Scheduled', venueName: newTournData.venueName, subLocation: 'Court C', scheduledTime: `${newTournData.startDate} 12:00 PM`, nextMatchId: `m-${newId}-202`, nextMatchSlot: 'home' },
      { id: `m-${newId}-104`, tournamentId: newId, round: 1, matchNumber: 4, homeTeam: t3, awayTeam: t6, homeScore: 0, awayScore: 0, status: 'Scheduled', venueName: newTournData.venueName, subLocation: 'Court A', scheduledTime: `${newTournData.startDate} 01:30 PM`, nextMatchId: `m-${newId}-202`, nextMatchSlot: 'away' },
      { id: `m-${newId}-201`, tournamentId: newId, round: 2, matchNumber: 1, homeTeam: 'TBD (QF1)', awayTeam: 'TBD (QF2)', homeScore: 0, awayScore: 0, status: 'Scheduled', venueName: newTournData.venueName, subLocation: 'Court A', scheduledTime: `${newTournData.startDate} 04:00 PM`, nextMatchId: `m-${newId}-301`, nextMatchSlot: 'home' },
      { id: `m-${newId}-202`, tournamentId: newId, round: 2, matchNumber: 2, homeTeam: 'TBD (QF3)', awayTeam: 'TBD (QF4)', homeScore: 0, awayScore: 0, status: 'Scheduled', venueName: newTournData.venueName, subLocation: 'Court B', scheduledTime: `${newTournData.startDate} 05:30 PM`, nextMatchId: `m-${newId}-301`, nextMatchSlot: 'away' },
      { id: `m-${newId}-301`, tournamentId: newId, round: 3, matchNumber: 1, homeTeam: 'TBD (SF1)', awayTeam: 'TBD (SF2)', homeScore: 0, awayScore: 0, status: 'Scheduled', venueName: newTournData.venueName, subLocation: 'Court A (Main)', scheduledTime: `${newTournData.endDate} 06:00 PM` }
    ];

    const updatedTournaments = [newTourn, ...tournaments];
    const updatedMatchesList = [...matches, ...generatedMatches];

    setTournaments(updatedTournaments);
    setMatches(updatedMatchesList);
    setSelectedTournamentId(newId);

    // Save to localStorage for instant mobile availability
    try {
      localStorage.setItem('just1play_tournaments', JSON.stringify(updatedTournaments));
      localStorage.setItem('just1play_matches', JSON.stringify(updatedMatchesList));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    // Generate bracket tree object
    const createdBracket = {
      id: newId,
      name: `${newTourn.name} Bracket Tree`,
      eventName: newTourn.name,
      sport: newTourn.sport || 'Basketball',
      type: newTourn.format || 'Single Elimination',
      participantCount: teams.length || 8,
      currentStage: 'Quarterfinals',
      status: 'In Progress',
      lastUpdated: new Date().toISOString(),
      matches: [
        { id: `${newId}-bm1`, round: 1, matchNumber: 1, homeTeam: t1, awayTeam: t8, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '09:00 AM', subLocation: 'Court 1', nextMatchId: `${newId}-bm5`, nextMatchSlot: 'home' },
        { id: `${newId}-bm2`, round: 1, matchNumber: 2, homeTeam: t4, awayTeam: t5, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '10:15 AM', subLocation: 'Court 2', nextMatchId: `${newId}-bm5`, nextMatchSlot: 'away' },
        { id: `${newId}-bm3`, round: 1, matchNumber: 3, homeTeam: t2, awayTeam: t7, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '11:30 AM', subLocation: 'Court 1', nextMatchId: `${newId}-bm6`, nextMatchSlot: 'home' },
        { id: `${newId}-bm4`, round: 1, matchNumber: 4, homeTeam: t3, awayTeam: t6, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '12:45 PM', subLocation: 'Court 2', nextMatchId: `${newId}-bm6`, nextMatchSlot: 'away' },
        { id: `${newId}-bm5`, round: 2, matchNumber: 5, homeTeam: 'Winner M1', awayTeam: 'Winner M2', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '02:30 PM', subLocation: 'Court 1 (Main)', nextMatchId: `${newId}-bm7`, nextMatchSlot: 'home' },
        { id: `${newId}-bm6`, round: 2, matchNumber: 6, homeTeam: 'Winner M3', awayTeam: 'Winner M4', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '03:45 PM', subLocation: 'Court 2', nextMatchId: `${newId}-bm7`, nextMatchSlot: 'away' },
        { id: `${newId}-bm7`, round: 3, matchNumber: 7, homeTeam: 'Winner Semifinal 1', awayTeam: 'Winner Semifinal 2', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '06:00 PM', subLocation: 'Championship Court' }
      ]
    };

    try {
      const savedBrackets = localStorage.getItem('just1play_event_brackets_cache');
      let bList = savedBrackets ? JSON.parse(savedBrackets) : [];
      bList = [createdBracket, ...bList];
      localStorage.setItem('just1play_event_brackets_cache', JSON.stringify(bList));
    } catch (e) {
      console.warn('LocalStorage bracket save error:', e);
    }

    if (db) {
      try {
        await publishEventToEventsCollection({
          id: newId,
          title: newTourn.name,
          sport: newTourn.sport,
          startDate: newTourn.startDate,
          endDate: newTourn.endDate,
          venueName: newTourn.venueName,
          format: newTourn.format,
          eventType: 'tournament',
          status: 'published',
          registeredTeamIds: teams,
          organizerId: user?.uid || 'coach-organizer'
        }, user?.uid);
        await setDoc(doc(db, 'tournaments', newId), newTourn);
        await setDoc(doc(db, 'EventBrackets', newId), createdBracket);
        for (const m of generatedMatches) {
          await setDoc(doc(db, 'tournamentMatches', m.id), m);
        }
      } catch (err) {
        console.warn('Firestore write warning:', err);
      }
    }
  };

  const handleToggleCheckIn = async (checkInId: string, currentStatus: 'Checked In' | 'Pending') => {
    const newStatus = currentStatus === 'Checked In' ? 'Pending' : 'Checked In';
    const nowIso = new Date().toISOString();

    const updatedCheckIns = checkIns.map(c => {
      if (c.id === checkInId) {
        return {
          ...c,
          status: newStatus as any,
          checkInTime: newStatus === 'Checked In' ? nowIso : ''
        };
      }
      return c;
    });

    setCheckIns(updatedCheckIns);

    if (db) {
      try {
        await updateDoc(doc(db, 'checkIns', checkInId), {
          status: newStatus,
          checkInTime: newStatus === 'Checked In' ? nowIso : ''
        });
      } catch (err) {
        console.warn('Firestore checkin warning:', err);
      }
    }
  };

  const handleCreateVenue = async (venueData: Omit<Venue, 'id'>) => {
    const newId = `venue-${Date.now()}`;
    const newVenue: Venue = { ...venueData, id: newId };

    setVenues([newVenue, ...venues]);

    if (db) {
      try {
        await setDoc(doc(db, 'venues', newId), newVenue);
      } catch (err) {
        console.warn('Firestore venue write warning:', err);
      }
    }
  };

  const handleEditVenue = async (updatedVenue: Venue) => {
    setVenues(prev => prev.map(v => v.id === updatedVenue.id ? updatedVenue : v));
    if (db) {
      try {
        await setDoc(doc(db, 'venues', updatedVenue.id), updatedVenue, { merge: true });
      } catch (err) {
        console.warn('Firestore edit venue warning:', err);
      }
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    setVenues(prev => prev.filter(v => v.id !== venueId));
    if (db) {
      try {
        await deleteDoc(doc(db, 'venues', venueId));
      } catch (err) {
        console.warn('Firestore delete venue warning:', err);
      }
    }
  };

  const handleUpdateScheduleMatch = async (updatedMatch: TournamentMatch) => {
    setMatches(prev => {
      const nextList = prev.map(m => m.id === updatedMatch.id ? updatedMatch : m);
      try {
        localStorage.setItem('just1play_matches_cache', JSON.stringify(nextList));
      } catch (e) {}
      return nextList;
    });
    if (db) {
      try {
        await setDoc(doc(db, 'tournamentMatches', updatedMatch.id), updatedMatch, { merge: true });
        await setDoc(doc(db, 'games', updatedMatch.id), {
          ...updatedMatch,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore match update warning:', err);
      }
    }
  };

  const handleAddScheduleMatches = async (newMatches: TournamentMatch[]) => {
    setMatches(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const filtered = newMatches.filter(m => !existingIds.has(m.id));
      const nextList = [...filtered, ...prev];
      try {
        localStorage.setItem('just1play_matches_cache', JSON.stringify(nextList));
      } catch (e) {}
      return nextList;
    });

    if (db) {
      for (const m of newMatches) {
        try {
          await setDoc(doc(db, 'tournamentMatches', m.id), m, { merge: true });
          await setDoc(doc(db, 'games', m.id), {
            ...m,
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.warn('Firestore match write error:', err);
        }
      }
    }
  };

  const handleDeleteScheduleMatch = async (matchId: string) => {
    setMatches(prev => {
      const nextList = prev.filter(m => m.id !== matchId);
      try {
        localStorage.setItem('just1play_matches_cache', JSON.stringify(nextList));
      } catch (e) {}
      return nextList;
    });
    if (db) {
      try {
        await deleteDoc(doc(db, 'tournamentMatches', matchId));
        await deleteDoc(doc(db, 'games', matchId));
      } catch (err) {
        console.warn('Firestore match delete error:', err);
      }
    }
  };

  const handleCreateEvent = async (newEventData: Omit<EventItem, 'id'>) => {
    let published;
    try {
      published = await publishEventToEventsCollection(newEventData, user?.uid);
    } catch (e) {
      console.warn('publishEventToEventsCollection fallback:', e);
    }
    const newId = published?.id || `evt-${Date.now()}`;
    const newEvent: EventItem = { ...newEventData, id: newId, ...(published || {}) };

    setEvents(prev => {
      const next = [newEvent, ...prev];
      try {
        localStorage.setItem('just1play_events_cache', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    setActiveSubTab('Events Central');
  };

  const handleRegisterEvent = async (eventId: string) => {
    if (!user) return;
    const targetEvent = events.find(e => e.id === eventId);
    if (!targetEvent) return;

    const userUid = user.uid;
    const alreadyRegistered = targetEvent.registeredUserIds.includes(userUid);
    const updatedRegisteredIds = alreadyRegistered
      ? targetEvent.registeredUserIds.filter(id => id !== userUid)
      : [...targetEvent.registeredUserIds, userUid];

    const updatedEvents = events.map(e => {
      if (e.id === eventId) {
        return { ...e, registeredUserIds: updatedRegisteredIds };
      }
      return e;
    });

    setEvents(updatedEvents);

    if (db) {
      try {
        await updateDoc(doc(db, 'events', eventId), {
          registeredUserIds: updatedRegisteredIds
        });
      } catch (err) {
        console.warn('Firestore event registration update warning:', err);
      }
    }
  };

  const handleEditTournament = async (updatedTournament: Tournament) => {
    const nextTournaments = tournaments.map(t => t.id === updatedTournament.id ? updatedTournament : t);
    setTournaments(nextTournaments);

    // Persist locally for instant mobile response
    try {
      localStorage.setItem('just1play_tournaments', JSON.stringify(nextTournaments));
    } catch (e) {
      console.warn('LocalStorage tournament edit save warning:', e);
    }

    // Update corresponding bracket in EventBrackets cache & Firestore
    const teams = updatedTournament.participatingTeams || [];
    const t1 = teams[0] || 'Team 1';
    const t2 = teams[1] || 'Team 2';
    const t3 = teams[2] || 'Team 3';
    const t4 = teams[3] || 'Team 4';
    const t5 = teams[4] || 'Team 5';
    const t6 = teams[5] || 'Team 6';
    const t7 = teams[6] || 'Team 7';
    const t8 = teams[7] || 'Team 8';

    const updatedBracket = {
      id: updatedTournament.id,
      name: `${updatedTournament.name} Bracket Tree`,
      eventName: updatedTournament.name,
      sport: updatedTournament.sport || 'Basketball',
      type: updatedTournament.format || 'Single Elimination',
      participantCount: teams.length || 8,
      currentStage: 'Quarterfinals',
      status: updatedTournament.status === 'Completed' ? 'Finalized' : 'In Progress',
      lastUpdated: new Date().toISOString(),
      matches: [
        { id: `${updatedTournament.id}-bm1`, round: 1, matchNumber: 1, homeTeam: t1, awayTeam: t8, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '09:00 AM', subLocation: 'Court 1', nextMatchId: `${updatedTournament.id}-bm5`, nextMatchSlot: 'home' },
        { id: `${updatedTournament.id}-bm2`, round: 1, matchNumber: 2, homeTeam: t4, awayTeam: t5, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '10:15 AM', subLocation: 'Court 2', nextMatchId: `${updatedTournament.id}-bm5`, nextMatchSlot: 'away' },
        { id: `${updatedTournament.id}-bm3`, round: 1, matchNumber: 3, homeTeam: t2, awayTeam: t7, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '11:30 AM', subLocation: 'Court 1', nextMatchId: `${updatedTournament.id}-bm6`, nextMatchSlot: 'home' },
        { id: `${updatedTournament.id}-bm4`, round: 1, matchNumber: 4, homeTeam: t3, awayTeam: t6, homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '12:45 PM', subLocation: 'Court 2', nextMatchId: `${updatedTournament.id}-bm6`, nextMatchSlot: 'away' },
        { id: `${updatedTournament.id}-bm5`, round: 2, matchNumber: 5, homeTeam: 'Winner M1', awayTeam: 'Winner M2', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '02:30 PM', subLocation: 'Court 1 (Main)', nextMatchId: `${updatedTournament.id}-bm7`, nextMatchSlot: 'home' },
        { id: `${updatedTournament.id}-bm6`, round: 2, matchNumber: 6, homeTeam: 'Winner M3', awayTeam: 'Winner M4', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '03:45 PM', subLocation: 'Court 2', nextMatchId: `${updatedTournament.id}-bm7`, nextMatchSlot: 'away' },
        { id: `${updatedTournament.id}-bm7`, round: 3, matchNumber: 7, homeTeam: 'Winner Semifinal 1', awayTeam: 'Winner Semifinal 2', homeScore: 0, awayScore: 0, winner: '', status: 'Scheduled', scheduledTime: '06:00 PM', subLocation: 'Championship Court' }
      ]
    };

    try {
      const savedBrackets = localStorage.getItem('just1play_event_brackets_cache');
      let bList = savedBrackets ? JSON.parse(savedBrackets) : [];
      const bIdx = bList.findIndex((b: any) => b.id === updatedTournament.id);
      if (bIdx !== -1) {
        bList[bIdx] = { ...bList[bIdx], ...updatedBracket };
      } else {
        bList.push(updatedBracket);
      }
      localStorage.setItem('just1play_event_brackets_cache', JSON.stringify(bList));
    } catch (e) {
      console.warn('LocalStorage bracket update error:', e);
    }

    if (db) {
      try {
        await setDoc(doc(db, 'tournaments', updatedTournament.id), updatedTournament, { merge: true });
        await setDoc(doc(db, 'EventBrackets', updatedTournament.id), updatedBracket, { merge: true });
      } catch (err) {
        console.warn('Firestore edit tournament error:', err);
      }
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    setTournaments(prev => prev.filter(t => t.id !== tournamentId));
    if (db) {
      try {
        await deleteDoc(doc(db, 'tournaments', tournamentId));
      } catch (err) {
        console.warn('Firestore delete tournament error:', err);
      }
    }
  };

  const handleEditEvent = async (updatedEvent: EventItem) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    if (db) {
      try {
        await setDoc(doc(db, 'events', updatedEvent.id), updatedEvent, { merge: true });
      } catch (err) {
        console.warn('Firestore edit event error:', err);
      }
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    if (db) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
      } catch (err) {
        console.warn('Firestore delete event error:', err);
      }
    }
  };

  // Top Statistics Calculations
  const activeEventsCount = filteredEvents.length;
  const activeTournamentsCount = filteredTournaments.filter(t => t.status === 'In Progress' || t.status === 'Upcoming').length;
  const checkInsTodayCount = filteredCheckIns.filter(c => c.status === 'Checked In').length;
  const liveNowCount = filteredMatches.filter(m => m.status === 'Live').length + 1;

  return (
    <div className="space-y-6 pb-32">
      
      {/* 1. Sleek Action Bar with Sport Filter & Live Operational Stats */}
      <div className="rounded-2xl bg-[#212A31]/90 border border-slate-800/90 p-4 sm:p-5 shadow-xl backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Title & Sport Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE]">
            <Trophy className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black italic uppercase tracking-wider text-white font-sans">
                Events, Tournaments & Schedule
              </h1>

              {/* SPORT CONTEXT SELECTOR */}
              <div className="relative">
                <button
                  onClick={() => setIsSportDropdownOpen(!isSportDropdownOpen)}
                  className="px-2.5 py-1 rounded-full bg-[#212A31] border border-[#00F2FE]/40 text-[#00F2FE] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-slate-800 transition-colors cursor-pointer font-mono"
                >
                  <Filter className="w-3 h-3 text-[#00F2FE]" />
                  <span>{currentSport.emoji} {currentSport.name}</span>
                  <ChevronDown className="w-3 h-3 text-[#00F2FE]" />
                </button>

                {isSportDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 z-50 w-52 rounded-2xl bg-[#212A31] border border-slate-800 shadow-2xl p-1.5 space-y-1 backdrop-blur-2xl">
                    <p className="px-2 py-1 text-[9px] font-mono font-bold uppercase text-slate-400">
                      Filter Sport
                    </p>
                    {DEFAULT_SPORTS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setCurrentSport(s);
                          setIsSportDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between transition-all cursor-pointer ${
                          currentSport.id === s.id
                            ? 'bg-[#00F2FE] text-slate-950 font-black'
                            : 'text-slate-300 hover:bg-[#212A31]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{s.emoji}</span>
                          <span>{s.name}</span>
                        </span>
                        {currentSport.id === s.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Operational Metrics & Creation Actions */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-3 bg-[#212A31]/90 px-3.5 py-2 rounded-xl border border-slate-800 font-mono text-xs">
            <div>
              <span className="text-[9px] text-slate-400 block font-bold uppercase">Active Events</span>
              <span className="text-sm font-black text-[#00F2FE]">{activeEventsCount}</span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <span className="text-[9px] text-slate-400 block font-bold uppercase">Live Games</span>
              <span className="text-sm font-black text-rose-500 flex items-center gap-1">
                <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
                {liveNowCount}
              </span>
            </div>
          </div>

          {/* QUICK ADD EVENT WITH TOGGLE DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setIsHeaderQuickMenuOpen(!isHeaderQuickMenuOpen)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F2FE] via-[#00E5FF] to-[#38BDF8] hover:brightness-110 text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.45)] transition-all cursor-pointer shrink-0"
              title="Quick Add Event or Tournament"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Quick Add Event</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isHeaderQuickMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isHeaderQuickMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#182228] border-2 border-[#00F2FE]/50 rounded-2xl p-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 space-y-1 backdrop-blur-xl">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#00F2FE] border-b border-slate-700/80">
                  Select Creation Mode
                </div>
                <button
                  onClick={() => {
                    setQuickAddModalMode('regular');
                    setIsQuickAddModalOpen(true);
                    setIsHeaderQuickMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2.5 text-white hover:bg-[#00F2FE]/20 hover:text-[#00F2FE] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#00F2FE]" />
                  <div>
                    <div className="font-sans font-black uppercase text-xs">Regular Event</div>
                    <div className="text-[10px] text-slate-400 font-mono">Showcase, Combine, Clinic, Plaza</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setQuickAddModalMode('tournament');
                    setIsQuickAddModalOpen(true);
                    setIsHeaderQuickMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2.5 text-white hover:bg-[#E5B868]/20 hover:text-[#E5B868] transition-colors cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-[#E5B868]" />
                  <div>
                    <div className="font-sans font-black uppercase text-xs">Tournament</div>
                    <div className="text-[10px] text-slate-400 font-mono">Championship Brackets & Seeding</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setQuickAddModalMode('regular');
              setIsQuickAddModalOpen(true);
            }}
            className="hidden lg:flex px-3.5 py-2 rounded-xl bg-[#212A31] hover:bg-slate-800 border border-slate-700 hover:border-[#00F2FE] text-white hover:text-[#00F2FE] font-black font-mono text-xs uppercase tracking-wider items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Create a regular event, showcase, camp, clinic or combine"
          >
            <Sparkles className="w-4 h-4 text-[#00F2FE]" />
            <span>+ Regular Event</span>
          </button>

          <button
            onClick={() => {
              setQuickAddModalMode('tournament');
              setIsQuickAddModalOpen(true);
            }}
            className="hidden lg:flex px-3.5 py-2 rounded-xl bg-[#212A31] hover:bg-slate-800 border border-slate-700 hover:border-[#E5B868] text-white hover:text-[#E5B868] font-black font-mono text-xs uppercase tracking-wider items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Create a tournament or bracket"
          >
            <Trophy className="w-4 h-4 text-[#E5B868]" />
            <span>+ Tournament</span>
          </button>

          <button
            onClick={() => navigate('/arena/jumbotron')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600/30 to-amber-600/30 hover:from-red-600/40 hover:to-amber-600/40 border border-red-500/50 text-red-300 font-black font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            title="Launch Arena Jumbotron Multi-Court Video Board"
          >
            <Tv className="w-4 h-4 text-red-400 animate-pulse" />
            <span>Arena TV Jumbotron</span>
          </button>

          <button
            onClick={() => setIsTeamRegisterModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/50 text-emerald-400 font-black font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            title="Register Team / Club with Digital Waiver E-Signatures"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Register Team</span>
          </button>

          <button
            onClick={() => setIsOfficialsDeskOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/50 text-amber-400 font-black font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            title="Referee & Game Official Court Schedule Desk"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Officials Desk</span>
          </button>

          <button
            onClick={() => setIsEmbedWidgetModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[#00F2FE] font-black font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Embed Live Scoreboard & Bracket Widget into Website"
          >
            <Sparkles className="w-4 h-4 text-[#00F2FE]" />
            <span>Embed Widget</span>
          </button>

          <button
            onClick={() => setIsDispatchModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/50 text-[#E5B868] font-black font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            title="Open Game Day Emergency Dispatch Desk"
          >
            <Megaphone className="w-4 h-4 text-[#E5B868]" />
            <span>Director Dispatch</span>
          </button>

          <button
            onClick={() => setIsOcrModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#00F2FE]/20 to-[#0284C7]/20 hover:from-[#00F2FE]/30 hover:to-[#0284C7]/30 border border-[#00F2FE]/50 text-[#00F2FE] font-black font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-[0_0_15px_rgba(0,242,254,0.2)]"
            title="AI Paper Scoresheet OCR Vision Scanner"
          >
            <Sparkles className="w-4 h-4 text-[#00F2FE]" />
            <span>OCR Scoresheet</span>
          </button>

          <button
            onClick={() => navigate('/calendar')}
            className="px-3.5 py-2 rounded-xl bg-[#212A31] hover:bg-slate-800 border border-slate-800 hover:border-[#E5B868] text-slate-200 hover:text-[#E5B868] font-black font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Sync Schedule with Google Calendar"
          >
            <Calendar className="w-4 h-4 text-[#E5B868]" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => navigate('/coach-check-in')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Staff Portal</span>
          </button>
        </div>
      </div>

      {/* 2. SINGLE STREAMLINED TAB BAR */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#212A31]/80 rounded-2xl border border-slate-800/80 overflow-x-auto scrollbar-none">
        {[
          { id: 'Events Central' as EventHubTab, label: 'Regular Events & Showcases', icon: Sparkles },
          { id: 'Tournaments' as EventHubTab, label: 'Tournaments', icon: Trophy },
          { id: 'Interactive Brackets' as EventHubTab, label: 'Tournament Brackets', icon: Layers },
          { id: 'Schedule' as EventHubTab, label: 'Game Schedule', icon: Calendar },
          { id: 'Live Scoring' as EventHubTab, label: 'Live Scoring', icon: Radio, isLive: true },
          { id: 'Venues' as EventHubTab, label: 'Courts & Venues', icon: Building2 },
          { id: 'Check-Ins' as EventHubTab, label: 'Check-Ins', icon: UserCheck },
          { id: 'Analytics' as EventHubTab, label: 'Analytics', icon: BarChart3 },
          { id: 'My Events' as EventHubTab, label: 'My Events', icon: Ticket }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#00F2FE] text-slate-950 font-black shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-[#212A31]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.isLive && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* 3. DYNAMIC CONTENT RENDERING BASED ON ACTIVE SUB-TAB */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.18 }}
        >
          {activeSubTab === 'Events Central' && (
            <StandaloneEventsTab
              events={filteredEvents}
              onCreateEvent={handleCreateEvent}
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
              onRegisterEvent={handleRegisterEvent}
              canManage={canManage}
            />
          )}

          {activeSubTab === 'Tournaments' && (
            <TournamentsTab
              tournaments={filteredTournaments}
              onSelectTournament={(id) => {
                setSelectedTournamentId(id);
                setActiveSubTab('Interactive Brackets');
              }}
              onCreateTournament={handleCreateTournament}
              onEditTournament={handleEditTournament}
              onDeleteTournament={handleDeleteTournament}
              canManage={canManage}
            />
          )}

          {activeSubTab === 'Interactive Brackets' && (
            <EventBrackets
              tournaments={filteredTournaments}
              events={filteredEvents}
              selectedTournamentId={selectedTournamentId}
              onSelectTournamentId={setSelectedTournamentId}
              canManage={canManage}
            />
          )}

          {activeSubTab === 'Schedule' && (
            <ScheduleTab
              matches={filteredMatches}
              venues={venues}
              onUpdateMatch={handleUpdateScheduleMatch}
              onAddMatches={handleAddScheduleMatches}
              onDeleteMatch={handleDeleteScheduleMatch}
              canManage={canManage}
            />
          )}

          {activeSubTab === 'Check-Ins' && (
            <CheckInsTab
              checkIns={filteredCheckIns}
              onToggleCheckIn={handleToggleCheckIn}
              canManage={canManage}
            />
          )}

          {activeSubTab === 'Live Scoring' && (
            <LiveGamesSection />
          )}

          {activeSubTab === 'Venues' && (
            <VenuesTab
              venues={venues}
              onCreateVenue={handleCreateVenue}
              onEditVenue={handleEditVenue}
              onDeleteVenue={handleDeleteVenue}
              canManage={canManage}
            />
          )}

          {activeSubTab === 'My Events' && (
            <MyEventsTab
              tournaments={filteredTournaments}
              matches={filteredMatches}
              checkIns={filteredCheckIns}
              onToggleCheckIn={handleToggleCheckIn}
              onSelectTournament={(id) => {
                setSelectedTournamentId(id);
                setActiveSubTab('Interactive Brackets');
              }}
            />
          )}

          {activeSubTab === 'Analytics' && (
            <TournamentAnalytics
              tournamentsOverride={filteredTournaments}
              checkInsOverride={filteredCheckIns}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* 4. FLOATING ACTION BUTTON (FAB) FOR QUICK ADD EVENT & TOURNAMENT */}
      <div className="fixed bottom-20 md:bottom-8 right-5 sm:right-8 z-40 flex flex-col items-end gap-3">
        {/* Speed-dial Toggle Buttons */}
        <AnimatePresence>
          {isFabMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-end gap-2.5 mb-1"
            >
              {/* Regular Event Pill */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setQuickAddModalMode('regular');
                  setIsQuickAddModalOpen(true);
                  setIsFabMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#182228] border-2 border-[#00F2FE] text-white hover:text-[#00F2FE] shadow-[0_0_25px_rgba(0,242,254,0.4)] backdrop-blur-xl font-mono text-xs font-bold uppercase tracking-wider cursor-pointer group"
              >
                <span className="font-sans font-black text-xs text-[#00F2FE]">1. Regular Event / Showcase</span>
                <div className="p-1.5 rounded-xl bg-[#00F2FE] text-slate-950">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </motion.button>

              {/* Tournament Pill */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setQuickAddModalMode('tournament');
                  setIsQuickAddModalOpen(true);
                  setIsFabMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#182228] border-2 border-[#E5B868] text-white hover:text-[#E5B868] shadow-[0_0_25px_rgba(229,184,104,0.4)] backdrop-blur-xl font-mono text-xs font-bold uppercase tracking-wider cursor-pointer group"
              >
                <span className="font-sans font-black text-xs text-[#E5B868]">2. Tournament & Bracket</span>
                <div className="p-1.5 rounded-xl bg-[#E5B868] text-slate-950">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Floating Trigger Button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            if (isFabMenuOpen) {
              setIsFabMenuOpen(false);
            } else {
              setIsFabMenuOpen(true);
            }
          }}
          className="relative group p-4 sm:px-5 sm:py-4 rounded-full sm:rounded-2xl bg-gradient-to-r from-[#00F2FE] via-[#00E5FF] to-[#38BDF8] text-slate-950 font-black flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,242,254,0.6)] cursor-pointer border-2 border-slate-950 transition-all"
          title="Quick Add Event or Tournament"
        >
          {isFabMenuOpen ? (
            <X className="w-6 h-6 stroke-[3]" />
          ) : (
            <>
              <Zap className="w-5 h-5 fill-slate-950 animate-pulse" />
              <span className="hidden sm:inline font-mono text-xs uppercase tracking-wider font-black">
                Quick Add Event
              </span>
              <Plus className="w-4 h-4 stroke-[3] sm:hidden" />
            </>
          )}

          {/* Glowing pulse ring */}
          <span className="absolute -inset-1 rounded-full sm:rounded-2xl bg-[#00F2FE]/30 animate-ping pointer-events-none -z-10" />
        </motion.button>
      </div>

      {/* 5. QUICK ADD EVENT & TOURNAMENT UNIFIED CREATOR MODAL */}
      <QuickAddEventModal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        initialMode={quickAddModalMode}
        onCreateEvent={handleCreateEvent}
        onCreateTournament={handleCreateTournament}
        onNavigateToTab={(tab) => {
          setActiveSubTab(tab);
        }}
      />

      {/* 6. GAME DAY EMERGENCY DISPATCH MODAL */}
      <GameDayDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        tournamentName={filteredTournaments[0]?.name || 'Tri-State Elite Tournament'}
      />

      {/* 7. AI MULTIMODAL SCORESHEET OCR MODAL */}
      <AiScoresheetScannerModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onStatsApplied={(extractedData) => {
          console.log('Scoresheet OCR extracted stats:', extractedData);
        }}
      />

      {/* 8. CLUB & TEAM REGISTRATION MODAL */}
      <TeamRegistrationModal
        isOpen={isTeamRegisterModalOpen}
        onClose={() => setIsTeamRegisterModalOpen(false)}
        tournamentName={filteredTournaments[0]?.name || 'Tri-State Elite Tournament'}
        tournamentFee={350}
      />

      {/* 9. EMBEDDABLE BRACKET & SCOREBOARD WIDGET MODAL */}
      <EmbeddableWidgetModal
        isOpen={isEmbedWidgetModalOpen}
        onClose={() => setIsEmbedWidgetModalOpen(false)}
        tournamentId={filteredTournaments[0]?.id || 'tristate-2026'}
        tournamentName={filteredTournaments[0]?.name || 'Tri-State Elite Tournament'}
      />

      {/* 10. OFFICIALS & REFEREE DISPATCH DESK MODAL */}
      <OfficialsScheduleDeskModal
        isOpen={isOfficialsDeskOpen}
        onClose={() => setIsOfficialsDeskOpen(false)}
      />
    </div>
  );
};

export default EventsSection;
