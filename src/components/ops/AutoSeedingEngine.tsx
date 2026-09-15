'use client';

import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Lock, 
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { db } from '@/src/firebase/config';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';

export interface PoolGame {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  status: 'upcoming' | 'live' | 'final';
}

export interface TeamStats {
  id: string;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number; // capped
  headToHead: Record<string, 'won' | 'lost' | 'tied'>;
  tiebreakerNote?: string;
  isOverridden?: boolean;
}

export interface AutoSeedingEngineProps {
  eventId: string;
  divisionId?: string;
  divisionName?: string;
  maxPointDiffPerGame?: number;
  games?: PoolGame[];
  onSeedingPushed?: (seeds: { seed: number; teamId: string; teamName: string }[]) => void;
}

// Sample fallback pool dataset for immediate render
const SAMPLE_GAMES: PoolGame[] = [
  { id: 'g1', homeTeamId: 't1', homeTeamName: 'Lady Lightning Elite', awayTeamId: 't2', awayTeamName: 'Jersey Shore Wave', homeScore: 28, awayScore: 12, status: 'final' },
  { id: 'g2', homeTeamId: 't3', homeTeamName: 'NYC Empire Flag', awayTeamId: 't4', awayTeamName: 'Philly Blitz', homeScore: 20, awayScore: 18, status: 'final' },
  { id: 'g3', homeTeamId: 't1', homeTeamName: 'Lady Lightning Elite', awayTeamId: 't3', awayTeamName: 'NYC Empire Flag', homeScore: 21, awayScore: 14, status: 'final' },
  { id: 'g4', homeTeamId: 't2', homeTeamName: 'Jersey Shore Wave', awayTeamId: 't4', awayTeamName: 'Philly Blitz', homeScore: 14, awayScore: 13, status: 'final' },
  { id: 'g5', homeTeamId: 't1', homeTeamName: 'Lady Lightning Elite', awayTeamId: 't4', awayTeamName: 'Philly Blitz', homeScore: 35, awayScore: 6, status: 'final' },
  { id: 'g6', homeTeamId: 't2', homeTeamName: 'Jersey Shore Wave', awayTeamId: 't3', awayTeamName: 'NYC Empire Flag', homeScore: 19, awayScore: 20, status: 'final' }
];

export default function AutoSeedingEngine({
  eventId,
  divisionId = 'div_16u_girls',
  divisionName = '16U Girls Flag Championship',
  maxPointDiffPerGame = 15,
  games = SAMPLE_GAMES,
  onSeedingPushed
}: AutoSeedingEngineProps) {
  const [pointDiffCap, setPointDiffCap] = useState(maxPointDiffPerGame);
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);

  // Check for unfinished pool matches
  const pendingGames = useMemo(() => {
    return games.filter((g) => g.status !== 'final');
  }, [games]);

  // Compute standings and execute multi-tier tiebreakers
  const computedStandings = useMemo(() => {
    const statsMap: Record<string, TeamStats> = {};

    const initTeam = (id: string, name: string) => {
      if (!statsMap[id]) {
        statsMap[id] = {
          id,
          name,
          wins: 0,
          losses: 0,
          ties: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          pointDiff: 0,
          headToHead: {}
        };
      }
    };

    // Calculate aggregated records across finished games
    games.forEach((game) => {
      if (game.status !== 'final') return;
      initTeam(game.homeTeamId, game.homeTeamName);
      initTeam(game.awayTeamId, game.awayTeamName);

      const home = statsMap[game.homeTeamId];
      const away = statsMap[game.awayTeamId];

      home.pointsFor += game.homeScore;
      home.pointsAgainst += game.awayScore;
      away.pointsFor += game.awayScore;
      away.pointsAgainst += game.homeScore;

      // Cap differential per tournament rules (+/- 15 standard)
      const rawHomeDiff = game.homeScore - game.awayScore;
      const cappedHomeDiff = Math.max(-pointDiffCap, Math.min(pointDiffCap, rawHomeDiff));
      home.pointDiff += cappedHomeDiff;
      away.pointDiff -= cappedHomeDiff;

      if (game.homeScore > game.awayScore) {
        home.wins += 1;
        away.losses += 1;
        home.headToHead[away.id] = 'won';
        away.headToHead[home.id] = 'lost';
      } else if (game.awayScore > game.homeScore) {
        away.wins += 1;
        home.losses += 1;
        away.headToHead[home.id] = 'won';
        home.headToHead[away.id] = 'lost';
      } else {
        home.ties += 1;
        away.ties += 1;
        home.headToHead[away.id] = 'tied';
        away.headToHead[home.id] = 'tied';
      }
    });

    const teams = Object.values(statsMap);

    // Multi-tier sort
    teams.sort((a, b) => {
      // 1. Win Percentage / Wins
      const winPctA = (a.wins + a.ties * 0.5) / Math.max(1, a.wins + a.losses + a.ties);
      const winPctB = (b.wins + b.ties * 0.5) / Math.max(1, b.wins + b.losses + b.ties);
      if (winPctB !== winPctA) return winPctB - winPctA;

      // 2. Head-to-Head (if 2 teams tied and played each other)
      if (a.headToHead[b.id] === 'won') {
        a.tiebreakerNote = `Won H2H over ${b.name}`;
        return -1;
      }
      if (a.headToHead[b.id] === 'lost') {
        b.tiebreakerNote = `Won H2H over ${a.name}`;
        return 1;
      }

      // 3. Point Differential (Capped)
      if (b.pointDiff !== a.pointDiff) {
        const leader = b.pointDiff > a.pointDiff ? b : a;
        leader.tiebreakerNote = `Better Diff (+${leader.pointDiff})`;
        return b.pointDiff - a.pointDiff;
      }

      // 4. Fewest Points Allowed
      if (a.pointsAgainst !== b.pointsAgainst) {
        const leader = a.pointsAgainst < b.pointsAgainst ? a : b;
        leader.tiebreakerNote = `Allowed fewer pts (${leader.pointsAgainst})`;
        return a.pointsAgainst - b.pointsAgainst;
      }

      // 5. Total Points Scored
      return b.pointsFor - a.pointsFor;
    });

    return teams;
  }, [games, pointDiffCap]);

  // Active Standings (with manual overrides applied if present)
  const seededStandings = useMemo(() => {
    if (!manualOrder) return computedStandings;
    
    const idMap = new Map(computedStandings.map((t) => [t.id, t]));
    const result: TeamStats[] = [];

    manualOrder.forEach((id) => {
      const team = idMap.get(id);
      if (team) {
        result.push({
          ...team,
          isOverridden: true
        });
      }
    });

    // Add any remaining teams not in manual order
    computedStandings.forEach((t) => {
      if (!manualOrder.includes(t.id)) {
        result.push(t);
      }
    });

    return result;
  }, [computedStandings, manualOrder]);

  // Manual Bump Controls
  const handleBump = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= seededStandings.length) return;

    const currentOrder = seededStandings.map((t) => t.id);
    const temp = currentOrder[index];
    currentOrder[index] = currentOrder[targetIndex];
    currentOrder[targetIndex] = temp;

    setManualOrder(currentOrder);
  };

  const handleResetManual = () => {
    setManualOrder(null);
  };

  // Standard elimination bracket seeding mapping (e.g. 1v4, 2v3 or 1v8, 4v5, 2v7, 3v6)
  const bracketMatchupsPreview = useMemo(() => {
    if (seededStandings.length >= 8) {
      return [
        { round: 'Quarterfinal 1', match: `${seededStandings[0]?.name || 'Seed 1'} (#1) vs ${seededStandings[7]?.name || 'Seed 8'} (#8)` },
        { round: 'Quarterfinal 2', match: `${seededStandings[3]?.name || 'Seed 4'} (#4) vs ${seededStandings[4]?.name || 'Seed 5'} (#5)` },
        { round: 'Quarterfinal 3', match: `${seededStandings[1]?.name || 'Seed 2'} (#2) vs ${seededStandings[6]?.name || 'Seed 7'} (#7)` },
        { round: 'Quarterfinal 4', match: `${seededStandings[2]?.name || 'Seed 3'} (#3) vs ${seededStandings[5]?.name || 'Seed 6'} (#6)` }
      ];
    }
    if (seededStandings.length >= 4) {
      return [
        { round: 'Semifinal 1', match: `${seededStandings[0]?.name || 'Seed 1'} (#1) vs ${seededStandings[3]?.name || 'Seed 4'} (#4)` },
        { round: 'Semifinal 2', match: `${seededStandings[1]?.name || 'Seed 2'} (#2) vs ${seededStandings[2]?.name || 'Seed 3'} (#3)` }
      ];
    }
    return [];
  }, [seededStandings]);

  // Commit Seeds & Generate Elimination Fixtures in Firestore
  const handlePushToBracket = async () => {
    setIsPushing(true);
    try {
      const finalSeeds = seededStandings.map((team, idx) => ({
        seed: idx + 1,
        teamId: team.id,
        teamName: team.name,
        wins: team.wins,
        losses: team.losses,
        pointDiff: team.pointDiff
      }));

      // 1. Batch Write to Firestore
      const batch = writeBatch(db);
      
      // Save Bracket Metadata
      const bracketRef = doc(db, 'events', eventId, 'brackets', divisionId);
      batch.set(bracketRef, {
        divisionId,
        divisionName,
        seeds: finalSeeds,
        isLocked: true,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Create Initial Elimination Fixture Documents if 4 or 8 teams
      if (seededStandings.length >= 4) {
        const numMatches = seededStandings.length >= 8 ? 4 : 2;
        const roundName = seededStandings.length >= 8 ? 'Quarterfinals' : 'Semifinals';

        for (let i = 0; i < numMatches; i++) {
          const highIdx = i === 0 ? 0 : i === 1 ? 3 : i === 2 ? 1 : 2;
          const lowIdx = seededStandings.length >= 8 
            ? (i === 0 ? 7 : i === 1 ? 4 : i === 2 ? 6 : 5)
            : (i === 0 ? 3 : 2);

          const gameDocRef = doc(collection(db, 'events', eventId, 'games'));
          batch.set(gameDocRef, {
            eventId,
            divisionId,
            divisionName,
            roundName,
            roundIndex: 0,
            matchupIndex: i,
            status: 'upcoming',
            homeTeam: {
              id: seededStandings[highIdx]?.id || '',
              name: seededStandings[highIdx]?.name || `Seed #${highIdx + 1}`,
              seed: highIdx + 1,
              score: 0
            },
            awayTeam: {
              id: seededStandings[lowIdx]?.id || '',
              name: seededStandings[lowIdx]?.name || `Seed #${lowIdx + 1}`,
              seed: lowIdx + 1,
              score: 0
            },
            createdAt: serverTimestamp()
          });
        }
      }

      await batch.commit();

      if (onSeedingPushed) onSeedingPushed(finalSeeds);
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 4000);
    } catch (err) {
      console.error('Failed pushing seeds to bracket in Firestore', err);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="bg-black text-white p-4 sm:p-6 rounded-3xl border border-zinc-800 max-w-4xl mx-auto font-sans shadow-2xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={18} className="text-teal-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Tournament Engine &bull; Tiebreaker Matrix
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">{divisionName}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Differential Cap Selector */}
          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-mono">
            <Sliders size={14} className="text-amber-400" />
            <span className="text-zinc-400">Diff Cap:</span>
            <select
              value={pointDiffCap}
              onChange={(e) => setPointDiffCap(Number(e.target.value))}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value={10} className="bg-zinc-900">&plusmn;10</option>
              <option value={15} className="bg-zinc-900">&plusmn;15 (Standard)</option>
              <option value={20} className="bg-zinc-900">&plusmn;20</option>
            </select>
          </div>

          <button 
            onClick={handlePushToBracket}
            disabled={isPushing}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-black text-sm rounded-xl transition shadow-lg shadow-teal-500/20 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {isPushing ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {pushSuccess ? 'Seeds Synced!' : 'Publish to Bracket'}
          </button>
        </div>
      </div>

      {/* Warning Banner if Pool Games are Ongoing */}
      {pendingGames.length > 0 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-400 text-xs">
          <AlertTriangle size={18} className="shrink-0" />
          <span>
            <strong>Pool play is in progress ({pendingGames.length} game{pendingGames.length > 1 ? 's' : ''} active).</strong> Current rankings are projected and will recalculate dynamically as final scores submit.
          </span>
        </div>
      )}

      {/* Reset Manual Override Action */}
      {manualOrder && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono">
          <span className="text-amber-400">Manual seeding overrides are currently active.</span>
          <button
            onClick={handleResetManual}
            className="text-teal-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <RotateCcw size={13} />
            <span>Reset to Automated Calculations</span>
          </button>
        </div>
      )}

      {/* Standings Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-[11px] font-mono text-zinc-400 uppercase bg-zinc-950">
              <th className="py-3.5 pl-3">Seed</th>
              <th className="py-3.5">Team Name</th>
              <th className="py-3.5 text-center">W - L - T</th>
              <th className="py-3.5 text-center">Diff (&plusmn;{pointDiffCap})</th>
              <th className="py-3.5 text-center">PA</th>
              <th className="py-3.5 text-center">PF</th>
              <th className="py-3.5">Tiebreaker Audit</th>
              <th className="py-3.5 text-center pr-3">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 font-medium text-xs font-mono">
            {seededStandings.map((team, idx) => {
              const seedNum = idx + 1;
              const isOverridden = team.isOverridden;

              return (
                <tr key={team.id} className={`hover:bg-zinc-900/40 transition group ${isOverridden ? 'bg-amber-400/5' : ''}`}>
                  <td className="py-3 pl-3">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-bold text-xs ${
                      seedNum === 1 
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' 
                        : seedNum <= 4 
                        ? 'bg-zinc-800 text-zinc-200' 
                        : 'text-zinc-600'
                    }`}>
                      #{seedNum}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-white flex items-center gap-2">
                    <span className="truncate max-w-[180px]">{team.name}</span>
                    {isOverridden && (
                      <span className="text-[9px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        OVERRIDE
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-center text-zinc-300">
                    {team.wins}-{team.losses}-{team.ties}
                  </td>
                  <td className={`py-3 text-center font-bold ${team.pointDiff > 0 ? 'text-emerald-400' : team.pointDiff < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                    {team.pointDiff > 0 ? `+${team.pointDiff}` : team.pointDiff}
                  </td>
                  <td className="py-3 text-center text-zinc-400">{team.pointsAgainst}</td>
                  <td className="py-3 text-center text-zinc-400">{team.pointsFor}</td>
                  <td className="py-3">
                    {team.tiebreakerNote ? (
                      <span className="text-[11px] text-teal-300/90 bg-teal-950/40 border border-teal-800/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1.5">
                        <ShieldCheck size={12} className="text-teal-400" />
                        {team.tiebreakerNote}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="py-3 text-center pr-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleBump(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 cursor-pointer"
                        title="Move Seed Up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => handleBump(idx, 'down')}
                        disabled={idx === seededStandings.length - 1}
                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 cursor-pointer"
                        title="Move Seed Down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bracket Projection Preview Card */}
      <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <ChevronRight size={14} className="text-teal-400" />
          Automated Bracket Matchup Placements
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bracketMatchupsPreview.map((m, i) => (
            <div key={i} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-mono">{m.round}</span>
              <span className="font-bold text-white text-right">{m.match}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
