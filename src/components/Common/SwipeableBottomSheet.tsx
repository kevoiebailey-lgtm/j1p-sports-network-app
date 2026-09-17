import React from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';

interface SwipeableBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const SwipeableBottomSheet: React.FC<SwipeableBottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  // Handle drag end logic for fluid drag-to-dismiss
  const handleDragEnd = (_: any, info: PanInfo) => {
    // Dismiss if swiped down past 100px or swiped fast downward
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#212A31]/80 backdrop-blur-md"
          />

          {/* SWIPEABLE SHEET CONTAINER */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="relative z-10 w-full max-w-lg bg-[#212A31] border-t border-slate-800 rounded-t-3xl p-5 max-h-[85dvh] flex flex-col shadow-2xl touch-pan-y"
          >
            {/* TOUCH DRAG HANDLE BAR */}
            <div className="w-12 h-1.5 bg-slate-700 hover:bg-[#E5B868] rounded-full mx-auto mb-3 cursor-grab active:cursor-grabbing transition-colors shrink-0" />

            {/* OPTIONAL SHEET HEADER */}
            {title && (
              <div className="pb-3 mb-3 border-b border-slate-800/80 flex justify-between items-center shrink-0">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  {title}
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Swipe down to close</span>
              </div>
            )}

            {/* SHEET CONTENT WRAPPER */}
            <div className="overflow-y-auto flex-1 space-y-4 pb- safe">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
