import React from 'react';
import { Layers, Plus, Trophy, Users } from 'lucide-react';
import { EventDivision } from './types';

interface DivisionTabFilterProps {
  divisions: EventDivision[];
  selectedDivisionId: string; // 'all' or division id
  onSelectDivision: (id: string) => void;
  onOpenAddDivision: () => void;
  canManage?: boolean;
  totalAttendeesCount?: number;
}

export const DivisionTabFilter: React.FC<DivisionTabFilterProps> = ({
  divisions,
  selectedDivisionId,
  onSelectDivision,
  onOpenAddDivision,
  canManage = false,
  totalAttendeesCount = 0
}) => {
  return (
    <div 
      id="division-tab-filter-container"
      className="px-4 py-2.5 bg-[#090D16]/95 border-b border-[#24324F] flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar"
    >
      {/* Left: Division Tabs list */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1 text-[10px] font-black uppercase font-mono text-slate-400 mr-1.5 shrink-0">
          <Layers className="w-3.5 h-3.5 text-[#00B8D4]" />
          <span>Divisions:</span>
        </div>

        {/* All Divisions Tab */}
        <button
          id="division-tab-all"
          type="button"
          onClick={() => onSelectDivision('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            selectedDivisionId === 'all'
              ? 'bg-[#00B8D4] text-[#090D16] shadow-md shadow-[#00B8D4]/20 font-black'
              : 'bg-[#263238]/60 text-slate-300 hover:text-white hover:bg-[#263238] border border-[#24324F]'
          }`}
        >
          <span>All Divisions</span>
          <span className={`px-1.5 py-0.2 text-[9px] rounded-md font-bold ${
            selectedDivisionId === 'all' ? 'bg-[#090D16]/20 text-[#090D16]' : 'bg-black/30 text-slate-400'
          }`}>
            {divisions.length}
          </span>
        </button>

        {/* Individual Divisions: 14U, 17U, etc. */}
        {divisions.map((div) => {
          const isSelected = selectedDivisionId === div.id;
          return (
            <button
              key={div.id}
              id={`division-tab-${div.id}`}
              type="button"
              onClick={() => onSelectDivision(div.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-[#00B8D4] text-[#090D16] shadow-md shadow-[#00B8D4]/20 font-black'
                  : 'bg-[#263238]/60 text-slate-300 hover:text-white hover:bg-[#263238] border border-[#24324F]'
              }`}
            >
              <span>{div.name}</span>
              {div.format && (
                <span className={`px-1 py-0.2 text-[8px] rounded font-bold uppercase ${
                  isSelected ? 'bg-black/20 text-[#090D16]' : 'bg-slate-700/50 text-slate-400'
                }`}>
                  {div.format}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Add Division Trigger (Visible only to Hosts/Admins) */}
      {canManage && (
        <button
          id="add-division-trigger-btn"
          type="button"
          onClick={onOpenAddDivision}
          className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono transition-all flex items-center gap-1.5 border border-[#00B8D4]/50 bg-[#00B8D4]/15 hover:bg-[#00B8D4]/25 text-[#00B8D4] hover:border-[#00B8D4] cursor-pointer shrink-0 shadow-sm"
          title="Add a new tournament division (e.g., 14U Girls, 17U Elite)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Division</span>
        </button>
      )}
    </div>
  );
};
