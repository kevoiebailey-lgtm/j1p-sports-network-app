import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Zap, 
  RotateCw, 
  Flame, 
  ArrowRight, 
  CheckCircle2, 
  Compass, 
  Sliders, 
  X, 
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { PlayerNode, SportType } from './types';

interface PlaybookAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerNode[];
  selectedSport: SportType;
  playTitle: string;
  onApplyPlayVariant: (newPlayers: PlayerNode[], newTitle: string, newDesc: string) => void;
}

interface CounterSuggestion {
  id: string;
  title: string;
  subtitle: string;
  rationale: string;
  tag: string;
  applyChanges: (current: PlayerNode[]) => PlayerNode[];
}

export function PlaybookAIModal({
  isOpen,
  onClose,
  players,
  selectedSport,
  playTitle,
  onApplyPlayVariant,
}: PlaybookAIModalProps) {
  const [activeTab, setActiveTab] = useState<'counters' | 'spacing' | 'protection'>('counters');
  const [appliedId, setAppliedId] = useState<string | null>(null);

  // Dynamic Counter Variations based on Current Playboard State
  const counterSuggestions: CounterSuggestion[] = [
    {
      id: 'double_move_sluggo',
      title: 'Double Move / Sluggo Wheel',
      subtitle: 'Attacks biting cornerbacks and jumping safeties',
      tag: 'Big Play Shot',
      rationale: 'When the defense aggressively triggers on underneath slants or out routes, the receiver sells the 3-step plant and blows vertically over top for a touchdown.',
      applyChanges: (prev) => {
        return prev.map((p) => {
          if (p.id === 'wr1' || p.id === 'x') {
            return {
              ...p,
              route: [{ x: p.x + 40, y: p.y - 40 }, { x: p.x, y: 100 }],
              progression: '1'
            };
          }
          if (p.id === 'slot' || p.id === 'y' || p.id === 'h') {
            return {
              ...p,
              route: [{ x: p.x - 40, y: p.y - 20 }, { x: p.x + 80, y: 120 }],
              progression: '2'
            };
          }
          return p;
        });
      }
    },
    {
      id: 'mesh_wheel_rail',
      title: 'Mesh Wheel / Rail Constraint',
      subtitle: 'Rubs linebacker coverage for a clean sideline rail',
      tag: 'Redzone Beater',
      rationale: 'Creates an impenetrable natural rub across the middle: the trailing running back or tight end leaks into the vacated wheel corridor behind the mesh.',
      applyChanges: (prev) => {
        return prev.map((p) => {
          if (p.id === 'rb') {
            return {
              ...p,
              route: [{ x: p.x + 80, y: p.y - 20 }, { x: 720, y: 300 }, { x: 720, y: 120 }],
              progression: '1'
            };
          }
          if (p.id === 'wr1' || p.id === 'x') {
            return {
              ...p,
              route: [{ x: p.x, y: 260 }, { x: 650, y: 260 }],
              progression: '2'
            };
          }
          if (p.id === 'wr2' || p.id === 'z') {
            return {
              ...p,
              route: [{ x: p.x, y: 280 }, { x: 150, y: 280 }],
              progression: '3'
            };
          }
          return p;
        });
      }
    },
    {
      id: 'naked_bootleg_flood',
      title: 'Naked Bootleg Keeper & Slide',
      subtitle: 'QB rolls away from play-action flow with 3-level stretch',
      tag: 'Play Action Counter',
      rationale: 'Fakes the heavy inside zone, sucking the linebackers and edge rushers downhill, while QB boots out into open grass with high-low options.',
      applyChanges: (prev) => {
        return prev.map((p) => {
          if (p.id === 'qb') {
            return {
              ...p,
              route: [{ x: 520, y: 440 }, { x: 600, y: 390 }],
            };
          }
          if (p.id === 'te' || p.id === 'y' || p.id === 'slot') {
            return {
              ...p,
              route: [{ x: 500, y: 320 }, { x: 680, y: 300 }],
              progression: '1'
            };
          }
          if (p.id === 'wr2' || p.id === 'z') {
            return {
              ...p,
              route: [{ x: p.x, y: 160 }, { x: 720, y: 140 }],
              progression: '2'
            };
          }
          if (p.id === 'wr1' || p.id === 'x') {
            return {
              ...p,
              route: [{ x: p.x, y: 220 }, { x: 500, y: 220 }],
              progression: '3'
            };
          }
          return p;
        });
      }
    },
    {
      id: 'tunnel_screen_throwback',
      title: 'Tunnel Screen Throwback',
      subtitle: 'Wall of offensive blockers sealing the sideline alley',
      tag: 'Screen Constraint',
      rationale: 'Quick 1-step pump fake right, followed by rapid throwback to the X receiver behind a two-man convoy down the left boundary numbers.',
      applyChanges: (prev) => {
        return prev.map((p) => {
          if (p.id === 'wr1' || p.id === 'x') {
            return {
              ...p,
              route: [{ x: p.x + 30, y: 330 }, { x: p.x - 20, y: 340 }, { x: p.x - 20, y: 120 }],
              progression: '1'
            };
          }
          if (p.id === 'slot' || p.id === 'y') {
            return {
              ...p,
              route: [{ x: 100, y: 300 }],
              blocking: 'lead_block'
            };
          }
          return p;
        });
      }
    }
  ];

  // Hash Alignment / Spacing Transformations
  const handleApplyHashSpacing = (type: 'boundary_left' | 'field_right' | 'compressed_bunch' | 'spread_wide') => {
    let updated = [...players];
    if (type === 'boundary_left') {
      // Shift offensive players towards left boundary hash
      updated = updated.map(p => {
        if (p.role === 'offense') {
          return {
            ...p,
            x: Math.max(80, Math.round(p.x * 0.75 + 40)),
            route: p.route.map(pt => ({
              x: Math.max(50, Math.round(pt.x * 0.75 + 40)),
              y: pt.y
            }))
          };
        }
        return p;
      });
    } else if (type === 'field_right') {
      // Shift offensive players towards right wide field
      updated = updated.map(p => {
        if (p.role === 'offense') {
          return {
            ...p,
            x: Math.min(720, Math.round(p.x * 0.75 + 200)),
            route: p.route.map(pt => ({
              x: Math.min(750, Math.round(pt.x * 0.75 + 200)),
              y: pt.y
            }))
          };
        }
        return p;
      });
    } else if (type === 'compressed_bunch') {
      // Condense receiver splits to tight bunch near tackle box
      updated = updated.map(p => {
        if (p.role === 'offense' && p.id !== 'qb' && p.id !== 'c') {
          const targetX = p.x < 400 ? 300 : 500;
          const shift = (targetX - p.x) * 0.6;
          return {
            ...p,
            x: Math.round(p.x + shift),
            route: p.route.map(pt => ({ x: Math.round(pt.x + shift), y: pt.y }))
          };
        }
        return p;
      });
    } else if (type === 'spread_wide') {
      // Maximize boundary numbers splits
      updated = updated.map(p => {
        if (p.role === 'offense' && p.id !== 'qb' && p.id !== 'c') {
          const shift = p.x < 400 ? -50 : 50;
          return {
            ...p,
            x: Math.max(60, Math.min(740, p.x + shift)),
            route: p.route.map(pt => ({ x: Math.max(40, Math.min(760, pt.x + shift)), y: pt.y }))
          };
        }
        return p;
      });
    }

    onApplyPlayVariant(updated, `${playTitle} (${type.replace('_', ' ').toUpperCase()})`, 'Re-spaced tactical alignment optimized for boundary/field leverage.');
    setAppliedId(type);
    setTimeout(() => setAppliedId(null), 2000);
  };

  const handleApplyCounter = (counter: CounterSuggestion) => {
    const modified = counter.applyChanges(players);
    onApplyPlayVariant(modified, counter.title, counter.rationale);
    setAppliedId(counter.id);
    setTimeout(() => {
      setAppliedId(null);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">AI Play Assistant & Counter Engine</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                  Tactical Generator
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Generate complementary constraint plays, double-moves, and automated hash alignments.
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

        {/* Tab Navigation */}
        <div className="p-3 sm:px-6 bg-neutral-900/40 border-b border-neutral-800/80 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('counters')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'counters'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Complementary Counters & Double Moves</span>
          </button>

          <button
            onClick={() => setActiveTab('spacing')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'spacing'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Hash & Split Optimization</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'counters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {counterSuggestions.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-amber-500/50 transition-all flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                        {item.tag}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono font-bold">Counter Option</span>
                    </div>

                    <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-400 font-semibold mt-0.5">{item.subtitle}</p>

                    <p className="text-xs text-neutral-300 leading-relaxed mt-2.5 p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80">
                      {item.rationale}
                    </p>
                  </div>

                  <button
                    onClick={() => handleApplyCounter(item)}
                    className="mt-4 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition-all shadow-md shadow-amber-950 flex items-center justify-center gap-2 active:scale-95"
                  >
                    {appliedId === item.id ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Applied to Chalkboard!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Apply Counter to Board</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'spacing' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                <h3 className="text-sm font-bold text-white mb-1">Hash Spacing & Field Geometry Adjustments</h3>
                <p className="text-xs text-neutral-400">
                  Automatically adjust all player splits, alignments, and route depths based on ball placement on the field.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">Left Boundary Hash Compression</h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Compresses left side splits into the short boundary while creating wide open grass to the field right.
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyHashSpacing('boundary_left')}
                    className="mt-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all"
                  >
                    Apply Left Hash Spacing
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">Right Field Leverage Expansion</h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Maximizes field side space for 3-receiver flood or mesh crossing combinations.
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyHashSpacing('field_right')}
                    className="mt-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all"
                  >
                    Apply Right Field Spacing
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">Condensed Bunch / Stack Splits</h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Pulls receivers tight to the offensive tackle box for redzone rub concepts and perimeter blocking leverage.
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyHashSpacing('compressed_bunch')}
                    className="mt-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all"
                  >
                    Apply Condensed Bunch
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">Maximum Spread (Boundary Numbers)</h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Stretches outside receivers to the top of the numbers to isolate 1-on-1 boundary matchups.
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyHashSpacing('spread_wide')}
                    className="mt-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all"
                  >
                    Apply Max Spread Splits
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Sticky Visible Responsive Footer */}
        <div className="sticky bottom-0 z-20 p-4 sm:p-5 border-t border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-neutral-400 flex items-center gap-1.5 self-start sm:self-center">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">AI adjustments preserve all existing team colors and player IDs.</span>
          </span>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all cursor-pointer text-center"
          >
            Close Assistant
          </button>
        </div>

      </div>
    </div>
  );
}
