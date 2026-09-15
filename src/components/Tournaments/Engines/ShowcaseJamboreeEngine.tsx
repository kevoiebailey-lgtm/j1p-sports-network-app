import React, { useState } from 'react';
import { 
  Radio, 
  Clock, 
  Play, 
  Pause, 
  Plus, 
  Minus, 
  Flag, 
  CheckCircle2, 
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import { UniversalScheduleItem } from '../../../types/tournamentEngine';

interface ShowcaseFieldMatch {
  fieldId: string;
  fieldName: string;
  timeSlot: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  period: '1st Quarter' | '2nd Quarter' | 'Halftime' | '3rd Quarter' | '4th Quarter' | 'Final';
  clock: string;
  isClockRunning: boolean;
  possession: 'teamA' | 'teamB';
  downAndDistance?: string;
}

const INITIAL_FIELDS: ShowcaseFieldMatch[] = [
  { fieldId: 'f1', fieldName: 'Field 1 (Main Stadium)', timeSlot: '09:00 AM - 10:15 AM', teamA: 'North Dallas Texans', teamB: 'Austin Vipers', scoreA: 21, scoreB: 14, period: '3rd Quarter', clock: '08:42', isClockRunning: true, possession: 'teamA', downAndDistance: '2nd & 4 on Opp 32' },
  { fieldId: 'f2', fieldName: 'Field 2', timeSlot: '09:00 AM - 10:15 AM', teamA: 'Houston Titans', teamB: 'San Antonio Heat', scoreA: 17, scoreB: 17, period: '4th Quarter', clock: '02:15', isClockRunning: true, possession: 'teamB', downAndDistance: '3rd & 10 on Own 45' },
  { fieldId: 'f3', fieldName: 'Field 3', timeSlot: '09:00 AM - 10:15 AM', teamA: 'DFW Blitz', teamB: 'Lone Star Wranglers', scoreA: 28, scoreB: 7, period: 'Final', clock: '00:00', isClockRunning: false, possession: 'teamA' },
  { fieldId: 'f4', fieldName: 'Field 4', timeSlot: '10:30 AM - 11:45 AM', teamA: 'West Coast Prime', teamB: 'Metro Storm', scoreA: 0, scoreB: 0, period: '1st Quarter', clock: '12:00', isClockRunning: false, possession: 'teamA', downAndDistance: '1st & 10 on Own 25' },
  { fieldId: 'f5', fieldName: 'Field 5', timeSlot: '10:30 AM - 11:45 AM', teamA: 'NorCal Surge', teamB: 'Desert Fire Flag', scoreA: 0, scoreB: 0, period: '1st Quarter', clock: '12:00', isClockRunning: false, possession: 'teamB' },
  { fieldId: 'f6', fieldName: 'Field 6', timeSlot: '10:30 AM - 11:45 AM', teamA: 'Pacific Flight', teamB: 'Arizona Heat', scoreA: 0, scoreB: 0, period: '1st Quarter', clock: '12:00', isClockRunning: false, possession: 'teamA' },
];

export const ShowcaseJamboreeEngine: React.FC = () => {
  const [fields, setFields] = useState<ShowcaseFieldMatch[]>(INITIAL_FIELDS);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('f1');
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  const activeField = fields.find(f => f.fieldId === selectedFieldId) || fields[0];

  const updateScore = (team: 'teamA' | 'teamB', points: number, label: string) => {
    setFields(prev => prev.map(f => {
      if (f.fieldId === activeField.fieldId) {
        const newScoreA = team === 'teamA' ? Math.max(0, f.scoreA + points) : f.scoreA;
        const newScoreB = team === 'teamB' ? Math.max(0, f.scoreB + points) : f.scoreB;
        return { ...f, scoreA: newScoreA, scoreB: newScoreB };
      }
      return f;
    }));
    setActionAlert(`${team === 'teamA' ? activeField.teamA : activeField.teamB} +${points} pts (${label})!`);
    setTimeout(() => setActionAlert(null), 2500);
  };

  const toggleClock = () => {
    setFields(prev => prev.map(f => {
      if (f.fieldId === activeField.fieldId) {
        return { ...f, isClockRunning: !f.isClockRunning };
      }
      return f;
    }));
  };

  const togglePossession = () => {
    setFields(prev => prev.map(f => {
      if (f.fieldId === activeField.fieldId) {
        return { ...f, possession: f.possession === 'teamA' ? 'teamB' : 'teamA' };
      }
      return f;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Active Field Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#090D16] border border-[#24324F] p-4 rounded-3xl">
        <div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#FF6A00]" />
            <span>Showcase & Football Jamboree Multi-Field Grid</span>
          </h3>
          <p className="text-xs text-slate-400">
            Simultaneous multi-field scoreboard monitoring, live clock syncing & touchdown scoring
          </p>
        </div>

        {/* 6 Field Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#263238]/60 border border-[#24324F] rounded-2xl overflow-x-auto">
          {fields.map((f) => (
            <button
              key={f.fieldId}
              onClick={() => setSelectedFieldId(f.fieldId)}
              className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                f.fieldId === activeField.fieldId 
                  ? 'bg-[#FF6A00] text-white shadow-[0_0_15px_rgba(255,106,0,0.4)]' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {f.fieldName.split(' ')[0]} {f.fieldName.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {actionAlert && (
        <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-xs text-amber-300 font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{actionAlert}</span>
        </div>
      )}

      {/* Active Field Live Control Console */}
      <div className="bg-[#090D16] border border-[#24324F] rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#263238]/60 p-4 rounded-2xl border border-[#24324F]">
          <div>
            <span className="text-[10px] font-mono text-[#00B8D4] font-bold uppercase tracking-wider">
              {activeField.fieldName} • {activeField.timeSlot}
            </span>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="text-xl sm:text-2xl font-mono font-black text-white">
                {activeField.clock}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/40 text-xs font-bold font-mono">
                {activeField.period}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleClock}
              className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 ${
                activeField.isClockRunning 
                  ? 'bg-amber-400 text-[#090D16]' 
                  : 'bg-emerald-400 text-[#090D16]'
              }`}
            >
              {activeField.isClockRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{activeField.isClockRunning ? 'Pause Clock' : 'Start Running Clock'}</span>
            </button>

            <button
              onClick={togglePossession}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 text-[#FFC857]" />
              <span>Flip Ball Possession</span>
            </button>
          </div>
        </div>

        {/* Dual Live Scoring Pads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team A */}
          <div className={`p-5 rounded-3xl border transition-all ${
            activeField.possession === 'teamA' 
              ? 'bg-[#263238] border-[#00B8D4] shadow-[0_0_20px_rgba(0,184,212,0.2)]' 
              : 'bg-[#263238]/40 border-[#24324F]'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-mono text-[#00B8D4] uppercase font-bold">Team A</span>
                <h4 className="text-base font-black text-white">{activeField.teamA}</h4>
              </div>
              {activeField.possession === 'teamA' && (
                <span className="px-2 py-0.5 rounded-full bg-[#00B8D4] text-[#090D16] text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span>Possession</span>
                </span>
              )}
            </div>

            <div className="text-5xl sm:text-6xl font-mono font-black text-[#00B8D4] text-center py-2">
              {activeField.scoreA}
            </div>

            {/* Touchpad Buttons (min-h-[48px]) */}
            <div className="grid grid-cols-4 gap-2 pt-3">
              <button
                onClick={() => updateScore('teamA', 6, 'Touchdown')}
                className="min-h-[48px] rounded-xl bg-[#00B8D4] hover:bg-[#00e2c4] text-[#090D16] text-xs font-black shadow-md cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+6</span>
                <span className="text-[9px] font-bold">TD</span>
              </button>
              <button
                onClick={() => updateScore('teamA', 3, 'Field Goal')}
                className="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+3</span>
                <span className="text-[9px] text-slate-400">FG</span>
              </button>
              <button
                onClick={() => updateScore('teamA', 1, 'Extra Point')}
                className="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+1</span>
                <span className="text-[9px] text-slate-400">PAT</span>
              </button>
              <button
                onClick={() => updateScore('teamA', 2, '2-Pt Conversion')}
                className="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+2</span>
                <span className="text-[9px] text-slate-400">2-PT</span>
              </button>
            </div>
          </div>

          {/* Team B */}
          <div className={`p-5 rounded-3xl border transition-all ${
            activeField.possession === 'teamB' 
              ? 'bg-[#263238] border-[#FF6A00] shadow-[0_0_20px_rgba(255,106,0,0.2)]' 
              : 'bg-[#263238]/40 border-[#24324F]'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-mono text-[#FF6A00] uppercase font-bold">Team B</span>
                <h4 className="text-base font-black text-white">{activeField.teamB}</h4>
              </div>
              {activeField.possession === 'teamB' && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF6A00] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span>Possession</span>
                </span>
              )}
            </div>

            <div className="text-5xl sm:text-6xl font-mono font-black text-[#FF6A00] text-center py-2">
              {activeField.scoreB}
            </div>

            {/* Touchpad Buttons (min-h-[48px]) */}
            <div className="grid grid-cols-4 gap-2 pt-3">
              <button
                onClick={() => updateScore('teamB', 6, 'Touchdown')}
                className="min-h-[48px] rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] text-white text-xs font-black shadow-md cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+6</span>
                <span className="text-[9px] font-bold">TD</span>
              </button>
              <button
                onClick={() => updateScore('teamB', 3, 'Field Goal')}
                className="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+3</span>
                <span className="text-[9px] text-slate-400">FG</span>
              </button>
              <button
                onClick={() => updateScore('teamB', 1, 'Extra Point')}
                className="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+1</span>
                <span className="text-[9px] text-slate-400">PAT</span>
              </button>
              <button
                onClick={() => updateScore('teamB', 2, '2-Pt Conversion')}
                className="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+2</span>
                <span className="text-[9px] text-slate-400">2-PT</span>
              </button>
            </div>
          </div>
        </div>

        {/* Master 6-Field Overview Grid */}
        <div className="pt-4 border-t border-[#24324F] space-y-3">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            All 6 Fields Master Status Matrix
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fields.map((f) => (
              <div 
                key={f.fieldId}
                onClick={() => setSelectedFieldId(f.fieldId)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  f.fieldId === activeField.fieldId
                    ? 'bg-[#263238] border-[#00B8D4]'
                    : 'bg-[#090D16] border-[#24324F] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="font-bold text-white">{f.fieldName}</span>
                  <span className={f.period === 'Final' ? 'text-slate-400' : 'text-[#FF6A00] font-bold'}>
                    {f.period}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-white mt-2">
                  <span className="truncate max-w-[120px]">{f.teamA}</span>
                  <span className="font-mono text-[#00B8D4] text-sm">{f.scoreA}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-white mt-1">
                  <span className="truncate max-w-[120px]">{f.teamB}</span>
                  <span className="font-mono text-[#FF6A00] text-sm">{f.scoreB}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowcaseJamboreeEngine;
