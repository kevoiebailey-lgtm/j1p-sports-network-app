import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Tv, 
  Trophy, 
  Flame, 
  Clock, 
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import { 
  fetchAllLiveScores, 
  fetchLeagueScores, 
  LiveGame, 
  League, 
  LeagueFilter 
} from '../lib/sportsApi';

interface LiveScoresTickerProps {
  initialLeague?: LeagueFilter;
  className?: string;
  showTitle?: boolean;
}

export const LiveScoresTicker: React.FC<LiveScoresTickerProps> = ({
  initialLeague = 'ALL',
  className = '',
  showTitle = true
}) => {
  const [selectedLeague, setSelectedLeague] = useState<LeagueFilter>(initialLeague);
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const LEAGUES: { id: LeagueFilter; label: string; icon: string }[] = [
    { id: 'ALL', label: 'All Leagues', icon: '🏆' },
    { id: 'NBA', label: 'NBA', icon: '🏀' },
    { id: 'NFL', label: 'NFL', icon: '🏈' },
    { id: 'MLB', label: 'MLB', icon: '⚾' },
    { id: 'WNBA', label: 'WNBA', icon: '⛹️‍♀️' }
  ];

  // Fetch live game scores
  const loadScores = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setRefreshing(true);

    try {
      if (selectedLeague === 'ALL') {
        const allScores = await fetchAllLiveScores();
        setGames(allScores);
      } else {
        const leagueScores = await fetchLeagueScores(selectedLeague as League);
        setGames(leagueScores);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('Error loading live scores:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load and league switch handler
  useEffect(() => {
    loadScores(false);
  }, [selectedLeague]);

  // 30-second silent background auto-refresh timer
  useEffect(() => {
    const intervalTimer = setInterval(() => {
      loadScores(true);
    }, 30000); // 30 seconds

    return () => clearInterval(intervalTimer);
  }, [selectedLeague]);

  // Scroll controls
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const liveGameCount = games.filter(g => g.isLive).length;

  return (
    <div className={`w-full bg-[#090D16] border border-white/10 rounded-3xl p-3.5 sm:p-4.5 shadow-2xl space-y-3 font-sans text-white overflow-hidden ${className}`}>
      
      {/* Top Bar: Title, League Switcher & Live Refresh Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-white/10 pb-3">
        
        {/* Left: Section Title & Live Count */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF6A00] to-[#FF8C00] flex items-center justify-center shadow-lg shadow-[#FF6A00]/30 shrink-0">
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black italic uppercase tracking-tight text-[#F4F4F4]">
                Live Sports Scoreboard
              </span>
              {liveGameCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] text-[10px] font-black uppercase font-mono tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
                  {liveGameCount} LIVE NOW
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Real-time scores • Auto-refresh 30s • ESPN Public Feed
            </p>
          </div>
        </div>

        {/* Right: League Filter Pills & Manual Refresh */}
        <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/10 shrink-0">
            {LEAGUES.map((l) => {
              const isSelected = selectedLeague === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedLeague(l.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-mono flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#FF6A00] text-white shadow-md shadow-[#FF6A00]/30 border border-[#FF8C00]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{l.icon}</span>
                  <span>{l.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => loadScores(false)}
            disabled={refreshing}
            title="Refresh Live Scores"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-[#00B8D4] transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#00B8D4]' : ''}`} />
          </button>
        </div>

      </div>

      {/* Carousel Container with Scroll Navigation */}
      <div className="relative group">
        
        {/* Left Arrow (Desktop) */}
        <button
          onClick={() => handleScroll('left')}
          className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-900/90 border border-white/20 items-center justify-center text-white shadow-xl hover:bg-[#FF6A00] transition-all cursor-pointer opacity-0 group-hover:opacity-100"
          aria-label="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Right Arrow (Desktop) */}
        <button
          onClick={() => handleScroll('right')}
          className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-900/90 border border-white/20 items-center justify-center text-white shadow-xl hover:bg-[#FF6A00] transition-all cursor-pointer opacity-0 group-hover:opacity-100"
          aria-label="Scroll Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Scrollable Game Cards Track */}
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-3 overflow-x-auto scrollbar-none py-1 px-0.5 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading && games.length === 0 ? (
            // Loading Skeletons
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="w-72 min-w-[280px] sm:min-w-[300px] h-36 rounded-2xl bg-[#263238]/60 border border-white/10 p-3.5 animate-pulse space-y-3 shrink-0"
              >
                <div className="flex justify-between items-center">
                  <div className="w-16 h-4 bg-white/10 rounded-md" />
                  <div className="w-12 h-4 bg-white/10 rounded-md" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="w-24 h-4 bg-white/10 rounded-md" />
                    <div className="w-8 h-4 bg-white/10 rounded-md" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="w-24 h-4 bg-white/10 rounded-md" />
                    <div className="w-8 h-4 bg-white/10 rounded-md" />
                  </div>
                </div>
              </div>
            ))
          ) : games.length === 0 ? (
            <div className="w-full py-8 text-center bg-[#263238]/40 border border-white/10 rounded-2xl">
              <Trophy className="w-8 h-8 text-slate-500 mx-auto mb-1.5" />
              <p className="text-xs text-slate-300 font-mono">No live games scheduled for {selectedLeague} right now.</p>
            </div>
          ) : (
            games.map((game) => {
              const isLive = game.isLive;
              const awayScoreNum = Number(game.awayTeam.score);
              const homeScoreNum = Number(game.homeTeam.score);
              const awayLeading = !isNaN(awayScoreNum) && !isNaN(homeScoreNum) && awayScoreNum > homeScoreNum;
              const homeLeading = !isNaN(awayScoreNum) && !isNaN(homeScoreNum) && homeScoreNum > awayScoreNum;

              return (
                <motion.div
                  key={game.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`w-72 min-w-[275px] sm:min-w-[295px] rounded-2xl p-3 sm:p-3.5 bg-[#12151C] border transition-all duration-200 shrink-0 snap-start relative flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ${
                    isLive 
                      ? 'border-[#00F0D0]/60 shadow-[0_0_20px_rgba(0,240,208,0.18)] hover:border-[#00F0D0]' 
                      : 'border-white/15 hover:border-white/30 hover:bg-[#181D26]'
                  }`}
                >
                  {/* Top Badge: League & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-black/70 border border-white/20 text-[10px] font-black uppercase tracking-wider text-slate-200 font-mono">
                        {game.league}
                      </span>
                      {game.broadcast && (
                        <span className="text-[10px] text-slate-300 font-mono flex items-center gap-1">
                          <Tv className="w-2.5 h-2.5 text-[#00F0D0]" />
                          {game.broadcast}
                        </span>
                      )}
                    </div>

                    {/* High-Clarity Status Pill with Crisp Border Accents */}
                    {(() => {
                      const st = (game.statusText || '').toUpperCase();
                      if (isLive || st.includes('LIVE')) {
                        return (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/25 border border-red-500/70 text-red-300 text-[10px] font-black uppercase font-mono tracking-wider animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.3)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            {game.statusText}
                          </span>
                        );
                      }
                      if (st.includes('RAIN DELAY') || st.includes('DELAY')) {
                        return (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/80 text-amber-200 text-[10px] font-black uppercase font-mono tracking-wider shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            {game.statusText}
                          </span>
                        );
                      }
                      if (game.isCompleted || st.includes('FINAL')) {
                        return (
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-600/80">
                            {game.statusText}
                          </span>
                        );
                      }
                      if (st.includes('HALF') || st.includes('HALFTIME')) {
                        return (
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-purple-500/25 text-purple-200 border border-purple-400/60">
                            {game.statusText}
                          </span>
                        );
                      }
                      return (
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-[#00F0D0]/15 text-[#00F0D0] border border-[#00F0D0]/40">
                          {game.statusText}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Teams and Scores Matrix */}
                  <div className="space-y-1.5 my-1">
                    
                    {/* Away Team */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {game.awayTeam.logo ? (
                          <img
                            src={game.awayTeam.logo}
                            alt={game.awayTeam.name}
                            className="w-5 h-5 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // Fallback on logo error
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white">
                            {game.awayTeam.abbreviation.slice(0, 2)}
                          </div>
                        )}
                        <span className={`text-xs truncate text-white font-semibold ${
                          awayLeading ? 'font-bold' : ''
                        }`}>
                          {game.awayTeam.displayName}
                        </span>
                        {game.awayTeam.record && (
                          <span className="text-[10px] text-slate-300 font-mono hidden sm:inline">
                            ({game.awayTeam.record})
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-mono font-black shrink-0 ${
                        isLive 
                          ? awayLeading ? 'text-[#00F0D0]' : 'text-white'
                          : awayLeading ? 'text-white font-black' : 'text-zinc-300'
                      }`}>
                        {game.awayTeam.score}
                      </span>
                    </div>

                    {/* Home Team */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {game.homeTeam.logo ? (
                          <img
                            src={game.homeTeam.logo}
                            alt={game.homeTeam.name}
                            className="w-5 h-5 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white">
                            {game.homeTeam.abbreviation.slice(0, 2)}
                          </div>
                        )}
                        <span className={`text-xs truncate text-white font-semibold ${
                          homeLeading ? 'font-bold' : ''
                        }`}>
                          {game.homeTeam.displayName}
                        </span>
                        {game.homeTeam.record && (
                          <span className="text-[10px] text-slate-300 font-mono hidden sm:inline">
                            ({game.homeTeam.record})
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-mono font-black shrink-0 ${
                        isLive 
                          ? homeLeading ? 'text-[#00F0D0]' : 'text-white'
                          : homeLeading ? 'text-white font-black' : 'text-zinc-300'
                      }`}>
                        {game.homeTeam.score}
                      </span>
                    </div>

                  </div>

                  {/* Headline / Leader / Venue Footer */}
                  {game.headline ? (
                    <div className="mt-2 pt-1.5 border-t border-white/10 text-[10px] text-slate-300 font-mono truncate flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-[#00F0D0] shrink-0" />
                      <span className="truncate">{game.headline}</span>
                    </div>
                  ) : game.venue ? (
                    <div className="mt-2 pt-1.5 border-t border-white/10 text-[10px] text-slate-300 font-mono truncate flex items-center gap-1">
                      <span className="text-xs">📍</span>
                      <span className="truncate text-zinc-300">{game.venue}</span>
                    </div>
                  ) : null}

                </motion.div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};

export default LiveScoresTicker;
