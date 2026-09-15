import React, { useMemo } from 'react';
import {
  Search,
  Filter,
  ShieldCheck,
  Check,
  RefreshCw,
  X,
  Sparkles,
  Trophy,
  Calendar,
  MapPin,
  Target,
  ChevronDown,
  SlidersHorizontal,
  Sliders
} from 'lucide-react';
import { UserProfile } from '../../types';

export interface MatrixFilterState {
  searchQuery: string;
  selectedSports: string[];
  selectedGradYears: string[];
  selectedStates: string[];
  selectedPosition: string;
  verifiedOnly: boolean;
}

export const DEFAULT_FILTER_STATE: MatrixFilterState = {
  searchQuery: '',
  selectedSports: [],
  selectedGradYears: [],
  selectedStates: [],
  selectedPosition: 'ALL',
  verifiedOnly: false
};

interface MatrixFilterSidebarProps {
  filters: MatrixFilterState;
  onFilterChange: (newFilters: MatrixFilterState) => void;
  onResetFilters: () => void;
  activeFilterCount: number;
  totalResults: number;
  allAthletes: UserProfile[];
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

const DEFAULT_SPORTS = [
  'Basketball',
  'Flag Football',
  'Football',
  'Lacrosse',
  'Soccer',
  'Track & Field'
];

const DEFAULT_GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029'];

const DEFAULT_STATES = ['NJ', 'NY', 'PA', 'FL', 'TX', 'CA', 'GA', 'NC'];

const POSITIONS = ['ALL', 'QB', 'WR', 'RB', 'DB', 'PG', 'SG', 'SF', 'PF', 'C', 'Attack', 'Midfield'];

export const MatrixFilterSidebar: React.FC<MatrixFilterSidebarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  activeFilterCount,
  totalResults,
  allAthletes,
  isOpenMobile = false,
  onCloseMobile,
  className = ''
}) => {
  // Dynamically extract available sports with count
  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allAthletes.forEach((a) => {
      if (a.sport) {
        counts[a.sport] = (counts[a.sport] || 0) + 1;
      }
    });
    return counts;
  }, [allAthletes]);

  const availableSports = useMemo(() => {
    const set = new Set<string>(DEFAULT_SPORTS);
    allAthletes.forEach((a) => {
      if (a.sport) set.add(a.sport);
    });
    return Array.from(set);
  }, [allAthletes]);

  // Dynamically extract available grad years with count
  const gradYearCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allAthletes.forEach((a) => {
      if (a.gradYear) {
        counts[a.gradYear] = (counts[a.gradYear] || 0) + 1;
      }
    });
    return counts;
  }, [allAthletes]);

  // Dynamically extract available states with count
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allAthletes.forEach((a) => {
      if (a.state) {
        const st = a.state.toUpperCase();
        counts[st] = (counts[st] || 0) + 1;
      }
    });
    return counts;
  }, [allAthletes]);

  const availableStates = useMemo(() => {
    const set = new Set<string>(DEFAULT_STATES);
    allAthletes.forEach((a) => {
      if (a.state) set.add(a.state.toUpperCase());
    });
    return Array.from(set);
  }, [allAthletes]);

  // Helper toggle functions
  const toggleSport = (sport: string) => {
    const exists = filters.selectedSports.includes(sport);
    const newSports = exists
      ? filters.selectedSports.filter((s) => s !== sport)
      : [...filters.selectedSports, sport];
    onFilterChange({ ...filters, selectedSports: newSports });
  };

  const toggleGradYear = (year: string) => {
    const exists = filters.selectedGradYears.includes(year);
    const newYears = exists
      ? filters.selectedGradYears.filter((y) => y !== year)
      : [...filters.selectedGradYears, year];
    onFilterChange({ ...filters, selectedGradYears: newYears });
  };

  const toggleState = (state: string) => {
    const exists = filters.selectedStates.includes(state);
    const newStates = exists
      ? filters.selectedStates.filter((s) => s !== state)
      : [...filters.selectedStates, state];
    onFilterChange({ ...filters, selectedStates: newStates });
  };

  const sidebarContent = (
    <div className="space-y-6">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E5B868]/20 border border-[#E5B868]/40 flex items-center justify-center text-[#E5B868]">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black italic uppercase text-sm text-white font-sans tracking-wide">
              Matrix Filters
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {totalResults} Prospects Found
            </span>
          </div>
        </div>

        {/* Active Filters Counter & Reset */}
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#E5B868] text-black text-[10px] font-mono font-black shadow-[0_0_10px_rgba(214,28,36,0.5)]">
              {activeFilterCount} ACTIVE
            </span>
          )}

          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-[#E5B868] transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close button for Mobile drawer */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg bg-white/10 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Search Bar */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Search Athlete</span>
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="text-[#E5B868] hover:underline"
            >
              Clear
            </button>
          )}
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Name, high school, position..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868] transition-all"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Verified Status Toggle */}
      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={`w-4 h-4 ${
                filters.verifiedOnly ? 'text-[#E5B868]' : 'text-slate-400'
              }`}
            />
            <span className="text-xs font-mono font-bold uppercase text-white">
              NCAA / Matrix Verified
            </span>
          </div>

          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, verifiedOnly: !filters.verifiedOnly })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              filters.verifiedOnly ? 'bg-[#E5B868]' : 'bg-slate-800'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#212A31] shadow-lg ring-0 transition duration-200 ease-in-out ${
                filters.verifiedOnly ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 font-mono leading-tight">
          Show only prospects with verified combine metrics, official transcripts & video reels.
        </p>
      </div>

      {/* 3. Sport Selector Checkboxes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-[#E5B868]" /> Sport Category
          </span>
          {filters.selectedSports.length > 0 && (
            <button
              onClick={() => onFilterChange({ ...filters, selectedSports: [] })}
              className="text-[#E5B868] hover:underline"
            >
              All ({availableSports.length})
            </button>
          )}
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
          {availableSports.map((sport) => {
            const isSelected = filters.selectedSports.includes(sport);
            const count = sportCounts[sport] || 0;

            return (
              <button
                key={sport}
                type="button"
                onClick={() => toggleSport(sport)}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-mono flex items-center justify-between border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#E5B868]/15 border-[#E5B868] text-[#E5B868] font-bold shadow-[0_0_10px_rgba(214,28,36,0.2)]'
                    : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/30 hover:bg-black/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-[#E5B868] bg-[#E5B868] text-black'
                        : 'border-slate-600 bg-black/50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{sport}</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono px-1.5 py-0.2 rounded bg-black/40">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Graduation Class Year Checkboxes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#E5B868]" /> Class Year
          </span>
          {filters.selectedGradYears.length > 0 && (
            <button
              onClick={() => onFilterChange({ ...filters, selectedGradYears: [] })}
              className="text-[#E5B868] hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {DEFAULT_GRAD_YEARS.map((year) => {
            const isSelected = filters.selectedGradYears.includes(year);
            const count = gradYearCounts[year] || 0;

            return (
              <button
                key={year}
                type="button"
                onClick={() => toggleGradYear(year)}
                className={`px-2.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-between border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-red-600/20 border-[#E5B868] text-[#E5B868]'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <span>'{String(year || '2026').slice(-2)}</span>
                <span className="text-[9px] opacity-70 px-1 rounded bg-black/40">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. State Location Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider">
          <span className="text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#E5B868]" /> State Location
          </span>
          {filters.selectedStates.length > 0 && (
            <button
              onClick={() => onFilterChange({ ...filters, selectedStates: [] })}
              className="text-[#E5B868] hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {availableStates.map((st) => {
            const isSelected = filters.selectedStates.includes(st);
            const count = stateCounts[st] || 0;

            return (
              <button
                key={st}
                type="button"
                onClick={() => toggleState(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_10px_rgba(214,28,36,0.4)]'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/30'
                }`}
              >
                <span>{st}</span>
                <span className="text-[9px] opacity-75 font-normal">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Position Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#E5B868]" /> Position Role
          </span>
          {filters.selectedPosition !== 'ALL' && (
            <button
              onClick={() => onFilterChange({ ...filters, selectedPosition: 'ALL' })}
              className="text-[#E5B868] hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {POSITIONS.map((pos) => {
            const isSelected = filters.selectedPosition === pos;

            return (
              <button
                key={pos}
                type="button"
                onClick={() => onFilterChange({ ...filters, selectedPosition: pos })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_10px_rgba(214,28,36,0.4)]'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {pos}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset All Filters Button */}
      {activeFilterCount > 0 && (
        <button
          onClick={onResetFilters}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#E5B868] border border-[#E5B868]/30 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset All Active Filters ({activeFilterCount})</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:block w-72 xl:w-80 shrink-0 p-5 rounded-3xl bg-[#212A31]/90 border border-white/15 backdrop-blur-xl shadow-2xl h-fit lg:sticky lg:top-24 ${className}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over / Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xs sm:max-w-sm bg-[#212A31] border-l border-white/20 h-full p-5 overflow-y-auto shadow-2xl space-y-6">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
