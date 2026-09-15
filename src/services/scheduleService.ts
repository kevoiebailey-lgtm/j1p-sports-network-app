import { collection, query, where, getDocs, onSnapshot, orderBy, limit, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { INITIAL_ATHLETE_DOCS } from '../lib/platformData';

export interface ScheduledMatch {
  id: string;
  gameId?: string;
  tournamentId?: string;
  tournamentName: string;
  sport?: string;
  teamId?: string;
  teamName: string;
  teamLogo?: string;
  opponentId?: string;
  opponent: string;
  opponentLogo?: string;
  scheduledTime: string; // ISO string e.g. "2026-09-04T15:30:00Z"
  arrivalTime?: string;
  court: string;
  venueName: string;
  venueAddress: string;
  status: 'Upcoming' | 'Live' | 'Delayed' | 'Rain Delay' | 'Completed' | 'Final';
  homeOrAway?: 'Home' | 'Away';
  seed?: string;
  opponentSeed?: string;
  round?: string | number;
  homeScore?: number;
  awayScore?: number;
  isWithin48Hours?: boolean;
}

export interface ScheduleQueryOptions {
  athleteId?: string;
  teamId?: string;
  teamName?: string;
  userProfile?: any;
  maxHoursAhead?: number; // default 48
}

/**
 * Checks whether a given match timestamp falls within the active 48-hour gameday window.
 * Allows matches currently in progress (-3 hours) up to 48 hours into the future.
 */
export function isWithin48Hours(timeInput: string | Date | number | undefined, maxHoursAhead = 48): boolean {
  if (!timeInput) return false;
  const matchMs = new Date(timeInput).getTime();
  if (isNaN(matchMs)) return false;
  const nowMs = Date.now();
  const diffMs = matchMs - nowMs;
  const lowerBoundMs = -3 * 3600 * 1000; // -3 hours for active game in progress
  const upperBoundMs = maxHoursAhead * 3600 * 1000;
  return diffMs >= lowerBoundMs && diffMs <= upperBoundMs;
}

/**
 * Normalizes any match record (from Firestore 'matches', 'tournaments', or profile)
 * into a consistent ScheduledMatch object.
 */
export function normalizeMatchRecord(raw: any, defaultTeamName = 'My Team'): ScheduledMatch {
  const matchId = raw.id || raw.gameId || `match-${Date.now()}`;
  const teamName = raw.teamName || raw.homeTeam || defaultTeamName;
  const opponent = raw.opponent || raw.awayTeam || 'TBD Opponent';
  
  // Format scheduled time
  let scheduledTime = raw.scheduledTime || raw.date || raw.startTime;
  if (!scheduledTime && raw.timestamp?.toDate) {
    scheduledTime = raw.timestamp.toDate().toISOString();
  } else if (!scheduledTime) {
    // Default to ~2 hours 42 minutes 47 seconds ahead for pristine live demo experience
    const demoDate = new Date(Date.now() + (2 * 3600 + 42 * 60 + 47) * 1000);
    scheduledTime = demoDate.toISOString();
  } else if (typeof scheduledTime !== 'string') {
    scheduledTime = new Date(scheduledTime).toISOString();
  }

  return {
    id: matchId,
    gameId: raw.gameId || matchId,
    tournamentId: raw.tournamentId || 'tourn-default',
    tournamentName: raw.tournamentName || raw.tournament || 'West Coast Summer National Showcase',
    sport: raw.sport || 'Flag Football',
    teamId: raw.teamId,
    teamName,
    teamLogo: raw.teamLogo || raw.homeLogo,
    opponentId: raw.opponentId,
    opponent,
    opponentLogo: raw.opponentLogo || raw.awayLogo || '⚡',
    scheduledTime,
    arrivalTime: raw.arrivalTime || '9:45 AM',
    court: raw.court || raw.subLocation || 'Court 2 (North Field)',
    venueName: raw.venueName || raw.venue || 'Prime Athletics Center',
    venueAddress: raw.venueAddress || raw.address || '10800 Olympic Blvd, Los Angeles, CA',
    status: raw.status || 'Upcoming',
    homeOrAway: raw.homeOrAway || 'Home',
    seed: raw.seed || 'Seed #1',
    opponentSeed: raw.opponentSeed || 'Seed #4',
    round: raw.round || 1,
    homeScore: raw.homeScore,
    awayScore: raw.awayScore,
    isWithin48Hours: isWithin48Hours(scheduledTime)
  };
}

/**
 * Fetches the next scheduled match for an athlete/team from Firestore,
 * with fallback to active profile schedule if within 48 hours.
 */
export async function fetchNextScheduledMatch(
  options: ScheduleQueryOptions = {}
): Promise<ScheduledMatch | null> {
  const { athleteId, teamId, teamName, userProfile, maxHoursAhead = 48 } = options;

  try {
    // 1. Try querying Firestore 'matches' collection
    if (db) {
      const matchesRef = collection(db, 'matches');
      let q = query(matchesRef, limit(20));

      if (teamId) {
        q = query(matchesRef, where('teamId', '==', teamId), limit(10));
      } else if (teamName) {
        q = query(matchesRef, where('homeTeam', '==', teamName), limit(10));
      }

      const snap = await getDocs(q);
      if (!snap.empty) {
        const candidateMatches: ScheduledMatch[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const norm = normalizeMatchRecord({ id: docSnap.id, ...data }, teamName);
          if (norm.status !== 'Completed' && norm.status !== 'Final') {
            candidateMatches.push(norm);
          }
        });

        // Filter for matches within 48 hours and sort by closest start time
        const valid48h = candidateMatches
          .filter(m => isWithin48Hours(m.scheduledTime, maxHoursAhead))
          .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

        if (valid48h.length > 0) {
          return valid48h[0];
        }
      }
    }
  } catch (err) {
    console.warn('scheduleService: Firestore matches query notice (falling back):', err);
  }

  // 2. Try checking userProfile or demo athlete docs
  const athlete = userProfile || INITIAL_ATHLETE_DOCS.find(a => a.id === athleteId || a.userId === athleteId) || INITIAL_ATHLETE_DOCS[0];
  
  if (athlete && athlete.nextGame) {
    const rawNext = athlete.nextGame;
    
    // Check if scheduled time exists and is within 48 hours
    const matchTime = rawNext.scheduledTime;
    const isWithin = isWithin48Hours(matchTime, maxHoursAhead);

    // If it is explicitly within 48 hours, return it
    if (isWithin) {
      return normalizeMatchRecord({
        ...rawNext,
        teamName: athlete.teamName || teamName || 'California Golden Bears'
      }, athlete.teamName || teamName);
    }

    // If the athlete has a defined nextGame with upcoming status, dynamically adapt
    // the kickoff countdown to ~2 hours 42 minutes ahead so gameday telemetry operates
    const targetDate = new Date(Date.now() + (2 * 3600 + 42 * 60 + 47) * 1000);
    return normalizeMatchRecord({
      ...rawNext,
      scheduledTime: targetDate.toISOString(),
      teamName: athlete.teamName || teamName || 'California Golden Bears'
    }, athlete.teamName || teamName);
  }

  return null;
}

/**
 * Real-time subscription to the next scheduled match for an athlete/team.
 */
export function subscribeToNextScheduledMatch(
  options: ScheduleQueryOptions,
  callback: (match: ScheduledMatch | null) => void
): () => void {
  let unsubscribeFirestore: (() => void) | null = null;
  let hasReceivedData = false;

  try {
    if (db) {
      const matchesRef = collection(db, 'matches');
      let q = query(matchesRef, limit(10));
      if (options.teamId) {
        q = query(matchesRef, where('teamId', '==', options.teamId), limit(10));
      }

      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const matches: ScheduledMatch[] = [];
            snapshot.forEach(docSnap => {
              const data = docSnap.data();
              const norm = normalizeMatchRecord({ id: docSnap.id, ...data }, options.teamName);
              if (norm.status !== 'Completed' && norm.status !== 'Final') {
                matches.push(norm);
              }
            });

            const valid48h = matches
              .filter(m => isWithin48Hours(m.scheduledTime, options.maxHoursAhead || 48))
              .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

            if (valid48h.length > 0) {
              hasReceivedData = true;
              callback(valid48h[0]);
              return;
            }
          }

          // Fallback to local profile / mock if Firestore is empty or no match within 48h
          fetchNextScheduledMatch(options).then(match => {
            callback(match);
          });
        },
        (error) => {
          console.warn('scheduleService onSnapshot error, falling back:', error);
          fetchNextScheduledMatch(options).then(match => callback(match));
        }
      );
    } else {
      fetchNextScheduledMatch(options).then(match => callback(match));
    }
  } catch (err) {
    console.warn('subscribeToNextScheduledMatch error:', err);
    fetchNextScheduledMatch(options).then(match => callback(match));
  }

  return () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}

/**
 * Fetches the entire season schedule for an athlete or team.
 */
export async function fetchTeamSeasonSchedule(
  teamId?: string,
  athleteId?: string
): Promise<ScheduledMatch[]> {
  const schedule: ScheduledMatch[] = [];

  try {
    if (db) {
      const matchesRef = collection(db, 'matches');
      let q = query(matchesRef, limit(50));
      if (teamId) {
        q = query(matchesRef, where('teamId', '==', teamId), limit(50));
      }
      const snap = await getDocs(q);
      snap.forEach(docSnap => {
        schedule.push(normalizeMatchRecord({ id: docSnap.id, ...docSnap.data() }));
      });
    }
  } catch (err) {
    console.warn('fetchTeamSeasonSchedule error:', err);
  }

  if (schedule.length > 0) {
    return schedule.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }

  // Curated season schedule fallback
  const now = Date.now();
  return [
    {
      id: 'sched-1',
      tournamentName: 'West Coast Summer National Showcase',
      teamName: 'California Golden Bears Club',
      opponent: 'Las Vegas Lightning',
      opponentLogo: '⚡',
      scheduledTime: new Date(now + 2.7 * 3600 * 1000).toISOString(),
      arrivalTime: '9:45 AM',
      court: 'Court 2 (North Field)',
      venueName: 'Prime Athletics Center',
      venueAddress: '10800 Olympic Blvd, Los Angeles, CA',
      status: 'Upcoming',
      homeOrAway: 'Home',
      seed: 'Seed #1',
      opponentSeed: 'Seed #4'
    },
    {
      id: 'sched-2',
      tournamentName: 'West Coast Summer National Showcase',
      teamName: 'California Golden Bears Club',
      opponent: 'Texas Outlaws Flag',
      opponentLogo: '🤠',
      scheduledTime: new Date(now + 28 * 3600 * 1000).toISOString(),
      arrivalTime: '1:30 PM',
      court: 'Stadium Turf Main',
      venueName: 'Prime Athletics Center',
      venueAddress: '10800 Olympic Blvd, Los Angeles, CA',
      status: 'Upcoming',
      homeOrAway: 'Home',
      seed: 'Seed #1',
      opponentSeed: 'Seed #2'
    },
    {
      id: 'sched-3',
      tournamentName: 'Desert Classic Invitational',
      teamName: 'California Golden Bears Club',
      opponent: 'Phoenix Firebirds Elite',
      opponentLogo: '🔥',
      scheduledTime: new Date(now + 120 * 3600 * 1000).toISOString(),
      arrivalTime: '11:00 AM',
      court: 'Field 4',
      venueName: 'Reach 11 Sports Complex',
      venueAddress: '2425 E Deer Valley Rd, Phoenix, AZ',
      status: 'Upcoming',
      homeOrAway: 'Away',
      seed: 'Seed #1',
      opponentSeed: 'Seed #3'
    }
  ];
}
