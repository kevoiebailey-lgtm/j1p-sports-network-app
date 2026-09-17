import React, { useState } from 'react';
import { 
  Zap, 
  Flame, 
  ShieldCheck, 
  Sparkles, 
  Activity, 
  Trophy, 
  Radio, 
  Compass, 
  ChevronRight,
  Target,
  Maximize2
} from 'lucide-react';

export type SportCategory = 
  | 'Baseball'
  | 'Football' 
  | 'Basketball' 
  | 'Soccer' 
  | 'Wrestling'
  | 'Volleyball' 
  | 'Track' 
  | 'Cheer'
  | 'Custom';

export type NeonColorTheme = 
  | 'cyan' 
  | 'crimson' 
  | 'gold' 
  | 'magenta' 
  | 'emerald'
  | 'amber'
  | 'sapphire'
  | 'purple';

export interface TemplateDefinition {
  id: string;
  name: string;
  category: SportCategory | 'All-Star';
  description: string;
  primaryGlow: string;
  accentGlow: string;
  bgTone: string;
  tag: string;
}

export interface AthleteCardData {
  athleteName: string;
  jerseyNumber: string;
  teamName: string;
  position: string;
  sportCategory?: SportCategory;
  templateId: string;
  primaryColor?: NeonColorTheme;
  themeColor?: string;
  secondaryColor?: string;
  stats: Record<string, string>;
  mediaUrl: string;
  videoUrl?: string;
  verifiedProspect?: boolean;
  classYear?: string;
  // Dual-Layer Photo Alignment & Zoom/Scale
  photoScale?: number; // 0.5 to 2.0 (default: 1.0)
  photoX?: number; // Offset X in px (-200 to 200, default: 0)
  photoY?: number; // Offset Y in px (-200 to 200, default: 0)
  // Poster-specific metadata
  ovrRating?: string; // e.g. "96" or "99"
  showWatermark?: boolean; // For free preview export vs paid/unlocked
  backdropImageUrl?: string; // High-res poster backdrop from Firebase Storage
  typographyStyle?: AthleticTypographyStyle; // Athletic typography family
}

export type AthleticTypographyStyle = 
  | 'collegiate_block' 
  | 'speed_impact' 
  | 'neo_scout' 
  | 'classic_card';

export interface TypographyConfig {
  id: AthleticTypographyStyle;
  name: string;
  description: string;
  fontFamily: string;
  cssFamily: string;
  canvasFont: string;
  ghostCanvasFont: string;
  letterSpacing: string;
  isItalic?: boolean;
}

export const ATHLETIC_TYPOGRAPHY_CONFIGS: Record<AthleticTypographyStyle, TypographyConfig> = {
  collegiate_block: {
    id: 'collegiate_block',
    name: 'Collegiate Block',
    description: 'Bebas Neue / Chakra',
    fontFamily: "'Bebas Neue', 'Chakra Petch', sans-serif",
    cssFamily: "'Bebas Neue', 'Chakra Petch', sans-serif",
    canvasFont: "900 115px 'Bebas Neue', 'Chakra Petch', sans-serif",
    ghostCanvasFont: "900 250px 'Bebas Neue', 'Chakra Petch', sans-serif",
    letterSpacing: '4px'
  },
  speed_impact: {
    id: 'speed_impact',
    name: 'Speed / Pro Impact',
    description: 'Rajdhani / Barlow',
    fontFamily: "'Rajdhani', 'Barlow Condensed', sans-serif",
    cssFamily: "'Rajdhani', 'Barlow Condensed', sans-serif",
    canvasFont: "italic 800 110px 'Rajdhani', 'Barlow Condensed', sans-serif",
    ghostCanvasFont: "italic 900 240px 'Rajdhani', 'Barlow Condensed', sans-serif",
    letterSpacing: '3px',
    isItalic: true
  },
  neo_scout: {
    id: 'neo_scout',
    name: 'Neo-Scout',
    description: 'Orbitron / Space',
    fontFamily: "'Orbitron', 'Space Grotesk', sans-serif",
    cssFamily: "'Orbitron', 'Space Grotesk', sans-serif",
    canvasFont: "900 92px 'Orbitron', 'Space Grotesk', sans-serif",
    ghostCanvasFont: "900 210px 'Orbitron', 'Space Grotesk', sans-serif",
    letterSpacing: '6px'
  },
  classic_card: {
    id: 'classic_card',
    name: 'Classic Card',
    description: 'Anton / Impact',
    fontFamily: "'Anton', Impact, sans-serif",
    cssFamily: "'Anton', Impact, sans-serif",
    canvasFont: "900 115px 'Anton', Impact, sans-serif",
    ghostCanvasFont: "900 250px 'Anton', Impact, sans-serif",
    letterSpacing: '2px'
  }
};

export interface TeamColorSwatch {
  name: string;
  hex: string;
  secondaryHex: string;
  label: string;
}

export const TEAM_COLOR_SWATCHES: TeamColorSwatch[] = [
  { name: 'Varsity Gold', hex: '#FFB800', secondaryHex: '#D97706', label: 'Gold' },
  { name: 'Crimson Red', hex: '#DC2626', secondaryHex: '#991B1B', label: 'Crimson' },
  { name: 'Royal Blue', hex: '#2563EB', secondaryHex: '#1D4ED8', label: 'Royal' },
  { name: 'Neon Green', hex: '#22C55E', secondaryHex: '#16A34A', label: 'Green' },
  { name: 'Electric Cyan', hex: '#06B6D4', secondaryHex: '#0891B2', label: 'Cyan' },
  { name: 'Cyber Violet', hex: '#A855F7', secondaryHex: '#7E22CE', label: 'Violet' },
  { name: 'Clean White', hex: '#FFFFFF', secondaryHex: '#94A3B8', label: 'White' },
];

export interface PosterBackdropOption {
  id: string;
  name: string;
  fileName: string;
  url: string;
}

export const POSTER_BACKDROPS: PosterBackdropOption[] = Array.from({ length: 15 }, (_, i) => {
  const index = i + 1;
  const fileName = `image (${index}).jpeg`;
  return {
    id: `backdrop_${index}`,
    name: `Backdrop ${index}`,
    fileName,
    url: `https://firebasestorage.googleapis.com/v0/b/just1play26.firebasestorage.app/o/poster-backdrops%2F${encodeURIComponent(fileName)}?alt=media`
  };
});

export const NEON_THEMES: Record<NeonColorTheme, {
  name: string;
  hex: string;
  secondaryHex: string;
  glow: string;
  borderClass: string;
  textClass: string;
  bgGradient: string;
  badgeBg: string;
}> = {
  cyan: {
    name: 'Cyber Cyan',
    hex: '#00F0D0',
    secondaryHex: '#00B8D4',
    glow: 'rgba(0, 240, 208, 0.45)',
    borderClass: 'border-[#00F0D0]',
    textClass: 'text-[#00F0D0]',
    bgGradient: 'from-[#00F0D0]/20 via-[#00B8D4]/10 to-transparent',
    badgeBg: 'bg-[#00F0D0]/15 text-[#00F0D0] border-[#00F0D0]/40',
  },
  crimson: {
    name: 'Neon Crimson',
    hex: '#FF0055',
    secondaryHex: '#EF4444',
    glow: 'rgba(255, 0, 85, 0.45)',
    borderClass: 'border-[#FF0055]',
    textClass: 'text-[#FF0055]',
    bgGradient: 'from-[#FF0055]/20 via-[#EF4444]/10 to-transparent',
    badgeBg: 'bg-[#FF0055]/15 text-[#FF0055] border-[#FF0055]/40',
  },
  gold: {
    name: 'Electric Gold',
    hex: '#F59E0B',
    secondaryHex: '#FFD700',
    glow: 'rgba(245, 158, 11, 0.45)',
    borderClass: 'border-[#F59E0B]',
    textClass: 'text-[#F59E0B]',
    bgGradient: 'from-[#F59E0B]/20 via-[#FFD700]/10 to-transparent',
    badgeBg: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40',
  },
  magenta: {
    name: 'Magenta Flare',
    hex: '#D946EF',
    secondaryHex: '#EC4899',
    glow: 'rgba(217, 70, 239, 0.45)',
    borderClass: 'border-[#D946EF]',
    textClass: 'text-[#D946EF]',
    bgGradient: 'from-[#D946EF]/20 via-[#EC4899]/10 to-transparent',
    badgeBg: 'bg-[#D946EF]/15 text-[#D946EF] border-[#D946EF]/40',
  },
  emerald: {
    name: 'Emerald Green',
    hex: '#10B981',
    secondaryHex: '#00FF88',
    glow: 'rgba(16, 185, 129, 0.45)',
    borderClass: 'border-[#10B981]',
    textClass: 'text-[#10B981]',
    bgGradient: 'from-[#10B981]/20 via-[#00FF88]/10 to-transparent',
    badgeBg: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40',
  },
  amber: {
    name: 'Championship Amber',
    hex: '#F97316',
    secondaryHex: '#EA580C',
    glow: 'rgba(249, 115, 22, 0.45)',
    borderClass: 'border-[#F97316]',
    textClass: 'text-[#F97316]',
    bgGradient: 'from-[#F97316]/20 via-[#EA580C]/10 to-transparent',
    badgeBg: 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/40',
  },
  sapphire: {
    name: 'Varsity Sapphire',
    hex: '#3B82F6',
    secondaryHex: '#60A5FA',
    glow: 'rgba(59, 130, 246, 0.45)',
    borderClass: 'border-[#3B82F6]',
    textClass: 'text-[#3B82F6]',
    bgGradient: 'from-[#3B82F6]/20 via-[#60A5FA]/10 to-transparent',
    badgeBg: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/40',
  },
  purple: {
    name: 'Apex Violet',
    hex: '#8B5CF6',
    secondaryHex: '#A855F7',
    glow: 'rgba(139, 92, 246, 0.45)',
    borderClass: 'border-[#8B5CF6]',
    textClass: 'text-[#8B5CF6]',
    bgGradient: 'from-[#8B5CF6]/20 via-[#A855F7]/10 to-transparent',
    badgeBg: 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/40',
  },
};

export const TEMPLATES: TemplateDefinition[] = [
  // [CHEERLEADING & DANCE]
  {
    id: 'cheer_nova_flare',
    name: 'Cheer Nova Flare',
    category: 'Cheer',
    description: 'Neon magenta & gold electric light trails, motion burst vectors, pom-pom energy grid.',
    primaryGlow: '#D946EF',
    accentGlow: '#F59E0B',
    bgTone: '#0C0614',
    tag: 'Motion Energy'
  },
  {
    id: 'stunt_elite_cyber',
    name: 'Stunt Elite Cyber',
    category: 'Cheer',
    description: 'Dark purple & cyan holographic ring matrix with dynamic vertical elevation lines.',
    primaryGlow: '#8B5CF6',
    accentGlow: '#00F0D0',
    bgTone: '#0A0618',
    tag: 'Apex Elevation'
  },
  {
    id: 'spirit_precision_hud',
    name: 'Spirit Precision HUD',
    category: 'Cheer',
    description: 'Sleek high-tech white/pink glassmorphism with dynamic stunt score indicators.',
    primaryGlow: '#F472B6',
    accentGlow: '#E0E7FF',
    bgTone: '#120B18',
    tag: 'Sync Matrix'
  },

  // [BASKETBALL]
  {
    id: 'court_matrix_2077',
    name: 'Court Matrix 2077',
    category: 'Basketball',
    description: 'Cyberpunk floor lines, glowing cyan rim trajectory rings, neon orange accent grid.',
    primaryGlow: '#00F0D0',
    accentGlow: '#FF6A00',
    bgTone: '#061018',
    tag: 'Cyber Rim'
  },
  {
    id: 'hyperdrive_rim',
    name: 'Hyperdrive Rim',
    category: 'Basketball',
    description: 'Dark slate with deep red laser vectors and angular hexagonal perimeter walls.',
    primaryGlow: '#FF0055',
    accentGlow: '#94A3B8',
    bgTone: '#0B0F19',
    tag: 'Laser Vector'
  },

  // [FOOTBALL]
  {
    id: 'gridiron_apex_tech',
    name: 'Gridiron Apex Tech',
    category: 'Football',
    description: 'Holographic field yardage lines, metallic steel shard overlays, glowing electric green borders.',
    primaryGlow: '#10B981',
    accentGlow: '#94A3B8',
    bgTone: '#071610',
    tag: 'Yardage HUD'
  },
  {
    id: 'endzone_overdrive',
    name: 'Endzone Overdrive',
    category: 'Football',
    description: 'Carbon fiber texture with glowing crimson energy pulses and heavy impact typography layout.',
    primaryGlow: '#EF4444',
    accentGlow: '#F59E0B',
    bgTone: '#100B0B',
    tag: 'Carbon Impact'
  },

  // [SOCCER / FUTBOL]
  {
    id: 'quantum_pitch',
    name: 'Quantum Pitch',
    category: 'Soccer',
    description: 'Glowing emerald hex-net background, speed distortion lines, sci-fi target lock HUD.',
    primaryGlow: '#00FF88',
    accentGlow: '#00B8D4',
    bgTone: '#04160E',
    tag: 'Hex Target'
  },
  {
    id: 'golden_striker',
    name: 'Golden Striker',
    category: 'Soccer',
    description: 'Metallic gold vector shards, translucent dark glass cards, high-velocity particle trail.',
    primaryGlow: '#F59E0B',
    accentGlow: '#FDE047',
    bgTone: '#141006',
    tag: 'Gold Vector'
  },

  // [VOLLEYBALL]
  {
    id: 'aero_spike_horizon',
    name: 'Aero Spike Horizon',
    category: 'Volleyball',
    description: 'Electric cobalt blue kinetic energy arcs, vertical spike trajectory lines, high-gloss glass card.',
    primaryGlow: '#2563EB',
    accentGlow: '#00F0D0',
    bgTone: '#060F1F',
    tag: 'Kinetic Arc'
  },
  {
    id: 'net_matrix',
    name: 'Net Matrix',
    category: 'Volleyball',
    description: 'Translucent wireframe net layout, glowing violet accents, futuristic stat badge HUD.',
    primaryGlow: '#A855F7',
    accentGlow: '#EC4899',
    bgTone: '#0F081D',
    tag: 'Wire Net'
  },

  // [BASEBALL / SOFTBALL]
  {
    id: 'diamond_velocity',
    name: 'Diamond Velocity',
    category: 'Baseball',
    description: 'Angular neon yellow diamond field grids, high-speed ball flight vectors, metallic chrome trim.',
    primaryGlow: '#EAB308',
    accentGlow: '#06B6D4',
    bgTone: '#121208',
    tag: 'Velo Radar'
  },
  {
    id: 'grand_slam_cyber',
    name: 'Grand Slam Cyber',
    category: 'Baseball',
    description: 'Crimson and charcoal slate theme with laser-cut player backdrop frame.',
    primaryGlow: '#DC2626',
    accentGlow: '#E2E8F0',
    bgTone: '#110F11',
    tag: 'Laser Cut'
  },

  // [TRACK & FIELD]
  {
    id: 'sonic_velocity',
    name: 'Sonic Velocity',
    category: 'Track',
    description: 'Multi-lane neon speed tracks, light speed blur vectors, digital stopwatch HUD display.',
    primaryGlow: '#00F0D0',
    accentGlow: '#EAB308',
    bgTone: '#061218',
    tag: 'Sub-10s Blur'
  },

  // [MULTI-SPORT & ALL-STAR]
  {
    id: 'titanium_legend',
    name: 'Titanium Legend',
    category: 'All-Star',
    description: 'Cybernetic titanium plating, glowing blue reactor core background, championship star badge.',
    primaryGlow: '#38BDF8',
    accentGlow: '#F59E0B',
    bgTone: '#0B1320',
    tag: 'Reactor Core'
  },
  {
    id: 'holographic_prism',
    name: 'Holographic Prism',
    category: 'All-Star',
    description: 'Iridescent gradient glass overlay, neon neon-cyan frame, futuristic stat radar overlay.',
    primaryGlow: '#EC4899',
    accentGlow: '#00F0D0',
    bgTone: '#0E0919',
    tag: 'Prism Glass'
  },
  {
    id: 'neon_syndicate',
    name: 'Neon Syndicate',
    category: 'All-Star',
    description: 'Ultra-dark slate background with customizable dual-color glowing neon outline borders.',
    primaryGlow: '#00F0D0',
    accentGlow: '#FF0055',
    bgTone: '#070A10',
    tag: 'Dual Neon'
  },
  {
    id: 'draft_night_3000',
    name: 'Draft Night 3000',
    category: 'All-Star',
    description: 'Futuristic sports broadcast overlay layout, glowing marquee headlines, holographic team crest frame.',
    primaryGlow: '#F59E0B',
    accentGlow: '#3B82F6',
    bgTone: '#080E1A',
    tag: 'Broadcast HUD'
  },

  // [NEW HIGH-IMPACT POSTER THEMES]
  {
    id: 'apex_diamond_series',
    name: 'Apex Diamond Series',
    category: 'All-Star',
    description: 'High-end prism refraction, crystalline diamond facets, razor-sharp foil framing and holographic gloss.',
    primaryGlow: '#00F0D0',
    accentGlow: '#8B5CF6',
    bgTone: '#070C18',
    tag: 'D1 Prism'
  },
  {
    id: 'game_day_smoke',
    name: 'Game Day Smoke & Floodlights',
    category: 'Football',
    description: 'Intense atmospheric stadium light beams piercing through cinematic sideline fog and volumetric haze.',
    primaryGlow: '#38BDF8',
    accentGlow: '#F59E0B',
    bgTone: '#05070E',
    tag: 'Sideline Fog'
  },
  {
    id: 'varsity_geometric_shatter',
    name: 'Varsity Geometric Shatter',
    category: 'Basketball',
    description: 'Angular poly-shards erupting outward, collegiate typography blocks, high-contrast dynamic speed lines.',
    primaryGlow: '#F97316',
    accentGlow: '#3B82F6',
    bgTone: '#0C0A14',
    tag: 'Poly-Shard'
  },
  {
    id: 'championship_fire',
    name: 'Championship Fire',
    category: 'All-Star',
    description: 'Explosive molten embers, rising golden flame crests, thermal heat distortion and high-voltage gold glow.',
    primaryGlow: '#EF4444',
    accentGlow: '#F59E0B',
    bgTone: '#120505',
    tag: 'Molten Flame'
  }
];

export const DEFAULT_SPORT_STATS: Record<SportCategory, Record<string, string>> = {
  Baseball: {
    'AVG': '.388',
    'HR': '19',
    'RBI': '64',
    'OPS': '1.142'
  },
  Football: {
    'PASS YDS': '3,420',
    'TDS': '38',
    '40-YD': '4.38s',
    'TACKLES': '82'
  },
  Basketball: {
    'PPG': '28.4',
    'RPG': '7.6',
    'APG': '8.2',
    'FG%': '52.4%'
  },
  Soccer: {
    'GOALS': '26',
    'ASSISTS': '14',
    'MATCHES': '22',
    'PASS%': '88.5%'
  },
  Wrestling: {
    'RECORD': '34-2',
    'PINS': '21',
    'TAKEDOWNS': '68',
    'WEIGHT': '165 LBS'
  },
  Volleyball: {
    'KILLS': '312',
    'ACES': '48',
    'DIGS': '194',
    'BLOCKS': '62'
  },
  Track: {
    '100M': '10.24s',
    '200M': '20.78s',
    'SPLIT': '4.28s',
    'REACTION': '0.12s'
  },
  Cheer: {
    'STUNT SCORE': '99.4',
    'DIFFICULTY': '10.0',
    'SYNC RATE': '98.5%',
    'HANG TIME': '1.8s'
  },
  Custom: {
    'STAT 1': '99',
    'STAT 2': 'Top 1%',
    'STAT 3': 'A+',
    'STAT 4': '★★★★★'
  }
};

export const DEFAULT_SPORT_IMAGES: Record<SportCategory, string> = {
  Baseball: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=800&auto=format&fit=crop&q=80',
  Football: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop&q=80',
  Basketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
  Soccer: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&auto=format&fit=crop&q=80',
  Wrestling: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
  Volleyball: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80',
  Track: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
  Cheer: 'https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=800&auto=format&fit=crop&q=80',
  Custom: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80'
};

/**
 * Background SVG Artwork component for each of the 18 Hyper-Futuristic themes
 */
export const TemplateSvgBackground: React.FC<{
  templateId: string;
  themeColorHex: string;
  secondaryHex: string;
}> = ({ templateId, themeColorHex, secondaryHex }) => {
  const normId = (templateId || '').toLowerCase().replace(/-/g, '_');
  switch (normId) {
    // 1. Cheer Nova Flare
    case 'cheer_nova':
    case 'cheer_nova_flare':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="novaFlare" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor={themeColorHex} stopOpacity="0.45" />
              <stop offset="60%" stopColor="#D946EF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0B0515" stopOpacity="0" />
            </radialGradient>
            <pattern id="pomGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="1.5" fill={themeColorHex} fillOpacity="0.25" />
              <path d="M 0 15 L 30 15 M 15 0 L 15 30" stroke="#F59E0B" strokeWidth="0.5" strokeOpacity="0.15" />
            </pattern>
          </defs>
          <rect width="600" height="750" fill="#0C0614" />
          <rect width="600" height="750" fill="url(#novaFlare)" />
          <rect width="600" height="750" fill="url(#pomGrid)" />
          {/* Nova Burst Rays */}
          <g stroke={themeColorHex} strokeWidth="1.5" strokeOpacity="0.4">
            <line x1="300" y1="260" x2="60" y2="40" strokeDasharray="6 4" />
            <line x1="300" y1="260" x2="540" y2="40" strokeDasharray="6 4" />
            <line x1="300" y1="260" x2="30" y2="380" />
            <line x1="300" y1="260" x2="570" y2="380" />
            <circle cx="300" cy="260" r="140" stroke="#F59E0B" strokeWidth="1" strokeDasharray="8 6" fill="none" opacity="0.4" />
            <circle cx="300" cy="260" r="220" stroke={themeColorHex} strokeWidth="0.8" fill="none" opacity="0.3" />
          </g>
          {/* Dynamic Electric Trails */}
          <path d="M 40 700 Q 180 520 300 560 T 560 420" fill="none" stroke="#F59E0B" strokeWidth="3" opacity="0.6" />
          <path d="M 50 680 Q 220 480 320 540 T 570 380" fill="none" stroke={themeColorHex} strokeWidth="2" opacity="0.7" />
        </svg>
      );

    // 2. Stunt Elite Cyber
    case 'stunt_elite_cyber':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="stuntGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E0B36" />
              <stop offset="50%" stopColor="#0A0618" />
              <stop offset="100%" stopColor="#040209" />
            </linearGradient>
          </defs>
          <rect width="600" height="750" fill="url(#stuntGrad)" />
          {/* Vertical Elevation Lines */}
          {[-120, -60, 0, 60, 120].map((dx, i) => (
            <g key={i}>
              <line x1={300 + dx} y1="40" x2={300 + dx} y2="710" stroke={themeColorHex} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="4 8" />
              <text x={300 + dx + 4} y="120 + i * 80" fill={secondaryHex} fontSize="8" fontFamily="monospace" opacity="0.5">
                ELV.0{i + 1}
              </text>
            </g>
          ))}
          {/* Holographic Concentric Rings */}
          <ellipse cx="300" cy="300" rx="210" ry="80" stroke={themeColorHex} strokeWidth="1.5" fill="none" opacity="0.45" />
          <ellipse cx="300" cy="360" rx="250" ry="90" stroke={secondaryHex} strokeWidth="1" strokeDasharray="10 5" fill="none" opacity="0.4" />
          <ellipse cx="300" cy="420" rx="270" ry="100" stroke="#8B5CF6" strokeWidth="1.5" fill="none" opacity="0.3" />
          {/* Stunt Pyramid HUD Brackets */}
          <path d="M 120 200 L 300 80 L 480 200" fill="none" stroke={themeColorHex} strokeWidth="2" opacity="0.6" />
          <circle cx="300" cy="80" r="5" fill="#00F0D0" />
        </svg>
      );

    // 3. Spirit Precision HUD
    case 'spirit_precision_hud':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#0F0916" />
          {/* White & Pink High Tech Glass Grid */}
          <defs>
            <pattern id="precisionGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F472B6" strokeWidth="0.6" strokeOpacity="0.15" />
            </pattern>
          </defs>
          <rect width="600" height="750" fill="url(#precisionGrid)" />
          <circle cx="300" cy="270" r="180" stroke="#F472B6" strokeWidth="1" strokeDasharray="3 6" fill="none" opacity="0.4" />
          <circle cx="300" cy="270" r="160" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="12 4" fill="none" opacity="0.3" />
          {/* Stunt Angle Indicators */}
          <path d="M 160 180 L 140 180 L 140 150" fill="none" stroke={themeColorHex} strokeWidth="2" opacity="0.8" />
          <path d="M 440 180 L 460 180 L 460 150" fill="none" stroke={themeColorHex} strokeWidth="2" opacity="0.8" />
          <text x="145" y="140" fill="#F472B6" fontSize="9" fontFamily="monospace" fontWeight="bold">STUNT_SYNC: 99.4%</text>
          <text x="390" y="140" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">PRECISION_HUD</text>
        </svg>
      );

    // 4. Court Matrix 2077
    case 'court_matrix_2077':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#061019" />
          {/* Perspective Cyber Court Floor */}
          <path d="M 40 730 L 220 340 L 380 340 L 560 730 Z" fill="none" stroke={themeColorHex} strokeWidth="1.5" strokeOpacity="0.35" />
          <line x1="300" y1="340" x2="300" y2="730" stroke="#FF6A00" strokeWidth="2" strokeOpacity="0.4" />
          {/* 3-point Arc */}
          <ellipse cx="300" cy="620" rx="200" ry="110" fill="none" stroke={themeColorHex} strokeWidth="2" strokeDasharray="8 6" opacity="0.6" />
          {/* Key Area Isometric Grid */}
          <rect x="240" y="440" width="120" height="180" fill="none" stroke="#FF6A00" strokeWidth="1.5" opacity="0.45" />
          <circle cx="300" cy="440" r="45" fill="none" stroke={themeColorHex} strokeWidth="1.5" opacity="0.5" />
          {/* Glowing Trajectory Rings */}
          <ellipse cx="300" cy="200" rx="130" ry="40" fill="none" stroke="#FF6A00" strokeWidth="2" opacity="0.7" />
          <path d="M 120 400 Q 300 120 480 380" fill="none" stroke={themeColorHex} strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
        </svg>
      );

    // 5. Hyperdrive Rim
    case 'hyperdrive_rim':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#0A0D14" />
          {/* Hexagonal Perimeter Wall Lines */}
          <polygon points="300,50 540,190 540,550 300,690 60,550 60,190" fill="none" stroke={themeColorHex} strokeWidth="2" opacity="0.4" />
          <polygon points="300,80 500,210 500,530 300,660 100,530 100,210" fill="none" stroke="#EF4444" strokeWidth="1" strokeDasharray="10 5" opacity="0.3" />
          {/* Deep Red Laser Vectors */}
          <line x1="0" y1="120" x2="600" y2="400" stroke="#FF0055" strokeWidth="1.5" opacity="0.5" />
          <line x1="600" y1="180" x2="0" y2="460" stroke="#FF0055" strokeWidth="1.5" opacity="0.5" />
          <circle cx="300" cy="280" r="160" fill="none" stroke={themeColorHex} strokeWidth="1" strokeDasharray="4 8" opacity="0.4" />
          {/* Cyber Rim HUD */}
          <circle cx="300" cy="280" r="28" fill="none" stroke="#FF0055" strokeWidth="3" opacity="0.8" />
          <line x1="270" y1="280" x2="330" y2="280" stroke="#FF0055" strokeWidth="2" />
          <line x1="300" y1="250" x2="300" y2="310" stroke="#FF0055" strokeWidth="2" />
        </svg>
      );

    // 6. Gridiron Apex Tech
    case 'gridiron_apex_tech':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#07150E" />
          {/* Holographic Field Yardage Lines */}
          {[120, 200, 280, 360, 440, 520, 600].map((y, idx) => (
            <g key={idx}>
              <line x1="40" y1={y} x2="560" y2={y} stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.35" />
              {/* Hash Marks */}
              <line x1="240" y1={y - 8} x2="240" y2={y + 8} stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.5" />
              <line x1="360" y1={y - 8} x2="360" y2={y + 8} stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.5" />
              <text x="50" y={y - 6} fill="#10B981" fontSize="10" fontFamily="monospace" opacity="0.6">
                YARD_{(idx + 1) * 10}
              </text>
            </g>
          ))}
          {/* First Down Laser Beam */}
          <line x1="0" y1="360" x2="600" y2="360" stroke="#F59E0B" strokeWidth="3" opacity="0.7" />
          {/* Steel Shard Overlay Graphics */}
          <polygon points="40,40 160,40 90,140" fill={themeColorHex} fillOpacity="0.15" stroke={themeColorHex} strokeWidth="1.5" />
          <polygon points="560,40 440,40 510,140" fill={themeColorHex} fillOpacity="0.15" stroke={themeColorHex} strokeWidth="1.5" />
        </svg>
      );

    // 7. Endzone Overdrive
    case 'endzone_overdrive':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="carbonFiber" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="12" height="12" fill="#0C0A0A" />
              <path d="M 0 0 L 6 6 M 6 0 L 12 6 M 0 6 L 6 12 M 6 6 L 12 12" stroke="#1F1B1B" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="600" height="750" fill="url(#carbonFiber)" />
          {/* Heavy Crimson Hazard Diagonal Stripes */}
          <g opacity="0.3">
            <line x1="-100" y1="750" x2="400" y2="0" stroke="#EF4444" strokeWidth="18" />
            <line x1="100" y1="750" x2="600" y2="0" stroke="#EF4444" strokeWidth="18" />
            <line x1="300" y1="750" x2="800" y2="0" stroke="#EF4444" strokeWidth="18" />
          </g>
          {/* Energy Pulse Center Frame */}
          <rect x="50" y="60" width="500" height="630" fill="none" stroke="#FF0055" strokeWidth="2" opacity="0.6" />
          <polygon points="50,60 110,60 50,120" fill="#FF0055" opacity="0.7" />
          <polygon points="550,690 490,690 550,630" fill="#FF0055" opacity="0.7" />
        </svg>
      );

    // 8. Quantum Pitch
    case 'quantum_pitch':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#04140D" />
          {/* Hex-Net Soccer Goal Pattern */}
          <defs>
            <pattern id="hexNet" width="28" height="48" patternUnits="userSpaceOnUse">
              <path d="M 0 0 L 14 8 L 28 0 L 28 16 L 14 24 L 0 16 Z M 0 24 L 14 32 L 28 24 L 28 40 L 14 48 L 0 40 Z" fill="none" stroke="#00FF88" strokeWidth="0.8" strokeOpacity="0.2" />
            </pattern>
          </defs>
          <rect width="600" height="750" fill="url(#hexNet)" />
          {/* Speed Distortion Lines */}
          <g stroke="#00FF88" strokeWidth="1.2" opacity="0.5">
            <line x1="60" y1="500" x2="540" y2="220" strokeDasharray="14 6" />
            <line x1="40" y1="530" x2="560" y2="240" strokeDasharray="20 8" />
          </g>
          {/* Sci-Fi Target Lock HUD (Upper 90) */}
          <g transform="translate(430, 160)">
            <circle cx="0" cy="0" r="45" fill="none" stroke="#00FF88" strokeWidth="2" opacity="0.8" />
            <circle cx="0" cy="0" r="30" fill="none" stroke="#00FF88" strokeWidth="1" strokeDasharray="5 3" opacity="0.6" />
            <line x1="-55" y1="0" x2="55" y2="0" stroke="#00FF88" strokeWidth="1.5" />
            <line x1="0" y1="-55" x2="0" y2="55" stroke="#00FF88" strokeWidth="1.5" />
            <text x="8" y="24" fill="#00FF88" fontSize="8" fontFamily="monospace">LOCK: 90°</text>
          </g>
        </svg>
      );

    // 9. Golden Striker
    case 'golden_striker':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="goldBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1C1405" />
              <stop offset="60%" stopColor="#0B0904" />
              <stop offset="100%" stopColor="#000000" />
            </linearGradient>
          </defs>
          <rect width="600" height="750" fill="url(#goldBg)" />
          {/* Metallic Gold Vector Shards */}
          <polygon points="200,80 350,20 280,180" fill="#F59E0B" fillOpacity="0.25" stroke="#FDE047" strokeWidth="1.5" />
          <polygon points="450,220 560,160 480,340" fill="#F59E0B" fillOpacity="0.2" stroke="#FDE047" strokeWidth="1.5" />
          <polygon points="60,300 180,240 100,420" fill="#F59E0B" fillOpacity="0.2" stroke="#FDE047" strokeWidth="1.5" />
          {/* Particle Trail Lines */}
          <g stroke="#FDE047" strokeWidth="1" opacity="0.6">
            <line x1="80" y1="680" x2="300" y2="280" strokeDasharray="8 6" />
            <line x1="140" y1="700" x2="340" y2="310" strokeDasharray="12 8" />
            <circle cx="300" cy="280" r="6" fill="#FDE047" />
          </g>
        </svg>
      );

    // 10. Aero Spike Horizon
    case 'aero_spike_horizon':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#060E1D" />
          {/* Cobalt Blue Kinetic Arcs */}
          <path d="M 60 180 C 220 40 400 60 540 220" fill="none" stroke="#2563EB" strokeWidth="3" opacity="0.7" />
          <path d="M 40 220 C 200 80 420 100 560 260" fill="none" stroke="#00F0D0" strokeWidth="2" strokeDasharray="8 4" opacity="0.6" />
          {/* 45° Spike Trajectory Vector */}
          <line x1="180" y1="120" x2="480" y2="580" stroke="#00F0D0" strokeWidth="3" opacity="0.8" />
          <polygon points="480,580 460,540 500,560" fill="#00F0D0" />
          {/* Vertical Elevation Grid */}
          <line x1="300" y1="40" x2="300" y2="700" stroke="#2563EB" strokeWidth="1" strokeDasharray="4 8" opacity="0.3" />
        </svg>
      );

    // 11. Net Matrix
    case 'net_matrix':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#0F081C" />
          {/* Volleyball Net Wireframe */}
          <defs>
            <pattern id="volleyballNet" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#A855F7" strokeWidth="1" strokeOpacity="0.25" />
            </pattern>
          </defs>
          <rect x="0" y="220" width="600" height="240" fill="url(#volleyballNet)" />
          {/* Net Top White Cable */}
          <line x1="0" y1="220" x2="600" y2="220" stroke="#FFFFFF" strokeWidth="4" opacity="0.85" />
          <line x1="0" y1="460" x2="600" y2="460" stroke="#A855F7" strokeWidth="2" opacity="0.5" />
          {/* Violet HUD Accents */}
          <circle cx="300" cy="220" r="70" fill="none" stroke="#EC4899" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
        </svg>
      );

    // 12. Diamond Velocity
    case 'diamond_velocity':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#111208" />
          {/* Angular Diamond Field */}
          <polygon points="300,160 480,340 300,520 120,340" fill="none" stroke="#EAB308" strokeWidth="2" opacity="0.65" />
          <polygon points="300,220 420,340 300,460 180,340" fill="none" stroke="#EAB308" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
          {/* Home Plate & Base Vectors */}
          <polygon points="300,520 290,535 300,545 310,535" fill="#EAB308" />
          <line x1="300" y1="520" x2="300" y2="100" stroke="#06B6D4" strokeWidth="2" strokeDasharray="10 5" opacity="0.6" />
          {/* Exit Velocity Cones */}
          <path d="M 300 520 L 160 180 M 300 520 L 440 180" stroke="#EAB308" strokeWidth="1.5" opacity="0.4" />
        </svg>
      );

    // 13. Grand Slam Cyber
    case 'grand_slam_cyber':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#120E11" />
          {/* Laser-Cut Player Backdrop Frame */}
          <polygon points="60,60 540,60 500,480 300,680 100,480" fill="none" stroke="#DC2626" strokeWidth="2.5" opacity="0.75" />
          <polygon points="80,80 520,80 485,465 300,650 115,465" fill="#DC2626" fillOpacity="0.08" />
          {/* Strike Zone Radar Grid */}
          <rect x="230" y="240" width="140" height="180" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.5" />
          <line x1="230" y1="300" x2="370" y2="300" stroke="#DC2626" strokeWidth="1" opacity="0.5" />
          <line x1="230" y1="360" x2="370" y2="360" stroke="#DC2626" strokeWidth="1" opacity="0.5" />
          <line x1="276" y1="240" x2="276" y2="420" stroke="#DC2626" strokeWidth="1" opacity="0.5" />
          <line x1="324" y1="240" x2="324" y2="420" stroke="#DC2626" strokeWidth="1" opacity="0.5" />
        </svg>
      );

    // 14. Sonic Velocity (Track)
    case 'sonic_velocity':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#061219" />
          {/* Multi-Lane Speed Tracks converging to horizon */}
          {[60, 120, 180, 240, 300, 360, 420, 480, 540].map((x, idx) => (
            <line key={idx} x1={x} y1="750" x2={250 + idx * 12} y2="160" stroke={idx % 2 === 0 ? '#00F0D0' : '#EAB308'} strokeWidth="1.5" strokeOpacity={0.3 + (idx % 3) * 0.15} />
          ))}
          {/* Light-Speed Blur Vectors */}
          <g stroke="#00F0D0" strokeWidth="2" opacity="0.6">
            <line x1="0" y1="380" x2="600" y2="380" strokeDasharray="30 15" />
            <line x1="0" y1="440" x2="600" y2="440" strokeDasharray="45 20" />
          </g>
          {/* Digital Stopwatch HUD */}
          <rect x="200" y="60" width="200" height="40" rx="8" fill="#0B1A24" stroke="#00F0D0" strokeWidth="1.5" />
          <text x="300" y="86" fill="#00F0D0" fontSize="16" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            00:04.28 SPLIT
          </text>
        </svg>
      );

    // 15. Titanium Legend
    case 'titanium_legend':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#09121E" />
          {/* Cybernetic Plating & Rivets */}
          <rect x="30" y="30" width="540" height="690" fill="none" stroke="#38BDF8" strokeWidth="2" opacity="0.6" />
          {[50, 550].map((x) =>
            [50, 250, 500, 700].map((y, idx) => (
              <circle key={`${x}-${idx}`} cx={x} cy={y} r="4" fill="#38BDF8" opacity="0.8" />
            ))
          )}
          {/* Glowing Reactor Core Background */}
          <circle cx="300" cy="320" r="170" fill="none" stroke="#38BDF8" strokeWidth="3" opacity="0.35" />
          <circle cx="300" cy="320" r="140" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="10 5" opacity="0.5" />
          <circle cx="300" cy="320" r="80" fill="none" stroke="#38BDF8" strokeWidth="2" opacity="0.6" />
          {/* Championship Stars */}
          <g fill="#F59E0B">
            <polygon points="300,110 306,126 322,126 309,136 314,152 300,142 286,152 291,136 278,126 294,126" />
          </g>
        </svg>
      );

    // 16. Holographic Prism
    case 'holographic_prism':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="prismGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0D0" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <rect width="600" height="750" fill="#0C0717" />
          <rect width="600" height="750" fill="url(#prismGrad)" />
          {/* Pentagon Stat Radar Chart Overlay */}
          <g transform="translate(300, 290)">
            <polygon points="0,-120 114,-37 70,97 -70,97 -114,-37" fill="none" stroke="#00F0D0" strokeWidth="1.5" opacity="0.4" />
            <polygon points="0,-80 76,-25 47,65 -47,65 -76,-25" fill="none" stroke="#EC4899" strokeWidth="1" opacity="0.5" />
            <polygon points="0,-105 95,-30 60,85 -55,80 -90,-32" fill="#00F0D0" fillOpacity="0.15" stroke="#00F0D0" strokeWidth="2" />
          </g>
        </svg>
      );

    // 17. Neon Syndicate
    case 'neon_syndicate':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#060910" />
          {/* Dual Neon Borders (Cyan & Magenta) */}
          <rect x="35" y="35" width="530" height="680" fill="none" stroke="#00F0D0" strokeWidth="2" opacity="0.75" />
          <rect x="43" y="43" width="514" height="664" fill="none" stroke="#FF0055" strokeWidth="1.5" opacity="0.65" />
          {/* Cyber Circuit Traces */}
          <path d="M 50 140 L 120 140 L 160 180 L 160 260" fill="none" stroke="#00F0D0" strokeWidth="2" opacity="0.6" />
          <circle cx="160" cy="260" r="4" fill="#00F0D0" />
          <path d="M 550 600 L 480 600 L 440 560 L 440 480" fill="none" stroke="#FF0055" strokeWidth="2" opacity="0.6" />
          <circle cx="440" cy="480" r="4" fill="#FF0055" />
        </svg>
      );

    // 18. Draft Night 3000
    case 'draft_night_3000':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#060C17" />
          {/* Broadcast Studio Scanlines */}
          <defs>
            <pattern id="broadcastScan" width="100" height="4" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="100" y2="0" stroke="#F59E0B" strokeWidth="0.5" strokeOpacity="0.15" />
            </pattern>
          </defs>
          <rect width="600" height="750" fill="url(#broadcastScan)" />
          {/* Top Marquee Banner Frame */}
          <polygon points="50,40 550,40 530,90 70,90" fill="#F59E0B" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="2" />
          {/* Holographic Team Crest Frame */}
          <circle cx="300" cy="240" r="140" fill="none" stroke="#3B82F6" strokeWidth="2" strokeDasharray="12 6" opacity="0.5" />
          <circle cx="300" cy="240" r="170" fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.4" />
        </svg>
      );

    // 19. Apex Diamond Series
    case 'apex_diamond_series':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="diamondSheen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B132B" />
              <stop offset="50%" stopColor="#070D1E" />
              <stop offset="100%" stopColor="#02040A" />
            </linearGradient>
            <linearGradient id="prismFoil" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={themeColorHex} stopOpacity="0.8" />
              <stop offset="50%" stopColor="#A855F7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <rect width="600" height="750" fill="url(#diamondSheen)" />
          {/* Diamond Crystalline Facets */}
          <g opacity="0.45">
            <polygon points="300,40 520,240 300,420 80,240" fill="none" stroke={themeColorHex} strokeWidth="1.5" />
            <polygon points="300,70 480,240 300,390 120,240" fill="none" stroke="#A855F7" strokeWidth="1" strokeDasharray="8 4" />
            <polygon points="300,40 300,420" stroke="url(#prismFoil)" strokeWidth="1.5" />
            <polygon points="80,240 520,240" stroke="url(#prismFoil)" strokeWidth="1.5" />
            <polygon points="190,140 410,330" stroke={themeColorHex} strokeWidth="1" opacity="0.6" />
            <polygon points="410,140 190,330" stroke={themeColorHex} strokeWidth="1" opacity="0.6" />
          </g>
          {/* Razor-Sharp Foil Framing */}
          <rect x="24" y="24" width="552" height="702" rx="4" fill="none" stroke="url(#prismFoil)" strokeWidth="3" />
          <rect x="32" y="32" width="536" height="686" rx="2" fill="none" stroke={themeColorHex} strokeWidth="1" strokeOpacity="0.5" />
          {/* Holographic Corner Flairs */}
          <polygon points="24,24 64,24 24,64" fill="url(#prismFoil)" />
          <polygon points="576,24 536,24 576,64" fill="url(#prismFoil)" />
          <polygon points="24,726 64,726 24,686" fill="url(#prismFoil)" />
          <polygon points="576,726 536,726 576,686" fill="url(#prismFoil)" />
        </svg>
      );

    // 20. Game Day Smoke & Floodlights
    case 'game_day_smoke':
    case 'game_day_smoke_floodlights':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="floodLightLeft" cx="15%" cy="10%" r="60%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#0284C7" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#05070E" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="floodLightRight" cx="85%" cy="10%" r="60%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#D97706" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#05070E" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="600" height="750" fill="#05070E" />
          <rect width="600" height="750" fill="url(#floodLightLeft)" />
          <rect width="600" height="750" fill="url(#floodLightRight)" />
          {/* Volumetric Floodlight Beams */}
          <polygon points="60,20 280,750 180,750 30,20" fill="#38BDF8" fillOpacity="0.08" />
          <polygon points="540,20 420,750 320,750 570,20" fill="#F59E0B" fillOpacity="0.06" />
          {/* Stadium Light Banks (Top Left / Right) */}
          <g fill="#FFFFFF" opacity="0.9">
            {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
              <circle key={`l-${r}-${c}`} cx={40 + c * 10} cy={35 + r * 10} r="2.5" />
            )))}
            {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
              <circle key={`r-${r}-${c}`} cx={530 + c * 10} cy={35 + r * 10} r="2.5" />
            )))}
          </g>
          {/* Ground Fog Horizontal Drift */}
          <path d="M0,520 Q150,480 300,530 T600,500 L600,750 L0,750 Z" fill="#0C1527" fillOpacity="0.6" />
          <path d="M0,580 Q200,540 400,600 T600,560 L600,750 L0,750 Z" fill="#080E1B" fillOpacity="0.8" />
        </svg>
      );

    // 21. Varsity Geometric Shatter
    case 'varsity_geometric_shatter':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#0A0812" />
          {/* Angular Shattered Poly-Shards */}
          <g strokeWidth="1.5" strokeOpacity="0.6">
            <polygon points="80,100 240,40 180,180" fill="#F97316" fillOpacity="0.18" stroke="#F97316" />
            <polygon points="240,40 420,80 340,200 180,180" fill="#3B82F6" fillOpacity="0.12" stroke="#3B82F6" />
            <polygon points="420,80 540,160 460,260 340,200" fill="#F97316" fillOpacity="0.15" stroke="#F97316" />
            <polygon points="50,220 180,180 140,320 40,300" fill="#3B82F6" fillOpacity="0.16" stroke="#3B82F6" />
            <polygon points="460,260 560,340 480,420 380,330" fill="#EF4444" fillOpacity="0.15" stroke="#EF4444" />
            <polygon points="140,320 280,360 220,500 100,460" fill="#F97316" fillOpacity="0.12" stroke="#F97316" />
            <polygon points="380,330 500,480 360,540 280,360" fill="#3B82F6" fillOpacity="0.15" stroke="#3B82F6" />
          </g>
          {/* Kinetic Speed Lines */}
          <g stroke="#F97316" strokeWidth="2" opacity="0.5">
            <line x1="0" y1="120" x2="600" y2="440" strokeDasharray="24 12" />
            <line x1="0" y1="260" x2="600" y2="580" strokeDasharray="18 8" />
            <line x1="80" y1="0" x2="520" y2="750" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="16 16" opacity="0.4" />
          </g>
        </svg>
      );

    // 22. Championship Fire
    case 'championship_fire':
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="fireCore" cx="50%" cy="80%" r="70%">
              <stop offset="0%" stopColor="#FF4500" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#EA580C" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#7F1D1D" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0F0303" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="600" height="750" fill="#0D0303" />
          <rect width="600" height="750" fill="url(#fireCore)" />
          {/* Flame Vectors */}
          <path d="M 60 750 Q 150 480 220 540 T 300 360 T 380 520 T 480 440 T 560 750 Z" fill="#EF4444" fillOpacity="0.25" />
          <path d="M 120 750 Q 200 520 260 580 T 340 420 T 420 560 T 500 750 Z" fill="#F59E0B" fillOpacity="0.3" />
          {/* Rising Molten Spark Particles */}
          <g fill="#FDE047" opacity="0.75">
            <circle cx="180" cy="480" r="3" />
            <circle cx="240" cy="380" r="2" />
            <circle cx="310" cy="320" r="3.5" />
            <circle cx="370" cy="410" r="2.5" />
            <circle cx="430" cy="340" r="2" />
            <circle cx="280" cy="240" r="2" />
            <circle cx="340" cy="190" r="1.5" />
            <circle cx="150" cy="310" r="2" />
            <circle cx="470" cy="270" r="2.5" />
          </g>
          {/* Golden Perimeter Embers */}
          <rect x="28" y="28" width="544" height="694" fill="none" stroke="#F59E0B" strokeWidth="2" strokeOpacity="0.6" strokeDasharray="12 6" />
          <rect x="36" y="36" width="528" height="678" fill="none" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.4" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 600 750" className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="750" fill="#060C17" />
          <rect width="600" height="750" fill="url(#broadcastScan)" />
          <polygon points="50,40 550,40 530,90 70,90" fill="#F59E0B" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="2" />
          <circle cx="300" cy="240" r="140" fill="none" stroke="#3B82F6" strokeWidth="2" strokeDasharray="12 6" opacity="0.5" />
        </svg>
      );
  }
};

/**
 * Dynamic SVG Visual Engine - SportsTemplateEngine
 */
export const SportsTemplateEngine: React.FC<{
  cardData: AthleteCardData;
  className?: string;
  id?: string;
}> = ({ cardData, className = '', id = 'futuristic-play-card-root' }) => {
  const {
    templateId,
    themeColor: rawThemeColor,
    primaryColor,
    secondaryColor,
    athleteName,
    jerseyNumber,
    teamName,
    position,
    sportCategory = 'Baseball',
    mediaUrl,
    stats,
    photoScale = 1.0,
    photoX = 0,
    photoY = 0,
    ovrRating = '99',
    showWatermark = false,
    backdropImageUrl,
    typographyStyle = 'collegiate_block'
  } = cardData || {};

  const themeConfig = primaryColor ? NEON_THEMES[primaryColor] : NEON_THEMES.cyan;
  const themeColor = rawThemeColor || themeConfig?.hex || '#00f3ff';
  const secColor = secondaryColor || themeConfig?.secondaryHex || '#00b8d4';
  const typoConfig = ATHLETIC_TYPOGRAPHY_CONFIGS[typographyStyle] || ATHLETIC_TYPOGRAPHY_CONFIGS.collegiate_block;
  const statEntries = Object.entries(stats || {});

  // Extract athlete last name for massive background typography
  const nameParts = (athleteName || 'ATHLETE').trim().split(' ');
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];

  // Calculate photo transform inside 800x1000 viewport
  // Default base: width 700, height 700 at x=50, y=100
  const baseW = 700;
  const baseH = 700;
  const scale = Math.max(0.5, Math.min(2.5, photoScale || 1.0));
  const currentW = baseW * scale;
  const currentH = baseH * scale;
  const currentX = 50 + (baseW - currentW) / 2 + (photoX || 0);
  const currentY = 80 + (baseH - currentH) / 2 + (photoY || 0);

  return (
    <div id={id} className={`relative w-full h-full bg-slate-950 text-white font-sans select-none overflow-hidden ${className}`}>
      {/* Dynamic SVG Visual Engine */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Reactive Neon Glow Filter */}
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Dynamic Subject Clip Path */}
          <clipPath id="card-frame-clip">
            <rect x="20" y="20" width="760" height="960" rx="24" />
          </clipPath>

          {/* Full-Height Contrast Vignette Gradient (Layer 1) */}
          <linearGradient id="contrast-vignette" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.60" />
            <stop offset="35%" stopColor="#000000" stopOpacity="0.20" />
            <stop offset="70%" stopColor="#000000" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.85" />
          </linearGradient>

          {/* Bottom Gradient Overlay for Readability */}
          <linearGradient id="bottom-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#030712" stopOpacity="0" />
            <stop offset="50%" stopColor="#030712" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#030712" stopOpacity="0.98" />
          </linearGradient>

          {/* Holographic Header Foil Gradient */}
          <linearGradient id="foilHeader" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={themeColor} stopOpacity="0.9" />
            <stop offset="50%" stopColor={secColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* 5-LAYER STACK WITH HIGH-RES SPORTS BACKDROP */}
        <g clipPath="url(#card-frame-clip)">
          {/* Base Dark Fill */}
          <rect width="800" height="1000" fill="#030712" />
          
          {/* LAYER 0: Selected Firebase Backdrop Image (or rich CSS/SVG theme artwork) */}
          {backdropImageUrl ? (
            <image
              href={backdropImageUrl}
              x="0"
              y="0"
              width="800"
              height="1000"
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <TemplateSvgBackground 
              templateId={templateId} 
              themeColorHex={themeColor} 
              secondaryHex={secColor} 
            />
          )}

          {/* LAYER 1: Contrast Vignette Overlay */}
          <rect width="800" height="1000" fill="url(#contrast-vignette)" />

          {/* LAYER 2: Giant Ghosted Bold Last Name Typography behind Athlete Cutout */}
          <text 
            x="400" 
            y="420" 
            textAnchor="middle" 
            fill="#FFFFFF" 
            fillOpacity="0.10"
            fontSize="140" 
            fontWeight="900" 
            fontFamily={typoConfig.fontFamily}
            fontStyle={typoConfig.isItalic ? 'italic' : 'normal'}
            letterSpacing={typoConfig.letterSpacing}
          >
            {lastName.toUpperCase()}
          </text>

          {/* LAYER 3: Athlete Cutout Image (no placeholder circle) */}
          {mediaUrl && (
            <image
              href={mediaUrl}
              x={currentX}
              y={currentY}
              width={currentW}
              height={currentH}
              preserveAspectRatio="xMidYMid slice"
              opacity="0.98"
            />
          )}

          {/* Dark Gradient Scrim across Bottom Half */}
          <rect x="0" y="480" width="800" height="520" fill="url(#bottom-fade)" />

          {/* LAYER 4: Foreground Card HUD (Brackets, Badges, Name, OVR, Jersey, Stats) */}
          {/* Outer Futuristic Frame & Tech Brackets */}
          <rect x="28" y="28" width="744" height="944" rx="20" stroke={themeColor} strokeWidth="2.5" fill="none" opacity="0.85" filter="url(#neon-glow)" />
          <rect x="36" y="36" width="728" height="928" rx="14" stroke={secColor} strokeWidth="1" fill="none" opacity="0.45" />

          {/* Tech Corner Brackets */}
          <path d="M 40 90 L 40 40 L 90 40" stroke={themeColor} strokeWidth="3" fill="none" />
          <path d="M 760 90 L 760 40 L 710 40" stroke={themeColor} strokeWidth="3" fill="none" />
          <path d="M 40 910 L 40 960 L 90 960" stroke={themeColor} strokeWidth="3" fill="none" />
          <path d="M 760 910 L 760 960 L 710 960" stroke={themeColor} strokeWidth="3" fill="none" />

          {/* Top Left Team Badge */}
          <g transform="translate(50, 48)">
            <rect width="200" height="40" rx="8" fill="#0B0F19" stroke={themeColor} strokeWidth="1.5" />
            <rect width="6" height="40" rx="3" fill={secColor} />
            <text x="18" y="25" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="monospace" letterSpacing="1">
              {(teamName || 'TEAM NAME').toUpperCase().slice(0, 16)}
            </text>
          </g>

          {/* Top Right D1 OVR / Prospect Rating Shield Badge */}
          <g transform="translate(620, 46)">
            <polygon points="65,0 130,12 130,48 65,64 0,48 0,12" fill="#0B0F19" stroke={themeColor} strokeWidth="2" filter="url(#neon-glow)" />
            <text x="65" y="24" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="900" fontFamily="monospace" letterSpacing="1">
              OVR RATING
            </text>
            <text x="65" y="48" textAnchor="middle" fill="#FFFFFF" fontSize="24" fontWeight="900" fontFamily={typoConfig.fontFamily}>
              {ovrRating || '99'}
            </text>
          </g>

          {/* Sport Category Chip */}
          <g transform="translate(50, 96)">
            <rect width="120" height="24" rx="4" fill="#030712" stroke={secColor} strokeWidth="1" />
            <text x="60" y="16" textAnchor="middle" fill={themeColor} fontSize="10" fontWeight="bold" fontFamily="monospace" letterSpacing="1.5">
              {(sportCategory || 'SPORTS').toUpperCase()}
            </text>
          </g>

          {/* LAYER 4: Giant Foreground Jersey Number Outline */}
          <text 
            x="740" 
            y="705" 
            textAnchor="end" 
            fill="none" 
            stroke={themeColor} 
            strokeWidth="4" 
            fontSize="160" 
            fontWeight="900" 
            fontFamily={typoConfig.fontFamily} 
            fontStyle="italic"
            opacity="0.9"
            filter="url(#neon-glow)"
          >
            {jerseyNumber || '00'}
          </text>
          <text 
            x="740" 
            y="705" 
            textAnchor="end" 
            fill={secColor} 
            fillOpacity="0.12"
            fontSize="160" 
            fontWeight="900" 
            fontFamily={typoConfig.fontFamily} 
            fontStyle="italic"
          >
            {jerseyNumber || '00'}
          </text>

          {/* Live Player Name (Full Name) */}
          <text 
            x="56" 
            y="690" 
            fill="#FFFFFF" 
            fontSize="54" 
            fontWeight="900" 
            fontFamily={typoConfig.fontFamily} 
            fontStyle={typoConfig.isItalic ? 'italic' : 'normal'}
            letterSpacing={typoConfig.letterSpacing}
            filter="url(#neon-glow)"
          >
            {(athleteName || 'ATHLETE NAME').toUpperCase()}
          </text>
          
          {/* Position & Class Tag */}
          <text x="58" y="730" fill={secColor} fontSize="18" fontWeight="800" fontFamily="monospace" letterSpacing="3">
            {(position || 'POSITION').toUpperCase()} // CLASS OF {cardData.classYear || '2026'}
          </text>

          {/* 5. Reactive HUD Stat Badges */}
          <g transform="translate(50, 765)">
            {statEntries.slice(0, 4).map(([label, val], idx) => {
              const col = idx % 4;
              const xPos = col * 175;
              return (
                <g key={label} transform={`translate(${xPos}, 0)`}>
                  {/* Outer Glass Card */}
                  <rect width="162" height="130" rx="14" fill="#070B14" fillOpacity="0.9" stroke="#1e293b" strokeWidth="1.5" />
                  <rect width="162" height="130" rx="14" fill="none" stroke={themeColor} strokeWidth="1.2" opacity="0.4" />
                  <path d="M 0 10 L 0 0 L 10 0" stroke={themeColor} strokeWidth="2" fill="none" />
                  <path d="M 162 10 L 162 0 L 152 0" stroke={themeColor} strokeWidth="2" fill="none" />
                  
                  {/* Top Label */}
                  <text x="81" y="38" textAnchor="middle" fill="#94A3B8" fontSize="13" fontWeight="bold" fontFamily="monospace" letterSpacing="1">
                    {label.toUpperCase()}
                  </text>
                  
                  {/* Value */}
                  <text x="81" y="85" textAnchor="middle" fill="#FFFFFF" fontSize="30" fontWeight="900" fontFamily={typoConfig.fontFamily}>
                    {val || '--'}
                  </text>

                  {/* Micro Tech Footprint Bar / Accent Underline */}
                  <rect x="31" y="105" width="100" height="4" rx="2" fill="#1E293B" />
                  <rect x="31" y="105" width="60" height="4" rx="2" fill={secColor} />
                </g>
              );
            })}
          </g>

          {/* Telemetry Security Tag Footer */}
          <g transform="translate(50, 920)">
            <text x="0" y="24" fill="#64748B" fontSize="11" fontFamily="monospace" letterSpacing="2">
              JUST1PLAY // AUTHENTIC COMBINE ASSET // SYSTEM ID: {(templateId || 'PRO').toUpperCase()}
            </text>
          </g>

          {/* Free Preview Translucent Watermark Overlay */}
          {showWatermark && (
            <g transform="translate(400, 500) rotate(-35)" opacity="0.35" pointerEvents="none">
              <rect x="-350" y="-45" width="700" height="90" rx="12" fill="#000000" fillOpacity="0.6" stroke="#00F0D0" strokeWidth="2" />
              <text x="0" y="14" textAnchor="middle" fill="#00F0D0" fontSize="38" fontWeight="900" fontFamily="monospace" letterSpacing="8">
                JUST1PLAY PRO CARD
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

export const SportsPlayCardView = SportsTemplateEngine;

/**
 * Helper to reliably preload images with anonymous CORS mode
 */
const loadCORSImage = (url?: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    // Timeout guard so canvas never hangs
    setTimeout(() => {
      if (!img.complete) resolve(null);
    }, 4500);
    img.src = url;
  });
};

export interface ExportPlayCardOptions extends Partial<AthleteCardData> {
  isWatermarked?: boolean;
  scale?: number;
}

/**
 * Ultra-Crisp High Resolution Canvas Rasterizer (300 DPI equivalent)
 * Converts SVG background + Athlete Image + HUD elements directly to PNG/JPEG DataURL
 */
export async function exportPlayCardToCanvas(
  cardData: AthleteCardData | ExportPlayCardOptions,
  format: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<string> {
  // Wait for Google & system athletic fonts to load so text does not fall back
  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, 1500))
      ]);
    }
  } catch (fontErr) {
    console.warn('Canvas font loading warning:', fontErr);
  }

  const exportOpts = cardData as ExportPlayCardOptions;
  const isWatermark = exportOpts.isWatermarked !== undefined 
    ? exportOpts.isWatermarked 
    : Boolean(cardData.showWatermark);

  const scale = typeof exportOpts.scale === 'number' && exportOpts.scale > 0 ? exportOpts.scale : 3;

  const canvas = document.createElement('canvas');
  // High resolution: 1800 x 2250 (3x scale) for crisp 300 DPI print quality
  const width = Math.round(600 * scale);
  const height = Math.round(750 * scale);
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D canvas context');

  const theme = NEON_THEMES[cardData.primaryColor || 'cyan'] || NEON_THEMES.cyan;
  const primaryHex = cardData.themeColor || theme.hex || '#00F0D0';
  const secondaryHex = cardData.secondaryColor || theme.secondaryHex || '#00B8D4';
  const typoStyle = cardData.typographyStyle || 'collegiate_block';
  const typoConfig = ATHLETIC_TYPOGRAPHY_CONFIGS[typoStyle] || ATHLETIC_TYPOGRAPHY_CONFIGS.collegiate_block;
  const scaleRatio = width / 800; // 2.25x for 1800 width

  // Background solid base (Deep dark obsidian foundation)
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, width, height);

  // Asynchronously preload both Firebase backdrop and athlete cutout image before drawing
  const athleteImgUrl = cardData.mediaUrl || DEFAULT_SPORT_IMAGES[cardData.sportCategory || 'Baseball'];
  const [backdropImg, athleteImg] = await Promise.all([
    loadCORSImage(cardData.backdropImageUrl),
    loadCORSImage(athleteImgUrl)
  ]);

  // LAYER 0: Draw Firebase Backdrop or Dynamic Theme Radial Gradient
  if (backdropImg && backdropImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(40, 40, width - 80, height - 80, 40);
    ctx.clip();
    ctx.drawImage(backdropImg, 0, 0, width, height);
    ctx.restore();
  } else {
    // Dynamic theme radial gradient fallback
    const bgGrad = ctx.createRadialGradient(width / 2, height * 0.38, 50, width / 2, height * 0.38, width * 0.55);
    bgGrad.addColorStop(0, theme.glow || 'rgba(0, 240, 208, 0.45)');
    bgGrad.addColorStop(0.5, 'rgba(11, 15, 25, 0.85)');
    bgGrad.addColorStop(1, '#030712');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // LAYER 1: Contrast Vignette Gradient (Ensures legibility over light or dark backdrops)
  const vigGrad = ctx.createLinearGradient(0, 0, 0, height);
  vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  vigGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.20)');
  vigGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.60)');
  vigGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.88)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);

  // LAYER 2: Giant Ghosted Last Name Typography behind Athlete Cutout
  const nameParts = (cardData.athleteName || 'ATHLETE').trim().split(' ');
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.font = typoConfig.ghostCanvasFont;
  ctx.textAlign = 'center';
  ctx.fillText(lastName.toUpperCase(), width / 2, height * 0.42);

  // LAYER 3: Athlete Cutout Image with photoScale, photoX, photoY
  if (athleteImg && athleteImg.naturalWidth > 0) {
    const pScale = Math.max(0.5, Math.min(2.5, cardData.photoScale || 1.0));
    const pX = (cardData.photoX || 0) * scaleRatio;
    const pY = (cardData.photoY || 0) * scaleRatio;

    const baseW = width * 0.88;
    const baseH = height * 0.58;
    const targetW = baseW * pScale;
    const targetH = (targetW / (athleteImg.naturalWidth / athleteImg.naturalHeight));
    const drawX = (width - targetW) / 2 + pX;
    const drawY = height * 0.08 + (baseH - targetH) / 2 + pY;

    ctx.save();
    // Clip to card bounds
    ctx.beginPath();
    ctx.roundRect(40, 40, width - 80, height - 80, 40);
    ctx.clip();
    ctx.drawImage(athleteImg, drawX, drawY, targetW, targetH);
    ctx.restore();

    // Smooth Bottom Scrim Fade
    const fadeGrad = ctx.createLinearGradient(0, height * 0.45, 0, height * 0.72);
    fadeGrad.addColorStop(0, 'rgba(3, 7, 18, 0)');
    fadeGrad.addColorStop(0.7, 'rgba(3, 7, 18, 0.85)');
    fadeGrad.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, height * 0.45, width, height * 0.55);
  }

  // LAYER 4: Outer Futuristic Frame & Tech Brackets
  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(50, 50, width - 100, height - 100);

  // Inner hairline frame
  ctx.strokeStyle = secondaryHex;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(65, 65, width - 130, height - 130);

  // Cyber Corner Brackets
  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 6;
  // Top-left
  ctx.beginPath(); ctx.moveTo(70, 160); ctx.lineTo(70, 70); ctx.lineTo(160, 70); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(width - 160, 70); ctx.lineTo(width - 70, 70); ctx.lineTo(width - 70, 160); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(70, height - 160); ctx.lineTo(70, height - 70); ctx.lineTo(160, height - 70); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(width - 160, height - 70); ctx.lineTo(width - 70, height - 70); ctx.lineTo(width - 70, height - 160); ctx.stroke();

  // Top Left: Team Name Pill
  ctx.fillStyle = '#0B0F19';
  ctx.fillRect(90, 90, 440, 70);
  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(90, 90, 440, 70);
  ctx.fillStyle = secondaryHex;
  ctx.fillRect(90, 90, 14, 70);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'left';
  ctx.fillText((cardData.teamName || 'ELITE ATHLETICS').toUpperCase().slice(0, 18), 125, 136);

  // Top Right: OVR Rating Shield
  const shieldX = width - 260;
  const shieldY = 85;
  ctx.fillStyle = '#0B0F19';
  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(shieldX + 80, shieldY);
  ctx.lineTo(shieldX + 160, shieldY + 16);
  ctx.lineTo(shieldX + 160, shieldY + 80);
  ctx.lineTo(shieldX + 80, shieldY + 105);
  ctx.lineTo(shieldX, shieldY + 80);
  ctx.lineTo(shieldX, shieldY + 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '900 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('OVR', shieldX + 80, shieldY + 36);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = typoConfig.canvasFont.replace('115px', '52px').replace('110px', '52px').replace('92px', '48px');
  ctx.fillText(cardData.ovrRating || '99', shieldX + 80, shieldY + 84);

  // LAYER 4: Giant Foreground Jersey Number Outline & Subtle Fill
  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 6;
  ctx.font = typoConfig.ghostCanvasFont.replace('250px', '340px').replace('240px', '340px').replace('210px', '320px');
  ctx.textAlign = 'right';
  ctx.strokeText(`#${cardData.jerseyNumber || '00'}`, width - 100, height * 0.70);
  
  // Secondary fill tint for jersey
  ctx.fillStyle = secondaryHex;
  ctx.globalAlpha = 0.12;
  ctx.fillText(`#${cardData.jerseyNumber || '00'}`, width - 100, height * 0.70);
  ctx.globalAlpha = 1.0;

  // Live Player Full Name with custom font
  ctx.fillStyle = '#FFFFFF';
  ctx.font = typoConfig.canvasFont;
  ctx.textAlign = 'left';
  ctx.fillText((cardData.athleteName || 'ATHLETE NAME').toUpperCase(), 100, height * 0.69);

  // Position & Class Tag
  ctx.fillStyle = secondaryHex;
  ctx.font = 'bold 36px monospace';
  ctx.fillText(`${(cardData.position || 'POSITION').toUpperCase()} // CLASS OF ${cardData.classYear || '2026'}`, 104, height * 0.735);

  // Stats HUD Grid (4 boxes)
  const stats = Object.entries(cardData.stats || {}).slice(0, 4);
  const boxWidth = (width - 260) / 4;
  stats.forEach(([lbl, val], i) => {
    const boxX = 100 + i * (boxWidth + 20);
    const boxY = height * 0.765;
    const boxHeight = 220;

    // Glass Card
    ctx.fillStyle = 'rgba(7, 11, 20, 0.92)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Tech highlight corner line
    ctx.strokeStyle = primaryHex;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + 24);
    ctx.lineTo(boxX, boxY);
    ctx.lineTo(boxX + 24, boxY);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(lbl.toUpperCase(), boxX + boxWidth / 2, boxY + 65);

    // Value
    ctx.fillStyle = '#FFFFFF';
    ctx.font = typoConfig.canvasFont.replace('115px', '60px').replace('110px', '60px').replace('92px', '54px');
    ctx.fillText(val || '--', boxX + boxWidth / 2, boxY + 145);

    // Progress bar with primary/secondary colors
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(boxX + 30, boxY + 180, boxWidth - 60, 8);
    ctx.fillStyle = secondaryHex;
    ctx.fillRect(boxX + 30, boxY + 180, (boxWidth - 60) * 0.65, 8);
  });

  // Security Telemetry Footer
  ctx.fillStyle = '#64748B';
  ctx.font = '22px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`JUST1PLAY // AUTHENTIC COMBINE ASSET // SYSTEM ID: ${(cardData.templateId || 'PRO').toUpperCase()}`, 100, height - 80);

  // Watermark for Free Previews
  if (isWatermark) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-35 * Math.PI / 180);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(-650, -80, 1300, 160);
    ctx.strokeStyle = primaryHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(-650, -80, 1300, 160);

    ctx.fillStyle = primaryHex;
    ctx.font = '900 68px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('JUST1PLAY PRO CARD', 0, 24);
    ctx.restore();
  }

  return canvas.toDataURL(format, 0.95);
}

export default SportsTemplateEngine;
