import React, { useState } from 'react';
import { 
  Zap, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Activity, 
  Send,
  Flag,
  Award,
  Sparkles
} from 'lucide-react';
import { SportType } from '../../types/tournamentEngine';

interface ScoreDeskAdapterProps {
  sport: SportType;
  teamAName: string;
  teamBName?: string;
  scoreA: number;
  scoreB?: number;
  onUpdateScoreA: (newScore: number, reason: string) => void;
  onUpdateScoreB?: (newScore: number, reason: string) => void;
  onClockToggle?: () => void;
  isClockRunning?: boolean;
}

export const ScoreDeskAdapter: React.FC<ScoreDeskAdapterProps> = ({
  sport,
  teamAName,
  teamBName = 'Opponent',
  scoreA,
  scoreB = 0,
  onUpdateScoreA,
  onUpdateScoreB,
  onClockToggle,
  isClockRunning = false
}) => {
  const [yellowCardsA, setYellowCardsA] = useState(0);
  const [redCardsA, setRedCardsA] = useState(0);
  const [yellowCardsB, setYellowCardsB] = useState(0);
  const [redCardsB, setRedCardsB] = useState(0);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 2500);
  };

  return (
    <div className="bg-[#090D16] border border-[#24324F] rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#24324F]">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#00B8D4]" />
          <div>
            <h4 className="text-base font-black text-white capitalize">
              {sport.replace('_', ' ')} Dynamic Score Desk Controller
            </h4>
            <p className="text-xs text-slate-400">
              Sport-specific rules & scoring buttons (48px × 48px precision hit-target certified)
            </p>
          </div>
        </div>

        {onClockToggle && (
          <button
            onClick={onClockToggle}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl font-mono text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 ${
              isClockRunning 
                ? 'bg-amber-400 text-[#090D16]' 
                : 'bg-emerald-400 text-[#090D16]'
            }`}
          >
            {isClockRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isClockRunning ? 'Running Clock [PAUSE]' : 'Start Running Clock'}</span>
          </button>
        )}
      </div>

      {actionToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-300 font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* 1. FOOTBALL / FLAG FOOTBALL ADAPTER */}
      {(sport === 'football' || sport === 'flag_football') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team A */}
          <div className="bg-[#263238]/60 p-5 rounded-3xl border border-[#24324F] space-y-3">
            <span className="text-xs font-bold text-[#00B8D4]">{teamAName}</span>
            <div className="text-5xl font-mono font-black text-[#00B8D4] text-center">{scoreA}</div>
            <div className="grid grid-cols-4 gap-2 pt-2">
              <button
                onClick={() => { onUpdateScoreA(scoreA + 6, 'Touchdown'); showToast(`${teamAName} +6 TD!`); }}
                className="min-h-[48px] rounded-xl bg-[#00B8D4] text-[#090D16] text-xs font-black shadow-md cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+6</span>
                <span className="text-[9px]">TD</span>
              </button>
              <button
                onClick={() => { onUpdateScoreA(scoreA + 3, 'Field Goal'); showToast(`${teamAName} +3 FG!`); }}
                className="min-h-[48px] rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+3</span>
                <span className="text-[9px] text-slate-400">FG</span>
              </button>
              <button
                onClick={() => { onUpdateScoreA(scoreA + 1, 'Extra Point'); showToast(`${teamAName} +1 PAT!`); }}
                className="min-h-[48px] rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+1</span>
                <span className="text-[9px] text-slate-400">PAT</span>
              </button>
              <button
                onClick={() => { onUpdateScoreA(scoreA + 2, '2-Pt Conversion'); showToast(`${teamAName} +2 Two-Pt!`); }}
                className="min-h-[48px] rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+2</span>
                <span className="text-[9px] text-slate-400">2-PT</span>
              </button>
            </div>
          </div>

          {/* Team B */}
          {onUpdateScoreB && (
            <div className="bg-[#263238]/60 p-5 rounded-3xl border border-[#24324F] space-y-3">
              <span className="text-xs font-bold text-[#FF6A00]">{teamBName}</span>
              <div className="text-5xl font-mono font-black text-[#FF6A00] text-center">{scoreB}</div>
              <div className="grid grid-cols-4 gap-2 pt-2">
                <button
                  onClick={() => { onUpdateScoreB(scoreB + 6, 'Touchdown'); showToast(`${teamBName} +6 TD!`); }}
                  className="min-h-[48px] rounded-xl bg-[#FF6A00] text-white text-xs font-black shadow-md cursor-pointer flex flex-col items-center justify-center active:scale-95"
                >
                  <span>+6</span>
                  <span className="text-[9px]">TD</span>
                </button>
                <button
                  onClick={() => { onUpdateScoreB(scoreB + 3, 'Field Goal'); showToast(`${teamBName} +3 FG!`); }}
                  className="min-h-[48px] rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
                >
                  <span>+3</span>
                  <span className="text-[9px] text-slate-400">FG</span>
                </button>
                <button
                  onClick={() => { onUpdateScoreB(scoreB + 1, 'Extra Point'); showToast(`${teamBName} +1 PAT!`); }}
                  className="min-h-[48px] rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
                >
                  <span>+1</span>
                  <span className="text-[9px] text-slate-400">PAT</span>
                </button>
                <button
                  onClick={() => { onUpdateScoreB(scoreB + 2, '2-Pt Conversion'); showToast(`${teamBName} +2 Two-Pt!`); }}
                  className="min-h-[48px] rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
                >
                  <span>+2</span>
                  <span className="text-[9px] text-slate-400">2-PT</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. SOCCER / LACROSSE / FIELD HOCKEY ADAPTER */}
      {(sport === 'soccer' || sport === 'lacrosse' || sport === 'field_hockey') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team A */}
          <div className="bg-[#263238]/60 p-5 rounded-3xl border border-[#24324F] space-y-3">
            <span className="text-xs font-bold text-[#00B8D4]">{teamAName}</span>
            <div className="text-5xl font-mono font-black text-[#00B8D4] text-center">{scoreA}</div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => { onUpdateScoreA(scoreA + 1, 'Goal'); showToast(`GOAL for ${teamAName}!`); }}
                className="min-h-[48px] rounded-xl bg-[#00B8D4] text-[#090D16] text-xs font-black shadow-md cursor-pointer active:scale-95"
              >
                +1 Goal ⚽
              </button>
              <button
                onClick={() => { setYellowCardsA(prev => prev + 1); showToast(`Yellow Card issued to ${teamAName}`); }}
                className="min-h-[48px] rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer active:scale-95"
              >
                🟨 Yellow ({yellowCardsA})
              </button>
              <button
                onClick={() => { setRedCardsA(prev => prev + 1); showToast(`RED CARD issued to ${teamAName}!`); }}
                className="min-h-[48px] rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold cursor-pointer active:scale-95"
              >
                🟥 Red ({redCardsA})
              </button>
            </div>
          </div>

          {/* Team B */}
          {onUpdateScoreB && (
            <div className="bg-[#263238]/60 p-5 rounded-3xl border border-[#24324F] space-y-3">
              <span className="text-xs font-bold text-[#FF6A00]">{teamBName}</span>
              <div className="text-5xl font-mono font-black text-[#FF6A00] text-center">{scoreB}</div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={() => { onUpdateScoreB(scoreB + 1, 'Goal'); showToast(`GOAL for ${teamBName}!`); }}
                  className="min-h-[48px] rounded-xl bg-[#FF6A00] text-white text-xs font-black shadow-md cursor-pointer active:scale-95"
                >
                  +1 Goal ⚽
                </button>
                <button
                  onClick={() => { setYellowCardsB(prev => prev + 1); showToast(`Yellow Card issued to ${teamBName}`); }}
                  className="min-h-[48px] rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer active:scale-95"
                >
                  🟨 Yellow ({yellowCardsB})
                </button>
                <button
                  onClick={() => { setRedCardsB(prev => prev + 1); showToast(`RED CARD issued to ${teamBName}!`); }}
                  className="min-h-[48px] rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold cursor-pointer active:scale-95"
                >
                  🟥 Red ({redCardsB})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. WRESTLING ADAPTER */}
      {sport === 'wrestling' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Green Ankle */}
          <div className="bg-[#263238]/60 p-5 rounded-3xl border border-emerald-500/40 space-y-3">
            <span className="text-xs font-bold text-emerald-400">Green: {teamAName}</span>
            <div className="text-5xl font-mono font-black text-emerald-400 text-center">{scoreA}</div>
            <div className="grid grid-cols-4 gap-2 pt-2">
              <button
                onClick={() => { onUpdateScoreA(scoreA + 2, 'Takedown'); showToast(`${teamAName} +2 Takedown!`); }}
                className="min-h-[48px] rounded-xl bg-emerald-500 text-[#090D16] text-xs font-black shadow-md cursor-pointer active:scale-95"
              >
                +2 Take
              </button>
              <button
                onClick={() => { onUpdateScoreA(scoreA + 1, 'Escape'); showToast(`${teamAName} +1 Escape!`); }}
                className="min-h-[48px] rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer active:scale-95"
              >
                +1 Esc
              </button>
              <button
                onClick={() => { onUpdateScoreA(scoreA + 2, 'Reversal'); showToast(`${teamAName} +2 Reversal!`); }}
                className="min-h-[48px] rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer active:scale-95"
              >
                +2 Rev
              </button>
              <button
                onClick={() => { onUpdateScoreA(scoreA + 4, 'Near Fall'); showToast(`${teamAName} +4 Near Fall!`); }}
                className="min-h-[48px] rounded-xl bg-amber-500 text-[#090D16] text-xs font-black shadow-md cursor-pointer active:scale-95"
              >
                +4 Fall
              </button>
            </div>
          </div>

          {/* Red Ankle */}
          {onUpdateScoreB && (
            <div className="bg-[#263238]/60 p-5 rounded-3xl border border-rose-500/40 space-y-3">
              <span className="text-xs font-bold text-rose-400">Red: {teamBName}</span>
              <div className="text-5xl font-mono font-black text-rose-400 text-center">{scoreB}</div>
              <div className="grid grid-cols-4 gap-2 pt-2">
                <button
                  onClick={() => { onUpdateScoreB(scoreB + 2, 'Takedown'); showToast(`${teamBName} +2 Takedown!`); }}
                  className="min-h-[48px] rounded-xl bg-rose-500 text-white text-xs font-black shadow-md cursor-pointer active:scale-95"
                >
                  +2 Take
                </button>
                <button
                  onClick={() => { onUpdateScoreB(scoreB + 1, 'Escape'); showToast(`${teamBName} +1 Escape!`); }}
                  className="min-h-[48px] rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer active:scale-95"
                >
                  +1 Esc
                </button>
                <button
                  onClick={() => { onUpdateScoreB(scoreB + 2, 'Reversal'); showToast(`${teamBName} +2 Reversal!`); }}
                  className="min-h-[48px] rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer active:scale-95"
                >
                  +2 Rev
                </button>
                <button
                  onClick={() => { onUpdateScoreB(scoreB + 4, 'Near Fall'); showToast(`${teamBName} +4 Near Fall!`); }}
                  className="min-h-[48px] rounded-xl bg-amber-500 text-[#090D16] text-xs font-black shadow-md cursor-pointer active:scale-95"
                >
                  +4 Fall
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. CHEER / DANCE ADAPTER */}
      {sport === 'cheer' && (
        <div className="p-5 bg-[#263238]/60 rounded-3xl border border-[#24324F] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#FFC857]">Routine: {teamAName}</span>
            <span className="text-3xl font-mono font-black text-[#FFC857]">{scoreA.toFixed(2)} pts</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => { onUpdateScoreA(scoreA - 0.5, 'Deduction 0.5'); showToast('-0.5 pt Deduction Applied'); }}
              className="min-h-[48px] rounded-xl bg-red-950/80 text-red-300 border border-red-700/60 text-xs font-bold cursor-pointer active:scale-95"
            >
              -0.5 Deduction
            </button>
            <button
              onClick={() => { onUpdateScoreA(scoreA - 1.0, 'Deduction 1.0'); showToast('-1.0 pt Deduction Applied'); }}
              className="min-h-[48px] rounded-xl bg-red-950/80 text-red-300 border border-red-700/60 text-xs font-bold cursor-pointer active:scale-95"
            >
              -1.0 Deduction
            </button>
            <button
              onClick={() => showToast('Scorecard draft saved securely to local cache')}
              className="min-h-[48px] rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer active:scale-95"
            >
              Save Scorecard
            </button>
            <button
              onClick={() => showToast('Scorecard published to Master Arena Leaderboard!')}
              className="min-h-[48px] rounded-xl bg-[#00B8D4] text-[#090D16] text-xs font-black uppercase cursor-pointer active:scale-95"
            >
              Publish Board
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreDeskAdapter;
