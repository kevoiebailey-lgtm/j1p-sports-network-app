import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { EventItem, TeamItem, GameItem, StandingItem, UserProfile } from '../types';
import { 
  cachedGetDoc, 
  cachedGetDocs, 
  getTournamentFromCache, 
  getTournamentTeamsFromCache, 
  getTournamentGamesFromCache, 
  getAthleteProfileFromCache 
} from './firestoreCacheService';

/**
 * Calculates exact age on a specific reference date (e.g., Event Start Date).
 */
export function calculateAgeOnDate(dobString?: string, referenceDateString?: string): number {
  if (!dobString) return 0;

  const dob = new Date(dobString);
  const refDate = referenceDateString ? new Date(referenceDateString) : new Date();

  if (isNaN(dob.getTime())) return 0;

  let age = refDate.getFullYear() - dob.getFullYear();
  const monthDiff = refDate.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < dob.getDate())) {
    age--;
  }

  return age >= 0 ? age : 0;
}

/**
 * Parses division maximum age limit from division name (e.g. "10U" -> 10, "12U" -> 12, "Varsity" -> 19).
 */
export function getDivisionMaxAge(divisionName: string): number {
  const norm = divisionName.trim().toUpperCase();
  
  if (norm.includes('8U')) return 8;
  if (norm.includes('10U')) return 10;
  if (norm.includes('12U')) return 12;
  if (norm.includes('14U')) return 14;
  if (norm.includes('15U')) return 15;
  if (norm.includes('16U')) return 16;
  if (norm.includes('17U')) return 17;
  if (norm.includes('VARSITY')) return 19;
  if (norm.includes('JUNIOR VARSITY') || norm.includes('JV')) return 16;
  if (norm.includes('FRESHMAN')) return 15;

  // Extract trailing digits if format is like "U12" or "Age 13"
  const digits = norm.match(/\d+/);
  if (digits) {
    return parseInt(digits[0], 10);
  }

  return 99; // Default unlimited
}

export interface EligibilityResult {
  eligible: boolean;
  age: number;
  maxAge: number;
  reason?: string;
}

/**
 * Verifies if an athlete's DOB qualifies for a division relative to event start date.
 */
export function verifyAthleteEligibility(
  athleteDob?: string,
  divisionName?: string,
  eventStartDate?: string
): EligibilityResult {
  if (!athleteDob) {
    return {
      eligible: false,
      age: 0,
      maxAge: 0,
      reason: 'Athlete profile missing Date of Birth.'
    };
  }

  const maxAge = divisionName ? getDivisionMaxAge(divisionName) : 99;
  const age = calculateAgeOnDate(athleteDob, eventStartDate);

  if (age > maxAge) {
    return {
      eligible: false,
      age,
      maxAge,
      reason: `Athlete ineligible for this division based on age (Age ${age} exceeds ${divisionName} limit of ${maxAge}).`
    };
  }

  return {
    eligible: true,
    age,
    maxAge
  };
}

/**
 * STANDINGS ENGINE
 * Ranks teams based on Pool Play final games:
 * 1. Most Wins
 * 2. Point Differential (Points For - Points Against)
 * 3. Most Points For
 */
export function calculateStandings(gamesData: GameItem[], teamsData: TeamItem[], division?: string): StandingItem[] {
  // Filter teams by division if provided
  const relevantTeams = division 
    ? teamsData.filter(t => t.division === division)
    : teamsData;

  const standingsMap: { [teamId: string]: StandingItem } = {};

  // Initialize standings for all teams
  relevantTeams.forEach(team => {
    standingsMap[team.id] = {
      teamId: team.id,
      teamName: team.teamName,
      division: team.division || division || 'General',
      played: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      rank: 1
    };
  });

  // Filter PoolPlay & Final games
  const poolGames = gamesData.filter(g => 
    g.gameType === 'PoolPlay' && 
    g.status === 'Final' &&
    (!division || g.division === division)
  );

  poolGames.forEach(game => {
    const teamA = standingsMap[game.teamA_Id];
    const teamB = standingsMap[game.teamB_Id];

    if (teamA) {
      teamA.played += 1;
      teamA.pointsFor += game.teamA_Score || 0;
      teamA.pointsAgainst += game.teamB_Score || 0;
      teamA.pointDiff = teamA.pointsFor - teamA.pointsAgainst;

      if (game.teamA_Score > game.teamB_Score) {
        teamA.wins += 1;
      } else if (game.teamA_Score < game.teamB_Score) {
        teamA.losses += 1;
      } else {
        teamA.ties += 1;
      }
    }

    if (teamB) {
      teamB.played += 1;
      teamB.pointsFor += game.teamB_Score || 0;
      teamB.pointsAgainst += game.teamA_Score || 0;
      teamB.pointDiff = teamB.pointsFor - teamB.pointsAgainst;

      if (game.teamB_Score > game.teamA_Score) {
        teamB.wins += 1;
      } else if (game.teamB_Score < game.teamA_Score) {
        teamB.losses += 1;
      } else {
        teamB.ties += 1;
      }
    }
  });

  // Convert to array and sort
  const sorted = Object.values(standingsMap).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return b.pointsFor - a.pointsFor;
  });

  // Assign ranks
  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
}

import { buildStandardEvent, publishEventToEventsCollection } from './eventPipelineService';

/**
 * FIRESTORE SERVICES
 */

// Save or Update Event with Standardized Schema
export async function saveEventToFirestore(eventData: Partial<EventItem>): Promise<string> {
  const published = await publishEventToEventsCollection(eventData);
  const eventId = published.id;

  // Local storage caching for offline/mobile instant availability
  if (published.eventType === 'tournament') {
    const tournamentDoc = {
      id: eventId,
      name: published.title,
      sport: published.sport,
      sportType: published.sportType,
      startDate: published.startDate,
      endDate: published.endDate,
      format: 'Single Elimination',
      venueName: published.location.venue,
      city: published.location.city,
      state: published.location.state,
      participatingTeams: published.registeredTeamIds.length > 0 
        ? published.registeredTeamIds 
        : ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta'],
      status: 'Upcoming',
      bannerUrl: published.bannerUrl || '',
      flyerUrl: published.flyerUrl || '',
      coverUrl: published.coverUrl || '',
      thumbnailUrl: published.thumbnailUrl || '',
      aspectRatio: 'banner',
      divisions: published.divisions || ['10U', '12U', '14U', '17U', 'Varsity'],
      teamFee: published.entryFee || 0,
      entryFee: published.entryFee ? `$${published.entryFee}` : 'Free Entry',
      createdAt: published.createdAt
    };

    try {
      const savedTourns = localStorage.getItem('just1play_tournaments');
      let list = savedTourns ? JSON.parse(savedTourns) : [];
      const idx = list.findIndex((t: any) => t.id === eventId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...tournamentDoc };
      } else {
        list.push(tournamentDoc);
      }
      localStorage.setItem('just1play_tournaments', JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  return eventId;
}

// Fetch all events with local-first cache and limit
export async function fetchEventsFromFirestore(): Promise<EventItem[]> {
  try {
    if (!db) return [];
    const querySnapshot = await cachedGetDocs(
      query(collection(db, 'events'), limit(60)),
      'tournament_hub_events',
      { strategy: 'stale-while-revalidate', ttlMs: 5 * 60 * 1000 }
    );
    const events: EventItem[] = [];
    querySnapshot.forEach(d => {
      events.push({ id: d.id, ...d.data() } as EventItem);
    });
    return events;
  } catch (err) {
    console.warn('Error reading events from Firestore:', err);
    return [];
  }
}

// Fetch single event with local-first cache
export async function fetchEventById(eventId: string): Promise<EventItem | null> {
  try {
    return await getTournamentFromCache(eventId);
  } catch (err) {
    console.error('Error fetching event by ID:', err);
    return null;
  }
}

// Register Team
export async function registerTeamToFirestore(teamData: Partial<TeamItem>): Promise<string> {
  const ref = doc(collection(db, 'teams'));
  const newTeam: TeamItem = {
    id: ref.id,
    eventId: teamData.eventId || '',
    coachId: teamData.coachId || 'anonymous-coach',
    coachName: teamData.coachName || 'Coach',
    division: teamData.division || 'Varsity',
    teamName: teamData.teamName || 'New Squad',
    paymentStatus: teamData.paymentStatus || 'Paid',
    roster: teamData.roster || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (db) {
    try {
      await setDoc(ref, newTeam);
    } catch (e) {
      console.warn('Teams setDoc warning:', e);
    }
  }

  // Backup team in localStorage for mobile
  try {
    const eventKey = `just1play_teams_${newTeam.eventId}`;
    const savedLocal = localStorage.getItem(eventKey);
    let teamList: TeamItem[] = savedLocal ? JSON.parse(savedLocal) : [];
    teamList.push(newTeam);
    localStorage.setItem(eventKey, JSON.stringify(teamList));
  } catch (err) {
    console.warn('Failed to cache team in localStorage:', err);
  }

  // Also append team name to participatingTeams on tournament if eventId exists
  if (newTeam.eventId && newTeam.teamName) {
    try {
      const savedTourns = localStorage.getItem('just1play_tournaments');
      if (savedTourns) {
        let list = JSON.parse(savedTourns);
        const idx = list.findIndex((t: any) => t.id === newTeam.eventId);
        if (idx !== -1) {
          const currentTeams = list[idx].participatingTeams || [];
          if (!currentTeams.includes(newTeam.teamName)) {
            list[idx].participatingTeams = [...currentTeams, newTeam.teamName];
            localStorage.setItem('just1play_tournaments', JSON.stringify(list));
            if (db) {
              await setDoc(doc(db, 'tournaments', newTeam.eventId), {
                participatingTeams: list[idx].participatingTeams
              }, { merge: true });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync team to tournament participatingTeams:', err);
    }
  }

  return ref.id;
}

// Fetch teams for an event using local-first cache
export async function fetchTeamsForEvent(eventId: string): Promise<TeamItem[]> {
  try {
    return await getTournamentTeamsFromCache(eventId);
  } catch (err) {
    console.warn('Error fetching teams for event:', err);
    return [];
  }
}

// Fetch games for an event using local-first cache
export async function fetchGamesForEvent(eventId: string): Promise<GameItem[]> {
  try {
    return await getTournamentGamesFromCache(eventId);
  } catch (err) {
    console.warn('Error fetching games for event:', err);
    return [];
  }
}

// Save or Update Game Score
export async function updateGameScoreInFirestore(
  gameId: string, 
  scoreA: number, 
  scoreB: number, 
  status: 'Scheduled' | 'In Progress' | 'Final' = 'Final'
): Promise<void> {
  const ref = doc(db, 'games', gameId);
  const snap = await cachedGetDoc(ref, { strategy: 'cache-first' });
  const data = snap.exists() ? snap.data() as GameItem : null;

  let winnerId = '';
  if (scoreA > scoreB) {
    winnerId = data?.teamA_Id || '';
  } else if (scoreB > scoreA) {
    winnerId = data?.teamB_Id || '';
  }

  await setDoc(ref, {
    teamA_Score: scoreA,
    teamB_Score: scoreB,
    status,
    winnerId,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// Update Team Roster
export async function updateTeamRosterInFirestore(teamId: string, athleteIds: string[]): Promise<void> {
  const ref = doc(db, 'teams', teamId);
  await updateDoc(ref, {
    roster: athleteIds,
    updatedAt: new Date().toISOString()
  });
}

// Find Athlete User Profile by athleteId (6-digit ID) or Name
export async function searchAthleteProfile(searchTerm: string): Promise<UserProfile[]> {
  try {
    const term = searchTerm.trim();
    if (!term || !db) return [];

    const usersRef = query(collection(db, 'users'), limit(100));
    const snapshot = await cachedGetDocs(
      usersRef,
      'tournament_hub_athletes_search',
      { strategy: 'stale-while-revalidate', ttlMs: 5 * 60 * 1000 }
    );
    const results: UserProfile[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as UserProfile;
      if (data.role === 'athlete' || !data.role) {
        const matchesId = data.athleteId && data.athleteId.toLowerCase().includes(term.toLowerCase());
        const matchesName = data.displayName && data.displayName.toLowerCase().includes(term.toLowerCase());
        const matchesUid = data.uid === term;
        if (matchesId || matchesName || matchesUid) {
          results.push({ uid: docSnap.id, ...data });
        }
      }
    });

    return results;
  } catch (err) {
    console.warn('Error searching athlete profile:', err);
    return [];
  }
}
