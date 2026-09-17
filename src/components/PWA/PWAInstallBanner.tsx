import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../../lib/haptics';

const DISMISSAL_KEY = 'j1p_pwa_install_dismissed_until';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface PWAInstallBannerProps {
  deferredPrompt: any;
  onOpenGuide: () => void;
  onInstalled?: () => void;
}

/**
 * Component 1: Install Just1Play Banner (Mobile / Responsive)
 * Positioned above the floating dock (fixed bottom-28 z-50).
 */
export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  deferredPrompt,
  onOpenGuide,
  onInstalled
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already in standalone app mode (iOS or Android PWA installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    // Check if user dismissed it within the last 7 days
    const dismissedUntil = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    triggerHaptic('medium');
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('[PWA] Native installation accepted by user');
          setIsVisible(false);
          onInstalled?.();
          return;
        }
      } catch (err) {
        console.warn('Native prompt failed, falling back to guide:', err);
      }
    }
    // Fallback or iOS Safari: open the step-by-step guide modal
    onOpenGuide();
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    setIsVisible(false);
    // Dismiss for 7 days
    const nextPromptTime = Date.now() + SEVEN_DAYS_MS;
    localStorage.setItem(DISMISSAL_KEY, nextPromptTime.toString());
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-28 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 pointer-events-auto font-sans"
        >
          <div className="relative overflow-hidden p-4 rounded-3xl bg-white/95 dark:bg-[#1E282D]/95 border border-slate-200 dark:border-white/15 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3 text-[#263238] dark:text-white">
            {/* Ambient Background Glow */}
            <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-[#FF6A00]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 cursor-pointer" onClick={handleInstallClick}>
              {/* Brand App Icon Badge */}
              <div className="w-11 h-11 rounded-2xl bg-white dark:bg-black/40 border border-[#FF6A00]/40 flex items-center justify-center text-[#FF6A00] shadow-md flex-shrink-0 relative overflow-hidden">
                <img src="/icon.svg" alt="Just1Play" className="w-8 h-8 object-contain" />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#263238] dark:text-white">Just1Play App</h4>
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30 rounded">
                    INSTALL
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-snug">
                  Save to home screen for full-screen scouting & feeds.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-mono font-black text-xs transition-all shadow-[0_0_15px_rgba(255,106,0,0.4)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap border border-[#FFC857]/30"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Save App</span>
              </button>

              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-xl text-slate-400 hover:text-[#263238] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Dismiss for 7 days"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallBanner;
