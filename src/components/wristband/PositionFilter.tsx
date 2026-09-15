import React from 'react';
import { triggerHaptic } from '../../lib/haptics';

interface PositionFilterProps {
  selectedPosition: string;
  onSelectPosition: (position: string) => void;
  availablePositions?: string[];
}

const DEFAULT_POSITIONS = ['QB', 'WR1', 'WR2', 'SLOT', 'C', 'RB', 'TE', 'X', 'Z', 'H', 'FB', 'TB'];

export const PositionFilter: React.FC<PositionFilterProps> = ({
  selectedPosition,
  onSelectPosition,
  availablePositions,
}) => {
  const positions = availablePositions && availablePositions.length > 0 
    ? Array.from(new Set(availablePositions))
    : DEFAULT_POSITIONS;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar select-none">
      {positions.map((pos) => {
        const isSelected = selectedPosition === pos;
        return (
          <button
            key={pos}
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onSelectPosition(pos);
              try {
                localStorage.setItem('j1p_wrist_position', pos);
              } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wider transition-all duration-150 active:scale-[0.97] shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-white text-black shadow-[0_0_16px_rgba(255,255,255,0.4)] ring-2 ring-white scale-105'
                : 'bg-[#12151C] text-slate-300 border border-white/[0.08] hover:text-white hover:border-white/20'
            }`}
          >
            {pos}
          </button>
        );
      })}
    </div>
  );
};
