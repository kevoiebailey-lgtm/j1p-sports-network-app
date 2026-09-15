import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Radio, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RotateCcw, 
  Clock, 
  Sun, 
  Moon, 
  Shield, 
  Zap, 
  Check, 
  Sliders, 
  Maximize2, 
  Minimize2,
  Watch,
  X
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useSearchParams, useParams } from 'react-router-dom';

export interface PositionAssignments {
  QB?: string;
  C?: string;
  WR1?: string;
  WR2?: string;
  SLOT?: string;
  [key: string]: string | undefined;
}

export interface LivePlayPayload {
  audibleColor?: string;
  cadence?: string;
  playName?: string;
  assignments?: PositionAssignments;
  positions?: Record<string, string>;
  timestamp?: number;
  playState?: 'LIVE' | 'DEAD' | 'IDLE';
  message?: string;
  dispatchedBy?: string;
  updatedAt?: number;
}

export interface WristHUDClientProps {
  initialTeamId?: string;
  initialPosition?: 'QB' | 'C' | 'WR1' | 'WR2' | 'SLOT' | string;
  className?: string;
}

const POSITIONS = ['QB', 'C', 'WR1', 'WR2', 'SLOT'] as const;
type PositionType = typeof POSITIONS[number];

export default function WristHUDClient({
  initialTeamId,
  initialPosition,
  className = ''
}: WristHUDClientProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams<{ teamId?: string }>();

  // Determine target teamId: prop > routeParam > searchParam > default
  const teamIdFromUrl = searchParams.get('team') || routeParams.teamId;
  const [teamId, setTeamId] = useState<string>(
    initialTeamId || teamIdFromUrl || 'varsity_7v7_team'
  );

  // Position Selection (Saved to localStorage for seamless wrist reloads)
  const posFromUrl = (searchParams.get('pos') || initialPosition || '').toUpperCase();
  const [selectedPosition, setSelectedPosition] = useState<string>(() => {
    if (posFromUrl && POSITIONS.includes(posFromUrl as any)) return posFromUrl;
    try {
      const saved = localStorage.getItem('j1p_wrist_position');
      if (saved && POSITIONS.includes(saved as any)) return saved;
    } catch (_) {}
    return 'QB';
  });

  // UI Modes
  const [isHighContrastSunMode, setIsHighContrastSunMode] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [newTeamInput, setNewTeamInput] = useState(teamId);

  // Firestore Real-Time Session State
  const [session, setSession] = useState<LivePlayPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  // References for Wake Lock and Vibration Tracking
  const prevTimestampRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Update local storage when position changes
  const handleSelectPosition = (pos: string) => {
    setSelectedPosition(pos);
    try {
      localStorage.setItem('j1p_wrist_position', pos);
    } catch (_) {}

    // Subtle tactile haptic tick
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(12); } catch (_) {}
    }
  };

  // 1. SCREEN WAKE LOCK: Keep display lit during series
  useEffect(() => {
    let isMounted = true;

    async function requestWakeLock() {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('[WristHUD] Screen Wake Lock acquired successfully');
        } catch (err) {
          console.warn('[WristHUD] Screen Wake Lock request failed:', err);
        }
      }
    }

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // 2. REAL-TIME FIRESTORE SUBSCRIPTION: /teams/{teamId}/live_sessions/active
  useEffect(() => {
    if (!teamId) {
      setIsConnected(false);
      return;
    }

    setConnectionError(null);
    const sessionDocRef = doc(db, 'teams', teamId, 'live_sessions', 'active');

    const unsubscribe = onSnapshot(
      sessionDocRef,
      (docSnap) => {
        setIsConnected(true);
        if (docSnap.exists()) {
          const data = docSnap.data() as LivePlayPayload;
          setSession(data);

          // 3. HAPTIC FEEDBACK ON TIMESTAMP CHANGE
          if (data.timestamp && data.timestamp !== prevTimestampRef.current) {
            prevTimestampRef.current = data.timestamp;

            if ('vibrate' in navigator) {
              try {
                if (data.playState === 'DEAD' || data.message === 'CHECK SIDELINE') {
                  // Strong hazard pulse pattern for DEAD play
                  navigator.vibrate([300, 100, 300, 100, 500]);
                } else {
                  // Standard tactical haptic pulse for new play call
                  navigator.vibrate([150, 80, 150]);
                }
              } catch (vErr) {
                console.warn('[WristHUD] Vibration API error:', vErr);
              }
            }
          }
        } else {
          setSession(null);
        }
      },
      (err) => {
        console.warn('[WristHUD] Firestore sync error:', err);
        setIsConnected(false);
        setConnectionError(err.message || 'Connection lost');
      }
    );

    return () => unsubscribe();
  }, [teamId]);

  // Elapsed Seconds Counter
  useEffect(() => {
    if (!session?.timestamp) {
      setSecondsAgo(null);
      return;
    }

    const updateTimer = () => {
      const diffSec = Math.floor((Date.now() - session.timestamp!) / 1000);
      setSecondsAgo(diffSec >= 0 ? diffSec : 0);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [session?.timestamp]);

  // Dynamic Background Tint calculation based on audibleColor
  const audibleStyle = useMemo(() => {
    const rawColor = (session?.audibleColor || '').toUpperCase();

    if (rawColor.includes('BLUE') || rawColor.includes('NAVY')) {
      return {
        bgGradient: 'bg-gradient-to-b from-blue-950/80 via-slate-950 to-blue-950/90',
        badgeBg: 'bg-blue-600',
        badgeText: 'text-blue-100',
        border: 'border-blue-500/50',
        glow: 'shadow-[0_0_50px_rgba(37,99,235,0.25)]',
        accentText: 'text-blue-400'
      };
    }
    if (rawColor.includes('RED') || rawColor.includes('CRIMSON')) {
      return {
        bgGradient: 'bg-gradient-to-b from-red-950/80 via-slate-950 to-red-950/90',
        badgeBg: 'bg-red-600',
        badgeText: 'text-red-100',
        border: 'border-red-500/50',
        glow: 'shadow-[0_0_50px_rgba(239,68,68,0.25)]',
        accentText: 'text-red-400'
      };
    }
    if (rawColor.includes('GREEN') || rawColor.includes('EMERALD')) {
      return {
        bgGradient: 'bg-gradient-to-b from-emerald-950/80 via-slate-950 to-emerald-950/90',
        badgeBg: 'bg-emerald-600',
        badgeText: 'text-emerald-100',
        border: 'border-emerald-500/50',
        glow: 'shadow-[0_0_50px_rgba(16,185,129,0.25)]',
        accentText: 'text-emerald-400'
      };
    }
    if (rawColor.includes('BLACK') || rawColor.includes('VIPER') || rawColor.includes('STEALTH')) {
      return {
        bgGradient: 'bg-gradient-to-b from-zinc-900/90 via-black to-zinc-900/90',
        badgeBg: 'bg-zinc-800',
        badgeText: 'text-zinc-100',
        border: 'border-zinc-700/60',
        glow: 'shadow-[0_0_40px_rgba(255,255,255,0.05)]',
        accentText: 'text-zinc-400'
      };
    }
    if (rawColor.includes('GOLD') || rawColor.includes('AMBER') || rawColor.includes('YELLOW')) {
      return {
        bgGradient: 'bg-gradient-to-b from-amber-950/80 via-slate-950 to-amber-950/90',
        badgeBg: 'bg-amber-600',
        badgeText: 'text-amber-100',
        border: 'border-amber-500/50',
        glow: 'shadow-[0_0_50px_rgba(245,158,11,0.25)]',
        accentText: 'text-amber-400'
      };
    }
    if (rawColor.includes('PURPLE') || rawColor.includes('VIOLET')) {
      return {
        bgGradient: 'bg-gradient-to-b from-purple-950/80 via-slate-950 to-purple-950/90',
        badgeBg: 'bg-purple-600',
        badgeText: 'text-purple-100',
        border: 'border-purple-500/50',
        glow: 'shadow-[0_0_50px_rgba(168,85,247,0.25)]',
        accentText: 'text-purple-400'
      };
    }

    // Default Fallback
    return {
      bgGradient: 'bg-gradient-to-b from-slate-900/80 via-black to-slate-900/90',
      badgeBg: 'bg-zinc-800',
      badgeText: 'text-white',
      border: 'border-zinc-800',
      glow: '',
      accentText: 'text-cyan-400'
    };
  }, [session?.audibleColor]);

  // Selected Position's Specific Assignment
  const activeAssignmentText = useMemo(() => {
    if (session?.positions && session.positions[selectedPosition]) {
      return session.positions[selectedPosition];
    }
    if (!session?.assignments) return null;
    return session.assignments[selectedPosition] || null;
  }, [session?.positions, session?.assignments, selectedPosition]);

  // 4. COMPLETE KILL PLAY TEXT ALERT (Objective 3)
  // When play is killed, entire screen flashes high-contrast yellow/black with text: "PLAY DEAD — LOOK TO SIDELINE"
  const isPlayDead = session?.playState === 'DEAD' || session?.message === 'CHECK SIDELINE';

  if (isPlayDead) {
    return (
      <div 
        id="wrist-hud-kill-screen"
        className="fixed inset-0 z-50 bg-[#FFD700] text-black border-[12px] sm:border-[20px] border-black flex flex-col justify-between p-4 sm:p-8 select-none animate-pulse"
      >
        {/* TOP ALERT HEADER */}
        <div className="flex items-center justify-between border-b-4 border-black pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 sm:w-12 sm:h-12 text-black stroke-[3]" />
            <span className="font-mono font-black text-lg sm:text-2xl uppercase tracking-widest">
              CALL KILLED BY COACH
            </span>
          </div>
          <span className="font-mono font-black text-sm sm:text-xl bg-black text-[#FFD700] px-3 py-1 rounded-md">
            POS: {selectedPosition}
          </span>
        </div>

        {/* CENTER MASSIVE KILL TEXT */}
        <div className="flex-1 flex flex-col items-center justify-center text-center my-auto">
          <h1 
            id="text-play-dead-alert"
            className="text-4xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight leading-tight text-black drop-shadow-sm"
          >
            PLAY DEAD — LOOK TO SIDELINE
          </h1>
          <p className="mt-4 sm:mt-6 font-mono font-black text-base sm:text-2xl bg-black text-[#FFD700] px-6 py-2 rounded-xl uppercase tracking-wider">
            RESET TO HUDDLE • CHECK SIDELINE FOR AUDIBLE
          </p>
        </div>

        {/* BOTTOM TEAM & TIMING BAR */}
        <div className="flex items-center justify-between border-t-4 border-black pt-3 font-mono font-black text-xs sm:text-base">
          <span>TEAM: {teamId}</span>
          <span>STANDBY FOR NEW DISPATCH</span>
        </div>
      </div>
    );
  }

  // 5. REGULAR LIVE WRIST HUD SCREEN
  return (
    <div 
      id="wrist-hud-client"
      className={`min-h-screen w-full flex flex-col justify-between select-none relative overflow-hidden transition-colors ${
        isHighContrastSunMode 
          ? 'bg-white text-black' 
          : 'bg-black text-white'
      } ${className}`}
      style={{
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {/* ========================================================================= */}
      {/* TOP BAR: POSITION PILL SWITCHER [ QB | C | WR1 | WR2 | SLOT ]             */}
      {/* ========================================================================= */}
      <header className="px-3 sm:px-6 pt-1 pb-2 z-20 shrink-0">
        
        {/* Status Line: Connection Indicator & Settings Toggle */}
        <div className="flex items-center justify-between mb-2 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              isConnected 
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' 
                : 'bg-red-500'
            }`} />
            <span className={isHighContrastSunMode ? 'text-zinc-600 font-bold' : 'text-zinc-400 font-bold'}>
              {isConnected ? 'LIVE WRIST SYNC' : connectionError ? 'RECONNECTING...' : 'STANDBY'}
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-500 uppercase truncate max-w-[120px]">{teamId}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sun Mode Toggle (For direct midday sun glare) */}
            <button
              type="button"
              onClick={() => setIsHighContrastSunMode(!isHighContrastSunMode)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isHighContrastSunMode 
                  ? 'bg-black text-white border-black' 
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
              }`}
              title={isHighContrastSunMode ? 'Switch to Dark Mode' : 'High Contrast Sun Mode'}
            >
              {isHighContrastSunMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            {/* Quick Settings Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isHighContrastSunMode 
                  ? 'bg-zinc-200 text-black border-zinc-400' 
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
              }`}
              title="HUD Settings / Switch Team"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 5-Position Pill Switcher */}
        <div 
          id="wrist-position-switcher"
          className={`grid grid-cols-5 gap-1.5 p-1 rounded-2xl border ${
            isHighContrastSunMode 
              ? 'bg-zinc-100 border-zinc-300' 
              : 'bg-zinc-950/90 border-zinc-800'
          }`}
        >
          {POSITIONS.map((pos) => {
            const isSelected = selectedPosition === pos;

            return (
              <button
                key={pos}
                id={`btn-wrist-pos-${pos}`}
                type="button"
                onClick={() => handleSelectPosition(pos)}
                className={`py-2.5 sm:py-3 rounded-xl font-mono font-black text-xs sm:text-base tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center select-none active:scale-95 ${
                  isSelected
                    ? isHighContrastSunMode
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] ring-2 ring-white'
                    : isHighContrastSunMode
                      ? 'text-zinc-600 hover:text-black hover:bg-zinc-200'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {pos}
              </button>
            );
          })}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* QUICK SETTINGS OVERLAY (If toggled)                                       */}
      {/* ========================================================================= */}
      {showSettingsDrawer && (
        <div className="absolute inset-x-3 top-20 z-30 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-zinc-300">Switch Team Channel</span>
            <button 
              type="button" 
              onClick={() => setShowSettingsDrawer(false)}
              className="p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTeamInput}
              onChange={(e) => setNewTeamInput(e.target.value.trim().toLowerCase())}
              placeholder="team_id"
              className="bg-zinc-900 border border-zinc-700 text-white font-mono text-xs px-3 py-2 rounded-xl flex-1 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={() => {
                if (newTeamInput) {
                  setTeamId(newTeamInput);
                  setSearchParams({ team: newTeamInput, pos: selectedPosition });
                  setShowSettingsDrawer(false);
                }
              }}
              className="bg-cyan-500 text-black font-mono font-bold text-xs px-4 py-2 rounded-xl"
            >
              Connect
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CENTER STAGE: AUDIBLE BADGE & SINGLE POSITION ASSIGNMENT                  */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col justify-center px-3 sm:px-6 my-auto z-10">
        
        {session && session.playState === 'LIVE' ? (
          /* ACTIVE PLAY CARD */
          <div 
            id="wrist-active-play-card"
            className={`w-full rounded-3xl p-5 sm:p-8 flex flex-col justify-between items-center text-center border transition-all duration-300 relative overflow-hidden ${
              isHighContrastSunMode 
                ? 'bg-zinc-100 border-black shadow-lg text-black' 
                : `${audibleStyle.bgGradient} ${audibleStyle.border} ${audibleStyle.glow}`
            }`}
          >
            {/* Top Audible Call & Cadence Badge (Objective 2) */}
            <div className="w-full flex flex-col items-center mb-6">
              
              {/* Bold Block Top Badge: "BLUE 42 • ON ONE" */}
              <div 
                id="badge-audible-cadence"
                className={`inline-flex items-center justify-center px-4 sm:px-8 py-2 rounded-2xl font-mono font-black text-xl sm:text-3xl md:text-4xl tracking-widest uppercase shadow-md ${
                  isHighContrastSunMode
                    ? 'bg-black text-white'
                    : `${audibleStyle.badgeBg} ${audibleStyle.badgeText}`
                }`}
              >
                <span>{session.audibleColor || 'CALL INCOMING'}</span>
                <span className="mx-2 opacity-70">•</span>
                <span>{session.cadence || 'ON ONE'}</span>
              </div>

              {/* Play Concept Subtitle */}
              {session.playName && (
                <div className={`mt-2 font-mono font-bold text-xs sm:text-base tracking-wider uppercase ${
                  isHighContrastSunMode ? 'text-zinc-600' : 'text-zinc-400'
                }`}>
                  {session.playName}
                </div>
              )}
            </div>

            {/* Center Assignment: ONLY selected position's text instruction in massive high-contrast font */}
            <div className="my-auto py-4 sm:py-8 w-full flex flex-col items-center justify-center">
              
              {/* Position Header Tag */}
              <div className={`mb-3 inline-block px-3.5 py-1 rounded-lg font-mono font-semibold tracking-wider text-[11px] sm:text-xs uppercase ${
                isHighContrastSunMode 
                  ? 'bg-zinc-300 text-black font-black' 
                  : 'bg-[#08090C] text-[#00F0D0] border border-[#00F0D0]/40 shadow-[0_0_12px_rgba(0,240,208,0.2)]'
              }`}>
                {selectedPosition} ASSIGNMENT
              </div>

              {/* MASSIVE ASSIGNMENT TEXT WITH GLARE PROTECTION CONTAINER */}
              <div className={`w-full max-w-2xl mx-auto py-4 px-4 sm:px-6 rounded-2xl ${
                isHighContrastSunMode 
                  ? 'bg-white/80 border border-black/10' 
                  : 'bg-[#000000]/90 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
              }`}>
                <h2 
                  id="text-wrist-position-assignment"
                  className={`text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-tight max-w-2xl mx-auto break-words select-none ${
                    isHighContrastSunMode 
                      ? 'text-black' 
                      : 'text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]'
                  }`}
                >
                  {activeAssignmentText || (
                    <span className="italic opacity-50 text-2xl sm:text-4xl font-mono text-[#00F0D0]">
                      CHECK WITH QB / NO ROUTE PLOTTED
                    </span>
                  )}
                </h2>
              </div>
            </div>

            {/* Footer Metainfo on Active Card */}
            <div className={`w-full flex items-center justify-between pt-4 border-t text-[11px] sm:text-xs font-mono ${
              isHighContrastSunMode ? 'border-zinc-300 text-zinc-600' : 'border-white/10 text-zinc-400'
            }`}>
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                ACTIVE ON FIELD
              </span>
              <span>
                {secondsAgo !== null ? `${secondsAgo}s ago` : 'JUST NOW'}
              </span>
            </div>

          </div>
        ) : (
          /* STANDBY CARD (Waiting for play call) */
          <div 
            id="wrist-standby-card"
            className={`w-full rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center border ${
              isHighContrastSunMode 
                ? 'bg-zinc-100 border-zinc-300 text-black' 
                : 'bg-zinc-950/70 border-zinc-800 text-zinc-300'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400">
              <Watch className="w-8 h-8 animate-pulse" />
            </div>
            
            <div className="inline-block px-3 py-1 rounded-md bg-zinc-800 text-zinc-300 font-mono text-xs font-bold mb-2">
              TARGET POSITION: <strong className="text-white">{selectedPosition}</strong>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight mb-2">
              HUD READY — STANDBY FOR CALL
            </h2>

            <p className="text-xs sm:text-sm text-zinc-400 font-mono max-w-sm">
              Listening to sideline dispatcher on <span className="text-cyan-400">{teamId}</span>. Display stays lit.
            </p>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* BOTTOM TICKER / WRIST LOCK BAR                                            */}
      {/* ========================================================================= */}
      <footer className="px-3 sm:px-6 py-2 z-20 shrink-0 text-center text-[10px] sm:text-xs font-mono text-zinc-500 flex items-center justify-between border-t border-zinc-900">
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          SCREEN WAKE LOCKED
        </span>
        <span className="font-bold">JUST1PLAY WRIST HUD</span>
        <span>POS: {selectedPosition}</span>
      </footer>
    </div>
  );
}

export { WristHUDClient };
