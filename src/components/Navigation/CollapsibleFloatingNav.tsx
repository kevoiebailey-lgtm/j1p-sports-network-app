import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Trophy, 
  Flame, 
  Camera, 
  User, 
  Plus,
  ChevronUp, 
  ChevronDown,
  Radio,
  Search
} from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  isFAB?: boolean;
  isLive?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'live', label: 'Live', icon: Radio, isLive: true },
  { id: 'events', label: 'Events', icon: Trophy },
  { id: 'athletes', label: 'Scout', icon: Search },
  { id: 'gallery', label: 'Gallery', icon: Camera },
  { id: 'social', label: 'Social', icon: Flame },
  { id: 'profile', label: 'Profile', icon: User },
];

export interface CollapsibleFloatingNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreate?: () => void;
}

export const CollapsibleFloatingNav: React.FC<CollapsibleFloatingNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreate,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [lastScrollY, setLastScrollY] = useState<number>(0);

  // Auto-hide on scroll down, show on scroll up, and modal suppression
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    const handleHide = () => setIsVisible(false);
    const handleShow = () => setIsVisible(true);
    const handleToggle = () => setIsExpanded((prev) => !prev);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('app:hide-dock', handleHide);
    window.addEventListener('app:show-dock', handleShow);
    window.addEventListener('app:toggle-dock', handleToggle);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('app:hide-dock', handleHide);
      window.removeEventListener('app:show-dock', handleShow);
      window.removeEventListener('app:toggle-dock', handleToggle);
    };
  }, [lastScrollY]);

  return (
    <div 
      className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex flex-col items-center gap-2 select-none mb-2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
    >
      <AnimatePresence>
        {isVisible && isExpanded && (
          <motion.nav
            initial={{ y: 60, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="pointer-events-auto flex items-center justify-between px-2 sm:px-3 py-1.5 bg-white/95 dark:bg-[#263238]/95 backdrop-blur-2xl border border-slate-200 dark:border-[#37474F] rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.7)] w-[95vw] sm:w-[560px] max-w-xl"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (item.isFAB) {
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      triggerHaptic('medium');
                      if (onOpenCreate) onOpenCreate();
                    }}
                    className="relative -top-3 flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-[#FF6A00] to-[#FFC857] hover:brightness-110 text-white font-black shadow-[0_0_20px_rgba(255,106,0,0.5)] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    aria-label="Create Post"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>
                );
              }

              return (
                <motion.button
                  key={item.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab(item.id);
                  }}
                  whileTap={{ scale: 0.92 }}
                  className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 text-xs font-bold transition-colors duration-150 cursor-pointer ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-[#90A4AE] hover:text-[#263238] dark:hover:text-white'
                  }`}
                >
                  {/* Framer Motion Active Shared Element Layout Pill (#FF6A00) */}
                  {isActive && (
                    <motion.div
                      layoutId="activeDockPill"
                      className="absolute inset-0 bg-[#FF6A00] border border-[#FFC857]/40 rounded-full shadow-[0_0_15px_rgba(255,106,0,0.4)]"
                      transition={{ 
                        type: 'spring', 
                        stiffness: 500, 
                        damping: 35, 
                        mass: 0.7 
                      }}
                    />
                  )}

                  {/* Icon with spring bounce and active glow */}
                  <motion.div
                    animate={{ 
                      scale: isActive ? 1.15 : 1,
                      y: isActive ? -1 : 0
                    }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    className="relative z-10 flex items-center justify-center"
                  >
                    <Icon className={`w-4 sm:w-5 h-4 sm:h-5 ${isActive ? 'text-white stroke-[2.5]' : 'text-slate-500 dark:text-[#90A4AE] group-hover:text-[#FF6A00] stroke-[1.75]'}`} />
                    {item.isLive && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00B8D4] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00B8D4]"></span>
                      </span>
                    )}
                  </motion.div>

                  {/* Label */}
                  <span className="relative z-10 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight mt-0.5">
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Manual Toggle Switch Pill */}
      <motion.button
        onClick={() => {
          setIsExpanded(!isExpanded);
          setIsVisible(true);
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-white/90 dark:bg-[#263238]/90 hover:border-[#FF6A00] text-slate-600 dark:text-[#90A4AE] hover:text-[#FF6A00] border border-slate-200 dark:border-[#37474F] rounded-full backdrop-blur-md shadow-lg text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
      >
        <span>{isExpanded ? 'Minimize' : 'Dock'}</span>
        {isExpanded ? <ChevronDown className="w-3 h-3 text-[#FF6A00]" /> : <ChevronUp className="w-3 h-3 text-[#FF6A00]" />}
      </motion.button>
    </div>
  );
};

export default CollapsibleFloatingNav;

