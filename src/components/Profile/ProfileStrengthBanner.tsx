import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ArrowRight, X, Trophy, Camera, Shield, Eye, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProfileStrengthBannerProps {
  onOpenProfileEditor?: (tab?: 'bio_info' | 'location' | 'socials' | 'preview') => void;
  className?: string;
}

export const ProfileStrengthBanner: React.FC<ProfileStrengthBannerProps> = ({
  onOpenProfileEditor,
  className = ''
}) => {
  const { user, profile, role } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!user || !profile || isDismissed) return null;

  // 1. Calculate Profile Strength Score & Missing Checklist Items
  const missingItems: { label: string; tab: 'bio_info' | 'location' | 'socials'; points: number }[] = [];
  let score = 0;

  // Common: Display Name (10 pts)
  if (profile.displayName && profile.displayName.trim() && profile.displayName !== 'Member' && profile.displayName !== 'Sports Athlete') {
    score += 10;
  } else {
    missingItems.push({ label: 'Display Name', tab: 'bio_info', points: 10 });
  }

  // Common: Photo (20 pts)
  const hasPhoto = Boolean((profile.photoURL && profile.photoURL.length > 5) || (profile.avatarUrl && profile.avatarUrl.length > 5));
  if (hasPhoto) {
    score += 20;
  } else {
    missingItems.push({ label: 'Profile Photo', tab: 'bio_info', points: 20 });
  }

  // Common: Bio statement (20 pts)
  if (profile.bio && profile.bio.trim().length >= 15) {
    score += 20;
  } else {
    missingItems.push({ label: 'Bio Statement', tab: 'bio_info', points: 20 });
  }

  // Common: Location / State (10 pts)
  if (profile.state || profile.city || profile.location) {
    score += 10;
  } else {
    missingItems.push({ label: 'Location / State', tab: 'location', points: 10 });
  }

  // Role-Specific Requirements (40 pts)
  const activeRole = role || profile.role || 'athlete';

  if (activeRole === 'athlete') {
    if (profile.sport) {
      score += 10;
    } else {
      missingItems.push({ label: 'Primary Sport', tab: 'bio_info', points: 10 });
    }

    if (profile.position || profile.primaryPosition) {
      score += 10;
    } else {
      missingItems.push({ label: 'Position', tab: 'bio_info', points: 10 });
    }

    if (profile.highSchool || profile.teamName || profile.gradYear) {
      score += 10;
    } else {
      missingItems.push({ label: 'High School & Grad Year', tab: 'bio_info', points: 10 });
    }

    if (profile.height || profile.weight || (profile.mediaUrls && profile.mediaUrls.length > 0)) {
      score += 10;
    } else {
      missingItems.push({ label: 'Height & Weight / Tape', tab: 'bio_info', points: 10 });
    }
  } else if (activeRole === 'coach') {
    if (profile.teamName || profile.schoolName || profile.orgAffiliation) {
      score += 15;
    } else {
      missingItems.push({ label: 'Team / School Name', tab: 'bio_info', points: 15 });
    }

    if (profile.programLevel || profile.coachTitle) {
      score += 15;
    } else {
      missingItems.push({ label: 'Program Level / Title', tab: 'bio_info', points: 15 });
    }

    if (profile.coachingPhilosophy || (profile.bio && profile.bio.length > 40)) {
      score += 10;
    } else {
      missingItems.push({ label: 'Coaching Philosophy', tab: 'bio_info', points: 10 });
    }
  } else if (activeRole === 'scout') {
    if (profile.orgAffiliation || profile.credentials) {
      score += 15;
    } else {
      missingItems.push({ label: 'Scouting Agency / Org', tab: 'bio_info', points: 15 });
    }

    if (profile.scoutingRegion || profile.scoutingCoverage) {
      score += 15;
    } else {
      missingItems.push({ label: 'Scouting Region', tab: 'bio_info', points: 15 });
    }

    if (profile.recruitingFocus) {
      score += 10;
    } else {
      missingItems.push({ label: 'Recruiting Focus', tab: 'bio_info', points: 10 });
    }
  } else if (activeRole === 'creator' || activeRole === 'content_creator') {
    if (profile.brandName || profile.teamName) {
      score += 15;
    } else {
      missingItems.push({ label: 'Creator Brand Name', tab: 'bio_info', points: 15 });
    }

    if (profile.mediaSpecialization) {
      score += 15;
    } else {
      missingItems.push({ label: 'Media Specialty', tab: 'bio_info', points: 15 });
    }

    if (profile.equipment || profile.portfolioUrl) {
      score += 10;
    } else {
      missingItems.push({ label: 'Camera Gear / Portfolio', tab: 'bio_info', points: 10 });
    }
  } else {
    // Fan / Supporter
    if (profile.favoriteTeams && profile.favoriteTeams.length > 0) {
      score += 20;
    } else {
      missingItems.push({ label: 'Favorite Teams', tab: 'bio_info', points: 20 });
    }

    if (profile.sportsFollowed || profile.sport) {
      score += 20;
    } else {
      missingItems.push({ label: 'Favorite Sports', tab: 'bio_info', points: 20 });
    }
  }

  // Cap score between 10 and 100
  const normalizedScore = Math.min(100, Math.max(15, score));
  const isComplete = (profile.profileComplete || profile.profileCompleted || normalizedScore >= 100);

  // If profile is 100% complete, show subtle verified completion badge
  if (isComplete) {
    return (
      <div className={`p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between gap-3 text-xs font-mono backdrop-blur-md ${className}`}>
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-emerald-300 font-bold">Profile 100% Complete:</strong> Your verified scouting card and credentials are active network-wide.
          </span>
        </div>
        <button
          onClick={() => onOpenProfileEditor?.('bio_info')}
          className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[11px] font-bold cursor-pointer transition-colors shrink-0"
        >
          Update Info
        </button>
      </div>
    );
  }

  // Role Accent Color mapping
  const getRoleBadge = () => {
    switch (activeRole) {
      case 'athlete':
        return { icon: Trophy, color: 'text-emerald-400', bar: 'from-emerald-500 to-teal-400' };
      case 'coach':
        return { icon: Shield, color: 'text-cyan-400', bar: 'from-cyan-500 to-blue-500' };
      case 'scout':
        return { icon: Eye, color: 'text-amber-400', bar: 'from-amber-500 to-orange-500' };
      case 'creator':
        return { icon: Camera, color: 'text-rose-400', bar: 'from-rose-500 to-pink-500' };
      default:
        return { icon: Heart, color: 'text-indigo-400', bar: 'from-indigo-500 to-purple-500' };
    }
  };

  const roleMeta = getRoleBadge();
  const IconComponent = roleMeta.icon;

  return (
    <div className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0C121D]/90 to-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3.5 ${className}`}>
      {/* Top Header Row */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
            <IconComponent className={`w-4 h-4 ${roleMeta.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase text-white tracking-wider">
                Profile Strength: {normalizedScore}%
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                Action Recommended
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-sans">
              Complete key details to unlock top scout placement, verified badges, and personalized opportunities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onOpenProfileEditor?.('bio_info')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C33] hover:brightness-110 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,106,0,0.3)] transition-all cursor-pointer active:scale-95"
          >
            <span>Complete Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss for this session"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${roleMeta.bar} transition-all duration-700 ease-out`}
            style={{ width: `${normalizedScore}%` }}
          />
        </div>
      </div>

      {/* Quick Missing Item Chips (1-tap to open modal to that item) */}
      {missingItems.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#FF6A00]" />
            Quick Add:
          </span>
          {missingItems.slice(0, 4).map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onOpenProfileEditor?.(item.tab)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6A00]/40 text-slate-300 hover:text-white text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="text-[#FF6A00] font-bold">+</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
