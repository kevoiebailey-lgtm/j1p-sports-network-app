import React, { useState } from 'react';
import { 
  Radio, 
  Trophy, 
  Activity, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Users,
  Play,
  Pause,
  Layers
} from 'lucide-react';
import { UniversalScheduleItem } from '../../../types/tournamentEngine';

export const WEIGHT_CLASSES = [
  '106 lbs',
  '113 lbs',
  '120 lbs',
  '126 lbs',
  '132 lbs',
  '138 lbs',
  '144 lbs',
  '150 lbs',
  '157 lbs',
  '165 lbs',
  '175 lbs',
  '190 lbs',
  '215 lbs',
  '285 lbs HWT'
];

interface MatStatusItem {
  matId: number;
  matName: string;
  status: 'live' | 'open' | 'warmup';
  weightClass: string;
  wrestlerGreen: string;
  schoolGreen: string;
  scoreGreen: number;
  wrestlerRed: string;
  schoolRed: string;
  scoreRed: number;
  period: '1st Period' | '2nd Period' | '3rd Period' | 'OT' | 'Final';
  clock: string;
  onDeckGreen: string;
  onDeckRed: string;
}

const INITIAL_MATS: MatStatusItem[] = [
  {
    matId: 1,
    matName: 'Mat 1 (Championship)',
    status: 'live',
    weightClass: '138 lbs',
    wrestlerGreen: 'Marcus Vance',
    schoolGreen: 'Blair Academy',
    scoreGreen: 6,
    wrestlerRed: 'Liam Davies',
    schoolRed: 'Wyoming Seminary',
    scoreRed: 4,
    period: '2nd Period',
    clock: '01:14',
    onDeckGreen: 'Cole Garcia (St. Eds)',
    onDeckRed: 'Tyler Miller (Graham)'
  },
  {
    matId: 2,
    matName: 'Mat 2',
    status: 'live',
    weightClass: '144 lbs',
    wrestlerGreen: 'Noah Brooks',
    schoolGreen: 'Bergen Catholic',
    scoreGreen: 2,
    wrestlerRed: 'Ethan Hayes',
    schoolRed: 'Delbarton',
    scoreRed: 1,
    period: '1st Period',
    clock: '00:48',
    onDeckGreen: 'Jake Morales (Paulsboro)',
    onDeckRed: 'Sam Rossi (Camden)'
  },
  {
    matId: 3,
    matName: 'Mat 3',
    status: 'open',
    weightClass: '150 lbs',
    wrestlerGreen: 'Mat 3 Open - Ready for Bout #204',
    schoolGreen: 'Wrestle-Back Consolation',
    scoreGreen: 0,
    wrestlerRed: '',
    schoolRed: '',
    scoreRed: 0,
    period: '1st Period',
    clock: '02:00',
    onDeckGreen: 'Hunter Stone (Trinity)',
    onDeckRed: 'Alex Reed (Oak Hill)'
  },
  {
    matId: 4,
    matName: 'Mat 4',
    status: 'live',
    weightClass: '120 lbs',
    wrestlerGreen: 'Devin Scott',
    schoolGreen: 'St. Paris Graham',
    scoreGreen: 8,
    wrestlerRed: 'Lucas Wright',
    schoolRed: 'Buchanan',
    scoreRed: 2,
    period: '3rd Period',
    clock: '01:30',
    onDeckGreen: 'Mason King (Clovis)',
    onDeckRed: 'Leo Perez (Poway)'
  }
];

export const WrestlingMatEngine: React.FC = () => {
  const [selectedWeight, setSelectedWeight] = useState<string>('138 lbs');
  const [mats, setMats] = useState<MatStatusItem[]>(INITIAL_MATS);
  const [activeMatId, setActiveMatId] = useState<number>(1);
  const [boutAlert, setBoutAlert] = useState<string | null>(null);

  const activeMat = mats.find(m => m.matId === activeMatId) || mats[0];

  const updateWrestlingScore = (color: 'green' | 'red', points: number, label: string) => {
    setMats(prev => prev.map(m => {
      if (m.matId === activeMat.matId) {
        const newGreen = color === 'green' ? Math.max(0, m.scoreGreen + points) : m.scoreGreen;
        const newRed = color === 'red' ? Math.max(0, m.scoreRed + points) : m.scoreRed;
        return { ...m, scoreGreen: newGreen, scoreRed: newRed };
      }
      return m;
    }));

    setBoutAlert(`${color === 'green' ? 'GREEN (' + activeMat.wrestlerGreen + ')' : 'RED (' + activeMat.wrestlerRed + ')'} +${points} pts [${label}]!`);
    setTimeout(() => setBoutAlert(null), 2500);
  };

  const triggerFallPin = (color: 'green' | 'red') => {
    setMats(prev => prev.map(m => {
      if (m.matId === activeMat.matId) {
        return { ...m, period: 'Final', clock: 'FALL PIN' };
      }
      return m;
    }));

    const victor = color === 'green' ? activeMat.wrestlerGreen : activeMat.wrestlerRed;
    setBoutAlert(`🚨 PIN / FALL AWARDED TO ${victor}! Advanced to Championship Semifinals.`);
    setTimeout(() => setBoutAlert(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Weight Class Selector */}
      <div className="bg-[#090D16] border border-[#24324F] p-4 rounded-3xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#00B8D4]" />
              <span>Multi-Mat Radar & Weight Class Dispatcher</span>
            </h3>
            <p className="text-xs text-slate-400">
              Live mat scoring, automated on-deck radar & wrestle-back consolation routing
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#00B8D4]/15 border border-[#00B8D4]/40 text-[#00B8D4] text-xs font-mono font-black uppercase">
              4 MATS ACTIVE
            </span>
          </div>
        </div>

        {/* 14 Weight Class Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-1">
          {WEIGHT_CLASSES.map((wc) => (
            <button
              key={wc}
              onClick={() => setSelectedWeight(wc)}
              className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedWeight === wc 
                  ? 'bg-[#00B8D4] text-[#090D16] font-black shadow-[0_0_15px_rgba(0,184,212,0.4)]' 
                  : 'bg-[#263238]/60 text-slate-300 hover:text-white border border-[#24324F]'
              }`}
            >
              {wc}
            </button>
          ))}
        </div>
      </div>

      {boutAlert && (
        <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-xs text-amber-300 font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{boutAlert}</span>
        </div>
      )}

      {/* ACTIVE MAT SCORING CONSOLE */}
      <div className="bg-[#090D16] border border-[#24324F] rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
        
        {/* Mat Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#263238]/60 p-4 rounded-2xl border border-[#24324F]">
          <div className="flex items-center gap-3">
            {/* Mat Tabs (min-h-[48px]) */}
            <div className="flex gap-1.5">
              {mats.map((m) => (
                <button
                  key={m.matId}
                  onClick={() => setActiveMatId(m.matId)}
                  className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    m.matId === activeMat.matId 
                      ? 'bg-[#FF6A00] text-white shadow-md' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Mat {m.matId}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-[#FFC857]">
              Weight: {activeMat.weightClass}
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-white">
              {activeMat.period} • {activeMat.clock}
            </span>
          </div>
        </div>

        {/* GREEN VS RED CORNERS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* GREEN ANKLE / CORNER */}
          <div className="p-5 rounded-3xl bg-[#263238]/50 border-2 border-emerald-500/50 space-y-4 text-center">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/40">
                Green Ankle
              </span>
              <h4 className="text-base font-black text-white mt-1">{activeMat.wrestlerGreen}</h4>
              <p className="text-xs text-slate-400 font-mono">{activeMat.schoolGreen}</p>
            </div>

            {/* Score */}
            <div className="text-5xl sm:text-6xl font-mono font-black text-emerald-400 py-1">
              {activeMat.scoreGreen}
            </div>

            {/* Wrestling Scoring Buttons (min-h-[48px]) */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => updateWrestlingScore('green', 2, 'Takedown')}
                className="min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#090D16] text-xs font-black shadow-md cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+2</span>
                <span className="text-[9px] font-bold">Takedown</span>
              </button>
              <button
                onClick={() => updateWrestlingScore('green', 1, 'Escape')}
                className="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+1</span>
                <span className="text-[9px] text-slate-400">Escape</span>
              </button>
              <button
                onClick={() => updateWrestlingScore('green', 2, 'Reversal')}
                className="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+2</span>
                <span className="text-[9px] text-slate-400">Reversal</span>
              </button>
              <button
                onClick={() => updateWrestlingScore('green', 4, 'Near Fall')}
                className="min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-[#090D16] text-xs font-black shadow-md cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+4</span>
                <span className="text-[9px] font-bold">Near Fall</span>
              </button>
            </div>

            <button
              onClick={() => triggerFallPin('green')}
              className="min-h-[48px] w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg active:scale-95"
            >
              Award Fall / Pin 🎯
            </button>
          </div>

          {/* RED ANKLE / CORNER */}
          <div className="p-5 rounded-3xl bg-[#263238]/50 border-2 border-rose-500/50 space-y-4 text-center">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-500/40">
                Red Ankle
              </span>
              <h4 className="text-base font-black text-white mt-1">{activeMat.wrestlerRed || 'Awaiting Wrestler'}</h4>
              <p className="text-xs text-slate-400 font-mono">{activeMat.schoolRed || 'Wrestle-Back Slot'}</p>
            </div>

            {/* Score */}
            <div className="text-5xl sm:text-6xl font-mono font-black text-rose-400 py-1">
              {activeMat.scoreRed}
            </div>

            {/* Wrestling Scoring Buttons (min-h-[48px]) */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => updateWrestlingScore('red', 2, 'Takedown')}
                className="min-h-[48px] rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-black shadow-md cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+2</span>
                <span className="text-[9px] font-bold">Takedown</span>
              </button>
              <button
                onClick={() => updateWrestlingScore('red', 1, 'Escape')}
                className="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+1</span>
                <span className="text-[9px] text-slate-400">Escape</span>
              </button>
              <button
                onClick={() => updateWrestlingScore('red', 2, 'Reversal')}
                className="min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+2</span>
                <span className="text-[9px] text-slate-400">Reversal</span>
              </button>
              <button
                onClick={() => updateWrestlingScore('red', 4, 'Near Fall')}
                className="min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-[#090D16] text-xs font-black shadow-md cursor-pointer flex flex-col items-center justify-center active:scale-95"
              >
                <span>+4</span>
                <span className="text-[9px] font-bold">Near Fall</span>
              </button>
            </div>

            <button
              onClick={() => triggerFallPin('red')}
              className="min-h-[48px] w-full rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg active:scale-95"
            >
              Award Fall / Pin 🎯
            </button>
          </div>
        </div>

        {/* On Deck Broadcaster Banner */}
        <div className="p-4 rounded-2xl bg-[#263238] border border-[#24324F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-[#FF6A00]/20 text-[#FF6A00] font-black uppercase text-[10px]">
              ON DECK RADAR
            </span>
            <span className="text-white font-bold">
              {activeMat.matName}: {activeMat.onDeckGreen} vs {activeMat.onDeckRed}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Consolation Wrestle-Backs routed to Mat 3 upon completion
          </span>
        </div>

      </div>
    </div>
  );
};

export default WrestlingMatEngine;
