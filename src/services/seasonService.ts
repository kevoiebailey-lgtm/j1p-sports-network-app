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
  increment,
  Unsubscribe 
} from 'firebase/firestore';

export interface SeasonModel {
  id: string;
  name: string;
  sport: string;
  seasonType: 'FALL' | 'WINTER' | 'SPRING' | 'SUMMER' | 'YEAR_ROUND';
  year: number | string;
  startDate: string;
  endDate: string;
  divisions: string[];
  venues: string[];
  fieldsAvailable?: string[];
  status: 'DRAFT' | 'REGISTRATION' | 'ACTIVE' | 'PLAYOFFS' | 'COMPLETED';
  totalWeeks: number;
  bannerUrl?: string;
  flyerUrl?: string;
  description?: string;
  settings?: {
    gameDurationMinutes?: number;
    pointsForWin?: number;
    pointsForTie?: number;
    tiebreakerRule?: 'POINT_DIFF' | 'HEAD_TO_HEAD' | 'POINTS_SCORED';
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SeasonTeamRecord {
  id: string;
  seasonId: string;
  teamName: string;
  division: string;
  coachName?: string;
  coachEmail?: string;
  coachPhone?: string;
  logoUrl?: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
  streak?: string;
  rank?: number;
  gamesPlayed: number;
}

export interface SeasonGameRecord {
  id: string;
  seasonId: string;
  tournamentId?: string;
  weekNumber: number;
  weekLabel?: string;
  date: string;
  startTime: string;
  endTime?: string;
  venue: string;
  courtOrField: string;
  courtName?: string;
  courtNumber?: number;
  division: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore?: number;
  awayScore?: number;
  teamA_Id?: string;
  teamA_Name?: string;
  teamA_Score?: number;
  teamB_Id?: string;
  teamB_Name?: string;
  teamB_Score?: number;
  coachHome?: string;
  coachAway?: string;
  referee?: string;
  status: 'SCHEDULED' | 'WARMUP' | 'IN_PROGRESS' | 'HALFTIME' | 'FINAL' | 'POSTPONED' | 'CANCELLED';
  gameType?: 'REGULAR_SEASON' | 'PLAYOFF' | 'CHAMPIONSHIP';
}

/**
 * 1. CREATE OR UPDATE SEASON METADATA
 */
export async function createOrUpdateSeason(seasonData: Partial<SeasonModel>): Promise<string> {
  const seasonId = seasonData.id || `season_${Date.now()}`;
  const record: SeasonModel = {
    id: seasonId,
    name: seasonData.name || '2026 Just1Play Championship Season',
    sport: seasonData.sport || 'Flag Football',
    seasonType: seasonData.seasonType || 'FALL',
    year: seasonData.year || 2026,
    startDate: seasonData.startDate || new Date().toISOString().split('T')[0],
    endDate: seasonData.endDate || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    divisions: seasonData.divisions || ['Varsity', 'Junior Varsity', '14U'],
    venues: seasonData.venues || ['Just1Play Regional Stadium'],
    fieldsAvailable: seasonData.fieldsAvailable || ['Field 1 (Main Stadium)', 'Field 2', 'Field 3'],
    status: seasonData.status || 'ACTIVE',
    totalWeeks: seasonData.totalWeeks || 8,
    bannerUrl: seasonData.bannerUrl || seasonData.flyerUrl || '',
    flyerUrl: seasonData.flyerUrl || seasonData.bannerUrl || '',
    description: seasonData.description || 'Official multi-game competitive season.',
    createdAt: seasonData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (db) {
    try {
      await setDoc(doc(db, 'seasons', seasonId), record, { merge: true });
    } catch (err) {
      console.warn('Firestore season write warning:', err);
    }
  }

  return seasonId;
}

/**
 * 2. REAL-TIME SEASON LISTENERS
 */
export function subscribeSeasonGames(
  seasonId: string,
  onUpdate: (games: SeasonGameRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'games'),
      where('seasonId', '==', seasonId),
      orderBy('weekNumber', 'asc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SeasonGameRecord));
        onUpdate(list);
      },
      (err) => {
        console.warn('Season games snapshot warning:', err);
        // Fallback without composite index if index is building
        const fallbackQ = query(collection(db, 'games'), where('seasonId', '==', seasonId));
        return onSnapshot(
          fallbackQ,
          (fSnap) => {
            const fList = fSnap.docs
              .map(d => ({ id: d.id, ...d.data() } as SeasonGameRecord))
              .sort((a, b) => (a.weekNumber || 1) - (b.weekNumber || 1));
            onUpdate(fList);
          },
          (fallbackErr) => {
            console.warn('Fallback season games snapshot notice:', fallbackErr);
          }
        );
      }
    );
  } catch (err: any) {
    console.error('Error attaching season games listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export function subscribeSeasonTeams(
  seasonId: string,
  onUpdate: (teams: SeasonTeamRecord[]) => void
): Unsubscribe {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = collection(db, `seasons/${seasonId}/teams`);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SeasonTeamRecord));
      // Sort by Wins desc, PointDiff desc
      list.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
        return b.pointsFor - a.pointsFor;
      });
      onUpdate(list.map((item, idx) => ({ ...item, rank: idx + 1 })));
    }, (err) => {
      console.warn('Season teams snapshot warning:', err);
    });
  } catch (err) {
    console.error('Error attaching season teams listener:', err);
    return () => {};
  }
}

/**
 * 3. UPDATE SEASON GAME RESULT & AUTO-RECALCULATE TEAM STANDINGS
 */
export async function recordSeasonGameScore(
  seasonId: string,
  gameId: string,
  homeScore: number,
  awayScore: number,
  status: 'FINAL' | 'IN_PROGRESS' = 'FINAL'
): Promise<void> {
  if (!db) return;

  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) {
    throw new Error(`Game ${gameId} not found in season.`);
  }

  const game = gameSnap.data() as SeasonGameRecord;
  const homeTeamId = game.homeTeamId || game.teamA_Id;
  const awayTeamId = game.awayTeamId || game.teamB_Id;

  // 1. Update Game Record
  await updateDoc(gameRef, {
    homeScore,
    awayScore,
    teamA_Score: homeScore,
    teamB_Score: awayScore,
    status,
    updatedAt: serverTimestamp()
  });

  if (status !== 'FINAL' || !homeTeamId || !awayTeamId) {
    return;
  }

  // 2. Atomic Standings Updates for Both Teams
  const homeIsWinner = homeScore > awayScore;
  const awayIsWinner = awayScore > homeScore;
  const isTie = homeScore === awayScore;

  const homeDiff = homeScore - awayScore;
  const awayDiff = awayScore - homeScore;

  const homeTeamRef = doc(db, `seasons/${seasonId}/teams`, homeTeamId);
  const awayTeamRef = doc(db, `seasons/${seasonId}/teams`, awayTeamId);

  const batch = writeBatch(db);

  // Home Team Updates
  batch.set(homeTeamRef, {
    wins: increment(homeIsWinner ? 1 : 0),
    losses: increment(awayIsWinner ? 1 : 0),
    ties: increment(isTie ? 1 : 0),
    pointsFor: increment(homeScore),
    pointsAgainst: increment(awayScore),
    pointsDiff: increment(homeDiff),
    gamesPlayed: increment(1),
    updatedAt: serverTimestamp()
  }, { merge: true });

  // Away Team Updates
  batch.set(awayTeamRef, {
    wins: increment(awayIsWinner ? 1 : 0),
    losses: increment(homeIsWinner ? 1 : 0),
    ties: increment(isTie ? 1 : 0),
    pointsFor: increment(awayScore),
    pointsAgainst: increment(homeScore),
    pointsDiff: increment(awayDiff),
    gamesPlayed: increment(1),
    updatedAt: serverTimestamp()
  }, { merge: true });

  await batch.commit();
}

/**
 * 4. CHUNKED BATCH IMPORTER (Max 450 docs per batch to respect 500 limit)
 */
export async function batchImportSeasonGames(
  seasonId: string,
  games: Partial<SeasonGameRecord>[],
  onProgress?: (progressPct: number) => void
): Promise<number> {
  if (!db || games.length === 0) return 0;

  const CHUNK_SIZE = 450;
  let importedCount = 0;
  const total = games.length;

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = games.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const game of chunk) {
      const gameId = game.id || `game_${seasonId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const gameDocRef = doc(db, 'games', gameId);

      batch.set(gameDocRef, {
        ...game,
        id: gameId,
        seasonId,
        tournamentId: game.tournamentId || seasonId,
        weekNumber: game.weekNumber || 1,
        date: game.date || new Date().toISOString().split('T')[0],
        startTime: game.startTime || '09:00 AM',
        venue: game.venue || 'Just1Play Regional Complex',
        courtOrField: game.courtOrField || game.courtName || 'Field 1',
        courtName: game.courtOrField || game.courtName || 'Field 1',
        division: game.division || 'Varsity',
        homeTeamId: game.homeTeamId || game.teamA_Id || '',
        homeTeamName: game.homeTeamName || game.teamA_Name || 'TBD',
        awayTeamId: game.awayTeamId || game.teamB_Id || '',
        awayTeamName: game.awayTeamName || game.teamB_Name || 'TBD',
        teamA_Id: game.homeTeamId || game.teamA_Id || '',
        teamA_Name: game.homeTeamName || game.teamA_Name || 'TBD',
        teamB_Id: game.awayTeamId || game.teamB_Id || '',
        teamB_Name: game.awayTeamName || game.teamB_Name || 'TBD',
        homeScore: game.homeScore ?? game.teamA_Score ?? 0,
        awayScore: game.awayScore ?? game.teamB_Score ?? 0,
        status: game.status || 'SCHEDULED',
        gameType: game.gameType || 'REGULAR_SEASON',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    await batch.commit();
    importedCount += chunk.length;

    if (onProgress) {
      const pct = Math.min(100, Math.round((importedCount / total) * 100));
      onProgress(pct);
    }
  }

  return importedCount;
}

/**
 * 5. CSV SCHEDULE PARSER & IMPORTER
 */
export async function parseAndImportSeasonCSV(
  seasonId: string,
  csvContent: string,
  onProgress?: (pct: number) => void
): Promise<{ success: boolean; importedCount: number; error?: string }> {
  try {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV is empty or missing data rows.');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const gamesToImport: Partial<SeasonGameRecord>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      if (values.length < 3) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const weekNum = parseInt(row['week'] || row['weeknumber'] || row['round'] || '1', 10) || 1;
      const homeTeam = row['hometeam'] || row['team1'] || row['teama'] || row['home'] || 'Home Team';
      const awayTeam = row['awayteam'] || row['team2'] || row['teamb'] || row['away'] || 'Away Team';
      const date = row['date'] || new Date().toISOString().split('T')[0];
      const time = row['time'] || row['starttime'] || '09:00 AM';
      const field = row['field'] || row['court'] || row['venue'] || 'Field 1';
      const division = row['division'] || 'Varsity';

      gamesToImport.push({
        id: `csv_${seasonId}_w${weekNum}_${i}`,
        seasonId,
        weekNumber: weekNum,
        date,
        startTime: time,
        courtOrField: field,
        venue: 'Just1Play Regional Complex',
        division,
        homeTeamId: `team_${homeTeam.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        homeTeamName: homeTeam,
        awayTeamId: `team_${awayTeam.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        awayTeamName: awayTeam,
        status: 'SCHEDULED',
        gameType: 'REGULAR_SEASON'
      });
    }

    const count = await batchImportSeasonGames(seasonId, gamesToImport, onProgress);
    return { success: true, importedCount: count };
  } catch (err: any) {
    console.error('CSV Import parse error:', err);
    return { success: false, importedCount: 0, error: err.message || 'Failed to parse CSV' };
  }
}
