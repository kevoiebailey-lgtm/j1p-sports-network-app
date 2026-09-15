import React, { useState } from 'react';
import { 
  Trophy, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export interface PoolTeam {
  teamName: string;
  pool: 'A' | 'B';
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  headToHeadWin?: boolean;
}

interface AutoSeedingEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySeedingToBracket?: (seededMatches: any) => void;
}

export const AutoSeedingEngineModal: React.FC<AutoSeedingEngineModalProps> = ({
  isOpen,
  onClose,
  onApplySeedingToBracket
}) => {
  const [tiebreakerRule, setTiebreakerRule] = useState<'goal_diff' | 'head_to_head' | 'goals_for'>('goal_diff');
  const [teams, setTeams] = useState<PoolTeam[]>([
    { teamName: 'SoCal Elite Vipers', pool: 'A', played: 3, wins: 3, draws: 0, losses: 0, points: 9, goalsFor: 18, goalsAgainst: 4, goalDiff: 14 },
    { teamName: 'Pacific Coast Storm', pool: 'A', played: 3, wins: 2, draws: 0, losses: 1, points: 6, goalsFor: 12, goalsAgainst: 7, goalDiff: 5 },
    { teamName: 'Desert Fire Select', pool: 'A', played: 3, wins: 1, draws: 0, losses: 2, points: 3, goalsFor: 8, goalsAgainst: 13, goalDiff: -5 },
    { teamName: 'Bay Area Flight', pool: 'A', played: 3, wins: 0, draws: 0, losses: 3, points: 0, goalsFor: 3, goalsAgainst: 17, goalDiff: -14 },
    { teamName: 'Texas Outlaws Club', pool: 'B', played: 3, wins: 2, draws: 1, losses: 0, points: 7, goalsFor: 15, goalsAgainst: 6, goalDiff: 9 },
    { teamName: 'California Golden Bears', pool: 'B', played: 3, wins: 2, draws: 0, losses: 1, points: 6, goalsFor: 11, goalsAgainst: 8, goalDiff: 3 },
    { teamName: 'Las Vegas Lightning', pool: 'B', played: 3, wins: 1, draws: 1, losses: 1, points: 4, goalsFor: 9, goalsAgainst: 10, goalDiff: -1 },
    { teamName: 'Arizona Heatwave', pool: 'B', played: 3, wins: 0, draws: 0, losses: 3, points: 0, goalsFor: 4, goalsAgainst: 15, goalDiff: -11 },
  ]);

  const [isCalculated, setIsCalculated] = useState(true);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sorting with multi-tier tiebreaker engine
  const sortPool = (poolList: PoolTeam[]) => {
    return [...poolList].sort((a, b) => {
      // 1. Primary: Total Points
      if (b.points !== a.points) return b.points - a.points;

      // 2. Secondary: Selected Tiebreaker
      if (tiebreakerRule === 'goal_diff') {
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
      } else if (tiebreakerRule === 'goals_for') {
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return b.goalDiff - a.goalDiff;
      } else {
        // Head-to-head fallback
        return b.goalDiff - a.goalDiff;
      }
    });
  };

  const poolARanked = sortPool(teams.filter(t => t.pool === 'A'));
  const poolBRanked = sortPool(teams.filter(t => t.pool === 'B'));

  const seedA1 = poolARanked[0];
  const seedA2 = poolARanked[1];
  const seedB1 = poolBRanked[0];
  const seedB2 = poolBRanked[1];

  const handleApplyToChampionship = () => {
    const seededChampionship = {
      semi1: {
        teamA: `${seedA1.teamName} (Pool A #1)`,
        teamB: `${seedB2.teamName} (Pool B #2)`,
        matchTitle: 'Semifinal #1: Cross-Pool Battle'
      },
      semi2: {
        teamA: `${seedB1.teamName} (Pool B #1)`,
        teamB: `${seedA2.teamName} (Pool A #2)`,
        matchTitle: 'Semifinal #2: Cross-Pool Battle'
      }
    };

    if (onApplySeedingToBracket) {
      onApplySeedingToBracket(seededChampionship);
    }

    setAppliedToast('Championship Bracket Seeded Successfully! Cross-pool matchups finalized.');
    setTimeout(() => {
      setAppliedToast(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#090D16] border border-[#00F2FE]/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,242,254,0.25)] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#121A26] border-b border-[#24324F]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
                Automated Pool Standings &amp; Bracket Seeding Engine
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Multi-Factor Tiebreaker Resolver &amp; Cross-Pool Playoff Seeder
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {appliedToast && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-xs text-emerald-300 font-mono font-bold flex items-center gap-2 shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{appliedToast}</span>
            </div>
          )}

          {/* Tiebreaker Rules Configuration */}
          <div className="p-4 rounded-2xl bg-[#121A26] border border-[#24324F] flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-slate-300 uppercase">Tiebreaker Protocol:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTiebreakerRule('goal_diff')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  tiebreakerRule === 'goal_diff' ? 'bg-[#00F2FE] text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400'
                }`}
              >
                1. Points &gt; 2. Goal Differential
              </button>
              <button
                onClick={() => setTiebreakerRule('head_to_head')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  tiebreakerRule === 'head_to_head' ? 'bg-[#00F2FE] text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400'
                }`}
              >
                1. Points &gt; 2. Head-to-Head
              </button>
              <button
                onClick={() => setTiebreakerRule('goals_for')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  tiebreakerRule === 'goals_for' ? 'bg-[#00F2FE] text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400'
                }`}
              >
                1. Points &gt; 2. Most Goals Scored
              </button>
            </div>
          </div>

          {/* Side-by-Side Pool Standings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Pool A */}
            <div className="p-4 rounded-2xl bg-[#121A26] border border-[#24324F] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-[#00F2FE] uppercase">Pool A Standings</span>
                <span className="text-[10px] font-mono text-emerald-400">Top 2 Qualify</span>
              </div>
              <div className="space-y-2">
                {poolARanked.map((team, idx) => (
                  <div key={team.teamName} className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-mono ${
                    idx < 2 ? 'bg-emerald-500/10 border border-emerald-500/30 text-white' : 'bg-slate-900/60 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                        idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>
                      <span className="font-bold truncate max-w-[140px]">{team.teamName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span>{team.wins}W-{team.losses}L</span>
                      <span className="text-emerald-400 font-bold">{team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff} GD</span>
                      <span className="text-cyan-300 font-black">{team.points} PTS</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pool B */}
            <div className="p-4 rounded-2xl bg-[#121A26] border border-[#24324F] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-[#39FF14] uppercase">Pool B Standings</span>
                <span className="text-[10px] font-mono text-emerald-400">Top 2 Qualify</span>
              </div>
              <div className="space-y-2">
                {poolBRanked.map((team, idx) => (
                  <div key={team.teamName} className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-mono ${
                    idx < 2 ? 'bg-emerald-500/10 border border-emerald-500/30 text-white' : 'bg-slate-900/60 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                        idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>
                      <span className="font-bold truncate max-w-[140px]">{team.teamName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span>{team.wins}W-{team.losses}L</span>
                      <span className="text-emerald-400 font-bold">{team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff} GD</span>
                      <span className="text-emerald-300 font-black">{team.points} PTS</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Generated Playoff Bracket Seeding Projection */}
          <div className="p-5 rounded-2xl bg-[#060A10] border-2 border-amber-400/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider">
                  Automated Cross-Pool Playoff Matchups
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                NCAA Standard Cross-Seeding
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Semifinal 1 */}
              <div className="p-4 rounded-xl bg-[#121A26] border border-cyan-500/40 space-y-2">
                <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
                  SEMIFINAL #1 (Pool A #1 vs Pool B #2)
                </div>
                <div className="space-y-1.5 text-xs font-mono font-bold">
                  <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center text-white">
                    <span>{seedA1.teamName}</span>
                    <span className="text-[10px] text-amber-400">Pool A #1 Seed</span>
                  </div>
                  <div className="text-center text-[10px] text-slate-500 font-bold">VS</div>
                  <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center text-white">
                    <span>{seedB2.teamName}</span>
                    <span className="text-[10px] text-cyan-400">Pool B #2 Seed</span>
                  </div>
                </div>
              </div>

              {/* Semifinal 2 */}
              <div className="p-4 rounded-xl bg-[#121A26] border border-emerald-500/40 space-y-2">
                <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                  SEMIFINAL #2 (Pool B #1 vs Pool A #2)
                </div>
                <div className="space-y-1.5 text-xs font-mono font-bold">
                  <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center text-white">
                    <span>{seedB1.teamName}</span>
                    <span className="text-[10px] text-amber-400">Pool B #1 Seed</span>
                  </div>
                  <div className="text-center text-[10px] text-slate-500 font-bold">VS</div>
                  <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center text-white">
                    <span>{seedA2.teamName}</span>
                    <span className="text-[10px] text-emerald-400">Pool A #2 Seed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleApplyToChampionship}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <span>APPLY SEEDING TO CHAMPIONSHIP BRACKET</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
