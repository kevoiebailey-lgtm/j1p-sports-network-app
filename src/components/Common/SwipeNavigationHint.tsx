import React from 'react';
import { ChevronLeft, ChevronRight, Hand, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SwipeNavigationHintProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  swipeHint?: string | null;
  className?: string;
}

export const SwipeNavigationHint: React.FC<SwipeNavigationHintProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  swipeHint,
  className = ''
}) => {
  const currentIndex = categories.indexOf(activeCategory);
  const prevCategory = categories[(currentIndex - 1 + categories.length) % categories.length];
  const nextCategory = categories[(currentIndex + 1) % categories.length];

  return (
    <div className={`relative space-y-3 ${className}`}>
      
      {/* Toast Feedback for active swipe */}
      <AnimatePresence>
        {swipeHint && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#212A31]/90 dark:bg-[#E5B868] text-white dark:text-black font-black text-xs uppercase tracking-wider shadow-2xl backdrop-blur-xl border border-white/20 dark:border-black/20 flex items-center gap-2 pointer-events-none"
          >
            <Sparkles className="w-4 h-4 text-[#E5B868] dark:text-black animate-pulse" />
            <span>{swipeHint}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe Gesture Bar with Left / Right Quick Controls */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs">
        
        {/* Swiping left button indicator */}
        <button
          onClick={() => onSelectCategory(prevCategory)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold uppercase transition-all cursor-pointer group"
          title={`Swipe or click for ${prevCategory}`}
        >
          <ChevronLeft className="w-4 h-4 text-[#E5B868] group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline text-[11px] font-mono text-slate-500 dark:text-slate-400">Prev:</span>
          <span className="text-[11px] truncate max-w-[90px]">{prevCategory}</span>
        </button>

        {/* Swipe Instruction Hint */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold select-none">
          <Hand className="w-3.5 h-3.5 text-[#E5B868] animate-bounce" />
          <span className="hidden md:inline">Swipe left / right on feed or use </span>
          <span className="hidden md:inline font-black text-slate-800 dark:text-white px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10">← →</span>
          <span className="md:hidden">Swipe feed left/right to change category</span>
        </div>

        {/* Swiping right button indicator */}
        <button
          onClick={() => onSelectCategory(nextCategory)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold uppercase transition-all cursor-pointer group"
          title={`Swipe or click for ${nextCategory}`}
        >
          <span className="text-[11px] truncate max-w-[90px]">{nextCategory}</span>
          <span className="hidden sm:inline text-[11px] font-mono text-slate-500 dark:text-slate-400">:Next</span>
          <ChevronRight className="w-4 h-4 text-[#E5B868] group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
