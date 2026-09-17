import React, { useState, useEffect } from 'react';
import { Radio, Flame, ChevronRight, ChevronDown, ChevronUp, Zap, Trophy, X, Bell, BellRing, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export interface ScoreItem {
  id: string;
  sport: string;
  league: string;
  homeTeam: { name: string; score: number; logo: string };
  awayTeam: { name: string; score: number; logo: string };
  status: 'LIVE' | 'FINAL' | 'UPCOMING';
  period?: string;
  timeRemaining?: string;
  highlight?: string;
}

const SAMPLE_GAMES: ScoreItem[] = [
  {
    id: 'g1',
    sport: "Girls' Flag Football",
    league: 'State Championship',
    homeTeam: { name: 'Miami Central Express', score: 28, logo: '⚡' },
    awayTeam: { name: 'Orlando Speed Knights', score: 24, logo: '⚔️' },
    status: 'LIVE',
    period: 'Q4',
    timeRemaining: '02:15',
    highlight: 'Interception returned for 45yd TD!'
  },
  {
    id: 'g2',
    sport: 'Basketball',
    league: 'AAU Showcase',
    homeTeam: { name: 'Atlanta Hawks Prep', score: 82, logo: '🦅' },
    awayTeam: { name: 'Charlotte Flight', score: 79, logo: '✈️' },
    status: 'LIVE',
    period: 'Q4',
    timeRemaining: '00:48'
  },
  {
    id: 'g3',
    sport: 'Tackle Football',
    league: 'Regional Semifinals',
    homeTeam: { name: 'St. Thomas Aquinas', score: 35, logo: '🛡️' },
    awayTeam: { name: 'Lakeland Dreadnaughts', score: 31, logo: '⚓' },
    status: 'FINAL',
    period: 'FINAL'
  },
  {
    id: 'g4',
    sport: 'Volleyball',
    league: 'Varsity Invitational',
    homeTeam: { name: 'Tampa Bay Wave', score: 3, logo: '🌊' },
    awayTeam: { name: 'Jacksonville Storm', score: 1, logo: '⛈️' },
    status: 'FINAL',
    period: 'FINAL'
  },
  {
    id: 'g5',
    sport: 'Flag Football',
    league: 'Pro Elite Circuit',
    homeTeam: { name: 'Austin Vipers', score: 14, logo: '🐍' },
    awayTeam: { name: 'Dallas Mustangs', score: 12, logo: '🐎' },
    status: 'LIVE',
    period: 'Q3',
    timeRemaining: '08:30'
  }
];

export const LiveScoreTicker: React.FC<{
  onSelectGame?: (game: ScoreItem) => void;
}> = ({ onSelectGame }) => {
  const [games, setGames] = useState<ScoreItem[]>(SAMPLE_GAMES);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const { permission, requestPermission, loading: pushLoading } = usePushNotifications();

  // Simulate subtle real-time score updates
  useEffect(() => {
    const interval = setInterval(() => {
      setGames((prev) =>
        prev.map((g) => {
          if (g.status === 'LIVE' && Math.random() > 0.6) {
            const teamToScore = Math.random() > 0.5 ? 'homeTeam' : 'awayTeam';
            const pointsToAdd = g.sport.includes('Basketball') ? 2 : 6;
            return {
              ...g,
              [teamToScore]: {
                ...g[teamToScore],
                score: g[teamToScore].score + pointsToAdd
              }
            };
          }
          return g;
        })
      );
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="frosted-glass border-b border-white/15 dark:border-white/10 text-[#263238] dark:text-white select-none transition-colors backdrop-blur-xl">
      {/* Collapsed Bar Trigger */}
      <div className="max-w-7xl mx-auto px-3 py-1 flex items-center justify-between text-xs">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-2.5 py-1 rounded-full clear-glass hover:border-[#00B8D4] text-slate-700 dark:text-slate-200 text-[11px] font-mono font-bold transition-all cursor-pointer shadow-xs hover:glow-cyan"
        >
          <span className="w-2 h-2 rounded-full bg-[#00B8D4] animate-ping shrink-0 shadow-[0_0_10px_rgba(0,184,212,0.8)]" />
          <Radio className="w-3.5 h-3.5 text-[#00B8D4] shrink-0" />
          <span>SCORE TICKER ({games.filter(g => g.status === 'LIVE').length} LIVE)</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#00B8D4]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {!isExpanded && (
          <div className="flex items-center gap-2">
            <div 
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-3 cursor-pointer text-xs font-mono text-slate-600 dark:text-slate-300 hover:text-[#00B8D4] overflow-hidden max-w-xs sm:max-w-md truncate"
            >
              <span className="text-[10px] text-white bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] px-2 py-0.5 rounded-full font-bold shadow-[0_0_12px_rgba(255,106,0,0.45)] border border-[#FFC857]/40">
                LIVE: {games[0].homeTeam.name.split(' ')[0]} {games[0].homeTeam.score} vs {games[0].awayTeam.score} {games[0].awayTeam.name.split(' ')[0]}
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">Tap to expand scores →</span>
            </div>

            {/* Quick Web Push Score Alerts Toggle */}
            {permission !== 'granted' ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  requestPermission();
                }}
                disabled={pushLoading}
                className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-[#00B8D4] hover:text-[#00F5D4] bg-[#00B8D4]/10 hover:bg-[#00B8D4]/20 px-2 py-0.5 rounded-full border border-[#00B8D4]/30 transition-all cursor-pointer"
                title="Enable browser score notifications"
              >
                <Bell className="w-3 h-3 text-[#00B8D4]" />
                <span>{pushLoading ? 'Enabling...' : 'Score Alerts'}</span>
              </button>
            ) : (
              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                <span>Alerts On</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expandable Ticker Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/15 dark:border-white/10 frosted-glass py-2 px-3 shadow-xl backdrop-blur-2xl"
          >
            <div className="max-w-7xl mx-auto flex items-center gap-3">
              {/* Horizontal Scrolling Games */}
              <div className="flex-1 overflow-x-auto scrollbar-none flex items-center gap-3 py-1">
                {games.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => {
                      onSelectGame?.(game);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl clear-glass hover:border-[#00B8D4] transition-all cursor-pointer shrink-0 text-xs font-mono shadow-xs group hover:glow-cyan"
                  >
                    {/* Status Badge */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      {game.status === 'LIVE' ? (
                        <span className="text-[9px] font-black text-white bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] px-1.5 py-0.5 rounded leading-none flex items-center gap-1 shadow-[0_0_10px_rgba(255,106,0,0.4)] border border-[#FFC857]/30">
                          <Zap className="w-2.5 h-2.5 animate-bounce text-[#FFC857]" /> {game.period} {game.timeRemaining}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-[#10B981] clear-glass border border-[#10B981]/40 px-1.5 py-0.5 rounded leading-none shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                          FINAL
                        </span>
                      )}
                    </div>

                    {/* Matchup & Score */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{game.homeTeam.logo}</span>
                        <span className="font-bold text-[#263238] dark:text-white">{game.homeTeam.name.split(' ')[0]}</span>
                        <span className="font-black text-[#263238] dark:text-white px-1.5 py-0.5 rounded clear-glass border border-white/20">{game.homeTeam.score}</span>
                      </div>

                      <span className="text-slate-400 font-sans text-xs">vs</span>

                      <div className="flex items-center gap-1">
                        <span className="font-black text-[#263238] dark:text-white px-1.5 py-0.5 rounded clear-glass border border-white/20">{game.awayTeam.score}</span>
                        <span className="font-bold text-[#263238] dark:text-white">{game.awayTeam.name.split(' ')[0]}</span>
                        <span className="text-sm">{game.awayTeam.logo}</span>
                      </div>
                    </div>

                    {/* Highlight ticker badge if present */}
                    {game.highlight && (
                      <div className="hidden lg:flex items-center gap-1 text-[10px] text-[#FF6A00] font-sans bg-[#FF6A00]/10 px-1.5 py-0.5 rounded border border-[#FF6A00]/30 truncate max-w-[140px]">
                        <Flame className="w-2.5 h-2.5 shrink-0 text-[#FF6A00]" />
                        <span className="truncate">{game.highlight}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Push Notifications Toggle inside Drawer */}
              <div className="hidden sm:flex items-center shrink-0 pl-2 border-l border-white/10">
                {permission !== 'granted' ? (
                  <button
                    onClick={requestPermission}
                    disabled={pushLoading}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00B8D4]/15 hover:bg-[#00B8D4]/25 text-[#00B8D4] text-[11px] font-bold border border-[#00B8D4]/40 cursor-pointer transition-all"
                  >
                    <Bell className="w-3 h-3" />
                    <span>{pushLoading ? 'Enabling...' : 'Push Alerts'}</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Push Active</span>
                  </span>
                )}
              </div>

              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-[#37474F] text-slate-400 hover:text-[#263238] dark:hover:text-white transition-colors"
                title="Collapse Ticker"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
