import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus, Flame, Trophy, Zap, Target, Dumbbell } from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

export interface SportsEmoji {
  emoji: string;
  label: string;
  category: string;
}

export const SPORTS_EMOJIS: SportsEmoji[] = [
  { emoji: '🔥', label: 'On Fire', category: 'Hype' },
  { emoji: '🏈', label: 'Football', category: 'Sport' },
  { emoji: '🏀', label: 'Basketball', category: 'Sport' },
  { emoji: '🏆', label: 'Championship', category: 'Award' },
  { emoji: '🙌', label: 'Hype Hands', category: 'Hype' },
  { emoji: '⚡', label: 'Electric Play', category: 'Energy' },
  { emoji: '🎯', label: 'Bullseye', category: 'Skill' },
  { emoji: '💪', label: 'Strong Finish', category: 'Power' },
];

interface FloatingBurst {
  id: string;
  emoji: string;
  x: number;
}

interface SportsEmojiReactionBarProps {
  postId: string;
  reactions?: Record<string, string[]>;
  currentUid: string;
  onReact: (postId: string, emoji: string) => void;
  className?: string;
}

export const SportsEmojiReactionBar: React.FC<SportsEmojiReactionBarProps> = ({
  postId,
  reactions = {},
  currentUid,
  onReact,
  className = ''
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [bursts, setBursts] = useState<FloatingBurst[]>([]);

  // Calculate active reaction statistics
  const activeReactions = Object.entries(reactions)
    .map(([emoji, uids]) => ({
      emoji,
      count: uids ? uids.length : 0,
      hasReacted: uids ? uids.includes(currentUid) : false
    }))
    .filter(item => item.count > 0);

  const totalReactionsCount = activeReactions.reduce((acc, r) => acc + r.count, 0);

  const handleEmojiClick = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');

    // Trigger floating burst particle
    const rect = e.currentTarget.getBoundingClientRect();
    const burstId = `${emoji}-${Date.now()}-${Math.random()}`;
    const newBurst: FloatingBurst = {
      id: burstId,
      emoji,
      x: Math.random() * 40 - 20 // Slight horizontal drift
    };

    setBursts(prev => [...prev, newBurst]);
    setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== burstId));
    }, 1000);

    onReact(postId, emoji);
  };

  return (
    <div className={`relative space-y-2.5 ${className}`}>
      {/* Floating Emoji Particles Layer */}
      <div className="absolute inset-x-0 -top-12 pointer-events-none z-40 flex justify-center overflow-visible">
        <AnimatePresence>
          {bursts.map(burst => (
            <motion.div
              key={burst.id}
              initial={{ opacity: 1, y: 10, scale: 0.6, x: burst.x }}
              animate={{ opacity: 0, y: -60, scale: 1.8, x: burst.x * 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute text-2xl drop-shadow-[0_0_12px_rgba(214,28,36,0.8)] select-none"
            >
              {burst.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Primary Reaction Row: Active Badges + Add Reaction Button */}
      <div className="flex items-center flex-wrap gap-1.5">
        
        {/* Render existing active reaction pills */}
        {activeReactions.map(({ emoji, count, hasReacted }) => (
          <button
            key={emoji}
            onClick={(e) => handleEmojiClick(emoji, e)}
            className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer select-none active:scale-95 ${
              hasReacted
                ? 'bg-red-600/20 text-red-500 border-red-600/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-gray-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-red-600/40 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
            title={`React with ${emoji} (${count})`}
          >
            <span className="text-sm transform group-hover:scale-125 transition-transform">
              {emoji}
            </span>
            <span className={hasReacted ? 'text-red-500 font-extrabold' : 'text-slate-600 dark:text-slate-400'}>
              {count}
            </span>
          </button>
        ))}

        {/* Quick Picker Toggle Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              setIsPickerOpen(!isPickerOpen);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer select-none ${
              isPickerOpen
                ? 'bg-red-600 text-slate-950 border-red-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'bg-gray-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-gray-200 dark:border-slate-700/80 hover:text-slate-900 dark:hover:text-white hover:border-red-600/40'
            }`}
            title="Sports Emoji Reactions"
          >
            <SmilePlus className={`w-3.5 h-3.5 ${isPickerOpen ? 'text-slate-950 stroke-[2.5]' : 'text-red-600'}`} />
            <span>React</span>
            {totalReactionsCount > 0 && !activeReactions.length && (
              <span className="text-[10px] text-slate-400 font-normal">({totalReactionsCount})</span>
            )}
          </button>

          {/* Quick Sports Emoji Popover Palette */}
          <AnimatePresence>
            {isPickerOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 bottom-full mb-2 z-30 p-2 rounded-2xl bg-[#212A31]/95 border border-slate-800 shadow-2xl backdrop-blur-xl flex items-center gap-1 shrink-0"
              >
                {SPORTS_EMOJIS.map(({ emoji, label }) => {
                  const hasReacted = reactions[emoji]?.includes(currentUid);
                  return (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        handleEmojiClick(emoji, e);
                        setIsPickerOpen(false);
                      }}
                      className={`p-2 rounded-xl text-lg hover:bg-slate-800 transform hover:scale-130 active:scale-90 transition-all cursor-pointer relative group/item ${
                        hasReacted ? 'bg-red-600/20 border border-red-600/40' : ''
                      }`}
                      title={label}
                    >
                      <span>{emoji}</span>
                      
                      {/* Tooltip */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 rounded-md bg-[#212A31] border border-slate-700 text-[10px] font-mono text-white whitespace-nowrap opacity-0 group-hover/item:opacity-100 pointer-events-none transition-opacity shadow-lg">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
