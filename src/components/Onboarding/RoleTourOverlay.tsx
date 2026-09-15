import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  QrCode,
  Users,
  ShieldCheck,
  Eye,
  Search,
  Bookmark,
  Trophy,
  Activity,
  Video,
  Building2,
  Calendar,
  Camera,
  Heart,
  Ticket,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Compass,
  ExternalLink,
  Target,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ROLE_VISUAL_CONFIG } from '../Common/RoleAvatar';

interface TourStep {
  title: string;
  subtitle: string;
  targetDescription: string;
  targetId?: string;
  routeUrl?: string;
  icon: React.FC<{ className?: string }>;
  highlightDetails: string[];
  actionText: string;
}

interface RoleTourOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  overrideRole?: UserRole;
}

export const ROLE_TOUR_STEPS: Record<string, TourStep[]> = {
  coach: [
    {
      title: 'QR Code Gate Scanner & Check-in',
      subtitle: 'Fast-Track Event Access',
      targetDescription: 'Located in Coach Portal (/coach-check-in)',
      targetId: 'qr-checkin-section',
      routeUrl: '/coach-check-in',
      icon: QrCode,
      highlightDetails: [
        'Instant barcode & QR scanning for player digital passes',
        'Auto-verifies sanction compliance and roster limits',
        'Generates offline check-in logs for tournament operators'
      ],
      actionText: 'Open Coach QR Check-in'
    },
    {
      title: 'Team Roster & Stat Verification',
      subtitle: 'Publish Official Roster & Passes',
      targetDescription: 'Located in Team Manager (/teams)',
      targetId: 'roster-manager-section',
      routeUrl: '/teams',
      icon: Users,
      highlightDetails: [
        'Assign jersey numbers, positions, and academic GPAs',
        'Issue digital spectator gate passes for player parents',
        'Approve verified game log stats before submission'
      ],
      actionText: 'View Roster Manager'
    },
    {
      title: 'Live Tournament Schedule & Court Grid',
      subtitle: 'Real-Time Schedule Sync',
      targetDescription: 'Located in Live Games (/games)',
      targetId: 'schedule-grid-section',
      routeUrl: '/games',
      icon: Calendar,
      highlightDetails: [
        'Live court assignment notifications',
        'Real-time score updates and bracket progression',
        'Direct communication channel with tournament directors'
      ],
      actionText: 'Check Game Schedule'
    }
  ],

  scout: [
    {
      title: 'Recruiter Roster Manager & Search',
      subtitle: 'Filter Prospects by Measurables',
      targetDescription: 'Located in Scouting Matrix (/scout)',
      targetId: 'roster-manager-section',
      routeUrl: '/scout',
      icon: Search,
      highlightDetails: [
        'Search prospects by height, wingspan, grad class, and position',
        'Filter by verified academic GPA and SAT/ACT scores',
        'Direct NCAA-compliant coach inquiry messaging'
      ],
      actionText: 'Explore Prospect Search'
    },
    {
      title: 'Custom Evaluation Rubric',
      subtitle: 'Log Player Ratings & Scout Notes',
      targetDescription: 'Located in Prospect Detail Sheets',
      targetId: 'scout-rubric-section',
      routeUrl: '/scout',
      icon: Eye,
      highlightDetails: [
        'Rate athleticism, shooting mechanics, and defensive motor',
        'Attach private scout notes accessible only to your staff',
        'Export PDF evaluation summaries for head coaches'
      ],
      actionText: 'Try Evaluation Rubric'
    },
    {
      title: 'Prospect Shortlist & Game Alerts',
      subtitle: 'Real-time Prospect Monitoring',
      targetDescription: 'Located in Recruiter Dashboard',
      targetId: 'shortlist-alerts-section',
      routeUrl: '/scout',
      icon: Bookmark,
      highlightDetails: [
        'Receive instant alerts when bookmarked players post game film',
        'Track stat trends over multi-game tournament weekends',
        'Share prospect boards with recruiting coordinator colleagues'
      ],
      actionText: 'View Shortlist Hub'
    }
  ],

  athlete: [
    {
      title: 'Verified Passport & Athletic Measurables',
      subtitle: 'Your Digital Recruiting Profile',
      targetDescription: 'Located in Athlete Profile (/profile)',
      targetId: 'verified-passport-section',
      routeUrl: '/profile',
      icon: Trophy,
      highlightDetails: [
        'Showcase official height, wingspan, 40-yard dash, and GPA',
        'Scouting verification badge for college recruiters',
        'Automatic calculation of season averages and stat highlights'
      ],
      actionText: 'View My Verified Passport'
    },
    {
      title: 'Video Highlight Reel & Hudl Integration',
      subtitle: 'Showcase Top Game Film',
      targetDescription: 'Located in Video Feed',
      targetId: 'highlight-video-section',
      routeUrl: '/profile',
      icon: Video,
      highlightDetails: [
        'Embed YouTube, Hudl, and Instagram mixtapes',
        'Auto-tag media creators and tournament games',
        'Track recruiter video watch time analytics'
      ],
      actionText: 'Manage Video Film'
    },
    {
      title: 'College Recruiter View Logs',
      subtitle: 'Track D1 & D2 College Inquiries',
      targetDescription: 'Located in Athlete Dashboard',
      targetId: 'recruiter-views-section',
      routeUrl: '/profile',
      icon: Activity,
      highlightDetails: [
        'See which college programs viewed your film',
        'Receive official camp invitations and recruiting questionnaires',
        'Share verified transcript and academic evaluation'
      ],
      actionText: 'Check Recruiter Views'
    }
  ],

  organization: [
    {
      title: 'Tournament Operations & Court Grid',
      subtitle: 'Sanctioned Event Hub',
      targetDescription: 'Located in Organization Hub (/organizations)',
      targetId: 'org-court-grid',
      routeUrl: '/organizations',
      icon: Building2,
      highlightDetails: [
        'Manage multi-court venue schedules and live scoreboards',
        'Set up referee assignments and official stat keepers',
        'Broadcast live HD stream feeds directly to spectator apps'
      ],
      actionText: 'Manage Tournament Hub'
    }
  ],

  creator: [
    {
      title: '4K Reel Studio & Player Tagging Engine',
      subtitle: 'Media Creator Operations',
      targetDescription: 'Located in Creator Studio (/creator/studio)',
      targetId: 'creator-studio-hub',
      routeUrl: '/creator/studio',
      icon: Camera,
      highlightDetails: [
        'Upload 4K game film and link directly to athlete profiles',
        'Offer player photo & highlight mixtape packages',
        'Earn media credentials for top national high school showcases'
      ],
      actionText: 'Open Creator Studio'
    }
  ],

  viewer: [
    {
      title: 'Multi-Cam Court Feed & Spectator Pass',
      subtitle: 'Live Game Streaming & Ticket Hub',
      targetDescription: 'Located in Fan Feed (/fan/feed)',
      targetId: 'fan-feed-hub',
      routeUrl: '/fan/feed',
      icon: Ticket,
      highlightDetails: [
        'Stream live court feeds in HD',
        'Follow favorite prospects and receive live score alerts',
        'Access fast-scan digital venue entry passes'
      ],
      actionText: 'Launch Fan Feed'
    }
  ]
};

export const RoleTourOverlay: React.FC<RoleTourOverlayProps> = ({
  isOpen,
  onClose,
  overrideRole
}) => {
  const { role: authRole } = useAuth();
  const navigate = useNavigate();

  const activeRole: UserRole = overrideRole || authRole || 'athlete';
  const roleConfig = ROLE_VISUAL_CONFIG[activeRole] || ROLE_VISUAL_CONFIG.athlete;

  const steps = ROLE_TOUR_STEPS[activeRole] || ROLE_TOUR_STEPS.athlete;
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  if (!isOpen) return null;

  const activeStep = steps[currentStepIndex] || steps[0];
  const StepIcon = activeStep.icon;

  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleExecuteAction = () => {
    if (activeStep.routeUrl) {
      navigate(activeStep.routeUrl);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#263238]/85 dark:bg-[#140802]/90 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="frosted-glass border border-white/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden font-sans text-[#263238] dark:text-white"
        >
          {/* Top Decorative Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#FF6A00]/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl clear-glass hover:bg-white/15 text-slate-500 dark:text-slate-300 hover:text-black dark:hover:text-white transition-all cursor-pointer border border-white/15"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Role Bar */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2.5 rounded-xl border ${roleConfig.pillBg} ${roleConfig.pillText}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${roleConfig.pillBg} ${roleConfig.pillText}`}>
                  {roleConfig.badgeText} FEATURE TOUR
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Step {currentStepIndex + 1} of {steps.length}</span>
              </div>
              <h2 className="text-xl font-black italic uppercase text-[#263238] dark:text-white font-sans tracking-tight mt-0.5">
                Interactive Feature Spotlight
              </h2>
            </div>
          </div>

          {/* Spotlight Card */}
          <div className="clear-glass border border-white/15 rounded-2xl p-6 relative overflow-hidden space-y-4">
            {/* Target Badge */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                <Target className="w-4 h-4 text-[#FF6A00]" />
                <span>{activeStep.targetDescription}</span>
              </div>
              <span className="text-[10px] font-mono text-[#FF6A00] bg-[#FF6A00]/10 px-2 py-0.5 rounded border border-[#FF6A00]/20 font-bold uppercase">
                SPOTLIGHT HIGHLIGHT
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-[#FF6A00]/10 border border-[#FF6A00]/30 text-[#FF6A00] shrink-0 shadow-md">
                <StepIcon className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block">{activeStep.subtitle}</span>
                <h3 className="text-lg font-bold text-[#263238] dark:text-white font-sans mt-0.5">
                  {activeStep.title}
                </h3>
              </div>
            </div>

            {/* Bullet Highlights */}
            <div className="space-y-2 pt-2">
              {activeStep.highlightDetails.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-[#00B8D4] shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>

            {/* Quick Action Button */}
            <div className="pt-2">
              <button
                onClick={handleExecuteAction}
                className="w-full py-3 clear-glass hover:bg-white/15 border border-white/20 text-xs font-mono font-bold text-[#263238] dark:text-white rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer hover:border-[#FF6A00]"
              >
                <span>{activeStep.actionText}</span>
                <ExternalLink className="w-4 h-4 text-[#FF6A00]" />
              </button>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between pt-6 mt-4 border-t border-white/10">
            <button
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
              className="px-4 py-2.5 rounded-xl clear-glass hover:bg-white/15 text-xs font-mono text-slate-600 dark:text-slate-300 hover:text-[#263238] dark:hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {/* Step Indicators */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentStepIndex ? 'w-6 bg-[#FF6A00] shadow-[0_0_8px_rgba(255,106,0,0.6)]' : 'w-2 bg-slate-300 dark:bg-white/20'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,106,0,0.45)] border border-[#FFC857]/40"
            >
              <span>{currentStepIndex === steps.length - 1 ? 'Finish Tour' : 'Next Feature'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RoleTourOverlay;
