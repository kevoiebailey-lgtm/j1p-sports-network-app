import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Tv, 
  Flame, 
  Radio, 
  Heart, 
  MessageSquare, 
  Share2, 
  Clock, 
  Trophy, 
  Sparkles,
  Zap
} from 'lucide-react';
import { INITIAL_TOURNAMENT_GAMES, INITIAL_TOURNAMENT_DOC } from '../../../lib/platformData';
import { LiveScoresTicker } from '../../LiveScoresTicker';
import LiveBroadcastHub from '../../live/LiveBroadcastHub';

export const ViewerLiveCenterTab: React.FC = () => {
  const [games, setGames] = useState(INITIAL_TOURNAMENT_GAMES);
  const [cheerCount, setCheerCount] = useState<Record<string, number>>({
    'game-101': 142,
    'game-102': 89
  });

  const handleCheer = (gameId: string) => {
    setCheerCount(prev => ({
      ...prev,
      [gameId]: (prev[gameId] || 0) + 1
    }));
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* 100% Free Live Sports Scoreboard Ticker */}
      <LiveScoresTicker initialLeague="ALL" />

      {/* DEDICATED ZERO-COST LIVE BROADCAST & SIDELINE STREAMING HUB */}
      <LiveBroadcastHub />

      {/* ALL COURTS LIVE SCOREBOARD GRID */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              All Tournament Courts & Game Scoreboards
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {INITIAL_TOURNAMENT_DOC.title}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 text-xs">
                <span className="font-bold text-white px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800">
                  {game.courtName}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  game.status === 'Live' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                  game.status === 'Final' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {game.status === 'Live' ? `🔴 LIVE (${game.period} • ${game.clock})` : game.status}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex-1">
                  <div className="text-sm font-black text-white">{game.homeTeam}</div>
                  <div className="text-[11px] text-slate-400">Home</div>
                </div>

                <div className="px-3.5 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono font-black text-lg text-[#818CF8]">
                  {game.status === 'Upcoming' ? 'VS' : `${game.homeScore} - ${game.awayScore}`}
                </div>

                <div className="flex-1 text-right">
                  <div className="text-sm font-black text-white">{game.awayTeam}</div>
                  <div className="text-[11px] text-slate-400">Away</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Ref: {game.referee}</span>
                <button 
                  onClick={() => handleCheer(game.id)}
                  className="text-[#818CF8] hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  <span>{cheerCount[game.id] || 120} Cheers</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default ViewerLiveCenterTab;
