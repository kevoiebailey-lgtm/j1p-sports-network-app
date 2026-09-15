import React, { useState } from 'react';
import { Trophy, Target, Sparkles, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export interface AthleteMetrics {
  athleteName: string;
  position: string;
  fortyYardDashSec: number; // e.g. 4.45
  verticalJumpInches: number; // e.g. 34
  benchPressReps: number; // e.g. 18 reps at 185
  gpa: number; // e.g. 3.8
  filmReelCount: number; // e.g. 12
  shuttleRunSec: number; // e.g. 4.12
}

export type CollegiateTier = 'D1 Power 5' | 'D1 Group of 5' | 'D2 / NAIA' | 'D3 Prep';

const BENCHMARK_TIERS: Record<CollegiateTier, {
  fortyYardDashSec: number;
  verticalJumpInches: number;
  benchPressReps: number;
  gpa: number;
  shuttleRunSec: number;
}> = {
  'D1 Power 5': { fortyYardDashSec: 4.48, verticalJumpInches: 36, benchPressReps: 20, gpa: 3.2, shuttleRunSec: 4.10 },
  'D1 Group of 5': { fortyYardDashSec: 4.58, verticalJumpInches: 33, benchPressReps: 16, gpa: 3.0, shuttleRunSec: 4.22 },
  'D2 / NAIA': { fortyYardDashSec: 4.70, verticalJumpInches: 30, benchPressReps: 12, gpa: 2.8, shuttleRunSec: 4.35 },
  'D3 Prep': { fortyYardDashSec: 4.85, verticalJumpInches: 27, benchPressReps: 8, gpa: 2.5, shuttleRunSec: 4.50 }
};

export const AthleteBenchmarkRadar: React.FC<{
  athlete?: AthleteMetrics;
  onClose?: () => void;
}> = ({
  athlete = {
    athleteName: 'Maya "Flash" Williams',
    position: 'Quarterback / Wide Receiver',
    fortyYardDashSec: 4.42,
    verticalJumpInches: 37,
    benchPressReps: 18,
    gpa: 3.92,
    filmReelCount: 15,
    shuttleRunSec: 4.08
  },
  onClose
}) => {
  const [selectedTier, setSelectedTier] = useState<CollegiateTier>('D1 Power 5');

  const benchmark = BENCHMARK_TIERS[selectedTier];

  // Compare metrics
  const isSpeedExceeded = athlete.fortyYardDashSec <= benchmark.fortyYardDashSec;
  const isVerticalExceeded = athlete.verticalJumpInches >= benchmark.verticalJumpInches;
  const isBenchExceeded = athlete.benchPressReps >= benchmark.benchPressReps;
  const isGpaExceeded = athlete.gpa >= benchmark.gpa;
  const isShuttleExceeded = athlete.shuttleRunSec <= benchmark.shuttleRunSec;

  const passedCount = [isSpeedExceeded, isVerticalExceeded, isBenchExceeded, isGpaExceeded, isShuttleExceeded].filter(Boolean).length;
  const matchPercentage = Math.round((passedCount / 5) * 100);

  return (
    <div className="bg-[#212A31] border border-white/10 rounded-3xl p-6 text-white space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-lg uppercase tracking-wider text-white">
              NCAA / NAIA Scout Metric Comparator
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Comparing <span className="text-[#E5B868] font-bold">{athlete.athleteName}</span> ({athlete.position})
            </p>
          </div>
        </div>

        {/* Tier Selector Tabs */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto scrollbar-none">
          {(Object.keys(BENCHMARK_TIERS) as CollegiateTier[]).map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedTier === tier
                  ? 'bg-[#E5B868] text-black font-black shadow-[0_0_15px_rgba(214,28,36,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Match Score Summary Banner */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#212A31] to-emerald-950/40 border border-[#E5B868]/30">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-[#E5B868]" />
          <div>
            <p className="text-xs font-mono uppercase text-slate-300">Recruit Qualification Index</p>
            <p className="text-sm font-bold text-white">
              Meets <span className="text-[#E5B868]">{passedCount} of 5</span> Key Athletic Benchmarks for {selectedTier}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-[#E5B868] tracking-tight">{matchPercentage}%</span>
          <p className="text-[10px] font-mono text-slate-400 uppercase">Tier Fit Rating</p>
        </div>
      </div>

      {/* Stat Metric Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 40-Yard Dash */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-300 uppercase font-mono">40-Yard Dash</span>
            <span className={`font-mono font-black ${isSpeedExceeded ? 'text-[#E5B868]' : 'text-amber-400'}`}>
              Athlete: {athlete.fortyYardDashSec}s (Target: ≤{benchmark.fortyYardDashSec}s)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
            <div
              className={`h-full ${isSpeedExceeded ? 'bg-[#E5B868]' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, (4.8 / athlete.fortyYardDashSec) * 90)}%` }}
            />
          </div>
        </div>

        {/* Vertical Jump */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-300 uppercase font-mono">Vertical Jump</span>
            <span className={`font-mono font-black ${isVerticalExceeded ? 'text-[#E5B868]' : 'text-amber-400'}`}>
              Athlete: {athlete.verticalJumpInches}" (Target: ≥{benchmark.verticalJumpInches}")
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full ${isVerticalExceeded ? 'bg-[#E5B868]' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, (athlete.verticalJumpInches / benchmark.verticalJumpInches) * 100)}%` }}
            />
          </div>
        </div>

        {/* Bench Press */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-300 uppercase font-mono">Bench Press Reps</span>
            <span className={`font-mono font-black ${isBenchExceeded ? 'text-[#E5B868]' : 'text-amber-400'}`}>
              Athlete: {athlete.benchPressReps} Reps (Target: ≥{benchmark.benchPressReps})
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full ${isBenchExceeded ? 'bg-[#E5B868]' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, (athlete.benchPressReps / benchmark.benchPressReps) * 100)}%` }}
            />
          </div>
        </div>

        {/* GPA Academic Eligibility */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-300 uppercase font-mono">Cumulative GPA</span>
            <span className={`font-mono font-black ${isGpaExceeded ? 'text-[#E5B868]' : 'text-amber-400'}`}>
              Athlete: {athlete.gpa} (Target: ≥{benchmark.gpa})
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full ${isGpaExceeded ? 'bg-[#E5B868]' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, (athlete.gpa / 4.0) * 100)}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
