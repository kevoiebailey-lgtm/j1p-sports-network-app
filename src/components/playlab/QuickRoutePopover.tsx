import React from 'react';
import { TacticalPlayer, RouteNumber, ReadProgressionNumber } from '../../types/tactics';
import { 
  X, 
  MoveHorizontal, 
  Trash2, 
  Sliders, 
  Check, 
  ArrowUpRight,
  TrendingUp,
  CornerUpRight,
  Maximize2,
  Target,
  Shield
} from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

interface QuickRouteStem {
  number: RouteNumber;
  name: string;
  label: string;
  category: 'in' | 'out' | 'vertical' | 'curl';
  badgeColor: string;
}

const STANDARD_ROUTE_STEMS: QuickRouteStem[] = [
  { number: 2, name: 'Slant', label: '2 • Slant', category: 'in', badgeColor: '#10B981' },
  { number: 4, name: 'Out', label: '4 • Out', category: 'out', badgeColor: '#00F0D0' },
  { number: 0, name: 'Hitch', label: '0 • Hitch', category: 'curl', badgeColor: '#38BDF8' },
  { number: 6, name: 'Corner', label: '6 • Corner', category: 'out', badgeColor: '#00F0D0' },
  { number: 7, name: 'Post', label: '7 • Post', category: 'in', badgeColor: '#A855F7' },
  { number: 8, name: 'Go', label: '8 • Go / Streak', category: 'vertical', badgeColor: '#F59E0B' },
  { number: 5, name: 'Drag', label: '5 • Drag / Dig', category: 'in', badgeColor: '#10B981' },
];

interface QuickRoutePopoverProps {
  player: TacticalPlayer | null;
  isOpen: boolean;
  isFlipped?: boolean;
  onSelectRoute: (routeNumber: RouteNumber) => void;
  onSetProgression?: (readProgression: ReadProgressionNumber | null) => void;
  onToggleMotion: () => void;
  onToggleBeatsCoverage?: (coverageTag: string) => void;
  onClearPlayerRoute: () => void;
  onOpenFullModal: () => void;
  onClose: () => void;
}

export const QuickRoutePopover: React.FC<QuickRoutePopoverProps> = ({
  player,
  isOpen,
  isFlipped = false,
  onSelectRoute,
  onSetProgression,
  onToggleMotion,
  onToggleBeatsCoverage,
  onClearPlayerRoute,
  onOpenFullModal,
  onClose,
}) => {
  if (!isOpen || !player) return null;

  // Calculate percentage placement on 800x500 canvas
  const xPct = (player.x / 800) * 100;
  const yPct = (player.y / 500) * 100;

  // Clamp horizontal alignment to keep popover cleanly inside canvas
  const isFarLeft = xPct < 25;
  const isFarRight = xPct > 75;
  const isNearTop = yPct < 35;

  const isMotionActive = Boolean(player.motion?.enabled);

  return (
    <div
      id={`quick-route-popover-${player.id}`}
      className="absolute z-40 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto select-none"
      style={{
        left: isFarLeft ? '16px' : isFarRight ? 'auto' : `${xPct}%`,
        right: isFarRight ? '16px' : 'auto',
        top: isNearTop ? `calc(${yPct}% + 34px)` : 'auto',
        bottom: isNearTop ? 'auto' : `calc(${100 - yPct}% + 34px)`,
        transform: isFarLeft || isFarRight ? 'none' : 'translateX(-50%)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-[280px] sm:w-[320px] bg-[#070D14]/95 border border-cyan-500/40 rounded-2xl p-3 shadow-[0_12px_36px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col gap-2.5 text-white">
        {/* Header: Player Info & Close */}
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-[#00F0D0] text-black font-black text-xs font-mono flex items-center justify-center shadow-sm">
              {player.label}
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-200">
                  {player.label === 'QB' ? 'Quarterback' : player.label === 'C' ? 'Center (Eligible)' : `Receiver ${player.label}`}
                </span>
                {player.routeNumber !== undefined && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-mono font-bold text-cyan-300">
                    Route #{player.routeNumber}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Quick Stem &amp; Read Assignment</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Offensive Read Progression Selector (1: Primary, 2: Secondary, 3: Checkdown) */}
        {player.label !== 'QB' && (
          <div className="flex flex-col gap-1 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Read Progression
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {player.readProgression === 1
                  ? 'Primary Read (1)'
                  : player.readProgression === 2
                  ? 'Secondary Read (2)'
                  : player.readProgression === 3
                  ? 'Checkdown (3)'
                  : 'No Tag'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-0.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onSetProgression?.(1);
                }}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-black flex items-center justify-center gap-1 transition-all ${
                  player.readProgression === 1
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 ring-1 ring-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                }`}
              >
                <span>(1) 1st</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onSetProgression?.(2);
                }}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-black flex items-center justify-center gap-1 transition-all ${
                  player.readProgression === 2
                    ? 'bg-sky-400 text-black shadow-md shadow-sky-400/30 ring-1 ring-sky-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-sky-300'
                }`}
              >
                <span>(2) 2nd</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onSetProgression?.(3);
                }}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-black flex items-center justify-center gap-1 transition-all ${
                  player.readProgression === 3
                    ? 'bg-emerald-400 text-black shadow-md shadow-emerald-400/30 ring-1 ring-emerald-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-300'
                }`}
              >
                <span>(3) Chk</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onSetProgression?.(null);
                }}
                className={`py-1 px-1 rounded-lg text-[9px] font-mono font-bold flex items-center justify-center transition-all ${
                  !player.readProgression
                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                    : 'bg-slate-900 text-slate-500 hover:text-white'
                }`}
              >
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}

        {/* Pre-Snap Motion Toggle */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <MoveHorizontal className={`w-4 h-4 ${isMotionActive ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-amber-300">Pre-Snap Motion</span>
              <span className="text-[9px] text-slate-400 font-mono">Dashed backfield vector</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onToggleMotion();
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isMotionActive
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            {isMotionActive ? (
              <>
                <Check className="w-3 h-3 stroke-[3]" />
                <span>ACTIVE</span>
              </>
            ) : (
              <span>OFF</span>
            )}
          </button>
        </div>

        {/* Beats Coverage Tactical Simulator Tags */}
        {player.label !== 'QB' && (
          <div className="flex flex-col gap-1 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-rose-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-rose-500" />
                Beats Coverage Tag
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Simulator Pri</span>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-0.5">
              {[
                { tag: 'Cover 1', label: 'C1 Man' },
                { tag: 'Cover 2', label: 'C2 Zone' },
                { tag: 'Cover 3', label: 'C3 Zone' },
                { tag: 'Blitz', label: 'Blitz' },
              ].map((item) => {
                const isTagged = player.beatsCoverage?.includes(item.tag);
                return (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onToggleBeatsCoverage?.(item.tag);
                    }}
                    className={`py-1 px-1 rounded-lg text-[9.5px] font-mono font-bold transition-all cursor-pointer ${
                      isTagged
                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30 ring-1 ring-rose-300'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Standard Route Stems Grid (Slant, Out, Hitch, Corner, Post, Go, Drag) */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
            Standard Route Stems
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {STANDARD_ROUTE_STEMS.map((route) => {
              const isSelected = player.routeNumber === route.number;
              return (
                <button
                  key={route.number}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onSelectRoute(route.number);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold font-mono text-left flex items-center justify-between border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#00F0D0]/20 text-[#00F0D0] border-[#00F0D0] shadow-sm shadow-[#00F0D0]/20'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{route.name}</span>
                  <span 
                    className="h-4 min-w-[16px] px-1 rounded text-[10px] font-black flex items-center justify-center"
                    style={{ 
                      backgroundColor: isSelected ? '#00F0D0' : '#1E293B',
                      color: isSelected ? '#000000' : route.badgeColor 
                    }}
                  >
                    {route.number}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions: Clear Route & Full Tree Customizer */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClearPlayerRoute();
            }}
            disabled={player.routeNumber === undefined && !isMotionActive}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              player.routeNumber !== undefined || isMotionActive
                ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Route</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenFullModal();
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#00F0D0] text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer border border-[#00F0D0]/30"
          >
            <Sliders className="w-3 h-3" />
            <span>Full Tree &amp; Depth</span>
            <ArrowUpRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickRoutePopover;

