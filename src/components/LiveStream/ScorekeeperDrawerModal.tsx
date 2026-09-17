import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Minus, 
  Clock, 
  RotateCcw, 
  Save, 
  Trophy, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Radio,
  Flame,
  ShieldAlert
} from 'lucide-react';
import { handleFirestoreError } from '../../lib/firestoreErrorHandler';

export interface ScorekeeperDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomIdOrGameId: string;
  homeTeamName: string;
  awayTeamName: string;
  initialHomeScore: number;
  initialAwayScore: number;
  initialPeriod: string;
  initialGameClock: string;
  initialPossession?: 'home' | 'away' | null;
  onSaveScores: (data: {
    homeScore: number;
    awayScore: number;
    period: string;
    gameClock: string;
    possession: 'home' | 'away' | null;
  }) => Promise<void>;
}

export const ScorekeeperDrawerModal: React.FC<ScorekeeperDrawerModalProps> = ({
  isOpen,
  onClose,
  roomIdOrGameId,
  homeTeamName,
  awayTeamName,
  initialHomeScore,
  initialAwayScore,
  initialPeriod,
  initialGameClock,
  initialPossession = null,
  onSaveScores
}) => {
  const [homeScore, setHomeScore] = useState<number>(initialHomeScore);
  const [awayScore, setAwayScore] = useState<number>(initialAwayScore);
  const [period, setPeriod] = useState<string>(initialPeriod || '1st Qtr');
  const [gameClock, setGameClock] = useState<string>(initialGameClock || '12:00');
  const [possession, setPossession] = useState<'home' | 'away' | null>(initialPossession);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    setHomeScore(initialHomeScore);
    setAwayScore(initialAwayScore);
    setPeriod(initialPeriod || '1st Qtr');
    setGameClock(initialGameClock || '12:00');
    setPossession(initialPossession);
  }, [initialHomeScore, initialAwayScore, initialPeriod, initialGameClock, initialPossession]);

  if (!isOpen) return null;

  const handleAdjustHome = (delta: number) => {
    setHomeScore(prev => Math.max(0, prev + delta));
  };

  const handleAdjustAway = (delta: number) => {
    setAwayScore(prev => Math.max(0, prev + delta));
  };

  const handleReset = () => {
    if (window.confirm('Reset both team scores to zero?')) {
      setHomeScore(0);
      setAwayScore(0);
      setPeriod('1st Qtr');
      setGameClock('12:00');
      setPossession(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      await onSaveScores({
        homeScore,
        awayScore,
        period,
        gameClock,
        possession
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      try {
        handleFirestoreError(err, 'update', 'liveStreams/scorekeeper');
      } catch (handled) {
        setErrorMsg(handled instanceof Error ? handled.message : 'Scorekeeper update failed');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const PERIOD_OPTIONS = ['1st Qtr', '2nd Qtr', '3rd Qtr', '4th Qtr', 'Halftime', 'OT', 'Final'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="w-full max-w-xl bg-[#1E2630] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          {/* Drawer Handle / Title */}
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
                <Trophy className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <h3 className="text-base font-black uppercase tracking-wide text-white flex items-center gap-2 font-mono">
                  LIVE SCOREKEEPER ADMIN
                </h3>
                <p className="text-[11px] font-mono text-[#00F2FE]">
                  Real-time Sync ID: <span className="text-slate-300 font-bold">{roomIdOrGameId}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Alert / Error status */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Score updated in Firestore & broadcast live to all viewers!</span>
            </div>
          )}

          {/* TEAM QUICK-TAP SCORE MATRIX */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* HOME TEAM SCORES */}
            <div className="p-4 rounded-2xl bg-[#161C22] border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-[#F59E0B] uppercase tracking-wider truncate">
                  HOME: {homeTeamName}
                </span>
                <button
                  onClick={() => setPossession(possession === 'home' ? null : 'home')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    possession === 'home'
                      ? 'bg-[#00F2FE] text-slate-950 font-black shadow-[0_0_10px_rgba(0,242,254,0.6)]'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {possession === 'home' ? '🏈 BALL' : 'Possession'}
                </button>
              </div>

              <div className="flex items-center justify-center">
                <input
                  type="number"
                  value={homeScore}
                  onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 text-center text-4xl font-black font-mono bg-slate-900 border border-slate-700 rounded-xl py-1 text-[#F59E0B] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, -1].map((val) => (
                  <button
                    key={`home-${val}`}
                    onClick={() => handleAdjustHome(val)}
                    className={`py-2 rounded-xl text-xs font-mono font-black uppercase transition-all cursor-pointer border ${
                      val > 0
                        ? 'bg-[#F59E0B]/20 hover:bg-[#F59E0B] hover:text-slate-950 text-[#F59E0B] border-[#F59E0B]/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {val > 0 ? `+${val}` : val}
                  </button>
                ))}
              </div>
            </div>

            {/* AWAY TEAM SCORES */}
            <div className="p-4 rounded-2xl bg-[#161C22] border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-[#00F2FE] uppercase tracking-wider truncate">
                  AWAY: {awayTeamName}
                </span>
                <button
                  onClick={() => setPossession(possession === 'away' ? null : 'away')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    possession === 'away'
                      ? 'bg-[#00F2FE] text-slate-950 font-black shadow-[0_0_10px_rgba(0,242,254,0.6)]'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {possession === 'away' ? '🏈 BALL' : 'Possession'}
                </button>
              </div>

              <div className="flex items-center justify-center">
                <input
                  type="number"
                  value={awayScore}
                  onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 text-center text-4xl font-black font-mono bg-slate-900 border border-slate-700 rounded-xl py-1 text-[#00F2FE] focus:outline-none focus:border-[#00F2FE]"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, -1].map((val) => (
                  <button
                    key={`away-${val}`}
                    onClick={() => handleAdjustAway(val)}
                    className={`py-2 rounded-xl text-xs font-mono font-black uppercase transition-all cursor-pointer border ${
                      val > 0
                        ? 'bg-[#00F2FE]/20 hover:bg-[#00F2FE] hover:text-slate-950 text-[#00F2FE] border-[#00F2FE]/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {val > 0 ? `+${val}` : val}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* PERIOD & GAME CLOCK CONTROLS */}
          <div className="p-4 rounded-2xl bg-[#161C22] border border-slate-700/80 space-y-3">
            <span className="text-xs font-mono font-black text-slate-300 uppercase tracking-wider block">
              GAME PERIOD & CLOCK SELECTOR
            </span>

            <div className="flex flex-wrap gap-1.5">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${
                    period === p
                      ? 'bg-[#F59E0B] text-slate-950 border-[#F59E0B] font-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  Game Clock (MM:SS)
                </label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#00F2FE]" />
                  <input
                    type="text"
                    value={gameClock}
                    onChange={(e) => setGameClock(e.target.value)}
                    placeholder="12:00"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-sm font-bold text-white focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-700/60 text-red-300 font-mono text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer mt-5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3.5 rounded-2xl bg-[#F59E0B] hover:bg-[#d98700] text-slate-950 font-mono font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Syncing Firestore...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>SYNC & BROADCAST LIVE SCORES</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-xs uppercase transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
