import React from 'react';

export type FuturisticReactionKey = 'head_tap' | 'ice' | 'clamped' | 'cooking' | 'aura';

export interface ReactionMetadata {
  id: FuturisticReactionKey;
  label: string;
  shortLabel: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  accentBg: string;
  borderActive: string;
  badgeGradient: string;
}

export const FUTURISTIC_REACTIONS: Record<FuturisticReactionKey, ReactionMetadata> = {
  head_tap: {
    id: 'head_tap',
    label: 'HEAD TAP',
    shortLabel: 'Head Tap',
    tagline: 'Dominance / Mossed',
    primaryColor: '#FF0055',
    secondaryColor: '#FF2A85',
    glowColor: 'rgba(255, 0, 85, 0.45)',
    accentBg: 'rgba(255, 0, 85, 0.15)',
    borderActive: 'rgba(255, 0, 85, 0.65)',
    badgeGradient: 'from-[#FF0055] via-[#FF2A85] to-[#7928CA]'
  },
  ice: {
    id: 'ice',
    label: 'ICE IN VEINS',
    shortLabel: 'Ice In Veins',
    tagline: 'Clutch Performance',
    primaryColor: '#00F2FE',
    secondaryColor: '#0070F3',
    glowColor: 'rgba(0, 242, 254, 0.45)',
    accentBg: 'rgba(0, 242, 254, 0.15)',
    borderActive: 'rgba(0, 242, 254, 0.65)',
    badgeGradient: 'from-[#00F2FE] via-[#38BDF8] to-[#0070F3]'
  },
  clamped: {
    id: 'clamped',
    label: 'CLAMPED',
    shortLabel: 'Clamped',
    tagline: 'Lockdown Defense',
    primaryColor: '#10B981',
    secondaryColor: '#00FF88',
    glowColor: 'rgba(0, 255, 136, 0.45)',
    accentBg: 'rgba(16, 185, 129, 0.15)',
    borderActive: 'rgba(0, 255, 136, 0.65)',
    badgeGradient: 'from-[#00FF88] via-[#10B981] to-[#059669]'
  },
  cooking: {
    id: 'cooking',
    label: 'COOKING',
    shortLabel: 'Cooking',
    tagline: 'Heat Check Streak',
    primaryColor: '#FF6A00',
    secondaryColor: '#FFB800',
    glowColor: 'rgba(255, 106, 0, 0.45)',
    accentBg: 'rgba(255, 106, 0, 0.15)',
    borderActive: 'rgba(255, 106, 0, 0.65)',
    badgeGradient: 'from-[#FFB800] via-[#FF6A00] to-[#E11D48]'
  },
  aura: {
    id: 'aura',
    label: '+AURA',
    shortLabel: '+Aura',
    tagline: 'Effortless Swagger & Flex',
    primaryColor: '#D946EF',
    secondaryColor: '#8B5CF6',
    glowColor: 'rgba(217, 70, 239, 0.45)',
    accentBg: 'rgba(217, 70, 239, 0.15)',
    borderActive: 'rgba(217, 70, 239, 0.65)',
    badgeGradient: 'from-[#D946EF] via-[#A855F7] to-[#6366F1]'
  }
};

interface SvgIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
  glow?: boolean;
}

/**
 * 1. HEAD TAP (Dominance / "Mossed")
 * Visual: Angled tech helmet silhouette with downward kinetic impact energy lines & neon hand-tap overlay.
 * Aesthetic: Glowing Crimson & Cyber-Pink neon accents with velocity paths.
 */
export const HeadTapIcon: React.FC<SvgIconProps> = ({ 
  className = 'w-6 h-6', 
  size = 24, 
  glow = true, 
  ...props 
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="headTapGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF2A85" />
        <stop offset="50%" stopColor="#FF0055" />
        <stop offset="100%" stopColor="#7928CA" />
      </linearGradient>
      <linearGradient id="impactLineGrad" x1="12" y1="1" x2="12" y2="9" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#FF0055" stopOpacity="0.2" />
      </linearGradient>
      {glow && (
        <filter id="headTapGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      )}
    </defs>

    {/* Downward Kinetic Impact Lightning Lines */}
    <path
      d="M12 1.5L12 6M7.5 3.5L9.5 7M16.5 3.5L14.5 7"
      stroke="url(#impactLineGrad)"
      strokeWidth="1.6"
      strokeLinecap="round"
    />

    {/* Cyber Hand Tap Pressure Wave / Palm Overlay */}
    <path
      d="M8.5 6.5C10.5 5.5 13.5 5.5 15.5 6.5L14 8C12.8 7.3 11.2 7.3 10 8L8.5 6.5Z"
      fill="#FF2A85"
      fillOpacity="0.85"
    />

    {/* Sharp Angled Futuristic Helmet Shell */}
    <path
      d="M5 13.5L8.5 8.5H15.5L19 13.5L17.5 19.5L12 21.5L6.5 19.5L5 13.5Z"
      fill="url(#headTapGrad)"
      fillOpacity="0.25"
      stroke="url(#headTapGrad)"
      strokeWidth="1.8"
      strokeLinejoin="bevel"
      filter={glow ? 'url(#headTapGlow)' : undefined}
    />

    {/* Helmet Tech Visor Grid & Shield Slice */}
    <path
      d="M7.5 13H16.5L15 16.5H9L7.5 13Z"
      fill="#FF0055"
      fillOpacity="0.6"
      stroke="#FFF"
      strokeWidth="1"
      strokeLinejoin="round"
    />

    {/* Mossed Impact Sparkles / Angled Tech Accents */}
    <circle cx="12" cy="14.5" r="1.2" fill="#FFF" />
    <path d="M4 11L6 12M20 11L18 12" stroke="#FF2A85" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/**
 * 2. ICE IN VEINS (Clutch Performance)
 * Visual: Futuristic angular ice crystal with an electric pulse ECG wave / heart rate spike circuit.
 * Aesthetic: Cyan, Deep Electric Blue, and Frost White glow.
 */
export const IceInVeinsIcon: React.FC<SvgIconProps> = ({ 
  className = 'w-6 h-6', 
  size = 24, 
  glow = true, 
  ...props 
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="iceShardGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#E0F2FE" />
        <stop offset="40%" stopColor="#00F2FE" />
        <stop offset="100%" stopColor="#0052D4" />
      </linearGradient>
      <linearGradient id="ecgPulseGrad" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.4" />
        <stop offset="50%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#00F2FE" stopOpacity="0.4" />
      </linearGradient>
      {glow && (
        <filter id="iceGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      )}
    </defs>

    {/* Angular Faceted Outer Ice Shard */}
    <path
      d="M12 2L18.5 7.5L16.5 17L12 22L7.5 17L5.5 7.5L12 2Z"
      fill="url(#iceShardGrad)"
      fillOpacity="0.2"
      stroke="url(#iceShardGrad)"
      strokeWidth="1.6"
      strokeLinejoin="bevel"
      filter={glow ? 'url(#iceGlow)' : undefined}
    />

    {/* Facet Geometry Intersections */}
    <path
      d="M12 2V22M5.5 7.5L18.5 7.5M7.5 17L16.5 17"
      stroke="#00F2FE"
      strokeOpacity="0.35"
      strokeWidth="0.9"
    />

    {/* High-Tech ECG Heart Rate Spike / Circuit Pulse */}
    <path
      d="M2.5 12H7L8.5 9L10.5 16L13 6L15.5 14L17 12H21.5"
      stroke="url(#ecgPulseGrad)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={glow ? 'url(#iceGlow)' : undefined}
    />

    {/* Cold Crystal Nodes */}
    <circle cx="13" cy="6" r="1" fill="#FFFFFF" />
    <circle cx="12" cy="2" r="1" fill="#E0F2FE" />
  </svg>
);

/**
 * 3. CLAMPED (Lockdown Defense)
 * Visual: Cyber-shield / interlocking angular defense grid with central high-tech lock & laser boundary.
 * Aesthetic: Electric Neon Green & Emerald Laser accents.
 */
export const ClampedIcon: React.FC<SvgIconProps> = ({ 
  className = 'w-6 h-6', 
  size = 24, 
  glow = true, 
  ...props 
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="clampedShieldGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00FF88" />
        <stop offset="60%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#064E3B" />
      </linearGradient>
      <linearGradient id="laserBarGrad" x1="4" y1="12" x2="20" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00FF88" stopOpacity="0.1" />
        <stop offset="50%" stopColor="#00FF88" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#00FF88" stopOpacity="0.1" />
      </linearGradient>
      {glow && (
        <filter id="clampGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      )}
    </defs>

    {/* Angular Cyber-Shield Boundary */}
    <path
      d="M12 2.5L19.5 5.5V11.5C19.5 16.5 16.2 20.2 12 22C7.8 20.2 4.5 16.5 4.5 11.5V5.5L12 2.5Z"
      fill="url(#clampedShieldGrad)"
      fillOpacity="0.18"
      stroke="url(#clampedShieldGrad)"
      strokeWidth="1.8"
      strokeLinejoin="round"
      filter={glow ? 'url(#clampGlow)' : undefined}
    />

    {/* Lockdown Hexagonal Grid Mesh */}
    <path
      d="M12 6L16 8.5V13.5L12 16L8 13.5V8.5L12 6Z"
      stroke="#00FF88"
      strokeOpacity="0.45"
      strokeWidth="1"
      strokeDasharray="2 1.5"
    />

    {/* Heavy Lockdown Tech Padlock Shackle */}
    <path
      d="M9.5 11V9C9.5 7.6 10.6 6.5 12 6.5C13.4 6.5 14.5 7.6 14.5 9V11"
      stroke="#FFFFFF"
      strokeWidth="1.7"
      strokeLinecap="round"
    />

    {/* Solid Laser Lock Core */}
    <rect
      x="8"
      y="11"
      width="8"
      height="6"
      rx="1.5"
      fill="#00FF88"
      stroke="#FFFFFF"
      strokeWidth="1.2"
    />
    <circle cx="12" cy="14" r="1.1" fill="#064E3B" />

    {/* Clamp Horizontal Cross Laser Vices */}
    <path
      d="M3 14H6M18 14H21"
      stroke="#00FF88"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 4. COOKING (Hot Streak / Heat Check)
 * Visual: High-speed turbine/flame effect merging into velocity streaks & scoreboard lightning sparks.
 * Aesthetic: Neon Gold, Blaze Orange, & Magenta gradient glow.
 */
export const CookingIcon: React.FC<SvgIconProps> = ({ 
  className = 'w-6 h-6', 
  size = 24, 
  glow = true, 
  ...props 
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="cookFlameGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF275" />
        <stop offset="35%" stopColor="#FFB800" />
        <stop offset="70%" stopColor="#FF6A00" />
        <stop offset="100%" stopColor="#E11D48" />
      </linearGradient>
      {glow && (
        <filter id="cookGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      )}
    </defs>

    {/* Turbine Speed Flame Silhouette */}
    <path
      d="M12 2C12 2 15.5 6.5 15.5 10.5C15.5 12 14.8 13.2 14 14C15 13.2 17.5 12.5 17.5 14.5C17.5 18 14.5 21.5 12 21.5C8 21.5 6 18 6 14C6 9.5 10 5.5 10 5.5C10 5.5 9 8 9.5 10.5C10.5 8.5 12 2 12 2Z"
      fill="url(#cookFlameGrad)"
      fillOpacity="0.25"
      stroke="url(#cookFlameGrad)"
      strokeWidth="1.8"
      strokeLinejoin="round"
      filter={glow ? 'url(#cookGlow)' : undefined}
    />

    {/* Inner Core Plasma Spike */}
    <path
      d="M12 9.5C12 9.5 13.5 12 13.5 14C13.5 15.5 12.8 17 12 17.5C11.2 17 10.5 15.5 10.5 14C10.5 12 12 9.5 12 9.5Z"
      fill="#FFF275"
      stroke="#FF6A00"
      strokeWidth="1"
    />

    {/* High-Velocity Heat Check Streaks & Sparks */}
    <path
      d="M4 18L7 17M17 17L20 18M3 13L5.5 13M18.5 13L21 13"
      stroke="#FFB800"
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* Heat Check Lightning Strike Overlay */}
    <path
      d="M13 3.5L11 8.5H13.5L11.5 13.5"
      stroke="#FFFFFF"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 5. +AURA (Effortless Swagger / Peak Flex)
 * Visual: Bold "+ AURA" typographic mark integrated into a 4-point futuristic starburst with surrounding energy aura rings.
 * Aesthetic: Deep Cyber Violet & Glowing Electric Magenta.
 */
export const AuraIcon: React.FC<SvgIconProps> = ({ 
  className = 'w-6 h-6', 
  size = 24, 
  glow = true, 
  ...props 
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="auraGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="45%" stopColor="#D946EF" />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>
      <radialGradient id="auraCenterGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#D946EF" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
      </radialGradient>
      {glow && (
        <filter id="auraFilterGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="0.9" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      )}
    </defs>

    {/* Expanding Hypersonic Energy Halo / Aura Rings */}
    <circle
      cx="12"
      cy="12"
      r="9.5"
      stroke="url(#auraGrad)"
      strokeWidth="1.2"
      strokeDasharray="4 2.5"
      strokeOpacity="0.75"
    />
    <circle
      cx="12"
      cy="12"
      r="6.5"
      fill="url(#auraCenterGlow)"
      stroke="#D946EF"
      strokeWidth="0.8"
      strokeOpacity="0.5"
    />

    {/* 4-Point High-Tech Diamond Starburst */}
    <path
      d="M12 1.5L14 9.5L22 12L14 14.5L12 22.5L10 14.5L2 12L10 9.5L12 1.5Z"
      fill="url(#auraGrad)"
      fillOpacity="0.22"
      stroke="url(#auraGrad)"
      strokeWidth="1.6"
      strokeLinejoin="bevel"
      filter={glow ? 'url(#auraFilterGlow)' : undefined}
    />

    {/* Center "+ A" Athletic Typographic Glyph */}
    {/* Plus sign */}
    <path
      d="M7 12H10.5M8.75 10.25V13.75"
      stroke="#FFFFFF"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    {/* Angular Cyber 'A' Glyph */}
    <path
      d="M13 14.5L15 8.5L17 14.5M13.6 13H16.4"
      stroke="#FFFFFF"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="bevel"
    />

    {/* High-Energy Micro Sparkles */}
    <circle cx="5" cy="5" r="0.9" fill="#F472B6" />
    <circle cx="19" cy="19" r="0.9" fill="#F472B6" />
    <circle cx="19" cy="5" r="0.9" fill="#A855F7" />
    <circle cx="5" cy="19" r="0.9" fill="#A855F7" />
  </svg>
);

export const ReactionIconRenderer: React.FC<{
  reactionKey: FuturisticReactionKey | string;
  size?: number;
  className?: string;
  glow?: boolean;
}> = ({ reactionKey, size = 20, className = '', glow = true }) => {
  switch (reactionKey) {
    case 'head_tap':
      return <HeadTapIcon size={size} className={className} glow={glow} />;
    case 'ice':
      return <IceInVeinsIcon size={size} className={className} glow={glow} />;
    case 'clamped':
      return <ClampedIcon size={size} className={className} glow={glow} />;
    case 'cooking':
      return <CookingIcon size={size} className={className} glow={glow} />;
    case 'aura':
      return <AuraIcon size={size} className={className} glow={glow} />;
    default:
      return <HeadTapIcon size={size} className={className} glow={glow} />;
  }
};
