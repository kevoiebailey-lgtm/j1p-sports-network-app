import React from 'react';
import { useLogo, LogoStyle } from '../../context/LogoContext';
import { Sparkles, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showTagline?: boolean;
  showBadge?: boolean;
  showEmblem?: boolean;
  layout?: 'horizontal' | 'vertical' | 'crest-only';
  forceStyle?: LogoStyle;
  allowSwitch?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = false,
  showBadge = false,
  showEmblem = true,
  layout = 'horizontal',
  forceStyle,
  allowSwitch = false,
  className = '',
  onClick
}) => {
  let activeStyle: LogoStyle = forceStyle || 'crest';
  let customLogo: string | null = null;
  let cycleStyle: (() => void) | undefined;
  let openSwitcher: (() => void) | undefined;

  try {
    const logoCtx = useLogo();
    if (!forceStyle) {
      activeStyle = logoCtx.logoStyle;
    }
    customLogo = logoCtx.customLogoUrl;
    cycleStyle = logoCtx.cycleLogoStyle;
    openSwitcher = logoCtx.openLogoSwitcher;
  } catch {
    // Fallback if rendered outside LogoProvider
  }

  // Dimensions scaling based on size prop
  const sizeScales = {
    xs: { crest: 'w-7 h-7', text: 'text-sm', badge: 'text-[9px]', tagline: 'text-[8px]', gap: 'gap-1.5' },
    sm: { crest: 'w-8 h-8', text: 'text-base', badge: 'text-[9px]', tagline: 'text-[9px]', gap: 'gap-2' },
    md: { crest: 'w-10 h-10', text: 'text-xl', badge: 'text-[10px]', tagline: 'text-[10px]', gap: 'gap-2.5' },
    lg: { crest: 'w-14 h-14', text: 'text-2xl', badge: 'text-[11px]', tagline: 'text-[11px]', gap: 'gap-3' },
    xl: { crest: 'w-20 h-20', text: 'text-4xl', badge: 'text-xs', tagline: 'text-xs', gap: 'gap-4' },
    hero: { crest: 'w-32 h-32', text: 'text-5xl', badge: 'text-sm', tagline: 'text-sm', gap: 'gap-5' },
  };

  const currentScale = sizeScales[size];

  // 1. Official 3D Crest SVG
  const CrestSVG = (
    <div className={`relative flex items-center justify-center shrink-0 ${currentScale.crest} transition-transform duration-300 hover:scale-105`}>
      <svg
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_25px_rgba(229,184,104,0.65)]"
      >
        <defs>
          {/* Gold Ambient Glow Filter */}
          <filter id="gold-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Strong Gold Drop Shadow */}
          <filter id="gold-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#E5B868" floodOpacity="0.8" />
          </filter>

          {/* Metallic Chrome Light Gradient */}
          <linearGradient id="metal-chrome-bright" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#E2E8F0" />
            <stop offset="45%" stopColor="#94A3B8" />
            <stop offset="60%" stopColor="#F8FAFC" />
            <stop offset="80%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Dark Slate Metallic Gradient (#212A31 base) */}
          <linearGradient id="gunmetal-dark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#36434E" />
            <stop offset="40%" stopColor="#28333C" />
            <stop offset="70%" stopColor="#212A31" />
            <stop offset="100%" stopColor="#171E23" />
          </linearGradient>

          {/* Amber Gold Faceted Gem Gradient (#FFC857 / #FF6A00) */}
          <radialGradient id="gold-gem-glow" cx="50%" cy="50%" r="50%" fx="35%" fy="35%">
            <stop offset="0%" stopColor="#FFF2D6" />
            <stop offset="35%" stopColor="#FFC857" />
            <stop offset="70%" stopColor="#FF6A00" />
            <stop offset="100%" stopColor="#8A3400" />
          </radialGradient>

          {/* Wing Metallic Shading */}
          <linearGradient id="wing-silver-grad" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="20%" stopColor="#CBD5E1" />
            <stop offset="50%" stopColor="#8A8A83" />
            <stop offset="80%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#212A31" />
          </linearGradient>
        </defs>

        {/* 1. OUTER CIRCULAR BASE & CIRCUIT SHIELD */}
        <circle cx="300" cy="300" r="230" fill="url(#gunmetal-dark)" stroke="url(#metal-chrome-bright)" strokeWidth="10" />
        <circle cx="300" cy="300" r="215" fill="none" stroke="#E5B868" strokeWidth="3" opacity="0.8" />
        <circle cx="300" cy="300" r="200" fill="#171E23" stroke="#8A8A83" strokeWidth="3" />

        {/* Circuit Board Traces & Node Dots */}
        <g stroke="#E5B868" strokeWidth="2.5" opacity="0.75" fill="none">
          {/* Top Circuit Traces */}
          <path d="M 220 110 L 240 130 L 360 130 L 380 110" />
          <path d="M 180 140 L 210 140 L 230 160" />
          <path d="M 420 140 L 390 140 L 370 160" />
          {/* Bottom Circuit Traces */}
          <path d="M 180 460 L 220 460 L 250 490" />
          <path d="M 420 460 L 380 460 L 350 490" />
          {/* Circuit Nodes */}
          <circle cx="220" cy="110" r="4" fill="#E5B868" />
          <circle cx="380" cy="110" r="4" fill="#E5B868" />
          <circle cx="180" cy="140" r="4" fill="#E5B868" />
          <circle cx="420" cy="140" r="4" fill="#E5B868" />
          <circle cx="180" cy="460" r="4" fill="#E5B868" />
          <circle cx="420" cy="460" r="4" fill="#E5B868" />
        </g>

        {/* 2. METALLIC SCULPTED WINGS (LEFT & RIGHT) */}
        <g id="left-wing">
          <path d="M 160 210 C 90 140 30 190 45 320 C 80 290 120 270 165 260 Z" fill="url(#wing-silver-grad)" stroke="url(#metal-chrome-bright)" strokeWidth="2" />
          <path d="M 165 240 C 80 200 40 280 65 370 C 100 330 135 305 170 290 Z" fill="url(#wing-silver-grad)" stroke="#8A8A83" strokeWidth="2" />
          <path d="M 170 270 C 100 260 70 330 95 400 C 125 365 155 335 180 320 Z" fill="url(#gunmetal-dark)" stroke="url(#metal-chrome-bright)" strokeWidth="1.5" />
          <path d="M 160 210 C 90 140 30 190 45 320" fill="none" stroke="#E5B868" strokeWidth="3" filter="url(#gold-glow-filter)" />
        </g>

        <g id="right-wing">
          <path d="M 440 210 C 510 140 570 190 555 320 C 520 290 480 270 435 260 Z" fill="url(#wing-silver-grad)" stroke="url(#metal-chrome-bright)" strokeWidth="2" />
          <path d="M 435 240 C 520 200 560 280 535 370 C 500 330 465 305 430 290 Z" fill="url(#wing-silver-grad)" stroke="#8A8A83" strokeWidth="2" />
          <path d="M 430 270 C 500 260 530 330 505 400 C 475 365 445 335 420 320 Z" fill="url(#gunmetal-dark)" stroke="url(#metal-chrome-bright)" strokeWidth="1.5" />
          <path d="M 440 210 C 510 140 570 190 555 320" fill="none" stroke="#E5B868" strokeWidth="3" filter="url(#gold-glow-filter)" />
        </g>

        {/* 3. WING TEXT */}
        <text
          x="142"
          y="312"
          fill="url(#metal-chrome-bright)"
          stroke="#171E23"
          strokeWidth="2"
          fontSize="46"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="2"
          filter="url(#gold-shadow)"
        >
          JUST
        </text>

        <text
          x="410"
          y="312"
          fill="url(#metal-chrome-bright)"
          stroke="#171E23"
          strokeWidth="2"
          fontSize="46"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="2"
          filter="url(#gold-shadow)"
        >
          PLAY
        </text>

        {/* 4. CAMERA BODY */}
        <polygon points="250,165 350,165 375,205 225,205" fill="url(#gunmetal-dark)" stroke="url(#metal-chrome-bright)" strokeWidth="3" />
        <rect x="270" y="150" width="60" height="15" rx="3" fill="url(#metal-chrome-bright)" />
        <rect x="200" y="190" width="30" height="15" rx="2" fill="url(#metal-chrome-bright)" stroke="#8A8A83" />
        <rect x="370" y="190" width="30" height="15" rx="2" fill="url(#metal-chrome-bright)" stroke="#8A8A83" />
        <circle cx="385" cy="197" r="5" fill="#171E23" stroke="#E5B868" strokeWidth="1" />
        <polygon points="383,194 388,197 383,200" fill="#FFFFFF" />

        <rect x="170" y="205" width="260" height="170" rx="20" fill="url(#gunmetal-dark)" stroke="url(#metal-chrome-bright)" strokeWidth="4" />
        <rect x="180" y="220" width="240" height="140" rx="12" fill="#212A31" stroke="#36434E" strokeWidth="2" opacity="0.9" />
        <path d="M 180 360 L 420 360" stroke="#E5B868" strokeWidth="3" filter="url(#gold-glow-filter)" />

        {/* 5. LENS & GOLD GEM */}
        <circle cx="300" cy="295" r="95" fill="url(#gunmetal-dark)" stroke="url(#metal-chrome-bright)" strokeWidth="7" />
        <circle cx="300" cy="295" r="85" fill="#171E23" stroke="#8A8A83" strokeWidth="3" />
        <circle cx="300" cy="295" r="72" fill="#212A31" stroke="#E5B868" strokeWidth="3" />
        <circle cx="300" cy="295" r="58" fill="url(#gold-gem-glow)" stroke="#FFF1D0" strokeWidth="3" filter="url(#gold-glow-filter)" />

        <text
          x="300"
          y="316"
          fill="#212A31"
          stroke="#FFFFFF"
          strokeWidth="2"
          fontSize="62"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          filter="url(#gold-shadow)"
        >
          1
        </text>

        {/* 6. BOTTOM SHIELD APEX */}
        <polygon points="300,510 260,430 340,430" fill="url(#gunmetal-dark)" stroke="url(#metal-chrome-bright)" strokeWidth="4" />
        <line x1="300" y1="430" x2="300" y2="500" stroke="#E5B868" strokeWidth="3" filter="url(#gold-glow-filter)" />
      </svg>
    </div>
  );

  // 2. Cyber Badge Glyph
  const CyberBadgeSVG = (
    <div className={`relative flex items-center justify-center shrink-0 ${currentScale.crest} rounded-xl bg-gradient-to-tr from-[#00B8D4] to-[#00F5D4] p-[1.5px] shadow-[0_0_15px_rgba(0,184,212,0.4)]`}>
      <div className="w-full h-full bg-[#090D16] rounded-[9.5px] flex items-center justify-center font-black text-xs sm:text-sm text-[#00B8D4]">
        J1P
      </div>
    </div>
  );

  // 3. Custom Logo
  const CustomLogoElement = customLogo ? (
    <div className={`relative flex items-center justify-center shrink-0 ${currentScale.crest} rounded-xl overflow-hidden border border-white/20 bg-black/40`}>
      <img src={customLogo} alt="Custom Emblem" className="w-full h-full object-contain" />
    </div>
  ) : (
    CrestSVG
  );

  // Select active emblem graphic
  const renderEmblem = () => {
    switch (activeStyle) {
      case 'cyber':
        return CyberBadgeSVG;
      case 'custom':
        return CustomLogoElement;
      case 'minimal':
        return null;
      case 'crest':
      default:
        return CrestSVG;
    }
  };

  if (layout === 'crest-only') {
    return (
      <div onClick={onClick} className={`inline-block cursor-pointer ${className}`}>
        {renderEmblem() || CrestSVG}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center shrink-0 min-w-0 ${layout === 'vertical' ? 'flex-col text-center' : 'flex-row'} ${currentScale.gap} ${className} cursor-pointer group relative`}
    >
      {/* Emblem */}
      {showEmblem && renderEmblem()}

      {/* Brand Typography & Tagline */}
      <div className="flex flex-col justify-center shrink-0 min-w-0">
        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          {/* Main Title: JUST1PLAY */}
          <span className={`font-black italic tracking-tight uppercase text-[#263238] dark:text-white font-sans ${currentScale.text} group-hover:text-[#FF6A00] transition-colors drop-shadow-[0_0_12px_rgba(255,106,0,0.4)] whitespace-nowrap shrink-0`}>
            JUST<span className="text-[#FF6A00]">1</span>PLAY<span className="text-[#00B8D4]">.</span>
          </span>

          {/* Badge */}
          {showBadge && (
            <span className={`hidden sm:inline-block px-1.5 py-0.5 font-black uppercase bg-[#FF6A00] text-white rounded-md shadow-[0_0_12px_rgba(255,106,0,0.5)] ${currentScale.badge} tracking-wider`}>
              PRO SCOUT
            </span>
          )}

          {/* Optional Switch Trigger Button */}
          {allowSwitch && openSwitcher && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openSwitcher();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-slate-800 hover:bg-[#FF6A00] text-slate-300 hover:text-white text-[9px] flex items-center gap-1 cursor-pointer"
              title="Switch logo style"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Switch</span>
            </button>
          )}
        </div>

        {/* Subtitle / Tagline */}
        {showTagline && (
          <p className={`text-slate-500 dark:text-[#90A4AE] font-black uppercase tracking-widest ${currentScale.tagline} font-mono mt-0.5`}>
            THE NEXT PRO SCOUT • ELITE PERFORMANCE
          </p>
        )}
      </div>
    </div>
  );
};

