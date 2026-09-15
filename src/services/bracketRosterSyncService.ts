import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  query, 
  where, 
  limit 
} from 'firebase/firestore';
import { UserProfile, TeamItem, EventItem, EventBracket, BracketNodeMatch } from '../types';
import { calculateAgeOnDate, getDivisionMaxAge, verifyAthleteEligibility, EligibilityResult } from './tournamentHubService';
import { cachedGetDocs, cachedGetDoc } from './firestoreCacheService';

// Built-in verified athlete directory with real stats & profile IDs for instantaneous lookup & demo
export const SAMPLE_ATHLETE_DIRECTORY: UserProfile[] = [
  {
    uid: 'ath-101',
    athleteId: 'J1P-849201',
    email: 'marcus.vance@just1play.com',
    displayName: 'Marcus Vance',
    role: 'athlete',
    sport: 'Basketball',
    position: 'Point Guard',
    primaryPosition: 'PG',
    jerseyNumber: '3',
    teamName: 'Jersey City Ballers',
    gradYear: '2027',
    dateOfBirth: '2009-04-14',
    highSchool: 'Hudson Catholic Regional',
    state: 'NJ',
    city: 'Jersey City',
    height: "6'2\"",
    weight: '180 lbs',
    gpa: '3.8',
    bio: 'Explosive dual-threat floor general with elite court vision, 3-level scoring ability, and lock-down on-ball defense.',
    avatarUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80',
    isVerified: true,
    social: { instagram: '@marcusvance_3', twitter: '@MVance_Hoops', hudl: 'marcus-vance-2027' },
    stats: {
      points: 24.8,
      rebounds: 6.2,
      assists: 8.4,
      steals: 2.7,
      blocks: 0.8,
      gamesPlayed: 28
    },
    performanceMetrics: {
      speed: 94,
      agility: 96,
      strength: 82,
      vertical: 91,
      stamina: 93,
      iq: 97
    },
    mediaUrls: [],
    createdAt: '2026-01-10T12:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z'
  },
  {
    uid: 'ath-102',
    athleteId: 'J1P-920412',
    email: 'jordan.davis@just1play.com',
    displayName: 'Jordan Davis',
    role: 'athlete',
    sport: 'Basketball',
    position: 'Shooting Guard',
    primaryPosition: 'SG',
    jerseyNumber: '11',
    teamName: 'Jersey City Ballers',
    gradYear: '2027',
    dateOfBirth: '2009-06-22',
    highSchool: 'St. Peter\'s Prep',
    state: 'NJ',
    city: 'Jersey City',
    height: "6'5\"",
    weight: '195 lbs',
    gpa: '3.6',
    bio: 'Sharpshooting wing with 42% three-point accuracy, rapid catch-and-shoot release, and active length on defense.',
    avatarUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=400&auto=format&fit=crop&q=80',
    isVerified: true,
    social: { instagram: '@jordandavis_11', twitter: '@JDavis_Sniper' },
    stats: {
      points: 21.4,
      rebounds: 5.1,
      assists: 3.2,
      steals: 1.6,
      blocks: 0.9,
      gamesPlayed: 26
    },
    performanceMetrics: {
      speed: 88,
      agility: 90,
      strength: 84,
      vertical: 89,
      stamina: 91,
      iq: 92
    },
    mediaUrls: [],
    createdAt: '2026-01-12T12:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z'
  },
  {
    uid: 'ath-103',
    athleteId: 'J1P-738192',
    email: 'khalil.johnson@just1play.com',
    displayName: 'Khalil Johnson',
    role: 'athlete',
    sport: 'Basketball',
    position: 'Power Forward',
    primaryPosition: 'PF',
    jerseyNumber: '23',
    teamName: 'Paterson Vipers',
    gradYear: '2028',
    dateOfBirth: '2010-02-18',
    highSchool: 'Paterson Eastside',
    state: 'NJ',
    city: 'Paterson',
    height: "6'8\"",
    weight: '220 lbs',
    gpa: '3.4',
    bio: 'Dominant rim protector and high-motor rebounder with expanding face-up mid-range game.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    isVerified: true,
    social: { instagram: '@khalil_big23', hudl: 'khalil-johnson-2028' },
    stats: {
      points: 17.6,
      rebounds: 12.8,
      assists: 2.1,
      steals: 1.1,
      blocks: 3.4,
      gamesPlayed: 24
    },
    performanceMetrics: {
      speed: 80,
      agility: 82,
      strength: 96,
      vertical: 90,
      stamina: 87,
      iq: 89
    },
    mediaUrls: [],
    createdAt: '2026-02-01T12:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z'
  },
  {
    uid: 'ath-104',
    athleteId: 'J1P-619283',
    email: 'trevon.hayes@just1play.com',
    displayName: 'Trevon Hayes',
    role: 'athlete',
    sport: 'Basketball',
    position: 'Center',
    primaryPosition: 'C',
    jerseyNumber: '34',
    teamName: 'Bergen Catholic Elite',
    gradYear: '2027',
    dateOfBirth: '2009-08-05',
    highSchool: 'Bergen Catholic High School',
    state: 'NJ',
    city: 'Oradell',
    height: "6'10\"",
    weight: '235 lbs',
    gpa: '3.9',
    bio: 'Elite paint anchor with soft touch around the basket, defensive anchor presence, and high basketball IQ.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    isVerified: true,
    social: { instagram: '@trevon_hayes34' },
    stats: {
      points: 19.2,
      rebounds: 14.1,
      assists: 3.5,
      steals: 0.7,
      blocks: 4.1,
      gamesPlayed: 25
    },
    performanceMetrics: {
      speed: 76,
      agility: 78,
      strength: 98,
      vertical: 86,
      stamina: 85,
      iq: 95
    },
    mediaUrls: [],
    createdAt: '2026-02-10T12:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z'
  },
  {
    uid: 'ath-105',
    athleteId: 'J1P-510294',
    email: 'bryce.taylor@just1play.com',
    displayName: 'Bryce Taylor',
    role: 'athlete',
    sport: 'Basketball',
    position: 'Small Forward',
    primaryPosition: 'SF',
    jerseyNumber: '7',
    teamName: 'Newark Express',
    gradYear: '2028',
    dateOfBirth: '2010-09-11',
    highSchool: 'Arts High School',
    state: 'NJ',
    city: 'Newark',
    height: "6'6\"",
    weight: '190 lbs',
    gpa: '3.5',
    bio: 'Athletic slasher with tremendous open-court speed, transition finishing, and perimeter defense.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    isVerified: true,
    social: { instagram: '@brycetaylor_7' },
    stats: {
      points: 18.5,
      rebounds: 7.3,
      assists: 4.0,
      steals: 2.1,
      blocks: 1.2,
      gamesPlayed: 22
    },
    performanceMetrics: {
      speed: 92,
      agility: 93,
      strength: 86,
      vertical: 94,
      stamina: 90,
      iq: 90
    },
    mediaUrls: [],
    createdAt: '2026-03-01T12:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z'
  },
  {
    uid: 'ath-106',
    athleteId: 'J1P-392817',
    email: 'kaden.williams@just1play.com',
    displayName: 'Kaden Williams',
    role: 'athlete',
    sport: 'Flag Football',
    position: 'Quarterback',
    primaryPosition: 'QB',
    jerseyNumber: '1',
    teamName: 'Philly Blitz',
    gradYear: '2028',
    dateOfBirth: '2010-11-04',
    highSchool: 'Roman Catholic',
    state: 'PA',
    city: 'Philadelphia',
    height: "6'1\"",
    weight: '185 lbs',
    gpa: '3.7',
    bio: 'Pinpoint precision passer with 45+ TD passes, calm pocket presence, and quick release.',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    isVerified: true,
    social: { instagram: '@kaden_qb1', twitter: '@KadenWilliamsQB' },
    stats: {
      passingYards: 3250,
      rushingYards: 480,
      receptions: 0,
      flagPulls: 12,
      interceptions: 4,
      gamesPlayed: 14
    } as any,
    performanceMetrics: {
      speed: 90,
      agility: 92,
      strength: 84,
      vertical: 88,
      stamina: 92,
      iq: 98
    },
    mediaUrls: [],
    createdAt: '2026-03-10T12:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z'
  },
  {
    uid: 'ath-107',
    athleteId: 'J1P-284910',
    email: 'maya.rodriguez@just1play.com',
    displayName: 'Maya Rodriguez',
    role: 'athlete',
    sport: 'Flag Football',
    position: 'Wide Receiver',
    primaryPosition: 'WR',
    jerseyNumber: '88',
    teamName: 'Edison Valkyries',
    gradYear: '2027',
    dateOfBirth: '2009-05-19',
    highSchool: 'Edison High School',
    state: 'NJ',
    city: 'Edison',
    height: "5'9\"",
    weight: '145 lbs',
    gpa: '4.0',
    bio: 'Electrifying route-runner with 4.5 40-yd dash speed, soft hands, and unmatched agility in space.',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    isVerified: true,
    social: { instagram: '@mayarod_88' },
    stats: {
      passingYards: 0,
      rushingYards: 120,
      receptions: 68,
      flagPulls: 24,
      interceptions: 6,
      gamesPlayed: 12
    } as any,
    performanceMetrics: {
      speed: 98,
      agility: 97,
      strength: 78,
      vertical: 92,
      stamina: 95,
      iq: 94
    },
    mediaUrls: [],
    createdAt: '2026-03-15T12:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z'
  },
  {
    uid: 'ath-108',
    athleteId: 'J1P-194820',
    email: 'lucas.chen@just1play.com',
    displayName: 'Lucas Chen',
    role: 'athlete',
    sport: 'Basketball',
    position: 'Point Guard',
    primaryPosition: 'PG',
    jerseyNumber: '5',
    teamName: 'St. Anthony Select',
    gradYear: '2029',
    dateOfBirth: '2011-03-25',
    highSchool: 'Paramus Catholic',
    state: 'NJ',
    city: 'Paramus',
    height: "5'11\"",
    weight: '160 lbs',
    gpa: '3.95',
    bio: 'High-IQ floor commander with lightning crossover, pick-and-roll mastery, and 90% free throw shooting.',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    isVerified: true,
    social: { instagram: '@lucaschen_pg' },
    stats: {
      points: 16.4,
      rebounds: 4.2,
      assists: 9.1,
      steals: 2.9,
      blocks: 0.3,
      gamesPlayed: 20
    },
    performanceMetrics: {
      speed: 95,
      agility: 96,
      strength: 76,
      vertical: 87,
      stamina: 94,
      iq: 99
    },
    mediaUrls: [],
    createdAt: '2026-04-01T12:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z'
  }
];

// Helper to search and sync athlete profile by Profile ID, Athlete ID, UID, Name or Email
export async function lookupAthleteByProfileId(searchTerm: string): Promise<UserProfile[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];

  const foundProfiles: UserProfile[] = [];
  const addedUids = new Set<string>();

  // 1. Search built-in sample athlete directory first (always works instantly offline/online)
  for (const ath of SAMPLE_ATHLETE_DIRECTORY) {
    const matchId = ath.athleteId && ath.athleteId.toLowerCase().includes(term);
    const matchUid = ath.uid.toLowerCase() === term;
    const matchName = ath.displayName.toLowerCase().includes(term);
    const matchEmail = ath.email.toLowerCase().includes(term);
    const matchJersey = ath.jerseyNumber === term;

    if (matchId || matchUid || matchName || matchEmail || matchJersey) {
      foundProfiles.push(ath);
      addedUids.add(ath.uid);
    }
  }

  // 2. Query Firestore 'users' collection
  if (db) {
    try {
      const usersRef = query(collection(db, 'users'), limit(50));
      const snap = await cachedGetDocs(usersRef, 'bracket_roster_users_lookup', {
        strategy: 'stale-while-revalidate',
        ttlMs: 3 * 60 * 1000
      });

      snap.forEach(d => {
        if (!addedUids.has(d.id)) {
          const u = d.data() as UserProfile;
          const matchId = u.athleteId && u.athleteId.toLowerCase().includes(term);
          const matchUid = d.id.toLowerCase() === term || u.uid?.toLowerCase() === term;
          const matchName = u.displayName && u.displayName.toLowerCase().includes(term);
          const matchEmail = u.email && u.email.toLowerCase().includes(term);

          if (matchId || matchUid || matchName || matchEmail) {
            foundProfiles.push({ uid: d.id, ...u });
            addedUids.add(d.id);
          }
        }
      });
    } catch (err) {
      console.warn('Firestore user lookup notice:', err);
    }
  }

  return foundProfiles;
}

// Generate unique athlete profile ID (e.g. J1P-849201)
export function generateAthleteProfileId(): string {
  const randomSixDigits = Math.floor(100000 + Math.random() * 900000);
  return `J1P-${randomSixDigits}`;
}

// Compute aggregate team projected stats from athlete profiles
export interface TeamAggregateStats {
  totalPlayers: number;
  avgPpg: number;
  totalPpg: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  avgHeightInches: number;
  avgHeightDisplay: string;
  avgGpa: number;
  avgAge: number;
  verifiedCount: number;
  eligibilityPassCount: number;
  flaggedCount: number;
  speedRating: number;
  iqRating: number;
}

export function computeTeamAggregateStats(
  rosterAthletes: UserProfile[],
  divisionName?: string,
  eventDate?: string
): TeamAggregateStats {
  if (!rosterAthletes || rosterAthletes.length === 0) {
    return {
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
  }

  let totalPoints = 0;
  let totalRebounds = 0;
  let totalAssists = 0;
  let totalSteals = 0;
  let totalBlocks = 0;
  let totalHeightInches = 0;
  let heightCount = 0;
  let totalGpa = 0;
  let gpaCount = 0;
  let totalAge = 0;
  let ageCount = 0;
  let verifiedCount = 0;
  let eligibilityPassCount = 0;
  let flaggedCount = 0;
  let totalSpeed = 0;
  let totalIq = 0;

  rosterAthletes.forEach(ath => {
    // Stats calculation
    const bStats = ath.stats as any;
    if (bStats) {
      totalPoints += Number(bStats.points || bStats.passingTds * 6 || bStats.receivingTds * 6 || 0);
      totalRebounds += Number(bStats.rebounds || bStats.receptions || 0);
      totalAssists += Number(bStats.assists || 0);
      totalSteals += Number(bStats.steals || bStats.flagPulls || 0);
      totalBlocks += Number(bStats.blocks || bStats.interceptions || 0);
    }

    // Height parsing (e.g. 6'2" -> 74 inches)
    if (ath.height) {
      const match = ath.height.match(/(\d+)'\s*(\d+)?/);
      if (match) {
        const feet = parseInt(match[1], 10);
        const inches = match[2] ? parseInt(match[2], 10) : 0;
        totalHeightInches += feet * 12 + inches;
        heightCount++;
      }
    }

    // GPA
    if (ath.gpa) {
      const g = parseFloat(ath.gpa);
      if (!isNaN(g)) {
        totalGpa += g;
        gpaCount++;
      }
    }

    // Age & Division Eligibility
    if (ath.dateOfBirth) {
      const age = calculateAgeOnDate(ath.dateOfBirth, eventDate);
      totalAge += age;
      ageCount++;

      const elig = verifyAthleteEligibility(ath.dateOfBirth, divisionName, eventDate);
      if (elig.eligible) {
        eligibilityPassCount++;
      } else {
        flaggedCount++;
      }
    } else {
      flaggedCount++;
    }

    if (ath.isVerified) verifiedCount++;

    if (ath.performanceMetrics) {
      totalSpeed += ath.performanceMetrics.speed || 80;
      totalIq += ath.performanceMetrics.iq || 85;
    } else {
      totalSpeed += 82;
      totalIq += 85;
    }
  });

  const count = rosterAthletes.length;
  const avgHeight = heightCount > 0 ? Math.round(totalHeightInches / heightCount) : 0;
  const avgHeightFeet = Math.floor(avgHeight / 12);
  const avgHeightRemInches = avgHeight % 12;

  return {
    totalPlayers: count,
    avgPpg: Number((totalPoints / count).toFixed(1)),
    totalPpg: Number(totalPoints.toFixed(1)),
    avgRebounds: Number((totalRebounds / count).toFixed(1)),
    avgAssists: Number((totalAssists / count).toFixed(1)),
    avgSteals: Number((totalSteals / count).toFixed(1)),
    avgBlocks: Number((totalBlocks / count).toFixed(1)),
    avgHeightInches: avgHeight,
    avgHeightDisplay: avgHeight > 0 ? `${avgHeightFeet}'${avgHeightRemInches}"` : '--',
    avgGpa: gpaCount > 0 ? Number((totalGpa / gpaCount).toFixed(2)) : 3.5,
    avgAge: ageCount > 0 ? Number((totalAge / ageCount).toFixed(1)) : 15.0,
    verifiedCount,
    eligibilityPassCount,
    flaggedCount,
    speedRating: Math.round(totalSpeed / count),
    iqRating: Math.round(totalIq / count)
  };
}

// Persist or update team roster in Firestore with local backup
export async function saveTeamRosterWithProfiles(
  teamId: string,
  rosterUids: string[],
  rosterDetails: UserProfile[],
  eventId?: string
): Promise<void> {
  if (db && teamId) {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        roster: rosterUids,
        rosterDetails: rosterDetails,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Firestore updateTeamRoster error:', err);
    }
  }

  // Also update in localStorage cache
  try {
    const key = eventId ? `just1play_teams_${eventId}` : 'just1play_teams_global';
    const saved = localStorage.getItem(key);
    let list: TeamItem[] = saved ? JSON.parse(saved) : [];
    const idx = list.findIndex(t => t.id === teamId);
    if (idx !== -1) {
      list[idx].roster = rosterUids;
      list[idx].rosterDetails = rosterDetails;
      list[idx].updatedAt = new Date().toISOString();
    }
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}
