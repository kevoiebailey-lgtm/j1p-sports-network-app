import React from 'react';
import { 
  Grid, 
  Camera, 
  Film, 
  Tv, 
  Search, 
  PlusCircle, 
  Bookmark, 
  Sparkles,
  Filter,
  Calendar,
  Layers,
  Check
} from 'lucide-react';
import { MediaVaultType } from '../../types/mediaVault';
import { MAJOR_EVENTS_LIST } from '../../lib/mediaVaultData';

interface MediaFilterBarProps {
  activeType: MediaVaultType;
  onTypeChange: (type: MediaVaultType) => void;
  selectedSport: string;
  onSportChange: (sport: string) => void;
  selectedEvent: string;
  onEventChange: (event: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenUpload: () => void;
  onOpenPinnedDrawer: () => void;
  pinnedCount: number;
  totalCount: number;
}

export const MediaFilterBar: React.FC<MediaFilterBarProps> = ({
  activeType,
  onTypeChange,
  selectedSport,
  onSportChange,
  selectedEvent,
  onEventChange,
  searchQuery,
  onSearchChange,
  onOpenUpload,
  onOpenPinnedDrawer,
  pinnedCount,
  totalCount
}) => {
  const mediaTabs: { type: MediaVaultType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { type: 'all', label: 'All Media', icon: Grid },
    { type: 'photo', label: 'Game Photos', icon: Camera },
    { type: 'video_reel', label: 'Video Reels', icon: Film },
    { type: 'raw_tape', label: 'Raw Tape', icon: Tv },
  ];

  const sportPills = [
    'All Sports',
    'Basketball',
    "Girls' Flag Football",
    'Lacrosse',
    'Volleyball',
    'Soccer',
    'Track & Field',
    'Football'
  ];

  return (
    <div className="sticky top-0 z-30 bg-[#161C22]/95 backdrop-blur-xl border-b border-[#2D3748] shadow-2xl py-3 px-3 sm:px-6 space-y-3 transition-all">
      {/* Tier 1: Media Types & Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Media Type Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {mediaTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeType === tab.type;
            return (
              <button
                key={tab.type}
                onClick={() => onTypeChange(tab.type)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#F59E0B] text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.02]'
                    : 'bg-[#1E2630] text-slate-300 hover:text-white hover:bg-[#283340] border border-[#2D3748]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Search & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search athlete, event, play..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#1E2630] border border-[#2D3748] text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Pin to Profile Hub Drawer Trigger */}
          <button
            onClick={onOpenPinnedDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2630] hover:bg-[#283340] border border-[#2D3748] text-xs font-mono text-slate-200 transition-all cursor-pointer whitespace-nowrap"
            title="View items pinned to your recruiting scout profile"
          >
            <Bookmark className={`w-3.5 h-3.5 ${pinnedCount > 0 ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-slate-400'}`} />
            <span className="hidden sm:inline font-bold">Pinned</span>
            {pinnedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#F59E0B] text-slate-950 text-[10px] font-black">
                {pinnedCount}
              </span>
            )}
          </button>

          {/* Quick Upload CTA */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 text-xs font-black uppercase font-mono tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all transform hover:scale-[1.02] cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Upload Reel / Tape</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </div>
      </div>

      {/* Tier 2: Sport Category Pills & Event Showcase Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Horizontal Sport Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {sportPills.map((sport) => {
            const isSelected = selectedSport.toLowerCase() === sport.toLowerCase();
            return (
              <button
                key={sport}
                onClick={() => onSportChange(sport)}
                className={`px-3 py-1 rounded-lg text-[11px] font-mono font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#00F2FE]/15 text-[#00F2FE] border border-[#00F2FE]/50 shadow-[0_0_12px_rgba(0,242,254,0.2)] font-bold'
                    : 'bg-[#161C22] text-slate-400 hover:text-slate-200 border border-[#2D3748] hover:border-slate-600'
                }`}
              >
                {sport}
              </button>
            );
          })}
        </div>

        {/* Event Showcase Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
          <select
            value={selectedEvent}
            onChange={(e) => onEventChange(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[#1E2630] border border-[#2D3748] text-[11px] text-slate-200 font-mono focus:outline-none focus:border-[#F59E0B] cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
          >
            {MAJOR_EVENTS_LIST.map((evt) => (
              <option key={evt} value={evt}>
                {evt}
              </option>
            ))}
          </select>

          <span className="text-[10px] font-mono text-slate-400 hidden md:inline shrink-0">
            ({totalCount} Items)
          </span>
        </div>
      </div>
    </div>
  );
};
