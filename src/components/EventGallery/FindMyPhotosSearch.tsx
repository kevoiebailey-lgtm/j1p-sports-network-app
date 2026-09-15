import React from 'react';
import { 
  Search, 
  Sparkles, 
  MapPin, 
  SlidersHorizontal, 
  UserSearch, 
  Trophy, 
  Calendar,
  X,
  Layers
} from 'lucide-react';

interface FindMyPhotosSearchProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSport: string;
  onSportChange: (sport: string) => void;
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  totalGalleriesCount: number;
}

const SPORTS_LIST = [
  { id: 'all', label: 'All Sports' },
  { id: 'Football', label: 'Football & 7v7' },
  { id: 'Basketball', label: 'Basketball' },
  { id: "Girls' Flag Football", label: "Girls' Flag Football" },
  { id: 'Lacrosse', label: 'Lacrosse' },
  { id: 'Soccer', label: 'Soccer' },
  { id: 'Baseball', label: 'Baseball & Softball' },
  { id: 'Track & Field', label: 'Track & Field' }
];

const STATES_LIST = [
  { id: 'all', label: 'All States' },
  { id: 'NJ', label: 'New Jersey (NJ)' },
  { id: 'NY', label: 'New York (NY)' },
  { id: 'PA', label: 'Pennsylvania (PA)' },
  { id: 'TX', label: 'Texas (TX)' },
  { id: 'FL', label: 'Florida (FL)' },
  { id: 'CA', label: 'California (CA)' },
  { id: 'GA', label: 'Georgia (GA)' },
  { id: 'MD', label: 'Maryland (MD)' }
];

const CATEGORIES = [
  { id: 'all', label: 'All Galleries' },
  { id: 'featured', label: 'Featured Matches' },
  { id: 'championship', label: 'Championships' },
  { id: 'showcase', label: 'Combines & Tryouts' },
  { id: 'rivalry', label: 'Varsity Rivalries' }
];

export const FindMyPhotosSearch: React.FC<FindMyPhotosSearchProps> = ({
  searchQuery,
  onSearchChange,
  selectedSport,
  onSportChange,
  selectedState,
  onStateChange,
  selectedCategory,
  onCategoryChange,
  totalGalleriesCount
}) => {
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-black/80 border border-white/15 backdrop-blur-xl space-y-4 shadow-xl">
      {/* Top Search Inputs Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        
        {/* Main Search Input */}
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Find photos by School, Team, Athlete, Jersey # (e.g. #12), or Photographer..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6A00] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* State Selector Dropdown */}
        <div className="md:col-span-3 relative">
          <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FF6A00]" />
          <select
            value={selectedState}
            onChange={(e) => onStateChange(e.target.value)}
            className="w-full pl-10 pr-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-white appearance-none focus:outline-none focus:border-[#FF6A00] cursor-pointer"
          >
            {STATES_LIST.map((st) => (
              <option key={st.id} value={st.id} className="bg-zinc-900 text-white">
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Selector Dropdown */}
        <div className="md:col-span-3 relative">
          <Trophy className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FF6A00]" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full pl-10 pr-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-white appearance-none focus:outline-none focus:border-[#FF6A00] cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-zinc-900 text-white">
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sport Filter Pills Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-white/10 no-scrollbar">
        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold pr-1 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-[#FF6A00]" />
          <span>SPORT:</span>
        </span>
        
        {SPORTS_LIST.map((sp) => {
          const isActive = selectedSport === sp.id;
          return (
            <button
              key={sp.id}
              onClick={() => onSportChange(sp.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#FF6A00] text-black font-black shadow-[0_0_15px_rgba(255,106,0,0.5)]'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {sp.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
