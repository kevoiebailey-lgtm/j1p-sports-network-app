import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Trophy, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Shield, 
  Award,
  ChevronRight
} from 'lucide-react';
import { INITIAL_TOURNAMENT_DOC, INITIAL_TOURNAMENT_GAMES, INITIAL_POOL_STANDINGS } from '../../../lib/platformData';

export const AthleteScheduleTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'standings' | 'results'>('schedule');

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#00F5D4]" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {INITIAL_TOURNAMENT_DOC.title}
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Team: <span className="text-[#00F5D4] font-bold">SoCal Elite Vipers</span> • Division: <span className="text-white font-semibold">Varsity Gold</span>
          </p>
        </div>

        {/* 3 Sub-pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'schedule' ? 'bg-[#00F5D4] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Schedule
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'standings' ? 'bg-[#00F5D4] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pool Standings
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'results' ? 'bg-[#00F5D4] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Verified Results
          </button>
        </div>
      </div>

      {/* 1. SCHEDULE SUB-VIEW */}
      {activeTab === 'schedule' && (
        <div className="space-y-3">
          {INITIAL_TOURNAMENT_GAMES.map((game) => {
            const isMyTeam = game.homeTeam === 'SoCal Elite Vipers' || game.awayTeam === 'SoCal Elite Vipers';
            return (
              <div 
                key={game.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isMyTeam 
                    ? 'bg-slate-900/90 border-[#00F5D4]/40 shadow-[0_0_20px_rgba(0,245,212,0.15)]' 
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                      {game.courtName}
                    </span>
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#00F5D4]" />
                      {game.scheduledTime}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    game.status === 'Live' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' :
                    game.status === 'Final' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {game.status === 'Live' ? `🔴 LIVE (${game.period})` : game.status}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  {/* Home */}
                  <div className="flex-1">
                    <div className="text-xs text-slate-400 font-bold">HOME</div>
                    <div className="text-sm sm:text-base font-black text-white">{game.homeTeam}</div>
                    <div className="text-[11px] text-slate-400">Seed #{game.homeTeamSeed}</div>
                  </div>

                  {/* Score or VS */}
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono font-black text-base text-[#00F5D4]">
                    {game.status === 'Upcoming' ? 'VS' : `${game.homeScore} - ${game.awayScore}`}
                  </div>

                  {/* Away */}
                  <div className="flex-1 text-right">
                    <div className="text-xs text-slate-400 font-bold">AWAY</div>
                    <div className="text-sm sm:text-base font-black text-white">{game.awayTeam}</div>
                    <div className="text-[11px] text-slate-400">Seed #{game.awayTeamSeed}</div>
                  </div>
                </div>

                {isMyTeam && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-[#00F5D4]">
                    <span className="font-bold">✓ Team Check-In & Waiver Verified</span>
                    <span className="text-slate-400 text-[11px]">Official: {game.referee}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. POOL STANDINGS SUB-VIEW */}
      {activeTab === 'standings' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black text-[#00F5D4] uppercase tracking-wider">
              Pool A Standings (Varsity Gold)
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Top 2 Teams Advance to Championship Bracket</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Seed</th>
                  <th className="py-2.5 px-4">Team</th>
                  <th className="py-2.5 px-4 text-center">W</th>
                  <th className="py-2.5 px-4 text-center">L</th>
                  <th className="py-2.5 px-4 text-center">+/- Diff</th>
                  <th className="py-2.5 px-4 text-right">Waivers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {INITIAL_POOL_STANDINGS.map((row) => {
                  const isMyTeam = row.teamName === 'SoCal Elite Vipers';
                  return (
                    <tr 
                      key={row.teamName}
                      className={isMyTeam ? 'bg-[#00F5D4]/10 font-bold text-white' : 'hover:bg-slate-800/40 text-slate-300'}
                    >
                      <td className="py-3 px-4 font-mono font-black text-[#00F5D4]">#{row.seed}</td>
                      <td className="py-3 px-4 flex items-center gap-2">
                        {row.teamName}
                        {isMyTeam && <span className="px-1.5 py-0.5 rounded bg-[#00F5D4] text-slate-950 text-[9px] font-black">MY TEAM</span>}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{row.wins}</td>
                      <td className="py-3 px-4 text-center font-mono">{row.losses}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">{row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-mono">{row.waiverPercent}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. VERIFIED RESULTS */}
      {activeTab === 'results' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold">Game #103 • Final Box Score</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Official Certified</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-sm font-black text-white">West Coast Hoops</div>
                <div className="text-[11px] text-slate-400">Brianna Chen: 32 Pts, 8 Ast</div>
              </div>
              <div className="text-xl font-mono font-black text-emerald-400">56</div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 pt-2">
              <div>
                <div className="text-sm font-black text-slate-300">Arizona Aztecs</div>
                <div className="text-[11px] text-slate-400">Marcus Villa: 22 Pts, 6 Reb</div>
              </div>
              <div className="text-xl font-mono font-black text-slate-400">49</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AthleteScheduleTab;
