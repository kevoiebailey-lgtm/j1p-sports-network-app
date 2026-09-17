import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Radio, 
  Clock, 
  MapPin, 
  Star, 
  AlertTriangle, 
  Trophy, 
  Eye, 
  Activity, 
  Flame,
  Zap
} from 'lucide-react';
import { INITIAL_TOURNAMENT_GAMES, INITIAL_ATHLETE_DOCS } from '../../../lib/platformData';

export const ScoutCourtRadarTab: React.FC = () => {
  const [games, setGames] = useState(INITIAL_TOURNAMENT_GAMES);
  const watchlistedAthleteIds = ['ath-001', 'ath-002'];

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#FFB703] animate-pulse" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Live Court Radar
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Real-Time Field Allocations & Watchlisted Prospect Live Tracker
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            4 Active Courts
          </span>
        </div>
      </div>

      {/* 4-Court Live Radar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {games.map((game) => {
          const hasProspect = game.featuredAthleteIds?.some(id => watchlistedAthleteIds.includes(id));
          const featuredAthlete = hasProspect 
            ? INITIAL_ATHLETE_DOCS.find(a => game.featuredAthleteIds?.includes(a.id)) 
            : null;

          return (
            <div
              key={game.id}
              className={`rounded-3xl p-5 border transition-all relative overflow-hidden ${
                hasProspect 
                  ? 'bg-gradient-to-b from-[#161d2f] to-[#0d1424] border-[#FFB703]/60 shadow-[0_0_30px_rgba(255,183,3,0.15)]' 
                  : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              {/* Top Court Badge & Status */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-950 font-black text-xs text-white border border-slate-800">
                    {game.courtName}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{game.scheduledTime}</span>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  game.status === 'Live' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' :
                  game.status === 'Final' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {game.status === 'Live' ? `🔴 LIVE (${game.period} • ${game.clock})` : game.status}
                </span>
              </div>

              {/* Watchlisted Prospect Alert Banner */}
              {hasProspect && featuredAthlete && (
                <div className="mb-3 p-2.5 rounded-xl bg-[#FFB703]/15 border border-[#FFB703]/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-[#FFB703] text-slate-950">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                    </span>
                    <div>
                      <span className="text-[10px] text-amber-300 font-black uppercase block leading-none">
                        Prospect on Field
                      </span>
                      <strong className="text-white font-extrabold text-xs">
                        {featuredAthlete.displayName} ({featuredAthlete.position})
                      </strong>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-[#FFB703] font-bold">
                    #{featuredAthlete.jerseyNumber}
                  </span>
                </div>
              )}

              {/* Scoreboard Visual */}
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex-1">
                  <div className="text-sm sm:text-base font-black text-white">{game.homeTeam}</div>
                  <div className="text-[11px] text-slate-400">Home • Seed #{game.homeTeamSeed}</div>
                </div>

                <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800 font-mono font-black text-lg text-[#FFB703] shadow-inner">
                  {game.status === 'Upcoming' ? 'VS' : `${game.homeScore} - ${game.awayScore}`}
                </div>

                <div className="flex-1 text-right">
                  <div className="text-sm sm:text-base font-black text-white">{game.awayTeam}</div>
                  <div className="text-[11px] text-slate-400">Away • Seed #{game.awayTeamSeed}</div>
                </div>
              </div>

              {/* Footer info */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Ref: {game.referee}</span>
                <span>Div: {game.division}</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default ScoutCourtRadarTab;
