import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Users, 
  Image as ImageIcon, 
  Video, 
  Trophy, 
  Radio, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  ArrowRight,
  Compass,
  ShieldCheck,
  Zap,
  Star,
  Activity,
  Award,
  Layers
} from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

export interface WalkthroughStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  icon: React.ElementType;
  route: string;
  tabName: string;
  accentColor: string;
  badgeColor: string;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'welcome',
    badge: 'Platform Overview',
    title: 'Welcome to Just1Play',
    subtitle: 'Digital Sports Media, Recruiting Matrix & Tournament Central',
    description: 'Just1Play is the standalone sports ecosystem connecting youth and prep athletes directly with college recruiters, tournament directors, and 4K media videographers.',
    highlights: [
      '⚡ D1-D3 College Recruiter Scouting Matrix',
      '📷 4K Tournament Action Photography & Gallery',
      '🎥 Direct In-Feed Game Film & Highlight Reels',
      '🏆 Live Tournament Brackets & Digital QR Passes'
    ],
    icon: Sparkles,
    route: '/',
    tabName: 'home',
    accentColor: 'from-[#FF6A00] to-[#FF8C00]',
    badgeColor: 'bg-[#FF6A00]/15 text-[#FF6A00] border-[#FF6A00]/30'
  },
  {
    id: 'recruiter',
    badge: 'Recruiter Matrix',
    title: 'D1-D3 Scout Hub & Athlete Matrix',
    subtitle: 'Verified Stats, Radar Metrics & Direct Scout Messaging',
    description: 'Discover top athletic talent with multi-attribute combine performance radars, verified GPA/academic criteria, scout evaluations, and official Digital ID pass cards.',
    highlights: [
      '📊 Combine Stat Radars & Benchmark Percentiles',
      '🛡️ Verified Official Athlete Digital QR Passes',
      '📩 Direct Recruiter & Scout Connection Portal'
    ],
    icon: Users,
    route: '/athletes',
    tabName: 'athletes',
    accentColor: 'from-[#00B8D4] to-[#0091EA]',
    badgeColor: 'bg-[#00B8D4]/15 text-[#00B8D4] border-[#00B8D4]/30'
  },
  {
    id: 'gallery',
    badge: 'Media Coverage',
    title: 'Event Gallery & Action Shots',
    subtitle: 'Professional Action Photography & Media Vault',
    description: 'Browse high-resolution event photo albums captured by certified sports photographers. Download high-res digital downloads or share directly to social feeds.',
    highlights: [
      '📸 High-Definition Event Photo Albums',
      '⚡ Instant High-Res Downloads & Social Sharing',
      '📦 Custom Videography & Media Package Booking'
    ],
    icon: ImageIcon,
    route: '/gallery',
    tabName: 'gallery',
    accentColor: 'from-[#FFC857] to-[#FF6A00]',
    badgeColor: 'bg-[#FFC857]/15 text-[#FFC857] border-[#FFC857]/30'
  },
  {
    id: 'video',
    badge: 'Game Film',
    title: 'Video Hub & Highlight Reels',
    subtitle: '4K Game Film, Vertical Reels & Breakdown Clips',
    description: 'Stream full-length tournament game film, scout breakdown reels, and vertical video highlight feeds with broadcast player capabilities.',
    highlights: [
      '🎬 4K Native Video Player & Game Film Vault',
      '⭐ Scout Rating Scores & Performance Tags',
      '📱 Interactive Vertical Story & Highlight Feeds'
    ],
    icon: Video,
    route: '/media',
    tabName: 'media',
    accentColor: 'from-[#EC4899] to-[#F43F5E]',
    badgeColor: 'bg-[#EC4899]/15 text-[#EC4899] border-[#EC4899]/30'
  },
  {
    id: 'live_events',
    badge: 'Tournament Central',
    title: 'Live Streams, Brackets & QR Passes',
    subtitle: 'Real-Time Referee Scoring & Live Scoreboard HUDs',
    description: 'Follow live double-elimination brackets, track game schedules across venues, stream live broadcasts with score overlays, and scan passes at registration desks.',
    highlights: [
      '🔴 HD Live Stream Broadcasts & Score Bug Overlays',
      '🥇 Instant Bracket Progression & Court Schedules',
      '🎫 Official QR Staff Scanner & Check-In Portal'
    ],
    icon: Trophy,
    route: '/events',
    tabName: 'events',
    accentColor: 'from-[#10B981] to-[#00B8D4]',
    badgeColor: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
  },
  {
    id: 'divisions_brackets',
    badge: 'Divisions & Rosters',
    title: 'Multi-Division Tournaments & Seeding',
    subtitle: 'Age Groups, Team Roster Ingestion & Auto-Seeding',
    description: 'Create multi-division tournaments with dedicated age groups (10U to Varsity), register teams via self-service or bulk CSV upload, and automatically seed brackets from pool play.',
    highlights: [
      '⚡ Multi-Age Divisions (10U, 12U, 14U, Varsity)',
      '📋 Self-Service Team Registration & Roster Uploads',
      '📊 Automated Pool Standings & Bracket Tiebreakers'
    ],
    icon: Layers,
    route: '/tournaments',
    tabName: 'tournaments',
    accentColor: 'from-[#00E5FF] to-[#39FF14]',
    badgeColor: 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/30'
  }
];

export interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const WalkthroughModal: React.FC<WalkthroughModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);
  const navigate = useNavigate();

  const currentStep = WALKTHROUGH_STEPS[currentStepIndex];
  const totalSteps = WALKTHROUGH_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Handle keyboard navigation (Arrow keys / Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleDismiss = () => {
    triggerHaptic('light');
    if (dontShowAgain) {
      localStorage.setItem('just1play_walkthrough_completed', 'true');
    }
    onClose();
  };

  const handleNext = () => {
    triggerHaptic('light');
    if (isLastStep) {
      handleDismiss();
    } else {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      const nextStep = WALKTHROUGH_STEPS[nextIdx];
      if (nextStep && nextStep.route) {
        if (onNavigateTab) onNavigateTab(nextStep.tabName);
        navigate(nextStep.route);
      }
    }
  };

  const handlePrev = () => {
    triggerHaptic('light');
    if (!isFirstStep) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      const prevStep = WALKTHROUGH_STEPS[prevIdx];
      if (prevStep && prevStep.route) {
        if (onNavigateTab) onNavigateTab(prevStep.tabName);
        navigate(prevStep.route);
      }
    }
  };

  const handleJumpToStep = (index: number) => {
    triggerHaptic('light');
    setCurrentStepIndex(index);
    const step = WALKTHROUGH_STEPS[index];
    if (step && step.route) {
      if (onNavigateTab) onNavigateTab(step.tabName);
      navigate(step.route);
    }
  };

  const handleVisitSection = () => {
    triggerHaptic('medium');
    if (onNavigateTab) onNavigateTab(currentStep.tabName);
    navigate(currentStep.route);
  };

  if (!isOpen) return null;

  const StepIcon = currentStep.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto no-swipe">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-[#263238]/85 dark:bg-[#140802]/90 backdrop-blur-xl cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="relative w-full max-w-xl bg-white dark:bg-[#1E282D] border border-slate-200 dark:border-white/15 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-10 my-auto text-[#263238] dark:text-white"
          >
            {/* Top Accent Gradient Bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${currentStep.accentColor}`} />

            {/* Header Controls */}
            <div className="p-6 pb-3 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider border flex items-center gap-1.5 ${currentStep.badgeColor}`}>
                  <Zap className="w-3 h-3" />
                  {currentStep.badge}
                </span>
                <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                  Step {currentStepIndex + 1} of {totalSteps}
                </span>
              </div>

              <button
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 hover:text-black dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close Walkthrough"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              
              {/* Feature Icon & Title Block */}
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentStep.accentColor} p-0.5 shadow-lg shrink-0`}>
                  <div className="w-full h-full bg-white dark:bg-[#1E282D] rounded-[14px] flex items-center justify-center">
                    <StepIcon className="w-7 h-7 text-[#FF6A00]" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight text-[#263238] dark:text-white">
                    {currentStep.title}
                  </h3>
                  <p className="text-xs font-mono font-bold text-[#FF6A00] mt-0.5">
                    {currentStep.subtitle}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200 dark:border-white/10 font-sans">
                {currentStep.description}
              </p>

              {/* Key Features Bullet Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-[#FFC857]" />
                  Key Highlights
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentStep.highlights.map((highlight, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#00B8D4] shrink-0" />
                      <span className="truncate">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step Navigation Dots */}
              <div className="flex items-center justify-center gap-2 pt-2">
                {WALKTHROUGH_STEPS.map((step, idx) => (
                  <button
                    key={step.id}
                    onClick={() => handleJumpToStep(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentStepIndex 
                        ? 'w-8 bg-[#FF6A00] shadow-[0_0_12px_rgba(255,106,0,0.6)]' 
                        : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                    }`}
                    title={`Jump to ${step.title}`}
                  />
                ))}
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-6 bg-slate-50 dark:bg-black/40 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left: Don't show again toggle */}
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none font-mono">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#FF6A00] focus:ring-[#FF6A00]/20"
                />
                <span>Don't auto-show again</span>
              </label>

              {/* Right: Actions */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {/* Visit Section Button (Direct Navigation) */}
                {currentStep.route !== '/' && (
                  <button
                    onClick={handleVisitSection}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-[#263238] dark:text-white border border-slate-300 dark:border-white/15 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Viewport</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Prev Button */}
                {!isFirstStep && (
                  <button
                    onClick={handlePrev}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}

                {/* Next / Complete Button */}
                <button
                  onClick={handleNext}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-mono font-black text-xs transition-all shadow-[0_0_18px_rgba(255,106,0,0.45)] hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 cursor-pointer border border-[#FFC857]/40 uppercase tracking-wider"
                >
                  <span>{isLastStep ? 'Explore Platform' : 'Next Step'}</span>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WalkthroughModal;
