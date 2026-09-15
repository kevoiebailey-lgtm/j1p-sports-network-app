import React, { useState } from 'react';
import {
  Trophy,
  ShieldCheck,
  Eye,
  Building2,
  Camera,
  Heart,
  Sliders,
  User,
  UploadCloud
} from 'lucide-react';
import { UserRole } from '../../types';
import { AvatarUploadModal } from '../Profile/AvatarUploadModal';

export interface RoleAvatarProps {
  role?: UserRole;
  photoURL?: string | null;
  displayName?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showRoleBadge?: boolean;
  showRolePill?: boolean;
  animateGlow?: boolean;
  allowUpload?: boolean;
  onAvatarUpdated?: (newUrl: string) => void;
  className?: string;
}

export const ROLE_VISUAL_CONFIG: Record<
  string,
  {
    name: string;
    borderClass: string;
    ringClass: string;
    badgeBg: string;
    badgeText: string;
    glowShadow: string;
    pillBg: string;
    pillText: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  athlete: {
    name: 'Athlete',
    borderClass: 'border-[#FF6A00]',
    ringClass: 'ring-2 ring-[#FF6A00]/50',
    badgeBg: 'bg-[#FF6A00] text-white',
    badgeText: 'VERIFIED ATHLETE',
    glowShadow: 'shadow-[0_0_15px_rgba(255,106,0,0.4)]',
    pillBg: 'bg-[#FF6A00]/10 border-[#FF6A00]/40',
    pillText: 'text-[#FF6A00]',
    icon: Trophy
  },
  coach: {
    name: 'Coach',
    borderClass: 'border-[#00B8D4]',
    ringClass: 'ring-2 ring-[#00B8D4]/50',
    badgeBg: 'bg-[#00B8D4] text-slate-950 font-bold',
    badgeText: 'VERIFIED COACH',
    glowShadow: 'shadow-[0_0_15px_rgba(0,184,212,0.4)]',
    pillBg: 'bg-[#00B8D4]/10 border-[#00B8D4]/40',
    pillText: 'text-[#00B8D4]',
    icon: ShieldCheck
  },
  scout: {
    name: 'Recruiter / Scout',
    borderClass: 'border-purple-500',
    ringClass: 'ring-2 ring-purple-500/50',
    badgeBg: 'bg-purple-500 text-white',
    badgeText: 'NCAA SCOUT',
    glowShadow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]',
    pillBg: 'bg-purple-500/10 border-purple-500/40',
    pillText: 'text-purple-400',
    icon: Eye
  },
  organization: {
    name: 'Organization',
    borderClass: 'border-[#FFC857]',
    ringClass: 'ring-2 ring-[#FFC857]/50',
    badgeBg: 'bg-[#FFC857] text-slate-950 font-bold',
    badgeText: 'SANCTIONED HOST',
    glowShadow: 'shadow-[0_0_15px_rgba(255,200,87,0.4)]',
    pillBg: 'bg-[#FFC857]/10 border-[#FFC857]/40',
    pillText: 'text-[#FFC857]',
    icon: Building2
  },
  creator: {
    name: 'Media Creator',
    borderClass: 'border-rose-500',
    ringClass: 'ring-2 ring-rose-500/50',
    badgeBg: 'bg-rose-500 text-white',
    badgeText: 'PRO MEDIA CREATOR',
    glowShadow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)]',
    pillBg: 'bg-rose-500/10 border-rose-500/40',
    pillText: 'text-rose-400',
    icon: Camera
  },
  content_creator: {
    name: 'Media Creator',
    borderClass: 'border-rose-500',
    ringClass: 'ring-2 ring-rose-500/50',
    badgeBg: 'bg-rose-500 text-white',
    badgeText: 'PRO MEDIA CREATOR',
    glowShadow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)]',
    pillBg: 'bg-rose-500/10 border-rose-500/40',
    pillText: 'text-rose-400',
    icon: Camera
  },
  viewer: {
    name: 'Fan / Spectator',
    borderClass: 'border-emerald-500',
    ringClass: 'ring-2 ring-emerald-500/50',
    badgeBg: 'bg-emerald-500 text-slate-950 font-bold',
    badgeText: 'SPECTATOR PASS',
    glowShadow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]',
    pillBg: 'bg-emerald-500/10 border-emerald-500/40',
    pillText: 'text-emerald-400',
    icon: Heart
  },
  admin: {
    name: 'System Admin',
    borderClass: 'border-[#FF6A00]',
    ringClass: 'ring-2 ring-[#FF6A00]/50',
    badgeBg: 'bg-[#FF6A00] text-white',
    badgeText: 'SYSTEM ADMIN',
    glowShadow: 'shadow-[0_0_15px_rgba(255,106,0,0.4)]',
    pillBg: 'bg-[#FF6A00]/10 border-[#FF6A00]/40',
    pillText: 'text-[#FF6A00]',
    icon: Sliders
  }
};

export const RoleAvatar: React.FC<RoleAvatarProps> = ({
  role = 'athlete',
  photoURL,
  displayName,
  size = 'md',
  showRoleBadge = true,
  showRolePill = false,
  animateGlow = false,
  allowUpload = false,
  onAvatarUpdated,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const config = ROLE_VISUAL_CONFIG[role] || ROLE_VISUAL_CONFIG.athlete;
  const RoleIcon = config.icon;

  // Size mappings
  const sizeClasses = {
    xs: { container: 'w-7 h-7', text: 'text-[10px]', badge: 'w-3 h-3 p-0.5', badgeIcon: 'w-2 h-2' },
    sm: { container: 'w-9 h-9', text: 'text-xs', badge: 'w-3.5 h-3.5 p-0.5', badgeIcon: 'w-2.5 h-2.5' },
    md: { container: 'w-11 h-11', text: 'text-sm', badge: 'w-4 h-4 p-0.5', badgeIcon: 'w-3 h-3' },
    lg: { container: 'w-16 h-16', text: 'text-lg', badge: 'w-5 h-5 p-1', badgeIcon: 'w-3.5 h-3.5' },
    xl: { container: 'w-20 h-20', text: 'text-xl', badge: 'w-6 h-6 p-1', badgeIcon: 'w-4 h-4' },
    '2xl': { container: 'w-28 h-28', text: 'text-3xl', badge: 'w-8 h-8 p-1.5', badgeIcon: 'w-5 h-5' }
  }[size];

  const initial = displayName?.[0]?.toUpperCase() || 'U';

  return (
    <>
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div 
          className={`relative inline-block ${allowUpload ? 'group cursor-pointer' : ''}`}
          onClick={() => {
            if (allowUpload) setIsModalOpen(true);
          }}
          title={allowUpload ? 'Click to change avatar' : undefined}
        >
          {/* Border / Glow container */}
          <div
            className={`relative rounded-full p-0.5 border-2 ${config.borderClass} ${config.ringClass} ${
              animateGlow ? `${config.glowShadow} animate-pulse` : ''
            } transition-all duration-300 group-hover:brightness-110`}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName || 'User Avatar'}
                className={`${sizeClasses.container} rounded-full object-cover bg-slate-800`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className={`${sizeClasses.container} rounded-full bg-slate-800 flex items-center justify-center font-bold text-white uppercase ${sizeClasses.text}`}
              >
                {initial}
              </div>
            )}

            {/* Hover Camera Icon when allowUpload is true */}
            {allowUpload && (
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#00F5D4]">
                <Camera className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Role Badge Overlay at bottom-right */}
          {showRoleBadge && (
            <div
              title={`${config.name} (${config.badgeText})`}
              className={`absolute -bottom-1 -right-1 rounded-full ${config.badgeBg} border border-slate-950 shadow-md flex items-center justify-center ${sizeClasses.badge}`}
            >
              <RoleIcon className={sizeClasses.badgeIcon} />
            </div>
          )}
        </div>

        {/* Optional Tag Pill */}
        {showRolePill && (
          <span
            className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${config.pillBg} ${config.pillText}`}
          >
            {config.badgeText}
          </span>
        )}
      </div>

      {allowUpload && (
        <AvatarUploadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentAvatarUrl={photoURL || undefined}
          onAvatarUpdated={onAvatarUpdated}
        />
      )}
    </>
  );
};
