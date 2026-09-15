import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Video, 
  Image as ImageIcon, 
  MessageSquare, 
  Sparkles, 
  Trophy, 
  Flame, 
  User 
} from 'lucide-react';
import { TopHeaderBar, SportOption, DEFAULT_SPORTS } from './Navigation/TopHeaderBar';
import { LiveScoreTicker } from './Navigation/LiveScoreTicker';
import { ScoutPlaylistDrawer } from './MediaHub/ScoutPlaylistDrawer';
import { CollapsibleFloatingNav } from './Navigation/CollapsibleFloatingNav';
import { CreatePublishModal } from './Social/CreatePublishModal';
import { WalkthroughModal } from './Walkthrough/WalkthroughModal';
import { Footer } from './Footer';
import { triggerHaptic } from '../lib/haptics';

const SWIPE_TABS = ['home', 'live', 'events', 'gallery', 'athletes', 'social', 'profile'];

export interface AppLayoutShellProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  selectedSport?: SportOption;
  setSelectedSport?: (sport: SportOption) => void;
  children?: React.ReactNode;
  onOpenNotifications?: () => void;
  onOpenAuthModal?: () => void;
  onOpenWalkthrough?: () => void;
}

export const AppLayoutShell: React.FC<AppLayoutShellProps> = ({
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab,
  selectedSport: externalSport,
  setSelectedSport: externalSetSport,
  children,
  onOpenNotifications,
  onOpenAuthModal,
  onOpenWalkthrough: externalOpenWalkthrough
}) => {
  // Internal fallback states if used standalone
  const [internalActiveTab, setInternalActiveTab] = useState<string>('home');
  const [internalSport, setInternalSport] = useState<SportOption>(DEFAULT_SPORTS[0]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState<boolean>(false);

  // Auto-trigger walkthrough for first-time visitors
  React.useEffect(() => {
    const isCompleted = localStorage.getItem('just1play_walkthrough_completed');
    if (!isCompleted) {
      const timer = setTimeout(() => {
        setIsWalkthroughOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const currentTab = externalActiveTab || internalActiveTab;
  const handleTabChange = externalSetActiveTab || setInternalActiveTab;

  const currentSport = externalSport || internalSport;
  const handleSportChange = externalSetSport || setInternalSport;

  const currentIndex = SWIPE_TABS.indexOf(currentTab);

  const touchStartXRef = React.useRef<number | null>(null);
  const touchStartYRef = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, video, audio, iframe, [role="button"], .overflow-x-auto, .overflow-x-scroll, .no-swipe, [data-no-swipe="true"]')) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Strict threshold: Must be decisive horizontal motion (> 95px) and minimal vertical movement (< 40px)
    if (Math.abs(deltaX) > 95 && Math.abs(deltaY) < 40) {
      if (deltaX < 0 && currentIndex !== -1 && currentIndex < SWIPE_TABS.length - 1) {
        triggerHaptic('light');
        handleTabChange(SWIPE_TABS[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        triggerHaptic('light');
        handleTabChange(SWIPE_TABS[currentIndex - 1]);
      }
    }
  };

  const [isScoutBoardOpen, setIsScoutBoardOpen] = useState<boolean>(false);

  return (
    <div className="relative min-h-screen bg-[#F4F4F4] dark:bg-[#140802] text-[#263238] dark:text-white flex flex-col antialiased selection:bg-[#FF6A00] selection:text-white transition-colors duration-300 overflow-x-hidden">
      
      {/* ATMOSPHERIC #FF6A00 DARK STADIUM AMBIENT LIGHT GLOW MESH */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top-Center Blaze Orange (#FF6A00) Stadium Floodlight Orb */}
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[700px] h-[550px] bg-[#FF6A00]/20 dark:bg-[#FF6A00]/25 rounded-full blur-[160px]" />

        {/* Top-Left Electric Cyan (#00B8D4) Ambient Orb */}
        <div className="absolute -top-24 -left-28 w-[500px] h-[500px] bg-[#00B8D4]/15 dark:bg-[#00B8D4]/18 rounded-full blur-[140px]" />
        
        {/* Top-Right Blaze Solar (#FF8C00 / #FFC857) Ambient Orb */}
        <div className="absolute -top-20 -right-20 w-[520px] h-[520px] bg-[#FF6A00]/15 dark:bg-[#FF6A00]/20 rounded-full blur-[150px]" />
        
        {/* Middle-Right Cobalt / Electric Blue (#3B82F6) Ambient Orb */}
        <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] bg-[#3B82F6]/10 dark:bg-[#3B82F6]/12 rounded-full blur-[160px]" />

        {/* Middle-Left Emerald Green (#10B981) Ambient Orb */}
        <div className="absolute top-1/2 -left-36 w-[520px] h-[520px] bg-[#10B981]/10 dark:bg-[#10B981]/12 rounded-full blur-[150px]" />

        {/* Bottom-Center Intense Blaze Orange (#FF6A00) Ambient Orb */}
        <div className="absolute -bottom-36 left-1/3 w-[700px] h-[520px] bg-gradient-to-r from-[#FF6A00]/20 via-[#FF8C00]/15 to-[#00B8D4]/15 rounded-full blur-[160px]" />
      </div>

      {/* Live Match Score Ticker */}
      <LiveScoreTicker onSelectGame={() => handleTabChange('live')} />

      {/* Tier 1: Global Sticky Header Bar */}
      <TopHeaderBar 
        activeTab={currentTab}
        setActiveTab={handleTabChange}
        selectedSport={currentSport} 
        setSelectedSport={handleSportChange} 
        onOpenNotifications={onOpenNotifications}
        onOpenAuthModal={onOpenAuthModal}
        onOpenWalkthrough={() => {
          if (externalOpenWalkthrough) externalOpenWalkthrough();
          setIsWalkthroughOpen(true);
        }}
      />

      {/* Tier 2: Main Content Viewport with clean passive touch detection */}
      <main 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 md:pb-16 transition-all duration-200"
      >
        {children ? (
          children
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {/* Standalone Fallback Views */}
              <div className="space-y-4">
                {currentTab === 'home' && (
                  <div className="p-6 sm:p-8 rounded-3xl frosted-glass text-center space-y-3 shadow-xl border border-white/15 dark:border-white/10 glow-cyan">
                    <div className="w-12 h-12 rounded-2xl clear-glass flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,184,212,0.35)] border border-[#00B8D4]/40">
                      <Sparkles className="w-6 h-6 text-[#00B8D4]" />
                    </div>
                    <h1 className="text-xl font-black text-[#263238] dark:text-white uppercase tracking-wider">
                      {currentSport.name} Dashboard
                    </h1>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed font-sans">
                      Welcome to Just1Play. Explore live scores, tournament brackets, and scout athlete highlight feeds.
                    </p>
                  </div>
                )}

                {currentTab === 'events' && (
                  <div className="p-6 sm:p-8 rounded-3xl frosted-glass text-center space-y-3 shadow-xl border border-white/15 dark:border-white/10 glow-teal">
                    <div className="w-12 h-12 rounded-2xl clear-glass flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(20,184,166,0.35)] border border-[#14B8A6]/40">
                      <Trophy className="w-6 h-6 text-[#14B8A6]" />
                    </div>
                    <h1 className="text-xl font-black text-[#263238] dark:text-white uppercase tracking-wider">Events & Tournament Central</h1>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed font-sans">
                      View schedules, single & double elimination brackets, and real-time check-ins.
                    </p>
                  </div>
                )}

                {currentTab === 'social' && (
                  <div className="p-6 sm:p-8 rounded-3xl frosted-glass text-center space-y-3 shadow-xl border border-white/15 dark:border-white/10 glow-pink">
                    <div className="w-12 h-12 rounded-2xl clear-glass flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(236,72,153,0.35)] border border-[#EC4899]/40">
                      <Flame className="w-6 h-6 text-[#EC4899]" />
                    </div>
                    <h1 className="text-xl font-black text-[#263238] dark:text-white uppercase tracking-wider">Social Wall</h1>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed font-sans">
                      4K game film reels, athlete photo feeds, and community chat.
                    </p>
                  </div>
                )}

                {currentTab === 'profile' && (
                  <div className="p-6 sm:p-8 rounded-3xl frosted-glass text-center space-y-3 shadow-xl border border-white/15 dark:border-white/10 glow-blue">
                    <div className="w-12 h-12 rounded-2xl clear-glass flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(59,130,246,0.35)] border border-[#3B82F6]/40">
                      <User className="w-6 h-6 text-[#3B82F6]" />
                    </div>
                    <h1 className="text-xl font-black text-[#263238] dark:text-white uppercase tracking-wider">Athlete Digital Locker</h1>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed font-sans">
                      Digital QR Pass Card, radar performance charts, and season logs.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Global Footer */}
      <Footer 
        onNavigateTab={(tab) => handleTabChange(tab)}
        onOpenStorefrontPage={() => handleTabChange('advertise')}
      />

      {/* Tier 3: Auto-Hiding / Collapsible Floating Dock */}
      <CollapsibleFloatingNav 
        activeTab={currentTab} 
        setActiveTab={handleTabChange}
        onOpenCreate={() => setIsCreateModalOpen(true)}
      />

      {/* Center FAB Post Creation Modal */}
      <CreatePublishModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Interactive Walkthrough Tour Modal */}
      <WalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        onNavigateTab={(tab) => handleTabChange(tab)}
      />

      {/* Scout Board Playlist Drawer */}
      <ScoutPlaylistDrawer
        isOpen={isScoutBoardOpen}
        onClose={() => setIsScoutBoardOpen(false)}
      />

    </div>
  );
};

export default AppLayoutShell;
