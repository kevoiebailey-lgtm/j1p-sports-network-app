import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Sparkles, 
  Sliders, 
  Gauge, 
  ArrowUpRight, 
  ShieldAlert, 
  Trash2,
  ChevronRight,
  Target
} from 'lucide-react';
import { 
  RouteNumber, 
  RouteDepthLevel, 
  ReadProgressionNumber, 
  TacticalPlayer 
} from '../../types/tactics';
import { 
  ROUTE_TREE_DEFINITIONS, 
  getDepthYardage,
  generateRouteVectorPath 
} from './FormationPresets';
import { triggerHaptic } from '../../lib/haptics';

interface RouteTreeModalProps {
  isOpen: boolean;
  player: TacticalPlayer | null;
  isFlipped?: boolean;
  onClose: () => void;
  onSelectRoute: (
    routeNumber: RouteNumber,
    depth: RouteDepthLevel,
    readProgression?: ReadProgressionNumber | null,
    note?: string
  ) => void;
  onClearRoute?: () => void;
}

export const RouteTreeModal: React.FC<RouteTreeModalProps> = ({
  isOpen,
  player,
  isFlipped = false,
  onClose,
  onSelectRoute,
  onClearRoute,
}) => {
  const [selectedDepth, setSelectedDepth] = useState<RouteDepthLevel>('medium');
  const [selectedRead, setSelectedRead] = useState<ReadProgressionNumber | null>(null);
  const [coachNote, setCoachNote] = useState<string>('');

  useEffect(() => {
    if (player) {
      setSelectedDepth(player.routeDepth || 'medium');
      setSelectedRead(player.readProgression ?? null);
      setCoachNote(player.assignmentNote || '');
    }
  }, [player]);

  if (!isOpen || !player) return null;

  const routesList: RouteNumber[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  const handleRouteClick = (routeNum: RouteNumber) => {
    triggerHaptic('medium');
    onSelectRoute(routeNum, selectedDepth, selectedRead, coachNote.trim());
    onClose();
  };

  const handleClear = () => {
    triggerHaptic('light');
    if (onClearRoute) {
      onClearRoute();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-2xl bg-[#0B0F19] border-t sm:border border-slate-800 sm:rounded-3xl rounded-t-3xl max-h-[90dvh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.8)] text-white font-sans overflow-hidden"
        >
          {/* Mobile Drag Indicator Pill */}
          <div className="sm:hidden pt-3 pb-1 flex justify-center">
            <div className="w-12 h-1.5 rounded-full bg-slate-700/80" />
          </div>

          {/* Modal Header */}
          <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0 bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base shadow-lg border"
                style={{
                  backgroundColor: `${player.color || '#00F0D0'}20`,
                  borderColor: player.color || '#00F0D0',
                  color: player.color || '#00F0D0',
                }}
              >
                {player.label}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-white">
                    Tap-to-Assign Route
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/40">
                    {player.positionGroup}
                  </span>
                  {player.isEligibleReceiver && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ELIGIBLE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Select a numbered passing stem (0-9) to snap vector path to canvas
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar flex-1">
            {/* Control Bar: Depth Toggle + Read Progression */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
              {/* Depth Toggle (Short 5yd, Med 10yd, Deep 15yd) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-[#00F0D0]" />
                  Route Depth:
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                  {(['short', 'medium', 'deep'] as RouteDepthLevel[]).map((level) => {
                    const isSelected = selectedDepth === level;
                    const yards = level === 'short' ? '5yd' : level === 'medium' ? '10yd' : '15yd';
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setSelectedDepth(level);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer flex flex-col items-center ${
                          isSelected
                            ? 'bg-[#00F0D0] text-black shadow-md shadow-[#00F0D0]/20'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{level}</span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-black/80 font-bold' : 'text-slate-500'}`}>
                          {yards}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Read Progression Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  Read Progression:
                </label>
                <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                  {[
                    { num: 1 as ReadProgressionNumber, label: '1st Read', color: 'bg-amber-400 text-black' },
                    { num: 2 as ReadProgressionNumber, label: '2nd Read', color: 'bg-[#00F0D0] text-black' },
                    { num: 3 as ReadProgressionNumber, label: '3rd Read', color: 'bg-purple-500 text-white' },
                    { num: null, label: 'Check', color: 'bg-slate-700 text-white' },
                  ].map((prog) => {
                    const isSelected = selectedRead === prog.num;
                    return (
                      <button
                        key={prog.label}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setSelectedRead(prog.num);
                        }}
                        className={`py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? prog.color + ' shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{prog.num ? `${prog.num}` : 'None'}</span>
                        <span className="text-[9px] font-mono opacity-80">{prog.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 0-9 Route Grid */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase text-slate-400 px-1">
                <span>0-9 Visual Route Tree</span>
                <span className="text-[#00F0D0]">1-Tap Snaps to Field</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {routesList.map((routeNum) => {
                  const def = ROUTE_TREE_DEFINITIONS[routeNum];
                  const isSelected = player.routeNumber === routeNum;
                  const { yards } = getDepthYardage(routeNum, selectedDepth);

                  // Preview SVG path for this route
                  const previewVector = generateRouteVectorPath(
                    20,
                    36,
                    routeNum,
                    selectedDepth,
                    isFlipped
                  );

                  let badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
                  if (def.category === 'vertical') badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
                  if (def.category === 'in_breaking') badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                  if (def.category === 'out_breaking') badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                  if (def.category === 'blocking') badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                  return (
                    <button
                      key={routeNum}
                      type="button"
                      onClick={() => handleRouteClick(routeNum)}
                      className={`group relative flex items-start gap-3 p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-[#00F0D0]/10 border-[#00F0D0] shadow-[0_0_20px_rgba(0,240,208,0.2)] ring-1 ring-[#00F0D0]'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 active:scale-[0.98]'
                      }`}
                    >
                      {/* Big Route Number Badge */}
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black font-mono text-lg border transition-all ${
                        isSelected
                          ? 'bg-[#00F0D0] text-black border-[#00F0D0]'
                          : 'bg-slate-800 text-white border-slate-700 group-hover:border-[#00F0D0]/50 group-hover:text-[#00F0D0]'
                      }`}>
                        {routeNum}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h3 className="text-sm font-bold text-white group-hover:text-[#00F0D0] transition-colors truncate">
                            {def.name}
                          </h3>
                          <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border uppercase shrink-0 ${badgeColor}`}>
                            {yards > 0 ? `${yards}Y` : 'BLOCK'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {def.description}
                        </p>
                      </div>

                      {/* Mini Route Preview Vector Thumbnail */}
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center p-1">
                        <svg viewBox="0 0 40 40" className="w-full h-full overflow-visible">
                          <path
                            d={previewVector.svgPathD}
                            fill="none"
                            stroke={isSelected ? '#00F0D0' : '#94A3B8'}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {previewVector.endMarker === 'arrow' && (
                            <circle cx={previewVector.endX} cy={previewVector.endY} r="2.5" fill={isSelected ? '#00F0D0' : '#94A3B8'} />
                          )}
                          {previewVector.endMarker === 'curl' && (
                            <circle cx={previewVector.endX} cy={previewVector.endY} r="3" fill="none" stroke={isSelected ? '#00F0D0' : '#94A3B8'} strokeWidth="2" />
                          )}
                          {previewVector.endMarker === 't-cap' && (
                            <line x1={previewVector.endX - 4} y1={previewVector.endY} x2={previewVector.endX + 4} y2={previewVector.endY} stroke={isSelected ? '#00F0D0' : '#94A3B8'} strokeWidth="2.5" />
                          )}
                        </svg>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 text-[#00F0D0]">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coach Cue / Assignment Note */}
            <div className="pt-2 space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Progression Cue / Custom Note:
              </label>
              <input
                type="text"
                value={coachNote}
                onChange={(e) => setCoachNote(e.target.value)}
                placeholder="e.g. Look off middle safety, hot alert vs zero blitz..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0D0] transition-colors"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
            {player.routeNumber !== undefined ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Route</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
