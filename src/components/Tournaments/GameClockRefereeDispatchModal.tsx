import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Radio, 
  Volume2, 
  VolumeX, 
  AlertOctagon, 
  Clock, 
  Zap, 
  Send, 
  Flag, 
  ShieldAlert, 
  Activity, 
  ChevronUp, 
  ChevronDown,
  X,
  CheckCircle2
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface GameClockState {
  period: number;
  periodName: string;
  totalPeriods: number;
  secondsRemaining: number;
  isRunning: boolean;
  shotClockSeconds: number;
  isShotClockRunning: boolean;
  scoreA: number;
  scoreB: number;
  teamAName: string;
  teamBName: string;
  timeoutsA: number;
  timeoutsB: number;
  possession: 'A' | 'B' | 'NONE';
  fieldLocation: string;
  lastEventMsg: string;
  updatedAt?: any;
}

interface GameClockRefereeDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId?: string;
  defaultTeamA?: string;
  defaultTeamB?: string;
  defaultField?: string;
}

export const GameClockRefereeDispatchModal: React.FC<GameClockRefereeDispatchModalProps> = ({
  isOpen,
  onClose,
  gameId = 'game_field_1_varsity',
  defaultTeamA = 'SoCal Elite Vipers',
  defaultTeamB = 'Texas Outlaws Club',
  defaultField = 'Championship Stadium Field 1'
}) => {
  const [gameState, setGameState] = useState<GameClockState>({
    period: 2,
    periodName: '2nd Half',
    totalPeriods: 2,
    secondsRemaining: 480, // 8:00
    isRunning: false,
    shotClockSeconds: 25,
    isShotClockRunning: false,
    scoreA: 21,
    scoreB: 14,
    teamAName: defaultTeamA,
    teamBName: defaultTeamB,
    timeoutsA: 2,
    timeoutsB: 3,
    possession: 'A',
    fieldLocation: defaultField,
    lastEventMsg: 'Referee Whistle: Ready for Play'
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [penaltyMsg, setPenaltyMsg] = useState('');
  const timerRef = useRef<any>(null);

  // Sound synthesis for buzzer / whistle
  const playSound = (type: 'horn' | 'whistle' | 'beep') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'horn') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(233, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.9);
      } else if (type === 'whistle') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.frequency.setValueAtTime(2400, now);
        osc2.frequency.setValueAtTime(2480, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch (e) {}
  };

  // Live Firebase syncing
  useEffect(() => {
    if (!isOpen) return;

    const gameDoc = doc(db, 'liveGameClocks', gameId);
    const unsubscribe = onSnapshot(gameDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as GameClockState;
        setGameState(prev => ({
          ...prev,
          ...data
        }));
        setIsSynced(true);
      }
    }, (err) => {
      console.warn('Firestore live game clock local fallback:', err);
    });

    return () => unsubscribe();
  }, [isOpen, gameId]);

  // Push state updates to Firestore
  const syncToCloud = async (updatedState: GameClockState) => {
    setGameState(updatedState);
    try {
      await setDoc(doc(db, 'liveGameClocks', gameId), {
        ...updatedState,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Sync to cloud error:', err);
    }
  };

  // Main game clock interval
  useEffect(() => {
    if (gameState.isRunning) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.secondsRemaining <= 1) {
            playSound('horn');
            const finishedState = {
              ...prev,
              secondsRemaining: 0,
              isRunning: false,
              lastEventMsg: 'PERIOD END - HORN SOUNDED'
            };
            syncToCloud(finishedState);
            return finishedState;
          }
          return {
            ...prev,
            secondsRemaining: prev.secondsRemaining - 1
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.isRunning]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleClock = () => {
    const nextRunning = !gameState.isRunning;
    if (nextRunning) playSound('whistle');
    syncToCloud({
      ...gameState,
      isRunning: nextRunning,
      lastEventMsg: nextRunning ? 'Game Clock Running' : 'Game Clock Paused by Referee'
    });
  };

  const handleResetClock = (seconds: number) => {
    syncToCloud({
      ...gameState,
      secondsRemaining: seconds,
      isRunning: false,
      lastEventMsg: `Clock reset to ${formatTime(seconds)}`
    });
  };

  const handleAdjustScore = (team: 'A' | 'B', delta: number) => {
    if (team === 'A') {
      const nextScore = Math.max(0, gameState.scoreA + delta);
      syncToCloud({
        ...gameState,
        scoreA: nextScore,
        lastEventMsg: `${gameState.teamAName} score adjusted to ${nextScore}`
      });
    } else {
      const nextScore = Math.max(0, gameState.scoreB + delta);
      syncToCloud({
        ...gameState,
        scoreB: nextScore,
        lastEventMsg: `${gameState.teamBName} score adjusted to ${nextScore}`
      });
    }
  };

  const handleTimeout = (team: 'A' | 'B') => {
    playSound('horn');
    if (team === 'A' && gameState.timeoutsA > 0) {
      syncToCloud({
        ...gameState,
        isRunning: false,
        timeoutsA: gameState.timeoutsA - 1,
        lastEventMsg: `TIMEOUT: ${gameState.teamAName} (${gameState.timeoutsA - 1} left)`
      });
    } else if (team === 'B' && gameState.timeoutsB > 0) {
      syncToCloud({
        ...gameState,
        isRunning: false,
        timeoutsB: gameState.timeoutsB - 1,
        lastEventMsg: `TIMEOUT: ${gameState.teamBName} (${gameState.timeoutsB - 1} left)`
      });
    }
  };

  const handleBroadcastPenalty = () => {
    if (!penaltyMsg.trim()) return;
    playSound('whistle');
    syncToCloud({
      ...gameState,
      isRunning: false,
      lastEventMsg: `PENALTY / OFFICIAL CALL: ${penaltyMsg.trim().toUpperCase()}`
    });
    setPenaltyMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#090D16] border border-[#00F2FE]/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,242,254,0.25)] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#121A26] border-b border-[#24324F]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
                  Live Game Clock &amp; Referee Field Dispatch
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE REPLAY SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {gameState.fieldLocation} • Broadcast ID: #{gameId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title={soundEnabled ? 'Mute Buzzer/Whistle' : 'Enable Buzzer/Whistle'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stadium Jumbotron Display */}
        <div className="p-6 space-y-6 overflow-y-auto bg-gradient-to-b from-[#090D16] via-[#0E1522] to-[#090D16]">
          
          {/* Main Clock & Scores Jumbotron */}
          <div className="rounded-3xl bg-[#060A10] border-2 border-[#00F2FE]/50 p-6 shadow-[inset_0_0_30px_rgba(0,242,254,0.15)] relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              
              {/* Team A Box */}
              <div className={`p-4 rounded-2xl transition-all ${
                gameState.possession === 'A' ? 'bg-[#00F2FE]/10 border-2 border-[#00F2FE]' : 'bg-[#121A26]/80 border border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">HOME</span>
                  {gameState.possession === 'A' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-[#00F2FE] text-slate-950">POSS</span>
                  )}
                </div>
                <h4 className="text-lg font-black text-white truncate">{gameState.teamAName}</h4>
                <div className="text-5xl font-mono font-black text-[#00F2FE] my-2">{gameState.scoreA}</div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-slate-400">Timeouts:</span>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < gameState.timeoutsA ? 'bg-[#00F2FE]' : 'bg-slate-700'}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Center Game Clock */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 font-bold mb-2">
                  {gameState.periodName} (Period {gameState.period}/{gameState.totalPeriods})
                </div>
                
                <div className={`text-6xl sm:text-7xl font-mono font-black tracking-tight my-1 ${
                  gameState.secondsRemaining <= 60 
                    ? 'text-rose-500 animate-pulse drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]' 
                    : gameState.isRunning 
                    ? 'text-amber-300 drop-shadow-[0_0_20px_rgba(252,211,77,0.6)]' 
                    : 'text-white'
                }`}>
                  {formatTime(gameState.secondsRemaining)}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleToggleClock}
                    className={`min-h-[48px] px-6 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all ${
                      gameState.isRunning
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                        : 'bg-emerald-400 hover:bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                    }`}
                  >
                    {gameState.isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    <span>{gameState.isRunning ? 'PAUSE CLOCK' : 'START CLOCK'}</span>
                  </button>

                  <button
                    onClick={() => playSound('horn')}
                    className="min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-black flex items-center gap-1.5 cursor-pointer"
                    title="Sound Stadium Horn"
                  >
                    <Zap className="w-4 h-4" />
                    <span>HORN</span>
                  </button>
                </div>
              </div>

              {/* Team B Box */}
              <div className={`p-4 rounded-2xl transition-all ${
                gameState.possession === 'B' ? 'bg-[#39FF14]/10 border-2 border-[#39FF14]' : 'bg-[#121A26]/80 border border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">AWAY</span>
                  {gameState.possession === 'B' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-[#39FF14] text-slate-950">POSS</span>
                  )}
                </div>
                <h4 className="text-lg font-black text-white truncate">{gameState.teamBName}</h4>
                <div className="text-5xl font-mono font-black text-[#39FF14] my-2">{gameState.scoreB}</div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-slate-400">Timeouts:</span>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < gameState.timeoutsB ? 'bg-[#39FF14]' : 'bg-slate-700'}`} />
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Live Ticker Message Strip */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-300 truncate">
                <Activity className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                <span className="text-slate-400">LAST EVENT:</span>
                <span className="font-bold text-white uppercase">{gameState.lastEventMsg}</span>
              </div>
              <div className="text-slate-500 shrink-0">Cloud Synchronized ⚡</div>
            </div>
          </div>

          {/* Quick Referee Adjustment Console */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Score & Possession Adjustments */}
            <div className="p-4 rounded-2xl bg-[#121A26] border border-slate-800 space-y-3">
              <h5 className="text-xs font-mono font-bold text-[#00F2FE] uppercase tracking-wider">
                Official Score &amp; Timeout Controls
              </h5>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Team A */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300 truncate">{gameState.teamAName}</div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAdjustScore('A', 1)}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-[#00F2FE] hover:text-slate-950 text-white font-mono font-bold text-xs cursor-pointer"
                    >
                      +1 Pt
                    </button>
                    <button
                      onClick={() => handleAdjustScore('A', 6)}
                      className="flex-1 py-2 rounded-xl bg-[#00F2FE]/20 text-[#00F2FE] hover:bg-[#00F2FE] hover:text-slate-950 font-mono font-bold text-xs cursor-pointer"
                    >
                      +6 TD
                    </button>
                    <button
                      onClick={() => handleAdjustScore('A', -1)}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-mono font-bold text-xs cursor-pointer"
                    >
                      -1
                    </button>
                  </div>
                  <div className="flex gap-1 pt-1">
                    <button
                      onClick={() => syncToCloud({ ...gameState, possession: 'A', lastEventMsg: `Possession to ${gameState.teamAName}` })}
                      className="flex-1 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-[11px] font-mono font-bold cursor-pointer"
                    >
                      Set Poss
                    </button>
                    <button
                      onClick={() => handleTimeout('A')}
                      className="flex-1 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold cursor-pointer"
                    >
                      Timeout
                    </button>
                  </div>
                </div>

                {/* Team B */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300 truncate">{gameState.teamBName}</div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAdjustScore('B', 1)}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-[#39FF14] hover:text-slate-950 text-white font-mono font-bold text-xs cursor-pointer"
                    >
                      +1 Pt
                    </button>
                    <button
                      onClick={() => handleAdjustScore('B', 6)}
                      className="flex-1 py-2 rounded-xl bg-[#39FF14]/20 text-[#39FF14] hover:bg-[#39FF14] hover:text-slate-950 font-mono font-bold text-xs cursor-pointer"
                    >
                      +6 TD
                    </button>
                    <button
                      onClick={() => handleAdjustScore('B', -1)}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-mono font-bold text-xs cursor-pointer"
                    >
                      -1
                    </button>
                  </div>
                  <div className="flex gap-1 pt-1">
                    <button
                      onClick={() => syncToCloud({ ...gameState, possession: 'B', lastEventMsg: `Possession to ${gameState.teamBName}` })}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold cursor-pointer"
                    >
                      Set Poss
                    </button>
                    <button
                      onClick={() => handleTimeout('B')}
                      className="flex-1 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold cursor-pointer"
                    >
                      Timeout
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Period & Preset Clock Operations */}
            <div className="p-4 rounded-2xl bg-[#121A26] border border-slate-800 space-y-3">
              <h5 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Clock Presets &amp; Periods
              </h5>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleResetClock(1200)} // 20 min
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold cursor-pointer"
                >
                  20:00
                </button>
                <button
                  onClick={() => handleResetClock(720)} // 12 min
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold cursor-pointer"
                >
                  12:00
                </button>
                <button
                  onClick={() => handleResetClock(480)} // 8 min
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold cursor-pointer"
                >
                  08:00
                </button>
                <button
                  onClick={() => handleResetClock(120)} // 2 min warning
                  className="py-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-mono text-xs font-bold cursor-pointer"
                >
                  02:00
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => syncToCloud({
                    ...gameState,
                    period: 1,
                    periodName: '1st Half',
                    secondsRemaining: 1200,
                    isRunning: false,
                    lastEventMsg: 'Period Changed to 1st Half'
                  })}
                  className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer ${
                    gameState.period === 1 ? 'bg-[#00F2FE] text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  1st Half
                </button>
                <button
                  onClick={() => syncToCloud({
                    ...gameState,
                    period: 2,
                    periodName: '2nd Half',
                    secondsRemaining: 1200,
                    isRunning: false,
                    lastEventMsg: 'Period Changed to 2nd Half'
                  })}
                  className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer ${
                    gameState.period === 2 ? 'bg-[#00F2FE] text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  2nd Half
                </button>
                <button
                  onClick={() => syncToCloud({
                    ...gameState,
                    period: 3,
                    periodName: 'Overtime',
                    secondsRemaining: 300,
                    isRunning: false,
                    lastEventMsg: 'PERIOD CHANGED: OVERTIME'
                  })}
                  className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer ${
                    gameState.period === 3 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  OT Period
                </button>
              </div>
            </div>

          </div>

          {/* Referee Penalty & Live Audio Whistle Dispatch */}
          <div className="p-4 rounded-2xl bg-[#121A26] border border-rose-500/30 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <input
              type="text"
              value={penaltyMsg}
              onChange={(e) => setPenaltyMsg(e.target.value)}
              placeholder="Broadcast Referee Ruling (e.g. False Start 5-Yards, Unsportsmanlike Conduct, Inadvertent Whistle)..."
              className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
              onKeyDown={(e) => e.key === 'Enter' && handleBroadcastPenalty()}
            />
            <button
              onClick={handleBroadcastPenalty}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-mono text-xs font-black uppercase cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <Flag className="w-4 h-4" />
              <span>DISPATCH CALL</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#121A26] border-t border-[#24324F]">
          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Field Controller: Ref Pad v4.2 Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold cursor-pointer"
          >
            Close Controller
          </button>
        </div>

      </div>
    </div>
  );
};
