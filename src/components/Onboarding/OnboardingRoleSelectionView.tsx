import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Trophy,
  Shield,
  Eye,
  Camera,
  Heart,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Star,
  Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { BrandLogo } from '../Common/BrandLogo';
import { RoleOnboardingWizard } from './RoleOnboardingWizard';

// Whistle SVG custom component for Coach role
const WhistleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a4 4 0 0 0-4-4z" />
    <circle cx="8" cy="8" r="1.5" />
    <path d="M15 8h4.5a2.5 2.5 0 0 1 2.5 2.5v0a2.5 2.5 0 0 1-2.5 2.5H15" />
    <path d="M7 12v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-6" />
  </svg>
);

export interface RoleCardOption {
  id: UserRole;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  redirectUrl: string;
  accentColor: string;
  badge: string;
  badgeColor: string;
  tagColor: string;
}

const ROLE_OPTIONS: RoleCardOption[] = [
  {
    id: 'athlete',
    title: 'Athlete',
    subtitle: 'Player Profile & Stats',
    description: 'Build your recruiting profile, showcase highlight clips, and log game stats.',
    icon: Trophy,
    redirectUrl: '/profile',
    accentColor: 'from-[#FF6A00]/20 to-[#FFC857]/10 border-[#FF6A00]/40 text-[#FF6A00]',
    badge: 'VERIFIED MATRIX',
    badgeColor: 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40',
    tagColor: 'text-[#FF6A00]'
  },
  {
    id: 'coach',
    title: 'Coach',
    subtitle: 'Team Roster & Check-in Portal',
    description: 'Manage team rosters, check in for events, publish game schedules, and verify stats.',
    icon: WhistleIcon,
    redirectUrl: '/coach-check-in',
    accentColor: 'from-[#00B8D4]/20 to-[#0091EA]/10 border-[#00B8D4]/40 text-[#00B8D4]',
    badge: 'PROGRAM LEADER',
    badgeColor: 'bg-[#00B8D4]/20 text-[#00B8D4] border-[#00B8D4]/40',
    tagColor: 'text-[#00B8D4]'
  },
  {
    id: 'organization',
    title: 'Organization',
    subtitle: 'Tournament Director',
    description: 'Oversee athletic programs, host tryouts, and manage teams.',
    icon: Shield,
    redirectUrl: '/organizations',
    accentColor: 'from-[#FFC857]/20 to-[#FF6A00]/10 border-[#FFC857]/40 text-[#FFC857]',
    badge: 'TOURNAMENT HOST',
    badgeColor: 'bg-[#FFC857]/20 text-[#FFC857] border-[#FFC857]/40',
    tagColor: 'text-[#FFC857]'
  },
  {
    id: 'scout',
    title: 'Scout / Recruiter',
    subtitle: 'College & Prep Evaluation',
    description: 'Search verified player databases, track prospects, and view metrics.',
    icon: Eye,
    redirectUrl: '/scout',
    accentColor: 'from-purple-500/20 to-indigo-500/10 border-purple-500/40 text-purple-400',
    badge: 'PRO EVALUATOR',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    tagColor: 'text-purple-400'
  },
  {
    id: 'creator',
    title: 'Content Creator',
    subtitle: 'Media & Photography Studio',
    description: 'Upload game media, tag athletes, showcase portfolios, and accept bookings.',
    icon: Camera,
    redirectUrl: '/dashboard/creator/studio',
    accentColor: 'from-rose-500/20 to-pink-500/10 border-rose-500/40 text-rose-400',
    badge: 'MEDIA CREATOR',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    tagColor: 'text-rose-400'
  },
  {
    id: 'viewer',
    title: 'Parent / Fan / Spectator',
    subtitle: 'Live Feed & Highlights',
    description: 'Follow athletes, check live scores, view schedules, and watch game highlights.',
    icon: Heart,
    redirectUrl: '/dashboard/fan/feed',
    accentColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400',
    badge: 'SPECTATOR HUB',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    tagColor: 'text-emerald-400'
  }
];

export const OnboardingRoleSelectionView: React.FC = () => {
  const { switchRole, role: currentRole, user, profile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isWizardMode = searchParams.get('mode') === 'guided' || searchParams.get('step') === 'wizard';

  const isRoleLocked = Boolean(
    profile?.hasCompletedOnboarding &&
    profile?.role &&
    profile.role !== 'admin' &&
    currentRole !== 'admin'
  );

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    isRoleLocked && profile?.role ? profile.role : (currentRole && currentRole !== 'admin' ? currentRole : 'athlete')
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  const activeCard = ROLE_OPTIONS.find((r) => r.id === selectedRole) || ROLE_OPTIONS[0];

  const handleStartGuidedSetup = async () => {
    if (!isRoleLocked) {
      await switchRole(selectedRole);
    }
    setSearchParams({ mode: 'guided', role: isRoleLocked && profile?.role ? profile.role : selectedRole });
  };

  const handleConfirmRole = async () => {
    setSubmitting(true);
    try {
      await switchRole(selectedRole);
      await updateUserProfile({ hasCompletedOnboarding: true });

      // Perform role-based redirection
      if (selectedRole === 'creator' || selectedRole === 'content_creator') {
        navigate('/creator/studio');
      } else if (selectedRole === 'viewer') {
        navigate('/fan/feed');
      } else if (selectedRole === 'coach') {
        navigate('/coach-check-in');
      } else if (selectedRole === 'organization') {
        navigate('/organizations');
      } else if (selectedRole === 'scout') {
        navigate('/scout');
      } else {
        navigate('/profile');
      }
    } catch (err) {
      console.error('Failed to switch role on onboarding confirmation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (isWizardMode) {
    return (
      <RoleOnboardingWizard
        initialRole={selectedRole}
        onComplete={() => {
          setSearchParams({});
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[#263238] dark:text-white flex flex-col justify-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF6A00]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#00B8D4]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full space-y-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="flex justify-center">
            <BrandLogo size="lg" layout="vertical" showTagline={true} />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full frosted-glass border border-white/15 text-xs font-mono font-bold text-[#FF6A00]">
            <Sparkles className="w-4 h-4 text-[#FF6A00]" />
            <span>ROLE SELECTION & ACCESS CONTROL</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-[#263238] dark:text-white font-sans">
            Choose Your <span className="text-[#FF6A00] font-extrabold drop-shadow-[0_0_15px_rgba(255,106,0,0.4)]">Platform Access</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-mono max-w-2xl mx-auto leading-relaxed">
            Select your primary role below to customize your dashboard, access controls, and personalized sports feed.
          </p>

          {isRoleLocked && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 max-w-xl mx-auto text-center space-y-1 backdrop-blur-md">
              <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
                <span className="text-base">🔒</span> Role Immutable Policy Enforced
              </div>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                Your account is verified as <strong className="text-[#263238] dark:text-white uppercase">{profile?.role}</strong>. Server-side security rules lock member roles after onboarding completion.
              </p>
            </div>
          )}
        </div>

        {/* 6-Card Bento Grid with Frosted-Glass Containers & Neon Accent Borders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ROLE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedRole === option.id;

            return (
              <div
                key={option.id}
                onClick={() => {
                  if (!isRoleLocked) {
                    setSelectedRole(option.id);
                  }
                }}
                className={`relative group rounded-3xl p-6 transition-all duration-300 backdrop-blur-xl flex flex-col justify-between overflow-hidden ${
                  isRoleLocked ? (isSelected ? 'cursor-default frosted-glass border-2 border-[#FF6A00]' : 'cursor-not-allowed opacity-40 clear-glass border border-white/5') : 'cursor-pointer'
                } ${
                  !isRoleLocked && isSelected
                    ? 'frosted-glass border-2 border-[#FF6A00] shadow-[0_0_35px_rgba(255,106,0,0.3)] -translate-y-1'
                    : !isRoleLocked ? 'clear-glass hover:bg-white/10 dark:hover:bg-white/5 border border-white/15 hover:border-[#00B8D4]/50 hover:-translate-y-0.5' : ''
                }`}
              >
                {/* Active selection glow accent */}
                {isSelected && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6A00]/15 rounded-full blur-2xl pointer-events-none" />
                )}

                <div className="space-y-4">
                  {/* Top Bar: Icon Badge + Selection Checkmark */}
                  <div className="flex items-center justify-between">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${option.accentColor} border shadow-md`}>
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold tracking-wider px-2.5 py-1 rounded-full border uppercase ${option.badgeColor}`}>
                        {option.badge}
                      </span>
                      {isSelected && (
                        <div className="w-7 h-7 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shadow-[0_0_12px_rgba(255,106,0,0.8)]">
                          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role Titles */}
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-[#263238] dark:text-white font-sans group-hover:text-[#FF6A00] transition-colors">
                      {option.title}
                    </h3>
                    <p className={`text-xs font-mono font-bold mt-0.5 ${option.tagColor}`}>
                      {option.subtitle}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-mono leading-relaxed">
                    {option.description}
                  </p>
                </div>

                {/* Bottom Radio Button State */}
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className={isSelected ? 'text-[#FF6A00] font-bold' : 'text-slate-400'}>
                    {isSelected ? '✓ SELECTED ACCESS' : 'CLICK TO SELECT'}
                  </span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-[#FF6A00] bg-[#FF6A00]' : 'border-slate-500'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirmation Action Buttons */}
        <div className="p-6 rounded-3xl frosted-glass border border-white/15 backdrop-blur-xl flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6A00]/20 border border-[#FF6A00]/40 flex items-center justify-center text-[#FF6A00] shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase font-bold">
                Selected Access Mode
              </div>
              <div className="text-base font-black uppercase text-[#263238] dark:text-white font-sans flex items-center gap-2">
                <span>{activeCard.title}</span>
                <span className="text-xs font-mono text-[#FF6A00] font-normal italic">
                  ({activeCard.redirectUrl})
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <button
              onClick={handleStartGuidedSetup}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_25px_rgba(255,106,0,0.45)] border border-[#FFC857]/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Launch {activeCard.title} Setup Tour</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={handleConfirmRole}
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-3.5 clear-glass hover:bg-white/15 text-[#263238] dark:text-white font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Setting Mode...' : 'Quick Launch'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
