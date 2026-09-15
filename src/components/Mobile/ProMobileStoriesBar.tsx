import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Flame, Radio, Video, Trophy, Sparkles } from 'lucide-react';
import { MobileStoryItem, MobileStoryViewerModal } from './MobileStoryViewerModal';

const sampleStories: MobileStoryItem[] = [
  {
    id: 's1',
    athleteName: 'Jayden Carter',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    sport: 'Basketball',
    gradYear: '2026',
    title: 'Poster Dunk vs Gauchos in EYBL Semifinals 🏀🔥',
    mediaUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
    isLive: true,
    views: '14.2k',
    flames: 384
  },
  {
    id: 's2',
    athleteName: 'Maya Sanchez',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    sport: 'Flag Football',
    gradYear: '2027',
    title: '45-Yard TD Bomb in Metro Championship 🏈⚡',
    mediaUrl: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&auto=format&fit=crop&q=80',
    isLive: false,
    views: '8.9k',
    flames: 219
  },
  {
    id: 's3',
    athleteName: 'Marcus Vance',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    sport: 'Lacrosse',
    gradYear: '2026',
    title: 'Game-Winning Overtime Rip! 🥍💥',
    mediaUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=800&auto=format&fit=crop&q=80',
    isLive: false,
    views: '6.1k',
    flames: 154
  },
  {
    id: 's4',
    athleteName: 'Hoop Group Metro',
    avatarUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=150&auto=format&fit=crop&q=80',
    sport: 'Tournament Live',
    gradYear: '2026',
    title: 'Court 1 Championship Game Action LIVE! 🏆',
    mediaUrl: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&auto=format&fit=crop&q=80',
    isLive: true,
    views: '22.5k',
    flames: 512
  },
  {
    id: 's5',
    athleteName: 'Sienna Ross',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    sport: 'Volleyball',
    gradYear: '2026',
    title: 'Spike Block Combo in Tri-State Cup 🏐',
    mediaUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80',
    isLive: false,
    views: '5.4k',
    flames: 128
  }
];

interface ProMobileStoriesBarProps {
  onAddStory?: () => void;
}

export const ProMobileStoriesBar: React.FC<ProMobileStoriesBarProps> = ({ onAddStory }) => {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);

  return (
    <div className="w-full py-2 overflow-x-auto scrollbar-none flex items-center gap-3.5 px-1">
      {/* 1. Add Story Bubble */}
      <div 
        onClick={onAddStory}
        className="flex flex-col items-center gap-1 cursor-pointer shrink-0 group"
      >
        <div className="relative w-15 h-15 rounded-full bg-[#FF6A00]/10 dark:bg-[#FF6A00]/15 border-2 border-dashed border-[#FF6A00] dark:border-[#FFC857] flex items-center justify-center group-hover:bg-[#FF6A00]/20 transition-all shadow-xs">
          <Plus className="w-6 h-6 text-[#FF6A00] dark:text-[#FFC857] stroke-[2.5]" />
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#FF6A00] text-white font-black text-[10px] flex items-center justify-center shadow-xs">
            +
          </span>
        </div>
        <span className="text-[10px] font-black font-mono text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
          Post Film
        </span>
      </div>

      {/* 2. Story Rings */}
      {sampleStories.map((story, idx) => (
        <div
          key={story.id}
          onClick={() => setSelectedStoryIndex(idx)}
          className="flex flex-col items-center gap-1 cursor-pointer shrink-0 group"
        >
          <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-[#FF6A00] via-[#00B8D4] to-[#FFC857] shadow-xs group-hover:scale-105 transition-transform">
            <div className="p-0.5 bg-white dark:bg-[#263238] rounded-full">
              <img
                src={story.avatarUrl}
                alt={story.athleteName}
                className="w-14 h-14 rounded-full object-cover"
              />
            </div>

            {story.isLive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-[#FF6A00] text-white font-mono font-black text-[8px] uppercase tracking-wider rounded-full border border-white dark:border-[#263238] animate-pulse shadow-xs">
                LIVE
              </span>
            )}
          </div>

          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 max-w-[64px] truncate text-center">
            {story.athleteName.split(' ')[0]}
          </span>
        </div>
      ))}

      {/* STORY VIEWER MODAL */}
      <MobileStoryViewerModal
        isOpen={selectedStoryIndex !== null}
        onClose={() => setSelectedStoryIndex(null)}
        stories={sampleStories}
        initialIndex={selectedStoryIndex || 0}
      />
    </div>
  );
};
