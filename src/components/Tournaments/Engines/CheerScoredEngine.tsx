import React, { useState } from 'react';
import { 
  Award, 
  Sparkles, 
  Clock, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Trophy, 
  Users,
  Send,
  Plus,
  Minus
} from 'lucide-react';
import { UniversalScheduleItem } from '../../../types/tournamentEngine';

interface CheerRoutineEntry {
  id: string;
  orderNumber: number;
  squadName: string;
  gymName: string;
  division: string;
  scheduledTime: string;
  floorStatus: 'in_warmup' | 'on_floor' | 'judges_scoring' | 'completed';
  stuntsScore: number;
  pyramidsScore: number;
  tumblingScore: number;
  deductions: number;
  compositeScore?: number;
  rank?: number;
}

const INITIAL_ROUTINES: CheerRoutineEntry[] = [
  {
    id: 'cheer-1',
    orderNumber: 1,
    squadName: 'Cheetahs',
    gymName: 'Cheer Athletics',
    division: 'Level 6 Senior Large Coed',
    scheduledTime: '01:30 PM',
    floorStatus: 'completed',
    stuntsScore: 24.8,
    pyramidsScore: 24.6,
    tumblingScore: 24.5,
    deductions: 0.5,
    compositeScore: 97.4,
    rank: 1
  },
  {
    id: 'cheer-2',
    orderNumber: 2,
    squadName: 'Revelation',
    gymName: 'Top Gun All Stars',
    division: 'Level 6 Senior Large Coed',
    scheduledTime: '01:45 PM',
    floorStatus: 'completed',
    stuntsScore: 24.5,
    pyramidsScore: 24.4,
    tumblingScore: 24.2,
    deductions: 0.0,
    compositeScore: 97.1,
    rank: 2
  },
  {
    id: 'cheer-3',
    orderNumber: 3,
    squadName: 'Steel',
    gymName: 'Stingray All Stars',
    division: 'Level 6 Senior Large Coed',
    scheduledTime: '02:00 PM',
    floorStatus: 'on_floor',
    stuntsScore: 24.2,
    pyramidsScore: 24.0,
    tumblingScore: 23.8,
    deductions: 0.0,
    compositeScore: 96.0
  },
  {
    id: 'cheer-4',
    orderNumber: 4,
    squadName: 'Black Ops',
    gymName: 'East Celebrity Elite',
    division: 'Level 6 Senior Large Coed',
    scheduledTime: '02:15 PM',
    floorStatus: 'in_warmup',
    stuntsScore: 0,
    pyramidsScore: 0,
    tumblingScore: 0,
    deductions: 0
  },
  {
    id: 'cheer-5',
    orderNumber: 5,
    squadName: 'Senior Elite',
    gymName: 'Cheer Extreme',
    division: 'Level 6 Senior Large Coed',
    scheduledTime: '02:30 PM',
    floorStatus: 'in_warmup',
    stuntsScore: 0,
    pyramidsScore: 0,
    tumblingScore: 0,
    deductions: 0
  }
];

export const CheerScoredEngine: React.FC = () => {
  const [routines, setRoutines] = useState<CheerRoutineEntry[]>(INITIAL_ROUTINES);
  const [activeSquadId, setActiveSquadId] = useState<string>('cheer-3');
  
  // Judge Rubric State
  const [stunts, setStunts] = useState<number>(24.2);
  const [pyramids, setPyramids] = useState<number>(24.0);
  const [tumbling, setTumbling] = useState<number>(23.8);
  const [deductions, setDeductions] = useState<number>(0.0);
  const [publishToast, setPublishToast] = useState<string | null>(null);

  const activeSquad = routines.find(r => r.id === activeSquadId) || routines[0];
  const calculatedTotal = Number((stunts + pyramids + tumbling - deductions).toFixed(2));

  const handlePublishScore = () => {
    setRoutines(prev => {
      const updated = prev.map(r => {
        if (r.id === activeSquad.id) {
          return {
            ...r,
            stuntsScore: stunts,
            pyramidsScore: pyramids,
            tumblingScore: tumbling,
            deductions,
            compositeScore: calculatedTotal,
            floorStatus: 'completed' as const
          };
        }
        return r;
      });

      // Recalculate rank for completed routines
      const sortedCompleted = [...updated]
        .filter(r => r.compositeScore !== undefined && r.compositeScore > 0)
        .sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));

      return updated.map(r => {
        const foundRank = sortedCompleted.findIndex(s => s.id === r.id);
        return {
          ...r,
          rank: foundRank >= 0 ? foundRank + 1 : undefined
        };
      });
    });

    setPublishToast(`🎉 Official Scorecard for ${activeSquad.squadName} (${calculatedTotal}) published to Master Arena Board!`);
    setTimeout(() => setPublishToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#090D16] border border-[#24324F] p-4 rounded-3xl">
        <div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFC857]" />
            <span>Cheerleading & Performance Scored Division Engine</span>
          </h3>
          <p className="text-xs text-slate-400">
            Digital judge rubric score pad, deduction auditing & live division leaderboard
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#00B8D4]/15 border border-[#00B8D4]/40 text-[#00B8D4] text-xs font-mono font-black uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00B8D4] animate-ping" />
            JUDGE CONSOLE ACTIVE
          </span>
        </div>
      </div>

      {publishToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-300 font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{publishToast}</span>
        </div>
      )}

      {/* Main Grid: Judge Rubric Pad & Chronological Order */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left (7 Cols): Digital Judge Rubric Pad */}
        <div className="lg:col-span-7 bg-[#090D16] border border-[#24324F] rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#24324F]">
            <div>
              <span className="text-[10px] font-mono text-[#00B8D4] uppercase font-bold">
                Routine #{activeSquad.orderNumber} • {activeSquad.division}
              </span>
              <h4 className="text-lg font-black text-white">{activeSquad.squadName} ({activeSquad.gymName})</h4>
            </div>
            <span className="px-3 py-1 rounded-xl bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/40 text-xs font-bold font-mono uppercase">
              {activeSquad.floorStatus.replace('_', ' ')}
            </span>
          </div>

          {/* Composite Score Banner */}
          <div className="bg-[#263238] border border-[#24324F] p-4 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-300">Composite Score:</span>
            <span className="text-3xl sm:text-4xl font-mono font-black text-[#FFC857]">
              {calculatedTotal} / 100.00
            </span>
          </div>

          {/* Sliders & Numerical Inputs */}
          <div className="space-y-4">
            {/* Stunts (0 - 25.0) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-white">Stunts & Building Difficulty / Execution</span>
                <span className="font-mono text-[#00B8D4] font-black">{stunts.toFixed(1)} / 25.0</span>
              </div>
              <input
                type="range"
                min="10"
                max="25"
                step="0.1"
                value={stunts}
                onChange={(e) => setStunts(parseFloat(e.target.value))}
                className="w-full accent-[#00B8D4] cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Pyramids (0 - 25.0) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-white">Pyramids & Tosses</span>
                <span className="font-mono text-[#00B8D4] font-black">{pyramids.toFixed(1)} / 25.0</span>
              </div>
              <input
                type="range"
                min="10"
                max="25"
                step="0.1"
                value={pyramids}
                onChange={(e) => setPyramids(parseFloat(e.target.value))}
                className="w-full accent-[#00B8D4] cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Tumbling & Jumps (0 - 25.0) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-white">Standing & Running Tumbling + Jumps</span>
                <span className="font-mono text-[#00B8D4] font-black">{tumbling.toFixed(1)} / 25.0</span>
              </div>
              <input
                type="range"
                min="10"
                max="25"
                step="0.1"
                value={tumbling}
                onChange={(e) => setTumbling(parseFloat(e.target.value))}
                className="w-full accent-[#00B8D4] cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Deductions (Safety / Falls) */}
            <div className="p-4 rounded-2xl bg-[#263238]/60 border border-red-500/30 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-red-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Deductions (Falls / Time Violations)</span>
                </span>
                <span className="font-mono text-red-400 font-black">-{deductions.toFixed(1)} pts</span>
              </div>
              <div className="flex gap-2">
                {[0, 0.5, 1.0, 1.5, 2.0].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDeductions(d)}
                    className={`min-h-[48px] flex-1 rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                      deductions === d 
                        ? 'bg-red-600 text-white shadow-md' 
                        : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    -{d.toFixed(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            onClick={handlePublishScore}
            className="min-h-[48px] w-full py-3 rounded-2xl bg-gradient-to-r from-[#FFC857] to-[#FF6A00] text-[#090D16] font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,200,87,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Publish Scorecard to Master Arena Board</span>
          </button>
        </div>

        {/* Right (5 Cols): Live Run Order & Division Leaderboard */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Run Order */}
          <div className="bg-[#090D16] border border-[#24324F] rounded-3xl p-5 space-y-3 shadow-xl">
            <span className="text-xs font-mono font-bold text-[#00B8D4] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Performance Run Order</span>
            </span>

            <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
              {routines.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    setActiveSquadId(r.id);
                    if (r.stuntsScore) setStunts(r.stuntsScore);
                    if (r.pyramidsScore) setPyramids(r.pyramidsScore);
                    if (r.tumblingScore) setTumbling(r.tumblingScore);
                    if (r.deductions !== undefined) setDeductions(r.deductions);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    r.id === activeSquad.id 
                      ? 'bg-[#263238] border-[#00B8D4] shadow-[0_0_12px_rgba(0,184,212,0.25)]' 
                      : 'bg-[#090D16] border-[#24324F] hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-slate-400">#{r.orderNumber}</span>
                      <span className="text-xs font-bold text-white">{r.squadName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{r.scheduledTime} • {r.gymName}</span>
                  </div>

                  <div className="text-right">
                    {r.compositeScore ? (
                      <span className="font-mono font-black text-[#FFC857] text-sm">
                        {r.compositeScore}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-[#FF6A00] font-mono">
                        {r.floorStatus.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Division Gold Leaderboard */}
          <div className="bg-gradient-to-b from-[#263238] to-[#090D16] border-2 border-[#FFC857]/40 rounded-3xl p-5 space-y-3 shadow-xl">
            <span className="text-xs font-mono font-black text-[#FFC857] uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              <span>Division Live Leaderboard</span>
            </span>

            <div className="space-y-2">
              {routines
                .filter(r => r.rank !== undefined)
                .sort((a, b) => (a.rank || 0) - (b.rank || 0))
                .map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#090D16] border border-[#24324F] text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black ${
                        lead.rank === 1 ? 'bg-[#FFC857] text-[#090D16]' : 'bg-slate-800 text-slate-300'
                      }`}>
                        #{lead.rank}
                      </span>
                      <span className="font-bold text-white">{lead.squadName}</span>
                    </div>
                    <span className="font-mono font-black text-[#FFC857]">{lead.compositeScore}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CheerScoredEngine;
