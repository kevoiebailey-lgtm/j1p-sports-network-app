import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Trophy, MapPin, Search } from 'lucide-react';
import { INITIAL_TOURNAMENT_GAMES, INITIAL_POOL_STANDINGS, INITIAL_TOURNAMENT_DOC } from '../../../lib/platformData';

export const ViewerScheduleTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'standings'>('schedule');
  const [selectedCourt, setSelectedCourt] = useState<string>('All');

  const filteredGames = selectedCourt === 'All' 
    ? INITIAL_TOURNAMENT_GAMES 
    : INITIAL_TOURNAMENT_GAMES.filter(g => g.courtName.toLowerCase().includes(selectedCourt.toLowerCase()));

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#818CF8]" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Master Tournament Schedule & Standings
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {INITIAL_TOURNAMENT_DOC.title}
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('schedule')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'schedule' ? 'bg-[#818CF8] text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Court Schedule
          </button>
          <button
            onClick={() => setActiveSubTab('standings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'standings' ? 'bg-[#818CF8] text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pool Standings
          </button>
        </div>
      </div>

      {/* SCHEDULE */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="font-bold text-slate-400 mr-1">Filter Court:</span>
            {['All', 'Court 1', 'Court 2', 'Court 3', 'Court 4'].map((court) => (
              <button
                key={court}
                onClick={() => setSelectedCourt(court)}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  selectedCourt === court 
                    ? 'bg-[#818CF8] text-slate-950' 
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {court}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredGames.map((game) => (
              <div key={game.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                  <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-950">{game.courtName}</span>
                  <span className="text-slate-400">{game.scheduledTime} • {game.division}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="text-left font-bold text-white text-sm sm:text-base">{game.homeTeam}</div>
                  <div className="px-3 py-1 rounded-xl bg-slate-950 font-mono font-black text-[#818CF8]">
                    {game.status === 'Upcoming' ? 'VS' : `${game.homeScore} - ${game.awayScore}`}
                  </div>
                  <div className="text-right font-bold text-white text-sm sm:text-base">{game.awayTeam}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STANDINGS */}
      {activeSubTab === 'standings' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800">
            <h3 className="text-xs font-black text-[#818CF8] uppercase">Varsity Gold • Pool A Standings</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Seed</th>
                <th className="py-2.5 px-4">Team</th>
                <th className="py-2.5 px-4 text-center">W</th>
                <th className="py-2.5 px-4 text-center">L</th>
                <th className="py-2.5 px-4 text-right">Point Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {INITIAL_POOL_STANDINGS.map((row) => (
                <tr key={row.teamName} className="hover:bg-slate-800/40 text-slate-300">
                  <td className="py-3 px-4 font-mono font-black text-[#818CF8]">#{row.seed}</td>
                  <td className="py-3 px-4 font-bold text-white">{row.teamName}</td>
                  <td className="py-3 px-4 text-center font-mono">{row.wins}</td>
                  <td className="py-3 px-4 text-center font-mono">{row.losses}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">+{row.pointDiff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default ViewerScheduleTab;
