import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Maximize, 
  Minimize, 
  Radio, 
  Trophy, 
  Zap, 
  Flame, 
  Clock, 
  Shield, 
  Volume2, 
  AlertTriangle, 
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface CourtMatch {
  courtNumber: number;
  courtName: string;
  sport: string;
  division: string;
  period: string;
  timeRemaining: string;
  homeTeam: { name: string; score: number; color: string; fouls: number; timeouts: number; seed: number };
  awayTeam: { name: string; score: number; color: string; fouls: number; timeouts: number; seed: number };
  possession: 'home' | 'away';
  bonus: boolean;
  status: 'LIVE' | 'WARMUP' | 'FINAL';
  nextMatchUp?: string;
}

const INITIAL_COURTS: CourtMatch[] = [
  {
    courtNumber: 1,
    courtName: 'Main Championship Court',
    sport: "Girls' Flag Football",
    division: '17U National Championship',
    period: '2nd Half',
    timeRemaining: '02:45',
    homeTeam: { name: 'Miami Central Express', score: 28, color: '#00F2FE', fouls: 2, timeouts: 2, seed: 1 },
    awayTeam: { name: 'Orlando Speed Knights', score: 24, color: '#F59E0B', fouls: 3, timeouts: 1, seed: 3 },
    possession: 'home',
    bonus: true,
    status: 'LIVE',
    nextMatchUp: '04:00 PM: Atlanta Hawks Prep vs Charlotte Flight'
  },
  {
    courtNumber: 2,
    courtName: 'Auxiliary Arena Court 2',
    sport: 'Basketball',
    division: '16U Varsity Showcase',
    period: 'Q4',
    timeRemaining: '00:38',
    homeTeam: { name: 'Atlanta Hawks Prep', score: 79, color: '#EF4444', fouls: 5, timeouts: 1, seed: 2 },
    awayTeam: { name: 'Charlotte Flight', score: 78, color: '#38BDF8', fouls: 4, timeouts: 2, seed: 4 },
    possession: 'away',
    bonus: true,
    status: 'LIVE',
    nextMatchUp: '04:15 PM: Tampa Bay Wave vs Jacksonville Storm'
  },
  {
    courtNumber: 3,
    courtName: 'Fieldhouse Court 3',
    sport: 'Tackle Football',
    division: '14U Regional Semis',
    period: 'WARMUP',
    timeRemaining: '10:00',
    homeTeam: { name: 'St. Thomas Aquinas', score: 0, color: '#10B981', fouls: 0, timeouts: 3, seed: 1 },
    awayTeam: { name: 'Lakeland Dreadnaughts', score: 0, color: '#A855F7', fouls: 0, timeouts: 3, seed: 2 },
    possession: 'home',
    bonus: false,
    status: 'WARMUP',
    nextMatchUp: 'Tip-off in 10 minutes'
  },
  {
    courtNumber: 4,
    courtName: 'Fieldhouse Court 4',
    sport: 'Volleyball',
    division: '18U Open Gold',
    period: 'FINAL',
    timeRemaining: '00:00',
    homeTeam: { name: 'Tampa Bay Wave', score: 3, color: '#06B6D4', fouls: 0, timeouts: 0, seed: 1 },
    awayTeam: { name: 'Jacksonville Storm', score: 1, color: '#E11D48', fouls: 0, timeouts: 0, seed: 5 },
    possession: 'home',
    bonus: false,
    status: 'FINAL',
    nextMatchUp: 'Next: 04:30 PM Finals Matchup'
  }
];

export const ArenaVideoBoardView: React.FC = () => {
  const navigate = useNavigate();
  const [courts, setCourts] = useState<CourtMatch[]>(INITIAL_COURTS);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeDispatchBanner, setActiveDispatchBanner] = useState<string>(
    '🚨 ALL COACHES: Championship trophy ceremony immediately following Court 1 final at the main awards stage.'
  );

  // Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subtle Live Clock & Score Tick Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCourts((prev) =>
        prev.map((court) => {
          if (court.status === 'LIVE') {
            // Chance of points scoring
            if (Math.random() > 0.65) {
              const scoringTeam = Math.random() > 0.5 ? 'homeTeam' : 'awayTeam';
              const pts = court.sport.includes('Basketball') ? (Math.random() > 0.7 ? 3 : 2) : 6;
              return {
                ...court,
                [scoringTeam]: {
                  ...court[scoringTeam],
                  score: court[scoringTeam].score + pts
                }
              };
            }
          }
          return court;
        })
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#07090C] text-white flex flex-col justify-between select-none font-mono">
      {/* Top Arena Jumbotron Banner */}
      <div className="bg-[#12171E] border-b-2 border-[#00F2FE] px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-[#1E2630] hover:bg-[#2D3748] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            title="Exit Video Board"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#EF4444] animate-ping shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-widest uppercase flex items-center gap-2">
                <span>JUST1PLAY ARENA JUMBOTRON</span>
                <span className="text-xs bg-[#00F2FE] text-black px-2 py-0.5 rounded font-black">
                  LIVE 4K HUD
                </span>
              </h1>
              <p className="text-xs text-[#94A3B8] hidden sm:block">
                Official Multi-Court Stadium Monitor & Broadcast Scorekeeper Hub
              </p>
            </div>
          </div>
        </div>

        {/* Live Clock & Fullscreen Control */}
        <div className="flex items-center gap-4">
          <div className="bg-[#0A0D12] border border-[#2D3748] px-4 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-[#94A3B8] block">STADIUM TIME</span>
            <span className="text-lg sm:text-xl font-black text-[#00F2FE] tracking-wider">
              {currentTime}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E2630] hover:bg-[#2D3748] border border-[#2D3748] text-white text-xs font-bold transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit TV Mode' : 'Fullscreen TV Mode'}</span>
          </button>
        </div>
      </div>

      {/* Main 4-Court Jumbotron Grid */}
      <div className="flex-1 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-[1600px] w-full mx-auto">
        {courts.map((court) => {
          const isLive = court.status === 'LIVE';
          return (
            <div
              key={court.courtNumber}
              className={`bg-[#0F141A] border-2 rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all ${
                isLive
                  ? 'border-[#00F2FE]/50 shadow-[0_0_30px_rgba(0,242,254,0.15)]'
                  : 'border-[#2D3748]'
              }`}
            >
              {/* Court Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-[#2D3748]">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#00F2FE] text-black font-black flex items-center justify-center text-sm shadow-[0_0_10px_rgba(0,242,254,0.5)]">
                    C{court.courtNumber}
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                      {court.courtName}
                    </h2>
                    <span className="text-xs text-[#94A3B8] block">
                      {court.sport} • {court.division}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  {isLive ? (
                    <div className="flex items-center gap-1.5 bg-[#EF4444]/20 border border-[#EF4444]/50 px-3 py-1 rounded-full text-xs font-black text-[#EF4444] animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                      <Radio className="w-3.5 h-3.5" />
                      <span>LIVE • {court.period}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-[#94A3B8] bg-[#1E2630] px-3 py-1 rounded-full border border-[#2D3748]">
                      {court.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Massive Scoreboard Display */}
              <div className="grid grid-cols-12 gap-2 my-6 items-center">
                {/* Home Team */}
                <div className="col-span-5 flex flex-col items-center text-center p-3 rounded-2xl bg-[#161C22]/80 border border-[#2D3748]">
                  <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-1">
                    <span className="font-bold">#{court.homeTeam.seed} SEED</span>
                    {court.possession === 'home' && isLive && (
                      <span className="w-2 h-2 rounded-full bg-[#00F2FE] animate-ping" title="Possession" />
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white max-w-[140px] truncate">
                    {court.homeTeam.name}
                  </h3>
                  <span className="text-5xl sm:text-7xl font-black text-white mt-2 tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    {court.homeTeam.score}
                  </span>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-[#94A3B8]">
                    <span>FOULS: {court.homeTeam.fouls}</span>
                    <span>•</span>
                    <span>T.O: {court.homeTeam.timeouts}</span>
                  </div>
                </div>

                {/* Clock / Center Pillar */}
                <div className="col-span-2 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-[#94A3B8] font-bold">PERIOD CLOCK</span>
                  <div className="text-2xl sm:text-3xl font-black text-[#00F2FE] bg-[#0A0D12] px-2.5 py-1.5 rounded-xl border border-[#00F2FE]/40 my-1 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
                    {court.timeRemaining}
                  </div>
                  <span className="text-[10px] text-[#F59E0B] font-bold">
                    {court.bonus ? 'BONUS' : ''}
                  </span>
                </div>

                {/* Away Team */}
                <div className="col-span-5 flex flex-col items-center text-center p-3 rounded-2xl bg-[#161C22]/80 border border-[#2D3748]">
                  <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-1">
                    <span className="font-bold">#{court.awayTeam.seed} SEED</span>
                    {court.possession === 'away' && isLive && (
                      <span className="w-2 h-2 rounded-full bg-[#00F2FE] animate-ping" title="Possession" />
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white max-w-[140px] truncate">
                    {court.awayTeam.name}
                  </h3>
                  <span className="text-5xl sm:text-7xl font-black text-white mt-2 tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    {court.awayTeam.score}
                  </span>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-[#94A3B8]">
                    <span>FOULS: {court.awayTeam.fouls}</span>
                    <span>•</span>
                    <span>T.O: {court.awayTeam.timeouts}</span>
                  </div>
                </div>
              </div>

              {/* Bottom On-Deck Matchup Strip */}
              <div className="bg-[#161C22] border border-[#2D3748] px-4 py-2.5 rounded-xl flex items-center justify-between text-xs">
                <span className="text-[#94A3B8] font-bold">ON DECK:</span>
                <span className="text-white font-bold truncate max-w-[300px]">
                  {court.nextMatchUp}
                </span>
                <ChevronRight className="w-4 h-4 text-[#00F2FE]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Emergency Ticker & Sponsor Bar */}
      <div className="bg-[#12171E] border-t-2 border-[#2D3748] px-6 py-2.5 flex items-center justify-between text-xs shadow-2xl">
        <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
          <span className="px-2 py-0.5 rounded bg-[#EF4444] text-white font-black shrink-0 text-[10px] tracking-wider">
            DIRECTOR DESK
          </span>
          <span className="text-white font-bold truncate">
            {activeDispatchBanner}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 text-[#94A3B8] shrink-0 text-xs">
          <span>SPONSORS: <strong>Gatorade</strong> • <strong>Wilson</strong> • <strong>Nike Elite</strong></span>
          <span className="text-[#00F2FE] font-bold">JUST1PLAY.COM</span>
        </div>
      </div>
    </div>
  );
};
