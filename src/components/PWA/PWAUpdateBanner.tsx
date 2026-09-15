import React from 'react';
import { Sparkles, Zap, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { reloadServiceWorker } from '../../registerServiceWorker';
import { triggerHaptic } from '../../lib/haptics';

interface PWAUpdateBannerProps {
  registration: ServiceWorkerRegistration | null;
}

/**
 * Component 2: Software Update Notification Banner
 * Anchored at fixed top-20 left-1/2 -translate-x-1/2 z-50
 */
export const PWAUpdateBanner: React.FC<PWAUpdateBannerProps> = ({ registration }) => {
  if (!registration) return null;

  const handleUpdateClick = () => {
    triggerHaptic('success');
    reloadServiceWorker(registration);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -25, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: -20, x: '-50%' }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="fixed top-20 left-1/2 z-50 w-[92%] max-w-md pointer-events-auto font-sans"
      >
        <div className="p-3.5 px-4 rounded-2xl bg-white/95 dark:bg-[#1E282D]/95 border border-slate-200 dark:border-white/15 text-[#263238] dark:text-white backdrop-blur-xl shadow-[0_0_30px_rgba(255,106,0,0.25)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6A00]/15 border border-[#FF6A00]/40 text-[#FF6A00] flex items-center justify-center flex-shrink-0 relative">
              <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FF6A00] animate-ping" />
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                Update Available
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                A newer version of Just1Play is available.
              </p>
            </div>
          </div>

          <button
            onClick={handleUpdateClick}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] active:scale-95 text-white font-mono font-black text-xs transition-all shadow-[0_0_15px_rgba(255,106,0,0.4)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0 border border-[#FFC857]/30"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Tap to Update</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAUpdateBanner;
