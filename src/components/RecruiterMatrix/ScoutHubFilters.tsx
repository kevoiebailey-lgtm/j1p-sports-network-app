import React from 'react';
import { Search, Filter, ShieldCheck, Check, Sparkles, SlidersHorizontal, RefreshCw } from 'lucide-react';

interface ScoutHubFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSport: string;
  onSportChange: (sport: string) => void;
  selectedPosition: string;
  onPositionChange: (pos: string) => void;
  selectedGradYear: string;
  onGradYearChange: (year: string) => void;
  selectedState: string;
  onStateChange: (state: string) => void;
  ncaaVerifiedOnly: boolean;
  onToggleNcaaVerified: () => void;
  resultCount: number;
  availableSports?: string[];
}

export const ScoutHubFilters: React.FC<ScoutHubFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedSport,
  onSportChange,
  selectedPosition,
  onPositionChange,
  selectedGradYear,
  onGradYearChange,
  selectedState,
  onStateChange,
  ncaaVerifiedOnly,
  onToggleNcaaVerified,
  resultCount,
  availableSports = ['All', 'Basketball', 'Flag Football', 'Football', 'Lacrosse', 'Soccer', 'Track & Field']
}) => {
  const positions = ['ALL', 'QB', 'WR', 'RB', 'DB', 'PG', 'SG', 'SF', 'PF', 'C', 'Attack', 'Midfield'];
  const gradYears = ['ALL', '2025', '2026', '2027', '2028'];
  const states = ['ALL', 'NJ', 'NY', 'PA', 'FL', 'TX', 'CA'];

  return (
    <div className="space-y-4">
      {/* Top Search & NCAA Verification Toggle Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by athlete name, high school, position, or state..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#212A31]/90 border border-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#E5B868] focus:ring-1 focus:ring-[#E5B868] transition-all shadow-inner"
          />
        </div>

        {/* NCAA Verification Toggle Button */}
        <button
          onClick={onToggleNcaaVerified}
          className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer shrink-0 ${
            ncaaVerifiedOnly
              ? 'bg-[#E5B868] text-slate-950 border-[#E5B868] shadow-[0_0_20px_rgba(214,28,36,0.5)]'
              : 'bg-[#212A31]/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${ncaaVerifiedOnly ? 'fill-slate-950 text-slate-950' : 'text-[#E5B868]'}`} />
          <span>NCAA VERIFIED ONLY</span>
          {ncaaVerifiedOnly && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>
      </div>

      {/* HORIZONTAL SCROLL PILL FILTERS ROW */}
      <div className="space-y-2.5">
        {/* Sports Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 pr-1">
            SPORT:
          </span>
          {availableSports.map((sport) => (
            <button
              key={sport}
              onClick={() => onSportChange(sport)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 border ${
                selectedSport === sport
                  ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_12px_rgba(214,28,36,0.4)]'
                  : 'bg-[#212A31]/80 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Position Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 pr-1">
            POSITION:
          </span>
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => onPositionChange(pos)}
              className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 border ${
                selectedPosition === pos
                  ? 'bg-red-600/20 text-[#E5B868] border-[#E5B868]/60 shadow-[0_0_10px_rgba(214,28,36,0.3)]'
                  : 'bg-[#212A31]/80 text-slate-400 border-slate-800/80 hover:text-white'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Grad Year & State Row */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          {/* Grad Year Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 pr-1">
              CLASS YEAR:
            </span>
            {gradYears.map((year) => (
              <button
                key={year}
                onClick={() => onGradYearChange(year)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 border ${
                  selectedGradYear === year
                    ? 'bg-red-600/20 text-[#E5B868] border-[#E5B868]/60'
                    : 'bg-[#212A31] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {year === 'ALL' ? 'ALL YEARS' : `'${year.slice(2)}`}
              </button>
            ))}
          </div>

          {/* State Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 pr-1">
              STATE:
            </span>
            {states.map((st) => (
              <button
                key={st}
                onClick={() => onStateChange(st)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 border ${
                  selectedState === st
                    ? 'bg-red-600/20 text-[#E5B868] border-[#E5B868]/60'
                    : 'bg-[#212A31] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SUMMARY RESULT COUNT COMPONENT */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[#212A31]/60 border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5B868] animate-pulse shadow-[0_0_8px_#E5B868]" />
          <span>
            Showing <strong className="text-[#E5B868] font-black">{resultCount}</strong> Athletes
            {selectedSport !== 'All' ? ` in ${selectedSport}` : ''}
            {ncaaVerifiedOnly ? ' (NCAA Verified Only)' : ''}
          </span>
        </div>

        {(searchQuery || selectedSport !== 'All' || selectedPosition !== 'ALL' || selectedGradYear !== 'ALL' || selectedState !== 'ALL' || ncaaVerifiedOnly) && (
          <button
            onClick={() => {
              onSearchChange('');
              onSportChange('All');
              onPositionChange('ALL');
              onGradYearChange('ALL');
              onStateChange('ALL');
              if (ncaaVerifiedOnly) onToggleNcaaVerified();
            }}
            className="text-[10px] font-mono text-slate-400 hover:text-[#E5B868] flex items-center gap-1 uppercase tracking-wider cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Reset Filters
          </button>
        )}
      </div>
    </div>
  );
};
