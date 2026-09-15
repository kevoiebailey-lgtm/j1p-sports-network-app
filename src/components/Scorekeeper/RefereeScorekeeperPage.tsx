import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Sparkles, 
  ChevronLeft, 
  Share2, 
  Lock, 
  RefreshCw,
  AlertTriangle,
  Flame,
  ArrowRight,
  Volume2,
  VolumeX,
  Radio,
  Timer
} from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { GameItem } from '../../types';
import { AiScoresheetScannerModal } from './AiScoresheetScannerModal';
import { notificationService } from '../../services/notificationService';

export const RefereeScorekeeperPage: React.FC = () => {
  const { gameId = 'g-demo' } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  // Load from local storage if available on first mount
  const initialCachedGame = (): GameItem => {
    try {
      const saved = localStorage.getItem(`just1play_game_${gameId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      id: gameId,
      eventId: 'evt-1',
      division: '14U Varsity',
      teamA_Id: 't1',
      teamB_Id: 't2',
      teamA_Name: 'NJ Lightning 14U',
      teamB_Name: 'Philly Pride Select',
      teamA_Score: 18,
      teamB_Score: 14,
      gameType: 'Bracket',
      round: 'Semifinals',
      startTime: '11:00 AM',
      courtOrField: 'Field 1 (Turf Championship)',
      status: 'In Progress',
      period: '2nd Half',
      gameClock: '08:45',
      boxScoreLogs: [
        { time: '18:30', text: 'Touchdown NJ Lightning (Pass 24yd)', team: 'A', points: 6 },
        { time: '18:00', text: 'Extra Point Conversion (1PT)', team: 'A', points: 1 },
        { time: '12:15', text: 'Touchdown Philly Pride (Rush 12yd)', team: 'B', points: 6 },
        { time: '11:45', text: 'Two-Point Conversion (2PT)', team: 'B', points: 2 },
        { time: '04:10', text: 'Touchdown NJ Lightning (Pass 8yd)', team: 'A', points: 6 },
        { time: '01:00', text: 'Touchdown Philly Pride (Rush 4yd)', team: 'B', points: 6 }
      ]
    };
  };

  // Game State
  const [game, setGame] = useState<GameItem>(initialCachedGame);
  const [sport, setSport] = useState<'flag' | 'basketball' | 'soccer'>('flag');
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(525); // 8m 45s
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [submittingFinal, setSubmittingFinal] = useState<boolean>(false);
  const [showSignOffModal, setShowSignOffModal] = useState<boolean>(false);
  const [showOcrModal, setShowOcrModal] = useState<boolean>(false);
  const [refereePin, setRefereePin] = useState<string>('');
  const [geminiRecap, setGeminiRecap] = useState<any | null>(null);

  // Sound and Timeouts
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [timeoutsA, setTimeoutsA] = useState<number>(3);
  const [timeoutsB, setTimeoutsB] = useState<number>(3);
  const [timeoutTimer, setTimeoutTimer] = useState<number | null>(null);

  // Web Audio Synthesized Sounds
  const playScoreSound = (type: 'beep' | 'whistle' | 'buzzer') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'whistle') {
        // High frequency modulated whistle
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2400, now);
        osc.frequency.linearRampToValueAtTime(2800, now + 0.1);
        osc.frequency.linearRampToValueAtTime(2200, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'buzzer') {
        // Arena Buzzer
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
      }
    } catch (e) {
      console.warn('Audio sound error:', e);
    }
  };

  const handleApplyOcrData = (data: any) => {
    if (!data) return;
    setGame(prev => {
      const updated = { ...prev };
      if (typeof data.teamA_Score === 'number') updated.teamA_Score = data.teamA_Score;
      if (typeof data.teamB_Score === 'number') updated.teamB_Score = data.teamB_Score;
      if (data.teamA_Name) updated.teamA_Name = data.teamA_Name;
      if (data.teamB_Name) updated.teamB_Name = data.teamB_Name;
      if (Array.isArray(data.scoringPlays) && data.scoringPlays.length > 0) {
        const ocrLogs = data.scoringPlays.map((p: any) => ({
          time: p.time || 'QTR',
          text: p.description || `${p.player || 'Player'} (${p.points || 0} pts)`,
          team: p.team === 'A' || p.team === 'teamA' ? 'A' : 'B',
          points: Number(p.points) || 0
        }));
        updated.boxScoreLogs = [...ocrLogs, ...(prev.boxScoreLogs || [])];
      }
      return updated;
    });
  };

  // Network listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Flush offline queue
      if (offlineQueue.length > 0) {
        syncQueue();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue]);

  // Game Clock Timer
  useEffect(() => {
    let interval: any = null;
    if (isClockRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsClockRunning(false);
            playScoreSound('buzzer');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isClockRunning, secondsRemaining, soundEnabled]);

  // Timeout Countdown Timer
  useEffect(() => {
    let timeoutInt: any = null;
    if (timeoutTimer !== null && timeoutTimer > 0) {
      timeoutInt = setInterval(() => {
        setTimeoutTimer((prev) => {
          if (prev === null || prev <= 1) {
            playScoreSound('whistle');
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timeoutInt);
  }, [timeoutTimer, soundEnabled]);

  // Handle Team Timeout Call
  const handleCallTimeout = (team: 'A' | 'B') => {
    if (team === 'A') {
      if (timeoutsA <= 0) return;
      setTimeoutsA(prev => prev - 1);
    } else {
      if (timeoutsB <= 0) return;
      setTimeoutsB(prev => prev - 1);
    }
    setIsClockRunning(false);
    setTimeoutTimer(60); // 60-second timeout clock
    playScoreSound('whistle');
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sync to Firestore & Local Storage
  const syncGameState = async (updated: GameItem) => {
    try {
      localStorage.setItem(`just1play_game_${gameId}`, JSON.stringify(updated));
      if (isOnline && db) {
        await setDoc(doc(db, 'games', gameId), updated, { merge: true });
      } else {
        setOfflineQueue((prev) => [...prev, updated]);
      }
    } catch (e) {
      console.warn('Sync failed, queued offline');
      setOfflineQueue((prev) => [...prev, updated]);
    }
  };

  const syncQueue = async () => {
    if (!db || offlineQueue.length === 0) return;
    try {
      const latest = offlineQueue[offlineQueue.length - 1];
      await setDoc(doc(db, 'games', gameId), latest, { merge: true });
      setOfflineQueue([]);
    } catch (e) {
      console.warn('Queue sync error:', e);
    }
  };

  // Score Handlers
  const handleScoreEvent = (team: 'A' | 'B', points: number, label: string) => {
    if (points >= 6) {
      playScoreSound('whistle');
    } else {
      playScoreSound('beep');
    }

    const timeStamp = formatTime(secondsRemaining);
    const logItem = {
      time: timeStamp,
      text: `${label} (${team === 'A' ? game.teamA_Name : game.teamB_Name})`,
      team,
      points
    };

    const updated: GameItem = {
      ...game,
      teamA_Score: team === 'A' ? game.teamA_Score + points : game.teamA_Score,
      teamB_Score: team === 'B' ? game.teamB_Score + points : game.teamB_Score,
      gameClock: timeStamp,
      boxScoreLogs: [logItem, ...(game.boxScoreLogs || [])]
    };

    setGame(updated);
    syncGameState(updated);

    // Push notification score alert
    notificationService.sendScoreAlert({
      gameId: game.id || gameId,
      homeTeam: game.teamA_Name,
      homeScore: updated.teamA_Score,
      awayTeam: game.teamB_Name,
      awayScore: updated.teamB_Score,
      period: game.period || 'Live',
      highlight: `${logItem.text} (+${points})`,
      status: 'LIVE'
    });
  };

  // Period Advance
  const handlePeriodAdvance = () => {
    const periods = ['1st Half', 'Halftime', '2nd Half', 'Overtime', 'Final'];
    const currentIdx = periods.indexOf(game.period || '1st Half');
    const nextPeriod = periods[Math.min(periods.length - 1, currentIdx + 1)];

    const updated: GameItem = {
      ...game,
      period: nextPeriod,
      status: nextPeriod === 'Final' ? 'Final' : 'In Progress'
    };

    if (nextPeriod === 'Halftime' || nextPeriod === 'Final') {
      setIsClockRunning(false);
    } else {
      setSecondsRemaining(1200); // 20 mins
    }

    setGame(updated);
    syncGameState(updated);
  };

  // Final Sign-Off & Gemini AI Recap
  const handleSignOffFinalScore = async () => {
    setSubmittingFinal(true);
    try {
      const winningTeam = game.teamA_Score > game.teamB_Score ? game.teamA_Name : game.teamB_Name;
      const winnerId = game.teamA_Score > game.teamB_Score ? game.teamA_Id : game.teamB_Id;

      // 1. Generate Gemini AI Recap
      let recapData = null;
      try {
        const res = await fetch('/api/gemini/post-game-recap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sport: 'Flag Football',
            homeTeam: game.teamA_Name,
            awayTeam: game.teamB_Name,
            homeScore: game.teamA_Score,
            awayScore: game.teamB_Score,
            eventName: 'Just1Play Tournament',
            division: game.division,
            round: game.round,
            playByPlay: game.boxScoreLogs
          })
        });
        if (res.ok) {
          recapData = await res.json();
          setGeminiRecap(recapData);
        }
      } catch (err) {
        console.warn('Gemini recap fallback:', err);
      }

      // 2. Finalize Game Record
      const finalGame: GameItem = {
        ...game,
        status: 'Final',
        period: 'Final',
        winnerId,
        recap: recapData?.recap || `${winningTeam} claimed victory with a final score of ${Math.max(game.teamA_Score, game.teamB_Score)}-${Math.min(game.teamA_Score, game.teamB_Score)}.`,
        mvpPlayer: recapData?.mvpPlayer || `${winningTeam} Captain`
      };

      setGame(finalGame);
      await syncGameState(finalGame);

      // Push notification FINAL score alert
      notificationService.sendScoreAlert({
        gameId: game.id || gameId,
        homeTeam: game.teamA_Name,
        homeScore: finalGame.teamA_Score,
        awayTeam: game.teamB_Name,
        awayScore: finalGame.teamB_Score,
        period: 'FINAL',
        highlight: `Final Score Verified: ${winningTeam} wins!`,
        status: 'FINAL'
      });

      setShowSignOffModal(false);
    } catch (err: any) {
      console.error('Final signoff error:', err);
    } finally {
      setSubmittingFinal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B0E] text-slate-100 font-sans pb-16 select-none">
      
      {/* Top Header Bar */}
      <header className="bg-[#121820] border-b border-white/10 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#E5B868]/15 border border-[#E5B868]/30 text-[#E5B868] text-[9px] font-mono font-black uppercase">
                Official Scorekeeper
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{game.division}</span>
            </div>
            <p className="text-xs font-black text-white">{game.courtOrField}</p>
          </div>
        </div>

        {/* Offline / Online Sync Indicator & OCR Scan */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              soundEnabled ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-500'
            }`}
            title={soundEnabled ? 'Audio Feedback ON' : 'Audio Feedback MUTED'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowOcrModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00F2FE]/15 hover:bg-[#00F2FE]/25 border border-[#00F2FE]/40 text-[#00F2FE] text-xs font-mono font-black uppercase transition-all shadow-[0_0_10px_rgba(0,242,254,0.2)] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OCR SCORESHEET SCANNER</span>
            <span className="sm:hidden">OCR SCAN</span>
          </button>

          {isOnline ? (
            <button 
              onClick={syncQueue}
              className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-emerald-900/40"
              title="Click to verify sync"
            >
              <Wifi className="w-3 h-3" /> Synced
            </button>
          ) : (
            <button
              onClick={syncQueue}
              className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1.5 rounded-xl animate-pulse cursor-pointer hover:bg-amber-900/40"
              title="Click to retry sync now"
            >
              <WifiOff className="w-3 h-3" /> Queue ({offlineQueue.length})
            </button>
          )}
        </div>
      </header>

      {/* GYM OFFLINE CACHE RESILIENCE BANNER */}
      {(!isOnline || offlineQueue.length > 0) && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs font-mono font-bold text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>⚡ GYM-PROOF OFFLINE ENGINE: Scores &amp; logs cached locally ({offlineQueue.length} pending). Auto-syncs on reconnect.</span>
          </div>
          <button
            onClick={syncQueue}
            className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] uppercase cursor-pointer"
          >
            Sync Now
          </button>
        </div>
      )}

      {/* ACTIVE 60-SEC TIMEOUT OVERLAY BANNER */}
      {timeoutTimer !== null && (
        <div className="bg-cyan-500/20 border-b border-cyan-500/40 px-4 py-2.5 text-xs font-mono font-black text-cyan-300 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-cyan-400" />
            <span>OFFICIAL TIMEOUT IN PROGRESS: {timeoutTimer} SECONDS REMAINING</span>
          </div>
          <button
            onClick={() => setTimeoutTimer(null)}
            className="px-2.5 py-1 rounded bg-cyan-400 text-slate-950 font-black text-[10px] uppercase cursor-pointer"
          >
            Resume Play
          </button>
        </div>
      )}

      {/* Main Scoreboard Display */}
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        
        {/* Giant Score Header */}
        <div className="bg-[#151D26] border border-white/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          
          {/* Period & Clock Controls */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePeriodAdvance}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold uppercase cursor-pointer"
              >
                {game.period} ▾
              </button>
              {game.status === 'Final' && (
                <span className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black font-mono">
                  FINAL
                </span>
              )}
            </div>

            {/* Game Clock Display */}
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#E5B868] tracking-widest bg-black/50 px-4 py-1 rounded-2xl border border-white/10">
                {formatTime(secondsRemaining)}
              </span>
              <button
                onClick={() => setIsClockRunning(!isClockRunning)}
                className={`p-2.5 rounded-xl text-slate-950 font-black cursor-pointer shadow-lg transition-transform active:scale-95 ${
                  isClockRunning ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              >
                {isClockRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              <button
                onClick={() => {
                  setIsClockRunning(false);
                  setSecondsRemaining(1200);
                }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
                title="Reset Clock to 20:00"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Teams and Big Scores */}
          <div className="grid grid-cols-2 gap-4 text-center">
            
            {/* Team A */}
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">HOME</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span 
                      key={i} 
                      className={`w-2 h-2 rounded-full ${i < timeoutsA ? 'bg-[#E5B868]' : 'bg-white/10'}`} 
                      title={`Timeout ${i+1}`}
                    />
                  ))}
                </div>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white truncate">{game.teamA_Name}</h3>
              <div className="text-5xl sm:text-6xl font-black font-mono text-white tracking-tight">
                {game.teamA_Score}
              </div>
              <button
                onClick={() => handleCallTimeout('A')}
                disabled={timeoutsA <= 0}
                className="w-full py-1 rounded-lg bg-[#E5B868]/15 hover:bg-[#E5B868]/25 text-[#E5B868] text-[10px] font-mono font-black uppercase disabled:opacity-30 cursor-pointer"
              >
                Call TO ({timeoutsA} left)
              </button>
            </div>

            {/* Team B */}
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">AWAY</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span 
                      key={i} 
                      className={`w-2 h-2 rounded-full ${i < timeoutsB ? 'bg-cyan-400' : 'bg-white/10'}`} 
                      title={`Timeout ${i+1}`}
                    />
                  ))}
                </div>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white truncate">{game.teamB_Name}</h3>
              <div className="text-5xl sm:text-6xl font-black font-mono text-white tracking-tight">
                {game.teamB_Score}
              </div>
              <button
                onClick={() => handleCallTimeout('B')}
                disabled={timeoutsB <= 0}
                className="w-full py-1 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-400 text-[10px] font-mono font-black uppercase disabled:opacity-30 cursor-pointer"
              >
                Call TO ({timeoutsB} left)
              </button>
            </div>
          </div>
        </div>

        {/* Big Touch Keypads (Flag Football & 7v7) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Team A Keypad */}
          <div className="bg-[#121820] border border-white/10 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#E5B868] truncate uppercase">
                {game.teamA_Name}
              </span>
              <span className="text-xs font-mono font-bold text-white">Score: {game.teamA_Score}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleScoreEvent('A', 6, 'Touchdown +6')}
                className="py-4 px-3 rounded-2xl bg-[#E5B868] hover:bg-[#d4a34f] text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-1 shadow-lg active:scale-95 transition-transform cursor-pointer"
              >
                <Flame className="w-4 h-4" /> TD (+6)
              </button>

              <button
                onClick={() => handleScoreEvent('A', 1, 'Extra Point +1')}
                className="py-4 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-black text-sm uppercase tracking-wider active:scale-95 transition-transform cursor-pointer"
              >
                1PT (+1)
              </button>

              <button
                onClick={() => handleScoreEvent('A', 2, '2-Point Conv +2')}
                className="py-4 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-black text-sm uppercase tracking-wider active:scale-95 transition-transform cursor-pointer"
              >
                2PT (+2)
              </button>

              <button
                onClick={() => handleScoreEvent('A', 2, 'Safety +2')}
                className="py-4 px-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-black text-sm uppercase tracking-wider border border-emerald-500/30 active:scale-95 transition-transform cursor-pointer"
              >
                Safety (+2)
              </button>
            </div>
          </div>

          {/* Team B Keypad */}
          <div className="bg-[#121820] border border-white/10 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-cyan-400 truncate uppercase">
                {game.teamB_Name}
              </span>
              <span className="text-xs font-mono font-bold text-white">Score: {game.teamB_Score}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleScoreEvent('B', 6, 'Touchdown +6')}
                className="py-4 px-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-1 shadow-lg active:scale-95 transition-transform cursor-pointer"
              >
                <Flame className="w-4 h-4" /> TD (+6)
              </button>

              <button
                onClick={() => handleScoreEvent('B', 1, 'Extra Point +1')}
                className="py-4 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-black text-sm uppercase tracking-wider active:scale-95 transition-transform cursor-pointer"
              >
                1PT (+1)
              </button>

              <button
                onClick={() => handleScoreEvent('B', 2, '2-Point Conv +2')}
                className="py-4 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-black text-sm uppercase tracking-wider active:scale-95 transition-transform cursor-pointer"
              >
                2PT (+2)
              </button>

              <button
                onClick={() => handleScoreEvent('B', 2, 'Safety +2')}
                className="py-4 px-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-black text-sm uppercase tracking-wider border border-emerald-500/30 active:scale-95 transition-transform cursor-pointer"
              >
                Safety (+2)
              </button>
            </div>
          </div>
        </div>

        {/* Live Play-by-Play Scoring Log */}
        <div className="bg-[#121820] border border-white/10 rounded-3xl p-5 space-y-3">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
            Game Action Log ({game.boxScoreLogs?.length || 0})
          </h4>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {game.boxScoreLogs?.map((log, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#E5B868] font-bold">{log.time}</span>
                  <span className="text-white">{log.text}</span>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold ${
                  log.team === 'A' ? 'bg-[#E5B868]/20 text-[#E5B868]' : 'bg-cyan-400/20 text-cyan-400'
                }`}>
                  +{log.points} PTS
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Final Sign-Off & Lock Game Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowSignOffModal(true)}
            className="w-full py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(225,29,72,0.4)] cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Final Game Sign-Off &amp; Lock Score</span>
          </button>
        </div>

        {/* Gemini Generated Post-Game Recap Preview */}
        {geminiRecap && (
          <div className="p-6 rounded-3xl bg-[#151D26] border border-[#E5B868]/40 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-[#E5B868]">
              <Sparkles className="w-5 h-5" />
              <h4 className="text-sm font-black uppercase tracking-wide">Gemini AI Match Story &amp; MVP</h4>
            </div>
            <h3 className="text-base font-black text-white">{geminiRecap.headline}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{geminiRecap.recap}</p>
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
              <span className="font-bold text-[#E5B868]">MVP: {geminiRecap.mvpPlayer}</span>
              <span className="text-slate-400">{geminiRecap.mvpStatline}</span>
            </div>
          </div>
        )}
      </div>

      {/* Official Sign-Off PIN Modal */}
      {showSignOffModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121820] border border-white/15 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  Official Match Sign-Off
                </h3>
                <p className="text-xs text-slate-400">
                  Final Score: {game.teamA_Name} {game.teamA_Score} - {game.teamB_Score} {game.teamB_Name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Submitting the final sign-off will lock the game result, update division standings, advance the bracket winner, and publish the AI post-game recap to scouts.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Referee PIN</label>
              <input
                type="password"
                maxLength={4}
                value={refereePin}
                onChange={(e) => setRefereePin(e.target.value)}
                placeholder="4-digit official PIN (e.g. 1234)"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white font-mono text-center text-lg tracking-widest outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOffModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOffFinalScore}
                disabled={submittingFinal}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {submittingFinal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Confirm &amp; Lock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Multimodal Paper Scoresheet OCR Modal */}
      <AiScoresheetScannerModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onStatsApplied={handleApplyOcrData}
      />
    </div>
  );
};
