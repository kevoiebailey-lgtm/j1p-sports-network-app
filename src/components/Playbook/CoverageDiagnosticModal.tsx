import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Target, 
  Zap, 
  ChevronRight, 
  X,
  Layers,
  Flame,
  Maximize2
} from 'lucide-react';
import { PlayerNode, SportType, DefenseCoverageType, CoverageDiagnostic } from './types';

interface CoverageDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerNode[];
  selectedSport: SportType;
  playTitle: string;
}

const COVERAGES: { id: DefenseCoverageType; name: string; tag: string; scheme: string }[] = [
  { id: 'cover_0', name: 'Cover 0 (Zero Blitz)', tag: 'Man / No Deep Safety', scheme: 'Pure man-to-man with 6+ rushers blitzing. No deep safety help.' },
  { id: 'cover_1', name: 'Cover 1 (Man Free)', tag: '1-High Safety Man', scheme: 'Single deep centerfielder safety with underneath man coverage.' },
  { id: 'cover_2', name: 'Cover 2 (Tampa / 2-Deep)', tag: '2-High Safeties', scheme: '2 deep half-field safeties, 5 underneath zone defenders with CBs in flats.' },
  { id: 'cover_3', name: 'Cover 3 (3-Deep Zone)', tag: '1-High Safety Zone', scheme: 'Corners & Free Safety divide deep thirds; 4 underneath curl/flat & hook zones.' },
  { id: 'cover_4', name: 'Cover 4 (Quarters Match)', tag: '2-High 4-Deep', scheme: '4 deep quarters defenders reading #2 receiver releases; 3 underneath.' },
  { id: 'cover_6', name: 'Cover 6 (Quarter-Quarter-Half)', tag: 'Split Field Coverage', scheme: 'Cover 4 to field side (passing strength) & Cover 2 to boundary side.' },
];

export function CoverageDiagnosticModal({
  isOpen,
  onClose,
  players,
  selectedSport,
  playTitle
}: CoverageDiagnosticModalProps) {
  const [selectedCoverage, setSelectedCoverage] = useState<DefenseCoverageType>('cover_2');
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Tactical Route Evaluation Engine
  const offensivePlayers = useMemo(() => players.filter(p => p.role === 'offense'), [players]);

  const routeMetrics = useMemo(() => {
    let deepRoutes = 0; // vertical > 15 yds / y < 220
    let flatRoutes = 0; // sideline stretch y between 250-380, x < 200 or x > 600
    let crossingRoutes = 0; // crosses middle x: 300-500
    let quickSlants = 0;
    let highLowPairs = 0;
    let totalRoutes = 0;

    offensivePlayers.forEach(p => {
      if (p.route && p.route.length > 0) {
        totalRoutes++;
        const endPt = p.route[p.route.length - 1];
        const startPt = { x: p.x, y: p.y };

        if (endPt.y < 220) deepRoutes++;
        if (Math.abs(endPt.x - startPt.x) > 160 && endPt.y > 220 && endPt.y < 360) crossingRoutes++;
        if ((endPt.x < 180 || endPt.x > 620) && endPt.y > 240) flatRoutes++;
        if (Math.abs(endPt.x - startPt.x) > 80 && endPt.y < 320 && endPt.y > 200 && p.route.length <= 2) quickSlants++;
      }
    });

    if (deepRoutes >= 1 && flatRoutes >= 1) highLowPairs++;
    if (deepRoutes >= 2 && crossingRoutes >= 1) highLowPairs++;

    return { deepRoutes, flatRoutes, crossingRoutes, quickSlants, highLowPairs, totalRoutes };
  }, [offensivePlayers]);

  // Compute live diagnostic reports for each coverage
  const diagnostics: Record<DefenseCoverageType, CoverageDiagnostic> = useMemo(() => {
    const { deepRoutes, flatRoutes, crossingRoutes, quickSlants, highLowPairs } = routeMetrics;

    // Cover 0 Diagnostic
    const c0Advantage = quickSlants >= 1 || crossingRoutes >= 2 || flatRoutes >= 1;
    const c0Grade = c0Advantage ? (quickSlants >= 2 ? 'A+' : 'A') : (deepRoutes >= 3 ? 'C' : 'B');

    // Cover 1 Diagnostic
    const c1Grade = crossingRoutes >= 2 || quickSlants >= 1 ? 'A' : (deepRoutes >= 2 ? 'B+' : 'B');

    // Cover 2 Diagnostic (Smash, Honey Hole, Middle Hole)
    const c2HasHoneyHole = deepRoutes >= 1 && flatRoutes >= 1;
    const c2MiddleSeam = deepRoutes >= 2;
    const c2Grade = (c2HasHoneyHole || c2MiddleSeam) ? 'A+' : (flatRoutes >= 2 ? 'C' : 'B+');

    // Cover 3 Diagnostic (Flood, Seams, Curl-Flat stretch)
    const c3HasFlood = (flatRoutes >= 1 && crossingRoutes >= 1) || highLowPairs >= 1;
    const c3Seams = deepRoutes >= 2;
    const c3Grade = (c3HasFlood || c3Seams) ? 'A+' : (deepRoutes === 1 && flatRoutes === 0 ? 'C' : 'A-');

    // Cover 4 Diagnostic (Underneath crosses, deep overloads)
    const c4HasCrossers = crossingRoutes >= 2 || (flatRoutes >= 1 && crossingRoutes >= 1);
    const c4Grade = c4HasCrossers ? 'A' : (deepRoutes >= 3 ? 'B-' : 'B+');

    // Cover 6 Diagnostic
    const c6Grade = (c2HasHoneyHole || c4HasCrossers) ? 'A' : 'B+';

    return {
      cover_0: {
        coverage: 'cover_0',
        name: 'Cover 0 (Zero Blitz)',
        shortDescription: 'All-out pressure, zero deep safety help.',
        ratingGrade: c0Grade as any,
        advantage: c0Advantage ? 'offense' : 'neutral',
        summary: c0Advantage 
          ? 'Exceptional hot options. Quick crosses and slants create natural pick/rub separation against aggressive press defenders before the blitz arrives.'
          : 'High risk vs fast blitz. Add a dedicated hot slant or quick flat dump for immediate release in under 1.4 seconds.',
        conflictDefender: 'Slot Nickel / Blitzing Linebacker',
        coachingTip: 'QB must set a 1-step or 3-step rapid drop and throw hot to the side of the free rusher immediately.',
        hotReadRecommendation: 'Check to Quick Slant or Bubble screen to punish the blitz vacuum.'
      },
      cover_1: {
        coverage: 'cover_1',
        name: 'Cover 1 (Man Free)',
        shortDescription: 'Man coverage underneath with single deep safety in middle.',
        ratingGrade: c1Grade as any,
        advantage: crossingRoutes >= 1 ? 'offense' : 'neutral',
        summary: crossingRoutes >= 1
          ? 'Crossing routes exploit man coverage across the field, pulling defenders away from the lone deep centerfield safety.'
          : 'Man leverage will challenge straight vertical stems. Utilize switch releases or pivot cuts to break open.',
        conflictDefender: 'Deep Free Safety (Middle 1/3)',
        coachingTip: 'Use eyes to hold the single-high safety on the hash before firing to your crossing receiver breaking away from trailing coverage.',
        hotReadRecommendation: 'Mesh crossers or deep out routes away from safety rotation.'
      },
      cover_2: {
        coverage: 'cover_2',
        name: 'Cover 2 (Tampa / 2-Deep Zone)',
        shortDescription: '2 half-field safeties, 5 underneath zone defenders.',
        ratingGrade: c2Grade as any,
        advantage: (c2HasHoneyHole || c2MiddleSeam) ? 'offense' : 'neutral',
        summary: c2HasHoneyHole
          ? 'Textbook Cover 2 beater! The high-low stretch puts the cloud boundary cornerback in conflict, opening the honey hole between 15-22 yards on the sideline.'
          : c2MiddleSeam
          ? 'Middle hole shot: Multiple vertical stems split the two deep half safeties down the middle of the field.'
          : 'Cornerbacks sit aggressively in the flat. Avoid throwing quick boundary screens into their eyes.',
        conflictDefender: 'Cloud Cornerback & Mike Linebacker',
        coachingTip: 'Read the boundary cornerback: if he sinks with the corner route, dump to the flat; if he clamps the flat, drop the ball in the honey hole over his helmet.',
        hotReadRecommendation: 'Smash concept (Hitch underneath + Flag/Corner route overtop).'
      },
      cover_3: {
        coverage: 'cover_3',
        name: 'Cover 3 (3-Deep Zone)',
        shortDescription: '3 deep thirds, 4 underneath flat/hook defenders.',
        ratingGrade: c3Grade as any,
        advantage: c3HasFlood ? 'offense' : 'neutral',
        summary: c3HasFlood
          ? 'Devastating 3-level flood stretch! Overloads the deep-third corner and single curl/flat defender horizontally and vertically.'
          : '3 deep defenders protect the perimeter boundary well. Attack the seams and the open curl/flat windows between hash and numbers.',
        conflictDefender: 'Curl / Flat Defender (Apex Linebacker or Nickel)',
        coachingTip: 'High-low read on the apex defender: if he expands to the numbers, rip the dig/in route behind his earhole in the hook window.',
        hotReadRecommendation: 'Sail / Flood Concept or 4-Vertical Seams.'
      },
      cover_4: {
        coverage: 'cover_4',
        name: 'Cover 4 (Quarters Match)',
        shortDescription: '4 deep quarters defenders reading #2 releases.',
        ratingGrade: c4Grade as any,
        advantage: c4HasCrossers ? 'offense' : 'neutral',
        summary: c4HasCrossers
          ? 'Underneath mesh crossers and dig routes capitalize on deep-retreating safeties and cushions.'
          : 'Safeties maintain top leverage on 4-vertical shots. Use play-action or intermediate in-breaking routes in the 10-14 yard intermediate void.',
        conflictDefender: 'Weakside Inside Linebacker / Robber Safety',
        coachingTip: 'Attack underneath the deep cushion with 10-12 yard intermediate crossers before the safeties can trigger down downhill.',
        hotReadRecommendation: 'Drive Concept or Levels (In-breaking Dig + Shallow Drag).'
      },
      cover_6: {
        coverage: 'cover_6',
        name: 'Cover 6 (Quarter-Quarter-Half)',
        shortDescription: 'Split field defense (Cover 4 to field, Cover 2 to boundary).',
        ratingGrade: c6Grade as any,
        advantage: 'offense',
        summary: 'Boundary Cover-2 side offers soft honey hole window, while field Cover-4 side is susceptible to intermediate horizontal crosses and speed outs.',
        conflictDefender: 'Boundary Corner & Field Nickel',
        coachingTip: 'Identify the passing strength side at the line of scrimmage and attack the boundary half-safety matchup with your primary X receiver.',
        hotReadRecommendation: 'Boundary Smash / Field Dagger combo.'
      }
    };
  }, [routeMetrics]);

  const activeDiag = diagnostics[selectedCoverage];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Tactical Coverage Diagnostic</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                  AI Defense Breaker
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Live matchup diagnostics of <span className="text-emerald-400 font-semibold">"{playTitle}"</span> against standard defensive coverages.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Coverage Selector Tabs */}
        <div className="p-3 sm:px-6 bg-neutral-900/40 border-b border-neutral-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {COVERAGES.map((cov) => {
            const isSelected = selectedCoverage === cov.id;
            const diag = diagnostics[cov.id];
            const isHighGrade = diag.ratingGrade === 'A+' || diag.ratingGrade === 'A';
            return (
              <button
                key={cov.id}
                onClick={() => setSelectedCoverage(cov.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span>{cov.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black ${
                    isHighGrade
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/30 text-amber-300'
                  }`}
                >
                  {diag.ratingGrade}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Visual Tactical Chalkboard with Coverage Overlay */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Live Field Matchup & Open Grass Heatmap
              </span>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                  showHeatmap 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
              >
                {showHeatmap ? '🔥 Heatmap Active' : 'Heatmap Hidden'}
              </button>
            </div>

            {/* Field Canvas Preview */}
            <div className="relative aspect-[16/10] bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              <svg viewBox="0 0 800 500" className="w-full h-full">
                {/* Grass Field Background */}
                <rect width="800" height="500" fill="#0d1f15" />
                
                {/* Field Grid Markings */}
                <g stroke="rgba(255,255,255,0.08)" strokeWidth="1">
                  <line x1="0" y1="100" x2="800" y2="100" />
                  <line x1="0" y1="200" x2="800" y2="200" />
                  <line x1="0" y1="300" x2="800" y2="300" />
                  <line x1="0" y1="400" x2="800" y2="400" />
                  {/* Hashes */}
                  <line x1="300" y1="0" x2="300" y2="500" strokeDasharray="6 6" />
                  <line x1="500" y1="0" x2="500" y2="500" strokeDasharray="6 6" />
                  {/* Line of scrimmage */}
                  <line x1="0" y1="350" x2="800" y2="350" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
                </g>

                {/* Open Grass Heatmap Zones based on Selected Coverage */}
                {showHeatmap && (
                  <g className="transition-all duration-500 animate-pulse opacity-40">
                    {selectedCoverage === 'cover_2' && (
                      <>
                        {/* Honey Holes on Sidelines */}
                        <ellipse cx="140" cy="180" rx="90" ry="50" fill="#10b981" filter="blur(15px)" />
                        <ellipse cx="660" cy="180" rx="90" ry="50" fill="#10b981" filter="blur(15px)" />
                        {/* Deep Middle Hole */}
                        <ellipse cx="400" cy="120" rx="80" ry="40" fill="#38bdf8" filter="blur(15px)" />
                      </>
                    )}
                    {selectedCoverage === 'cover_3' && (
                      <>
                        {/* Curl / Flat Windows */}
                        <ellipse cx="200" cy="270" rx="80" ry="45" fill="#10b981" filter="blur(15px)" />
                        <ellipse cx="600" cy="270" rx="80" ry="45" fill="#10b981" filter="blur(15px)" />
                        {/* Seams between safeties and corners */}
                        <ellipse cx="300" cy="160" rx="50" ry="60" fill="#f59e0b" filter="blur(15px)" />
                        <ellipse cx="500" cy="160" rx="50" ry="60" fill="#f59e0b" filter="blur(15px)" />
                      </>
                    )}
                    {selectedCoverage === 'cover_0' && (
                      <>
                        {/* Entire deep middle & flats in open space */}
                        <ellipse cx="400" cy="180" rx="260" ry="90" fill="#10b981" filter="blur(25px)" />
                      </>
                    )}
                    {selectedCoverage === 'cover_1' && (
                      <>
                        {/* Boundary sidelines away from single high */}
                        <ellipse cx="180" cy="210" rx="90" ry="60" fill="#10b981" filter="blur(15px)" />
                        <ellipse cx="620" cy="210" rx="90" ry="60" fill="#10b981" filter="blur(15px)" />
                      </>
                    )}
                    {selectedCoverage === 'cover_4' && (
                      <>
                        {/* Underneath Intermediate Hook/Curl */}
                        <ellipse cx="400" cy="260" rx="140" ry="50" fill="#10b981" filter="blur(15px)" />
                        <ellipse cx="200" cy="300" rx="70" ry="40" fill="#38bdf8" filter="blur(15px)" />
                        <ellipse cx="600" cy="300" rx="70" ry="40" fill="#38bdf8" filter="blur(15px)" />
                      </>
                    )}
                    {selectedCoverage === 'cover_6' && (
                      <>
                        <ellipse cx="640" cy="190" rx="80" ry="50" fill="#10b981" filter="blur(15px)" />
                        <ellipse cx="320" cy="260" rx="110" ry="45" fill="#38bdf8" filter="blur(15px)" />
                      </>
                    )}
                  </g>
                )}

                {/* Render Defensive Coverage Shell Ghost Markers */}
                <g opacity="0.75">
                  {selectedCoverage === 'cover_2' && (
                    <>
                      {/* 2 Deep Safeties */}
                      <circle cx="280" cy="110" r="14" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                      <text x="280" y="114" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">SS</text>
                      <circle cx="520" cy="110" r="14" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                      <text x="520" y="114" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">FS</text>
                      {/* 2 Cloud CBs in flats */}
                      <circle cx="120" cy="300" r="12" fill="#ef4444" opacity="0.8" />
                      <text x="120" y="304" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">CB</text>
                      <circle cx="680" cy="300" r="12" fill="#ef4444" opacity="0.8" />
                      <text x="680" y="304" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">CB</text>
                      {/* Underneath LBs */}
                      <circle cx="330" cy="260" r="12" fill="#ef4444" opacity="0.8" />
                      <text x="330" y="264" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">W</text>
                      <circle cx="400" cy="240" r="12" fill="#ef4444" opacity="0.8" />
                      <text x="400" y="244" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">M</text>
                      <circle cx="470" cy="260" r="12" fill="#ef4444" opacity="0.8" />
                      <text x="470" y="264" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">S</text>
                    </>
                  )}
                  {selectedCoverage === 'cover_3' && (
                    <>
                      {/* Single High Free Safety */}
                      <circle cx="400" cy="90" r="14" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                      <text x="400" y="94" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">FS</text>
                      {/* 2 Deep-Third Corners */}
                      <circle cx="130" cy="140" r="12" fill="#ef4444" stroke="#fff" strokeWidth="1" />
                      <text x="130" y="144" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">CB</text>
                      <circle cx="670" cy="140" r="12" fill="#ef4444" stroke="#fff" strokeWidth="1" />
                      <text x="670" y="144" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">CB</text>
                    </>
                  )}
                  {selectedCoverage === 'cover_0' && (
                    <>
                      {/* Blitzers on LOS */}
                      <circle cx="340" cy="320" r="12" fill="#ef4444" />
                      <text x="340" y="324" fill="#fff" fontSize="8" fontWeight="black" textAnchor="middle">BLITZ</text>
                      <circle cx="460" cy="320" r="12" fill="#ef4444" />
                      <text x="460" y="324" fill="#fff" fontSize="8" fontWeight="black" textAnchor="middle">BLITZ</text>
                    </>
                  )}
                </g>

                {/* Render Play Routes */}
                {offensivePlayers.map((p) => {
                  if (!p.route || p.route.length === 0) return null;
                  const pts = [{ x: p.x, y: p.y }, ...p.route];
                  const d = `M ${pts.map(pt => `${pt.x},${pt.y}`).join(' L ')}`;
                  const endPt = p.route[p.route.length - 1];

                  return (
                    <g key={p.id}>
                      <path
                        d={d}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* End Arrow */}
                      <circle cx={endPt.x} cy={endPt.y} r="5" fill="#10b981" />
                    </g>
                  );
                })}

                {/* Render Offensive Players */}
                {offensivePlayers.map((p) => (
                  <g key={`player-${p.id}`} transform={`translate(${p.x},${p.y})`}>
                    <circle r="14" fill="#10b981" stroke="#fff" strokeWidth="2" />
                    <text textAnchor="middle" dy="4" fill="#000" fontSize="10" fontWeight="900">
                      {p.label}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Live Overlay Legend */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-neutral-800 text-[10px] text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Offensive Routes
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  Defensive Shell
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60 blur-[1px]"></span>
                  Targeted Open Grass
                </span>
              </div>
            </div>

            {/* Quick Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-[10px] text-neutral-400 font-semibold uppercase">Vertical Stems</div>
                <div className="text-base font-black text-white">{routeMetrics.deepRoutes}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-[10px] text-neutral-400 font-semibold uppercase">Crossing Stems</div>
                <div className="text-base font-black text-white">{routeMetrics.crossingRoutes}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-[10px] text-neutral-400 font-semibold uppercase">Perimeter Flats</div>
                <div className="text-base font-black text-white">{routeMetrics.flatRoutes}</div>
              </div>
            </div>
          </div>

          {/* Right Column: In-Depth Diagnostic Report */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            
            {/* Rating Banner */}
            <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Matchup Efficiency Grade</span>
                <h3 className="text-xl font-black text-white">{activeDiag.name}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{activeDiag.shortDescription}</p>
              </div>

              <div className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg border ${
                  activeDiag.ratingGrade.startsWith('A')
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : activeDiag.ratingGrade.startsWith('B')
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}>
                  {activeDiag.ratingGrade}
                </div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase mt-1">
                  {activeDiag.advantage === 'offense' ? 'Heavy Advantage' : 'Balanced'}
                </span>
              </div>
            </div>

            {/* Tactical Breakdown Details */}
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-3.5">
              
              <div>
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Tactical Concept Analysis
                </span>
                <p className="text-xs text-neutral-300 leading-relaxed mt-1">
                  {activeDiag.summary}
                </p>
              </div>

              <div className="h-px bg-neutral-800" />

              <div>
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Key Conflict Defender to Read
                </span>
                <p className="text-xs font-semibold text-white mt-1">
                  {activeDiag.conflictDefender}
                </p>
              </div>

              <div className="h-px bg-neutral-800" />

              <div>
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  QB Coaching Read & Progression Queue
                </span>
                <p className="text-xs text-neutral-300 leading-relaxed mt-1">
                  {activeDiag.coachingTip}
                </p>
              </div>

              {activeDiag.hotReadRecommendation && (
                <>
                  <div className="h-px bg-neutral-800" />
                  <div>
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Audible / Hot Route Adjustment
                    </span>
                    <p className="text-xs text-neutral-300 leading-relaxed mt-1">
                      {activeDiag.hotReadRecommendation}
                    </p>
                  </div>
                </>
              )}

            </div>

          </div>

        </div>

        {/* Sticky Visible Responsive Footer */}
        <div className="sticky bottom-0 z-20 p-4 sm:p-5 border-t border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-neutral-400 flex items-center gap-2 self-start sm:self-center">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Updates automatically as you add, modify, or stretch player routes on the board.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all shadow-md shadow-emerald-950 active:scale-95 cursor-pointer text-center"
          >
            Done Reviewing
          </button>
        </div>

      </div>
    </div>
  );
}
