import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface ProMobileSportSelectorProps {
  selectedSport: string;
  onSelectSport: (sport: string) => void;
}

const sports = [
  { id: 'all', label: 'All Sports', icon: '🏆' },
  { id: 'basketball', label: 'Basketball', icon: '🏀' },
  { id: 'football', label: 'Flag Football', icon: '🏈' },
  { id: 'lacrosse', label: 'Lacrosse', icon: '🥍' },
  { id: 'volleyball', label: 'Volleyball', icon: '🏐' },
  { id: 'soccer', label: 'Soccer', icon: '⚽' },
  { id: 'track', label: 'Track & Field', icon: '🏃' }
];

export const ProMobileSportSelector: React.FC<ProMobileSportSelectorProps> = ({
  selectedSport,
  onSelectSport
}) => {
  return (
    <div className="w-full py-2 overflow-x-auto scrollbar-none flex items-center gap-2 px-1">
      {sports.map((sport) => {
        const isSelected = selectedSport === sport.id;
        return (
          <button
            key={sport.id}
            onClick={() => onSelectSport(sport.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              isSelected
                ? 'bg-[#F59E0B] text-[#161C22] border border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-105'
                : 'bg-[#1E2630] text-[#94A3B8] border border-[#2D3748] hover:border-[#2D3748] hover:text-white'
            }`}
          >
            <span>{sport.icon}</span>
            <span>{sport.label}</span>
          </button>
        );
      })}
    </div>
  );
};
