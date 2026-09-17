import React, { useState } from 'react';
import { 
  Calendar, 
  Trophy, 
  ChevronRight, 
  Filter, 
  ArrowUpDown, 
  Activity, 
  CheckCircle2,
  Sparkles,
  Flame,
  Award
} from 'lucide-react';
import { GameStatEntry } from '../../types';

interface GameLogsTableProps {
  gameLogs?: GameStatEntry[];
}

const DEFAULT_GAME_LOGS: GameStatEntry[] = [
  {
    id: 'log-1',
    athleteUid: 'j1p-kevoie',
    gameDate: '2026-02-18',
    sport: 'Basketball',
    opponent: 'St. Benedict Prep (NJ)',
    gameResult: 'W',
    teamScore: 84,
    opponentScore: 78,
    isHomeGame: true,
    stats: {
      points: 26,
      rebounds: 7,
      assists: 9,
      steals: 3,
      blocks: 1,
      fgMade: 9,
      fgAttempted: 16,
      threeMade: 4
    },
    notes: 'Hit go-ahead 3-pointer with 42s left in 4th quarter.',
    createdAt: '2026-02-18T22:00:00Z',
    isVerified: true
  },
  {
    id: 'log-2',
    athleteUid: 'j1p-kevoie',
    gameDate: '2026-02-14',
    sport: 'Basketball',
    opponent: 'Roselle Catholic High',
    gameResult: 'W',
    teamScore: 72,
    opponentScore: 69,
    isHomeGame: false,
    stats: {
      points: 22,
      rebounds: 4,
      assists: 8,
      steals: 2,
      blocks: 0,
      fgMade: 8,
      fgAttempted: 14,
      threeMade: 3
    },
    notes: 'Flawless ball handling against full-court press.',
    createdAt: '2026-02-14T21:00:00Z',
    isVerified: true
  },
  {
    id: 'log-3',
    athleteUid: 'j1p-kevoie',
    gameDate: '2026-02-09',
    sport: 'Basketball',
    opponent: 'Oak Ridge Elite AAU',
    gameResult: 'L',
    teamScore: 68,
    opponentScore: 74,
    isHomeGame: true,
    stats: {
      points: 19,
      rebounds: 6,
      assists: 5,
      steals: 1,
      blocks: 1,
      fgMade: 7,
      fgAttempted: 15,
      threeMade: 2
    },
    notes: 'Showcased high defensive grit despite foul trouble.',
    createdAt: '2026-02-09T20:30:00Z',
    isVerified: true
  },
  {
    id: 'log-4',
    athleteUid: 'j1p-kevoie',
    gameDate: '2026-02-03',
    sport: 'Basketball',
    opponent: 'Camden High School',
    gameResult: 'W',
    teamScore: 81,
    opponentScore: 70,
    isHomeGame: true,
    stats: {
      points: 28,
      rebounds: 8,
      assists: 11,
      steals: 4,
      blocks: 1,
      fgMade: 10,
      fgAttempted: 18,
      threeMade: 5
    },
    notes: 'Career-high triple-double pace with 11 assists.',
    createdAt: '2026-02-03T22:15:00Z',
    isVerified: true
  },
  {
    id: 'log-5',
    athleteUid: 'j1p-kevoie',
    gameDate: '2026-01-28',
    sport: 'Basketball',
    opponent: 'St. Patrick Celtics',
    gameResult: 'W',
    teamScore: 76,
    opponentScore: 62,
    isHomeGame: false,
    stats: {
      points: 17,
      rebounds: 5,
      assists: 7,
      steals: 3,
      blocks: 0,
      fgMade: 6,
      fgAttempted: 11,
      threeMade: 2
    },
    notes: 'Controlled transition tempo and orchestrated half-court offense.',
    createdAt: '2026-01-28T21:00:00Z',
    isVerified: true
  }
];

export const GameLogsTable: React.FC<GameLogsTableProps> = ({ gameLogs = DEFAULT_GAME_LOGS }) => {
  const [selectedSeason, setSelectedSeason] = useState('2025-2026');
  const [selectedResult, setSelectedResult] = useState('ALL');

  const logs = gameLogs.length > 0 ? gameLogs : DEFAULT_GAME_LOGS;

  const filteredLogs = logs.filter(log => {
    if (selectedResult !== 'ALL' && log.gameResult !== selectedResult) return false;
    return true;
  });

  return (
    <div className="rounded-3xl bg-[#131B26] border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
      
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00E5FF]" />
            <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
              Verified Game Logs & Box Scores
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Official NFHS & AAU Certified Scorekeeper Logs
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#0B0F17] border border-white/10 text-xs font-mono text-slate-300 outline-none cursor-pointer focus:border-[#00E5FF]"
          >
            <option value="2025-2026">2025-2026 Circuit</option>
            <option value="2024-2025">2024-2025 Circuit</option>
          </select>

          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#0B0F17] border border-white/10 text-xs font-mono text-slate-300 outline-none cursor-pointer focus:border-[#00E5FF]"
          >
            <option value="ALL">All Results (W/L)</option>
            <option value="W">Wins Only (W)</option>
            <option value="L">Losses Only (L)</option>
          </select>
        </div>
      </div>

      {/* Box Score Data Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0B0F17]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-white/10">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Opponent</th>
              <th className="py-3 px-3 text-center">Outcome</th>
              <th className="py-3 px-3 text-center text-[#00E5FF] font-black">PTS</th>
              <th className="py-3 px-3 text-center">REB</th>
              <th className="py-3 px-3 text-center">AST</th>
              <th className="py-3 px-3 text-center text-[#39FF14]">STL</th>
              <th className="py-3 px-3 text-center">BLK</th>
              <th className="py-3 px-3 text-center">FG (M/A)</th>
              <th className="py-3 px-3 text-center">3PT</th>
              <th className="py-3 px-4">Scouting Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {filteredLogs.map((log) => {
              const bball = (log.stats || {}) as Record<string, any>;
              const fgAttempted = bball.fgAttempted || 0;
              const fgMade = bball.fgMade || 0;
              const fgPct = fgAttempted > 0 ? Math.round((fgMade / fgAttempted) * 100) : '--';

              return (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-400 whitespace-nowrap">
                    {log.gameDate}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                    {log.opponent} {log.isHomeGame ? '(H)' : '(A)'}
                  </td>
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black font-mono uppercase ${
                      log.gameResult === 'W'
                        ? 'bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/40'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/40'
                    }`}>
                      {log.gameResult} {log.teamScore}-{log.opponentScore}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-base text-[#00E5FF]">
                    {bball.points ?? '--'}
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold">
                    {bball.rebounds ?? '--'}
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold">
                    {bball.assists ?? '--'}
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-[#39FF14]">
                    {bball.steals ?? '--'}
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-400">
                    {bball.blocks ?? '--'}
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-300">
                    {fgMade}/{fgAttempted} ({fgPct}%)
                  </td>
                  <td className="py-3.5 px-3 text-center text-[#00E5FF]">
                    {bball.threeMade ?? 0}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                    {log.notes || '--'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
