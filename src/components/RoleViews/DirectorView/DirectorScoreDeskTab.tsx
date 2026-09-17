import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Minus, 
  CheckCircle2, 
  ShieldAlert, 
  Flag 
} from 'lucide-react';
import { INITIAL_TOURNAMENT_GAMES } from '../../../lib/platformData';
import { TournamentGameDoc } from '../../../types/platform';

export const DirectorScoreDeskTab: React.FC = () => {
  const [games, setGames] = useState<TournamentGameDoc[]>(INITIAL_TOURNAMENT_GAMES);
  const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id || '');
  const [auditNotice, setAuditNotice] = useState<string | null>(null);

  const activeGame = games.find(g => g.id === selectedGameId) || games[0];

  const updateScore = (team: 'home' | 'away', delta: number) => {
    setGames(games.map(g => {
      if (g.id === activeGame.id) {
        const current = team === 'home' ? g.homeScore : g.awayScore;
        const newScore = Math.max(0, current + delta);
        return team === 'home' ? { ...g, homeScore: newScore } : { ...g, awayScore: newScore };
      }
      return g;
    }));
  };

  const updatePeriod = (period: TournamentGameDoc['period']) => {
    setGames(games.map(g => {
      if (g.id === activeGame.id) {
        const isFinal = period === 'Final';
        return { 
          ...g, 
          period, 
          status: isFinal ? 'Final' : period === 'Upcoming' ? 'Upcoming' : 'Live' 
        };
      }
      return g;
    }));
    setAuditNotice(`Game status updated to: ${period}`);
    setTimeout(() => setAuditNotice(null), 2500);
  };

  const toggleClock = () => {
    setGames(games.map(g => {
      if (g.id === activeGame.id) {
        return { ...g, isClockRunning: !g.isClockRunning };
      }
      return g;
    }));
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FF6A00]" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Live Scorekeeper & Stats Console
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Instant 1-Tap Score Entry & Running Clock Control for Court Officials
          </p>
        </div>

        {/* Court Selectors */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-700/80 self-start sm:self-auto overflow-x-auto">
          {games.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGameId(g.id)}
              className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                g.id === activeGame.id ? 'bg-[#FF6A00] text-white shadow-md font-black' : 'text-slate-300 hover:text-white'
              }`}
            >
              {g.courtName.split(' ')[0]} {g.courtName.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {auditNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{auditNotice}</span>
        </div>
      )}

      {/* ACTIVE SCOREBOARD CONSOLE */}
      {activeGame && (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
          
          {/* Top Period & Clock Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-700/80">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-wider">
                {activeGame.clock}
              </span>
              <button
                onClick={toggleClock}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md ${
                  activeGame.isClockRunning 
                    ? 'bg-amber-400 text-slate-950 font-black' 
                    : 'bg-emerald-400 text-slate-950 font-black'
                }`}
              >
                {activeGame.isClockRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{activeGame.isClockRunning ? 'Pause Clock' : 'Start Clock'}</span>
              </button>
            </div>

            {/* Period Selector (min-h-[48px]) */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['1st Half', 'Halftime', '2nd Half', 'OT', 'Final'] as TournamentGameDoc['period'][]).map((p) => (
                <button
                  key={p}
                  onClick={() => updatePeriod(p)}
                  className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    activeGame.period === p ? 'bg-[#FF6A00] text-white font-black' : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* TEAMS SCORING INTERACTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* HOME TEAM */}
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-700/80 space-y-4 text-center">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[#00F5D4] uppercase">Home Team</span>
                <h3 className="text-base sm:text-lg font-black text-white">{activeGame.homeTeam}</h3>
              </div>

              {/* Big Score Display */}
              <div className="text-5xl sm:text-6xl font-mono font-black text-[#00F5D4] py-2">
                {activeGame.homeScore}
              </div>

              {/* 54px x 54px Touch Target Action Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => updateScore('home', +1)}
                  className="min-h-[54px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white border border-slate-700 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+1</span>
                  <span className="text-[9px] text-slate-300 font-normal">XP</span>
                </button>
                <button
                  onClick={() => updateScore('home', +2)}
                  className="min-h-[54px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white border border-slate-700 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+2</span>
                  <span className="text-[9px] text-slate-300 font-normal">Safety</span>
                </button>
                <button
                  onClick={() => updateScore('home', +6)}
                  className="min-h-[54px] rounded-2xl bg-[#00F5D4] hover:bg-[#00e2c4] text-slate-950 text-xs font-black shadow-lg cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+6</span>
                  <span className="text-[9px] font-bold">TD</span>
                </button>
                <button
                  onClick={() => updateScore('home', -1)}
                  className="min-h-[54px] rounded-2xl bg-red-950/60 hover:bg-red-900/80 text-xs font-black text-red-300 border border-red-700/60 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>-1</span>
                  <span className="text-[9px] font-normal">Correct</span>
                </button>
              </div>
            </div>

            {/* AWAY TEAM */}
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-700/80 space-y-4 text-center">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-amber-400 uppercase">Away Team</span>
                <h3 className="text-base sm:text-lg font-black text-white">{activeGame.awayTeam}</h3>
              </div>

              {/* Big Score Display */}
              <div className="text-5xl sm:text-6xl font-mono font-black text-amber-400 py-2">
                {activeGame.awayScore}
              </div>

              {/* 54px x 54px Touch Target Action Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => updateScore('away', +1)}
                  className="min-h-[54px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white border border-slate-700 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+1</span>
                  <span className="text-[9px] text-slate-300 font-normal">XP</span>
                </button>
                <button
                  onClick={() => updateScore('away', +2)}
                  className="min-h-[54px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white border border-slate-700 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+2</span>
                  <span className="text-[9px] text-slate-300 font-normal">Safety</span>
                </button>
                <button
                  onClick={() => updateScore('away', +6)}
                  className="min-h-[54px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+6</span>
                  <span className="text-[9px] font-bold">TD</span>
                </button>
                <button
                  onClick={() => updateScore('away', -1)}
                  className="min-h-[54px] rounded-2xl bg-red-950/60 hover:bg-red-900/80 text-xs font-black text-red-300 border border-red-700/60 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>-1</span>
                  <span className="text-[9px] font-normal">Correct</span>
                </button>
              </div>
            </div>

          </div>

          {/* Official Certification Footer */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Scorekeeper: Director Desk Audit Mode</span>
            <span>Court Lead Ref: <strong className="text-slate-200">{activeGame.referee}</strong></span>
          </div>

        </div>
      )}

    </div>
  );
};

export default DirectorScoreDeskTab;
