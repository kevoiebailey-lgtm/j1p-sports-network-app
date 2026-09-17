import React, { useState } from 'react';
import { 
  Trophy, 
  Layers, 
  Award, 
  ArrowRight, 
  CheckCircle2, 
  Shield, 
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { UniversalScheduleItem } from '../../../types/tournamentEngine';

interface PoolTeamStats {
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  seed: number;
}

const INITIAL_POOL_A: PoolTeamStats[] = [
  { teamName: 'SoCal Elite Vipers', played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 18, goalsAgainst: 4, goalDiff: 14, points: 9, seed: 1 },
  { teamName: 'Pacific Coast Storm', played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 12, goalsAgainst: 7, goalDiff: 5, points: 6, seed: 2 },
  { teamName: 'Desert Fire Select', played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 8, goalsAgainst: 13, goalDiff: -5, points: 3, seed: 3 },
  { teamName: 'Bay Area Flight', played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 3, goalsAgainst: 17, goalDiff: -14, points: 0, seed: 4 },
];

const INITIAL_POOL_B: PoolTeamStats[] = [
  { teamName: 'Texas Outlaws Club', played: 3, wins: 2, draws: 1, losses: 0, goalsFor: 15, goalsAgainst: 6, goalDiff: 9, points: 7, seed: 1 },
  { teamName: 'California Golden Bears', played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 11, goalsAgainst: 8, goalDiff: 3, points: 6, seed: 2 },
  { teamName: 'Las Vegas Lightning', played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 9, goalsAgainst: 10, goalDiff: -1, points: 4, seed: 3 },
  { teamName: 'Arizona Heatwave', played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 4, goalsAgainst: 15, goalDiff: -11, points: 0, seed: 4 },
];

interface PoolBracketEngineProps {
  division?: string;
  onAdvanceSeed?: (team: string, bracketRound: string) => void;
  activeView?: 'all' | 'standings' | 'brackets';
}

export const PoolBracketEngine: React.FC<PoolBracketEngineProps> = ({
  division = 'Varsity Championship',
  onAdvanceSeed,
  activeView = 'all'
}) => {
  const [activePool, setActivePool] = useState<'A' | 'B'>('A');
  const [poolA, setPoolA] = useState<PoolTeamStats[]>(INITIAL_POOL_A);
  const [poolB, setPoolB] = useState<PoolTeamStats[]>(INITIAL_POOL_B);
  const [bracketType, setBracketType] = useState<'single' | 'double'>('single');
  const [notification, setNotification] = useState<string | null>(null);
  const [matches, setMatches] = useState({
    semi1: {
      id: 'm-semi-1',
      teamA: 'SoCal Elite Vipers',
      teamB: 'California Golden Bears',
      scoreA: 4,
      scoreB: 2,
      status: 'FINAL',
      winner: 'SoCal Elite Vipers'
    },
    semi2: {
      id: 'm-semi-2',
      teamA: 'Texas Outlaws Club',
      teamB: 'Pacific Coast Storm',
      scoreA: 3,
      scoreB: 2,
      status: 'FINAL',
      winner: 'Texas Outlaws Club'
    },
    final: {
      id: 'm-final-1',
      teamA: 'SoCal Elite Vipers',
      teamB: 'Texas Outlaws Club',
      scoreA: 0,
      scoreB: 0,
      status: 'SCHEDULED',
      winner: null as string | null
    }
  });

  const handleUpdateMatchScore = (matchKey: 'semi1' | 'semi2' | 'final', scoreA: number, scoreB: number, finalize: boolean = false) => {
    setMatches(prev => {
      const match = { ...prev[matchKey], scoreA, scoreB };
      if (finalize) {
        match.status = 'FINAL';
        match.winner = scoreA > scoreB ? match.teamA : scoreB > scoreA ? match.teamB : (scoreA >= scoreB ? match.teamA : match.teamB);
      }
      
      const newMatches = { ...prev, [matchKey]: match };

      // Auto-advance winners into Final
      if (matchKey === 'semi1' && match.winner) {
        newMatches.final.teamA = match.winner;
      } else if (matchKey === 'semi2' && match.winner) {
        newMatches.final.teamB = match.winner;
      }

      setNotification(`🏆 Auto-Progression: ${match.winner || 'Match score'} updated! Bracket Tree recalculated.`);
      setTimeout(() => setNotification(null), 3500);

      return newMatches;
    });
  };

  const currentPoolData = activePool === 'A' ? poolA : poolB;

  const handleAdvance = (team: PoolTeamStats, targetRound: string) => {
    setNotification(`⚡ Seed #${team.seed} ${team.teamName} advanced to ${targetRound}!`);
    setTimeout(() => setNotification(null), 3000);
    if (onAdvanceSeed) {
      onAdvanceSeed(team.teamName, targetRound);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pool Header Controls & Standings */}
      {(activeView === 'all' || activeView === 'standings') && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#090D16] border border-[#24324F] p-4 rounded-3xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#00B8D4]/10 border border-[#00B8D4]/30 text-[#00B8D4]">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white">
              Group Pool Standings & Automatic Tiebreakers
            </h3>
            <p className="text-xs text-slate-400">
              Scoring System: Win = 3 pts | Draw = 1 pt | Loss = 0 pts | Tiebreaker: +/- Goal Diff
            </p>
          </div>
        </div>

        {/* Pool Selector Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-[#263238]/60 border border-[#24324F] rounded-2xl">
          <button
            onClick={() => setActivePool('A')}
            className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activePool === 'A' 
                ? 'bg-[#00B8D4] text-[#090D16] shadow-[0_0_12px_rgba(0,184,212,0.4)]' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Pool A Table
          </button>
          <button
            onClick={() => setActivePool('B')}
            className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activePool === 'B' 
                ? 'bg-[#00B8D4] text-[#090D16] shadow-[0_0_12px_rgba(0,184,212,0.4)]' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Pool B Table
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-300 font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Pool Standings Table & Mobile Cards */}
      <div className="bg-[#090D16] border border-[#24324F] rounded-3xl overflow-hidden shadow-xl">
        <div className="p-3 sm:p-4 bg-[#263238]/60 border-b border-[#24324F] flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-black text-[#00B8D4] uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            <span>Pool {activePool} • Live Ranking Table</span>
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono font-bold">
            Top 2 Advance to Championship
          </span>
        </div>

        {/* Mobile View: High-Density Responsive Card List (visible on sm and below) */}
        <div className="block md:hidden divide-y divide-[#24324F]/60">
          {currentPoolData.map((row, idx) => (
            <div key={row.teamName} className="p-3.5 space-y-2.5 hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs shrink-0 ${
                    idx === 0 ? 'bg-[#FFC857] text-[#090D16] font-black shadow-md' :
                    idx === 1 ? 'bg-[#00B8D4]/20 text-[#00B8D4] border border-[#00B8D4]/50 font-bold' :
                    'text-slate-400 bg-slate-800/60'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{row.teamName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      GP: {row.played} | W-D-L: <span className="text-emerald-400 font-bold">{row.wins}</span>-{row.draws}-<span className="text-rose-400">{row.losses}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-black text-[#00B8D4] font-mono">{row.points} <span className="text-[10px] font-normal text-slate-400">pts</span></div>
                  <div className={`text-[10px] font-mono font-bold ${row.goalDiff > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    Diff: {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#24324F]/40 gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  GF: {row.goalsFor} • GA: {row.goalsAgainst}
                </span>
                <button
                  onClick={() => handleAdvance(row, 'Championship Semifinals')}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#263238] hover:bg-[#00B8D4] hover:text-[#090D16] border border-[#24324F] hover:border-[#00B8D4] text-xs font-bold text-white transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <span>Advance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Data Table (visible on md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090D16] text-slate-400 uppercase text-[10px] font-bold border-b border-[#24324F]">
              <tr>
                <th className="py-3 px-4">Rank / Seed</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4 text-center">GP</th>
                <th className="py-3 px-4 text-center">W</th>
                <th className="py-3 px-4 text-center">D</th>
                <th className="py-3 px-4 text-center">L</th>
                <th className="py-3 px-4 text-center">GF</th>
                <th className="py-3 px-4 text-center">GA</th>
                <th className="py-3 px-4 text-center">+/- Diff</th>
                <th className="py-3 px-4 text-center font-black text-[#00B8D4]">Pts</th>
                <th className="py-3 px-4 text-right">Advancement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24324F]/60 font-mono text-slate-200">
              {currentPoolData.map((row, idx) => (
                <tr key={row.teamName} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-black">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs ${
                      idx === 0 ? 'bg-[#FFC857] text-[#090D16] font-black' :
                      idx === 1 ? 'bg-[#00B8D4]/20 text-[#00B8D4] border border-[#00B8D4]/40 font-bold' :
                      'text-slate-400 bg-slate-800/60'
                    }`}>
                      #{idx + 1}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white font-sans text-sm">
                    {row.teamName}
                  </td>
                  <td className="py-3.5 px-4 text-center">{row.played}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">{row.wins}</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">{row.draws}</td>
                  <td className="py-3.5 px-4 text-center text-rose-400">{row.losses}</td>
                  <td className="py-3.5 px-4 text-center">{row.goalsFor}</td>
                  <td className="py-3.5 px-4 text-center">{row.goalsAgainst}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">
                    {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                  </td>
                  <td className="py-3.5 px-4 text-center font-black text-[#00B8D4] text-base">
                    {row.points}
                  </td>
                  <td className="py-3.5 px-4 text-right font-sans">
                    <button
                      onClick={() => handleAdvance(row, 'Championship Semifinals')}
                      className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-[#263238] hover:bg-[#00B8D4] hover:text-[#090D16] border border-[#24324F] hover:border-[#00B8D4] text-xs font-bold text-white transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
                    >
                      <span>Advance Seed</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* CHAMPIONSHIP BRACKET TREE */}
      {(activeView === 'all' || activeView === 'brackets') && (
      <div className="bg-[#090D16] border border-[#24324F] rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#24324F]">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#FFC857]" />
            <h3 className="text-sm sm:text-base font-black text-white">
              Championship Bracket Elimination Tree
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBracketType('single')}
              className={`min-h-[48px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                bracketType === 'single' ? 'bg-[#FF6A00] text-white font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Single Elimination
            </button>
            <button
              onClick={() => setBracketType('double')}
              className={`min-h-[48px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                bracketType === 'double' ? 'bg-[#FF6A00] text-white font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Double Elimination
            </button>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="mb-4 p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Visual Bracket Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Semifinals */}
          <div className="space-y-4">
            <span className="text-[10px] font-mono font-bold text-[#00B8D4] uppercase tracking-wider">
              Round 1: Semifinals (Live Progression)
            </span>

            {/* Match 1 */}
            <div className="p-4 rounded-2xl bg-[#263238]/60 border border-[#24324F] space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Semi #1 • Main Pitch</span>
                <span className="text-emerald-400 font-bold">{matches.semi1.status}</span>
              </div>
              <div className="space-y-1">
                <div className={`flex justify-between items-center p-2 rounded-xl text-xs font-bold ${
                  matches.semi1.winner === matches.semi1.teamA 
                    ? 'bg-[#090D16] text-white border border-[#00B8D4]/60 shadow-[0_0_10px_rgba(0,184,212,0.2)]' 
                    : 'bg-[#090D16] text-slate-400'
                }`}>
                  <span>{matches.semi1.teamA}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUpdateMatchScore('semi1', matches.semi1.scoreA + 1, matches.semi1.scoreB, true)}
                      className="w-5 h-5 rounded bg-white/10 hover:bg-[#00B8D4] hover:text-black text-[10px] flex items-center justify-center cursor-pointer"
                      title="Add Point & Finalize"
                    >
                      +
                    </button>
                    <span className="font-mono text-[#00B8D4] font-black">{matches.semi1.scoreA}</span>
                  </div>
                </div>
                <div className={`flex justify-between items-center p-2 rounded-xl text-xs font-bold ${
                  matches.semi1.winner === matches.semi1.teamB 
                    ? 'bg-[#090D16] text-white border border-[#00B8D4]/60' 
                    : 'bg-[#090D16] text-slate-400'
                }`}>
                  <span>{matches.semi1.teamB}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUpdateMatchScore('semi1', matches.semi1.scoreA, matches.semi1.scoreB + 1, true)}
                      className="w-5 h-5 rounded bg-white/10 hover:bg-[#00B8D4] hover:text-black text-[10px] flex items-center justify-center cursor-pointer"
                      title="Add Point & Finalize"
                    >
                      +
                    </button>
                    <span className="font-mono text-slate-400 font-black">{matches.semi1.scoreB}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Match 2 */}
            <div className="p-4 rounded-2xl bg-[#263238]/60 border border-[#24324F] space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Semi #2 • Pitch 2</span>
                <span className="text-emerald-400 font-bold">{matches.semi2.status}</span>
              </div>
              <div className="space-y-1">
                <div className={`flex justify-between items-center p-2 rounded-xl text-xs font-bold ${
                  matches.semi2.winner === matches.semi2.teamA 
                    ? 'bg-[#090D16] text-white border border-[#FF6A00]/60' 
                    : 'bg-[#090D16] text-slate-400'
                }`}>
                  <span>{matches.semi2.teamA}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUpdateMatchScore('semi2', matches.semi2.scoreA + 1, matches.semi2.scoreB, true)}
                      className="w-5 h-5 rounded bg-white/10 hover:bg-[#FF6A00] hover:text-white text-[10px] flex items-center justify-center cursor-pointer"
                      title="Add Point & Finalize"
                    >
                      +
                    </button>
                    <span className="font-mono text-[#FFC857] font-black">{matches.semi2.scoreA}</span>
                  </div>
                </div>
                <div className={`flex justify-between items-center p-2 rounded-xl text-xs font-bold ${
                  matches.semi2.winner === matches.semi2.teamB 
                    ? 'bg-[#090D16] text-white border border-[#FF6A00]/60' 
                    : 'bg-[#090D16] text-slate-400'
                }`}>
                  <span>{matches.semi2.teamB}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUpdateMatchScore('semi2', matches.semi2.scoreA, matches.semi2.scoreB + 1, true)}
                      className="w-5 h-5 rounded bg-white/10 hover:bg-[#FF6A00] hover:text-white text-[10px] flex items-center justify-center cursor-pointer"
                      title="Add Point & Finalize"
                    >
                      +
                    </button>
                    <span className="font-mono text-slate-400 font-black">{matches.semi2.scoreB}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connector Arrow for Desktop */}
          <div className="hidden md:flex flex-col items-center justify-center space-y-6">
            <div className="w-10 h-10 rounded-full bg-[#00B8D4]/15 border border-[#00B8D4]/40 flex items-center justify-center text-[#00B8D4] animate-pulse">
              <ArrowRight className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              Auto-Seed
            </span>
          </div>

          {/* Championship Final */}
          <div className="space-y-4">
            <span className="text-[10px] font-mono font-bold text-[#FFC857] uppercase tracking-wider">
              Championship Gold Medal Match
            </span>

            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#263238] to-[#090D16] border-2 border-[#FFC857]/40 space-y-3 shadow-[0_0_25px_rgba(255,200,87,0.15)]">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#FFC857] font-black flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Grand Final • 3:30 PM</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[#FFC857] text-[10px] font-bold">
                  {matches.final.winner ? 'FINAL CHAMPION' : 'Auto-Seeded'}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className={`flex justify-between items-center p-2.5 rounded-xl text-xs font-bold ${
                  matches.final.winner === matches.final.teamA
                    ? 'bg-amber-500/20 text-[#FFC857] border border-amber-500/50'
                    : 'bg-[#090D16] text-white'
                }`}>
                  <span>{matches.final.teamA}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateMatchScore('final', matches.final.scoreA + 1, matches.final.scoreB, true)}
                      className="w-5 h-5 rounded bg-white/10 hover:bg-amber-400 hover:text-black text-[10px] flex items-center justify-center cursor-pointer"
                      title="Add Point & Crown Champion"
                    >
                      +
                    </button>
                    <span className="font-mono text-[#FFC857] font-black">{matches.final.scoreA}</span>
                  </div>
                </div>
                <div className={`flex justify-between items-center p-2.5 rounded-xl text-xs font-bold ${
                  matches.final.winner === matches.final.teamB
                    ? 'bg-amber-500/20 text-[#FFC857] border border-amber-500/50'
                    : 'bg-[#090D16] text-white'
                }`}>
                  <span>{matches.final.teamB}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateMatchScore('final', matches.final.scoreA, matches.final.scoreB + 1, true)}
                      className="w-5 h-5 rounded bg-white/10 hover:bg-amber-400 hover:text-black text-[10px] flex items-center justify-center cursor-pointer"
                      title="Add Point & Crown Champion"
                    >
                      +
                    </button>
                    <span className="font-mono text-[#FFC857] font-black">{matches.final.scoreB}</span>
                  </div>
                </div>
              </div>

              {matches.final.winner && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-amber-400 font-mono font-black text-xs">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>TOURNAMENT CHAMPIONS</span>
                  </div>
                  <div className="text-white font-black text-sm">{matches.final.winner}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default PoolBracketEngine;
