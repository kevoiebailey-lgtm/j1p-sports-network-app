import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Compass,
  Check,
  X,
  Target,
  Zap,
  ArrowUpRight,
  Flame,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { PlayerNode, SportType, ProgressionRead } from '../Playbook/types';

export interface ConceptPreset {
  id: string;
  name: string;
  tagline: string;
  category: 'mesh' | 'smash' | 'flood' | 'levels' | 'stick' | 'verts';
  description: string;
  progressionNote: string;
  // Function to apply the verified concept scheme to standard offensive personnel
  buildPlayers: (basePlayers: PlayerNode[]) => PlayerNode[];
}

export const CORE_CONCEPTS_LIBRARY: ConceptPreset[] = [
  {
    id: 'mesh_concept',
    name: 'Mesh Concept',
    tagline: 'Underneath Rub • Natural Man & Zone Pick',
    category: 'mesh',
    description: 'Shallow crosses from WR1 & Slot crossing at 4-5 yds. QB 3-step drop, Center delay flat release, and WR2 deep post over top.',
    progressionNote: '1st Read: WR1/Slot Mesh Cross • 2nd Read: WR2 Deep Post • Checkdown: Center Delay Flat',
    buildPlayers: (base) => {
      return base.map((p) => {
        const idLower = p.id.toLowerCase();
        const labelLower = p.label.toLowerCase();

        // QB 3-step drop
        if (idLower === 'qb' || labelLower === 'qb') {
          return {
            ...p,
            x: 400,
            y: 430,
            route: [{ x: 400, y: 450 }],
            progression: 'none',
            assignedRoute: '3-Step Drop, Read FS',
            readOrder: '',
          };
        }
        // Center: delay flat release
        if (idLower === 'c' || labelLower === 'c') {
          return {
            ...p,
            x: 400,
            y: 350,
            route: [
              { x: 400, y: 340 },
              { x: 480, y: 330 },
              { x: 620, y: 320 },
            ],
            progression: 'checkdown',
            assignedRoute: 'Delay Flat Option',
            readOrder: 'CHK',
          };
        }
        // WR1 (Outside Left): Shallow cross underneath towards right boundary
        if (idLower === 'wr1' || labelLower === 'wr1' || labelLower === 'x') {
          return {
            ...p,
            x: 140,
            y: 350,
            route: [
              { x: 140, y: 320 },
              { x: 260, y: 300 },
              { x: 600, y: 300 },
            ],
            progression: '1',
            assignedRoute: 'Shallow Cross Right',
            readOrder: '1st Read',
          };
        }
        // Slot: Shallow cross over top of WR1 mesh towards left boundary
        if (idLower === 'slot' || labelLower === 'slot' || labelLower === 'y') {
          return {
            ...p,
            x: 280,
            y: 350,
            route: [
              { x: 280, y: 310 },
              { x: 380, y: 285 },
              { x: 160, y: 285 },
            ],
            progression: '1',
            assignedRoute: 'Shallow Cross Left (Under)',
            readOrder: '2nd Read',
          };
        }
        // WR2 (Outside Right): Deep post over the top
        if (idLower === 'wr2' || labelLower === 'wr2' || labelLower === 'z') {
          return {
            ...p,
            x: 660,
            y: 350,
            route: [
              { x: 660, y: 220 },
              { x: 450, y: 110 },
            ],
            progression: '2',
            assignedRoute: 'Deep Post (Clear-Out)',
            readOrder: 'CLR',
          };
        }
        return p;
      });
    },
  },
  {
    id: 'smash_concept',
    name: 'Smash Concept',
    tagline: 'High-Low Corner Route • Cover 2 Beater',
    category: 'smash',
    description: 'Outside hitch at 5 yards to pull down boundary corner, paired with inside receiver 12-yard corner route into the honey hole.',
    progressionNote: '1st Read: Inside Corner Route • 2nd Read: Outside 5-yd Hitch • Checkdown: Center Underneath',
    buildPlayers: (base) => {
      return base.map((p) => {
        const idLower = p.id.toLowerCase();
        const labelLower = p.label.toLowerCase();

        if (idLower === 'qb' || labelLower === 'qb') {
          return { ...p, x: 400, y: 430, route: [{ x: 400, y: 445 }], progression: 'none', assignedRoute: 'Shotgun 3-Step, Read CB', readOrder: '' };
        }
        if (idLower === 'c' || labelLower === 'c') {
          return {
            ...p,
            x: 400,
            y: 350,
            route: [{ x: 400, y: 310 }],
            progression: 'checkdown',
            assignedRoute: 'Quick Check Flat',
            readOrder: 'CHK',
          };
        }
        // WR1: Outside hitch (5 yds)
        if (idLower === 'wr1' || labelLower === 'wr1' || labelLower === 'x') {
          return {
            ...p,
            x: 150,
            y: 350,
            route: [
              { x: 150, y: 300 },
              { x: 145, y: 310 },
            ],
            progression: '2',
            assignedRoute: '5-Yd Hitch (Hold CB)',
            readOrder: '2nd Read',
          };
        }
        // Slot: Inside corner route (12 yds)
        if (idLower === 'slot' || labelLower === 'slot' || labelLower === 'y') {
          return {
            ...p,
            x: 270,
            y: 350,
            route: [
              { x: 270, y: 230 },
              { x: 110, y: 120 },
            ],
            progression: '1',
            assignedRoute: '12-Yd Corner (Honey Hole)',
            readOrder: '1st Read',
          };
        }
        // WR2: Deep backside clear-out post
        if (idLower === 'wr2' || labelLower === 'wr2' || labelLower === 'z') {
          return {
            ...p,
            x: 650,
            y: 350,
            route: [
              { x: 650, y: 200 },
              { x: 500, y: 90 },
            ],
            progression: 'clearout',
            assignedRoute: 'Backside Post Clearout',
            readOrder: 'CLR',
          };
        }
        return p;
      });
    },
  },
  {
    id: 'flood_sail_concept',
    name: 'Flood / Sail Concept',
    tagline: '3-Level Sideline Stretch • Cover 3 & Quarters Killer',
    category: 'flood',
    description: 'Classic 3-level vertical overload to one side: Deep streak (clear-out), 10-yard intermediate out (sail), and quick flat route.',
    progressionNote: '1st Read: 10-Yd Out / Sail • 2nd Read: Flat Route • Clear-Out: Deep Streak',
    buildPlayers: (base) => {
      return base.map((p) => {
        const idLower = p.id.toLowerCase();
        const labelLower = p.label.toLowerCase();

        if (idLower === 'qb' || labelLower === 'qb') {
          return { ...p, x: 400, y: 430, route: [{ x: 400, y: 445 }], progression: 'none', assignedRoute: 'Half-Roll Right, Read Sail to Flat', readOrder: '' };
        }
        // WR1 (Field Streak): Clear-out deep streak
        if (idLower === 'wr1' || labelLower === 'wr1' || labelLower === 'x') {
          return {
            ...p,
            x: 140,
            y: 350,
            route: [{ x: 140, y: 90 }],
            progression: 'clearout',
            assignedRoute: 'Deep Go / Clear-Out',
            readOrder: 'CLR',
          };
        }
        // Slot (Sail): 10-yard intermediate out
        if (idLower === 'slot' || labelLower === 'slot' || labelLower === 'y') {
          return {
            ...p,
            x: 260,
            y: 350,
            route: [
              { x: 260, y: 230 },
              { x: 90, y: 230 },
            ],
            progression: '1',
            assignedRoute: '10-Yd Sail / Out Cut',
            readOrder: '1st Read',
          };
        }
        // Center: Flat route release to the sideline
        if (idLower === 'c' || labelLower === 'c') {
          return {
            ...p,
            x: 400,
            y: 350,
            route: [
              { x: 340, y: 340 },
              { x: 180, y: 320 },
            ],
            progression: '2',
            assignedRoute: 'Flat Route Release',
            readOrder: '2nd Read',
          };
        }
        // WR2: Backside dig / checkdown
        if (idLower === 'wr2' || labelLower === 'wr2' || labelLower === 'z') {
          return {
            ...p,
            x: 650,
            y: 350,
            route: [
              { x: 650, y: 240 },
              { x: 450, y: 240 },
            ],
            progression: 'checkdown',
            assignedRoute: 'Backside Dig Checkdown',
            readOrder: 'CHK',
          };
        }
        return p;
      });
    },
  },
  {
    id: 'levels_concept',
    name: 'Levels Concept',
    tagline: 'Dual In/Dig Cuts • Middle Linebacker Hi-Lo',
    category: 'levels',
    description: 'Dual in/dig routes crossing in the same vertical window at 5 yards and 10 yards. Puts middle zone linebackers in an impossible bind.',
    progressionNote: '1st Read: Shallow In (5 yds) • 2nd Read: Deep Dig (10 yds) • Checkdown: Center Flat',
    buildPlayers: (base) => {
      return base.map((p) => {
        const idLower = p.id.toLowerCase();
        const labelLower = p.label.toLowerCase();

        if (idLower === 'qb' || labelLower === 'qb') {
          return { ...p, x: 400, y: 430, route: [{ x: 400, y: 445 }], progression: 'none', assignedRoute: 'Shotgun 5-Step, Hi-Lo Read', readOrder: '' };
        }
        // Slot: Shallow In at 5 yds (Y: 300)
        if (idLower === 'slot' || labelLower === 'slot' || labelLower === 'y') {
          return {
            ...p,
            x: 270,
            y: 350,
            route: [
              { x: 270, y: 300 },
              { x: 550, y: 300 },
            ],
            progression: '1',
            assignedRoute: '5-Yd Shallow In',
            readOrder: '1st Read',
          };
        }
        // WR1: Deep Dig at 10 yds (Y: 230)
        if (idLower === 'wr1' || labelLower === 'wr1' || labelLower === 'x') {
          return {
            ...p,
            x: 140,
            y: 350,
            route: [
              { x: 140, y: 230 },
              { x: 520, y: 230 },
            ],
            progression: '2',
            assignedRoute: '10-Yd Deep Dig',
            readOrder: '2nd Read',
          };
        }
        // Center: Underneath outlet flat
        if (idLower === 'c' || labelLower === 'c') {
          return {
            ...p,
            x: 400,
            y: 350,
            route: [
              { x: 450, y: 340 },
              { x: 620, y: 330 },
            ],
            progression: 'checkdown',
            assignedRoute: 'Outlet Center Flat',
            readOrder: 'CHK',
          };
        }
        // WR2: Deep vertical post clear-out
        if (idLower === 'wr2' || labelLower === 'wr2' || labelLower === 'z') {
          return {
            ...p,
            x: 660,
            y: 350,
            route: [
              { x: 660, y: 190 },
              { x: 500, y: 90 },
            ],
            progression: 'clearout',
            assignedRoute: 'Deep Post Clear-Out',
            readOrder: 'CLR',
          };
        }
        return p;
      });
    },
  },
  {
    id: 'stick_concept',
    name: 'Stick Concept',
    tagline: 'Quick 3-Step Rhythm • Outside Vertical Clearance',
    category: 'stick',
    description: 'Outside receiver runs a vertical streak to clear the boundary defender, while inside slot runs a 5-yard stick option finding soft grass.',
    progressionNote: '1st Read: 5-Yd Stick Option • 2nd Read: Delay Flat • Clear-Out: Outside Streak',
    buildPlayers: (base) => {
      return base.map((p) => {
        const idLower = p.id.toLowerCase();
        const labelLower = p.label.toLowerCase();

        if (idLower === 'qb' || labelLower === 'qb') {
          return { ...p, x: 400, y: 430, route: [{ x: 400, y: 445 }], progression: 'none', assignedRoute: 'Quick 3-Step Rhythm, Read Mike', readOrder: '' };
        }
        // WR1: Outside vertical clearance
        if (idLower === 'wr1' || labelLower === 'wr1' || labelLower === 'x') {
          return {
            ...p,
            x: 140,
            y: 350,
            route: [{ x: 140, y: 90 }],
            progression: 'clearout',
            assignedRoute: 'Deep Fade / Clear-Out',
            readOrder: 'CLR',
          };
        }
        // Slot: 5-yd stick option (turns out or sits)
        if (idLower === 'slot' || labelLower === 'slot' || labelLower === 'y') {
          return {
            ...p,
            x: 270,
            y: 350,
            route: [
              { x: 270, y: 295 },
              { x: 240, y: 300 },
            ],
            progression: '1',
            assignedRoute: 'Option Stick (5 yds)',
            readOrder: '1st Read',
          };
        }
        // Center: Delay flat to stick side
        if (idLower === 'c' || labelLower === 'c') {
          return {
            ...p,
            x: 400,
            y: 350,
            route: [
              { x: 350, y: 340 },
              { x: 200, y: 330 },
            ],
            progression: '2',
            assignedRoute: 'Delay Flat Release',
            readOrder: '2nd Read',
          };
        }
        // WR2: Backside slant checkdown
        if (idLower === 'wr2' || labelLower === 'wr2' || labelLower === 'z') {
          return {
            ...p,
            x: 660,
            y: 350,
            route: [
              { x: 660, y: 310 },
              { x: 500, y: 240 },
            ],
            progression: 'checkdown',
            assignedRoute: 'Backside Slant / Hitch',
            readOrder: 'CHK',
          };
        }
        return p;
      });
    },
  },
];

// Tactile Individual Routes for Quick Carousel
export const TACTILE_ROUTES_LIBRARY = [
  {
    id: 'slant',
    name: 'Slant',
    desc: '3-step plant, 45° diagonal cut inside',
    generate: (x: number, y: number) => [
      { x, y: y - 25 },
      { x: x > 400 ? x - 120 : x + 120, y: y - 85 },
    ],
  },
  {
    id: 'out',
    name: 'Out',
    desc: '10-yd stem with crisp 90° break to sideline',
    generate: (x: number, y: number) => [
      { x, y: y - 75 },
      { x: x > 400 ? x + 110 : x - 110, y: y - 75 },
    ],
  },
  {
    id: 'hitch',
    name: 'Hitch',
    desc: '5-yd vertical stem, sudden stop and turn to QB',
    generate: (x: number, y: number) => [
      { x, y: y - 45 },
      { x: x > 400 ? x - 8 : x + 8, y: y - 35 },
    ],
  },
  {
    id: 'post',
    name: 'Post',
    desc: '12-yd stem, 45° cut towards the goalpost',
    generate: (x: number, y: number) => [
      { x, y: y - 110 },
      { x: x > 400 ? x - 140 : x + 140, y: y - 220 },
    ],
  },
  {
    id: 'corner',
    name: 'Corner',
    desc: '10-yd stem, 45° cut towards the pylon',
    generate: (x: number, y: number) => [
      { x, y: y - 100 },
      { x: x > 400 ? x + 130 : x - 130, y: y - 190 },
    ],
  },
  {
    id: 'wheel',
    name: 'Wheel',
    desc: 'Flat trajectory before turning vertical up sideline',
    generate: (x: number, y: number) => [
      { x: x > 400 ? x + 80 : x - 80, y: y - 15 },
      { x: x > 400 ? x + 100 : x - 100, y: y - 80 },
      { x: x > 400 ? x + 100 : x - 100, y: y - 220 },
    ],
  },
  {
    id: 'dig',
    name: 'Dig',
    desc: '12-yd vertical stem with square 90° cut over middle',
    generate: (x: number, y: number) => [
      { x, y: y - 95 },
      { x: x > 400 ? x - 160 : x + 160, y: y - 95 },
    ],
  },
];

export interface RouteLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayer: PlayerNode | null;
  allPlayers: PlayerNode[];
  onApplyConcept: (newPlayers: PlayerNode[], conceptName: string) => void;
  onApplyRouteToPlayer: (playerId: string, route: { x: number; y: number }[], routeName: string) => void;
  onUpdateProgression?: (playerId: string, prog: ProgressionRead) => void;
}

export const RouteLibraryModal: React.FC<RouteLibraryModalProps> = ({
  isOpen,
  onClose,
  selectedPlayer,
  allPlayers,
  onApplyConcept,
  onApplyRouteToPlayer,
  onUpdateProgression,
}) => {
  const [activeTab, setActiveTab] = useState<'concepts' | 'routes'>('concepts');
  const [appliedConceptId, setAppliedConceptId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Tactical Concept & Route Library
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                  Verified Schemes
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Instantly populate your playboard with championship passing concepts and route tree cuts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 sm:px-6 bg-neutral-900/40 border-b border-neutral-800/80 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('concepts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'concepts'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Preloaded Concepts (Quick-Load)</span>
          </button>

          <button
            onClick={() => setActiveTab('routes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'routes'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Tactile Route Wheel ({selectedPlayer?.label || 'Token'})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'concepts' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CORE_CONCEPTS_LIBRARY.map((concept) => (
                <div
                  key={concept.id}
                  className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                        Verified Concept
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono font-bold">5-Player Scheme</span>
                    </div>

                    <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                      {concept.name}
                    </h3>
                    <p className="text-xs text-emerald-400/90 font-semibold mt-0.5">{concept.tagline}</p>

                    <p className="text-xs text-neutral-300 leading-relaxed mt-2.5 p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80">
                      {concept.description}
                    </p>

                    <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-neutral-950/50 border border-neutral-800/60 text-[11px] text-neutral-400">
                      <span className="text-neutral-300 font-bold">Progression: </span>
                      {concept.progressionNote}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const updated = concept.buildPlayers(allPlayers);
                      onApplyConcept(updated, concept.name);
                      setAppliedConceptId(concept.id);
                      setTimeout(() => setAppliedConceptId(null), 2500);
                    }}
                    className="mt-4 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all shadow-md shadow-emerald-950 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    {appliedConceptId === concept.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Scheme Loaded to Field!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Load Scheme to Field</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {selectedPlayer ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      Tactile Route Wheel for Position:{' '}
                      <span className="text-emerald-400 font-black font-mono text-sm">
                        {selectedPlayer.label}
                      </span>
                    </span>
                    <span className="text-xs text-neutral-500">
                      Routes automatically adjust break directions based on field alignment
                    </span>
                  </div>

                  {/* Progression Tagging */}
                  {onUpdateProgression && (
                    <div className="mb-6 p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                      <span className="text-xs font-bold text-neutral-300 block mb-2">
                        Progression Order Assignment:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: '1', label: '1st Read', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
                          { id: '2', label: '2nd Read', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                          { id: 'checkdown', label: 'Checkdown / Outlet', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
                          { id: 'clearout', label: 'Clear-Out', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
                        ].map((prog) => {
                          const isActive = selectedPlayer.progression === prog.id;
                          return (
                            <button
                              key={prog.id}
                              onClick={() => onUpdateProgression(selectedPlayer.id, prog.id as ProgressionRead)}
                              className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                isActive
                                  ? `${prog.color} ring-2 ring-emerald-400/50 shadow-md`
                                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                              }`}
                            >
                              {prog.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Route Carousel */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {TACTILE_ROUTES_LIBRARY.map((route) => (
                      <button
                        key={route.id}
                        onClick={() => {
                          const points = route.generate(selectedPlayer.x, selectedPlayer.y);
                          onApplyRouteToPlayer(selectedPlayer.id, points, route.name);
                        }}
                        className="p-3 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/60 hover:bg-neutral-850 text-left transition-all group flex flex-col justify-between cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                              {route.name}
                            </span>
                            <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                          </div>
                          <p className="text-xs text-neutral-400 mt-1">{route.desc}</p>
                        </div>
                        <span className="mt-3 text-[10px] font-bold text-emerald-400 font-mono">
                          Tap to Apply
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-neutral-400">
                  <Target className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                  <p className="text-sm font-semibold">Please select a player node on the field first.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Visible Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between shrink-0">
          <span className="text-xs text-neutral-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Preset concepts dynamically recalculate according to player starting points.</span>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Close Library
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteLibraryModal;
