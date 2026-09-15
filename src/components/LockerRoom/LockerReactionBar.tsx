import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Flame, Crosshair, Trophy } from 'lucide-react';
import { ReactionType, ReactionCounts } from './types';

interface LockerReactionBarProps {
  reactions: ReactionCounts;
  userReaction?: ReactionType;
  onReact: (type: ReactionType) => void;
  disabled?: boolean;
}

export const REACTION_CONFIG: {
  type: ReactionType;
  label: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
  activeBorder: string;
  activeGlow: string;
}[] = [
  {
    type: 'hype',
    label: 'Hype',
    icon: Zap,
    color: 'text-[#00B8D4]',
    activeBg: 'bg-[#00B8D4]/20',
    activeBorder: 'border-[#00B8D4]',
    activeGlow: 'shadow-[0_0_15px_rgba(0,184,212,0.35)]'
  },
  {
    type: 'sauce',
    label: 'Sauce',
    icon: Flame,
    color: 'text-[#FF6A00]',
    activeBg: 'bg-[#FF6A00]/20',
    activeBorder: 'border-[#FF6A00]',
    activeGlow: 'shadow-[0_0_15px_rgba(255,106,0,0.35)]'
  },
  {
    type: 'clutch',
    label: 'Clutch',
    icon: Crosshair,
    color: 'text-[#00F5D4]',
    activeBg: 'bg-[#00F5D4]/20',
    activeBorder: 'border-[#00F5D4]',
    activeGlow: 'shadow-[0_0_15px_rgba(0,245,212,0.35)]'
  },
  {
    type: 'bigW',
    label: 'Big W',
    icon: Trophy,
    color: 'text-[#FFC857]',
    activeBg: 'bg-[#FFC857]/20',
    activeBorder: 'border-[#FFC857]',
    activeGlow: 'shadow-[0_0_15px_rgba(255,200,87,0.35)]'
  }
];

export const LockerReactionBar: React.FC<LockerReactionBarProps> = ({
  reactions,
  userReaction,
  onReact,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-2 border-t border-[#24324F]/70">
      {REACTION_CONFIG.map((config) => {
        const Icon = config.icon;
        const isSelected = userReaction === config.type;
        const count = reactions[config.type] || 0;

        return (
          <button
            key={config.type}
            onClick={() => onReact(config.type)}
            disabled={disabled}
            className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 border ${
              isSelected
                ? `${config.activeBg} ${config.activeBorder} ${config.color} ${config.activeGlow} font-black`
                : 'bg-black/30 hover:bg-black/60 border-white/5 hover:border-white/20 text-slate-300 hover:text-white'
            }`}
            title={`React with ${config.label}`}
          >
            <motion.div
              animate={isSelected ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Icon className={`w-4 h-4 ${isSelected ? config.color : 'text-slate-400'}`} />
            </motion.div>
            <span className="hidden sm:inline font-sans">{config.label}</span>
            <span className={`text-[11px] font-black ${isSelected ? config.color : 'text-slate-400'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

