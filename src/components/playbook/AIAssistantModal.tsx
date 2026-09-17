import React, { useState } from 'react';
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
  ArrowUpRight,
  Shield,
  Check,
} from 'lucide-react';
import { PlayerNode, SportType } from '../Playbook/types';

export interface AIAssistantModalProps {
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

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  players,
  selectedSport,
  playTitle,
  onApplyPlayVariant,
}) => {
  const [activeTab, setActiveTab] = useState<'counters' | 'spacing' | 'protection'>('counters');
  const [selectedCounterId, setSelectedCounterId] = useState<string>('double_move_sluggo');
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const counterSuggestions: CounterSuggestion[] = [
    {
      id: 'double_move_sluggo',
      title: 'Double Move / Sluggo Wheel',
      subtitle: 'Attacks biting cornerbacks and jumping safeties',
      tag: 'Big Play Shot',
      rationale:
        'When the defense aggressively jumps underneath slants or out routes, receiver sells the 3-step plant and blows vertically over top for a touchdown.',
      applyChanges: (prev) => {
        return prev.map((p) => {
          if (p.id === 'wr1' || p.label.toLowerCase() === 'wr1' || p.label.toLowerCase() === 'x') {
            return {
              ...p,
              route: [
                { x: p.x + 35, y: p.y - 35 },
                { x: p.x, y: 100 },
              ],
              progression: '1',
            };
          }
          if (p.id === 'slot' || p.label.toLowerCase() === 'slot' || p.label.toLowerCase() === 'y') {
            return {
              ...p,
              route: [
                { x: p.x - 30, y: p.y - 20 },
                { x: p.x + 90, y: 110 },
              ],
              progression: '2',
            };
          }
          return p;
        });
      },
    },
    {
      id: 'mesh_wheel_rail',
      title: 'Mesh Wheel / Rail Constraint',
      subtitle: 'Rubs linebacker coverage for a clean sideline rail',
      tag: 'Redzone Beater',
      rationale:
        'Creates an impenetrable natural rub across the middle: the trailing running back or tight end leaks into the vacated wheel corridor behind the mesh.',
      applyChanges: (prev) => {
        return prev.map((p) => {
          if (p.id === 'rb') {
            return {
              ...p,
              route: [
                { x: p.x + 80, y: p.y - 20 },
                { x: 720, y: 300 },
                { x: 720, y: 120 },
              ],
              progression: '1',
            };
          }
          if (p.id === 'wr1' || p.label.toLowerCase() === 'wr1') {
            return {
              ...p,
              route: [
                { x: p.x, y: 260 },
                { x: 650, y: 260 },
              ],
              progression: '2',
            };
          }
          if (p.id === 'wr2' || p.label.toLowerCase() === 'wr2') {
            return {
              ...p,
              route: [
                { x: p.x, y: 280 },
                { x: 150, y: 280 },
              ],
              progression: 'checkdown',
            };
          }
          return p;
        });
      },
    },
    {
      id: 'hitch_seam_read',
      title: 'Hitch-and-Go Seam Bender',
      subtitle: 'Freezes flat defenders in Cover 3 match',
      tag: 'Cover 3 Buster',
      rationale:
        'Outside receiver snaps his head around on the 5-yard hitch, drawing the curl/flat defender downhill before exploding up the seam.',
      applyChanges: (prev) => {
        return prev.map((p) => {
          if (p.id === 'wr2' || p.label.toLowerCase() === 'wr2') {
            return {
              ...p,
              route: [
                { x: p.x, y: 300 },
                { x: p.x - 5, y: 305 },
                { x: p.x - 40, y: 80 },
              ],
              progression: '1',
            };
          }
          return p;
        });
      },
    },
    {
      id: 'post_wheel_switch',
      title: 'Post-Wheel Switch Release',
      subtitle: 'Crosses releases off line of scrimmage to void man switches',
      tag: 'Man-to-Man Buster',
      rationale:
        'Slot receiver releases outside to run the wheel while outside receiver stems inside to run the post, forcing defenders into trailing positions.',
      applyChanges: (prev) => {
        return prev.map((p) => {
          if (p.id === 'wr1' || p.label.toLowerCase() === 'wr1') {
            return {
              ...p,
              route: [
                { x: p.x + 60, y: 290 },
                { x: 420, y: 110 },
              ],
              progression: '2',
            };
          }
          if (p.id === 'slot' || p.label.toLowerCase() === 'slot') {
            return {
              ...p,
              route: [
                { x: p.x - 60, y: 310 },
                { x: 80, y: 120 },
              ],
              progression: '1',
            };
          }
          return p;
        });
      },
    },
  ];

  const selectedCounter =
    counterSuggestions.find((c) => c.id === selectedCounterId) || counterSuggestions[0];

  const handleApplyCounter = (item: CounterSuggestion) => {
    const updated = item.applyChanges(players);
    onApplyPlayVariant(
      updated,
      `${playTitle} (${item.title})`,
      `${item.subtitle}. ${item.rationale}`
    );
    setAppliedId(item.id);
    setTimeout(() => setAppliedId(null), 2500);
  };

  const handleApplyHashSpacing = (mode: 'left_hash' | 'right_hash' | 'compressed_bunch' | 'spread_wide') => {
    let updated = [...players];
    if (mode === 'left_hash') {
      updated = updated.map((p) => ({
        ...p,
        x: Math.max(80, p.x - 140),
      }));
    } else if (mode === 'right_hash') {
      updated = updated.map((p) => ({
        ...p,
        x: Math.min(720, p.x + 140),
      }));
    } else if (mode === 'compressed_bunch') {
      updated = updated.map((p) => {
        if (p.role === 'offense' && p.shape === 'circle') {
          return {
            ...p,
            x: p.x < 400 ? Math.min(360, p.x + 120) : Math.max(440, p.x - 120),
          };
        }
        return p;
      });
    } else if (mode === 'spread_wide') {
      updated = updated.map((p) => {
        if (p.id === 'wr1' || p.label.toLowerCase() === 'wr1') return { ...p, x: 80 };
        if (p.id === 'wr2' || p.label.toLowerCase() === 'wr2') return { ...p, x: 720 };
        return p;
      });
    }
    onApplyPlayVariant(updated, `${playTitle} (${mode})`, `Adjusted spacing for ${mode}`);
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
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  AI Play Assistant & Counter Engine
                </h2>
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
            className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="p-3 sm:px-6 bg-neutral-900/40 border-b border-neutral-800/80 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('counters')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'spacing'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Hash & Split Optimization</span>
          </button>
        </div>

        {/* Scrollable Content Body with Responsive Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'counters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {counterSuggestions.map((item) => {
                const isSelected = selectedCounterId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCounterId(item.id)}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between group shadow-sm cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 border-amber-500/70 ring-1 ring-amber-500/40'
                        : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                          {item.tag}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono font-bold">
                          Counter Option
                        </span>
                      </div>

                      <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-neutral-400 font-semibold mt-0.5">{item.subtitle}</p>

                      <p className="text-xs text-neutral-300 leading-relaxed mt-2.5 p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80">
                        {item.rationale}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-amber-400">
                        {isSelected ? '● Active Selection' : 'Click to Select'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyCounter(item);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-neutral-950 font-bold text-xs transition-colors cursor-pointer"
                      >
                        {appliedId === item.id ? 'Applied!' : 'Apply Now'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'spacing' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  Automated Field Geometry & Boundary Alignment
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Re-align your receivers and routes automatically based on hash position or split intent.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">Left Hash Realignment</h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Compresses boundary side and creates wide-side field space for sail/flood concepts.
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyHashSpacing('left_hash')}
                    className="mt-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Align to Left Hash
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">Right Hash Realignment</h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Compresses right boundary and opens wide-field grass to the left.
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyHashSpacing('right_hash')}
                    className="mt-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Align to Right Hash
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">Condensed Bunch / Stack Splits</h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Pulls receivers tight to the box for redzone rub concepts and perimeter blocking leverage.
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyHashSpacing('compressed_bunch')}
                    className="mt-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all cursor-pointer"
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
                    className="mt-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Apply Max Spread Splits
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Visible Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-800/80 bg-neutral-900/90 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-neutral-400 flex items-center gap-1.5 self-start sm:self-center">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">AI adjustments preserve player roles and jersey numbers.</span>
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab === 'counters' && (
              <button
                id="btn-apply-counter-to-board"
                onClick={() => handleApplyCounter(selectedCounter)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition-all shadow-md shadow-amber-950 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                {appliedId === selectedCounter.id ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Applied to Board!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Apply Counter to Board</span>
                  </>
                )}
              </button>
            )}

            <button
              id="btn-close-assistant"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all cursor-pointer text-center"
            >
              Close Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantModal;
