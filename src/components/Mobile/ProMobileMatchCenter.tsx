import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Radio, ChevronRight, Activity, Zap } from 'lucide-react';
import { MainTab } from '../../types';

interface ProMobileMatchCenterProps {
  onNavigateTab: (tab: MainTab) => void;
}

export const ProMobileMatchCenter: React.FC<ProMobileMatchCenterProps> = ({ onNavigateTab }) => {
  const liveMatches = [
    {
      id: 'm1',
      tournament: 'Tri-State Showcase 2026',
      court: 'Court 1',
      team1: 'NJ Scholars 17U',
      score1: 78,
      team2: 'PSA Cardinals',
      score2: 74,
      status: 'LIVE • 4th Qtr 1:12',
      isLive: true
    },
    {
      id: 'm2',
      tournament: 'Gotham Flag Football Cup',
      court: 'Field A',
      team1: 'Metro Valkyries',
      score1: 28,
      team2: 'Empire Elites',
      score2: 24,
      status: 'Final (OT)',
      isLive: false
    },
    {
      id: 'm3',
      tournament: 'East Coast Lax Classic',
      court: 'Turf 3',
      team1: 'Bergen Prep',
      score1: 12,
      team2: 'Garden State Lax',
      score2: 11,
      status: 'Final',
      isLive: false
    }
  ];

  return (
    <div className="w-full bg-[#212A31]/80 border-y border-white/10 py-2.5 px-3 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#E5B868] animate-pulse shadow-[0_0_8px_#E5B868]" />
          <span className="text-[11px] font-black font-mono uppercase text-white tracking-wider flex items-center gap-1">
            <span>LIVE MATCH CENTER</span>
            <span className="text-[#E5B868]">• 3 COURTS ACTIVE</span>
          </span>
        </div>

        <button
          onClick={() => onNavigateTab('events')}
          className="text-[10px] font-bold text-[#E5B868] hover:underline uppercase flex items-center gap-0.5 cursor-pointer font-mono"
        >
          <span>All Brackets</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {liveMatches.map((match) => (
          <div
            key={match.id}
            onClick={() => onNavigateTab('events')}
            className="shrink-0 w-64 p-3 rounded-2xl bg-[#212A31]/80 border border-white/10 hover:border-[#E5B868]/50 transition-all cursor-pointer font-mono text-xs space-y-2 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between text-[#94A3B8] text-xs font-semibold">
              <span className="truncate max-w-[130px]">{match.tournament}</span>
              <span className={`font-bold ${match.isLive ? 'text-[#E5B868] animate-pulse' : 'text-[#E5B868]'}`}>
                {match.status}
              </span>
            </div>

            <div className="flex items-center justify-between text-white font-bold text-sm opacity-100">
              <span className="truncate max-w-[150px]">{match.team1}</span>
              <span className="text-[#E5B868] font-mono text-xs">{match.score1}</span>
            </div>

            <div className="flex items-center justify-between text-[#94A3B8] text-xs font-semibold">
              <span className="truncate max-w-[150px]">{match.team2}</span>
              <span className="text-[#94A3B8] font-mono text-xs">{match.score2}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
