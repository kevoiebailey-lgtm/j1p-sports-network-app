import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  writeBatch,
  Unsubscribe 
} from 'firebase/firestore';
import { GameItem, TeamItem, StandingItem } from '../types';

export type BracketType = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN_POOL';
export type MatchStatus = 'SCHEDULED' | 'WARMUP' | 'IN_PROGRESS' | 'HALFTIME' | 'FINAL' | 'DELAYED' | 'CANCELLED';

export interface BracketTeam {
  id: string;
  name: string;
  seed?: number;
  coach?: string;
  division?: string;
  logoUrl?: string;
}

export interface BracketNodeMatch {
  id: string;
  tournamentId: string;
  bracketType: BracketType;
  round: number;
  matchNumber: number;
  bracketSection?: 'WINNERS' | 'LOSERS' | 'FINALS' | 'POOL_A' | 'POOL_B' | 'POOL_C' | 'POOL_D';
  teamA_Id?: string;
  teamA_Name?: string;
  teamA_Seed?: number;
  teamA_Score?: number;
  teamB_Id?: string;
  teamB_Name?: string;
  teamB_Seed?: number;
  teamB_Score?: number;
  winnerId?: string;
  loserId?: string;
  nextMatchId?: string;
  nextMatchSlot?: 'teamA' | 'teamB';
  loserMatchId?: string;
  loserMatchSlot?: 'teamA' | 'teamB';
  status: MatchStatus;
  scheduledTime?: string;
  courtOrField?: string;
  division?: string;
  isBye?: boolean;
}

/**
 * 1. SINGLE ELIMINATION BRACKET GENERATOR
 * Computes standard seeded binary bracket trees with BYE handling for non-power-of-2 team counts.
 */
export function generateSingleEliminationBracket(
  tournamentId: string,
  teams: BracketTeam[],
  options: {
    division?: string;
    venue?: string;
    courts?: string[];
    startDate?: string;
    slotMinutes?: number;
  } = {}
): BracketNodeMatch[] {
  const sortedTeams = [...teams].sort((a, b) => (a.seed || 99) - (b.seed || 99));
  const numTeams = sortedTeams.length;
  if (numTeams < 2) return [];

  // Determine power of 2 bracket size
  let bracketSize = 2;
  while (bracketSize < numTeams) {
    bracketSize *= 2;
  }

  const totalRounds = Math.log2(bracketSize);
  const matches: BracketNodeMatch[] = [];
  const courts = options.courts && options.courts.length > 0 ? options.courts : ['Court 1', 'Court 2', 'Court 3'];
  const division = options.division || 'Varsity';

  // Seed pairings generation (e.g. for 8 teams: 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6)
  const generateSeededOrder = (size: number): number[] => {
    let order = [1, 2];
    while (order.length < size) {
      const nextOrder: number[] = [];
      const currentSize = order.length * 2;
      for (const seed of order) {
        nextOrder.push(seed);
        nextOrder.push(currentSize + 1 - seed);
      }
      order = nextOrder;
    }
    return order;
  };

  const seedOrder = generateSeededOrder(bracketSize);

  // Round 1 matches
  const round1MatchesCount = bracketSize / 2;
  for (let m = 0; m < round1MatchesCount; m++) {
    const seedA = seedOrder[m * 2];
    const seedB = seedOrder[m * 2 + 1];

    const teamA = sortedTeams[seedA - 1];
    const teamB = sortedTeams[seedB - 1];

    const matchId = `match_${tournamentId}_r1_m${m + 1}`;
    const nextMatchNumber = Math.floor(m / 2) + 1;
    const nextMatchId = `match_${tournamentId}_r2_m${nextMatchNumber}`;
    const nextMatchSlot: 'teamA' | 'teamB' = m % 2 === 0 ? 'teamA' : 'teamB';

    // BYE condition
    const isBye = !teamB && !!teamA;

    matches.push({
      id: matchId,
      tournamentId,
      bracketType: 'SINGLE_ELIMINATION',
      round: 1,
      matchNumber: m + 1,
      bracketSection: 'WINNERS',
      teamA_Id: teamA?.id || undefined,
      teamA_Name: teamA?.name || 'TBD',
      teamA_Seed: teamA ? seedA : undefined,
      teamA_Score: 0,
      teamB_Id: teamB?.id || undefined,
      teamB_Name: isBye ? 'BYE' : (teamB?.name || 'TBD'),
      teamB_Seed: teamB ? seedB : undefined,
      teamB_Score: 0,
      winnerId: isBye ? teamA?.id : undefined,
      nextMatchId: totalRounds > 1 ? nextMatchId : undefined,
      nextMatchSlot,
      status: isBye ? 'FINAL' : 'SCHEDULED',
      courtOrField: courts[m % courts.length],
      division,
      isBye
    });
  }

  // Generate Subsequent Rounds (Quarterfinals, Semifinals, Finals)
  for (let r = 2; r <= totalRounds; r++) {
    const roundMatchesCount = bracketSize / Math.pow(2, r);
    for (let m = 0; m < roundMatchesCount; m++) {
      const matchId = `match_${tournamentId}_r${r}_m${m + 1}`;
      const nextMatchNumber = Math.floor(m / 2) + 1;
      const nextMatchId = r < totalRounds ? `match_${tournamentId}_r${r + 1}_m${nextMatchNumber}` : undefined;
      const nextMatchSlot: 'teamA' | 'teamB' = m % 2 === 0 ? 'teamA' : 'teamB';

      // Check if previous round had BYE that auto-populates this round
      const prevMatchA = matches.find(x => x.round === r - 1 && x.matchNumber === m * 2 + 1);
      const prevMatchB = matches.find(x => x.round === r - 1 && x.matchNumber === m * 2 + 2);

      matches.push({
        id: matchId,
        tournamentId,
        bracketType: 'SINGLE_ELIMINATION',
        round: r,
        matchNumber: m + 1,
        bracketSection: r === totalRounds ? 'FINALS' : 'WINNERS',
        teamA_Id: prevMatchA?.winnerId || undefined,
        teamA_Name: prevMatchA?.winnerId ? (sortedTeams.find(t => t.id === prevMatchA.winnerId)?.name || 'Winner M' + (m * 2 + 1)) : `Winner R${r-1} M${m * 2 + 1}`,
        teamA_Score: 0,
        teamB_Id: prevMatchB?.winnerId || undefined,
        teamB_Name: prevMatchB?.winnerId ? (sortedTeams.find(t => t.id === prevMatchB.winnerId)?.name || 'Winner M' + (m * 2 + 2)) : `Winner R${r-1} M${m * 2 + 2}`,
        teamB_Score: 0,
        nextMatchId,
        nextMatchSlot: r < totalRounds ? nextMatchSlot : undefined,
        status: 'SCHEDULED',
        courtOrField: courts[(m + r) % courts.length],
        division
      });
    }
  }

  return matches;
}

/**
 * 2. ROUND ROBIN POOL PLAY GENERATOR
 */
export function generateRoundRobinPools(
  tournamentId: string,
  teams: BracketTeam[],
  poolsCount: number = 2,
  options: {
    division?: string;
    courts?: string[];
  } = {}
): { poolAssignments: Record<string, BracketTeam[]>; matches: BracketNodeMatch[] } {
  const poolAssignments: Record<string, BracketTeam[]> = {};
  const poolLetters = ['POOL_A', 'POOL_B', 'POOL_C', 'POOL_D'] as const;
  const actualPools = Math.min(poolsCount, 4);

  for (let i = 0; i < actualPools; i++) {
    poolAssignments[poolLetters[i]] = [];
  }

  // Distribute teams snake style
  teams.forEach((team, idx) => {
    const poolIdx = idx % actualPools;
    poolAssignments[poolLetters[poolIdx]].push(team);
  });

  const matches: BracketNodeMatch[] = [];
  const courts = options.courts && options.courts.length > 0 ? options.courts : ['Court 1', 'Court 2'];
  let matchCounter = 1;

  for (let p = 0; p < actualPools; p++) {
    const poolKey = poolLetters[p];
    const poolTeams = poolAssignments[poolKey];
    const n = poolTeams.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const teamA = poolTeams[i];
        const teamB = poolTeams[j];

        matches.push({
          id: `pool_${tournamentId}_${poolKey}_m${matchCounter}`,
          tournamentId,
          bracketType: 'ROUND_ROBIN_POOL',
          round: 1,
          matchNumber: matchCounter,
          bracketSection: poolKey,
          teamA_Id: teamA.id,
          teamA_Name: teamA.name,
          teamA_Seed: teamA.seed,
          teamA_Score: 0,
          teamB_Id: teamB.id,
          teamB_Name: teamB.name,
          teamB_Seed: teamB.seed,
          teamB_Score: 0,
          status: 'SCHEDULED',
          courtOrField: courts[matchCounter % courts.length],
          division: options.division || teamA.division || 'Varsity'
        });
        matchCounter++;
      }
    }
  }

  return { poolAssignments, matches };
}

/**
 * 3. ADVANCE TOURNAMENT BRACKET MATCH
 * Automatically updates game outcome, calculates winner, and writes winner into next bracket node in Firestore.
 */
export async function advanceTournamentBracketMatch(
  tournamentId: string,
  gameId: string,
  finalScoreA: number,
  finalScoreB: number
): Promise<{ success: boolean; winnerId: string; winnerName: string; nextGameId?: string }> {
  try {
    let winnerId = '';
    let winnerName = '';
    let loserId = '';

    // Determine Winner
    if (finalScoreA > finalScoreB) {
      winnerId = 'teamA';
    } else if (finalScoreB > finalScoreA) {
      winnerId = 'teamB';
    } else {
      throw new Error('Tournament knockout matches cannot end in a tie. Please record overtime score.');
    }

    if (!db) {
      return { success: true, winnerId, winnerName: 'Winner' };
    }

    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      // Try tournament match doc if stored under tournaments/{id}/matches
      const matchRef = doc(db, `tournaments/${tournamentId}/matches`, gameId);
      const matchSnap = await getDoc(matchRef);
      if (!matchSnap.exists()) {
        throw new Error(`Match ${gameId} not found in database.`);
      }
      const matchData = matchSnap.data() as BracketNodeMatch;
      const actualWinnerId = winnerId === 'teamA' ? matchData.teamA_Id! : matchData.teamB_Id!;
      const actualWinnerName = winnerId === 'teamA' ? matchData.teamA_Name! : matchData.teamB_Name!;
      const actualLoserId = winnerId === 'teamA' ? matchData.teamB_Id! : matchData.teamA_Id!;

      await updateDoc(matchRef, {
        teamA_Score: finalScoreA,
        teamB_Score: finalScoreB,
        winnerId: actualWinnerId,
        loserId: actualLoserId,
        status: 'FINAL',
        updatedAt: serverTimestamp()
      });

      // Propagate to Next Match Node
      if (matchData.nextMatchId && matchData.nextMatchSlot) {
        const nextRef = doc(db, `tournaments/${tournamentId}/matches`, matchData.nextMatchId);
        const slotUpdate = matchData.nextMatchSlot === 'teamA'
          ? { teamA_Id: actualWinnerId, teamA_Name: actualWinnerName }
          : { teamB_Id: actualWinnerId, teamB_Name: actualWinnerName };

        await updateDoc(nextRef, {
          ...slotUpdate,
          updatedAt: serverTimestamp()
        });
      }

      return {
        success: true,
        winnerId: actualWinnerId,
        winnerName: actualWinnerName,
        nextGameId: matchData.nextMatchId
      };
    }

    const gameData = gameSnap.data();
    const actualWinnerId = winnerId === 'teamA' ? (gameData.teamA_Id || gameData.homeTeamId) : (gameData.teamB_Id || gameData.awayTeamId);
    const actualWinnerName = winnerId === 'teamA' ? (gameData.teamA_Name || gameData.homeTeamName) : (gameData.teamB_Name || gameData.awayTeamName);
    const actualLoserId = winnerId === 'teamA' ? (gameData.teamB_Id || gameData.awayTeamId) : (gameData.teamA_Id || gameData.homeTeamId);

    // Update current game in /games
    await updateDoc(gameRef, {
      teamA_Score: finalScoreA,
      teamB_Score: finalScoreB,
      homeScore: finalScoreA,
      awayScore: finalScoreB,
      winnerId: actualWinnerId,
      loserId: actualLoserId,
      status: 'FINAL',
      updatedAt: serverTimestamp()
    });

    // Advance to next bracket game if connected
    if (gameData.nextMatchId && gameData.nextMatchSlot) {
      const nextGameRef = doc(db, 'games', gameData.nextMatchId);
      const slotFieldId = gameData.nextMatchSlot === 'teamA' ? 'teamA_Id' : 'teamB_Id';
      const slotFieldName = gameData.nextMatchSlot === 'teamA' ? 'teamA_Name' : 'teamB_Name';

      await updateDoc(nextGameRef, {
        [slotFieldId]: actualWinnerId,
        [slotFieldName]: actualWinnerName,
        updatedAt: serverTimestamp()
      });
    }

    return {
      success: true,
      winnerId: actualWinnerId,
      winnerName: actualWinnerName,
      nextGameId: gameData.nextMatchId
    };
  } catch (error) {
    console.error('Bracket auto-advancement error:', error);
    throw error;
  }
}

/**
 * 4. REAL-TIME SCORE TICKER & GAMES SUBSCRIBER
 * Subscribes to live games with fallback support for offline play.
 */
export function subscribeLiveScores(
  onUpdate: (games: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'games'),
      orderBy('startTime', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const gamesList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        onUpdate(gamesList);
      },
      (err) => {
        console.warn('Live scores snapshot listener warning:', err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.error('Error starting live score subscription:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * 5. COMMIT GENERATED BRACKET MATCHES TO FIRESTORE
 */
export async function commitBracketToFirestore(
  tournamentId: string,
  matches: BracketNodeMatch[]
): Promise<number> {
  if (!db || matches.length === 0) return 0;

  let totalCommitted = 0;
  const CHUNK_SIZE = 400; // Under 500 limit

  for (let i = 0; i < matches.length; i += CHUNK_SIZE) {
    const chunk = matches.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const match of chunk) {
      // Write into both /tournaments/{id}/matches and universal /games
      const tournMatchRef = doc(db, `tournaments/${tournamentId}/matches`, match.id);
      batch.set(tournMatchRef, {
        ...match,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      const universalGameRef = doc(db, 'games', match.id);
      batch.set(universalGameRef, {
        id: match.id,
        tournamentId: match.tournamentId,
        round: match.round,
        matchNumber: match.matchNumber,
        bracketSection: match.bracketSection,
        teamA_Id: match.teamA_Id || '',
        teamA_Name: match.teamA_Name || 'TBD',
        teamA_Score: match.teamA_Score || 0,
        teamB_Id: match.teamB_Id || '',
        teamB_Name: match.teamB_Name || 'TBD',
        teamB_Score: match.teamB_Score || 0,
        nextMatchId: match.nextMatchId || null,
        nextMatchSlot: match.nextMatchSlot || null,
        status: match.status || 'SCHEDULED',
        courtOrField: match.courtOrField || 'Court 1',
        courtName: match.courtOrField || 'Court 1',
        division: match.division || 'Varsity',
        startTime: match.scheduledTime || '09:00 AM',
        gameType: match.bracketType === 'ROUND_ROBIN_POOL' ? 'PoolPlay' : 'Bracket',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    await batch.commit();
    totalCommitted += chunk.length;
  }

  return totalCommitted;
}
