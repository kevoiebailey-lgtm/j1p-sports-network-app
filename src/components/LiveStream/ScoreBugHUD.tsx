import React from 'react';
import { Activity } from 'lucide-react';

export interface ScoreBugHUDProps {
  homeTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logoUrl?: string;
  };
  awayTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logoUrl?: string;
  };
  period: string;
  gameClock: string;
  sport: string;
  isLive?: boolean;
}

export const ScoreBugHUD: React.FC<ScoreBugHUDProps> = ({
  homeTeam,
  awayTeam,
  period,
  gameClock,
  sport,
  isLive = true
}) => {
  return (
    <div className="absolute top-2 left-2 right-2 z-10 pointer-events-auto">
      <div className="bg-[#212A31]/85 backdrop-blur-md border border-slate-800/90 rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2 shadow-2xl flex items-center justify-between text-white font-sans gap-1.5 sm:gap-3 select-none">
        
        {/* Left: Live Pulse Badge & Sport Category */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isLive ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-600/90 text-white font-black text-[9px] sm:text-[10px] uppercase tracking-wider font-mono shadow-[0_0_10px_rgba(225,29,72,0.6)] flex items-center gap-1 animate-pulse shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>LIVE</span>
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[9px] uppercase font-bold">
              STANDBY
            </span>
          )}

          <span className="hidden sm:inline-block text-[9px] sm:text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider bg-[#212A31]/80 px-1.5 py-0.5 rounded border border-slate-800">
            {sport}
          </span>
        </div>

        {/* Center: Sleek Horizontal Score Bug */}
        <div className="flex items-center gap-1.5 sm:gap-3 font-mono text-xs sm:text-sm">
          
          {/* Home Team */}
          <div className="flex items-center gap-1">
            {homeTeam.logoUrl && (
              <img src={homeTeam.logoUrl} alt={homeTeam.name} className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
            )}
            <span className="font-black text-white text-[11px] sm:text-xs">{homeTeam.abbreviation}</span>
            <span className="text-xs sm:text-sm font-black text-[#E5B868] bg-[#E5B868]/10 px-1.5 py-0.5 rounded border border-[#E5B868]/30 min-w-[24px] sm:min-w-[28px] text-center">
              {homeTeam.score}
            </span>
          </div>

          <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 uppercase">VS</span>

          {/* Away Team */}
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm font-black text-[#E2E8F0] bg-[#E2E8F0]/10 px-1.5 py-0.5 rounded border border-[#E2E8F0]/30 min-w-[24px] sm:min-w-[28px] text-center">
              {awayTeam.score}
            </span>
            <span className="font-black text-white text-[11px] sm:text-xs">{awayTeam.abbreviation}</span>
            {awayTeam.logoUrl && (
              <img src={awayTeam.logoUrl} alt={awayTeam.name} className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
            )}
          </div>

        </div>

        {/* Right: Period & Game Clock */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <span className="text-[8px] sm:text-[10px] font-mono font-black text-[#E5B868] bg-[#E5B868]/10 px-1.5 py-0.5 rounded border border-[#E5B868]/30 uppercase">
            {period}
          </span>
          <span className="text-[10px] sm:text-xs font-mono font-bold text-white bg-[#212A31] px-1.5 py-0.5 rounded border border-slate-800">
            {gameClock}
          </span>
        </div>

      </div>
    </div>
  );
};
