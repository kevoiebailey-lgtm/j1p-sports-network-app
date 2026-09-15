import React from 'react';
import { 
  Trophy, 
  Clock, 
  Radio, 
  ShieldAlert, 
  Edit3, 
  Users, 
  Zap, 
  Activity 
} from 'lucide-react';

export interface ActiveGameScoreBarProps {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  period: string;
  gameClock: string;
  possession?: 'home' | 'away' | null;
  sport: string;
  isLive?: boolean;
  canEditScore: boolean;
  onOpenScorekeeper: () => void;
}

export const ActiveGameScoreBar: React.FC<ActiveGameScoreBarProps> = ({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  period,
  gameClock,
  possession = null,
  sport,
  isLive = true,
  canEditScore,
  onOpenScorekeeper
}) => {
  return (
    <div className="w-full bg-[#1E2630] border-y border-slate-700/80 px-3 sm:px-6 py-2.5 shadow-xl select-none transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        
        {/* Left Status & Sport Indicator */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {isLive ? (
            <span className="px-2.5 py-1 rounded-full bg-rose-600/20 border border-rose-500/50 text-rose-400 font-mono font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>LIVE MATCH</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-mono font-bold text-[10px] uppercase border border-slate-700">
              STANDBY
            </span>
          )}

          <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
            {sport}
          </span>
        </div>

        {/* Center: High-Contrast Live Score Bug Matrix */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 font-mono w-full sm:w-auto my-1 sm:my-0">
          
          {/* HOME TEAM */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[11px] sm:text-xs font-black text-white uppercase tracking-tight block max-w-[120px] sm:max-w-[160px] truncate">
                {homeTeamName}
              </span>
              {possession === 'home' && (
                <span className="text-[9px] font-mono font-bold text-[#00F2FE] uppercase block">
                  🏈 Possession
                </span>
              )}
            </div>
            <span className="text-2xl sm:text-3xl font-black text-[#F59E0B] bg-[#161C22] px-3 py-0.5 rounded-xl border border-[#F59E0B]/30 min-w-[48px] sm:min-w-[56px] text-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              {homeScore}
            </span>
          </div>

          {/* VS Divider & Period/Clock */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">VS</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-mono font-black text-[#00F2FE] bg-[#00F2FE]/10 px-1.5 py-0.5 rounded border border-[#00F2FE]/30 uppercase">
                {period}
              </span>
              <span className="text-[10px] font-mono font-bold text-white bg-[#161C22] px-1.5 py-0.5 rounded border border-slate-700">
                {gameClock}
              </span>
            </div>
          </div>

          {/* AWAY TEAM */}
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#00F2FE] bg-[#161C22] px-3 py-0.5 rounded-xl border border-[#00F2FE]/30 min-w-[48px] sm:min-w-[56px] text-center shadow-[0_0_15px_rgba(0,242,254,0.2)]">
              {awayScore}
            </span>
            <div className="text-left">
              <span className="text-[11px] sm:text-xs font-black text-white uppercase tracking-tight block max-w-[120px] sm:max-w-[160px] truncate">
                {awayTeamName}
              </span>
              {possession === 'away' && (
                <span className="text-[9px] font-mono font-bold text-[#00F2FE] uppercase block">
                  🏈 Possession
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Right Action: Admin Scorekeeper Control Button */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {canEditScore ? (
            <button
              onClick={onOpenScorekeeper}
              className="px-3.5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#d98700] text-slate-950 font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>UPDATE SCORE</span>
            </button>
          ) : (
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              <Zap className="w-3 h-3 text-[#00F2FE]" />
              <span>Real-Time Sync</span>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
